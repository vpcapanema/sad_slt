"""Rotas da integração SEI-SP; a sessão é isolada pelo login SICARD."""
from __future__ import annotations

from contextlib import contextmanager

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import ValidationError

from api.deps.auth import require_authenticated, require_operator
from api.exceptions import AuthError, DatabaseUnavailableError, DemandaValidationError
from api.schemas.demanda import DemandaCreateSchema
from api.schemas.plano import PlanoCreateSchema
from api.schemas.programa import ProgramaCreateSchema
from api.schemas.sei_integracao import (
    SeiConectarSchema, SeiCriarDemandaSchema, SeiListarProcessosResponseSchema,
    SeiLoginFormSchema, SeiStatusSchema,
)
from api.services import demanda_service, plano_service, programa_service, sei_integracao_service as sei
from api.services.session_service import SessionUser, cookie_name

router = APIRouter(prefix='/sei', tags=['sei-integracao'])


def _key(request, user):
    token = request.cookies.get(cookie_name()) or request.headers.get('authorization', '').removeprefix('Bearer ').strip()
    return sei.session_key(user.id, token)


@contextmanager
def _errors():
    try:
        yield
    except AuthError as exc:
        # 401 fica reservado à sessão SICARD; não manda o usuário para seu login.
        raise HTTPException(409, str(exc)) from exc
    except sei.SeiPortalError as exc:
        raise HTTPException(503, str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, 'O serviço SEI ou o armazenamento está indisponível. Tente novamente.') from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(422, detail=[{'loc': e['loc'], 'msg': e['msg'], 'type': e['type']} for e in exc.errors()]) from exc


@router.get('/login-form', response_model=SeiLoginFormSchema)
async def obter_formulario_login(tipo_login: str, request: Request, user: SessionUser = Depends(require_authenticated)):
    if tipo_login not in ('interno', 'externo'):
        raise HTTPException(422, "tipo_login deve ser 'interno' ou 'externo'.")
    with _errors():
        return await sei.obter_formulario_login(tipo_login, _key(request, user))


@router.post('/conectar', response_model=SeiStatusSchema)
async def conectar(body: SeiConectarSchema, request: Request, user: SessionUser = Depends(require_authenticated)):
    with _errors():
        await sei.conectar(usuario_sicard_id=user.id, key=_key(request, user), **body.model_dump())
        return sei.status(user.id, _key(request, user))


@router.get('/status', response_model=SeiStatusSchema)
async def status(request: Request, user: SessionUser = Depends(require_authenticated)):
    return sei.status(user.id, _key(request, user))


@router.post('/desconectar')
async def desconectar(request: Request, esquecer_credencial: bool = False, user: SessionUser = Depends(require_authenticated)):
    with _errors():
        sei.desconectar(user.id, key=_key(request, user), esquecer_credencial=esquecer_credencial)
    return {'ok': True}


@router.get('/processos', response_model=SeiListarProcessosResponseSchema)
async def listar_processos(request: Request, user: SessionUser = Depends(require_authenticated)):
    with _errors():
        return await sei.listar_processos_sei(_key(request, user))


@router.get('/processo')
async def obter_processo(numero: str, request: Request, user: SessionUser = Depends(require_authenticated)):
    with _errors():
        return await sei.obter_processo(_key(request, user), numero)


@router.post('/processos/{numero:path}/criar-demanda')
async def criar_demanda_de_processo(numero: str, body: SeiCriarDemandaSchema, request: Request, user: SessionUser = Depends(require_operator)):
    with _errors():
        state = sei._active(_key(request, user))
        async with state.lock:
            if numero not in state.processos:
                raise DemandaValidationError('Selecione um processo consultado nesta sessão SEI.')
            if numero in state.criados:
                return state.criados[numero]
            campos = dict(body.campos)
            # Reusa as tabelas normais; origem legível permanece na descrição.
            origem = f'Processo SEI: {numero}'
            descricao = (campos.get('descricao') or '').strip()
            campos['descricao'] = descricao if origem in descricao else f'{origem}\n\n{descricao}'
            campos.pop('status', None)
            if body.tipo_demanda == 'plano':
                resultado = plano_service.criar_plano(PlanoCreateSchema.model_validate(campos), origem='SEI')
            elif body.tipo_demanda == 'programa':
                resultado = programa_service.criar_programa(ProgramaCreateSchema.model_validate(campos), origem='SEI')
            else:
                resultado = demanda_service.criar_demanda(DemandaCreateSchema.model_validate(campos), origem='SEI')
            state.criados[numero] = resultado
            return resultado
