"""Inspecionar rows de geoprocessamento.camada_importada e cruzar com o storage."""
import os
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parent.parent
STORAGE = ROOT / "data" / "geoespacial" / "uploads" / "datastorage"

with psycopg.connect(os.environ["SLT_DATABASE_URL"]) as conn:
    rows = conn.execute(
        """
        SELECT id, recurso_sessao_id, nome, tipo, formato,
               metadados->>'arquivo_original' AS arq_original,
               metadados->>'metadados' AS meta_nested,
               criado_em
        FROM geoprocessamento.camada_importada
        ORDER BY criado_em DESC
        """
    ).fetchall()

print(f"Total rows: {len(rows)}\n")
missing = []
for r in rows:
    row_id, sessao_id, nome, tipo, formato, arq, meta_nested, criado = r
    arq_norm = (arq or "").replace("\\", "/")
    exists = False
    if arq_norm:
        exists = (ROOT / arq_norm).exists()
    tag = "OK " if exists else "MISS"
    print(f"[{tag}] {sessao_id} | {nome!r} | fmt={formato} | arq={arq_norm!r} | criado={criado}")
    if arq_norm and not exists:
        missing.append((row_id, sessao_id, nome, arq_norm))

print("\n--- Linhas cujo arquivo_original NAO existe no storage ---")
for m in missing:
    print(m)
