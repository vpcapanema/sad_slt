"""Registra os DOIS fluxos Fase 1 corretos:

  A) fluxo_fase1_gerador_restricao_pli  — consolida camadas classificadas como
     restrição, com OP-CLASS por feição, OP-05 Identity iterativa, e etapas
     pós-iterador (reprojeção + exportação) rodando UMA vez ao final.

  B) fluxo_fase1_gerador_risco_pli      — consolida camadas de risco já
      materializadas pelo catálogo canônico, com OP-CLASS, OP-05 Identity
      iterativa e exportação pós-iterador.

Parâmetros esperados no runtime:
  camadas_ids            : lista de ids de camadas do painel (uma por critério)
  criterios_ids          : lista de ids de critério (paralela a camadas_ids)
                           — não usada aqui porque cada iteração casa camada com critério
                           via variável mapeada; para simplificar registramos $criterio_id
                           como parâmetro por camada usando o mesmo item da lista, ver
                           observação abaixo.
  mascara_area_estudo_id : id da camada máscara (Estado de SP)
  acumulador_id          : id de uma camada seed (a própria máscara serve)

Observação: como o engine aceita uma única variável iterada por vez, associamos
o critério à camada através do próprio painel: o operador que classifica precisa
receber `criterio_id`. Registramos aqui `criterio_id_padrao` como parâmetro fixo
por camada; para múltiplos critérios use um FLUXO por critério ou faça pré-
carregamento do critério por camada no painel.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.services.session_service import SessionUser, create_token

API = "http://127.0.0.1:8080"


def item(algoritmo_id: str, parametros: dict, mapear: dict | None = None, pos: bool = False) -> dict:
    node = {"algoritmo_id": algoritmo_id, "parametros": parametros}
    if mapear:
        node["mapear_saidas"] = mapear
    if pos:
        node["pos_iterador"] = True
    return node


def passos_dentro_iterador_restricao() -> list[dict]:
    return [
        item("OP-02", {"camada_id": "$camada_atual"}, {"camada_id": "camada_validada"}),
        item("OP-02-CORR", {"camada_id": "$camada_validada"}, {"camada_id": "camada_reparada"}),
        item("OP-03", {"camada_id": "$camada_reparada"}, {"camada_id": "camada_normalizada"}),
        item(
            "OP-33",
            {
                "camada_id": "$camada_normalizada",
                "camada_mascara_id": "$mascara_area_estudo_id",
                "manter_tipo_geometria": True,
                "nome_saida": "Camada recortada por área de estudo",
            },
            {"camada_id": "camada_recortada"},
        ),
        item(
            "OP-CLASS",
            {"camada_id": "$camada_recortada", "criterio_id": "$criterio_id_padrao", "fonte_id": "$fonte_id_padrao"},
            {"camada_id": "camada_classificada"},
        ),
        item(
            "OP-05",
            {
                "camada_id_1": "$acumulador_id",
                "camada_id_2": "$camada_classificada",
                "tipo_overlay": "identity",
                "resolver_conflitos_campos": True,
                "regra_nomenclatura": "<fonte_id>__<nome_campo>",
            },
            {"camada_id": "acumulador_id"},
        ),
    ]


def passos_dentro_iterador_risco() -> list[dict]:
    return [
        item("OP-02", {"camada_id": "$camada_atual"}, {"camada_id": "camada_validada"}),
        item("OP-02-CORR", {"camada_id": "$camada_validada"}, {"camada_id": "camada_reparada"}),
        item("OP-03", {"camada_id": "$camada_reparada"}, {"camada_id": "camada_normalizada"}),
        item(
            "OP-33",
            {
                "camada_id": "$camada_normalizada",
                "camada_mascara_id": "$mascara_area_estudo_id",
                "manter_tipo_geometria": True,
                "nome_saida": "Camada de risco recortada",
            },
            {"camada_id": "camada_recortada"},
        ),
        item(
            "OP-CLASS",
            {"camada_id": "$camada_recortada", "criterio_id": "$criterio_id_padrao", "fonte_id": "$fonte_id_padrao"},
            {"camada_id": "camada_classificada"},
        ),
        item(
            "OP-05",
            {
                "camada_id_1": "$acumulador_id",
                "camada_id_2": "$camada_classificada",
                "tipo_overlay": "identity",
                "resolver_conflitos_campos": True,
                "regra_nomenclatura": "<fonte_id>__<nome_campo>",
            },
            {"camada_id": "acumulador_id"},
        ),
    ]


def passos_pos_iterador(tipo: str, arquivo: str) -> list[dict]:
    return [
        item(
            "OP-36",
            {"camada_id": "$acumulador_id", "crs_destino": "EPSG:4674", "nome_saida": f"{tipo} consolidado (EPSG:4674)"},
            {"camada_id": "final_id"},
            pos=True,
        ),
        item(
            "OP-25",
            {
                "camada_id": "$final_id",
                "nome_saida": arquivo,
                "crs_saida": "EPSG:4674",
                "destino": "storage",
                "formato_saida": "geopackage",
            },
            pos=True,
        ),
    ]


FLUXOS = [
    {
        "id": "fluxo_fase1_gerador_restricao_pli",
        "nome": "Fase 1 — Gerador de camada de RESTRIÇÃO consolidada (PLI-SP)",
        "descricao": (
            "Consolida camadas classificadas como RESTRIÇÃO por Identity iterativa (OP-05). "
            "Cada camada é validada (OP-02), reparada (OP-02-CORR), normalizada (OP-03), "
            "recortada pela área de estudo (OP-33) e classificada por feição (OP-CLASS) "
            "contra geoprocessamento.regra_classificacao_fase1. As etapas pós-iterador "
            "(reprojeção EPSG:4674 e exportação GeoPackage) rodam uma única vez ao final."
        ),
        "categoria": "Fluxos customizados",
        "toolbox": "SIRCADI Toolbox",
        "modulo": "fase1",
        "parametros_expostos": [
            {"nome": "Camadas a consolidar", "chave": "camadas_ids", "tipo_entrada": "vector_layers"},
            {"nome": "Máscara área de estudo", "chave": "mascara_area_estudo_id", "tipo_entrada": "vector_layers"},
            {"nome": "Acumulador (seed)", "chave": "acumulador_id", "tipo_entrada": "vector_layers"},
            {"nome": "Critério padrão (id)", "chave": "criterio_id_padrao", "tipo_entrada": "values"},
            {"nome": "Fonte padrão (id)", "chave": "fonte_id_padrao", "tipo_entrada": "values"},
        ],
        "itens": [
            {"iterador": "vector_layers", "parametros": {"fonte": "$camadas_ids", "variavel": "camada_atual"}},
            *passos_dentro_iterador_restricao(),
            *passos_pos_iterador("Restrição", "fase1_restricao_consolidada_sp_v1.gpkg"),
        ],
    },
    {
        "id": "fluxo_fase1_gerador_risco_pli",
        "nome": "Fase 1 — Consolidador de camada de RISCO (PLI-SP)",
        "descricao": (
            "Consolida camadas classificadas como RISCO, previamente materializadas "
            "conforme buffers_zona_amortecimento_fase1.json, via Identity iterativa "
            "(OP-05). Cada camada passa por validação, reparo, normalização, recorte "
            "pela área de estudo, classificação por feição (OP-CLASS) e Identity "
            "acumulativa. O fluxo não aplica distância genérica. Exportação GeoPackage "
            "em EPSG:4674 uma vez ao final."
        ),
        "categoria": "Fluxos customizados",
        "toolbox": "SIRCADI Toolbox",
        "modulo": "fase1",
        "parametros_expostos": [
            {"nome": "Camadas a consolidar", "chave": "camadas_ids", "tipo_entrada": "vector_layers"},
            {"nome": "Máscara área de estudo", "chave": "mascara_area_estudo_id", "tipo_entrada": "vector_layers"},
            {"nome": "Acumulador (seed)", "chave": "acumulador_id", "tipo_entrada": "vector_layers"},
            {"nome": "Critério padrão (id)", "chave": "criterio_id_padrao", "tipo_entrada": "values"},
            {"nome": "Fonte padrão (id)", "chave": "fonte_id_padrao", "tipo_entrada": "values"},
        ],
        "itens": [
            {"iterador": "vector_layers", "parametros": {"fonte": "$camadas_ids", "variavel": "camada_atual"}},
            *passos_dentro_iterador_risco(),
            *passos_pos_iterador("Risco", "fase1_risco_consolidado_sp_v1.gpkg"),
        ],
    },
]


def main() -> None:
    user = SessionUser(
        id="dev-operator", email="dev@slt.local", username="dev_operador",
        nome="Dev Operador", tipo_usuario="OPERADOR",
    )
    cookie = "slt_session=" + create_token(user)
    headers = {"Cookie": cookie, "Content-Type": "application/json"}

    relatorios = Path(__file__).resolve().parents[1] / "data" / "geoespacial" / "relatorios"
    relatorios.mkdir(parents=True, exist_ok=True)

    for definicao in FLUXOS:
        snapshot = relatorios / f"{definicao['id']}.json"
        snapshot.write_text(json.dumps(definicao, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[snapshot] {snapshot}")

        # DELETE prévio (idempotente)
        req_del = urllib.request.Request(
            f"{API}/api/geoespacial/fluxos/{definicao['id']}", method="DELETE", headers=headers,
        )
        try:
            with urllib.request.urlopen(req_del, timeout=30) as r:
                print(f"[delete prévio] {definicao['id']} status={r.status}")
        except urllib.error.HTTPError as e:
            print(f"[delete prévio] {definicao['id']} status={e.code}")

        payload = {k: v for k, v in definicao.items()}
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(f"{API}/api/geoespacial/fluxos", data=body, method="POST", headers=headers)
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"[cadastro] {definicao['id']} status={r.status}")

        req_val = urllib.request.Request(
            f"{API}/api/geoespacial/fluxos/{definicao['id']}/validar",
            method="POST", headers=headers,
        )
        with urllib.request.urlopen(req_val, timeout=30) as r:
            print(f"[validar] {definicao['id']}", r.read().decode("utf-8"))


if __name__ == "__main__":
    main()
