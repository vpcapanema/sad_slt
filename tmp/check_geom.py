import psycopg
from psycopg.rows import dict_row
c = psycopg.connect(host='56.125.163.194', port=5433, user='sigma_user', password='Malditas131533***', dbname='slt_db', sslmode='disable', row_factory=dict_row)
cur = c.cursor()
cur.execute("SELECT codigo, relatorio_fase1->>'concluido_em' as ce FROM hierarquizacao_demandas.hierarquizacao_portfolio WHERE relatorio_fase1 <> '{}'::jsonb ORDER BY ce DESC NULLS LAST LIMIT 5")
for r in cur.fetchall():
    print(r)
print('---')
cur.execute("SELECT codigo, dados_hierarquizacao FROM hierarquizacao_demandas.hierarquizacao_portfolio WHERE relatorio_fase1 <> '{}'::jsonb ORDER BY relatorio_fase1->>'concluido_em' DESC NULLS LAST LIMIT 1")
row = cur.fetchone()
codigo, dados = row['codigo'], row['dados_hierarquizacao']
print('codigo:', codigo)
objs = (dados or {}).get('objetos', [])
print('objetos:', len(objs))
for i, o in enumerate(objs[:6]):
    f1 = (o.get('hierarquizacao') or {}).get('fase_1') or {}
    r = (f1.get('restricao') or {}).get('intersecoes') or []
    k = (f1.get('risco') or {}).get('intersecoes') or []
    print(f'obj {i}: r={len(r)} k={len(k)}')
    for h in (r + k)[:2]:
        print(f'   keys={list(h.keys())}')
        g = h.get('geometria')
        print(f'   nome={str(h.get("nome", ""))[:40]!r} geom_type={type(g).__name__} preview={str(g)[:200]!r}')
