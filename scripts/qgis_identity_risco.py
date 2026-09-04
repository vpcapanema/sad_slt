"""Gera a camada consolidada de RISCO da Fase 1 por Identity encadeado, no QGIS.

Uso: abra o Console Python do QGIS, ajuste ACERVO e SAIDA abaixo, e rode o
arquivo (Console Python > "Mostrar editor" > abrir este script > Executar).

Por que OGR e não um algoritmo de processamento do QGIS: o QGIS não traz
Identity nativo — tem Intersection, Union, Difference e Clip, mas não Identity.
O `ogr.Layer.Identity` é a implementação de referência (a mesma família que o
ArcGIS espelha) e vem embarcada no QGIS. Foi também o motor adotado no sistema,
então o produto gerado aqui é idêntico ao que a Bancada produziria.

Três cuidados que a operação exige, todos aprendidos na marra:

1. O ACUMULADOR define a extensão da saída. Se você puser uma camada temática
   ali, tudo que estiver fora dela desaparece — foi assim que uma versão antiga
   deste produto ficou com as áreas contaminadas zeradas. Aqui o acumulador é o
   ENVELOPE da área de estudo: contém todas as temáticas e não recorta nada.
   O recorte pelo contorno real é feito antes, camada a camada.

2. `KEEP_LOWER_DIMENSION_GEOMETRIES=NO` não basta. O GDAL só honra essa opção
   quando a camada de saída tem tipo desconhecido; criada com tipo definido,
   ela recebe GEOMETRYCOLLECTION assim mesmo — e essas coleções reentram na
   rodada seguinte e derrubam o GDAL sem erro de Python. Por isso a saída é
   normalizada para polígono a cada volta.

3. Só a camada QUE ENTRA é prefixada. Prefixar o acumulador empilharia um
   prefixo por rodada; na décima terceira volta cada campo carregaria treze.
"""
from __future__ import annotations

import os
from typing import Any

from osgeo import gdal, ogr, osr

gdal.UseExceptions()
ogr.UseExceptions()

# ---------------------------------------------------------------- configuração

# Aponte RAIZ para a pasta do repositório. No QGIS, edite esta linha; fora dele,
# a variável de ambiente SLT_RAIZ também serve.
RAIZ = os.environ.get("SLT_RAIZ") or os.getcwd()

ACERVO = os.path.join(RAIZ, "data", "geoespacial", "uploads", "datastorage", "vetor")
AREA_ESTUDO = os.path.join(ACERVO, "AREA_ESTUDO", "uf_sp.zip.contents", "uf_sp.shp")
SAIDA = os.path.join(
    RAIZ, "data", "geoespacial", "outputs", "fase1_risco_consolidado_sp.gpkg"
)
CRS_TRABALHO = 4674  # SIRGAS 2000

CARREGAR_NO_QGIS = True  # ao final, adiciona o resultado ao projeto aberto

# Camada -> (critério, prefixo dos campos). Ordem = ordem de entrada no Identity.
# O critério de cada camada é o declarado na seção 2 do Arcabouço Teórico-Conceitual.
CAMADAS: list[tuple[str, str, str]] = [
    ("RISCO/ucs_uso_sustentavel_sp.zip.contents/ucs_uso_sustentavel_sp.shp", "uc_us_estadual", "uc_us"),
    ("RISCO/assentamentos_sp.zip.contents/assentamentos_sp.shp", "assentamento", "assentamento"),
    ("RISCO/aprm_alto_juquery.zip.contents/aprm_alto_juquery.shp", "aprm", "aprm_alto_juquery"),
    ("RISCO/aprm_alto_tiete_cabec.zip.contents/aprm_alto_tiete_cabec.shp", "aprm", "aprm_alto_tiete"),
    ("RISCO/aprm_guarapiranga.zip.contents/aprm_guarapiranga.shp", "aprm", "aprm_guarapiranga"),
    ("RISCO/aprm_billings.zip.contents/aprm_billings.shp", "aprm", "aprm_billings"),
    ("RISCO/cavidades_influencia.zip.contents/cavidades_influencia.shp", "cavidade", "cavidade"),
    ("RISCO/sitios_arqueologicos.zip.contents/sitios_arqueologicos.shp", "sitio_arqueologico", "sitio_arqueologico"),
    ("RISCO/bens_tombados_condephaat.zip.contents/bens_tombados_condephaat.shp", "bem_tombado", "tombado_condephaat"),
    ("RISCO/bens_tombados_iphan_sp.zip.contents/bens_tombados_iphan_sp.shp", "bem_tombado", "tombado_iphan"),
    ("RISCO/inundacao.zip.contents/inundacao.shp", "inundacao", "inundacao"),
    ("RISCO/movimento_massa.zip.contents/movimento_massa.shp", "movimento_massa", "movimento_massa"),
    ("RISCO/areas_contaminadas_cetesb.zip.contents/areas_contaminadas_cetesb.shp", "area_contaminada", "area_contaminada"),
]

# Contagem esperada por camada. Divergência aborta: melhor não gerar do que
# gerar com a camada errada — já aconteceu de pegar um "quilombos" de 26
# feições quando o do acervo tem 23.
ESPERADO: dict[str, int] = {
    "ucs_uso_sustentavel_sp": 182, "assentamentos_sp": 209,
    "aprm_alto_juquery": 257, "aprm_alto_tiete_cabec": 80,
    "aprm_guarapiranga": 90, "aprm_billings": 903,
    "cavidades_influencia": 693, "sitios_arqueologicos": 1110,
    "bens_tombados_condephaat": 940, "bens_tombados_iphan_sp": 1136,
    "inundacao": 776, "movimento_massa": 920,
    "areas_contaminadas_cetesb": 7241,
}

# Regras vigentes em geoprocessamento.regra_classificacao_fase1 (2026-09-04).
REGRAS: dict[str, dict[str, Any]] = {
    "aprm": {"tipo_tratamento": "risco", "severidade": 2,
             "base_legal": "Lei Estadual 9866/1997"},
    "area_contaminada": {"tipo_tratamento": "risco", "severidade": 2,
                         "base_legal": "CETESB — Relação de Áreas Contaminadas"},
    "assentamento": {"tipo_tratamento": "risco", "severidade": 2,
                     "base_legal": "INCRA; ITESP"},
    "bem_tombado": {"tipo_tratamento": "risco", "severidade": 3,
                    "base_legal": "Dec-Lei 25/1937, arts. 10, 17 e 18; IN IPHAN 001/2015"},
    "cavidade": {"tipo_tratamento": "risco", "severidade": 2,
                 "base_legal": "Dec. 10935/2022; IN ICMBio 02/2017"},
    "inundacao": {"tipo_tratamento": "risco", "severidade": 3,
                  "base_legal": "Defesa Civil; IPT; SGB/CPRM"},
    "movimento_massa": {"tipo_tratamento": "risco", "severidade": 3,
                        "base_legal": "IPT; SGB/CPRM"},
    "sitio_arqueologico": {"tipo_tratamento": "risco", "severidade": 3,
                           "base_legal": "Lei 3924/1961"},
    "uc_us_estadual": {"tipo_tratamento": "risco", "severidade": 2,
                       "base_legal": "Lei 9985/2000; Fundação Florestal"},
    "uc_us_federal": {"tipo_tratamento": "risco", "severidade": 2,
                      "base_legal": "Lei 9985/2000"},
    "uc_us_municipal": {"tipo_tratamento": "risco", "severidade": 2,
                        "base_legal": "Lei 9985/2000 art. 7 §2"},
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


# ------------------------------------------------------------------- execução

def main() -> None:
    print("=" * 68)
    print("Consolidação de RISCO — Identity encadeado")
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

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    if os.path.exists(SAIDA):
        DRIVER_GPKG.DeleteDataSource(SAIDA)
    destino = DRIVER_GPKG.CreateDataSource(SAIDA)
    destino.CopyLayer(acumulador, "risco", ["OVERWRITE=YES"])
    destino = None

    marcadas = 0
    acumulador.ResetReading()
    definicao = acumulador.GetLayerDefn()
    campos_tratamento = [
        definicao.GetFieldDefn(i).GetName() for i in range(definicao.GetFieldCount())
        if definicao.GetFieldDefn(i).GetName().endswith("__tipo_tratamento")
    ]
    for feicao in acumulador:
        if any(feicao.GetField(campo) for campo in campos_tratamento):
            marcadas += 1

    print("\n" + "=" * 68)
    print(f"gravado: {SAIDA}")
    print(f"feições: {acumulador.GetFeatureCount()} | com ao menos um risco: {marcadas}")
    print(f"colunas: {definicao.GetFieldCount()} | critérios: {len(campos_tratamento)} camadas")
    print("=" * 68)

    if CARREGAR_NO_QGIS:
        try:
            from qgis.core import QgsProject, QgsVectorLayer

            camada = QgsVectorLayer(f"{SAIDA}|layername=risco", "Risco consolidado", "ogr")
            if camada.isValid():
                QgsProject.instance().addMapLayer(camada)
                print("camada adicionada ao projeto do QGIS")
            else:
                print("aviso: o QGIS não conseguiu abrir o resultado")
        except ImportError:
            print("fora do QGIS: resultado gravado, sem carregar no projeto")


main()
