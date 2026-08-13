-- SLT — Os prefixos ordinais "Nível N — ..." passam a ser o próprio valor nativo
-- armazenado em demandas.plano/programa/projeto (maturidade, base_estimativa_capex,
-- base_estimativa_prazo), não apenas um rótulo de exibição em dom_atributo_objeto.
--
-- Substitui os domínios de código curto (dom_maturidade_objeto, dom_base_estimativa_capex,
-- dom_base_estimativa_prazo) por VARCHAR(160) com CHECK CONSTRAINT por tabela, já que o
-- texto completo (e a lista de níveis válidos) difere entre plano, programa e projeto.
--
-- Idempotente: as atualizações de dado só afetam valores ainda no formato de código curto.

BEGIN;

-- ===================== PLANO =====================

ALTER TABLE demandas.plano ALTER COLUMN maturidade TYPE VARCHAR(160) USING maturidade::text;
UPDATE demandas.plano
SET maturidade = CASE maturidade
    WHEN 'concepcao' THEN 'Nível 1 — Plano em concepção'
    WHEN 'elaboracao' THEN 'Nível 2 — Plano em elaboração'
    WHEN 'consulta' THEN 'Nível 3 — Plano em consulta ou pactuação'
    WHEN 'aprovado' THEN 'Nível 4 — Plano aprovado'
    WHEN 'vigente' THEN 'Nível 5 — Plano vigente'
    ELSE maturidade
END
WHERE maturidade IN ('concepcao', 'elaboracao', 'consulta', 'aprovado', 'vigente');
ALTER TABLE demandas.plano DROP CONSTRAINT IF EXISTS ck_plano_maturidade;
ALTER TABLE demandas.plano ADD CONSTRAINT ck_plano_maturidade CHECK (
    maturidade IS NULL OR maturidade IN (
        'Nível 1 — Plano em concepção',
        'Nível 2 — Plano em elaboração',
        'Nível 3 — Plano em consulta ou pactuação',
        'Nível 4 — Plano aprovado',
        'Nível 5 — Plano vigente'
    )
);

ALTER TABLE demandas.plano ALTER COLUMN base_estimativa_prazo TYPE VARCHAR(160) USING base_estimativa_prazo::text;
UPDATE demandas.plano
SET base_estimativa_prazo = CASE base_estimativa_prazo
    WHEN 'estimativa_preliminar' THEN 'Nível 1 — Estimativa preliminar do horizonte temporal'
    WHEN 'cronograma_elaboracao' THEN 'Nível 2 — Cronograma de elaboração do plano'
    WHEN 'cronograma_consultas' THEN 'Nível 3 — Cronograma de consultas e pactuação'
    WHEN 'cronograma_aprovado' THEN 'Nível 4 — Cronograma aprovado'
    WHEN 'cronograma_vigente' THEN 'Nível 5 — Cronograma institucional vigente'
    ELSE base_estimativa_prazo
END
WHERE base_estimativa_prazo IN ('estimativa_preliminar', 'cronograma_elaboracao', 'cronograma_consultas', 'cronograma_aprovado', 'cronograma_vigente');
ALTER TABLE demandas.plano DROP CONSTRAINT IF EXISTS ck_plano_base_estimativa_prazo;
ALTER TABLE demandas.plano ADD CONSTRAINT ck_plano_base_estimativa_prazo CHECK (
    base_estimativa_prazo IS NULL OR base_estimativa_prazo IN (
        'Nível 1 — Estimativa preliminar do horizonte temporal',
        'Nível 2 — Cronograma de elaboração do plano',
        'Nível 3 — Cronograma de consultas e pactuação',
        'Nível 4 — Cronograma aprovado',
        'Nível 5 — Cronograma institucional vigente'
    )
);

-- ===================== PROGRAMA =====================

ALTER TABLE demandas.programa ALTER COLUMN maturidade TYPE VARCHAR(160) USING maturidade::text;
UPDATE demandas.programa
SET maturidade = CASE maturidade
    WHEN 'concepcao' THEN 'Nível 1 — Programa em concepção'
    WHEN 'estruturacao' THEN 'Nível 2 — Programa em estruturação'
    WHEN 'pactuacao' THEN 'Nível 3 — Programa em pactuação'
    WHEN 'aprovado' THEN 'Nível 4 — Programa aprovado'
    WHEN 'implantacao' THEN 'Nível 5 — Programa em implantação'
    ELSE maturidade
END
WHERE maturidade IN ('concepcao', 'estruturacao', 'pactuacao', 'aprovado', 'implantacao');
ALTER TABLE demandas.programa DROP CONSTRAINT IF EXISTS ck_programa_maturidade;
ALTER TABLE demandas.programa ADD CONSTRAINT ck_programa_maturidade CHECK (
    maturidade IS NULL OR maturidade IN (
        'Nível 1 — Programa em concepção',
        'Nível 2 — Programa em estruturação',
        'Nível 3 — Programa em pactuação',
        'Nível 4 — Programa aprovado',
        'Nível 5 — Programa em implantação'
    )
);

ALTER TABLE demandas.programa ALTER COLUMN base_estimativa_capex TYPE VARCHAR(160) USING base_estimativa_capex::text;
UPDATE demandas.programa
SET base_estimativa_capex = CASE base_estimativa_capex
    WHEN 'estimativa_preliminar' THEN 'Nível 1 — Estimativa preliminar de custo'
    WHEN 'estudo_viabilidade' THEN 'Nível 2 — Estimativa baseada em estudo de viabilidade'
    WHEN 'anteprojeto' THEN 'Nível 3 — Orçamento baseado em anteprojeto'
    WHEN 'projeto_basico' THEN 'Nível 4 — Orçamento baseado em projeto básico'
    WHEN 'projeto_executivo' THEN 'Nível 5 — Orçamento baseado em projeto executivo'
    WHEN 'valor_contratado' THEN 'Nível 6 — Preço contratado para implantação'
    ELSE base_estimativa_capex
END
WHERE base_estimativa_capex IN ('estimativa_preliminar', 'estudo_viabilidade', 'anteprojeto', 'projeto_basico', 'projeto_executivo', 'valor_contratado');
ALTER TABLE demandas.programa DROP CONSTRAINT IF EXISTS ck_programa_base_estimativa_capex;
ALTER TABLE demandas.programa ADD CONSTRAINT ck_programa_base_estimativa_capex CHECK (
    base_estimativa_capex IS NULL OR base_estimativa_capex IN (
        'Nível 1 — Estimativa preliminar de custo',
        'Nível 2 — Estimativa baseada em estudo de viabilidade',
        'Nível 3 — Orçamento baseado em anteprojeto',
        'Nível 4 — Orçamento baseado em projeto básico',
        'Nível 5 — Orçamento baseado em projeto executivo',
        'Nível 6 — Preço contratado para implantação'
    )
);

ALTER TABLE demandas.programa ALTER COLUMN base_estimativa_prazo TYPE VARCHAR(160) USING base_estimativa_prazo::text;
UPDATE demandas.programa
SET base_estimativa_prazo = CASE base_estimativa_prazo
    WHEN 'estimativa_preliminar' THEN 'Nível 1 — Estimativa preliminar de prazo'
    WHEN 'cronograma_programa' THEN 'Nível 2 — Cronograma inicial do programa'
    WHEN 'cronograma_consolidado' THEN 'Nível 3 — Cronograma consolidado das ações'
    WHEN 'cronograma_aprovado' THEN 'Nível 4 — Cronograma aprovado'
    WHEN 'cronograma_pactuado' THEN 'Nível 5 — Cronograma pactuado entre os responsáveis'
    WHEN 'cronogramas_componentes' THEN 'Nível 6 — Cronogramas detalhados dos projetos componentes'
    ELSE base_estimativa_prazo
END
WHERE base_estimativa_prazo IN ('estimativa_preliminar', 'cronograma_programa', 'cronograma_consolidado', 'cronograma_aprovado', 'cronograma_pactuado', 'cronogramas_componentes');
ALTER TABLE demandas.programa DROP CONSTRAINT IF EXISTS ck_programa_base_estimativa_prazo;
ALTER TABLE demandas.programa ADD CONSTRAINT ck_programa_base_estimativa_prazo CHECK (
    base_estimativa_prazo IS NULL OR base_estimativa_prazo IN (
        'Nível 1 — Estimativa preliminar de prazo',
        'Nível 2 — Cronograma inicial do programa',
        'Nível 3 — Cronograma consolidado das ações',
        'Nível 4 — Cronograma aprovado',
        'Nível 5 — Cronograma pactuado entre os responsáveis',
        'Nível 6 — Cronogramas detalhados dos projetos componentes'
    )
);

-- ===================== PROJETO =====================

ALTER TABLE demandas.projeto ALTER COLUMN maturidade TYPE VARCHAR(160) USING maturidade::text;
UPDATE demandas.projeto
SET maturidade = CASE maturidade
    WHEN 'ideia' THEN 'Nível 1 — Ideia ou necessidade identificada'
    WHEN 'estudo_preliminar' THEN 'Nível 2 — Estudos preliminares em elaboração'
    WHEN 'estudo_viabilidade' THEN 'Nível 3 — Estudo de viabilidade concluído'
    WHEN 'anteprojeto' THEN 'Nível 4 — Anteprojeto concluído'
    WHEN 'projeto_basico' THEN 'Nível 5 — Projeto básico concluído'
    WHEN 'projeto_executivo' THEN 'Nível 6 — Projeto executivo concluído'
    WHEN 'pronto_implantacao' THEN 'Nível 7 — Projeto pronto para contratação ou implantação'
    ELSE maturidade
END
WHERE maturidade IN ('ideia', 'estudo_preliminar', 'estudo_viabilidade', 'anteprojeto', 'projeto_basico', 'projeto_executivo', 'pronto_implantacao');
ALTER TABLE demandas.projeto DROP CONSTRAINT IF EXISTS ck_projeto_maturidade;
ALTER TABLE demandas.projeto ADD CONSTRAINT ck_projeto_maturidade CHECK (
    maturidade IS NULL OR maturidade IN (
        'Nível 1 — Ideia ou necessidade identificada',
        'Nível 2 — Estudos preliminares em elaboração',
        'Nível 3 — Estudo de viabilidade concluído',
        'Nível 4 — Anteprojeto concluído',
        'Nível 5 — Projeto básico concluído',
        'Nível 6 — Projeto executivo concluído',
        'Nível 7 — Projeto pronto para contratação ou implantação'
    )
);

ALTER TABLE demandas.projeto ALTER COLUMN base_estimativa_capex TYPE VARCHAR(160) USING base_estimativa_capex::text;
UPDATE demandas.projeto
SET base_estimativa_capex = CASE base_estimativa_capex
    WHEN 'estimativa_preliminar' THEN 'Nível 1 — Estimativa preliminar de custo'
    WHEN 'estudo_viabilidade' THEN 'Nível 2 — Estimativa baseada em estudo de viabilidade'
    WHEN 'anteprojeto' THEN 'Nível 3 — Orçamento baseado em anteprojeto'
    WHEN 'projeto_basico' THEN 'Nível 4 — Orçamento baseado em projeto básico'
    WHEN 'projeto_executivo' THEN 'Nível 5 — Orçamento baseado em projeto executivo'
    WHEN 'valor_contratado' THEN 'Nível 6 — Preço contratado para implantação'
    ELSE base_estimativa_capex
END
WHERE base_estimativa_capex IN ('estimativa_preliminar', 'estudo_viabilidade', 'anteprojeto', 'projeto_basico', 'projeto_executivo', 'valor_contratado');
ALTER TABLE demandas.projeto DROP CONSTRAINT IF EXISTS ck_projeto_base_estimativa_capex;
ALTER TABLE demandas.projeto ADD CONSTRAINT ck_projeto_base_estimativa_capex CHECK (
    base_estimativa_capex IS NULL OR base_estimativa_capex IN (
        'Nível 1 — Estimativa preliminar de custo',
        'Nível 2 — Estimativa baseada em estudo de viabilidade',
        'Nível 3 — Orçamento baseado em anteprojeto',
        'Nível 4 — Orçamento baseado em projeto básico',
        'Nível 5 — Orçamento baseado em projeto executivo',
        'Nível 6 — Preço contratado para implantação'
    )
);

ALTER TABLE demandas.projeto ALTER COLUMN base_estimativa_prazo TYPE VARCHAR(160) USING base_estimativa_prazo::text;
UPDATE demandas.projeto
SET base_estimativa_prazo = CASE base_estimativa_prazo
    WHEN 'estimativa_preliminar' THEN 'Nível 1 — Estimativa preliminar de prazo'
    WHEN 'cronograma_estudos' THEN 'Nível 2 — Cronograma dos estudos de viabilidade'
    WHEN 'cronograma_anteprojeto' THEN 'Nível 3 — Cronograma de anteprojeto'
    WHEN 'cronograma_projeto_basico' THEN 'Nível 4 — Cronograma de projeto básico'
    WHEN 'cronograma_projeto_executivo' THEN 'Nível 5 — Cronograma de projeto executivo'
    WHEN 'cronograma_contratual' THEN 'Nível 6 — Cronograma contratual de implantação'
    ELSE base_estimativa_prazo
END
WHERE base_estimativa_prazo IN ('estimativa_preliminar', 'cronograma_estudos', 'cronograma_anteprojeto', 'cronograma_projeto_basico', 'cronograma_projeto_executivo', 'cronograma_contratual');
ALTER TABLE demandas.projeto DROP CONSTRAINT IF EXISTS ck_projeto_base_estimativa_prazo;
ALTER TABLE demandas.projeto ADD CONSTRAINT ck_projeto_base_estimativa_prazo CHECK (
    base_estimativa_prazo IS NULL OR base_estimativa_prazo IN (
        'Nível 1 — Estimativa preliminar de prazo',
        'Nível 2 — Cronograma dos estudos de viabilidade',
        'Nível 3 — Cronograma de anteprojeto',
        'Nível 4 — Cronograma de projeto básico',
        'Nível 5 — Cronograma de projeto executivo',
        'Nível 6 — Cronograma contratual de implantação'
    )
);

-- Domínios de código curto não são mais usados por nenhuma coluna.
DROP DOMAIN IF EXISTS demandas.dom_maturidade_objeto;
DROP DOMAIN IF EXISTS demandas.dom_base_estimativa_capex;
DROP DOMAIN IF EXISTS demandas.dom_base_estimativa_prazo;

COMMIT;
