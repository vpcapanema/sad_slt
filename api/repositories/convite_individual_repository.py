"""Convites externos por destinatário, sem armazenar o segredo em claro."""
import hashlib
import secrets
from api.db.connection import get_connection
from api.exceptions import DemandaValidationError


def obter(ambiente_id, email, versao):
    with get_connection() as conn:
        row = conn.execute(
            """SELECT c.segredo_hash, c.envelope_cifrado, c.revogado_em
               FROM ahp.comparacao_colaborativa_ambiente a
               LEFT JOIN ahp.convite_individual c ON c.ambiente_id = a.id AND c.email = %s
               WHERE a.id = %s AND a.atualizado_em = %s AND a.status = 'ativa' AND a.valido_ate > now()
                 AND EXISTS (SELECT 1 FROM jsonb_array_elements(a.convites) i WHERE lower(i->>'email') = %s)""",
            (email, ambiente_id, versao, email),
        ).fetchone()
    if not row:
        raise DemandaValidationError("O convite mudou ou expirou. Reabra o julgamento.", field="convite")
    return row if row["segredo_hash"] else None


def registrar(ambiente_id, email, versao, segredo_hash, envelope_cifrado):
    """Cria apenas uma vez; nenhuma operação de envio troca uma chave existente."""
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO ahp.convite_individual
                   (ambiente_id, email, segredo_hash, envelope_cifrado)
               SELECT id, %s, %s, %s FROM ahp.comparacao_colaborativa_ambiente
               WHERE id = %s AND atualizado_em = %s AND status = 'ativa' AND valido_ate > now()
                 AND EXISTS (SELECT 1 FROM jsonb_array_elements(convites) c WHERE lower(c->>'email') = %s)
               ON CONFLICT (ambiente_id, email) DO NOTHING""",
            (email, segredo_hash, envelope_cifrado, ambiente_id, versao, email),
        )
    return obter(ambiente_id, email, versao)


def validar(ambiente_id, email, segredo):
    if not isinstance(segredo, str) or len(segredo) != 43 or not segredo.isascii():
        return False
    with get_connection() as conn:
        row = conn.execute(
            """SELECT segredo_hash FROM ahp.convite_individual
               WHERE ambiente_id = %s AND email = %s AND revogado_em IS NULL""",
            (ambiente_id, email),
        ).fetchone()
    return bool(row and secrets.compare_digest(
        row["segredo_hash"], hashlib.sha256(segredo.encode()).hexdigest()))


def revogar(ambiente_id, email):
    with get_connection() as conn:
        conn.execute(
            """UPDATE ahp.convite_individual SET revogado_em = clock_timestamp(), envelope_cifrado = NULL
               WHERE ambiente_id = %s AND email = %s""", (ambiente_id, email),
        )
