"""Sanity test do OP-CLASS: aplica a regra sobre uma camada seed
para validar que a integração service+banco+regra funciona.
Usa a camada uf_sp já disponível em outputs/vetor/uf_sp.shp e o critério
'uc_pi_federal' (fallback True → risco 3) para gerar um resultado previsível.
"""
from __future__ import annotations
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import geopandas as gpd
from api.services.geoespacial_service import geoespacial_service


async def main() -> None:
    shp = Path(__file__).resolve().parents[1] / "data" / "geoespacial" / "outputs" / "vetor" / "uf_sp.shp"
    gdf = gpd.read_file(shp)
    cid = geoespacial_service.registrar_camada(gdf, "uf_sp seed", "SANITY")
    print("camada seed:", cid, "feicoes:", len(gdf))

    resultado = await geoespacial_service.classificar_por_feicao_fase1(
        cid, criterio_id="uc_pi_federal", fonte_id="mma_cnuc_pi_federal"
    )
    print("resultado OP-CLASS:", resultado)

    novo = geoespacial_service.obter_camada_dados(resultado["camada_id"])
    print("colunas de controle presentes:")
    for col in ("criterio_id", "tipo_tratamento", "severidade", "base_legal", "fonte_id", "feicao_origem_id"):
        assert col in novo.columns, f"faltou {col}"
        print(f"  {col}: {novo[col].iloc[0]}")


if __name__ == "__main__":
    asyncio.run(main())
