"""Resolve weights only within the saved hierarchy and its own criteria snapshot."""
from __future__ import annotations

import math
import unicodedata
from copy import deepcopy
from api.exceptions import DemandaValidationError
from api.matriz_colunas import extrair_colunas


CADASTRO = {
    "escala_ideia_estudo_projeto_basico_projeto_executivo": "cadastro:maturidade_objeto",
    "maturidade_da_demanda": "cadastro:maturidade_objeto",
    "r_custo_total_de_investimento": "cadastro:capex_estimado",
    "capex_custo_de_investimento": "cadastro:capex_estimado",
    "meses_ate_a_operacao": "cadastro:prazo_referencia_meses",
    "prazo_de_implantacao": "cadastro:prazo_referencia_meses",
}


def _norm(value):
    return " ".join(unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().casefold().split())


def mapa_pesos(dados):
    official = dados.get("comparacao_colaborativa") or {}
    if not official.get("analise_homologada_id"):
        return {}
    names = (official.get("pesos") or {}).get("criteria", [])
    values = (official.get("pesos") or {}).get("weights", [])
    if len(names) != len(values) or not names:
        raise DemandaValidationError("A análise homologada possui pesos incompatíveis com seus critérios.", field="pesos")
    by_name = {}
    for name, value in zip(names, values):
        key, number = _norm(name), float(value)
        if not key or key in by_name or not math.isfinite(number) or number < 0:
            raise DemandaValidationError("Critérios ou pesos ambíguos na análise homologada.", field="pesos")
        by_name[key] = number
    matrix = official.get("criterios") or dados.get("cabecalho_grupo", {}).get("matriz_premissas_criterios")
    result = {}
    for column in extrair_colunas(matrix):
        key = _norm(column.get("criterio"))
        if key in by_name:
            target = CADASTRO.get(column["id"], column["id"])
            if target in result:
                raise DemandaValidationError("Mais de um critério homologado corresponde ao mesmo atributo.", field="pesos")
            result[target] = by_name[key]
    return result


def aplicar_pesos(dados, criterios):
    if not (dados.get("comparacao_colaborativa") or {}).get("analise_homologada_id"):
        return criterios
    weights = mapa_pesos(dados)
    missing = [str(c.get("criterio") or c.get("nome_coluna") or c.get("atributo_id")) for c in criterios
               if str(c.get("nome_coluna") or c.get("atributo_id")) not in weights]
    if missing:
        raise DemandaValidationError("A execução exige vínculo com os critérios homologados. Atributos sem correspondência: " + "; ".join(missing), field="criterios")
    result = deepcopy(criterios)
    for c in result:
        c["peso"] = weights[str(c.get("nome_coluna") or c.get("atributo_id"))]
        c["analise_homologada_id"] = dados["comparacao_colaborativa"]["analise_homologada_id"]
    return result
