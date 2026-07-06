"""Registro e orquestrador dos algoritmos geoespaciais da stack."""
from __future__ import annotations

import heapq
from typing import Any

import numpy as np
import rasterio
from rasterio.features import geometry_mask, rasterize
from rasterio.transform import from_origin
from scipy.interpolate import griddata
from scipy.ndimage import distance_transform_edt, gaussian_filter

from api.services.geoespacial_service import geoespacial_service as geo


CATALOG = {
    "OP-01": "Carregar Camada", "OP-02": "Validar Camada", "OP-02-CORR": "Reparar Geometrias",
    "OP-03": "Normalizar Camada", "OP-04": "Criar Buffer", "OP-05": "Sobrepor Camadas",
    "OP-06": "Dissolver", "OP-07": "Selecionar por Localização", "OP-08": "Converter para Raster",
    "OP-10": "Calcular Distância", "OP-11": "Distância Ponderada", "OP-12": "Calcular Densidade",
    "OP-13": "Custo Acumulado", "OP-14": "Interpolar Valores", "OP-15": "Agregar por Território",
    "OP-16": "Criar Camada Booleana", "OP-17": "Combinar Rasters", "OP-20": "Normalizar Raster",
    "OP-21": "Recortar Raster", "OP-22": "Estatísticas por Zona", "OP-23": "Amostrar Raster em Pontos",
    "OP-24": "Extrair Valores em Polígono", "OP-25": "Exportar Camada", "OP-26": "Exportar Raster",
    "OP-27": "Salvar Camada",
}


class GeoprocessamentoEngine:
    def __init__(self) -> None:
        self.profiles: dict[str, dict[str, Any]] = {}
        self.functions: dict[str, dict[str, Any]] = {}
        self.flows: dict[str, dict[str, Any]] = {}

    def _layer(self, layer_id: str):
        if layer_id not in geo._camadas:
            raise ValueError(f"Camada {layer_id} não encontrada na sessão")
        return geo._camadas[layer_id]

    def _raster(self, raster_id: str) -> np.ndarray:
        if raster_id not in geo._rasters:
            raise ValueError(f"Raster {raster_id} não encontrado na sessão")
        return geo._rasters[raster_id]

    def _new_raster(self, data: np.ndarray, profile: dict[str, Any]) -> str:
        rid = f"raster_{len(geo._rasters) + 1}"
        geo._rasters[rid] = np.asarray(data, dtype="float32")
        self.profiles[rid] = profile
        if not hasattr(geo, "_raster_profiles"):
            geo._raster_profiles = {}
        geo._raster_profiles[rid] = profile
        return rid

    def _grid(self, gdf, resolution: float):
        minx, miny, maxx, maxy = gdf.total_bounds
        width = max(1, int(np.ceil((maxx - minx) / resolution)))
        height = max(1, int(np.ceil((maxy - miny) / resolution)))
        if width * height > 25_000_000:
            raise ValueError("Grade excede 25 milhões de células; aumente a resolução")
        transform = from_origin(minx, maxy, resolution, resolution)
        return transform, width, height

    async def execute(self, op_id: str, p: dict[str, Any]) -> dict[str, Any]:
        dispatch = {
            "OP-01": lambda: geo.carregar_camada(p["tipo_entrada"], p["caminho_arquivo"], p.get("crs_origem"), p.get("filtro_espacial"), p.get("filtro_atributivo")),
            "OP-02": lambda: geo.validar_camada(p["camada_id"], **{k: v for k, v in p.items() if k != "camada_id"}),
            "OP-02-CORR": lambda: geo.reparar_geometrias(p["camada_id"], **{k: v for k, v in p.items() if k != "camada_id"}),
            "OP-03": lambda: geo.normalizar_camada(p["camada_id"], **{k: v for k, v in p.items() if k != "camada_id"}),
            "OP-04": lambda: geo.criar_buffer(p["camada_id"], p["distancia_buffer"], p.get("unidade_buffer", "metros"), p.get("tipo_buffer", "cheio"), p.get("dissolver_geometrias", False), p.get("recortar_area_estudo", False)),
            "OP-05": lambda: geo.sobrepor_camadas(p["camada_id_1"], p["camada_id_2"], p.get("tipo_overlay", "identity"), p.get("resolver_conflitos_campos", True), p.get("regra_nomenclatura", "<fonte_id>__<nome_campo>")),
            "OP-06": lambda: geo.dissolver(p["camada_id"], p.get("campo_agrupamento"), p.get("funcao_agregacao", "soma"), p.get("manter_geometria_multi", False)),
            "OP-07": lambda: geo.selecionar_por_localizacao(p["camada_id"], p["camada_ref_id"], p.get("tipo_selecao", "intersects"), p.get("inverter_selecao", False)),
            "OP-15": lambda: geo.agregar_por_territorio(p["camada_id"], p["campo_unidade"], p.get("funcao_agregacao", "soma"), p.get("atributo_agregacao"), p.get("resolucao_saida")),
            "OP-17": lambda: geo.combinar_rasters(p["raster_ids"], p.get("pesos"), p.get("operador", "media_ponderada")),
            "OP-20": lambda: geo.normalizar_raster(p["raster_id"], p.get("metodo_normalizacao", "linear"), p.get("valor_minimo"), p.get("valor_maximo")),
            "OP-25": lambda: geo.exportar_camada(p["camada_id"], p["nome_arquivo"], p.get("formato_saida", "GeoPackage"), p.get("crs_saida"), p.get("opcao_salvamento", "memoria")),
            "OP-26": lambda: geo.exportar_raster(p["raster_id"], p["nome_arquivo"], p.get("formato_saida", "GeoTIFF"), p.get("comprimir_arquivo", False), p.get("opcao_salvamento", "memoria")),
            "OP-27": lambda: geo.salvar_camada(p["entrada"], p["destino"], p["saida"], p.get("crs", "auto"), p.get("formato", "auto")),
        }
        custom = {"OP-08": self.rasterize, "OP-10": self.distance, "OP-11": self.weighted_distance,
                  "OP-12": self.density, "OP-13": self.accumulated_cost, "OP-14": self.interpolate,
                  "OP-16": self.boolean, "OP-21": self.clip, "OP-22": self.zonal,
                  "OP-23": self.sample, "OP-24": self.extract_polygon}
        if op_id in dispatch:
            result = await dispatch[op_id]()
            if op_id in {"OP-02-CORR", "OP-03"}:
                result.setdefault("camada_id", p["camada_id"])
            rid = result.get("raster_id") if isinstance(result, dict) else None
            if rid and rid not in self.profiles:
                source = p.get("raster_id") or ((p.get("raster_ids") or [None])[0])
                if source in self.profiles:
                    self.profiles[rid] = self.profiles[source].copy()
                    if not hasattr(geo, "_raster_profiles"): geo._raster_profiles = {}
                    geo._raster_profiles[rid] = self.profiles[rid]
            return result
        if op_id in custom:
            return await custom[op_id](p)
        raise ValueError(f"Algoritmo {op_id} não catalogado")

    async def rasterize(self, p):
        gdf = self._layer(p["camada_id"]).copy(); resolution = float(p.get("resolucao_raster", 50))
        if p.get("crs_destino"): gdf = gdf.to_crs(p["crs_destino"])
        transform, width, height = self._grid(gdf, resolution); field = p.get("atributo_rasterizacao")
        values = gdf[field] if field else np.ones(len(gdf)); data = rasterize(zip(gdf.geometry, values), out_shape=(height, width), transform=transform, fill=float(p.get("valor_preenchimento", 0)), all_touched=bool(p.get("processar_todas_celulas_tocadas", False)), dtype="float32")
        rid = self._new_raster(data, {"crs": gdf.crs, "transform": transform}); return {"raster_id": rid, "shape": list(data.shape), "resolucao": resolution}

    async def distance(self, p):
        q = dict(p); q.setdefault("resolucao_raster", p.get("resolucao_distancia", 50)); q["valor_preenchimento"] = 0
        base = await self.rasterize(q); resolution = float(q["resolucao_raster"]); data = distance_transform_edt(self._raster(base["raster_id"]) == 0) * resolution
        if p.get("distancia_maxima") is not None: data = np.minimum(data, float(p["distancia_maxima"]))
        rid = self._new_raster(data, self.profiles[base["raster_id"]]); return {"raster_id": rid, "shape": list(data.shape), "resolucao": resolution}

    async def weighted_distance(self, p):
        result = await self.distance(p); gdf = self._layer(p["camada_id"]); field = p["atributo_peso"]
        weight = float(gdf[field].astype(float).mean()); geo._rasters[result["raster_id"]] *= weight; result["peso_medio"] = weight; return result

    async def density(self, p):
        q = dict(p); q["resolucao_raster"] = p.get("resolucao_kernel", 50); base = await self.rasterize(q); resolution = float(q["resolucao_raster"])
        data = gaussian_filter(self._raster(base["raster_id"]), max(float(p.get("largura_kernel", 1000)) / resolution, .5))
        if p.get("normalizar_resultado", True) and data.max() > data.min(): data = (data-data.min())/(data.max()-data.min())
        rid=self._new_raster(data,self.profiles[base["raster_id"]]); return {"raster_id":rid,"shape":list(data.shape)}

    async def interpolate(self, p):
        gdf=self._layer(p["camada_id"]); field=p.get("atributo_valor"); numeric=list(gdf.select_dtypes(include=np.number).columns); field=field or (numeric[0] if numeric else None)
        if not field: raise ValueError("Informe atributo_valor numérico")
        res=float(p.get("resolucao_interpolacao",50)); transform,w,h=self._grid(gdf,res); xs=transform.c+(np.arange(w)+.5)*transform.a; ys=transform.f+(np.arange(h)+.5)*transform.e; xx,yy=np.meshgrid(xs,ys); points=np.array([(g.centroid.x,g.centroid.y) for g in gdf.geometry]); values=gdf[field].to_numpy(float)
        method=p.get("metodo_interpolacao","idw")
        if method=="idw":
            data=np.zeros_like(xx); weights=np.zeros_like(xx); power=float(p.get("potencia_interpolacao",2))
            for (x,y),value in zip(points,values): d=np.hypot(xx-x,yy-y); wt=1/np.maximum(d,res/100)**power; data+=wt*value; weights+=wt
            data=data/weights
        else: data=griddata(points,values,(xx,yy),method="cubic" if method in {"spline","kriging"} else method,fill_value=np.nan)
        rid=self._new_raster(data,{"crs":gdf.crs,"transform":transform}); return {"raster_id":rid,"shape":list(data.shape),"atributo":field}

    async def accumulated_cost(self,p):
        cost=self._raster(p["raster_id"]); rows,cols=cost.shape; sr=int(p.get("origem_linha",0)); sc=int(p.get("origem_coluna",0)); dist=np.full(cost.shape,np.inf); dist[sr,sc]=0; queue=[(0.,sr,sc)]
        while queue:
            value,r,c=heapq.heappop(queue)
            if value!=dist[r,c]: continue
            for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
                nr,nc=r+dr,c+dc
                if 0<=nr<rows and 0<=nc<cols and np.isfinite(cost[nr,nc]):
                    nv=value+(cost[r,c]+cost[nr,nc])/2
                    if nv<dist[nr,nc]: dist[nr,nc]=nv; heapq.heappush(queue,(nv,nr,nc))
        rid=self._new_raster(dist,self.profiles[p["raster_id"]]); return {"raster_id":rid,"shape":list(dist.shape)}

    async def boolean(self,p):
        q=dict(p); q.setdefault("resolucao_raster",50); q["valor_preenchimento"]=0; return await self.rasterize(q)

    async def clip(self,p):
        data=self._raster(p["raster_id"]); profile=self.profiles[p["raster_id"]]; zones=self._layer(p["camada_mascara_id"]).to_crs(profile["crs"]); mask=geometry_mask(zones.geometry,out_shape=data.shape,transform=profile["transform"],invert=True); rid=self._new_raster(np.where(mask,data,np.nan),profile); return {"raster_id":rid,"shape":list(data.shape)}

    async def zonal(self,p):
        data=self._raster(p["raster_id"]); profile=self.profiles[p["raster_id"]]; zones=self._layer(p["camada_zona_id"]).to_crs(profile["crs"]); output=[]
        for idx,geom in zones.geometry.items():
            mask=geometry_mask([geom],out_shape=data.shape,transform=profile["transform"],invert=True); v=data[mask & np.isfinite(data)]; output.append({"zona":str(idx),"count":int(v.size),"min":float(v.min()) if v.size else None,"max":float(v.max()) if v.size else None,"media":float(v.mean()) if v.size else None,"soma":float(v.sum()) if v.size else None})
        return {"estatisticas":output}

    async def sample(self,p):
        data=self._raster(p["raster_id"]); profile=self.profiles[p["raster_id"]]; points=self._layer(p["camada_pontos_id"]).to_crs(profile["crs"]); out=[]
        for geom in points.geometry:
            row,col=rasterio.transform.rowcol(profile["transform"],geom.centroid.x,geom.centroid.y); out.append(float(data[row,col]) if 0<=row<data.shape[0] and 0<=col<data.shape[1] else None)
        return {"valores":out}

    async def extract_polygon(self,p):
        result=await self.zonal({"raster_id":p["raster_id"],"camada_zona_id":p["camada_poligono_id"]}); stat=p.get("estatistica","media"); return {"estatistica":stat,"valores":[x.get(stat) for x in result["estatisticas"]]}

    async def run_steps(self, steps: list[dict[str, Any]], inputs: dict[str, Any]) -> dict[str, Any]:
        context=dict(inputs); results=[]
        for step in steps:
            params={k:(context.get(v[1:]) if isinstance(v,str) and v.startswith("$") else v) for k,v in step.get("parametros",{}).items()}
            result=await self.execute(step["algoritmo_id"],params); results.append(result); context.update(result)
        return {"status":"concluido","resultados":results,"contexto":context}


geoprocessamento_engine = GeoprocessamentoEngine()
