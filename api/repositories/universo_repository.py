"""Acesso a dados — universo de demandas elegíveis ao AHP, por tipo.

Sem tabela consolidada nem view: cada tipo é consultado na sua própria tabela
(demandas.plano/programa/projeto), filtrando pelas fases de hierarquização.
O ``grupo_id`` é o conjunto comparável (pai) de cada nível.
"""

from __future__ import annotations

from typing import Any

from api.constants import STATUS_UNIVERSO_AHP
from api.db.connection import get_connection

AHP_STATUSES = tuple(STATUS_UNIVERSO_AHP)

# tipo -> (tabela, coluna do pai usada como grupo comparável)
_TIPO_QUERY: dict[str, dict[str, str]] = {
    "plano": {"table": "demandas.plano", "grupo": "diretoria_id"},
    "programa": {"table": "demandas.programa", "grupo": "plano_id"},
    "projeto": {"table": "demandas.projeto", "grupo": "programa_id"},
}


def list_elegiveis(
    tipo: str,
    *,
    status: str | None = None,
    grupo: str | None = None,
) -> list[dict[str, Any]]:
    """Lista demandas de um tipo nas fases de hierarquização (universo do AHP)."""
    cfg = _TIPO_QUERY.get(tipo)
    if cfg is None:
        raise ValueError(f"Tipo de demanda inválido: {tipo}")

    query = f"""
        SELECT
            id,
            codigo,
            nome,
            status,
            {cfg["grupo"]}::text AS grupo_id,
            aprovado_em
        FROM {cfg["table"]}
        WHERE 1=1
    """
    params: list[Any] = []
    if status:
        query += " AND status = %s"
        params.append(status)
    else:
        query += " AND status = ANY(%s)"
        params.append(list(AHP_STATUSES))
    if grupo:
        query += f" AND {cfg['grupo']}::text = %s"
        params.append(grupo)
    query += " ORDER BY aprovado_em DESC NULLS LAST, codigo"
    with get_connection() as conn:
        return list(conn.execute(query, params).fetchall())
