ALTER TABLE demandas.analise_demanda
 ADD COLUMN IF NOT EXISTS analise_realizada_em timestamptz;

-- A reemissão do PDF também aciona atualizado_em; o legado preserva a data anterior.
UPDATE demandas.analise_demanda a
 SET analise_realizada_em = COALESCE(
   CASE WHEN a.atualizado_em > (
     SELECT max(v.gerado_em)
     FROM demandas.parecer_complementacao_versao v
     JOIN demandas.solicitacao_complementacao_demanda s ON s.id = v.solicitacao_id
     WHERE s.demanda_codigo = a.demanda_codigo)
   THEN a.atualizado_em END,
   (SELECT NULLIF(v.conteudo->>'atualizado_em', '')::timestamptz
    FROM demandas.parecer_complementacao_versao v
    JOIN demandas.solicitacao_complementacao_demanda s ON s.id = v.solicitacao_id
    WHERE s.demanda_codigo = a.demanda_codigo AND v.origem = 'legado'
    ORDER BY v.gerado_em LIMIT 1),
   a.atualizado_em, a.criado_em)
 WHERE a.analise_realizada_em IS NULL;

COMMENT ON COLUMN demandas.analise_demanda.analise_realizada_em
 IS 'Data da última ação de análise; não é alterada pela reemissão do parecer PDF.';
