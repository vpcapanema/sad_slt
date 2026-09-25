"""Consulta descritiva por camada de entrada; preserva ausência de evidência."""
from collections import defaultdict
import math

from api.services.extracao_atributos_dashboard import chave, presente, identidade, correspondencia
from api.services.extracao_intersecoes_territoriais import tipo_categoria

TIPOS = ('risco', 'restricao')


def legado(result, tabelas):
    snapshot = {'versao':0, 'entradas':[], 'bases':[], 'areas':{}}
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
            bases.setdefault(bid, {'id':bid, 'nome':base, 'categoria':tipo, 'espacial':spatial,
                                   'cobertura_completa':False})
        for position, stored in enumerate(loaded):
            row = stored['propriedades']
            ident = identidade(row)
            if ident is None:
                continue
            entry_name = row.get('camada_origem') or result.get('input_nome') or 'Entrada'
            entry = entries.setdefault(entry_name, {})
            item = entry.setdefault(ident, {'fid':row.get('fid_origem', row.get('fid_entrada')),
                'identificador':row.get('id_origem'), 'atributos':{}, 'areas':[], 'bases_intersectadas':[],
                'estados_bases':{}, '_mapa':[], 'geometria_disponivel':True})
            item['_mapa'].append({'saida':name, 'ordem':stored['ordem']})
            item['atributos'].update({d['campo']:row.get(d['campo']) for d in fields if d.get('tema') == 'Entrada'})
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
                    aid = chave([tipo,base,fid])
                    snapshot['areas'].setdefault(aid, {'id':aid,'base_id':bid,'base':base,'categoria':tipo,'fid':fid,
                        'atributos':{d['campo_origem']:row.get(d['campo']) for d in fs if d.get('campo_origem')}})
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
            bases[bid] = {'id':bid, 'nome':base['nome'], 'categoria':tipo,
                          'espacial':True, 'cobertura_completa':False}
            for occurrence in base.get('ocorrencias', []):
                matched = occurrence.get('dentro') is True or (
                    occurrence.get('dimensao') in (1,2) and (occurrence.get('medida_si') or 0) > 0)
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
                    snapshot['areas'].setdefault(aid, {'id':aid, 'base_id':bid, 'base':base['nome'],
                        'categoria':tipo, 'fid':fid, 'atributos':occurrence.get('atributos') or {}})
                    if aid not in item['areas']:
                        item['areas'].append(aid)
    for entry_name, features in entries.items():
        for item in features.values():
            item['estados_bases'] = {bid:True if True in states else None if None in states else False
                                     for bid, states in item['estados_bases'].items()}
        snapshot['entradas'].append({'nome':entry_name, 'feicoes':list(features.values())})
    snapshot['bases'] = list(bases.values())
    return snapshot


def estado(snapshot, feature, tipo):
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


def consultar(snapshot, *, entrada='', feicao='', categoria='', base='', situacao='', busca='', pagina=0, tamanho=25):
    bases = {b['id']:b for b in snapshot['bases']}
    all_items = []
    for entry in snapshot['entradas']:
        for feature in entry['feicoes']:
            all_items.append({**feature, 'entrada':entry['nome'], 'chave':chave([entry['nome'],feature['fid']]),
                'estados':{t:estado(snapshot,feature,t) for t in TIPOS},
                'representacao_mapa':entry.get('representacao_mapa', {}).get('metodo', 'original')})
    def selected(item):
        if entrada and item['entrada'] != entrada or feicao and item['chave'] != feicao:
            return False
        if base and base not in item['bases_intersectadas']:
            return False
        if situacao and not any(item['estados'][t] == situacao for t in (TIPOS if not categoria else (categoria,))):
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
    items = sorted((item for item in all_items if selected(item)), key=lambda x:(x['entrada'],str(x.get('identificador') or ''),str(x['fid'])))
    resumo_entradas = []
    for entry in snapshot['entradas']:
        group = [i for i in items if i['entrada'] == entry['nome']]
        if entrada and entry['nome'] != entrada:
            continue
        resumo_entradas.append({'nome':entry['nome'], 'total':len(group),
            **{tipo:{s:sum(i['estados'][tipo] == s for i in group) for s in ('com','sem','nao_avaliado','nao_informado')} for tipo in TIPOS}})
    pagina = min(pagina, max(0,(len(items)-1)//tamanho))
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
        graph.append({'id':b['id'], 'nome':b['nome'], 'categoria':b['categoria'],
                      'feicoes':sum(b['id'] in i['bases_intersectadas'] for i in items) if known or not items else None,
                      'completa':len(known) == len(items)})
    def count(tipo):
        return sum(i['estados'][tipo] == 'com' for i in items) if not items or any(
            i['estados'][tipo] in ('com', 'sem') for i in items) else None
    return {'legado':snapshot['versao'] == 0,
        'entradas':[{'nome':e['nome'],'total':len(e['feicoes'])} for e in snapshot['entradas']],
        'resumo_entradas':resumo_entradas,
        'feicoes_opcoes':[{'id':i['chave'],'nome':f"{i['entrada']} · {i.get('identificador') or i['fid']} · feição {i['fid']}"}
                          for i in all_items if not entrada or i['entrada'] == entrada],
        'bases':list(bases.values()), 'grafico':graph,
        'resumo':{'feicoes':len(items),'risco':count('risco'),
                  'restricao':count('restricao'),
                  'areas':len(area_ids) if snapshot['versao'] else None},
        'linhas':page, 'areas':{aid:snapshot['areas'][aid] for aid in areas_used},
        'pagina':pagina,'paginas':math.ceil(len(items)/tamanho),'total':len(items)}
