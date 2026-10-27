"""Contrato dos atributos complementados durante a hierarquizacao."""
from __future__ import annotations

from typing import Any
import asyncio

from api.exceptions import DatabaseUnavailableError
from api.matriz_colunas import extrair_colunas
from api.repositories import dominio_repository
from api.repositories.geoespacial_repository import geoespacial_repository
from api.services.campos_demanda import mesclar_atributos_nativos
from api.services.pesos_homologados import CADASTRO

ATRIBUTOS_CADASTRAIS = frozenset({
    "maturidade_objeto", "capex_estimado", "base_estimativa_capex",
    "prazo_referencia_meses", "base_estimativa_prazo",
})
VINCULOS_CADASTRAIS = {codigo: nativo.removeprefix("cadastro:") for codigo, nativo in CADASTRO.items()}


def vazio(valor: Any) -> bool:
    return valor is None or (isinstance(valor, str) and not valor.strip())


def _matriz_da_hierarquizacao(row: dict) -> Any:
    return ((row.get("dados_hierarquizacao") or {}).get("cabecalho_grupo") or {}).get(
        "matriz_premissas_criterios"
    )


async def _colunas_configuradas(*, estrito: bool = True) -> list[dict]:
    try:
        atributos = await geoespacial_repository.listar_atributos_fase3()
    except DatabaseUnavailableError:
        if estrito:
            raise
        return []
    return [{
        **atributo,
        "id": atributo.get("nome_coluna") or atributo["atributo_id"],
        "alias": atributo.get("rotulo") or atributo.get("alias")
        or atributo.get("nome_coluna") or atributo["atributo_id"],
        "tipo": atributo.get("tipo") or atributo.get("tipo_dado") or "numerico",
        "relacao": atributo.get("relacao") or atributo.get("direcao") or "maior_melhor",
        "mandatorio": atributo.get("mandatorio", atributo.get("obrigatorio", False)),
        "origem": "configurador_fase3",
    } for atributo in atributos if atributo.get("nome_coluna") or atributo.get("atributo_id")]


def _mesclar(da_matriz: list[dict], do_configurador: list[dict]) -> list[dict]:
    resultado = [{**coluna, "origem": "matriz_premissas_criterios"} for coluna in da_matriz]
    vistos = {coluna["id"] for coluna in resultado}
    for coluna in do_configurador:
        if coluna["id"] not in vistos:
            resultado.append(coluna)
            vistos.add(coluna["id"])
    return resultado


def colunas_da_hierarquizacao(row: dict, *, estrito: bool = True) -> list[dict]:
    return _mesclar(extrair_colunas(_matriz_da_hierarquizacao(row)),
                    asyncio.run(_colunas_configuradas(estrito=estrito)))


def valor_dinamico(cab: dict, codigo: str) -> Any:
    slot = (cab.get("atributos_fase3") or {}).get(codigo) or {}
    valor = slot.get("valor_bruto")
    return slot.get("valor") if valor is None else valor


def configuracao_fase3_desatualizada(row: dict) -> bool:
    dados = row.get("dados_hierarquizacao") or {}
    cab = dados.get("cabecalho_grupo") or {}
    if _matriz_da_hierarquizacao(row) is None:
        return False
    salvos = {c.get("nome_coluna") or c.get("atributo_id"): c
              for c in (cab.get("configuracoes") or {}).get("fase_3", {}).get("criterios", [])}
    tipo = next((o["cabecalho_objeto"].get("tipo_demanda")
                 for o in dados.get("objetos", []) if o.get("cabecalho_objeto")), None) or cab.get("tipo_demanda") or "objeto"
    dinamicos = {c["id"]: c for c in colunas_da_hierarquizacao(row) if c["id"] not in VINCULOS_CADASTRAIS}
    cadastrais = {f"cadastro:{d['codigo']}": d for d in dominio_repository.list_atributos_objeto()
                  if d["codigo"] in ATRIBUTOS_CADASTRAIS and tipo in d["tipos_objeto"]}
    risco = {"indice_de_risco_ambiental_e_territorial"} if any(
        (o.get("hierarquizacao") or {}).get("fase_1", {}).get("executada")
        for o in dados.get("objetos", [])
    ) else set()
    if set(salvos) != set(dinamicos) | set(cadastrais) | risco:
        return True
    for codigo, coluna in dinamicos.items():
        criterio = salvos[codigo]
        tipo_dado = "ordinal" if coluna["tipo"] == "categorico" else coluna["tipo"]
        if (criterio.get("tipo_dado", "numerico") != tipo_dado
                or criterio.get("direcao", "maior_melhor") != (coluna.get("relacao") or "maior_melhor")
                or (criterio.get("mapeamento") or {}) != (coluna.get("mapeamento") or {})
                or bool(criterio.get("obrigatorio")) != bool(coluna.get("mandatorio"))):
            return True
    for codigo, dominio in cadastrais.items():
        if dominio["tipo_dado"] in {"inteiro", "monetario"}:
            continue
        opcoes = dominio.get("dominio_valores") or dominio.get("configuracao_por_tipo", {}).get(tipo, {}).get("opcoes") or []
        mapeamento = {opcao["rotulo"]: indice / (len(opcoes) - 1) if len(opcoes) > 1 else 1
                     for indice, opcao in enumerate(opcoes)}
        if (salvos[codigo].get("mapeamento") or {}) != mapeamento:
            return True
    return False


def atualizar_cadastrais(cab: dict, cadastro: dict) -> None:
    atributos = cab.setdefault("atributos", {})
    valores = mesclar_atributos_nativos(cadastro)
    atributos["atributos_cadastrais"] = valores
    for codigo in ATRIBUTOS_CADASTRAIS:
        atributos[codigo] = valores.get(codigo)
    for codigo, nativo in VINCULOS_CADASTRAIS.items():
        slot = (cab.get("atributos_fase3") or {}).get(codigo)
        if slot is not None:
            slot.update(valor_bruto=valores.get(nativo), valor=valores.get(nativo),
                        valor_rescalonado=None, origem="cadastro", vinculo_cadastral=nativo)


def pendencias(cab: dict, colunas: list[dict], dominios: list[dict] | None = None) -> list[str]:
    valores = mesclar_atributos_nativos(cab.get("atributos") or {})
    aplicaveis = (ATRIBUTOS_CADASTRAIS - (
        {"capex_estimado", "base_estimativa_capex"} if cab.get("tipo_demanda") == "plano" else set()
    )) if dominios is None else {
        d["codigo"] for d in dominios
        if d["codigo"] in ATRIBUTOS_CADASTRAIS and cab.get("tipo_demanda") in d["tipos_objeto"]
    }
    faltantes = [f"cadastro:{codigo}" for codigo in sorted(aplicaveis) if vazio(valores.get(codigo))]
    for col in colunas:
        if col["id"] in VINCULOS_CADASTRAIS:
            continue
        if vazio(valor_dinamico(cab, col["id"])):
            faltantes.append(col["id"])
    return faltantes


def remover_resultados_fase3(dados: dict, *, incluir_fase3: bool = True) -> None:
    """Descarta resultados derivados que deixaram de representar a rodada atual."""
    for obj in dados.get("objetos", []):
        h = obj.get("hierarquizacao") or {}
        if incluir_fase3:
            h["fase_3"] = {
                "executada": False, "score_fase3": None, "ranking_fase3": None,
                "atributos_utilizados": [], "atributos_ausentes": [], "atributos_invalidos": [],
                "grau_completude_fase3": None, "contribuicao_por_criterio": {},
            }
        h["sintese"] = {"executada": False, "score_final": None, "posicao_final": None}
    relatorios = (dados.get("cabecalho_grupo") or {}).get("relatorios") or {}
    if incluir_fase3:
        relatorios.pop("fase_3", None)
    relatorios.pop("sintese", None)
