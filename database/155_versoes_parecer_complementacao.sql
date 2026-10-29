CREATE TABLE IF NOT EXISTS demandas.parecer_complementacao_versao (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 solicitacao_id uuid NOT NULL REFERENCES demandas.solicitacao_complementacao_demanda(id),
 numero integer NOT NULL,
 origem text NOT NULL CHECK (origem IN ('legado','analise_vigente')),
 fonte_sha256 text NOT NULL,
 conteudo jsonb NOT NULL,
 pdf bytea,
 pdf_sha256 text,
 gerado_por uuid,
 gerado_em timestamptz NOT NULL DEFAULT now(),
 revisado_por uuid,
 revisado_em timestamptz,
 UNIQUE (solicitacao_id,numero)
);
COMMENT ON TABLE demandas.parecer_complementacao_versao
 IS 'Versões preservadas do parecer cadastral de complementação; revisão explícita vinculada ao PDF e às fontes vigentes.';
