"""Persistência — auditoria.log_sistema."""
from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from psycopg.types.json import Jsonb

from api.db.connection import get_connection


def registrar(
    *,
    mensagem: str,
    nivel: str = "AUDIT",
    categoria: str = "sistema",
    operacao: str | None = None,
    schema_nome: str | None = None,
    tabela: str | None = None,
    registro_id: UUID | str | None = None,
    usuario_id: UUID | str | None = None,
    usuario_nome: str | None = None,
    dados_anteriores: dict[str, Any] | None = None,
    dados_novos: dict[str, Any] | None = None,
    contexto: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    origem: str = "api",
) -> None:
    sql = """
        INSERT INTO auditoria.log_sistema (
            nivel, categoria, operacao, schema_nome, tabela, registro_id,
            usuario_id, usuario_nome, mensagem,
            dados_anteriores, dados_novos, contexto,
            ip_address, user_agent, origem
        ) VALUES (
            %(nivel)s, %(categoria)s, %(operacao)s, %(schema_nome)s, %(tabela)s, %(registro_id)s,
            %(usuario_id)s, %(usuario_nome)s, %(mensagem)s,
            %(dados_anteriores)s, %(dados_novos)s, %(contexto)s,
            %(ip_address)s, %(user_agent)s, %(origem)s
        )
    """

    def _json(val: dict[str, Any] | None) -> Jsonb | None:
        return Jsonb(val) if val is not None else None

    params = {
        "nivel": nivel,
        "categoria": categoria,
        "operacao": operacao,
        "schema_nome": schema_nome,
        "tabela": tabela,
        "registro_id": registro_id,
        "usuario_id": usuario_id,
        "usuario_nome": usuario_nome,
        "mensagem": mensagem,
        "dados_anteriores": _json(dados_anteriores),
        "dados_novos": _json(dados_novos),
        "contexto": _json(contexto),
        "ip_address": ip_address,
        "user_agent": user_agent,
        "origem": origem,
    }

    with get_connection() as conn:
        conn.execute(sql, params)
        conn.commit()
