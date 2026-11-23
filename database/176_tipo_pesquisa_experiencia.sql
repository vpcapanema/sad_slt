ALTER TABLE pesquisa.feedback_experiencia
    ADD COLUMN IF NOT EXISTS tipo_pesquisa varchar(30)
        GENERATED ALWAYS AS (
            CASE escopo
                WHEN 'sicard' THEN 'experiencia_usuario'
                WHEN 'ahp_interativa' THEN 'satisfacao'
            END
        ) STORED NOT NULL;

COMMENT ON COLUMN pesquisa.feedback_experiencia.tipo_pesquisa IS
    'Codigo do tipo de formulario: experiencia_usuario ou satisfacao, determinado pelo escopo da pesquisa.';
