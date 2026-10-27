"""Fonte explícita de pesos da Fase 3, vinculada à própria hierarquização."""
import math
from copy import deepcopy

from api.exceptions import DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as julgamentos
from api.services.pesos_homologados import aplicar_pesos, mapa_pesos
from api.services.comparacao_colaborativa_service import _criterio_nomes


def pesos_do_julgamento(julgamento):
    valores = julgamento.get("pesos_consolidados") or []
    if not valores:
        raise DemandaValidationError("Os pesos consolidados deste julgamento ainda não estão disponíveis.", field="julgamento_id")
    try:
        validos = all(math.isfinite(float(v)) and float(v) >= 0 for v in valores) and sum(float(v) for v in valores) > 0
    except (TypeError, ValueError):
        validos = False
    if not validos:
        raise DemandaValidationError("Os pesos consolidados deste julgamento são inválidos.", field="julgamento_id")
    return mapa_pesos({"comparacao_colaborativa": {
        "analise_homologada_id": str(julgamento["id"]),
        "criterios": julgamento.get("criterios") or [],
        "pesos": {"criteria": _criterio_nomes(julgamento.get("criterios") or []), "weights": valores},
    }})


def listar_julgamentos(row):
    itens = []
    for julgamento in julgamentos.list_ambientes_by_hierarquizacao(row["id"]):
        item = {"id": str(julgamento["id"]), "nome": julgamento.get("nome") or f"Julgamento {julgamento['id']}", "pesos": {}, "erro": None}
        try:
            item["pesos"] = pesos_do_julgamento(julgamento)
        except (DemandaValidationError, TypeError, ValueError) as exc:
            item["erro"] = str(exc)
        itens.append(item)
    return itens


def resolver(row, dados, criterios, payload):
    fonte = payload.fonte_pesos
    if fonte is None:  # Compatibilidade com clientes anteriores.
        return aplicar_pesos(dados, criterios)
    resultado = deepcopy(criterios)
    if fonte == "ahp":
        julgamento = julgamentos.get_ambiente_by_id(str(payload.julgamento_id)) if payload.julgamento_id else None
        if not julgamento or str(julgamento.get("hierarquizacao_id")) != str(row["id"]):
            raise DemandaValidationError("Selecione um julgamento associado a esta hierarquização.", field="julgamento_id")
        pesos = pesos_do_julgamento(julgamento)
        for criterio in resultado:
            if criterio.get("grupo_atributo") == "risco_ambiental_territorial":
                criterio["peso"] = 1.0  # Índice herdado da Fase 1, fora da matriz julgada.
                continue
            chave = str(criterio.get("nome_coluna") or criterio.get("atributo_id"))
            if chave not in pesos:
                raise DemandaValidationError(f"O julgamento não possui peso consolidado para o atributo {chave}.", field="criterios")
            criterio["peso"] = pesos[chave]
    for criterio in resultado:
        try:
            peso = float(criterio.get("peso", 0))
        except (TypeError, ValueError):
            peso = float("nan")
        if not math.isfinite(peso) or peso < 0:
            raise DemandaValidationError("Os pesos devem ser números finitos não negativos.", field="criterios.peso")
        criterio["peso"] = peso
        criterio.pop("analise_homologada_id", None)
    if fonte == "manual":
        grupos = {}
        for criterio in resultado:
            grupo = criterio.get("grupo_atributo", "dinamico") if payload.ponderacao == "estratificada" else "todos"
            grupos.setdefault(grupo, []).append(criterio)
        for itens in grupos.values():
            total = sum(item["peso"] for item in itens)
            if total <= 0:
                raise DemandaValidationError("A soma dos pesos de cada ponderação deve ser positiva.", field="criterios.peso")
            for item in itens:
                item["peso"] /= total
    return resultado


def configuracao(payload):
    return {"fonte_pesos": payload.fonte_pesos, "ponderacao": payload.ponderacao,
            "julgamento_id": str(payload.julgamento_id) if payload.fonte_pesos == "ahp" and payload.julgamento_id else None}
