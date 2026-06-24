"""Schemas HTTP — autenticação."""
from __future__ import annotations

from pydantic import BaseModel, Field


class LoginRequestSchema(BaseModel):
    login: str = Field(..., min_length=3, max_length=255, description="E-mail ou username SIGMA")
    senha: str = Field(..., min_length=1, max_length=200)


class SessionUserSchema(BaseModel):
    id: str
    email: str
    username: str
    nome: str
    tipo_usuario: str


class LoginResponseSchema(BaseModel):
    ok: bool = True
    user: SessionUserSchema
