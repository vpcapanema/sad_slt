"""Leitura de usuários ativos em usuarios.usuario (SIGMA — somente SELECT)."""
from __future__ import annotations

from typing import Any

from api.db.sigma_connection import get_sigma_connection

_SELECT_USUARIO = """
    SELECT
        u.id,
        u.username,
        u.email_institucional,
        u.password_hash,
        u.tipo_usuario,
        u.ativo,
        u.bloqueado_ate,
        u.pessoa_id,
        p.nome_completo AS nome_pessoa
    FROM usuarios.usuario u
    LEFT JOIN cadastro.pessoa p ON p.id = u.pessoa_id
    WHERE LOWER(u.username) = LOWER(%(username)s)
      AND u.ativo = TRUE
    LIMIT 1
"""


def find_active_by_username(username: str) -> dict[str, Any] | None:
    username = (username or "").strip()
    if not username:
        return None

    with get_sigma_connection() as conn:
        return conn.execute(_SELECT_USUARIO, {"username": username}).fetchone()


def find_active_by_id(usuario_id: str) -> dict[str, Any] | None:
    sql = """
        SELECT
            u.id,
            u.pessoa_id,
            u.username,
            u.tipo_usuario,
            u.ativo,
            p.nome_completo AS nome_pessoa
        FROM usuarios.usuario u
        LEFT JOIN cadastro.pessoa p ON p.id = u.pessoa_id
        WHERE u.id = %(id)s AND u.ativo = TRUE
        LIMIT 1
    """
    with get_sigma_connection() as conn:
        return conn.execute(sql, {"id": usuario_id}).fetchone()


_SELECT_NOMES = """
    SELECT
        u.id,
        COALESCE(p.nome_completo, u.username) AS nome_pessoa
    FROM usuarios.usuario u
    LEFT JOIN cadastro.pessoa p ON p.id = u.pessoa_id
    WHERE u.id = ANY(%(ids)s)
"""


def nomes_por_ids(ids: list[str]) -> dict[str, str]:
    """Mapeia UUIDs de usuário para o nome da pessoa associada (via FK pessoa)."""
    ids = [i for i in {str(x) for x in ids if x}]
    if not ids:
        return {}
    with get_sigma_connection() as conn:
        rows = conn.execute(_SELECT_NOMES, {"ids": ids}).fetchall()
    return {str(r["id"]): r["nome_pessoa"] for r in rows if r.get("nome_pessoa")}
