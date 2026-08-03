"""Service — Módulo Geoespacial."""
from __future__ import annotations

import json
import base64
import re
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

from api.path_policy import (
    geo_output_path,
    project_path,
    project_relative,
)
from api.repositories import camada_geoespacial_repository


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
        cached = self._camadas.get(camada_id)
        if cached is not None:
            return cached
        loaded = camada_geoespacial_repository.carregar_vetor(camada_id)
        if loaded is None:
            raise ValueError(f"Camada {camada_id} não encontrada")
        gdf, _ = loaded
        self._camadas[camada_id] = gdf
        self._catalogar_persistidas()
        return gdf

    def obter_raster_dados(self, raster_id: str) -> np.ndarray:
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
        geojson = camada_geoespacial_repository.carregar_vetor_geojson(camada_id)
        if geojson is None:
            alias = camada_geoespacial_repository.resolver_recurso_id(camada_id)
            if alias and alias != camada_id:
                camada_id = alias
                geojson = camada_geoespacial_repository.carregar_vetor_geojson(camada_id)
        if geojson is None and camada_id in self._camadas:
            return cast(dict[str, Any], self._camadas[camada_id].__geo_interface__)
        if geojson is None:
            raise ValueError(f"Camada vetorial {camada_id} não encontrada")
        return geojson

    async def atributos_camada(self, camada_id: str, limite: int = 100, offset: int = 0) -> dict[str, Any]:
        gdf = self.obter_camada_dados(camada_id).copy()
        dados = gdf.drop(columns=[gdf.geometry.name], errors="ignore").iloc[offset:offset + limite]
        dados = dados.where(dados.notna(), None)
        return {
            "camada_id": camada_id,
            "colunas": [{"nome": c, "tipo": str(dados[c].dtype)} for c in dados.columns],
            "registros": dados.to_dict(orient="records"),
            "total": len(gdf),
            "offset": offset,
            "limite": limite,
        }

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

    async def consultar_por_atributo(self, camada_id: str, expressao: str) -> dict[str, Any]:
        """Retorna as feições que atendem a uma expressão atributiva."""
        gdf = self.obter_camada_dados(camada_id).copy()
        try:
            selecionadas = gdf.query(expressao, engine="python")
        except Exception as exc:
            raise ValueError(f"Consulta inválida: {exc}") from exc
        if selecionadas.crs and not selecionadas.crs.equals("EPSG:4326"):
            selecionadas = selecionadas.to_crs("EPSG:4326")
        return {"camada_id": camada_id, "total": len(selecionadas), "geojson": json.loads(selecionadas.to_json())}

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
        """Sobrepõe camadas com operação de overlay."""
        gdf1 = self.obter_camada_dados(camada_id_1)
        gdf2 = self.obter_camada_dados(camada_id_2)
        if gdf1.crs and gdf2.crs and gdf1.crs != gdf2.crs:
            gdf2 = gdf2.to_crs(gdf1.crs)

        # Executar overlay
        resultado = gpd.overlay(gdf1, gdf2, how=tipo_overlay)

        # Resolver conflitos de campos
        if resolver_conflitos_campos:
            cols_comuns = set(gdf1.columns) & set(gdf2.columns) - {"geometry"}
            for col in cols_comuns:
                resultado[f"{camada_id_1}__{col}"] = resultado[col + "_1"]
                resultado[f"{camada_id_2}__{col}"] = resultado[col + "_2"]
                resultado = resultado.drop(columns=[col + "_1", col + "_2"])

        nova_camada_id = self.registrar_camada(resultado, f"Overlay {tipo_overlay}", "OP-05")

        return {
            "camada_id": nova_camada_id,
            "feicoes": len(resultado),
            "tipo_overlay": tipo_overlay,
        }

    async def classificar_por_feicao_fase1(
        self,
        camada_id: str,
        criterio_id: str,
        fonte_id: str | None = None,
    ) -> dict[str, Any]:
        """Aplica regras da tabela geoprocessamento.regra_classificacao_fase1
        sobre cada feição da camada. Escreve os campos de controle:
        criterio_id, tipo_tratamento, severidade, base_legal, fonte_id, feicao_origem_id.
        A primeira regra ativa (menor ordem) cujo expressao avaliar True vence."""
        from api.db.connection import get_connection

        gdf = self.obter_camada_dados(camada_id).copy()
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT ordem, expressao, tipo_tratamento_resultante, severidade, base_legal "
                    "FROM geoprocessamento.regra_classificacao_fase1 "
                    "WHERE criterio_id = %s AND ativo = TRUE "
                    "ORDER BY ordem ASC",
                    (criterio_id,),
                )
                regras = cur.fetchall()
        if not regras:
            raise ValueError(
                f"Nenhuma regra ativa encontrada para critério '{criterio_id}'. "
                "Cadastre em geoprocessamento.regra_classificacao_fase1."
            )

        tipos = np.array(["risco"] * len(gdf), dtype=object)
        severidades = np.full(len(gdf), 2, dtype=int)
        bases = np.array([""] * len(gdf), dtype=object)
        pendentes = np.ones(len(gdf), dtype=bool)
        for regra in regras:
            if not pendentes.any():
                break
            expressao = str(regra["expressao"]).strip()
            try:
                if expressao == "True":
                    mask_expr = np.ones(len(gdf), dtype=bool)
                else:
                    idx = gdf.query(expressao).index
                    mask_expr = gdf.index.isin(idx)
            except Exception:
                # expressão inválida ou coluna ausente = regra não casa nesta camada
                continue
            aplicar = mask_expr & pendentes
            if not aplicar.any():
                continue
            tipos[aplicar] = regra["tipo_tratamento_resultante"]
            severidades[aplicar] = int(regra["severidade"])
            bases[aplicar] = regra["base_legal"]
            pendentes &= ~aplicar

        gdf["criterio_id"] = criterio_id
        gdf["tipo_tratamento"] = tipos
        gdf["severidade"] = severidades
        gdf["base_legal"] = bases
        gdf["fonte_id"] = fonte_id or criterio_id
        gdf["feicao_origem_id"] = [f"{camada_id}#{i}" for i in range(len(gdf))]

        nova = self.registrar_camada(
            gdf, f"Classificada · {criterio_id}", "OP-CLASS"
        )
        contagem = pd.Series(tipos).value_counts().to_dict()
        return {
            "camada_id": nova,
            "criterio_id": criterio_id,
            "feicoes": len(gdf),
            "por_tipo": {str(k): int(v) for k, v in contagem.items()},
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
            caminho_completo = geo_output_path(
                nome_arquivo, categoria="vetor", label="nome do arquivo",
            )
            caminho_relativo = Path(project_relative(caminho_completo))
            if progress:
                progress("Destino único de saída preparado (vetor)")
            gdf.to_file(caminho_completo, driver=driver)
            if progress:
                progress("Arquivo vetorial serializado")
            return {"caminho": caminho_relativo.as_posix(), "formato": formato_saida}
        else:
            # Retornar GeoJSON para memória
            geojson = json.loads(gdf.to_json())
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
            caminho_completo = geo_output_path(
                nome_arquivo, categoria="raster", label="nome do arquivo",
            )
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
            return {"caminho": caminho_relativo.as_posix(), "formato": formato_saida}
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
        na subpasta correta dentro de ``data/geoespacial/outputs`` — destino
        único de saídas geoprocessadas (``vetor``, ``raster`` ou ``geodatabase``).
        A categoria do dado é determinada pela natureza do recurso em memória
        e validada contra a extensão do arquivo ANTES de qualquer I/O.
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

        caminho = geo_output_path(saida, categoria=categoria_dado, label="saída")
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

        return {"operacao": "salvar_camada", "entrada": entrada, "destino": pasta_relativa,
                "saida": caminho.name, "caminho": project_relative(caminho), "tipo": tipo,
                "categoria": categoria_dado,
                "crs": crs_final, "formato": formato_final}


geoespacial_service = GeoespacialService()
