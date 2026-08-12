"""Reescala os atributos brutos da Fase 2 e orienta componentes de favorabilidade."""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from exportar_mapas_fase2_relatorio import (  # noqa: E402
    GRADE_ATTRIBUTES,
    GRADE_PATH,
    NETWORK_ATTRIBUTES,
    NETWORK_PATH,
)
from criterios_favorabilidade_fase2 import (  # noqa: E402
    CRITERIA_BY_GROUP,
    available_criteria,
    validate_catalog_against_matrix,
)

OUTPUT_DIR = ROOT / "data" / "geoespacial" / "outputs"
GRADE_OUTPUT = OUTPUT_DIR / "favorabilidade_grade_normalizada.gpkg"
NETWORK_OUTPUT = OUTPUT_DIR / "favorabilidade_rede_normalizada.gpkg"
REPORT_PATH = OUTPUT_DIR / "normalizacao_favorabilidade_fase2.json"


def minmax(series: pd.Series) -> tuple[pd.Series, dict]:
    numeric = pd.to_numeric(series, errors="coerce").astype("float64")
    valid = numeric[np.isfinite(numeric)]
    if valid.empty:
        normalized = pd.Series(np.nan, index=series.index, dtype="float64")
        return normalized, {"minimo": None, "maximo": None, "validos": 0, "ausentes": len(series)}
    minimum = float(valid.min())
    maximum = float(valid.max())
    if maximum == minimum:
        normalized = pd.Series(np.where(numeric.notna(), 1.0, np.nan), index=series.index)
    else:
        normalized = ((numeric - minimum) / (maximum - minimum)).clip(0.0, 1.0)
    return normalized, {
        "minimo": minimum,
        "maximo": maximum,
        "validos": int(valid.size),
        "ausentes": int(numeric.isna().sum()),
    }


def safe_ratio(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    numerator = pd.to_numeric(numerator, errors="coerce").astype("float64")
    denominator = pd.to_numeric(denominator, errors="coerce").astype("float64")
    result = numerator.div(denominator.where(denominator > 0))
    return result.clip(0.0, 1.0)


def register(
    metadata: list[dict],
    source: str,
    output: str,
    operation: str,
    direction: str,
    stats: dict | None = None,
) -> None:
    metadata.append({
        "atributo_origem": source,
        "atributo_saida": output,
        "operacao": operation,
        "relacao": direction,
        **(stats or {}),
    })


def normalize_raw_attributes(
    frame: gpd.GeoDataFrame,
    attributes: dict[str, tuple[str, str]],
    metadata: list[dict],
) -> None:
    for attribute in attributes:
        if attribute not in frame.columns:
            raise KeyError(f"Atributo obrigatório ausente: {attribute}")
        output = f"{attribute}_n"
        frame[output], stats = minmax(frame[attribute])
        register(metadata, attribute, output, "minmax=(x-min)/(max-min)", "reescalonamento", stats)


def materialize_criteria(
    frame: gpd.GeoDataFrame,
    group: str,
    metadata: list[dict],
) -> None:
    for criterion in available_criteria(group):
        missing = set(criterion.components) - set(frame.columns)
        if missing:
            raise KeyError(f"Componentes ausentes em {criterion.code}: {sorted(missing)}")
        values = frame[list(criterion.components)].apply(pd.to_numeric, errors="coerce")
        frame[criterion.output] = values.mean(axis=1, skipna=True).clip(0.0, 1.0)
        frame.loc[values.notna().sum(axis=1) == 0, criterion.output] = np.nan
        register(
            metadata,
            "+".join(criterion.components),
            criterion.output,
            "media_simples_dos_indicadores_do_criterio",
            "favorabilidade",
            {
                "validos": int(frame[criterion.output].notna().sum()),
                "ausentes": int(frame[criterion.output].isna().sum()),
            },
        )


def prepare_grade(frame: gpd.GeoDataFrame) -> tuple[gpd.GeoDataFrame, list[dict]]:
    result = frame.copy()
    metadata: list[dict] = []
    normalize_raw_attributes(result, GRADE_ATTRIBUTES, metadata)

    ratios = {
        "g_agua_fr": ("g_agua_rede", "g_agua_tot"),
        "g_esg_fr": ("g_esg_adeq", "g_esg_tot"),
        "g_lixo_fr": ("g_lixo_adeq", "g_lixo_tot"),
    }
    for output, (numerator, denominator) in ratios.items():
        result[output] = safe_ratio(result[numerator], result[denominator])
        register(metadata, f"{numerator}/{denominator}", output, "proporcao_adequada", "positiva")

    favorable = {
        "f_mass_pib": (result["g_pib_setor_n"], "g_pib_setor_n", "positiva"),
        "f_mass_pop": (result["g_pop_n"], "g_pop_n", "positiva"),
        "f_vul_pibpc": (1.0 - result["g_pib_pc_n"], "g_pib_pc_n", "negativa"),
        "f_vul_agua": (1.0 - result["g_agua_fr"], "g_agua_fr", "negativa"),
        "f_vul_esg": (1.0 - result["g_esg_fr"], "g_esg_fr", "negativa"),
        "f_vul_lixo": (1.0 - result["g_lixo_fr"], "g_lixo_fr", "negativa"),
        "f_vul_adens": (result["g_mond_n"], "g_mond_n", "positiva"),
    }
    for output, (values, source, direction) in favorable.items():
        result[output] = values.clip(0.0, 1.0)
        operation = "valor_normalizado" if direction == "positiva" else "1-valor_normalizado"
        register(metadata, source, output, operation, direction)
    materialize_criteria(result, "grade", metadata)
    return result, metadata


def prepare_network(frame: gpd.GeoDataFrame) -> tuple[gpd.GeoDataFrame, list[dict]]:
    result = frame.copy()
    metadata: list[dict] = []
    normalize_raw_attributes(result, NETWORK_ATTRIBUTES, metadata)

    extent_km = pd.to_numeric(result["ext_m"], errors="coerce").div(1000.0)
    density_sources = {
        "c11_fat_km": "c11_fatal",
        "c11_grav_km": "c11_grave",
        "c12_ped_km": "c12_pedes",
        "c12_bike_km": "c12_bike",
        "c12_moto_km": "c12_moto",
        "c13_sin_km": "c13_nsin_gr",
    }
    for output, source in density_sources.items():
        result[output] = pd.to_numeric(result[source], errors="coerce").div(extent_km.where(extent_km > 0))
        register(metadata, f"{source}/(ext_m/1000)", output, "densidade_por_km", "positiva")
        normalized = f"{output}_n"
        result[normalized], stats = minmax(result[output])
        register(metadata, output, normalized, "minmax=(x-min)/(max-min)", "positiva", stats)

    result["c15_urb_fr"] = safe_ratio(result["c15_urb_m"], result["ext_m"])
    result["c15_dens_fr"] = safe_ratio(result["c15_dens_m"], result["ext_m"])
    register(metadata, "c15_urb_m/ext_m", "c15_urb_fr", "proporcao", "positiva")
    register(metadata, "c15_dens_m/ext_m", "c15_dens_fr", "proporcao", "positiva")

    positive = {
        "f_c1_vdm": "c1_vdm_n", "f_c1_vdmmax": "c1_vdm_max_n",
        "f_c2_vc": "c2_vc_n", "f_c2_vcmax": "c2_vc_max_n", "f_c2_los": "c2_los_n",
        "f_c3_ratio": "c3_ratio_n", "f_c3_delay": "c3_delay_s_n",
        "f_c5_relevo": "c5_relevo_n",
        "f_c11_fatal": "c11_fat_km_n", "f_c11_grave": "c11_grav_km_n",
        "f_c12_pedes": "c12_ped_km_n", "f_c12_bike": "c12_bike_km_n",
        "f_c12_moto": "c12_moto_km_n", "f_c13_graves": "c13_sin_km_n",
        "f_c14_urb": "c14_urb_fr", "f_c15_port": "c15_port",
        "f_c15_urb": "c15_urb_fr", "f_c15_dens": "c15_dens_fr",
    }
    negative = {
        "f_c3_veloc": "c3_cur_n", "f_c5_veloc": "c5_v0_n",
        "f_c7_polo": "c7_polo_m_n", "f_c8_hidrov": "c8_hidrov_m_n",
        "f_c9_ferrov": "c9_ferrov_m_n", "f_c10_porto": "c10_porto_m_n",
        "f_c10_aero": "c10_aero_m_n", "f_c16_interm": "c16_interm_m_n",
    }
    for output, source in positive.items():
        result[output] = pd.to_numeric(result[source], errors="coerce").clip(0.0, 1.0)
        register(metadata, source, output, "valor_normalizado", "positiva")
    for output, source in negative.items():
        result[output] = (1.0 - pd.to_numeric(result[source], errors="coerce")).clip(0.0, 1.0)
        register(metadata, source, output, "1-valor_normalizado", "negativa")
    materialize_criteria(result, "rede", metadata)
    return result, metadata


def write_metadata_table(path: Path, metadata: list[dict]) -> None:
    with sqlite3.connect(path) as connection:
        connection.execute("DROP TABLE IF EXISTS metadados_normalizacao")
        connection.execute("""
            CREATE TABLE metadados_normalizacao (
                id INTEGER PRIMARY KEY,
                atributo_origem TEXT NOT NULL,
                atributo_saida TEXT NOT NULL,
                operacao TEXT NOT NULL,
                relacao TEXT NOT NULL,
                minimo REAL,
                maximo REAL,
                validos INTEGER,
                ausentes INTEGER
            )
        """)
        columns = [
            "atributo_origem", "atributo_saida", "operacao", "relacao",
            "minimo", "maximo", "validos", "ausentes",
        ]
        connection.executemany(
            f"INSERT INTO metadados_normalizacao ({','.join(columns)}) VALUES ({','.join('?' for _ in columns)})",
            [[item.get(column) for column in columns] for item in metadata],
        )
        connection.execute("""
            INSERT OR REPLACE INTO gpkg_contents
                (table_name, data_type, identifier, description, last_change)
            VALUES
                ('metadados_normalizacao', 'attributes', 'Metadados de normalização',
                 'Regras, faixas observadas e orientação dos atributos reescalonados',
                 strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        """)
        connection.commit()


def validate(frame: gpd.GeoDataFrame, columns: list[str]) -> None:
    for column in columns:
        valid = pd.to_numeric(frame[column], errors="coerce").dropna()
        if not valid.between(0.0, 1.0).all():
            raise ValueError(f"Valores fora de 0-1 em {column}")


def main() -> None:
    validate_catalog_against_matrix()
    grade_raw = gpd.read_file(GRADE_PATH, layer="favorabilidade_grade")
    network_raw = gpd.read_file(NETWORK_PATH, layer="favorabilidade_rede")
    grade, grade_metadata = prepare_grade(grade_raw)
    network, network_metadata = prepare_network(network_raw)

    grade_normalized = [criterion.output for criterion in available_criteria("grade")]
    network_normalized = [criterion.output for criterion in available_criteria("rede")]
    validate(grade, grade_normalized)
    validate(network, network_normalized)

    for path in (GRADE_OUTPUT, NETWORK_OUTPUT):
        if path.exists():
            path.unlink()
    grade.to_file(GRADE_OUTPUT, layer="favorabilidade_grade_normalizada", driver="GPKG")
    network.to_file(NETWORK_OUTPUT, layer="favorabilidade_rede_normalizada", driver="GPKG")
    write_metadata_table(GRADE_OUTPUT, grade_metadata)
    write_metadata_table(NETWORK_OUTPUT, network_metadata)

    report = {
        "metodo": "minmax",
        "formula": "(x-min)/(max-min)",
        "inversao_relacao_negativa": "1-n",
        "nodata": "preservado",
        "criterios_matriz_v3": {
            group: [
                {
                    "codigo": criterion.code,
                    "criterio": criterion.matrix_name,
                    "campo": criterion.output,
                    "componentes": list(criterion.components),
                    "disponivel": criterion.available,
                }
                for criterion in criteria
            ]
            for group, criteria in CRITERIA_BY_GROUP.items()
        },
        "agregacao_final": "executada separadamente por média simples dos critérios calculáveis",
        "grade": {"arquivo": str(GRADE_OUTPUT.relative_to(ROOT)), "feicoes": len(grade), "metadados": grade_metadata},
        "rede": {"arquivo": str(NETWORK_OUTPUT.relative_to(ROOT)), "feicoes": len(network), "metadados": network_metadata},
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Grade: {GRADE_OUTPUT} ({len(grade)} feições)")
    print(f"Rede: {NETWORK_OUTPUT} ({len(network)} feições)")


if __name__ == "__main__":
    main()
