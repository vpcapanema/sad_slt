"""Análise descritiva da saída persistida. Sem classificação ou inferência temática.

As medidas são calculadas sobre todos os registros do recorte; apenas a tabela
e o mapa são paginados. Feições de origem usam (camada_origem, fid_origem),
nunca id_origem, que pode estar ausente ou repetido.
"""
from collections import Counter, defaultdict
import json
import math
from statistics import mean, median


def presente(value):
    return value is not None and value != '' and not (isinstance(value, float) and not math.isfinite(value))


def chave(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


def identidade(row):
    if presente(row.get('camada_origem')) and presente(row.get('fid_origem')):
        return chave([row['camada_origem'], row['fid_origem']])
    if presente(row.get('fid_entrada')):
        return chave(['entrada', row['fid_entrada']])
    return None


def campo_presenca(d):
    """Aceita metadados explícitos e o contrato emitido pelas versões anteriores."""
    if d.get('papel_analitico') == 'correspondencias':
        return 'contagem'
    if d.get('campo_origem') is None and any((d.get('apelido') or '').endswith(s) for s in (
            ' · nº de feições intersectadas', ' · nº de feições tocadas')):
        return 'contagem'
    if d.get('campo_origem') is None and d.get('regra') == 'unidade de recorte' and (d.get('apelido') or '').endswith(' · posição da feição'):
        return 'identificador'
    if d.get('papel_analitico') == 'presenca':
        return 'binaria'
    return None


def correspondencia(row, fields):
    values = []
    for d in fields:
        kind, value = campo_presenca(d), row.get(d['campo'])
        if not kind:
            continue
        if kind == 'identificador':
            values.append(presente(value))
        elif kind == 'contagem' and isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0:
            values.append(value > 0)
        elif kind == 'binaria' and value in ('Sim', 'sim', 'Não', 'não', True, False):
            values.append(value in ('Sim', 'sim', True))
    return True if any(values) else False if values else None


def analisar(linhas, dicionario, categorias=(), *, categoria='', base='', origem='', campo='',
             valor='', busca='', ordem='origem', descendente=False, pagina=0, tamanho=25):
    campos = {d['campo']: d for d in dicionario}
    for row in linhas:
        for name in row:
            campos.setdefault(name, {'campo': name, 'tema': 'Entrada'})
    grupos = defaultdict(list)
    for d in campos.values():
        if d.get('tema') and d['tema'] != 'Entrada' and d.get('base'):
            grupos[(d['tema'], d['base'])].append(d)
    conceitos = {c['nome']: c.get('conceito', '') for c in categorias}
    temas = sorted({t for t, _ in grupos})
    if categoria and categoria not in temas:
        raise ValueError('Categoria não encontrada nesta saída.')
    bases = sorted({b for t, b in grupos if not categoria or t == categoria})
    if base and base not in bases:
        raise ValueError('Base não encontrada neste recorte.')
    campos_visiveis = [d for d in campos.values() if d.get('papel_analitico') not in ('linhagem','geometria_tecnica') and (not categoria or d.get('tema') == categoria)
                       and (not base or d.get('base') == base)]
    if campo and campo not in {d['campo'] for d in campos_visiveis}:
        raise ValueError('Campo não encontrado neste recorte.')
    if not campo:
        campo = next((d['campo'] for d in campos_visiveis if d.get('campo_origem') and d.get('tema') != 'Entrada'), '')
        campo = campo or next((d['campo'] for d in campos_visiveis), '')
    indexed = list(enumerate(linhas))
    origens = {}
    for _, row in indexed:
        ident = identidade(row)
        if ident is not None:
            label = row.get('id_origem') if presente(row.get('id_origem')) else row.get('fid_origem', row.get('fid_entrada'))
            origens[ident] = f"{row.get('camada_origem', 'Entrada')} · {label} · feição {row.get('fid_origem', row.get('fid_entrada'))}"
    filtered = [(i, r) for i, r in indexed if (not origem or identidade(r) == origem)
                and (not busca or busca.casefold() in ' '.join(str(v) for v in r.values() if presente(v)).casefold())
                and (not valor or chave(r.get(campo)) == valor)]
    # Categoria/base selecionam o assunto; não removem ausências de correspondência.
    selected_groups = {k: v for k, v in grupos.items() if (not categoria or k[0] == categoria) and (not base or k[1] == base)}
    ids = {identidade(r) for _, r in filtered}
    identificadas = None if None in ids else len(ids)
    cobertura = []
    def contar(states):
        positivos, negativos, desconhecidos = set(), set(), set()
        for i, row, state in states:
            ident = identidade(row) if identificadas is not None else f'registro:{i}'
            (positivos if state is True else negativos if state is False else desconhecidos).add(ident)
        negativos -= positivos | desconhecidos
        desconhecidos -= positivos
        return {'com': len(positivos), 'sem': len(negativos), 'nao_informado': len(desconhecidos),
                'total': len(positivos | negativos | desconhecidos), 'identidade_disponivel': identificadas is not None}
    for (tema, nome), fields in selected_groups.items():
        cobertura.append({'categoria': tema, 'base': nome,
                          **contar((i, r, correspondencia(r, fields)) for i, r in filtered)})
    cobertura_categorias = []
    for tema in sorted({t for t, _ in selected_groups}):
        bases_tema = [fields for (t, _), fields in selected_groups.items() if t == tema]
        def estados_categoria():
            for i, row in filtered:
                states = [correspondencia(row, fields) for fields in bases_tema]
                yield i, row, True if True in states else None if None in states else False
        cobertura_categorias.append({'categoria': tema, **contar(estados_categoria())})
    valores = [r.get(campo) for _, r in filtered]
    validos = [v for v in valores if presente(v)]
    numeric = bool(validos) and all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in validos)
    frequencias = Counter(chave(v) for v in validos)
    distribuicao = [{'valor': json.loads(k), 'chave': k, 'n': n} for k, n in sorted(frequencias.items(), key=lambda p: (-p[1], p[0]))[:20]]
    histograma, estatisticas = [], None
    if numeric:
        minimo, maximo = min(validos), max(validos)
        estatisticas = {'n': len(validos), 'minimo': minimo, 'maximo': maximo, 'media': mean(validos), 'mediana': median(validos)}
        n_bins = min(10, len(frequencias))
        if minimo == maximo:
            histograma = [{'de': minimo, 'ate': maximo, 'n': len(validos), 'ultimo': True}]
        else:
            # Normalização evita overflow na diferença entre extremos finitos.
            escala = max(abs(minimo), abs(maximo), 1)
            low, high = minimo / escala, maximo / escala
            counts = [0] * n_bins
            for v in validos:
                counts[min(n_bins - 1, int(((v / escala - low) / (high - low)) * n_bins))] += 1
            histograma = [{'de': (low + (high - low) * i / n_bins) * escala,
                          'ate': (low + (high - low) * (i + 1) / n_bins) * escala,
                          'n': n, 'ultimo': i == n_bins - 1} for i, n in enumerate(counts)]
    def sort_key(pair):
        value = pair[1].get(campo) if ordem == 'valor' else origens.get(identidade(pair[1]), str(pair[0]))
        return (not presente(value), 0 if isinstance(value, (int, float)) else 1,
                value if isinstance(value, (int, float)) and presente(value) else str(value).casefold())
    filtered.sort(key=sort_key, reverse=descendente)
    if ordem == 'valor':
        filtered.sort(key=lambda pair: not presente(pair[1].get(campo)))
    pagina = min(max(0, pagina), max(0, (len(filtered) - 1) // tamanho))
    page = filtered[pagina*tamanho:(pagina+1)*tamanho]
    comparacao = []
    for i, row in page:
        comparacao.append({'posicao': i, 'origem': origens.get(identidade(row), 'Identificação de origem não disponível'),
                           'origem_id': identidade(row), 'registro': row.get('id_registro', i + 1),
                           'valor': row.get(campo), 'atributos': row,
                           'bases': [{'categoria': t, 'base': b, 'corresponde': correspondencia(row, fields)}
                                     for (t, b), fields in selected_groups.items()]})
    return {'categorias': [{'nome': t, 'conceito': conceitos.get(t, '')} for t in temas], 'bases': bases,
            'origens': [{'id': k, 'nome': v} for k, v in sorted(origens.items(), key=lambda p: p[1])],
            'campos': campos_visiveis, 'campo': campo, 'fonte_campo': campos.get(campo),
            'resumo': {'registros': len(filtered), 'feicoes_entrada': identificadas,
                       'preenchidos': len(validos), 'ausentes': len(valores)-len(validos), 'distintos': len(frequencias)},
            'cobertura': cobertura, 'cobertura_categorias': cobertura_categorias, 'distribuicao': distribuicao,
            'outros': sum(frequencias.values())-sum(d['n'] for d in distribuicao),
            'histograma': histograma, 'estatisticas': estatisticas, 'linhas': comparacao, 'pagina': pagina,
            'paginas': math.ceil(len(filtered)/tamanho), 'tamanho_pagina': tamanho}


def carregar(ident, user, camada, *, consultar, repo, carregar_conceitos, representar_mapa, **filtros):
    """Leitura autorizada da saída integral; mapa e tabela compartilham a página."""
    job = consultar(ident, user, completo=True)
    result = job.get('resultado') or {}
    if job['status'] != 'concluido':
        raise LookupError('A análise estará disponível quando o processamento terminar.')
    recurso = ((result.get('camadas', {}).get(camada) or {}).get('camada_resultado_id')
               if result.get('modo') == 'enriquecimento' else
               result.get('camada_resultado_id') if camada == 'resultado' else None)
    if not recurso:
        raise LookupError('Camada de saída não encontrada nesta extração.')
    loaded = repo.atributos_dashboard(recurso)
    if loaded is None:
        raise LookupError('Camada de saída não encontrada.')
    rows = [r['propriedades'] for r in loaded]
    if result.get('fonte_analitica') == 'camada_saida':
        from api.services.extracao_saida_analitica import CAMPO_ESQUEMA
        esquema = json.loads(rows[0][CAMPO_ESQUEMA]) if rows else {}
        dictionary = esquema.get('dicionario', [])
        categories = esquema.get('categorias', [])
        conceito_origem = 'Conceitos preservados na camada de saída'
    else:
        dictionary = [d for d in result.get('dicionario', []) if d.get('camada') == camada]
        # Execuções históricas de interseção têm a linhagem no contrato da tabela.
        if not dictionary:
            for group in result.get('tabela_saida', {}).get('grupos', []):
                for field in group['campos']:
                    dictionary.append({'campo':field,'tema':group['categoria'],'base':group['camada'],
                                       'papel_analitico':'presenca' if field.endswith('__presenca') else None})
        categories = result.get('categorias_analiticas') or result.get('categorias') or []
        conceito_origem = 'Conceitos registrados na execução'
        if not categories:
            categories = carregar_conceitos()
            conceito_origem = 'Conceitos atuais do catálogo; não versionados nesta execução'
    data = analisar(rows, dictionary, categories, **filtros)
    positions = [r['posicao'] for r in data['linhas']]
    data['mapa'] = {'type':'FeatureCollection','features':[]}
    data['representacao_mapa'] = {'metodo':'original'}
    if positions:
        ordens = {loaded[p]['ordem']:p for p in positions}
        geometrias = repo.geometrias_dashboard(recurso, list(ordens))
        features = [{'type':'Feature','geometry':r['geometria'],'properties':{'posicao':ordens[r['ordem']]}}
                    for r in geometrias if r['geometria'] is not None]
        if features:
            data['mapa'], data['representacao_mapa'] = representar_mapa(features)
    data.update({'execucao':str(ident),'camada':camada,'criado_em':result.get('criado_em'),
                 'conceito_origem':conceito_origem})
    return data
