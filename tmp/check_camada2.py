import psycopg
from psycopg.rows import dict_row
c = psycopg.connect(host='56.125.163.194', port=5433, user='sigma_user', password='Malditas131533***', dbname='slt_db', sslmode='disable', row_factory=dict_row)
cur = c.cursor()
for i in ('191c4f8c-1d3b-42f3-910a-51e3ddb0f84b', '782ba550-3b4e-41d5-b33a-46dfde0fe8e4'):
    cur.execute("SELECT id::text, recurso_sessao_id::text, nome_publicacao FROM geoprocessamento.camada_homologada WHERE id=%s::uuid OR recurso_sessao_id=%s", (i, i))
    for r in cur.fetchall():
        print(i, '->', r)
