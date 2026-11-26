"""Etapas usadas no monitoramento e na agenda dos julgamentos AHP."""


def etapa_colaboracao(
    resposta: dict | None, *, publico: bool, inscrito_em=None, clique_em=None,
    convite_enviado: bool = False, convite_em=None,
) -> tuple:
    if resposta and resposta.get("status") == "enviada":
        return "resposta_enviada", "Resposta enviada", resposta.get("enviado_em")
    if resposta:
        return "em_preenchimento", "Em preenchimento", resposta.get("iniciado_em")
    if publico:
        return "inscrito", "Inscrito", inscrito_em
    if clique_em:
        return "link_acessado", "Link acessado", clique_em
    if convite_enviado:
        return "convite_enviado", "Convite enviado", convite_em
    return "convite_nao_enviado", "Convite não enviado", None
