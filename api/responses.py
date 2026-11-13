"""Serializacao das listagens volumosas dentro da thread da rota sincrona."""
from functools import lru_cache
from typing import Any

from fastapi.responses import Response
from pydantic import TypeAdapter


@lru_cache(maxsize=32)
def _adapter(schema: Any) -> TypeAdapter:
    return TypeAdapter(schema)


def model_json_response(items: Any, schema: Any, *, geometrias: dict[str, str] | None = None,
                        codigo_field: str = "id") -> Response:
    """Mantem o contrato Pydantic sem montar listas de coordenadas no event loop.

    Usar em rotas ``def``: validacao e serializacao ocorrem na thread da rota,
    antes de devolver os bytes ao servidor ASGI. O response_model da rota
    continua documentando o mesmo contrato no OpenAPI.
    """
    adapter = _adapter(schema)
    validated = adapter.validate_python(items)
    if geometrias is not None:
        # Somente JSON produzido pelo PostGIS, nunca texto recebido do cliente.
        # Os atributos continuam passando pelo schema; as coordenadas mantem a
        # mesma projecao e precisao sem decodificar/codificar milhoes de numeros.
        records = []
        for item in validated:
            metadata = item.model_dump_json(by_alias=True, exclude={"geometria"})
            geo = geometrias.get(getattr(item, codigo_field)) or "null"
            records.append(metadata[:-1] + ',"geometria":' + geo + '}')
        return Response('[' + ','.join(records) + ']', media_type="application/json")
    return Response(adapter.dump_json(validated, by_alias=True), media_type="application/json")
