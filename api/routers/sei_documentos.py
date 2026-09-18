"""Rotas do repositório de PDFs recebidos do SEI."""
from __future__ import annotations

from contextlib import contextmanager

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import ValidationError

from api.deps.auth import require_authenticated, require_operator
from api.exceptions import DatabaseUnavailableError, DemandaNotFoundError, DemandaValidationError
from api.schemas.demanda import DemandaCreateSchema
from api.schemas.plano import PlanoCreateSchema
from api.schemas.programa import ProgramaCreateSchema
from api.schemas.sei_documentos import (
    SeiAnaliseRequestSchema, SeiCriarDemandaSchema, SeiDocumentoDetalheSchema,
    SeiDocumentoSchema, SeiUploadResponseSchema,
)
from api.services import demanda_service, plano_service, programa_service
from api.services import sei_repositorio_service as documentos
from api.services.sei_jobs import sei_jobs
from api.services.session_service import SessionUser

router = APIRouter(prefix='/sei/documentos', tags=['sei-documentos'])

_TIPOS_DEMANDA = {'plano', 'programa', 'projeto'}


@contextmanager
def _errors():
    try:
        yield
    except DemandaNotFoundError as exc:
        raise HTTPException(404, str(exc)) from exc
    except DemandaValidationError as exc:
        raise HTTPException(422, str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, 'O armazenamento dos documentos está indisponível. Tente novamente.') from exc
    except ValidationError as exc:
        raise HTTPException(422, detail=[{'loc': e['loc'], 'msg': e['msg'], 'type': e['type']} for e in exc.errors()]) from exc


@router.get('', response_model=list[SeiDocumentoSchema])
def listar(user: SessionUser = Depends(require_authenticated)):
    with _errors():
        return documentos.listar()


@router.get('/jobs/{job_id}')
def acompanhar(job_id: str, user: SessionUser = Depends(require_authenticated)):
    """Andamento de uma leitura: cada passo real do extrator, na ordem."""
    job = sei_jobs.obter(job_id)
    if not job:
        raise HTTPException(404, 'Acompanhamento não encontrado: a leitura terminou há mais de uma hora ou o servidor foi reiniciado.')
    return job


@router.post('', status_code=202)
async def enviar(
    arquivos: list[UploadFile] = File(...),
    # O tipo escolhido em "Formulário a preencher" decide o contrato de campos,
    # e a leitura acontece já no envio.
    tipo_demanda: str = Form('projeto'),
    user: SessionUser = Depends(require_operator),
):
    """Recebe os PDFs e devolve na hora o job que os lê e grava, um de cada vez."""
    if tipo_demanda not in _TIPOS_DEMANDA:
        raise HTTPException(422, f'Tipo de demanda inválido: {tipo_demanda}.')
    lote: list[tuple[str, bytes]] = []
    total = 0
    for arquivo in arquivos:
        conteudo = await arquivo.read()
        total += len(conteudo)
        if total > documentos.LIMITE_LOTE_BYTES:
            # Conferido antes do job: com 413, nenhum arquivo do lote é gravado.
            limite_mb = documentos.LIMITE_LOTE_BYTES // (1024 * 1024)
            raise HTTPException(413, f'O envio ultrapassa {limite_mb} MB somados. Divida em lotes menores.')
        lote.append((arquivo.filename or '', conteudo))

    def ler_lote(progresso):
        # Roda na thread do job: a leitura (CPU e OCR) não ocupa o event loop.
        recebidos, erros = [], []
        for indice, (nome, conteudo) in enumerate(lote, start=1):
            progresso(f'Arquivo {indice} de {len(lote)}: {nome}')
            try:
                recebidos.append(documentos.receber(
                    conteudo=conteudo, nome_arquivo=nome, usuario_id=user.id,
                    usuario_nome=user.nome, tipo_demanda=tipo_demanda, progresso=progresso,
                ))
            except DemandaValidationError as exc:
                # Um arquivo recusado não invalida os demais do mesmo envio.
                erros.append({'arquivo': nome, 'mensagem': str(exc)})
                progresso(f'{nome}: recusado — {exc}', 'aviso')
        if not recebidos and erros:
            raise DemandaValidationError('; '.join(erro['mensagem'] for erro in erros))
        return SeiUploadResponseSchema.model_validate({'recebidos': recebidos, 'erros': erros}).model_dump(mode='json')

    return sei_jobs.criar('envio', ler_lote)


@router.get('/{documento_id}', response_model=SeiDocumentoDetalheSchema)
def obter(documento_id: str, user: SessionUser = Depends(require_authenticated)):
    with _errors():
        return documentos.obter(documento_id)


@router.get('/{documento_id}/arquivo')
def baixar(documento_id: str, user: SessionUser = Depends(require_authenticated)):
    with _errors():
        nome, conteudo = documentos.arquivo(documento_id)
    return Response(
        content=conteudo,
        media_type='application/pdf',
        headers={'Content-Disposition': f'inline; filename="{nome}"', 'Cache-Control': 'no-store'},
    )


@router.post('/{documento_id}/analisar', status_code=202)
def analisar(documento_id: str, body: SeiAnaliseRequestSchema, user: SessionUser = Depends(require_operator)):
    """Relê o PDF em segundo plano e devolve o job que a página acompanha."""
    with _errors():
        documentos.obter(documento_id)  # 404/422 imediatos, antes de abrir o job

    def reler(progresso):
        leitura = documentos.analisar(documento_id, body.tipo_demanda, progresso=progresso)
        return SeiDocumentoSchema.model_validate(leitura).model_dump(mode='json')

    return sei_jobs.criar('analise', reler)


@router.delete('/{documento_id}')
def excluir(documento_id: str, user: SessionUser = Depends(require_operator)):
    with _errors():
        documentos.excluir(documento_id)
    return {'ok': True}


@router.post('/{documento_id}/criar-demanda')
def criar_demanda(documento_id: str, body: SeiCriarDemandaSchema, user: SessionUser = Depends(require_operator)):
    with _errors():
        with documentos.travar(documento_id):
            documento = documentos.obter(documento_id)
            if documento['demanda_id']:
                # Idempotente: reenviar o mesmo documento não duplica a demanda.
                return {'id': documento['demanda_id'], 'ja_existia': True}
            campos = dict(body.campos)
            origem = documentos.marcador_origem(documento)
            descricao = (campos.get('descricao') or '').strip()
            campos['descricao'] = descricao if origem in descricao else f'{origem}\n\n{descricao}'
            # O status inicial é regra do serviço, não escolha do payload.
            campos.pop('status', None)
            if body.tipo_demanda == 'plano':
                resultado = plano_service.criar_plano(PlanoCreateSchema.model_validate(campos), origem='SEI')
            elif body.tipo_demanda == 'programa':
                resultado = programa_service.criar_programa(ProgramaCreateSchema.model_validate(campos), origem='SEI')
            else:
                resultado = demanda_service.criar_demanda(DemandaCreateSchema.model_validate(campos), origem='SEI')
            identificador = resultado['id'] if isinstance(resultado, dict) else resultado.id
            documentos.registrar_demanda(documento_id, identificador)
            return resultado
