"""Casos que antes perdiam informação ou atribuíam significado a números."""
import json
import pytest
from shapely.geometry import Point, LineString, box
import geopandas as gpd
from api.services.extracao_atributos_enriquecimento import enriquecer as configuravel
from api.services.extracao_atributos_estatisticas import enriquecer as estatistico
from api.services.extracao_correspondencias import relacao


def frame(geoms, **attrs):
    from shapely.affinity import translate
    return gpd.GeoDataFrame(attrs, geometry=[None if g is None else translate(g, xoff=5_000_000, yoff=7_500_000) for g in geoms], crs=5880)


def categorias(base, regra=None, tipo='social'):
    return [{'id':tipo,'nome':tipo,'camadas':[{'id':'b','nome':'Base','frame':base,'regra':{'prefixo':'b',**(regra or {})}}]}]


@pytest.mark.parametrize('motor', [configuravel, estatistico])
def test_padrao_preserva_codigos_percentuais_nulos_e_pares(motor):
    entrada = frame([Point(1,1),Point(20,20)])
    base = frame([box(0,0,3,3),box(0,0,4,4)], codigo=[100,200], percentual=[20,80], nome=['A | B','C'], vazio=[None,None])
    saida = motor(entrada,categorias(base))['camadas']['pontos']
    assert len(saida)==2
    linha=saida.iloc[0]
    assert json.loads(linha.b_codigo)==[100,200]
    assert json.loads(linha.b_percentual)==[20,80]
    assert json.loads(linha.b_vazio)==[None]
    registros=json.loads(linha.b_correspondencias)
    assert [(r['fid_base'],r['atributos']['nome']) for r in registros]==[(0,'A | B'),(1,'C')]
    assert json.loads(saida.iloc[1].b_correspondencias)==[]


@pytest.mark.parametrize('motor', [configuravel, estatistico])
def test_calculo_so_no_campo_configurado_e_legado_exige_revisao(motor):
    entrada=frame([Point(1,1)])
    base=frame([box(0,0,3,3),box(0,0,4,4)],codigo=['001','002'],quantidade=[2,5])
    saida=motor(entrada,categorias(base,{'estatisticas_campos':{'quantidade':'total'}}))['camadas']['pontos'].iloc[0]
    assert saida.b_quantidade==7 and json.loads(saida.b_codigo)==['001','002']
    with pytest.raises(ValueError,match='Revise'):
        motor(entrada,categorias(base,{'estatistica':'media'}))
    with pytest.raises(ValueError,match='não numérico'):
        motor(entrada,categorias(base,{'estatisticas_campos':{'codigo':'media'}}))


@pytest.mark.parametrize('escolha', ['primeira','maior_sobreposicao','todas'])
def test_escolha_explica_os_atributos_mas_nao_apaga_as_demais_areas(escolha):
    entrada=frame([LineString([(0,1),(10,1)])])
    base=frame([box(0,0,2,2),box(2,0,10,2)],nome=['A','B'])
    saida=configuravel(entrada,categorias(base,{'multiplicidade':escolha},tipo='risco'))['camadas']['linhas']
    for _,r in saida.iterrows():
        assert [a['atributos']['nome'] for a in json.loads(r.b_correspondencias)]==['A','B']
    assert saida.iloc[0].b_nome==('B' if escolha=='maior_sobreposicao' else 'A')


def test_topologia_e_medidas_nao_confundem_borda_com_ocupacao():
    area=box(0,0,10,10)
    assert relacao(box(10,0,20,10),area)['situacao']=='contato_linear'
    assert relacao(box(10,0,20,10),area)['area_m2']==0
    assert relacao(box(5,0,15,10),area)['area_m2']==50
    assert relacao(LineString([(-1,5),(11,5)]),area)['comprimento_m']==10
    assert relacao(Point(0,5),area)['tipo']=='contato_borda'
    assert relacao(Point(5,5),area)['tipo']=='intersecao_interior'
    assert relacao(LineString([(0,0),(10,10)]),LineString([(0,10),(10,0)]))['tipo']=='cruzamento_pontual'


def test_risco_preserva_atributos_bordas_e_geometria_ausente():
    entrada=frame([Point(0,5),Point(5,5),None])
    base=frame([box(0,0,10,10)],nome=['Inundação'],classe=['Alta'])
    saida=estatistico(entrada,categorias(base,tipo='risco'))['camadas']
    linhas=[r for f in saida.values() for _,r in f.iterrows()]
    porfid={r.fid_origem:r for r in linhas}
    assert porfid[0].b_n_contato_borda==1 and porfid[1].b_n_intersecao_interior==1
    assert json.loads(porfid[0].b_classe)==['Alta']
    assert porfid[2].risco==0 and json.loads(porfid[2].b_correspondencias)==[]


def test_recorte_sobreposto_nao_publica_resultado_reprovado():
    entrada=frame([LineString([(0,5),(10,5)])])
    base=frame([box(0,0,7,10),box(3,0,10,10)])
    with pytest.raises(ValueError,match='reprovado'):
        configuravel(entrada,categorias(base,{'papel':'recorte'}))


def test_representacao_define_medidas_sem_buffer_nem_peso_de_atributo():
    area=box(0,0,10,10)
    ponto=relacao(Point(5,5),area)
    assert ponto['situacao']=='ponto_no_interior'
    assert ponto['area_m2'] is None and ponto['comprimento_m'] is None and ponto['percentual_entrada'] is None
    linha=relacao(LineString([(-10,5),(10,5)]),area)
    assert linha['situacao']=='trecho_no_interior' and linha['comprimento_interior_m']==10
    assert linha['comprimento_borda_m']==0 and linha['percentual_entrada']==50 and linha['area_m2'] is None
    borda=relacao(LineString([(0,0),(10,0)]),area)
    assert borda['situacao']=='trecho_na_borda' and borda['comprimento_interior_m']==0 and borda['comprimento_borda_m']==10
    misto=relacao(LineString([(0,0),(5,0),(5,5)]),area)
    assert misto['situacao']=='trechos_interior_e_borda' and misto['comprimento_interior_m']==5 and misto['comprimento_borda_m']==5
    poligono=relacao(box(5,0,15,10),area)
    assert poligono['situacao']=='sobreposicao_area' and poligono['area_m2']==50 and poligono['percentual_entrada']==50
    assert poligono['comprimento_m'] is None
    inverso=relacao(area,LineString([(-10,5),(10,5)]))
    assert inverso['comprimento_interior_m']==10 and inverso['area_m2'] is None and inverso['percentual_entrada'] is None


def test_percentual_do_trecho_usa_demanda_original_como_denominador():
    entrada=frame([LineString([(0,5),(20,5)])],nome=['Demanda única'])
    recorte=frame([box(0,0,10,10),box(10,0,20,10)],nome=['Oeste','Leste'])
    base=frame([box(0,0,20,10)],nome=['Área A'])
    grupos=categorias(recorte,{'papel':'recorte','prefixo':'c'})
    grupos[0]['camadas']+=categorias(base)[0]['camadas']
    saida=configuravel(entrada,grupos)['camadas']['linhas']
    assert len(saida)==2 and set(saida.fid_origem)=={0}
    for _,r in saida.iterrows():
        par=json.loads(r.b_correspondencias)[0]
        assert par['comprimento_m']==10 and par['percentual_entrada']==50
        assert par['referencia_percentual']=='demanda_original'
