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

# Status — fases do ciclo de vida (demandas.dom_status_demanda.fase)
STATUS_FASE_CADASTRO_ANALISE = "cadastro_analise"
STATUS_FASE_HIERARQUIZACAO = "hierarquizacao"
STATUS_FASE_EXECUCAO = "execucao"

STATUS_INICIAL_DEMANDA = "analise_rascunho"
STATUS_POS_APROVACAO = "hierarq_apta"
# Confirmação do universo da análise (módulo de configuração) move a demanda
# de "apta" para "em hierarquização" — todo o Bloco 2 vive neste status.
STATUS_EM_HIERARQUIZACAO = "hierarq_em_andamento"

# Origens permitidas para POST /aprovar (handoff → apta à hierarquização)
STATUS_PRE_APROVACAO = frozenset({"analise_em_avaliacao", "analise_aprovada"})

# Universo AHP comparável (apta, em hierarquização ou já hierarquizada/salva)
STATUS_UNIVERSO_AHP = frozenset(
    {"hierarq_apta", "hierarq_em_andamento", "hierarq_finalizada"}
)

# Rótulos de exibição por tipo (plano / programa / projeto) — Camada 2 e pós-hierarquizado
_STATUS_T = ("plano", "programa", "projeto")


def _rotulos_tipo(*, plano: str, programa: str, projeto: str) -> dict[str, str]:
    return {"plano": plano, "programa": programa, "projeto": projeto}


STATUS_ROTULOS_POR_TIPO: dict[str, dict[str, str]] = {
    "hierarq_apta": _rotulos_tipo(
        plano="Plano apto à hierarquização",
        programa="Programa apto à hierarquização",
        projeto="Projeto apto à hierarquização",
    ),
    "hierarq_em_andamento": _rotulos_tipo(
        plano="Plano em hierarquização",
        programa="Programa em hierarquização",
        projeto="Projeto em hierarquização",
    ),
    "hierarq_finalizada": _rotulos_tipo(
        plano="Plano hierarquizado (não publicado)",
        programa="Programa hierarquizado (não publicado)",
        projeto="Projeto hierarquizado (não publicado)",
    ),
    "hierarq_ranqueada": _rotulos_tipo(
        plano="Plano ranqueado",
        programa="Programa ranqueado",
        projeto="Projeto ranqueado",
    ),
    "hierarq_suspensa": _rotulos_tipo(
        plano="Plano suspenso na hierarquização",
        programa="Programa suspenso na hierarquização",
        projeto="Projeto suspenso na hierarquização",
    ),
    "hierarq_retirada": _rotulos_tipo(
        plano="Plano retirado do ranking",
        programa="Programa retirado do ranking",
        projeto="Projeto retirado do ranking",
    ),
    "exec_em_execucao": _rotulos_tipo(
        plano="Plano em execução",
        programa="Programa em execução",
        projeto="Projeto em execução",
    ),
    "exec_suspensa": _rotulos_tipo(
        plano="Plano com execução suspensa",
        programa="Programa com execução suspensa",
        projeto="Projeto com execução suspensa",
    ),
    "exec_finalizada": _rotulos_tipo(
        plano="Plano finalizado",
        programa="Programa finalizado",
        projeto="Projeto finalizado",
    ),
    "exec_cancelada": _rotulos_tipo(
        plano="Plano cancelado",
        programa="Programa cancelado",
        projeto="Projeto cancelado",
    ),
}


def rotulo_status_demanda(
    *,
    codigo: str,
    nome: str,
    tipo: str | None = None,
) -> str:
    """Rótulo amigável: Fase 1 usa ``nome`` do banco; demais fases usam prefixo por tipo."""
    if tipo and tipo in _STATUS_T:
        tipado = STATUS_ROTULOS_POR_TIPO.get(codigo, {}).get(tipo)
        if tipado:
            return tipado
    return nome
