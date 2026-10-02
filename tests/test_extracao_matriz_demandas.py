import json
import geopandas as gpd
from shapely.geometry import Point, box
from api.services.extracao_atributos_estatisticas import enriquecer
from api.services.extracao_saida_analitica import snapshot_saida
from api.services.extracao_resultados_territoriais import consultar


def test_matriz_agrupa_todos_os_pontos_por_camada_e_area():
    x, y = 5000000, 7500000
    entrada = gpd.GeoDataFrame(
        {'nome': ['p1', 'p2', 'p3', 'fora']},
        geometry=[Point(x + 1, y + 1), Point(x + 2, y + 2), Point(x + 8, y + 8), Point(x + 50, y)],
        crs=5880,
    )
    base = gpd.GeoDataFrame(
        {'nome': ['Área A', 'Área B'], 'grau': ['alto', 'baixo']},
        geometry=[box(x, y, x + 5, y + 5), box(x, y, x + 10, y + 10)],
        crs=5880,
    )
    cats = [{'id': 'risco', 'nome': 'Risco', 'camadas': [{'id': 'r', 'nome': 'Riscos', 'frame': base, 'regra': {}}]}]
    result = enriquecer(entrada, cats, nome_entrada='Projeto A')
    snapshot = snapshot_saida(result['camadas'])
    data = consultar(snapshot, agrupamento='camada')
    assert data['total'] == 1
    row = data['linhas'][0]
    assert row['entrada'] == 'Projeto A' and row['estados']['risco'] == 'com'
    assert sorted(m['pontos'] for m in row['relacoes'].values()) == [2, 3]
    assert sorted(m['percentual_entrada'] for m in row['relacoes'].values()) == [50, 75]
    assert len(row['_mapa']) == 4
    assert row['contagens']['risco'] == 2
    assert consultar(snapshot)['total'] == 4
    persisted = consultar(json.loads(json.dumps(snapshot)), agrupamento='camada')
    assert sorted(m['percentual_entrada'] for m in persisted['linhas'][0]['relacoes'].values()) == [50, 75]


def test_matriz_mantem_demandas_sem_correspondencia():
    snapshot = {'versao': 4, 'fonte': 'camada_saida', 'bases': [{'id': 'r', 'nome': 'Risco', 'categoria': 'risco', 'cobertura_completa': True}], 'areas': {}, 'entradas': [
      {'nome': name, 'feicoes': [{'fid': 0, 'identificador': 0, 'areas': [], 'bases_intersectadas': [], 'atributos': {}, 'flags': {'risco': flag}, 'geometria_disponivel': flag is not None}]} for name, flag in [('Sem contato', 0), ('Sem avaliação', None)]]}
    data = consultar(snapshot, agrupamento='camada')
    assert {r['entrada']: r['estados']['risco'] for r in data['linhas']} == {'Sem contato': 'sem', 'Sem avaliação': 'nao_avaliado'}
    assert consultar(snapshot, agrupamento='camada', busca='contato')['total'] == 1


def test_uma_demanda_por_feicao_mesmo_com_id_e_titulo_repetidos():
    x, y = 5000000, 7500000
    entrada = gpd.GeoDataFrame(
        {'codigo': ['mesmo', 'mesmo', 'outro'], 'titulo': ['Projeto A', 'Projeto A', 'Projeto B'], 'nome': ['Ignorar', 'Ignorar', 'Ignorar']},
        geometry=[Point(x + 1, y + 1), Point(x + 2, y + 2), Point(x + 8, y + 8)],
        crs=5880,
    )
    base = gpd.GeoDataFrame({'nome': ['Área de risco']}, geometry=[box(x, y, x + 4, y + 4)], crs=5880)
    categorias = [{'id': 'risco', 'nome': 'Risco', 'camadas': [{'id': 'r', 'nome': 'Riscos', 'frame': base, 'regra': {'apelidos': {'nome': 'Nome da área'}}}]}]
    result = enriquecer(entradas=[{'nome': 'Pontos', 'frame': entrada, 'config': {'campo_id': 'codigo', 'campo_nome_demanda': 'titulo'}}], categorias=categorias)
    data = consultar(snapshot_saida(result['camadas']))
    assert data['total'] == 3
    assert data['aliases_categorias']['risco']['nome'] == 'Nome da área'
    assert len({r['chave'] for r in data['linhas']}) == 3
    assert {r['fid'] for r in data['linhas']} == {0, 1, 2}
    assert sorted(r['identificador'] for r in data['linhas']) == ['mesmo', 'mesmo', 'outro']
    assert sorted(r['nome_demanda'] for r in data['linhas']) == ['Projeto A', 'Projeto A', 'Projeto B']
    assert all(r['campo_nome_demanda'] == 'titulo' for r in data['linhas'])
    assert sum(r['estados']['risco'] == 'com' for r in data['linhas']) == 2
    assert consultar(snapshot_saida(result['camadas']), busca='Projeto B')['total'] == 1
    assert consultar(json.loads(json.dumps(snapshot_saida(result['camadas']))))['total'] == 3


def test_nome_demanda_com_acentos_e_fallback():
    from api.services.extracao_resultados_territoriais import nome_demanda
    assert nome_demanda({'atributos': {'TÍTULO': 'Obra A', 'nome': 'Outro'}, 'fid': 0}) == ('Obra A', 'TÍTULO')
    assert nome_demanda({'atributos': {'titulo': '  ', 'nome': 'Obra B'}, 'fid': 1}) == ('Obra B', 'nome')
    assert nome_demanda({'atributos': {}, 'identificador': 0, 'fid': 3}) == ('0', 'identificador')
