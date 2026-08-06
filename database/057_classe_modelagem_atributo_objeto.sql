-- SLT — renomeia o valor da classe de modelagem 'projeto' para 'atributo_objeto'
-- na tabela geoprocessamento.criterio_fase2.
--
-- Motivação: a classe 'projeto' designa "fator que é atributo intrínseco do objeto
-- de demanda" (custo, prazo, maturidade), em contraste com 'grade', 'rede' e
-- 'hibrido'. Como o sistema opera com três categorias de objeto de demanda
-- (plano, programa e projeto), o rótulo neutro 'atributo_objeto' evita a colisão
-- com a categoria de demanda 'projeto'.
--
-- Idempotente: pode ser reaplicada com segurança.

BEGIN;

-- 1) Remove a constraint antiga (nome padrão gerado pelo PostgreSQL para o CHECK inline).
ALTER TABLE geoprocessamento.criterio_fase2
    DROP CONSTRAINT IF EXISTS criterio_fase2_classe_modelagem_check;

-- 2) Ajusta o default para o novo vocabulário (mantém 'grade' como padrão).
ALTER TABLE geoprocessamento.criterio_fase2
    ALTER COLUMN classe_modelagem SET DEFAULT 'grade';

-- 3) Converte linhas existentes com o valor antigo.
UPDATE geoprocessamento.criterio_fase2
    SET classe_modelagem = 'atributo_objeto'
    WHERE classe_modelagem = 'projeto';

-- 4) Recria a constraint com o novo conjunto de valores permitidos.
ALTER TABLE geoprocessamento.criterio_fase2
    ADD CONSTRAINT criterio_fase2_classe_modelagem_check
        CHECK (classe_modelagem IN ('grade','rede','atributo_objeto','hibrido'));

COMMIT;
