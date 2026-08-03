import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")
import psycopg

dsn = (
    f"postgresql://{os.environ['SIGMA_POSTGRES_USER']}:{os.environ['SIGMA_POSTGRES_PASSWORD']}"
    f"@{os.environ['SIGMA_POSTGRES_HOST']}:{os.environ['SIGMA_POSTGRES_PORT']}/slt_db"
)
with psycopg.connect(dsn) as c:
    with c.cursor() as cur:
        cur.execute(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_schema='geoprocessamento' AND table_name='produto_fase1' ORDER BY ordinal_position"
        )
        for r in cur.fetchall():
            print(r)
