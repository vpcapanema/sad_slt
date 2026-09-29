"""Eventos observados em operações reais pequenas; nenhum banco/serviço externo."""
import pytest
import geopandas as gpd
from shapely.geometry import Point, box
from api.services.controle_processamento import ControleProcessamento, ProcessamentoCancelado
from api.services.feedback_operacao import operacao, contexto
from api.services import extracao_ogr
from api.services.extracao_atributos_estatisticas import enriquecer


def acompanhar():
    controle = ControleProcessamento()
    eventos = []
    publicar = controle.eventos.publicar
    def capturar(estado):
        eventos.append(estado)
        publicar(estado)
    controle.eventos.publicar = capturar
    def progress(mensagem):
        return controle.mensagem(mensagem)
    for nome in ('concluir', 'detalhe', 'tarefa', 'verificar', 'fase', 'progresso_fase'):
        setattr(progress, nome, getattr(controle, nome))
    return controle, progress, eventos


def dados():
    x, y = 5_000_000, 7_500_000
    entrada = gpd.GeoDataFrame({'codigo': ['dentro', 'fora']}, geometry=[Point(x+2,y+2),Point(x+100,y)], crs=5880)
    base = gpd.GeoDataFrame({'valor': [2, 6]}, geometry=[box(x,y,x+10,y+10),box(x,y,x+20,y+20)], crs=5880)
    categorias = [{'id':'risco','nome':'Risco','camadas':[{'id':'b','nome':'Billings','frame':base,'regra':{'prefixo':'b'}}]}]
    return entrada, categorias


def test_operacoes_reais_contagens_exatas_e_geometrias_preservadas():
    controle, progress, eventos = acompanhar()
    entrada, categorias = dados()
    resultado = enriquecer(entrada, categorias, progress=contexto(progress, 'Linhas1'))
    mensagens = [e['mensagem'] for e in controle.logs]
    for trecho in ('Conferindo coordenadas', 'verificando validade', 'índice espacial SQLite', 'ST_Intersects', 'medidas descritivas', 'serializando vínculos', 'Consolidando campo valor'):
        assert any(trecho in m for m in mensagens), trecho
    resumo = next(m for m in mensagens if 'Lote 1–2 concluído' in m)
    assert '2 pares confirmados' in resumo and '1 feições sem correspondência' in resumo
    assert not any('candidatas' in m for m in mensagens)
    query = next(e for e in eventos if 'Consultando ST_Intersects' in e['etapa'] and e['tarefa_estado']=='running')
    assert query['progresso_tarefa'] is None
    assert any(e['tarefa_id']==query['tarefa_id'] and e['tarefa_estado']=='concluido' for e in eventos)
    saida = resultado['camadas']['pontos']
    assert saida.geometry.to_wkb().equals(entrada.to_crs(4674).geometry.to_wkb())
    assert list(saida.b_n_feicoes)==[2,0]
    assert [e['revisao'] for e in eventos]==sorted(set(e['revisao'] for e in eventos))


def test_troca_de_mensagem_nao_conclui_tarefa_anterior():
    c, p, _ = acompanhar()
    primeira = p('Camada')
    segunda = p('Preparação da base')
    assert not any(e['tipo']=='concluido' for e in c.logs)
    c.concluir(segunda, 'Preparação concluída')
    assert c.logs[-1]['tarefa_id']==segunda
    assert not any(e['tipo']=='concluido' and e['tarefa_id']==primeira for e in c.logs)


def test_excecao_nao_emite_conclusao_e_cancelamento_e_cooperativo():
    c, p, _ = acompanhar()
    with pytest.raises(ProcessamentoCancelado):
        with operacao(p, 'Operação demorada') as medir:
            c.cancelar()
            assert c.snapshot()['status']=='executando'
            assert c.snapshot()['cancelamento_solicitado']
            medir(1, 10)
    c.encerrar('cancelado')
    assert c.snapshot()['status']=='cancelado'
    assert not any(e['tipo']=='concluido' for e in c.logs)


def test_cancelamento_durante_lote_libera_indice(monkeypatch):
    c, p, _ = acompanhar()
    entrada, categorias = dados()
    original = extracao_ogr.SpatialJoin.pairs
    close = extracao_ogr.SpatialJoin.close
    fechados = []
    def cancelar(self, geometrias):
        c.cancelar()
        return original(self, geometrias)
    def fechar(self):
        fechados.append(True)
        close(self)
    monkeypatch.setattr(extracao_ogr.SpatialJoin, 'pairs', cancelar)
    monkeypatch.setattr(extracao_ogr.SpatialJoin, 'close', fechar)
    with pytest.raises(ProcessamentoCancelado):
        enriquecer(entrada, categorias, progress=p)
    assert fechados == [True]


def test_checkpoints_frequentes_nao_inundam_snapshots(monkeypatch):
    from api.services import feedback_operacao
    monkeypatch.setattr(feedback_operacao, 'monotonic', lambda: 100.)
    c, p, eventos = acompanhar()
    with operacao(p, 'Consolidando') as medir:
        for i in range(10001):
            medir(i, 10000, 'registros')
    assert len(eventos) <= 6
    assert c.snapshot()['tarefa_concluidas']==10000
    assert c.snapshot()['tarefa_estado']=='concluido'


def test_retencao_informa_lacuna_sem_fingir_historico_completo():
    c, p, _ = acompanhar()
    p('Base')
    for i in range(2100):
        c.detalhe(f'Registro {i}')
    s = c.snapshot()
    assert len(c.logs)==2000 and len(s['logs'])==250
    assert s['historico_inicio']==s['logs'][0]['sequencia']>1
    assert all('em' in e and 'tarefa_id' in e for e in s['logs'])
    assert c.eventos.atual['revisao']==s['revisao']


def test_pacote_tem_eventos_por_arquivo_e_xlsx(tmp_path):
    from api.services.extracao_atributos_pacote_enriquecimento import montar_pacote
    c, p, _ = acompanhar()
    entrada, _ = dados()
    conteudo, nome, manifesto = montar_pacote({'pontos':entrada},entrada,[],{},'Saída',incluir_entrada=False,progress=p)
    assert conteudo.startswith(b'PK') and nome.endswith('.zip')
    concluidas = [e['mensagem'] for e in c.logs if e['tipo']=='concluido']
    for trecho in ('GeoPackage', 'CSV', 'aba XLSX', 'arquivo XLSX', 'SHA-256'):
        assert any(trecho in m for m in concluidas), trecho
    assert len(manifesto)>=5
