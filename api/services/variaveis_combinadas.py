"""Aritmetica auditavel de indicadores, sem executar expressoes como codigo."""
from __future__ import annotations

import ast
import math
import operator
from collections.abc import Mapping


def calcular(formula: str, valores: Mapping[str, float | None]) -> float | None:
    operations = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul}

    def visit(node):
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Name):
            if node.id not in valores:
                raise ValueError(f'Campo de origem ausente: {node.id}.')
            value = valores[node.id]
            if value is None:
                return None
            if not isinstance(value, (float, int)) or isinstance(value, bool) or not math.isfinite(value):
                raise ValueError(f'Valor nao numerico ou nao finito: {node.id}.')
            return value
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            if not math.isfinite(node.value):
                raise ValueError('Constante nao finita.')
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in (*operations, ast.Div):
            left, right = visit(node.left), visit(node.right)
            if left is None or right is None:
                return None
            if isinstance(node.op, ast.Div):
                return None if right <= 0 else left / right
            return operations[type(node.op)](left, right)
        raise ValueError('Formula invalida: somente campos, constantes e +, -, *, / sao permitidos.')

    try:
        result = visit(ast.parse(formula, mode='eval'))
    except SyntaxError as exc:
        raise ValueError('Sintaxe de formula invalida.') from exc
    if result is not None and not math.isfinite(result):
        raise ValueError('Resultado nao finito.')
    return result
