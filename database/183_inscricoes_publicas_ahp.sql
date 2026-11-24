BEGIN;

ALTER TABLE ahp.comparacao_colaborativa_ambiente
    ADD COLUMN IF NOT EXISTS modo_participacao text NOT NULL DEFAULT 'convite'
    CHECK (modo_participacao IN ('convite', 'publico'));

CREATE TABLE IF NOT EXISTS ahp.comparacao_colaborativa_inscricao (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambiente_id uuid NOT NULL REFERENCES ahp.comparacao_colaborativa_ambiente(id) ON DELETE CASCADE,
    nome_completo varchar(200) NOT NULL,
    email varchar(320) NOT NULL,
    instituicao varchar(300) NOT NULL,
    segredo_hash text NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE (ambiente_id, email),
    UNIQUE (ambiente_id, segredo_hash)
);

ALTER TABLE ahp.comparacao_colaborativa_resposta
    ADD COLUMN IF NOT EXISTS inscricao_id uuid UNIQUE REFERENCES ahp.comparacao_colaborativa_inscricao(id) ON DELETE CASCADE;

GRANT SELECT, INSERT ON ahp.comparacao_colaborativa_inscricao TO slt_user;

COMMIT;
