-- SLT — Seed dos planos estratégicos oficiais PLI-SP 2050 e PEF-SP 2050.
-- Executar após 015_colapso_demandas.sql (schema demandas).
--
-- Fontes:
--   https://pli.semil.sp.gov.br/sobre-o-pli-2050/
--   https://pli.semil.sp.gov.br/reunioes-eventos-e-contribuicoes/ (lançamento PEF/SP, 22/10/2025)
--   data/catalogo-slt.json (IDs PLANO-PLI, PLANO-PEF, diretoria DIR-PLAN)
--
-- Idempotente: ON CONFLICT (codigo) DO NOTHING.

BEGIN;

INSERT INTO demandas.plano (
    codigo,
    diretoria_id,
    nome,
    descricao,
    objetivo_estrategico,
    responsavel,
    vigencia_inicio,
    vigencia_fim,
    valor_global,
    status
) VALUES
(
    'PLANO-PLI',
    'DIR-PLAN',
    'PLI-SP 2050 — Plano de Logística e Investimentos do Estado de São Paulo',
    'Plano de Estado coordenado pela Secretaria de Meio Ambiente, Infraestrutura e Logística (SEMIL), '
    'por meio da Subsecretaria de Logística e Transportes (SLT), com apoio técnico do Consórcio Transplan-Concremat. '
    'Iniciativa multimodal (rodoviário, ferroviário, hidroviário, portuário e aeroportuário) com horizonte até 2050. '
    'Lançado em abril de 2023; elaboração com fóruns regionais, diagnóstico técnico e participação social, '
    'com conclusão prevista para 2026.',
    'Diagnosticar gargalos e orientar investimentos públicos e privados em infraestrutura de transporte e logística, '
    'ampliando a intermodalidade entre modais, fortalecendo conexões regionais, reduzindo custos logísticos '
    'e impulsionando o desenvolvimento econômico e social sustentável do Estado de São Paulo.',
    'Secretaria de Meio Ambiente, Infraestrutura e Logística (SEMIL) — Subsecretaria de Logística e Transportes (SLT)',
    DATE '2023-04-01',
    DATE '2050-12-31',
    NULL,
    'em_analise'
),
(
    'PLANO-PEF',
    'DIR-PLAN',
    'PEF-SP 2050 — Plano Estratégico Ferroviário do Estado de São Paulo',
    'Primeiro plano setorial integrado ao PLI-SP 2050, lançado em 22/10/2025 na sede da CPTM. '
    'Organiza a estratégia ferroviária estadual em sete eixos: reativação de malha ociosa, '
    'trens intercidades (TIC), carga ferroviária, anel metropolitano ferroviário, terminais intermodais, '
    'shortlines e novos corredores. Articula planejamento SEMIL/SLT com operação ferroviária (CPTM, SPI).',
    'Fortalecer a participação das ferrovias na matriz de transporte paulista; reativar trechos ociosos; '
    'expandir transporte ferroviário de passageiros inter-regionais e de cargas; integrar terminais e interfaces '
    'intermodais; devolver os trilhos ao protagonismo logístico e de mobilidade no Estado até 2050.',
    'Secretaria de Meio Ambiente, Infraestrutura e Logística (SEMIL) — Subsecretaria de Logística e Transportes (SLT)',
    DATE '2025-10-22',
    DATE '2050-12-31',
    NULL,
    'em_analise'
)
ON CONFLICT (codigo) DO NOTHING;

-- Abrangência: ambos os planos têm escopo estadual (geo.unidade_espacial codigo 35 — São Paulo).
INSERT INTO demandas.plano_unidade_espacial (plano_id, unidade_espacial_id)
SELECT p.id, ue.id
FROM demandas.plano p
CROSS JOIN geo.unidade_espacial ue
WHERE p.codigo IN ('PLANO-PLI', 'PLANO-PEF')
  AND ue.tipo_regionalizacao = 'estado'
  AND ue.codigo = '35'
ON CONFLICT DO NOTHING;

COMMIT;
