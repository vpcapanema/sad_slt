"""Proteção do envelope de um convite no banco; nunca persiste a chave em claro."""
import base64
import json
import os
import re
from secrets import token_bytes

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from api.exceptions import DemandaValidationError


def _cifra() -> AESGCM:
    valor = os.getenv("SICARD_CONVITE_ENVELOPE_KEY", "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{43}", valor):
        raise DemandaValidationError(
            "Envio de convites indisponível: solicite à administração a configuração da proteção dos convites.",
            field="convite",
        )
    chave = base64.urlsafe_b64decode(valor + "=")
    if base64.urlsafe_b64encode(chave).decode().rstrip("=") != valor:
        raise DemandaValidationError("Configuração da proteção dos convites inválida.", field="convite")
    return AESGCM(chave)


def _contexto(ambiente_id: str, email: str) -> bytes:
    return json.dumps(["sicard-convite-v1", ambiente_id, email]).encode()


def cifrar(ambiente_id: str, email: str, dados: dict) -> bytes:
    nonce = token_bytes(12)
    return nonce + _cifra().encrypt(nonce, json.dumps(dados).encode(), _contexto(ambiente_id, email))


def abrir(ambiente_id: str, email: str, envelope: bytes) -> dict:
    payload = bytes(envelope)
    return json.loads(_cifra().decrypt(payload[:12], payload[12:], _contexto(ambiente_id, email)))
