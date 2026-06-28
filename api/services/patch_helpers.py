"""Normalização de payloads PATCH — instituição e representante."""
from __future__ import annotations

import uuid
from typing import Any

from api.exceptions import DemandaValidationError


def parse_uuid(value: str, field: str) -> str:
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, TypeError) as exc:
        raise DemandaValidationError(f"{field} inválido (UUID esperado).", field=field) from exc


def apply_instituicao(data: dict[str, Any], raw: dict[str, Any]) -> None:
    if "instituicao_id" in raw and raw["instituicao_id"]:
        data["sigma_instituicao_id"] = parse_uuid(raw["instituicao_id"], "instituicao_id")
    if "instituicao_label" in raw:
        data["instituicao_nome"] = (raw.get("instituicao_label") or "").strip()
    if "instituicao_cnpj" in raw:
        data["instituicao_cnpj"] = (raw.get("instituicao_cnpj") or "").strip()


def apply_representante(data: dict[str, Any], raw: dict[str, Any]) -> None:
    pessoa_id = raw.get("pessoa_id")
    rep = raw.get("representante")
    if rep and isinstance(rep, dict):
        pessoa_id = pessoa_id or rep.get("pessoa_id")
    if pessoa_id:
        data["sigma_pessoa_id"] = parse_uuid(str(pessoa_id), "pessoa_id")
        data["atualizado_por"] = data["sigma_pessoa_id"]
    if rep and isinstance(rep, dict):
        if rep.get("nome") is not None:
            data["representante_nome"] = (rep["nome"] or "").strip()
        if rep.get("email") is not None:
            data["representante_email"] = rep["email"]
        if rep.get("telefone") is not None:
            data["representante_telefone"] = rep["telefone"]
