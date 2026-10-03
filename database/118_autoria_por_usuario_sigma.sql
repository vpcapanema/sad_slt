-- A autoria identifica a conta SIGMA que executou a ação, não o representante.
-- O representante legal permanece em sigma_pessoa_id/representante_nome.
BEGIN;

DROP TRIGGER IF EXISTS trg_plano_auditoria_representante ON demandas.plano;
DROP TRIGGER IF EXISTS trg_programa_auditoria_representante ON demandas.programa;
DROP TRIGGER IF EXISTS trg_projeto_auditoria_representante ON demandas.projeto;
DROP FUNCTION IF EXISTS demandas.fn_auditoria_representante();

ALTER TABLE demandas.plano
    DROP CONSTRAINT IF EXISTS ck_plano_criado_por_representante,
    ALTER COLUMN criado_por DROP NOT NULL,
    ALTER COLUMN atualizado_por DROP NOT NULL;
ALTER TABLE demandas.programa
    DROP CONSTRAINT IF EXISTS ck_programa_criado_por_representante,
    ALTER COLUMN criado_por DROP NOT NULL,
    ALTER COLUMN atualizado_por DROP NOT NULL;
ALTER TABLE demandas.projeto
    DROP CONSTRAINT IF EXISTS ck_projeto_criado_por_representante,
    ALTER COLUMN criado_por DROP NOT NULL,
    ALTER COLUMN atualizado_por DROP NOT NULL;

-- O histórico contém IDs das pessoas representantes, não das contas que
-- executaram cada ação. Não há vínculo suficiente para reconstruir essa autoria.
UPDATE demandas.plano SET criado_por = NULL, atualizado_por = NULL;
UPDATE demandas.programa SET criado_por = NULL, atualizado_por = NULL;
UPDATE demandas.projeto SET criado_por = NULL, atualizado_por = NULL;

COMMENT ON COLUMN demandas.plano.criado_por IS
    'UUID de usuarios.usuario (SIGMA) que criou o registro; NULL para autoria histórica não rastreável';
COMMENT ON COLUMN demandas.plano.atualizado_por IS
    'UUID de usuarios.usuario (SIGMA) que realizou a última atualização';
COMMENT ON COLUMN demandas.programa.criado_por IS
    'UUID de usuarios.usuario (SIGMA) que criou o registro; NULL para autoria histórica não rastreável';
COMMENT ON COLUMN demandas.programa.atualizado_por IS
    'UUID de usuarios.usuario (SIGMA) que realizou a última atualização';
COMMENT ON COLUMN demandas.projeto.criado_por IS
    'UUID de usuarios.usuario (SIGMA) que criou o registro; NULL para autoria histórica não rastreável';
COMMENT ON COLUMN demandas.projeto.atualizado_por IS
    'UUID de usuarios.usuario (SIGMA) que realizou a última atualização';

COMMIT;