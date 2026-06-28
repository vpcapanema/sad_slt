-- SLT — Planos/programas sentinela para demandas sem vínculo institucional ao pai.
-- Executar após 020_formulario_cadastro_completo.sql (schema demandas).
--
-- PLANO-OUTROS: pai fictício de programas cadastrados sem plano vinculado.
-- PROG-OUTROS:  pai fictício de projetos cadastrados sem programa vinculado.

BEGIN;

INSERT INTO demandas.plano (
    codigo,
    diretoria_id,
    nome,
    descricao,
    objetivo_estrategico,
    status
) VALUES (
    'PLANO-OUTROS',
    'DIR-PLAN',
    'Outros planos',
    'Plano sentinela do sistema para programas cadastrados sem vínculo institucional a um plano específico.',
    'Agrupar programas avulsos na hierarquia de demandas.',
    'aprovada'
)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO demandas.programa (
    codigo,
    plano_id,
    nome,
    descricao,
    objetivo,
    vinculo_institucional,
    status
)
SELECT
    'PROG-OUTROS',
    p.id,
    'Outros programas',
    'Programa sentinela do sistema para projetos cadastrados sem vínculo institucional a um programa específico.',
    'Agrupar projetos avulsos na hierarquia de demandas.',
    FALSE,
    'aprovada'
FROM demandas.plano p
WHERE p.codigo = 'PLANO-OUTROS'
ON CONFLICT (codigo) DO NOTHING;

COMMENT ON TABLE demandas.plano IS
    'Cadastro de planos — nível 1. Inclui PLANO-OUTROS (sentinela para programas sem pai).';

COMMENT ON TABLE demandas.programa IS
    'Cadastro de programas — nível 2. Inclui PROG-OUTROS (sentinela para projetos sem pai).';

COMMIT;
