"""Gravações do MOCAD com autorização específica e trilha da reversão inline."""
from fastapi import HTTPException
from api.db.connection import atomic_connection
from api.repositories import auditoria_repository
from api.services import autorizacao as authz
from api.services.solicitacao_complementacao_service import bloquear


def atualizar(tipo, codigo, body, user):
    from api.services import demanda_service, plano_service, programa_service
    from api.schemas.demanda import DemandaUpdateSchema
    from api.schemas.plano import PlanoUpdateSchema
    from api.schemas.programa import ProgramaUpdateSchema
    schema, service = {'projeto': (DemandaUpdateSchema, demanda_service.atualizar_demanda),
                       'plano': (PlanoUpdateSchema, plano_service.atualizar_plano),
                       'programa': (ProgramaUpdateSchema, programa_service.atualizar_programa)}[tipo]
    campos = body.model_dump(exclude_unset=True)
    justificativa = str(campos.pop('justificativa_status', None) or '').strip()
    reverter = 'status' in campos
    if reverter:
        authz.exigir(user, 'mocad.reverter_status_inline', acao='reverter status diretamente na tabela de demandas')
        if set(campos) != {'status'}:
            authz.negar(user, 'alterar status junto com outros campos', ('mocad.reverter_status_inline',),
                        'A reversão inline deve conter somente o novo status e a justificativa. Edite os demais dados pelo fluxo de análise autorizado.')
        if len(justificativa) < 5:
            raise HTTPException(422, 'Informe uma justificativa com pelo menos 5 caracteres para reverter o status.')
    else:
        authz.exigir(user, 'mocad.analisar', acao='editar dados da demanda')
        return service(codigo, schema.model_validate(campos), usuario_id=user.id, status_livre_gestor=False)
    with atomic_connection() as conn:
        anterior = bloquear(conn, tipo, codigo) if reverter else None
        result = service(codigo, schema.model_validate(campos), usuario_id=user.id, status_livre_gestor=reverter)
        if reverter:
            auditoria_repository.registrar(nivel='AUDIT', categoria='permissao', operacao='REVERTER_STATUS_INLINE',
                schema_nome='demandas', tabela=tipo, usuario_id=user.id, usuario_nome=user.nome,
                mensagem='Status revertido inline pelo fluxo autorizado do SICARD',
                dados_anteriores={'status': anterior['status']}, dados_novos={'status': campos['status']},
                contexto={'codigo': codigo, 'justificativa': justificativa, 'via_aprovar': False}, origem='web')
    return result
