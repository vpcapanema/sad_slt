"""Service — Módulo Geoespacial."""
from __future__ import annotations

import json
import base64
import os
import re
import tempfile
import unicodedata
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Callable, cast
from uuid import uuid4

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from PIL import Image
from rasterio.io import MemoryFile
from rasterio.transform import array_bounds
from rasterio.warp import Resampling, calculate_default_transform, reproject, transform_bounds
from rasterio.windows import Window, from_bounds
from affine import Affine

from api.path_policy import (
    project_path,
    project_relative,
)
from api.repositories import camada_geoespacial_repository


# Operação de overlay -> método nativo de ogr.Layer. "difference" é o Erase do
# OGR: mantém as partes da entrada que não são cobertas pela camada de método,
# que é a mesma semântica do how="difference" do GeoPandas.
_OVERLAY_OGR: dict[str, str] = {
    "identity": "Identity",
    "intersection": "Intersection",
    "union": "Union",
    "difference": "Erase",
    "symmetric_difference": "SymDifference",
}


def _prefixo_overlay(regra_nomenclatura: str, fonte_id: str) -> str:
    """Traduz a regra de nomenclatura declarada no fluxo em prefixo do OGR.

    A regra padrão dos fluxos da Fase 1 é ``<fonte_id>__<nome_campo>``; o OGR
    recebe apenas a parte que antecede o nome do campo.
    """
    regra = str(regra_nomenclatura or "<fonte_id>__<nome_campo>")
    if "<nome_campo>" not in regra:
        return f"{fonte_id}__"
    return regra.split("<nome_campo>")[0].replace("<fonte_id>", fonte_id)


_DIMENSAO_POR_TIPO = {
    "Point": 0, "MultiPoint": 0,
    "LineString": 1, "LinearRing": 1, "MultiLineString": 1,
    "Polygon": 2, "MultiPolygon": 2,
}


def _restringir_dimensao(
    resultado: gpd.GeoDataFrame, referencia: gpd.GeoDataFrame
) -> gpd.GeoDataFrame:
    """Mantém só a dimensão geométrica da camada de entrada, como o ArcGIS.

    ``KEEP_LOWER_DIMENSION_GEOMETRIES=NO`` não basta: o próprio GDAL documenta
    que a opção só age quando a camada de saída tem tipo desconhecido, e aqui a
    saída é criada com o tipo da entrada. O resultado é que bordas e toques
    voltam embrulhados em ``GEOMETRYCOLLECTION`` — que o GeoPackage aceita fora
    da especificação, e que derruba o GDAL na rodada seguinte de um
    encadeamento, sem exceção Python.
    """
    from shapely.geometry import GeometryCollection
    from shapely.ops import unary_union

    dimensoes = {
        _DIMENSAO_POR_TIPO.get(tipo)
        for tipo in referencia.geom_type.dropna().unique()
    } - {None}
    if not dimensoes:
        return resultado
    alvo = max(dimensoes)

    def compatibilizar(geometria: Any) -> Any:
        if geometria is None or geometria.is_empty:
            return None
        if _DIMENSAO_POR_TIPO.get(geometria.geom_type) == alvo:
            return geometria
        if isinstance(geometria, GeometryCollection):
            partes = [
                parte for parte in geometria.geoms
                if _DIMENSAO_POR_TIPO.get(parte.geom_type) == alvo and not parte.is_empty
            ]
            if partes:
                return unary_union(partes)
        return None

    ajustado = resultado.copy()
    ajustado["geometry"] = [compatibilizar(g) for g in ajustado.geometry]
    return ajustado[ajustado.geometry.notna()].reset_index(drop=True)


def _overlay_ogr(
    gdf1: gpd.GeoDataFrame,
    gdf2: gpd.GeoDataFrame,
    tipo_overlay: str,
    *,
    prefixo_1: str | None = None,
    prefixo_2: str | None = None,
) -> gpd.GeoDataFrame:
    """Executa o overlay pelo motor nativo do OGR, preservando os atributos.

    As camadas trafegam por GeoPackage temporário em vez de serem remontadas
    feição a feição em Python: a serialização é feita em C pelo pyogrio, e o
    OGR processa por feição, sem materializar o resultado inteiro em memória.
    """
    from osgeo import gdal, ogr

    gdal.UseExceptions()
    metodo = _OVERLAY_OGR[tipo_overlay]

    # KEEP_LOWER_DIMENSION_GEOMETRIES=NO é o equivalente do keep_geom_type do
    # GeoPandas, e não é opcional: sem ele o recorte devolve as bordas e toques
    # como linhas e pontos dentro de GEOMETRYCOLLECTION. Além de fugir da
    # semântica do ArcGIS, essas coleções reentram na rodada seguinte de um
    # encadeamento e derrubam o processo dentro do GDAL, sem exceção Python.
    opcoes = ["PROMOTE_TO_MULTI=YES", "KEEP_LOWER_DIMENSION_GEOMETRIES=NO"]
    if prefixo_1:
        opcoes.append(f"INPUT_PREFIX={prefixo_1}")
    if prefixo_2:
        opcoes.append(f"METHOD_PREFIX={prefixo_2}")

    # ignore_cleanup_errors: no Windows o GDAL pode reter o handle do GeoPackage
    # por um instante após a liberação, e falhar a limpeza de um diretório
    # temporário não pode derrubar um geoprocesso que já produziu resultado.
    with tempfile.TemporaryDirectory(prefix="slt_overlay_", ignore_cleanup_errors=True) as pasta:
        base = Path(pasta)
        caminho_1, caminho_2 = base / "entrada.gpkg", base / "metodo.gpkg"
        caminho_saida = base / "saida.gpkg"
        gdf1.to_file(caminho_1, layer="entrada", driver="GPKG")
        gdf2.to_file(caminho_2, layer="metodo", driver="GPKG")

        fonte_1 = ogr.Open(str(caminho_1))
        fonte_2 = ogr.Open(str(caminho_2))
        camada_1, camada_2 = fonte_1.GetLayer(), fonte_2.GetLayer()

        destino = ogr.GetDriverByName("GPKG").CreateDataSource(str(caminho_saida))
        saida = destino.CreateLayer(
            "resultado", camada_1.GetSpatialRef(), camada_1.GetGeomType()
        )
        erro = getattr(camada_1, metodo)(camada_2, saida, options=opcoes)
        if erro != ogr.OGRERR_NONE:
            raise RuntimeError(f"O overlay {tipo_overlay} falhou no OGR (código {erro})")

        # Toda referência a camada precisa cair junto com a fonte de dados: uma
        # ogr.Layer viva mantém o GeoPackage aberto, e no Windows isso impede a
        # remoção do diretório temporário.
        del camada_1, camada_2, saida
        destino = fonte_1 = fonte_2 = None
        bruto = gpd.read_file(caminho_saida, layer="resultado")

    return _restringir_dimensao(bruto, gdf1)


class GeoespacialService:
    """Service para operações geoespaciais."""

    def __init__(self) -> None:
        self._camadas: dict[str, gpd.GeoDataFrame] = {}
        self._rasters: dict[str, np.ndarray] = {}
        self._raster_profiles: dict[str, dict[str, Any]] = {}
        self._metadados: dict[str, dict[str, Any]] = {}

    def _registrar_metadados(
        self,
        recurso_id: str,
        nome: str,
        tipo: str,
        crs: str | None,
        origem: str,
        **extras: Any,
    ) -> None:
        self._metadados[recurso_id] = {
            "id": recurso_id,
            "nome": nome,
            "tipo": tipo,
            "crs": crs,
            "origem": origem,
            "data_importacao": datetime.now(timezone.utc).isoformat(),
            "caminho_arquivo": extras.pop("caminho_arquivo", None),
            "url_origem": extras.pop("url_origem", None),
            "metadados": extras,
        }

    def registrar_camada(
        self,
        gdf: gpd.GeoDataFrame,
        nome: str,
        origem: str = "processamento",
        progress: Callable[[str], None] | None = None,
        **extras: Any,
    ) -> str:
        camada_id = f"camada_{uuid4().hex}"
        self._registrar_metadados(
            camada_id, nome, "vetorial", str(gdf.crs) if gdf.crs else None, origem,
            feicoes=len(gdf), colunas=list(gdf.columns), **extras,
        )
        if progress:
            progress("Metadados vetoriais preparados")
        try:
            database_id = camada_geoespacial_repository.salvar_vetor(
                recurso_id=camada_id,
                nome=nome,
                origem=origem,
                gdf=gdf,
                metadados=self._metadados[camada_id],
                hash_arquivo=extras.get("hash_arquivo"),
            )
            if progress:
                progress("Catálogo e feições vetoriais persistidos no PostGIS")
        except Exception:
            self._metadados.pop(camada_id, None)
            raise
        self._metadados[camada_id]["metadados"]["database_id"] = database_id
        self._camadas[camada_id] = gdf
        if progress:
            progress("Camada vetorial registrada no cache de trabalho")
        return camada_id

    def registrar_raster(
        self,
        raster: np.ndarray,
        profile: dict[str, Any],
        nome: str,
        origem: str = "processamento",
        progress: Callable[[str], None] | None = None,
        **extras: Any,
    ) -> str:
        raster_id = f"raster_{uuid4().hex}"
        raster_data = np.asarray(raster, dtype="float32")
        if progress:
            progress("Matriz raster normalizada para persistência")
        crs = profile.get("crs")
        transform = profile.get("transform")
        if not crs or transform is None:
            raise ValueError("Raster precisa de CRS e transformação para persistência obrigatória")
        self._registrar_metadados(
            raster_id, nome, "raster", str(crs) if crs else None, origem,
            shape=list(raster.shape), **extras,
        )
        if progress:
            progress("Metadados raster preparados")
        nodata = profile.get("nodata", np.nan)
        with MemoryFile() as memory:
            with memory.open(
                driver="GTiff", height=raster_data.shape[0], width=raster_data.shape[1],
                count=1, dtype="float32", crs=crs, transform=transform, nodata=nodata,
            ) as dataset:
                dataset.write(raster_data, 1)
            geotiff = memory.read()
        if progress:
            progress("GeoTIFF interno serializado")
        serializable_profile = {
            "crs": str(crs),
            "transform": list(transform),
            "nodata": None if nodata is None or np.isnan(nodata) else float(nodata),
        }
        try:
            database_id = camada_geoespacial_repository.salvar_raster(
                recurso_id=raster_id, nome=nome, origem=origem, crs=str(crs),
                dados_geotiff=geotiff, largura=raster_data.shape[1],
                altura=raster_data.shape[0], dtype="float32",
                nodata=None if nodata is None or np.isnan(nodata) else float(nodata),
                perfil=serializable_profile, metadados=self._metadados[raster_id],
                hash_arquivo=extras.get("hash_arquivo"),
            )
            if progress:
                progress("Catálogo e conteúdo raster persistidos no PostGIS")
        except Exception:
            self._metadados.pop(raster_id, None)
            raise
        self._metadados[raster_id]["metadados"]["database_id"] = database_id
        self._rasters[raster_id] = raster_data
        self._raster_profiles[raster_id] = profile
        if progress:
            progress("Raster registrado no cache de trabalho")
        return raster_id

    def _catalogar_persistidas(self) -> None:
        for row in camada_geoespacial_repository.listar():
            recurso_id = row.get("recurso_sessao_id")
            tem_conteudo = row.get("tem_vetor") or row.get("tem_raster")
            if not recurso_id or not tem_conteudo:
                continue
            stored = row.get("metadados") or {}
            extras = stored.get("metadados") or stored
            self._metadados[recurso_id] = {
                "id": recurso_id,
                "nome": row["nome"],
                "tipo": "vetorial" if row["tipo"] == "vetor" else "raster",
                "crs": row.get("crs"),
                "origem": stored.get("origem", extras.get("origem", "banco")),
                "data_importacao": row["criado_em"].isoformat(),
                "caminho_arquivo": stored.get("caminho_arquivo"),
                "url_origem": stored.get("url_origem"),
                "metadados": {**extras, "database_id": str(row["id"]), "persistida": True},
            }

    def obter_camada_dados(self, camada_id: str) -> gpd.GeoDataFrame:
        """Devolve a camada, preferindo o arquivo do acervo ao banco.

        Geoprocesso consome a camada INTEIRA, e para leitura completa o arquivo
        ganha do banco com folga: no aferimento do MapServer, GeoPackage lê em
        0,042s contra 0,053s do PostGIS nativo, e aqui o PostGIS ainda é remoto,
        somando rede a cada leitura. O banco reconstrói o GeoDataFrame linha a
        linha, desserializando geometria; o arquivo entrega em bloco, em C.

        O banco continua sendo a resposta certa para leitura filtrada por área
        ou atributo, junção e acesso concorrente — e permanece como retaguarda
        aqui, para camadas sem arquivo (saídas de geoprocesso) ou cujo arquivo
        tenha sumido.
        """
        self._verificar_resultado_disponivel(camada_id)
        cached = self._camadas.get(camada_id)
        if cached is not None:
            return cached

        gdf = self._ler_do_acervo(camada_id)
        if gdf is None:
            loaded = camada_geoespacial_repository.carregar_vetor(camada_id)
            if loaded is None:
                raise ValueError(f"Camada {camada_id} não encontrada")
            gdf, _ = loaded

        self._camadas[camada_id] = gdf
        self._catalogar_persistidas()
        return gdf

    def _verificar_resultado_disponivel(self, recurso_id: str) -> None:
        if recurso_id not in self._metadados and (recurso_id in self._camadas or recurso_id in self._rasters):
            return  # Seleções transitórias internas do motor não são resultados registrados.
        if recurso_id not in self._metadados:
            self._catalogar_persistidas()
        metadata = self._metadados.get(recurso_id) or {}
        if metadata.get('arquivo_resultado_id') or (metadata.get('metadados') or {}).get('arquivo_resultado_id'):
            from api.services.ciclo_vida_arquivos import verificar_resultado
            verificar_resultado(recurso_id)

    def _caminho_arquivo_da_camada(self, camada_id: str) -> Path | None:
        """Resolve o caminho do arquivo do acervo de uma camada, se houver.

        Único ponto que decide "esta camada tem arquivo fonte" — usado tanto
        para ler (`_ler_do_acervo`) quanto para gravar edições de volta nele.
        """
        if not self._metadados.get(camada_id):
            self._catalogar_persistidas()
        metadata = self._metadados.get(camada_id) or {}
        relativo = metadata.get("caminho_arquivo")
        if not relativo:
            return None
        try:
            caminho = project_path(str(relativo))
        except ValueError:
            return None
        return caminho if caminho.exists() else None

    def _ler_do_acervo(self, camada_id: str) -> gpd.GeoDataFrame | None:
        """Lê a camada do arquivo registrado, ou devolve None se não der."""
        caminho = self._caminho_arquivo_da_camada(camada_id)
        if caminho is None:
            return None
        try:
            frame = cast(gpd.GeoDataFrame, gpd.read_file(caminho))
            meta = self._metadados.get(camada_id) or {}
            for field in meta.get('campos_json_arquivo', (meta.get('metadados') or {}).get('campos_json_arquivo', [])):
                if field in frame:
                    frame[field] = frame[field].map(lambda v: json.loads(v) if isinstance(v, str) else v)
            return frame
        except Exception:
            # Arquivo ilegível não pode impedir o acesso à camada: o banco
            # responde em seguida.
            return None

    def obter_raster_dados(self, raster_id: str) -> np.ndarray:
        self._verificar_resultado_disponivel(raster_id)
        cached = self._rasters.get(raster_id)
        if cached is not None:
            return cached
        loaded = camada_geoespacial_repository.carregar_raster(raster_id)
        if loaded is None:
            raise ValueError(f"Raster {raster_id} não encontrado")
        geotiff, _ = loaded
        with MemoryFile(geotiff) as memory:
            with memory.open() as dataset:
                data = dataset.read(1).astype("float32")
                profile = {
                    "crs": dataset.crs,
                    "transform": dataset.transform,
                    "nodata": dataset.nodata,
                }
        self._rasters[raster_id] = data
        self._raster_profiles[raster_id] = profile
        self._catalogar_persistidas()
        return data

    async def listar_recursos(self) -> list[dict[str, Any]]:
        """Lista o catálogo efetivamente usado pelo motor de processamento."""
        self._catalogar_persistidas()
        recursos: list[dict[str, Any]] = []
        for recurso_id in self._metadados:
            meta = self._metadados.get(recurso_id)
            if meta:
                recursos.append(meta)
                continue
            if recurso_id in self._camadas:
                gdf = self._camadas[recurso_id]
                self._registrar_metadados(
                    recurso_id, recurso_id, "vetorial", str(gdf.crs) if gdf.crs else None,
                    "sessao", feicoes=len(gdf), colunas=list(gdf.columns),
                )
            else:
                raster = self._rasters[recurso_id]
                profile = self._raster_profiles.get(recurso_id, {})
                self._registrar_metadados(
                    recurso_id, recurso_id, "raster", str(profile.get("crs") or "") or None,
                    "sessao", shape=list(raster.shape),
                )
            recursos.append(self._metadados[recurso_id])
        return recursos

    async def obter_recurso(self, recurso_id: str) -> dict[str, Any] | None:
        await self.listar_recursos()
        return self._metadados.get(recurso_id)

    async def carregar_recurso(
        self, recurso_id: str, progress: Callable[[str], None] | None = None
    ) -> dict[str, Any]:
        """Carrega no cache uma camada que já pertence ao catálogo interno."""
        self._catalogar_persistidas()
        if progress:
            progress("Catálogo físico consultado")
        metadata = self._metadados.get(recurso_id)
        if metadata is None:
            # Aceita camada_homologada.id (UUID) além do recurso_sessao_id.
            alias = camada_geoespacial_repository.resolver_recurso_id(recurso_id)
            if alias and alias != recurso_id:
                recurso_id = alias
                metadata = self._metadados.get(recurso_id)
        if metadata is None:
            raise ValueError(f"Camada {recurso_id} não encontrada no sistema")
        if progress:
            progress("Metadados da camada localizados")
        if metadata["tipo"] == "raster":
            self.obter_raster_dados(recurso_id)
            if progress:
                progress("Bloco GeoTIFF lido do banco")
        else:
            self.obter_camada_dados(recurso_id)
            if progress:
                progress("Feições e geometrias lidas do banco")
        if progress:
            progress("Conteúdo registrado no cache da sessão")
        return {**metadata, "carregada": True}

    async def excluir_recurso(self, recurso_id: str) -> bool:
        if camada_geoespacial_repository.esta_homologada(recurso_id):
            raise ValueError("Camada homologada é somente leitura")
        removido = camada_geoespacial_repository.excluir(recurso_id)
        removido = self._camadas.pop(recurso_id, None) is not None or removido
        removido = self._rasters.pop(recurso_id, None) is not None or removido
        self._raster_profiles.pop(recurso_id, None)
        self._metadados.pop(recurso_id, None)
        return removido

    async def camada_geojson(self, camada_id: str) -> dict[str, Any]:
        """GeoJSON completo da camada, para o mapa da Bancada.

        Prefere ler do arquivo do acervo (via `obter_camada_dados`) em vez de
        remontar tudo no PostGIS remoto: para a grade de favorabilidade —
        103.620 feições — o `jsonb_agg`/`ST_AsGeoJSON` do banco tinha que
        computar e transportar o payload inteiro pela rede a cada camada
        carregada na Bancada, sem cache. É a mesma otimização já aplicada ao
        geoprocessamento, agora estendida a esta rota.

        O PostGIS guarda a geometria em EPSG:4674 (SIRGAS 2000, o CRS de
        armazenamento do sistema — ver migração 100), e o arquivo do acervo
        também costuma estar em 4674. Mas o mapa web (Leaflet/MapLibre) espera
        coordenadas próximas de WGS84, então a saída desta função é sempre
        reprojetada para EPSG:4326 aqui — é a fronteira de exibição, não o
        formato de guarda. Sem essa reprojeção a camada aparece na posição
        errada no mapa.
        """
        try:
            gdf = self.obter_camada_dados(camada_id)
        except ValueError:
            alias = camada_geoespacial_repository.resolver_recurso_id(camada_id)
            if not alias or alias == camada_id:
                raise
            camada_id = alias
            gdf = self.obter_camada_dados(camada_id)

        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")
        elif str(gdf.crs).upper() != "EPSG:4326":
            gdf = gdf.to_crs("EPSG:4326")
        # `default=str` cobre colunas de data/hora: o arquivo do acervo chega
        # com Timestamp do pandas, que o codificador padrão do `.to_json()`
        # não serializa — o caminho antigo (PostGIS) não sofria disso porque
        # a coluna já vinha como JSONB pronto, com a data como texto.
        return cast(dict[str, Any], json.loads(gdf.to_json(default=str)))

    async def atributos_camada(self, camada_id: str, limite: int = 100, offset: int = 0) -> dict[str, Any]:
        gdf = self.obter_camada_dados(camada_id).copy()
        dados = gdf.drop(columns=[gdf.geometry.name], errors="ignore").iloc[offset:offset + limite]
        dados = dados.where(dados.notna(), None)
        registros = dados.to_dict(orient="records")
        # `_indice` é a posição absoluta em obter_camada_dados(camada_id) — a
        # mesma ordem que salvar_edicoes_atributos usa para endereçar cada
        # linha. Chave estável mesmo quando a camada não tem um campo tipo
        # OBJECTID/FID único.
        for posicao, registro in enumerate(registros):
            registro["_indice"] = offset + posicao
        return {
            "camada_id": camada_id,
            "colunas": [{"nome": c, "tipo": str(dados[c].dtype)} for c in dados.columns],
            "registros": registros,
            "total": len(gdf),
            "offset": offset,
            "limite": limite,
            "homologada": camada_geoespacial_repository.esta_homologada(camada_id),
        }

    def _colunas_atributos(self, gdf: gpd.GeoDataFrame) -> list[str]:
        geometria = gdf.geometry.name if gdf.geometry is not None else None
        return [c for c in gdf.columns if c != geometria]

    async def simbologia_campos(self, camada_id: str) -> dict[str, Any]:
        """Lista os campos da camada com metadados úteis à simbologia por atributo."""
        gdf = self.obter_camada_dados(camada_id)
        campos: list[dict[str, Any]] = []
        for coluna in self._colunas_atributos(gdf):
            serie = gdf[coluna]
            numerico = bool(pd.api.types.is_numeric_dtype(serie)) and not bool(
                pd.api.types.is_bool_dtype(serie)
            )
            info: dict[str, Any] = {
                "nome": coluna,
                "tipo": str(serie.dtype),
                "numerico": numerico,
                "n_distintos": int(serie.nunique(dropna=True)),
            }
            if numerico:
                validos = pd.to_numeric(serie, errors="coerce").dropna()
                if not validos.empty:
                    info["min"] = float(validos.min())
                    info["max"] = float(validos.max())
            campos.append(info)
        return {"camada_id": camada_id, "campos": campos}

    async def simbologia_classificacao(
        self,
        camada_id: str,
        campo: str,
        metodo: str = "intervalos_iguais",
        classes: int = 5,
    ) -> dict[str, Any]:
        """Classifica um campo para simbologia categorizada ou graduada."""
        gdf = self.obter_camada_dados(camada_id)
        if campo not in self._colunas_atributos(gdf):
            raise ValueError(f"Campo '{campo}' inexistente na camada")
        serie = gdf[campo]

        if metodo == "valores_unicos":
            limite = 100
            contagem = serie.dropna().astype(str).value_counts()
            categorias = [
                {"valor": valor, "contagem": int(qtd)}
                for valor, qtd in contagem.head(limite).items()
            ]
            return {
                "camada_id": camada_id,
                "campo": campo,
                "metodo": metodo,
                "numerico": False,
                "categorias": categorias,
                "truncado": bool(contagem.size > limite),
                "total_distintos": int(contagem.size),
            }

        valores = pd.to_numeric(serie, errors="coerce").dropna().to_numpy(dtype="float64")
        if valores.size == 0:
            raise ValueError(f"Campo '{campo}' não possui valores numéricos")
        classes = max(2, min(int(classes), 12))
        minimo = float(np.min(valores))
        maximo = float(np.max(valores))
        quebras = self._quebras_por_metodo(valores, metodo, classes, minimo, maximo)
        return {
            "camada_id": camada_id,
            "campo": campo,
            "metodo": metodo,
            "numerico": True,
            "classes": len(quebras) + 1,
            "min": minimo,
            "max": maximo,
            "quebras": quebras,
        }

    def _quebras_por_metodo(
        self,
        valores: np.ndarray,
        metodo: str,
        classes: int,
        minimo: float,
        maximo: float,
    ) -> list[float]:
        """Retorna as quebras internas (comprimento classes-1) do método escolhido."""
        if maximo <= minimo:
            return []
        if metodo == "quantis":
            fracoes = np.linspace(0, 1, classes + 1)[1:-1]
            internas = np.quantile(valores, fracoes)
        elif metodo == "desvio_padrao":
            media = float(np.mean(valores))
            desvio = float(np.std(valores)) or (maximo - minimo) / classes
            passos = np.arange(1, classes) - (classes - 1) / 2
            internas = media + passos * desvio
            internas = internas[(internas > minimo) & (internas < maximo)]
        elif metodo == "quebras_naturais":
            internas = np.array(self._jenks_kmeans(valores, classes))
        else:  # intervalos_iguais
            internas = np.linspace(minimo, maximo, classes + 1)[1:-1]
        internas = np.unique(np.round(internas.astype("float64"), 6))
        internas = internas[(internas > minimo) & (internas < maximo)]
        return [float(v) for v in internas]

    def _jenks_kmeans(self, valores: np.ndarray, classes: int) -> list[float]:
        """Aproxima quebras naturais (Jenks) por k-means 1D com amostragem."""
        amostra = valores
        if amostra.size > 20000:
            gerador = np.random.default_rng(42)
            amostra = gerador.choice(amostra, size=20000, replace=False)
        amostra = np.sort(amostra)
        unicos = np.unique(amostra)
        if unicos.size <= classes:
            return [float(v) for v in unicos[1:]]
        centroides = np.quantile(amostra, np.linspace(0, 1, classes + 1)[1:-1:1])
        centroides = np.unique(np.concatenate(([amostra[0]], centroides, [amostra[-1]])))
        centroides = np.quantile(amostra, np.linspace(0, 1, classes))
        for _ in range(50):
            fronteiras = (centroides[:-1] + centroides[1:]) / 2
            grupos = np.digitize(amostra, fronteiras)
            novos = np.array(
                [
                    amostra[grupos == i].mean() if np.any(grupos == i) else centroides[i]
                    for i in range(classes)
                ]
            )
            if np.allclose(novos, centroides):
                break
            centroides = novos
        fronteiras = (centroides[:-1] + centroides[1:]) / 2
        return [float(v) for v in fronteiras]

    async def calcular_campo(self, camada_id: str, campo: str, expressao: str) -> dict[str, Any]:
        """Cria ou atualiza um campo usando uma expressão vetorizada."""
        if camada_geoespacial_repository.esta_homologada(camada_id):
            raise ValueError("Camada homologada é somente leitura")
        gdf = self.obter_camada_dados(camada_id).copy()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", campo):
            raise ValueError("Nome de campo inválido")
        if not expressao.strip():
            raise ValueError("Informe a expressão de cálculo")
        try:
            resultado = gdf.eval(expressao, engine="python")
        except Exception as exc:
            raise ValueError(f"Expressão inválida: {exc}") from exc
        gdf[campo] = resultado
        metadata = self._metadados[camada_id]
        metadata["metadados"]["colunas"] = list(gdf.columns)
        camada_geoespacial_repository.substituir_vetor(
            camada_id, gdf, metadata
        )
        self._camadas[camada_id] = gdf
        return {"camada_id": camada_id, "campo": campo, "feicoes_atualizadas": len(gdf)}

    def salvar_edicoes_atributos(
        self, camada_id: str, edicoes: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Grava edições de atributo feitas na Bancada — na fonte real da camada.

        "Fonte real" é o arquivo do acervo quando a camada tem um
        (`caminho_arquivo`), reescrito por inteiro via `gdf.to_file` — não é
        patch incremental, é a mesma estratégia que qualquer ferramenta GIS
        usa por baixo dos panos, e funciona igual para .shp e .gpkg sem
        tratamento por formato. O PostGIS é sempre atualizado também: tabela
        de atributos, estatística de campo da simbologia e tiles MVT
        continuam consultando o banco diretamente, e as duas cópias não podem
        divergir uma da outra.

        `edicoes`: lista de {"indice": posição absoluta em obter_camada_dados,
        "campos": {nome_do_campo: novo_valor}}.
        """
        if camada_geoespacial_repository.esta_homologada(camada_id):
            raise ValueError("Camada homologada é somente leitura")
        if not edicoes:
            raise ValueError("Nenhuma edição informada")
        from api.services.ciclo_vida_arquivos import exigir_editavel
        exigir_editavel(camada_id)

        gdf = self.obter_camada_dados(camada_id).copy()
        total = len(gdf)
        for edicao in edicoes:
            indice = edicao.get("indice")
            campos = edicao.get("campos") or {}
            if not isinstance(indice, int) or not (0 <= indice < total):
                raise ValueError(
                    f"Índice de linha inválido: {indice!r} (a camada tem {total} feições — "
                    "a tabela pode estar desatualizada; recarregue e tente de novo)"
                )
            for campo, valor in campos.items():
                if campo not in gdf.columns:
                    raise ValueError(f"Campo inexistente na camada: {campo!r}")
                if campo == gdf.geometry.name:
                    raise ValueError("Geometria não é editável nesta versão")
                gdf.iat[indice, gdf.columns.get_loc(campo)] = valor

        gravado_em_arquivo = False
        caminho = self._caminho_arquivo_da_camada(camada_id)
        if caminho is not None:
            self._reescrever_arquivo_do_acervo(caminho, gdf)
            gravado_em_arquivo = True

        metadata = self._metadados[camada_id]
        camada_geoespacial_repository.substituir_vetor(camada_id, gdf, metadata)
        self._camadas[camada_id] = gdf
        return {
            "camada_id": camada_id,
            "linhas_editadas": len(edicoes),
            "gravado_em_arquivo": gravado_em_arquivo,
        }

    @staticmethod
    def _reescrever_arquivo_do_acervo(caminho: Path, gdf: gpd.GeoDataFrame) -> None:
        """Reescreve o arquivo do acervo inteiro com o conteúdo atual do gdf.

        Grava primeiro num arquivo temporário no mesmo diretório e só troca
        pelo definitivo depois de a escrita ter sucesso — se o processo cair
        no meio, o arquivo original permanece intacto em vez de corrompido.

        Limite conhecido: um shapefile é vários arquivos-satélite (.shp/.shx/
        .dbf/.prj/.cpg), e cada `os.replace` é atômico por arquivo, não a
        troca do conjunto inteiro — uma queda bem no meio da troca pode deixar
        satélites de versões diferentes. Um GeoPackage (arquivo único) não tem
        esse risco.
        """
        sufixo = caminho.suffix
        provisorio = caminho.with_name(f".tmp-{uuid4().hex}{sufixo}")

        # Sem `layer=` explícito, o GeoPackage nomeia a camada a partir do
        # nome do arquivo temporário (".tmp-<hex>"), que o GDAL rejeita por
        # ter caracteres inválidos para nome de camada. Preserva o nome que o
        # arquivo original já tinha, para a identidade da camada não mudar.
        layer = None
        if sufixo.lower() == ".gpkg":
            import fiona

            try:
                camadas = fiona.listlayers(caminho)
                layer = camadas[0] if camadas else None
            except Exception:
                layer = None

        gdf.to_file(provisorio, layer=layer) if layer else gdf.to_file(provisorio)
        if sufixo.lower() == ".shp":
            for extensao in (".shp", ".shx", ".dbf", ".prj", ".cpg"):
                origem = provisorio.with_suffix(extensao)
                destino = caminho.with_suffix(extensao)
                if origem.exists():
                    os.replace(origem, destino)
        else:
            os.replace(provisorio, caminho)

    @staticmethod
    def _gdf_para_geojson(gdf: gpd.GeoDataFrame) -> dict[str, Any]:
        """Serializa um GeoDataFrame em GeoJSON pela via nativa do GDAL (pyogrio),
        que trata datas, nulos e demais tipos sem conversão manual."""
        if gdf.crs is not None and not gdf.crs.equals("EPSG:4326"):
            gdf = gdf.to_crs("EPSG:4326")
        buffer = BytesIO()
        gdf.to_file(buffer, driver="GeoJSON")
        return json.loads(buffer.getvalue().decode("utf-8"))

    async def consultar_por_atributo(self, camada_id: str, expressao: str) -> dict[str, Any]:
        """Retorna as feições que atendem a uma expressão atributiva."""
        gdf = self.obter_camada_dados(camada_id).copy()
        try:
            selecionadas = gdf.query(expressao, engine="python")
        except Exception as exc:
            raise ValueError(f"Consulta inválida: {exc}") from exc
        return {"camada_id": camada_id, "total": len(selecionadas), "geojson": self._gdf_para_geojson(selecionadas)}

    async def atualizar_fonte(self, camada_id: str) -> dict[str, Any]:
        """Relê a fonte externa preservando o identificador da camada."""
        if camada_geoespacial_repository.esta_homologada(camada_id):
            raise ValueError("Camada homologada é somente leitura")
        meta = self._metadados.get(camada_id)
        if meta is None:
            raise ValueError(f"Camada não encontrada: {camada_id}")
        self.obter_camada_dados(camada_id)
        origem = meta.get("caminho_arquivo") or meta.get("url_origem")
        if not origem:
            raise ValueError("A camada não possui uma fonte externa atualizável")
        try:
            atualizado = gpd.read_file(origem)
        except Exception as exc:
            raise RuntimeError(f"Falha ao atualizar a fonte: {exc}") from exc
        meta["crs"] = str(atualizado.crs) if atualizado.crs else None
        meta["data_importacao"] = datetime.now(timezone.utc).isoformat()
        meta["metadados"].update(feicoes=len(atualizado), colunas=list(atualizado.columns))
        camada_geoespacial_repository.substituir_vetor(camada_id, atualizado, meta)
        self._camadas[camada_id] = atualizado
        return {"camada_id": camada_id, "feicoes": len(atualizado), "crs": meta["crs"]}

    async def preview_raster(self, raster_id: str) -> dict[str, Any]:
        self.obter_raster_dados(raster_id)
        profile = self._raster_profiles.get(raster_id)
        if not profile or not profile.get("crs") or not profile.get("transform"):
            raise ValueError("Raster sem georreferenciamento para visualização")
        raster = self._rasters[raster_id]
        valid = np.isfinite(raster)
        if not valid.any():
            raise ValueError("Raster não possui células válidas")
        low, high = np.nanpercentile(raster[valid], [2, 98])
        normalized = np.clip((raster - low) / (high - low), 0, 1) if high > low else np.zeros_like(raster)
        rgba = np.zeros((*raster.shape, 4), dtype="uint8")
        rgba[..., 0] = (255 * normalized).astype("uint8")
        rgba[..., 1] = (255 * np.sqrt(normalized)).astype("uint8")
        rgba[..., 2] = (255 * (1 - normalized)).astype("uint8")
        rgba[..., 3] = np.where(valid, 190, 0).astype("uint8")
        stream = BytesIO()
        Image.fromarray(rgba, "RGBA").save(stream, format="PNG")
        bounds = array_bounds(raster.shape[0], raster.shape[1], profile["transform"])
        west, south, east, north = transform_bounds(profile["crs"], "EPSG:4326", *bounds)
        return {
            "raster_id": raster_id,
            "image": "data:image/png;base64," + base64.b64encode(stream.getvalue()).decode("ascii"),
            "coordinates": [[west, north], [east, north], [east, south], [west, south]],
            "min": float(np.nanmin(raster)), "max": float(np.nanmax(raster)),
        }

    async def importar_camada(
        self,
        tipo_entrada: str,
        caminho_arquivo: str,
        crs_origem: str | None = None,
        filtro_espacial: str | None = None,
        filtro_atributivo: str | None = None,
        hash_arquivo: str | None = None,
        progress: Callable[[str], None] | None = None,
    ) -> dict[str, Any]:
        """Importa camada vetorial de uma origem externa para o sistema."""
        try:
            tipo_normalizado = tipo_entrada.strip().lower()
            if progress:
                progress("Tipo de entrada vetorial validado")
            if tipo_normalizado == "local":
                caminho_relativo = project_relative(
                    project_path(caminho_arquivo, label="caminho do arquivo")
                )
                origem_arquivo = project_path(
                    caminho_relativo, label="caminho do arquivo"
                )
                if progress:
                    progress("Caminho relativo da fonte resolvido")
                gdf = gpd.read_file(origem_arquivo)
            elif tipo_normalizado == "wfs":
                caminho_relativo = None
                gdf = gpd.read_file(caminho_arquivo)
            else:
                raise ValueError(f"Tipo de entrada inválido: {tipo_entrada}")
            if progress:
                progress("Fonte vetorial aberta pelo driver geoespacial")

            if crs_origem and gdf.crs is None:
                gdf = gdf.set_crs(crs_origem)
            if progress:
                progress("Sistema de referência espacial conferido")

            if filtro_espacial:
                try:
                    bbox = [float(value.strip()) for value in filtro_espacial.split(",")]
                    if len(bbox) != 4:
                        raise ValueError
                    gdf = gdf.cx[bbox[0]:bbox[2], bbox[1]:bbox[3]]
                except ValueError as exc:
                    raise ValueError("Filtro espacial deve usar minx,miny,maxx,maxy") from exc
                if progress:
                    progress("Filtro espacial aplicado")

            if filtro_atributivo:
                gdf = gdf.query(filtro_atributivo)
                if progress:
                    progress("Filtro atributivo aplicado")

            if progress:
                progress(f"Estrutura vetorial validada: {len(gdf)} feições")

            camada_id = self.registrar_camada(
                gdf,
                Path(caminho_arquivo).stem,
                "WFS" if tipo_normalizado == "wfs" else "arquivo",
                caminho_arquivo=caminho_relativo,
                url_origem=caminho_arquivo if tipo_normalizado == "wfs" else None,
                hash_arquivo=hash_arquivo,
                progress=progress,
            )

            return {
                "camada_id": camada_id,
                "nome": Path(caminho_arquivo).stem,
                "tipo": "vetorial",
                "crs": str(gdf.crs) if gdf.crs else None,
                "feicoes": len(gdf),
                "colunas": list(gdf.columns),
            }
        except Exception as e:
            raise RuntimeError(f"Erro ao importar camada: {e}") from e

    async def importar_raster(
        self, caminho_arquivo: str, hash_arquivo: str | None = None,
        progress: Callable[[str], None] | None = None,
    ) -> dict[str, Any]:
        """Importa um raster externo e o registra no sistema."""
        try:
            caminho_relativo = project_relative(
                project_path(caminho_arquivo, label="caminho do raster")
            )
            if progress:
                progress("Caminho relativo do raster resolvido")
            origem_arquivo = project_path(caminho_relativo, label="caminho do raster")
            with rasterio.open(origem_arquivo) as src:
                if progress:
                    progress("Dataset raster aberto pelo driver GDAL")
                data = src.read(1).astype("float32")
                if progress:
                    progress("Banda raster carregada em memória")
                profile = {"crs": src.crs, "transform": src.transform, "nodata": src.nodata}
            if progress:
                progress("Perfil espacial e valor NoData conferidos")
            raster_id = self.registrar_raster(
                data, profile, Path(caminho_arquivo).stem, "arquivo",
                caminho_arquivo=caminho_relativo,
                hash_arquivo=hash_arquivo,
                progress=progress,
            )
            return {
                "raster_id": raster_id,
                "nome": Path(caminho_arquivo).stem,
                "tipo": "raster",
                "crs": str(profile["crs"]) if profile["crs"] else None,
                "shape": list(data.shape),
                "nodata": profile["nodata"],
            }
        except Exception as exc:
            raise RuntimeError(f"Erro ao importar raster: {exc}") from exc

    async def importar_raster_url(
        self, url: str, nome: str, bbox: list[float] | None = None,
    ) -> dict[str, Any]:
        """Lê um COG remoto, limitado à extensão solicitada, e o registra no catálogo."""
        try:
            with rasterio.open(url) as source:
                if not source.crs:
                    raise ValueError("O asset remoto não informa CRS")
                window = Window(0, 0, source.width, source.height)
                if bbox:
                    source_bounds = transform_bounds("EPSG:4326", source.crs, *bbox, densify_pts=21)
                    requested = from_bounds(*source_bounds, transform=source.transform)
                    window = requested.intersection(Window(0, 0, source.width, source.height)).round_offsets().round_lengths()
                    if window.width <= 0 or window.height <= 0:
                        raise ValueError("A extensão do mapa não intersecta o asset selecionado")
                scale = min(1, 2048 / max(window.width, window.height))
                width, height = max(1, round(window.width * scale)), max(1, round(window.height * scale))
                raster = source.read(
                    1,
                    window=window,
                    out_shape=(height, width),
                    resampling=Resampling.bilinear,
                ).astype("float32")
                transform = source.window_transform(window) * Affine.scale(window.width / width, window.height / height)
                profile = {"crs": source.crs, "transform": transform, "nodata": source.nodata}
            raster_id = self.registrar_raster(
                raster, profile, nome, "STAC", url_origem=url,
            )
            return {
                "raster_id": raster_id,
                "nome": nome,
                "tipo": "raster",
                "crs": str(profile["crs"]),
                "shape": [height, width],
            }
        except Exception as exc:
            raise RuntimeError(f"Erro ao importar raster remoto: {exc}") from exc

    async def carregar_camada(
        self,
        tipo_entrada: str,
        caminho_arquivo: str,
        crs_origem: str | None = None,
        filtro_espacial: str | None = None,
        filtro_atributivo: str | None = None,
    ) -> dict[str, Any]:
        """Compatibilidade: use importar_camada para origens externas."""
        return await self.importar_camada(
            tipo_entrada, caminho_arquivo, crs_origem, filtro_espacial, filtro_atributivo
        )

    async def carregar_raster(self, caminho_arquivo: str) -> dict[str, Any]:
        """Compatibilidade: use importar_raster para origens externas."""
        return await self.importar_raster(caminho_arquivo)

    async def validar_camada(
        self,
        camada_id: str,
        validar_sobreposicoes: bool = False,
        validar_lacunas: bool = False,
        validar_intersecoes_invalidas: bool = True,
        validar_gaps: bool = False,
        validar_dangles: bool = False,
        validar_crs: bool = True,
        validar_tipo_geometrico: bool = True,
        validar_campos_obrigatorios: bool = False,
        tolerancia_topologica: float = 0.001,
        percentual_critico_erros: float = 10.0,
    ) -> dict[str, Any]:
        """Valida topologia e geometria da camada."""
        gdf = self.obter_camada_dados(camada_id).copy()
        erros: list[str] = []
        avisos: list[str] = []

        # Validar CRS
        if validar_crs and gdf.crs is None:
            erros.append("CRS não definido")

        # Validar geometrias inválidas
        if validar_intersecoes_invalidas:
            # Multipartes e polígonos com furos são válidos. Este predicado
            # acusa exclusivamente defeitos topológicos reais da geometria.
            invalid_geoms = (
                (~gdf.geometry.isna())
                & (~gdf.geometry.is_empty)
                & (~gdf.geometry.is_valid)
            )
            if invalid_geoms.any():
                count = invalid_geoms.sum()
                percentual = (count / len(gdf)) * 100
                if percentual > percentual_critico_erros:
                    erros.append(f"{count} geometrias inválidas ({percentual:.1f}%)")
                else:
                    avisos.append(f"{count} geometrias inválidas ({percentual:.1f}%)")

        # Validar geometrias vazias
        empty_geoms = gdf.geometry.is_empty
        if empty_geoms.any():
            count = empty_geoms.sum()
            avisos.append(f"{count} geometrias vazias")

        return {
            "valido": len(erros) == 0,
            "erros": erros,
            "avisos": avisos,
            "total_feicoes": len(gdf),
        }

    async def reparar_geometrias(
        self,
        camada_id: str,
        corrigir_geometrias_invalidas: bool = True,
        corrigir_orientacao_aneis: bool = False,
        corrigir_fechamento_aneis: bool = False,
        corrigir_repeticao_pontos: bool = False,
        corrigir_auto_intersecoes: bool = True,
        corrigir_geometrias_degeneradas: bool = False,
        corrigir_vertices_colineares: bool = False,
        tolerancia_correcao: float = 0.001,
        manter_geometria_original_falha: bool = True,
    ) -> dict[str, Any]:
        """Repara geometrias inválidas e topologia."""
        gdf = self.obter_camada_dados(camada_id).copy()
        correcoes: list[str] = []

        if corrigir_geometrias_invalidas:
            invalid_mask = ~gdf.geometry.is_valid
            if invalid_mask.any():
                gdf.loc[invalid_mask, "geometry"] = gdf.loc[invalid_mask, "geometry"].make_valid()
                correcoes.append(f"Corrigidas {invalid_mask.sum()} geometrias inválidas")

        if corrigir_repeticao_pontos and hasattr(gdf.geometry, "remove_repeated_points"):
            gdf["geometry"] = gdf.geometry.remove_repeated_points(tolerancia_correcao)
            correcoes.append("Pontos repetidos removidos")

        if corrigir_vertices_colineares:
            gdf["geometry"] = gdf.geometry.simplify(tolerancia_correcao, preserve_topology=True)
            correcoes.append("Vértices colineares simplificados")

        nova_camada_id = self.registrar_camada(gdf, f"Geometrias reparadas de {camada_id}", "OP-02-CORR")

        return {"camada_id": nova_camada_id, "correcoes": correcoes, "feicoes_corrigidas": int((~self._camadas[camada_id].geometry.is_valid).sum())}

    async def normalizar_camada(
        self,
        camada_id: str,
        crs_destino: str = "EPSG:4674",
        recortar_area_estudo: bool = False,
        area_estudo: str | None = None,
        corrigir_geometrias_invalidas: bool = True,
        remover_geometrias_vazias: bool = True,
        explodir_multipartes: bool = False,
        padronizar_nomes_campos: bool = False,
        regra_nomenclatura: str = "<fonte_id>__<nome_campo>",
    ) -> dict[str, Any]:
        """Normaliza CRS, recorta e padroniza campos."""
        gdf = self.obter_camada_dados(camada_id).copy()
        operacoes: list[str] = []

        # Reprojetar CRS
        if gdf.crs and str(gdf.crs) != crs_destino:
            gdf = gdf.to_crs(crs_destino)
            operacoes.append(f"Reprojetado para {crs_destino}")

        if corrigir_geometrias_invalidas:
            invalidas = ~gdf.geometry.is_valid
            if invalidas.any():
                gdf.loc[invalidas, "geometry"] = gdf.loc[invalidas, "geometry"].make_valid()
                operacoes.append(f"Corrigidas {int(invalidas.sum())} geometrias")

        if recortar_area_estudo and area_estudo:
            if area_estudo.startswith("camada_"):
                mascara = self.obter_camada_dados(area_estudo)
                if gdf.crs and mascara.crs and gdf.crs != mascara.crs:
                    mascara = mascara.to_crs(gdf.crs)
                gdf = gpd.clip(gdf, mascara)
            else:
                try:
                    bbox = [float(v.strip()) for v in area_estudo.split(",")]
                    if len(bbox) != 4:
                        raise ValueError
                    bbox_clip = (bbox[0], bbox[1], bbox[2], bbox[3])
                    gdf = gdf.clip(bbox_clip)
                except ValueError as exc:
                    raise ValueError("Área de estudo deve ser um ID de camada ou bbox minx,miny,maxx,maxy") from exc
            operacoes.append("Recortada pela área de estudo")

        # Remover geometrias vazias
        if remover_geometrias_vazias:
            antes = len(gdf)
            gdf = gdf[~gdf.geometry.is_empty]
            depois = len(gdf)
            if antes != depois:
                operacoes.append(f"Removidas {antes - depois} geometrias vazias")

        # Explodir multipartes
        if explodir_multipartes:
            gdf = gdf.explode(index_parts=False)
            operacoes.append("Explodidas multipartes")

        if padronizar_nomes_campos:
            import re
            renomear = {
                coluna: re.sub(r"[^a-z0-9_]+", "_", coluna.lower()).strip("_")
                for coluna in gdf.columns if coluna != gdf.geometry.name
            }
            gdf = gdf.rename(columns=renomear)
            operacoes.append("Nomes de campos padronizados")

        nova_camada_id = self.registrar_camada(gdf, f"Camada normalizada de {camada_id}", "OP-03")

        return {
            "camada_id": nova_camada_id,
            "operacoes": operacoes,
            "crs_final": str(gdf.crs) if gdf.crs else None,
            "feicoes_final": len(gdf),
        }

    async def criar_buffer(
        self,
        camada_id: str,
        distancia_buffer: float,
        unidade_buffer: str = "metros",
        tipo_buffer: str = "cheio",
        dissolver_geometrias: bool = False,
        recortar_area_estudo: bool = False,
    ) -> dict[str, Any]:
        """Cria buffer espacial ao redor de geometrias."""
        gdf = self.obter_camada_dados(camada_id).copy()
        crs_original = gdf.crs
        if unidade_buffer == "metros" and gdf.crs and gdf.crs.is_geographic:
            crs_trabalho = gdf.estimate_utm_crs()
            if not crs_trabalho:
                raise ValueError("Não foi possível determinar CRS métrico para o buffer")
            gdf = gdf.to_crs(crs_trabalho)
        gdf_original = gdf.copy()
        gdf["geometry"] = gdf.geometry.buffer(distancia_buffer)

        # Buffer externo (subtrair geometria original)
        if tipo_buffer == "externo":
            gdf["geometry"] = gdf["geometry"].difference(gdf_original["geometry"])

        # Dissolver
        if dissolver_geometrias:
            gdf = gdf.dissolve()
        if crs_original and gdf.crs != crs_original:
            gdf = gdf.to_crs(crs_original)

        nova_camada_id = self.registrar_camada(gdf, f"Buffer de {camada_id}", "OP-04")

        return {
            "camada_id": nova_camada_id,
            "feicoes": len(gdf),
            "distancia": distancia_buffer,
            "tipo": tipo_buffer,
        }

    async def sobrepor_camadas(
        self,
        camada_id_1: str,
        camada_id_2: str,
        tipo_overlay: str = "identity",
        resolver_conflitos_campos: bool = True,
        regra_nomenclatura: str = "<fonte_id>__<nome_campo>",
    ) -> dict[str, Any]:
        """Sobrepõe camadas pelo motor nativo do OGR (Identity/Intersection/Union/Erase).

        Usa ``ogr.Layer.Identity`` e irmãs — a mesma família de operadores que o
        ArcGIS espelha — em vez de ``gpd.overlay``. A diferença que importa é a
        preservação de atributos: o OGR carrega TODOS os campos das duas camadas
        para a saída, prefixados por camada, enquanto o caminho anterior só
        tratava os campos homônimos e deixava o restante à mercê do chamador.
        Foi por aí que ``criterio_id``, ``severidade`` e ``base_legal`` sumiram
        dos produtos consolidados da Fase 1.
        """
        if tipo_overlay not in _OVERLAY_OGR:
            raise ValueError(
                f"Tipo de overlay inválido: {tipo_overlay!r}. Use um de {sorted(_OVERLAY_OGR)}."
            )

        gdf1 = self.obter_camada_dados(camada_id_1)
        gdf2 = self.obter_camada_dados(camada_id_2)
        if gdf1.crs and gdf2.crs and gdf1.crs != gdf2.crs:
            gdf2 = gdf2.to_crs(gdf1.crs)

        # Só a camada que ENTRA é prefixada. Prefixar também a de base quebraria
        # o encadeamento: num consolidador a base é a saída da volta anterior, e
        # seus campos ganhariam um prefixo novo a cada rodada — na sétima volta
        # cada nome carregaria sete prefixos empilhados. Prefixar um dos lados já
        # basta para desambiguar campos homônimos.
        prefixo_2 = None
        if resolver_conflitos_campos:
            prefixo_2 = _prefixo_overlay(
                regra_nomenclatura, self._nome_para_prefixo(camada_id_2)
            )

        resultado = _overlay_ogr(
            gdf1, gdf2, tipo_overlay, prefixo_1=None, prefixo_2=prefixo_2
        )

        nova_camada_id = self.registrar_camada(resultado, f"Overlay {tipo_overlay}", "OP-05")

        return {
            "camada_id": nova_camada_id,
            "feicoes": len(resultado),
            "tipo_overlay": tipo_overlay,
            "motor": "ogr",
            "atributos": [c for c in resultado.columns if c != "geometry"],
        }

    def _nome_para_prefixo(self, camada_id: str) -> str:
        """Rótulo curto da camada para prefixar seus campos na saída do overlay."""
        nome = str(self._metadados.get(camada_id, {}).get("nome") or camada_id)
        limpo = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode("ascii")
        limpo = re.sub(r"[^A-Za-z0-9]+", "_", limpo).strip("_").lower()
        return limpo or str(camada_id)

    async def classificar_por_feicao_fase1(
        self,
        camada_id: str,
        criterio_id: str,
        fonte_id: str | None = None,
    ) -> dict[str, Any]:
        """Classifica feições pela configuração JSON versionada da Fase 1."""
        from api.services.fase1_classificacao import classificar

        gdf, versao_classificacao = classificar(
            self.obter_camada_dados(camada_id), criterio_id
        )
        gdf["criterio_id"] = criterio_id
        gdf["fonte_id"] = fonte_id or criterio_id
        gdf["feicao_origem_id"] = [f"{camada_id}#{i}" for i in range(len(gdf))]

        nova = self.registrar_camada(
            gdf, f"Classificada · {criterio_id}", "OP-CLASS"
        )
        contagem = gdf["tipo_tratamento"].value_counts().to_dict()
        return {
            "camada_id": nova,
            "criterio_id": criterio_id,
            "feicoes": len(gdf),
            "por_tipo": {str(k): int(v) for k, v in contagem.items()},
            "versao_classificacao": versao_classificacao,
        }

    async def exportar_camada(
        self,
        camada_id: str,
        nome_arquivo: str,
        formato_saida: str = "GeoPackage",
        crs_saida: str | None = None,
        opcao_salvamento: str = "memoria",
        progress: Callable[[str], None] | None = None,
    ) -> dict[str, Any]:
        """Exporta camada vetorial."""
        gdf = self.obter_camada_dados(camada_id)
        if progress:
            progress("Feições vetoriais carregadas para exportação")

        if crs_saida and gdf.crs:
            gdf = gdf.to_crs(crs_saida)
        if progress:
            progress("Sistema de referência da saída conferido")

        driver_map = {
            "GeoPackage": "GPKG",
            "GeoJSON": "GeoJSON",
            "Shapefile": "ESRI Shapefile",
        }

        driver = driver_map.get(formato_saida, "GPKG")
        if progress:
            progress(f"Driver de exportação selecionado: {driver}")

        if opcao_salvamento == "persistir_sistema":
            from api.services.ciclo_vida_arquivos import caminho_exportacao, registrar_exportacao
            caminho_completo = caminho_exportacao(nome_arquivo, "vetor")
            caminho_relativo = Path(project_relative(caminho_completo))
            if progress:
                progress("Destino único de saída preparado (vetor)")
            gdf.to_file(caminho_completo, driver=driver)
            if progress:
                progress("Arquivo vetorial serializado")
            record = registrar_exportacao(caminho_completo, camada_id, "vetor")
            return {"caminho": caminho_relativo.as_posix(), "formato": formato_saida, **record}
        else:
            # Retornar GeoJSON para memória (serialização nativa do GDAL)
            geojson = self._gdf_para_geojson(gdf)
            if progress:
                progress("GeoJSON vetorial serializado em memória")
            return {"geojson": geojson, "formato": "GeoJSON"}

    async def normalizar_raster(
        self,
        raster_id: str,
        metodo_normalizacao: str = "linear",
        valor_minimo: float | None = None,
        valor_maximo: float | None = None,
    ) -> dict[str, Any]:
        """Normaliza raster para escala 0-1."""
        raster = self.obter_raster_dados(raster_id).copy()

        valid = np.isfinite(raster)
        values = raster[valid]
        if values.size == 0:
            raise ValueError("Raster não possui células válidas")

        if metodo_normalizacao == "linear":
            min_val = valor_minimo if valor_minimo is not None else values.min()
            max_val = valor_maximo if valor_maximo is not None else values.max()
            if max_val > min_val:
                raster_norm = (raster - min_val) / (max_val - min_val)
            else:
                raster_norm = np.zeros_like(raster)
        elif metodo_normalizacao == "winsorizacao":
            min_val, max_val = np.nanpercentile(values, [2, 98])
            clipped = np.clip(raster, min_val, max_val)
            raster_norm = (clipped - min_val) / (max_val - min_val) if max_val > min_val else np.zeros_like(raster)
        elif metodo_normalizacao == "quebras_naturais":
            min_val, max_val = values.min(), values.max()
            cuts = np.unique(np.nanquantile(values, np.linspace(0, 1, 6)))
            raster_norm = np.digitize(raster, cuts[1:-1]).astype(float) / max(1, len(cuts) - 2)
            raster_norm[~valid] = np.nan
        else:
            raise ValueError(f"Método de normalização inválido: {metodo_normalizacao}")

        novo_raster_id = self.registrar_raster(
            raster_norm, self._raster_profiles[raster_id],
            f"Raster normalizado de {raster_id}", "OP-20",
        )

        return {
            "raster_id": novo_raster_id,
            "metodo": metodo_normalizacao,
            "min_original": float(min_val),
            "max_original": float(max_val),
        }

    async def combinar_rasters(
        self,
        raster_ids: list[str],
        pesos: list[float] | None = None,
        operador: str = "media_ponderada",
    ) -> dict[str, Any]:
        """Combina rasters por álgebra de mapas."""
        rasters = []
        for rid in raster_ids:
            rasters.append(self.obter_raster_dados(rid))

        if not rasters:
            raise ValueError("Nenhum raster fornecido")

        # Garantir mesmo shape
        shapes = [r.shape for r in rasters]
        if len(set(shapes)) > 1:
            raise ValueError("Rasters com shapes diferentes")

        if operador == "media_ponderada":
            if pesos is None:
                pesos = [1.0 / len(rasters)] * len(rasters)
            if len(pesos) != len(rasters):
                raise ValueError("Informe um peso para cada raster")
            soma_pesos = float(sum(pesos))
            if soma_pesos <= 0:
                raise ValueError("A soma dos pesos deve ser maior que zero")
            pesos = [float(peso) / soma_pesos for peso in pesos]
            resultado = np.zeros_like(rasters[0])
            for r, p in zip(rasters, pesos):
                resultado += r * p
        elif operador == "soma":
            resultado = np.sum(rasters, axis=0)
        elif operador == "multiplicacao":
            resultado = np.prod(rasters, axis=0)
        else:
            raise NotImplementedError(f"Operador {operador} não implementado")

        novo_raster_id = self.registrar_raster(
            resultado, self._raster_profiles[raster_ids[0]],
            "Combinação de rasters", "OP-17", operador=operador,
        )

        return {
            "raster_id": novo_raster_id,
            "operador": operador,
            "shape": resultado.shape,
        }

    async def dissolver(
        self,
        camada_id: str,
        campo_agrupamento: str | None = None,
        funcao_agregacao: str = "soma",
        manter_geometria_multi: bool = False,
    ) -> dict[str, Any]:
        """Dissolve geometrias baseado em atributos."""
        gdf = self.obter_camada_dados(camada_id).copy()

        agregacoes = {"soma": "sum", "media": "mean", "mediana": "median", "max": "max", "min": "min"}
        aggfunc = agregacoes.get(funcao_agregacao, funcao_agregacao)
        if campo_agrupamento:
            if campo_agrupamento not in gdf.columns:
                raise ValueError(f"Campo {campo_agrupamento} não encontrado")
            numericas = [c for c in gdf.select_dtypes(include=np.number).columns if c != campo_agrupamento]
            outras = [c for c in gdf.columns if c not in {*numericas, campo_agrupamento, gdf.geometry.name}]
            regras = {**{c: aggfunc for c in numericas}, **{c: "first" for c in outras}}
            gdf = gdf.dissolve(by=campo_agrupamento, aggfunc=regras or "first", as_index=not manter_geometria_multi)
        else:
            gdf = gdf.dissolve()

        nova_camada_id = self.registrar_camada(gdf, f"Dissolução de {camada_id}", "OP-06")

        return {
            "camada_id": nova_camada_id,
            "feicoes": len(gdf),
            "campo_agrupamento": campo_agrupamento,
        }

    async def selecionar_por_localizacao(
        self,
        camada_id: str,
        camada_ref_id: str,
        tipo_selecao: str = "intersects",
        inverter_selecao: bool = False,
    ) -> dict[str, Any]:
        """Seleciona feições por localização espacial."""
        gdf = self.obter_camada_dados(camada_id).copy()
        gdf_ref = self.obter_camada_dados(camada_ref_id)
        if gdf.crs and gdf_ref.crs and gdf.crs != gdf_ref.crs:
            gdf_ref = gdf_ref.to_crs(gdf.crs)

        # Spatial join
        resultado = gpd.sjoin(gdf, gdf_ref, how="inner", predicate=tipo_selecao)

        if inverter_selecao:
            # Selecionar feições que NÃO intersectam
            resultado = gdf[~gdf.index.isin(resultado.index)]

        resultado = resultado.drop(columns=["index_right"], errors="ignore")
        nova_camada_id = self.registrar_camada(resultado, f"Seleção espacial de {camada_id}", "OP-07")

        return {
            "camada_id": nova_camada_id,
            "feicoes": len(resultado),
            "tipo_selecao": tipo_selecao,
        }

    async def agregar_por_territorio(
        self,
        camada_id: str,
        campo_unidade: str,
        funcao_agregacao: str = "soma",
        atributo_agregacao: str | None = None,
        resolucao_saida: float | None = None,
    ) -> dict[str, Any]:
        """Agrega valores por unidade territorial."""
        gdf = self.obter_camada_dados(camada_id).copy()

        if campo_unidade not in gdf.columns:
            raise ValueError(f"Campo territorial {campo_unidade} não encontrado")
        agregacoes = {"soma": "sum", "media": "mean", "mediana": "median", "max": "max", "min": "min"}
        aggfunc = agregacoes.get(funcao_agregacao, funcao_agregacao)
        if atributo_agregacao:
            if atributo_agregacao not in gdf.columns:
                raise ValueError(f"Atributo {atributo_agregacao} não encontrado")
            resultado = gdf[[campo_unidade, atributo_agregacao, gdf.geometry.name]].dissolve(
                by=campo_unidade, aggfunc={atributo_agregacao: aggfunc}, as_index=False
            )
        else:
            gdf = gdf.assign(quantidade=1)
            resultado = gdf[[campo_unidade, "quantidade", gdf.geometry.name]].dissolve(
                by=campo_unidade, aggfunc={"quantidade": "sum"}, as_index=False
            )

        nova_camada_id = self.registrar_camada(
            resultado, f"Agregação por {campo_unidade}", "OP-15",
            operacao="agregar_por_territorio",
        )

        return {
            "camada_id": nova_camada_id,
            "campo_unidade": campo_unidade,
            "funcao": funcao_agregacao,
        }

    async def exportar_raster(
        self,
        raster_id: str,
        nome_arquivo: str,
        formato_saida: str = "GeoTIFF",
        comprimir_arquivo: bool = False,
        opcao_salvamento: str = "memoria",
        progress: Callable[[str], None] | None = None,
    ) -> dict[str, Any]:
        """Exporta raster."""
        raster = self.obter_raster_dados(raster_id)
        if progress:
            progress("Matriz raster carregada para exportação")

        if opcao_salvamento == "persistir_sistema":
            from api.services.ciclo_vida_arquivos import caminho_exportacao, registrar_exportacao
            caminho_completo = caminho_exportacao(nome_arquivo, "raster")
            caminho_relativo = Path(project_relative(caminho_completo))
            if progress:
                progress("Destino único de saída preparado (raster)")
            profile = getattr(self, "_raster_profiles", {}).get(raster_id)
            if not profile:
                raise ValueError("Raster sem metadados espaciais para exportação")
            if progress:
                progress("Perfil espacial raster validado")
            with rasterio.open(caminho_completo, "w", driver="GTiff", count=1,
                               height=raster.shape[0], width=raster.shape[1], dtype="float32",
                               crs=profile["crs"], transform=profile["transform"],
                               nodata=np.nan, compress="deflate" if comprimir_arquivo else None) as dst:
                dst.write(raster.astype("float32"), 1)
            if progress:
                progress("GeoTIFF raster serializado")
            record = registrar_exportacao(caminho_completo, raster_id, "raster")
            return {"caminho": caminho_relativo.as_posix(), "formato": formato_saida, **record}
        else:
            # Retornar array como JSON
            if progress:
                progress("Matriz raster serializada em memória")
            return {
                "raster_data": raster.tolist(),
                "shape": raster.shape,
                "formato": "array",
            }

    async def salvar_camada(
        self,
        entrada: str,
        destino: str,
        saida: str,
        crs: str = "auto",
        formato: str = "auto",
    ) -> dict[str, Any]:
        """Persiste camada ou raster, inferindo o formato pela extensão da saída.

        Independente do valor recebido em ``destino``, a gravação ocorre sempre
        em ``data/geoespacial/outputs`` — destino único de saídas geoprocessadas.
        A categoria do dado (``vetor`` ou ``raster``) é determinada pela natureza
        do recurso em memória e validada contra a extensão do arquivo ANTES de
        qualquer I/O; ela qualifica o dado, mas não cria subpasta.
        """
        self._catalogar_persistidas()
        del destino

        tipo_entrada = self._metadados.get(entrada, {}).get("tipo")
        if tipo_entrada == "vetorial" or entrada in self._camadas:
            categoria_dado = "vetor"
        elif tipo_entrada == "raster" or entrada in self._rasters:
            categoria_dado = "raster"
        else:
            raise ValueError(f"Camada de entrada {entrada} não encontrada")

        from api.services.ciclo_vida_arquivos import caminho_exportacao, registrar_exportacao
        caminho = caminho_exportacao(saida, categoria_dado)
        pasta = caminho.parent
        pasta_relativa = project_relative(pasta)
        extensao = caminho.suffix.lower()

        if categoria_dado == "vetor":
            drivers = {"gpkg": "GPKG", "geojson": "GeoJSON", "json": "GeoJSON", "shapefile": "ESRI Shapefile", "shp": "ESRI Shapefile"}
            formato_final = extensao.lstrip(".") if formato == "auto" else formato.lower()
            driver = drivers.get(formato_final)
            if not driver:
                raise ValueError("Formato vetorial deve ser gpkg, geojson, json, shapefile ou shp")
            camada = self.obter_camada_dados(entrada)
            crs_final = str(camada.crs) if crs == "auto" else crs
            if crs != "auto":
                camada = camada.to_crs(crs)
            camada.to_file(caminho, driver=driver)
            tipo = "vetor"
        else:
            formato_final = extensao.lstrip(".") if formato == "auto" else formato.lower()
            if formato_final not in {"tif", "tiff", "geotiff"}:
                raise ValueError("Formato raster deve ser tif, tiff ou geotiff")
            profile = getattr(self, "_raster_profiles", {}).get(entrada)
            if not profile:
                raise ValueError("Raster sem metadados espaciais para salvamento")
            raster = self.obter_raster_dados(entrada)
            transform = profile["transform"]
            crs_origem = profile["crs"]
            crs_final = str(crs_origem) if crs == "auto" else crs
            if crs != "auto" and str(crs_origem) != crs:
                bounds = array_bounds(raster.shape[0], raster.shape[1], transform)
                novo_transform, largura, altura = calculate_default_transform(
                    crs_origem, crs, raster.shape[1], raster.shape[0], *bounds
                )
                if largura is None or altura is None:
                    raise ValueError("Não foi possível calcular as dimensões do raster reprojetado")
                reprojetado = np.empty((altura, largura), dtype="float32")
                reproject(raster, reprojetado, src_transform=transform, src_crs=crs_origem,
                          dst_transform=novo_transform, dst_crs=crs,
                          resampling=Resampling.nearest, dst_nodata=np.nan)
                raster, transform = reprojetado, novo_transform
            with rasterio.open(caminho, "w", driver="GTiff", count=1,
                               height=raster.shape[0], width=raster.shape[1], dtype="float32",
                               crs=crs_final, transform=transform,
                               nodata=np.nan, compress="deflate") as dst:
                dst.write(raster.astype("float32"), 1)
            tipo = "raster"

        record = registrar_exportacao(caminho, entrada, tipo)
        return {**record, "operacao": "salvar_camada", "entrada": entrada, "destino": pasta_relativa,
                "saida": caminho.name, "caminho": project_relative(caminho), "tipo": tipo,
                "categoria": categoria_dado,
                "crs": crs_final, "formato": formato_final}


geoespacial_service = GeoespacialService()
