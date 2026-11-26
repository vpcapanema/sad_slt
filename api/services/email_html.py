"""Formatação dos parágrafos na versão HTML dos e-mails."""
import re
from html import escape
from html.parser import HTMLParser


_ALINHAMENTO = "text-align:justify!important;"


class _ParagrafosJustificados(HTMLParser):
    def __init__(self, html: str):
        super().__init__(convert_charrefs=False)
        self.inicios_de_linha = [0, *(quebra.end() for quebra in re.finditer("\n", html))]
        self.trocas: list[tuple[int, int, str]] = []

    def handle_starttag(self, tag, attrs):
        if tag != "p":
            return
        atributos = dict(attrs)
        estilo = (atributos.get("style") or "").rstrip()
        if not estilo.endswith(_ALINHAMENTO):
            atributos["style"] = f"{estilo.rstrip(';')};{_ALINHAMENTO}" if estilo else _ALINHAMENTO
        atributos["align"] = "justify"
        abertura = "<p" + "".join(
            f' {nome}="{escape(valor, quote=True)}"' if valor is not None else f" {nome}"
            for nome, valor in atributos.items()
        )
        original = self.get_starttag_text()
        linha, coluna = self.getpos()
        inicio = self.inicios_de_linha[linha - 1] + coluna
        self.trocas.append((inicio, inicio + len(original), abertura + ("/>" if original.endswith("/>") else ">")))


def corpo_html(texto: str, html: str | None) -> str:
    if html is None:
        normalizado = texto.replace("\r\n", "\n").replace("\r", "\n")
        blocos = re.split(r"\n(?:[ \t]*\n)+", normalizado)
        return "".join(
            f'<p align="justify" style="{_ALINHAMENTO}">' + escape(bloco).replace("\n", "<br>") + "</p>"
            for bloco in blocos if bloco.strip()
        )
    parser = _ParagrafosJustificados(html)
    parser.feed(html)
    parser.close()
    partes = []
    anterior = 0
    for inicio, fim, abertura in parser.trocas:
        partes.extend((html[anterior:inicio], abertura))
        anterior = fim
    partes.append(html[anterior:])
    return "".join(partes)
