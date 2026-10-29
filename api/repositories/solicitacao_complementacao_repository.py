"""Solicitações explícitas de complementação e seu histórico."""
from typing import Any, overload
from datetime import datetime, timezone

from api.db.connection import get_connection
from api.exceptions import DemandaValidationError
from psycopg.types.json import Jsonb

TABLE = "demandas.solicitacao_complementacao_demanda"

@overload
def _publica(row: dict[str, Any]) -> dict[str, Any]: ...


@overload
def _publica(row: None) -> None: ...


def _publica(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {k: v for k, v in row.items() if k not in {"parecer_tecnico", "historico_edicoes"}}


def listar(*, tipo=None, codigo=None, hierarquizacao=None, abertas=True, interno=False):
    filtros, params = [], []
    if abertas:
        filtros.append("status = 'registrada'")
    for campo, valor in (("demanda_tipo", tipo), ("demanda_codigo", codigo), ("hierarquizacao_codigo", hierarquizacao)):
        if valor is not None:
            filtros.append(f"{campo} = %s")
            params.append(valor)
    with get_connection() as conn:
        rows = conn.execute(f"SELECT * FROM {TABLE} WHERE " + (" AND ".join(filtros) or "TRUE") + " ORDER BY solicitado_em, id", params).fetchall()
        return rows if interno else [_publica(row) for row in rows]

def obter(id, *, lock=False, interno=False):
    with get_connection() as conn:
        row = conn.execute(f"SELECT * FROM {TABLE} WHERE id=%s" + (" FOR UPDATE" if lock else ""), (id,)).fetchone()
        return row if interno else _publica(row)

def criar(tipo, codigo, categorias, descricao, user, hierarquizacao=None):
    with get_connection() as conn:
        pedido = conn.execute(f"""INSERT INTO {TABLE}
          (demanda_tipo,demanda_codigo,categorias,descricao,solicitado_por,solicitado_nome,hierarquizacao_codigo,origem)
          VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
          (tipo,codigo,categorias,descricao,user.id,user.nome or 'Usuário',hierarquizacao,
           'hierarquizacao' if hierarquizacao else 'analise')).fetchone()
        if pedido is None:
            raise RuntimeError("Não foi possível registrar a solicitação de complementação.")
        return pedido

def registrar_edicao(tipo, codigo, categoria, usuario_id, hierarquizacao=None):
    with get_connection() as conn:
        conn.execute(f"""UPDATE {TABLE} SET categorias_salvas = categorias_salvas ||
          jsonb_build_object(%s::text,jsonb_build_object('por',%s::text,'em',now()))
          WHERE demanda_tipo=%s AND demanda_codigo=%s AND status='registrada'
          AND %s=ANY(categorias) AND hierarquizacao_codigo IS NOT DISTINCT FROM %s""",
          (categoria,str(usuario_id),tipo,codigo,categoria,hierarquizacao))

def atender(id, usuario_id):
    with get_connection() as conn:
        return _publica(conn.execute(f"""UPDATE {TABLE} SET status='atendida',atendido_por=%s,atendido_em=now()
          WHERE id=%s AND status='registrada' RETURNING *""", (usuario_id,id)).fetchone())


def editar(id, campos, user):
    """Chamado sob bloqueio transacional; auditoria não é fornecida pelo cliente."""
    with get_connection() as conn:
        anterior = obter(id, lock=True, interno=True)
        evento = {"revisao": anterior["revisao"], "por": str(user.id),
                  "valores": {k: anterior[k] for k in campos}}
        return conn.execute(f"""UPDATE {TABLE}
          SET descricao=%s, categorias=%s, parecer_tecnico=%s, mensagem_gestor=%s,
              revisao=revisao+1, atualizado_por=%s, atualizado_em=now(),
              historico_edicoes=historico_edicoes || jsonb_build_array(
                %s::jsonb || jsonb_build_object('em',now()))
          WHERE id=%s RETURNING *""",
          (campos["descricao"], campos["categorias"], campos["parecer_tecnico"],
           campos["mensagem_gestor"], user.id, Jsonb(evento), id)).fetchone()


def reservar_notificacao(id, notificacao):
    """Reserva persistente antes do SMTP; interrupcoes nao provocam reenvio automatico."""
    with get_connection() as conn:
        revisao = notificacao.get("revisao_solicitacao")
        filtro = " AND revisao=%s" if revisao is not None else ""
        params = (Jsonb(notificacao), id, revisao) if revisao is not None else (Jsonb(notificacao), id)
        return conn.execute(f"""UPDATE {TABLE} SET notificacao=%s || jsonb_build_object(
           'tentativas_anteriores', COALESCE(notificacao->'tentativas_anteriores', '[]'::jsonb) ||
           CASE WHEN COALESCE(notificacao->>'status','') NOT IN ('','nao_enviado')
             THEN jsonb_build_array(notificacao - 'tentativas_anteriores') ELSE '[]'::jsonb END)
          WHERE id=%s AND status='registrada'
          AND COALESCE(notificacao->>'status','') NOT IN ('enviando','aceito_smtp','indeterminado')
          {filtro} RETURNING *""", params).fetchone()


def registrar_notificacao(id, notificacao):
    with get_connection() as conn:
        row = conn.execute(f"SELECT notificacao FROM {TABLE} WHERE id=%s FOR UPDATE", (id,)).fetchone()
        atual = (row or {}).get("notificacao") or {}
        if not row or atual.get("id_mensagem") != notificacao.get("id_mensagem"):
            raise DemandaValidationError("A notificação mudou durante o envio. Atualize antes de continuar.", field="notificacao")
        resultado = dict(notificacao)
        if "tentativas_anteriores" in atual:
            resultado["tentativas_anteriores"] = atual["tentativas_anteriores"]
        if atual.get("eventos"):
            resultado.update(eventos=atual["eventos"],
                             entrega_status=atual.get("entrega_status", "sem_confirmacao"),
                             leitura_status=atual.get("leitura_status", "sem_confirmacao"))
        conn.execute(f"UPDATE {TABLE} SET notificacao=%s WHERE id=%s", (Jsonb(resultado), id))


def registrar_confirmacao(id, mensagem_id, tipo, fonte):
    with get_connection() as conn:
        row = conn.execute(f"SELECT notificacao FROM {TABLE} WHERE id=%s FOR UPDATE", (id,)).fetchone()
        if not row or (row["notificacao"] or {}).get("id_mensagem") != mensagem_id:
            raise DemandaValidationError("A notificação mudou. Atualize antes de consultar as confirmações.", field="notificacao")
        notificacao = dict(row["notificacao"])
        eventos = list(notificacao.get("eventos") or [])
        if any(e["fonte"] == fonte and e["tipo"] == tipo for e in eventos):
            return
        eventos.append({"tipo": tipo, "fonte": fonte, "coletado_em": datetime.now(timezone.utc).isoformat()})
        prioridade = {"sem_confirmacao": 0, "adiada": 1, "confirmada": 2, "falha": 3}
        if tipo in prioridade and prioridade[tipo] > prioridade[notificacao.get("entrega_status", "sem_confirmacao")]:
            notificacao["entrega_status"] = tipo
        if tipo == "leitura":
            notificacao["leitura_status"] = "confirmada"
        notificacao["eventos"] = eventos
        conn.execute(f"UPDATE {TABLE} SET notificacao=%s WHERE id=%s", (Jsonb(notificacao), id))
