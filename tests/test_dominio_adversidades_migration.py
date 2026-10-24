from pathlib import Path


MIGRATION = Path("database/141_dominio_adversidades.sql")
APPLY_SCRIPT = Path("scripts/apply-database.ps1")


def test_migration_cria_dominios_de_familias_e_tipos_sem_tratamento() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")

    assert "CREATE TABLE IF NOT EXISTS dominios.familia_adversidade" in sql
    assert "CREATE TABLE IF NOT EXISTS dominios.tipo_adversidade" in sql
    assert (
        "REFERENCES dominios.familia_adversidade(codigo) ON DELETE RESTRICT"
        in sql
    )
    assert "tipo_tratamento" not in sql.lower()


def test_migration_registra_familias_e_tipos_iniciais() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")

    for codigo in (
        "perigo_fisico_geotecnico",
        "protecao_regulacao_ambiental",
        "contaminacao_ambiental",
        "ato_administrativo_controle",
        "territorial_fundiario_social",
        "patrimonio_cultural_espeleologico",
        "inundacao",
        "movimento_massa",
        "aprm_mananciais",
        "area_contaminada",
        "embargo_ambiental",
        "terra_indigena",
        "territorio_quilombola",
        "assentamento_rural",
        "influencia_cavidade",
        "sitio_arqueologico",
        "bem_tombado",
    ):
        assert f"('{codigo}'" in sql


def test_migration_de_dominio_esta_registrada_no_aplicador() -> None:
    script = APPLY_SCRIPT.read_text(encoding="utf-8")

    assert '"141_dominio_adversidades.sql"' in script
    assert "dominios.tipo_adversidade" in script
    assert "dominios.familia_adversidade" in script
