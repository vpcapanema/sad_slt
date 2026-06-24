# -*- coding: utf-8 -*-
"""Insere seção Matriz de premissas e critérios na Etapa 3."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STEP3 = ROOT / "ahp" / "step3-metodo.html"

MATRIZ_SECTION = """
            <section class="card ahp-step-section" id="matriz-premissas-section">
                <div class="ahp-section-label">
                    <i class="fas fa-table" aria-hidden="true"></i>
                    <span>Matriz de premissas e critérios</span>
                </div>
                <div class="ahp-section-body">
                    <p class="step-intro">
                        Dados importados na Etapa 1 (upload XLSX/CSV). Revise dimensões, premissas e critérios
                        mandatórios antes de escolher o método de comparação pareada.
                    </p>
                    <div id="matriz-premissas-panel" class="ahp-matriz-panel-root" aria-live="polite"></div>
                </div>
            </section>

"""

SCRIPTS = """
    <script src="js/matriz-premissas.js"></script>
    <script src="js/step3-matriz-view.js"></script>
"""


def patch_step3(text: str) -> str:
    if "matriz-premissas-section" in text:
        return text

    anchor = '<section class="card ahp-step-section">\n                <div class="ahp-section-label"><i class="fas fa-sliders'
    if anchor not in text:
        anchor = '<section class="card ahp-step-section">\n                <div class="ahp-section-label">'
    if anchor not in text:
        raise ValueError("Ponto de inserção da matriz não encontrado em step3-metodo.html")

    text = text.replace(anchor, MATRIZ_SECTION + anchor, 1)

    if "step3-matriz-view.js" not in text:
        text = text.replace(
            "</body>",
            SCRIPTS + "\n</body>",
        )
        text = text.replace(
            "<script>document.addEventListener('DOMContentLoaded',function(){const criteria=localStorage.getItem('ahp_criteria');if(!criteria){alert('Critérios não encontrados. Redirecionando para a Etapa 2.');window.location.href='step2-nomes.html';return;}});function selectMethod(method){localStorage.setItem('ahp_chosenMethod',method);window.location.href='step4-comparacao.html';}</script>\n",
            "",
        )

    return text


def main() -> None:
    text = STEP3.read_text(encoding="utf-8")
    STEP3.write_text(patch_step3(text), encoding="utf-8")
    print(f"Atualizado: {STEP3}")


if __name__ == "__main__":
    main()
