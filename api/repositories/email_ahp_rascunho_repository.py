"""Guarda uma edição de e-mail para uma única operação do editor."""
from uuid import uuid4

from api.db.connection import atomic_connection, get_connection
from api.exceptions import DemandaValidationError


def pendente(ambiente_id: str, editor_id: str) -> dict | None:
    with get_connection() as conn:
        return conn.execute(
            """SELECT id, assunto, alias_remetente, texto
               FROM ahp.comparacao_colaborativa_email_rascunho
               WHERE ambiente_id = %s AND editor_id = %s AND operacao_id IS NULL""",
            (ambiente_id, editor_id),
        ).fetchone()


def salvar(ambiente_id: str, editor_id: str, conteudo) -> dict:
    with atomic_connection() as conn:
        return conn.execute(
            """INSERT INTO ahp.comparacao_colaborativa_email_rascunho
                   (id, ambiente_id, editor_id, assunto, alias_remetente, texto)
               VALUES (%s, %s, %s, %s, %s, %s)
               ON CONFLICT (ambiente_id, editor_id) WHERE operacao_id IS NULL
               DO UPDATE SET id = EXCLUDED.id, assunto = EXCLUDED.assunto,
                             alias_remetente = EXCLUDED.alias_remetente, texto = EXCLUDED.texto
               RETURNING id, assunto, alias_remetente, texto""",
            (uuid4(), ambiente_id, editor_id, conteudo.assunto, conteudo.alias_remetente, conteudo.texto),
        ).fetchone()


def vincular(conn, ambiente_id: str, editor_id: str, rascunho_id, operacao_id) -> dict:
    rascunho = conn.execute(
        """UPDATE ahp.comparacao_colaborativa_email_rascunho
           SET operacao_id = %s
           WHERE id = %s AND ambiente_id = %s AND editor_id = %s
             AND (operacao_id IS NULL OR operacao_id = %s)
           RETURNING assunto, alias_remetente, texto""",
        (operacao_id, rascunho_id, ambiente_id, editor_id, operacao_id),
    ).fetchone()
    if rascunho is None:
        raise DemandaValidationError(
            "Esta edição foi substituída ou já foi usada em outro envio. Atualize a mensagem antes de continuar.",
            field="rascunho_id",
        )
    return rascunho
