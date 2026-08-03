import psycopg
from psycopg.rows import dict_row
c = psycopg.connect(host='56.125.163.194', port=5433, user='sigma_user', password='Malditas131533***', dbname='slt_db', sslmode='disable', row_factory=dict_row)
cur = c.cursor()
ids = ('191c4f8c-1d3b-42f3-910a-51e3ddb0f84b', '782ba550-3b4e-41d5-b33a-46dfde0fe8e4')
for i in ids:
    cur.execute("SELECT id::text, nome FROM geoprocessamento.camada WHERE id=%s::uuid", (i,))
    print(i, '=>', cur.fetchone())
    cur.execute("SELECT id::text, nome_publicacao FROM geoprocessamento.camada_homologada WHERE id=%s::uuid", (i,))
    print('  homolog:', cur.fetchone())
