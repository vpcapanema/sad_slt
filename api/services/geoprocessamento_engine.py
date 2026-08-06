"""Registro e orquestrador dos algoritmos geoespaciais da stack."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Literal, cast
from uuid import uuid4

import geopandas as gpd
import numpy as np
import pandas as pd
from rasterio.features import geometry_mask, rasterize
from rasterio.transform import Affine, from_origin, rowcol
from scipy.interpolate import griddata
from scipy.ndimage import distance_transform_edt
from scipy.ndimage import (
    gaussian_filter,
    maximum_filter,
    minimum_filter,
    uniform_filter,
)
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from sklearn.neighbors import KernelDensity
from pykrige.ok import OrdinaryKriging

from api.services.geoespacial_service import geoespacial_service as geo


CATALOG = {
    "OP-01": "Importar Camada",
    "OP-02": "Validar Camada",
    "OP-02-CORR": "Reparar Geometrias",
    "OP-03": "Normalizar Camada",
    "OP-04": "Criar Buffer",
    "OP-05": "Sobrepor Camadas",
    "OP-05-IDENT": "Identity",
    "OP-06": "Dissolver",
    "OP-07": "Selecionar por Localização",
    "OP-08": "Converter para Raster",
    "OP-10": "Calcular Distância",
    "OP-11": "Distância Ponderada",
    "OP-12": "Calcular Densidade",
    "OP-13": "Custo Acumulado",
    "OP-14": "Interpolar Valores",
    "OP-15": "Agregar por Território",
    "OP-16": "Criar Camada Booleana",
    "OP-17": "Combinar Rasters",
    "OP-20": "Normalizar Raster",
    "OP-21": "Recortar Raster",
    "OP-22": "Estatísticas por Zona",
    "OP-23": "Amostrar Raster em Pontos",
    "OP-24": "Extrair Valores em Polígono",
    "OP-25": "Exportar Camada",
    "OP-26": "Exportar Raster",
    "OP-27": "Salvar Camada",
    "OP-28": "Calcular Centroides",
    "OP-29": "Criar Fecho Convexo",
    "OP-30": "Criar Envelopes",
    "OP-31": "Simplificar Geometrias",
    "OP-32": "Explodir Multipartes",
    "OP-33": "Recortar Camada Vetorial",
    "OP-34": "Junção Espacial",
    "OP-35": "Mesclar Camadas",
    "OP-36": "Reprojetar Camada",
    "OP-37": "Calcular Área",
    "OP-38": "Calcular Comprimento",
    "OP-39": "Reclassificar Raster",
    "OP-40": "Aplicar Limiar Raster",
    "OP-41": "Inverter Raster",
    "OP-42": "Filtro Focal Raster",
    "OP-43": "Suavização Gaussiana",
    "OP-CLASS": "Classificar por Feição (Fase 1)",
}

TOOL_FAMILIES = {
    "OP-01": "Entrada e preparação",
    "OP-02": "Entrada e preparação",
    "OP-02-CORR": "Entrada e preparação",
    "OP-03": "Entrada e preparação",
    "OP-04": "Análise vetorial",
    "OP-05": "Análise vetorial",
    "OP-05-IDENT": "Análise vetorial",
    "OP-06": "Análise vetorial",
    "OP-07": "Análise vetorial",
    "OP-08": "Transformação",
    "OP-10": "Análise raster",
    "OP-11": "Análise raster",
    "OP-12": "Análise raster",
    "OP-13": "Análise raster",
    "OP-14": "Análise raster",
    "OP-15": "Análise raster",
    "OP-16": "Análise raster",
    "OP-17": "Análise raster",
    "OP-20": "Análise raster",
    "OP-21": "Análise raster",
    "OP-22": "Análise raster",
    "OP-23": "Operações mistas",
    "OP-24": "Operações mistas",
    "OP-25": "Exportação",
    "OP-26": "Exportação",
    "OP-27": "Exportação",
    "OP-28": "Geometria vetorial",
    "OP-29": "Geometria vetorial",
    "OP-30": "Geometria vetorial",
    "OP-31": "Geometria vetorial",
    "OP-32": "Geometria vetorial",
    "OP-33": "Sobreposição vetorial",
    "OP-34": "Relacionamento espacial",
    "OP-35": "Gerenciamento vetorial",
    "OP-36": "Sistemas de coordenadas",
    "OP-37": "Medições vetoriais",
    "OP-38": "Medições vetoriais",
    "OP-39": "Álgebra raster",
    "OP-40": "Álgebra raster",
    "OP-41": "Álgebra raster",
    "OP-42": "Filtros raster",
    "OP-43": "Filtros raster",
    "OP-CLASS": "Classificação Fase 1",
}

# As chaves continuam específicas para os executores. A interface apresenta
# todas estas referências como "Camada", selecionada no Painel de Conteúdo.
TOOL_INPUTS = {
    "OP-01": [],
    "OP-02": ["camada_id"],
    "OP-02-CORR": ["camada_id"],
    "OP-03": ["camada_id"],
    "OP-04": ["camada_id"],
    "OP-05": ["camada_id_1", "camada_id_2"],
    "OP-05-IDENT": ["camada_id_1", "camada_id_2"],
    "OP-06": ["camada_id"],
    "OP-07": ["camada_id", "camada_ref_id"],
    "OP-08": ["camada_id"],
    "OP-10": ["camada_id"],
    "OP-11": ["camada_id"],
    "OP-12": ["camada_id"],
    "OP-13": ["raster_id"],
    "OP-14": ["camada_id"],
    "OP-15": ["camada_id"],
    "OP-16": ["camada_id"],
    "OP-17": ["raster_ids"],
    "OP-20": ["raster_id"],
    "OP-21": ["raster_id", "camada_mascara_id"],
    "OP-22": ["raster_id", "camada_zona_id"],
    "OP-23": ["raster_id", "camada_pontos_id"],
    "OP-24": ["raster_id", "camada_poligono_id"],
    "OP-25": ["camada_id"],
    "OP-26": ["raster_id"],
    "OP-27": ["entrada"],
    "OP-28": ["camada_id"],
    "OP-29": ["camada_id"],
    "OP-30": ["camada_id"],
    "OP-31": ["camada_id"],
    "OP-32": ["camada_id"],
    "OP-33": ["camada_id", "camada_mascara_id"],
    "OP-34": ["camada_id", "camada_ref_id"],
    "OP-35": ["camada_ids"],
    "OP-36": ["camada_id"],
    "OP-37": ["camada_id"],
    "OP-38": ["camada_id"],
    "OP-39": ["raster_id"],
    "OP-40": ["raster_id"],
    "OP-41": ["raster_id"],
    "OP-42": ["raster_id"],
    "OP-43": ["raster_id"],
    "OP-CLASS": ["camada_id"],
}

STANDARD_OUTPUT_FIELDS = [
    {"id": "nome_saida", "nome": "Nome da saída", "tipo": "texto", "obrigatorio": True},
    {
        "id": "crs_saida",
        "nome": "CRS",
        "tipo": "crs",
        "obrigatorio": True,
        "padrao": "entrada",
        "opcoes": [
            "entrada",
            "EPSG:4674",
            "EPSG:4326",
            "EPSG:3857",
            "EPSG:31982",
            "EPSG:31983",
            "EPSG:31984",
            "EPSG:5880",
        ],
    },
    {"id": "destino", "nome": "Destino", "tipo": "destino", "obrigatorio": True},
    {"id": "formato_saida", "nome": "Formato", "tipo": "formato", "obrigatorio": True},
]

OPERATION_ENDPOINTS = {
    "OP-01": "importar-camada",
    "OP-02": "validar-camada",
    "OP-02-CORR": "reparar-geometrias",
    "OP-03": "normalizar-camada",
    "OP-04": "criar-buffer",
    "OP-05": "sobrepor-camadas",
    "OP-05-IDENT": "sobrepor-camadas",
    "OP-06": "dissolver",
    "OP-07": "selecionar-por-localizacao",
    "OP-08": "converter-para-raster",
    "OP-10": "calcular-distancia",
    "OP-11": "calcular-distancia-ponderada",
    "OP-12": "calcular-densidade",
    "OP-13": "calcular-custo-acumulado",
    "OP-14": "interpolar-valores",
    "OP-15": "agregar-por-territorio",
    "OP-16": "criar-camada-booleana",
    "OP-17": "combinar-rasters",
    "OP-20": "normalizar-raster",
    "OP-21": "recortar-raster",
    "OP-22": "estatisticas-por-zona",
    "OP-23": "amostrar-raster-pontos",
    "OP-24": "extrair-valores-poligono",
    "OP-25": "exportar-camada",
    "OP-26": "exportar-raster",
    "OP-27": "salvar-camada",
    "OP-28": "calcular-centroides",
    "OP-29": "criar-fecho-convexo",
    "OP-30": "criar-envelopes",
    "OP-31": "simplificar-geometrias",
    "OP-32": "explodir-multipartes",
    "OP-33": "recortar-camada-vetorial",
    "OP-34": "juncao-espacial",
    "OP-35": "mesclar-camadas",
    "OP-36": "reprojetar-camada",
    "OP-37": "calcular-area",
    "OP-38": "calcular-comprimento",
    "OP-39": "reclassificar-raster",
    "OP-40": "aplicar-limiar-raster",
    "OP-41": "inverter-raster",
    "OP-42": "filtro-focal-raster",
    "OP-43": "suavizacao-gaussiana",
    "OP-CLASS": "classificar-por-feicao-fase1",
}

REQUIRED_PARAMETERS = {
    "OP-01": {"tipo_entrada", "caminho_arquivo"},
    "OP-02": {"camada_id"},
    "OP-02-CORR": {"camada_id"},
    "OP-03": {"camada_id"},
    "OP-04": {"camada_id", "distancia_buffer"},
    "OP-05": {"camada_id_1", "camada_id_2"},
    "OP-06": {"camada_id"},
    "OP-07": {"camada_id", "camada_ref_id"},
    "OP-08": {"camada_id"},
    "OP-10": {"camada_id"},
    "OP-11": {"camada_id", "atributo_peso"},
    "OP-12": {"camada_id"},
    "OP-13": {"raster_id"},
    "OP-14": {"camada_id"},
    "OP-15": {"camada_id", "campo_unidade"},
    "OP-16": {"camada_id"},
    "OP-17": {"raster_ids"},
    "OP-20": {"raster_id"},
    "OP-21": {"raster_id", "camada_mascara_id"},
    "OP-22": {"raster_id", "camada_zona_id"},
    "OP-23": {"raster_id", "camada_pontos_id"},
    "OP-24": {"raster_id", "camada_poligono_id"},
    "OP-25": {"camada_id", "nome_saida", "crs_saida", "destino", "formato_saida"},
    "OP-26": {"raster_id", "nome_saida", "crs_saida", "destino", "formato_saida"},
    "OP-27": {"entrada", "nome_saida", "crs_saida", "destino", "formato_saida"},
    "OP-28": {"camada_id"},
    "OP-29": {"camada_id"},
    "OP-30": {"camada_id"},
    "OP-31": {"camada_id", "tolerancia"},
    "OP-32": {"camada_id"},
    "OP-33": {"camada_id", "camada_mascara_id"},
    "OP-34": {"camada_id", "camada_ref_id"},
    "OP-35": {"camada_ids"},
    "OP-36": {"camada_id", "crs_destino"},
    "OP-37": {"camada_id"},
    "OP-38": {"camada_id"},
    "OP-39": {"raster_id", "classes"},
    "OP-40": {"raster_id", "limiar"},
    "OP-41": {"raster_id"},
    "OP-42": {"raster_id"},
    "OP-43": {"raster_id"},
    "OP-CLASS": {"camada_id", "criterio_id"},
}


class GeoprocessamentoEngine:
    def __init__(self) -> None:
        self.profiles: dict[str, dict[str, Any]] = {}
        self.functions: dict[str, dict[str, Any]] = {}
        self.flows: dict[str, dict[str, Any]] = {}
        self._definitions_path = Path("data/geoespacial/definicoes.json")
        self._load_definitions()

    def _load_definitions(self) -> None:
        if not self._definitions_path.exists():
            return
        try:
            payload = json.loads(self._definitions_path.read_text(encoding="utf-8"))
            self.functions = {item["id"]: item for item in payload.get("funcoes", [])}
            self.flows = {item["id"]: item for item in payload.get("fluxos", [])}
        except (OSError, ValueError, KeyError):
            self.functions = {}
            self.flows = {}

    def save_definitions(self) -> None:
        self._definitions_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "funcoes": list(self.functions.values()),
            "fluxos": list(self.flows.values()),
        }
        self._definitions_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def _layer(self, layer_id: str) -> gpd.GeoDataFrame:
        return geo.obter_camada_dados(layer_id)

    def _raster(self, raster_id: str) -> np.ndarray:
        raster = geo.obter_raster_dados(raster_id)
        self.profiles[raster_id] = geo._raster_profiles[raster_id]
        return raster

    def _new_raster(self, data: np.ndarray, profile: dict[str, Any]) -> str:
        rid = geo.registrar_raster(
            data, profile, f"Resultado raster {len(geo._rasters) + 1}"
        )
        self.profiles[rid] = profile
        return rid

    def _grid(
        self, gdf: gpd.GeoDataFrame, resolution: float
    ) -> tuple[Affine, int, int]:
        minx, miny, maxx, maxy = gdf.total_bounds
        width = max(1, int(np.ceil((maxx - minx) / resolution)))
        height = max(1, int(np.ceil((maxy - miny) / resolution)))
        if width * height > 25_000_000:
            raise ValueError("Grade excede 25 milhões de células; aumente a resolução")
        transform = from_origin(minx, maxy, resolution, resolution)
        return transform, width, height

    async def execute(
        self,
        op_id: str,
        p: dict[str, Any],
        progress: Callable[[str], None] | None = None,
    ) -> dict[str, Any]:
        p = self._apply_selection_scope(op_id, p)
        dispatch = {
            "OP-01": lambda: geo.importar_camada(
                p["tipo_entrada"],
                p["caminho_arquivo"],
                p.get("crs_origem"),
                p.get("filtro_espacial"),
                p.get("filtro_atributivo"),
                progress=progress,
            ),
            "OP-02": lambda: geo.validar_camada(
                p["camada_id"], **{k: v for k, v in p.items() if k != "camada_id"}
            ),
            "OP-02-CORR": lambda: geo.reparar_geometrias(
                p["camada_id"], **{k: v for k, v in p.items() if k != "camada_id"}
            ),
            "OP-03": lambda: geo.normalizar_camada(
                p["camada_id"], **{k: v for k, v in p.items() if k != "camada_id"}
            ),
            "OP-04": lambda: geo.criar_buffer(
                p["camada_id"],
                p["distancia_buffer"],
                p.get("unidade_buffer", "metros"),
                p.get("tipo_buffer", "cheio"),
                p.get("dissolver_geometrias", False),
                p.get("recortar_area_estudo", False),
            ),
            "OP-05": lambda: geo.sobrepor_camadas(
                p["camada_id_1"],
                p["camada_id_2"],
                p.get("tipo_overlay", "identity"),
                p.get("resolver_conflitos_campos", True),
                p.get("regra_nomenclatura", "<fonte_id>__<nome_campo>"),
            ),
            "OP-05-IDENT": lambda: geo.sobrepor_camadas(
                p["camada_id_1"],
                p["camada_id_2"],
                "identity",
                p.get("resolver_conflitos_campos", True),
                p.get("regra_nomenclatura", "<fonte_id>__<nome_campo>"),
            ),
            "OP-06": lambda: geo.dissolver(
                p["camada_id"],
                p.get("campo_agrupamento"),
                p.get("funcao_agregacao", "soma"),
                p.get("manter_geometria_multi", False),
            ),
            "OP-07": lambda: geo.selecionar_por_localizacao(
                p["camada_id"],
                p["camada_ref_id"],
                p.get("tipo_selecao", "intersects"),
                p.get("inverter_selecao", False),
            ),
            "OP-15": lambda: geo.agregar_por_territorio(
                p["camada_id"],
                p["campo_unidade"],
                p.get("funcao_agregacao", "soma"),
                p.get("atributo_agregacao"),
                p.get("resolucao_saida"),
            ),
            "OP-17": lambda: geo.combinar_rasters(
                p["raster_ids"], p.get("pesos"), p.get("operador", "media_ponderada")
            ),
            "OP-20": lambda: geo.normalizar_raster(
                p["raster_id"],
                p.get("metodo_normalizacao", "linear"),
                p.get("valor_minimo"),
                p.get("valor_maximo"),
            ),
            "OP-25": lambda: self.export_vector(p, progress),
            "OP-26": lambda: self.export_raster(p, progress),
            "OP-27": lambda: self.save_layer(p),
            "OP-CLASS": lambda: geo.classificar_por_feicao_fase1(
                p["camada_id"],
                p["criterio_id"],
                p.get("fonte_id"),
            ),
        }
        custom = {
            "OP-08": self.rasterize,
            "OP-10": self.distance,
            "OP-11": self.weighted_distance,
            "OP-12": self.density,
            "OP-13": self.accumulated_cost,
            "OP-14": self.interpolate,
            "OP-16": self.boolean,
            "OP-21": self.clip,
            "OP-22": self.zonal,
            "OP-23": self.sample,
            "OP-24": self.extract_polygon,
            "OP-28": self.centroids,
            "OP-29": self.convex_hulls,
            "OP-30": self.envelopes,
            "OP-31": self.simplify,
            "OP-32": self.explode,
            "OP-33": self.vector_clip,
            "OP-34": self.spatial_join,
            "OP-35": self.merge_layers,
            "OP-36": self.reproject_layer,
            "OP-37": self.calculate_area,
            "OP-38": self.calculate_length,
            "OP-39": self.reclassify_raster,
            "OP-40": self.threshold_raster,
            "OP-41": self.invert_raster,
            "OP-42": self.focal_filter,
            "OP-43": self.gaussian_smoothing,
        }
        if op_id in dispatch:
            result = await dispatch[op_id]()
            if op_id in {"OP-02-CORR", "OP-03"}:
                result.setdefault("camada_id", p["camada_id"])
            rid = result.get("raster_id") if isinstance(result, dict) else None
            if rid and rid not in self.profiles:
                if rid in geo._raster_profiles:
                    self.profiles[rid] = geo._raster_profiles[rid]
                source = p.get("raster_id") or ((p.get("raster_ids") or [None])[0])
                if rid not in self.profiles and source in self.profiles:
                    self.profiles[rid] = self.profiles[source].copy()
                    if not hasattr(geo, "_raster_profiles"):
                        geo._raster_profiles = {}
                    geo._raster_profiles[rid] = self.profiles[rid]
            return result
        if op_id in custom:
            return await custom[op_id](p)
        raise ValueError(f"Algoritmo {op_id} não catalogado")

    def _apply_selection_scope(
        self, op_id: str, params: dict[str, Any]
    ) -> dict[str, Any]:
        """Troca somente a entrada vetorial principal por um subconjunto em memória."""
        if params.get("processar_sobre") != "selecionadas":
            return params
        selected_keys = {
            str(value)
            for value in params.get("chaves_selecionadas", [])
            if value is not None
        }
        if not selected_keys:
            raise ValueError("Não há feições selecionadas para processar")
        input_key = next(
            (
                key
                for key in TOOL_INPUTS.get(op_id, [])
                if key.startswith("camada_id") and key != "camada_ids"
            ),
            None,
        )
        if not input_key or not params.get(input_key):
            raise ValueError(
                "O algoritmo não possui uma camada vetorial principal selecionável"
            )
        source = self._layer(str(params[input_key]))
        identity_column = next(
            (
                column
                for column in ("OBJECTID", "ObjectID", "objectid", "FID", "fid", "id")
                if column in source.columns
            ),
            None,
        )
        if identity_column:
            mask = source[identity_column].astype(str).isin(selected_keys)
        else:
            selected_attributes = params.get("atributos_selecionados") or []
            attribute_columns = [
                column for column in source.columns if column != source.geometry.name
            ]
            mask = source.apply(
                lambda row: any(
                    all(
                        str(row[key]) == str(attributes[key])
                        for key in attributes
                        if key in attribute_columns
                    )
                    for attributes in selected_attributes
                    if attributes
                ),
                axis=1,
            )
        mask_values = np.asarray(mask, dtype=bool)
        subset = source.loc[mask_values].copy()
        if subset.empty:
            raise ValueError(
                "As feições selecionadas não foram localizadas na camada original"
            )
        temporary_id = f"selecao_{uuid4().hex}"
        geo._camadas[temporary_id] = subset
        scoped = dict(params)
        scoped[input_key] = temporary_id
        scoped["camada_origem_id"] = params[input_key]
        scoped["total_selecionadas"] = len(subset)
        return scoped

    async def rasterize(self, p: dict[str, Any]) -> dict[str, Any]:
        gdf = self._layer(p["camada_id"]).copy()
        resolution = float(p.get("resolucao_raster", 50))
        if p.get("crs_destino"):
            gdf = gdf.to_crs(p["crs_destino"])
        transform, width, height = self._grid(gdf, resolution)
        field = p.get("atributo_rasterizacao")
        values = gdf[field] if field else np.ones(len(gdf))
        data = rasterize(
            zip(gdf.geometry, values),
            out_shape=(height, width),
            transform=transform,
            fill=cast(Any, float(p.get("valor_preenchimento", 0))),
            all_touched=bool(p.get("processar_todas_celulas_tocadas", False)),
            dtype="float32",
        )
        if data is None:
            raise RuntimeError("A rasterização não retornou dados")
        rid = self._new_raster(data, {"crs": gdf.crs, "transform": transform})
        return {"raster_id": rid, "shape": list(data.shape), "resolucao": resolution}

    async def distance(self, p: dict[str, Any]) -> dict[str, Any]:
        q = dict(p)
        q.setdefault("resolucao_raster", p.get("resolucao_distancia", 50))
        q["valor_preenchimento"] = 0
        base = await self.rasterize(q)
        resolution = float(q["resolucao_raster"])
        distances = distance_transform_edt(
            self._raster(base["raster_id"]) == 0,
            return_distances=True,
            return_indices=False,
        )
        if distances is None or isinstance(distances, tuple):
            raise RuntimeError("O cálculo de distância não retornou dados")
        data = distances * resolution
        if p.get("distancia_maxima") is not None:
            data = np.minimum(data, float(p["distancia_maxima"]))
        rid = self._new_raster(data, self.profiles[base["raster_id"]])
        return {"raster_id": rid, "shape": list(data.shape), "resolucao": resolution}

    async def weighted_distance(self, p: dict[str, Any]) -> dict[str, Any]:
        field = p["atributo_peso"]
        q = dict(p)
        q["resolucao_raster"] = p.get("resolucao_distancia", 50)
        q["atributo_rasterizacao"] = field
        q["valor_preenchimento"] = 0
        base = await self.rasterize(q)
        weights = self._raster(base["raster_id"])
        presence = np.isfinite(weights) & (weights != 0)
        if not presence.any():
            raise ValueError("O atributo de peso não gerou células válidas")
        distance_result = distance_transform_edt(
            ~presence, return_distances=True, return_indices=True
        )
        if distance_result is None or not isinstance(distance_result, tuple):
            raise RuntimeError("O cálculo de distância ponderada não retornou dados")
        distance, indices = distance_result
        distance *= float(q["resolucao_raster"])
        nearest_weight = np.abs(weights[tuple(indices)])
        data = distance / np.maximum(nearest_weight, np.finfo("float32").eps)
        if p.get("distancia_maxima") is not None:
            data = np.minimum(data, float(p["distancia_maxima"]))
        rid = self._new_raster(data, self.profiles[base["raster_id"]])
        return {"raster_id": rid, "shape": list(data.shape), "atributo_peso": field}

    async def density(self, p: dict[str, Any]) -> dict[str, Any]:
        gdf = self._layer(p["camada_id"])
        resolution = float(p.get("resolucao_kernel", 50))
        transform, width, height = self._grid(gdf, resolution)
        samples = np.array(
            [
                (geom.centroid.x, geom.centroid.y)
                for geom in gdf.geometry
                if geom and not geom.is_empty
            ]
        )
        if not len(samples):
            raise ValueError("Camada não possui geometrias válidas para densidade")
        kernel_name = str(p.get("tipo_kernel", "gaussiano"))
        kernel = {"quadratic": "epanechnikov"}.get(kernel_name, kernel_name)
        kernel = {"gaussiano": "gaussian"}.get(kernel, kernel)
        model = KernelDensity(
            kernel=cast(Any, kernel), bandwidth=float(p.get("largura_kernel", 1000))
        ).fit(samples)
        xs = transform.c + (np.arange(width) + 0.5) * transform.a
        ys = transform.f + (np.arange(height) + 0.5) * transform.e
        xx, yy = np.meshgrid(xs, ys)
        points = np.column_stack([xx.ravel(), yy.ravel()])
        scores = []
        for inicio in range(0, len(points), 100_000):
            scores.append(model.score_samples(points[inicio : inicio + 100_000]))
        data = np.exp(np.concatenate(scores)).reshape(height, width)
        if p.get("normalizar_resultado", True) and data.max() > data.min():
            data = (data - data.min()) / (data.max() - data.min())
        rid = self._new_raster(data, {"crs": gdf.crs, "transform": transform})
        return {"raster_id": rid, "shape": list(data.shape), "kernel": kernel}

    async def interpolate(self, p: dict[str, Any]) -> dict[str, Any]:
        gdf = self._layer(p["camada_id"])
        field = p.get("atributo_valor")
        numeric = list(gdf.select_dtypes(include=np.number).columns)
        field = field or (numeric[0] if numeric else None)
        if not field:
            raise ValueError("Informe atributo_valor numérico")
        res = float(p.get("resolucao_interpolacao", 50))
        transform, w, h = self._grid(gdf, res)
        xs = transform.c + (np.arange(w) + 0.5) * transform.a
        ys = transform.f + (np.arange(h) + 0.5) * transform.e
        xx, yy = np.meshgrid(xs, ys)
        points = np.array([(g.centroid.x, g.centroid.y) for g in gdf.geometry])
        values = gdf[field].to_numpy(float)
        method = p.get("metodo_interpolacao", "idw")
        if method == "idw":
            data = np.zeros_like(xx)
            weights = np.zeros_like(xx)
            power = float(p.get("potencia_interpolacao", 2))
            for (x, y), value in zip(points, values):
                d = np.hypot(xx - x, yy - y)
                wt = 1 / np.maximum(d, res / 100) ** power
                data += wt * value
                weights += wt
            data = data / weights
        elif method == "kriging":
            model = OrdinaryKriging(
                points[:, 0],
                points[:, 1],
                values,
                variogram_model="linear",
                verbose=False,
                enable_plotting=False,
            )
            data, _ = model.execute("grid", xs, ys[::-1])
            data = np.asarray(data)[::-1]
        else:
            data = griddata(
                points,
                values,
                (xx, yy),
                method="cubic" if method == "spline" else method,
                fill_value=np.nan,
            )
        rid = self._new_raster(data, {"crs": gdf.crs, "transform": transform})
        return {"raster_id": rid, "shape": list(data.shape), "atributo": field}

    async def accumulated_cost(self, p: dict[str, Any]) -> dict[str, Any]:
        cost = self._raster(p["raster_id"])
        rows, cols = cost.shape
        if cost.size > 1_000_000:
            raise ValueError(
                "Custo acumulado limitado a 1 milhão de células por execução"
            )
        sr = int(p.get("origem_linha", 0))
        sc = int(p.get("origem_coluna", 0))
        if not (0 <= sr < rows and 0 <= sc < cols):
            raise ValueError("Célula de origem fora do raster")
        indices = np.arange(cost.size).reshape(rows, cols)
        origins = []
        targets = []
        weights = []
        for a, b in (
            (indices[:, :-1], indices[:, 1:]),
            (indices[:-1, :], indices[1:, :]),
        ):
            ca = cost.ravel()[a.ravel()]
            cb = cost.ravel()[b.ravel()]
            valid = np.isfinite(ca) & np.isfinite(cb)
            av = a.ravel()[valid]
            bv = b.ravel()[valid]
            w = (ca[valid] + cb[valid]) / 2
            origins.extend([av, bv])
            targets.extend([bv, av])
            weights.extend([w, w])
        graph = coo_matrix(
            (
                np.concatenate(weights),
                (np.concatenate(origins), np.concatenate(targets)),
            ),
            shape=(cost.size, cost.size),
        ).tocsr()
        dist = dijkstra(graph, directed=False, indices=sr * cols + sc).reshape(
            rows, cols
        )
        rid = self._new_raster(dist, self.profiles[p["raster_id"]])
        return {"raster_id": rid, "shape": list(dist.shape)}

    async def boolean(self, p: dict[str, Any]) -> dict[str, Any]:
        q = dict(p)
        q.setdefault("resolucao_raster", 50)
        q["valor_preenchimento"] = 0
        return await self.rasterize(q)

    async def clip(self, p: dict[str, Any]) -> dict[str, Any]:
        data = self._raster(p["raster_id"])
        profile = self.profiles[p["raster_id"]]
        zones = self._layer(p["camada_mascara_id"]).to_crs(profile["crs"])
        mask = geometry_mask(
            zones.geometry,
            out_shape=data.shape,
            transform=profile["transform"],
            invert=True,
        )
        rid = self._new_raster(np.where(mask, data, np.nan), profile)
        return {"raster_id": rid, "shape": list(data.shape)}

    async def zonal(self, p: dict[str, Any]) -> dict[str, Any]:
        data = self._raster(p["raster_id"])
        profile = self.profiles[p["raster_id"]]
        zones = self._layer(p["camada_zona_id"]).to_crs(profile["crs"])
        output = []
        for idx, geom in zones.geometry.items():
            mask = geometry_mask(
                [geom],
                out_shape=data.shape,
                transform=profile["transform"],
                invert=True,
            )
            v = data[mask & np.isfinite(data)]
            output.append(
                {
                    "zona": str(idx),
                    "count": int(v.size),
                    "min": float(v.min()) if v.size else None,
                    "max": float(v.max()) if v.size else None,
                    "media": float(v.mean()) if v.size else None,
                    "soma": float(v.sum()) if v.size else None,
                }
            )
        return {"estatisticas": output}

    async def sample(self, p: dict[str, Any]) -> dict[str, Any]:
        data = self._raster(p["raster_id"])
        profile = self.profiles[p["raster_id"]]
        points = self._layer(p["camada_pontos_id"]).to_crs(profile["crs"])
        out = []
        for geom in points.geometry:
            row, col = rowcol(profile["transform"], geom.centroid.x, geom.centroid.y)
            out.append(
                float(data[row, col])
                if 0 <= row < data.shape[0] and 0 <= col < data.shape[1]
                else None
            )
        return {"valores": out}

    async def extract_polygon(self, p: dict[str, Any]) -> dict[str, Any]:
        result = await self.zonal(
            {"raster_id": p["raster_id"], "camada_zona_id": p["camada_poligono_id"]}
        )
        stat = p.get("estatistica", "media")
        return {
            "estatistica": stat,
            "valores": [x.get(stat) for x in result["estatisticas"]],
        }

    async def save_layer(self, p: dict[str, Any]) -> dict[str, Any]:
        if p["destino"] == "memoria":
            metadata = await geo.obter_recurso(p["entrada"])
            if not metadata:
                raise ValueError(f"Camada de entrada {p['entrada']} não encontrada")
            key = "raster_id" if metadata["tipo"] == "raster" else "camada_id"
            return {key: p["entrada"], "destino": "memoria", "formato_saida": "JSON"}
        filename, storage_format = self._canonical_output_file(p)
        crs = "auto" if p["crs_saida"] == "entrada" else p["crs_saida"]
        return await geo.salvar_camada(
            p["entrada"], "data/geoespacial/outputs", filename, crs, storage_format
        )

    def _canonical_output_file(self, p: dict[str, Any]) -> tuple[str, str]:
        formats = {
            "geopackage": (".gpkg", "gpkg"),
            "geojson": (".geojson", "geojson"),
            "shapefile": (".shp", "shapefile"),
            "geotiff": (".tif", "geotiff"),
        }
        key = str(p["formato_saida"]).lower()
        if key not in formats:
            raise ValueError("Formato de saída incompatível com storage")
        extension, storage_format = formats[key]
        name = Path(str(p["nome_saida"])).stem + extension
        return name, storage_format

    async def export_vector(
        self, p: dict[str, Any], progress: Callable[[str], None] | None
    ) -> dict[str, Any]:
        if p["destino"] == "memoria":
            return await geo.exportar_camada(
                p["camada_id"],
                p["nome_saida"],
                "GeoJSON",
                None,
                "memoria",
                progress=progress,
            )
        filename, storage_format = self._canonical_output_file(p)
        crs = "auto" if p["crs_saida"] == "entrada" else p["crs_saida"]
        return await geo.salvar_camada(
            p["camada_id"], "data/geoespacial/outputs", filename, crs, storage_format
        )

    async def export_raster(
        self, p: dict[str, Any], progress: Callable[[str], None] | None
    ) -> dict[str, Any]:
        if p["destino"] == "memoria":
            return await geo.exportar_raster(
                p["raster_id"],
                p["nome_saida"],
                "JSON",
                False,
                "memoria",
                progress=progress,
            )
        filename, storage_format = self._canonical_output_file(p)
        crs = "auto" if p["crs_saida"] == "entrada" else p["crs_saida"]
        return await geo.salvar_camada(
            p["raster_id"], "data/geoespacial/outputs", filename, crs, storage_format
        )

    def _new_layer(
        self, frame: gpd.GeoDataFrame, name: str, operation: str
    ) -> dict[str, Any]:
        if frame.empty:
            raise ValueError("A operação não produziu feições")
        layer_id = geo.registrar_camada(frame, name, operation)
        return {
            "camada_id": layer_id,
            "feicoes": len(frame),
            "crs": str(frame.crs or ""),
        }

    async def centroids(self, p: dict[str, Any]) -> dict[str, Any]:
        frame = self._layer(p["camada_id"]).copy()
        frame.geometry = frame.geometry.centroid
        return self._new_layer(frame, p.get("nome_saida", "Centroides"), "OP-28")

    async def convex_hulls(self, p: dict[str, Any]) -> dict[str, Any]:
        frame = self._layer(p["camada_id"]).copy()
        frame.geometry = frame.geometry.convex_hull
        return self._new_layer(frame, p.get("nome_saida", "Fechos convexos"), "OP-29")

    async def envelopes(self, p: dict[str, Any]) -> dict[str, Any]:
        frame = self._layer(p["camada_id"]).copy()
        frame.geometry = frame.geometry.envelope
        return self._new_layer(frame, p.get("nome_saida", "Envelopes"), "OP-30")

    async def simplify(self, p: dict[str, Any]) -> dict[str, Any]:
        frame = self._layer(p["camada_id"]).copy()
        frame.geometry = frame.geometry.simplify(
            float(p["tolerancia"]),
            preserve_topology=bool(p.get("preservar_topologia", True)),
        )
        return self._new_layer(
            frame, p.get("nome_saida", "Geometrias simplificadas"), "OP-31"
        )

    async def explode(self, p: dict[str, Any]) -> dict[str, Any]:
        frame = self._layer(p["camada_id"]).explode(
            index_parts=False, ignore_index=True
        )
        return self._new_layer(frame, p.get("nome_saida", "Feições simples"), "OP-32")

    async def vector_clip(self, p: dict[str, Any]) -> dict[str, Any]:
        frame = self._layer(p["camada_id"])
        frame_crs = frame.crs
        if frame_crs is None:
            raise ValueError("A camada de entrada não possui CRS definido")
        mask = self._layer(p["camada_mascara_id"])
        if mask.crs is None:
            raise ValueError("A camada de máscara não possui CRS definido")
        mask = mask.to_crs(frame_crs)
        result = gpd.clip(
            frame, mask, keep_geom_type=bool(p.get("manter_tipo_geometria", True))
        )
        return self._new_layer(result, p.get("nome_saida", "Recorte vetorial"), "OP-33")

    async def spatial_join(self, p: dict[str, Any]) -> dict[str, Any]:
        left = self._layer(p["camada_id"])
        left_crs = left.crs
        if left_crs is None:
            raise ValueError("A camada de entrada não possui CRS definido")
        right = self._layer(p["camada_ref_id"])
        if right.crs is None:
            raise ValueError("A camada de referência não possui CRS definido")
        right = right.to_crs(left_crs)
        how_value = str(p.get("tipo_juncao", "inner"))
        if how_value not in {"left", "right", "inner"}:
            raise ValueError("Tipo de junção deve ser left, right ou inner")
        how = cast(Literal["left", "right", "inner"], how_value)
        result = gpd.sjoin(
            left,
            right,
            how=how,
            predicate=str(p.get("predicado", "intersects")),
            lsuffix="entrada",
            rsuffix="referencia",
        )
        return self._new_layer(result, p.get("nome_saida", "Junção espacial"), "OP-34")

    async def merge_layers(self, p: dict[str, Any]) -> dict[str, Any]:
        ids = list(p["camada_ids"])
        if len(ids) < 2:
            raise ValueError("Selecione ao menos duas camadas")
        frames = [self._layer(item) for item in ids]
        crs = frames[0].crs
        if crs is None:
            raise ValueError("A primeira camada não possui CRS definido")
        if any(frame.crs is None for frame in frames[1:]):
            raise ValueError("Todas as camadas devem possuir CRS definido")
        aligned = [frame.to_crs(crs) if frame.crs != crs else frame for frame in frames]
        result = gpd.GeoDataFrame(pd.concat(aligned, ignore_index=True), crs=crs)
        return self._new_layer(
            result, p.get("nome_saida", "Camadas mescladas"), "OP-35"
        )

    async def reproject_layer(self, p: dict[str, Any]) -> dict[str, Any]:
        result = self._layer(p["camada_id"]).to_crs(str(p["crs_destino"]))
        return self._new_layer(
            result, p.get("nome_saida", "Camada reprojetada"), "OP-36"
        )

    async def calculate_area(self, p: dict[str, Any]) -> dict[str, Any]:
        frame = self._layer(p["camada_id"]).copy()
        frame[str(p.get("campo_saida", "area"))] = frame.geometry.area
        return self._new_layer(frame, p.get("nome_saida", "Área calculada"), "OP-37")

    async def calculate_length(self, p: dict[str, Any]) -> dict[str, Any]:
        frame = self._layer(p["camada_id"]).copy()
        frame[str(p.get("campo_saida", "comprimento"))] = frame.geometry.length
        return self._new_layer(
            frame, p.get("nome_saida", "Comprimento calculado"), "OP-38"
        )

    async def reclassify_raster(self, p: dict[str, Any]) -> dict[str, Any]:
        source = self._raster(p["raster_id"])
        result = np.full(source.shape, np.nan, dtype="float32")
        classes = p["classes"]
        if isinstance(classes, str):
            classes = json.loads(classes)
        for item in classes:
            minimum, maximum, value = (
                float(item["min"]),
                float(item["max"]),
                float(item["valor"]),
            )
            result[(source >= minimum) & (source < maximum)] = value
        rid = self._new_raster(result, self.profiles[p["raster_id"]])
        return {"raster_id": rid, "shape": list(result.shape)}

    async def threshold_raster(self, p: dict[str, Any]) -> dict[str, Any]:
        source = self._raster(p["raster_id"])
        result = np.where(
            source >= float(p["limiar"]),
            float(p.get("valor_acima", 1)),
            float(p.get("valor_abaixo", 0)),
        ).astype("float32")
        rid = self._new_raster(result, self.profiles[p["raster_id"]])
        return {"raster_id": rid, "shape": list(result.shape)}

    async def invert_raster(self, p: dict[str, Any]) -> dict[str, Any]:
        source = self._raster(p["raster_id"])
        finite = source[np.isfinite(source)]
        if not finite.size:
            raise ValueError("Raster não possui células válidas")
        result = finite.min() + finite.max() - source
        rid = self._new_raster(result, self.profiles[p["raster_id"]])
        return {"raster_id": rid, "shape": list(result.shape)}

    async def focal_filter(self, p: dict[str, Any]) -> dict[str, Any]:
        source = self._raster(p["raster_id"])
        size = max(1, int(p.get("tamanho_janela", 3)))
        method = str(p.get("estatistica", "media"))
        filters = {
            "media": uniform_filter,
            "minimo": minimum_filter,
            "maximo": maximum_filter,
        }
        if method not in filters:
            raise ValueError("Estatística focal deve ser media, minimo ou maximo")
        result = filters[method](source.astype("float32"), size=size)
        rid = self._new_raster(result, self.profiles[p["raster_id"]])
        return {"raster_id": rid, "shape": list(result.shape), "estatistica": method}

    async def gaussian_smoothing(self, p: dict[str, Any]) -> dict[str, Any]:
        source = self._raster(p["raster_id"])
        result = gaussian_filter(
            source.astype("float32"), sigma=float(p.get("sigma", 1))
        )
        rid = self._new_raster(result, self.profiles[p["raster_id"]])
        return {"raster_id": rid, "shape": list(result.shape)}

    def validate_steps(self, steps: list[dict[str, Any]]) -> list[str]:
        erros: list[str] = []
        if not steps:
            erros.append(
                "A definição não contém etapas de processamento. Esperado: ao menos "
                "um algoritmo ou função entre a entrada e a saída. Como corrigir: "
                "adicione um processo e conecte-o ao fluxo."
            )
        for indice, step in enumerate(steps, 1):
            if step.get("iterador"):
                if sum(bool(item.get("iterador")) for item in steps) > 1:
                    erros.append(
                        "Foram encontrados vários iteradores. Esperado: no máximo um "
                        "iterador por definição. Como corrigir: mantenha apenas o "
                        "iterador que controla esta repetição."
                    )
                if not isinstance(step.get("parametros", {}), dict):
                    erros.append(
                        f"Etapa {indice}, iterador: os parâmetros estão em formato "
                        "incompatível. Esperado: campos com nome e valor. Como "
                        "corrigir: abra as propriedades do iterador e preencha novamente."
                    )
                continue
            if step.get("funcao_id"):
                if not isinstance(step.get("parametros", {}), dict):
                    erros.append(
                        f"Etapa {indice}, função: os parâmetros estão em formato "
                        "incompatível. Esperado: campos com nome e valor. Como "
                        "corrigir: abra a função e preencha seus parâmetros novamente."
                    )
                continue
            algoritmo_id = str(step.get("algoritmo_id", "")).upper()
            if algoritmo_id not in CATALOG:
                erros.append(
                    f"Etapa {indice}: o algoritmo informado não existe mais na toolbox. "
                    "Esperado: um algoritmo disponível no catálogo atual. Como corrigir: "
                    "remova este elemento e adicione novamente o algoritmo desejado."
                )
            if not isinstance(step.get("parametros", {}), dict):
                nome = CATALOG.get(algoritmo_id, "algoritmo")
                erros.append(
                    f"Etapa {indice}, “{nome}”: os parâmetros estão em formato "
                    "incompatível. Esperado: campos com nome e valor. Como corrigir: "
                    "abra as propriedades e preencha os parâmetros novamente."
                )
                continue
            ausentes = REQUIRED_PARAMETERS.get(algoritmo_id, set()) - set(
                step.get("parametros", {})
            )
            if ausentes:
                nome = CATALOG.get(algoritmo_id, algoritmo_id)
                campos = ", ".join(sorted(ausentes))
                erros.append(
                    f"Etapa {indice}, “{nome}”: faltam os campos {campos}. Esperado: "
                    "todos os campos obrigatórios preenchidos com um valor direto ou "
                    "uma variável anterior. Como corrigir: selecione o elemento e "
                    "preencha os campos indicados em Parâmetros."
                )
        return erros

    async def run_steps(
        self, steps: list[dict[str, Any]], inputs: dict[str, Any]
    ) -> dict[str, Any]:
        erros = self.validate_steps(steps)
        if erros:
            raise ValueError("; ".join(erros))
        context = dict(inputs)
        # Resolve aliases declarados por variáveis (por exemplo, $entrada) antes
        # de preencher os parâmetros dos passos. O limite impede ciclos.
        for _ in range(len(context)):
            changed = False
            for key, value in tuple(context.items()):
                if isinstance(value, str) and value.startswith("$"):
                    reference = value[1:]
                    if reference in context and context[reference] != value:
                        context[key] = context[reference]
                        changed = True
            if not changed:
                break
        results = []
        for index, step in enumerate(steps):
            params = {
                k: (
                    context.get(v[1:])
                    if isinstance(v, str) and v.startswith("$")
                    else v
                )
                for k, v in step.get("parametros", {}).items()
            }
            if step.get("iterador"):
                source = params.get("fonte", [])
                if isinstance(source, str) and source.startswith("$"):
                    source = context.get(source[1:], [])
                iterator_type = str(step.get("iterador"))
                if iterator_type == "features":
                    if not isinstance(source, str):
                        raise ValueError(
                            "O iterador de feições requer uma camada vetorial"
                        )
                    frame = self._layer(source)
                    feature_layers = []
                    for _, row in frame.iterrows():
                        feature = gpd.GeoDataFrame(
                            [row], geometry=frame.geometry.name, crs=frame.crs
                        )
                        feature_id = f"iteracao_{uuid4().hex}"
                        geo._camadas[feature_id] = feature
                        feature_layers.append(feature_id)
                    source = feature_layers
                elif not isinstance(source, list):
                    source = [source]
                variable = str(params.get("variavel", "item"))
                # Passos seguintes: rodam DENTRO do loop até o primeiro marcado como pos_iterador.
                # Passos com pos_iterador=True rodam UMA vez após o loop.
                remaining = steps[index + 1 :]
                split = next(
                    (i for i, s in enumerate(remaining) if s.get("pos_iterador")),
                    len(remaining),
                )
                inner_steps, after_steps = remaining[:split], remaining[split:]
                iterations = []
                for value in source:
                    iteration = await self.run_steps(
                        inner_steps, {**context, variable: value}
                    )
                    iterations.append(iteration)
                    context.update(iteration.get("contexto", {}))
                if after_steps:
                    tail = await self.run_steps(after_steps, context)
                    context.update(tail.get("contexto", {}))
                    results.extend(tail.get("resultados", []))
                return {
                    "status": "concluido",
                    "iteracoes": iterations,
                    "resultados": results,
                    "contexto": context,
                }
            if step.get("funcao_id"):
                from api.repositories import (
                    modelo_geoprocessamento_repository as definitions,
                )

                function = definitions.obter(step["funcao_id"], "funcao")
                if not function:
                    raise ValueError(f"Função {step['funcao_id']} não encontrada")
                result = await self.run_steps(
                    function.get("passos", []), {**context, **params}
                )
            else:
                result = await self.execute(step["algoritmo_id"], params)
            result_context = result.get("contexto", result)
            results.append(result)
            context.update(result_context)
            for source_key, variable_name in step.get("mapear_saidas", {}).items():
                if source_key not in result_context:
                    raise ValueError(
                        f"A saída {source_key} não foi produzida pelo processo"
                    )
                context[str(variable_name)] = result_context[source_key]
        return {"status": "concluido", "resultados": results, "contexto": context}


geoprocessamento_engine = GeoprocessamentoEngine()
