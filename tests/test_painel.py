from __future__ import annotations

from api.services import painel_service


def _row(codigo: str, status: str) -> dict:
    return {
        "codigo": codigo,
        "tipo": "projeto",
        "status": status,
        "criado_em": "2026-07-15T12:00:00",
        "nome": f"Demanda {codigo}",
        "representante_nome": "Pessoa Restrita",
        "representante_email": "restrito@example.org",
        "representante_telefone": "(00) 0000-0000",
        "sigma_pessoa_id": "00000000-0000-0000-0000-000000000001",
    }


def test_painel_publico_lista_todos_os_status_e_remove_dados_pessoais(monkeypatch) -> None:
    rows = [
        _row("PROJ-001", "cadastro_pendente"),
        _row("PROJ-002", "hierarq_ranqueada"),
    ]
    monkeypatch.setattr(painel_service.painel_repository, "list_all", lambda: rows)

    items = painel_service.listar_demandas_painel(public_only=True)

    assert [item.id for item in items] == ["PROJ-001", "PROJ-002"]
    assert [item.status for item in items] == ["cadastro_pendente", "hierarq_ranqueada"]
    assert all(item.representante is None for item in items)


def test_painel_restrito_mantem_dados_pessoais(monkeypatch) -> None:
    monkeypatch.setattr(
        painel_service.painel_repository,
        "list_all",
        lambda: [_row("PROJ-001", "cadastro_pendente")],
    )

    [item] = painel_service.listar_demandas_painel(public_only=False)

    assert item.representante is not None
    assert item.representante.nome == "Pessoa Restrita"
    assert item.representante.email == "restrito@example.org"


def test_resultados_individuais_acumulados_sem_expor_documentos_internos(monkeypatch) -> None:
    row = _row("PROJ-001", "hierarq_finalizada")
    row["hierarquizacoes"] = [{
        "codigo": "H-1", "nome": "Rodada original", "status": "calculada",
        "sintese": {"operador": "media_simples", "peso_rede": 0.333},
        "objeto": {
            "cabecalho_objeto": {"representante_email": "privado@example.org"},
            "hierarquizacao": {
                "fase_1": {"status_fase1": "apto", "resumo_elegibilidade": {
                    "indice_de_risco_ambiental_e_territorial": 0,
                }, "execucao": {"arquivo": "pasta-interna/resultado.gpkg"}},
                "fase_2": {"indice_favorabilidade_rede": 0.6, "indice_favorabilidade_grade": 0.9},
                "fase_3": {"score_fase3": 0.3, "pesos_fase3": {"Maturidade": 1}},
                "sintese": {"executada": True, "score_final": 0.6, "posicao_final": 2},
            },
        },
    }, {"codigo": "H-2", "nome": "Nova rodada", "status": "em_julgamento", "objeto": {}}]
    monkeypatch.setattr(painel_service.painel_repository, "list_all", lambda: [row])
    for publico in (False,):
        [item] = painel_service.listar_demandas_painel(public_only=publico)
        assert len(item.hierarquizacoes) == 2
        resultado, nova = item.hierarquizacoes
        assert resultado.indice_risco == 0
        assert resultado.indice_rede == 0.6 and resultado.indice_territorial == 0.9
        assert resultado.indice_prioridade == 0.3 and resultado.indice_final == 0.6
        assert resultado.posicao == 2
        assert resultado.pesos_sintese == dict.fromkeys(("rede", "territorial", "prioridade"), 1 / 3)
        assert resultado.pesos_prioridade == {"Maturidade": 1}
        assert nova.posicao is None and nova.indice_final is None
        serializado = resultado.model_dump_json()
        assert "privado@example.org" not in serializado and "pasta-interna" not in serializado
    [publico] = painel_service.listar_demandas_painel(public_only=True)
    assert publico.hierarquizacoes == []


def test_sintese_desatualizada_nao_exibe_posicao_nem_indice_final(monkeypatch) -> None:
    row = _row("P-1", "hierarq_em_andamento")
    row["hierarquizacoes"] = [{
        "codigo": "H-1", "nome": "Teste", "status": "calculada",
        "relatorios": {"sintese": {"desatualizado": True}},
        "objeto": {"hierarquizacao": {"sintese": {"score_final": 0.9, "posicao_final": 1}}},
    }]
    monkeypatch.setattr(painel_service.painel_repository, "list_all", lambda: [row])
    [item] = painel_service.listar_demandas_painel()
    [resultado] = item.hierarquizacoes
    assert resultado.desatualizada
    assert resultado.indice_final is None and resultado.posicao is None


def test_pesos_nao_sao_reconstituidos_quando_score_historico_diverge():
    resultado = painel_service._resultado_individual({
        "codigo": "H-1", "nome": "Histórica", "status": "calculada",
        "sintese": {"operador": "media_simples"},
        "objeto": {"hierarquizacao": {
            "fase_2": {"indice_favorabilidade_rede": 0.6, "indice_favorabilidade_grade": 0.9},
            "fase_3": {"score_fase3": 0.3},
            "sintese": {"executada": True, "score_final": 0.1234, "posicao_final": 1},
        }},
    })
    assert resultado.indice_final == 0.1234 and resultado.posicao == 1
    assert resultado.pesos_sintese == {}


def test_repositorio_vincula_rodadas_por_tipo_e_codigo_sem_duplicar_demanda(monkeypatch):
    from api.repositories import painel_repository as repo

    plano = {**_row("D-1", "hierarq_em_andamento"), "tipo": "plano"}
    projeto = _row("D-1", "hierarq_finalizada")
    rodadas = [
        {"codigo": codigo, "tipo_demanda_id": tipo, "objeto": {"cabecalho_objeto": {"codigo": "D-1"}}}
        for codigo, tipo in (("H-PL", 1), ("H-PR1", 3), ("H-PR2", 3))
    ]

    class Conexao:
        def __init__(self):
            self.consultas = []

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def execute(self, query):
            self.consultas.append(query)
            return self

        def fetchall(self):
            return [[plano], [], [projeto], rodadas][len(self.consultas) - 1]

    conn = Conexao()
    monkeypatch.setattr(repo, "get_connection", lambda: conn)
    itens = repo.list_all()
    assert len(itens) == 2 and len(conn.consultas) == 4
    assert [h["codigo"] for h in itens[0]["hierarquizacoes"]] == ["H-PL"]
    assert [h["codigo"] for h in itens[1]["hierarquizacoes"]] == ["H-PR1", "H-PR2"]
