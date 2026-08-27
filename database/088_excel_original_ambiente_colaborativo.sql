-- O arquivo original da matriz pertence ao julgamento colaborativo que o consumiu.
BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS arquivo_excel_matriz_criterios_premissas BYTEA,
    ADD COLUMN IF NOT EXISTS arquivo_matriz_nome TEXT;

COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.arquivo_excel_matriz_criterios_premissas IS
    'Conteúdo binário do arquivo original da matriz de critérios e premissas usada neste julgamento.';

COMMENT ON COLUMN ahp.comparacao_colaborativa_ambiente.arquivo_matriz_nome IS
    'Nome original do arquivo da matriz de critérios e premissas.';

-- Compatibilidade: cada julgamento antigo recebe uma cópia do arquivo antes salvo na hierarquização.
UPDATE ahp.comparacao_colaborativa_ambiente AS ambiente
   SET arquivo_excel_matriz_criterios_premissas = hierarquizacao.arquivo_excel_matriz_criterios_premissas,
       arquivo_matriz_nome = COALESCE(ambiente.arquivo_matriz_nome, 'matriz-criterios-premissas.xlsx')
  FROM hierarquizacao_demandas.hierarquizacao_portfolio AS hierarquizacao
 WHERE ambiente.hierarquizacao_id = hierarquizacao.id
   AND ambiente.arquivo_excel_matriz_criterios_premissas IS NULL
   AND hierarquizacao.arquivo_excel_matriz_criterios_premissas IS NOT NULL;

COMMENT ON COLUMN hierarquizacao_demandas.hierarquizacao_portfolio.arquivo_excel_matriz_criterios_premissas IS
    'Campo legado mantido para leitura de registros antigos; novos arquivos pertencem ao ambiente colaborativo.';

COMMIT;
