"""Acesso a dados — integracoes.sei_documento (PDFs recebidos do SEI)."""
from __future__ import annotations

from typing import Any

from psycopg.types.json import Jsonb

from api.db.connection import get_connection

# O binário nunca entra na listagem: `conteudo` só é lido no download.
_COLUNAS = """
    id, usuario_id, usuario_nome, nome_arquivo, sha256, tamanho_bytes, paginas,
    status, numero_processo, campos_sugeridos, evidencias, aviso, demanda_id,
    criado_em, atualizado_em
"""


def listar() -> list[dict[str, Any]]:
    with get_connection() as conn:
        cur = conn.execute(
            f"SELECT {_COLUNAS} FROM integracoes.sei_documento ORDER BY criado_em DESC"
        )
        return [dict(row) for row in cur.fetchall()]


def obter(documento_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        cur = conn.execute(
            f"SELECT {_COLUNAS}, texto FROM integracoes.sei_documento WHERE id = %(id)s",
            {"id": documento_id},
        )
        row = cur.fetchone()
        return dict(row) if row else None


def obter_por_sha256(sha256: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        cur = conn.execute(
            f"SELECT {_COLUNAS} FROM integracoes.sei_documento WHERE sha256 = %(sha256)s",
            {"sha256": sha256},
        )
        row = cur.fetchone()
        return dict(row) if row else None


def obter_conteudo(documento_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT nome_arquivo, conteudo FROM integracoes.sei_documento WHERE id = %(id)s",
            {"id": documento_id},
        )
        row = cur.fetchone()
        return dict(row) if row else None


def inserir(
    *,
    usuario_id: str,
    usuario_nome: str,
    nome_arquivo: str,
    sha256: str,
    tamanho_bytes: int,
    conteudo: bytes,
    paginas: int | None,
    texto: str,
    status: str,
    aviso: str | None,
) -> dict[str, Any]:
    with get_connection() as conn:
        cur = conn.execute(
            f"""
            INSERT INTO integracoes.sei_documento (
                usuario_id, usuario_nome, nome_arquivo, sha256, tamanho_bytes,
                conteudo, paginas, texto, status, aviso
            ) VALUES (
                %(usuario_id)s, %(usuario_nome)s, %(nome_arquivo)s, %(sha256)s,
                %(tamanho_bytes)s, %(conteudo)s, %(paginas)s, %(texto)s, %(status)s, %(aviso)s
            )
            RETURNING {_COLUNAS}
            """,
            {
                "usuario_id": usuario_id,
                "usuario_nome": usuario_nome,
                "nome_arquivo": nome_arquivo,
                "sha256": sha256,
                "tamanho_bytes": tamanho_bytes,
                "conteudo": conteudo,
                "paginas": paginas,
                "texto": texto,
                "status": status,
                "aviso": aviso,
            },
        )
        row = cur.fetchone()
        assert row is not None
        return dict(row)


def salvar_analise(
    *,
    documento_id: str,
    status: str,
    numero_processo: str | None,
    campos_sugeridos: dict[str, Any],
    evidencias: dict[str, Any],
) -> dict[str, Any] | None:
    with get_connection() as conn:
        cur = conn.execute(
            f"""
            UPDATE integracoes.sei_documento SET
                status = %(status)s,
                numero_processo = %(numero_processo)s,
                campos_sugeridos = %(campos_sugeridos)s,
                evidencias = %(evidencias)s
            WHERE id = %(id)s
            RETURNING {_COLUNAS}
            """,
            {
                "id": documento_id,
                "status": status,
                "numero_processo": numero_processo,
                "campos_sugeridos": Jsonb(campos_sugeridos),
                "evidencias": Jsonb(evidencias),
            },
        )
        row = cur.fetchone()
        return dict(row) if row else None


def marcar_demanda(documento_id: str, demanda_id: str) -> dict[str, Any] | None:
    """Grava o vínculo com a demanda criada. O UPDATE condicional torna a
    criação idempotente: um segundo clique não gera outra demanda."""
    with get_connection() as conn:
        cur = conn.execute(
            f"""
            UPDATE integracoes.sei_documento
            SET demanda_id = %(demanda_id)s, status = 'demanda_criada'
            WHERE id = %(id)s AND demanda_id IS NULL
            RETURNING {_COLUNAS}
            """,
            {"id": documento_id, "demanda_id": demanda_id},
        )
        row = cur.fetchone()
        return dict(row) if row else None


def excluir(documento_id: str) -> bool:
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM integracoes.sei_documento WHERE id = %(id)s",
            {"id": documento_id},
        )
        return cur.rowcount > 0
