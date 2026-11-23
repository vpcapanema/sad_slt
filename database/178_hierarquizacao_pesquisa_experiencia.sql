BEGIN;

ALTER TABLE pesquisa.feedback_experiencia
    ALTER COLUMN perfil DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS hierarquizacao_id uuid
        CONSTRAINT fk_feedback_experiencia_hierarquizacao
        REFERENCES hierarquizacao_demandas.hierarquizacao_portfolio(id)
        ON DELETE SET NULL;

COMMENT ON COLUMN pesquisa.feedback_experiencia.hierarquizacao_id IS
    'Hierarquização selecionada na pesquisa geral de experiência.';

COMMIT;
