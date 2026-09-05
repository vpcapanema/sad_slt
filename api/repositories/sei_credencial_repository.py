"""Acesso a dados — integracoes.sei_credencial (guarda opcional de credencial SEI)."""
from __future__ import annotations

from typing import Any

from api.db.connection import get_connection

_SELECT_BASE = """
    SELECT id, usuario_id, tipo_login, identificador, orgao_selecionado,
           senha_criptografada, criado_em, atualizado_em
    FROM integracoes.sei_credencial
"""


def get_by_usuario_id(usuario_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        cur = conn.execute(f"{_SELECT_BASE} WHERE usuario_id = %(usuario_id)s", {"usuario_id": usuario_id})
        row = cur.fetchone()
        return dict(row) if row else None


def upsert(
    *,
    usuario_id: str,
    tipo_login: str,
    identificador: str,
    orgao_selecionado: str | None,
    senha_criptografada: str,
) -> dict[str, Any]:
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO integracoes.sei_credencial (
                usuario_id, tipo_login, identificador, orgao_selecionado, senha_criptografada
            ) VALUES (
                %(usuario_id)s, %(tipo_login)s, %(identificador)s, %(orgao_selecionado)s, %(senha_criptografada)s
            )
            ON CONFLICT (usuario_id) DO UPDATE SET
                tipo_login = EXCLUDED.tipo_login,
                identificador = EXCLUDED.identificador,
                orgao_selecionado = EXCLUDED.orgao_selecionado,
                senha_criptografada = EXCLUDED.senha_criptografada
            RETURNING id, usuario_id, tipo_login, identificador, orgao_selecionado,
                      senha_criptografada, criado_em, atualizado_em
            """,
            {
                "usuario_id": usuario_id,
                "tipo_login": tipo_login,
                "identificador": identificador,
                "orgao_selecionado": orgao_selecionado,
                "senha_criptografada": senha_criptografada,
            },
        )
        row = cur.fetchone()
        assert row is not None
        return dict(row)


def delete_by_usuario_id(usuario_id: str) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM integracoes.sei_credencial WHERE usuario_id = %(usuario_id)s",
            {"usuario_id": usuario_id},
        )
        return cur.rowcount > 0
