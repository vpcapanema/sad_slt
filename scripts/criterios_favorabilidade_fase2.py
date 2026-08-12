"""Catálogo dos critérios calculáveis da Fase 2 conforme a matriz v3."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "documentacao" / "matrizes" / "Matriz_Criterios_Premissas_PLI-SP_v3.xlsx"
MATRIX_SHEET = "Matriz Crit Premissas v3"
MATRIX_STAGE = "Favorabilidade territorial e da rede"


@dataclass(frozen=True)
class Criterion:
    code: str
    group: str
    matrix_name: str
    output: str
    components: tuple[str, ...]
    alias: str
    available: bool = True


GRADE_CRITERIA = (
    Criterion(
        "G01", "grade", "Localização em áreas de alta massa econômica",
        "crit_g01_massa_economica", ("g_pib_setor_n",),
        "Localização em áreas de alta massa econômica",
    ),
    Criterion(
        "G02", "grade", "Localização em áreas de maior vulnerabilidade territorial",
        "crit_g02_vulnerabilidade", (
            "f_vul_pibpc", "f_vul_agua", "f_vul_esg", "f_vul_lixo", "f_vul_adens",
        ),
        "Localização em áreas de maior vulnerabilidade territorial",
    ),
)

NETWORK_CRITERIA = (
    Criterion(
        "R01", "rede", "Proximidade com segmentos rodoviários de VDM alto",
        "crit_r01_vdm", ("f_c1_vdm",), "Proximidade com segmentos rodoviários de VDM alto",
    ),
    Criterion(
        "R02", "rede", "Proximidade com segmentos de saturação elevada",
        "crit_r02_saturacao", ("f_c2_vcmax", "f_c2_los"),
        "Proximidade com segmentos de saturação elevada",
    ),
    Criterion(
        "R03", "rede", "Proximidade com segmentos de lentidão recorrente",
        "crit_r03_lentidao", ("f_c3_delay",), "Proximidade com segmentos de lentidão recorrente",
    ),
    Criterion(
        "R04", "rede", "Proximidade com segmentos de pavimento degradado",
        "crit_r04_pavimento", (), "Proximidade com segmentos de pavimento degradado", False,
    ),
    Criterion(
        "R05", "rede", "Proximidade com segmentos de geometria deficiente",
        "crit_r05_geometria", ("f_c5_relevo", "f_c5_veloc"),
        "Proximidade com segmentos de geometria deficiente",
    ),
    Criterion(
        "R06", "rede", "Proximidade com segmentos de forte sobrecarga sazonal",
        "crit_r06_sazonalidade", (), "Proximidade com segmentos de forte sobrecarga sazonal", False,
    ),
    Criterion(
        "R07", "rede", "Maior acessibilidade temporal aos destinos relevantes",
        "crit_r07_acess_temporal", ("f_c7_polo",),
        "Maior acessibilidade temporal aos destinos relevantes",
    ),
    Criterion(
        "R08", "rede", "Maior acessibilidade funcional a eixos hidroviários eficientes",
        "crit_r08_hidrovia", ("f_c8_hidrov",),
        "Maior acessibilidade funcional a eixos hidroviários eficientes",
    ),
    Criterion(
        "R09", "rede", "Maior acessibilidade funcional à malha ferroviária estratégica",
        "crit_r09_ferrovia", ("f_c9_ferrov",),
        "Maior acessibilidade funcional à malha ferroviária estratégica",
    ),
    Criterion(
        "R10", "rede", "Maior acessibilidade funcional a polos logísticos estratégicos",
        "crit_r10_polos", ("f_c10_porto", "f_c10_aero"),
        "Maior acessibilidade funcional a polos logísticos estratégicos",
    ),
    Criterion(
        "R11", "rede", "Proximidade com segmentos de alta gravidade de acidentes",
        "crit_r11_gravidade", ("f_c11_fatal", "f_c11_grave"),
        "Proximidade com segmentos de alta gravidade de acidentes",
    ),
    Criterion(
        "R12", "rede", "Proximidade com segmentos de alta incidência de acidentes com usuários vulneráveis",
        "crit_r12_vulneraveis", ("f_c12_pedes", "f_c12_bike", "f_c12_moto"),
        "Proximidade com segmentos de alta incidência de acidentes com usuários vulneráveis",
    ),
    Criterion(
        "R13", "rede", "Proximidade com concentração elevada de pontos críticos de acidentes",
        "crit_r13_pontos_criticos", ("f_c13_graves",),
        "Proximidade com concentração elevada de pontos críticos de acidentes",
    ),
    Criterion(
        "R14", "rede", "Proximidade com segmentos de alto conflito urbano-regional",
        "crit_r14_conflito_urbano", ("f_c14_urb",),
        "Proximidade com segmentos de alto conflito urbano-regional",
    ),
    Criterion(
        "R15", "rede", "Proximidade com segmentos de alta interferência urbano-portuária",
        "crit_r15_interferencia_portuaria", ("f_c15_urb",),
        "Proximidade com segmentos de alta interferência urbano-portuária",
    ),
    Criterion(
        "R16", "rede", "Maior acessibilidade funcional a nós intermodais estratégicos",
        "crit_r16_intermodal", ("f_c16_interm",),
        "Maior acessibilidade funcional a nós intermodais estratégicos",
    ),
)

CRITERIA_BY_GROUP = {"grade": GRADE_CRITERIA, "rede": NETWORK_CRITERIA}


def available_criteria(group: str) -> tuple[Criterion, ...]:
    return tuple(criterion for criterion in CRITERIA_BY_GROUP[group] if criterion.available)


def validate_catalog_against_matrix() -> None:
    sheet = load_workbook(MATRIX_PATH, data_only=True, read_only=True)[MATRIX_SHEET]
    rows = list(sheet.values)
    headers = {value: index for index, value in enumerate(rows[0])}
    matrix_criteria = {
        row[headers["Critério"]]
        for row in rows[1:]
        if row[headers["Etapa"]] == MATRIX_STAGE
    }
    catalog_criteria = {
        criterion.matrix_name
        for criteria in CRITERIA_BY_GROUP.values()
        for criterion in criteria
    }
    missing = catalog_criteria - matrix_criteria
    if missing:
        raise ValueError(f"Critérios não encontrados na matriz v3: {sorted(missing)}")


if __name__ == "__main__":
    validate_catalog_against_matrix()
    for group, criteria in CRITERIA_BY_GROUP.items():
        available = sum(criterion.available for criterion in criteria)
        print(f"{group}: {available}/{len(criteria)} critérios calculáveis")
