-- SLT — criado_por/atualizado_por amarrados ao representante legal (sigma_pessoa_id)
-- e preenchimento obrigatório dos campos de cadastro em plano/programa/projeto.
-- Executar após 021_seed_outros_hierarquia.sql.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Backfill — representante e auditoria
-- ---------------------------------------------------------------------------
UPDATE demandas.plano
SET
    sigma_pessoa_id       = COALESCE(sigma_pessoa_id, criado_por, '00000000-0000-0000-0000-000000000001'::uuid),
    representante_nome    = COALESCE(NULLIF(TRIM(representante_nome), ''), 'Sistema SLT'),
    representante_email   = COALESCE(representante_email, ''),
    representante_telefone = COALESCE(representante_telefone, ''),
    sigma_instituicao_id  = COALESCE(sigma_instituicao_id, '00000000-0000-0000-0000-000000000002'::uuid),
    instituicao_nome      = COALESCE(instituicao_nome, ''),
    instituicao_razao_social = COALESCE(instituicao_razao_social, ''),
    instituicao_nome_fantasia = COALESCE(instituicao_nome_fantasia, ''),
    instituicao_cnpj      = COALESCE(instituicao_cnpj, ''),
    objetivo_estrategico  = COALESCE(objetivo_estrategico, ''),
    responsavel           = COALESCE(responsavel, ''),
    valor_global          = COALESCE(valor_global, 0),
    motivo_aprovacao      = COALESCE(motivo_aprovacao, ''),
    criado_por            = COALESCE(criado_por, sigma_pessoa_id),
    atualizado_por        = COALESCE(atualizado_por, sigma_pessoa_id)
WHERE sigma_pessoa_id IS NULL
   OR criado_por IS NULL
   OR atualizado_por IS NULL
   OR representante_nome IS NULL;

UPDATE demandas.plano
SET criado_por = sigma_pessoa_id,
    atualizado_por = COALESCE(atualizado_por, sigma_pessoa_id)
WHERE criado_por IS DISTINCT FROM sigma_pessoa_id;

UPDATE demandas.programa
SET
    plano_id              = COALESCE(plano_id, (SELECT id FROM demandas.plano WHERE codigo = 'PLANO-OUTROS' LIMIT 1)),
    sigma_pessoa_id       = COALESCE(sigma_pessoa_id, criado_por, '00000000-0000-0000-0000-000000000001'::uuid),
    representante_nome    = COALESCE(NULLIF(TRIM(representante_nome), ''), 'Sistema SLT'),
    representante_email   = COALESCE(representante_email, ''),
    representante_telefone = COALESCE(representante_telefone, ''),
    sigma_instituicao_id  = COALESCE(sigma_instituicao_id, '00000000-0000-0000-0000-000000000002'::uuid),
    instituicao_nome      = COALESCE(instituicao_nome, ''),
    instituicao_razao_social = COALESCE(instituicao_razao_social, ''),
    instituicao_nome_fantasia = COALESCE(instituicao_nome_fantasia, ''),
    instituicao_cnpj      = COALESCE(instituicao_cnpj, ''),
    objetivo              = COALESCE(objetivo, ''),
    publico_alvo          = COALESCE(publico_alvo, ''),
    orgao_responsavel     = COALESCE(orgao_responsavel, ''),
    justificativa         = COALESCE(justificativa, ''),
    valor_global          = COALESCE(valor_global, 0),
    motivo_aprovacao      = COALESCE(motivo_aprovacao, ''),
    criado_por            = COALESCE(criado_por, sigma_pessoa_id),
    atualizado_por        = COALESCE(atualizado_por, sigma_pessoa_id);

UPDATE demandas.programa
SET criado_por = sigma_pessoa_id,
    atualizado_por = COALESCE(atualizado_por, sigma_pessoa_id)
WHERE criado_por IS DISTINCT FROM sigma_pessoa_id;

ALTER TABLE demandas.projeto
    DROP CONSTRAINT IF EXISTS ck_projeto_vinculo_tipo;

UPDATE demandas.projeto
SET
    programa_id           = COALESCE(programa_id, (SELECT id FROM demandas.programa WHERE codigo = 'PROG-OUTROS' LIMIT 1)),
    descricao             = COALESCE(descricao, ''),
    instituicao_nome      = COALESCE(instituicao_nome, ''),
    instituicao_razao_social = COALESCE(instituicao_razao_social, ''),
    instituicao_nome_fantasia = COALESCE(instituicao_nome_fantasia, ''),
    instituicao_cnpj      = COALESCE(instituicao_cnpj, ''),
    representante_email   = COALESCE(representante_email, ''),
    representante_telefone = COALESCE(representante_telefone, ''),
    vinculo_tipo          = COALESCE(vinculo_tipo, ''),
    motivo_aprovacao      = COALESCE(motivo_aprovacao, ''),
    classificacao         = COALESCE(classificacao, '{}'::jsonb),
    complementos          = COALESCE(complementos, '{}'::jsonb),
    criado_por            = COALESCE(criado_por, sigma_pessoa_id),
    atualizado_por        = COALESCE(atualizado_por, sigma_pessoa_id);

UPDATE demandas.projeto
SET criado_por = sigma_pessoa_id,
    atualizado_por = COALESCE(atualizado_por, sigma_pessoa_id)
WHERE criado_por IS DISTINCT FROM sigma_pessoa_id;

-- Registros sentinela
UPDATE demandas.plano
SET
    sigma_pessoa_id = '00000000-0000-0000-0000-000000000001'::uuid,
    representante_nome = 'Sistema SLT',
    representante_email = 'sistema@slt.local',
    representante_telefone = '',
    sigma_instituicao_id = '00000000-0000-0000-0000-000000000002'::uuid,
    instituicao_nome = 'Sistema SLT',
    instituicao_razao_social = 'Sistema SLT',
    instituicao_nome_fantasia = 'Sistema SLT',
    instituicao_cnpj = '',
    objetivo_estrategico = COALESCE(objetivo_estrategico, ''),
    responsavel = COALESCE(responsavel, 'Sistema SLT'),
    valor_global = COALESCE(valor_global, 0),
    motivo_aprovacao = COALESCE(motivo_aprovacao, ''),
    criado_por = '00000000-0000-0000-0000-000000000001'::uuid,
    atualizado_por = '00000000-0000-0000-0000-000000000001'::uuid
WHERE codigo = 'PLANO-OUTROS';

UPDATE demandas.programa
SET
    sigma_pessoa_id = '00000000-0000-0000-0000-000000000001'::uuid,
    representante_nome = 'Sistema SLT',
    representante_email = 'sistema@slt.local',
    representante_telefone = '',
    sigma_instituicao_id = '00000000-0000-0000-0000-000000000002'::uuid,
    instituicao_nome = 'Sistema SLT',
    instituicao_razao_social = 'Sistema SLT',
    instituicao_nome_fantasia = 'Sistema SLT',
    instituicao_cnpj = '',
    objetivo = COALESCE(objetivo, ''),
    publico_alvo = COALESCE(publico_alvo, ''),
    orgao_responsavel = COALESCE(orgao_responsavel, 'Sistema SLT'),
    justificativa = COALESCE(justificativa, ''),
    valor_global = COALESCE(valor_global, 0),
    motivo_aprovacao = COALESCE(motivo_aprovacao, ''),
    criado_por = '00000000-0000-0000-0000-000000000001'::uuid,
    atualizado_por = '00000000-0000-0000-0000-000000000001'::uuid
WHERE codigo = 'PROG-OUTROS';

-- ---------------------------------------------------------------------------
-- 2) NOT NULL — campos de cadastro (aprovação permanece nullable até homologar)
-- ---------------------------------------------------------------------------
ALTER TABLE demandas.plano
    ALTER COLUMN sigma_instituicao_id SET NOT NULL,
    ALTER COLUMN instituicao_nome SET DEFAULT '',
    ALTER COLUMN instituicao_nome SET NOT NULL,
    ALTER COLUMN instituicao_razao_social SET DEFAULT '',
    ALTER COLUMN instituicao_razao_social SET NOT NULL,
    ALTER COLUMN instituicao_nome_fantasia SET DEFAULT '',
    ALTER COLUMN instituicao_nome_fantasia SET NOT NULL,
    ALTER COLUMN instituicao_cnpj SET DEFAULT '',
    ALTER COLUMN instituicao_cnpj SET NOT NULL,
    ALTER COLUMN sigma_pessoa_id SET NOT NULL,
    ALTER COLUMN representante_nome SET NOT NULL,
    ALTER COLUMN representante_email SET DEFAULT '',
    ALTER COLUMN representante_email SET NOT NULL,
    ALTER COLUMN representante_telefone SET DEFAULT '',
    ALTER COLUMN representante_telefone SET NOT NULL,
    ALTER COLUMN objetivo_estrategico SET DEFAULT '',
    ALTER COLUMN objetivo_estrategico SET NOT NULL,
    ALTER COLUMN responsavel SET DEFAULT '',
    ALTER COLUMN responsavel SET NOT NULL,
    ALTER COLUMN valor_global SET DEFAULT 0,
    ALTER COLUMN valor_global SET NOT NULL,
    ALTER COLUMN motivo_aprovacao SET DEFAULT '',
    ALTER COLUMN motivo_aprovacao SET NOT NULL,
    ALTER COLUMN criado_por SET NOT NULL,
    ALTER COLUMN atualizado_por SET NOT NULL;

ALTER TABLE demandas.programa
    ALTER COLUMN plano_id SET NOT NULL,
    ALTER COLUMN sigma_instituicao_id SET NOT NULL,
    ALTER COLUMN instituicao_nome SET DEFAULT '',
    ALTER COLUMN instituicao_nome SET NOT NULL,
    ALTER COLUMN instituicao_razao_social SET DEFAULT '',
    ALTER COLUMN instituicao_razao_social SET NOT NULL,
    ALTER COLUMN instituicao_nome_fantasia SET DEFAULT '',
    ALTER COLUMN instituicao_nome_fantasia SET NOT NULL,
    ALTER COLUMN instituicao_cnpj SET DEFAULT '',
    ALTER COLUMN instituicao_cnpj SET NOT NULL,
    ALTER COLUMN sigma_pessoa_id SET NOT NULL,
    ALTER COLUMN representante_nome SET NOT NULL,
    ALTER COLUMN representante_email SET DEFAULT '',
    ALTER COLUMN representante_email SET NOT NULL,
    ALTER COLUMN representante_telefone SET DEFAULT '',
    ALTER COLUMN representante_telefone SET NOT NULL,
    ALTER COLUMN objetivo SET DEFAULT '',
    ALTER COLUMN objetivo SET NOT NULL,
    ALTER COLUMN publico_alvo SET DEFAULT '',
    ALTER COLUMN publico_alvo SET NOT NULL,
    ALTER COLUMN orgao_responsavel SET DEFAULT '',
    ALTER COLUMN orgao_responsavel SET NOT NULL,
    ALTER COLUMN justificativa SET DEFAULT '',
    ALTER COLUMN justificativa SET NOT NULL,
    ALTER COLUMN valor_global SET DEFAULT 0,
    ALTER COLUMN valor_global SET NOT NULL,
    ALTER COLUMN motivo_aprovacao SET DEFAULT '',
    ALTER COLUMN motivo_aprovacao SET NOT NULL,
    ALTER COLUMN criado_por SET NOT NULL,
    ALTER COLUMN atualizado_por SET NOT NULL;

ALTER TABLE demandas.projeto
    ALTER COLUMN descricao SET DEFAULT '',
    ALTER COLUMN descricao SET NOT NULL,
    ALTER COLUMN instituicao_nome SET DEFAULT '',
    ALTER COLUMN instituicao_nome SET NOT NULL,
    ALTER COLUMN instituicao_razao_social SET DEFAULT '',
    ALTER COLUMN instituicao_razao_social SET NOT NULL,
    ALTER COLUMN instituicao_nome_fantasia SET DEFAULT '',
    ALTER COLUMN instituicao_nome_fantasia SET NOT NULL,
    ALTER COLUMN instituicao_cnpj SET DEFAULT '',
    ALTER COLUMN instituicao_cnpj SET NOT NULL,
    ALTER COLUMN representante_email SET DEFAULT '',
    ALTER COLUMN representante_email SET NOT NULL,
    ALTER COLUMN representante_telefone SET DEFAULT '',
    ALTER COLUMN representante_telefone SET NOT NULL,
    ALTER COLUMN programa_id SET NOT NULL,
    ALTER COLUMN vinculo_tipo SET DEFAULT '',
    ALTER COLUMN vinculo_tipo SET NOT NULL,
    ALTER COLUMN classificacao SET DEFAULT '{}'::jsonb,
    ALTER COLUMN classificacao SET NOT NULL,
    ALTER COLUMN complementos SET DEFAULT '{}'::jsonb,
    ALTER COLUMN complementos SET NOT NULL,
    ALTER COLUMN motivo_aprovacao SET DEFAULT '',
    ALTER COLUMN motivo_aprovacao SET NOT NULL,
    ALTER COLUMN criado_por SET NOT NULL,
    ALTER COLUMN atualizado_por SET NOT NULL;

ALTER TABLE demandas.projeto
    ADD CONSTRAINT ck_projeto_vinculo_tipo
        CHECK (vinculo_tipo IN ('', 'programa', 'plano'));

-- ---------------------------------------------------------------------------
-- 3) Integridade: criado_por / atualizado_por = representante (sigma_pessoa_id)
-- ---------------------------------------------------------------------------
ALTER TABLE demandas.plano
    DROP CONSTRAINT IF EXISTS ck_plano_criado_por_representante;
ALTER TABLE demandas.plano
    ADD CONSTRAINT ck_plano_criado_por_representante
        CHECK (criado_por = sigma_pessoa_id AND atualizado_por IS NOT NULL);

ALTER TABLE demandas.programa
    DROP CONSTRAINT IF EXISTS ck_programa_criado_por_representante;
ALTER TABLE demandas.programa
    ADD CONSTRAINT ck_programa_criado_por_representante
        CHECK (criado_por = sigma_pessoa_id AND atualizado_por IS NOT NULL);

ALTER TABLE demandas.projeto
    DROP CONSTRAINT IF EXISTS ck_projeto_criado_por_representante;
ALTER TABLE demandas.projeto
    ADD CONSTRAINT ck_projeto_criado_por_representante
        CHECK (criado_por = sigma_pessoa_id AND atualizado_por IS NOT NULL);

COMMENT ON COLUMN demandas.plano.criado_por IS
    'UUID do representante legal (sigma_pessoa_id) que registrou a demanda';
COMMENT ON COLUMN demandas.programa.criado_por IS
    'UUID do representante legal (sigma_pessoa_id) que registrou a demanda';
COMMENT ON COLUMN demandas.projeto.criado_por IS
    'UUID do representante legal (sigma_pessoa_id) que registrou a demanda';

-- ---------------------------------------------------------------------------
-- 4) Trigger — garante criado_por/atualizado_por no INSERT/UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION demandas.fn_auditoria_representante()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.sigma_pessoa_id IS NOT NULL THEN
            NEW.criado_por := NEW.sigma_pessoa_id;
            NEW.atualizado_por := COALESCE(NEW.atualizado_por, NEW.sigma_pessoa_id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.sigma_pessoa_id IS NOT NULL THEN
            NEW.atualizado_por := NEW.sigma_pessoa_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plano_auditoria_representante ON demandas.plano;
CREATE TRIGGER trg_plano_auditoria_representante
    BEFORE INSERT OR UPDATE ON demandas.plano
    FOR EACH ROW EXECUTE FUNCTION demandas.fn_auditoria_representante();

DROP TRIGGER IF EXISTS trg_programa_auditoria_representante ON demandas.programa;
CREATE TRIGGER trg_programa_auditoria_representante
    BEFORE INSERT OR UPDATE ON demandas.programa
    FOR EACH ROW EXECUTE FUNCTION demandas.fn_auditoria_representante();

DROP TRIGGER IF EXISTS trg_projeto_auditoria_representante ON demandas.projeto;
CREATE TRIGGER trg_projeto_auditoria_representante
    BEFORE INSERT OR UPDATE ON demandas.projeto
    FOR EACH ROW EXECUTE FUNCTION demandas.fn_auditoria_representante();

COMMIT;
