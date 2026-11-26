"""Destinatários de divulgação, independentes das inscrições públicas."""
from uuid import uuid4

from psycopg.types.json import Jsonb

from api.db.connection import ConnectionDict, get_connection


def origens(ambiente_id: str) -> list[dict]:
    with get_connection() as conn:
        return conn.execute(
            """SELECT a.id, a.nome, a.modo_participacao
                 FROM ahp.comparacao_colaborativa_ambiente a
                WHERE a.id <> %s AND CASE WHEN a.modo_participacao = 'publico' THEN EXISTS (
                      SELECT 1 FROM ahp.comparacao_colaborativa_divulgacao d WHERE d.ambiente_id = a.id
                ) ELSE a.convites <> '[]'::jsonb END
                ORDER BY a.nome, a.id""", (ambiente_id,),
        ).fetchall()


def listar(ambiente_id: str, email: str | None = None) -> list[dict]:
    with get_connection() as conn:
        return [dict(row) for row in conn.execute(
            """SELECT d.email, d.nome, coalesce(d.instituicao, i.instituicao) AS instituicao,
                      d.criado_em, i.criado_em AS inscrito_em
                 FROM ahp.comparacao_colaborativa_divulgacao d
                 LEFT JOIN ahp.comparacao_colaborativa_inscricao i
                   ON i.ambiente_id = d.ambiente_id AND i.email = d.email
                WHERE d.ambiente_id = %s AND (%s::text IS NULL OR d.email = %s)
                ORDER BY d.criado_em, d.nome, d.email""", (ambiente_id, email, email),
        ).fetchall()]


def adicionar(conn: ConnectionDict, ambiente_id: str, destinatarios: dict[str, tuple[str, str | None]]) -> dict:
    nomes, instituicoes = zip(*destinatarios.values())
    linhas = conn.execute(
        """WITH lista AS (
               SELECT email, nome, instituicao
                 FROM unnest(%s::text[], %s::text[], %s::text[]) AS entrada(email, nome, instituicao)
           ), inscritos AS (
               SELECT l.email FROM lista l
                WHERE EXISTS (SELECT 1 FROM ahp.comparacao_colaborativa_inscricao i
                               WHERE i.ambiente_id = %s AND lower(i.email) = l.email)
           ), adicionados AS (
               INSERT INTO ahp.comparacao_colaborativa_divulgacao (ambiente_id, email, nome, instituicao)
               SELECT %s, l.email, l.nome, l.instituicao FROM lista l LEFT JOIN inscritos i USING (email)
                WHERE i.email IS NULL
               ON CONFLICT (ambiente_id, email) DO NOTHING RETURNING email
           )
           SELECT l.email, CASE WHEN a.email IS NOT NULL THEN 'adicionado'
                                WHEN i.email IS NOT NULL THEN 'inscrito' ELSE 'convidado' END AS resultado
             FROM lista l LEFT JOIN inscritos i USING (email) LEFT JOIN adicionados a USING (email)
            ORDER BY l.email""",
        (list(destinatarios), list(nomes), list(instituicoes), ambiente_id, ambiente_id),
    ).fetchall()
    return {"adicionados": sum(linha["resultado"] == "adicionado" for linha in linhas),
            "ja_inscritos": [linha["email"] for linha in linhas if linha["resultado"] == "inscrito"],
            "ja_convidados": [linha["email"] for linha in linhas if linha["resultado"] == "convidado"]}


def excluir(conn: ConnectionDict, ambiente_id: str, emails: list[str]) -> int:
    return conn.execute(
        """DELETE FROM ahp.comparacao_colaborativa_divulgacao d
            WHERE d.ambiente_id = %s AND d.email = ANY(%s::text[])
              AND NOT EXISTS (SELECT 1 FROM ahp.comparacao_colaborativa_inscricao i
                               WHERE i.ambiente_id = d.ambiente_id AND lower(i.email) = d.email)""",
        (ambiente_id, emails),
    ).rowcount


def bloquear_lista(conn: ConnectionDict, ambiente_id: str) -> None:
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                 (f"ahp-lista-divulgacao:{ambiente_id}",))


def gravar_contatos(conn: ConnectionDict, ambiente_id: str, contatos: dict[str, tuple[str, str | None, bool]]) -> None:
    # A tabela de divulgação concede INSERT e DELETE à aplicação. Preserve a
    # data original dos contatos renomeados ao repor as linhas na transação.
    emails = list(contatos)
    nomes, instituicoes, informadas = map(list, zip(*contatos.values()))
    substituidos = conn.execute(
        """DELETE FROM ahp.comparacao_colaborativa_divulgacao d
            USING unnest(%s::text[], %s::text[], %s::text[], %s::boolean[]) AS entrada(email, nome, instituicao, informada)
            WHERE d.ambiente_id = %s AND d.email = entrada.email
              AND (d.nome <> entrada.nome OR (entrada.informada AND d.instituicao IS DISTINCT FROM entrada.instituicao))
              AND NOT EXISTS (SELECT 1 FROM ahp.comparacao_colaborativa_inscricao i
                               WHERE i.ambiente_id = d.ambiente_id AND lower(i.email) = d.email)
           RETURNING d.email, d.criado_em, d.instituicao""",
        (emails, nomes, instituicoes, informadas, ambiente_id),
    ).fetchall()
    anteriores = {linha["email"]: linha for linha in substituidos}
    datas = [anteriores.get(email, {}).get("criado_em") for email in emails]
    for indice, email in enumerate(emails):
        if email in anteriores and not informadas[indice]:
            instituicoes[indice] = anteriores[email]["instituicao"]
    conn.execute(
        """INSERT INTO ahp.comparacao_colaborativa_divulgacao (ambiente_id, email, nome, instituicao, criado_em)
           SELECT %s, entrada.email, entrada.nome, entrada.instituicao, coalesce(entrada.criado_em, now())
             FROM unnest(%s::text[], %s::text[], %s::text[], %s::timestamptz[]) AS entrada(email, nome, instituicao, criado_em)
            WHERE NOT EXISTS (
                  SELECT 1 FROM ahp.comparacao_colaborativa_inscricao i
                   WHERE i.ambiente_id = %s AND lower(i.email) = entrada.email)
           ON CONFLICT (ambiente_id, email) DO NOTHING""",
        (ambiente_id, emails, nomes, instituicoes, datas, ambiente_id),
    )


def listar_catalogo() -> list[dict]:
    with get_connection() as conn:
        return conn.execute(
            "SELECT id, nome FROM ahp.comparacao_colaborativa_divulgacao_lista ORDER BY lower(nome), id"
        ).fetchall()


def obter_lista(ident: str) -> dict | None:
    with get_connection() as conn:
        return conn.execute(
            "SELECT id, nome, destinatarios FROM ahp.comparacao_colaborativa_divulgacao_lista WHERE id = %s",
            (ident,),
        ).fetchone()


def salvar_lista(conn: ConnectionDict, contatos: list[dict], *, nome: str | None, ident: str | None) -> dict | None:
    if nome is not None:
        return conn.execute(
            """INSERT INTO ahp.comparacao_colaborativa_divulgacao_lista (id, nome, destinatarios)
               VALUES (%s, %s, %s) ON CONFLICT (lower(nome)) DO NOTHING RETURNING id, nome""",
            (uuid4(), nome, Jsonb(contatos)),
        ).fetchone()
    return conn.execute(
        """UPDATE ahp.comparacao_colaborativa_divulgacao_lista SET destinatarios = %s
            WHERE id = %s RETURNING id, nome""",
        (Jsonb(contatos), ident),
    ).fetchone()


def obter_mensagem(ambiente_id: str) -> dict | None:
    with get_connection() as conn:
        return conn.execute(
            "SELECT assunto, texto FROM ahp.comparacao_colaborativa_divulgacao_mensagem WHERE ambiente_id = %s",
            (ambiente_id,),
        ).fetchone()


def salvar_mensagem(conn: ConnectionDict, ambiente_id: str, assunto: str, texto: str) -> dict:
    return conn.execute(
        """INSERT INTO ahp.comparacao_colaborativa_divulgacao_mensagem (ambiente_id, assunto, texto)
           VALUES (%s, %s, %s) ON CONFLICT (ambiente_id) DO UPDATE
           SET assunto = EXCLUDED.assunto, texto = EXCLUDED.texto
           RETURNING assunto, texto""",
        (ambiente_id, assunto, texto),
    ).fetchone()
