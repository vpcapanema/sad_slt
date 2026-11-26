"""Modelo, edição e vínculo de um rascunho à operação de envio."""
from urllib.parse import urlsplit

from api.exceptions import DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as ambientes
from api.repositories import email_ahp_rascunho_repository as repo
from api.services import email_layout_ahp, mensagens_ahp
from api.services.comparacao_colaborativa_service import _link_publico, _prazo_email


def ambiente(ambiente_id: str) -> dict:
    registro = ambientes.get_ambiente_by_id(ambiente_id)
    if registro is None:
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    return registro


def modelo(registro: dict, base_url: str) -> dict:
    return mensagens_ahp.convite(registro, _link_publico(registro, base_url=base_url),
                                 _prazo_email(registro, "%d/%m/%Y, às %Hh%M"))


def proteger_link(texto: str, registro: dict, base_url: str) -> str:
    caminho = _link_publico(registro)
    linhas = texto.splitlines()
    for indice, linha in enumerate(linhas):
        candidato = linha.strip()
        if candidato.endswith(caminho) and not any(c.isspace() for c in candidato):
            try:
                url = urlsplit(candidato)
            except ValueError:
                continue
            if url.path.endswith(caminho) and url.scheme in {"", "http", "https"} and not url.query and not url.fragment:
                linhas[indice] = _link_publico(registro, base_url=base_url)
                return "\n".join(linhas)
    raise DemandaValidationError("Mantenha o link do julgamento em uma linha própria da mensagem.", field="texto")


def salvar(ambiente_id: str, editor_id: str, dados, base_url: str) -> dict:
    registro = ambiente(ambiente_id)
    texto = proteger_link(dados.texto, registro, base_url)
    return repo.salvar(ambiente_id, editor_id, dados.model_copy(update={"texto": texto}))


def edicao(ambiente_id: str, editor_id: str, base_url: str) -> dict:
    registro = ambiente(ambiente_id)
    rascunho = repo.pendente(ambiente_id, editor_id)
    if rascunho:
        rascunho = {**rascunho, "texto": proteger_link(rascunho["texto"], registro, base_url)}
    return {
        "padrao": modelo(registro, base_url), "rascunho": rascunho,
        "exemplos": email_layout_ahp.exemplos_previa(email_layout_ahp.EXEMPLOS_COMPARACAO, base_url),
        "exemplos_consistencia": email_layout_ahp.exemplos_previa(email_layout_ahp.EXEMPLOS_CONSISTENCIA, base_url),
    }


def para_envio(conn, registro: dict, editor_id: str, rascunho_id, operacao_id, base_url: str) -> dict:
    if rascunho_id is None:
        return modelo(registro, base_url)
    rascunho = repo.vincular(conn, str(registro["id"]), editor_id, rascunho_id, operacao_id)
    return {**rascunho, "texto": proteger_link(rascunho["texto"], registro, base_url)}
