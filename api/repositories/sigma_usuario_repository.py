"""Leitura de gestores em usuarios.usuario (SIGMA — somente SELECT)."""
from __future__ import annotations

from typing import Any

from api.db.sigma_connection import get_sigma_connection

_SELECT_GESTOR = """
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
    WHERE (
        LOWER(u.username) = LOWER(%(login)s)
        OR LOWER(u.email_institucional) = LOWER(%(login)s)
    )
      AND UPPER(u.tipo_usuario) = 'GESTOR'
      AND u.ativo = TRUE
    LIMIT 1
"""


def find_gestor_by_login(login: str) -> dict[str, Any] | None:
    login = (login or "").strip()
    if not login:
        return None

    with get_sigma_connection() as conn:
        return conn.execute(_SELECT_GESTOR, {"login": login}).fetchone()
