from datetime import datetime, timezone
from copy import deepcopy
from uuid import UUID

import pytest
from api.exceptions import DemandaValidationError
from api.schemas.comparacao_colaborativa import AmbienteColaborativoCreateSchema, AmbienteColaborativoUpdateSchema, AnaliseColaborativaCreateSchema
from api.services import comparacao_colaborativa_service as service
from api.services import hierarquizacao_service as hier
from api.services.pesos_homologados import aplicar_pesos

HID = '44444444-4444-4444-4444-444444444444'
RIDS = ['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222']


def test_convite_preserva_nome_em_criacao_e_edicao_parcial(monkeypatch):
    criteria = [{'criterio':'C1'},{'criterio':'C2'}]
    current = {'id':'j1','status':'ativa','convites':[{'email':'p@example.com','nome':'Pessoa'}]}
    monkeypatch.setattr(service,'_carregar_hierarquizacao',lambda _id: {'id':HID,'dados_hierarquizacao':{'cabecalho_grupo':{'matriz_premissas_criterios':criteria}}})
    monkeypatch.setattr(service,'_ambiente_to_response',lambda row,**kw: row)
    monkeypatch.setattr(service.repo,'encerrar_ambientes_anteriores',lambda *args: None)
    monkeypatch.setattr(service.superficie_ahp,'encerrar_rodadas_hierarquizacao',lambda *args: None)
    monkeypatch.setattr(service.repo,'insert_ambiente',lambda data:data)
    monkeypatch.setattr(service.repo,'get_ambiente_by_id',lambda _id:current)
    monkeypatch.setattr(service.repo,'update_ambiente',lambda _id,data:data)
    monkeypatch.setattr(service.repo,'list_respostas',lambda _id:[])
    result=service.criar_ambiente(AmbienteColaborativoCreateSchema(hierarquizacao_id=HID,convites=current['convites'],valido_ate=datetime(2035,1,1,tzinfo=timezone.utc)))
    assert result['convites']==current['convites']
    assert service.atualizar_ambiente('j1',AmbienteColaborativoUpdateSchema(convites=[{'email':'p@example.com'}]))['convites']==current['convites']
    assert service.atualizar_ambiente('j1',AmbienteColaborativoUpdateSchema(convites=[{'email':'p@example.com','nome':'Outra Pessoa'}]))['convites'][0]['nome']=='Outra Pessoa'


@pytest.fixture
def analyses(monkeypatch):
    monkeypatch.setattr(service.repo,'get_ambiente_by_id',lambda _id: {'criterios':[{'criterio':'A'},{'criterio':'B'}]})
    monkeypatch.setattr(service.repo,'list_respostas',lambda _id:[{'id':id,'nome_completo':id,'email':'p@example.com','status':'enviada','consistente':True,'razao_consistencia':0,'matriz_comparacao':[[1,v],[1/v,1]]} for id,v in zip(RIDS,[1,9])])
    monkeypatch.setattr(service.analise_repo,'insert_with_respostas',lambda data,answers:data)
    monkeypatch.setattr(service,'_analise_response',lambda data:data)


@pytest.mark.parametrize('method,expected',[('geometrica',3),('aritmetica',5),('mediana',5)])
def test_metodo_selecionado_e_persistido(analyses,method,expected):
    result=service.criar_analise('j1',AnaliseColaborativaCreateSchema(nome='Teste',resposta_ids=RIDS,metodo_agregacao=method))
    assert result['matriz_consolidada'][0][1]==pytest.approx(expected)
    assert result['matriz_consolidada'][1][0]==pytest.approx(1/expected)


def test_selecao_vazia_ou_resposta_de_outro_julgamento_nao_consolida(analyses):
    for ids in [[],[HID]]:
        with pytest.raises(DemandaValidationError):
            service.criar_analise('j1',AnaliseColaborativaCreateSchema(nome='Teste',resposta_ids=ids))


def test_historico_usa_snapshot_e_nao_grupo_atual(monkeypatch):
    monkeypatch.setattr(hier,'_nomes_usuarios',lambda ids:{})
    row={'id':HID,'grupo_demanda_id':HID,'codigo':'H1','nome':'Hier','status':'em_julgamento','objetos':[{'id':'novo'}], 'dados_hierarquizacao':{'objetos':[{'cabecalho_objeto':{'id':'historico','nome':'Salvo'}}]}}
    assert hier._response(row).objetos==[{'id':'historico','nome':'Salvo'}]
    row['dados_hierarquizacao']['objetos']=[]
    assert hier._response(row).objetos==[]


def test_pesos_proprios_substituem_payload_e_rejeitam_atributo_sem_vinculo():
    matrix=[{'Etapa':'3','Critério':'Custo','Métrica':'custo'},{'Etapa':'3','Critério':'Prazo','Métrica':'prazo'}]
    data={'comparacao_colaborativa':{'analise_homologada_id':'an1','criterios':matrix,'pesos':{'criteria':['Custo','Prazo'],'weights':[.8,.2]}}}
    criteria=[{'nome_coluna':'custo','peso':.1},{'nome_coluna':'prazo','peso':.9}]
    assert [c['peso'] for c in aplicar_pesos(data,criteria)]==[.8,.2]
    other=deepcopy(data);other['comparacao_colaborativa']['pesos']['weights']=[.3,.7]
    assert [c['peso'] for c in aplicar_pesos(other,criteria)]==[.3,.7]
    assert criteria[0]['peso']==.1
    with pytest.raises(DemandaValidationError):
        aplicar_pesos(data,[{'nome_coluna':'outro','peso':1}])


def test_hierarquizacao_com_julgamentos_nao_e_excluida(monkeypatch):
    monkeypatch.setattr(hier.repo,'get_by_codigo',lambda code:{'julgamento_id':'j1'})
    with pytest.raises(DemandaValidationError):
        hier.excluir_hierarquizacao('H1')


def test_homologacao_grava_vinculo_e_snapshot_juntos(monkeypatch):
    analysis={'id':'an1','ambiente_id':'j1','consistente':True,'matriz_consolidada':[[1,3],[1/3,1]],'pesos_consolidados':[.75,.25], 'lambda_max':2,'indice_consistencia':0,'indice_aleatorio':0,'razao_consistencia':0}
    environment={'id':'j1','hierarquizacao_id':HID,'criterios':[{'criterio':'C1'},{'criterio':'C2'}]}
    monkeypatch.setattr(service.analise_repo,'get_by_id',lambda _id:dict(analysis))
    monkeypatch.setattr(service.analise_repo,'list_resposta_ids',lambda _id:RIDS)
    monkeypatch.setattr(service.repo,'get_ambiente_by_id',lambda _id:environment)
    monkeypatch.setattr(service,'_carregar_hierarquizacao',lambda _id:{'id':HID})
    monkeypatch.setattr(service,'_analise_response',lambda data:data)
    calls=[]
    monkeypatch.setattr(service.repo,'atualizar_consolidacao',lambda *args,**kw:calls.append((args,kw)))
    service.homologar_analise('an1','u1')
    assert len(calls)==1
    args,kwargs=calls[0]
    assert kwargs['homologacao']==('an1','u1')
    assert args[2]['comparacao_colaborativa']['hierarquizacao_id']==HID
    assert args[2]['comparacao_colaborativa']['pesos']['weights']==[.75,.25]
