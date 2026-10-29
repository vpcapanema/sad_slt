"""Solicitacao e notificacao de atributos, sem reabrir a aprovacao cadastral."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from email.utils import make_msgid
from hashlib import sha256
import logging
import json
import re

from pydantic import ValidationError

from api.constants import STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO
from api.db.connection import atomic_connection
from api.exceptions import DemandaValidationError, HierarquizacaoNotFoundError
from api.repositories import dominio_repository, hierarquizacao_repository, analise_demanda_repository
from api.repositories import solicitacao_complementacao_repository as pedidos
from api.schemas.email import EmailEnvioSchema
from api.services import email_service
from api.services.atributos_hierarquizacao import atualizar_cadastrais, colunas_da_hierarquizacao, pendencias
from api.services.solicitacao_complementacao_service import bloquear, solicitar
from api.services.session_service import SessionUser

logger = logging.getLogger(__name__)

def preparar_notificacao(pedido: dict, destinatario: str | None, nome_hierarquia: str) -> tuple[dict, bytes]:
    """Prepara a mesma mensagem e o mesmo anexo usados na confirmação do envio."""
    from api.services.analise_demanda_service import _parecer_com_geometria
    codigo = pedido["demanda_codigo"]
    analise = analise_demanda_repository.get_by_codigo(codigo)
    if not analise or analise["demanda_tipo"] != pedido["demanda_tipo"]:
        raise DemandaValidationError("Gere o parecer PDF na análise desta demanda antes de notificar.", field="parecer_pdf")
    pdf = analise_demanda_repository.get_pdf(codigo)
    if not pdf:
        raise DemandaValidationError("Gere o parecer PDF na análise desta demanda antes de notificar.", field="parecer_pdf")
    atributos = "atributos_objeto" in pedido["categorias"]
    mensagem = ((pedido.get("mensagem_gestor") or "").strip() if atributos else
                "\n\n".join(p for p in [(_parecer_com_geometria(analise) or "").strip(),
                                       (analise.get("parecer_complemento") or "").strip()] if p))
    if not mensagem:
        raise DemandaValidationError("O texto do parecer está vazio." if not atributos else
                                    "Preencha e salve a mensagem ao solicitante.", field="mensagem")
    texto = (f"Solicita-se a complementação da demanda {codigo} na hierarquização "
             f"{pedido['hierarquizacao_codigo']} — {nome_hierarquia}.\n\n{mensagem}\n\n"
             "Acesse o SICARD com sua conta, na página Complementação. Abra o bloco Atributos da hierarquização. "
             "Preencha e salve os atributos pendentes. Esta solicitação não reabre a avaliação cadastral da demanda. "
             "A conclusão validada devolve a demanda ao status Em hierarquização.") if atributos else mensagem
    previa = {
        "destinatario": destinatario or "", "assunto": f"SICARD: complementação da demanda {codigo}",
        "texto": texto, "mensagem": mensagem, "revisao": pedido.get("revisao"),
        "anexo_nome": "parecer-analise-" + re.sub(r"[^a-zA-Z0-9._-]", "_", codigo) + ".pdf",
        "anexo_sha256": sha256(pdf).hexdigest(),
    }
    previa["assinatura"] = sha256(json.dumps(previa, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
    return previa, pdf


def _notificar(pedido: dict, destinatario: str | None, nome_hierarquia: str, user: SessionUser,
               *, anexar_parecer: bool = False, assinatura_previa: str | None = None,
               cadastro_snapshot: dict | None = None, revisao_parecer: dict | None = None) -> dict:
    codigo = pedido["demanda_codigo"]
    anexo = None
    previa = None
    if anexar_parecer:
        previa, pdf = preparar_notificacao(pedido, destinatario, nome_hierarquia)
        if assinatura_previa and assinatura_previa != previa["assinatura"]:
            raise DemandaValidationError("O destinatário, a mensagem ou o PDF mudou. Abra novamente a prévia antes de enviar.", field="previsualizacao")
        anexo = (previa["anexo_nome"], pdf)
    notificacao = {
        "status": "enviando", "id_mensagem": make_msgid(domain="sicard.local"),
        "destinatario": destinatario, "por": str(user.id), "por_nome": user.nome,
        "em": datetime.now(timezone.utc).isoformat(),
        "mensagem_enviada": (pedido.get("mensagem_gestor") or "").strip() or pedido["descricao"],
        "revisao_solicitacao": pedido.get("revisao"),
        "detalhe": "Envio iniciado. Não reenvie sem conferir o resultado para evitar duplicidade.",
        "entrega_status": "sem_confirmacao", "leitura_status": "sem_confirmacao", "eventos": [],
    }
    if anexo and previa:
        notificacao["parecer_anexo"] = {"nome": anexo[0], "sha256": sha256(anexo[1]).hexdigest(), "tamanho": len(anexo[1])}
        notificacao.update(mensagem_enviada=previa["mensagem"], assunto=previa["assunto"],
                           texto_enviado=previa["texto"], previsualizacao_sha256=previa["assinatura"],
                           cadastro_no_envio=cadastro_snapshot)
        if revisao_parecer:
            notificacao["revisao_parecer"] = revisao_parecer
    reservado = pedidos.reservar_notificacao(pedido["id"], notificacao)
    if not reservado:
        atual = pedidos.obter(pedido["id"])
        if not atual:
            raise DemandaValidationError("Solicitação não encontrada após reserva da notificação.", field="codigo")
        if (atual.get("notificacao") or {}).get("status") not in {"enviando", "aceito_smtp", "indeterminado"}:
            raise DemandaValidationError("A solicitação foi alterada ou atendida. Recarregue antes de notificar.", field="codigo")
        return {"demanda_codigo": codigo, **atual.get("notificacao", {})}
    try:
        atributos = bool(pedido.get("hierarquizacao_codigo"))
        contexto = (
            f"na hierarquização {pedido['hierarquizacao_codigo']} — {nome_hierarquia}."
            if atributos else "no cadastro e/ou na geometria."
        )
        orientacao = (
            "Abra o bloco Atributos da hierarquização. Preencha e salve os atributos pendentes. "
            "Esta solicitação não reabre a avaliação cadastral da demanda. "
            "A conclusão validada devolve a demanda ao status Em hierarquização."
            if atributos else
            "Abra o bloco Cadastro e geometria. Salve as categorias solicitadas e conclua a solicitação."
        )
        dados = EmailEnvioSchema(
            destinatario=destinatario or "",
            assunto=f"SICARD: complementação da demanda {codigo}",
            texto=previa["texto"] if previa else (
                f"Solicita-se a complementação da demanda {codigo} {contexto}\n\n"
                f"{notificacao['mensagem_enviada']}\n\n"
                f"Acesse o SICARD com sua conta, na página Complementação. {orientacao}"
            ),
        )
    except ValidationError:
        notificacao.update(status="sem_destinatario", detalhe="O email do representante no cadastro está ausente ou é inválido. Corrija o cadastro antes de tentar novamente.")
        logger.warning("Complementacao sem destinatario valido demanda=%s solicitacao=%s", codigo, pedido["id"])
    else:
        try:
            resultado = email_service.enviar(dados, usuario_id=str(user.id), id_mensagem=notificacao["id_mensagem"],
                                             solicitar_confirmacoes=True, anexo_pdf=anexo)
        except email_service.FalhaEmail as exc:
            notificacao.update(
                status="indeterminado" if exc.codigo == "resultado_indeterminado" else "erro",
                codigo_erro=exc.codigo, detalhe=str(exc),
            )
        else:
            notificacao.update(status=resultado.status, detalhe=resultado.mensagem,
                               enviado_em=datetime.now(timezone.utc).isoformat(),
                               confirmacao_entrega_solicitada=resultado.confirmacao_entrega_solicitada,
                               confirmacao_leitura_solicitada=resultado.confirmacao_leitura_solicitada)
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
