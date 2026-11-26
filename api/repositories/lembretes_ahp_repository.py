"""Configuração, participantes elegíveis e histórico de lembretes do AHP."""
from datetime import datetime

from psycopg.types.json import Jsonb

from api.db.connection import get_connection


def configuracoes() -> list[dict]:
    with get_connection() as conn:
        return conn.execute(
            """SELECT a.id, a.nome, a.modo_participacao, a.criado_em, a.valido_ate,
                      a.lembrete_notificacoes_ativas AS notificacoes_ativas,
                      c.faixas, c.atualizado_em AS configurado_em
                 FROM ahp.comparacao_colaborativa_ambiente a
                 LEFT JOIN ahp.comparacao_colaborativa_lembrete_config c ON c.ambiente_id = a.id
                ORDER BY lower(a.nome), a.id""",
        ).fetchall()


def ambiente(ambiente_id: str) -> dict | None:
    with get_connection() as conn:
        return conn.execute(
            """SELECT a.id, a.nome, a.status, a.modo_participacao, a.criado_em, a.valido_ate,
                      a.lembrete_notificacoes_ativas AS notificacoes_ativas,
                      c.faixas, c.atualizado_em AS configurado_em
                 FROM ahp.comparacao_colaborativa_ambiente a
                 LEFT JOIN ahp.comparacao_colaborativa_lembrete_config c ON c.ambiente_id = a.id
                WHERE a.id = %s""", (ambiente_id,),
        ).fetchone()


def definir_notificacoes(ambiente_id: str, ativas: bool) -> bool:
    with get_connection() as conn:
        return conn.execute(
            """UPDATE ahp.comparacao_colaborativa_ambiente
                  SET lembrete_notificacoes_alteradas_em =
                        CASE WHEN lembrete_notificacoes_ativas IS DISTINCT FROM %s THEN clock_timestamp()
                             ELSE lembrete_notificacoes_alteradas_em END,
                      lembrete_notificacoes_ativas = %s
                WHERE id = %s RETURNING id""",
            (ativas, ativas, ambiente_id),
        ).fetchone() is not None


def configurar(ambiente_id: str, faixas: list[dict], usuario_id: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO ahp.comparacao_colaborativa_lembrete_config AS atual (ambiente_id, faixas, usuario_id)
               VALUES (%s, %s, %s)
               ON CONFLICT (ambiente_id) DO UPDATE SET faixas = EXCLUDED.faixas,
                      usuario_id = EXCLUDED.usuario_id, atualizado_em = clock_timestamp()
                 WHERE atual.faixas IS DISTINCT FROM EXCLUDED.faixas""",
            (ambiente_id, Jsonb(faixas), usuario_id),
        )


def participantes(ambiente_id: str | None = None, *, email: str | None = None,
                  somente_elegiveis: bool = False) -> list[dict]:
    with get_connection() as conn:
        return conn.execute(
            """SELECT a.id AS ambiente_id, a.nome AS julgamento, a.token, a.modo_participacao,
                      m.nome AS matriz_nome, a.arquivo_matriz_nome, a.atualizado_em AS versao_convite,
                      a.status, a.criado_em, a.valido_ate, a.lembrete_prazo_alterado_em AS prazo_alterado_em,
                      a.lembrete_notificacoes_ativas AS notificacoes_ativas,
                      a.lembrete_notificacoes_alteradas_em AS notificacoes_alteradas_em,
                      c.faixas, c.atualizado_em AS configurado_em, p.nome, p.email,
                      coalesce(nullif(btrim(r.instituicao), ''), p.instituicao) AS instituicao,
                      p.inscricao_id, p.inscrito_em, r.id AS resposta_id, r.status AS resposta,
                      r.iniciado_em, r.enviado_em, convite.clique_em, convite.primeiro_convite,
                      ultimo.previsto_em AS ultima_tentativa,
                      ultimo.status AS estado_ultima_tentativa, aceito.finalizado_em AS ultimo_envio
                 FROM ahp.comparacao_colaborativa_ambiente a
                 JOIN LATERAL (
                    SELECT i.email, i.nome_completo AS nome, i.instituicao, i.id AS inscricao_id, i.criado_em AS inscrito_em
                      FROM ahp.comparacao_colaborativa_inscricao i
                     WHERE a.modo_participacao = 'publico' AND i.ambiente_id = a.id
                    UNION ALL
                    SELECT lower(btrim(c->>'email')),
                           coalesce(nullif(btrim(c->>'nome'), ''), lower(btrim(c->>'email'))),
                           nullif(btrim(c->>'instituicao'), ''), NULL::uuid, NULL::timestamptz
                      FROM jsonb_array_elements(a.convites) c
                     WHERE a.modo_participacao = 'convite' AND nullif(btrim(c->>'email'), '') IS NOT NULL
                 ) p ON true
                 LEFT JOIN ahp.matriz_criterios_premissas m ON m.id = a.matriz_id
                 LEFT JOIN ahp.comparacao_colaborativa_lembrete_config c ON c.ambiente_id = a.id
                 LEFT JOIN ahp.comparacao_colaborativa_resposta r ON r.ambiente_id = a.id
                       AND CASE WHEN a.modo_participacao = 'publico' THEN r.inscricao_id = p.inscricao_id
                                ELSE lower(btrim(r.email)) = p.email END
                 LEFT JOIN LATERAL (
                    SELECT min(e.link_acessado_em) AS clique_em,
                           min(coalesce(e.smtp_aceito_em, e.criado_em))
                             FILTER (WHERE e.envio_status = 'aceito_smtp') AS primeiro_convite
                      FROM ahp.comparacao_colaborativa_email e
                     WHERE a.modo_participacao = 'convite' AND e.ambiente_id = a.id
                       AND e.destinatario = p.email AND e.natureza = 'convite'
                 ) convite ON true
                 LEFT JOIN LATERAL (
                    SELECT e.previsto_em, e.status FROM ahp.comparacao_colaborativa_lembrete_envio e
                     WHERE e.ambiente_id = a.id AND e.destinatario = p.email ORDER BY e.previsto_em DESC LIMIT 1
                 ) ultimo ON true
                 LEFT JOIN LATERAL (
                    SELECT e.finalizado_em FROM ahp.comparacao_colaborativa_lembrete_envio e
                     WHERE e.ambiente_id = a.id AND e.destinatario = p.email AND e.status = 'aceito_smtp'
                     ORDER BY e.previsto_em DESC LIMIT 1
                 ) aceito ON true
                WHERE (%s::uuid IS NULL OR a.id = %s) AND (%s::text IS NULL OR p.email = %s)
                  AND (NOT %s OR (a.lembrete_notificacoes_ativas
                       AND a.status = 'ativa' AND a.valido_ate > clock_timestamp()
                       AND CASE WHEN a.modo_participacao = 'publico'
                                THEN r.id IS NOT NULL AND r.status IS DISTINCT FROM 'enviada'
                                ELSE r.id IS NULL AND convite.clique_em IS NOT NULL END))
                ORDER BY p.nome, p.email""", (ambiente_id, ambiente_id, email, email, somente_elegiveis),
        ).fetchall()


def historico(ambiente_id: str, email: str) -> list[dict]:
    with get_connection() as conn:
        return conn.execute(
            """SELECT previsto_em, percentual, status, detalhe, criado_em, finalizado_em
                 FROM ahp.comparacao_colaborativa_lembrete_envio
                WHERE ambiente_id = %s AND destinatario = %s ORDER BY previsto_em DESC""", (ambiente_id, email),
        ).fetchall()


def reservar(ambiente_id: str, email: str, previsto_em: datetime, percentual: float, mensagem_id: str) -> bool:
    with get_connection() as conn:
        return conn.execute(
            """INSERT INTO ahp.comparacao_colaborativa_lembrete_envio
                      (ambiente_id, destinatario, previsto_em, percentual, mensagem_id)
               SELECT id, %s, %s, %s, %s
                 FROM ahp.comparacao_colaborativa_ambiente
                WHERE id = %s AND lembrete_notificacoes_ativas
               ON CONFLICT (ambiente_id, destinatario, previsto_em) DO NOTHING
               RETURNING mensagem_id""", (email, previsto_em, percentual, mensagem_id, ambiente_id),
        ).fetchone() is not None


def finalizar(mensagem_id: str, status: str, detalhe: str) -> None:
    with get_connection() as conn:
        conn.execute(
            """UPDATE ahp.comparacao_colaborativa_lembrete_envio
                  SET status = %s, detalhe = %s, finalizado_em = clock_timestamp()
                WHERE mensagem_id = %s AND status = 'enviando'""", (status, detalhe, mensagem_id),
        )


def recuperar_interrompidos() -> None:
    with get_connection() as conn:
        conn.execute(
            """UPDATE ahp.comparacao_colaborativa_lembrete_envio
                  SET status = 'indeterminado', finalizado_em = clock_timestamp(),
                      detalhe = 'A rotina foi interrompida antes de registrar o resultado do envio.'
                WHERE status = 'enviando'""",
        )
