BEGIN;

-- O sistema não oferece salvamento parcial: todo registro existente em
-- rascunho foi efetivamente submetido pelo formulário e deve aguardar análise.
UPDATE demandas.plano
   SET status = 'analise_em_avaliacao'
 WHERE status = 'analise_rascunho';

UPDATE demandas.programa
   SET status = 'analise_em_avaliacao'
 WHERE status = 'analise_rascunho';

UPDATE demandas.projeto
   SET status = 'analise_em_avaliacao'
 WHERE status = 'analise_rascunho';

ALTER TABLE demandas.plano
    ALTER COLUMN status SET DEFAULT 'analise_em_avaliacao';

ALTER TABLE demandas.programa
    ALTER COLUMN status SET DEFAULT 'analise_em_avaliacao';

ALTER TABLE demandas.projeto
    ALTER COLUMN status SET DEFAULT 'analise_em_avaliacao';

COMMIT;
