# -*- coding: utf-8 -*-
"""Adapta páginas step* do SIGMA AHP para o visual SLT."""

from __future__ import annotations

import re
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from patch_step1_matriz_modelo import patch_step1
from patch_step3_matriz_view import patch_step3

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(r"d:\REPOSITORIOS\ahp_tool_2_0")
DST = ROOT / "ahp"
IMG_BASE = "https://vpc-geoser-ahp-tool-calculator.onrender.com/img_folder/"

HEADER = """  <header class="app-header">
    <div class="app-header-inner">
      <div class="app-brand">
        Apoio à Tomada de Decisão
        <small>Hierarquização AHP</small>
      </div>
      <nav class="app-nav">
        <a href="../index.html">Início</a>
        <a href="../cadastro/">Cadastro</a>
        <a href="./" class="active">AHP</a>
        <a href="../painel/">Painel</a>
        <a href="../admin/">Admin</a>
      </nav>
    </div>
  </header>
"""

HEAD = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <link rel="stylesheet" href="../assets/css/app.css">
  <link rel="stylesheet" href="../assets/css/ahp-module.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
{extra_head}
</head>
<body class="ahp-module-page">
"""

FOOT = """
</body>
</html>
"""

INJECT_SCRIPT = re.compile(
    r"<script>\s*\(function \(\) \{[\s\S]*?injectCabecalho[\s\S]*?\}\(\)\);\s*</script>",
    re.MULTILINE,
)

GOVSP_SCRIPTS = re.compile(
    r'<script src="assets/govsp/js/script-top-v2\.js"></script>\s*'
    r'<script src="templates_modelo/script_template_base_aplicacao\.js"></script>\s*',
)

VW_HEADER = re.compile(
    r'<header class="vw-header">[\s\S]*?</header>',
    re.MULTILINE,
)


def strip_old_head(html: str) -> str:
    html = re.sub(r"<!DOCTYPE html>[\s\S]*?<body[^>]*>", "", html, count=1)
    html = re.sub(r"</body>\s*</html>\s*$", "", html)
    return html.strip()


def convert_vw_header(match: re.Match) -> str:
    block = match.group(0)
    block = block.replace('class="vw-breadcrumb"', 'class="ahp-breadcrumb"')
    block = block.replace('class="vw-header__title"', 'class="ahp-page-title"')
    block = block.replace('class="vw-header__desc"', 'class="ahp-page-desc"')
    block = block.replace("sigma-ahp.html", "index.html")
    block = re.sub(
        r'<i class="fas fa-chevron-right app-template-inline-icon app-template-inline-icon--crumb"[^>]*></i>',
        '<span class="ahp-breadcrumb-sep" aria-hidden="true">›</span>',
        block,
    )
    block = re.sub(
        r'<svg class="app-template-inline-icon app-template-inline-icon--crumb"[^>]*>[\s\S]*?</svg>',
        '<span class="ahp-breadcrumb-sep" aria-hidden="true">›</span>',
        block,
    )
    block = block.replace("<span>Etapa", '<span class="ahp-breadcrumb-current">Etapa')
    block = block.replace("<span>Calculadora", '<span class="ahp-breadcrumb-current">Calculadora')
    block = re.sub(r'<div class="vw-header__left">\s*', "", block)
    block = re.sub(r"\s*</div>\s*(?=</section>)", "", block)
    block = block.replace('<header class="vw-header">', '<section class="card ahp-step-intro">')
    block = block.replace("</header>", "</section>")
    return block


def adapt_body(html: str, name: str) -> str:
    html = html.replace("sigma-ahp.html", "index.html")
    html = html.replace("img_folder/", IMG_BASE)
    html = INJECT_SCRIPT.sub("", html)
    html = GOVSP_SCRIPTS.sub("", html)
    html = html.replace(
        '<main class="sigma-main ahp-main">',
        '<main class="app-main ahp-main">',
    )
    html = html.replace('<div class="cf-main ahp-shell">', "")
    html = html.replace("        </div>\n    </main>", "    </main>")
    html = VW_HEADER.sub(convert_vw_header, html, count=1)

    html = apply_class_map(html)

    if name == "step1-criterios.html":
        html = html.replace(
            '<a href="index.html">Calculadora AHP</a>\n                        <span class="ahp-breadcrumb-sep"',
            '<a href="index.html">Calculadora AHP</a>\n                        <span class="ahp-breadcrumb-sep" aria-hidden="true">›</span>\n                        <a href="tipo-analise.html">Tipo de análise</a>\n                        <span class="ahp-breadcrumb-sep"',
        )
        html = html.replace(
            '<a href="index.html" class="btn btn-secondary"><i class="fas fa-arrow-left c-btn__icon"></i>Voltar ao Início</a>',
            '<a href="tipo-analise.html" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Voltar</a>',
        )
    if name == "step5-resultados.html":
        html = html.replace(
            '<a href="index.html" class="btn btn-primary"><i class="fas fa-home c-btn__icon"></i>Nova Análise</a>',
            '<a href="tipo-analise.html" class="btn btn-primary"><i class="fas fa-home"></i> Nova Análise</a>',
        )

    html = re.sub(r"\s*</div>\s*\n(\s*</section>)", r"\n\1", html, count=1)
    return html


def apply_class_map(html: str) -> str:
    replacements = [
        ('class="cf-info-note"', 'class="ahp-info-note card"'),
        ('class="cf-section"', 'class="card ahp-step-section"'),
        ('class="cf-section__header"', 'class="ahp-section-label"'),
        ('class="cf-section__body"', 'class="ahp-section-body"'),
        ('class="progress-container"', 'class="ahp-progress card"'),
        ('class="progress-bar"', 'class="ahp-progress-bar"'),
        ('class="progress-step', 'class="ahp-progress-step'),
        ('class="progress-circle"', 'class="ahp-progress-circle"'),
        ('class="c-form-actions"', 'class="ahp-form-actions"'),
        ('class="c-btn c-btn--primary', 'class="btn btn-primary'),
        ('class="c-btn c-btn--secondary', 'class="btn btn-secondary'),
        ('class="c-btn c-btn--outline', 'class="btn btn-ghost'),
        ('class="c-btn c-btn--block', 'class="btn btn-primary" style="width:100%"'),
        ('class="matrix-table"', 'class="ahp-matrix-table"'),
        ('class="comparison-content"', 'class="ahp-comparison-content"'),
        ('class="criteria-inputs"', 'class="ahp-criteria-inputs"'),
        ('class="method-selection-grid"', 'class="ahp-method-grid"'),
        ('class="method-option-card"', 'class="ahp-method-card"'),
        ('class="method-option-icon"', 'class="ahp-method-icon"'),
        ('class="method-example-image"', 'class="ahp-method-example"'),
        ('class="saaty-image"', 'class="ahp-saaty-image"'),
        ('class="info-highlights"', 'class="ahp-info-highlights"'),
        ('class="info-item"', 'class="ahp-info-item"'),
        ('class="info-card-header"', 'class="ahp-info-card-header"'),
        ('class="recommendation-box"', 'class="ahp-recommendation"'),
        ('class="instructions-container"', 'class="ahp-instructions"'),
        ('class="method-choice-card"', 'class="ahp-method-choice"'),
        ('class="method-choice-header"', 'class="ahp-method-choice-header"'),
        ('class="upload-steps"', 'class="ahp-upload-steps"'),
        ('class="upload-step"', 'class="ahp-upload-step"'),
        ('class="step-number-badge"', 'class="ahp-step-badge"'),
        ('class="template-buttons"', 'class="ahp-template-buttons"'),
        ('class="selected-file"', 'class="ahp-selected-file"'),
        ('class="step-title"', 'class="ahp-step-title"'),
        ('class="step-number"', 'class="ahp-step-number"'),
        ("notification notification-", "ahp-notification ahp-notification--"),
    ]
    for old, new in replacements:
        html = html.replace(old, new)
    html = html.replace(
        '<svg class="app-template-inline-icon app-template-inline-icon--section" viewBox="0 0 20 20" aria-hidden="true"><use href="templates_modelo/app_template_icon_sprite.svg#app-icon-paper-plane"></use></svg>',
        '<i class="fas fa-paper-plane" aria-hidden="true"></i>',
    )
    return html


STEP1_GUARD = """
<script>
document.addEventListener('DOMContentLoaded', function () {
  var tipo = localStorage.getItem('slt_ahp_tipo');
  if (tipo !== 'avulsa' && tipo !== 'portfolio') {
    window.location.href = 'tipo-analise.html';
  }
});
</script>
"""

TITLES = {
    "step1-criterios.html": "Etapa 1: Seleção de Critérios — AHP — SLT",
    "step2-nomes.html": "Etapa 2: Nomear Critérios — AHP — SLT",
    "step3-metodo.html": "Etapa 3: Escolher Método — AHP — SLT",
    "step4-comparacao.html": "Etapa 4: Comparação Pareada — AHP — SLT",
    "step5-resultados.html": "Etapa 5: Resultados — AHP — SLT",
}

EXTRA_HEAD = {
    "step5-resultados.html": """  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>""",
}


def patch_step1_upload_modelo(html: str) -> str:
    return patch_step1(html)


def main() -> None:
    for name, title in TITLES.items():
        raw = (SRC / name).read_text(encoding="utf-8")
        body = adapt_body(strip_old_head(raw), name)
        if name == "step1-criterios.html":
            body = patch_step1_upload_modelo(body)
        if name == "step3-metodo.html":
            body = patch_step3(body)
        extra = EXTRA_HEAD.get(name, "")
        out = HEAD.format(title=title, extra_head=extra) + HEADER + "\n" + body
        if name == "step1-criterios.html":
            out += STEP1_GUARD
        out += FOOT
        (DST / name).write_text(out, encoding="utf-8")
        print(f"OK {name}")


if __name__ == "__main__":
    main()
