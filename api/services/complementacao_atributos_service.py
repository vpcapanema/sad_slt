"""Solicitacao e notificacao de atributos, sem reabrir a aprovacao cadastral."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from email.utils import make_msgid
import logging

from pydantic import ValidationError

from api.constants import STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO
from api.db.connection import atomic_connection
from api.exceptions import DemandaValidationError, HierarquizacaoNotFoundError
from api.repositories import dominio_repository, hierarquizacao_repository
from api.repositories import solicitacao_complementacao_repository as pedidos
from api.schemas.email import EmailEnvioSchema
from api.services import email_service
from api.services.atributos_hierarquizacao import atualizar_cadastrais, colunas_da_hierarquizacao, pendencias
from api.services.solicitacao_complementacao_service import bloquear, solicitar
from api.services.session_service import SessionUser

logger = logging.getLogger(__name__)


def _notificar(pedido: dict, destinatario: str | None, nome_hierarquia: str, user: SessionUser) -> dict:
    codigo = pedido["demanda_codigo"]
    notificacao = {
        "status": "enviando", "id_mensagem": make_msgid(domain="sicard.local"),
        "destinatario": destinatario, "por": str(user.id),
        "em": datetime.now(timezone.utc).isoformat(),
        "detalhe": "Envio iniciado. Não reenvie sem conferir o resultado para evitar duplicidade.",
    }
    reservado = pedidos.reservar_notificacao(pedido["id"], notificacao)
    if not reservado:
        atual = pedidos.obter(pedido["id"])
        if not atual:
            raise DemandaValidationError("Solicitação não encontrada após reserva da notificação.", field="codigo")
        return {"demanda_codigo": codigo, **atual.get("notificacao", {})}
    try:
        dados = EmailEnvioSchema(
            destinatario=destinatario or "",
            assunto=f"SICARD: complementação de atributos da demanda {codigo}",
            texto=(
                f"Solicita-se a complementação dos atributos da demanda {codigo}, "
                f"na hierarquização {pedido['hierarquizacao_codigo']} — {nome_hierarquia}.\n\n"
                f"Motivo: {pedido['descricao']}\n\n"
                "Acesse o SICARD com sua conta, abra a página Complementação e o bloco "
                "Atributos da hierarquização. Selecione a demanda, preencha os atributos "
                "pendentes e salve. O status é atualizado automaticamente quando todos os atributos estão preenchidos e válidos.\n"
                "Esta solicitação não reabre a avaliação cadastral da demanda. "
                "A conclusão validada devolve a demanda ao status Em hierarquização."
            ),
        )
    except ValidationError:
        notificacao.update(status="sem_destinatario", detalhe="O email do representante no cadastro está ausente ou é inválido. Corrija o cadastro antes de tentar novamente.")
        logger.warning("Complementacao sem destinatario valido demanda=%s solicitacao=%s", codigo, pedido["id"])
    else:
        try:
            resultado = email_service.enviar(dados, usuario_id=str(user.id), id_mensagem=notificacao["id_mensagem"])
        except email_service.FalhaEmail as exc:
            notificacao.update(
                status="indeterminado" if exc.codigo == "resultado_indeterminado" else "erro",
                codigo_erro=exc.codigo, detalhe=str(exc),
            )
        else:
            notificacao.update(status=resultado.status, detalhe=resultado.mensagem)
    pedidos.registrar_notificacao(pedido["id"], notificacao)
    return {"demanda_codigo": codigo, **notificacao}


def solicitar_hierarquizacao(codigo: str, *, descricao: str, user: SessionUser) -> dict:
    if user.tipo_usuario.strip().upper() not in {"ANALISTA", "GESTOR", "ADMIN"}:
        raise DemandaValidationError("Seu perfil não permite solicitar atributos de hierarquização.", field="usuario")
    if not descricao or not descricao.strip():
        raise DemandaValidationError("Informe o motivo da solicitação.", field="descricao")
    notificacoes = []
    with atomic_connection() as conn:
        row = hierarquizacao_repository.get_by_codigo(codigo, for_update=True)
        if not row:
            raise HierarquizacaoNotFoundError(codigo)
        if row.get("status") in {"arquivada", "homologada"}:
            raise DemandaValidationError("A hierarquização não está aberta para complementação.", field="status")
        dados = deepcopy(row.get("dados_hierarquizacao") or {})
        colunas = colunas_da_hierarquizacao(row)
        dominios = dominio_repository.list_atributos_objeto()
        abertos = {p["demanda_codigo"]: p for p in pedidos.listar(hierarquizacao=codigo)}
        for obj in sorted(dados.get("objetos", []), key=lambda o: o["cabecalho_objeto"]["codigo"]):
            cab = obj["cabecalho_objeto"]
            cadastro = bloquear(conn, cab["tipo_demanda"], cab["codigo"])
            if not cadastro:
                raise DemandaValidationError("Demanda da hierarquização não encontrada.", field="codigo")
            atualizar_cadastrais(cab, cadastro)
            faltantes = pendencias(cab, colunas, dominios)
            if not faltantes:
                continue
            if cadastro["status"] not in {STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO}:
                raise DemandaValidationError(f"A demanda {cab['codigo']} não está em hierarquização.", field="status")
            pedido = abertos.get(cab["codigo"]) or solicitar(
                cab["codigo"], categorias=["atributos_objeto"], descricao=descricao, user=user,
                hierarquizacao_codigo=codigo,
            )
            cab["complementacao_atributos"] = {"pendencias": faltantes, "concluida": False}
            cab["status"] = STATUS_HIERARQUIZACAO_COMPLEMENTACAO
            notificacoes.append((pedido, cadastro.get("representante_email")))
        if notificacoes:
            hierarquizacao_repository.update(codigo, {"dados_hierarquizacao": dados})
    # O pedido precisa estar confirmado antes de uma acao SMTP irreversivel.
    envios = [_notificar(p, email, row.get("nome") or codigo, user) for p, email in notificacoes]
    return {
        "codigo": codigo, "solicitacoes": [pedidos.obter(p["id"]) for p, _ in notificacoes],
        "envios": envios,
        "mensagem": (
            "Solicitações registradas. Confira o resultado individual dos emails; aceitação SMTP não confirma entrega."
            if envios else "Não há atributos obrigatórios pendentes para solicitar nesta hierarquização."
        ),
    }
