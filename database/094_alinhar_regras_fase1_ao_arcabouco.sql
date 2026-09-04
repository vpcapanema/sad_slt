-- 094 — Alinha as regras de classificação da Fase 1 ao arcabouço teórico-conceitual.
--
-- Fonte: /restrict/geoespacial/configuracao-risco-restricao/ — "Arcabouço
-- Teórico-Conceitual de Risco e Restrição", seções 2 e 3.
--
-- A doutrina classifica por CAMADA oficial, não por atributo de feição: são
-- sete camadas de restrição e treze de risco. A tabela vinha de um modelo por
-- feição cujo padrão divergia da página em 9 dos 19 critérios — Terra Indígena,
-- território quilombola, UC de Proteção Integral, manguezal e os três embargos
-- e interdições saíam como risco, e bem tombado saía como restrição.
--
-- As regras específicas (ordem < 999) que escalavam para restrição foram
-- retiradas: elas testam atributos (categoria, situacao, classe, relevancia) que
-- não sobrevivem à consolidação por Identity, e a página veda inferir restrição
-- por ausência de informação. Permanecem apenas as de inundação e movimento de
-- massa, que graduam severidade dentro do risco e não mudam a classe.
--
-- Ordem: aplicar depois da 093, que retira a vegetação nativa.

BEGIN;

-- 1. Critérios que não são camada do arcabouço.
--    A página é explícita: zonas de amortecimento não são geradas nem
--    classificadas; servidão não consta de nenhuma seção.
DELETE FROM geoprocessamento.regra_classificacao_fase1
WHERE criterio_id IN ('za_uc_estadual', 'za_uc_federal', 'servidao');

-- 2. Regras específicas de escalada. A classe é da CAMADA, não do atributo:
--    a página fixa a categoria por camada oficial, e os atributos que estas
--    expressões testam não sobrevivem à consolidação por Identity.
DELETE FROM geoprocessamento.regra_classificacao_fase1
WHERE ordem < 999
  AND criterio_id NOT IN ('inundacao', 'movimento_massa');

-- 3. As sete camadas de restrição do arcabouço.
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'restricao', severidade = 4,
    base_legal = 'Dec. Est. SP 8468/1976', atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'interdicao_cetesb' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'restricao', severidade = 4,
    base_legal = 'Dec. Est. SP 8468/1976; Lei Est. SP 9509/1997', atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'embargo_estadual' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'restricao', severidade = 4,
    base_legal = 'Lei 9605/1998 art. 72; Dec. 6514/2008', atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'embargo_ibama' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'restricao', severidade = 4,
    base_legal = 'Lei 12651/2012 art. 4 VII', atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'ecossistema_costeiro' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'restricao', severidade = 4,
    base_legal = 'Dec. 4887/2003; Port. Interministerial 60/2015', atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'territorio_quilombola' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'restricao', severidade = 4,
    base_legal = 'CF/88 art. 231; Port. Interministerial 60/2015', atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'terra_indigena' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'restricao', severidade = 4,
    base_legal = 'Lei 9985/2000 art. 9-10', atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'uc_pi_estadual' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'restricao', severidade = 4,
    base_legal = 'Lei 9985/2000 art. 10', atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'uc_pi_federal' AND ordem = 999;

-- 4. As treze camadas de risco.
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'risco', severidade = 2, atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'cavidade' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'risco', severidade = 2, atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'aprm' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'risco', severidade = 2, atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'area_contaminada' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'risco', severidade = 2, atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'assentamento' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'risco', severidade = 3, atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'bem_tombado' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'risco', severidade = 3, atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'sitio_arqueologico' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'risco', severidade = 2, atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'uc_us_estadual' AND ordem = 999;
UPDATE geoprocessamento.regra_classificacao_fase1
SET tipo_tratamento_resultante = 'risco', severidade = 2, atualizado_em = CURRENT_TIMESTAMP
WHERE criterio_id = 'uc_us_federal' AND ordem = 999;

COMMIT;
