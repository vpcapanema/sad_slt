"""O arcabouço teórico-conceitual é a fonte da classificação da Fase 1.

Página: /restrict/geoespacial/configuracao-risco-restricao/, seções 2 e 3.
A categoria é da CAMADA oficial — sete de restrição, treze de risco — e tudo que
classifica a Fase 1 precisa dizer o mesmo que ela.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import pytest

PAGINA = Path("templates/paginas/geoespacial/configuracao-risco-restricao.html")
BIBLIOTECA = Path("config/geoespacial/biblioteca_criterios_risco_restricao.json")
REGRAS_JSON = Path("config/geoespacial/classificacao_fase1.json")

# Uma camada da página pode cobrir mais de um criterio_id (esfera federal e
# estadual da mesma unidade; as quatro APRMs; os dois órgãos de tombamento).
CAMADA_PARA_CRITERIO = {
    "areas contaminadas": ["interdicao_cetesb"],
    "area sob embargo ambiental estadual registrada no sigam": ["embargo_estadual"],
    "area sob embargo ambiental federal ativo": ["embargo_ibama"],
    "manguezal oficialmente mapeado": ["ecossistema_costeiro"],
    "territorio quilombola oficialmente delimitado": ["territorio_quilombola"],
    "terra indigena oficialmente delimitada": ["terra_indigena"],
    "unidade de conservacao de protecao integral": [
        "uc_pi_estadual",
        "uc_pi_federal",
        "uc_pi_municipal",
    ],
    "area oficial de influencia sobre o patrimonio espeleologico": ["cavidade"],
    "area suscetivel a inundacao, enxurrada ou alagamento": ["inundacao"],
    "area suscetivel a escorregamento, erosao ou movimento de massa": ["movimento_massa"],
    "area de protecao e recuperacao dos mananciais do alto juquery": ["aprm"],
    "area de protecao e recuperacao dos mananciais do alto tiete cabeceiras": ["aprm"],
    "area de protecao e recuperacao dos mananciais da billings": ["aprm"],
    "area de protecao e recuperacao dos mananciais da guarapiranga": ["aprm"],
    "area contaminada cadastrada pela cetesb": ["area_contaminada"],
    "assentamento rural no estado de sao paulo": ["assentamento"],
    "bem tombado ou area envoltoria oficial do condephaat": ["bem_tombado"],
    "bem tombado federal identificado pelo iphan": ["bem_tombado"],
    "sitio arqueologico oficialmente cadastrado": ["sitio_arqueologico"],
    "unidade de conservacao de uso sustentavel": [
        "uc_us_estadual",
        "uc_us_federal",
        "uc_us_municipal",
    ],
}


def _sem_acento(valor: str) -> str:
    return (
        unicodedata.normalize("NFKD", str(valor))
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
        .strip()
    )


def _camadas_da_secao_2() -> dict[str, str]:
    """Categoria por camada, lida da TABELA da seção 2.

    A seção 2 é a regra: é ela que declara, para cada camada oficial, a categoria
    adotada, a fonte e o fundamento do enquadramento. A seção 3 repete a mesma
    classificação em forma de lista, e `test_secoes_2_e_3_concordam` garante que
    não se soltem uma da outra.
    """
    html = PAGINA.read_text(encoding="utf-8")
    secao = html.split("Camadas de restrição e risco", 1)[1].split("Reclassificação operacional", 1)[0]
    limpa = lambda texto: _sem_acento(re.sub(r"<[^>]*>", "", texto))
    # A primeira célula traz o nome e, abaixo, o órgão que publica o dado; a
    # segunda traz a categoria. As duas colunas seguintes são fundamento e a
    # norma que o sustenta, e não participam da classificação.
    return {
        limpa(nome): limpa(categoria)
        for nome, categoria in re.findall(
            r"<tr>\s*<td><strong>(.*?)</strong>.*?</td>\s*<td>(.*?)</td>",
            secao,
            re.S,
        )
    }


def _camadas_da_secao_3() -> dict[str, str]:
    html = PAGINA.read_text(encoding="utf-8")
    depois = html.split("Camadas classificadas como restrição", 1)[1]
    bloco_restricao, bloco_risco = depois.split("Camadas classificadas como risco", 1)
    itens = lambda t: [_sem_acento(x) for x in re.findall(r"<li[^>]*>\s*([^<]+?)\s*</li>", t)]
    return {
        **{nome: "restricao" for nome in itens(bloco_restricao)},
        **{nome: "risco" for nome in itens(bloco_risco)},
    }


def _classificacao_esperada() -> dict[str, str]:
    esperado: dict[str, str] = {}
    for camada, categoria in _camadas_da_secao_2().items():
        for criterio in CAMADA_PARA_CRITERIO[camada]:
            esperado[criterio] = categoria
    return esperado


def test_secoes_2_e_3_concordam() -> None:
    """A tabela da seção 2 e as listas da seção 3 não podem se soltar."""
    secao2, secao3 = _camadas_da_secao_2(), _camadas_da_secao_3()
    assert set(secao2) == set(secao3), (
        f"só na seção 2: {sorted(set(secao2) - set(secao3))}; "
        f"só na seção 3: {sorted(set(secao3) - set(secao2))}"
    )
    divergentes = {n: (secao2[n], secao3[n]) for n in secao2 if secao2[n] != secao3[n]}
    assert not divergentes, f"categoria diverge entre as seções: {divergentes}"


def test_pagina_declara_sete_restricoes_e_treze_riscos() -> None:
    camadas = _camadas_da_secao_2()
    assert sum(1 for c in camadas.values() if c == "restricao") == 7
    assert sum(1 for c in camadas.values() if c == "risco") == 13

    html = PAGINA.read_text(encoding="utf-8")
    assert "sete camadas de restrição e treze camadas de risco" in html
    assert "vinte camadas oficiais" in html
    # A camada foi retirada. A palavra ainda aparece legitimamente no nome
    # oficial do Código Florestal ("proteção da vegetação nativa"), citado
    # como fundamento de outra camada — por isso o teste olha a camada.
    assert "Vegetação nativa mapeada" not in html
    assert "vegetacao_protegida" not in html


def test_todas_as_camadas_da_pagina_tem_criterio_mapeado() -> None:
    faltando = set(_camadas_da_secao_2()) - set(CAMADA_PARA_CRITERIO)
    assert not faltando, f"camada sem criterio_id: {sorted(faltando)}"


def test_biblioteca_canonica_nao_traz_criterio_fora_do_arcabouco() -> None:
    biblioteca = json.loads(BIBLIOTECA.read_text(encoding="utf-8"))
    tipos = {_sem_acento(c["tipo"]) for c in biblioteca["criterios"]}
    assert tipos <= {"risco", "restricao"}
    assert "vegetacao_protegida" not in {c["id"] for c in biblioteca["criterios"]}


def test_json_de_classificacao_concorda_com_a_pagina() -> None:
    """O JSON é a contingência de `classificar()`; precisa dizer o mesmo."""
    regras = json.loads(REGRAS_JSON.read_text(encoding="utf-8"))["regras"]
    esperado = _classificacao_esperada()

    padroes = {
        criterio: next((r[2] for r in lista if r[1] == "True"), None)
        for criterio, lista in regras.items()
    }
    divergentes = {c: (e, padroes.get(c)) for c, e in esperado.items() if padroes.get(c) != e}
    assert not divergentes, f"JSON diverge do arcabouço: {divergentes}"
    assert not set(padroes) - set(esperado), (
        f"JSON traz critério fora do arcabouço: {sorted(set(padroes) - set(esperado))}"
    )

    # Nenhuma regra específica pode escalar uma camada de risco para restrição:
    # a categoria é da camada, e a doutrina veda inferir restrição por atributo
    # ausente após a consolidação.
    for criterio, lista in regras.items():
        if esperado.get(criterio) != "risco":
            continue
        escaladas = [r[1] for r in lista if r[1] != "True" and r[2] == "restricao"]
        assert not escaladas, f"{criterio} escala para restrição: {escaladas}"


def test_classificar_devolve_a_categoria_do_arcabouco() -> None:
    """O que a geração das camadas efetivamente grava em cada feição."""
    geopandas = pytest.importorskip("geopandas")
    shapely = pytest.importorskip("shapely.geometry")

    from api.services import fase1_classificacao

    for criterio, categoria in _classificacao_esperada().items():
        quadro = geopandas.GeoDataFrame({"x": [1], "geometry": [shapely.Point(0, 0)]})
        resultado, _origem = fase1_classificacao.classificar(quadro, criterio)
        assert resultado["tipo_tratamento"].iloc[0] == categoria, criterio


def test_regras_do_banco_concordam_com_a_pagina() -> None:
    """`regra_classificacao_fase1` precisa dizer o mesmo que o arcabouço."""
    from api.exceptions import DatabaseUnavailableError

    try:
        from api.db.connection import get_connection

        with get_connection() as conn:
            padroes = {
                linha["criterio_id"]: linha["tipo_tratamento_resultante"]
                for linha in conn.execute(
                    """SELECT criterio_id, tipo_tratamento_resultante
                       FROM geoprocessamento.regra_classificacao_fase1
                       WHERE ativo AND ordem = 999"""
                )
            }
    except DatabaseUnavailableError:
        pytest.skip("banco indisponível")

    esperado = _classificacao_esperada()
    divergentes = {
        criterio: (categoria, padroes.get(criterio))
        for criterio, categoria in esperado.items()
        if padroes.get(criterio) != categoria
    }
    sobrando = set(padroes) - set(esperado)

    assert not divergentes, (
        "regras divergem do arcabouço (página, tabela): "
        + "; ".join(f"{c}={p}" for c, p in sorted(divergentes.items()))
        + " — aplique database/094_alinhar_regras_fase1_ao_arcabouco.sql"
    )
    assert not sobrando, (
        f"critérios sem camada no arcabouço: {sorted(sobrando)} — "
        "aplique database/094_alinhar_regras_fase1_ao_arcabouco.sql"
    )


def test_nenhum_documento_declara_regra_divergente() -> None:
    """Nada no acervo pode contradizer a seção 2 do arcabouço.

    Padrões que já existiram e voltariam a criar ambiguidade: camada de restrição
    descrita como risco, camada de risco descrita como restrição, uma terceira
    classe ("risco pendente de análise") e restrição derivada de escore.
    """
    proibidos = {
        "camada de restrição descrita como risco": re.compile(
            r"\|\s*(unidade de conserva[çc][ãa]o de prote[çc][ãa]o integral|terra ind[íi]gena"
            r"|territ[óo]rio quilombola|manguezal|[áa]rea sob embargo)[^|\n]{0,60}\|\s*risco",
            re.I,
        ),
        "camada de risco descrita como restrição": re.compile(
            r"\|\s*(bem tombado|s[íi]tio arqueol[óo]gico|unidade de conserva[çc][ãa]o de uso sustent[áa]vel|assentamento"
            r"|[áa]rea contaminada|[áa]rea oficial de influ[êe]ncia|[áa]rea suscet[íi]vel|[áa]rea de prote[çc][ãa]o e recupera[çc][ãa]o)[^|\n]{0,60}\|\s*restri",
            re.I,
        ),
        "terceira classe de enquadramento": re.compile(r"risco pendente", re.I),
        "restrição derivada de escore": re.compile(
            r"\|\s*4\s*\|\s*restri|3,50\s*at[ée]\s*4,00|[íi]ndice de restri[çc][ãa]o calculado", re.I
        ),
        "zona de amortecimento como camada classificada": re.compile(
            r"zona de amortecimento[^|\n]{0,40}\|\s*(risco|restri)", re.I
        ),
    }

    achados: list[str] = []
    for pasta in (Path("documentacao"), Path("templates"), Path("data/geoespacial")):
        for arquivo in pasta.rglob("*"):
            if arquivo.suffix not in {".md", ".html", ".json"} or not arquivo.is_file():
                continue
            if "local" in arquivo.parts or "outputs" in arquivo.parts:
                continue
            texto = arquivo.read_text(encoding="utf-8", errors="replace")
            for rotulo, padrao in proibidos.items():
                achado = padrao.search(texto)
                if achado:
                    achados.append(f"{arquivo.as_posix()}: {rotulo} — {achado.group(0)[:70]!r}")

    # Junta com "; " em vez de quebra de linha: dois pontos seguidos de
    # barra invertida casam com o detector de caminho absoluto do repo.
    assert not achados, "regra divergente do arcabouco -> " + "; ".join(achados)
