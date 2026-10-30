"""Envio explícito dos convites salvos de um julgamento."""
from __future__ import annotations

from hashlib import sha256
from uuid import uuid4

from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as ambientes
from api.repositories import email_convites_repository as repo
from api.repositories import convite_individual_repository
from api.schemas.email import ConviteEmailEnvioSchema, EmailEnvioSchema
from api.services import email_service
from api.services.comparacao_colaborativa_service import (
    _validar_ambiente_ativo, _criterios_convidado, _criterio_nomes,
)

ASSUNTO = "Convite para preenchimento colaborativo AHP - SICARD"


def enviar(ambiente_id: str, dados: ConviteEmailEnvioSchema, usuario_id: str) -> dict:
    ambiente = ambientes.get_ambiente_by_id(ambiente_id)
    if not ambiente:
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    _validar_ambiente_ativo(ambiente)
    if ambiente["atualizado_em"] != dados.versao:
        raise DemandaValidationError("O julgamento mudou. Reabra o registro antes de enviar.", field="versao")
    destinatario = str(dados.destinatario).lower()
    autorizados = {str(c["email"]).strip().lower() for c in ambiente["convites"]}
    if destinatario not in autorizados:
        raise DemandaValidationError("O destinatário não pertence aos colaboradores salvos.", field="destinatario")
    # O servidor acrescenta o codigo persistido, nunca um codigo fornecido pelo cliente.
    caminhos = (
        f"/public/analise-multicriterio/formulario-comparacao-pareada/{ambiente['token']}/",
        f"/public/analise-multicriterio/{ambiente['token']}/",
    )
    if not any(caminho in dados.texto for caminho in caminhos):
        raise DemandaValidationError("A mensagem não contém o link deste julgamento.", field="texto")
    config = email_service._config()
    convite = next(c for c in ambiente["convites"] if c["email"].strip().lower() == destinatario)
    corpo = dados.texto
    if convite.get("dimensoes") is not None:
        criterios = _criterio_nomes(_criterios_convidado(ambiente, destinatario))
        link = next(linha.strip() for linha in dados.texto.splitlines() if any(caminho in linha for caminho in caminhos))
        corpo = (
            f"Olá, {convite.get('nome') or 'colaborador(a)'}!\n\n"
            "Você foi convidado(a) a preencher a comparação pareada AHP no SICARD.\n"
            f"Dimensões atribuídas: {', '.join(convite['dimensoes'])}.\n\n"
            "Critérios a comparar:\n" + "\n".join(f"{i + 1}. {nome}" for i, nome in enumerate(criterios))
            + f"\n\nPrazo: {ambiente['valido_ate'].isoformat()}.\n"
            f"Acesse o formulário: {link}\n"
            "Para enviar a resposta, a consistência (RC) deve ser menor que 0,10."
        )
    instrucoes = (
        "\n\nChave individual do convite: {segredo}\n"
        "Informe seu e-mail convidado e esta chave no formulário. Não compartilhe a chave. "
        "Ela é revogável, exclusiva deste destinatário e válida dentro do prazo do julgamento. "
        "Um novo envio invalida a chave anterior."
    )
    texto = corpo
    if len(texto) + len(instrucoes.format(segredo="x" * 43)) > 50000:
        raise DemandaValidationError(
            "Reduza a mensagem para que o texto, incluindo a chave individual e suas instruções, tenha até 50.000 caracteres.",
            field="texto",
        )
    identidade = ASSUNTO + "\n" + texto
    if dados.reenvio_id:
        identidade += "\nReenvio: " + str(dados.reenvio_id)
    resumo = sha256(identidade.encode()).hexdigest()
    registro, novo = repo.reservar(
        ambiente_id, destinatario, resumo, f"<sicard.{uuid4().hex}@{str(config.remetente).rsplit('@', 1)[1]}>",
        usuario_id, dados.versao,
    )
    if not novo:
        return {**registro, "reutilizado": True}
    try:
        segredo = convite_individual_repository.emitir(ambiente_id, destinatario, dados.versao)
        texto += instrucoes.format(segredo=segredo)
        mensagem = EmailEnvioSchema(destinatario=dados.destinatario, assunto=ASSUNTO, texto=texto)
        resultado = email_service.enviar(
            mensagem,
            usuario_id=usuario_id, id_mensagem=registro["mensagem_id"], solicitar_confirmacoes=True,
        )
    except (DatabaseUnavailableError, DemandaValidationError):
        repo.finalizar(str(registro["id"]), "falha", "Convite não emitido. Reabra o julgamento e tente novamente.")
        raise
    except email_service.FalhaEmail as exc:
        status = "indeterminado" if exc.codigo == "resultado_indeterminado" else "falha"
        return repo.finalizar(str(registro["id"]), status, str(exc))
    try:
        return repo.finalizar(
            str(registro["id"]), "aceito_smtp", resultado.mensagem,
            dsn=resultado.confirmacao_entrega_solicitada, leitura=True,
        )
    except (DatabaseUnavailableError, DemandaValidationError) as exc:
        email_service.logger.error(
            "SMTP aceitou convite; histórico indisponível registro=%s tipo=%s",
            registro["id"], type(exc).__name__,
        )
        raise email_service.FalhaEmail(
            "resultado_indeterminado",
            "O SMTP aceitou a mensagem, mas o histórico não foi atualizado. Não reenvie; consulte as confirmações.",
        ) from exc
