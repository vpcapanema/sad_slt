from api.services import extracao_atributos as service


def test_tabela_ordena_todos_os_registros_antes_do_recorte(monkeypatch):
    monkeypatch.setattr(service, 'consultar', lambda *a, **k: {'status': 'concluido', 'resultado': {'camada_resultado_id': 'saida'}})
    monkeypatch.setattr(service.repo, 'atributos_paginados', lambda *a: {'campos': ['valor'], 'linhas': [{'valor': 100}], 'total': 3})
    monkeypatch.setattr(service.repo, 'atributos_dashboard', lambda *a: [{'propriedades': {'valor': v}} for v in [100, 2, 10]])
    assert service.tabela_resultado('execucao', None, offset=1, limite=1, ordem='valor')['linhas'] == [{'valor': 10}]
    assert service.tabela_resultado('execucao', None, limite=1, ordem='valor', descendente=True)['linhas'] == [{'valor': 100}]
