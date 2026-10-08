"""Acesso a dados — demandas.projeto_geometria_historico.

Histórico de geometrias de projeto, plano e programa. Cada linha descreve uma
versão completa (geometria, ponto representativo, regionalidades, origem,
autor) e, quando a origem é upload, guarda o arquivo vetorial original.
"""
from __future__ import annotations

from typing import Any, Literal

from psycopg import Connection
from psycopg.types.json import Jsonb

Alvo = Literal["projeto", "plano", "programa"]

_INSERT_UPLOAD_SQL = """
    INSERT INTO demandas.projeto_geometria_historico (
        projeto_id,
        plano_id,
        programa_id,
        origem,
        geometria,
        geometria_tipo,
        latitude,
        longitude,
        regionalidades,
        criado_por,
        nome_arquivo,
        extensao,
        tipo_mime,
        tamanho_bytes,
        sha256,
        conteudo_binario
    ) VALUES (
        %(projeto_id)s,
        %(plano_id)s,
        %(programa_id)s,
        'upload',
        ST_SetSRID(ST_GeomFromGeoJSON(%(geometria_geojson)s::text), 4326),
        %(geometria_tipo)s,
        %(latitude)s,
        %(longitude)s,
        %(regionalidades)s,
        %(criado_por)s,
        %(nome_arquivo)s,
        %(extensao)s,
        %(tipo_mime)s,
        %(tamanho_bytes)s,
        %(sha256)s,
        %(conteudo_binario)s
    )
"""


def regionalidades_de(complementos: Any) -> Jsonb | None:
    """Extrai o snapshot de regionalidades do JSONB de complementos do projeto."""
    valor = complementos.obj if isinstance(complementos, Jsonb) else complementos
    if isinstance(valor, dict) and valor.get("regionalidades") is not None:
        return Jsonb(valor["regionalidades"])
    return None


def insert_upload(
    conn: Connection,
    *,
    alvo: Alvo,
    alvo_id: Any,
    geometria_geojson: str | None,
    arquivo: dict[str, Any],
    latitude: float | None = None,
    longitude: float | None = None,
    regionalidades: Jsonb | None = None,
    criado_por: Any = None,
) -> None:
    """Registra, na transação corrente, a versão enviada por upload e seu arquivo original."""
    params = {
        "projeto_id": None,
        "plano_id": None,
        "programa_id": None,
        f"{alvo}_id": alvo_id,
        "geometria_geojson": geometria_geojson,
        "latitude": latitude,
        "longitude": longitude,
        "regionalidades": regionalidades,
        "criado_por": criado_por,
        **arquivo,
    }
    conn.execute(_INSERT_UPLOAD_SQL, params)
