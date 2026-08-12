"""Validação comum da decisão administrativa de reprovação."""
from __future__ import annotations

import uuid

from api.exceptions import DemandaValidationError


def validar_reprovacao(justificativa: str, reprovado_por: str | None) -> tuple[str, str | None]:
    motivo = (justificativa or "").strip()
    if not motivo:
        raise DemandaValidationError(
            "A justificativa da reprovação é obrigatória.",
            field="justificativa",
        )

    usuario_id = None
    if reprovado_por:
        try:
            usuario_id = str(uuid.UUID(str(reprovado_por)))
        except (ValueError, TypeError) as exc:
            raise DemandaValidationError(
                "reprovado_por inválido (UUID esperado).",
                field="reprovado_por",
            ) from exc
    return motivo, usuario_id
