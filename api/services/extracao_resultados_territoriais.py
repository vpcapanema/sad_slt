"""Consulta descritiva por camada de entrada; preserva ausência de evidência."""
from collections import defaultdict
import math

from api.services.extracao_atributos_dashboard import chave, presente, identidade, correspondencia
from api.services.extracao_intersecoes_territoriais import tipo_categoria

TIPOS = ('restricao', 'risco')


def legado(result, tabelas):
    snapshot = {'versao': 0, 'entradas': [], 'bases': [], 'areas': {}}
    entries, bases = {}, {}
    for name, loaded in tabelas.items():
        fields = [d for d in result.get('dicionario', []) if d.get('camada') == name]
        groups = defaultdict(list)
        for field in fields:
            tipo = tipo_categoria(field.get('tema'))
            if tipo and field.get('base'):
                groups[(tipo, field['base'])].append(field)
        for (tipo, base), fs in groups.items():
            bid = chave([tipo, base])
            # Ligação por atributo e outros predicados não comprovam interseção.
            spatial = any(d.get('regra') == 'Contagem espacial de feições' or
                          (d.get('regra') or '').startswith('localização (intersecta)') for d in fs)
            bases.setdefault(bid, {'id': bid, 'nome': base, 'categoria': tipo, 'espacial': spatial,
                                   'cobertura_completa': False})
        for stored in loaded:
            row = stored['propriedades']
            ident = identidade(row)
            if ident is None:
                continue
            entry_name = row.get('camada_origem') or result.get('input_nome') or 'Entrada'
            entry = entries.setdefault(entry_name, {})
            item = entry.setdefault(ident, {'fid': row.get('fid_origem', row.get('fid_entrada')),
                                            'identificador': row.get('id_origem'), 'atributos': {}, 'areas': [], 'bases_intersectadas': [],
                                            'estados_bases': {}, '_mapa': [], 'geometria_disponivel': True})
            item['_mapa'].append({'saida': name, 'ordem': stored['ordem']})
            item['atributos'].update({d['campo']: row.get(d['campo']) for d in fields if d.get('tema') == 'Entrada'})
            for (tipo, base), fs in groups.items():
                bid = chave([tipo, base])
                state = correspondencia(row, fs) if bases[bid]['espacial'] else None
                previous = item['estados_bases'].get(bid, [])
                previous.append(state)
                item['estados_bases'][bid] = previous
                if state is True and bid not in item['bases_intersectadas']:
                    item['bases_intersectadas'].append(bid)
                fid_field = next((d['campo'] for d in fs if d.get('campo_origem') is None
                                  and (d.get('apelido') or '').endswith(' · posição da feição escolhida')), None)
                if state is True and fid_field and presente(row.get(fid_field)):
                    fid = row[fid_field]
                    aid = chave([tipo, base, fid])
                    snapshot['areas'].setdefault(aid, {'id': aid, 'base_id': bid, 'base': base, 'categoria': tipo, 'fid': fid,
                                                       'atributos': {d['campo_origem']: row.get(d['campo']) for d in fs if d.get('campo_origem')}})
                    if aid not in item['areas']:
                        item['areas'].append(aid)
                # Nas saídas binárias o nome da base é evidência; não inventamos área.
    # Algoritmos anteriores já preservavam pares no relatório de ocorrências.
    by_fid = defaultdict(list)
    for features in entries.values():
        for item in features.values():
            by_fid[str(item["fid"])].append(item)
    for category in result.get('categorias', []):
        tipo = tipo_categoria(category.get('id'), category.get('nome'))
        if not tipo:
            continue
        for base in category.get('camadas', []):
            bid = chave([tipo, base['id']])
            bases[bid] = {'id': bid, 'nome': base['nome'], 'categoria': tipo,
                          'espacial': True, 'cobertura_completa': False}
            for occurrence in base.get('ocorrencias', []):
                matched = occurrence.get('dentro') is True or (
                    occurrence.get('dimensao') in (1, 2) and (occurrence.get('medida_si') or 0) > 0)
                for item in by_fid.get(str(occurrence.get('input_id')), []):
                    item['atributos'].update(occurrence.get('atributos_input') or {})
                    if not matched:
                        if occurrence.get('dentro') is False:
                            item['estados_bases'].setdefault(bid, []).append(False)
                        continue
                    item['estados_bases'].setdefault(bid, []).append(True)
                    if bid not in item['bases_intersectadas']:
                        item['bases_intersectadas'].append(bid)
                    fid = occurrence.get('feicao_base_id')
                    if fid is None:
                        continue
                    aid = chave([bid, fid])
                    snapshot['areas'].setdefault(aid, {'id': aid, 'base_id': bid, 'base': base['nome'],
                                                       'categoria': tipo, 'fid': fid, 'atributos': occurrence.get('atributos') or {}})
                    if aid not in item['areas']:
                        item['areas'].append(aid)
    for entry_name, features in entries.items():
        for item in features.values():
            item['estados_bases'] = {bid: True if True in states else None if None in states else False
                                     for bid, states in item['estados_bases'].items()}
        snapshot['entradas'].append({'nome': entry_name, 'feicoes': list(features.values())})
    snapshot['bases'] = list(bases.values())
    return snapshot


def estado(snapshot, feature, tipo):
    if snapshot.get('fonte') == 'camada_saida':
        return ('com' if feature['flags'][tipo] else 'sem') if feature.get('flags', {}).get(tipo) is not None else 'nao_avaliado'
    bases = [b for b in snapshot['bases'] if b['categoria'] == tipo]
    if not bases:
        return 'nao_avaliado'
    if any(b['id'] in feature['bases_intersectadas'] for b in bases):
        return 'com'
    if snapshot['versao'] == 0:
        states = [feature.get('estados_bases', {}).get(b['id']) for b in bases]
        return 'sem' if all(s is False for s in states) else 'nao_informado'
    if not feature.get('geometria_disponivel') or not all(b['cobertura_completa'] for b in bases):
        return 'nao_informado'
    return 'sem'


def agrupar_demandas(snapshot):
    """Uma linha por camada; agrega pares já calculados, sem novo cruzamento."""
    from collections import Counter
    entries = []
    for entry in snapshot['entradas']:
        features = entry['feicoes']
        areas = list(dict.fromkeys(a for f in features for a in f['areas']))
        relacoes = {}
        for aid in areas:
            pares = [f['relacoes'][aid] for f in features if aid in f.get('relacoes', {})]
            metric = {'por_categoria': {}, 'feicoes_correspondentes': sum(aid in f['areas'] for f in features)}
            for field in ('pontos', 'comprimento_m', 'area_m2', 'perimetro_m', 'comprimento_interior_m', 'comprimento_borda_m'):
                values = [m[field] for m in pares if m.get(field) is not None]
                metric[field] = sum(values) if values else None
            for m in pares:
                for categoria, value in m.get('por_categoria', {}).items():
                    metric['por_categoria'][categoria] = metric['por_categoria'].get(categoria, 0)+value
            tipos = {m.get('representacao_entrada') for m in pares}
            metric['representacao_entrada'] = next(iter(tipos)) if len(tipos) == 1 else 'mista'
            dimensoes = {'ponto': 0, 'linha': 1, 'poligono': 2}
            campos_dimensao = {0: 'pontos', 1: 'comprimento_m', 2: 'area_m2'}
            representacao = metric['representacao_entrada']
            dim = dimensoes.get(representacao) if isinstance(representacao, str) else None
            if dim is None:
                total, num = 0, None
            else:
                total = sum(
                    feature.get('metricas_totais', {}).get(
                        dim, feature.get('metricas_totais', {}).get(str(dim), 0)
                    )
                    for feature in features
                )
                num = metric.get(campos_dimensao[dim])
            metric['percentual_entrada'] = 100*num/total if total and num is not None else None
            metric['situacao'] = 'correspondencia_espacial'
            relacoes[aid] = metric
        flags = {}
        for tipo in TIPOS:
            states = [estado(snapshot, f, tipo) for f in features]
            flags[tipo] = 1 if 'com' in states else 0 if states and all(s == 'sem' for s in states) else None
        geometrias = [f['geometria'] for f in features if f.get('geometria')]
        entries.append({'nome': entry['nome'], 'feicoes': [{
            'fid': entry['nome'], 'identificador': entry['nome'], 'atributos': {}, 'areas': areas,
            'bases_intersectadas': list(dict.fromkeys(b for f in features for b in f['bases_intersectadas'])),
            'flags': flags, 'relacoes': relacoes, 'total_registros': len(features),
            'contagens': dict(Counter(snapshot['areas'][a]['categoria'] for a in areas)),
            '_mapa': [ref for f in features for ref in f.get('_mapa', [])],
            'geometria_disponivel': any(f.get('geometria_disponivel') for f in features),
            **({'geometria': {'type': 'GeometryCollection', 'geometries': geometrias}} if geometrias else {})}]})
    return {**snapshot, 'fonte': 'camada_saida', 'entradas': entries}


def nome_demanda(feature):
    """Rótulo legível da feição; o FID permanece sua identidade independente."""
    import unicodedata
    attrs = feature.get('atributos') or {}

    def normalizar(key):
        return ''.join(c for c in unicodedata.normalize('NFKD', str(key).casefold()) if not unicodedata.combining(c)).replace(' ', '_')
    campos = {normalizar(k): k for k in attrs}
    prioridades = ('titulo', 'title', 'nome_demanda', 'nome_projeto', 'nome_participante', 'participante', 'nome', 'name', 'denominacao', 'descricao')
    candidatos = [campos[k] for k in prioridades if k in campos]
    candidatos += [k for k in attrs if k not in candidatos and any(t in normalizar(k) for t in ('titulo', 'nome', 'name', 'denomin'))]
    for campo in candidatos:
        value = attrs[campo]
        if isinstance(value, str) and value.strip():
            return value.strip(), campo
    value = feature.get('identificador')
    if presente(value):
        return str(value), 'identificador'
    return str(feature.get('fid')), 'fid'


def consultar(snapshot, *, entrada='', feicao='', categoria='', base='', situacao='', busca='', pagina=0, tamanho=25, atributo='', agrupamento='feicao', filtros=None, combinacao='e'):
    del atributo
    if agrupamento == 'camada':
        snapshot = agrupar_demandas(snapshot)
    bases = {b['id']: b for b in snapshot['bases']}
    if categoria and categoria not in {b['categoria'] for b in bases.values()}:
        raise ValueError('Categoria não encontrada nas saídas desta execução.')
    all_items = []
    for entry in snapshot['entradas']:
        for feature in entry['feicoes']:
            # Snapshots anteriores já guardam as relações por elemento, mas
            # ainda não possuem o campo de contagens usado pelas tabelas.
            contagens = feature.get('contagens')
            if contagens is None:
                from collections import Counter
                contagens = dict(Counter(snapshot['areas'][aid]['categoria']
                                         for aid in set(feature['areas']) if aid in snapshot['areas']))
            all_items.append({**feature, 'entrada': entry['nome'], 'chave': chave([entry['nome'], feature['fid']]),
                              'nome_demanda': nome_demanda(feature)[0], 'campo_nome_demanda': nome_demanda(feature)[1],
                              'contagens': contagens,
                              'estados': {t: estado(snapshot, feature, t) for t in TIPOS},
                              'representacao_mapa': entry.get('representacao_mapa', {}).get('metodo', 'original')})

    def selected(item):
        if entrada and item['entrada'] != entrada or feicao and item['chave'] != feicao:
            return False
        if base and base not in item['bases_intersectadas']:
            return False
        if situacao and not any(item['estados'].get(t) == situacao for t in (TIPOS if not categoria else (categoria,))):
            return False
        if busca:
            source = [item['entrada'], item.get('identificador'), item['fid'], *item['atributos'].values()]
            for aid in item['areas']:
                area = snapshot['areas'][aid]
                source += [area['base'], *area['atributos'].values()]
            source += [bases[b]['nome'] for b in item['bases_intersectadas'] if b in bases]
            if busca.casefold() not in ' '.join(map(str, source)).casefold():
                return False
        return True
    items = sorted((item for item in all_items if selected(item)), key=lambda x: (x['entrada'], str(x.get('identificador') or ''), str(x['fid'])))
    from api.services.extracao_resultados_filtros import aplicar, opcoes as opcoes_filtro
    filtros = filtros or []
    valores_filtro = opcoes_filtro(items, filtros, combinacao, snapshot['areas'])
    items = aplicar(items, filtros, combinacao, snapshot['areas'])
    rankings = {}
    for tipo in TIPOS:
        ordered = sorted(items, key=lambda x, tipo=tipo: (-x.get('contagens', {}).get(tipo, 0), x['entrada'], str(x.get('identificador'))))
        previous, position = None, 0
        rankings[tipo] = []
        for index, item in enumerate(ordered):
            ocorrencias = item.get('contagens', {}).get(tipo, 0)
            if ocorrencias != previous:
                position = index+1
            previous = ocorrencias
            rankings[tipo].append({'chave': item['chave'], 'entrada': item['entrada'], 'demanda': item.get('identificador'),
                                   'ocorrencias': ocorrencias, 'posicao': position, 'estado': item['estados'][tipo]})
    items.sort(key=lambda x: (-x.get('contagens', {}).get(categoria or 'restricao', 0), x['entrada'], str(x.get('identificador'))))
    resumo_entradas = []
    for entry in snapshot['entradas']:
        group = [i for i in items if i['entrada'] == entry['nome']]
        if entrada and entry['nome'] != entrada:
            continue
        resumo_entradas.append({'nome': entry['nome'], 'total': len(group),
                                **{tipo: {s: sum(i['estados'][tipo] == s for i in group) for s in ('com', 'sem', 'nao_avaliado', 'nao_informado')} for tipo in TIPOS}})
    pagina = min(pagina, max(0, (len(items)-1)//tamanho))
    page = items[pagina*tamanho:(pagina+1)*tamanho]
    areas_used = {a for item in page for a in item['areas']}
    area_ids = {a for item in items for a in item['areas']}
    graph = []
    for b in bases.values():
        if categoria and b['categoria'] != categoria:
            continue
        known = [i for i in items if b['id'] in i['bases_intersectadas'] or
                 (i.get('estados_bases', {}).get(b['id']) is False if snapshot['versao'] == 0
                  else i.get('geometria_disponivel') and b['cobertura_completa'])]
        graph.append({'id': b['id'], 'nome': b['nome'], 'categoria': b['categoria'],
                      'feicoes': sum(b['id'] in i['bases_intersectadas'] for i in items) if known or not items else None,
                      'completa': len(known) == len(items)})

    def contar_estado(tipo):
        return sum(i['estados'][tipo] == 'com' for i in items) if not items or any(
            i['estados'][tipo] in ('com', 'sem') for i in items) else None
    from api.services import extracao_atributos_aliases as aliases
    from api.services.extracao_resultados_campos import metadado
    aliases_categorias, metadados_categorias = {}, {}
    comuns = {'populacao': 'População', 'renda_media': 'Renda média', 'area': 'Área', 'descricao': 'Descrição', 'codigo': 'Código', 'titulo': 'Título'}
    for a in snapshot['areas'].values():
        b = bases.get(a['base_id'], {})
        conhecidos = aliases.camada(b.get('origem_id'), b.get('nome'))['campos']
        rotulos = aliases_categorias.setdefault(a['categoria'], {})
        for campo in a['atributos']:
            fallback = b.get('apelidos', {}).get(campo) or conhecidos.get(campo) or comuns.get(campo.lower()) or aliases.automatico(campo)
            meta = metadado(campo, fallback)
            metadados_categorias.setdefault(a['categoria'], {})[campo] = meta
            rotulos[campo] = meta['alias']
    return {'opcoes_filtro': valores_filtro, 'metadados_categorias': metadados_categorias, 'aliases_categorias': aliases_categorias, 'campos_categorias': {cat: sorted({k for a in snapshot['areas'].values() if a['categoria'] == cat for k in a['atributos']}) for cat in {b['categoria'] for b in bases.values()}}, 'rankings': rankings, 'categorias': list({b['categoria']: b.get('categoria_nome', b['categoria']) for b in bases.values()}.items()),
            'legado': snapshot['versao'] == 0,
            'entradas': [{'nome': e['nome'], 'total': len(e['feicoes'])} for e in snapshot['entradas']],
            'resumo_entradas': resumo_entradas,
            'feicoes_opcoes': [{'id': i['chave'], 'nome': f"{i['entrada']} · {i.get('identificador') or i['fid']} · feição {i['fid']}"}
                               for i in all_items if not entrada or i['entrada'] == entrada],
            'bases': list(bases.values()), 'grafico': graph,
            'resumo': {'feicoes': len(items), 'risco': contar_estado('risco'),
                       'restricao': contar_estado('restricao'),
                       'areas': len(area_ids) if snapshot['versao'] else None},
            'linhas': page, 'areas': {aid: snapshot['areas'][aid] for aid in areas_used},
            'pagina': pagina, 'paginas': math.ceil(len(items)/tamanho), 'total': len(items)}


def da_saida(tabelas):
    """Agrupa demandas e pares exclusivamente a partir das evidências da saída."""
    import json
    from api.services.extracao_saida_analitica import CAMPO_VINCULOS
    snapshot = {'versao': 4, 'fonte': 'camada_saida', 'entradas': [], 'bases': [], 'areas': {}}
    entries, bases = {}, {}
    for name, rows in tabelas.items():
        for stored in rows:
            row = stored['propriedades']
            if CAMPO_VINCULOS not in row:
                continue
            links = json.loads(row[CAMPO_VINCULOS])
            schema = json.loads(row.get('sicard_esquema') or '{}')
            origin = row.get('camada_origem') or name
            fid = row.get('fid_origem', stored['ordem'])
            codigo = row.get('id_origem')
            ident = str(fid)
            feature = entries.setdefault(origin, {}).setdefault(ident, {
                'fid': fid, 'identificador': codigo if presente(codigo) else fid, 'atributos': {},
                'areas': [], 'bases_intersectadas': [], 'relacoes': {}, 'flags': {},
                '_mapa': [], '_pares': {}, '_demanda': {}, 'geometria_disponivel': True})
            if isinstance(row.get('sicard_demanda'), str) and row['sicard_demanda']:
                feature['_demanda'].setdefault(str(fid), set()).add(row['sicard_demanda'])
            feature['_mapa'].append({'saida': name, 'ordem': stored['ordem']})
            fields = schema.get('dicionario') or []
            original = {d['campo']: d.get('campo_origem') or d['campo'] for d in fields if d.get('tema') == 'Entrada'}
            feature['atributos'].update({original[k]: v for k, v in row.items() if k in original and presente(v)})
            campo_categoria = next((d['campo'] for d in fields if d.get('tema') == 'Entrada' and d.get('campo_origem')
                                   == schema.get('campo_categoria_demanda', schema.get('campo_categoria_pontos'))), None)
            classe = row.get(campo_categoria) if campo_categoria else None
            for tipo in TIPOS:
                campo = f'intersecta_{tipo}' if f'intersecta_{tipo}' in row else tipo
                if campo in row:
                    valor = str(row[campo]).strip().casefold()
                    flag = 1 if valor in ('sim', '1', '1.0', 'true') else 0 if valor in ('não', 'nao', '0', '0.0', 'false') else None
                    anterior = feature['flags'].get(tipo)
                    feature['flags'][tipo] = 1 if flag == 1 or anterior == 1 else None if flag is None or (tipo in feature['flags'] and anterior is None) else 0
                    if flag is None:
                        feature['geometria_disponivel'] = False
            for link in links:
                tipo = link.get('tipo') or str(link['categoria_id'])
                bid = f"{link['categoria_id']}:{link['base_id']}"
                bases.setdefault(bid, {'id': bid, 'nome': link['base'], 'categoria': tipo, 'categoria_nome': link['categoria'],
                                       'cobertura_completa': link['espacial'], 'origem_id': link['base_id'],
                                       'apelidos': {d['campo_origem']: d['apelido'] for d in fields if d.get('base') == link['base'] and d.get('campo_origem') and d.get('apelido')}})
                if not link['espacial']:
                    continue
                for pair in link['correspondencias']:
                    aid = f"{bid}:{pair['fid_base']}"
                    attrs = pair['atributos']
                    nome = attrs.get(link.get('campo_rotulo')) or next((v for k, v in attrs.items() if presente(v) and any(t in k.lower()
                                                                                                                           for t in ('nome', 'name', 'denomin', 'nm_', 'descricao'))), f"Feição {pair['fid_base']}")
                    snapshot['areas'].setdefault(aid, {'id': aid, 'nome': str(nome), 'base_id': bid, 'base': link['base'],
                                                       'categoria': tipo, 'fid': pair['fid_base'], 'atributos': attrs, 'geometria': pair.get('geometria_base')})
                    if aid not in feature['areas']:
                        feature['areas'].append(aid)
                    if bid not in feature['bases_intersectadas']:
                        feature['bases_intersectadas'].append(bid)
                    evidence = {k: v for k, v in pair.items() if k not in ('fid_base', 'atributos', 'geometria_base')}
                    feature['_pares'].setdefault(aid, {}).setdefault(str(fid), {})[(link.get('fragmento') or stored['ordem'], pair.get('geometria_medida'))] = {**evidence, 'categoria_ponto': classe}
    for features in entries.values():
        for feature in features.values():
            from osgeo import ogr
            from api.services import extracao_ogr as geo
            totals = {0: 0., 1: 0., 2: 0.}
            for parts in feature.pop('_demanda').values():
                geoms = [ogr.CreateGeometryFromWkb(bytes.fromhex(w)) for w in parts]
                full = geoms[0]
                for geom in geoms[1:]:
                    full = full.Union(geom)
                for g in geo.parts_ogr(full):
                    dim = g.GetDimension()
                    if dim in totals:
                        totals[dim] += 1 if dim == 0 else g.Length() if dim == 1 else g.GetArea()
            feature['metricas_totais'] = totals
            for aid, rows in feature.pop('_pares').items():
                metric = metricas_par(rows)
                representacao = metric.get('representacao_entrada')
                dim = (
                    {'ponto': 0, 'linha': 1, 'poligono': 2}.get(representacao)
                    if isinstance(representacao, str)
                    else None
                )
                if dim is not None and totals[dim]:
                    num = metric.get(('pontos', 'comprimento_m', 'area_m2')[dim])
                    if num is not None:
                        metric['percentual_entrada'] = 100*num/totals[dim]
                    metric['total_demanda'] = totals[dim]
                feature['relacoes'][aid] = metric
            feature['contagens'] = dict(__import__('collections').Counter(snapshot['areas'][aid]['categoria'] for aid in feature['areas']))
    snapshot['bases'] = list(bases.values())
    snapshot['entradas'] = [{'nome': nome, 'feicoes': list(features.values())} for nome, features in entries.items()]
    return snapshot


def metricas_par(registros):
    """Consolida fragmentos do mesmo par via GDAL; não procura novas relações."""
    from osgeo import ogr
    from api.services import extracao_ogr as geo
    metrics = {'pontos': 0, 'area_m2': 0., 'perimetro_m': 0., 'comprimento_m': 0., 'total': 0., 'por_categoria': {}}
    types: set[int] = set()
    fallback = []
    for fragments in registros.values():
        values = list(fragments.values())
        sample = values[0]
        if not sample.get('geometria_medida'):
            fallback.extend(values)
            continue
        geoms = [ogr.CreateGeometryFromWkb(bytes.fromhex(v['geometria_medida'])) for v in values if v.get('geometria_medida')]
        common = geoms[0]
        for g in geoms[1:]:
            common = common.Union(g)
        demand = ogr.CreateGeometryFromWkb(bytes.fromhex(sample['demanda_medida']))
        dim = demand.GetDimension()
        types.add(dim)
        label = str(sample.get('categoria_ponto') if sample.get('categoria_ponto') is not None else 'Sem categoria')
        if dim == 0:
            qtd = sum(1 for g in geo.parts_ogr(common) if g.GetDimension() == 0)
            metrics['pontos'] += qtd
            metrics['total'] += sum(1 for g in geo.parts_ogr(demand) if g.GetDimension() == 0)
            metrics['por_categoria'][label] = metrics['por_categoria'].get(label, 0)+qtd
        elif dim == 1:
            comprimento = sum(g.Length() for g in geo.parts_ogr(common) if g.GetDimension() == 1)
            metrics['comprimento_m'] += comprimento
            metrics['por_categoria'][label] = metrics['por_categoria'].get(label, 0)+comprimento
            metrics['total'] += sum(g.Length() for g in geo.parts_ogr(demand) if g.GetDimension() == 1)
        elif dim == 2:
            polygons = [g for g in geo.parts_ogr(common) if g.GetDimension() == 2]
            area = sum(g.GetArea() for g in polygons)
            metrics['area_m2'] += area
            metrics['por_categoria'][label] = metrics['por_categoria'].get(label, 0)+area
            metrics['perimetro_m'] += sum(g.Boundary().Length() for g in polygons)
            metrics['total'] += sum(g.GetArea() for g in geo.parts_ogr(demand) if g.GetDimension() == 2)
    if not types and fallback:
        first = dict(fallback[0])
        for field in ('area_m2', 'comprimento_m', 'comprimento_interior_m', 'comprimento_borda_m', 'percentual_entrada'):
            nums = [v[field] for v in fallback if v.get(field) is not None]
            first[field] = sum(nums) if nums else None
        return first
    dim = next(iter(types)) if len(types) == 1 else None
    metrics['representacao_entrada'] = (
        {0: 'ponto', 1: 'linha', 2: 'poligono'}.get(dim, 'mista')
        if dim is not None else 'mista'
    )
    numerador = metrics['pontos'] if dim == 0 else metrics['comprimento_m'] if dim == 1 else metrics['area_m2']
    metrics['percentual_entrada'] = 100*numerador/metrics['total'] if metrics['total'] and dim is not None else None
    metrics['situacao'] = 'correspondencia_espacial'
    if dim != 0:
        metrics['pontos'] = None
    if dim != 1:
        metrics['comprimento_m'] = None
    if dim != 2:
        metrics['area_m2'] = metrics['perimetro_m'] = None
    return metrics
