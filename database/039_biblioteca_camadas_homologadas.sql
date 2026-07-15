-- Biblioteca imutável de insumos homologados para as fases 1 e 2.
BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.camada_homologada (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camada_id UUID NOT NULL UNIQUE
        REFERENCES geoprocessamento.camada(id) ON DELETE RESTRICT,
    produto_id UUID
        REFERENCES geoprocessamento.produto(id) ON DELETE RESTRICT,
    modulo_consumidor VARCHAR(10) NOT NULL
        CHECK (modulo_consumidor IN ('fase1','fase2','ambos')),
    nome_publicacao VARCHAR(200) NOT NULL,
    versao VARCHAR(40) NOT NULL DEFAULT 'v1',
    finalidade TEXT,
    metadados JSONB NOT NULL DEFAULT '{}'::jsonb,
    homologado_por VARCHAR(200),
    homologado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gp_homologada_modulo
    ON geoprocessamento.camada_homologada(modulo_consumidor, homologado_em DESC);

CREATE OR REPLACE FUNCTION geoprocessamento.fn_bloquear_biblioteca_homologada()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'A biblioteca de camadas homologadas é imutável';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gp_homologada_imutavel
    ON geoprocessamento.camada_homologada;
CREATE TRIGGER trg_gp_homologada_imutavel
BEFORE UPDATE OR DELETE ON geoprocessamento.camada_homologada
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_biblioteca_homologada();

CREATE OR REPLACE FUNCTION geoprocessamento.fn_bloquear_camada_homologada()
RETURNS TRIGGER AS $$
DECLARE alvo UUID;
BEGIN
    alvo := COALESCE(
        (to_jsonb(OLD)->>'camada_id')::uuid,
        (to_jsonb(OLD)->>'id')::uuid
    );
    IF EXISTS (
        SELECT 1 FROM geoprocessamento.camada_homologada h WHERE h.camada_id=alvo
    ) THEN
        RAISE EXCEPTION 'O conteúdo da camada homologada % é imutável', alvo;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gp_camada_homologada_imutavel ON geoprocessamento.camada;
CREATE TRIGGER trg_gp_camada_homologada_imutavel
BEFORE UPDATE OR DELETE ON geoprocessamento.camada
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_camada_homologada();

DROP TRIGGER IF EXISTS trg_gp_feicao_homologada_imutavel ON geoprocessamento.camada_feicao;
CREATE TRIGGER trg_gp_feicao_homologada_imutavel
BEFORE UPDATE OR DELETE ON geoprocessamento.camada_feicao
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_camada_homologada();

DROP TRIGGER IF EXISTS trg_gp_vetor_homologado_imutavel ON geoprocessamento.camada_vetor;
CREATE TRIGGER trg_gp_vetor_homologado_imutavel
BEFORE UPDATE OR DELETE ON geoprocessamento.camada_vetor
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_camada_homologada();

DROP TRIGGER IF EXISTS trg_gp_raster_homologado_imutavel ON geoprocessamento.camada_raster;
CREATE TRIGGER trg_gp_raster_homologado_imutavel
BEFORE UPDATE OR DELETE ON geoprocessamento.camada_raster
FOR EACH ROW EXECUTE FUNCTION geoprocessamento.fn_bloquear_camada_homologada();

COMMENT ON TABLE geoprocessamento.camada_homologada IS
    'Biblioteca append-only de insumos oficiais consumidos pelas fases 1 e 2';

GRANT SELECT, INSERT ON geoprocessamento.camada_homologada TO slt_user;

COMMIT;
