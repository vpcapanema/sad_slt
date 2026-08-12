BEGIN;

UPDATE demandas.dom_atributo_objeto
SET nome = 'Grau de maturidade do objeto de demanda',
    descricao = 'Nível mais avançado de desenvolvimento efetivamente alcançado pelo objeto na data do cadastro.',
    configuracao_por_tipo = jsonb_set(
      COALESCE(configuracao_por_tipo, '{}'::JSONB),
      '{projeto,opcoes}',
      '[
        {"codigo":"ideia","rotulo":"Nível 1 — Ideia ou necessidade identificada"},
        {"codigo":"estudo_preliminar","rotulo":"Nível 2 — Estudos preliminares em elaboração"},
        {"codigo":"estudo_viabilidade","rotulo":"Nível 3 — Estudo de viabilidade concluído"},
        {"codigo":"anteprojeto","rotulo":"Nível 4 — Anteprojeto concluído"},
        {"codigo":"projeto_basico","rotulo":"Nível 5 — Projeto básico concluído"},
        {"codigo":"projeto_executivo","rotulo":"Nível 6 — Projeto executivo concluído"},
        {"codigo":"pronto_implantacao","rotulo":"Nível 7 — Projeto pronto para contratação ou implantação"}
      ]'::JSONB,
      TRUE
    )
WHERE codigo = 'maturidade_objeto';

UPDATE demandas.dom_atributo_objeto
SET dominio_valores = '[
      {"codigo":"estimativa_preliminar","rotulo":"Nível 1 — Estimativa preliminar de custo"},
      {"codigo":"estudo_viabilidade","rotulo":"Nível 2 — Estimativa baseada em estudo de viabilidade"},
      {"codigo":"anteprojeto","rotulo":"Nível 3 — Orçamento baseado em anteprojeto"},
      {"codigo":"projeto_basico","rotulo":"Nível 4 — Orçamento baseado em projeto básico"},
      {"codigo":"projeto_executivo","rotulo":"Nível 5 — Orçamento baseado em projeto executivo"},
      {"codigo":"valor_contratado","rotulo":"Nível 6 — Preço contratado para implantação"}
    ]'::JSONB
WHERE codigo = 'base_estimativa_capex';

UPDATE demandas.dom_atributo_objeto
SET configuracao_por_tipo = jsonb_set(
      COALESCE(configuracao_por_tipo, '{}'::JSONB),
      '{projeto,opcoes}',
      '[
        {"codigo":"estimativa_preliminar","rotulo":"Nível 1 — Estimativa preliminar de prazo"},
        {"codigo":"cronograma_estudos","rotulo":"Nível 2 — Cronograma dos estudos de viabilidade"},
        {"codigo":"cronograma_anteprojeto","rotulo":"Nível 3 — Cronograma de anteprojeto"},
        {"codigo":"cronograma_projeto_basico","rotulo":"Nível 4 — Cronograma de projeto básico"},
        {"codigo":"cronograma_projeto_executivo","rotulo":"Nível 5 — Cronograma de projeto executivo"},
        {"codigo":"cronograma_contratual","rotulo":"Nível 6 — Cronograma contratual de implantação"}
      ]'::JSONB,
      TRUE
    )
WHERE codigo = 'base_estimativa_prazo';

COMMIT;
