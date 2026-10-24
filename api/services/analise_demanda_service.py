"""Regras de negócio — análise de admissibilidade da demanda (portão de entrada).

Dois critérios eliminatórios e três classificatórios ponderados decidem a admissibilidade.
O resultado e o texto do parecer são gerados pelo sistema (o usuário não escolhe),
e a decisão do avaliador aplica a transição de status pelos fluxos já existentes
(aprovar / reprovar / PATCH validado por `status_transicoes`).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from io import BytesIO
from typing import Any

from psycopg.types.json import Jsonb

from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import (
    analise_demanda_repository,
    demanda_repository,
    dominio_repository,
    geometria_historico_repository,
    plano_repository,
    programa_repository,
)
from api.schemas.analise_demanda import (
    AvaliacaoGeometriaResponseSchema,
    AvaliacaoGeometriaSchema,
    AnaliseDemandaResponseSchema,
    CriterioAvaliadoSchema,
    CriteriosAnaliseSchema,
    GeometriaHistoricoItemSchema,
    GeometriaHistoricoResponseSchema,
)
from api.schemas.demanda import DemandaUpdateSchema
from api.schemas.plano import PlanoUpdateSchema
from api.schemas.programa import ProgramaUpdateSchema
from api.services import demanda_service, objeto_ahp_service, plano_service, programa_service
from api.services.session_service import SessionUser
from api.services.status_transicoes import destinos_permitidos_com_handoff

CRITERIOS = (
    {"campo": "criterio_competencia", "rotulo": "Competência", "pergunta": "O objeto da demanda está dentro das atribuições da SLT?", "classe": "eliminatorio", "peso": 0},
    {"campo": "criterio_nao_duplicidade", "rotulo": "Não duplicidade", "pergunta": "Esta demanda é inédita, sem duplicidade com outra demanda já cadastrada no SICARD?", "classe": "eliminatorio", "peso": 0},
    {"campo": "criterio_clareza", "rotulo": "Clareza do pedido", "pergunta": "As informações apresentadas permitem identificar claramente o que está sendo solicitado à SLT?", "classe": "classificatorio", "peso": 20},
    {"campo": "criterio_finalidade_publica", "rotulo": "Finalidade pública", "pergunta": "As informações apresentadas indicam benefícios para a coletividade decorrentes do atendimento da demanda?", "classe": "classificatorio", "peso": 30},
    {"campo": "criterio_relevancia_setorial", "rotulo": "Relevância setorial", "pergunta": "O atendimento da demanda contribui para melhorar o transporte ou a logística no Estado?", "classe": "classificatorio", "peso": 50},
)
ELIMINATORIOS = ("criterio_competencia", "criterio_nao_duplicidade")


def pontuacao(respostas):
    return sum(item["peso"] for item in CRITERIOS if respostas.get(item["campo"]) is True)

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

# Ações intermediárias: mudam o status visível no mapa sem decisão nem PDF.
SITUACAO_STATUS: dict[str, str] = {
    "suspender": "analise_suspensa",
    "complementar": "analise_aguardando_complementacao",
    "retomar": "analise_em_avaliacao",
}
SITUACAO_ORIGENS: dict[str, frozenset[str]] = {
    "suspender": frozenset({"analise_em_avaliacao"}),
    "complementar": frozenset({"analise_em_avaliacao"}),
    "retomar": frozenset({"analise_suspensa", "analise_aguardando_complementacao"}),
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
    if any(respostas.get(c) is False for c in ELIMINATORIOS):
        return "reprovado"
    if any(respostas.get(c) is None for c in _CAMPOS_CRITERIO):
        return None
    return "aprovado" if pontuacao(respostas) > 50 else "reprovado"


def _placar(respostas: dict[str, bool | None]) -> tuple[int, int, int]:
    valores = [respostas.get(campo) for campo in _CAMPOS_CRITERIO]
    sim = sum(1 for valor in valores if valor is True)
    nao = sum(1 for valor in valores if valor is False)
    return sim, nao, sim + nao


def _data_extenso(momento: datetime) -> str:
    return momento.strftime("%d/%m/%Y às %H:%M")


def _nome_demanda_duplicada(codigo: str | None) -> str | None:
    if not codigo:
        return None
    try:
        _, demanda = _localizar_demanda(codigo)
        return demanda.get("nome")
    except DemandaNotFoundError:
        return None


def gerar_parecer_texto(
    *,
    codigo: str,
    nome: str,
    tipo: str,
    respostas: dict[str, bool | None],
    avaliador_nome: str | None,
    momento: datetime | None = None,
    demanda_duplicada_codigo: str | None = None,
    demanda_duplicada_nome: str | None = None,
) -> str:
    momento = momento or datetime.now()
    resultado = calcular_resultado(respostas)
    eliminatorios = [item for item in CRITERIOS if item["classe"] == "eliminatorio"]
    reprovados = [item["rotulo"] for item in eliminatorios if respostas.get(item["campo"]) is False]
    liberado = all(respostas.get(item["campo"]) is True for item in eliminatorios)
    linhas = [f"PARECER TÉCNICO DE ADMISSIBILIDADE — {codigo}",
              f"Demanda: {nome} ({tipo}).", "", "Critérios eliminatórios:"]
    for item in eliminatorios:
        resposta = respostas.get(item["campo"])
        marcador = "Sim" if resposta is True else "Não" if resposta is False else "Não respondido"
        linhas.append(f"  - {item['rotulo']}: {item['pergunta']} — {marcador}.")
    if respostas.get("criterio_nao_duplicidade") is False:
        referencia = demanda_duplicada_codigo or "identificação pendente"
        if demanda_duplicada_nome:
            referencia += f" — {demanda_duplicada_nome}"
        linhas.append(f"Demanda já cadastrada identificada como duplicada: {referencia}.")
    linhas.append("")
    if reprovados:
        linhas.append("Conclusão: a demanda é REPROVADA por não atender ao(s) critério(s) eliminatório(s): " + "; ".join(reprovados) + ".")
        linhas.append("Os critérios classificatórios e a avaliação da geometria não se aplicam nesta etapa. Não há apuração de pontuação classificatória.")
    elif not liberado:
        linhas.append("Conclusão: pendente — responda os dois critérios eliminatórios. Os critérios classificatórios e a avaliação da geometria serão liberados somente após duas respostas Sim.")
    else:
        linhas.append("Ambos os critérios eliminatórios foram atendidos.")
        linhas.append("Critérios classificatórios:")
        for item in CRITERIOS:
            if item["classe"] != "classificatorio":
                continue
            resposta = respostas.get(item["campo"])
            marcador = "Sim" if resposta is True else "Não" if resposta is False else "Não respondido"
            linhas.append(f"  - {item['rotulo']} (peso {item['peso']}%): {item['pergunta']} — {marcador}.")
        linhas.append("Regra: Sim soma o peso à aprovação; Não soma o peso à reprovação. A aprovação exige mais de 50% favoráveis; 50% ou menos reprova.")
        if resultado is None:
            linhas.append("Conclusão: pendente — responda os três critérios classificatórios para apurar a pontuação final.")
        else:
            pontos = pontuacao(respostas)
            linhas.append(f"Pontuação classificatória: {pontos}% favoráveis e {100 - pontos}% contrários.")
            if resultado == "aprovado":
                linhas.append("Conclusão: a demanda é APROVADA por atender aos dois eliminatórios e superar 50% de pontuação favorável.")
            else:
                linhas.append("Conclusão: a demanda é REPROVADA por não superar 50% de pontuação favorável, embora tenha atendido aos dois eliminatórios.")
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
    if analise and not analise.get("decisao"):
        analise = dict(analise, parecer_texto=gerar_parecer_texto(
            codigo=codigo, nome=demanda.get("nome") or codigo, tipo=tipo,
            respostas=respostas, avaliador_nome=analise.get("avaliador_nome"),
            demanda_duplicada_codigo=analise.get("demanda_duplicada_codigo"),
            demanda_duplicada_nome=_nome_demanda_duplicada(analise.get("demanda_duplicada_codigo")),
            momento=analise.get("atualizado_em") if isinstance(analise.get("atualizado_em"), datetime) else None,
        ))
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
                classe=item["classe"], peso=item["peso"],
            )
            for item in CRITERIOS
        ],
        respondidos=respondidos,
        total_criterios=len(CRITERIOS),
        sim=sim,
        nao=nao,
        completo=calcular_resultado(respostas) is not None,
        pontuacao=pontuacao(respostas),
        demanda_duplicada_codigo=(analise or {}).get("demanda_duplicada_codigo"),
        resultado=calcular_resultado(respostas),
        parecer_texto=_parecer_com_geometria(analise or {}),
        parecer_complemento=(analise or {}).get("parecer_complemento"),
        decisao=(analise or {}).get("decisao"),
        avaliador_nome=(analise or {}).get("avaliador_nome"),
        avaliacao_geometria=_avaliacao_geometria(analise),
        tem_parecer_pdf=bool((analise or {}).get("tem_parecer_pdf")),
        parecer_pdf_gerado_em=_iso((analise or {}).get("parecer_pdf_gerado_em")),
        atualizado_em=_iso((analise or {}).get("atualizado_em")),
    )


def _avaliacao_geometria(
    analise: dict[str, Any] | None,
) -> AvaliacaoGeometriaResponseSchema | None:
    dados = (analise or {}).get("avaliacao_geometria")
    if not isinstance(dados, dict):
        return None
    return AvaliacaoGeometriaResponseSchema.model_validate(dados)


def _parecer_com_geometria(analise: dict) -> str | None:
    texto = analise.get("parecer_texto") or ""
    avaliacao = analise.get("avaliacao_geometria") or {}
    linhas = []
    if avaliacao.get("adequada") is True and avaliacao.get("confirmada") is True:
        linhas.append("A geometria apresentada foi aprovada como suficientemente adequada para representar o objeto da demanda.")
    elif avaliacao.get("adequada") is True:
        linhas.append("A geometria foi considerada adequada; a confirmação pelo botão Aprovar geometria está pendente.")
    elif avaliacao.get("adequada") is False:
        linhas.append("A geometria apresentada foi considerada insuficientemente adequada para representar o objeto da demanda.")
        if avaliacao.get("encaminhamento") == "complementacao":
            linhas.append("Encaminhamento: solicitar complementação do interessado. Tipo: Ajuste de geometria.")
        elif avaliacao.get("encaminhamento") == "substituicao":
            linhas.append("Encaminhamento: envio de nova geometria pelo analista.")
    for evento in avaliacao.get("substituicoes") or []:
        linhas.append(
            f"Uma nova geometria foi inserida em {evento.get('em')} pelo usuário {evento.get('por')}. "
            f"Arquivo: {evento.get('arquivo')}. A versão anterior e o arquivo original foram preservados no histórico."
        )
    if avaliacao.get("observacao"):
        linhas.append(f"Observação sobre a geometria: {avaliacao['observacao']}")
    return (texto + "\n\nGeometria\n" + "\n".join(linhas)).strip() if linhas else texto or None


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
    duplicada = (payload.demanda_duplicada_codigo or "").strip() or None
    if respostas["criterio_nao_duplicidade"] is not False:
        duplicada = None
    if duplicada:
        if duplicada == demanda["codigo"]:
            raise DemandaValidationError("Selecione outra demanda.", field="demanda_duplicada_codigo")
        _localizar_demanda(duplicada)
    if not all(respostas[c] is True for c in ELIMINATORIOS):
        for item in CRITERIOS:
            if item["classe"] == "classificatorio":
                respostas[item["campo"]] = None


    parecer = gerar_parecer_texto(
        codigo=demanda["codigo"],
        nome=demanda.get("nome") or demanda["codigo"],
        tipo=tipo,
        respostas=respostas,
        avaliador_nome=_avaliador_nome(user),
        demanda_duplicada_codigo=duplicada,
        demanda_duplicada_nome=_nome_demanda_duplicada(duplicada),
    )

    analise = analise_demanda_repository.upsert(
        demanda_codigo=demanda["codigo"],
        demanda_tipo=tipo,
        campos={
            **respostas,
            "demanda_duplicada_codigo": duplicada,
            "resultado": calcular_resultado(respostas),
            "parecer_texto": parecer,
            "avaliador_id": _avaliador_id(user),
            "avaliador_nome": _avaliador_nome(user),
        },
    )
    return _montar_resposta(codigo=demanda["codigo"], tipo=tipo, demanda=demanda, analise=analise)


def salvar_avaliacao_geometria(
    codigo: str,
    payload: AvaliacaoGeometriaSchema,
    *,
    user: SessionUser | None = None,
) -> AnaliseDemandaResponseSchema:
    tipo, demanda = _localizar_demanda(codigo)
    avaliacao = payload.model_dump(exclude_unset=True)
    avaliacao.setdefault("adequada", None)
    avaliacao.setdefault("encaminhamento", None)
    avaliacao.setdefault("observacao", None)
    avaliacao["confirmada"] = payload.confirmada and avaliacao["adequada"] is True
    if avaliacao["adequada"] is not False:
        avaliacao["encaminhamento"] = None
    avaliacao["tipo_complementacao"] = (
        "ajuste_geometria" if avaliacao["encaminhamento"] == "complementacao" else None
    )
    avaliacao["observacao"] = (avaliacao["observacao"] or "").strip() or None
    avaliacao.update(
        avaliada_por=_avaliador_nome(user),
        avaliada_em=datetime.now().astimezone().isoformat(),
    )
    analise = analise_demanda_repository.upsert(
        demanda_codigo=demanda["codigo"],
        demanda_tipo=tipo,
        campos={"avaliacao_geometria": Jsonb(avaliacao)},
    )
    return _montar_resposta(codigo=demanda["codigo"], tipo=tipo, demanda=demanda, analise=analise)


def obter_historico_geometria(codigo: str) -> GeometriaHistoricoResponseSchema:
    tipo, demanda = _localizar_demanda(codigo)
    registros = geometria_historico_repository.listar(tipo, demanda["id"])
    ativos_sem_sinalizacao = [
        item
        for item in registros
        if item.get("substituido_em") is None
        and not (
            isinstance(item.get("processamento"), dict)
            and item["processamento"].get("substituicao_nao_registrada")
        )
    ]
    quantidade_ativos = len(ativos_sem_sinalizacao)
    itens = [
        GeometriaHistoricoItemSchema(
            id=str(item["id"]),
            origem=item["origem"],
            geometria_tipo=item.get("geometria_tipo"),
            nome_arquivo=item.get("nome_arquivo"),
            criado_em=_iso(item.get("criado_em")) or "",
            autor_id=str(item["criado_por"]) if item.get("criado_por") else None,
            substituido_em=_iso(item.get("substituido_em")),
            substituido_por_id=(
                str(item["substituido_por"]) if item.get("substituido_por") else None
            ),
            motivo_substituicao=item.get("motivo_substituicao"),
            vigente=(
                item.get("substituido_em") is None
                and quantidade_ativos == 1
                and not (
                    isinstance(item.get("processamento"), dict)
                    and item["processamento"].get("substituicao_nao_registrada")
                )
            ),
            substituicao_nao_registrada=(
                isinstance(item.get("processamento"), dict)
                and bool(item["processamento"].get("substituicao_nao_registrada"))
            ),
        )
        for item in registros
    ]
    aviso = any(item.substituicao_nao_registrada for item in itens) or quantidade_ativos > 1
    return GeometriaHistoricoResponseSchema(
        itens=itens,
        tem_historico=bool(itens),
        aviso_historico_incompleto=aviso,
    )


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
    # Aprovar/Reprovar são handoff dedicado (via_aprovar), fora da matriz do
    # PATCH administrativo — validar só pelo PATCH recusava toda decisão.
    permitidos = destinos_permitidos_com_handoff(status_atual)
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
        plano_service.atualizar_plano(
            codigo, PlanoUpdateSchema.model_validate({"status": destino}), usuario_id=avaliador_id
        )
    elif tipo == "programa":
        programa_service.atualizar_programa(
            codigo, ProgramaUpdateSchema.model_validate({"status": destino}), usuario_id=avaliador_id
        )
    else:
        demanda_service.atualizar_demanda(
            codigo, DemandaUpdateSchema.model_validate({"status": destino}), usuario_id=avaliador_id
        )
    return destino


def alterar_situacao(
    codigo: str,
    acao: str,
    *,
    user: SessionUser | None = None,
    categorias=None, descricao=None, hierarquizacao_codigo=None,
) -> tuple[str, str, str]:
    """Suspende, pede complementação ou retoma a análise pela matriz oficial."""
    destino = SITUACAO_STATUS.get(acao)
    if not destino:
        raise DemandaValidationError(f"Ação inválida: «{acao}».", field="acao")

    _tipo, demanda = _localizar_demanda(codigo)
    status_anterior = demanda.get("status") or ""
    from api.services import solicitacao_complementacao_service as solicitacoes
    from api.repositories import solicitacao_complementacao_repository
    if acao == "complementar":
        solicitacoes.solicitar(codigo, categorias=categorias, descricao=descricao,
                              user=user, hierarquizacao_codigo=hierarquizacao_codigo)
        atual = status_anterior if hierarquizacao_codigo else destino
        return status_anterior, atual, _rotulo_status(atual)
    if acao == "retomar" and any(not s.get('hierarquizacao_codigo') for s in
            solicitacao_complementacao_repository.listar(tipo=_tipo, codigo=codigo)):
        raise DemandaValidationError('Conclua as solicitações de cadastro e geometria antes de retomar a análise.', field='status')
    if status_anterior not in SITUACAO_ORIGENS[acao]:
        raise DemandaValidationError(
            f"A ação «{acao}» não se aplica ao status «{status_anterior}».",
            field="status",
        )

    status_atual = _aplicar_transicao(
        tipo=_tipo,
        codigo=demanda["codigo"],
        status_atual=status_anterior,
        destino=destino,
        avaliador_id=_avaliador_id(user),
    )
    return status_anterior, status_atual, _rotulo_status(status_atual)


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
    if calcular_resultado(respostas) is None:
        raise DemandaValidationError(
            "Responda todos os critérios de análise antes de decidir. Pendentes: "
            + "; ".join(pendentes)
            + ".",
            field="criterios",
        )

    if respostas.get("criterio_nao_duplicidade") is False:
        duplicada = (analise or {}).get("demanda_duplicada_codigo")
        if not duplicada or duplicada == codigo_demanda:
            raise DemandaValidationError("Selecione a demanda já cadastrada.", field="demanda_duplicada_codigo")
        _localizar_demanda(duplicada)
    if decisao != "reprovada" and calcular_resultado(respostas) != "aprovado":
        raise DemandaValidationError("Os critérios não permitem aprovar esta demanda.", field="criterios")

    if decisao == "reprovada" and not ((analise or {}).get("parecer_complemento") or "").strip():
        raise DemandaValidationError(
            "Para reprovar a demanda, complemente o parecer com uma justificativa.",
            field="parecer_complemento",
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
        demanda_duplicada_codigo=(analise or {}).get("demanda_duplicada_codigo"),
        demanda_duplicada_nome=_nome_demanda_duplicada((analise or {}).get("demanda_duplicada_codigo")),
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
            (f"<b>{rotulo_resultado}</b> — pontuação classificatória favorável: {pontuacao(respostas)}%."
             if all(respostas.get(c) is True for c in ELIMINATORIOS)
             else f"<b>{rotulo_resultado}</b> — avaliação pelos critérios eliminatórios; pontuação classificatória não apurada."),
            corpo,
        )
    )

    fluxo.append(Paragraph("Parecer técnico", secao))
    for paragrafo in (_parecer_com_geometria(analise) or "").split("\n"):
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
