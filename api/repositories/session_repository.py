"""Registro persistente de sessões; nunca armazena o token apresentado."""
from api.db.connection import get_connection


def register(session_id: str, user, expires_at: int) -> None:
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO cadastro.sessao_usuario (id, usuario_id, expira_em)
               VALUES (%s, %s, to_timestamp(%s))""",
            (session_id, user.id, expires_at),
        )


def is_active(session_id: str, user_id: str) -> bool:
    with get_connection() as conn:
        return bool(conn.execute(
            """SELECT 1 FROM cadastro.sessao_usuario
               WHERE id = %s AND usuario_id = %s AND revogada_em IS NULL
                 AND expira_em > clock_timestamp()""",
            (session_id, user_id),
        ).fetchone())


def revoke(session_id: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE cadastro.sessao_usuario SET revogada_em = COALESCE(revogada_em, clock_timestamp()) WHERE id = %s",
            (session_id,),
        )


def revoke_user(user_id: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE cadastro.sessao_usuario SET revogada_em = clock_timestamp() WHERE usuario_id = %s AND revogada_em IS NULL",
            (user_id,),
        )
