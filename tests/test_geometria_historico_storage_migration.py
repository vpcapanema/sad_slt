from pathlib import Path


def test_historico_exige_storage_e_impede_novos_binarios_no_banco():
    migration = Path("database/131_geometria_historico_storage_metadata.sql").read_text(
        encoding="utf-8"
    )

    assert "conteudo_binario IS NULL" in migration
    assert "storage_caminho IS NOT NULL" in migration
    assert "length(btrim(storage_caminho)) > 0" in migration
    assert "num_nonnulls(nome_arquivo, extensao, tipo_mime, tamanho_bytes, sha256) IN (0, 5)" in migration
    assert "VALIDATE CONSTRAINT ck_projeto_geometria_historico_arquivo_completo" in migration
    assert "VALIDATE CONSTRAINT ck_projeto_geometria_historico_arquivo_por_origem" in migration


def test_migration_131_esta_registrada_no_aplicador():
    apply_script = Path("scripts/apply-database.ps1").read_text(encoding="utf-8")

    assert '"131_geometria_historico_storage_metadata.sql"' in apply_script
    assert "Migração 131 pendente" in apply_script
