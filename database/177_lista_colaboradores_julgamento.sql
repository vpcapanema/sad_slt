ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS lista_colaboradores jsonb
        GENERATED ALWAYS AS (convites) STORED NOT NULL;

COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.lista_colaboradores IS
    'Lista confirmada do julgamento, com nome, e-mail e dimensoes de cada colaborador. Sem dimensoes explicitas, o colaborador recebe a matriz completa.';
