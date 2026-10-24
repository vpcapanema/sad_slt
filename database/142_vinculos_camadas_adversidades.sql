-- Taxonomia das bases da Fase 1, independente do papel escolhido na análise.
BEGIN;

CREATE TABLE IF NOT EXISTS dominios.camada_adversidade (
    camada_codigo TEXT PRIMARY KEY CHECK (length(btrim(camada_codigo)) > 0),
    tipo_codigo VARCHAR(80) NOT NULL
        REFERENCES dominios.tipo_adversidade(codigo) ON DELETE RESTRICT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dominios.camada_adversidade IS
    'Vínculo temático das camadas com os tipos de adversidade, sem determinar risco, restrição ou peso.';
COMMENT ON COLUMN dominios.camada_adversidade.camada_codigo IS
    'Referência exata da camada (storage:...::camada ou ID), ou identificador canônico do componente/arquivo sem extensão. Referência exata tem precedência.';

INSERT INTO dominios.camada_adversidade (camada_codigo, tipo_codigo)
VALUES
    ('cavidades_influencia', 'influencia_cavidade'),
    ('inundacao', 'inundacao'),
    ('movimento_massa', 'movimento_massa'),
    ('aprm_alto_juquery', 'aprm_mananciais'),
    ('aprm_alto_tiete_cabec', 'aprm_mananciais'),
    ('aprm_billings', 'aprm_mananciais'),
    ('aprm_guarapiranga', 'aprm_mananciais'),
    ('areas_contaminadas_cetesb', 'area_contaminada'),
    ('areas_restricao_cetesb', 'restricao_cetesb'),
    ('assentamentos_sp', 'assentamento_rural'),
    ('bens_tombados_condephaat', 'bem_tombado'),
    ('bens_tombados_iphan_sp', 'bem_tombado'),
    ('embargos_estaduais_sigam', 'embargo_ambiental'),
    ('embargos_ibama_ativos_sp', 'embargo_ambiental'),
    ('manguezais_ibama_sp', 'manguezal'),
    ('quilombos_sp', 'territorio_quilombola'),
    ('sitios_arqueologicos', 'sitio_arqueologico'),
    ('terras_indigenas_sp', 'terra_indigena'),
    ('ucs_protecao_integral_estadual_sp', 'uc_protecao_integral'),
    ('ucs_protecao_integral_federal_sp', 'uc_protecao_integral'),
    ('ucs_protecao_integral_municipal_sp', 'uc_protecao_integral'),
    ('ucs_uso_sustentavel_estadual_sp', 'uc_uso_sustentavel'),
    ('ucs_uso_sustentavel_federal_sp', 'uc_uso_sustentavel'),
    ('ucs_uso_sustentavel_municipal_sp', 'uc_uso_sustentavel')
ON CONFLICT (camada_codigo) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON dominios.camada_adversidade TO slt_user;
COMMIT;
