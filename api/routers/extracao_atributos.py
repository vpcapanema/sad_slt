from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from api.deps.auth import require_geospatial_access
from api.services import extracao_atributos as service
from api.services.session_service import SessionUser

router = APIRouter(prefix='/extracao-atributos',dependencies=[Depends(require_geospatial_access)])
from api.routers.municipal_layer import router as municipal_router
router.include_router(municipal_router)


class Categoria(BaseModel):
    id: str = Field(min_length=1,max_length=50)
    camadas: list[str] = Field(min_length=1,max_length=50)


class NovaPasta(BaseModel):
    caminho: str = Field(min_length=1,max_length=1000)
    nome: str = Field(min_length=1,max_length=120)


class ArquivoMapa(BaseModel):
    arquivo: str = Field(min_length=1,max_length=1000)


@router.post('/arquivo-mapa')
def arquivo_mapa(payload: ArquivoMapa):
    from api.services.visualizacao_arquivo import ler_arquivo
    try:
        return ler_arquivo(payload.arquivo)
    except FileNotFoundError as exc:
        raise HTTPException(404,str(exc)) from exc
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422,str(exc)) from exc


@router.post('/pastas',status_code=201)
def criar_pasta(payload: NovaPasta):
    from api.services.pastas_geoespaciais import criar_pasta as criar
    try:
        return criar(payload.caminho,payload.nome)
    except FileExistsError as exc:
        raise HTTPException(409,'Já existe um arquivo ou pasta com esse nome.') from exc
    except FileNotFoundError as exc:
        raise HTTPException(404,'Pasta de destino não encontrada.') from exc
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    except OSError as exc:
        raise HTTPException(403,'Não foi possível criar a pasta neste destino.') from exc


@router.patch('/pastas')
def renomear_pasta(payload: NovaPasta):
    from api.services.pastas_geoespaciais import renomear_pasta as renomear
    try:
        return renomear(payload.caminho,payload.nome)
    except FileExistsError as exc:
        raise HTTPException(409,'Já existe um arquivo ou pasta com esse nome.') from exc
    except FileNotFoundError as exc:
        raise HTTPException(404,'Pasta não encontrada.') from exc
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    except OSError as exc:
        raise HTTPException(403,'Não foi possível renomear a pasta.') from exc


class Configuracao(BaseModel):
    nome: str = Field(min_length=1,max_length=120)
    categorias: list[Categoria] = Field(min_length=1,max_length=30)


@router.get('/configuracoes')
def listar_configuracoes():
    from api.services import configuracao_bancada as configuracao
    return {'pasta': configuracao.PASTA, 'configuracoes': configuracao.listar()}


@router.post('/configuracoes',status_code=201)
def salvar_configuracao(payload: Configuracao, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import configuracao_bancada as configuracao
    try:
        return configuracao.salvar(payload.nome,[g.model_dump() for g in payload.categorias],user)
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    except OSError as exc:
        raise HTTPException(403,'Não foi possível gravar a configuração no storage.') from exc


@router.get('/configuracoes/{chave}')
def abrir_configuracao(chave: str):
    from api.services import configuracao_bancada as configuracao
    try:
        return configuracao.carregar(chave)
    except FileNotFoundError as exc:
        raise HTTPException(404,str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc


@router.delete('/configuracoes/{chave}',status_code=204)
def apagar_configuracao(chave: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import configuracao_bancada as configuracao
    try:
        configuracao.excluir(chave)
    except FileNotFoundError as exc:
        raise HTTPException(404,str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc


class OpcoesOverlay(BaseModel):
    """Opções do operador de overlay do OGR, escolhidas na seção de execução."""
    promover_multipartes: bool = True
    manter_dimensoes_menores: bool = False
    ignorar_falhas: bool = False
    geometrias_preparadas: bool = True
    pretestar_continencia: bool = False


class Extracao(BaseModel):
    input_id: str = Field(min_length=1,max_length=100)
    operacao: Literal['intersection','identity'] = 'intersection'
    opcoes: OpcoesOverlay = OpcoesOverlay()
    categorias: list[Categoria] = Field(min_length=1,max_length=30)


@router.get('/catalogo')
def catalogo():
    return service.catalogo()


@router.post('/execucoes',status_code=202)
def executar(payload: Extracao, user: SessionUser = Depends(require_geospatial_access)):
    try:
        return service.iniciar(payload.model_dump(),user)
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc


@router.get('/execucoes/{ident}')
def consultar(ident: UUID, user: SessionUser = Depends(require_geospatial_access)):
    try:
        return service.consultar(ident,user,completo=True)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc


@router.get('/execucoes/{ident}/exportar/{formato}')
def exportar(ident: UUID, formato: Literal['pdf','xlsx','csv','gpkg','geojson'], user: SessionUser = Depends(require_geospatial_access)):
    try:
        state = service.consultar(ident,user,completo=True)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc
    if state['status'] != 'concluido':
        raise HTTPException(409,'A análise ainda não foi concluída.')
    from api.services.extracao_atributos_exportacao import exportar as gerar
    try:
        path = gerar(state['resultado'],formato)
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    return FileResponse(path,filename=f'extracao-{ident}.{formato}')
