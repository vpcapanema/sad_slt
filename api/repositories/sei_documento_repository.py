"""Acesso a dados — integracoes.sei_documento (PDFs recebidos do SEI)."""
from __future__ import annotations

from typing import Any

from psycopg.types.json import Jsonb

from api.db.connection import get_connection

# O binário nunca entra na listagem: `conteudo` só é lido no download.
_COLUNAS = """
    id, usuario_id, usuario_nome, nome_arquivo, sha256, tamanho_bytes, paginas,
    status, tipo_demanda, numero_processo, campos_sugeridos, evidencias, analise, aviso, demanda_id,
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
    numero_processo: str | None = None,
    tipo_demanda: str = "projeto",
    campos_sugeridos: dict[str, Any] | None = None,
    evidencias: dict[str, Any] | None = None,
    analise: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Grava o PDF e a leitura dele na mesma linha, num único INSERT.

    As três colunas JSONB precisam de `Jsonb`: psycopg não adapta `dict` cru, e
    o repositório falso dos testes aceitaria — a falha só apareceria em produção.
    """
    with get_connection() as conn:
        cur = conn.execute(
            f"""
            INSERT INTO integracoes.sei_documento (
                usuario_id, usuario_nome, nome_arquivo, sha256, tamanho_bytes,
                conteudo, paginas, texto, status, aviso, numero_processo,
                tipo_demanda, campos_sugeridos, evidencias, analise
            ) VALUES (
                %(usuario_id)s, %(usuario_nome)s, %(nome_arquivo)s, %(sha256)s,
                %(tamanho_bytes)s, %(conteudo)s, %(paginas)s, %(texto)s, %(status)s,
                %(aviso)s, %(numero_processo)s, %(tipo_demanda)s,
                %(campos_sugeridos)s, %(evidencias)s, %(analise)s
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
                "numero_processo": numero_processo,
                "tipo_demanda": tipo_demanda,
                "campos_sugeridos": Jsonb(campos_sugeridos or {}),
                "evidencias": Jsonb(evidencias or {}),
                "analise": Jsonb(analise or {}),
            },
        )
        row = cur.fetchone()
        assert row is not None
        return dict(row)


def marcar_analisado(
    documento_id: str,
    *,
    numero_processo: str | None,
    tipo_demanda: str,
    campos_sugeridos: dict[str, Any] | None = None,
    evidencias: dict[str, Any] | None = None,
    analise: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Regrava a leitura do documento, usada quando o PDF é reanalisado.

    `COALESCE` preserva o número já gravado quando a nova leitura não encontra
    nenhum, e o filtro por `demanda_id` impede que um documento que já gerou
    demanda regrida de situação.
    """
    with get_connection() as conn:
        cur = conn.execute(
            f"""
            UPDATE integracoes.sei_documento
            SET status = 'analisado',
                tipo_demanda = %(tipo_demanda)s,
                numero_processo = COALESCE(%(numero_processo)s, numero_processo),
                campos_sugeridos = %(campos_sugeridos)s,
                evidencias = %(evidencias)s,
                analise = %(analise)s
            WHERE id = %(id)s AND demanda_id IS NULL
            RETURNING {_COLUNAS}
            """,
            {
                "id": documento_id,
                "numero_processo": numero_processo,
                "tipo_demanda": tipo_demanda,
                "campos_sugeridos": Jsonb(campos_sugeridos or {}),
                "evidencias": Jsonb(evidencias or {}),
                "analise": Jsonb(analise or {}),
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
