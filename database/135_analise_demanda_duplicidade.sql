ALTER TABLE demandas.analise_demanda ADD COLUMN IF NOT EXISTS demanda_duplicada_codigo varchar(64);
COMMENT ON COLUMN demandas.analise_demanda.demanda_duplicada_codigo IS 'Demanda já cadastrada identificada na avaliação de duplicidade';
