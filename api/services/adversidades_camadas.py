"""Resolve vínculos explícitos sem inferir taxonomia a partir do nome de exibição."""
from pathlib import PurePosixPath

from api.repositories import dominio_repository


def resolver(camadas: list[str]) -> dict[str, dict | None]:
    if not camadas:
        return {}
    vinculos = {v["camada_codigo"]: v for v in dominio_repository.list_camadas_adversidade()}
    resultado = {}
    for ident in camadas:
        vinculo = vinculos.get(ident)
        if vinculo is None and ident.startswith("storage:"):
            arquivo, _, componente = ident[len("storage:"):].partition("::")
            codigo = componente or PurePosixPath(arquivo).stem
            vinculo = vinculos.get(codigo)
        resultado[ident] = (
            {k: v for k, v in vinculo.items() if k != "ativo"}
            if vinculo and vinculo["ativo"] else None
        )
    return resultado
