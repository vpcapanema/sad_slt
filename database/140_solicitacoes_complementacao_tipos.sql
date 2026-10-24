-- Registro dos pedidos; preserva solicitações e atendimentos anteriores.
CREATE TABLE IF NOT EXISTS demandas.solicitacao_complementacao_demanda (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), demanda_codigo text NOT NULL,
 demanda_tipo varchar(20) NOT NULL CHECK (demanda_tipo IN ('projeto','programa','plano')),
 categorias varchar(40)[] NOT NULL, descricao text NOT NULL CHECK (length(trim(descricao)) > 0),
 status varchar(20) NOT NULL DEFAULT 'solicitada' CHECK (status IN ('solicitada','atendida')),
 solicitado_por uuid, solicitado_nome text NOT NULL, solicitado_em timestamptz NOT NULL DEFAULT now(),
 atendido_por uuid, atendido_em timestamptz
);
ALTER TABLE demandas.solicitacao_complementacao_demanda
 DROP CONSTRAINT IF EXISTS solicitacao_complementacao_demanda_categorias_check,
 ALTER COLUMN solicitado_por DROP NOT NULL,
 ADD COLUMN IF NOT EXISTS hierarquizacao_codigo text,
 ADD COLUMN IF NOT EXISTS categorias_salvas jsonb NOT NULL DEFAULT '{}'::jsonb,
 ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'analise';
ALTER TABLE demandas.solicitacao_complementacao_demanda
 ADD CONSTRAINT solicitacao_complementacao_demanda_categorias_check CHECK (
 cardinality(categorias) BETWEEN 1 AND 3 AND
 categorias <@ ARRAY['dados_cadastrais','geometria','atributos_objeto']::varchar(40)[] AND
 array_position(categorias,NULL) IS NULL);
ALTER TABLE demandas.solicitacao_complementacao_demanda
 DROP CONSTRAINT IF EXISTS solicitacao_complementacao_contexto_check;
ALTER TABLE demandas.solicitacao_complementacao_demanda
 ADD CONSTRAINT solicitacao_complementacao_contexto_check CHECK (
 ('atributos_objeto' = ANY(categorias)) = (hierarquizacao_codigo IS NOT NULL));
DROP INDEX IF EXISTS demandas.uq_solicitacao_complementacao_demanda_aberta;
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitacao_complementacao_contexto_aberto
 ON demandas.solicitacao_complementacao_demanda(demanda_tipo,demanda_codigo,coalesce(hierarquizacao_codigo,''))
 WHERE status='solicitada';
CREATE INDEX IF NOT EXISTS idx_solicitacao_complementacao_status_data
 ON demandas.solicitacao_complementacao_demanda(status,solicitado_em DESC);
-- O status legado não informa motivo/autoria; não inventar esses dados.
INSERT INTO demandas.solicitacao_complementacao_demanda
 (demanda_tipo,demanda_codigo,categorias,descricao,solicitado_nome,origem)
SELECT d.tipo,d.codigo,
 CASE WHEN a.avaliacao_geometria->>'encaminhamento'='complementacao'
 THEN ARRAY['geometria']::varchar(40)[] ELSE ARRAY['dados_cadastrais']::varchar(40)[] END,
 'Solicitação recuperada do status anterior. Motivo e autoria originais não registrados.',
 'Autoria original não registrada','migracao_status'
FROM (SELECT 'projeto' AS tipo,codigo,status FROM demandas.projeto UNION ALL
 SELECT 'programa',codigo,status FROM demandas.programa UNION ALL
 SELECT 'plano',codigo,status FROM demandas.plano) d
LEFT JOIN demandas.analise_demanda a ON a.demanda_codigo=d.codigo
WHERE d.status='analise_aguardando_complementacao'
 AND NOT EXISTS (SELECT 1 FROM demandas.solicitacao_complementacao_demanda s
 WHERE s.demanda_tipo=d.tipo AND s.demanda_codigo=d.codigo AND s.hierarquizacao_codigo IS NULL)
ON CONFLICT DO NOTHING;
