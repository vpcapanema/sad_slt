"""Aplica migration 047 no banco slt_db."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # type: ignore

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

import psycopg  # type: ignore

if os.getenv("SLT_USE_SIGMA_POSTGRES", "false").lower() == "true":
    dsn = (
        f"postgresql://{os.environ['SIGMA_POSTGRES_USER']}:"
        f"{os.environ['SIGMA_POSTGRES_PASSWORD']}@"
        f"{os.environ['SIGMA_POSTGRES_HOST']}:{os.environ['SIGMA_POSTGRES_PORT']}/slt_db"
    )
else:
    dsn = os.environ["SLT_DATABASE_URL"]

sql = (Path(__file__).resolve().parents[1] / "database" / "047_fase1_fontes_produto.sql").read_text(encoding="utf-8-sig")

with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM geoprocessamento.fonte_fase1 WHERE ativo=true")
        (nf,) = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM geoprocessamento.produto_homologado_fase1")
        (np_,) = cur.fetchone()
        print(f"[migration 047] OK — fontes ativas: {nf} · produtos homologados: {np_}")
