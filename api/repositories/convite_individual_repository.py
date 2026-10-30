"""Convites externos por destinatário, sem armazenar o segredo em claro."""
import hashlib
import secrets
from api.db.connection import get_connection
from api.exceptions import DemandaValidationError


def emitir(ambiente_id, email, versao):
    segredo = secrets.token_urlsafe(32)
    with get_connection() as conn:
        row = conn.execute(
            """INSERT INTO ahp.convite_individual (ambiente_id, email, segredo_hash)
               SELECT id, %s, %s FROM ahp.comparacao_colaborativa_ambiente
               WHERE id = %s AND atualizado_em = %s AND status = 'ativa' AND valido_ate > now()
                 AND EXISTS (SELECT 1 FROM jsonb_array_elements(convites) c WHERE lower(c->>'email') = %s)
               ON CONFLICT (ambiente_id, email) DO UPDATE SET
                 segredo_hash = EXCLUDED.segredo_hash, emitido_em = clock_timestamp(), revogado_em = NULL
               RETURNING ambiente_id""",
            (email, hashlib.sha256(segredo.encode()).hexdigest(), ambiente_id, versao, email),
        ).fetchone()
        if not row:
            raise DemandaValidationError("O convite mudou ou expirou. Reabra o julgamento.", field="convite")
    return segredo


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
            """UPDATE ahp.convite_individual SET revogado_em = clock_timestamp()
               WHERE ambiente_id = %s AND email = %s""", (ambiente_id, email),
        )
