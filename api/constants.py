"""Constantes de domínio compartilhadas pela API SLT."""
from __future__ import annotations

# Níveis de demanda (demandas.dom_tipo_demanda). Espelha a seed da migração 015.
TIPO_DEMANDA_COD_TO_ID: dict[str, int] = {"plano": 1, "programa": 2, "projeto": 3}
TIPO_DEMANDA_ID_TO_COD: dict[int, str] = {v: k for k, v in TIPO_DEMANDA_COD_TO_ID.items()}

TIPOS_DEMANDA = tuple(TIPO_DEMANDA_COD_TO_ID)
