"""Regras de negócio — análise de admissibilidade da demanda (portão de entrada).

Dois critérios eliminatórios e três classificatórios ponderados decidem a admissibilidade.
O resultado e o texto do parecer são gerados pelo sistema (o usuário não escolhe),
e a decisão do avaliador aplica a transição de status pelos fluxos já existentes
(aprovar / reprovar / PATCH validado por `status_transicoes`).
"""
from __future__ import annotations

import uuid
import json
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from psycopg.types.json import Jsonb

from api.exceptions import DemandaNotFoundError, DemandaValidationError
from api.repositories import (
    analise_demanda_repository,
    demanda_repository,
    dominio_repository,
    geometria_historico_repository,
    plano_repository,
    programa_repository,
    sigma_usuario_repository,
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
    {"campo": "criterio_competencia", "rotulo": "Competência", "pergunta": "O objeto da demanda está dentro das atribuições da SLT?", "classe": "eliminatorio", "peso": 0,
     "parecer_nao": "O objeto da demanda NÃO está dentro das atribuições da SLT."},
    {"campo": "criterio_nao_duplicidade", "rotulo": "Não duplicidade", "pergunta": "Esta demanda é inédita, sem duplicidade com outra demanda já cadastrada no SICARD?", "classe": "eliminatorio", "peso": 0,
     "parecer_nao": "A demanda NÃO é inédita: há duplicidade com outra demanda já cadastrada no SICARD."},
    {"campo": "criterio_clareza", "rotulo": "Clareza do pedido", "pergunta": "As informações apresentadas permitem identificar claramente o que está sendo solicitado à SLT?", "classe": "classificatorio", "peso": 20,
     "parecer_nao": "As informações apresentadas NÃO permitem identificar claramente o que está sendo solicitado à SLT."},
    {"campo": "criterio_finalidade_publica", "rotulo": "Finalidade pública", "pergunta": "As informações apresentadas indicam benefícios para a coletividade decorrentes do atendimento da demanda?", "classe": "classificatorio", "peso": 30,
     "parecer_nao": "As informações apresentadas NÃO indicam benefícios para a coletividade decorrentes do atendimento da demanda."},
    {"campo": "criterio_relevancia_setorial", "rotulo": "Relevância setorial", "pergunta": "O atendimento da demanda contribui para melhorar o transporte ou a logística no Estado?", "classe": "classificatorio", "peso": 50,
     "parecer_nao": "A demanda NÃO contribui para melhorar o transporte ou a logística no Estado."},
)
ELIMINATORIOS = ("criterio_competencia", "criterio_nao_duplicidade")
FUSO_ANALISE = ZoneInfo("America/Sao_Paulo")
LOCAL_ANALISE = "São Paulo - SP"
MODELO_PARECER_PDF = "2026-10-29.4"


def _cores_status_parecer(status: str) -> dict[str, str]:
    caminho = Path(__file__).resolve().parents[2] / "assets" / "js" / "status-colors.js"
    try:
        fonte = caminho.read_text(encoding="utf-8")
        bloco = fonte.split("const STATUS_DEMANDA = ", 1)[1].split(";\n", 1)[0].strip()
        paleta = json.loads(bloco)
        cores = {campo: paleta[status][campo] for campo in ("bg", "text")}
        for cor in cores.values():
            if not isinstance(cor, str) or len(cor) != 7 or not cor.startswith("#"):
                raise ValueError("Cor inválida na paleta oficial.")
            int(cor[1:], 16)
    except (OSError, IndexError, KeyError, TypeError, ValueError) as exc:
        raise DemandaValidationError(
            f"Não foi possível obter a cor oficial do status «{status}» para o parecer.",
            field="status",
        ) from exc
    return cores


def _motivos_nao_atendidos(respostas: dict[str, bool | None]) -> list[str]:
    liberado = all(respostas.get(c) is True for c in ELIMINATORIOS)
    return [item["parecer_nao"] for item in CRITERIOS
            if respostas.get(item["campo"]) is False
            and (liberado or item["classe"] == "eliminatorio")]


def _frase_geometria(avaliacao: dict) -> str:
    if avaliacao.get("adequada") is False:
        return "A geometria NÃO representa adequadamente o objeto da demanda. REQUER AJUSTE."
    if avaliacao.get("adequada") is True:
        return ("A geometria representa adequadamente o objeto da demanda. " +
                ("AVALIAÇÃO CONFIRMADA." if avaliacao.get("confirmada") else "CONFIRMAÇÃO PENDENTE."))
    return "A geometria ainda não foi avaliada."


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


def _nome_analista(analise: dict[str, Any]) -> str:
    id = analise.get("avaliador_id")
    if not id:
        return "Não identificado — análise sem usuário vinculado"
    nome = sigma_usuario_repository.nome_pessoa_por_id(str(id))
    return nome or "Não identificado — usuário sem nome de pessoa registrado"


def _momento_analise(analise: dict[str, Any]) -> datetime | None:
    valor = analise.get("analise_realizada_em")
    if not valor:
        return None
    momento = valor if isinstance(valor, datetime) else datetime.fromisoformat(str(valor))
    if momento.tzinfo is None:
        momento = momento.replace(tzinfo=FUSO_ANALISE)
    return momento.astimezone(FUSO_ANALISE)


def _conclusao_criterios(respostas: dict[str, bool | None]) -> str:
    reprovados = [item["rotulo"] for item in CRITERIOS
                 if item["classe"] == "eliminatorio" and respostas.get(item["campo"]) is False]
    if reprovados:
        return "Conclusão: a demanda é REPROVADA por não atender ao(s) critério(s) eliminatório(s): " + "; ".join(reprovados) + "."
    if not all(respostas.get(c) is True for c in ELIMINATORIOS):
        return "Conclusão: pendente — responda os dois critérios eliminatórios. Os critérios classificatórios e a avaliação da geometria serão liberados somente após duas respostas Sim."
    resultado = calcular_resultado(respostas)
    if resultado is None:
        return "Conclusão: pendente — responda os três critérios classificatórios para apurar a pontuação final."
    if resultado == "aprovado":
        return "Conclusão: a demanda é APROVADA por atender aos dois eliminatórios e superar 50% de pontuação favorável."
    return "Conclusão: a demanda é REPROVADA por não superar 50% de pontuação favorável, embora tenha atendido aos dois eliminatórios."


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
        linhas.append(_conclusao_criterios(respostas))
        linhas.append("Os critérios classificatórios e a avaliação da geometria não se aplicam nesta etapa. Não há apuração de pontuação classificatória.")
    elif not liberado:
        linhas.append(_conclusao_criterios(respostas))
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
            linhas.append(_conclusao_criterios(respostas))
        else:
            pontos = pontuacao(respostas)
            linhas.append(f"Pontuação classificatória: {pontos}% favoráveis e {100 - pontos}% contrários.")
            linhas.append(_conclusao_criterios(respostas))
    linhas.append("")
    linhas.extend(_motivos_nao_atendidos(respostas))
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
            momento=_momento_analise(analise) or (
                analise.get("atualizado_em") if isinstance(analise.get("atualizado_em"), datetime) else None),
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
    linhas = _linhas_parecer_geometria(avaliacao)
    return (texto + "\n\nGeometria\n" + "\n".join(linhas)).strip() if linhas else texto or None


def _linhas_parecer_geometria(avaliacao: dict) -> list[str]:
    linhas = []
    if avaliacao.get("adequada") in (True, False):
        linhas.append(_frase_geometria(avaliacao))
    if avaliacao.get("adequada") is False:
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
    return linhas


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
        from api.constants import STATUS_HIERARQUIZACAO_COMPLEMENTACAO
        atual = STATUS_HIERARQUIZACAO_COMPLEMENTACAO if hierarquizacao_codigo else destino
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

    momento = datetime.now(FUSO_ANALISE)
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
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.platypus import KeepTogether, Spacer, Table, TableStyle
        from api.services import extracao_atributos_relatorios as estilo
        from api.services.relatorio_fases_pdf import _campos, _hero
    except ImportError as exc:  # pragma: no cover - dependência declarada em requirements.txt
        raise DemandaValidationError(
            "Geração de PDF indisponível: dependência «reportlab» não instalada no servidor.",
            field="pdf",
        ) from exc

    e = estilo._estilos()
    cores_status = _cores_status_parecer(status_atual)
    cor_status = colors.HexColor(cores_status["text"])
    e["corpo"].alignment = TA_JUSTIFY
    for chave in ("h1", "h2"):
        e[chave].keepWithNext = True
    e["resultadoRotulo"] = ParagraphStyle(
        "resultadoRotulo", parent=e["nota"], fontName="Helvetica-Bold",
        textColor=cor_status, spaceAfter=5)
    e["resultado"] = ParagraphStyle(
        "resultado", parent=e["h1"], fontSize=18, leading=22, spaceBefore=0, spaceAfter=7,
        textColor=cor_status)
    e["motivo"] = ParagraphStyle(
        "motivo", parent=e["corpo"], textColor=cor_status, spaceAfter=5)
    e["statusNota"] = ParagraphStyle("statusNota", parent=e["nota"], textColor=cor_status)
    e["statusH2"] = ParagraphStyle("statusH2", parent=e["h2"], textColor=cor_status)
    e["providencias"] = ParagraphStyle(
        "providencias", parent=e["h1"], fontSize=12, leading=15,
        backColor=estilo.AZUL_CLARO, borderPadding=8, spaceBefore=14, spaceAfter=12)
    e["orientacao"] = ParagraphStyle(
        "orientacao", parent=e["corpo"], fontSize=10, leading=14,
        leftIndent=16, bulletIndent=1, spaceAfter=7)

    def p(texto, chave="corpo"):
        return estilo._p(e, texto, chave)

    titulo = "Parecer técnico de admissibilidade"
    fluxo: list[Any] = [
        _hero(e, titulo), Spacer(1, 12),
        p("Identificação da demanda", "h1"),
        _campos(e, [
            ("Código", demanda.get("codigo")),
            ("Nome", demanda.get("nome")),
            ("Tipo", tipo.capitalize()),
            ("Situação da demanda", _rotulo_status(status_atual)),
            ("Emitido em", estilo.hora(momento.isoformat())),
        ]),
        p("Análise e parecer técnico", "h1"),
    ]
    liberado = all(respostas.get(c) is True for c in ELIMINATORIOS)
    resultado = calcular_resultado(respostas)
    complementacao = decisao == "complementacao"
    rotulos = {"aprovado": "APROVADA NOS CRITÉRIOS", "reprovado": "REPROVADA NOS CRITÉRIOS"}
    conclusao = rotulos.get(resultado, "ANÁLISE PENDENTE") if complementacao else {
        "aprovada": "APROVADA", "ressalvas": "APROVADA COM RESSALVAS", "reprovada": "REPROVADA",
    }.get(decisao, "ANÁLISE PENDENTE")
    falhas = _motivos_nao_atendidos(respostas)
    if not liberado and resultado == "reprovado":
        motivo = "Não há apuração de pontuação classificatória."
    elif resultado is None:
        pendentes = [item["rotulo"] for item in CRITERIOS if respostas.get(item["campo"]) is None
                     and (liberado or item["classe"] == "eliminatorio")]
        motivo = "Faltam respostas para concluir a análise: " + "; ".join(pendentes) + "."
    else:
        motivo = (f"Pontuação favorável: {pontuacao(respostas)}%. "
                  "A aprovação exige mais de 50%, além dos dois critérios eliminatórios atendidos.")
    if decisao == "reprovada" and resultado == "aprovado":
        motivo = "Os critérios foram atendidos, mas o analista decidiu reprovar a demanda. A justificativa está destacada abaixo."
    if resultado == "reprovado":
        conclusao += ", POIS:"
    destaque = [p("CONCLUSÃO DA ANÁLISE", "resultadoRotulo"), p(conclusao, "resultado")]
    for frase in falhas:
        destaque.append(p(frase, "motivo"))
    destaque.append(p(motivo, "statusNota"))
    avaliacao = analise.get("avaliacao_geometria") or {}
    if liberado:
        destaque += [Spacer(1, 6), p(_frase_geometria(avaliacao), "motivo")]
    if complementacao:
        destaque += [Spacer(1, 5), p("Encaminhamento: COMPLEMENTAÇÃO NECESSÁRIA.", "statusH2"),
                     p("O resultado dos critérios não representa uma decisão final. "
                       "Confira abaixo o que deve ser complementado.", "statusNota")]
    quadro = Table([[destaque]], colWidths=[estilo.LARGURA], hAlign="LEFT")
    quadro.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(cores_status["bg"])),
        ("LINEBEFORE", (0, 0), (-1, -1), 4, cor_status),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    fluxo.append(quadro)

    vistos = {" ".join(frase.split()).casefold() for frase in falhas}
    if liberado:
        vistos.add(" ".join(_frase_geometria(avaliacao).split()).casefold())

    def paragrafos(texto: str) -> list[str]:
        novos = []
        for trecho in texto.splitlines():
            trecho = trecho.strip()
            chave = " ".join(trecho.split()).casefold()
            if chave and chave not in vistos:
                vistos.add(chave)
                novos.append(trecho)
        return novos

    complemento = (analise.get("parecer_complemento") or "").strip()
    solicitacao = (analise.get("solicitacao_complementacao") or "").strip()
    observacao_geometria = (avaliacao.get("observacao") or "").strip() if liberado else ""
    if complementacao:
        fluxo.append(p("O QUE VOCÊ PRECISA ENVIAR OU CORRIGIR", "providencias"))
        orientacoes = paragrafos(solicitacao) + paragrafos(complemento) + paragrafos(observacao_geometria)
        if not orientacoes:
            fluxo.append(p("O analista ainda não registrou os documentos ou ajustes necessários. "
                           "A solicitação deve ser detalhada antes do envio.", "orientacao"))
        for numero, orientacao in enumerate(orientacoes, 1):
            fluxo.append(estilo._p(e, orientacao, "orientacao", bulletText=f"{numero}."))
    elif complemento:
        fluxo.append(p("JUSTIFICATIVA DA DECISÃO" if decisao == "reprovada"
                       else "RESSALVAS E ORIENTAÇÕES DO ANALISTA", "providencias"))
        fluxo.extend(p(trecho, "orientacao") for trecho in paragrafos(complemento))

    fluxo.append(p("Fundamentação — perguntas, respostas e geometria", "h2"))
    linhas = [["Critério", "Pergunta / avaliação", "Resposta"]]
    for item in CRITERIOS:
        resposta = respostas.get(item["campo"])
        marcador = "Sim" if resposta is True else "Não" if resposta is False else "Não respondido"
        classe = "Eliminatório" if item["classe"] == "eliminatorio" else f"Peso {item['peso']}%"
        if item["classe"] == "classificatorio" and not liberado and resposta is None:
            marcador = "Não se aplica nesta etapa"
        linhas.append([f"{item['rotulo']} ({classe})", item["pergunta"], marcador])
    if not liberado:
        linhas.append(["Geometria", "Avaliação condicionada ao atendimento dos critérios eliminatórios.",
                       "Não se aplica nesta etapa"])
    else:
        adequada = avaliacao.get("adequada")
        resposta_geometria = ("Sim — confirmada" if avaliacao.get("confirmada") else "Sim — confirmação pendente"
                             ) if adequada is True else "Não — requer ajuste" if adequada is False else "Não respondido"
        linhas.append(["Geometria", "A geometria representa adequadamente o objeto da demanda?", resposta_geometria])
        legados = {
            "delimitacao_intervencao": "Delimitação da intervenção",
            "correspondencia_local_dimensoes": "Correspondência com o local e as dimensões",
            "area_influencia_direta": "Área de influência direta",
            "precisao_localizacao": "Precisão da localização",
        }
        for campo, rotulo in legados.items():
            if avaliacao.get(campo):
                linhas.append(["Geometria", rotulo, {"atende": "Atende", "ajuste": "Requer ajuste",
                                                    "nao_se_aplica": "Não se aplica"}[avaliacao[campo]]])
    fluxo.append(estilo._tabela(e, linhas, [estilo.LARGURA * v for v in (.23, .59, .18)]))
    if respostas.get("criterio_nao_duplicidade") is False:
        fluxo.append(p("Demanda identificada como duplicada: " +
                       (analise.get("demanda_duplicada_codigo") or "Identificação pendente") + "."))
    if liberado:
        if avaliacao.get("encaminhamento") == "substituicao":
            fluxo.append(p("A nova geometria será enviada pelo analista."))
        historico = _linhas_parecer_geometria({"substituicoes": avaliacao.get("substituicoes")})
        notas = paragrafos(observacao_geometria) + paragrafos("\n".join(historico))
        if notas:
            fluxo.append(p("Observações técnicas", "h2"))
            fluxo.extend(p(trecho) for trecho in notas)
    if complementacao:
        fluxo.append(p("Este documento solicita complementação e não altera as respostas, "
                       "a decisão ou a situação da demanda.", "nota"))

    data_analise = _momento_analise(analise)
    fluxo.append(KeepTogether([
        Spacer(1, 16),
        p("Analista responsável: " + _nome_analista(analise)),
        p(LOCAL_ANALISE + " · " + (_data_extenso(data_analise) + " (horário de Brasília)"
                                  if data_analise else "Data e hora da análise não registradas")),
    ]))
    buffer = BytesIO()
    estilo._construir(buffer, titulo, fluxo)
    return buffer.getvalue()
