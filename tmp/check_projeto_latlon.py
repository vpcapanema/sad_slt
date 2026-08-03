import psycopg

conn = psycopg.connect("postgresql://sigma_user:Malditas131533***@56.125.163.194:5433/slt_db")
cur = conn.cursor()
cur.execute("SELECT count(*) FROM demandas.projeto WHERE latitude IS NULL OR longitude IS NULL")
print("projetos com lat/lon NULL:", cur.fetchone()[0])
cur.execute("SELECT count(*) FROM demandas.projeto")
print("projetos totais:", cur.fetchone()[0])
cur.execute("SELECT codigo, latitude, longitude FROM demandas.projeto ORDER BY codigo LIMIT 8")
for row in cur.fetchall():
    print(row)
