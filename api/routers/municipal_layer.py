from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from api.deps.auth import require_geospatial_access
from api.services import municipal_layer as service
from api.services.session_service import SessionUser

router = APIRouter(prefix='/municipal', dependencies=[Depends(require_geospatial_access)])


class Selecao(BaseModel):
    attributes: list[str] = Field(min_length=1, max_length=6500)
    format: Literal['fgb', 'gpkg', 'shp'] = 'fgb'
    nome: str = Field(default='', max_length=200)


def invoke(fn, *args):
    try:
        return fn(*args)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(422, str(exc)) from exc


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
