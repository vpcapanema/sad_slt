"""Constantes de domínio compartilhadas pela API SLT."""
from __future__ import annotations

# Níveis de demanda (demandas.dom_tipo_demanda). Espelha a seed da migração 015.
TIPO_DEMANDA_COD_TO_ID: dict[str, int] = {"plano": 1, "programa": 2, "projeto": 3}
TIPO_DEMANDA_ID_TO_COD: dict[int, str] = {v: k for k, v in TIPO_DEMANDA_COD_TO_ID.items()}

TIPOS_DEMANDA = tuple(TIPO_DEMANDA_COD_TO_ID)

# Prefixos de código legível gerados automaticamente (demandas.plano / programa / projeto)
CODIGO_PREFIX_PLANO = "PLA"
CODIGO_PREFIX_PROGRAMA = "PRO"
CODIGO_PREFIX_PROJETO = "PRJ"

# Registros sentinela do banco — pais fictícios quando não há vínculo institucional
CODIGO_PLANO_OUTROS = "PLANO-OUTROS"
CODIGO_PROGRAMA_OUTROS = "PROG-OUTROS"
NOME_PLANO_OUTROS = "Outros planos"
NOME_PROGRAMA_OUTROS = "Outros programas"
CODIGOS_SENTINELA_HIERARQUIA = frozenset({CODIGO_PLANO_OUTROS, CODIGO_PROGRAMA_OUTROS})

# Representante fictício do sistema (registros sentinela PLANO-OUTROS / PROG-OUTROS)
SISTEMA_SIGMA_PESSOA_ID = "00000000-0000-0000-0000-000000000001"
SISTEMA_REPRESENTANTE_NOME = "Sistema SLT"
SISTEMA_REPRESENTANTE_EMAIL = "sistema@slt.local"
