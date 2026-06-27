"""Agregação de routers da API."""

from __future__ import annotations

from fastapi import APIRouter

from api.routers.auth import router as auth_router
from api.routers.configuracoes import router as configuracoes_router
from api.routers.demandas import router as demandas_router
from api.routers.dominios import router as dominios_router
from api.routers.geo import router as geo_router
from api.routers.geometria import router as geometria_router
from api.routers.health import router as health_router
from api.routers.hierarquizacoes import router as hierarquizacoes_router
from api.routers.objetos_ahp import router as objetos_ahp_router
from api.routers.painel import router as painel_router
from api.routers.planos import router as planos_router
from api.routers.programas import router as programas_router
from api.routers.sigma import router as sigma_router
from api.routers.universo import router as universo_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(sigma_router)
api_router.include_router(geometria_router)
api_router.include_router(geo_router)
api_router.include_router(dominios_router)
api_router.include_router(demandas_router)
api_router.include_router(painel_router)
api_router.include_router(planos_router)
api_router.include_router(programas_router)
api_router.include_router(objetos_ahp_router)
api_router.include_router(configuracoes_router)
api_router.include_router(hierarquizacoes_router)
api_router.include_router(universo_router)
