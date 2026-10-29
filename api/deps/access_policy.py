"""Política de módulos; aplicada antes das dependências e dos serviços das rotas."""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request

from api.deps.auth import get_optional_session
from api.services.session_service import SessionUser

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
MOCAD = {"demandas", "planos", "programas", "analise", "sei", "geometria"}
MAD = {"ahp", "hierarquizacoes", "agrupamentos-demandas", "universo"}


def module_for_path(path: str) -> str | None:
    parts = path.strip("/").split("/")
    if parts[0] == "api":
        name = parts[1] if len(parts) > 1 else ""
        if name in MOCAD:
            return "mocad"
        if path.startswith("/api/ahp/superficies-criterios"):
            return "ferramentas"
        if name in MAD:
            return "mad"
        if name == "complementacao":
            if len(parts) > 2 and parts[2] == "solicitacoes":
                return None  # A categoria é verificada após carregar a solicitação.
            return "mocad" if len(parts) > 2 and parts[2] == "demandas" else "mad"
        if name in {"admin", "email"}:
            return "admin"
        if name in {"geoespacial", "superficie-criterios"}:
            return "ferramentas"
    if parts[0] == "restrict":
        name = parts[1] if len(parts) > 1 else ""
        if name == "admin":
            return "admin"
        if name in {"painel", "demandas", "demanda", "revisao-status", "complementacao", "sei-documentos"}:
            return "mocad"
        if name in {"hierarquizacao", "agrupamento-demandas", "analise-multicriterio", "ahp"}:
            return "mad"
        if name == "geoespacial":
            return "ferramentas"
    if path.rstrip("/") == "/public/cadastro/nova-demanda":
        return "mocad"
    return None


def read_only(profile: str, module: str | None) -> bool:
    return (profile == "GESTOR" and module == "mocad") or (
        profile == "ANALISTA" and module == "mad"
    )


def require_module_policy(
    request: Request,
    user: SessionUser | None = Depends(get_optional_session),
) -> None:
    path = request.url.path
    module = module_for_path(path)
    # O convite público AHP tem autorização própria por token, não por sessão.
    if path.startswith("/api/ahp/comparacao-colaborativa/publico/"):
        return
    profile = user.tipo_usuario.strip().upper() if user else ""
    if module == "admin":
        if not user:
            raise HTTPException(401, "Faça login para continuar.")
        if profile != "ADMIN":
            raise HTTPException(403, "O bloco Admin é exclusivo do Administrador.")
    if user and read_only(profile, module) and request.method not in SAFE_METHODS:
        raise HTTPException(403, f"Seu perfil tem somente visualização neste módulo ({module.upper()}).")
    if profile != "OPERADOR":
        return
    if path == "/api/painel/demandas/internas" or "/internas" in path:
        raise HTTPException(403, "Utilize a complementação solicitada das suas demandas.")
    if module == "mocad":
        parts = path.strip("/").split("/")
        if len(parts) > 2 and parts[1] in {"demandas", "planos", "programas"}:
            if request.method == "POST" and len(parts) == 2:
                return
            if request.method == "POST" and parts[2] == "com-arquivo-geometria":
                return
            # A atualização do operador passa exclusivamente pela complementação.
            if request.method not in SAFE_METHODS:
                raise HTTPException(403, "Utilize a complementação solicitada das suas demandas.")
        if path.startswith("/api/sei") or path.startswith("/api/analise"):
            raise HTTPException(403, "Seu perfil permite somente cadastro e complementação própria.")
        if path.startswith("/api/geometria/") and path != "/api/geometria/parse":
            raise HTTPException(403, "Utilize a complementação de geometria solicitada.")
        return
    if module in {"mad", "ferramentas"}:
        raise HTTPException(403, "Seu perfil permite somente cadastro e complementação própria.")
