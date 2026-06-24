"""Exporta Catalogo_Hierarquico_SLT.xlsx → data/catalogo-slt.json."""
import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "data" / "Catalogo_Hierarquico_SLT.xlsx"
OUT = ROOT / "data" / "catalogo-slt.json"


def sheet_rows(wb, name):
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    headers = [str(h) if h is not None else "" for h in rows[0]]
    data = []
    for row in rows[1:]:
        if not any(row):
            continue
        data.append({headers[i]: row[i] for i in range(len(headers)) if headers[i]})
    return data


def main():
    if not XLSX.is_file():
        raise SystemExit(f"Arquivo não encontrado: {XLSX}")
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    cat = {
        "version": "1.0",
        "gerado_de": XLSX.name,
        "diretorias": sheet_rows(wb, "Diretorias"),
        "planos": sheet_rows(wb, "Planos"),
        "frentes_pli": sheet_rows(wb, "Frentes_Atuacao_PLI"),
        "eixos_pef": sheet_rows(wb, "Eixos_PEF"),
        "corredores_tic": sheet_rows(wb, "Corredores_TIC"),
        "modais": sheet_rows(wb, "Modais"),
        "tipologias": sheet_rows(wb, "Tipologias_Intervencao"),
        "carteiras": sheet_rows(wb, "Carteiras_Projetos"),
        "entidades": sheet_rows(wb, "Entidades_Demandantes"),
    }
    wb.close()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cat, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Exportado: {OUT}")


if __name__ == "__main__":
    main()
