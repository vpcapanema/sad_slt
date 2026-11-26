"""Compartilha o endereço público do julgamento sem abrir inscrições."""
from hashlib import sha256
from html import escape
from uuid import uuid4

from api.db.connection import atomic_connection
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as ambientes
from api.repositories import divulgacao_ahp_repository as destinatarios
from api.repositories import email_convites_repository as emails
from api.schemas.email import (
    DivulgacaoEmailEnvioSchema, DivulgacaoTransporteSchema, ExclusaoDestinatariosDivulgacaoSchema,
    ListaDivulgacaoSchema, MensagemDivulgacaoSchema, SalvamentoListaDivulgacaoSchema,
)
from api.services import email_ahp_rascunho, email_service, mensagens_ahp
from api.services.comparacao_colaborativa_service import _link_publico, _validar_ambiente_ativo, instituicao_convidado
from api.services.email_convites import _personalizar_mensagem

NATUREZA = "divulgacao"


def ambiente_publico(ambiente_id: str, *, bloquear: bool = False) -> dict:
    ambiente = ambientes.get_ambiente_by_id(ambiente_id, bloquear=bloquear)
    if not ambiente or ambiente.get("modo_participacao") != "publico":
        raise DemandaValidationError("Selecione um julgamento com participação por link público.", field="ambiente_id")
    return ambiente


def listar(ambiente_id: str) -> dict:
    ambiente_publico(ambiente_id)
    return {
        "destinatarios": destinatarios.listar(ambiente_id),
        "emails_inscritos": [inscricao["email"].strip().lower() for inscricao in ambientes.list_inscricoes(ambiente_id)],
        "registros": emails.listar(ambiente_id, natureza=NATUREZA),
        "mensagem": destinatarios.obter_mensagem(ambiente_id),
    }


def listas_existentes(ambiente_id: str, origem: str | None = None, catalogo: bool = False) -> dict:
    ambiente_publico(ambiente_id)
    if origem is not None:
        if catalogo:
            lista = destinatarios.obter_lista(origem)
            if not lista:
                raise DemandaValidationError("A lista cadastrada não foi encontrada.", field="origem")
            return {"destinatarios": lista["destinatarios"]}
        julgamento = ambientes.get_ambiente_by_id(origem)
        if not julgamento or origem == ambiente_id:
            raise DemandaValidationError("Selecione a lista de outro julgamento.", field="origem")
        contatos = destinatarios.listar(origem) if julgamento.get("modo_participacao") == "publico" else julgamento.get("convites") or []
        pessoas = []
        for contato in contatos:
            if contato.get("email"):
                email = str(contato["email"]).strip().lower()
                pessoa = {"nome": contato.get("nome") or email, "email": email}
                instituicao = instituicao_convidado(contato, julgamento)
                if instituicao:
                    pessoa["instituicao"] = instituicao
                pessoas.append(pessoa)
        return {"destinatarios": pessoas}
    cadastradas = [{"id": str(item["id"]), "nome": item["nome"], "tipo": "Lista reutilizável", "editavel": True}
                   for item in destinatarios.listar_catalogo()]
    return {"listas": cadastradas + [
        {"id": str(item["id"]), "nome": item.get("nome") or "Julgamento " + str(item["id"]),
         "tipo": "Divulgação de link público" if item.get("modo_participacao") == "publico" else "Colaboradores convidados"}
        for item in destinatarios.origens(ambiente_id)
    ]}


def salvar_destinatarios(ambiente_id: str, dados: SalvamentoListaDivulgacaoSchema) -> dict:
    alterados = {str(item.destinatario).lower(): (item.nome, (item.instituicao or "").strip() or None,
                                                 "instituicao" in item.model_fields_set) for item in dados.alterados}
    removidos = {str(email).lower() for email in dados.removidos}
    if len(alterados) != len(dados.alterados) or alterados.keys() & removidos:
        raise DemandaValidationError("Há e-mails repetidos nas alterações da lista.", field="alterados")

    with atomic_connection() as conn:
        destinatarios.bloquear_lista(conn, ambiente_id)
        for email in sorted(removidos | alterados.keys()):
            emails.bloquear_envio(conn, ambiente_id, email, NATUREZA)
        ambiente_publico(ambiente_id, bloquear=True)
        if removidos:
            destinatarios.excluir(conn, ambiente_id, sorted(removidos))
        if alterados:
            destinatarios.gravar_contatos(conn, ambiente_id, alterados)
        contatos = destinatarios.listar(ambiente_id)
        inscritos = {item["email"].strip().lower() for item in ambientes.list_inscricoes(ambiente_id)}
        lista = None
        if dados.nova_lista or dados.lista_id:
            reutilizaveis = [{"nome": item["nome"], "email": item["email"],
                              **({"instituicao": item["instituicao"]} if item.get("instituicao") else {})}
                             for item in contatos if item["email"] not in inscritos]
            if not reutilizaveis:
                raise DemandaValidationError("Inclua pelo menos um convidado para salvar uma lista reutilizável.", field="alterados")
            lista = destinatarios.salvar_lista(conn, reutilizaveis, nome=dados.nova_lista,
                                               ident=str(dados.lista_id) if dados.lista_id else None)
            if not lista:
                mensagem = "Já existe uma lista com esse nome." if dados.nova_lista else "A lista a atualizar não foi encontrada."
                raise DemandaValidationError(mensagem, field="nova_lista" if dados.nova_lista else "lista_id")
        return {"destinatarios": contatos, "emails_inscritos": sorted(inscritos),
                "ja_inscritos": sorted(alterados.keys() & inscritos), "lista": lista}


def adicionar(ambiente_id: str, dados: ListaDivulgacaoSchema) -> dict:
    contatos = {str(item.destinatario).lower(): (item.nome, (item.instituicao or "").strip() or None)
                for item in dados.destinatarios}
    if len(contatos) != len(dados.destinatarios):
        raise DemandaValidationError("Há e-mails repetidos na lista de divulgação.", field="destinatarios")
    with atomic_connection() as conn:
        destinatarios.bloquear_lista(conn, ambiente_id)
        ambiente_publico(ambiente_id, bloquear=True)
        return destinatarios.adicionar(conn, ambiente_id, contatos)


def excluir(ambiente_id: str, dados: ExclusaoDestinatariosDivulgacaoSchema) -> int:
    contatos = sorted({str(email).lower() for email in dados.destinatarios})
    with atomic_connection() as conn:
        destinatarios.bloquear_lista(conn, ambiente_id)
        ambiente_publico(ambiente_id)
        for contato in contatos:
            emails.bloquear_envio(conn, ambiente_id, contato, NATUREZA)
        return destinatarios.excluir(conn, ambiente_id, contatos)


def salvar_mensagem(ambiente_id: str, dados: MensagemDivulgacaoSchema) -> dict:
    with atomic_connection() as conn:
        ambiente_publico(ambiente_id, bloquear=True)
        return destinatarios.salvar_mensagem(conn, ambiente_id, dados.assunto, dados.texto)


def enviar(ambiente_id: str, dados: DivulgacaoEmailEnvioSchema, usuario_id: str, *, base_url: str) -> dict:
    email = str(dados.destinatario).lower()
    identidade = sha256(f"{NATUREZA}:{dados.operacao_id}".encode()).hexdigest()
    with atomic_connection() as conn:
        emails.bloquear_envio(conn, ambiente_id, email, NATUREZA)
        ambiente = ambiente_publico(ambiente_id)
        historico = emails.listar(ambiente_id, natureza=NATUREZA, destinatario=email)
        anterior = next((registro for registro in historico if registro["conteudo_hash"] == identidade), None)
        if anterior:
            return anterior
        _validar_ambiente_ativo(ambiente)
        contato = destinatarios.listar(ambiente_id, email)
        if not contato:
            raise DemandaValidationError("Confirme este contato na lista de divulgação antes de enviar.", field="destinatario")
        if contato[0]["inscrito_em"]:
            raise DemandaValidationError("Este contato já está inscrito. Acompanhe-o no monitoramento das atividades.", field="destinatario")
        if any(r["envio_status"] in {"enviando", "indeterminado"}
               and r["entrega_status"] not in {"confirmada", "falha"}
               and r["leitura_status"] != "confirmada" for r in historico):
            raise DemandaValidationError("O resultado de um envio está pendente. Atualize as confirmações antes de reenviar.", field="destinatario")
        if bool(historico) != dados.reenvio:
            acao = "Reenviar" if historico else "Enviar"
            raise DemandaValidationError(f"Atualize a lista e use a ação {acao} para este contato.", field="destinatario")
        link = _link_publico(ambiente, base_url=base_url)
        if dados.texto is not None:
            html_texto = escape(dados.texto).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>")
            mensagem = DivulgacaoTransporteSchema(
                destinatario=email, assunto=dados.assunto, alias_remetente="SICARD-PLI",
                texto=f"{dados.texto}\n\nInscrição pública no SICARD\n{link}",
                html=(f'<p style="white-space:pre-wrap">{html_texto}</p>'
                      f'<p><a href="{escape(link, quote=True)}">Abrir inscrição pública</a></p>'),
            )
        else:
            conteudo = email_ahp_rascunho.para_envio(conn, ambiente, usuario_id, dados.rascunho_id, dados.operacao_id, base_url)
            texto = _personalizar_mensagem(conteudo["texto"], contato[0].get("nome"), normalizar_assinatura=False)
            mensagem = DivulgacaoTransporteSchema(
                destinatario=email, assunto=conteudo["assunto"], alias_remetente=conteudo["alias_remetente"],
                texto=texto, html=mensagens_ahp.html(texto, link, mensagens_ahp.ACAO_CONVITE,
                                                    julgamento=ambiente.get("nome") or ""),
            )
        remetente = email_service._config().remetente
        registro, novo = emails.reservar(
            ambiente_id, email, identidade, f"<sicard.{uuid4().hex}@{str(remetente).rsplit('@', 1)[1]}>",
            usuario_id, ambiente["atualizado_em"], natureza=NATUREZA,
        )
        if not novo:
            return registro
    ident = str(registro["id"])
    try:
        resultado = email_service.enviar(
            mensagem, usuario_id=usuario_id, id_mensagem=registro["mensagem_id"], solicitar_confirmacoes=True,
        )
    except email_service.FalhaEmail as exc:
        status = "indeterminado" if exc.codigo == "resultado_indeterminado" else "falha"
        return {**emails.finalizar(ident, status, str(exc)), "codigo_email": exc.codigo}
    except (DatabaseUnavailableError, DemandaValidationError):
        emails.finalizar(ident, "falha", "E-mail de divulgação não emitido.")
        raise
    try:
        return emails.finalizar(
            ident, "aceito_smtp", resultado.mensagem,
            dsn=resultado.confirmacao_entrega_solicitada, leitura=resultado.confirmacao_leitura_solicitada,
        )
    except (DatabaseUnavailableError, DemandaValidationError) as exc:
        raise email_service.FalhaEmail(
            "resultado_indeterminado",
            "O SMTP aceitou o e-mail, mas o histórico não foi atualizado. Consulte as confirmações antes de reenviar.",
        ) from exc
