"""Cálculos do dashboard, isolados do banco e das bibliotecas geoespaciais."""
import json
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from api.services.extracao_atributos_dashboard import analisar, identidade, carregar


def fixture():
    fields = [
        {'campo':'classe','campo_origem':'classe','tema':'Ambiental','base':'Vegetação'},
        {'campo':'valor','campo_origem':'valor','tema':'Ambiental','base':'Vegetação','regra':'Média; somente feições intersectadas'},
        {'campo':'n','campo_origem':None,'tema':'Ambiental','base':'Vegetação','apelido':'Vegetação · nº de feições intersectadas'},
        {'campo':'n2','campo_origem':None,'tema':'Ambiental','base':'Água','apelido':'Água · nº de feições tocadas'},
        {'campo':'n3','campo_origem':None,'tema':'Social','base':'Equipamentos','apelido':'Equipamentos · nº de feições tocadas'},
    ]
    rows = [
        {'camada_origem':'Projetos','fid_origem':0,'id_origem':'A','id_registro':1,'classe':'Floresta','valor':10,'n':1,'n2':0,'n3':0},
        {'camada_origem':'Projetos','fid_origem':0,'id_origem':'A','id_registro':2,'classe':'Floresta','valor':20,'n':1,'n2':1,'n3':0},
        {'camada_origem':'Projetos','fid_origem':1,'id_origem':'A','id_registro':3,'classe':None,'valor':None,'n':0,'n2':0,'n3':2},
        {'camada_origem':'Outros','fid_origem':0,'id_origem':None,'id_registro':4,'classe':'Campo','valor':0,'n':1,'n2':0,'n3':None},
    ]
    return rows, fields


class DashboardTests(unittest.TestCase):
    def test_distinct_origin_not_business_id_or_output_count(self):
        rows, fields = fixture()
        data = analisar(rows, fields)
        self.assertEqual(data['resumo']['registros'], 4)
        self.assertEqual(data['resumo']['feicoes_entrada'], 3)
        self.assertEqual(data['campo'], 'classe')
        self.assertEqual(data['cobertura'][0]['com'], 2)
        self.assertEqual(data['cobertura_categorias'][0]['com'], 2)  # união, não 2+1
        self.assertEqual(data['cobertura_categorias'][0]['sem'], 1)

    def test_missing_zero_and_unknown_are_different(self):
        rows, fields = fixture()
        data = analisar(rows, fields, campo='valor')
        self.assertEqual(data['resumo']['preenchidos'], 3)
        self.assertEqual(data['resumo']['ausentes'], 1)
        self.assertEqual(data['estatisticas']['minimo'], 0)
        self.assertEqual(data['estatisticas']['media'], 10)
        social = next(c for c in data['cobertura'] if c['categoria'] == 'Social')
        self.assertEqual((social['com'], social['sem'], social['nao_informado']), (1, 1, 1))

    def test_filters_share_population_and_page_does_not_change_statistics(self):
        rows, fields = fixture()
        data = analisar(rows, fields, origem=identidade(rows[0]), campo='valor', tamanho=1, pagina=1, ordem='valor', descendente=True)
        self.assertEqual(data['resumo']['registros'], 2)
        self.assertEqual(data['estatisticas']['media'], 15)
        self.assertEqual(len(data['linhas']), 1)
        self.assertEqual(data['linhas'][0]['posicao'], 0)
        self.assertEqual(data['paginas'], 2)
        filtered = analisar(rows, fields, campo='classe', valor=json.dumps('Floresta'))
        self.assertEqual(filtered['resumo']['feicoes_entrada'], 1)
        self.assertEqual(filtered['resumo']['registros'], 2)

    def test_category_is_subject_filter_not_selection_bias(self):
        rows, fields = fixture()
        data = analisar(rows, fields, categoria='Social')
        self.assertEqual(data['resumo']['registros'], 4)
        self.assertEqual(data['bases'], ['Equipamentos'])
        self.assertTrue(all(f['tema'] == 'Social' for f in data['campos']))
        with self.assertRaises(ValueError):
            analisar(rows, fields, categoria='Inventada')
        with self.assertRaises(ValueError):
            analisar(rows, fields, categoria='Social', campo='valor')

    def test_histogram_includes_maximum_and_negative_values(self):
        rows = [{'v':v} for v in [-10, 0, 0, 20, 20, 20]]
        data = analisar(rows, [], campo='v')
        self.assertEqual(sum(b['n'] for b in data['histograma']), 6)
        self.assertEqual(data['histograma'][-1]['n'], 3)
        self.assertIsNone(data['resumo']['feicoes_entrada'])
        constant = analisar([{'v':0}] * 3, [], campo='v')
        self.assertEqual(constant['histograma'], [{'de':0,'ate':0,'n':3,'ultimo':True}])

    def test_empty_search_and_all_null(self):
        rows, fields = fixture()
        empty = analisar(rows, fields, busca='inexistente')
        self.assertEqual(empty['resumo']['registros'], 0)
        self.assertEqual(empty['linhas'], [])
        self.assertIsNone(empty['estatisticas'])
        nulls = analisar([{'v':None}], [], campo='v')
        self.assertEqual(nulls['resumo']['ausentes'], 1)
        self.assertEqual(nulls['distribuicao'], [])

    def test_top_values_discloses_remainder_and_preserves_types(self):
        data = analisar([{'v':i} for i in range(30)], [], campo='v')
        self.assertEqual(data['outros'], 10)
        mixed = analisar([{'v':True},{'v':1},{'v':'1'}], [], campo='v')
        self.assertEqual(mixed['resumo']['distintos'], 3)
        self.assertIsNone(mixed['estatisticas'])

    def test_nonmatching_values_do_not_imply_absence(self):
        rows, fields = fixture()
        data = analisar(rows, [d for d in fields if d['campo'] == 'classe'])
        self.assertEqual(data['cobertura'][0]['nao_informado'], 3)
        self.assertEqual(data['cobertura'][0]['sem'], 0)

    def test_authorization_and_output_membership_precede_data_access(self):
        repo = Mock()
        dependencies = dict(consultar=Mock(side_effect=LookupError('sessão')), repo=repo,
                            carregar_conceitos=Mock(), representar_mapa=Mock())
        with self.assertRaisesRegex(LookupError, 'sessão'):
            carregar('execucao', 'usuario', 'pontos', **dependencies)
        repo.atributos_dashboard.assert_not_called()
        dependencies['consultar'] = Mock(return_value={'status':'concluido','resultado':{
            'modo':'enriquecimento','camadas':{'pontos':{'camada_resultado_id':'permitida'}}}})
        with self.assertRaisesRegex(LookupError, 'nesta extração'):
            carregar('execucao', 'usuario', 'camada_alheia', **dependencies)
        repo.atributos_dashboard.assert_not_called()

    def test_map_uses_exact_repository_order_after_sorting(self):
        rows, fields = fixture()
        repo = SimpleNamespace(
            atributos_dashboard=Mock(return_value=[{'ordem':100+i*7,'propriedades':r} for i,r in enumerate(rows)]),
            geometrias_dashboard=Mock(side_effect=lambda recurso, ordens: [
                {'ordem':o,'geometria':{'type':'Point','coordinates':[o,0]}} for o in sorted(ordens)]))
        result = {'modo':'enriquecimento','camadas':{'pontos':{'camada_resultado_id':'permitida'}},
                  'dicionario':[{**d,'camada':'pontos'} for d in fields],
                  'categorias_analiticas':[{'nome':'Ambiental','conceito':'Conceito da execução'}]}
        concepts = Mock()
        data = carregar('execucao','usuario','pontos', consultar=Mock(return_value={'status':'concluido','resultado':result}),
                        repo=repo, carregar_conceitos=concepts,
                        representar_mapa=lambda fs:({'type':'FeatureCollection','features':fs},{'metodo':'original'}),
                        campo='valor',ordem='valor',descendente=True,tamanho=2)
        concepts.assert_not_called()
        self.assertEqual(data['resumo']['registros'],4)
        positions = {r['posicao'] for r in data['linhas']}
        self.assertEqual({f['properties']['posicao'] for f in data['mapa']['features']},positions)
        self.assertEqual(set(repo.geometrias_dashboard.call_args.args[1]), {100+p*7 for p in positions})

    def test_previous_execution_gets_current_concepts_explicitly(self):
        data = carregar('execucao','usuario','resultado', consultar=lambda *a,**k:{'status':'concluido','resultado':{'camada_resultado_id':'r'}},
                        repo=SimpleNamespace(atributos_dashboard=lambda r:[]), carregar_conceitos=lambda:[], representar_mapa=Mock())
        self.assertIn('não versionados',data['conceito_origem'])
        self.assertEqual(data['mapa']['features'],[])


if __name__ == '__main__':
    unittest.main()
