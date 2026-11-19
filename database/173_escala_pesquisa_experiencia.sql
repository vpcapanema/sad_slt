ALTER TABLE pesquisa.feedback_experiencia
    ADD COLUMN IF NOT EXISTS escala_maxima smallint NOT NULL DEFAULT 5 CHECK (escala_maxima IN (5, 7));

DO $$
DECLARE campo text;
BEGIN
    FOREACH campo IN ARRAY ARRAY['facilidade', 'autonomia', 'clareza_interface',
        'compreensao_resultados', 'desempenho', 'satisfacao_geral']
    LOOP
        EXECUTE format('ALTER TABLE pesquisa.feedback_experiencia DROP CONSTRAINT IF EXISTS %I',
            'feedback_experiencia_' || campo || '_check');
        EXECUTE format('ALTER TABLE pesquisa.feedback_experiencia ADD CONSTRAINT %I CHECK (%I BETWEEN 1 AND escala_maxima)',
            'feedback_experiencia_' || campo || '_check', campo);
    END LOOP;
END $$;

COMMENT ON COLUMN pesquisa.feedback_experiencia.indice_experiencia IS
    'Indice de 0 a 100 calculado pela media normalizada das seis respostas conforme escala_maxima.';
