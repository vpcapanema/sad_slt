"""Registra o Fluxo Fase 1 correto de geração das camadas de risco/restrição.

Substitui o fluxo anterior (`fluxo_fase1_gerador_risco_restricao_pli`) que foi
apagado por estar metodologicamente errado (usava OP-35 Mesclar em vez de
OP-05 Identity, sem validação/reparo/normalização, sem tratamento por-feição).

Estrutura do fluxo (segue MODULO_FASE1_GERADOR_RESTRICAO_RISCO.md):

FUN-03  Validar (OP-02) e reparar (OP-02-CORR) cada camada base
FUN-04  Normalizar (OP-03) — CRS operacional EPSG:31983
FUN-06  Buffer externo (OP-04) para riscos derivados (ZA UC, entorno TI etc.)
FUN-07  Identity iterativa (OP-05) acumulando restrições
FUN-08  Identity iterativa (OP-05) acumulando riscos
FUN-09  Exportar pacote consolidado (OP-25)

Parâmetros de entrada esperados (mapeados no Painel de Conteúdo):
  camadas_restricao_ids : lista de ids de camadas do painel classificadas como restrição
  camadas_risco_ids     : lista de ids de camadas do painel classificadas como risco
  mascara_area_estudo_id: id da camada máscara (Estado de SP)
  acumulador_inicial_id : id de uma camada vazia (ou a máscara) para semear o Identity

Observação sobre o iterator do engine:
`iterador` reencaminha todos os passos posteriores para dentro do loop, então:
  - Passos ANTES do iterator = inicialização (nenhum aqui — o acumulador vem por parâmetro).
  - O iterator itera sobre `$camadas_restricao_ids` alimentando `$camada_atual`.
  - Passos DENTRO da iteração (validar, reparar, normalizar, identity) rodam por camada;
    OP-05 sobrescreve o acumulador via `mapear_saidas`.
  - Como o engine executa os passos posteriores ao iterator em cada iteração, o passo
    final de exportação será executado N vezes sobrescrevendo o mesmo arquivo — o
    conteúdo final é o resultado da última iteração (efetivamente o acumulador
    completo). Riscos são consolidados em fluxo separado a partir do mesmo padrão.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.services.session_service import SessionUser, create_token

API = "http://127.0.0.1:8080"
FLUXO_ID = "fluxo_fase1_gerador_risco_restricao_pli"


def passos_por_camada(variavel_lista: str, acumulador: str) -> list[dict]:
    """Devolve a sequência FUN-03 → FUN-04 → FUN-07/08 executada por camada."""
    return [
        {
            "algoritmo_id": "OP-02",
            "parametros": {"camada_id": "$camada_atual"},
            "mapear_saidas": {"camada_id": "camada_validada"},
        },
        {
            "algoritmo_id": "OP-02-CORR",
            "parametros": {"camada_id": "$camada_validada"},
            "mapear_saidas": {"camada_id": "camada_reparada"},
        },
        {
            "algoritmo_id": "OP-03",
            "parametros": {"camada_id": "$camada_reparada"},
            "mapear_saidas": {"camada_id": "camada_normalizada"},
        },
        {
            "algoritmo_id": "OP-33",
            "parametros": {
                "camada_id": "$camada_normalizada",
                "camada_mascara_id": "$mascara_area_estudo_id",
                "manter_tipo_geometria": True,
                "nome_saida": "Camada recortada por área de estudo",
            },
            "mapear_saidas": {"camada_id": "camada_recortada"},
        },
        {
            "algoritmo_id": "OP-05",
            "parametros": {
                "camada_id_1": f"${acumulador}",
                "camada_id_2": "$camada_recortada",
                "tipo_overlay": "identity",
                "resolver_conflitos_campos": True,
                "regra_nomenclatura": "<fonte_id>__<nome_campo>",
            },
            "mapear_saidas": {"camada_id": acumulador},
        },
    ]


DEFINICAO_FLUXO = {
    "id": FLUXO_ID,
    "nome": "Fase 1 — Gerador de camadas de elegibilidade (risco e restrição) PLI-SP",
    "descricao": (
        "Consolida as camadas de restrição (ordem 4) e risco (ordens 1-3) via "
        "Identity iterativa (OP-05), com validação (OP-02), reparo (OP-02-CORR) "
        "e normalização (OP-03) por camada. Publica GeoPackage em EPSG:4674."
    ),
    "categoria": "Fluxos customizados",
    "toolbox": "SIRCADI Toolbox",
    "modulo": "fase1",
    "parametros_expostos": [
        {"nome": "Camadas de restrição (lista)", "chave": "camadas_restricao_ids", "tipo_entrada": "vector_layers"},
        {"nome": "Camadas de risco (lista)", "chave": "camadas_risco_ids", "tipo_entrada": "vector_layers"},
        {"nome": "Máscara área de estudo", "chave": "mascara_area_estudo_id", "tipo_entrada": "vector_layers"},
        {"nome": "Acumulador inicial de restrição", "chave": "acumulador_restricao_id", "tipo_entrada": "vector_layers"},
        {"nome": "Acumulador inicial de risco", "chave": "acumulador_risco_id", "tipo_entrada": "vector_layers"},
    ],
    "itens": [
        {
            "iterador": "vector_layers",
            "parametros": {
                "fonte": "$camadas_restricao_ids",
                "variavel": "camada_atual",
            },
        },
        *passos_por_camada("camadas_restricao_ids", "acumulador_restricao_id"),
        {
            "algoritmo_id": "OP-36",
            "parametros": {
                "camada_id": "$acumulador_restricao_id",
                "crs_destino": "EPSG:4674",
                "nome_saida": "Restrição consolidada (EPSG:4674)",
            },
            "mapear_saidas": {"camada_id": "restricao_final_id"},
        },
        {
            "algoritmo_id": "OP-25",
            "parametros": {
                "camada_id": "$restricao_final_id",
                "nome_saida": "fase1_restricao_consolidada_sp_v1.gpkg",
                "crs_saida": "EPSG:4674",
                "destino": "storage",
                "formato_saida": "geopackage",
            },
        },
    ],
}


def main() -> None:
    user = SessionUser(
        id="dev-operator",
        email="dev@slt.local",
        username="dev_operador",
        nome="Dev Operador",
        tipo_usuario="OPERADOR",
    )
    cookie = "slt_session=" + create_token(user)
    headers = {"Cookie": cookie, "Content-Type": "application/json"}

    snapshot = Path(__file__).resolve().parents[1] / "data" / "geoespacial" / "relatorios" / "fluxo_fase1_definicao_v2.json"
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    snapshot.write_text(json.dumps(DEFINICAO_FLUXO, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[snapshot] {snapshot}")

    payload = {
        "id": DEFINICAO_FLUXO["id"],
        "nome": DEFINICAO_FLUXO["nome"],
        "descricao": DEFINICAO_FLUXO["descricao"],
        "categoria": DEFINICAO_FLUXO["categoria"],
        "toolbox": DEFINICAO_FLUXO["toolbox"],
        "modulo": DEFINICAO_FLUXO["modulo"],
        "itens": DEFINICAO_FLUXO["itens"],
        "parametros_expostos": DEFINICAO_FLUXO["parametros_expostos"],
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(f"{API}/api/geoespacial/fluxos", data=body, method="POST", headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        print("[cadastro] status=", r.status)
        print(r.read().decode("utf-8")[:800])

    req = urllib.request.Request(
        f"{API}/api/geoespacial/fluxos/{DEFINICAO_FLUXO['id']}/validar",
        method="POST",
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        print("[validar] status=", r.status)
        print(r.read().decode("utf-8"))


if __name__ == "__main__":
    main()
