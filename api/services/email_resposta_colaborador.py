"""Confirmação automática de recebimento da resposta do colaborador especialista.

Depois que a resposta é registrada, o servidor calcula os pesos da matriz que o
colaborador preencheu e envia a ele, por e-mail, o agradecimento, a matriz de
comparação pareada, as métricas de consistência de Saaty e os pesos dos critérios.

O envio é complementar: qualquer falha é registrada em log e nunca desfaz nem
bloqueia o registro da resposta.
"""
from __future__ import annotations

import logging
import re
from html import escape
from typing import Any

from pydantic import ValidationError

from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as repo
from api.schemas.email import EmailEnvioSchema
from api.services import ahp_engine, email_service
from api.services.comparacao_colaborativa_service import _criterio_nomes, _criterios_resposta, _dimensao

logger = logging.getLogger(__name__)

AZUL = (17, 101, 147)
VERMELHO = (122, 22, 32)
LIMITE_RC = 0.10


def _numero(valor: float, casas: int = 3) -> str:
    return f"{valor:.{casas}f}".replace(".", ",")


def _rotulo_saaty(valor: float) -> str:
    """Índice na notação da escala de Saaty (1/3, 5), como no formulário."""
    valor = float(valor)
    if valor >= 1 and abs(valor - round(valor)) < 0.0005:
        return str(int(round(valor)))
    if 0 < valor < 1 and abs(1 / valor - round(1 / valor)) < 0.0005:
        return f"1/{int(round(1 / valor))}"
    return _numero(valor)


def _mistura(cor: tuple[int, int, int], intensidade: float) -> str:
    """Cor da célula: a cor da direção misturada ao branco conforme a intensidade."""
    intensidade = max(0.0, min(1.0, intensidade))
    canais = [round(255 + (c - 255) * intensidade) for c in cor]
    return "#{:02x}{:02x}{:02x}".format(*canais)


def _celula_matriz(valor: float) -> tuple[str, str]:
    """(fundo, texto) da célula: azul quando o critério da linha prevalece, vermelho no inverso."""
    passos = min(8.0, abs((valor if valor >= 1 else 1 / valor) - 1))
    if passos < 0.0005:
        return "#f1f4f7", "#33485a"
    intensidade = 0.15 + 0.85 * passos / 8
    cor = AZUL if valor > 1 else VERMELHO
    return _mistura(cor, intensidade), "#ffffff" if intensidade > 0.55 else "#12303f"


def _nomes(ambiente: dict[str, Any], resposta: dict[str, Any], n: int) -> list[str]:
    criterios = _criterios_resposta(ambiente, resposta)
    nomes = _criterio_nomes(criterios) if len(criterios) == n else []
    return nomes or [f"Critério {i + 1}" for i in range(n)]


def outros_julgadores_mesmo_conjunto(ambiente: dict[str, Any], resposta: dict[str, Any]) -> int:
    """Quantos outros colaboradores receberam exatamente os mesmos critérios para avaliar."""
    criterios = _criterios_resposta(ambiente, resposta)
    todos = ambiente.get("criterios") or []
    proprio = str(resposta.get("email") or "").strip().lower()
    total = 0
    for convite in ambiente.get("convites") or []:
        email = str(convite.get("email") or "").strip().lower()
        if not email or email == proprio:
            continue
        dimensoes = convite.get("dimensoes")
        atribuidos = todos if dimensoes is None else [c for c in todos if _dimensao(c) in dimensoes]
        if atribuidos == criterios:
            total += 1
    return total


def _aviso(outros: int) -> str:
    plural = outros != 1
    return (
        f"Este mesmo conjunto de critérios foi enviado para avaliação de mais {outros} "
        f"{'julgadores' if plural else 'julgador'}. Por isso, os pesos acima podem não ser os pesos finais da análise: "
        "o resultado final depende das intensidades de importância que os demais julgadores atribuírem aos mesmos "
        "critérios. A resposta final é do gestor."
    )


def calcular(resposta: dict[str, Any]) -> dict[str, Any]:
    matriz = [[float(v) for v in linha] for linha in resposta.get("matriz_comparacao") or []]
    if len(matriz) < 2:
        raise ValueError("Matriz de comparação ausente ou incompleta.")
    return {"matriz": matriz, **ahp_engine.analyze_matrix(matriz)}


def _texto(*, nome: str, julgamento: str, nomes: list[str], calculo: dict[str, Any], outros: int) -> str:
    matriz, pesos = calculo["matriz"], calculo["weights"]
    n = len(nomes)
    linhas = [
        f"Olá, {nome}!", "",
        f"Recebemos a sua resposta ao julgamento \"{julgamento}\". Agradecemos a sua colaboração: "
        "a contribuição de especialistas é fundamental para a definição dos pesos dos critérios.", "",
        "Critérios avaliados:",
        *[f"  CT{i + 1} — {nomes[i]}" for i in range(n)], "",
        "MATRIZ DE COMPARAÇÃO PAREADA",
        "Cada célula indica quantas vezes o critério da linha importa mais que o da coluna (escala de Saaty, 1/9 a 9).",
        *[f"  CT{i + 1}: " + "  ".join(_rotulo_saaty(v).rjust(4) for v in matriz[i]) for i in range(n)], "",
        "MÉTRICAS DE CONSISTÊNCIA",
        f"  λmax (lambda máximo): {_numero(calculo['lambdaMax'])}",
        f"  IC (índice de consistência): {_numero(calculo['CI'])}",
        f"  IA (índice aleatório): {_numero(calculo['RI'])}",
        f"  RC (razão de consistência): {_numero(calculo['CR'])} — "
        + ("consistente (RC < 0,10)" if calculo["CR"] < LIMITE_RC else "acima do limite de 0,10"), "",
        "PESOS CALCULADOS A PARTIR DAS SUAS INTENSIDADES DE IMPORTÂNCIA",
        *[f"  CT{i + 1} — {nomes[i]}: {_numero(pesos[i] * 100, 1)}%" for i in range(n)], "",
    ]
    if outros:
        linhas += ["ATENÇÃO: " + _aviso(outros), ""]
    linhas += ["Esta é uma mensagem automática do SICARD."]
    return "\n".join(linhas)


def _html(*, nome: str, julgamento: str, nomes: list[str], calculo: dict[str, Any], outros: int) -> str:
    matriz, pesos = calculo["matriz"], calculo["weights"]
    n = len(nomes)
    e = escape
    fonte = "font-family:Arial,Helvetica,sans-serif;"
    cel = f"padding:7px 9px;border:1px solid #d5dee6;{fonte}font-size:13px;"
    cab = f"{cel}background:#00507a;color:#ffffff;font-weight:bold;text-align:center;"

    legenda = "".join(
        f'<tr><td style="{cel}font-weight:bold;text-align:center;white-space:nowrap;">CT{i + 1}</td>'
        f'<td style="{cel}">{e(nomes[i])}</td></tr>' for i in range(n)
    )
    cabecalho = "".join(f'<th style="{cab}">CT{j + 1}</th>' for j in range(n))
    corpo = ""
    for i in range(n):
        celulas = ""
        for j in range(n):
            fundo, texto = _celula_matriz(matriz[i][j])
            celulas += (f'<td style="{cel}background:{fundo};color:{texto};text-align:center;font-weight:bold;" '
                        f'title="{e(nomes[i])} × {e(nomes[j])}">{_rotulo_saaty(matriz[i][j])}</td>')
        corpo += (f'<tr><th style="{cel}background:#e8f0f6;color:#12303f;text-align:left;white-space:nowrap;">'
                  f'CT{i + 1}</th>{celulas}</tr>')

    consistente = calculo["CR"] < LIMITE_RC
    cor_rc, fundo_rc = ("#1f6b3a", "#e4f4ea") if consistente else ("#8a1c1c", "#fbe9e9")
    metricas = "".join(
        f'<td style="{cel}text-align:center;background:{fundo};width:25%;">'
        f'<div style="font-size:11px;color:#516878;">{e(rotulo)}</div>'
        f'<div style="font-size:18px;font-weight:bold;color:{cor};">{valor}</div></td>'
        for rotulo, valor, fundo, cor in (
            ("λmax", _numero(calculo["lambdaMax"]), "#ffffff", "#12303f"),
            ("IC", _numero(calculo["CI"]), "#ffffff", "#12303f"),
            ("IA", _numero(calculo["RI"]), "#ffffff", "#12303f"),
            ("RC", _numero(calculo["CR"]), fundo_rc, cor_rc),
        )
    )
    situacao = ("Consistente: a razão de consistência está abaixo do limite de 0,10."
                if consistente else "A razão de consistência está acima do limite de 0,10.")

    linhas_pesos = ""
    for i in range(n):
        pct = pesos[i] * 100
        barra = (f'<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;"><tr>'
                 f'<td style="width:{max(1.0, pct):.1f}%;background:#116593;height:10px;font-size:1px;line-height:1px;">&nbsp;</td>'
                 f'<td style="font-size:1px;line-height:1px;">&nbsp;</td></tr></table>')
        linhas_pesos += (
            f'<tr><td style="{cel}font-weight:bold;text-align:center;white-space:nowrap;">CT{i + 1}</td>'
            f'<td style="{cel}">{e(nomes[i])}</td>'
            f'<td style="{cel}text-align:right;font-weight:bold;white-space:nowrap;">{_numero(pct, 1)}%</td>'
            f'<td style="{cel}width:35%;">{barra}</td></tr>'
        )

    aviso = (
        f'<div style="margin:18px 0 0;padding:12px 14px;border:1px solid #e0b252;border-left:5px solid #d99a1b;'
        f'background:#fff6e0;{fonte}font-size:13px;line-height:1.5;color:#4a3300;">'
        f'<strong>Atenção.</strong> {e(_aviso(outros))}</div>'
    ) if outros else ""

    titulo = f"margin:24px 0 8px;{fonte}font-size:14px;color:#00507a;text-transform:uppercase;letter-spacing:.03em;"
    paragrafo = f"margin:0 0 10px;{fonte}font-size:13px;line-height:1.55;color:#22333f;"
    return (
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>'
        '<body style="margin:0;padding:0;background:#eef3f7;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f7;"><tr><td align="center" style="padding:18px 8px;">'
        '<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d5dee6;">'
        f'<tr><td style="background:#00507a;padding:16px 22px;{fonte}color:#ffffff;font-size:18px;font-weight:bold;">'
        'SICARD · Confirmação de recebimento</td></tr>'
        '<tr><td style="padding:22px;">'
        f'<p style="{paragrafo}font-size:15px;">Olá, <strong>{e(nome)}</strong>!</p>'
        f'<p style="{paragrafo}">Recebemos a sua resposta ao julgamento <strong>{e(julgamento)}</strong>. '
        'Agradecemos a sua colaboração: a contribuição de especialistas é fundamental para a definição dos pesos dos critérios.</p>'
        f'<h2 style="{titulo}">Critérios avaliados</h2>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">{legenda}</table>'
        f'<h2 style="{titulo}">Matriz de comparação pareada</h2>'
        f'<p style="{paragrafo}">Cada célula indica quantas vezes o critério da linha importa mais que o da coluna, '
        'na escala de Saaty (1/9 a 9). <span style="color:#116593;font-weight:bold;">Azul</span>: prevalece o critério da linha; '
        '<span style="color:#7a1620;font-weight:bold;">vermelho</span>: prevalece o da coluna; cinza: indiferença (1).</p>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">'
        f'<tr><th style="{cab}">&nbsp;</th>{cabecalho}</tr>{corpo}</table>'
        f'<h2 style="{titulo}">Métricas de consistência</h2>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;"><tr>{metricas}</tr></table>'
        f'<p style="{paragrafo}margin-top:8px;">{e(situacao)}</p>'
        f'<h2 style="{titulo}">Pesos dos critérios</h2>'
        f'<p style="{paragrafo}">Pesos calculados a partir das intensidades de importância que você informou.</p>'
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">'
        f'<tr><th style="{cab}">Código</th><th style="{cab}">Critério</th><th style="{cab}">Peso</th><th style="{cab}">&nbsp;</th></tr>'
        f'{linhas_pesos}</table>'
        f'{aviso}'
        f'<p style="{paragrafo}margin-top:22px;color:#516878;font-size:12px;">Esta é uma mensagem automática do SICARD.</p>'
        '</td></tr></table></td></tr></table></body></html>'
    )


def montar(ambiente: dict[str, Any], resposta: dict[str, Any]) -> EmailEnvioSchema:
    calculo = calcular(resposta)
    nomes = _nomes(ambiente, resposta, len(calculo["matriz"]))
    contexto = {
        "nome": str(resposta.get("nome_completo") or "colaborador(a)").strip(),
        "julgamento": str(ambiente.get("nome") or "Julgamento colaborativo").strip(),
        "nomes": nomes, "calculo": calculo, "outros": outros_julgadores_mesmo_conjunto(ambiente, resposta),
    }
    assunto = re.sub(r"[\x00-\x1f\x7f]", " ", f"SICARD: recebemos a sua resposta — {contexto['julgamento'][:120]}")
    return EmailEnvioSchema(
        destinatario=str(resposta["email"]), assunto=assunto,
        texto=_texto(**contexto), html=_html(**contexto),
    )


def notificar(ambiente_id: str, resposta_id: str) -> None:
    """Envia a confirmação; executada após a resposta HTTP e sem nunca propagar falhas."""
    try:
        email_service._config()  # sem SMTP habilitado, nem consulta o banco
        ambiente = repo.get_ambiente_by_id(ambiente_id)
        resposta = next((r for r in repo.list_respostas(ambiente_id) if str(r["id"]) == str(resposta_id)), None)
        if not ambiente or not resposta or resposta.get("status") != "enviada":
            logger.warning("Confirmação de resposta não enviada: registro indisponível resposta=%s", resposta_id)
            return
        mensagem = montar(ambiente, resposta)
        email_service.enviar(mensagem, usuario_id="sistema")
        logger.info("Confirmação de recebimento enviada resposta=%s", resposta_id)
    except email_service.FalhaEmail as exc:
        logger.warning("Confirmação de recebimento não enviada resposta=%s codigo=%s", resposta_id, exc.codigo)
    except (DatabaseUnavailableError, DemandaValidationError, ValidationError, ValueError, ArithmeticError) as exc:
        logger.warning("Confirmação de recebimento não montada resposta=%s tipo=%s", resposta_id, type(exc).__name__)
    except Exception:  # a confirmação é complementar e não pode afetar a resposta já registrada
        logger.exception("Falha inesperada ao enviar a confirmação de recebimento resposta=%s", resposta_id)
