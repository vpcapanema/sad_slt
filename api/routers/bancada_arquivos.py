from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.deps.auth import require_geospatial_access
from api.services import bancada_arquivos as service
from api.services.session_service import SessionUser

router = APIRouter(prefix='/bancada-arquivos', dependencies=[Depends(require_geospatial_access)])


class Arquivo(BaseModel):
    arquivo: str = Field(min_length=1, max_length=1000)
    revisao: str = Field(min_length=1, max_length=128)
    camada_id: str | None = Field(default=None, max_length=1200)


class Edicao(Arquivo):
    geojson: dict
    nome: str | None = Field(default=None, max_length=200)


class Operacao(BaseModel):
    operacao: str
    parametros: dict
    arquivos: dict[str, Arquivo]


def resposta(fn, *args):
    try:
        return fn(*args)
    except PermissionError as exc:
        raise HTTPException(403, str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except (ValueError, RuntimeError, KeyError, TypeError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post('/salvar')
def salvar(payload: Edicao, user: SessionUser = Depends(require_geospatial_access)):
    return resposta(service.salvar, payload.arquivo, payload.revisao, payload.geojson, payload.nome, user, payload.camada_id)


class EdicaoFeicao(BaseModel):
    fid: str | int
    campos: dict[str, Any] = Field(default_factory=dict)


class EdicoesIncrementais(Arquivo):
    # Chave: FID original (texto numérico); valor: somente os campos alterados.
    # Formato canônico: [{"fid": 7, "campos": {...}}]; o mapa {"7": {...}} também é aceito.
    edicoes: list[EdicaoFeicao] | dict[str, dict[str, Any]] = Field(default_factory=list, max_length=50000)
    excluidos: list[str | int] = Field(default_factory=list, max_length=50000)


@router.post('/salvar-edicoes')
def salvar_edicoes(payload: EdicoesIncrementais, user: SessionUser = Depends(require_geospatial_access)):
    return resposta(service.salvar_edicoes, payload.arquivo, payload.camada_id, payload.revisao,
                    [e.model_dump() if isinstance(e, BaseModel) else e for e in payload.edicoes] if isinstance(payload.edicoes, list) else payload.edicoes,
                    payload.excluidos, user)


class EdicaoGeometriaFeicao(BaseModel):
    fid: str | int
    geometry: dict[str, Any]
    campos: dict[str, Any] = Field(default_factory=dict)


class NovaGeometria(BaseModel):
    geometry: dict[str, Any]
    properties: dict[str, Any]


class EdicoesGeometrias(Arquivo):
    edicoes: list[EdicaoGeometriaFeicao] = Field(default_factory=list, max_length=100)
    excluidos: list[str | int] = Field(default_factory=list, max_length=100)
    novas: list[NovaGeometria] = Field(default_factory=list, max_length=100)


@router.post('/salvar-geometrias')
def salvar_geometrias(payload: EdicoesGeometrias, user: SessionUser = Depends(require_geospatial_access)):
    return resposta(service.salvar_geometrias, payload.arquivo, payload.camada_id, payload.revisao,
                    [edicao.model_dump() for edicao in payload.edicoes], payload.excluidos,
                    [nova.model_dump() for nova in payload.novas], user)


@router.post('/executar')
def executar(payload: Operacao, user: SessionUser = Depends(require_geospatial_access)):
    return resposta(service.executar, payload.operacao, payload.parametros,
                    {key: value.model_dump() for key, value in payload.arquivos.items()}, user)


class Consulta(Arquivo):
    expressao: str = Field(min_length=1, max_length=4000)
    inverter_selecao: bool = False


@router.post('/consultar')
def consultar(payload: Consulta):
    return resposta(service.consultar, payload.arquivo, payload.revisao, payload.expressao, payload.inverter_selecao, payload.camada_id)


@router.post('/executar-job', status_code=202)
def executar_job(payload: Operacao, user: SessionUser = Depends(require_geospatial_access)):
    return resposta(service.iniciar_execucao, payload.operacao, payload.parametros,
                    {key: value.model_dump() for key, value in payload.arquivos.items()}, user)


class CalculoCampo(Arquivo):
    campo: str = Field(min_length=1, max_length=200)
    expressao: str = Field(min_length=1, max_length=4000)
    chaves_selecionadas: list[str] | None = None
    filtro: str | None = Field(default=None, max_length=4000)
    incluir_geojson: bool = True


@router.post('/calcular-campo')
def calcular_campo(payload: CalculoCampo, user: SessionUser = Depends(require_geospatial_access)):
    return resposta(service.calcular_campo, payload.arquivo, payload.revisao, payload.campo,
                    payload.expressao, user, payload.camada_id, payload.chaves_selecionadas,
                    payload.filtro, payload.incluir_geojson)


class LeituraTemporaria(BaseModel):
    id: str = Field(pattern=r'^local:[a-f0-9]{32}$')
    tiles_token: str = Field(pattern=r'^[a-f0-9]{32}$')
    revisao: str = Field(min_length=1, max_length=128)


class TabelaTemporaria(LeituraTemporaria):
    offset: int = Field(default=0, ge=0, le=10_000_000)
    limite: int = Field(default=100, ge=1, le=500)
    localizar_fid: str | None = Field(default=None, pattern=r"^[0-9]+$", max_length=20)


class GeometriasTemporarias(LeituraTemporaria):
    ids: list[str] = Field(min_length=1, max_length=100)


class ConsultaTemporaria(TabelaTemporaria):
    expressao: str = Field(min_length=1, max_length=2000)
    inverter_selecao: bool = False
    limite: int = Field(default=100, ge=1, le=1000)


class ParametrosClassificacao(BaseModel):
    campo: str = Field(min_length=1, max_length=200)
    metodo: Literal['valores_unicos', 'intervalos_iguais', 'quantis', 'desvio_padrao', 'quebras_naturais', 'manual'] = 'intervalos_iguais'
    classes: int = Field(default=5, ge=2, le=12)


class ClassificacaoArquivo(Arquivo, ParametrosClassificacao):
    camada_id: str = Field(min_length=1, max_length=1200)


class ClassificacaoTemporaria(LeituraTemporaria, ParametrosClassificacao):
    pass


@router.post('/classificacao')
def classificacao_arquivo(payload: ClassificacaoArquivo):
    from api.services.bancada_classificacao import classificar
    return resposta(classificar, payload.camada_id, payload.arquivo, payload.revisao,
                    payload.campo, payload.metodo, payload.classes)


@router.post('/local/classificacao')
def classificacao_temporaria(payload: ClassificacaoTemporaria, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.bancada_temporaria import consultar
    return resposta(consultar, 'classificacao', payload, user.id)


@router.post('/local/tabela')
def tabela_temporaria(payload: TabelaTemporaria, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.bancada_temporaria import consultar
    return resposta(consultar, 'tabela', payload, user.id)


@router.post('/local/geometrias')
def geometrias_temporarias(payload: GeometriasTemporarias, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.bancada_temporaria import consultar
    return resposta(consultar, 'geometrias', payload, user.id)


@router.post('/local/consulta')
def consulta_temporaria(payload: ConsultaTemporaria, user: SessionUser = Depends(require_geospatial_access)):
    from api.services.bancada_temporaria import consultar
    return resposta(consultar, 'consulta', payload, user.id)
