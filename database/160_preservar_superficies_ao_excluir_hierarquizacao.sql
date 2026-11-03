BEGIN;

ALTER TABLE geoprocessamento.superficie_criterios
    ALTER COLUMN hierarquizacao_id DROP NOT NULL;

ALTER TABLE geoprocessamento.superficie_criterios
    DROP CONSTRAINT IF EXISTS superficie_criterios_hierarquizacao_id_fkey;

ALTER TABLE geoprocessamento.superficie_criterios
    ADD CONSTRAINT superficie_criterios_hierarquizacao_id_fkey
    FOREIGN KEY (hierarquizacao_id)
    REFERENCES hierarquizacao_demandas.hierarquizacao_portfolio(id)
    ON DELETE SET NULL;

COMMENT ON COLUMN geoprocessamento.superficie_criterios.hierarquizacao_id IS
    'Vínculo com a hierarquização de origem; removido na exclusão da origem, preservando a superfície, as camadas e os cálculos.';

COMMIT;
