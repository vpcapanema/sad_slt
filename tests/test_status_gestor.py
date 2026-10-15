import importlib
from types import SimpleNamespace
import pytest
from api.exceptions import DemandaValidationError

@pytest.mark.parametrize("tipo", ["demanda", "plano", "programa"])
def test_gestor_altera_status_do_dominio_sem_matriz(monkeypatch, tipo):
    service = importlib.import_module(f"api.services.{tipo}_service")
    schema = getattr(importlib.import_module(f"api.schemas.{tipo}"), f"{tipo.title()}UpdateSchema")
    repo = getattr(service, f"{tipo}_repository")
    monkeypatch.setattr(repo, "get_by_codigo", lambda c: {"codigo": c, "status": "analise_em_avaliacao"})
    monkeypatch.setattr(repo, "update", lambda c, data: data)
    monkeypatch.setattr(service, "_row_to_response", lambda row, **kw: row)
    monkeypatch.setattr(service.dominio_repository, "list_status_demanda", lambda: [{"codigo": "analise_aprovada"}, {"codigo": "analise_reprovada"}])
    atualizar = getattr(service, f"atualizar_{tipo}")
    for destino in ("analise_aprovada", "analise_reprovada"):
        result = atualizar("COD", schema(status=destino), usuario_id="GESTOR-ID", status_livre_gestor=True)
        assert result == {"status": destino, "atualizado_por": "GESTOR-ID"}
        with pytest.raises(DemandaValidationError):
            atualizar("COD", schema(status=destino), usuario_id="OUTRO-ID")
    with pytest.raises(DemandaValidationError):
        atualizar("COD", schema(status="inexistente"), usuario_id="GESTOR-ID", status_livre_gestor=True)

@pytest.mark.parametrize("tipo,modulo", [("demanda","demandas"),("plano","planos"),("programa","programas")])
@pytest.mark.parametrize("perfil", ["GESTOR","ANALISTA","ADMIN","OPERADOR"])
def test_rota_deriva_excecao_da_sessao(monkeypatch,tipo,modulo,perfil):
    router=importlib.import_module(f"api.routers.{modulo}")
    service=getattr(router,f"{tipo}_service")
    monkeypatch.setattr(service,f"atualizar_{tipo}",lambda *args,**kw:kw)
    result=getattr(router,f"atualizar_{tipo}")("COD",None,SimpleNamespace(id="USER",tipo_usuario=perfil))
    assert result["status_livre_gestor"] is (perfil=="GESTOR")
