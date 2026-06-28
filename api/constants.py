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

# Status — camadas do ciclo de vida (demandas.dom_status_demanda.camada)
STATUS_CAMADA_ANALISE = "analise"
STATUS_CAMADA_HIERARQUIZACAO = "hierarquizacao"
STATUS_CAMADA_POS_HIERARQUIZADO = "pos_hierarquizado"
STATUS_CAMADA_TRANSVERSAL = "transversal"

STATUS_INICIAL_DEMANDA = "rascunho"
STATUS_POS_APROVACAO = "elegivel_ahp"

# Origens permitidas para POST /aprovar (handoff → aguardando hierarquização)
STATUS_PRE_APROVACAO = frozenset({"em_analise", "aprovada"})

# Universo AHP comparável (rodada ativa ou fila)
STATUS_UNIVERSO_AHP = frozenset(
    {"elegivel_ahp", "fila_hierarquizacao", "em_hierarquizacao", "hierarquizado"}
)

# Rótulos de exibição por tipo (plano / programa / projeto) — Camada 2 e pós-hierarquizado
_STATUS_T = ("plano", "programa", "projeto")


def _rotulos_tipo(*, plano: str, programa: str, projeto: str) -> dict[str, str]:
    return {"plano": plano, "programa": programa, "projeto": projeto}


STATUS_ROTULOS_POR_TIPO: dict[str, dict[str, str]] = {
    "elegivel_ahp": _rotulos_tipo(
        plano="Plano aguardando hierarquização",
        programa="Programa aguardando hierarquização",
        projeto="Projeto aguardando hierarquização",
    ),
    "fila_hierarquizacao": _rotulos_tipo(
        plano="Plano na fila de hierarquização",
        programa="Programa na fila de hierarquização",
        projeto="Projeto na fila de hierarquização",
    ),
    "em_hierarquizacao": _rotulos_tipo(
        plano="Plano em hierarquização",
        programa="Programa em hierarquização",
        projeto="Projeto em hierarquização",
    ),
    "hierarquizado": _rotulos_tipo(
        plano="Plano hierarquizado",
        programa="Programa hierarquizado",
        projeto="Projeto hierarquizado",
    ),
    "em_execucao": _rotulos_tipo(
        plano="Plano em execução",
        programa="Programa em execução",
        projeto="Projeto em execução",
    ),
    "finalizado": _rotulos_tipo(
        plano="Plano finalizado",
        programa="Programa finalizado",
        projeto="Projeto finalizado",
    ),
    "cancelado": _rotulos_tipo(
        plano="Plano cancelado",
        programa="Programa cancelado",
        projeto="Projeto cancelado",
    ),
    "suspenso": _rotulos_tipo(
        plano="Plano suspenso",
        programa="Programa suspenso",
        projeto="Projeto suspenso",
    ),
    "retirado": _rotulos_tipo(
        plano="Plano retirado do ranking",
        programa="Programa retirado do ranking",
        projeto="Projeto retirado do ranking",
    ),
    "arquivada": _rotulos_tipo(
        plano="Plano arquivado",
        programa="Programa arquivado",
        projeto="Projeto arquivado",
    ),
}


def rotulo_status_demanda(
    *,
    codigo: str,
    nome: str,
    tipo: str | None = None,
) -> str:
    """Rótulo amigável: Camada 1 usa ``nome`` do banco; demais camadas usam prefixo por tipo."""
    if tipo and tipo in _STATUS_T:
        tipado = STATUS_ROTULOS_POR_TIPO.get(codigo, {}).get(tipo)
        if tipado:
            return tipado
    return nome
