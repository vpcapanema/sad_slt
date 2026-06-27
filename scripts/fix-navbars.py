"""Padroniza navbars vazias (preenchidas por navbar.js) em todas as páginas HTML."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAV_EMPTY = '<nav class="app-nav" aria-label="Navegação principal"></nav>'

for html in ROOT.rglob("*.html"):
    text = html.read_text(encoding="utf-8")
    if "app-nav" not in text:
        continue
    original = text
    text = re.sub(
        r'<nav class="app-nav"[^>]*>.*?</nav>',
        NAV_EMPTY,
        text,
        flags=re.DOTALL,
    )
    text = text.replace('app-header-inner app-header-inner--nav-only', "app-header-inner")
    if "app-header.js" not in text and ("app-header" in text or "layout-main-header" in text):
        insert = '  <script src="{prefix}assets/js/app-header.js"></script>\n  <script src="{prefix}assets/js/navbar.js"></script>\n'
        rel = html.relative_to(ROOT)
        depth = len(rel.parts) - 1
        prefix = "../" * depth if depth else ""
        block = insert.format(prefix=prefix)
        if "</body>" in text:
            text = text.replace("</body>", block + "</body>", 1)
    if text != original:
        html.write_text(text, encoding="utf-8")
        print(html.relative_to(ROOT))
