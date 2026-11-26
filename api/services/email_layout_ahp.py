"""Elementos visuais compartilhados pelos e-mails AHP do SICARD."""
from functools import lru_cache
from html import escape
from pathlib import Path


FONTE = "font-family:Arial,Helvetica,sans-serif;"
AZUL_PLI = "#003b5a"
VERDE_PLI = "#3ec26e"
VERDE_CLARO = "#eaf8ef"
PASTA_IMAGENS = Path(__file__).resolve().parents[2] / "assets" / "img" / "email-ahp"
EXEMPLOS_COMPARACAO = (
    {
        "cid": "comparacao-preferencia@sicard",
        "arquivo": "comparacao-preferencia.png",
        "titulo": "Preferência pelo primeiro critério · posição 3",
        "legenda": "A régua está à esquerda do centro. Nesse exemplo, o primeiro critério recebeu um pouco mais de importância.",
        "alt": "Cartão do SICARD com o seletor no primeiro nível à esquerda do 1 e o resultado 3.",
    },
    {
        "cid": "comparacao-igualdade@sicard",
        "arquivo": "comparacao-igualdade.png",
        "titulo": "Mesma importância · posição 1",
        "legenda": "Depois de mover a régua para qualquer lado, volte ao centro. O cartão registra a igualdade.",
        "alt": "Cartão do SICARD com o seletor no centro da régua e o resultado de igual importância, 1.",
    },
)
EXEMPLOS_CONSISTENCIA = (
    {
        "cid": "consistencia-botao@sicard",
        "arquivo": "consistencia-botao.png",
        "titulo": "Onde encontrar o botão de ajuda",
        "legenda": "A interrogação fica no cartão flutuante da RC. Neste exemplo, 6 de 10 pares já foram confirmados.",
        "alt": "Cartão flutuante da Razão de Consistência com 6 de 10 pares confirmados e o botão de interrogação em destaque.",
        "largura": 146,
    },
    {
        "cid": "consistencia-modal@sicard",
        "arquivo": "consistencia-modal.png",
        "titulo": "Pares que merecem revisão",
        "legenda": "A janela mostra a RC do conjunto confirmado, a RC projetada e os valores atual e sugerido de cada par destacado.",
        "alt": "Janela Ajuda de consistência AHP, com o resumo de 60%, a RC projetada e a ação Aplicar o valor sugerido.",
    },
    {
        "cid": "consistencia-explicacao@sicard",
        "arquivo": "consistencia-explicacao.png",
        "titulo": "Por que há inconsistência?",
        "legenda": "Leia a explicação para entender onde as comparações entram em conflito antes de decidir se quer ajustar algum valor.",
        "alt": "Trecho da janela de ajuda que relaciona três comparações e explica o conflito entre as escolhas.",
    },
)
IMAGENS_CONVITE = EXEMPLOS_COMPARACAO + EXEMPLOS_CONSISTENCIA


@lru_cache(maxsize=len(IMAGENS_CONVITE))
def carregar_imagem(arquivo: str) -> bytes:
    return (PASTA_IMAGENS / arquivo).read_bytes()


def documento(titulo: str, conteudo: str, *, cores_pli: bool = False) -> str:
    fundo = "#f0f0f1" if cores_pli else "#eef3f7"
    cabecalho = AZUL_PLI if cores_pli else "#00507a"
    faixa = f"border-bottom:5px solid {VERDE_PLI};" if cores_pli else ""
    return (
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1"></head>'
        f'<body style="margin:0;padding:0;background:{fundo};">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{fundo};">'
        '<tr><td align="center" style="padding:18px 8px;">'
        '<table role="presentation" width="640" cellpadding="0" cellspacing="0" '
        'style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d5dee6;">'
        f'<tr><td bgcolor="{cabecalho}" style="background:{cabecalho};padding:16px 22px;{faixa}">'
        f'<h1 style="margin:0;{FONTE}color:#ffffff;font-size:19px;line-height:1.35;font-weight:bold;">'
        f'SICARD · {escape(titulo)}</h1></td></tr>'
        f'<tr><td style="padding:22px;">{conteudo}</td></tr></table></td></tr></table></body></html>'
    )


def painel(titulo: str, conteudo: str, *, cores_pli: bool = False) -> str:
    topo, corpo = (VERDE_PLI, VERDE_CLARO) if cores_pli else ("#00507a", "#edf5fa")
    tinta = AZUL_PLI if cores_pli else "#ffffff"
    borda = "#b8dbc4" if cores_pli else "#bed4e2"
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        f'style="border:1px solid {borda};border-collapse:separate;">'
        f'<tr><td bgcolor="{topo}" style="padding:14px 18px;background:{topo};">'
        f'<h2 style="margin:0;{FONTE}font-size:18px;line-height:1.35;font-weight:bold;color:{tinta};">'
        f'{escape(titulo)}</h2></td></tr>'
        f'<tr><td bgcolor="{corpo}" style="padding:18px;background:{corpo};">{conteudo}</td></tr></table>'
    )


def botao(url: str, rotulo: str, *, cores_pli: bool = False) -> str:
    fundo = AZUL_PLI if cores_pli else "#00507a"
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0">'
        f'<tr><td align="center" bgcolor="{fundo}" style="border-radius:5px;background:{fundo};">'
        f'<a href="{escape(url, quote=True)}" target="_blank" style="display:inline-block;padding:13px 20px;'
        f'{FONTE}font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;'
        f'border:1px solid #003d5c;border-radius:5px;">{escape(rotulo)}</a></td></tr></table>'
    )


def exemplos_previa(exemplos: tuple[dict, ...], base_url: str) -> list[dict]:
    return [
        {"titulo": exemplo["titulo"], "legenda": exemplo["legenda"], "alt": exemplo["alt"],
         "largura": exemplo.get("largura", 380),
         "url": f"{base_url.rstrip('/')}/assets/img/email-ahp/{exemplo['arquivo']}"}
        for exemplo in exemplos
    ]


def exemplos_html(exemplos: tuple[dict, ...]) -> str:
    partes = []
    for exemplo in exemplos:
        largura = exemplo.get("largura", 380)
        partes.append(
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="margin:0 0 14px;border:1px solid #b8dbc4;">'
            f'<tr><td bgcolor="{VERDE_CLARO}" style="padding:12px 14px;{FONTE}color:{AZUL_PLI};">'
            f'<h3 style="margin:0 0 6px;font-size:14px;line-height:1.35;">{escape(exemplo["titulo"])}</h3>'
            f'<p style="margin:0;font-size:13px;line-height:1.5;">{escape(exemplo["legenda"])}</p></td></tr>'
            '<tr><td align="center" style="padding:10px;background:#ffffff;">'
            f'<img src="cid:{exemplo["cid"]}" alt="{escape(exemplo["alt"])}" width="{largura}" '
            f'style="display:block;width:100%;max-width:{largura}px;height:auto;border:0;"></td></tr></table>'
        )
    return '<div style="margin:8px 0 20px;">' + "".join(partes) + '</div>'
