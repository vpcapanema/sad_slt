"""Persistência de envios e retornos, sem armazenar o corpo dos emails."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.exceptions import DemandaValidationError


def listar(ambiente_id: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM ahp.comparacao_colaborativa_email WHERE ambiente_id=%s ORDER BY criado_em",
            (ambiente_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def reservar(ambiente_id: str, destinatario: str, conteudo_hash: str, mensagem_id: str,
             usuario_id: str, versao: datetime) -> tuple[dict[str, Any], bool]:
    with get_connection() as conn:
        atual = conn.execute(
            """SELECT id FROM ahp.comparacao_colaborativa_ambiente
               WHERE id=%s AND atualizado_em=%s AND status='ativa' AND valido_ate >= now()
               FOR SHARE""", (ambiente_id, versao),
        ).fetchone()
        if not atual:
            raise DemandaValidationError(
                "O julgamento mudou ou seu prazo encerrou. Reabra o registro antes de enviar.",
                field="ambiente_id",
            )
        row = conn.execute(
            """INSERT INTO ahp.comparacao_colaborativa_email
               (id,ambiente_id,destinatario,conteudo_hash,mensagem_id,usuario_id)
               VALUES (%s,%s,%s,%s,%s,%s)
               ON CONFLICT (ambiente_id,destinatario,conteudo_hash) DO NOTHING RETURNING *""",
            (uuid4(), ambiente_id, destinatario, conteudo_hash, mensagem_id, usuario_id),
        ).fetchone()
        if row:
            return dict(row), True
        row = conn.execute(
            """UPDATE ahp.comparacao_colaborativa_email
               SET envio_status='enviando', detalhe='', atualizado_em=now(), usuario_id=%s
               WHERE ambiente_id=%s AND destinatario=%s AND conteudo_hash=%s AND envio_status='falha'
               RETURNING *""", (usuario_id, ambiente_id, destinatario, conteudo_hash),
        ).fetchone()
        if row:
            return dict(row), True
        row = conn.execute(
            """SELECT * FROM ahp.comparacao_colaborativa_email
               WHERE ambiente_id=%s AND destinatario=%s AND conteudo_hash=%s""",
            (ambiente_id, destinatario, conteudo_hash),
        ).fetchone()
        if not row:
            raise DemandaValidationError("O registro de envio não está mais disponível.", field="ambiente_id")
        return dict(row), False


def finalizar(ident: str, status: str, detalhe: str, *, dsn: bool = False,
              leitura: bool = False) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            """UPDATE ahp.comparacao_colaborativa_email
               SET envio_status=%s, detalhe=%s, dsn_solicitada=%s, leitura_solicitada=%s,
                   atualizado_em=now() WHERE id=%s RETURNING *""",
            (status, detalhe, dsn, leitura, ident),
        ).fetchone()
    if not row:
        raise DemandaValidationError("O histórico do envio foi removido durante a operação.", field="ambiente_id")
    return dict(row)


def registrar_evento(ident: str, tipo: str, fonte: str) -> None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM ahp.comparacao_colaborativa_email WHERE id=%s FOR UPDATE", (ident,),
        ).fetchone()
        if not row:
            raise DemandaValidationError("O histórico do envio não existe mais.", field="ambiente_id")
        eventos = list(row["eventos"])
        if any(e["fonte"] == fonte and e["tipo"] == tipo for e in eventos):
            return
        eventos.append({"tipo": tipo, "fonte": fonte, "coletado_em": datetime.now(timezone.utc).isoformat()})
        entrega = row["entrega_status"]
        prioridade = {"sem_confirmacao": 0, "adiada": 1, "confirmada": 2, "falha": 3}
        if tipo in prioridade and prioridade[tipo] > prioridade[entrega]:
            entrega = tipo
        leitura = "confirmada" if tipo == "leitura" else row["leitura_status"]
        conn.execute(
            """UPDATE ahp.comparacao_colaborativa_email
               SET entrega_status=%s, leitura_status=%s, eventos=%s, atualizado_em=now() WHERE id=%s""",
            (entrega, leitura, Jsonb(eventos), ident),
        )
