"""Persistência de envios e retornos, sem armazenar o corpo dos emails."""
from __future__ import annotations

from datetime import datetime, timezone
from collections.abc import Generator
from contextlib import ExitStack, contextmanager
from typing import Any
from uuid import uuid4
import re

from psycopg.types.json import Jsonb
from psycopg.pq import TransactionStatus

from api.db.connection import get_connection
from api.exceptions import DemandaValidationError
from api.services.email_status_catalogo import texto_explicacao

_STATUS_DSN = re.compile(r"Status: (\d\.\d{1,3}\.\d{1,3})")


def _explicar_eventos(eventos: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Acrescenta a explicação do catálogo a eventos antigos, gravados antes do catálogo existir."""
    eventos = eventos or []
    for evento in eventos:
        detalhe = str(evento.get("detalhe") or "")
        casamento = _STATUS_DSN.search(detalhe)
        if casamento and "Relatório original:" not in detalhe:
            explicacao = texto_explicacao(casamento.group(1), detalhe)
            if explicacao:
                evento["detalhe"] = f"{explicacao} Relatório original: {detalhe}"
    return eventos


def listar(ambiente_id: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM ahp.comparacao_colaborativa_email WHERE ambiente_id=%s ORDER BY criado_em",
            (ambiente_id,),
        ).fetchall()
    resultado = [dict(row) for row in rows]
    for registro in resultado:
        _explicar_eventos(registro.get("eventos"))
    return resultado


def listar_para_confirmacao() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT * FROM ahp.comparacao_colaborativa_email
               WHERE envio_status IN ('aceito_smtp', 'indeterminado', 'enviando')
                 AND entrega_status <> 'falha'
                 AND NOT (entrega_status = 'confirmada' AND leitura_status = 'confirmada')
               ORDER BY criado_em, id"""
        ).fetchall()
    return [dict(row) for row in rows]


@contextmanager
def bloquear_coleta() -> Generator[bool, None, None]:
    chave = "ahp-email:coleta-confirmacoes"
    pilha = ExitStack()
    try:
        conn = pilha.enter_context(get_connection())
        row = conn.execute(
            "SELECT pg_try_advisory_lock(hashtextextended(%s,0)) AS adquirido", (chave,),
        ).fetchone()
        if row is None:
            raise RuntimeError("O banco não confirmou o bloqueio da coleta de emails.")
        adquirido = bool(row["adquirido"])
        conn.commit()
        try:
            yield adquirido
        finally:
            if adquirido:
                try:
                    if conn.info.transaction_status == TransactionStatus.INERROR:
                        conn.rollback()
                    conn.execute("SELECT pg_advisory_unlock(hashtextextended(%s,0))", (chave,))
                except BaseException:
                    conn.close()
                    raise
    finally:
        pilha.close()


def reservar(ambiente_id: str, destinatario: str, conteudo_hash: str, mensagem_id: str,
             usuario_id: str, versao: datetime, *, natureza: str = "convite",
             validar_ativo: bool = True) -> tuple[dict[str, Any], bool]:
    with get_connection() as conn:
        conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                     (f"ahp-email:{ambiente_id}:{destinatario}:{natureza}",))
        condicao_ativa = "AND status='ativa' AND valido_ate >= now()" if validar_ativo else ""
        atual = conn.execute(
            f"""SELECT id FROM ahp.comparacao_colaborativa_ambiente
               WHERE id=%s AND atualizado_em=%s {condicao_ativa}
               FOR SHARE""", (ambiente_id, versao),
        ).fetchone()
        if not atual:
            raise DemandaValidationError(
                "O julgamento mudou ou seu prazo encerrou. Reabra o registro antes de enviar.",
                field="ambiente_id",
            )
        row = conn.execute(
            """INSERT INTO ahp.comparacao_colaborativa_email
               (id,ambiente_id,destinatario,conteudo_hash,mensagem_id,usuario_id,natureza)
               VALUES (%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (ambiente_id,destinatario,conteudo_hash) DO NOTHING RETURNING *""",
            (uuid4(), ambiente_id, destinatario, conteudo_hash, mensagem_id, usuario_id, natureza),
        ).fetchone()
        if row:
            return dict(row), True
        row = conn.execute(
            """UPDATE ahp.comparacao_colaborativa_email AS email
               SET eventos=eventos || jsonb_build_array(jsonb_build_object(
                       'tipo', 'tentativa', 'fonte', mensagem_id || ':' || atualizado_em::text,
                       'registro', to_jsonb(email) - 'eventos')),
                   envio_status='enviando', detalhe='', atualizado_em=now(), usuario_id=%s,
                   entrega_status='sem_confirmacao', leitura_status='sem_confirmacao',
                   dsn_solicitada=false, leitura_solicitada=false
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


def reservar_monitorado(
    ambiente_id: str, destinatario: str, conteudo_hash: str,
    mensagem_id: str, usuario_id: str, versao: datetime, *,
    natureza: str = "convite", rejeitar_enviado: bool = True,
    validar_ativo: bool = True,
) -> tuple[dict[str, Any], bool]:
    """Serializa envios manuais e automáticos da mesma comunicação."""
    with get_connection() as conn:
        conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                     (f"ahp-email:{ambiente_id}:{destinatario}:{natureza}",))
        # Um convite devolvido pelo servidor do destinatário (entrega falha) não
        # chegou: conta como pendente e admite novo envio pelo monitoramento.
        existente = conn.execute(
            """SELECT * FROM ahp.comparacao_colaborativa_email
               WHERE ambiente_id=%s AND lower(destinatario)=%s AND natureza=%s
                 AND envio_status <> 'falha' AND coalesce(entrega_status, '') <> 'falha'
               ORDER BY criado_em DESC LIMIT 1 FOR UPDATE""",
            (ambiente_id, destinatario, natureza),
        ).fetchone()
        if existente:
            if rejeitar_enviado:
                raise DemandaValidationError(
                    "O e-mail não está com status Não enviado nem Devolvido. Atualize o monitoramento antes de continuar.",
                    field="destinatario",
                )
            return dict(existente), False
        anterior = conn.execute(
            """SELECT conteudo_hash FROM ahp.comparacao_colaborativa_email
               WHERE ambiente_id=%s AND lower(destinatario)=%s AND natureza=%s
               ORDER BY criado_em DESC LIMIT 1""", (ambiente_id, destinatario, natureza),
        ).fetchone()
        # A nova tentativa reutiliza o registro da comunicação que falhou.
        return reservar(
            ambiente_id, destinatario, anterior["conteudo_hash"] if anterior else conteudo_hash,
            mensagem_id, usuario_id, versao, natureza=natureza, validar_ativo=validar_ativo,
        )


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


def registrar_evento(ident: str, tipo: str, fonte: str, *, ocorrido_em: str | None = None,
                     detalhe: str = "", origem_data: str = "") -> None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM ahp.comparacao_colaborativa_email WHERE id=%s FOR UPDATE", (ident,),
        ).fetchone()
        if not row:
            raise DemandaValidationError("O histórico do envio não existe mais.", field="ambiente_id")
        eventos = list(row["eventos"])
        existente = next((e for e in eventos if e["fonte"] == fonte and e["tipo"] == tipo), None)
        metadados = {k: v for k, v in {
            "ocorrido_em": ocorrido_em, "detalhe": detalhe, "origem_data": origem_data,
        }.items() if v}
        if existente is not None:
            if all(existente.get(k) == v for k, v in metadados.items()):
                return
            existente.update(metadados)
        else:
            eventos.append({"tipo": tipo, "fonte": fonte, "coletado_em": datetime.now(timezone.utc).isoformat(),
                            **metadados})
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
