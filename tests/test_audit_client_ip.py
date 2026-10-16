from types import SimpleNamespace

from api.deps.auth import _client_ip


def test_ip_encaminhado_valido():
    request = SimpleNamespace(headers={'x-forwarded-for': '198.51.100.2, 127.0.0.1'},
                              client=SimpleNamespace(host='127.0.0.1'))
    assert _client_ip(request) == '198.51.100.2'


def test_cabecalho_invalido_usa_ip_da_conexao():
    request = SimpleNamespace(headers={'x-forwarded-for': 'invalido'},
                              client=SimpleNamespace(host='127.0.0.1'))
    assert _client_ip(request) == '127.0.0.1'


def test_host_nao_ip_nao_e_enviado_a_coluna_inet():
    request = SimpleNamespace(headers={}, client=SimpleNamespace(host='testclient'))
    assert _client_ip(request) is None
