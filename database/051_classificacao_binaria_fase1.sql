BEGIN;

UPDATE geoprocessamento.configuracao_fatiamento_fase1
SET
    nome = CASE
        WHEN codigo = 'FAT-F1-PADRAO' THEN 'Classificação padrão da Fase 1'
        ELSE nome
    END,
    descricao = 'Duas categorias: risco e restrição.',
    parametros = COALESCE(parametros, '{}'::jsonb) ||
        '{"restricao":{"limiar":1,"regra":"ato_vigente * intersecao_validada * aplicabilidade"},"risco":{"classes":[{"codigo":"risco","rotulo":"Risco","minimo":0,"maximo":null}]}}'::jsonb,
    atualizado_em = CURRENT_TIMESTAMP;

COMMIT;