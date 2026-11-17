"""Apresenta o relatório existente com os componentes públicos do SICARD."""
from __future__ import annotations

import re
from html import unescape
from urllib.parse import urljoin

from api.path_policy import project_path

RELATORIO = "documentacao/saidas_modelos/claude_fable5_1/index.html"
RECURSOS = "/public/documentacao/saidas_modelos/claude_fable5_1/"
SECAO = re.compile(
    r'<section class="panel" id="([^"]+)"><header><span class="num">([^<]+)</span>'
    r'<h2>(.*?)</h2>(.*?)</header><div class="body">', re.S,
)


def montar_contexto() -> dict[str, object]:
    # O artefato continua sendo a fonte única dos dados, mapas e fórmulas.
    html = project_path(RELATORIO).read_text(encoding="utf-8")
    corpo = re.search(
        r'(<section class="panel" id="escopo">.*</section>)\s*</div>\s*</div>'
        r'\s*<footer>(.*?)</footer>', html, re.S,
    )
    intro = re.search(r'<p class="intro">(.*?)</p>', html, re.S)
    resumo = re.search(r'<div class="side">(.*?)</div></aside>', html, re.S)
    if not corpo or not intro or not resumo:
        raise ValueError("A estrutura do relatório de favorabilidade não foi reconhecida.")

    capitulos = []

    def secao(match: re.Match) -> str:
        ident, numero, titulo, complemento = match.groups()
        capitulos.append({"id": ident, "numero": numero, "titulo": unescape(titulo)})
        return (
            f'<section class="secao-relatorio glossario-grupo" id="{ident}" aria-labelledby="{ident}-titulo">'
            f'<h2 id="{ident}-titulo">{numero}. {titulo}</h2>'
            f'{complemento}<div class="glossario-entrada hier-texto" id="{ident}-texto" tabindex="-1">'
        )

    conteudo = SECAO.sub(secao, corpo[1])
    conteudo = conteudo.replace('class="card"', 'class="fav-stat"')
    conteudo = conteudo.replace('class="note"', 'class="fav-note"')
    conteudo = conteudo.replace('class="ok"', 'class="fav-ok"')
    conteudo = conteudo.replace('class="eq"', 'class="eq hier-equacao"')
    conteudo = conteudo.replace('class="scroll"', 'class="scroll hier-table-shell ami-table-shell"')
    conteudo = re.sub(r'<table(?: class="([^"]*)")?>', lambda m:
        '<table class="admin-table hier-register-table ami-table--database ' + (m[1] or '') + '">', conteudo)
    # A escala cromática dos valores continua visível dentro do zebrado padrão.
    conteudo = re.sub(r'<td class="v" style="([^"]+)">(.*?)</td>',
        r'<td class="v"><span class="fav-heat-value" style="\1">\2</span></td>', conteudo, flags=re.S)

    def recurso(match: re.Match) -> str:
        atributo, aspas, valor = match.groups()
        if valor.startswith(("#", "/", "http:", "https:", "data:", "mailto:")):
            return match[0]
        return f"{atributo}={aspas}{urljoin(RECURSOS, valor)}{aspas}"

    conteudo = re.sub(r'(src|href)=(["\'])(.*?)\2', recurso, conteudo)
    return {"capitulos_favorabilidade": capitulos, "relatorio_conteudo": conteudo,
            "relatorio_introducao": intro[1], "relatorio_resumo": resumo[1], "relatorio_observacao": corpo[2]}
