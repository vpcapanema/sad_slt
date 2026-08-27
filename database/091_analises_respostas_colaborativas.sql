BEGIN;

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_analise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambiente_id UUID NOT NULL REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    codigo VARCHAR(64) NOT NULL UNIQUE,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    metodo_agregacao VARCHAR(32) NOT NULL DEFAULT 'aij_media_geometrica',
    rc_maximo NUMERIC(8,6) NOT NULL DEFAULT 0.100000,
    excluir_inconsistentes BOOLEAN NOT NULL DEFAULT TRUE,
    matriz_consolidada JSONB NOT NULL,
    pesos_consolidados JSONB NOT NULL,
    lambda_max NUMERIC(14,8) NOT NULL,
    indice_consistencia NUMERIC(14,8) NOT NULL,
    indice_aleatorio NUMERIC(14,8) NOT NULL,
    razao_consistencia NUMERIC(14,8) NOT NULL,
    consistente BOOLEAN NOT NULL,
    estatisticas_analise JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(24) NOT NULL DEFAULT 'calculada'
        CHECK (status IN ('em_analise','calculada','homologada','arquivada')),
    criado_por UUID,
    homologado_por UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    homologado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_analise_resposta (
    analise_id UUID NOT NULL REFERENCES ahp.comparacao_colaborativa_analise(id) ON DELETE CASCADE,
    resposta_id UUID NOT NULL REFERENCES ahp.comparacao_colaborativa_resposta(id) ON DELETE RESTRICT,
    incluida BOOLEAN NOT NULL DEFAULT TRUE,
    motivo_exclusao TEXT,
    considerada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    considerada_por UUID,
    PRIMARY KEY (analise_id, resposta_id)
);

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS analise_homologada_id UUID;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_ambiente_analise_homologada') THEN
        ALTER TABLE ahp.comparacao_colaborativa_ambiente
            ADD CONSTRAINT fk_ambiente_analise_homologada
            FOREIGN KEY (analise_homologada_id)
            REFERENCES ahp.comparacao_colaborativa_analise(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analise_ambiente ON ahp.comparacao_colaborativa_analise(ambiente_id, criado_em DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_analise_homologada_ambiente
    ON ahp.comparacao_colaborativa_analise(ambiente_id) WHERE status='homologada';

-- Preserva as consolidações existentes como primeiro cenário homologado.
WITH inseridas AS (
    INSERT INTO ahp.comparacao_colaborativa_analise
        (ambiente_id,codigo,nome,descricao,matriz_consolidada,pesos_consolidados,
         lambda_max,indice_consistencia,indice_aleatorio,razao_consistencia,
         consistente,estatisticas_analise,status,criado_em,atualizado_em,homologado_em)
    SELECT a.id, 'ANL-MIG-' || upper(substr(replace(a.id::text,'-',''),1,12)),
           'Consolidação migrada', 'Resultado consolidado existente antes da criação dos cenários analíticos.',
           a.matriz_consolidada,a.pesos_consolidados,COALESCE(a.lambda_max,0),
           COALESCE(a.indice_consistencia,0),COALESCE(a.indice_aleatorio,0),
           COALESCE(a.razao_consistencia,0),COALESCE(a.consistente,FALSE),
           jsonb_build_object('origem','migracao_091','respostas_consolidadas',COALESCE(a.respostas_consolidadas,0)),
           'homologada',COALESCE(a.consolidado_em,a.criado_em),now(),COALESCE(a.consolidado_em,now())
      FROM ahp.comparacao_colaborativa_ambiente a
     WHERE a.matriz_consolidada IS NOT NULL AND a.analise_homologada_id IS NULL
    ON CONFLICT (codigo) DO NOTHING RETURNING id,ambiente_id
)
UPDATE ahp.comparacao_colaborativa_ambiente a
   SET analise_homologada_id=i.id FROM inseridas i WHERE a.id=i.ambiente_id;

GRANT SELECT,INSERT,UPDATE,DELETE ON ahp.comparacao_colaborativa_analise TO slt_user;
GRANT SELECT,INSERT,UPDATE,DELETE ON ahp.comparacao_colaborativa_analise_resposta TO slt_user;

COMMIT;
