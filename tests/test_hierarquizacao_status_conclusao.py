from copy import deepcopy

import pytest

from api.exceptions import DemandaValidationError
from api.repositories import hierarquizacao_repository as repo


class Consulta:
    def __init__(self, linhas):
        self.linhas = linhas

    def fetchone(self):
        return self.linhas[0] if self.linhas else None

    def fetchall(self):
        return self.linhas


class Conexao:
    def __init__(self, tipo, cadastros, permitida=True):
        self.tipo, self.cadastros, self.permitida = tipo, cadastros, permitida
        self.operacoes = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, query, params):
        texto = query if isinstance(query, str) else query.as_string()
        self.operacoes.append((texto, params))
        if "SELECT tipo_demanda_id" in texto:
            return Consulta([{"tipo_demanda_id": self.tipo}])
        if "SELECT id, status" in texto:
            return Consulta(self.cadastros)
        if "dom_status_demanda_transicao" in texto:
            return Consulta([{"permitida": 1}] if self.permitida else [])
        return Consulta([])


@pytest.mark.parametrize("tipo,tabela", [(1, "plano"), (2, "programa"), (3, "projeto")])
def test_conclusao_por_id_preserva_execucao_e_suspensao(tipo, tabela):
    estados = ["hierarq_em_andamento", "exec_em_execucao", "hierarq_suspensa"]
    cadastros = [{"id": str(i), "status": s} for i, s in enumerate(estados)]
    conn = Conexao(tipo, cadastros)
    dados = {"objetos": [{"cabecalho_objeto": {"demanda_id": c["id"]}} for c in cadastros]}
    repo._concluir_demandas(conn, "H-1", dados)
    assert [o["cabecalho_objeto"]["status"] for o in dados["objetos"]] == [
        "hierarq_homologada", *estados[1:],
    ]
    update = next((q, p) for q, p in conn.operacoes if q.startswith("UPDATE"))
    assert f'"demandas"."{tabela}"' in update[0]
    assert "id=%s::uuid" in update[0] and "AND status=%s" in update[0]
    assert update[1] == ("hierarq_homologada", "0", "hierarq_em_andamento")


def test_dominio_bloqueia_conclusao_sem_transicao():
    conn = Conexao(3, [{"id": "1", "status": "hierarq_em_andamento"}], permitida=False)
    with pytest.raises(DemandaValidationError, match="domínio"):
        repo._concluir_demandas(conn, "H-1", {"objetos": [{"cabecalho_objeto": {"demanda_id": "1"}}]})
    assert not any(q.startswith("UPDATE") for q, _ in conn.operacoes)


def test_cadastro_ausente_bloqueia_conclusao():
    with pytest.raises(DemandaValidationError, match="não encontrada"):
        repo._concluir_demandas(Conexao(3, []), "H-1", {"objetos": [{"cabecalho_objeto": {"demanda_id": "1"}}]})


class ConexaoRodada(Conexao):
    def __init__(self, tipo, cadastros, rodada, outras=()):
        super().__init__(tipo, cadastros)
        self.rodada, self.outras = rodada, outras

    def execute(self, query, params=None):
        texto = query if isinstance(query, str) else query.as_string()
        if "FOR UPDATE" in texto and "SELECT status" in texto and "FROM" in texto and "id, status" not in texto:
            self.operacoes.append((texto, params))
            return Consulta([self.rodada])
        if "jsonb_array_elements" in texto:
            self.operacoes.append((texto, params))
            return Consulta(self.outras)
        return super().execute(query, params)


def _dados(*ids):
    return {"objetos": [{"cabecalho_objeto": {"demanda_id": i, "status": "hierarq_em_andamento"}} for i in ids]}


def _preparar(monkeypatch, conn):
    monkeypatch.setattr(repo, "get_connection", lambda: conn)
    monkeypatch.setattr(repo, "commit_unless_atomic", lambda c: None)
    monkeypatch.setattr(repo, "get_by_codigo", lambda codigo: {"codigo": codigo})


def test_update_nao_conclui_demandas_nem_muta_entrada(monkeypatch):
    conn = ConexaoRodada(3, [{"id": "1", "status": "hierarq_em_andamento"}], {"status": "calculada"})
    _preparar(monkeypatch, conn)
    data = {"status": "calculada", "dados_hierarquizacao": _dados("1")}
    original = deepcopy(data)
    assert repo.update("H-1", data) == {"codigo": "H-1"}
    assert data == original
    assert not any("hierarq_finalizada" in q for q, _ in conn.operacoes)
    assert conn.operacoes[-1][0].startswith("UPDATE")


def test_update_bloqueia_rodada_homologada(monkeypatch):
    conn = ConexaoRodada(3, [], {"status": "homologada"})
    _preparar(monkeypatch, conn)
    with pytest.raises(DemandaValidationError, match="homologada"):
        repo.update("H-1", {"ranking": []})
    assert not any(q.startswith("UPDATE") for q, _ in conn.operacoes)


def test_homologar_conclui_demandas_e_registra_responsavel(monkeypatch):
    rodada = {"status": "calculada", "ranking": [1], "homologado_por": None, "dados_hierarquizacao": _dados("1")}
    conn = ConexaoRodada(3, [{"id": "1", "status": "hierarq_em_andamento"}], rodada)
    _preparar(monkeypatch, conn)
    repo.homologar("H-1", "u-1")
    demanda = next(q for q, _ in conn.operacoes if '"demandas"."projeto"' in q and q.startswith("UPDATE"))
    assert "status=%s" in demanda
    query, params = conn.operacoes[-1]
    assert "status='homologada'" in query and params[0] == "u-1"
    dados = params[1].obj
    assert dados["objetos"][0]["cabecalho_objeto"]["status"] == "hierarq_homologada"
    assert dados["cabecalho_grupo"]["historico_homologacao"][0]["acao"] == "homologada"


def test_homologar_exige_ranking_calculado(monkeypatch):
    rodada = {"status": "calculada", "ranking": None, "homologado_por": None, "dados_hierarquizacao": _dados("1")}
    _preparar(monkeypatch, ConexaoRodada(3, [], rodada))
    with pytest.raises(DemandaValidationError, match="síntese"):
        repo.homologar("H-1", "u-1")


def test_reverter_devolve_demandas_exceto_as_de_outra_homologada(monkeypatch):
    rodada = {"status": "homologada", "ranking": [1], "homologado_por": "u-1", "dados_hierarquizacao": _dados("1", "2")}
    for o in rodada["dados_hierarquizacao"]["objetos"]:
        o["cabecalho_objeto"]["status"] = "hierarq_finalizada"
    outra = {"status": "homologada", "dados_hierarquizacao": _dados("2")}
    conn = ConexaoRodada(3, [{"id": i, "status": "hierarq_homologada"} for i in ("1", "2")],
                         rodada, outras=[outra])
    _preparar(monkeypatch, conn)
    repo.reverter_homologacao("H-1", "u-2")
    liberacao = next(p for q, p in conn.operacoes if q.startswith("UPDATE") and '"projeto"' in q)
    assert liberacao[1] == "1"
    query, params = conn.operacoes[-1]
    assert "status='calculada'" in query and "homologado_por=NULL" in query
    status = [o["cabecalho_objeto"]["status"] for o in params[0].obj["objetos"]]
    assert status == ["hierarq_em_andamento", "hierarq_homologada"]


def test_reverter_exige_rodada_homologada(monkeypatch):
    rodada = {"status": "calculada", "ranking": [1], "homologado_por": None, "dados_hierarquizacao": _dados("1")}
    _preparar(monkeypatch, ConexaoRodada(3, [], rodada))
    with pytest.raises(DemandaValidationError, match="homologada"):
        repo.reverter_homologacao("H-1", "u-2")


@pytest.mark.parametrize("destino,origem", [
    ("hierarq_publicada", "hierarq_homologada"),
    ("hierarq_homologada", "hierarq_publicada"),
    ("hierarq_em_andamento", "hierarq_publicada"),
])
def test_sincronizacao_status_publicacao_confere_transicao(destino, origem):
    dados = _dados("1")
    conn = ConexaoRodada(3, [{"id": "1", "status": origem}], {})
    repo._sincronizar_status_demandas(conn, "H1", dados, destino)
    assert dados["objetos"][0]["cabecalho_objeto"]["status"] == destino
    assert any("dom_status_demanda_transicao" in q and p == (origem, destino) for q, p in conn.operacoes)


def test_despublicar_preserva_status_de_outra_publicacao_vigente():
    from api.services.publicacao_hierarquizacao import assinatura_resultados

    outra = {"status": "homologada", "ranking": [{"demanda_id": "1", "posicao": 1}],
             "dados_hierarquizacao": _dados("1")}
    outra["dados_hierarquizacao"]["cabecalho_grupo"] = {"publicacao": {
        "ativa": True, "assinatura_resultados": assinatura_resultados(outra),
    }}
    dados = _dados("1")
    conn = ConexaoRodada(3, [{"id": "1", "status": "hierarq_publicada"}], {}, outras=[outra])
    repo._sincronizar_status_demandas(conn, "H1", dados, "hierarq_homologada")
    assert dados["objetos"][0]["cabecalho_objeto"]["status"] == "hierarq_publicada"
    assert not any(q.startswith("UPDATE") for q, _ in conn.operacoes)


def test_reverter_revoga_publicacao_e_preserva_auditoria(monkeypatch):
    dados = _dados("1")
    dados["cabecalho_grupo"] = {"publicacao": {"ativa": True, "publicado_por": "u1", "publicado_em": "data"}}
    rodada = {"status": "homologada", "ranking": [1], "homologado_por": "u1", "dados_hierarquizacao": dados}
    conn = ConexaoRodada(3, [{"id": "1", "status": "hierarq_publicada"}], rodada)
    _preparar(monkeypatch, conn)
    repo.reverter_homologacao("H-1", "u2")
    persistidos = conn.operacoes[-1][1][0].obj["cabecalho_grupo"]
    assert persistidos["publicacao"] == {"ativa": False, "publicado_por": "u1", "publicado_em": "data"}
    assert [h["acao"] for h in persistidos["historico_homologacao"]] == ["publicacao_revogada", "revertida"]
    assert all(h["usuario_id"] == "u2" for h in persistidos["historico_homologacao"])


def test_recalculo_nao_reutiliza_publicacao_anterior(monkeypatch):
    conn = ConexaoRodada(3, [], {"status": "calculada"})
    _preparar(monkeypatch, conn)
    dados = {"cabecalho_grupo": {"publicacao": {"ativa": True, "publicado_por": "u1"}}}
    repo.update("H-1", {"dados_hierarquizacao": dados, "ranking": []})
    params = conn.operacoes[-1][1]
    cab = params["dados_hierarquizacao"].obj["cabecalho_grupo"]
    assert cab["publicacao"]["ativa"] is False
    assert cab["historico_homologacao"][0]["acao"] == "publicacao_invalidada"
    assert dados["cabecalho_grupo"]["publicacao"]["ativa"] is True


def test_registro_cadastral_vem_do_cadastro_vivo_e_preserva_resultados_das_fases():
    vivo = {"id": "1", "codigo": "C-1", "nome": "Nome corrigido", "status": "hierarq_finalizada",
            "latitude": 1.5, "longitude": 2.5, "descricao": "nova", "valor_global": 10}
    conn = Conexao(3, [vivo])
    conn.execute = lambda query, params=None: Consulta([vivo])
    objeto = {"cabecalho_objeto": {
        "demanda_id": "1", "codigo": "C-1", "nome": "ANTIGO", "status": "hierarq_em_andamento",
        "latitude": 0, "longitude": 0, "atributos": {"descricao": "velha", "valor_global": 1, "maturidade_objeto": "x"},
        "atributos_fase3": {"a": 1},
    }, "hierarquizacao": {"fase_3": {"score_fase3": 0.7}}}
    row = {"tipo_demanda_id": 3, "dados_hierarquizacao": {"objetos": [objeto]},
           "ranking": [{"demanda_id": "1", "nome": "ANTIGO", "codigo": "C-1", "score": 0.7}]}
    repo._hidratar(conn, row)
    cab = objeto["cabecalho_objeto"]
    assert (cab["nome"], cab["status"], cab["latitude"]) == ("Nome corrigido", "hierarq_finalizada", 1.5)
    assert cab["atributos"] == {"descricao": "nova", "valor_global": 10, "maturidade_objeto": "x"}
    assert cab["atributos_fase3"] == {"a": 1}
    assert objeto["hierarquizacao"]["fase_3"]["score_fase3"] == 0.7
    assert row["ranking"][0]["nome"] == "Nome corrigido" and row["ranking"][0]["score"] == 0.7


class Usuario:
    def __init__(self, id, tipo):
        self.id, self.tipo_usuario = id, tipo


def test_regra_de_quem_pode_reverter():
    from api.services.hierarquizacao_service import pode_reverter_homologacao as pode
    row = {"homologado_por": "u-1"}
    assert not pode(row, Usuario("u-1", "GESTOR"))
    assert pode(row, Usuario("u-2", "GESTOR"))
    assert pode(row, Usuario("u-1", "ADMIN"))
    assert not pode(row, Usuario("u-3", "OPERADOR"))
    assert pode({"homologado_por": None}, Usuario("u-1", "GESTOR"))
