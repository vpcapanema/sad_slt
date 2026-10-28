"""Matrizes imutáveis compartilhadas por hierarquizações e julgamentos."""
from __future__ import annotations

import base64
import binascii
import re
import unicodedata
from copy import deepcopy
from typing import Any

from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.exceptions import DemandaValidationError


def fase_criterio(row: dict) -> int:
    if not isinstance(row, dict):
        raise DemandaValidationError("Cada critério deve ser uma linha válida da matriz.", field="matriz")
    campos = {
        unicodedata.normalize("NFKD", str(k)).encode("ascii", "ignore").decode().strip().casefold(): v
        for k, v in row.items()
    }
    etapa = str(campos.get("etapa") or campos.get("etapa da hierarquizacao") or campos.get("etapa_hierarquizacao") or "").strip()
    normalizado = unicodedata.normalize("NFKD", etapa).encode("ascii", "ignore").decode().casefold()
    normalizado = re.sub(r"[\s-]+", "_", normalizado)
    for fase, prefixos in (
        (1, ("elegibilidade",)),
        (2, ("favorabilidade",)),
        (3, ("priorizacao", "ajuste")),
    ):
        if normalizado in {str(fase), f"fase{fase}", f"fase_{fase}"} or normalizado.startswith(prefixos):
            declarada = str(campos.get("fase") or "").strip().casefold()
            if declarada and declarada not in {str(fase), f"fase{fase}", f"fase_{fase}", f"fase {fase}"}:
                raise DemandaValidationError(
                    f"As colunas Etapa e Fase divergem no critério “{campos.get('criterio', campos.get('nome', 'sem nome'))}”.",
                    field="matriz.fase",
                )
            return fase
    raise DemandaValidationError(
        f"Informe uma Etapa válida no critério “{campos.get('criterio', campos.get('nome', 'sem nome'))}”. "
        "Use Elegibilidade territorial, Favorabilidade territorial — município e rede rodoviária "
        "ou Priorização de demandas por atributos.",
        field="matriz.fase",
    )


def criterios_fase3(conteudo: Any) -> list[dict]:
    return [row for row in comparavel(conteudo)["linhas"] if fase_criterio(row) == 3]


def exigir_julgamento_fase3(ambiente: dict) -> None:
    rows = ambiente.get("criterios") or []
    if any(row.get("_superficie_id") for row in rows):
        raise DemandaValidationError(
            "Julgamentos AHP são exclusivos da Fase 3. Superfícies da Fase 2 não participam.",
            field="criterios",
        )
    filtrados = criterios_fase3(rows)
    if len(filtrados) < 2 or filtrados != rows:
        raise DemandaValidationError(
            "O julgamento AHP deve conter somente critérios da Fase 3, no mínimo dois. "
            "Cadastre outro julgamento com o recorte correto; respostas anteriores não serão alteradas.",
            field="criterios",
        )


def comparavel(conteudo: Any) -> dict:
    if isinstance(conteudo, list):
        return {"linhas": deepcopy(conteudo)}
    if not isinstance(conteudo, dict):
        raise DemandaValidationError("Informe uma matriz de critérios e premissas.", field="matriz_id")
    keys = ("linhas", "rows", "criterios", "dados")
    rows = next((conteudo[key] for key in keys if isinstance(conteudo.get(key), list)), [])
    return {**{k: deepcopy(v) for k, v in conteudo.items() if k not in (*keys, "arquivo", "aba")},
            "linhas": deepcopy(rows)}


def equivalentes(a: Any, b: Any) -> bool:
    return comparavel(a) == comparavel(b)


def obter(ident: Any) -> dict:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT id,nome,conteudo,assinatura,arquivo_nome,criado_em FROM ahp.matriz_criterios_premissas WHERE id=%s",
            (ident,),
        ).fetchone()
    if not row:
        raise DemandaValidationError("Matriz de critérios e premissas não encontrada.", field="matriz_id")
    return dict(row)


def listar() -> list[dict]:
    with get_connection() as conn:
        return [dict(row) for row in conn.execute(
            "SELECT id,nome,conteudo,assinatura,arquivo_nome,criado_em FROM ahp.matriz_criterios_premissas ORDER BY criado_em DESC,id"
        ).fetchall()]


def criar(nome: str, conteudo: Any, arquivo_base64: str | None = None,
          arquivo_nome: str | None = None) -> dict:
    normalizado = comparavel(conteudo)
    rows = normalizado["linhas"]
    if len(rows) < 2 or any(not isinstance(row, dict) or not row for row in rows):
        raise DemandaValidationError("A matriz deve conter ao menos dois critérios válidos.", field="conteudo")
    arquivo = None
    if arquivo_base64:
        try:
            arquivo = base64.b64decode(arquivo_base64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise DemandaValidationError("Arquivo da matriz com codificação inválida.", field="arquivo_base64") from exc
        if len(arquivo) > 20 * 1024 * 1024:
            raise DemandaValidationError("O arquivo deve ter no máximo 20 MB.", field="arquivo_base64")
    if not nome.strip() or len(nome.strip()) > 200:
        raise DemandaValidationError("Informe um nome com até 200 caracteres.", field="nome")
    if isinstance(conteudo, dict):
        normalizado.update({k: conteudo[k] for k in ("arquivo", "aba") if k in conteudo})
        arquivo_nome = arquivo_nome or conteudo.get("arquivo")
    if arquivo_nome is not None and (not isinstance(arquivo_nome, str) or len(arquivo_nome) > 255):
        raise DemandaValidationError("Nome de arquivo inválido.", field="arquivo_nome")
    with get_connection() as conn:
        row = conn.execute(
            """INSERT INTO ahp.matriz_criterios_premissas(nome,conteudo,arquivo_nome,arquivo_conteudo)
               VALUES (%s,%s,%s,%s)
               RETURNING id,nome,conteudo,assinatura,arquivo_nome,criado_em""",
            (nome.strip(), Jsonb(normalizado), arquivo_nome, arquivo),
        ).fetchone()
    if not row:
        raise RuntimeError("Não foi possível registrar a matriz.")
    return dict(row)


def da_hierarquizacao(row: dict) -> Any:
    if row.get("matriz_id"):
        return obter(row["matriz_id"])["conteudo"]
    return ((row.get("dados_hierarquizacao") or {}).get("cabecalho_grupo") or {}).get("matriz_premissas_criterios")


def exigir_compativel(hierarquizacao: dict, julgamento: dict) -> None:
    if hierarquizacao.get("matriz_id") and julgamento.get("matriz_id"):
        if str(hierarquizacao["matriz_id"]) == str(julgamento["matriz_id"]):
            return
        # Equivalência não autoriza implicitamente a transferência entre matrizes.
        official = (hierarquizacao.get("dados_hierarquizacao") or {}).get("comparacao_colaborativa") or {}
        reuso = (hierarquizacao.get("dados_hierarquizacao") or {}).get("reuso_matriz") or {}
        autorizado = (
            str(official.get("ambiente_id")) == str(julgamento["id"]) and official.get("reuso_confirmado")
        ) or (
            reuso.get("confirmado") and str(reuso.get("origem_id")) == str(julgamento["matriz_id"])
            and str(reuso.get("destino_id")) == str(hierarquizacao["matriz_id"])
        )
        if (autorizado
                and equivalentes(da_hierarquizacao(hierarquizacao), obter(julgamento["matriz_id"])["conteudo"])):
            return
        raise DemandaValidationError(
            "O julgamento pertence a outra matriz. Reavalie critérios e premissas antes de reutilizar pesos.",
            field="julgamento_id",
        )
    # Compatibilidade temporária com registros anteriores à migração.
    if str(julgamento.get("hierarquizacao_id")) != str(hierarquizacao["id"]):
        raise DemandaValidationError("O julgamento não corresponde à matriz desta hierarquização.", field="julgamento_id")
