"""Solicitações explícitas de complementação e seu histórico."""
from api.db.connection import get_connection

TABLE = "demandas.solicitacao_complementacao_demanda"

def listar(*, tipo=None, codigo=None, hierarquizacao=None, abertas=True):
    filtros, params = [], []
    if abertas:
        filtros.append("status = 'solicitada'")
    for campo, valor in (("demanda_tipo", tipo), ("demanda_codigo", codigo), ("hierarquizacao_codigo", hierarquizacao)):
        if valor is not None:
            filtros.append(f"{campo} = %s")
            params.append(valor)
    with get_connection() as conn:
        return conn.execute(f"SELECT * FROM {TABLE} WHERE " + (" AND ".join(filtros) or "TRUE") + " ORDER BY solicitado_em, id", params).fetchall()

def obter(id, *, lock=False):
    with get_connection() as conn:
        return conn.execute(f"SELECT * FROM {TABLE} WHERE id=%s" + (" FOR UPDATE" if lock else ""), (id,)).fetchone()

def criar(tipo, codigo, categorias, descricao, user, hierarquizacao=None):
    with get_connection() as conn:
        return conn.execute(f"""INSERT INTO {TABLE}
          (demanda_tipo,demanda_codigo,categorias,descricao,solicitado_por,solicitado_nome,hierarquizacao_codigo)
          VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
          (tipo,codigo,categorias,descricao,user.id,user.nome or 'Usuário',hierarquizacao)).fetchone()

def registrar_edicao(tipo, codigo, categoria, usuario_id, hierarquizacao=None):
    with get_connection() as conn:
        conn.execute(f"""UPDATE {TABLE} SET categorias_salvas = categorias_salvas ||
          jsonb_build_object(%s::text,jsonb_build_object('por',%s::text,'em',now()))
          WHERE demanda_tipo=%s AND demanda_codigo=%s AND status='solicitada'
          AND %s=ANY(categorias) AND hierarquizacao_codigo IS NOT DISTINCT FROM %s""",
          (categoria,str(usuario_id),tipo,codigo,categoria,hierarquizacao))

def atender(id, usuario_id):
    with get_connection() as conn:
        return conn.execute(f"""UPDATE {TABLE} SET status='atendida',atendido_por=%s,atendido_em=now()
          WHERE id=%s AND status='solicitada' RETURNING *""", (usuario_id,id)).fetchone()
