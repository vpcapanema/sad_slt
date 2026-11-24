BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    DROP CONSTRAINT IF EXISTS comparacao_colaborativa_ambiente_modo_comparacao_check;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD CONSTRAINT comparacao_colaborativa_ambiente_modo_comparacao_check
    CHECK (modo_comparacao IN ('todos', 'por_grupo', 'dimensoes', 'duas_etapas'));

COMMIT;
