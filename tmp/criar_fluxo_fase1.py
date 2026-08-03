"""Cadastra o Fluxo "Fase 1 — Gerador de camadas de elegibilidade" na SIRCADI Toolbox.

Presunção do usuário: as camadas de origem (fontes de risco e restrição) já estão
carregadas no Painel de Conteúdo do componente de Geoprocessamento. O fluxo aqui
cadastrado assume que, no momento da execução, o operador informará:

  - `camadas_restricao` (list[str]): ids das camadas classificadas como restrição
  - `camadas_risco`    (list[str]): ids das camadas classificadas como risco
  - `mascara_sp`       (str)      : id da máscara do Estado de São Paulo

O fluxo produz duas camadas GeoPackage em `data/geoespacial/outputs`:
  - `restricao_consolidada_sp_v1.gpkg`  (EPSG:4674)
  - `risco_consolidado_sp_v1.gpkg`      (EPSG:4674)

Regras aplicadas (PLI-SP — Índice Risco e Restrição):
  1. Restrição: união de todas as camadas de restrição, recorte por SP, reprojeção.
  2. Risco: união de todas as camadas de risco, recorte por SP, subtração espacial
     dos polígonos de restrição (OP-07 com inverter_selecao=True), reprojeção.
     -> Precedência restrição > risco.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

# Permite importar api.* rodando fora do uvicorn.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

BASE = "http://127.0.0.1:8080"
FLUXO_ID = "fluxo_fase1_gerador_risco_restricao_pli"


def _session_cookie() -> str:
    from api.services.session_service import SessionUser, create_token  # noqa: WPS433

    user = SessionUser(
        id="dev-operator",
        email="dev@slt.local",
        username="dev_operador",
        nome="Dev Operador",
        tipo_usuario="OPERADOR",
    )
    return f"slt_session={create_token(user)}"


def _request(path: str, method: str, cookie: str, body: dict | None = None) -> tuple[int, dict | str]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        method=method,
        headers={"Cookie": cookie, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            text = resp.read().decode("utf-8")
            return resp.status, json.loads(text) if text else {}
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(text)
        except json.JSONDecodeError:
            return exc.code, text


# ---------------------------------------------------------------------------
# Construção do diagrama (nós + conexões) e da lista de itens executáveis.
# ---------------------------------------------------------------------------

def _no(node_id: str, kind: str, ref: str, label: str, params: dict | None = None,
        x: int = 0, y: int = 0) -> dict:
    return {
        "id": node_id,
        "kind": kind,
        "ref": ref,
        "label": label,
        "params": params or {},
        "x": x,
        "y": y,
    }


def _edge(origem: str, destino: str, parametro: str | None = None) -> dict:
    return {"from": origem, "to": destino, "parameter": parametro}


def _build_fluxo() -> dict:
    # --- Entradas -----------------------------------------------------------
    nos: list[dict] = [
        _no("in_restricao", "input", "camadas_restricao",
            "Camadas de restrição (lista)", {"valor": ""}, x=40, y=60),
        _no("in_risco", "input", "camadas_risco",
            "Camadas de risco (lista)", {"valor": ""}, x=40, y=260),
        _no("in_mascara", "input", "mascara_sp",
            "Máscara SP", {"valor": ""}, x=40, y=460),
    ]

    # --- Variáveis intermediárias ------------------------------------------
    variaveis_intermediarias = [
        ("var_restricao_bruta", "restricao_bruta", 240, 60),
        ("var_restricao_recortada", "restricao_recortada", 460, 60),
        ("var_restricao_final", "restricao_final", 680, 60),
        ("var_risco_bruto", "risco_bruto", 240, 260),
        ("var_risco_recortado", "risco_recortado", 460, 260),
        ("var_risco_sem_restricao", "risco_sem_restricao", 680, 260),
        ("var_risco_final", "risco_final", 900, 260),
    ]
    for node_id, chave, x, y in variaveis_intermediarias:
        nos.append(_no(node_id, "variable", chave, chave,
                       {"tipo": "dados", "valor": ""}, x=x, y=y))

    # --- Algoritmos ---------------------------------------------------------
    #   Cada nó de algoritmo carrega em `params` os parâmetros literais
    #   (ex: distancia, crs_destino). Os parâmetros que vêm de outras etapas
    #   ficam ligados por edges com `parameter=<nome do parâmetro>` e serão
    #   materializados como `$<chave>` na compilação do item.
    nos.extend([
        _no("alg_merge_restricao", "algorithm", "OP-35",
            "Mesclar camadas de restrição",
            {"nome_saida": "Restrição consolidada (bruta)"}, x=140, y=140),

        _no("alg_clip_restricao", "algorithm", "OP-33",
            "Recortar restrição por SP",
            {"nome_saida": "Restrição recortada por SP",
             "manter_tipo_geometria": True}, x=360, y=140),

        _no("alg_reproj_restricao", "algorithm", "OP-36",
            "Reprojetar restrição para EPSG:4674",
            {"crs_destino": "EPSG:4674",
             "nome_saida": "Restrição consolidada"}, x=580, y=140),

        _no("alg_save_restricao", "algorithm", "OP-27",
            "Salvar restrição consolidada",
            {"nome_saida": "restricao_consolidada_sp_v1",
             "crs_saida": "EPSG:4674",
             "destino": "storage",
             "formato_saida": "geopackage"}, x=800, y=140),

        _no("alg_merge_risco", "algorithm", "OP-35",
            "Mesclar camadas de risco",
            {"nome_saida": "Risco consolidado (bruto)"}, x=140, y=340),

        _no("alg_clip_risco", "algorithm", "OP-33",
            "Recortar risco por SP",
            {"nome_saida": "Risco recortado por SP",
             "manter_tipo_geometria": True}, x=360, y=340),

        _no("alg_diff_risco", "algorithm", "OP-07",
            "Subtrair polígonos de restrição do risco",
            {"tipo_selecao": "intersects",
             "inverter_selecao": True}, x=580, y=340),

        _no("alg_reproj_risco", "algorithm", "OP-36",
            "Reprojetar risco para EPSG:4674",
            {"crs_destino": "EPSG:4674",
             "nome_saida": "Risco consolidado"}, x=800, y=340),

        _no("alg_save_risco", "algorithm", "OP-27",
            "Salvar risco consolidado",
            {"nome_saida": "risco_consolidado_sp_v1",
             "crs_saida": "EPSG:4674",
             "destino": "storage",
             "formato_saida": "geopackage"}, x=1020, y=340),
    ])

    # --- Saídas -------------------------------------------------------------
    nos.extend([
        _no("out_restricao", "output", "saida_restricao",
            "Camada de restrição (GeoPackage)",
            {"nome_saida": "restricao_consolidada_sp_v1",
             "crs_saida": "EPSG:4674",
             "destino": "storage",
             "formato_saida": "geopackage"}, x=1020, y=140),
        _no("out_risco", "output", "saida_risco",
            "Camada de risco (GeoPackage)",
            {"nome_saida": "risco_consolidado_sp_v1",
             "crs_saida": "EPSG:4674",
             "destino": "storage",
             "formato_saida": "geopackage"}, x=1240, y=340),
    ])

    # --- Conexões (garantem entrada -> algoritmos -> saída) -----------------
    conexoes: list[dict] = [
        # Ramo restrição
        _edge("in_restricao", "alg_merge_restricao", "camada_ids"),
        _edge("alg_merge_restricao", "var_restricao_bruta"),
        _edge("var_restricao_bruta", "alg_clip_restricao", "camada_id"),
        _edge("in_mascara", "alg_clip_restricao", "camada_mascara_id"),
        _edge("alg_clip_restricao", "var_restricao_recortada"),
        _edge("var_restricao_recortada", "alg_reproj_restricao", "camada_id"),
        _edge("alg_reproj_restricao", "var_restricao_final"),
        _edge("var_restricao_final", "alg_save_restricao", "entrada"),
        _edge("alg_save_restricao", "out_restricao"),

        # Ramo risco
        _edge("in_risco", "alg_merge_risco", "camada_ids"),
        _edge("alg_merge_risco", "var_risco_bruto"),
        _edge("var_risco_bruto", "alg_clip_risco", "camada_id"),
        _edge("in_mascara", "alg_clip_risco", "camada_mascara_id"),
        _edge("alg_clip_risco", "var_risco_recortado"),
        _edge("var_risco_recortado", "alg_diff_risco", "camada_id"),
        _edge("var_restricao_final", "alg_diff_risco", "camada_ref_id"),
        _edge("alg_diff_risco", "var_risco_sem_restricao"),
        _edge("var_risco_sem_restricao", "alg_reproj_risco", "camada_id"),
        _edge("alg_reproj_risco", "var_risco_final"),
        _edge("var_risco_final", "alg_save_risco", "entrada"),
        _edge("alg_save_risco", "out_risco"),
    ]

    # --- Itens executáveis (o motor não lê o diagrama; usa esta lista) ------
    itens: list[dict] = [
        {
            "algoritmo_id": "OP-35",
            "parametros": {
                "camada_ids": "$camadas_restricao",
                "nome_saida": "Restrição consolidada (bruta)",
            },
            "mapear_saidas": {"camada_id": "restricao_bruta"},
        },
        {
            "algoritmo_id": "OP-33",
            "parametros": {
                "camada_id": "$restricao_bruta",
                "camada_mascara_id": "$mascara_sp",
                "manter_tipo_geometria": True,
                "nome_saida": "Restrição recortada por SP",
            },
            "mapear_saidas": {"camada_id": "restricao_recortada"},
        },
        {
            "algoritmo_id": "OP-36",
            "parametros": {
                "camada_id": "$restricao_recortada",
                "crs_destino": "EPSG:4674",
                "nome_saida": "Restrição consolidada",
            },
            "mapear_saidas": {"camada_id": "restricao_final"},
        },
        {
            "algoritmo_id": "OP-27",
            "parametros": {
                "entrada": "$restricao_final",
                "nome_saida": "restricao_consolidada_sp_v1",
                "crs_saida": "EPSG:4674",
                "destino": "storage",
                "formato_saida": "geopackage",
            },
        },
        {
            "algoritmo_id": "OP-35",
            "parametros": {
                "camada_ids": "$camadas_risco",
                "nome_saida": "Risco consolidado (bruto)",
            },
            "mapear_saidas": {"camada_id": "risco_bruto"},
        },
        {
            "algoritmo_id": "OP-33",
            "parametros": {
                "camada_id": "$risco_bruto",
                "camada_mascara_id": "$mascara_sp",
                "manter_tipo_geometria": True,
                "nome_saida": "Risco recortado por SP",
            },
            "mapear_saidas": {"camada_id": "risco_recortado"},
        },
        {
            "algoritmo_id": "OP-07",
            "parametros": {
                "camada_id": "$risco_recortado",
                "camada_ref_id": "$restricao_final",
                "tipo_selecao": "intersects",
                "inverter_selecao": True,
            },
            "mapear_saidas": {"camada_id": "risco_sem_restricao"},
        },
        {
            "algoritmo_id": "OP-36",
            "parametros": {
                "camada_id": "$risco_sem_restricao",
                "crs_destino": "EPSG:4674",
                "nome_saida": "Risco consolidado",
            },
            "mapear_saidas": {"camada_id": "risco_final"},
        },
        {
            "algoritmo_id": "OP-27",
            "parametros": {
                "entrada": "$risco_final",
                "nome_saida": "risco_consolidado_sp_v1",
                "crs_saida": "EPSG:4674",
                "destino": "storage",
                "formato_saida": "geopackage",
            },
        },
    ]

    # --- parametros_expostos, variaveis, saidas ---------------------------
    parametros_expostos = [
        {
            "nome": "Camadas de restrição (lista)",
            "chave": "camadas_restricao",
            "tipo_entrada": "vector_layers",
            "valor": "",
        },
        {
            "nome": "Camadas de risco (lista)",
            "chave": "camadas_risco",
            "tipo_entrada": "vector_layers",
            "valor": "",
        },
        {
            "nome": "Máscara SP",
            "chave": "mascara_sp",
            "tipo_entrada": "vector_layer",
            "valor": "",
        },
    ]

    variaveis = [
        {"nome": chave, "chave": chave, "tipo": "dados", "valor": ""}
        for _, chave, _, _ in variaveis_intermediarias
    ]

    saidas = [
        {
            "nome": "restricao_consolidada_sp_v1",
            "chave": "camada_id",
            "crs_saida": "EPSG:4674",
            "destino": "storage",
            "formato_saida": "geopackage",
        },
        {
            "nome": "risco_consolidado_sp_v1",
            "chave": "camada_id",
            "crs_saida": "EPSG:4674",
            "destino": "storage",
            "formato_saida": "geopackage",
        },
    ]

    return {
        "id": FLUXO_ID,
        "nome": "Fase 1 — Gerador de camadas de elegibilidade (risco e restrição) PLI-SP",
        "descricao": (
            "Consolida as camadas de restrição (níveis 4) e risco (níveis 1-3) "
            "da matriz PLI-SP a partir das fontes já carregadas no painel de "
            "conteúdo. Aplica precedência restrição > risco removendo do risco "
            "as áreas que já são restritivas. Publica GeoPackage em EPSG:4674."
        ),
        "categoria": "Fluxos customizados",
        "toolbox": "SIRCADI Toolbox",
        "modulo": "fase1",
        "itens": itens,
        "parametros_expostos": parametros_expostos,
        "variaveis": variaveis,
        "saidas": saidas,
        "diagrama": {"versao": 3, "nos": nos, "conexoes": conexoes},
    }


def main() -> None:
    cookie = _session_cookie()
    fluxo = _build_fluxo()

    # 1. Snapshot local
    snapshot = ROOT / "data" / "geoespacial" / "relatorios" / "fluxo_fase1_definicao.json"
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    snapshot.write_text(json.dumps(fluxo, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[snapshot] {snapshot}")

    # 2. Existente?
    status_get, existente = _request(f"/api/geoespacial/fluxos/{FLUXO_ID}", "GET", cookie)
    metodo = "PUT" if status_get == 200 else "POST"
    endpoint = f"/api/geoespacial/fluxos/{FLUXO_ID}" if metodo == "PUT" else "/api/geoespacial/fluxos"
    print(f"[cadastro] {metodo} {endpoint}")

    status, retorno = _request(endpoint, metodo, cookie, fluxo)
    print(f"[cadastro] status={status}")
    print(json.dumps(retorno, ensure_ascii=False, indent=2)[:2000])
    if status not in (200, 201):
        sys.exit(1)

    # 3. Validação canônica no servidor
    status_v, retorno_v = _request(
        f"/api/geoespacial/fluxos/{FLUXO_ID}/validar", "POST", cookie, {}
    )
    print(f"[validar] status={status_v}")
    print(json.dumps(retorno_v, ensure_ascii=False, indent=2)[:2000])


if __name__ == "__main__":
    main()
