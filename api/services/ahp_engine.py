"""Motor AHP (fonte da verdade no servidor).

Espelha ``ahp/js/ahp-core.js``: vetor de prioridades pelo método da média
geométrica e métricas de consistência (λmax, IC, IA/RI, RC).
"""
from __future__ import annotations

from typing import Any

# Índice aleatório (Saaty) por dimensão da matriz.
_RI_BY_N = {1: 0.0, 2: 0.0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}


def random_index(n: int) -> float:
    """Índice aleatório (IA) para uma matriz n×n."""
    if n <= 2:
        return 0.0
    return _RI_BY_N.get(n, 1.49)


def priority_vector(matrix: list[list[float]]) -> list[float]:
    """Autovetor principal aproximado (média geométrica normalizada)."""
    n = len(matrix)
    geo: list[float] = []
    for i in range(n):
        prod = 1.0
        for j in range(n):
            prod *= float(matrix[i][j])
        geo.append(prod ** (1.0 / n))
    total = sum(geo) or 1.0
    return [g / total for g in geo]


def consistency(matrix: list[list[float]], weights: list[float]) -> dict[str, float]:
    """Métricas de consistência: λmax, IC, IA (RI) e RC."""
    n = len(matrix)
    if n < 2:
        return {"lambdaMax": float(n), "CI": 0.0, "CR": 0.0, "RI": 0.0}
    lambda_max = 0.0
    for i in range(n):
        row_sum = sum(float(matrix[i][j]) * weights[j] for j in range(n))
        lambda_max += row_sum / weights[i]
    lambda_max /= n
    ci = (lambda_max - n) / (n - 1)
    ri = random_index(n)
    cr = ci / ri if (n > 2 and ri > 0) else 0.0
    return {"lambdaMax": lambda_max, "CI": ci, "CR": cr, "RI": ri}


def analyze_matrix(matrix: list[list[float]]) -> dict[str, Any]:
    """Pesos + métricas de consistência para uma matriz pareada."""
    weights = priority_vector(matrix)
    return {"weights": weights, **consistency(matrix, weights)}
