"""Modelos de convite e lembrete enviados aos colaboradores."""
import re
from datetime import datetime, timedelta
from html import escape

from api.schemas.comparacao_colaborativa import EMAIL_ASSUNTO_PADRAO, EMAIL_REMETENTE_ALIAS_PADRAO
from api.services import contexto_julgamento_ahp, email_layout_ahp

_ORIENTACOES = "Orientações para preenchimento"
_AJUDA_CONSISTENCIA = "Ajuda com a consistência do julgamento"
_PRAZO = "Prazo para contribuir"
_PRAZO_ANTERIOR = "Prazo para resposta e acesso ao formulário"
_FUSO = "Horário de Brasília."
_DATA = r"\d{2}/\d{2}/\d{4}"
_HORA = r"\d{2}h\d{2}"
_ASSINATURA = "Atenciosamente,\nEquipe SICARD-PLI"
ACAO_LEMBRETE_PUBLICO = "Retomar preenchimento pelo link público"
ACAO_CONVITE = "Acessar formulário"
_CONTEXTO_PLI = (
    "O PLI-SP 2050 orienta o planejamento da infraestrutura de transportes e da logística no Estado de São Paulo. "
    "Para apoiar a definição das prioridades de implantação dos projetos e de execução das ações do plano, "
    "desenvolvemos uma ferramenta de apoio à tomada de decisão baseada em parâmetros técnicos e métodos científicos."
)
_METODO = (
    "Para incorporar a avaliação dos colaboradores a esse processo, a Análise Multicritério Interativa do SICARD "
    "utiliza o Método de Análise Hierárquica (AHP). É com base nesse método que organizamos o formulário interativo "
    "de comparação pareada, que você receberá para responder ao julgamento."
)


def _prazo(prazo: str) -> str:
    if prazo:
        data, _, hora = prazo.partition(", às ")
        return f"{_PRAZO}\n\n{data}\n{hora}\n\n{_FUSO}"
    return ""


def _separar_prazo(texto: str) -> tuple[str, tuple[str, str] | None, str]:
    inicio, titulo, depois = texto.rpartition(f"\n\n{_PRAZO}\n\n")
    if titulo:
        data_hora, _, observacoes = depois.strip().partition("\n\n")
        valores = re.fullmatch(rf"({_DATA})\n({_HORA})", data_hora)
        if valores:
            return inicio, (valores[1], valores[2]), observacoes
    inicio, titulo, depois = texto.rpartition(f"\n\n{_PRAZO_ANTERIOR}\n\n")
    if titulo:
        valores = re.match(
            rf"Você pode enviar sua resposta até ({_DATA}), às ({_HORA}) \(horário de Brasília\)\.",
            depois,
        )
        if valores:
            observacoes = depois[valores.end():].strip()
            return inicio, (valores[1], valores[2]), "\n\n".join(filter(None, (_FUSO, observacoes)))
    return texto, None, ""


def _eh_pli(ambiente: dict, julgamento: str) -> bool:
    return (
        contexto_julgamento_ahp.eh_pli(ambiente)
        or contexto_julgamento_ahp.eh_pli({"matriz_nome": julgamento})
    )


def convite(ambiente: dict, link: str, prazo: str) -> dict:
    nome = ambiente.get("nome") or ambiente.get("matriz_nome") or "Julgamento AHP"
    pli = _eh_pli(ambiente, nome)
    abertura = [_CONTEXTO_PLI, _METODO] if pli else [
        "A Análise Multicritério Interativa do SICARD utiliza o Método de Análise Hierárquica (AHP). "
        "É com base nesse método que organizamos o formulário interativo de comparação pareada deste julgamento."
    ]
    participacao = (
        f"Gostaríamos de contar com sua contribuição no julgamento {nome}. "
        "As comparações que você registrar ajudarão a definir os pesos usados "
        + ("na priorização dos projetos e das ações do plano." if pli else "na análise.")
    )
    corpo = [
        "Olá, colaborador(a)!", *abertura, participacao,
        _ORIENTACOES,
        "O formulário está organizado em cartões. Cada cartão apresenta dois critérios e uma régua para registrar "
        "a importância de um em relação ao outro.",
        "Use a régua para indicar qual critério considera mais importante para o objetivo do julgamento e com que "
        "intensidade. Se os dois critérios tiverem a mesma importância, mova a régua para qualquer lado e depois "
        "volte ao centro, na posição 1. Esse movimento permite que o SICARD registre a igualdade como sua escolha.",
        "Ao concluir as comparações, clique em Enviar resposta para registrar sua avaliação.",
        _AJUDA_CONSISTENCIA,
        "O botão Pedir ajuda ao sistema (ícone de interrogação) aparece no cartão flutuante da Razão de "
        "Consistência (RC) quando pelo menos 60% dos cartões de comparação da etapa estão confirmados "
        "e a RC calculada com esses pares é igual ou superior a 0,10.",
        "A janela mostra quais pares revisar, por que as escolhas entram em conflito e qual seria a RC com todos "
        "os ajustes sugeridos. Clique no nome de um par para localizá-lo ou em Aplicar o valor sugerido se o "
        "ajuste representar sua avaliação. Ao abrir a ajuda, suas respostas são preservadas.",
        _prazo(prazo),
        link,
        "Agradecemos seu tempo e sua disponibilidade para contribuir" + (" com o PLI-SP 2050." if pli else "."),
        _ASSINATURA,
    ]
    return {"assunto": EMAIL_ASSUNTO_PADRAO, "alias_remetente": EMAIL_REMETENTE_ALIAS_PADRAO,
            "texto": "\n\n".join(corpo)}


def lembrete(ambiente: dict, link: str, prazo: str, previsto_em: datetime) -> dict:
    publico = ambiente.get("modo_participacao") == "publico"
    encerramento = ambiente["valido_ate"] - previsto_em <= timedelta(hours=24)
    nome = ambiente["julgamento"]
    pli = _eh_pli(ambiente, nome)
    if encerramento:
        assunto = "Prazo para responder ao julgamento AHP"
        contexto = f"A coleta de respostas do julgamento {nome}"
        contexto += ", realizado no âmbito do PLI-SP 2050," if pli else ""
        contexto += " está na etapa final. Esperamos contar com sua contribuição para a definição dos pesos"
        contexto += " que serão usados na priorização dos projetos e das ações do plano." if pli else " da análise."
        orientacao = ("Para concluir sua participação, retome o formulário, finalize as comparações e clique em Enviar resposta."
                      if publico else "Para concluir sua participação, finalize as comparações e clique em Enviar resposta.")
        agradecimento = "Agradecemos seu tempo e sua disponibilidade para contribuir"
    else:
        assunto = "Lembrete de participação no julgamento AHP"
        contexto = f"O julgamento {nome} faz parte " + (
            "do trabalho de definição das prioridades de implantação dos projetos e de execução das ações do PLI-SP 2050."
            if pli else "da análise colaborativa do SICARD."
        ) + " Esperamos contar com sua contribuição para essa avaliação."
        orientacao = ("Você pode retomar o formulário de comparação pareada de onde parou." if publico else
                      "Acesse o formulário para realizar as comparações.")
        orientacao += " Ao concluir as comparações, clique em Enviar resposta para registrar sua avaliação."
        agradecimento = ("Agradecemos o tempo que você já dedicou ao julgamento e sua disponibilidade para contribuir"
                         if publico else "Agradecemos seu tempo e sua disponibilidade para contribuir")
    corpo = [f"Olá, {ambiente['nome']}!", contexto, _ORIENTACOES, orientacao, _prazo(prazo), link,
             agradecimento + (" com o PLI-SP 2050." if pli else "."), _ASSINATURA]
    return {"assunto": f"{assunto} — {' '.join(nome.split())}"[:200],
            "alias_remetente": EMAIL_REMETENTE_ALIAS_PADRAO, "texto": "\n\n".join(corpo)}


def _paragrafos(texto: str, julgamento: str) -> str:
    destaques = [
        "PLI-SP 2050", "Análise Multicritério Interativa do SICARD",
        "Método de Análise Hierárquica (AHP)", "formulário interativo de comparação pareada",
        "Enviar resposta", "Pedir ajuda ao sistema", "60%", "0,10", "Aplicar o valor sugerido",
    ]
    if julgamento:
        destaques.append(julgamento)
    expressoes = [re.escape(item) for item in sorted(set(destaques), key=len, reverse=True)]
    expressoes.extend((r"(?<=na posição )1\b", r"\d{2}/\d{2}/\d{4}, às \d{2}h\d{2} \(horário de Brasília\)"))
    padrao = re.compile("|".join(expressoes))
    fonte = email_layout_ahp.FONTE
    paragrafos = []
    for bloco in texto.strip("\n").split("\n\n"):
        if not bloco.strip():
            continue
        if bloco == _ORIENTACOES:
            paragrafos.append(
                f'<h2 style="margin:24px 0 8px;padding-left:9px;border-left:4px solid {email_layout_ahp.VERDE_PLI};'
                f'{fonte}font-size:14px;color:{email_layout_ahp.AZUL_PLI};text-transform:uppercase;'
                f'letter-spacing:.03em;">{escape(bloco)}</h2>'
            )
            continue
        if bloco == _AJUDA_CONSISTENCIA:
            paragrafos.append(
                f'<h3 style="margin:22px 0 8px;padding-left:9px;border-left:4px solid {email_layout_ahp.VERDE_PLI};'
                f'{fonte}font-size:15px;color:{email_layout_ahp.AZUL_PLI};">{escape(bloco)}</h3>'
            )
            continue
        marca = 0
        trechos = []
        for match in padrao.finditer(bloco):
            trechos.extend((escape(bloco[marca:match.start()]), f"<strong>{escape(match[0])}</strong>"))
            marca = match.end()
        trechos.append(escape(bloco[marca:]))
        valor = "".join(trechos).replace("\n", "<br>")
        paragrafos.append(f'<p style="margin:0 0 10px;{fonte}font-size:14px;line-height:1.55;color:#22333f;">{valor}</p>')
    return "".join(paragrafos)


def html(texto: str, link: str, acao: str, *, julgamento: str = "",
         titulo: str = "Convite para colaboração", ilustrar: bool = True) -> str:
    antes, _, depois = re.split(r"(?m)^([ \t]*" + re.escape(link) + r"[ \t]*)$", texto.replace("\r\n", "\n"), maxsplit=1)
    introducao, data_hora, observacoes = _separar_prazo(antes)
    botao = email_layout_ahp.botao(link, acao, cores_pli=True, centralizado=data_hora is not None)
    comparacoes, ajuda, detalhes = introducao.partition(f"\n\n{_AJUDA_CONSISTENCIA}\n\n")
    blocos = _paragrafos(comparacoes, julgamento)
    if ilustrar and _ORIENTACOES in comparacoes.strip().split("\n\n"):
        blocos += email_layout_ahp.exemplos_html(email_layout_ahp.EXEMPLOS_COMPARACAO)
    if ajuda:
        secao_ajuda = _paragrafos(f"{_AJUDA_CONSISTENCIA}\n\n{detalhes}", julgamento)
        if ilustrar:
            secao_ajuda += email_layout_ahp.exemplos_html(email_layout_ahp.EXEMPLOS_CONSISTENCIA)
        blocos += f'<div class="sicard-email-ajuda-consistencia">{secao_ajuda}</div>'
    if data_hora:
        estilo = (
            f"{email_layout_ahp.FONTE}font-size:28px;line-height:1.25;"
            "font-weight:bold;color:#8a1c1c;text-align:center;"
        )
        prazo = (
            f'<div style="{estilo}margin:0 0 6px;">{escape(data_hora[0])}</div>'
            f'<div style="{estilo}margin:0 0 16px;">{escape(data_hora[1])}</div>'
        )
        card = email_layout_ahp.painel(_PRAZO, prazo + botao, cores_pli=True)
        blocos += f'<div style="margin:0 0 12px;">{card}</div>'
        blocos += _paragrafos(observacoes, julgamento)
    else:
        blocos += botao
    assinatura = _paragrafos(depois, julgamento)
    if assinatura:
        blocos += '<div style="margin-top:18px;">' + assinatura + '</div>'
    return email_layout_ahp.documento(titulo, blocos, cores_pli=True)
