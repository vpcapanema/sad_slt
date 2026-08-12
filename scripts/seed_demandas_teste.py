"""Executa a massa controlada de demandas preservando UTF-8 de ponta a ponta."""
from __future__ import annotations

import os
from pathlib import Path

import psycopg


def main() -> None:
    seed_path = Path(os.environ["SLT_SEED_FILE"])
    sql = seed_path.read_text(encoding="utf-8")
    with psycopg.connect(os.environ["SLT_DATABASE_URL"]) as connection:
        connection.execute("SET client_encoding TO 'UTF8'")
        connection.execute(sql)
        counts = connection.execute(
            """SELECT
                (SELECT count(*) FROM demandas.plano),
                (SELECT count(*) FROM demandas.programa),
                (SELECT count(*) FROM demandas.projeto),
                (SELECT count(DISTINCT plano_id) FROM demandas.plano_unidade_espacial),
                (SELECT count(DISTINCT programa_id) FROM demandas.programa_unidade_espacial),
                (SELECT count(*) FROM demandas.projeto WHERE geometria IS NOT NULL)
            """
        ).fetchone()
        if counts != (6, 11, 60, 6, 11, 60):
            raise RuntimeError(f"Contagens inesperadas após a carga: {counts}")
        utf8_ok = connection.execute(
            """SELECT
                EXISTS (SELECT 1 FROM demandas.plano WHERE nome LIKE '%Logística%'),
                EXISTS (SELECT 1 FROM demandas.plano WHERE nome LIKE '%Expansão%'),
                EXISTS (SELECT 1 FROM demandas.programa WHERE descricao LIKE '%Ampliação%'),
                EXISTS (SELECT 1 FROM demandas.projeto WHERE nome LIKE '%São José%'),
                EXISTS (SELECT 1 FROM demandas.projeto WHERE descricao LIKE '%hierarquização%')
            """
        ).fetchone()
        if utf8_ok != (True, True, True, True, True):
            raise RuntimeError(f"Validação UTF-8 falhou: {utf8_ok}")
    print("Carga UTF-8 aplicada: 6 planos, 11 programas e 60 projetos.")


if __name__ == "__main__":
    main()
