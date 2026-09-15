-- SLT — Restaura os planos estratégicos oficiais PLI-SP 2050 e PEF-SP 2050.
--
-- A migration 017 criou PLANO-PLI e PLANO-PEF, mas a massa de teste
-- database/seeds/001_demandas_teste_realistas.sql apaga todos os planos e só
-- recria PLANO-OUTROS e os I-PLA-TESTE-*. Sem esses dois registros, o cadastro
-- de projeto não oferece frente PLI / eixo PEF e os links dos catálogos
-- (plano=PLANO-PLI / PLANO-PEF) não têm plano correspondente.
--
-- Representante, instituição e auditoria são copiados do sentinela
-- PLANO-OUTROS, que já satisfaz as restrições atuais da tabela.
--
-- Idempotente: ON CONFLICT (codigo) DO NOTHING.

BEGIN;

INSERT INTO demandas.plano (
    codigo, diretoria_id, nome, descricao, objetivo_estrategico, responsavel,
    vigencia_inicio, vigencia_fim, valor_global, status,
    criado_por, atualizado_por, aprovado_em, aprovado_por, motivo_aprovacao,
    sigma_pessoa_id, representante_nome, representante_email, representante_telefone,
    sigma_instituicao_id, instituicao_nome, instituicao_razao_social,
    instituicao_nome_fantasia, instituicao_cnpj
)
SELECT
    d.codigo, 'DIR-PLAN', d.nome, d.descricao, d.objetivo,
    'Secretaria de Meio Ambiente, Infraestrutura e Logística (SEMIL) — Subsecretaria de Logística e Transportes (SLT)',
    d.inicio, DATE '2050-12-31', 0, 'analise_aprovada',
    o.criado_por, o.criado_por, now(), o.criado_por, 'Plano estratégico oficial restaurado pelo sistema.',
    o.sigma_pessoa_id, o.representante_nome, o.representante_email, o.representante_telefone,
    o.sigma_instituicao_id, o.instituicao_nome, o.instituicao_razao_social,
    o.instituicao_nome_fantasia, o.instituicao_cnpj
FROM (
    VALUES
    (
        'PLANO-PLI',
        'PLI-SP 2050 — Plano de Logística e Investimentos do Estado de São Paulo',
        'Plano de Estado coordenado pela Secretaria de Meio Ambiente, Infraestrutura e Logística (SEMIL), '
        'por meio da Subsecretaria de Logística e Transportes (SLT), com apoio técnico do Consórcio Transplan-Concremat. '
        'Iniciativa multimodal (rodoviário, ferroviário, hidroviário, portuário e aeroportuário) com horizonte até 2050. '
        'Lançado em abril de 2023; elaboração com fóruns regionais, diagnóstico técnico e participação social, '
        'com conclusão prevista para 2026.',
        'Diagnosticar gargalos e orientar investimentos públicos e privados em infraestrutura de transporte e logística, '
        'ampliando a intermodalidade entre modais, fortalecendo conexões regionais, reduzindo custos logísticos '
        'e impulsionando o desenvolvimento econômico e social sustentável do Estado de São Paulo.',
        DATE '2023-04-01'
    ),
    (
        'PLANO-PEF',
        'PEF-SP 2050 — Plano Estratégico Ferroviário do Estado de São Paulo',
        'Primeiro plano setorial integrado ao PLI-SP 2050, lançado em 22/10/2025 na sede da CPTM. '
        'Organiza a estratégia ferroviária estadual em sete eixos: reativação de malha ociosa, '
        'trens intercidades (TIC), carga ferroviária, anel metropolitano ferroviário, terminais intermodais, '
        'shortlines e novos corredores. Articula planejamento SEMIL/SLT com operação ferroviária (CPTM, SPI).',
        'Fortalecer a participação das ferrovias na matriz de transporte paulista; reativar trechos ociosos; '
        'expandir transporte ferroviário de passageiros inter-regionais e de cargas; integrar terminais e interfaces '
        'intermodais; devolver os trilhos ao protagonismo logístico e de mobilidade no Estado até 2050.',
        DATE '2025-10-22'
    )
) AS d(codigo, nome, descricao, objetivo, inicio)
CROSS JOIN demandas.plano o
WHERE o.codigo = 'PLANO-OUTROS'
ON CONFLICT (codigo) DO NOTHING;

-- Abrangência estadual (geo.unidade_espacial estado codigo 35 — São Paulo), como na 017.
INSERT INTO demandas.plano_unidade_espacial (plano_id, unidade_espacial_id)
SELECT p.id, ue.id
FROM demandas.plano p
CROSS JOIN geo.unidade_espacial ue
WHERE p.codigo IN ('PLANO-PLI', 'PLANO-PEF')
  AND ue.tipo_regionalizacao = 'estado'
  AND ue.codigo = '35'
ON CONFLICT DO NOTHING;

COMMIT;
