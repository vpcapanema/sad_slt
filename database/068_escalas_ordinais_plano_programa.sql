BEGIN;

UPDATE demandas.dom_atributo_objeto
SET configuracao_por_tipo = jsonb_set(
      jsonb_set(
        COALESCE(configuracao_por_tipo, '{}'::JSONB),
        '{plano,opcoes}',
        '[
          {"codigo":"concepcao","rotulo":"Nível 1 — Plano em concepção"},
          {"codigo":"elaboracao","rotulo":"Nível 2 — Plano em elaboração"},
          {"codigo":"consulta","rotulo":"Nível 3 — Plano em consulta ou pactuação"},
          {"codigo":"aprovado","rotulo":"Nível 4 — Plano aprovado"},
          {"codigo":"vigente","rotulo":"Nível 5 — Plano vigente"}
        ]'::JSONB,
        TRUE
      ),
      '{programa,opcoes}',
      '[
        {"codigo":"concepcao","rotulo":"Nível 1 — Programa em concepção"},
        {"codigo":"estruturacao","rotulo":"Nível 2 — Programa em estruturação"},
        {"codigo":"pactuacao","rotulo":"Nível 3 — Programa em pactuação"},
        {"codigo":"aprovado","rotulo":"Nível 4 — Programa aprovado"},
        {"codigo":"implantacao","rotulo":"Nível 5 — Programa em implantação"}
      ]'::JSONB,
      TRUE
    )
WHERE codigo = 'maturidade_objeto';

UPDATE demandas.dom_atributo_objeto
SET configuracao_por_tipo = jsonb_set(
      jsonb_set(
        COALESCE(configuracao_por_tipo, '{}'::JSONB),
        '{plano,opcoes}',
        '[
          {"codigo":"estimativa_preliminar","rotulo":"Nível 1 — Estimativa preliminar do horizonte temporal"},
          {"codigo":"cronograma_elaboracao","rotulo":"Nível 2 — Cronograma de elaboração do plano"},
          {"codigo":"cronograma_consultas","rotulo":"Nível 3 — Cronograma de consultas e pactuação"},
          {"codigo":"cronograma_aprovado","rotulo":"Nível 4 — Cronograma aprovado"},
          {"codigo":"cronograma_vigente","rotulo":"Nível 5 — Cronograma institucional vigente"}
        ]'::JSONB,
        TRUE
      ),
      '{programa,opcoes}',
      '[
        {"codigo":"estimativa_preliminar","rotulo":"Nível 1 — Estimativa preliminar de prazo"},
        {"codigo":"cronograma_programa","rotulo":"Nível 2 — Cronograma inicial do programa"},
        {"codigo":"cronograma_consolidado","rotulo":"Nível 3 — Cronograma consolidado das ações"},
        {"codigo":"cronograma_aprovado","rotulo":"Nível 4 — Cronograma aprovado"},
        {"codigo":"cronograma_pactuado","rotulo":"Nível 5 — Cronograma pactuado entre os responsáveis"},
        {"codigo":"cronogramas_componentes","rotulo":"Nível 6 — Cronogramas detalhados dos projetos componentes"}
      ]'::JSONB,
      TRUE
    )
WHERE codigo = 'base_estimativa_prazo';

COMMIT;
