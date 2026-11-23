"""Persistencia anonima da pesquisa de experiencia."""
from __future__ import annotations

from typing import Any

from api.db.connection import get_connection


def criar(dados: dict[str, Any], indice_experiencia: float) -> None:
    with get_connection() as conn:
        conn.execute(
            """INSERT INTO pesquisa.feedback_experiencia (
                   escopo, perfil, frequencia_uso, funcionalidade_mais_utilizada, escala_maxima,
                   facilidade, autonomia, clareza_interface, compreensao_resultados,
                   desempenho, satisfacao_geral, indice_experiencia,
                   principal_dificuldade, melhoria_prioritaria, criticas_sugestoes_elogios
               ) VALUES (
                   %(escopo)s, %(perfil)s, %(frequencia_uso)s, %(funcionalidade_mais_utilizada)s, %(escala_maxima)s,
                   %(facilidade)s, %(autonomia)s, %(clareza_interface)s, %(compreensao_resultados)s,
                   %(desempenho)s, %(satisfacao_geral)s, %(indice_experiencia)s,
                   %(principal_dificuldade)s, %(melhoria_prioritaria)s, %(criticas_sugestoes_elogios)s
               )""",
            {**dados, "indice_experiencia": indice_experiencia},
        )
