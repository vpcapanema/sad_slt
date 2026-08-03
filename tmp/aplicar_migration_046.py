"""Aplica migration 046 no banco slt_db configurado (VM ou local)."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # type: ignore

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

import psycopg  # type: ignore

use_sigma = os.getenv("SLT_USE_SIGMA_POSTGRES", "false").lower() == "true"
if use_sigma:
    host = os.environ["SIGMA_POSTGRES_HOST"]
    port = os.environ["SIGMA_POSTGRES_PORT"]
    user = os.environ["SIGMA_POSTGRES_USER"]
    pwd = os.environ["SIGMA_POSTGRES_PASSWORD"]
    db = "slt_db"
    dsn = f"postgresql://{user}:{pwd}@{host}:{port}/{db}"
else:
    dsn = os.environ["SLT_DATABASE_URL"]

sql_file = Path(__file__).resolve().parents[1] / "database" / "046_regras_classificacao_fase1.sql"
sql = sql_file.read_text(encoding="utf-8-sig")

with psycopg.connect(dsn, autocommit=False) as conn:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM geoprocessamento.regra_classificacao_fase1 WHERE ativo=true"
        )
        (n,) = cur.fetchone()
        print(f"[migration 046] OK — regras ativas: {n}")
