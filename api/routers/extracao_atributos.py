import json
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field, model_validator

from api.deps.auth import require_geospatial_access
from api.exceptions import DatabaseUnavailableError
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
                        original: bool = False,
                        user: SessionUser = Depends(require_geospatial_access)):
    from api.services import entrada_previa_jobs as jobs
    from api.services.extracao_entrada_local import MAX_ARQUIVO
    conteudo = bytearray()
    async for parte in request.stream():
        if len(conteudo)+len(parte) > MAX_ARQUIVO:
            raise HTTPException(413, 'O arquivo excede o limite de 16 MB para leitura em memória.')
        conteudo.extend(parte)
    try:
        return jobs.iniciar(bytes(conteudo), nome, user.id, original=original)
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


class CamadaCompatibilizacao(BaseModel):
    id: str = Field(min_length=1, max_length=1200)
    nome: str = Field(default='', max_length=200)
    papel: Literal['entrada', 'base']
    arquivo_local: ArquivoLocal | None = None
    regra: RegraBase | None = None

    @model_validator(mode='after')
    def origem(self):
        if self.id.startswith('local:') != bool(self.arquivo_local):
            raise ValueError('Uma camada local exige o arquivo original em memória.')
        return self


class Compatibilizacao(BaseModel):
    camadas: list[CamadaCompatibilizacao] = Field(min_length=1, max_length=1510)
    operacao: Literal['enriquecimento', 'estatisticas'] | None = None

    @model_validator(mode='after')
    def unicas(self):
        if len({c.id for c in self.camadas}) != len(self.camadas):
            raise ValueError('Uma camada não pode aparecer duas vezes no conjunto.')
        if sum(c.papel == 'entrada' for c in self.camadas) > 10:
            raise ValueError('Prepare até dez entradas por análise.')
        return self


@router.post('/compatibilizar')
def compatibilizar(payload: Compatibilizacao):
    from api.services.compatibilidade_espacial import conferir
    try:
        return conferir([c.model_dump() for c in payload.camadas], payload.operacao)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


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


@router.post('/preparar-camada')
def preparar_camada(payload: ArquivoMapa, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.extracao_preparacao import preparar
    try:
        if not payload.id:
            raise ValueError('Selecione uma camada do catálogo.')
        return preparar(payload.id, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get('/previa-tiles/{token}/{z}/{x}/{y}.pbf')
def previa_tile(token: str, z: int, x: int, y: int,
                user: SessionUser = Depends(require_geospatial_access)):
    from api.services.extracao_preparacao import tile
    try:
        return Response(tile(token, user.id, z, x, y), media_type='application/vnd.mapbox-vector-tile',
                        headers={'Cache-Control': 'private, max-age=300'})
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc


class DemandaBancada(BaseModel):
    id: str = Field(min_length=1, max_length=1200)
    atributos: dict = Field(default_factory=dict, max_length=100)

    @model_validator(mode='after')
    def tamanho_atributos(self):
        if len(json.dumps(self.atributos, allow_nan=False).encode('utf8')) > 100_000:
            raise ValueError('As informações da demanda excedem 100 KB.')
        return self


@router.get('/elegibilidade/parametros')
def parametros_demanda():
    from api.services.elegibilidade_preparacao import parametros
    return parametros()


@router.post('/elegibilidade/preparar-demanda')
def preparar_demanda(payload: DemandaBancada, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.elegibilidade_preparacao import preparar_demanda as preparar
    try:
        return preparar(payload.id, user.id, payload.atributos)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc


class HierarquizacaoBancada(BaseModel):
    codigo: str = Field(min_length=1, max_length=200)
    demandas: list[str] = Field(min_length=1)


@router.post('/elegibilidade/preparar-hierarquizacao')
def preparar_hierarquizacao(payload: HierarquizacaoBancada, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.elegibilidade_preparacao import preparar_hierarquizacao as preparar
    try:
        return preparar(payload.codigo, payload.demandas, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc


class CamadaElegibilidade(BaseModel):
    id: str = Field(min_length=1, max_length=1200)
    nome: str = Field(min_length=1, max_length=200)
    revisao: str | None = Field(default=None, max_length=200)


class ExecucaoElegibilidade(BaseModel):
    entrada: CamadaElegibilidade
    restricao: list[CamadaElegibilidade] = Field(default_factory=list)
    risco: list[CamadaElegibilidade] = Field(default_factory=list)
    lote_id: UUID | None = None
    total_entradas: int = Field(default=1, ge=1)
    hierarquizacao: str | None = Field(default=None, min_length=1, max_length=200)

    @model_validator(mode='after')
    def conferir_papeis(self):
        bases = self.restricao + self.risco
        if not bases:
            raise ValueError('Selecione ao menos uma base de restrição ou risco.')
        ids = [self.entrada.id, *(base.id for base in bases)]
        if len(ids) != len(set(ids)):
            raise ValueError('Uma camada não pode participar mais de uma vez ou ocupar papéis diferentes.')
        return self


@router.post('/elegibilidade/execucoes', status_code=202)
def executar_elegibilidade(payload: ExecucaoElegibilidade, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_jobs
    try:
        return elegibilidade_jobs.iniciar(payload.model_dump(), user.id)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.get('/elegibilidade/execucoes/{ident}')
def consultar_elegibilidade(ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_jobs
    try:
        return elegibilidade_jobs.consultar(ident, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/elegibilidade/execucoes/{ident}/cancelar')
def cancelar_elegibilidade(ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_jobs
    try:
        return elegibilidade_jobs.cancelar(ident, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


class ExecucaoFavorabilidade(BaseModel):
    entrada: CamadaElegibilidade
    grade: list[CamadaElegibilidade] = Field(default_factory=list)
    rede: list[CamadaElegibilidade] = Field(default_factory=list)
    lote_id: UUID | None = None
    total_entradas: int = Field(default=1, ge=1)
    hierarquizacao: str | None = Field(default=None, min_length=1, max_length=200)

    @model_validator(mode='after')
    def conferir_papeis(self):
        bases = self.grade + self.rede
        if not bases:
            raise ValueError('Selecione ao menos uma superfície poligonal de grade ou rede.')
        ids = [self.entrada.id, *(base.id for base in bases)]
        if len(ids) != len(set(ids)):
            raise ValueError('Uma camada não pode participar mais de uma vez ou ocupar papéis diferentes.')
        return self


class DemandaFavorabilidade(DemandaBancada):
    revisao: str | None = Field(default=None, min_length=1, max_length=200)


@router.post('/favorabilidade/preparar-demanda')
def preparar_demanda_favorabilidade(payload: DemandaFavorabilidade, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.elegibilidade_preparacao import preparar_demanda
    try:
        return preparar_demanda(payload.id, user.id, payload.atributos, analise='favorabilidade', revisao=payload.revisao)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post('/favorabilidade/preparar-hierarquizacao')
def preparar_hierarquizacao_favorabilidade(payload: HierarquizacaoBancada, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.elegibilidade_preparacao import preparar_hierarquizacao
    try:
        return preparar_hierarquizacao(payload.codigo, payload.demandas, user.id, analise='favorabilidade')
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post('/favorabilidade/execucoes', status_code=202)
def executar_favorabilidade(payload: ExecucaoFavorabilidade, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_jobs
    try:
        return elegibilidade_jobs.iniciar(payload.model_dump(), user.id, analise='favorabilidade')
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.get('/favorabilidade/execucoes/{ident}')
def consultar_favorabilidade(ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_jobs
    try:
        return elegibilidade_jobs.consultar(ident, user.id, analise='favorabilidade')
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/favorabilidade/execucoes/{ident}/cancelar')
def cancelar_favorabilidade(ident: str, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_jobs
    try:
        return elegibilidade_jobs.cancelar(ident, user.id, analise='favorabilidade')
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


class ReferenciasResultadosElegibilidade(BaseModel):
    execucoes: list[str] = Field(min_length=1)


@router.post('/favorabilidade/resultados/sobreposicoes')
def sobreposicoes_favorabilidade(payload: ReferenciasResultadosElegibilidade,
                                 user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_relatorio
    try:
        return elegibilidade_relatorio.sobreposicoes_favorabilidade(payload.execucoes, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


class ApresentacaoElegibilidade(ReferenciasResultadosElegibilidade):
    nomes: dict[str, str]
    revisados: bool


class ArquivoResultadosElegibilidade(BaseModel):
    arquivo: str = Field(min_length=1)

class SuperficieResultadosFavorabilidade(BaseModel):
    execucao: str = Field(min_length=1)
    base_id: str = Field(min_length=1)


class SuperficieResultadosElegibilidade(SuperficieResultadosFavorabilidade):
    bounds: list[float] = Field(min_length=4, max_length=4)
    tolerancia: float = Field(default=0, ge=0, le=.1)


@router.post('/elegibilidade/resultados/superficie')
def superficie_resultados_elegibilidade(payload: SuperficieResultadosElegibilidade,
                                        user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_relatorio
    try:
        return elegibilidade_relatorio.superficie_elegibilidade(
            payload.execucao, payload.base_id, user.id, payload.bounds, payload.tolerancia)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


class AtributosFeicaoElegibilidade(BaseModel):
    execucao: str = Field(min_length=1)
    base_id: str = Field(min_length=1)
    posicao: int = Field(ge=0)


@router.post('/elegibilidade/resultados/feicao/atributos')
def atributos_feicao_elegibilidade(payload: AtributosFeicaoElegibilidade,
                                   user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_relatorio
    try:
        return elegibilidade_relatorio.atributos_feicao(payload.execucao, payload.base_id, payload.posicao, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/favorabilidade/resultados/superficie')
def superficie_resultados_favorabilidade(payload: SuperficieResultadosFavorabilidade,
                                         user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_relatorio
    try:
        return elegibilidade_relatorio.superficie_favorabilidade(payload.execucao, payload.base_id, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


class NomeDemandaElegibilidade(BaseModel):
    execucao: str = Field(min_length=1)
    chave: str = Field(min_length=1, max_length=20)
    nome: str = Field(min_length=1, max_length=200)


@router.post('/elegibilidade/resultados/demanda/nome')
def renomear_demanda_elegibilidade(payload: NomeDemandaElegibilidade,
                                  user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_relatorio
    try:
        return elegibilidade_relatorio.renomear_demanda(payload.execucao, payload.chave, payload.nome, user.id)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/elegibilidade/resultados/abrir')
@router.post('/favorabilidade/resultados/abrir')
def abrir_resultados_elegibilidade(request: Request, payload: ArquivoResultadosElegibilidade,
                                  user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_relatorio
    try:
        opcoes = {'analise': 'favorabilidade'} if '/favorabilidade/' in request.url.path else {}
        return elegibilidade_relatorio.abrir(payload.arquivo, user.id, **opcoes)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/elegibilidade/resultados/preparar')
@router.post('/favorabilidade/resultados/preparar')
def preparar_resultados_elegibilidade(request: Request, payload: ReferenciasResultadosElegibilidade,
                                      user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_relatorio
    try:
        opcoes = {'analise': 'favorabilidade'} if '/favorabilidade/' in request.url.path else {}
        return elegibilidade_relatorio.preparar(payload.execucoes, user.id, **opcoes)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/elegibilidade/resultados/visualizar')
@router.post('/favorabilidade/resultados/visualizar')
def visualizar_resultados_elegibilidade(request: Request, payload: ApresentacaoElegibilidade,
                                       user: SessionUser = Depends(require_geospatial_access)):
    from api.services import elegibilidade_relatorio
    try:
        opcoes = {'analise': 'favorabilidade'} if '/favorabilidade/' in request.url.path else {}
        modelo, _ = elegibilidade_relatorio.montar(payload.execucoes, payload.nomes, user.id, payload.revisados, **opcoes)
        elegibilidade_relatorio.salvar_nomes(payload.execucoes, modelo, user.id, **opcoes)
        if not opcoes:
            elegibilidade_relatorio.registrar_relatorios(payload.execucoes, modelo, user.id)
        return modelo
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except (RuntimeError, DatabaseUnavailableError) as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/elegibilidade/resultados/pacote')
@router.post('/favorabilidade/resultados/pacote')
def pacote_resultados_elegibilidade(request: Request, payload: ApresentacaoElegibilidade,
                                   user: SessionUser = Depends(require_geospatial_access)):
    from urllib.parse import quote
    from api.services import elegibilidade_relatorio
    try:
        opcoes = {'analise': 'favorabilidade'} if '/favorabilidade/' in request.url.path else {}
        modelo, arquivos = elegibilidade_relatorio.montar(payload.execucoes, payload.nomes, user.id, payload.revisados, **opcoes)
        if not opcoes:
            elegibilidade_relatorio.registrar_relatorios(payload.execucoes, modelo, user.id)
        dados, caminho = elegibilidade_relatorio.pacote(modelo, arquivos)
        return Response(dados, media_type='application/zip', headers={
            'Content-Disposition': "attachment; filename=\"Relatorio e Camadas.zip\"; filename*=UTF-8''" + quote('Relatório e Camadas.zip'),
            'Cache-Control': 'no-store', 'X-SICARD-Package': quote(caminho)})
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except (RuntimeError, DatabaseUnavailableError) as exc:
        raise HTTPException(503, str(exc)) from exc


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


EscopoConfiguracao = Literal[
    'analise', 'bases', 'elegibilidade-restricao', 'elegibilidade-risco',
    'favorabilidade-grade', 'favorabilidade-rede',
]


class Configuracao(BaseModel):
    nome: str = Field(min_length=1,max_length=120)
    categorias: list[Categoria] = Field(default_factory=list,max_length=30)
    # Guardadas junto com as bases para repetir a análise inteira (versão 3).
    entradas: list[EntradaExtracao] = Field(default_factory=list,max_length=10)
    finalidades: list[Finalidade] = Field(default_factory=list,max_length=20)
    escopo: EscopoConfiguracao = 'analise'
    chave_lista: str | None = Field(default=None, max_length=80)
    categoria_ativa: str = Field(default='',max_length=120)
    operacao: Literal['','intersection','identity','enriquecimento','estatisticas'] = 'intersection'
    opcoes: dict[str, bool] = Field(default_factory=dict)
    nome_saida: str = Field(default='',max_length=200)


@router.get('/configuracoes')
def listar_configuracoes(escopo: EscopoConfiguracao = 'analise'):
    from api.services import configuracao_bancada as configuracao
    return {'pasta': configuracao.pasta(escopo), 'configuracoes': configuracao.listar(escopo)}


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
def abrir_configuracao(chave: str, lista: bool = False, escopo: EscopoConfiguracao = 'analise'):
    from api.services import configuracao_bancada as configuracao
    try:
        return configuracao.carregar(chave, referencias=lista, escopo=escopo)
    except FileNotFoundError as exc:
        raise HTTPException(404,str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422,str(exc)) from exc


@router.delete('/configuracoes/{chave}',status_code=204)
def apagar_configuracao(chave: str, escopo: EscopoConfiguracao = 'analise', user: SessionUser = Depends(require_geospatial_access)):
    from api.services import configuracao_bancada as configuracao
    try:
        configuracao.excluir(chave, escopo=escopo)
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


@router.get('/execucoes/{ident}/eventos')
def acompanhar_eventos(ident: UUID, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.progresso_eventos import resposta
    try:
        return resposta(service.eventos_progresso(ident, user), ident)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.get('/execucoes/{ident}/tabela')
def tabela_resultado(ident: UUID, camada: str = Query(default='resultado',max_length=200),
                    offset: int = Query(default=0,ge=0), limite: int = Query(default=100,ge=1,le=1000),
                    ordem: str = Query(default='', max_length=500), descendente: bool = False,
                    user: SessionUser = Depends(require_geospatial_access)):
    try:
        return service.tabela_resultado(ident,user,camada,offset,limite,ordem,descendente)
    except LookupError as exc:
        raise HTTPException(404,str(exc)) from exc


class ConsultaDashboard(BaseModel):
    camada: str = Field(default='resultado', max_length=200)
    categoria: str = Field(default='', max_length=200)
    base: str = Field(default='', max_length=500)
    origem: str = Field(default='', max_length=2000)
    campo: str = Field(default='', max_length=500)
    valor: str = Field(default='', max_length=10000)
    busca: str = Field(default='', max_length=200)
    ordem: str = Field(default='origem', max_length=40, pattern=r'^(origem|valor|registro|base:\d+)$')
    descendente: bool = False
    pagina: int = Field(default=0, ge=0)


@router.post('/execucoes/{ident}/dashboard')
def dashboard_resultado(ident: UUID, payload: ConsultaDashboard,
                        user: SessionUser = Depends(require_geospatial_access)):
    try:
        data = service.dashboard_resultado(ident, user, **payload.model_dump())
        return Response(json.dumps(data, ensure_ascii=False, allow_nan=False), media_type='application/json',
                        headers={'Cache-Control':'no-store'})
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


class FiltroMatriz(BaseModel):
    campo: str = Field(default='', max_length=2000)
    operador: Literal['valores', 'intervalo', 'vazio'] = 'valores'
    valores: list[str | int | float | bool | None] = Field(default_factory=list, max_length=10000)
    minimo: float | None = Field(default=None, allow_inf_nan=False)
    maximo: float | None = Field(default=None, allow_inf_nan=False)

    @model_validator(mode='after')
    def intervalo_valido(self):
        if self.operador == 'intervalo' and self.minimo is not None and self.maximo is not None and self.minimo > self.maximo:
            raise ValueError('O mínimo deve ser menor ou igual ao máximo.')
        return self


class ConsultaIntersecoes(BaseModel):
    ordenar_por: str = Field(default='', max_length=2000)
    descendente: bool = False
    filtros: list[FiltroMatriz] = Field(default_factory=list, max_length=2)
    combinacao: Literal['e', 'ou'] = 'e'
    agrupamento: Literal['feicao', 'camada'] = 'feicao'
    entrada: str = Field(default='', max_length=500)
    feicao: str = Field(default='', max_length=2000)
    categoria: str = Field(default='', max_length=500)
    atributo: str = Field(default='', max_length=255)
    base: str = Field(default='', max_length=2000)
    situacao: Literal['', 'com', 'sem', 'nao_avaliado', 'nao_informado'] = ''
    busca: str = Field(default='', max_length=200)
    pagina: int = Field(default=0, ge=0)


@router.post('/execucoes/{ident}/intersecoes')
def intersecoes_resultado(ident: UUID, payload: ConsultaIntersecoes,
                         user: SessionUser = Depends(require_geospatial_access)):
    try:
        data = service.intersecoes_resultado(ident,user,**payload.model_dump())
        return Response(json.dumps(data,ensure_ascii=False,allow_nan=False),media_type='application/json',
                        headers={'Cache-Control':'no-store'})
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
def baixar_pacote(ident: UUID, saida: str = Query(default='', pattern=r'^(entrada_[1-9][0-9]*)?$'), user: SessionUser = Depends(require_geospatial_access)):
    """O pacote .zip da extração, lido do banco. Os arquivos não são baixados avulsos."""
    try:
        conteudo, nome = service.arquivo_do_pacote(ident,user,saida or 'zip')
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


@router.get('/bancadas')
def listar_bancadas(user: SessionUser = Depends(require_geospatial_access)):
    from api.services import bancadas_salvas
    return {'bancadas': bancadas_salvas.listar(user.id)}


@router.post('/bancadas', status_code=201)
async def salvar_bancada(request: Request, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import bancadas_salvas
    from starlette.concurrency import run_in_threadpool
    body = bytearray()
    async for part in request.stream():
        if len(body) + len(part) > bancadas_salvas.MAX_BYTES:
            raise HTTPException(413, 'A bancada excede 64 MB.')
        body.extend(part)
    try:
        data = json.loads(body)
        if not isinstance(data, dict): raise ValueError('Formato da bancada inválido.')
        return await run_in_threadpool(bancadas_salvas.salvar, user.id, data.get('nome', ''), data.get('snapshot'))
    except (ValueError, TypeError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get('/bancadas/{ident}')
def carregar_bancada(ident: UUID, user: SessionUser = Depends(require_geospatial_access)):
    from api.services import bancadas_salvas
    try:
        return bancadas_salvas.carregar(user.id, ident)
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
