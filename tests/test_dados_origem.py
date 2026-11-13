"""Origem integral sobrevive ao cadastro, à leitura e às edições comuns."""
import pytest
from api.schemas import demanda, plano, programa
from api.repositories import demanda_repository, plano_repository, programa_repository
from api.services import demanda_service, plano_service, programa_service

ORIGEM = {"arquivo": "proj_GEOM-db.csv", "versao_estrutura": 1, "campos": {"COD_pSICARD": "P3-74", "Nome": "Duplicações", "Código": "001", "Outro": "-", "COD_rede": "R01, R02"}}

@pytest.mark.parametrize("kind,schemas,service,repo", [
    ("Demanda", demanda, demanda_service, demanda_repository),
    ("Plano", plano, plano_service, plano_repository),
    ("Programa", programa, programa_service, programa_repository),
])
def test_origin_roundtrip_and_patch_preservation(kind, schemas, service, repo, monkeypatch):
    payload = getattr(schemas, kind + "CreateSchema")(
        nome="Teste", descricao="Teste", diretoria_id="DIR", plano_id="PLANO",
        lat=-23, lng=-46, instituicao_id="00000000-0000-0000-0000-000000000001",
        representante={"instituicao_id":"00000000-0000-0000-0000-000000000002", "nome":"SEMIL"},
        dados_origem=ORIGEM)
    if kind == "Demanda":
        monkeypatch.setattr(service, "resolve_programa_pai_id", lambda **kw: None)
        monkeypatch.setattr(service.plano_repository, "get_by_codigo", lambda _: {"diretoria_id":"DIR"})
        row = service._build_persist_row(payload, "TESTE", "00000000-0000-0000-0000-000000000003")
    else:
        monkeypatch.setattr(service, "gerar_codigo_unico", lambda *a: "TESTE")
        monkeypatch.setattr(repo, "insert", lambda row, *a, **kw: row)
        original_response = service._row_to_response
        monkeypatch.setattr(service, "_row_to_response", lambda row, **kw: row)
        if kind == "Programa":
            monkeypatch.setattr(service, "resolve_plano_pai_id", lambda **kw: "PLANO")
        row = getattr(service, "criar_" + kind.lower())(payload, usuario_id="00000000-0000-0000-0000-000000000003")
        monkeypatch.setattr(service, "_row_to_response", original_response)
    if kind == "Demanda":
        row["dados_origem"] = row["dados_origem"].obj
    assert row["dados_origem"] == ORIGEM
    row = {k: (v.obj if hasattr(v, "obj") else v) for k, v in row.items()}
    row["criado_em"] = "2026-11-13T12:00:00Z"
    row.update(id="00000000-0000-0000-0000-000000000004", codigo="TESTE")
    assert service._row_to_response(row).dados_origem == ORIGEM
    patch = getattr(schemas, kind + "UpdateSchema")(nome="Novo", dados_origem={"alterado":True})
    assert "dados_origem" not in patch.model_dump(exclude_unset=True)
    assert "dados_origem" not in repo._UPDATE_ALLOWED
    assert "dados_origem" in repo._INSERT_SQL and "dados_origem" in repo._SELECT_BASE


def test_jsonb_preserves_original_text():
    assert demanda_repository.prepare_insert_params({"dados_origem": ORIGEM})["dados_origem"].obj == ORIGEM
