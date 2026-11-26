"""Calcula e processa os lembretes individuais dos julgamentos AHP."""
from bisect import bisect_left
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from email.utils import make_msgid
from functools import cached_property
from os import getenv
from threading import Event
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from pydantic import ValidationError

from api.exceptions import DemandaValidationError
from api.repositories import email_convites_repository, lembretes_ahp_repository as repo
from api.schemas.email import EmailEnvioSchema
from api.schemas.lembretes_ahp import FrequenciaLembretesSchema
from api.services import email_service
from api.services.atividade_colaboracao_ahp import etapa_colaboracao
from api.services import mensagens_ahp
from api.services.comparacao_colaborativa_service import _link_publico, _prazo_email
from api.services.email_convites import ConviteOriginalIndisponivel, link_lembrete

PADRAO = (
    {"ate": 50, "quantidade": 0}, {"ate": 80, "quantidade": 1},
    {"ate": 95, "quantidade": 2}, {"ate": 100, "quantidade": 3},
)
_FUSO = ZoneInfo("America/Sao_Paulo")
_HORARIOS_OFICIAIS = (time(9, 30), time(15), time(20))
_CHAVE_ROTINA = "ahp-email:lembretes"


def base_publica() -> str:
    base = getenv("SICARD_PUBLIC_BASE_URL", "").strip().rstrip("/")
    try:
        url = urlsplit(base)
    except ValueError:
        return ""
    return base if url.scheme in {"https", "http"} and url.hostname and not (
        url.username or url.password or url.query or url.fragment
    ) else ""


def _com_periodo(pessoa: dict) -> dict:
    publico = pessoa["modo_participacao"] == "publico"
    resposta = None
    if pessoa["resposta_id"] is not None:
        resposta = {"status": pessoa["resposta"], "iniciado_em": pessoa["iniciado_em"],
                     "enviado_em": pessoa["enviado_em"]}
    codigo, rotulo, etapa_em = etapa_colaboracao(
        resposta, publico=publico, inscrito_em=pessoa["inscrito_em"], clique_em=pessoa["clique_em"],
        convite_enviado=bool(pessoa["primeiro_convite"]), convite_em=pessoa["primeiro_convite"],
    )
    return {**pessoa, "etapa_codigo": codigo, "etapa_rotulo": rotulo, "etapa_em": etapa_em,
            "inicio_periodo": pessoa["inscrito_em"] if publico else pessoa["clique_em"]}


def _inicio_agendavel(pessoa: dict) -> datetime:
    inicio = pessoa["inicio_periodo"]
    return max(inicio, pessoa["etapa_em"] or inicio, pessoa["prazo_alterado_em"],
               pessoa["configurado_em"] or inicio, pessoa["notificacoes_alteradas_em"] or inicio)


def _bloqueio(pessoa: dict, agora: datetime) -> tuple[str, str] | None:
    etapa = pessoa["etapa_codigo"]
    if etapa == "resposta_enviada":
        return "respondida", "Resposta enviada"
    if pessoa["status"] != "ativa" or pessoa["valido_ate"] <= agora:
        return "encerrada", "Coleta encerrada"
    elegivel = "em_preenchimento" if pessoa["modo_participacao"] == "publico" else "link_acessado"
    if etapa != elegivel or not pessoa["inicio_periodo"]:
        return "etapa_inelegivel", "Fora da agenda"
    if not pessoa["notificacoes_ativas"]:
        return "notificacoes_desativadas", "Notificações desativadas"
    return None


def _indice_horario(instante: datetime) -> int:
    local = instante.astimezone(_FUSO)
    return local.toordinal() * len(_HORARIOS_OFICIAIS) + bisect_left(_HORARIOS_OFICIAIS, local.time())


def _horario_oficial(indice: int) -> datetime:
    dia, horario = divmod(indice, len(_HORARIOS_OFICIAIS))
    return datetime.combine(date.fromordinal(dia), _HORARIOS_OFICIAIS[horario], _FUSO).astimezone(timezone.utc)


@dataclass
class _IntervaloAgenda:
    numero: int
    inicio: datetime
    fim: datetime
    quantidade: int
    fim_agendavel: datetime | None = None
    adiantados: tuple[datetime, ...] = ()

    @cached_property
    def primeiro(self) -> int:
        return _indice_horario(self.inicio)

    @cached_property
    def disponiveis(self) -> int:
        return _indice_horario(self.fim) - self.primeiro

    @cached_property
    def total_nominal(self) -> int:
        return min(self.quantidade, self.disponiveis)

    @cached_property
    def total_preservado(self) -> int:
        if self.fim_agendavel is None or self.fim <= self.fim_agendavel:
            return self.total_nominal
        return bisect_left(range(self.total_nominal), True,
                           key=lambda i: self._horario_nominal(i) >= self.fim_agendavel)

    @property
    def total(self) -> int:
        return len(self.adiantados) + self.total_preservado

    def _divisa(self, indice: int) -> int:
        divisa = self.primeiro + indice * self.disponiveis // self.total_nominal
        horarios_por_dia = len(_HORARIOS_OFICIAIS)
        if 0 < indice < self.total_nominal and self.disponiveis >= self.total_nominal * horarios_por_dia:
            # Quando há espaço, mantém os horários de cada dia no mesmo grupo.
            divisa = (divisa + horarios_por_dia // 2) // horarios_por_dia * horarios_por_dia
        return divisa

    def _horario_nominal(self, indice: int) -> datetime:
        # Separa os horários disponíveis em grupos consecutivos, um por lembrete.
        # Cada grupo prioriza 9h30 na data proporcional e usa o limite do grupo se necessário.
        de = self._divisa(indice)
        ate = self._divisa(indice + 1) - 1
        alvo = self.inicio + (self.fim - self.inicio) * ((indice + 1) / (self.total_nominal + 1))
        preferido = alvo.astimezone(_FUSO).toordinal() * len(_HORARIOS_OFICIAIS)
        return _horario_oficial(min(max(preferido, de), ate))

    def horario(self, indice: int) -> datetime:
        if indice < len(self.adiantados):
            return self.adiantados[indice]
        return self._horario_nominal(indice - len(self.adiantados))

    def indice_apos(self, referencia: datetime) -> int:
        return bisect_left(range(self.total), True, key=lambda indice: self.horario(indice) > referencia)


def _intervalos(pessoa: dict) -> Iterator[_IntervaloAgenda]:
    inicio = pessoa["inicio_periodo"]
    prazo = pessoa["valido_ate"]
    if inicio is None or inicio >= prazo:
        return
    inicio, prazo = inicio.astimezone(timezone.utc), prazo.astimezone(timezone.utc)
    # O primeiro lembrete precisa ocorrer depois do início da participação.
    de = inicio + timedelta(microseconds=1)
    intervalos = []
    for numero, faixa in enumerate(pessoa["faixas"] or PADRAO, start=1):
        ate = inicio + (prazo - inicio) * (faixa["ate"] / 100)
        if ate > de and faixa["quantidade"]:
            intervalos.append(_IntervaloAgenda(numero, de, ate, faixa["quantidade"]))
        de = max(de, ate)
    _priorizar_datas_compartilhadas(intervalos, prazo)
    yield from intervalos


def _priorizar_datas_compartilhadas(intervalos: list[_IntervaloAgenda], prazo: datetime) -> None:
    fim_agendavel = prazo
    # Reserva a data compartilhada para o intervalo posterior, preservando os horários
    # dos intervalos anteriores nos demais dias. Lembretes deslocados não são acumulados.
    for indice in range(len(intervalos) - 1, 0, -1):
        intervalo = intervalos[indice]
        intervalo.fim_agendavel = fim_agendavel
        dia = intervalo.inicio.astimezone(_FUSO).date()
        inicio_dia = datetime.combine(dia, time.min, _FUSO).astimezone(timezone.utc)
        inicio_compartilhado = max(inicio_dia, intervalos[0].inicio)
        limite = min(intervalo.inicio, fim_agendavel)
        de, ate = _indice_horario(inicio_compartilhado), _indice_horario(limite)
        faltam = intervalo.quantidade - intervalo.total_nominal
        intervalo.adiantados = tuple(_horario_oficial(slot) for slot in range(de, min(ate, de + faltam)))
        if intervalo.total and intervalo.horario(0).astimezone(_FUSO).date() == dia:
            fim_agendavel = min(fim_agendavel, inicio_dia)
    if intervalos:
        intervalos[0].fim_agendavel = fim_agendavel


def _percentual(pessoa: dict, horario: datetime) -> float:
    inicio = pessoa["inicio_periodo"].astimezone(timezone.utc)
    prazo = pessoa["valido_ate"].astimezone(timezone.utc)
    return 100 * ((horario - inicio) / (prazo - inicio))


def _marco(pessoa: dict, referencia: datetime, *, futuro: bool) -> tuple[datetime, float] | None:
    if pessoa["inicio_periodo"] is None:
        return None
    corte = _inicio_agendavel(pessoa)
    if not futuro:
        corte = max(corte, pessoa["ultima_tentativa"] or corte)
    limite = max(corte, referencia) if futuro else referencia
    intervalos = list(_intervalos(pessoa))
    for intervalo in intervalos if futuro else reversed(intervalos):
        indice = intervalo.indice_apos(limite) - int(not futuro)
        if 0 <= indice < intervalo.total:
            horario = intervalo.horario(indice)
            if horario > corte:
                return horario, _percentual(pessoa, horario)
    return None


def _ambiente(ambiente_id: str) -> dict:
    ambiente = repo.ambiente(ambiente_id)
    if not ambiente:
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    return ambiente


def _resumo_configuracao(ambiente: dict) -> dict:
    faixas = ambiente["faixas"] or PADRAO
    return {"id": ambiente["id"], "nome": ambiente["nome"], "modo_participacao": ambiente["modo_participacao"],
            "notificacoes_ativas": ambiente["notificacoes_ativas"],
            "padrao": tuple(faixas) == PADRAO,
            "total_faixas": len(faixas), "total_lembretes": sum(faixa["quantidade"] for faixa in faixas),
            "configurado_em": ambiente["configurado_em"]}


def configuracoes() -> list[dict]:
    return [_resumo_configuracao(ambiente) for ambiente in repo.configuracoes()]


def _proximos(pessoa: dict, cursor: datetime, limite: int) -> list[dict]:
    corte = max(_inicio_agendavel(pessoa), cursor)
    agenda = []
    for intervalo in _intervalos(pessoa):
        indice = intervalo.indice_apos(corte)
        for i in range(indice, min(intervalo.total, indice + limite - len(agenda))):
            horario = intervalo.horario(i)
            agenda.append({"previsto_em": horario, "percentual": _percentual(pessoa, horario), "fatia": intervalo.numero})
        if len(agenda) == limite:
            break
    return agenda


def _resumir_agenda(pessoa: dict, agora: datetime) -> tuple[datetime | None, list[dict]]:
    corte = max(_inicio_agendavel(pessoa), agora)
    proximo = None
    agenda = []
    for intervalo in _intervalos(pessoa):
        if intervalo.fim <= corte:
            continue
        indice = intervalo.indice_apos(corte)
        agendados = intervalo.total - indice
        sem_horario = intervalo.quantidade - intervalo.total
        if not agendados and not sem_horario:
            continue
        horarios = [intervalo.horario(i) for i in range(indice, min(intervalo.total, indice + 4))]
        proximo = proximo or (horarios[0] if horarios else None)
        agenda.append({"fatia": intervalo.numero, "horarios": horarios, "mais": agendados > 4,
                       "agendados": agendados, "sem_horario": sem_horario})
    return proximo, agenda


def _simular(pessoa: dict, agora: datetime, simulacao: FrequenciaLembretesSchema | None) -> dict:
    if simulacao is None:
        return pessoa
    return {**pessoa, "faixas": simulacao.model_dump()["faixas"], "configurado_em": agora}


def listar(ambiente_id: str, simulacao: FrequenciaLembretesSchema | None = None) -> dict:
    ambiente = _ambiente(ambiente_id)
    agora = datetime.now(timezone.utc)
    participantes = []
    for registro in repo.participantes(ambiente_id):
        pessoa = _simular(_com_periodo(registro), agora, simulacao)
        bloqueio = _bloqueio(pessoa, agora)
        proximo, agenda = (None, []) if bloqueio else _resumir_agenda(pessoa, agora)
        codigo, situacao = bloqueio or (("agendado", "Agendado") if proximo else ("sem_agenda", "Sem lembretes futuros"))
        if codigo == "respondida":
            situacao = "Não se aplica"
        participantes.append({
            **{campo: pessoa[campo] for campo in ("nome", "email", "primeiro_convite", "inscrito_em", "clique_em",
                                                  "inicio_periodo", "etapa_codigo", "etapa_rotulo", "ultimo_envio",
                                                  "ultima_tentativa", "estado_ultima_tentativa")},
            "codigo": codigo, "situacao": situacao, "proximo_envio": proximo,
            "instituicao": pessoa.get("instituicao"),
            "resposta_enviada_em": pessoa["enviado_em"],
            "agenda_fatias": agenda,
        })
    faixas = ambiente["faixas"] or PADRAO
    try:
        email = email_service.diagnostico() if base_publica() else None
    except email_service.FalhaEmail:
        email = None
    resumo = _resumo_configuracao(ambiente)
    return {"julgamento": ambiente["nome"], "prazo": ambiente["valido_ate"], "configuracao": resumo,
            "padrao": resumo["padrao"], "faixas": faixas, "faixas_padrao": PADRAO, "participantes": participantes,
            "horarios_oficiais": [horario.strftime("%H:%M") for horario in _HORARIOS_OFICIAIS],
            "rotina_disponivel": bool(email and email.habilitado and email.configurado)}


def configurar(ambiente_id: str, dados: FrequenciaLembretesSchema, usuario_id: str) -> dict:
    ambiente = _ambiente(ambiente_id)
    faixas = dados.model_dump()["faixas"]
    if tuple(faixas) != tuple(ambiente["faixas"] or PADRAO):
        repo.configurar(ambiente_id, faixas, usuario_id)
    return listar(ambiente_id)


def definir_notificacoes(ambiente_id: str, ativas: bool) -> dict:
    if not repo.definir_notificacoes(ambiente_id, ativas):
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    return listar(ambiente_id)


def historico(ambiente_id: str, email: str, apos: datetime | None = None,
              simulacao: FrequenciaLembretesSchema | None = None) -> dict:
    _ambiente(ambiente_id)
    pessoas = repo.participantes(ambiente_id, email=email)
    agora = datetime.now(timezone.utc)
    limite = 25
    agenda = []
    agenda_fatias = []
    pessoa = _com_periodo(pessoas[0]) if pessoas else None
    if pessoa and not _bloqueio(pessoa, agora):
        cursor = max(agora, apos) if apos else agora
        pessoa = _simular(pessoa, agora, simulacao)
        agenda = _proximos(pessoa, cursor, limite + 1)
        if not apos:
            _, agenda_fatias = _resumir_agenda(pessoa, agora)
    return {"agenda": agenda[:limite], "mais_agenda": len(agenda) > limite,
            "agenda_fatias": agenda_fatias,
            "historico": [] if apos else repo.historico(ambiente_id, email)}


def _conferir_envio(ambiente_id: str, email: str, previsto_em: datetime) -> None:
    pessoas = repo.participantes(ambiente_id, email=email)
    if not pessoas:
        raise email_service.FalhaEmail("cancelado", "O colaborador foi retirado do julgamento.")
    pessoa = _com_periodo(pessoas[0])
    bloqueio = _bloqueio(pessoa, datetime.now(timezone.utc))
    if bloqueio:
        raise email_service.FalhaEmail("cancelado", bloqueio[1] + ".")
    marco = _marco({**pessoa, "ultima_tentativa": None}, previsto_em, futuro=False)
    if not marco or marco[0] != previsto_em:
        raise email_service.FalhaEmail("cancelado", "A agenda mudou antes do disparo.")


def _enviar(pessoa: dict, previsto_em: datetime, percentual: float, base: str, dominio: str) -> None:
    ambiente_id, email = str(pessoa["ambiente_id"]), pessoa["email"]
    mensagem_id = make_msgid(domain=dominio)
    if not repo.reservar(ambiente_id, email, previsto_em, percentual, mensagem_id):
        return
    try:
        _conferir_envio(ambiente_id, email, previsto_em)
        link = _link_publico(pessoa, base_url=base)
        convite = pessoa["modo_participacao"] == "convite"
        if convite:
            link = link_lembrete(ambiente_id, email, pessoa["versao_convite"], link, pessoa["token"])
        conteudo = mensagens_ahp.lembrete(pessoa, link, _prazo_email(pessoa, "%d/%m/%Y, às %Hh%M"), previsto_em)
        msg = EmailEnvioSchema(
            destinatario=email, **conteudo,
            html=mensagens_ahp.html(
                conteudo["texto"], link,
                mensagens_ahp.ACAO_CONVITE if convite else mensagens_ahp.ACAO_LEMBRETE_PUBLICO,
                titulo="Lembrete de participação", julgamento=pessoa["julgamento"], ilustrar=False,
            ),
        )
        resultado = email_service.enviar(msg, usuario_id="sicard:lembretes-ahp", id_mensagem=mensagem_id,
                                          conferir_elegibilidade=lambda: _conferir_envio(ambiente_id, email, previsto_em))
    except ConviteOriginalIndisponivel as exc:
        repo.finalizar(mensagem_id, "cancelado", str(exc))
    except ValidationError:
        repo.finalizar(mensagem_id, "falha", "O endereço ou o assunto do lembrete contém dados inválidos.")
    except email_service.FalhaEmail as exc:
        estado = {"cancelado": "cancelado", "resultado_indeterminado": "indeterminado"}.get(exc.codigo, "falha")
        repo.finalizar(mensagem_id, estado, str(exc))
    else:
        repo.finalizar(mensagem_id, "aceito_smtp", resultado.mensagem)


def processar(parar: Event, base: str, dominio: str) -> None:
    with email_convites_repository.bloquear_coleta(_CHAVE_ROTINA) as adquirido:
        if not adquirido or parar.is_set():
            return
        repo.recuperar_interrompidos()
        agora = datetime.now(timezone.utc)
        horario_oficial = agora.replace(second=0, microsecond=0)
        if horario_oficial.astimezone(_FUSO).time() not in _HORARIOS_OFICIAIS:
            return
        vencidos = []
        for registro in repo.participantes(somente_elegiveis=True):
            pessoa = _com_periodo(registro)
            if _bloqueio(pessoa, agora):
                continue
            marco = _marco(pessoa, agora, futuro=False)
            if marco and marco[0] == horario_oficial:
                vencidos.append((marco, pessoa))
        for (horario, percentual), pessoa in sorted(vencidos, key=lambda item: item[0][0]):
            if parar.is_set():
                break
            _enviar(pessoa, horario, percentual, base, dominio)
