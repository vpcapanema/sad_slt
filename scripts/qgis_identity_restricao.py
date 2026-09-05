"""Gera a camada consolidada de RESTRIÇÃO da Fase 1 por Identity encadeado, no QGIS.

Uso: abra o Console Python do QGIS, ajuste RAIZ abaixo se preciso, e rode o
arquivo (Console Python > "Mostrar editor" > abrir este script > Executar).

Gêmeo de `qgis_identity_risco.py`: mesma máquina, outra lista de camadas. Leia
lá o porquê de OGR em vez de um algoritmo de processamento (o QGIS não traz
Identity nativo) e os três cuidados da operação — acumulador que define a
extensão, GEOMETRYCOLLECTION que precisa ser normalizada a cada volta, e
prefixo só na camada que entra.

O que este script faz de diferente do produto anterior: **descarta a feição de
fundo**. O acumulador é o envelope da área de estudo, então a saída do Identity
inclui, além das áreas restritas, todo o resto do retângulo — uma única feição
de centenas de milhares de km² sem nenhum atributo temático. Na versão anterior
essa feição foi publicada junto, e a Fase 1, que marca "restrito" para qualquer
feição intersectada, classificaria como restrita toda demanda do estado. Aqui
ela é removida antes de gravar: a camada passa a conter só o que de fato é
restrição.
"""
from __future__ import annotations

import os
from typing import Any

from osgeo import gdal, ogr, osr

gdal.UseExceptions()
ogr.UseExceptions()

# ---------------------------------------------------------------- configuração

RAIZ = os.environ.get("SLT_RAIZ") or os.getcwd()

ACERVO = os.path.join(RAIZ, "data", "geoespacial", "uploads", "datastorage", "vetor")
AREA_ESTUDO = os.path.join(ACERVO, "AREA_ESTUDO", "uf_sp.zip.contents", "uf_sp.shp")
SAIDA = os.path.join(
    RAIZ, "data", "geoespacial", "outputs", "fase1_restricao_consolidada_sp.gpkg"
)
CRS_TRABALHO = 4674  # SIRGAS 2000

CARREGAR_NO_QGIS = True

# Camada -> (critério, prefixo dos campos). Ordem = ordem de entrada no Identity.
# Prefixos mantidos iguais aos do produto anterior, para não quebrar nada que já
# leia esses nomes de campo.
CAMADAS: list[tuple[str, str, str]] = [
    ("RESTRIÇÃO/ucs_protecao_integral_sp.zip.contents/ucs_protecao_integral_sp.shp", "uc_pi_estadual", "uc_pi"),
    ("RESTRIÇÃO/terras_indigenas_sp.zip.contents/terras_indigenas_sp.shp", "terra_indigena", "terra_indigena"),
    ("RESTRIÇÃO/quilombos_sp.zip.contents/quilombos_sp.shp", "territorio_quilombola", "quilombola"),
    ("RESTRIÇÃO/manguezais_ibama_sp.zip.contents/manguezais_ibama_sp.shp", "ecossistema_costeiro", "manguezal"),
    ("RESTRIÇÃO/embargos_ibama_ativos_sp.zip.contents/embargos_ibama_ativos_sp.shp", "embargo_ibama", "embargo_ibama"),
    ("RESTRIÇÃO/embargos_estaduais_sigam.zip.contents/embargos_estaduais_sigam.shp", "embargo_estadual", "embargo_estadual"),
    # Interdição da CETESB: é a lista de áreas com restrição de uso, distinta da
    # "áreas contaminadas" que entra no risco. O prefixo segue o do produto
    # anterior; o critério é o que a regra vigente declara.
    ("RESTRIÇÃO/areas_restricao_cetesb.zip.contents/areas_restricao_cetesb.shp", "interdicao_cetesb", "area_contaminada"),
]

# Contagem esperada por camada, conferida no acervo em 05/09/2026. Divergência
# aborta: melhor não gerar do que gerar com a camada errada.
ESPERADO: dict[str, int] = {
    "ucs_protecao_integral_sp": 117,
    "terras_indigenas_sp": 29,
    "quilombos_sp": 23,
    "manguezais_ibama_sp": 462,
    "embargos_ibama_ativos_sp": 997,
    "embargos_estaduais_sigam": 1211,
    "areas_restricao_cetesb": 879,
}

# Regras vigentes em geoprocessamento.regra_classificacao_fase1 (2026-09-05).
# Toda restrição tem severidade 4 — é impedimento, não condicionante.
REGRAS: dict[str, dict[str, Any]] = {
    "uc_pi_federal": {"tipo_tratamento": "restricao", "severidade": 4,
                      "base_legal": "Lei 9985/2000 art. 10"},
    "uc_pi_estadual": {"tipo_tratamento": "restricao", "severidade": 4,
                       "base_legal": "Lei 9985/2000 art. 9-10"},
    "uc_pi_municipal": {"tipo_tratamento": "restricao", "severidade": 4,
                        "base_legal": "Lei 9985/2000 art. 7 §1"},
    "terra_indigena": {"tipo_tratamento": "restricao", "severidade": 4,
                       "base_legal": "CF/88 art. 231; Port. Interministerial 60/2015"},
    "territorio_quilombola": {"tipo_tratamento": "restricao", "severidade": 4,
                              "base_legal": "Dec. 4887/2003; Port. Interministerial 60/2015"},
    "ecossistema_costeiro": {"tipo_tratamento": "restricao", "severidade": 4,
                             "base_legal": "Lei 12651/2012 art. 4 VII"},
    "embargo_ibama": {"tipo_tratamento": "restricao", "severidade": 4,
                      "base_legal": "Lei 9605/1998 art. 72; Dec. 6514/2008"},
    "embargo_estadual": {"tipo_tratamento": "restricao", "severidade": 4,
                         "base_legal": "Dec. Est. SP 8468/1976; Lei Est. SP 9509/1997"},
    "interdicao_cetesb": {"tipo_tratamento": "restricao", "severidade": 4,
                          "base_legal": "Lei Est. SP 13577/2009; Dec. Est. SP 59263/2013"},
}


# ------------------------------------------------------------------- utilidades

DRIVER_MEM = ogr.GetDriverByName("Memory")
DRIVER_GPKG = ogr.GetDriverByName("GPKG")


def _srs() -> osr.SpatialReference:
    referencia = osr.SpatialReference()
    referencia.ImportFromEPSG(CRS_TRABALHO)
    referencia.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return referencia


def _abrir(caminho: str) -> ogr.Layer:
    fonte = ogr.Open(caminho)
    if fonte is None:
        raise SystemExit(f"ABORTADO: não consegui abrir {caminho}")
    _abrir._vivas.append(fonte)  # mantém a fonte viva enquanto a camada é usada
    return fonte.GetLayer()


_abrir._vivas = []  # type: ignore[attr-defined]


def _para_memoria(origem: ogr.Layer, nome: str) -> ogr.Layer:
    """Copia a camada para memória, reprojetando e reparando geometria.

    Reparo por `Buffer(0)`: o Identity é sensível a auto-interseção, e uma única
    geometria inválida derruba a operação inteira sem dizer qual.
    """
    destino_srs = _srs()
    fonte_srs = origem.GetSpatialRef()
    transformacao = None
    if fonte_srs and not fonte_srs.IsSame(destino_srs):
        fonte_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
        transformacao = osr.CoordinateTransformation(fonte_srs, destino_srs)

    memoria = DRIVER_MEM.CreateDataSource(nome)
    _para_memoria._vivas.append(memoria)  # type: ignore[attr-defined]
    camada = memoria.CreateLayer(nome, destino_srs, ogr.wkbMultiPolygon)
    definicao_origem = origem.GetLayerDefn()
    for indice in range(definicao_origem.GetFieldCount()):
        camada.CreateField(definicao_origem.GetFieldDefn(indice))

    origem.ResetReading()
    descartadas = 0
    for feicao in origem:
        geometria = feicao.GetGeometryRef()
        if geometria is None or geometria.IsEmpty():
            descartadas += 1
            continue
        geometria = geometria.Clone()
        if transformacao is not None:
            geometria.Transform(transformacao)
        if not geometria.IsValid():
            geometria = geometria.Buffer(0)
            if geometria is None or geometria.IsEmpty():
                descartadas += 1
                continue
        geometria = ogr.ForceToMultiPolygon(geometria)
        nova = ogr.Feature(camada.GetLayerDefn())
        nova.SetFrom(feicao)
        nova.SetGeometry(geometria)
        camada.CreateFeature(nova)
    if descartadas:
        print(f"      {descartadas} geometria(s) nula/vazia descartada(s)")
    return camada


_para_memoria._vivas = []  # type: ignore[attr-defined]


def _envelope(camada: ogr.Layer, nome: str) -> ogr.Layer:
    """Retângulo envolvente da área de estudo, usado como acumulador.

    O contorno de SP tem ~54 mil vértices; o envelope tem 5. Como toda camada é
    intersectada contra o acumulador a cada volta, a diferença de custo é de
    duas ordens de grandeza. Envelope e não contorno simplificado: uma fronteira
    simplificada cortaria área real na costa.
    """
    minx, maxx, miny, maxy = camada.GetExtent()
    anel = ogr.Geometry(ogr.wkbLinearRing)
    for x, y in ((minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy), (minx, miny)):
        anel.AddPoint_2D(x, y)
    poligono = ogr.Geometry(ogr.wkbPolygon)
    poligono.AddGeometry(anel)

    memoria = DRIVER_MEM.CreateDataSource(nome)
    _envelope._vivas.append(memoria)  # type: ignore[attr-defined]
    saida = memoria.CreateLayer(nome, _srs(), ogr.wkbMultiPolygon)
    saida.CreateField(ogr.FieldDefn("area_estudo", ogr.OFTString))
    feicao = ogr.Feature(saida.GetLayerDefn())
    feicao.SetField("area_estudo", "SP")
    feicao.SetGeometry(ogr.ForceToMultiPolygon(poligono))
    saida.CreateFeature(feicao)
    return saida


_envelope._vivas = []  # type: ignore[attr-defined]


def _recortar(camada: ogr.Layer, mascara: ogr.Layer, nome: str) -> ogr.Layer:
    """Recorta pela área de estudo real — precisão onde ela importa."""
    memoria = DRIVER_MEM.CreateDataSource(nome)
    _recortar._vivas.append(memoria)  # type: ignore[attr-defined]
    saida = memoria.CreateLayer(nome, _srs(), ogr.wkbMultiPolygon)
    camada.Clip(mascara, saida, options=["PROMOTE_TO_MULTI=YES"])
    return saida


_recortar._vivas = []  # type: ignore[attr-defined]


def _classificar(camada: ogr.Layer, criterio: str) -> ogr.Layer:
    """Carimba criterio_id, tipo_tratamento, severidade e base_legal.

    A UC de Uso Sustentável vem agregada com as três esferas; o critério de cada
    feição é derivado do atributo `esfera`, sem precisar de camada por esfera.
    """
    regra = REGRAS.get(criterio)
    if regra is None:
        raise SystemExit(f"ABORTADO: critério sem regra declarada: {criterio}")

    definicao = camada.GetLayerDefn()
    tem_esfera = definicao.GetFieldIndex("esfera") >= 0
    for nome_campo, tipo in (("criterio_id", ogr.OFTString),
                             ("tipo_tratamento", ogr.OFTString),
                             ("severidade", ogr.OFTInteger),
                             ("base_legal", ogr.OFTString)):
        if definicao.GetFieldIndex(nome_campo) < 0:
            campo = ogr.FieldDefn(nome_campo, tipo)
            if tipo == ogr.OFTString:
                campo.SetWidth(254)
            camada.CreateField(campo)

    camada.ResetReading()
    for feicao in camada:
        alvo = criterio
        if tem_esfera and criterio.startswith("uc_"):
            esfera = (feicao.GetField("esfera") or "").strip().lower()
            candidato = f"{criterio.rsplit('_', 1)[0]}_{esfera}"
            if esfera and candidato in REGRAS:
                alvo = candidato
        vigente = REGRAS[alvo]
        feicao.SetField("criterio_id", alvo)
        feicao.SetField("tipo_tratamento", vigente["tipo_tratamento"])
        feicao.SetField("severidade", vigente["severidade"])
        feicao.SetField("base_legal", vigente["base_legal"])
        camada.SetFeature(feicao)
    return camada


def _somente_poligonos(camada: ogr.Layer, nome: str) -> ogr.Layer:
    """Descarta o que não for polígono e extrai a parte poligonal de coleções.

    É o passo que impede a GEOMETRYCOLLECTION de sobreviver à rodada. Sem ele o
    encadeamento derruba o GDAL sem exceção de Python — morte silenciosa.
    """
    memoria = DRIVER_MEM.CreateDataSource(nome)
    _somente_poligonos._vivas.append(memoria)  # type: ignore[attr-defined]
    saida = memoria.CreateLayer(nome, _srs(), ogr.wkbMultiPolygon)
    definicao = camada.GetLayerDefn()
    for indice in range(definicao.GetFieldCount()):
        saida.CreateField(definicao.GetFieldDefn(indice))

    camada.ResetReading()
    for feicao in camada:
        geometria = feicao.GetGeometryRef()
        if geometria is None or geometria.IsEmpty():
            continue
        tipo = ogr.GT_Flatten(geometria.GetGeometryType())
        if tipo == ogr.wkbGeometryCollection:
            partes = ogr.Geometry(ogr.wkbMultiPolygon)
            for indice in range(geometria.GetGeometryCount()):
                parte = geometria.GetGeometryRef(indice)
                if ogr.GT_Flatten(parte.GetGeometryType()) in (ogr.wkbPolygon, ogr.wkbMultiPolygon):
                    partes.AddGeometry(parte)
            if partes.GetGeometryCount() == 0:
                continue
            geometria = partes
        elif tipo not in (ogr.wkbPolygon, ogr.wkbMultiPolygon):
            continue
        nova = ogr.Feature(saida.GetLayerDefn())
        nova.SetFrom(feicao)
        nova.SetGeometry(ogr.ForceToMultiPolygon(geometria))
        saida.CreateFeature(nova)
    return saida


_somente_poligonos._vivas = []  # type: ignore[attr-defined]


def _identity(acumulador: ogr.Layer, tematica: ogr.Layer, prefixo: str, nome: str) -> ogr.Layer:
    memoria = DRIVER_MEM.CreateDataSource(nome)
    _identity._vivas.append(memoria)  # type: ignore[attr-defined]
    saida = memoria.CreateLayer(nome, _srs(), ogr.wkbMultiPolygon)
    erro = acumulador.Identity(tematica, saida, options=[
        "PROMOTE_TO_MULTI=YES",
        "KEEP_LOWER_DIMENSION_GEOMETRIES=NO",
        f"METHOD_PREFIX={prefixo}__",   # só a camada que entra é prefixada
    ])
    if erro != ogr.OGRERR_NONE:
        raise SystemExit(f"ABORTADO: Identity falhou em {prefixo} (código {erro})")
    return _somente_poligonos(saida, f"{nome}_poligonos")


_identity._vivas = []  # type: ignore[attr-defined]


def _campos_de_tratamento(camada: ogr.Layer) -> list[str]:
    definicao = camada.GetLayerDefn()
    return [
        definicao.GetFieldDefn(i).GetName()
        for i in range(definicao.GetFieldCount())
        if definicao.GetFieldDefn(i).GetName().endswith("__tipo_tratamento")
    ]


def _somente_com_tema(camada: ogr.Layer, nome: str) -> ogr.Layer:
    """Descarta a feicao de fundo — o pedaco do envelope onde nada incide.

    O Identity devolve a area inteira do acumulador, entao sobra uma feicao
    enorme sem nenhum atributo tematico. Publicada junto, ela vira incidencia
    falsa: a Fase 1 marca "restrito"/"apto com ressalva" para qualquer feicao
    intersectada e, sem atributo de indice, assume o valor maximo — o estado
    inteiro sairia restrito.
    """
    campos = _campos_de_tratamento(camada)
    if not campos:
        raise SystemExit("ABORTADO: nenhuma camada tematica entrou no acumulador")

    memoria = DRIVER_MEM.CreateDataSource(nome)
    _somente_com_tema._vivas.append(memoria)  # type: ignore[attr-defined]
    saida = memoria.CreateLayer(nome, _srs(), ogr.wkbMultiPolygon)
    definicao = camada.GetLayerDefn()
    for indice in range(definicao.GetFieldCount()):
        saida.CreateField(definicao.GetFieldDefn(indice))

    camada.ResetReading()
    descartadas = 0
    for feicao in camada:
        if not any(feicao.GetField(campo) for campo in campos):
            descartadas += 1
            continue
        nova = ogr.Feature(saida.GetLayerDefn())
        nova.SetFrom(feicao)
        saida.CreateFeature(nova)
    print(f"      feicao(oes) de fundo descartada(s): {descartadas}")
    return saida


_somente_com_tema._vivas = []  # type: ignore[attr-defined]


# ------------------------------------------------------------------- execução

def main() -> None:
    print("=" * 68)
    print("Consolidação de RESTRIÇÃO — Identity encadeado")
    print("=" * 68)

    area = _para_memoria(_abrir(AREA_ESTUDO), "area_estudo")
    acumulador = _envelope(area, "acumulador")
    print(f"acumulador: envelope da área de estudo ({acumulador.GetFeatureCount()} feição)")

    for indice, (relativo, criterio, prefixo) in enumerate(CAMADAS, start=1):
        caminho = os.path.join(ACERVO, relativo.replace("/", os.sep))
        nome = os.path.splitext(os.path.basename(caminho))[0]
        if not os.path.isfile(caminho):
            raise SystemExit(f"ABORTADO: camada ausente — {caminho}")

        bruta = _abrir(caminho)
        total = bruta.GetFeatureCount()
        esperado = ESPERADO.get(nome)
        if esperado is not None and total != esperado:
            raise SystemExit(
                f"ABORTADO: {nome} tem {total} feições, esperado {esperado}. "
                "Confira se é a camada do acervo."
            )

        print(f"\n[{indice:>2}/{len(CAMADAS)}] {nome}  ({total} feições, critério {criterio})")
        preparada = _para_memoria(bruta, f"prep_{nome}")
        recortada = _recortar(preparada, area, f"clip_{nome}")
        print(f"      recortada pela área de estudo: {recortada.GetFeatureCount()} feições")
        classificada = _classificar(recortada, criterio)

        antes = acumulador.GetFeatureCount()
        acumulador = _identity(acumulador, classificada, prefixo, f"acum_{indice}")
        print(f"      acumulador {antes} -> {acumulador.GetFeatureCount()} feições")

    acumulador = _somente_com_tema(acumulador, "publicavel")

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    if os.path.exists(SAIDA):
        DRIVER_GPKG.DeleteDataSource(SAIDA)
    destino = DRIVER_GPKG.CreateDataSource(SAIDA)
    destino.CopyLayer(acumulador, "restricao", ["OVERWRITE=YES"])
    destino = None

    definicao = acumulador.GetLayerDefn()
    campos_tratamento = _campos_de_tratamento(acumulador)
    marcadas = acumulador.GetFeatureCount()  # depois do descarte, toda feicao tem tema

    print("\n" + "=" * 68)
    print(f"gravado: {SAIDA}")
    print(f"feições: {acumulador.GetFeatureCount()} | com ao menos uma restrição: {marcadas}")
    print(f"colunas: {definicao.GetFieldCount()} | critérios: {len(campos_tratamento)} camadas")
    print("=" * 68)

    if CARREGAR_NO_QGIS:
        try:
            from qgis.core import QgsProject, QgsVectorLayer

            camada = QgsVectorLayer(f"{SAIDA}|layername=restricao", "Restrição consolidada", "ogr")
            if camada.isValid():
                QgsProject.instance().addMapLayer(camada)
                print("camada adicionada ao projeto do QGIS")
            else:
                print("aviso: o QGIS não conseguiu abrir o resultado")
        except ImportError:
            print("fora do QGIS: resultado gravado, sem carregar no projeto")


main()
