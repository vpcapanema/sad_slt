"""Motor da espinha dorsal de hierarquização.

Fase 1 filtra elegibilidade territorial; Fase 2 extrai favorabilidade; Fase 3
normaliza atributos do objeto; a síntese preserva todas as saídas e combina apenas
as fases quantitativas. Os produtores geoespaciais permanecem independentes.
"""

from __future__ import annotations

import secrets
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from api.constants import TIPO_DEMANDA_COD_TO_ID, TIPO_DEMANDA_ID_TO_COD
from api.exceptions import (
    ConfigMulticriterioNotFoundError,
    DemandaValidationError,
    HierarquizacaoNotFoundError,
)
from api.repositories import config_multicriterio_repository as config_repo
from api.repositories import hierarquizacao_repository as repo
from api.schemas.hierarquizacao import (
    HierarquizacaoCreateSchema,
    HierarquizacaoFase1ExecutarSchema,
    HierarquizacaoFase1UpdateSchema,
    HierarquizacaoFase2ExecutarSchema,
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


def _codigo() -> str:
    return f"HIER-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}-{secrets.token_hex(2).upper()}"


def _response(row: dict[str, Any]) -> HierarquizacaoResponseSchema:
    tid = row.get("tipo_demanda_id")
    tipo_demanda = TIPO_DEMANDA_ID_TO_COD.get(tid) if isinstance(tid, int) else None
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
        homologadoPor=str(row["homologado_por"]) if row.get("homologado_por") else None,
        criadoPor=str(row["criado_por"]) if row.get("criado_por") else None,
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


def _criterios(matriz: Any) -> tuple[dict[str, Any], dict[str, Any]]:
    f2: dict[str, Any] = {}
    f3: dict[str, Any] = {}
    for row in _linhas_matriz(matriz):
        nome = _valor(row, "criterio", "critério", "nome")
        fase = (
            str(_valor(row, "fase", "etapa", "fase da hierarquização") or "")
            .lower()
            .replace(" ", "_")
        )
        if not nome:
            continue
        modelo = {
            "criterio": str(nome),
            "valor": None,
            "resultado": None,
            "premissas": row,
        }
        if fase in {"2", "fase2", "fase_2"}:
            f2[str(nome)] = modelo
        elif fase in {"3", "fase3", "fase_3"}:
            f3[str(nome)] = modelo
        else:
            raise DemandaValidationError(
                f"Informe Fase 2 ou Fase 3 para o critério {nome}.", field="matriz.fase"
            )
    if not f2 and not f3:
        raise DemandaValidationError(
            "A matriz deve conter critérios das Fases 2 ou 3.", field="matriz"
        )
    return f2, f3


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
    f2, f3 = _criterios(payload.matriz_premissas_criterios)
    codigo = _codigo()
    objetos_doc = []
    for o in payload.objetos:
        oid = str(o.get("id") or o.get("demanda_id") or "")
        objetos_doc.append(
            {
                "cabecalho_objeto": {
                    "demanda_id": oid,
                    "codigo": o.get("codigo"),
                    "nome": o.get("nome"),
                    "latitude": o.get("latitude"),
                    "longitude": o.get("longitude"),
                    "atributos": {
                        k: v
                        for k, v in o.items()
                        if k
                        not in {
                            "id",
                            "demanda_id",
                            "codigo",
                            "nome",
                            "latitude",
                            "longitude",
                        }
                    },
                },
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
            "fases_a_executar": [1, 2, 3],
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
    }
    if risco:
        item["nivel"] = (
            a.get("nivel") or a.get("severidade") or a.get("classe_risco") or ""
        )
    return item


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
            valor = sum(valores) / len(valores)
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
            contagem["restritos"] += 1
        else:
            kh = [
                _detalhar_hit(x, risco=True)
                for x in repo.intersecoes_camada(
                    ck["id"], longitude=float(lon), latitude=float(lat)
                )
            ]
            valores = [_numero_atributo(x, "risco") for x in kh]
            valor = (sum(valores) / len(valores)) if valores else 0.0
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
            contagem["com_risco" if kh else "sem_ocorrencia"] += 1
        obj["hierarquizacao"]["fase_1"] = f1
    dados["cabecalho_grupo"].setdefault("pacotes", {})["fase_1"] = {
        **{
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
                value = float(next(ds.sample([(xs[0], ys[0])]))[0])
                score = (
                    None if (ds.nodata is not None and value == ds.nodata) else value
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
    return _response(
        repo.update(codigo, {"dados_hierarquizacao": dados, "status": "em_julgamento"})
        or row
    )


def _normalizar(
    valores: list[Any], criterio: dict[str, Any]
) -> dict[str, float | None]:
    tipo = criterio.get("tipo_dado", "numerico")
    direcao = criterio.get("direcao", "maior_melhor")
    mapping = criterio.get("mapeamento") or {}
    converted: list[float | None] = []
    for v in valores:
        try:
            if v is None or v == "":
                x = None
            elif tipo == "booleano":
                x = 1.0 if str(v).lower() in {"1", "true", "sim", "s"} else 0.0
            elif tipo in {"ordinal", "categorico"}:
                x = float(mapping[str(v)])
            else:
                x = float(v)
        except (ValueError, TypeError, KeyError):
            x = None
        converted.append(x)
    validos = [x for x in converted if x is not None]
    lo, hi = (min(validos), max(validos)) if validos else (0, 0)
    result = {}
    for idx, x in enumerate(converted):
        n = (
            None
            if x is None
            else ((x - lo) / (hi - lo) if hi > lo and tipo == "numerico" else x)
        )
        if n is not None and direcao in {"menor_melhor", "negativa"}:
            n = 1 - n
        result[str(idx)] = n
    return result


def executar_fase_3(
    codigo: str, payload: HierarquizacaoFase3ExecutarSchema
) -> HierarquizacaoResponseSchema:
    row = _carregar(codigo)
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
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
            vals = [
                (o["cabecalho_objeto"].get("atributos") or {}).get(chave) for o in objs
            ]
        norm_por_criterio.append(_normalizar(vals, c))
    ranqueaveis = []
    for i, obj in enumerate(objs):
        contrib = {}
        ausentes = []
        invalidos = []
        soma = 0.0
        pesos_validos = 0.0
        for j, c in enumerate(payload.criterios):
            nome = (
                c.get("criterio")
                or c.get("rotulo")
                or c.get("nome_coluna")
                or f"Critério {j + 1}"
            )
            n = norm_por_criterio[j][str(i)]
            if n is None:
                ausentes.append(nome)
                continue
            contrib[nome] = n * pesos[j]
            soma += contrib[nome]
            pesos_validos += pesos[j]
        completude = (len(payload.criterios) - len(ausentes) - len(invalidos)) / len(
            payload.criterios
        )
        score = (
            (
                soma / pesos_validos
                if pesos_validos and payload.modo_pesos != "normalizados"
                else soma
            )
            if completude >= payload.completude_minima
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
                "contribuicao_por_criterio": contrib,
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
    return _response(
        repo.update(codigo, {"dados_hierarquizacao": dados, "status": "em_julgamento"})
        or row
    )


def sintetizar(
    codigo: str, payload: HierarquizacaoSinteseSchema
) -> HierarquizacaoResponseSchema:
    if abs(payload.peso_fase2 + payload.peso_fase3 - 1) > 1e-6:
        raise DemandaValidationError(
            "Os pesos das Fases 2 e 3 devem somar 1.", field="pesos"
        )
    row = _carregar(codigo)
    dados = deepcopy(row.get("dados_hierarquizacao") or {})
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
