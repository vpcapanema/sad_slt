"""Service — Módulo Geoespacial."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import geopandas as gpd
import numpy as np
import rasterio
from shapely.geometry import mapping, shape


class GeoespacialService:
    """Service para operações geoespaciais."""

    def __init__(self) -> None:
        self._camadas: dict[str, gpd.GeoDataFrame] = {}
        self._rasters: dict[str, np.ndarray] = {}

    async def carregar_camada(
        self,
        tipo_entrada: str,
        caminho_arquivo: str,
        crs_origem: str | None = None,
        filtro_espacial: str | None = None,
        filtro_atributivo: str | None = None,
    ) -> dict[str, Any]:
        """Carrega camada vetorial de arquivo ou WFS."""
        try:
            if tipo_entrada == "local":
                gdf = gpd.read_file(caminho_arquivo)
            elif tipo_entrada == "WFS":
                # TODO: Implementar WFS
                raise NotImplementedError("WFS não implementado ainda")
            else:
                raise ValueError(f"Tipo de entrada inválido: {tipo_entrada}")

            if crs_origem and gdf.crs is None:
                gdf = gdf.set_crs(crs_origem)

            camada_id = f"camada_{len(self._camadas) + 1}"
            self._camadas[camada_id] = gdf

            return {
                "camada_id": camada_id,
                "nome": Path(caminho_arquivo).stem,
                "tipo": "vetorial",
                "crs": str(gdf.crs) if gdf.crs else None,
                "feicoes": len(gdf),
                "colunas": list(gdf.columns),
            }
        except Exception as e:
            raise RuntimeError(f"Erro ao carregar camada: {e}") from e

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
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        gdf = self._camadas[camada_id]
        erros: list[str] = []
        avisos: list[str] = []

        # Validar CRS
        if validar_crs and gdf.crs is None:
            erros.append("CRS não definido")

        # Validar geometrias inválidas
        if validar_intersecoes_invalidas:
            invalid_geoms = ~gdf.geometry.is_valid
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
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        gdf = self._camadas[camada_id]
        correcoes: list[str] = []

        if corrigir_geometrias_invalidas:
            invalid_mask = ~gdf.geometry.is_valid
            if invalid_mask.any():
                gdf.loc[invalid_mask, "geometry"] = gdf.loc[invalid_mask, "geometry"].buffer(0)
                correcoes.append(f"Corrigidas {invalid_mask.sum()} geometrias inválidas")

        if corrigir_auto_intersecoes:
            # Buffer(0) também corrige auto-interseções
            pass

        self._camadas[camada_id] = gdf

        return {"correcoes": correcoes, "feicoes_corrigidas": len(correcoes)}

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
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        gdf = self._camadas[camada_id]
        operacoes: list[str] = []

        # Reprojetar CRS
        if gdf.crs and str(gdf.crs) != crs_destino:
            gdf = gdf.to_crs(crs_destino)
            operacoes.append(f"Reprojetado para {crs_destino}")

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

        self._camadas[camada_id] = gdf

        return {
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
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        gdf = self._camadas[camada_id].copy()

        # Criar buffer
        gdf["geometry"] = gdf.geometry.buffer(distancia_buffer)

        # Buffer externo (subtrair geometria original)
        if tipo_buffer == "externo":
            gdf_original = self._camadas[camada_id]
            gdf["geometry"] = gdf["geometry"].difference(gdf_original["geometry"])

        # Dissolver
        if dissolver_geometrias:
            gdf = gdf.dissolve()

        nova_camada_id = f"camada_{len(self._camadas) + 1}"
        self._camadas[nova_camada_id] = gdf

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
        """Sobrepõe camadas com operação de overlay."""
        if camada_id_1 not in self._camadas or camada_id_2 not in self._camadas:
            raise ValueError("Uma ou ambas as camadas não encontradas")

        gdf1 = self._camadas[camada_id_1]
        gdf2 = self._camadas[camada_id_2]

        # Executar overlay
        resultado = gpd.overlay(gdf1, gdf2, how=tipo_overlay)

        # Resolver conflitos de campos
        if resolver_conflitos_campos:
            cols_comuns = set(gdf1.columns) & set(gdf2.columns) - {"geometry"}
            for col in cols_comuns:
                resultado[f"{camada_id_1}__{col}"] = resultado[col + "_1"]
                resultado[f"{camada_id_2}__{col}"] = resultado[col + "_2"]
                resultado = resultado.drop(columns=[col + "_1", col + "_2"])

        nova_camada_id = f"camada_{len(self._camadas) + 1}"
        self._camadas[nova_camada_id] = resultado

        return {
            "camada_id": nova_camada_id,
            "feicoes": len(resultado),
            "tipo_overlay": tipo_overlay,
        }

    async def exportar_camada(
        self,
        camada_id: str,
        nome_arquivo: str,
        formato_saida: str = "GeoPackage",
        crs_saida: str | None = None,
        opcao_salvamento: str = "memoria",
    ) -> dict[str, Any]:
        """Exporta camada vetorial."""
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        gdf = self._camadas[camada_id]

        if crs_saida and gdf.crs:
            gdf = gdf.to_crs(crs_saida)

        driver_map = {
            "GeoPackage": "GPKG",
            "GeoJSON": "GeoJSON",
            "Shapefile": "ESRI Shapefile",
        }

        driver = driver_map.get(formato_saida, "GPKG")

        if opcao_salvamento == "persistir_sistema":
            caminho_completo = f"data/geoespacial/{nome_arquivo}"
            Path(caminho_completo).parent.mkdir(parents=True, exist_ok=True)
            gdf.to_file(caminho_completo, driver=driver)
            return {"caminho": caminho_completo, "formato": formato_saida}
        else:
            # Retornar GeoJSON para memória
            geojson = json.loads(gdf.to_json())
            return {"geojson": geojson, "formato": "GeoJSON"}

    async def normalizar_raster(
        self,
        raster_id: str,
        metodo_normalizacao: str = "linear",
        valor_minimo: float | None = None,
        valor_maximo: float | None = None,
    ) -> dict[str, Any]:
        """Normaliza raster para escala 0-1."""
        if raster_id not in self._rasters:
            raise ValueError(f"Raster {raster_id} não encontrado")

        raster = self._rasters[raster_id].copy()

        # Remover NoData
        raster = raster[~np.isnan(raster)]

        if metodo_normalizacao == "linear":
            min_val = valor_minimo if valor_minimo is not None else raster.min()
            max_val = valor_maximo if valor_maximo is not None else raster.max()
            if max_val > min_val:
                raster_norm = (raster - min_val) / (max_val - min_val)
            else:
                raster_norm = np.zeros_like(raster)
        else:
            raise NotImplementedError(f"Método {metodo_normalizacao} não implementado")

        novo_raster_id = f"raster_{len(self._rasters) + 1}"
        self._rasters[novo_raster_id] = raster_norm

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
            if rid not in self._rasters:
                raise ValueError(f"Raster {rid} não encontrado")
            rasters.append(self._rasters[rid])

        if not rasters:
            raise ValueError("Nenhum raster fornecido")

        # Garantir mesmo shape
        shapes = [r.shape for r in rasters]
        if len(set(shapes)) > 1:
            raise ValueError("Rasters com shapes diferentes")

        if operador == "media_ponderada":
            if pesos is None:
                pesos = [1.0 / len(rasters)] * len(rasters)
            resultado = np.zeros_like(rasters[0])
            for r, p in zip(rasters, pesos):
                resultado += r * p
        elif operador == "soma":
            resultado = np.sum(rasters, axis=0)
        else:
            raise NotImplementedError(f"Operador {operador} não implementado")

        novo_raster_id = f"raster_{len(self._rasters) + 1}"
        self._rasters[novo_raster_id] = resultado

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
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        gdf = self._camadas[camada_id].copy()

        if campo_agrupamento:
            gdf = gdf.dissolve(by=campo_agrupamento, aggfunc=funcao_agregacao, as_index=not manter_geometria_multi)
        else:
            gdf = gdf.dissolve()

        nova_camada_id = f"camada_{len(self._camadas) + 1}"
        self._camadas[nova_camada_id] = gdf

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
        if camada_id not in self._camadas or camada_ref_id not in self._camadas:
            raise ValueError("Uma ou ambas as camadas não encontradas")

        gdf = self._camadas[camada_id].copy()
        gdf_ref = self._camadas[camada_ref_id]

        # Spatial join
        resultado = gpd.sjoin(gdf, gdf_ref, how="inner", predicate=tipo_selecao)

        if inverter_selecao:
            # Selecionar feições que NÃO intersectam
            resultado = gdf[~gdf.index.isin(resultado.index)]

        nova_camada_id = f"camada_{len(self._camadas) + 1}"
        self._camadas[nova_camada_id] = resultado

        return {
            "camada_id": nova_camada_id,
            "feicoes": len(resultado),
            "tipo_selecao": tipo_selecao,
        }

    async def converter_para_raster(
        self,
        camada_id: str,
        resolucao_raster: float = 10.0,
        crs_destino: str | None = None,
        metodo_rasterizacao: str = "ponto_central",
        atributo_rasterizacao: str | None = None,
        valor_preenchimento: float = 0.0,
    ) -> dict[str, Any]:
        """Converte camada vetorial para raster."""
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        gdf = self._camadas[camada_id].copy()

        # TODO: Implementar rasterização com rasterio
        # Por enquanto, retorna placeholder
        novo_raster_id = f"raster_{len(self._rasters) + 1}"
        self._rasters[novo_raster_id] = np.zeros((100, 100))

        return {
            "raster_id": novo_raster_id,
            "resolucao": resolucao_raster,
            "metodo": metodo_rasterizacao,
        }

    async def calcular_distancia(
        self,
        camada_id: str,
        resolucao_distancia: float = 10.0,
        distancia_maxima: float | None = None,
        unidade_distancia: str = "metros",
    ) -> dict[str, Any]:
        """Calcula distância euclidiana raster."""
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        # TODO: Implementar cálculo de distância com GDAL proximity
        novo_raster_id = f"raster_{len(self._rasters) + 1}"
        self._rasters[novo_raster_id] = np.zeros((100, 100))

        return {
            "raster_id": novo_raster_id,
            "resolucao": resolucao_distancia,
            "distancia_maxima": distancia_maxima,
        }

    async def calcular_densidade(
        self,
        camada_id: str,
        tipo_kernel: str = "gaussiano",
        largura_kernel: float = 1.0,
        resolucao_kernel: float = 10.0,
        normalizar_resultado: bool = True,
    ) -> dict[str, Any]:
        """Calcula densidade de kernel."""
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        # TODO: Implementar densidade de kernel com SciPy
        novo_raster_id = f"raster_{len(self._rasters) + 1}"
        self._rasters[novo_raster_id] = np.zeros((100, 100))

        return {
            "raster_id": novo_raster_id,
            "tipo_kernel": tipo_kernel,
            "largura_kernel": largura_kernel,
        }

    async def interpolar_valores(
        self,
        camada_id: str,
        metodo_interpolacao: str = "idw",
        resolucao_interpolacao: float = 10.0,
        potencia_interpolacao: float = 2.0,
        raio_busca: float | None = None,
    ) -> dict[str, Any]:
        """Interpola valores de pontos para grid."""
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        # TODO: Implementar interpolação com SciPy griddata
        novo_raster_id = f"raster_{len(self._rasters) + 1}"
        self._rasters[novo_raster_id] = np.zeros((100, 100))

        return {
            "raster_id": novo_raster_id,
            "metodo": metodo_interpolacao,
            "resolucao": resolucao_interpolacao,
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
        if camada_id not in self._camadas:
            raise ValueError(f"Camada {camada_id} não encontrada")

        gdf = self._camadas[camada_id].copy()

        if atributo_agregacao:
            resultado = gdf.groupby(campo_unidade)[atributo_agregacao].agg(funcao_agregacao)
        else:
            resultado = gdf.groupby(campo_unidade).count()

        nova_camada_id = f"camada_{len(self._camadas) + 1}"
        # Converter de volta para GeoDataFrame se necessário
        self._camadas[nova_camada_id] = gdf

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
    ) -> dict[str, Any]:
        """Exporta raster."""
        if raster_id not in self._rasters:
            raise ValueError(f"Raster {raster_id} não encontrado")

        raster = self._rasters[raster_id]

        if opcao_salvamento == "persistir_sistema":
            caminho_completo = f"data/geoespacial/{nome_arquivo}"
            Path(caminho_completo).parent.mkdir(parents=True, exist_ok=True)
            # TODO: Implementar exportação com rasterio
            return {"caminho": caminho_completo, "formato": formato_saida}
        else:
            # Retornar array como JSON
            return {
                "raster_data": raster.tolist(),
                "shape": raster.shape,
                "formato": "array",
            }


geoespacial_service = GeoespacialService()
