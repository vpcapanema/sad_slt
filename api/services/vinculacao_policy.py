"""Elegibilidade única para opções públicas e gravação de vínculos."""
from api.exceptions import DemandaValidationError

# Demandas reprovadas, em complementação ou em análise não são pais disponíveis.
STATUS_VINCULAVEIS = frozenset({
    "analise_aprovada", "hierarq_em_andamento", "hierarq_finalizada",
    "hierarq_ranqueada", "hierarq_homologada", "hierarq_publicada",
    "exec_em_execucao", "exec_finalizada",
})


def elegivel(row: dict) -> bool:
    return row.get("status") in STATUS_VINCULAVEIS


def exigir_elegivel(row: dict | None, field: str) -> dict:
    if not row or not elegivel(row):
        raise DemandaValidationError("O vínculo selecionado não está disponível para cadastro.", field=field)
    return row
