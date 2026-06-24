# -*- coding: utf-8 -*-
"""Atualiza step1: downloads do modelo Matriz Criterios e Premissas (XLSX/CSV)."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STEP1 = ROOT / "ahp" / "step1-criterios.html"

OLD_BTNS = (
    '<div class="ahp-template-buttons">'
    '<button onclick="downloadMatrixTemplate(\'csv\')" class="btn btn-ghost">'
    '<i class="fas fa-file-csv"></i> Baixar Modelo CSV</button>'
    '<button onclick="downloadMatrixTemplate(\'json\')" class="btn btn-ghost">'
    '<i class="fas fa-file-code"></i> Baixar Modelo JSON</button></div>'
)

NEW_BTNS = (
    '<div class="ahp-template-buttons">'
    '<a href="../data/Modelo_Matriz_Criterios_Premissas_Analise.xlsx" '
    'download="Modelo_Matriz_Criterios_Premissas_Analise.xlsx" class="btn btn-ghost">'
    '<i class="fas fa-file-excel"></i> Baixar Modelo XLSX</a>'
    '<a href="../data/Modelo_Matriz_Criterios_Premissas_Analise.csv" '
    'download="Modelo_Matriz_Criterios_Premissas_Analise.csv" class="btn btn-ghost">'
    '<i class="fas fa-file-csv"></i> Baixar Modelo CSV</a></div>'
)

OLD_FMT = (
    "<strong>Formato esperado:</strong>"
    '<ul class="info-list">'
    "<li>CSV: Matriz quadrada com nomes dos critérios na primeira linha/coluna</li>"
    "<li>JSON: Objeto com arrays criteria e matrix (matriz quadrada)</li>"
    "</ul>"
)

NEW_FMT = (
    "<strong>Formato esperado:</strong>"
    '<ul class="info-list">'
    "<li>XLSX: planilha «Matriz de Criterios e Premissas» (colunas A–G), com listas suspensas</li>"
    "<li>CSV: mesmas colunas Dimensao, Criterio, Premissa, Relacao, Metricas, Fonte, Mandatorio</li>"
    "<li>Consulte a aba «Exemplo de preenchimento» no XLSX para referência</li>"
    "</ul>"
)

OLD_FILL = (
    "<strong>Preencha a matriz</strong>"
    "<p>Edite o arquivo baixado com suas comparações pareadas usando a escala de Saaty (1-9).</p>"
)

NEW_FILL = (
    "<strong>Preencha a matriz</strong>"
    "<p>Informe uma linha por critério, com premissa obrigatória. "
    "Use as listas suspensas do XLSX para Dimensão, Relação e Mandatório.</p>"
)


SCRIPT_OLD_MARKER = '<script src="js/script.js"></script><script>let uploadedMatrixData'
SCRIPT_NEW = """    <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
    <script src="js/script.js"></script>
    <script src="js/matriz-premissas.js"></script>
    <script src="js/step1-upload-matriz.js"></script>
<script>"""


def patch_step1(text: str) -> str:
    if OLD_BTNS not in text:
        raise ValueError("Bloco de botões de download não encontrado em step1-criterios.html")
    text = text.replace(OLD_BTNS, NEW_BTNS)
    text = text.replace(OLD_FMT, NEW_FMT)
    text = text.replace(OLD_FILL, NEW_FILL)
    text = text.replace('accept=".csv,.json"', 'accept=".xlsx,.csv"')
    text = text.replace(
        'title="Selecionar arquivo de matriz AHP em formato CSV ou JSON"',
        'title="Selecionar arquivo da matriz de critérios e premissas (XLSX ou CSV)"',
    )
    text = re.sub(
        r"function downloadMatrixTemplate\(format\)\{[\s\S]*?\}function handleFileSelect",
        "function handleFileSelect",
        text,
        count=1,
    )
    if SCRIPT_OLD_MARKER in text:
        text = re.sub(
            r'<script src="js/script\.js"></script><script>[\s\S]*?</script>\s*(?=<script>\s*\ndocument\.addEventListener\(\'DOMContentLoaded\', function \(\) \{\s*var tipo)',
            SCRIPT_NEW,
            text,
            count=1,
        )
    elif 'js/step1-upload-matriz.js' not in text:
        text = text.replace(
            '<script src="js/script.js"></script>',
            SCRIPT_NEW.rstrip('<script>') + '\n',
            1,
        )
    return text


def main() -> None:
    text = STEP1.read_text(encoding="utf-8")
    STEP1.write_text(patch_step1(text), encoding="utf-8")
    print(f"Atualizado: {STEP1}")


if __name__ == "__main__":
    main()
