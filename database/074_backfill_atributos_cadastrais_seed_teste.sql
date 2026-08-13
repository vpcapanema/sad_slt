-- SLT — Backfill dos campos nativos introduzidos pela migration 072
-- (maturidade, capex_estimado, base_estimativa_capex, prazo_referencia_meses,
-- base_estimativa_prazo) para a massa de testes de database/seeds/001_demandas_teste_realistas.sql.
--
-- Motivo: a reaplicação manual da migration 072 (fora de uma reseed completa)
-- extraiu os valores de demandas.*.atributos_cadastrais, mas essas chaves já
-- haviam sido removidas do JSONB pela primeira aplicação da própria 072,
-- deixando as colunas nativas NULL. Os valores abaixo replicam exatamente as
-- fórmulas determinísticas do seed, por codigo/ordem.
--
-- Idempotente: só atualiza linhas com maturidade ainda NULL.

BEGIN;

-- PLANO
UPDATE demandas.plano
SET maturidade = CASE codigo
        WHEN 'I-PLA-TESTE-001' THEN 'vigente'
        WHEN 'I-PLA-TESTE-002' THEN 'aprovado'
        WHEN 'I-PLA-TESTE-003' THEN 'consulta'
        WHEN 'I-PLA-TESTE-004' THEN 'elaboracao'
        WHEN 'I-PLA-TESTE-005' THEN 'concepcao'
        WHEN 'PLANO-OUTROS' THEN 'vigente'
    END,
    prazo_referencia_meses = CASE codigo
        WHEN 'I-PLA-TESTE-001' THEN 180
        WHEN 'I-PLA-TESTE-002' THEN 144
        WHEN 'I-PLA-TESTE-003' THEN 114
        WHEN 'I-PLA-TESTE-004' THEN 228
        WHEN 'I-PLA-TESTE-005' THEN 156
        WHEN 'PLANO-OUTROS' THEN 0
    END,
    base_estimativa_prazo = CASE codigo
        WHEN 'I-PLA-TESTE-001' THEN 'cronograma_vigente'
        WHEN 'I-PLA-TESTE-002' THEN 'cronograma_aprovado'
        WHEN 'I-PLA-TESTE-003' THEN 'cronograma_consultas'
        WHEN 'I-PLA-TESTE-004' THEN 'cronograma_elaboracao'
        WHEN 'I-PLA-TESTE-005' THEN 'estimativa_preliminar'
        WHEN 'PLANO-OUTROS' THEN 'cronograma_vigente'
    END
WHERE maturidade IS NULL
  AND codigo IN ('I-PLA-TESTE-001','I-PLA-TESTE-002','I-PLA-TESTE-003','I-PLA-TESTE-004','I-PLA-TESTE-005','PLANO-OUTROS');

-- PROGRAMA
UPDATE demandas.programa
SET maturidade = CASE codigo
        WHEN 'I-PRO-TESTE-001' THEN 'implantacao'
        WHEN 'I-PRO-TESTE-002' THEN 'aprovado'
        WHEN 'I-PRO-TESTE-003' THEN 'implantacao'
        WHEN 'I-PRO-TESTE-004' THEN 'pactuacao'
        WHEN 'I-PRO-TESTE-005' THEN 'estruturacao'
        WHEN 'I-PRO-TESTE-006' THEN 'aprovado'
        WHEN 'I-PRO-TESTE-007' THEN 'implantacao'
        WHEN 'I-PRO-TESTE-008' THEN 'pactuacao'
        WHEN 'I-PRO-TESTE-009' THEN 'estruturacao'
        WHEN 'I-PRO-TESTE-010' THEN 'concepcao'
        WHEN 'PROG-OUTROS' THEN 'implantacao'
    END,
    capex_estimado = valor_global,
    base_estimativa_capex = CASE codigo
        WHEN 'I-PRO-TESTE-001' THEN 'projeto_basico'
        WHEN 'I-PRO-TESTE-002' THEN 'anteprojeto'
        WHEN 'I-PRO-TESTE-003' THEN 'projeto_executivo'
        WHEN 'I-PRO-TESTE-004' THEN 'estudo_viabilidade'
        WHEN 'I-PRO-TESTE-005' THEN 'estimativa_preliminar'
        WHEN 'I-PRO-TESTE-006' THEN 'anteprojeto'
        WHEN 'I-PRO-TESTE-007' THEN 'projeto_basico'
        WHEN 'I-PRO-TESTE-008' THEN 'estudo_viabilidade'
        WHEN 'I-PRO-TESTE-009' THEN 'estimativa_preliminar'
        WHEN 'I-PRO-TESTE-010' THEN 'estimativa_preliminar'
        WHEN 'PROG-OUTROS' THEN 'valor_contratado'
    END,
    prazo_referencia_meses = CASE codigo
        WHEN 'I-PRO-TESTE-001' THEN 96
        WHEN 'I-PRO-TESTE-002' THEN 120
        WHEN 'I-PRO-TESTE-003' THEN 72
        WHEN 'I-PRO-TESTE-004' THEN 108
        WHEN 'I-PRO-TESTE-005' THEN 84
        WHEN 'I-PRO-TESTE-006' THEN 90
        WHEN 'I-PRO-TESTE-007' THEN 60
        WHEN 'I-PRO-TESTE-008' THEN 72
        WHEN 'I-PRO-TESTE-009' THEN 48
        WHEN 'I-PRO-TESTE-010' THEN 108
        WHEN 'PROG-OUTROS' THEN 0
    END,
    base_estimativa_prazo = CASE codigo
        WHEN 'I-PRO-TESTE-001' THEN 'cronograma_pactuado'
        WHEN 'I-PRO-TESTE-002' THEN 'cronograma_consolidado'
        WHEN 'I-PRO-TESTE-003' THEN 'cronogramas_componentes'
        WHEN 'I-PRO-TESTE-004' THEN 'cronograma_aprovado'
        WHEN 'I-PRO-TESTE-005' THEN 'cronograma_programa'
        WHEN 'I-PRO-TESTE-006' THEN 'cronograma_consolidado'
        WHEN 'I-PRO-TESTE-007' THEN 'cronogramas_componentes'
        WHEN 'I-PRO-TESTE-008' THEN 'cronograma_aprovado'
        WHEN 'I-PRO-TESTE-009' THEN 'cronograma_programa'
        WHEN 'I-PRO-TESTE-010' THEN 'estimativa_preliminar'
        WHEN 'PROG-OUTROS' THEN 'cronogramas_componentes'
    END
WHERE maturidade IS NULL
  AND codigo IN (
    'I-PRO-TESTE-001','I-PRO-TESTE-002','I-PRO-TESTE-003','I-PRO-TESTE-004','I-PRO-TESTE-005',
    'I-PRO-TESTE-006','I-PRO-TESTE-007','I-PRO-TESTE-008','I-PRO-TESTE-009','I-PRO-TESTE-010',
    'PROG-OUTROS'
  );

-- PROJETO — fórmulas determinísticas por ordem (sufixo numérico do codigo I-PRJ-TESTE-NNN)
UPDATE demandas.projeto p
SET maturidade = (ARRAY['ideia','estudo_preliminar','estudo_viabilidade','anteprojeto','projeto_basico','projeto_executivo','pronto_implantacao'])[((x.ordem - 1) % 7) + 1],
    capex_estimado = p.valor_global,
    base_estimativa_capex = (ARRAY['estimativa_preliminar','estudo_viabilidade','anteprojeto','projeto_basico','projeto_executivo','valor_contratado'])[((x.ordem - 1) % 6) + 1],
    prazo_referencia_meses = 18 + (x.ordem % 48),
    base_estimativa_prazo = (ARRAY['estimativa_preliminar','cronograma_estudos','cronograma_anteprojeto','cronograma_projeto_basico','cronograma_projeto_executivo','cronograma_contratual'])[((x.ordem - 1) % 6) + 1]
FROM (
    SELECT id, substring(codigo FROM '[0-9]+$')::int AS ordem
    FROM demandas.projeto
    WHERE codigo LIKE 'I-PRJ-TESTE-%' AND maturidade IS NULL
) x
WHERE p.id = x.id;

COMMIT;
