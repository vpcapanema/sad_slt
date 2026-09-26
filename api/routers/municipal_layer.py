from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from api.deps.auth import require_geospatial_access
from api.services import municipal_layer as service
from api.services.session_service import SessionUser

router = APIRouter(prefix='/municipal', dependencies=[Depends(require_geospatial_access)])


class Selecao(BaseModel):
    attributes: list[str] = Field(min_length=1, max_length=6500)
    format: Literal['fgb', 'gpkg', 'shp', 'geojson'] = 'fgb'
    nome: str = Field(default='', max_length=200)


def invoke(fn, *args):
    try:
        return fn(*args)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get('/categorias')
def categorias():
    return {'categorias': service.categorias()}


@router.get('/catalog')
def catalog_comum():
    return invoke(service.catalogo)


@router.post('/preview')
def preview_comum(body: Selecao):
    return invoke(service.previa, None, body.model_dump())


@router.get('/{categoria}/catalog')
def catalog(categoria: str):
    return invoke(service.catalogo, categoria)


@router.post('/{categoria}/preview')
def preview(categoria: str, body: Selecao):
    return invoke(service.previa, categoria, body.model_dump())


@router.post('/{categoria}/export')
def export(categoria: str, body: Selecao, user: SessionUser = Depends(require_geospatial_access)):
    package, result = invoke(service.gerar, categoria, body.model_dump(exclude={'nome'}), body.nome, user)
    return Response(package, media_type='application/zip', headers={
        'X-Camada-Arquivo': result['arquivo'], 'X-Camada-Id': result['id'],
        'Cache-Control': 'no-store'})


@router.post('/{categoria}/jobs',status_code=202)
def iniciar_job(categoria: str, body: Selecao, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import municipal_jobs
    return invoke(municipal_jobs.iniciar,categoria,body.model_dump(),user)


@router.get('/{categoria}/jobs/{ident}')
def consultar_job(categoria: str, ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import municipal_jobs
    try:
        return municipal_jobs.consultar(ident,user)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc


@router.post('/{categoria}/jobs/{ident}/cancelar',status_code=202)
def cancelar_job(categoria: str, ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import municipal_jobs
    try:
        return municipal_jobs.cancelar(ident,user)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409,str(exc)) from exc


@router.get('/{categoria}/jobs/{ident}/pacote')
def pacote_job(categoria: str, ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import municipal_jobs
    try:
        package,result=municipal_jobs.pacote(ident,user)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409,str(exc)) from exc
    return Response(package,media_type='application/zip',headers={
        'X-Camada-Arquivo':result['arquivo'],'X-Camada-Id':result['id'],'Cache-Control':'no-store'})
