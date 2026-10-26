"""Preparação, persistência e cálculo das superfícies de critérios da Fase 2."""
import logging
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from api.deps.auth import require_analyst
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.services import superficie_criterios as service
from api.services.session_service import SessionUser
from api.services.storage_remoto import StorageIndisponivel

router = APIRouter(prefix='/ahp/superficies-criterios', dependencies=[Depends(require_analyst)])
logger = logging.getLogger(__name__)


class Criterio(BaseModel):
    atributo_id: str = Field(min_length=1, max_length=200)
    dimensao: str = Field(min_length=1, max_length=100)
    relacao: Literal['positiva', 'negativa']


class Preparacao(BaseModel):
    hierarquizacao_id: UUID
    nome: str = Field(min_length=1, max_length=200, pattern=r'\S')
    territorialidade: Literal['municipios', 'setores_2022']
    criterios: list[Criterio] = Field(min_length=1, max_length=100)


class Calculo(BaseModel):
    operador: Literal['media_simples', 'ahp']
    pesos: dict[str, float] | None = None
    matriz: list[list[float]] | None = None
    ambiente_id: str | None = None


def invoke(fn, *args):
    try:
        return fn(*args)
    except (ValueError, DemandaValidationError) as exc:
        raise HTTPException(422, str(exc)) from exc
    except (DatabaseUnavailableError, StorageIndisponivel, OSError) as exc:
        logger.exception('Falha na operação de superfície de critérios')
        raise HTTPException(503, 'Não foi possível acessar o banco ou a camada no Storage. Nenhum resultado deve ser considerado confirmado; atualize a lista antes de repetir.') from exc


@router.get('/catalogo')
def catalogo(territorialidade: Literal['municipios', 'setores_2022'] = 'municipios'):
    return invoke(service.catalogo, territorialidade)


@router.get('')
def listar(hierarquizacao_id: UUID, user: SessionUser = Depends(require_analyst)):
    return invoke(service.listar, hierarquizacao_id, user)


@router.post('', status_code=201)
def salvar(body: Preparacao, user: SessionUser = Depends(require_analyst)):
    return invoke(service.salvar, body.model_dump(mode='json'), user)


@router.get('/{ident}')
def obter(ident: UUID, user: SessionUser = Depends(require_analyst)):
    return invoke(service.obter, ident, user)


@router.post('/{ident}/calcular')
def calcular(ident: UUID, body: Calculo, user: SessionUser = Depends(require_analyst)):
    return invoke(service.calcular, ident, body.model_dump(), user)


@router.get('/{ident}/mapa')
def mapa(ident: UUID, campo: str, user: SessionUser = Depends(require_analyst)):
    return invoke(service.visualizar, ident, user, campo)


@router.get('/{ident}/matriz.xlsx')
def matriz(ident: UUID, user: SessionUser = Depends(require_analyst)):
    row = invoke(service.obter, ident, user)
    return Response(service.matriz_excel(row),
                    media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    headers={'Content-Disposition': 'attachment; filename="matriz_fase2.xlsx"'})


@router.get('/{ident}/camada.gpkg')
def exportar(ident: UUID, indice: bool = False, user: SessionUser = Depends(require_analyst)):
    return Response(invoke(service.exportar, ident, user, indice),
                    media_type='application/geopackage+sqlite3',
                    headers={'Content-Disposition': 'attachment; filename="superficie_fase2.gpkg"'})
