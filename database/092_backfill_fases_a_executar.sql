-- 092 — Repara rodadas de hierarquização criadas sem fases declaradas.
--
-- Até 2026-09-01, os dois caminhos de criação gravavam
-- dados_hierarquizacao.cabecalho_grupo.fases_a_executar como lista vazia:
-- o formulário de processos enviava `[]` explicitamente e o assistente
-- (step1-config) omitia o campo, caindo no default vazio do schema.
--
-- `_exigir_fase` lê lista vazia como "nenhuma fase", então toda rodada nesse
-- estado devolvia 422 ("A Fase N não faz parte desta rodada") nas três fases —
-- ou seja, ficava permanentemente sem poder ser executada.
--
-- Rodadas afetadas passam a declarar as três fases, que é o escopo padrão.
-- Rodadas com recorte explícito (por exemplo `[2,3]`) não são tocadas.

UPDATE hierarquizacao_demandas.hierarquizacao_portfolio
SET dados_hierarquizacao = jsonb_set(
        dados_hierarquizacao,
        '{cabecalho_grupo,fases_a_executar}',
        '[1, 2, 3]'::jsonb,
        true
    )
WHERE dados_hierarquizacao -> 'cabecalho_grupo' IS NOT NULL
  AND COALESCE(
          dados_hierarquizacao -> 'cabecalho_grupo' -> 'fases_a_executar',
          'null'::jsonb
      ) IN ('null'::jsonb, '[]'::jsonb);
