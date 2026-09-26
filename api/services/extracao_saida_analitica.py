"""Campos analíticos materializados na saída, sem consultas ou operações espaciais."""
import json
from hashlib import sha256

from api.services.extracao_correspondencias import serializar
from api.services.extracao_intersecoes_territoriais import tipo_categoria

CAMPO_VINCULOS = 'sicard_vinculos'
CAMPO_ESQUEMA = 'sicard_esquema'
CAMPOS_RESERVADOS = {'risco', 'restricao', CAMPO_VINCULOS, CAMPO_ESQUEMA, 'sicard_demanda'}


def materializar(camadas, dicionario, categorias):
    """Deriva presença das correspondências, nunca dos valores dos atributos."""
    rotulos = {str(b['id']):(b.get('regra') or {}).get('campo_rotulo') for c in categorias for b in c['camadas']}
    tipos = {tipo_categoria(c.get('id'), c.get('nome')) for c in categorias}
    tipos.discard(None)
    for nome, frame in camadas.items():
        from api.services import extracao_ogr as geo
        metricas = geo.reproject(frame,5880,nome)
        frame['sicard_demanda'] = [g.wkb_hex if g is not None else None for g in metricas.geometry]
        fontes = [d for d in dicionario if d.get('camada') == nome and d.get('papel_analitico') == 'vinculos']
        registros, flags = [], {tipo:[] for tipo in tipos}
        for _, row in frame.iterrows():
            vinculos = []
            for campo in fontes:
                valor = row.get(campo['campo'])
                pares = json.loads(valor) if isinstance(valor, str) else []
                vinculos.append({'campo_rotulo':rotulos.get(str(campo['base_id'])), 'base_id':campo['base_id'], 'base':campo['base'],
                    'categoria_id':campo['categoria_id'], 'categoria':campo['tema'],
                    'tipo':tipo_categoria(campo['categoria_id'], campo['tema']),
                    'espacial':campo.get('ligacao_espacial', True), 'fragmento':sha256(row.geometry.wkb).hexdigest() if row.geometry is not None else None, 'correspondencias':pares})
            registros.append(serializar(vinculos))
            for tipo in tipos:
                flags[tipo].append(int(any(v['tipo'] == tipo and v['espacial'] and v['correspondencias'] for v in vinculos)))
        frame[CAMPO_VINCULOS] = registros
        dicionario.append({'camada':nome, 'campo':CAMPO_VINCULOS, 'tema':'Resultado', 'base':None,
            'campo_origem':None, 'apelido':'Correspondências por base e categoria',
            'regra':'Vínculos preservados pelo geoprocesso; fonte autossuficiente do painel', 'papel_analitico':'linhagem'})
        for tipo, valores in flags.items():
            frame[tipo] = valores
            dicionario.append({'camada':nome, 'campo':tipo, 'tema':'Resultado', 'base':None,
                'campo_origem':None, 'apelido':tipo.capitalize(), 'papel_analitico':'presenca_categoria',
                'regra':'1: existe correspondência espacial na categoria; 0: nenhuma correspondência registrada'})
        dicionario.append({'camada':nome,'campo':'sicard_demanda','tema':'Resultado','base':None,'campo_origem':None,'apelido':'Geometria de referência para métricas','papel_analitico':'geometria_tecnica'})
        dicionario.append({'camada':nome, 'campo':CAMPO_ESQUEMA, 'tema':'Resultado', 'base':None,
            'campo_origem':None, 'apelido':'Esquema analítico da saída', 'papel_analitico':'linhagem'})
        esquema = {'dicionario':[d for d in dicionario if d.get('camada') == nome],
                   'categorias':[{k:v for k,v in c.items() if k != 'camadas'} for c in categorias]}
        frame[CAMPO_ESQUEMA] = serializar(esquema)
    return camadas


def snapshot_saida(camadas):
    from api.services.extracao_resultados_territoriais import da_saida
    return da_saida({nome:[{'ordem':i, 'propriedades':row.drop(frame.geometry.name).to_dict()}
                          for i,(_,row) in enumerate(frame.iterrows())] for nome,frame in camadas.items()})
