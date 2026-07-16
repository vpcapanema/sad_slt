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
