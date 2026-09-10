from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.deps.auth import require_geospatial_access
from api.services import bancada_arquivos as service
from api.services.session_service import SessionUser

router = APIRouter(prefix='/bancada-arquivos', dependencies=[Depends(require_geospatial_access)])


class Arquivo(BaseModel):
    arquivo: str = Field(min_length=1, max_length=1000)
    revisao: str = Field(min_length=64, max_length=64)


class Edicao(Arquivo):
    geojson: dict
    nome: str = Field(min_length=1, max_length=200)


class Operacao(BaseModel):
    operacao: str
    parametros: dict
    arquivos: dict[str, Arquivo]


def resposta(fn, *args):
    try:
        return fn(*args)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, RuntimeError, KeyError, TypeError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post('/salvar')
def salvar(payload: Edicao, user: SessionUser = Depends(require_geospatial_access)):
    return resposta(service.salvar, payload.arquivo, payload.revisao, payload.geojson, payload.nome, user)


@router.post('/executar')
def executar(payload: Operacao, user: SessionUser = Depends(require_geospatial_access)):
    return resposta(service.executar, payload.operacao, payload.parametros,
                    {key: value.model_dump() for key, value in payload.arquivos.items()}, user)
