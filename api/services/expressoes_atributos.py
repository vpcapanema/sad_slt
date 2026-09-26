"""Expressões atributivas sem chamadas de funções ou acesso ao ambiente Python."""
import ast
import operator

import pandas as pd

BINARY = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
          ast.Div: operator.truediv, ast.Mod: operator.mod}
COMPARE = {ast.Eq: operator.eq, ast.NotEq: operator.ne, ast.Lt: operator.lt,
           ast.LtE: operator.le, ast.Gt: operator.gt, ast.GtE: operator.ge}


def avaliar(frame, expression):
    def visit(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, (str, int, float, bool, type(None))):
            return node.value
        if isinstance(node, ast.Name) and node.id in frame.columns and node.id != frame.geometry.name:
            return frame[node.id]
        if isinstance(node, (ast.List, ast.Tuple)):
            return [visit(item) for item in node.elts]
        if isinstance(node, ast.BinOp) and type(node.op) in BINARY:
            return BINARY[type(node.op)](visit(node.left), visit(node.right))
        if isinstance(node, ast.UnaryOp):
            value = visit(node.operand)
            if isinstance(node.op, ast.USub): return -value
            if isinstance(node.op, ast.UAdd): return +value
            if isinstance(node.op, ast.Not): return ~value if isinstance(value, pd.Series) else not value
        if isinstance(node, ast.BoolOp):
            values = [visit(value) for value in node.values]
            result = values[0]
            for value in values[1:]:
                result = (result & value) if isinstance(node.op, ast.And) else (result | value)
            return result
        if isinstance(node, ast.Compare):
            left, result = visit(node.left), True
            for op, comparator in zip(node.ops, node.comparators):
                right = visit(comparator)
                if type(op) in COMPARE:
                    current = COMPARE[type(op)](left, right)
                elif isinstance(op, (ast.In, ast.NotIn)) and isinstance(left, pd.Series) and isinstance(right, list):
                    current = left.isin(right)
                    if isinstance(op, ast.NotIn): current = ~current
                else: raise ValueError('Operador de comparação não permitido.')
                result = result & current
                left = right
            return result
        raise ValueError('Use campos, valores e operadores; chamadas de funções não são permitidas.')
    try:
        tree = ast.parse(expression, mode='eval')
        if len(list(ast.walk(tree))) > 200:
            raise ValueError('Expressão muito complexa.')
        return visit(tree.body)
    except (SyntaxError, TypeError, KeyError, ZeroDivisionError) as exc:
        raise ValueError('Expressão atributiva inválida.') from exc


def selecionar(frame, expression):
    mask = avaliar(frame, expression)
    if isinstance(mask, bool):
        return frame.copy() if mask else frame.iloc[:0].copy()
    if not isinstance(mask, pd.Series) or not pd.api.types.is_bool_dtype(mask.dtype):
        raise ValueError('A consulta deve produzir uma condição verdadeira ou falsa.')
    return frame.loc[mask.fillna(False)].copy()
