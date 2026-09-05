"""Regras de negócio — análise de admissibilidade da demanda (portão de entrada).

Cinco critérios binários decidem, por maioria simples, se a demanda é admissível.
O resultado e o texto do parecer são gerados pelo sistema (o usuário não escolhe),
e a decisão do avaliador aplica a transição de status pelos fluxos já existentes
(aprovar / reprovar / PATCH validado por `status_transicoes`).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from io import BytesIO
from typing import Any

from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import (
    analise_demanda_repository,
    demanda_repository,
    dominio_repository,
    plano_repository,
    programa_repository,
)
from api.schemas.analise_demanda import (
    AnaliseDemandaResponseSchema,
    CriterioAvaliadoSchema,
    CriteriosAnaliseSchema,
)
from api.schemas.demanda import DemandaUpdateSchema
from api.schemas.plano import PlanoUpdateSchema
from api.schemas.programa import ProgramaUpdateSchema
from api.services import demanda_service, objeto_ahp_service, plano_service, programa_service
from api.services.session_service import SessionUser
from api.services.status_transicoes import destinos_permitidos

CRITERIOS: tuple[dict[str, str], ...] = (
    {
        "campo": "criterio_competencia",
        "rotulo": "Competência",
        "pergunta": "É matéria de logística/transporte e de alçada estadual (SLT)?",
    },
    {
        "campo": "criterio_clareza",
        "rotulo": "Clareza do pedido",
        "pergunta": (
            "É possível identificar objetivamente o que se pede "
            "(obra, estudo, ato normativo, articulação, apoio)?"
        ),
    },
    {
        "campo": "criterio_finalidade_publica",
        "rotulo": "Finalidade pública",
        "pergunta": "Atende interesse coletivo, e não benefício exclusivamente privado?",
    },
    {
        "campo": "criterio_relevancia_setorial",
        "rotulo": "Relevância setorial",
        "pergunta": (
            "Tem repercussão para o sistema de logística/transportes do Estado, "
            "além do ponto local?"
        ),
    },
    {
        "campo": "criterio_nao_duplicidade",
        "rotulo": "Não duplicidade",
        "pergunta": (
            "A demanda já não está contemplada por ação, projeto ou processo "
            "em curso na SLT?"
        ),
    },
)

_CAMPOS_CRITERIO = tuple(item["campo"] for item in CRITERIOS)

# Desfecho escolhido pelo avaliador -> status de destino da demanda.
DECISAO_STATUS: dict[str, str] = {
    "aprovada": "analise_aprovada",
    # Aprovação condicionada: segue para hierarquização como a aprovação simples;
    # o que distingue as duas é a coluna `decisao` e as ressalvas registradas na
    # complementação do parecer (obrigatória neste desfecho).
    "ressalvas": "analise_aprovada",
    "reprovada": "analise_reprovada",
}

DECISAO_ROTULO: dict[str, str] = {
    "aprovada": "Aprovar",
    "ressalvas": "Aprovar com ressalvas",
    "reprovada": "Reprovar",
}


# ---------------------------------------------------------------------------
# Localização da demanda (ela vive em três tabelas distintas)
# ---------------------------------------------------------------------------
_REPOS: dict[str, Any] = {
    "projeto": demanda_repository,
    "programa": programa_repository,
    "plano": plano_repository,
}

_PREFIXO_TIPO = {"I-PLA": "plano", "I-PRO": "programa", "I-PRJ": "projeto", "P-PRJ": "projeto"}


def _ordem_busca(codigo: str) -> tuple[str, ...]:
    provavel = _PREFIXO_TIPO.get((codigo or "")[:5].upper())
    if not provavel:
        return ("projeto", "programa", "plano")
    return (provavel, *(t for t in ("projeto", "programa", "plano") if t != provavel))


def _localizar_demanda(codigo: str) -> tuple[str, dict[str, Any]]:
    alvo = (codigo or "").strip()
    if not alvo:
        raise DemandaValidationError("Código da demanda é obrigatório.", field="codigo")
    for tipo in _ordem_busca(alvo):
        row = _REPOS[tipo].get_by_codigo(alvo)
        if row:
            return tipo, dict(row)
    raise DemandaNotFoundError(alvo)


# ---------------------------------------------------------------------------
# Cálculo e texto do parecer
# ---------------------------------------------------------------------------
def _respostas(analise: dict[str, Any] | None) -> dict[str, bool | None]:
    origem = analise or {}
    return {campo: origem.get(campo) for campo in _CAMPOS_CRITERIO}


def calcular_resultado(respostas: dict[str, bool | None]) -> str | None:
    """Maioria simples entre os cinco critérios; ``None`` enquanto incompleto."""
    valores = [respostas.get(campo) for campo in _CAMPOS_CRITERIO]
    if any(valor is None for valor in valores):
        return None
    sim = sum(1 for valor in valores if valor)
    return "aprovado" if sim >= 3 else "reprovado"


def _placar(respostas: dict[str, bool | None]) -> tuple[int, int, int]:
    valores = [respostas.get(campo) for campo in _CAMPOS_CRITERIO]
    sim = sum(1 for valor in valores if valor is True)
    nao = sum(1 for valor in valores if valor is False)
    return sim, nao, sim + nao


def _data_extenso(momento: datetime) -> str:
    return momento.strftime("%d/%m/%Y às %H:%M")


def gerar_parecer_texto(
    *,
    codigo: str,
    nome: str,
    tipo: str,
    respostas: dict[str, bool | None],
    avaliador_nome: str | None,
    momento: datetime | None = None,
) -> str:
    momento = momento or datetime.now()
    resultado = calcular_resultado(respostas)
    sim, nao, _ = _placar(respostas)
    total = len(CRITERIOS)

    linhas: list[str] = [
        f"PARECER TÉCNICO DE ADMISSIBILIDADE — {codigo}",
        f"Demanda: {nome} ({tipo}).",
        "",
        "Critérios considerados:",
    ]
    for item in CRITERIOS:
        resposta = respostas.get(item["campo"])
        marcador = "Sim" if resposta is True else "Não" if resposta is False else "Não respondido"
        linhas.append(f"  - {item['rotulo']}: {item['pergunta']} — {marcador}")

    nao_atendidos = [
        item["rotulo"] for item in CRITERIOS if respostas.get(item["campo"]) is False
    ]
    nao_respondidos = [
        item["rotulo"] for item in CRITERIOS if respostas.get(item["campo"]) is None
    ]

    linhas.append("")
    if nao_atendidos:
        linhas.append(
            "Critérios NÃO atendidos: " + "; ".join(nao_atendidos) + "."
        )
    else:
        linhas.append("Não há critérios reprovados: o pedido passou em todos os critérios avaliados.")

    if nao_respondidos:
        linhas.append("Critérios ainda não respondidos: " + "; ".join(nao_respondidos) + ".")

    linhas.append("")
    linhas.append(f"Placar: {sim} de {total} critérios atendidos ({nao} não atendidos).")

    if resultado == "aprovado":
        linhas.append(
            "Conclusão: a demanda é APROVADA na análise de admissibilidade, por atender "
            "à maioria dos critérios, e segue para as etapas seguintes do fluxo da SLT."
        )
    elif resultado == "reprovado":
        linhas.append(
            "Conclusão: a demanda é REPROVADA na análise de admissibilidade, por não atender "
            "à maioria dos critérios, e não segue para a hierarquização."
        )
    else:
        linhas.append(
            "Conclusão: pendente — o resultado só é apurado após a resposta dos cinco critérios."
        )

    linhas.append("")
    linhas.append(f"Avaliador: {avaliador_nome or 'não identificado'}.")
    linhas.append(f"Data da análise: {_data_extenso(momento)}.")
    return "\n".join(linhas)


# ---------------------------------------------------------------------------
# Montagem da resposta
# ---------------------------------------------------------------------------
def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _montar_resposta(
    *,
    codigo: str,
    tipo: str,
    demanda: dict[str, Any],
    analise: dict[str, Any] | None,
) -> AnaliseDemandaResponseSchema:
    respostas = _respostas(analise)
    sim, nao, respondidos = _placar(respostas)
    return AnaliseDemandaResponseSchema(
        demanda_codigo=codigo,
        demanda_tipo=tipo,
        demanda_nome=demanda.get("nome"),
        demanda_status=demanda.get("status"),
        criterios=[
            CriterioAvaliadoSchema(
                campo=item["campo"],
                rotulo=item["rotulo"],
                pergunta=item["pergunta"],
                resposta=respostas.get(item["campo"]),
            )
            for item in CRITERIOS
        ],
        respondidos=respondidos,
        total_criterios=len(CRITERIOS),
        sim=sim,
        nao=nao,
        completo=respondidos == len(CRITERIOS),
        resultado=calcular_resultado(respostas),
        parecer_texto=(analise or {}).get("parecer_texto"),
        parecer_complemento=(analise or {}).get("parecer_complemento"),
        decisao=(analise or {}).get("decisao"),
        avaliador_nome=(analise or {}).get("avaliador_nome"),
        tem_parecer_pdf=bool((analise or {}).get("tem_parecer_pdf")),
        parecer_pdf_gerado_em=_iso((analise or {}).get("parecer_pdf_gerado_em")),
        atualizado_em=_iso((analise or {}).get("atualizado_em")),
    )


def _avaliador_id(user: SessionUser | None) -> str | None:
    if not user or not user.id:
        return None
    try:
        return str(uuid.UUID(str(user.id)))
    except (ValueError, TypeError):
        return None


def _avaliador_nome(user: SessionUser | None) -> str | None:
    if not user:
        return None
    return (user.nome or user.username or user.email or "").strip() or None


# ---------------------------------------------------------------------------
# Casos de uso
# ---------------------------------------------------------------------------
def obter_analise(codigo: str) -> AnaliseDemandaResponseSchema:
    tipo, demanda = _localizar_demanda(codigo)
    analise = analise_demanda_repository.get_by_codigo(demanda["codigo"])
    return _montar_resposta(codigo=demanda["codigo"], tipo=tipo, demanda=demanda, analise=analise)


def salvar_criterios(
    codigo: str,
    payload: CriteriosAnaliseSchema,
    *,
    user: SessionUser | None = None,
) -> AnaliseDemandaResponseSchema:
    tipo, demanda = _localizar_demanda(codigo)
    respostas = {campo: getattr(payload, campo) for campo in _CAMPOS_CRITERIO}

    parecer = gerar_parecer_texto(
        codigo=demanda["codigo"],
        nome=demanda.get("nome") or demanda["codigo"],
        tipo=tipo,
        respostas=respostas,
        avaliador_nome=_avaliador_nome(user),
    )

    analise = analise_demanda_repository.upsert(
        demanda_codigo=demanda["codigo"],
        demanda_tipo=tipo,
        campos={
            **respostas,
            "resultado": calcular_resultado(respostas),
            "parecer_texto": parecer,
            "avaliador_id": _avaliador_id(user),
            "avaliador_nome": _avaliador_nome(user),
        },
    )
    return _montar_resposta(codigo=demanda["codigo"], tipo=tipo, demanda=demanda, analise=analise)


def salvar_complemento(
    codigo: str,
    complemento: str | None,
    *,
    user: SessionUser | None = None,
) -> AnaliseDemandaResponseSchema:
    tipo, demanda = _localizar_demanda(codigo)
    if not analise_demanda_repository.get_by_codigo(demanda["codigo"]):
        raise DemandaValidationError(
            "Responda os critérios de análise antes de complementar o parecer.",
            field="criterios",
        )
    texto = (complemento or "").strip() or None
    analise = analise_demanda_repository.upsert(
        demanda_codigo=demanda["codigo"],
        demanda_tipo=tipo,
        campos={
            "parecer_complemento": texto,
            "avaliador_id": _avaliador_id(user),
            "avaliador_nome": _avaliador_nome(user),
        },
    )
    return _montar_resposta(codigo=demanda["codigo"], tipo=tipo, demanda=demanda, analise=analise)


def _rotulo_status(codigo_status: str) -> str:
    try:
        for row in dominio_repository.list_status_demanda():
            if row.get("codigo") == codigo_status:
                return row.get("nome") or codigo_status
    except Exception:  # noqa: BLE001 — rótulo é cosmético; nunca derruba a decisão
        return codigo_status
    return codigo_status


def _aplicar_transicao(
    *,
    tipo: str,
    codigo: str,
    status_atual: str,
    destino: str,
    avaliador_id: str | None,
    decisao: str = "",
) -> str:
    """Aplica a transição pelos fluxos já existentes, sem reimplementar a matriz."""
    permitidos = destinos_permitidos(status_atual)
    if destino not in permitidos:
        raise DemandaValidationError(
            f"Transição de status inválida: «{status_atual}» → «{destino}».",
            field="status",
        )

    if destino == "analise_aprovada":
        motivo = (
            "Aprovada com ressalvas na análise de admissibilidade (ver parecer técnico)."
            if decisao == "ressalvas"
            else "Aprovada na análise de admissibilidade (ver parecer técnico)."
        )
        if tipo == "plano":
            plano_service.aprovar_plano(codigo, motivo=motivo, aprovado_por=avaliador_id)
        elif tipo == "programa":
            programa_service.aprovar_programa(codigo, motivo=motivo, aprovado_por=avaliador_id)
        else:
            objeto_ahp_service.aprovar_demanda(codigo, motivo=motivo, aprovado_por=avaliador_id)
        return destino

    if destino == "analise_reprovada":
        justificativa = "Reprovada na análise de admissibilidade (ver parecer técnico)."
        if tipo == "plano":
            plano_service.reprovar_plano(
                codigo, justificativa=justificativa, reprovado_por=avaliador_id
            )
        elif tipo == "programa":
            programa_service.reprovar_programa(
                codigo, justificativa=justificativa, reprovado_por=avaliador_id
            )
        else:
            demanda_service.reprovar_demanda(
                codigo, justificativa=justificativa, reprovado_por=avaliador_id
            )
        return destino

    # Demais destinos (ex.: analise_suspensa) usam o PATCH, que já valida a matriz.
    if tipo == "plano":
        plano_service.atualizar_plano(codigo, PlanoUpdateSchema(status=destino))
    elif tipo == "programa":
        programa_service.atualizar_programa(codigo, ProgramaUpdateSchema(status=destino))
    else:
        demanda_service.atualizar_demanda(codigo, DemandaUpdateSchema(status=destino))
    return destino


def decidir(
    codigo: str,
    decisao: str,
    *,
    user: SessionUser | None = None,
) -> tuple[AnaliseDemandaResponseSchema, str, str]:
    """Valida os critérios, aplica a transição, gera e persiste o PDF do parecer."""
    destino = DECISAO_STATUS.get(decisao)
    if not destino:
        raise DemandaValidationError(f"Decisão inválida: «{decisao}».", field="decisao")

    tipo, demanda = _localizar_demanda(codigo)
    codigo_demanda = demanda["codigo"]
    analise = analise_demanda_repository.get_by_codigo(codigo_demanda)
    respostas = _respostas(analise)

    pendentes = [
        item["rotulo"] for item in CRITERIOS if respostas.get(item["campo"]) is None
    ]
    if pendentes:
        raise DemandaValidationError(
            "Responda todos os critérios de análise antes de decidir. Pendentes: "
            + "; ".join(pendentes)
            + ".",
            field="criterios",
        )

    if decisao == "ressalvas" and not ((analise or {}).get("parecer_complemento") or "").strip():
        raise DemandaValidationError(
            "Para aprovar com ressalvas é obrigatório registrar a complementação do parecer.",
            field="parecer_complemento",
        )

    status_anterior = demanda.get("status") or ""
    status_atual = _aplicar_transicao(
        tipo=tipo,
        codigo=codigo_demanda,
        status_atual=status_anterior,
        destino=destino,
        avaliador_id=_avaliador_id(user) or (analise or {}).get("avaliador_id"),
        decisao=decisao,
    )

    momento = datetime.now()
    parecer = gerar_parecer_texto(
        codigo=codigo_demanda,
        nome=demanda.get("nome") or codigo_demanda,
        tipo=tipo,
        respostas=respostas,
        avaliador_nome=_avaliador_nome(user) or (analise or {}).get("avaliador_nome"),
        momento=momento,
    )

    analise = analise_demanda_repository.upsert(
        demanda_codigo=codigo_demanda,
        demanda_tipo=tipo,
        campos={
            "resultado": calcular_resultado(respostas),
            "parecer_texto": parecer,
            "decisao": decisao,
            "avaliador_id": _avaliador_id(user) or (analise or {}).get("avaliador_id"),
            "avaliador_nome": _avaliador_nome(user) or (analise or {}).get("avaliador_nome"),
        },
    )

    pdf = gerar_pdf(
        demanda=demanda,
        tipo=tipo,
        respostas=respostas,
        analise=analise,
        decisao=decisao,
        status_atual=status_atual,
        momento=momento,
    )
    analise_demanda_repository.salvar_pdf(demanda_codigo=codigo_demanda, pdf=pdf)

    demanda_atualizada = {**demanda, "status": status_atual}
    resposta = _montar_resposta(
        codigo=codigo_demanda,
        tipo=tipo,
        demanda=demanda_atualizada,
        analise={**analise, "tem_parecer_pdf": True},
    )
    return resposta, status_anterior, status_atual


def obter_pdf(codigo: str) -> tuple[str, bytes]:
    _tipo, demanda = _localizar_demanda(codigo)
    pdf = analise_demanda_repository.get_pdf(demanda["codigo"])
    if not pdf:
        raise DemandaNotFoundError(
            f"Nenhum parecer em PDF foi gerado para a demanda {demanda['codigo']}."
        )
    return demanda["codigo"], pdf


# ---------------------------------------------------------------------------
# Relatório PDF
# ---------------------------------------------------------------------------
def gerar_pdf(
    *,
    demanda: dict[str, Any],
    tipo: str,
    respostas: dict[str, bool | None],
    analise: dict[str, Any],
    decisao: str,
    status_atual: str,
    momento: datetime,
) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_JUSTIFY
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
    except ImportError as exc:  # pragma: no cover - dependência declarada em requirements.txt
        raise DemandaValidationError(
            "Geração de PDF indisponível: dependência «reportlab» não instalada no servidor.",
            field="pdf",
        ) from exc

    estilos = getSampleStyleSheet()
    titulo = ParagraphStyle(
        "TituloSLT",
        parent=estilos["Title"],
        fontSize=14,
        spaceAfter=4,
        textColor=colors.HexColor("#003b5a"),
    )
    subtitulo = ParagraphStyle(
        "SubtituloSLT",
        parent=estilos["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#5a7184"),
        spaceAfter=10,
    )
    secao = ParagraphStyle(
        "SecaoSLT",
        parent=estilos["Heading2"],
        fontSize=11,
        spaceBefore=12,
        spaceAfter=5,
        textColor=colors.HexColor("#003b5a"),
    )
    corpo = ParagraphStyle(
        "CorpoSLT", parent=estilos["Normal"], fontSize=9, leading=13, alignment=TA_JUSTIFY
    )
    celula = ParagraphStyle("CelulaSLT", parent=estilos["Normal"], fontSize=8.5, leading=11)

    def escapar(texto: Any) -> str:
        return (
            str(texto if texto is not None else "—")
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
        )

    sim, nao, _ = _placar(respostas)
    resultado = analise.get("resultado") or calcular_resultado(respostas)
    total = len(CRITERIOS)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Parecer de admissibilidade — {demanda.get('codigo')}",
        author="SICARD — SLT/SP",
    )

    fluxo: list[Any] = [
        Paragraph("Parecer técnico de admissibilidade", titulo),
        Paragraph(
            "SICARD — Secretaria de Logística e Transportes do Estado de São Paulo",
            subtitulo,
        ),
    ]

    identificacao = [
        ["Código", escapar(demanda.get("codigo"))],
        ["Nome", escapar(demanda.get("nome"))],
        ["Tipo", escapar(tipo.capitalize())],
        ["Status após a decisão", escapar(_rotulo_status(status_atual))],
    ]
    tabela_id = Table(
        [[Paragraph(f"<b>{rot}</b>", celula), Paragraph(val, celula)] for rot, val in identificacao],
        colWidths=[45 * mm, 125 * mm],
    )
    tabela_id.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c9d6e0")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef4f8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    fluxo.append(tabela_id)

    fluxo.append(Paragraph("Critérios de análise", secao))
    linhas = [
        [
            Paragraph("<b>Critério</b>", celula),
            Paragraph("<b>Pergunta</b>", celula),
            Paragraph("<b>Resposta</b>", celula),
        ]
    ]
    for item in CRITERIOS:
        resposta = respostas.get(item["campo"])
        marcador = "Sim" if resposta is True else "Não" if resposta is False else "—"
        linhas.append(
            [
                Paragraph(escapar(item["rotulo"]), celula),
                Paragraph(escapar(item["pergunta"]), celula),
                Paragraph(marcador, celula),
            ]
        )
    tabela_criterios = Table(linhas, colWidths=[38 * mm, 112 * mm, 20 * mm], repeatRows=1)
    tabela_criterios.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c9d6e0")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eef4f8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (2, 1), (2, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    fluxo.append(tabela_criterios)

    fluxo.append(Paragraph("Resultado da análise", secao))
    rotulo_resultado = {"aprovado": "Aprovado", "reprovado": "Reprovado"}.get(
        resultado or "", "Pendente"
    )
    fluxo.append(
        Paragraph(
            f"<b>{rotulo_resultado}</b> — {sim} de {total} critérios atendidos "
            f"({nao} não atendidos).",
            corpo,
        )
    )

    fluxo.append(Paragraph("Parecer técnico", secao))
    for paragrafo in (analise.get("parecer_texto") or "").split("\n"):
        if paragrafo.strip():
            fluxo.append(Paragraph(escapar(paragrafo), corpo))
        else:
            fluxo.append(Spacer(1, 4))

    complemento = (analise.get("parecer_complemento") or "").strip()
    if complemento:
        fluxo.append(Paragraph("Complementação do parecer", secao))
        for paragrafo in complemento.split("\n"):
            if paragrafo.strip():
                fluxo.append(Paragraph(escapar(paragrafo), corpo))
            else:
                fluxo.append(Spacer(1, 4))

    fluxo.append(Paragraph("Decisão", secao))
    fluxo.append(
        Paragraph(
            f"<b>{escapar(DECISAO_ROTULO.get(decisao, decisao))}</b> — a demanda passou ao status "
            f"«{escapar(_rotulo_status(status_atual))}».",
            corpo,
        )
    )

    fluxo.append(Spacer(1, 14))
    rodape = ParagraphStyle(
        "RodapeSLT",
        parent=estilos["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#5a7184"),
    )
    fluxo.append(
        Paragraph(
            f"Avaliador: {escapar(analise.get('avaliador_nome') or 'não identificado')} · "
            f"Emitido em {_data_extenso(momento)}.",
            rodape,
        )
    )

    doc.build(fluxo)
    return buffer.getvalue()
