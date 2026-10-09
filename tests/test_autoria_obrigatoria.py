from types import SimpleNamespace
import pytest
from api.exceptions import DemandaValidationError
from api.services import autoria_demanda as autoria, demanda_service, plano_service, programa_service, campos_demanda
from api.repositories import demanda_repository, plano_repository, programa_repository

ACTOR="00000000-0000-0000-0000-000000000010"

@pytest.mark.parametrize("value",[None,""," ","None","invalid","00000000-0000-0000-0000-000000000000"])
def test_missing_or_invalid_author_rejected(value):
    with pytest.raises(DemandaValidationError): autoria.validar_autor(value)

@pytest.mark.parametrize("service,method",[(demanda_service,"criar_demanda"),(plano_service,"criar_plano"),(programa_service,"criar_programa")])
def test_services_refuse_missing_author_before_any_write(service,method):
    with pytest.raises(DemandaValidationError):getattr(service,method)(None,usuario_id="")

@pytest.mark.parametrize("repo",[demanda_repository,plano_repository,programa_repository])
def test_repository_also_refuses_missing_author(repo,monkeypatch):
    def forbidden():raise AssertionError("Não deve abrir conexão nem gravar")
    monkeypatch.setattr(repo,"get_connection",forbidden)
    with pytest.raises(DemandaValidationError):repo.insert({})


def test_normal_author_is_actor_and_ignores_representative():
    row={"criado_por":autoria.SEI_ANALISTA_USUARIO_ID}
    campos_demanda.aplicar_auditoria_usuario(row,"00000000-0000-0000-0000-000000000001",ACTOR)
    assert row["criado_por"]==ACTOR and row["sigma_pessoa_id"]!=ACTOR
    assert autoria.resolver_autor(ACTOR)==ACTOR


def test_sei_author_is_session_actor():
    assert autoria.resolver_autor(ACTOR,"SEI")==ACTOR


def test_project_sei_assigns_session_actor_to_both_audit_fields(monkeypatch):
    captured={}
    monkeypatch.setattr(demanda_service,"status_inicial_sei",lambda:"analise_em_avaliacao")
    monkeypatch.setattr(demanda_service,"resolver_autor",lambda actor,source:actor)
    monkeypatch.setattr(demanda_service,"gerar_codigo_unico",lambda *args:"I-PRJ-SEI-12345678")
    monkeypatch.setattr(demanda_service,"_build_persist_row",lambda payload,code,actor:dict(criado_por=actor,atualizado_por=actor))
    monkeypatch.setattr(demanda_repository,"insert",lambda row:(captured.update(row),row)[1])
    monkeypatch.setattr(demanda_service,"_row_to_response",lambda row,**kwargs:row)
    demanda_service.criar_demanda(SimpleNamespace(),usuario_id=ACTOR,origem="SEI")
    assert captured["criado_por"]==ACTOR
    assert captured["atualizado_por"]==ACTOR

@pytest.mark.parametrize("active,edge,valid",[(True,True,True),(False,True,False),(True,False,False)])
def test_sei_status_requires_active_domain_and_official_transition(monkeypatch,active,edge,valid):
    from api.services import status_transicoes as st
    monkeypatch.setattr(st.dominio_repository,"list_status_demanda",lambda:[{"codigo":"analise_rascunho"}]+([{"codigo":"analise_em_avaliacao"}] if active else []))
    monkeypatch.setattr(st.dominio_repository,"list_transicoes_status_demanda",lambda **kw:[{"status_origem":"analise_rascunho","status_destino":"analise_em_avaliacao"}] if edge else [])
    if valid: assert st.status_inicial_sei()=="analise_em_avaliacao"
    else:
        with pytest.raises(DemandaValidationError):st.status_inicial_sei()

@pytest.mark.parametrize("service,repo,method,read,schema",[
    (demanda_service,demanda_repository,"atualizar_demanda","obter_demanda","DemandaUpdateSchema"),
    (plano_service,plano_repository,"atualizar_plano","obter_plano","PlanoUpdateSchema"),
    (programa_service,programa_repository,"atualizar_programa","obter_programa","ProgramaUpdateSchema"),
])
def test_unchanged_patch_does_not_write_or_replace_auditor(monkeypatch,service,repo,method,read,schema):
    from api.schemas.demanda import DemandaUpdateSchema
    from api.schemas.plano import PlanoUpdateSchema
    from api.schemas.programa import ProgramaUpdateSchema
    schemas={s.__name__:s for s in [DemandaUpdateSchema,PlanoUpdateSchema,ProgramaUpdateSchema]}
    existing={"nome":"Demanda existente","atualizado_por":"editor anterior"}
    monkeypatch.setattr(repo,"get_by_codigo",lambda code:existing)
    monkeypatch.setattr(service,read,lambda *args,**kwargs:existing)
    def forbidden(*args,**kwargs):raise AssertionError("PATCH sem mudanças não pode gravar")
    monkeypatch.setattr(repo,"update",forbidden)
    result=getattr(service,method)("CODIGO",schemas[schema](nome="Demanda existente"),usuario_id=ACTOR)
    assert result["atualizado_por"]=="editor anterior"
