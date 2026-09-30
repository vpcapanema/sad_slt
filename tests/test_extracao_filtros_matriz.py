import json
from api.services.extracao_resultados_territoriais import consultar
from api.services.extracao_resultados_campos import metadado


def snapshot():
    return {'versao':4,'fonte':'camada_saida','bases':[{'id':'eco','nome':'Economia','categoria':'eco','cobertura_completa':True}],
      'areas':{str(i):{'id':str(i),'base_id':'eco','base':'Economia','categoria':'eco','atributos':{'valor':i,'grupo':'A' if i%2 else 'B'}} for i in range(60)},
      'entradas':[{'nome':'Pontos','feicoes':[{'fid':i,'identificador':i,'atributos':{'titulo':f'Demanda {i}'},'areas':[str(i)],'bases_intersectadas':['eco'],'geometria_disponivel':True} for i in range(60)]}]}


def test_filtro_antes_da_paginacao_intervalo_inclusivo_e_multiplos():
    filtros=[{'campo':json.dumps(['eco','valor']),'operador':'intervalo','minimo':30,'maximo':40},
             {'campo':json.dumps(['eco','grupo']),'operador':'valores','valores':['B']}]
    data=consultar(snapshot(),filtros=filtros)
    assert data['total']==6
    assert {r['fid'] for r in data['linhas']}=={30,32,34,36,38,40}
    assert set(data['opcoes_filtro'][filtros[1]['campo']]['valores'])=={'A','B'}
    filtros[1]['valores']=['A','B']
    assert consultar(snapshot(),filtros=filtros)['total']==11
    filtros[1]['valores']=['B']
    assert consultar(snapshot(),filtros=filtros,combinacao='ou')['total']==35


def test_nulo_nao_e_zero_e_filtro_por_demanda():
    s=snapshot();s['areas']['0']['atributos']['valor']=None
    field=json.dumps(['eco','valor'])
    assert consultar(s,filtros=[{'campo':field,'operador':'intervalo','minimo':0,'maximo':0}])['total']==0
    assert consultar(s,filtros=[{'campo':field,'operador':'vazio'}])['total']==1
    assert consultar(s,filtros=[{'campo':'demanda','valores':['Demanda 59']}])['linhas'][0]['fid']==59


def test_semantica_dos_tres_indicadores_financeiros():
    for codigo,parte in [('143223','pagas'),('143224','Capital'),('143225','Correntes')]:
        m=metadado(f'financas_publicas_i{codigo}_2025','inadequado')
        assert 'Despesas brutas' in m['alias'] and parte.lower() in m['alias']
        assert '(R$)' in m['alias'] and '2025' in m['alias']
        assert m['formato']=='moeda' and m['multiplicador']==1
        assert 'servicodados.ibge.gov.br' in m['fonte']


def test_contrato_da_api_rejeita_intervalo_invertido_e_mais_de_duas_condicoes():
    import pytest
    from pydantic import ValidationError
    from api.routers.extracao_atributos import ConsultaIntersecoes
    with pytest.raises(ValidationError):
        ConsultaIntersecoes(filtros=[{'campo':'x','operador':'intervalo','minimo':2,'maximo':1}])
    with pytest.raises(ValidationError):
        ConsultaIntersecoes(filtros=[{'campo':'x'}]*3)
    modelo=ConsultaIntersecoes(filtros=[{'campo':'demanda','valores':['Demanda 59']}])
    assert consultar(snapshot(),**modelo.model_dump())['total']==1


def test_nome_claro_preserva_fase_e_origem_da_receita():
    contribuicao=metadado('financas_publicas_i165606_2025','')
    assert contribuicao['nome']=='Arrecadação com contribuição de melhoria'
    assert contribuicao['fonte_nome']=='Siconfi / Tesouro Nacional · via IBGE'
    assert 'Receitas orçamentárias brutas realizadas' in contribuicao['nome_original']
    assert metadado('financas_publicas_i165607_2025','')['nome']=='Arrecadação de contribuições'
    assert 'empenhadas' in metadado('financas_publicas_i28135_2025','')['nome']
    assert 'liquidadas' in metadado('financas_publicas_i29750_2025','')['nome']
    assert 'pagas' in metadado('financas_publicas_i143224_2025','')['nome']


def test_recortes_e_rede_preservados_e_aliases_financeiros_distintos():
    from api.services.extracao_resultados_campos import catalogo
    campos=catalogo()
    nomes=[m['alias'] for k,m in campos.items() if k.startswith('financas_publicas_')]
    assert len(nomes)==len(set(nomes))==28
    municipal=metadado('ideb_i78188_2025','')
    assert municipal['nome']=='IDEB — anos iniciais do ensino fundamental · rede municipal'
    assert 'Inep' in municipal['fonte_nome']
    assert metadado('saneamento_V04000001_2022','')['nome']!=metadado('saneamento_V04000002_2022','')['nome']
