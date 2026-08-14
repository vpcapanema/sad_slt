-- Consolidação das respostas do ambiente colaborativo (média geométrica — AIJ).

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS matriz_consolidada JSONB,
    ADD COLUMN IF NOT EXISTS pesos_consolidados JSONB,
    ADD COLUMN IF NOT EXISTS lambda_max NUMERIC(12, 6),
    ADD COLUMN IF NOT EXISTS indice_consistencia NUMERIC(12, 6),
    ADD COLUMN IF NOT EXISTS indice_aleatorio NUMERIC(12, 6),
    ADD COLUMN IF NOT EXISTS razao_consistencia NUMERIC(12, 6),
    ADD COLUMN IF NOT EXISTS consistente BOOLEAN,
    ADD COLUMN IF NOT EXISTS respostas_consolidadas INTEGER,
    ADD COLUMN IF NOT EXISTS consolidado_em TIMESTAMPTZ;

COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.matriz_consolidada IS
    'Matriz pareada agregada por média geométrica elemento a elemento (AIJ) das respostas consistentes.';
COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.pesos_consolidados IS
    'Vetor de pesos (autovetor principal normalizado) da matriz consolidada.';
COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.respostas_consolidadas IS
    'Quantidade de respostas incluídas na consolidação.';
