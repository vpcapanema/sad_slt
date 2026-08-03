"""Verifica se os IDs marcados como duplicatas antigas em camada_importada
sao referenciados por outras tabelas antes de deletar.
"""
from __future__ import annotations

import os
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

DUPLICATES_TO_DELETE = [
    ("5d405efd-8477-4ad7-bdc7-0d6b489e712d", "sitios_arqueologicos"),
    ("6a466f7d-9442-4fe1-9b1c-ec8471fdbeef", "quilombos"),
    ("0055cb36-06b0-41f9-9dae-9e0137fa0465", "tis_poligonais"),
    ("d0b16d12-88d7-4123-8885-8b63663a2e45", "aprmaj_zoneamento_10_sma_2015_pol"),
    ("10e8c60c-9340-4de9-bf03-d57a023919ff", "aprmatc_subareas_2015_pol"),
    ("29801814-935d-41a4-849d-d804e84b3548", "assentamentos"),
]


def _load_env() -> None:
    env_path = Path(".env")
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        name, value = stripped.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip('"').strip("'"))


def _slt_url() -> str:
    if os.environ.get("SLT_USE_SIGMA_POSTGRES") == "true":
        from urllib.parse import quote

        user = quote(os.environ["SIGMA_POSTGRES_USER"], safe="")
        pwd = quote(os.environ["SIGMA_POSTGRES_PASSWORD"], safe="")
        host = os.environ["SIGMA_POSTGRES_HOST"]
        port = os.environ["SIGMA_POSTGRES_PORT"]
        ssl = os.environ.get("SIGMA_POSTGRES_SSLMODE", "require")
        return f"postgresql://{user}:{pwd}@{host}:{port}/slt_db?sslmode={ssl}"
    return os.environ["SLT_DATABASE_URL"]


def main() -> None:
    _load_env()
    ids = [d[0] for d in DUPLICATES_TO_DELETE]
    with psycopg.connect(_slt_url(), connect_timeout=10, row_factory=dict_row) as conn:
        # 1. Feicoes vinculadas a cada duplicata antiga
        print("[FEICOES] Feicoes vinculadas a cada duplicata (sera limpo por CASCADE):")
        for row in conn.execute(
            "SELECT camada_id::text AS camada_id, COUNT(*) AS qtd "
            "FROM geoprocessamento.camada_importada_feicao "
            "WHERE camada_id = ANY(%s::uuid[]) "
            "GROUP BY camada_id",
            (ids,),
        ).fetchall():
            print(f"   {row['camada_id']}: {row['qtd']} feicoes")

        # 2. Referencias em camada_homologada
        print("\n[HOMOLOGADAS] Referencias em camada_homologada.origem_camada_id:")
        rows = conn.execute(
            "SELECT id::text AS id, nome_publicacao, origem_camada_id::text "
            "FROM geoprocessamento.camada_homologada "
            "WHERE origem_camada_id = ANY(%s::uuid[])",
            (ids,),
        ).fetchall()
        if rows:
            for row in rows:
                print(f"   BLOQUEIO: homologada {row['id']} ({row['nome_publicacao']!r}) "
                      f"origem_camada_id={row['origem_camada_id']}")
        else:
            print("   (nenhuma)")

        # 3. Referencias em camada_processada.linhagem (JSONB)
        print("\n[PROCESSADAS] Referencias em camada_processada.linhagem (JSONB):")
        rows = conn.execute(
            "SELECT id::text AS id, nome, linhagem::text AS linhagem "
            "FROM geoprocessamento.camada_processada "
            "WHERE linhagem::text ~* %s",
            ("|".join(ids),),
        ).fetchall()
        if rows:
            for row in rows:
                print(f"   BLOQUEIO: processada {row['id']} ({row['nome']!r})")
                print(f"      linhagem={row['linhagem']}")
        else:
            print("   (nenhuma)")

        # 4. Varredura generica em todas as tabelas por foreign-keys apontando p/ camada_importada
        print("\n[FK] Foreign keys apontando para camada_importada:")
        for row in conn.execute(
            """
            SELECT tc.table_schema, tc.table_name, kcu.column_name, rc.delete_rule
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON kcu.constraint_name = tc.constraint_name
             AND kcu.table_schema  = tc.table_schema
            JOIN information_schema.referential_constraints rc
              ON rc.constraint_name = tc.constraint_name
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_schema = 'geoprocessamento'
              AND ccu.table_name   = 'camada_importada'
            """
        ).fetchall():
            print(f"   {row['table_schema']}.{row['table_name']}.{row['column_name']} "
                  f"(ON DELETE {row['delete_rule']})")


if __name__ == "__main__":
    main()
