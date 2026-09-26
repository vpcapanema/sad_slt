"""Orquestra uma execução nativa por camada, preservando suas saídas independentes."""
from copy import deepcopy
import json
from api.services.extracao_atributos_regras import ConfigCamada
from api.services.extracao_correspondencias import serializar


def entradas_do_lote(entradas):
    result = []
    for entrada in entradas:
        frame = entrada['frame']
        partes = frame.attrs.get('sicard_partes') or [{'chave':'', 'nome':entrada['nome'], 'campos':list(frame.columns)}]
        for parte in partes:
            config = {k:v for k,v in (entrada.get('config') or {}).items() if k != 'camadas'}
            config.update((entrada.get('config') or {}).get('camadas', {}).get(parte['chave'], {}))
            config = ConfigCamada.model_validate(config).model_dump()
            if not config['processar']: continue
            dados = frame
            origem = frame.attrs.get('sicard_campo_origem')
            if origem: dados = dados[dados[origem] == parte['chave']]
            cols = list(dict.fromkeys([c for c in parte['campos'] if c in dados.columns]+[frame.geometry.name]))
            dados = dados[cols].copy().reset_index(drop=True)
            dados.attrs = {}
            nome = f"{entrada['nome']} · {parte['nome']}" if len(partes)>1 else entrada['nome']
            if not config['identificacao_confirmada']:
                raise ValueError(f'{nome}: confirme a identificação da demanda na seção 1.1.')
            campo = config.get('campo_id')
            if campo == '__feicao__':
                candidato = next((c for c in dados.columns if c.startswith('slt_fid_origem')), None)
                if candidato is not None and (dados[candidato].isna().any() or not dados[candidato].is_unique): candidato = None
                if candidato is None:
                    candidato = 'sicard_fid_entrada'
                    while candidato in dados.columns: candidato += '_'
                    dados[candidato] = range(len(dados))
                config['campo_id'] = candidato
            elif not campo or campo not in dados.columns:
                raise ValueError(f'{nome}: escolha o campo identificador da demanda.')
            ids = dados[config['campo_id']]
            if ids.isna().any() or ids.astype(str).str.strip().eq('').any():
                raise ValueError(f'{nome}: o identificador da demanda contém valores vazios.')
            categoria = config.get('categoria_demanda', config.get('categoria_pontos'))
            if categoria and categoria not in dados.columns:
                raise ValueError(f'{nome}: campo de categoria da demanda inexistente.')
            if len(result)>=100: raise ValueError('O lote aceita até 100 camadas.')
            result.append({**entrada, 'nome':nome, 'frame':dados, 'config':config, 'chave':f'entrada_{len(result)+1}'})
    if not result: raise ValueError('Selecione ao menos uma camada para processar.')
    return result


def executar(entradas, categorias, operacao, progress, finalidades=None):
    from api.services.extracao_atributos_estatisticas import enriquecer as join
    from api.services.extracao_atributos_enriquecimento import enriquecer as identity
    camadas, dicionario, individuais, relatorios, fins = {}, [], [], {}, {}
    for i, entry in enumerate(entradas):
        config = entry['config']
        modo = config.get('operacao') or operacao
        bases = [{**cat, 'camadas':[{**b, 'regra':deepcopy(b.get('regra') or {})} for b in cat['camadas']]} for cat in categorias]
        if modo == 'enriquecimento':
            recorte = config.get('camada_recorte')
            if not recorte:
                raise ValueError(f"{entry['nome']}: selecione a base de recorte do Identity em Conferir e executar.")
            if not any(b['id']==recorte for c in bases for b in c['camadas']): raise ValueError('Base de recorte não está no lote.')
            for c in bases:
                for b in c['camadas']:
                    b['regra']['papel'] = 'recorte' if b['id']==recorte else 'atributos'
                    b['regra']['ligacao'] = 'localizacao'
                    b['regra']['chave_base'] = b['regra']['chave_entrada'] = None
        else:
            for c in bases:
                for b in c['camadas']: b['regra']['papel'] = 'atributos'
        progress(f"Camada {i+1} de {len(entradas)}: {entry['nome']}")
        def progresso_camada(message):
            progress(f"Camada {i+1}/{len(entradas)} · {entry['nome']} — {message}")
        if hasattr(progress,'tarefa'): progresso_camada.tarefa = progress.tarefa
        if hasattr(progress,'detalhe'): progresso_camada.detalhe = lambda message: progress.detalhe(f"{entry['nome']} — {message}")
        if hasattr(progress,'progresso_fase'): progresso_camada.progresso_fase = lambda feitas,total: progress.progresso_fase(i + feitas / max(1,total),len(entradas))
        res = (join if modo=='estatisticas' else identity)(entradas=[entry],categorias=bases,progress=progresso_camada,finalidades=[])
        if hasattr(progress,'tarefa'): progress.tarefa(1,1)
        if hasattr(progress,'progresso_fase'): progress.progresso_fase(i+1,len(entradas))
        remap = {n:f"{entry['chave']}_{n}" for n in res['camadas']}
        campos = [{**d,'camada':remap[d['camada']]} for d in res['dicionario']]
        for n, frame in res['camadas'].items():
            # Metadados de agrupamento acompanham a tabela, inclusive no pacote exportado.
            schemas = json.loads(frame.iloc[0]['sicard_esquema']) if len(frame) else {}
            schemas.update(dicionario=[d for d in campos if d['camada']==remap[n]],
                entrada_id=entry['chave'], entrada_nome=entry['nome'], campo_categoria_demanda=config.get('categoria_demanda', config.get('categoria_pontos')))
            frame['sicard_esquema'] = serializar(schemas)
            camadas[remap[n]] = frame
        dicionario.extend(campos)
        for n, info in res['relatorio']['camadas'].items(): relatorios[remap[n]] = info
        individuais.append({'chave':entry['chave'],'nome':entry['nome'],'nome_saida':config.get('nome_saida') or entry['nome'],
            'operacao':modo,'camadas':list(remap.values()),'validacao':res['relatorio']['validacao'], 'entrada':entry})
    # As finalidades são projeções tabulares; jamais removem atributos das saídas integrais.
    for i,f in enumerate(finalidades or []):
        targets = {n:df[[c for c in f['campos'] if c in df.columns]+[df.geometry.name]].copy()
                   for n,df in camadas.items() if any(c in df.columns for c in f['campos'])}
        fins[f'finalidade_{i+1}'] = {**f,'camadas':targets}
    return {'camadas':camadas,'dicionario':dicionario,'individuais':individuais,'finalidades':fins,
        'relatorio':{'camadas':relatorios,'entradas':[{'nome':e['nome'],'feicoes_origem':len(e['frame'])} for e in entradas],
                    'validacao':{'aprovada':all(r['validacao'].get('aprovada') for r in individuais),'lote':{r['chave']:r['validacao'] for r in individuais}},'modo':'lote'}}
