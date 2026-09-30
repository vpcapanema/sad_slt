"""Filtros da matriz, aplicados às demandas antes da paginação."""
import json
import math


def valores(item, campo, areas):
    if campo == 'demanda': return [item['nome_demanda']]
    if campo in ('risco', 'restricao'):
        return [{'com':'Sim','sem':'Não','nao_avaliado':'Não avaliado','nao_informado':'Não informado'}.get(item['estados'].get(campo),'Não avaliado')]
    try: categoria, atributo = json.loads(campo)
    except (ValueError, TypeError): return []
    return [areas[a]['atributos'].get(atributo) for a in item['areas'] if a in areas and areas[a]['categoria']==categoria]


def numero(v):
    if v is None or isinstance(v, bool): return None
    try: n = float(v)
    except (ValueError, TypeError): return None
    return n if math.isfinite(n) else None


def corresponde(item, filtro, areas):
    vals = valores(item, filtro['campo'], areas)
    if filtro.get('operador') == 'vazio': return not vals or all(v is None or v == '' for v in vals)
    if filtro.get('operador') == 'intervalo':
        minimo, maximo = filtro.get('minimo'), filtro.get('maximo')
        if minimo is None and maximo is None: return True
        return any(n is not None and (minimo is None or n >= minimo) and (maximo is None or n <= maximo) for n in map(numero, vals))
    escolhidos = filtro.get('valores') or []
    if not escolhidos: return True
    return any(v in escolhidos for v in vals)


def ativo(filtro):
    if not filtro.get('campo'): return False
    if filtro.get('operador') == 'intervalo':
        return filtro.get('minimo') is not None or filtro.get('maximo') is not None
    return filtro.get('operador') == 'vazio' or bool(filtro.get('valores'))


def aplicar(items, filtros, combinacao, areas):
    ativos = [f for f in filtros if ativo(f)]
    if not ativos: return items
    combinar = any if combinacao == 'ou' else all
    return [i for i in items if combinar(corresponde(i,f,areas) for f in ativos)]


def opcoes(items, filtros, combinacao, areas):
    resultado = {}
    for index, f in enumerate(filtros):
        campo = f.get('campo')
        if not campo: continue
        contexto = aplicar(items, [outro for j,outro in enumerate(filtros) if j!=index], 'e', areas) if combinacao=='e' else items
        unicos = {}
        for item in contexto:
            for v in valores(item,campo,areas):
                key = json.dumps(v,ensure_ascii=False,sort_keys=True)
                unicos[key] = v
        nums = [numero(v) for v in unicos.values() if v is not None and v != '']
        resultado[campo] = {'valores':list(unicos.values()), 'numerico':bool(nums) and all(v is not None for v in nums),
            'minimo':min(nums) if nums and all(v is not None for v in nums) else None,
            'maximo':max(nums) if nums and all(v is not None for v in nums) else None}
    return resultado
