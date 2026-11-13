"""Serializacao das listagens volumosas dentro da thread da rota sincrona."""
from functools import lru_cache
from typing import Any

from fastapi.responses import Response
from pydantic import TypeAdapter


@lru_cache(maxsize=32)
def _adapter(schema: Any) -> TypeAdapter:
    return TypeAdapter(schema)


def model_json_response(items: Any, schema: Any) -> Response:
    """Mantem o contrato Pydantic sem montar listas de coordenadas no event loop.

    Usar em rotas ``def``: validacao e serializacao ocorrem na thread da rota,
    antes de devolver os bytes ao servidor ASGI. O response_model da rota
    continua documentando o mesmo contrato no OpenAPI.
    """
    adapter = _adapter(schema)
    validated = adapter.validate_python(items)
    return Response(adapter.dump_json(validated, by_alias=True), media_type="application/json")
