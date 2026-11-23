ALTER TABLE pesquisa.feedback_experiencia
    ADD COLUMN IF NOT EXISTS escopo varchar(30) NOT NULL DEFAULT 'sicard'
        CHECK (escopo IN ('sicard', 'ahp_interativa'));

COMMENT ON COLUMN pesquisa.feedback_experiencia.escopo IS
    'Identifica a pesquisa geral do SICARD ou a pesquisa do formulario de comparacao pareada da AHP Interativa.';
