import json
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field, model_validator

from api.deps.auth import require_geospatial_access
from api.services import extracao_atributos as service
from api.services.extracao_atributos_regras import ConfigEntrada, Finalidade, RegraBase
from api.services.session_service import SessionUser

router = APIRouter(prefix='/extracao-atributos',dependencies=[Depends(require_geospatial_access)])
from api.routers.municipal_layer import router as municipal_router
router.include_router(municipal_router)
from api.routers.storage_upload_web import router as storage_upload_router
router.include_router(storage_upload_router)


@router.post('/entrada-local')
async def validar_entrada_local(request: Request, nome: str = Query(min_length=1, max_length=200),
                               camada: str | None = Query(default=None, max_length=1000)):
    from starlette.concurrency import run_in_threadpool
    from api.services import extracao_entrada_local as local
    conteudo = bytearray()
    async for parte in request.stream():
        if len(conteudo) + len(parte) > local.MAX_ARQUIVO:
            raise HTTPException(413, 'O arquivo excede o limite de 16 MB para leitura em memória.')
        conteudo.extend(parte)
    try:
        resultado = await run_in_threadpool(local.previa, bytes(conteudo), nome, camada)
        return Response(json.dumps(resultado, ensure_ascii=False), media_type='application/json',
                        headers={'Cache-Control': 'no-store'})
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post('/entrada-local/jobs', status_code=202)
async def iniciar_previa(request: Request, nome: str = Query(min_length=1, max_length=200),
                        user: SessionUser = Depends(require_geospatial_access)):
    from api.services import entrada_previa_jobs as jobs
    from api.services.extracao_entrada_local import MAX_ARQUIVO
    conteudo = bytearray()
    async for parte in request.stream():
        if len(conteudo)+len(parte) > MAX_ARQUIVO:
            raise HTTPException(413, 'O arquivo excede o limite de 16 MB para leitura em memória.')
        conteudo.extend(parte)
    try:
        return jobs.iniciar(bytes(conteudo), nome, user.id)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get('/entrada-local/jobs/{ident}')
def status_previa(ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import entrada_previa_jobs as jobs
    try:
        return Response(json.dumps(jobs.obter(ident, user.id), ensure_ascii=False),
                        media_type='application/json', headers={'Cache-Control': 'no-store'})
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.post('/entrada-local/jobs/{ident}/cancelar')
def cancelar_previa(ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import entrada_previa_jobs as jobs
    try:
        return jobs.cancelar(ident, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


class ArquivoLocal(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    camada: str | None = Field(default=None, max_length=1000)
    camadas: list[str] | None = Field(default=None, min_length=1, max_length=2000)
    conteudo_base64: str = Field(min_length=1, max_length=22369624, repr=False)


class Categoria(BaseModel):
    id: str = Field(min_length=1,max_length=50)
    camadas: list[str] = Field(min_length=1,max_length=50)
    # Regra por camada (id -> regra); camada sem regra usa o padrão.
    regras: dict[str, RegraBase] = Field(default_factory=dict,max_length=50)

    @model_validator(mode='after')
    def _regras_de_camadas_da_categoria(self):
        sobrando = set(self.regras) - set(self.camadas)
        if sobrando:
            raise ValueError('Regra informada para camada que não está nesta categoria.')
        return self


class NovaPasta(BaseModel):
    caminho: str = Field(min_length=1,max_length=1000)
    nome: str = Field(min_length=1,max_length=120)


class ArquivoMapa(BaseModel):
    arquivo: str | None = Field(default=None,min_length=1,max_length=1000)
    # Obrigatório para camadas do storage, cujo arquivo pode ter várias camadas.
    id: str | None = Field(default=None,max_length=1200)

    @model_validator(mode='after')
    def _origem_obrigatoria(self):
        if not self.id and not self.arquivo:
            raise ValueError('Selecione uma camada do catálogo ou um arquivo.')
        return self


@router.post('/arquivo-mapa')
def arquivo_mapa(payload: ArquivoMapa):
    try:
        if payload.id and payload.id.startswith('storage:'):
            from api.services.storage_geoespacial import ler_para_mapa
            return ler_para_mapa(payload.id)
        if payload.id:
            return service.camada_para_mapa(payload.id)
        from api.services.visualizacao_arquivo import ler_arquivo
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


class EntradaExtracao(BaseModel):
    id: str = Field(min_length=1,max_length=1200)
    config: ConfigEntrada = ConfigEntrada()


class Configuracao(BaseModel):
    nome: str = Field(min_length=1,max_length=120)
    categorias: list[Categoria] = Field(default_factory=list,max_length=30)
    # Guardadas junto com as bases para repetir a análise inteira (versão 3).
    entradas: list[EntradaExtracao] = Field(default_factory=list,max_length=10)
    finalidades: list[Finalidade] = Field(default_factory=list,max_length=20)
    escopo: Literal['analise','bases'] = 'analise'
    chave_lista: str | None = Field(default=None, max_length=80)
    categoria_ativa: str = Field(default='',max_length=120)
    operacao: Literal['','intersection','identity','enriquecimento','estatisticas'] = 'intersection'
    opcoes: dict[str, bool] = Field(default_factory=dict)
    nome_saida: str = Field(default='',max_length=200)


@router.get('/configuracoes')
def listar_configuracoes():
    from api.services import configuracao_bancada as configuracao
    return {'pasta': configuracao.PASTA, 'configuracoes': configuracao.listar()}


@router.post('/configuracoes',status_code=201)
def salvar_configuracao(payload: Configuracao, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import configuracao_bancada as configuracao
    try:
        return configuracao.salvar(payload.nome,[g.model_dump() for g in payload.categorias],user,
                                   [e.model_dump() for e in payload.entradas],
                                   [f.model_dump() for f in payload.finalidades],
                                   operacao=payload.operacao,opcoes=payload.opcoes,nome_saida=payload.nome_saida,
                                   escopo=payload.escopo,categoria_ativa=payload.categoria_ativa,chave_lista=payload.chave_lista)
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    except OSError as exc:
        raise HTTPException(403,'Não foi possível gravar a configuração no storage.') from exc


@router.get('/configuracoes/{chave}')
def abrir_configuracao(chave: str, lista: bool = False):
    from api.services import configuracao_bancada as configuracao
    try:
        return configuracao.carregar(chave, referencias=lista)
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
    entradas_locais: dict[str, ArquivoLocal] = Field(default_factory=dict, max_length=10)
    bases_locais: dict[str, ArquivoLocal] = Field(default_factory=dict, max_length=20)
    arquivo_local: ArquivoLocal | None = None
    input_id: str = Field(min_length=1,max_length=1200)
    nome_saida: str = Field(default='',max_length=200)
    # intersection/identity: modo sobreposição (uma linha por interseção).
    # enriquecimento: um registro por feição, com as regras de cada base.
    operacao: Literal['intersection','identity','enriquecimento','estatisticas']
    opcoes: OpcoesOverlay = OpcoesOverlay()
    categorias: list[Categoria] = Field(min_length=1,max_length=30)
    # Só no enriquecimento: entradas adicionais e configuração de cada entrada
    # (identificador, filtro, campos), e recortes de campos por finalidade.
    entradas: list[EntradaExtracao] = Field(default_factory=list,max_length=10)
    finalidades: list[Finalidade] = Field(default_factory=list,max_length=20)

    @model_validator(mode='after')
    def _entradas_unicas(self):
        if self.input_id.startswith('local:') != bool(self.arquivo_local):
            raise ValueError('A entrada local exige o arquivo em memória. Selecione o arquivo novamente.')
        ids = [entrada.id for entrada in self.entradas]
        if len(ids) != len(set(ids)):
            raise ValueError('A mesma camada aparece duas vezes nas entradas.')
        if self.operacao not in ('enriquecimento', 'estatisticas') and (self.entradas or self.finalidades):
            raise ValueError('Entradas configuráveis e finalidades exigem o modo enriquecimento.')
        return self


@router.get('/catalogo')
def catalogo():
    return service.catalogo()


@router.get('/execucoes')
def listar_execucoes(user: SessionUser = Depends(require_geospatial_access)):
    """Extrações anteriores com pacote: as próprias; gestor e administrador veem todas."""
    return service.listar_execucoes(user)


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


class RenomearExtracao(BaseModel):
    nome_saida: str = Field(min_length=1,max_length=200)


@router.get('/execucoes/{ident}/tabela')
def tabela_resultado(ident: UUID, camada: str = Query(default='resultado',max_length=200),
                    offset: int = Query(default=0,ge=0), limite: int = Query(default=100,ge=1,le=1000),
                    user: SessionUser = Depends(require_geospatial_access)):
    try:
        return service.tabela_resultado(ident,user,camada,offset,limite)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc


@router.patch('/execucoes/{ident}')
def renomear(ident: UUID, payload: RenomearExtracao, user: SessionUser = Depends(require_geospatial_access)):
    try:
        return service.renomear_execucao(ident,user,payload.nome_saida)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc


@router.delete('/execucoes/{ident}',status_code=204)
def excluir(ident: UUID, user: SessionUser = Depends(require_geospatial_access)):
    try:
        service.excluir_execucao(ident,user)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc
    return Response(status_code=204)


@router.get('/execucoes/{ident}/pacote')
def baixar_pacote(ident: UUID, user: SessionUser = Depends(require_geospatial_access)):
    """O pacote .zip da extração, lido do banco. Os arquivos não são baixados avulsos."""
    try:
        conteudo, nome = service.arquivo_do_pacote(ident,user,'zip')
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc
    return Response(conteudo,media_type='application/zip',
                    headers={'Content-Disposition':f'attachment; filename="{nome}"','Cache-Control':'no-store'})


@router.get('/execucoes/{ident}/relatorios/{tipo}')
def ver_relatorio(ident: UUID, tipo: Literal['processamento','analitico'],
                  user: SessionUser = Depends(require_geospatial_access)):
    """Relatório do pacote aberto (inline) para ser renderizado pelo navegador."""
    try:
        conteudo, nome = service.arquivo_do_pacote(ident,user,f'pdf_{tipo}')
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc
    return Response(conteudo,media_type='application/pdf',
                    headers={'Content-Disposition':f'inline; filename="{nome}"','Cache-Control':'no-store'})


@router.post('/execucoes/{ident}/cancelar',status_code=202)
def cancelar(ident: UUID, user: SessionUser = Depends(require_geospatial_access)):
    try:
        return service.cancelar(ident,user)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409,str(exc)) from exc
