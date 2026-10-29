"""Vínculo da divulgação à versão dos resultados, sem alterar os cálculos."""
from __future__ import annotations

import hashlib
import json


def assinatura_resultados(row: dict) -> str:
    dados = row.get("dados_hierarquizacao") or {}
    cab = dados.get("cabecalho_grupo") or {}
    versao = {
        "ranking": [{k: r.get(k) for k in ("demanda_id", "posicao", "score")} for r in row.get("ranking") or []],
        "configuracoes": cab.get("configuracoes"),
        "matriz": cab.get("matriz_premissas_criterios"),
        "sintese": cab.get("sintese"),
        "relatorios": cab.get("relatorios"),
        "composicao_divergente": cab.get("composicao_divergente"),
        "objetos": [{
            "id": (o.get("cabecalho_objeto") or {}).get("demanda_id"),
            "complementacao": (o.get("cabecalho_objeto") or {}).get("complementacao_atributos"),
            "hierarquizacao": o.get("hierarquizacao"),
        } for o in dados.get("objetos") or []],
    }
    return hashlib.sha256(json.dumps(versao, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def publicacao_vigente(row: dict) -> bool:
    dados = row.get("dados_hierarquizacao") or {}
    publicacao = (dados.get("cabecalho_grupo") or {}).get("publicacao") or {}
    if "grupo_objetos" in row:
        atuais = {str(o["id"]) for o in row["grupo_objetos"] or [] if o.get("id")}
        salvos = {str(o["cabecalho_objeto"]["demanda_id"]) for o in dados.get("objetos") or []
                  if (o.get("cabecalho_objeto") or {}).get("demanda_id")}
        if atuais != salvos:
            return False
    return (
        row.get("status") == "homologada"
        and publicacao.get("ativa") is True
        and bool(row.get("ranking"))
        and publicacao.get("assinatura_resultados") == assinatura_resultados(row)
    )
