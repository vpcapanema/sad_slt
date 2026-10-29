"""Regras de negócio — painéis de acompanhamento."""
from __future__ import annotations

import json
import math
from datetime import date, datetime
from typing import Any

from api.repositories import painel_repository
from api.schemas.demanda import GeometriaSchema, RepresentanteSchema
from api.schemas.painel import PainelDemandaSchema, PainelHierarquizacaoSchema
from api.services.publicacao_hierarquizacao import publicacao_vigente


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _geometria_from_row(row: dict[str, Any]) -> GeometriaSchema | None:
    raw = row.get("geometria_geojson")
    if not raw:
        return None
    if isinstance(raw, str):
        raw = json.loads(raw)
    return GeometriaSchema(tipo=raw.get("type"), coordinates=raw.get("coordinates"))


def _resultado_individual(row: dict[str, Any]) -> PainelHierarquizacaoSchema:
    h = (row.get("objeto") or {}).get("hierarquizacao") or {}
    f1, f2, f3, sintese = (h.get(chave) or {} for chave in ("fase_1", "fase_2", "fase_3", "sintese"))
    relatorios = row.get("relatorios") or {}
    desatualizada = any(
        parte.get("desatualizado") for parte in (
            f1, f2, f3, sintese, relatorios.get("fase_3") or {}, relatorios.get("sintese") or {},
        )
    )
    config = row.get("sintese") or {}
    dimensoes = f2.get("valor_por_dimensao") or {}
    contribuicoes = sintese.get("contribuicoes") or {
        "favorabilidade_rede": f2.get("indice_favorabilidade_rede", dimensoes.get("rede")),
        "favorabilidade_grade": f2.get("indice_favorabilidade_grade", dimensoes.get("grade")),
        "prioridade": f3.get("score_fase3"),
    }
    pesos = {}
    if sintese.get("executada") and not desatualizada:
        if config.get("operador") == "media_simples":
            pesos = dict.fromkeys(("rede", "territorial", "prioridade"), 1 / 3)
        elif config.get("operador") == "media_ponderada":
            pesos = {
                nome: config[chave] for nome, chave in (
                    ("rede", "peso_rede"), ("territorial", "peso_grade"), ("prioridade", "peso_prioridade"),
                ) if config.get(chave) is not None
            }
    if pesos:
        valores = [
            float(v) for k in ("favorabilidade_rede", "favorabilidade_grade", "prioridade")
            if isinstance((v := contribuicoes.get(k)), (int, float)) and math.isfinite(v)
        ]
        score = sintese.get("score_final")
        if (len(pesos) != 3 or len(valores) != 3
                or not isinstance(score, (int, float)) or not math.isclose(
                    sum(v * p for v, p in zip(valores, pesos.values())), score, rel_tol=0, abs_tol=1e-10,
                )):
            pesos = {}
    return PainelHierarquizacaoSchema(
        codigo=row["codigo"], nome=row["nome"], status=row["status"],
        grupo_nome=row.get("grupo_nome"), grupo_codigo=row.get("grupo_codigo"),
        atualizado_em=_iso(row.get("atualizado_em")), desatualizada=desatualizada,
        elegibilidade=f1.get("status_fase1"),
        indice_risco=(f1.get("resumo_elegibilidade") or {}).get("indice_de_risco_ambiental_e_territorial"),
        indice_rede=f2.get("indice_favorabilidade_rede", dimensoes.get("rede")),
        indice_territorial=f2.get("indice_favorabilidade_grade", dimensoes.get("grade")),
        indice_prioridade=f3.get("score_fase3") if not f3.get("desatualizado") else None,
        indice_final=sintese.get("score_final") if not desatualizada else None,
        posicao=sintese.get("posicao_final") if not desatualizada else None,
        operador=config.get("operador"), pesos_sintese=pesos,
        pesos_prioridade=f3.get("pesos_fase3") or {},
    )


def _row_to_item(row: dict[str, Any]) -> PainelDemandaSchema:
    lat = row.get("latitude")
    lng = row.get("longitude")
    rep = None
    if row.get("representante_nome") or row.get("sigma_pessoa_id"):
        rep = RepresentanteSchema(
            pessoa_id=str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None,
            nome=row.get("representante_nome") or "",
            email=row.get("representante_email"),
            telefone=row.get("representante_telefone"),
        )
    valor = row.get("valor_global")
    abr = row.get("abrangencia_nomes") or []
    return PainelDemandaSchema(
        id=row["codigo"],
        tipo=row["tipo"],
        status=row["status"],
        criadoEm=_iso(row.get("criado_em")) or "",
        nome=row["nome"],
        descricao=row.get("descricao"),
        geometria=_geometria_from_row(row),
        lat=float(lat) if lat is not None else None,
        lng=float(lng) if lng is not None else None,
        diretoria_id=row.get("diretoria_id"),
        plano_id=row.get("plano_id"),
        plano_codigo=row.get("plano_codigo"),
        plano_nome=row.get("plano_nome"),
        programa_id=str(row["programa_id"]) if row.get("programa_id") else None,
        programa_nome=row.get("programa_nome"),
        abrangencia=list(abr),
        instituicao_id=str(row["sigma_instituicao_id"]) if row.get("sigma_instituicao_id") else None,
        instituicao_label=row.get("instituicao_nome"),
        instituicao_cnpj=row.get("instituicao_cnpj"),
        representante=rep,
        classificacao=row.get("classificacao"),
        complementos=row.get("complementos"),
        objetivo_estrategico=row.get("objetivo_estrategico"),
        responsavel=row.get("responsavel"),
        vigencia_inicio=_iso(row.get("vigencia_inicio")),
        vigencia_fim=_iso(row.get("vigencia_fim")),
        valor_global=float(valor) if valor is not None else None,
        objetivo=row.get("objetivo"),
        publico_alvo=row.get("publico_alvo"),
        orgao_responsavel=row.get("orgao_responsavel"),
        justificativa=row.get("justificativa"),
        hierarquizacoes=[_resultado_individual(h) for h in row.get("hierarquizacoes", [])],
    )


def listar_demandas_painel(*, public_only: bool = False) -> list[PainelDemandaSchema]:
    """Retorna todas as demandas, sanitizando dados pessoais no painel público."""
    rows = painel_repository.list_all()
    if public_only:
        from api.services.hierarquizacao_service import resultados_desatualizados

        visibilidade = {}
        for row in rows:
            for h in row.get("hierarquizacoes") or []:
                if h["codigo"] not in visibilidade:
                    visibilidade[h["codigo"]] = (
                        publicacao_vigente(h)
                        and not resultados_desatualizados(h)
                    )
        rows = [
            {
                **row,
                "hierarquizacoes": [
                    h for h in row.get("hierarquizacoes") or [] if visibilidade[h["codigo"]]
                ],
                "sigma_pessoa_id": None,
                "representante_nome": None,
                "representante_email": None,
                "representante_telefone": None,
            }
            for row in rows
        ]
    return [_row_to_item(row) for row in rows]


def estatisticas_operador(usuario_id: str) -> dict[str, int]:
    return painel_repository.estatisticas_operador(usuario_id)
