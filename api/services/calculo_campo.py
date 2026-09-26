"""Cálculo atributivo com escopo explícito, preservando linhas não abrangidas."""
import re

import pandas as pd

from api.services.expressoes_atributos import avaliar, selecionar


def calcular(frame, campo, expressao, chaves=None, filtro=None, ids=None):
    if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', campo) or campo == frame.geometry.name:
        raise ValueError('Nome de campo inválido ou reservado para geometria.')
    if not expressao.strip():
        raise ValueError('Informe a expressão de cálculo')
    result = frame.copy()
    positions = pd.Series(range(len(frame)), index=frame.index)
    selected = selecionar(frame, filtro) if filtro else frame
    mask = positions.isin(positions.loc[selected.index])
    if chaves is not None:
        identities = [str(value) for value in (ids if ids is not None else frame.index)]
        keys = set(map(str, chaves))
        if not keys.issubset(set(identities)):
            raise ValueError('A seleção mudou. Recarregue a camada antes de calcular.')
        mask &= pd.Series([value in keys for value in identities], index=frame.index)
    count = int(mask.sum())
    if not count:
        raise ValueError('Nenhuma feição corresponde ao escopo do cálculo.')
    values = avaliar(frame.loc[mask], expressao)
    if campo not in result.columns:
        result[campo] = None
    # O campo calculado pode mudar de tipo; fora do escopo mantém seus valores.
    result[campo] = result[campo].astype(object)
    result.loc[mask, campo] = values
    result[campo] = result[campo].infer_objects()
    return result, count
