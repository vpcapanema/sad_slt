"""Persistencia anonima da pesquisa de experiencia."""
from __future__ import annotations

from typing import Any

from psycopg.errors import ForeignKeyViolation

from api.db.connection import get_connection
from api.exceptions import DemandaValidationError


def listar_hierarquizacoes() -> list[dict[str, Any]]:
    """Retorna apenas os campos de identificação usados no seletor da pesquisa."""
    with get_connection() as conn:
        return conn.execute(
            """SELECT id, nome, codigo
               FROM hierarquizacao_demandas.hierarquizacao_portfolio
               ORDER BY lower(nome), codigo"""
        ).fetchall()


def criar(dados: dict[str, Any], indice_experiencia: float) -> None:
    try:
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO pesquisa.feedback_experiencia (
                   escopo, perfil, hierarquizacao_id, frequencia_uso, funcionalidade_mais_utilizada, escala_maxima,
                   facilidade, autonomia, clareza_interface, compreensao_resultados,
                   desempenho, satisfacao_geral, indice_experiencia,
                   principal_dificuldade, melhoria_prioritaria, criticas_sugestoes_elogios
               ) VALUES (
                   %(escopo)s, %(perfil)s, %(hierarquizacao_id)s, %(frequencia_uso)s, %(funcionalidade_mais_utilizada)s, %(escala_maxima)s,
                   %(facilidade)s, %(autonomia)s, %(clareza_interface)s, %(compreensao_resultados)s,
                   %(desempenho)s, %(satisfacao_geral)s, %(indice_experiencia)s,
                   %(principal_dificuldade)s, %(melhoria_prioritaria)s, %(criticas_sugestoes_elogios)s
               )""",
                {"perfil": None, "hierarquizacao_id": None, **dados, "indice_experiencia": indice_experiencia},
            )
    except ForeignKeyViolation as exc:
        if exc.diag.constraint_name == "fk_feedback_experiencia_hierarquizacao":
            raise DemandaValidationError(
                "A hierarquização selecionada não está disponível. Recarregue a página e selecione outra.",
                field="hierarquizacao_id",
            ) from exc
        raise
