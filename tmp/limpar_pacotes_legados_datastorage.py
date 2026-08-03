"""Remove pacotes compactados legados de data/geoespacial/uploads/datastorage/.

Contexto:
    Antes da refatoração, `commit_prepared` mantinha tanto o pacote (.zip / .rar
    / .7z / .tar*) quanto a pasta `<nome>.contents/` extraída. Agora só a pasta
    extraída é persistida. Este script:

    1. Para cada pacote legado com pasta `.contents/` correspondente, atualiza
       `geoprocessamento.camada_importada.metadados->>'arquivo_original'` do
       registro no PostGIS, apontando para a pasta `.contents/` em vez do zip.
    2. Apaga fisicamente o pacote do disco.

Uso:
    python tmp/limpar_pacotes_legados_datastorage.py            # dry-run
    python tmp/limpar_pacotes_legados_datastorage.py --apply    # executa
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from api.db.connection import get_connection  # noqa: E402
from api.path_policy import project_path  # noqa: E402


PACOTES_SUFIXOS = {".zip", ".rar", ".7z", ".tar", ".tgz", ".gz", ".tar.gz", ".tar.bz2", ".tar.xz"}


def _eh_pacote(caminho: Path) -> bool:
    nome = caminho.name.lower()
    if any(nome.endswith(sufixo) for sufixo in (".tar.gz", ".tar.bz2", ".tar.xz")):
        return True
    return caminho.suffix.lower() in PACOTES_SUFIXOS


def _relativo(caminho: Path) -> str:
    return caminho.relative_to(project_path(".")).as_posix()


def _atualizar_metadados_no_postgis(caminho_antigo: str, caminho_novo: str) -> int:
    """Atualiza metadados->>'arquivo_original' na tabela camada_importada.

    Retorna a quantidade de linhas afetadas. Cobre tanto o formato achatado
    (`metadados->>'arquivo_original'`) quanto o aninhado
    (`metadados->'metadados'->>'arquivo_original'`) por segurança.
    """
    afetadas = 0
    with get_connection() as conn:
        # Formato achatado (padrão atual).
        result = conn.execute(
            """UPDATE geoprocessamento.camada_importada
               SET metadados = jsonb_set(metadados, '{arquivo_original}', to_jsonb(%s::text))
               WHERE metadados->>'arquivo_original' = %s""",
            (caminho_novo, caminho_antigo),
        )
        afetadas += result.rowcount or 0

        # Formato aninhado (compatibilidade histórica).
        result = conn.execute(
            """UPDATE geoprocessamento.camada_importada
               SET metadados = jsonb_set(
                   metadados,
                   '{metadados,arquivo_original}',
                   to_jsonb(%s::text)
               )
               WHERE metadados->'metadados'->>'arquivo_original' = %s""",
            (caminho_novo, caminho_antigo),
        )
        afetadas += result.rowcount or 0
        conn.commit()
    return afetadas


def _contar_referencias(caminho_antigo: str) -> int:
    with get_connection() as conn:
        row = conn.execute(
            """SELECT count(*) AS total FROM geoprocessamento.camada_importada
               WHERE metadados->>'arquivo_original' = %s
                  OR metadados->'metadados'->>'arquivo_original' = %s""",
            (caminho_antigo, caminho_antigo),
        ).fetchone()
    return int(row["total"]) if row else 0


def executar(aplicar: bool) -> None:
    datastorage = project_path("data/geoespacial/uploads/datastorage")
    if not datastorage.exists():
        print(f"[skip] {datastorage} não existe")
        return

    total_pacotes = 0
    total_com_contents = 0
    total_sem_contents = 0
    total_bytes = 0
    total_referencias_atualizadas = 0
    total_removidos = 0

    for categoria in ("vetor", "raster", "geodatabase"):
        pasta = datastorage / categoria
        if not pasta.exists():
            continue
        print(f"\n== {pasta.relative_to(REPO_ROOT).as_posix()} ==")
        for item in sorted(pasta.iterdir(), key=lambda p: p.name.lower()):
            if not item.is_file() or not _eh_pacote(item):
                continue
            total_pacotes += 1
            pasta_contents = pasta / f"{item.name}.contents"
            tamanho = item.stat().st_size
            rel_antigo = _relativo(item)
            rel_novo = _relativo(pasta_contents)

            if pasta_contents.exists() and pasta_contents.is_dir():
                total_com_contents += 1
                total_bytes += tamanho
                referencias = _contar_referencias(rel_antigo)
                acao_metadados = (
                    f"apontar {referencias} registro(s) PostGIS para {pasta_contents.name}"
                    if referencias else "sem registros PostGIS ligados"
                )
                if aplicar:
                    if referencias:
                        afetadas = _atualizar_metadados_no_postgis(rel_antigo, rel_novo)
                        total_referencias_atualizadas += afetadas
                    item.unlink()
                    total_removidos += 1
                    print(f"  [OK] {item.name}  ({tamanho/1024:,.0f} KB) — {acao_metadados}")
                else:
                    print(f"  [DRY] {item.name}  ({tamanho/1024:,.0f} KB) — {acao_metadados}")
            else:
                total_sem_contents += 1
                print(f"  [??] {item.name} — sem pasta .contents/ correspondente (mantido)")

    print("\n===== RESUMO =====")
    print(f"Pacotes analisados          : {total_pacotes}")
    print(f"Com .contents/ (limpáveis)  : {total_com_contents}")
    print(f"Sem .contents/ (mantidos)   : {total_sem_contents}")
    print(f"Espaço liberável            : {total_bytes/1024/1024:,.1f} MB")
    if aplicar:
        print(f"Pacotes removidos           : {total_removidos}")
        print(f"Registros PostGIS ajustados : {total_referencias_atualizadas}")
    else:
        print("MODO DRY-RUN — nenhuma alteração feita. Reexecute com --apply para aplicar.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Aplica de fato as mudanças")
    args = parser.parse_args()
    executar(args.apply)


if __name__ == "__main__":
    main()
