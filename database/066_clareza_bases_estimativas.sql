BEGIN;

UPDATE demandas.dom_atributo_objeto
SET nome = 'Grau de definição do custo de implantação',
    descricao = 'Base técnica mais avançada utilizada para calcular o Capex, ordenada pelo grau de desenvolvimento e pela precisão esperada da estimativa.',
    dominio_valores = '[
      {"codigo":"estimativa_preliminar","rotulo":"Estimativa preliminar de custo"},
      {"codigo":"estudo_viabilidade","rotulo":"Estimativa do estudo de viabilidade"},
      {"codigo":"anteprojeto","rotulo":"Orçamento de anteprojeto"},
      {"codigo":"projeto_basico","rotulo":"Orçamento de projeto básico"},
      {"codigo":"projeto_executivo","rotulo":"Orçamento de projeto executivo"},
      {"codigo":"valor_contratado","rotulo":"Preço contratado para implantação"}
    ]'::JSONB
WHERE codigo = 'base_estimativa_capex';

UPDATE demandas.dom_atributo_objeto
SET nome = 'Grau de definição do prazo estimado',
    descricao = 'Base de planejamento mais avançada utilizada para calcular o prazo até a entrada em operação, ordenada pelo grau de desenvolvimento do cronograma.',
    configuracao_por_tipo = jsonb_set(
      COALESCE(configuracao_por_tipo, '{}'::JSONB),
      '{projeto,opcoes}',
      '[
        {"codigo":"estimativa_preliminar","rotulo":"Estimativa preliminar de prazo"},
        {"codigo":"cronograma_estudos","rotulo":"Cronograma dos estudos de viabilidade"},
        {"codigo":"cronograma_anteprojeto","rotulo":"Cronograma de anteprojeto"},
        {"codigo":"cronograma_projeto_basico","rotulo":"Cronograma de projeto básico"},
        {"codigo":"cronograma_projeto_executivo","rotulo":"Cronograma de projeto executivo"},
        {"codigo":"cronograma_contratual","rotulo":"Cronograma contratual de implantação"}
      ]'::JSONB,
      TRUE
    )
WHERE codigo = 'base_estimativa_prazo';

COMMIT;
