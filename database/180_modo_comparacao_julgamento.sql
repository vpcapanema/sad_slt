BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS modo_comparacao text NOT NULL DEFAULT 'todos'
    CHECK (modo_comparacao IN ('todos', 'por_grupo'));

CREATE OR REPLACE FUNCTION ahp.proteger_modo_comparacao_julgamento()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'O modo de comparação é definido na criação do julgamento.';
END $$;

DROP TRIGGER IF EXISTS julgamento_modo_comparacao_imutavel ON ahp.comparacao_colaborativa_ambiente;
CREATE TRIGGER julgamento_modo_comparacao_imutavel
    BEFORE UPDATE OF modo_comparacao ON ahp.comparacao_colaborativa_ambiente
    FOR EACH ROW WHEN (OLD.modo_comparacao IS DISTINCT FROM NEW.modo_comparacao)
    EXECUTE FUNCTION ahp.proteger_modo_comparacao_julgamento();

COMMIT;
