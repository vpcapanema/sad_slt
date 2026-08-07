"""Motor da espinha dorsal de hierarquização.

Fase 1 filtra elegibilidade territorial; Fase 2 extrai favorabilidade; Fase 3
normaliza atributos do objeto; a síntese preserva todas as saídas e combina apenas
as fases quantitativas. Os produtores geoespaciais permanecem independentes.
"""

from __future__ import annotations

import secrets
import unicodedata
import uuid
import math
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from api.constants import TIPO_DEMANDA_COD_TO_ID, TIPO_DEMANDA_ID_TO_COD
from api.exceptions import (
    ConfigMulticriterioNotFoundError,
    DemandaValidationError,
    HierarquizacaoNotFoundError,
)
from api.matriz_colunas import extrair_colunas
from api.repositories import camada_geoespacial_repository as camada_repo
from api.repositories import config_multicriterio_repository as config_repo
from api.repositories import hierarquizacao_repository as repo
from api.repositories import sigma_usuario_repository
from api.schemas.hierarquizacao import (
    HierarquizacaoCreateSchema,
    HierarquizacaoFase1ExecutarSchema,
    HierarquizacaoFase1UpdateSchema,
    HierarquizacaoFase2ExecutarSchema,
    HierarquizacaoFase3AtributosSchema,
    HierarquizacaoFase3ExecutarSchema,
    HierarquizacaoResponseSchema,
    HierarquizacaoSinteseSchema,
    HierarquizacaoUpdateSchema,
)

_STATUS = {"rascunho", "em_julgamento", "calculada", "homologada", "arquivada"}


def _iso(v: Any) -> str | None:
    return (
        v.isoformat()
        if isinstance(v, datetime)
        else (str(v) if v is not None else None)
    )


def _uuid(v: str | None) -> str | None:
    try:
        return str(uuid.UUID(v)) if v else None
    except (ValueError, TypeError):
        return None


_nomes_cache: dict[str, str] = {}


def _nomes_usuarios(ids: list[str | None]) -> dict[str, str]:
    """Resolve UUIDs de usuário para nomes (via SIGMA), com cache em memória."""
    pendentes = [i for i in {x for x in ids if x} if i not in _nomes_cache]
    if pendentes:
        try:
            _nomes_cache.update(sigma_usuario_repository.nomes_por_ids(pendentes))
        except Exception:
            pass
    return {i: _nomes_cache[i] for i in ids if i and i in _nomes_cache}


def _codigo() -> str:
    return f"HIER-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}-{secrets.token_hex(2).upper()}"


def _response(row: dict[str, Any]) -> HierarquizacaoResponseSchema:
    tid = row.get("tipo_demanda_id")
    tipo_demanda = TIPO_DEMANDA_ID_TO_COD.get(tid) if isinstance(tid, int) else None
    homologado_por = str(row["homologado_por"]) if row.get("homologado_por") else None
    criado_por = str(row["criado_por"]) if row.get("criado_por") else None
    nomes = _nomes_usuarios([homologado_por, criado_por])
    return HierarquizacaoResponseSchema(
        id=str(row["id"]),
        codigo=row["codigo"],
        config_id=str(row["config_id"]) if row.get("config_id") else None,
        config_codigo=row.get("config_codigo"),
        nome=row["nome"],
        descricao=row.get("descricao"),
        tipo_demanda=tipo_demanda,
        tipo_demanda_id=tid,
        grupo_id=row.get("grupo_id"),
        status=row["status"],
        objetos=row.get("objetos") or [],
        julgamento_projetos=row.get("julgamento_projetos"),
        pesos_projetos=row.get("pesos_projetos"),
        ranking=row.get("ranking"),
        dados_hierarquizacao=row.get("dados_hierarquizacao") or {},
        relatorio_fase1=row.get("relatorio_fase1") or {},
        criadoEm=_iso(row.get("criado_em")) or "",
        atualizadoEm=_iso(row.get("atualizado_em")) or "",
        homologadoEm=_iso(row.get("homologado_em")),
        homologadoPor=homologado_por,
        criadoPor=criado_por,
        homologadoPorNome=nomes.get(homologado_por) if homologado_por else None,
        criadoPorNome=nomes.get(criado_por) if criado_por else None,
    )


def _carregar(codigo: str) -> dict[str, Any]:
    row = repo.get_by_codigo(codigo)
    if not row:
        raise HierarquizacaoNotFoundError(codigo)
    return row


def _linhas_matriz(matriz: Any) -> list[dict[str, Any]]:
    rows = matriz.get("linhas", []) if isinstance(matriz, dict) else (matriz or [])
    return [r for r in rows if isinstance(r, dict)]


def _valor(row: dict[str, Any], *nomes: str) -> Any:
    lower = {str(k).lower(): v for k, v in row.items()}
    return next((lower[n.lower()] for n in nomes if n.lower() in lower), None)


def _criterios(
    matriz: Any, *, fases_a_executar: list[int] | None = None
) -> tuple[dict[str, Any], dict[str, Any]]:
    f2: dict[str, Any] = {}
    f3: dict[str, Any] = {}
    fase_por_alias = {
        "1": 1, "fase1": 1, "fase_1": 1,
        "elegibilidade": 1, "elegibilidade_territorial": 1,
        "2": 2, "fase2": 2, "fase_2": 2,
        "favorabilidade": 2, "favorabilidade_territorial": 2,
        "3": 3, "fase3": 3, "fase_3": 3,
        "priorizacao": 3, "priorizacao_final": 3,
        "ajuste": 3, "ajuste_de_prioridade": 3, "ajuste_de_prioridades": 3,
        "ajuste_fino": 3, "ajuste_fino_de_prioridade": 3,
    }
    prefixos_fase = (
        ("elegibilidade", 1),
        ("favorabilidade", 2),
        ("priorizacao", 3),
        ("ajuste", 3),
    )

    def _classificar_fase(valor_normalizado: str) -> int | None:
        if not valor_normalizado:
            return None
        if valor_normalizado in fase_por_alias:
            return fase_por_alias[valor_normalizado]
        for prefixo, numero in prefixos_fase:
            if valor_normalizado.startswith(prefixo):
                return numero
        return None
    arquivo = (
        matriz.get("arquivo")
        if isinstance(matriz, dict)
        else None
    ) or "planilha carregada"
    aba = matriz.get("aba") if isinstance(matriz, dict) else None
    localizacao = f"arquivo “{arquivo}”" + (
        f", aba “{aba}”" if aba else ""
    )
    for indice, row in enumerate(_linhas_matriz(matriz), start=2):
        nome = _valor(row, "criterio", "critério", "nome")
        etapa_raw = (
            str(
                _valor(
                    row,
                    "etapa",
                    "etapa da hierarquização",
                    "etapa_hierarquizacao",
                )
                or ""
            ).strip()
        )
        etapa_sem_acento = unicodedata.normalize("NFKD", etapa_raw).encode(
            "ascii", "ignore"
        ).decode("ascii")
        etapa_norm = (
            etapa_sem_acento.lower()
            .replace(" ", "_")
            .replace("-", "_")
        )
        fase = _classificar_fase(etapa_norm)
        if not nome:
            continue
        if fase is None:
            valor_exibido = etapa_raw or "(vazio)"
            raise DemandaValidationError(
                (
                    "Não consegui identificar a fase de um critério na matriz de"
                    " premissas e critérios que você enviou.\n"
                    f"• Arquivo: {localizacao}\n"
                    f"• Linha {indice} da planilha\n"
                    f"• Critério: “{nome}”\n"
                    f"• Coluna Etapa lida: “{valor_exibido}”\n\n"
                    "Como corrigir:\n"
                    "1) Abra a planilha e localize a linha indicada.\n"
                    "2) Na coluna Etapa, escolha um dos três valores aceitos:\n"
                    "   • Elegibilidade territorial — critérios da Fase 1"
                    " (avaliados pelo motor geoespacial).\n"
                    "   • Favorabilidade territorial e da rede — critérios da Fase 2.\n"
                    "   • Priorização — critérios da Fase 3.\n"
                    "3) Salve o arquivo e reenvie a matriz.\n\n"
                    "Dica: você pode baixar novamente o modelo oficial em"
                    " “Baixar modelo” — a coluna Etapa já vem com validação por"
                    " lista suspensa contendo somente esses três valores."
                ),
                field="matriz.fase",
            )
        if fase == 1:
            continue
        modelo = {
            "criterio": str(nome),
            "valor": None,
            "resultado": None,
            "premissas": row,
        }
        if fase == 2:
            f2[str(nome)] = modelo
        else:
            f3[str(nome)] = modelo
    fases = set(fases_a_executar or [1, 2, 3])
    if (2 in fases or 3 in fases) and not f2 and not f3:
        raise DemandaValidationError(
            (
                "A matriz enviada não possui nenhum critério das Fases 2 ou 3.\n"
                f"• Arquivo: {localizacao}\n\n"
                "Como corrigir:\n"
                "1) Abra a matriz e verifique a coluna Etapa.\n"
                "2) Marque como “Favorabilidade territorial e da rede” (Fase 2) e/ou "
                "“Priorização” (Fase 3) os critérios que devem entrar"
                " no cálculo AHP.\n"
                "3) Salve e reenvie a matriz."
            ),
            field="matriz",
        )
    if 2 in fases and not f2:
        raise DemandaValidationError(
            (
                "Você selecionou a Fase 2, mas a matriz não tem nenhum critério"
                " marcado como “Favorabilidade territorial e da rede”.\n"
                f"• Arquivo: {localizacao}\n\n"
                "Como corrigir:\n"
                "• Na planilha, marque na coluna Etapa o valor "
                "“Favorabilidade territorial e da rede” para os critérios de Fase 2,"
                " ou desmarque a Fase 2 no cadastro desta rodada."
            ),
            field="matriz.fase",
        )
    if 3 in fases and not f3:
        raise DemandaValidationError(
            (
                "Você selecionou a Fase 3, mas a matriz não tem nenhum critério"
                " marcado como “Priorização”.\n"
                f"• Arquivo: {localizacao}\n\n"
                "Como corrigir:\n"
                "• Na planilha, marque na coluna Etapa o valor "
                "“Priorização” para os critérios de Fase 3, ou"
                " desmarque a Fase 3 no cadastro desta rodada."
            ),
            field="matriz.fase",
        )
    return f2, f3


def _fases_configuradas(dados: dict[str, Any]) -> set[int]:
    return {
        int(fase)
        for fase in dados.get("cabecalho_grupo", {}).get(
            "fases_a_executar", [1, 2, 3]
        )
        if str(fase).isdigit()
    }


def _exigir_fase(dados: dict[str, Any], fase: int) -> None:
    if fase not in _fases_configuradas(dados):
        raise DemandaValidationError(
            f"A Fase {fase} não faz parte desta rodada.", field="fases_a_executar"
        )


def _fase1_vazia() -> dict[str, Any]:
    return {
        "executada": False,
        "status_fase1": None,
        "alertas_fase1": [],
        "geometria_ou_area_afetada": None,
        "criterios_fase3_sugeridos": [],
        "restricao": {
            "encontrada": None,
            "valor": None,
            "resultado": None,
            "intersecoes": [],
        },
        "risco": {
            "avaliado": None,
            "encontrado": None,
            "valor": None,
            "resultado": None,
            "intersecoes": [],
        },
    }


def _coordenada_objeto(valor: Any, *, campo: str, indice: int) -> float | None:
    if valor is None or (isinstance(valor, str) and not valor.strip()):
        return None
    try:
        numero = float(valor)
    except (TypeError, ValueError) as exc:
        raise DemandaValidationError(
            f"Objeto {indice + 1}: campo {campo} inválido.",
            field=f"objetos[{indice}].{campo}",
        ) from exc
    if math.isnan(numero) or math.isinf(numero):
        return None
    if campo == "latitude" and not (-90 <= numero <= 90):
        raise DemandaValidationError(
            f"Objeto {indice + 1}: latitude fora da faixa permitida.",
            field=f"objetos[{indice}].latitude",
        )
    if campo == "longitude" and not (-180 <= numero <= 180):
        raise DemandaValidationError(
            f"Objeto {indice + 1}: longitude fora da faixa permitida.",
            field=f"objetos[{indice}].longitude",
        )
    return numero


def _normalizar_objeto_contrato(
    objeto: dict[str, Any], *, indice: int, tipo_demanda: str | None, grupo_id: str | None
) -> dict[str, Any]:
    demanda_id = str(objeto.get("id") or objeto.get("demanda_id") or "").strip()
    codigo = str(objeto.get("codigo") or "").strip()
    nome = str(objeto.get("nome") or "").strip()
    if not demanda_id:
        raise DemandaValidationError(
            f"Objeto {indice + 1}: informe id/demanda_id.",
            field=f"objetos[{indice}].id",
        )
    if not codigo:
        raise DemandaValidationError(
            f"Objeto {indice + 1}: informe o código.",
            field=f"objetos[{indice}].codigo",
        )
    if not nome:
        raise DemandaValidationError(
            f"Objeto {indice + 1}: informe o nome.",
            field=f"objetos[{indice}].nome",
        )

    latitude = _coordenada_objeto(
        objeto.get("latitude"), campo="latitude", indice=indice
    )
    longitude = _coordenada_objeto(
        objeto.get("longitude"), campo="longitude", indice=indice
    )

    contrato = {
        "demanda_id": demanda_id,
        "codigo": codigo,
        "nome": nome,
        "status": objeto.get("status"),
        "tipo_demanda": objeto.get("tipo_demanda") or tipo_demanda,
        "grupo_id": objeto.get("grupo_id") or grupo_id,
        "latitude": latitude,
        "longitude": longitude,
    }
    atributos = {
        k: v
        for k, v in objeto.items()
        if k
        not in {
            "id",
            "demanda_id",
            "codigo",
            "nome",
            "status",
            "tipo_demanda",
            "grupo_id",
            "latitude",
            "longitude",
        }
    }
    contrato["atributos"] = atributos
    return contrato


def _prazo_meses(ini: Any, fim: Any) -> int | None:
    try:
        a = datetime.fromisoformat(str(ini)[:10])
        b = datetime.fromisoformat(str(fim)[:10])
    except (TypeError, ValueError):
        return None
    return (b.year - a.year) * 12 + (b.month - a.month)


# Preenchimento híbrido dos atributos de Fase 3 (CONJUNTO MUTÁVEL — edite aqui).
#   "cadastro" -> valor intrínseco do cadastro (Vigência e recursos)
#   demais colunas -> "gestor" (preenchido depois no componente)
def _prefill_fase3(col_id: str, cadastro: dict[str, Any]) -> tuple[Any, str]:
    if col_id == "capex_custo_de_investimento":
        v = cadastro.get("valor_global")
        if v is None:
            v = (cadastro.get("complementos") or {}).get("valor_estimado")
        return (v, "cadastro") if v is not None else (None, "cadastro")
    if col_id == "prazo_de_implantacao":
        return (_prazo_meses(cadastro.get("vigencia_inicio"), cadastro.get("vigencia_fim")), "cadastro")
    return (None, "gestor")


def _atributos_fase3(colunas: list[dict[str, Any]], cadastro: dict[str, Any]) -> dict[str, Any]:
    """Slots de valor por atributo de Etapa 3, chaveados pelo id da coluna."""
    slots: dict[str, Any] = {}
    for col in colunas:
        valor, origem = _prefill_fase3(col["id"], cadastro)
        slots[col["id"]] = {
            "valor": valor,
            "origem": origem,
            "criterio": col.get("criterio"),
            "alias": col.get("alias"),
            "unidade": col.get("unidade"),
            "tipo": col.get("tipo"),
            "relacao": col.get("relacao"),
            "mandatorio": col.get("mandatorio"),
        }
    return slots


def criar_hierarquizacao(
    payload: HierarquizacaoCreateSchema, *, criado_por: str | None = None
) -> HierarquizacaoResponseSchema:
    if not payload.objetos:
        raise DemandaValidationError("Selecione ao menos uma demanda.", field="objetos")
    tid = TIPO_DEMANDA_COD_TO_ID.get(payload.tipo_demanda or "")
    config = None
    if payload.config_codigo:
        config = config_repo.get_by_codigo("portfolio", payload.config_codigo)
        if not config:
            raise ConfigMulticriterioNotFoundError(payload.config_codigo)
        tid = config.get("tipo_demanda_id")
    if tid is None:
        raise DemandaValidationError("Tipo de demanda inválido.", field="tipo_demanda")
    f2, f3 = _criterios(
        payload.matriz_premissas_criterios,
        fases_a_executar=payload.fases_a_executar,
    )
    colunas_f3 = extrair_colunas(payload.matriz_premissas_criterios)
    codigo = _codigo()
    objetos_doc = []
    for idx, o in enumerate(payload.objetos):
        cabecalho = _normalizar_objeto_contrato(
            o,
            indice=idx,
            tipo_demanda=payload.tipo_demanda,
            grupo_id=payload.grupo_id,
        )
        cabecalho["atributos_fase3"] = _atributos_fase3(
            colunas_f3, cabecalho.get("atributos") or {}
        )
        objetos_doc.append(
            {
                "cabecalho_objeto": cabecalho,
                "hierarquizacao": {
                    "fase_1": _fase1_vazia(),
                    "fase_2": {
                        "executada": False,
                        "score_fase2": None,
                        "ranking_fase2": None,
                        "valor_por_dimensao": {},
                        "valor_por_criterio": deepcopy(f2),
                        "metodo_extracao": None,
                        "geometria_usada_na_extracao": None,
                    },
                    "fase_3": {
                        "executada": False,
                        "score_fase3": None,
                        "ranking_fase3": None,
                        "criterios": deepcopy(f3),
                        "atributos_utilizados": [],
                        "atributos_ausentes": [],
                        "atributos_invalidos": [],
                        "grau_completude_fase3": None,
                        "contribuicao_por_criterio": {},
                    },
                    "sintese": {
                        "executada": False,
                        "score_final": None,
                        "posicao_final": None,
                    },
                },
            }
        )
    dados = {
        "versao": 1,
        "cabecalho_grupo": {
            "codigo": codigo,
            "nome": payload.nome.strip(),
            "descricao": payload.descricao,
            "tipo_demanda": payload.tipo_demanda,
            "quantidade_objetos": len(objetos_doc),
            "matriz_premissas_criterios": payload.matriz_premissas_criterios,
            "fases_a_executar": payload.fases_a_executar,
            "pacotes": {},
            "criado_em": datetime.now(timezone.utc).isoformat(),
        },
        "objetos": objetos_doc,
    }
    data: dict[str, Any] = {
        "codigo": codigo,
        "nome": payload.nome.strip(),
        "descricao": payload.descricao,
        "tipo_demanda_id": tid,
        "grupo_id": payload.grupo_id,
        "status": "rascunho",
        "objetos": payload.objetos,
        "dados_hierarquizacao": dados,
    }
    if config:
        data["config_id"] = config["id"]
    uid = _uuid(criado_por)
    if uid:
        data["criado_por"] = uid
    return _response(repo.insert(data))


def listar_hierarquizacoes(
    *, status: str | None = None, grupo: str | None = None
) -> list[HierarquizacaoResponseSchema]:
    return [_response(r) for r in repo.list_all(status=status, grupo=grupo)]


def obter_hierarquizacao(codigo: str) -> HierarquizacaoResponseSchema:
    return _response(_carregar(codigo))


def excluir_hierarquizacao(codigo: str) -> None:
    """Remove definitivamente uma hierarquização do portfólio."""
    if not repo.get_by_codigo(codigo):
        raise HierarquizacaoNotFoundError(codigo)
    if not repo.delete_by_codigo(codigo):
        raise HierarquizacaoNotFoundError(codigo)


def matriz_da_hierarquizacao(codigo: str) -> Any:
    """Matriz de critérios e premissas armazenada na hierarquização."""
    dados = _carregar(codigo).get("dados_hierarquizacao") or {}
    return (dados.get("cabecalho_grupo") or {}).get("matriz_premissas_criterios")


def atualizar_hierarquizacao(
    codigo: str, payload: HierarquizacaoUpdateSchema
) -> HierarquizacaoResponseSchema:
    row = _carregar(codigo)
    raw = payload.model_dump(exclude_unset=True)
    data = {}
    for key in {
        "nome",
        "descricao",
        "status",
        "objetos",
        "julgamento_projetos",
        "dados_hierarquizacao",
    }:
        if key in raw:
            data[key] = raw[key]
    if raw.get("config_codigo"):
        cfg = config_repo.get_by_codigo("portfolio", raw["config_codigo"])
        if not cfg:
            raise ConfigMulticriterioNotFoundError(raw["config_codigo"])
        data["config_id"] = cfg["id"]
    if data.get("status") and data["status"] not in _STATUS:
        raise DemandaValidationError("Status inválido.", field="status")
    return _response(repo.update(codigo, data) or row)


def listar_pacotes_fase(modulo: str) -> list[dict[str, Any]]:
    return repo.listar_pacotes_homologados(modulo)


def listar_fatiamentos_fase1() -> list[dict[str, Any]]:
    return repo.listar_fatiamentos_fase1()


def salvar_fatiamento_fase1(payload: Any) -> dict[str, Any]:
    return repo.salvar_fatiamento_fase1(payload.model_dump())


def _detalhar_hit(hit: dict[str, Any], *, risco: bool) -> dict[str, Any]:
    a = dict(hit.get("propriedades") or {})
    item = {
        "camada_origem": a.get("fonte_nome")
        or a.get("camada_origem")
        or hit.get("camada_origem")
        or "",
        "feature_id": str(
            a.get("feicao_origem_id")
            or a.get("feature_id")
            or a.get("id")
            or hit.get("ordem")
            or ""
        ),
        "nome": a.get("criterio_nome") or a.get("nome") or a.get("name") or "",
        "esfera": a.get("esfera") or a.get("jurisdicao") or "",
        "fonte_id": a.get("fonte_id"),
        "criterio_id": a.get("criterio_id"),
        "criterio_nome": a.get("criterio_nome"),
        "tipo_tratamento": a.get("tipo_tratamento"),
        "severidade": a.get("severidade"),
        "base_legal_ou_tecnica": a.get("base_legal_ou_tecnica"),
        "atributos": a,
        "geometria": hit.get("geometria"),
    }
    if risco:
        item["nivel"] = (
            a.get("nivel") or a.get("severidade") or a.get("classe_risco") or ""
        )
    return item


def mapa_sobreposicao_fase1(codigo: str) -> dict[str, Any]:
    row = repo.get_by_codigo(codigo)
    if not row:
        raise HierarquizacaoNotFoundError(codigo)
    dados = row.get("dados_hierarquizacao") or {}
    rel = row.get("relatorio_fase1") or {}
    cr_id = ((rel.get("camadas") or {}).get("restricao") or {}).get("id")
    ck_id = ((rel.get("camadas") or {}).get("risco") or {}).get("id")
    itens: list[dict[str, Any]] = []
    for obj in dados.get("objetos", []) or []:
        cab = obj.get("cabecalho_objeto") or {}
        f1 = (obj.get("hierarquizacao") or {}).get("fase_1") or {}
        status = f1.get("status_fase1")
        if status not in ("restrito", "apto_com_ressalva"):
            continue
        geo = f1.get("geometria_ou_area_afetada") or {}
        lat = geo.get("latitude") or cab.get("latitude")
        lon = geo.get("longitude") or cab.get("longitude")
        try:
            lat = float(lat)
            lon = float(lon)
        except (TypeError, ValueError):
            continue
        feicoes: list[dict[str, Any]] = []
        if cr_id and status == "restrito":
            for h in repo.intersecoes_camada(cr_id, longitude=lon, latitude=lat):
                d = _detalhar_hit(h, risco=False)
                if d.get("geometria"):
                    feicoes.append({
                        "nome": d.get("nome") or d.get("criterio_nome") or d.get("camada_origem") or "",
                        "tipo": "restricao",
                        "geometria": d.get("geometria"),
                        "esfera": d.get("esfera"),
                        "criterio_id": d.get("criterio_id"),
                        "atributos": d.get("atributos") or {},
                    })
        if ck_id and status == "apto_com_ressalva":
            for h in repo.intersecoes_camada(ck_id, longitude=lon, latitude=lat):
                d = _detalhar_hit(h, risco=True)
                if d.get("geometria"):
                    feicoes.append({
                        "nome": d.get("nome") or d.get("criterio_nome") or d.get("camada_origem") or "",
                        "tipo": "risco",
                        "geometria": d.get("geometria"),
                        "esfera": d.get("esfera"),
                        "criterio_id": d.get("criterio_id"),
                        "atributos": d.get("atributos") or {},
                    })
        itens.append({
            "codigo": cab.get("codigo") or cab.get("demanda_id") or "",
            "nome": cab.get("nome") or "",
            "status": status,
            "latitude": lat,
            "longitude": lon,
            "feicoes": feicoes,
        })
    return {"itens": itens}


def _numero_atributo(item: dict[str, Any], tipo: str) -> float:
    attrs = item.get("atributos") or {}
    nomes = (
        f"indice_{tipo}_calculado",
        f"indice_{tipo}",
        "indice_calculado",
        "indice",
        "valor",
    )
    for nome in nomes:
        try:
            if attrs.get(nome) is not None:
                return float(attrs[nome])
        except (TypeError, ValueError):
            continue
    return 4.0 if tipo == "restricao" else 1.0


def _media_ponderada_itens(
    itens: list[dict[str, Any]], parametros: dict[str, Any], tipo: str
) -> float:
    pesos_config = parametros.get("pesos") or {}
    soma = 0.0
    soma_pesos = 0.0
    for item in itens:
        chave = (
            item.get("criterio_id")
            or item.get("criterio_nome")
            or item.get("nome")
            or item.get("feature_id")
        )
        try:
            peso = max(0.0, float(pesos_config.get(str(chave), 1.0)))
        except (TypeError, ValueError):
            peso = 1.0
        soma += _numero_atributo(item, tipo) * peso
        soma_pesos += peso
    return soma / soma_pesos if soma_pesos else 0.0


def _reclassificar(valor: float, parametros: dict[str, Any], tipo: str) -> str:
    if tipo == "restricao":
        limiar = float((parametros.get("restricao") or {}).get("limiar", 1))
        return "restricao" if valor >= limiar else "sem_restricao"
    for classe in (parametros.get("risco") or {}).get("classes", []):
        minimo, maximo = classe.get("minimo"), classe.get("maximo")
        if (minimo is None or valor >= float(minimo)) and (
            maximo is None or valor < float(maximo)
        ):
            return str(
                classe.get("codigo") or classe.get("rotulo") or "nao_classificado"
            )
    return "nao_classificado"


def executar_fase_1(
    codigo: str, payload: HierarquizacaoFase1ExecutarSchema
) -> HierarquizacaoResponseSchema:
    inicio = datetime.now(timezone.utc)
    row = _carregar(codigo)
    if payload.par_id:
        pacote = repo.obter_pacote_homologado(payload.par_id, "fase1")
        if not pacote:
            raise DemandaValidationError(
                "Conjunto homologado da Fase 1 não encontrado.", field="par_id"
            )
        camadas = pacote.get("camadas") or []
        cr = next((c for c in camadas if c.get("id") == payload.camada_restricao_id), None)
        ck = next((c for c in camadas if c.get("id") == payload.camada_risco_id), None)
        if not cr or not ck:
            raise DemandaValidationError(
                "As duas camadas devem pertencer ao mesmo conjunto homologado.",
                field="par_id",
            )
    else:
        biblioteca = camada_repo.listar_biblioteca("fase1")
        cr = next((c for c in biblioteca if c.get("id") == payload.camada_restricao_id), None)
        ck = next((c for c in biblioteca if c.get("id") == payload.camada_risco_id), None)
        if not cr:
            raise DemandaValidationError(
                "Camada de restrição não encontrada na biblioteca canônica.",
                field="camada_restricao_id",
            )
        if not ck:
            raise DemandaValidationError(
                "Camada de risco não encontrada na biblioteca canônica.",
                field="camada_risco_id",
            )
        # Downstream espera cr["id"]/ck["id"] como UUID de camada_homologada; listar_biblioteca retorna recurso_sessao_id.
        cr = {**cr, "id": str(cr.get("homologacao_id"))}
        ck = {**ck, "id": str(ck.get("homologacao_id"))}
    if (
        "restri"
        not in (
            str(cr.get("finalidade") or "") + str(cr.get("metadados") or {})
        ).lower()
    ):
        raise DemandaValidationError(
            "A camada indicada não é uma camada de restrição.",
            field="camada_restricao_id",
        )
    if (
        "risco"
        not in (
            str(ck.get("finalidade") or "") + str(ck.get("metadados") or {})
        ).lower()
    ):
        raise DemandaValidationError(
            "A camada indicada não é uma camada de risco.", field="camada_risco_id"
        )
    fatiamento = repo.obter_fatiamento_fase1(payload.configuracao_fatiamento_id)
    if not fatiamento:
        raise DemandaValidationError(
            "Configuração de fatiamento não encontrada.",
            field="configuracao_fatiamento_id",
        )
    parametros = fatiamento.get("parametros") or {}
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
    _exigir_fase(dados, 1)
    sugeridos: dict[str, dict[str, Any]] = {}
    contagem = {
        "objetos": 0,
        "restritos": 0,
        "com_risco": 0,
        "sem_ocorrencia": 0,
        "sem_coordenadas": 0,
    }
    for obj in dados.get("objetos", []):
        contagem["objetos"] += 1
        cab = obj["cabecalho_objeto"]
        lat, lon = cab.get("latitude"), cab.get("longitude")
        if lat is None or lon is None:
            contagem["sem_coordenadas"] += 1
            raise DemandaValidationError(
                f"Demanda {cab.get('codigo')} sem coordenadas.",
                field="objetos.coordenadas",
            )
        rh = [
            _detalhar_hit(x, risco=False)
            for x in repo.intersecoes_camada(
                cr["id"], longitude=float(lon), latitude=float(lat)
            )
        ]
        if rh:
            valores = [_numero_atributo(x, "restricao") for x in rh]
            # Restrição nunca pode ser diluída pela média de outras
            # incidências. A taxonomia da Fase 1 exige o maior valor restritivo.
            valor = max(valores)
            arredondado = _reclassificar(valor, parametros, "restricao")
            f1 = _fase1_vazia()
            f1.update(
                {
                    "executada": True,
                    "status_fase1": "restrito",
                    "alertas_fase1": ["Objeto segregado do ranking ordinário."],
                }
            )
            f1["restricao"] = {
                "encontrada": True,
                "indice_calculado": valor,
                "indice_arredondado": arredondado,
                "resultado": "Com restrição",
                "intersecoes": rh,
            }
            f1["risco"] = {
                "avaliado": False,
                "encontrado": None,
                "valor": None,
                "resultado": "Não avaliado devido à existência de restrição",
                "intersecoes": [],
            }
            f1["restricoes_intersectadas"] = rh
            f1["riscos_intersectados"] = []
            f1["geometria_ou_area_afetada"] = {
                "tipo": "Point",
                "longitude": lon,
                "latitude": lat,
                "quantidade_intersecoes": len(rh),
            }
            contagem["restritos"] += 1
        else:
            kh = [
                _detalhar_hit(x, risco=True)
                for x in repo.intersecoes_camada(
                    ck["id"], longitude=float(lon), latitude=float(lat)
                )
            ]
            valor = _media_ponderada_itens(kh, parametros, "risco") if kh else 0.0
            arredondado = (
                _reclassificar(valor, parametros, "risco") if kh else "sem_risco"
            )
            sugestoes = []
            for x in kh:
                nome_risco = (
                    x.get("criterio_nome") or x.get("nome") or x.get("feature_id")
                )
                sid = "risco:" + str(x.get("criterio_id") or nome_risco)
                sugestao = {
                    "atributo_id": sid,
                    "nome_coluna": sid,
                    "criterio": nome_risco,
                    "tipo_dado": "booleano",
                    "direcao": "menor_melhor",
                    "origem": "fase1_risco",
                }
                sugeridos[sid] = sugestao
                sugestoes.append(sugestao)
            f1 = _fase1_vazia()
            f1.update(
                {
                    "executada": True,
                    "status_fase1": "apto_com_ressalva" if kh else "apto",
                    "alertas_fase1": [
                        f"{len(kh)} risco(s) territorial(is) identificado(s)."
                    ]
                    if kh
                    else [],
                    "criterios_fase3_sugeridos": sugestoes,
                }
            )
            f1["restricao"] = {
                "encontrada": False,
                "indice_calculado": 0,
                "indice_arredondado": "sem_restricao",
                "resultado": "Sem restrição",
                "intersecoes": [],
            }
            f1["risco"] = {
                "avaliado": True,
                "encontrado": bool(kh),
                "indice_calculado": valor,
                "indice_arredondado": arredondado,
                "resultado": "Com risco" if kh else "Sem risco",
                "intersecoes": kh,
            }
            f1["restricoes_intersectadas"] = []
            f1["riscos_intersectados"] = kh
            f1["geometria_ou_area_afetada"] = {
                "tipo": "Point",
                "longitude": lon,
                "latitude": lat,
                "quantidade_intersecoes": len(kh),
            }
            contagem["com_risco" if kh else "sem_ocorrencia"] += 1
        obj["hierarquizacao"]["fase_1"] = f1
    dados["cabecalho_grupo"].setdefault("pacotes", {})["fase_1"] = {
        **{
            k: (pacote.get(k) if payload.par_id else None)
            for k in (
                "pacote_id",
                "codigo",
                "nome",
                "versao",
                "status",
                "crs_saida",
                "metadados",
            )
        },
        "camada_restricao_id": cr["id"],
        "camada_risco_id": ck["id"],
        "configuracao_fatiamento": fatiamento,
    }
    dados["cabecalho_grupo"]["criterios_fase3_sugeridos"] = list(sugeridos.values())
    fim = datetime.now(timezone.utc)
    relatorio = {
        "fase": 1,
        "hierarquizacao": codigo,
        "iniciado_em": inicio.isoformat(),
        "concluido_em": fim.isoformat(),
        "duracao_ms": round((fim - inicio).total_seconds() * 1000),
        "operacao": "ST_Intersects (restrição precedente ao risco)",
        "par_id": payload.par_id,
        "camadas": {"restricao": cr, "risco": ck},
        "fatiamento": fatiamento,
        "resumo": contagem,
    }
    return _response(
        repo.update(
            codigo,
            {
                "dados_hierarquizacao": dados,
                "relatorio_fase1": relatorio,
                "status": "em_julgamento",
            },
        )
        or row
    )


def salvar_fase_1(
    codigo: str, payload: HierarquizacaoFase1UpdateSchema
) -> HierarquizacaoResponseSchema:
    row = _carregar(codigo)
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
    _exigir_fase(dados, 1)
    enviados = {
        str(x.get("demanda_id")): x.get("fase_1") for x in payload.resultados_objetos
    }
    for obj in dados.get("objetos", []):
        oid = str(obj.get("cabecalho_objeto", {}).get("demanda_id"))
        if oid in enviados:
            obj["hierarquizacao"]["fase_1"] = enviados[oid]
    return _response(repo.update(codigo, {"dados_hierarquizacao": dados}) or row)


def executar_fase_2(
    codigo: str, payload: HierarquizacaoFase2ExecutarSchema
) -> HierarquizacaoResponseSchema:
    if payload.metodo_extracao != "ponto":
        raise DemandaValidationError(
            "Esta versão aceita extração pontual.", field="metodo_extracao"
        )
    row = _carregar(codigo)
    pacote = repo.obter_pacote_homologado(payload.pacote_id, "fase2")
    if not pacote:
        raise DemandaValidationError(
            "Pacote homologado da Fase 2 não encontrado.", field="pacote_id"
        )
    raster_meta = next(
        (c for c in pacote.get("camadas", []) if c.get("tipo") == "raster"), None
    )
    if not raster_meta:
        raise DemandaValidationError(
            "Pacote sem raster final homologado.", field="pacote_id"
        )
    raster = repo.raster_homologado(raster_meta["id"])
    if not raster:
        raise DemandaValidationError(
            "Conteúdo do raster homologado não encontrado.", field="pacote_id"
        )
    from rasterio.io import MemoryFile
    from rasterio.warp import transform

    dados = deepcopy(row.get("dados_hierarquizacao") or {})
    _exigir_fase(dados, 2)
    scores = []
    with MemoryFile(bytes(raster["dados_geotiff"])) as mem:
        with mem.open() as ds:
            for obj in dados.get("objetos", []):
                cab = obj["cabecalho_objeto"]
                lat, lon = cab.get("latitude"), cab.get("longitude")
                if lat is None or lon is None:
                    raise DemandaValidationError(
                        f"Demanda {cab.get('codigo')} sem coordenadas.",
                        field="objetos.coordenadas",
                    )
                if not ds.crs or str(ds.crs) == "EPSG:4326":
                    xs, ys = [float(lon)], [float(lat)]
                else:
                    coordenadas = transform(
                        "EPSG:4326", ds.crs, [float(lon)], [float(lat)]
                    )
                    xs, ys = coordenadas[0], coordenadas[1]
                sample = next(ds.sample([(xs[0], ys[0])], masked=True))
                score = None if bool(sample.mask[0]) else float(sample[0])
                if score is not None and (
                    not math.isfinite(score) or score < 0 or score > 1
                ):
                    raise DemandaValidationError(
                        f"Raster homologado retornou valor fora da faixa 0–1 para "
                        f"{cab.get('codigo')}: {score}.",
                        field="pacote_id",
                    )
                f2 = obj["hierarquizacao"]["fase_2"]
                f2.update(
                    {
                        "executada": True,
                        "score_fase2": score,
                        "metodo_extracao": "ponto",
                        "geometria_usada_na_extracao": {
                            "tipo": "Point",
                            "longitude": lon,
                            "latitude": lat,
                        },
                        "pacote_id": payload.pacote_id,
                        "valor_por_criterio": {
                            "favorabilidade_territorial": score
                        },
                    }
                )
                if score is not None:
                    scores.append((obj, score))
    for pos, (obj, _score) in enumerate(
        sorted(scores, key=lambda x: x[1], reverse=True), 1
    ):
        obj["hierarquizacao"]["fase_2"]["ranking_fase2"] = pos
    dados["cabecalho_grupo"].setdefault("pacotes", {})["fase_2"] = {
        k: pacote.get(k)
        for k in (
            "pacote_id",
            "codigo",
            "nome",
            "versao",
            "status",
            "crs_saida",
            "metadados",
        )
    }
    dados["cabecalho_grupo"].setdefault("relatorios", {})["fase_2"] = {
        "executada_em": datetime.now(timezone.utc).isoformat(),
        "metodo_extracao": payload.metodo_extracao,
        "pacote_id": payload.pacote_id,
        "objetos_avaliados": len(dados.get("objetos", [])),
        "objetos_com_score": len(scores),
    }
    return _response(
        repo.update(codigo, {"dados_hierarquizacao": dados, "status": "em_julgamento"})
        or row
    )


def _normalizar(
    valores: list[Any], criterio: dict[str, Any]
) -> tuple[dict[str, float | None], set[int], set[int]]:
    tipo = criterio.get("tipo_dado", "numerico")
    direcao = criterio.get("direcao", "maior_melhor")
    mapping = criterio.get("mapeamento") or {}
    converted: list[float | None] = []
    ausentes: set[int] = set()
    invalidos: set[int] = set()
    bool_true = {"1", "true", "sim", "s", "yes"}
    bool_false = {"0", "false", "nao", "não", "n", "no"}
    for idx, v in enumerate(valores):
        try:
            if v is None or v == "":
                x = None
                ausentes.add(idx)
            elif tipo == "booleano":
                token = str(v).strip().lower()
                if token in bool_true:
                    x = 1.0
                elif token in bool_false:
                    x = 0.0
                else:
                    raise ValueError("booleano inválido")
            elif tipo in {"ordinal", "categorico"}:
                x = float(mapping[str(v)])
            else:
                x = float(v)
        except (ValueError, TypeError, KeyError):
            x = None
            invalidos.add(idx)
        converted.append(x)
    validos = [x for x in converted if x is not None]
    lo = criterio.get("valor_minimo")
    hi = criterio.get("valor_maximo")
    lo = float(lo) if lo is not None else (min(validos) if validos else 0.0)
    hi = float(hi) if hi is not None else (max(validos) if validos else 0.0)
    result = {}
    for idx, x in enumerate(converted):
        if x is None:
            n = None
        elif tipo == "numerico":
            n = (x - lo) / (hi - lo) if hi > lo else 1.0
        else:
            n = x
        if n is not None and direcao in {"menor_melhor", "negativa"}:
            n = 1 - n
        if n is not None and (not math.isfinite(n) or n < 0 or n > 1):
            n = None
            invalidos.add(idx)
        result[str(idx)] = n
    return result, ausentes, invalidos


def _valor_atributo_objeto(obj: dict[str, Any], chave: Any) -> Any:
    """Valor do atributo de Fase 3 do objeto: prioriza os slots ``atributos_fase3``."""
    cab = obj.get("cabecalho_objeto") or {}
    af3 = cab.get("atributos_fase3") or {}
    slot = af3.get(chave)
    if not isinstance(slot, dict):
        slot = next(
            (s for s in af3.values() if isinstance(s, dict) and s.get("criterio") == chave),
            None,
        )
    if isinstance(slot, dict) and slot.get("valor") is not None:
        return slot.get("valor")
    return (cab.get("atributos") or {}).get(chave)


def executar_fase_3(
    codigo: str, payload: HierarquizacaoFase3ExecutarSchema
) -> HierarquizacaoResponseSchema:
    row = _carregar(codigo)
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
    _exigir_fase(dados, 3)
    objs = dados.get("objetos", [])
    if not payload.criterios:
        raise DemandaValidationError(
            "Informe ao menos um critério da Fase 3.", field="criterios"
        )
    pesos = [max(0.0, float(c.get("peso", 0))) for c in payload.criterios]
    total = sum(pesos)
    if total <= 0:
        raise DemandaValidationError(
            "A soma dos pesos deve ser positiva.", field="criterios.peso"
        )
    if payload.modo_pesos == "normalizados":
        pesos = [p / total for p in pesos]
    norm_por_criterio = []
    for c in payload.criterios:
        chave = c.get("nome_coluna") or c.get("atributo_id") or c.get("criterio")
        if str(chave).startswith("risco:"):
            alvo = str(chave)[6:]
            vals = [
                1
                if any(
                    str(
                        x.get("criterio_id")
                        or x.get("criterio_nome")
                        or x.get("nome")
                        or x.get("feature_id")
                    )
                    == alvo
                    for x in o["hierarquizacao"]["fase_1"]
                    .get("risco", {})
                    .get("intersecoes", [])
                )
                else 0
                for o in objs
            ]
        else:
            vals = [_valor_atributo_objeto(o, chave) for o in objs]
        norm_por_criterio.append(_normalizar(vals, c))
    ranqueaveis = []
    for i, obj in enumerate(objs):
        contrib = {}
        ausentes = []
        invalidos = []
        soma = 0.0
        pesos_validos = 0.0
        falha_obrigatoria = False
        for j, c in enumerate(payload.criterios):
            nome = (
                c.get("criterio")
                or c.get("rotulo")
                or c.get("nome_coluna")
                or f"Critério {j + 1}"
            )
            normalizados, indices_ausentes, indices_invalidos = norm_por_criterio[j]
            n = normalizados[str(i)]
            if n is None:
                falha_obrigatoria = falha_obrigatoria or c.get("obrigatorio") is True
                if i in indices_invalidos:
                    invalidos.append(nome)
                else:
                    ausentes.append(nome)
                if payload.regra_ausentes == "imputar_neutro":
                    n = 0.5
                elif payload.regra_ausentes == "imputar_pior":
                    n = 0.0
                elif payload.regra_ausentes == "imputar_medio":
                    existentes = [v for v in normalizados.values() if v is not None]
                    n = sum(existentes) / len(existentes) if existentes else 0.5
                else:
                    continue
            contrib[nome] = n * pesos[j]
            soma += contrib[nome]
            pesos_validos += pesos[j]
        completude = (len(payload.criterios) - len(ausentes) - len(invalidos)) / len(
            payload.criterios
        )
        bloqueado = payload.regra_ausentes == "bloquear" and bool(
            ausentes or invalidos
        )
        contribuicoes_aplicadas = (
            {nome: valor / pesos_validos for nome, valor in contrib.items()}
            if pesos_validos
            else {}
        )
        score = (
            sum(contribuicoes_aplicadas.values())
            if pesos_validos
            and completude >= payload.completude_minima
            and not falha_obrigatoria
            and not bloqueado
            else None
        )
        f3 = obj["hierarquizacao"]["fase_3"]
        f3.update(
            {
                "executada": True,
                "score_fase3": score,
                "atributos_utilizados": list(contrib),
                "atributos_ausentes": ausentes,
                "atributos_invalidos": invalidos,
                "grau_completude_fase3": completude,
                "pesos_fase3": dict(
                    zip(
                        [
                            c.get("criterio") or c.get("nome_coluna")
                            for c in payload.criterios
                        ],
                        pesos,
                    )
                ),
                "contribuicao_por_criterio": contribuicoes_aplicadas,
                "regra_ausentes": payload.regra_ausentes,
                "bloqueada_por_atributo_obrigatorio": falha_obrigatoria,
            }
        )
        if score is not None:
            ranqueaveis.append((obj, score))
    for pos, (obj, _score) in enumerate(
        sorted(ranqueaveis, key=lambda x: x[1], reverse=True), 1
    ):
        obj["hierarquizacao"]["fase_3"]["ranking_fase3"] = pos
    dados["cabecalho_grupo"].setdefault("configuracoes", {})["fase_3"] = (
        payload.model_dump()
    )
    dados["cabecalho_grupo"].setdefault("relatorios", {})["fase_3"] = {
        "executada_em": datetime.now(timezone.utc).isoformat(),
        "objetos_avaliados": len(objs),
        "objetos_com_score": len(ranqueaveis),
        "completude_minima": payload.completude_minima,
        "regra_ausentes": payload.regra_ausentes,
    }
    return _response(
        repo.update(codigo, {"dados_hierarquizacao": dados, "status": "em_julgamento"})
        or row
    )


def salvar_atributos_fase3(
    codigo: str, payload: HierarquizacaoFase3AtributosSchema
) -> HierarquizacaoResponseSchema:
    """Persiste os valores editados dos slots ``atributos_fase3`` por objeto."""
    row = _carregar(codigo)
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
    por_codigo = payload.valores or {}
    for obj in dados.get("objetos", []):
        cab = obj.get("cabecalho_objeto") or {}
        atualizacoes = por_codigo.get(cab.get("codigo"))
        if not atualizacoes:
            continue
        slots = cab.setdefault("atributos_fase3", {})
        for col_id, valor in atualizacoes.items():
            slot = slots.get(col_id)
            if not isinstance(slot, dict):
                slot = slots[col_id] = {"origem": "gestor"}
            slot["valor"] = valor
    return _response(repo.update(codigo, {"dados_hierarquizacao": dados}) or row)


def sintetizar(
    codigo: str, payload: HierarquizacaoSinteseSchema
) -> HierarquizacaoResponseSchema:
    row = _carregar(codigo)
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
    fases = _fases_configuradas(dados)
    if {2, 3}.issubset(fases) and abs(
        payload.peso_fase2 + payload.peso_fase3 - 1
    ) > 1e-6:
        raise DemandaValidationError(
            "Os pesos das Fases 2 e 3 devem somar 1.", field="pesos"
        )
    ranking = []
    for obj in dados.get("objetos", []):
        h = obj["hierarquizacao"]
        restrito = h["fase_1"].get("status_fase1") == "restrito"
        s2, s3 = h["fase_2"].get("score_fase2"), h["fase_3"].get("score_fase3")
        if restrito and not payload.incluir_restritos:
            score = None
        elif s2 is not None and s3 is not None:
            score = payload.peso_fase2 * s2 + payload.peso_fase3 * s3
        else:
            score = s2 if s2 is not None else s3
        h["sintese"] = {
            "executada": True,
            "score_final": score,
            "posicao_final": None,
            "restrito_segregado": restrito and not payload.incluir_restritos,
            "contribuicoes": {
                "fase_2": payload.peso_fase2 * s2 if s2 is not None and s3 is not None else s2,
                "fase_3": payload.peso_fase3 * s3 if s2 is not None and s3 is not None else s3,
            },
            "motivo": (
                "Restrição territorial segregou o objeto."
                if restrito and not payload.incluir_restritos
                else "Composição ponderada das Fases 2 e 3."
                if s2 is not None and s3 is not None
                else "Resultado da única fase quantitativa disponível."
                if score is not None
                else "Nenhuma fase quantitativa produziu score."
            ),
        }
        if score is not None:
            ranking.append((obj, score))
    final = []
    for pos, (obj, score) in enumerate(
        sorted(ranking, key=lambda x: x[1], reverse=True), 1
    ):
        obj["hierarquizacao"]["sintese"]["posicao_final"] = pos
        c = obj["cabecalho_objeto"]
        final.append(
            {
                "posicao": pos,
                "demanda_id": c["demanda_id"],
                "codigo": c.get("codigo"),
                "nome": c.get("nome"),
                "score": score,
            }
        )
    dados["cabecalho_grupo"]["sintese"] = payload.model_dump()
    dados["cabecalho_grupo"].setdefault("relatorios", {})["sintese"] = {
        "executada_em": datetime.now(timezone.utc).isoformat(),
        "fases_configuradas": sorted(fases),
        "objetos_ranqueados": len(final),
        "objetos_segregados": sum(
            1
            for obj in dados.get("objetos", [])
            if obj["hierarquizacao"]["sintese"].get("restrito_segregado")
        ),
    }
    return _response(
        repo.update(
            codigo,
            {"dados_hierarquizacao": dados, "ranking": final, "status": "calculada"},
        )
        or row
    )


def calcular_hierarquizacao(codigo: str) -> HierarquizacaoResponseSchema:
    return sintetizar(
        codigo,
        HierarquizacaoSinteseSchema(peso_fase2=0.7, peso_fase3=0.3),
    )


def homologar_hierarquizacao(
    codigo: str, *, homologado_por: str | None = None
) -> HierarquizacaoResponseSchema:
    row = _carregar(codigo)
    if not row.get("ranking"):
        raise DemandaValidationError(
            "Gere a síntese antes de homologar.", field="status"
        )
    data: dict[str, Any] = {
        "status": "homologada",
        "homologado_em": datetime.now(timezone.utc),
    }
    uid = _uuid(homologado_por)
    if uid:
        data["homologado_por"] = uid
    return _response(repo.update(codigo, data) or row)
