"""Gera as superfícies da Fase 2 pela média simples dos componentes orientados."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

from criterios_favorabilidade_fase2 import available_criteria, validate_catalog_against_matrix

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "data" / "geoespacial" / "outputs"

SPECS = {
    "grade": {
        "input": OUTPUT_DIR / "favorabilidade_grade_normalizada.gpkg",
        "input_layer": "favorabilidade_grade_normalizada",
        "output": OUTPUT_DIR / "favorabilidade_grade_media_simples.gpkg",
        "output_layer": "favorabilidade_grade_media_simples",
    },
    "rede": {
        "input": OUTPUT_DIR / "favorabilidade_rede_normalizada.gpkg",
        "input_layer": "favorabilidade_rede_normalizada",
        "output": OUTPUT_DIR / "favorabilidade_rede_media_simples.gpkg",
        "output_layer": "favorabilidade_rede_media_simples",
    },
}
REPORT_PATH = OUTPUT_DIR / "superficies_favorabilidade_media_simples_fase2.json"
VALUE_COLUMN = "fav_media_simples"
COUNT_COLUMN = "n_criterios"


def calculate_simple_mean(frame: gpd.GeoDataFrame, group: str) -> tuple[gpd.GeoDataFrame, list[str]]:
    components = [criterion.output for criterion in available_criteria(group)]
    missing = set(components) - set(frame.columns)
    if missing:
        raise KeyError(f"Critérios da matriz v3 ausentes em {group}: {sorted(missing)}")

    values = frame[components].apply(pd.to_numeric, errors="coerce")
    result = frame.copy()
    result[COUNT_COLUMN] = values.notna().sum(axis=1).astype("int16")
    result[VALUE_COLUMN] = values.mean(axis=1, skipna=True).clip(0.0, 1.0)
    result.loc[result[COUNT_COLUMN] == 0, VALUE_COLUMN] = np.nan
    return result, components


def write_methodology(path: Path, group: str, components: list[str]) -> None:
    with sqlite3.connect(path) as connection:
        connection.execute("DROP TABLE IF EXISTS metadados_media_simples")
        connection.execute("""
            CREATE TABLE metadados_media_simples (
                id INTEGER PRIMARY KEY,
                grupo TEXT NOT NULL,
                atributo_saida TEXT NOT NULL,
                operacao TEXT NOT NULL,
                regra_nodata TEXT NOT NULL,
                criterios TEXT NOT NULL,
                total_criterios INTEGER NOT NULL
            )
        """)
        connection.execute(
            """
            INSERT INTO metadados_media_simples
                (grupo, atributo_saida, operacao, regra_nodata, criterios, total_criterios)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                group,
                VALUE_COLUMN,
                "media_aritmetica_simples",
                "media dos criterios da matriz v3 validos; pesos iguais recalculados localmente",
                json.dumps(components, ensure_ascii=False),
                len(components),
            ),
        )
        connection.execute("""
            INSERT OR REPLACE INTO gpkg_contents
                (table_name, data_type, identifier, description, last_change)
            VALUES
                ('metadados_media_simples', 'attributes', 'Metadados da média simples',
                 'Componentes e regra de NoData da superfície de favorabilidade',
                 strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        """)
        connection.commit()


def validate(frame: gpd.GeoDataFrame, components: list[str]) -> None:
    values = pd.to_numeric(frame[VALUE_COLUMN], errors="coerce").dropna()
    if values.empty or not values.between(0.0, 1.0).all():
        raise ValueError(f"{VALUE_COLUMN} vazio ou fora da faixa 0-1")
    counts = pd.to_numeric(frame[COUNT_COLUMN], errors="coerce")
    if not counts.between(0, len(components)).all():
        raise ValueError(f"{COUNT_COLUMN} fora da faixa esperada")


def main() -> None:
    validate_catalog_against_matrix()
    report = {
        "metodo": "media_aritmetica_simples",
        "formula": "soma(criterios_validos)/n_criterios_validos",
        "regra_nodata": "pesos iguais recalculados localmente sobre critérios da matriz v3 válidos",
        "fonte_criterios": "documentacao/matrizes/Matriz_Criterios_Premissas_PLI-SP_v3.xlsx",
        "produtos": {},
    }

    for group, spec in SPECS.items():
        frame = gpd.read_file(spec["input"], layer=spec["input_layer"])
        result, components = calculate_simple_mean(frame, group)
        validate(result, components)

        output = spec["output"]
        if output.exists():
            output.unlink()
        result.to_file(output, layer=spec["output_layer"], driver="GPKG")
        write_methodology(output, group, components)

        valid = result[VALUE_COLUMN].dropna()
        complete = result[COUNT_COLUMN].eq(len(components))
        report["produtos"][group] = {
            "arquivo": str(output.relative_to(ROOT)),
            "camada": spec["output_layer"],
            "feicoes": len(result),
            "componentes": components,
            "feicoes_completas": int(complete.sum()),
            "feicoes_com_componentes_ausentes": int((~complete).sum()),
            "minimo": float(valid.min()),
            "maximo": float(valid.max()),
        }
        print(f"{group}: {output} ({len(result)} feições; {len(components)} critérios)")

    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Relatório: {REPORT_PATH}")


if __name__ == "__main__":
    main()
