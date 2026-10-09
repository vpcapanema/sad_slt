"""Contrato de autoria obrigatória dos cadastros de Plano, Programa e Projeto."""
from __future__ import annotations
from uuid import UUID
from api.exceptions import DemandaValidationError

# Conta real conferida no SIGMA em 09/10/2026; não é a conta OPERADOR.
SEI_ANALISTA_USUARIO_ID = "f08492fe-7740-4ad7-a615-6bf00db7730b"
SEI_ANALISTA_USERNAME = "joseane.queiroz_analista"


def validar_autor(usuario_id: str | None) -> str:
    try:
        uid = UUID(str(usuario_id or "").strip())
        if uid.int == 0:
            raise ValueError("UUID vazio")
    except (ValueError, TypeError, AttributeError) as exc:
        raise DemandaValidationError(
            "Não é permitido cadastrar uma demanda sem identificar o usuário criador. Faça login novamente.",
            field="criado_por",
        ) from exc
    return str(uid)


def resolver_autor(usuario_id: str, origem: str = "") -> str:
    """A autoria corresponde sempre ao usuário autenticado que executa a ação."""
    return validar_autor(usuario_id)
