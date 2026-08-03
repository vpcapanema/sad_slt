"""Diagnóstico de linhas em geoespacial.camada_geoespacial vs pastas em disco.

Uso: python tmp/inspect_camadas_vetor.py
"""
from __future__ import annotations

import os
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


def _load_env() -> None:
    env_path = Path(".env")
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        name, value = stripped.split("=", 1)
        name = name.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(name, value)


def _slt_url() -> str:
    # Se SLT_USE_SIGMA_POSTGRES=true, ignoramos qualquer SLT_DATABASE_URL vindo
    # do .env local (que aponta para 127.0.0.1:5434) e reconstruimos a URL da VM.
    if os.environ.get("SLT_USE_SIGMA_POSTGRES") == "true":
        from urllib.parse import quote

        user = quote(os.environ["SIGMA_POSTGRES_USER"], safe="")
        pwd = quote(os.environ["SIGMA_POSTGRES_PASSWORD"], safe="")
        host = os.environ["SIGMA_POSTGRES_HOST"]
        port = os.environ["SIGMA_POSTGRES_PORT"]
        ssl = os.environ.get("SIGMA_POSTGRES_SSLMODE", "require")
        return f"postgresql://{user}:{pwd}@{host}:{port}/slt_db?sslmode={ssl}"
    if url := os.environ.get("SLT_DATABASE_URL"):
        return url
    raise RuntimeError("Sem SLT_DATABASE_URL disponivel")


def main() -> None:
    _load_env()
    url = _slt_url()
    root = Path("data/geoespacial/uploads/datastorage/vetor")
    on_disk = sorted(p.name for p in root.iterdir() if p.is_dir())
    print(f"[DISK] {len(on_disk)} pastas em {root}:")
    for name in on_disk:
        print(f"   - {name}")

    with psycopg.connect(url, connect_timeout=10, row_factory=dict_row) as conn:
        for tabela in ("camada_importada", "camada_processada", "camada_homologada"):
            regclass = conn.execute(
                f"SELECT to_regclass('geoprocessamento.{tabela}') AS t"
            ).fetchone()
            if not regclass or not regclass["t"]:
                print(f"\n[DB] geoprocessamento.{tabela} NAO existe")
                continue

            cols = [
                c["column_name"]
                for c in conn.execute(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_schema='geoprocessamento' AND table_name=%s "
                    "ORDER BY ordinal_position",
                    (tabela,),
                ).fetchall()
            ]
            print(f"\n[DB] geoprocessamento.{tabela} colunas: {cols}")

            date_col = "atualizado_em" if "atualizado_em" in cols else (
                "criado_em" if "criado_em" in cols else "id"
            )

            rows = conn.execute(
                f"SELECT id, recurso_sessao_id, nome, tipo, formato, metadados, "
                f"{date_col} AS ord "
                f"FROM geoprocessamento.{tabela} ORDER BY {date_col}"
            ).fetchall()
            print(f"\n[DB] {len(rows)} linhas em geoprocessamento.{tabela}:")
            for row in rows:
                metadados = row.get("metadados") or {}
                arquivo_original = ""
                if isinstance(metadados, dict):
                    inner = metadados.get("metadados") if isinstance(metadados.get("metadados"), dict) else None
                    arquivo_original = str(
                        (inner or {}).get("arquivo_original")
                        or metadados.get("arquivo_original")
                        or ""
                    )
                print(
                    f"   ord={row.get('ord')}"
                    f" | id={row.get('id')}"
                    f" | sessao={row.get('recurso_sessao_id')}"
                    f" | nome={row.get('nome')!r}"
                    f" | formato={row.get('formato')!r}"
                    f" | arquivo={arquivo_original!r}"
                )

            # orfas: arquivo_original nao existe em disco
            print(f"\n[XCHECK] {tabela} - linhas com arquivo_original faltando em disco:")
            orfas = 0
            for row in rows:
                metadados = row.get("metadados") or {}
                arquivo_original = ""
                if isinstance(metadados, dict):
                    inner = metadados.get("metadados") if isinstance(metadados.get("metadados"), dict) else None
                    arquivo_original = str(
                        (inner or {}).get("arquivo_original")
                        or metadados.get("arquivo_original")
                        or ""
                    ).replace("\\", "/")
                if not arquivo_original:
                    continue
                path = Path(arquivo_original)
                if not path.exists():
                    print(f"   * orfa id={row.get('id')} caminho={arquivo_original}")
                    orfas += 1
            if orfas == 0:
                print("   (nenhuma)")

            # arquivo_original duplicado no mesmo storage
            from collections import defaultdict
            by_path: dict[str, list] = defaultdict(list)
            for row in rows:
                metadados = row.get("metadados") or {}
                arquivo_original = ""
                if isinstance(metadados, dict):
                    inner = metadados.get("metadados") if isinstance(metadados.get("metadados"), dict) else None
                    arquivo_original = str(
                        (inner or {}).get("arquivo_original")
                        or metadados.get("arquivo_original")
                        or ""
                    ).replace("\\", "/")
                if arquivo_original:
                    by_path[arquivo_original].append(row.get("id"))
            print(f"\n[XCHECK] {tabela} - arquivo_original duplicado:")
            any_dup = False
            for path, ids in by_path.items():
                if len(ids) > 1:
                    any_dup = True
                    print(f"   * {path} -> {ids}")
            if not any_dup:
                print("   (nenhum)")

            # nome duplicado no mesmo storage
            by_name: dict[str, list] = defaultdict(list)
            for row in rows:
                nome = row.get("nome") or ""
                if nome:
                    by_name[nome].append(row.get("id"))
            print(f"\n[XCHECK] {tabela} - nome duplicado:")
            any_dup = False
            for nome, ids in by_name.items():
                if len(ids) > 1:
                    any_dup = True
                    print(f"   * {nome!r} -> {ids}")
            if not any_dup:
                print("   (nenhum)")


if __name__ == "__main__":
    main()
