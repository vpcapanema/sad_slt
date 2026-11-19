CREATE SCHEMA IF NOT EXISTS pesquisa;

CREATE TABLE IF NOT EXISTS pesquisa.feedback_experiencia (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil varchar(40) NOT NULL,
    frequencia_uso varchar(30) NOT NULL,
    funcionalidade_mais_utilizada varchar(200),
    facilidade smallint NOT NULL CHECK (facilidade BETWEEN 1 AND 5),
    autonomia smallint NOT NULL CHECK (autonomia BETWEEN 1 AND 5),
    clareza_interface smallint NOT NULL CHECK (clareza_interface BETWEEN 1 AND 5),
    compreensao_resultados smallint NOT NULL CHECK (compreensao_resultados BETWEEN 1 AND 5),
    desempenho smallint NOT NULL CHECK (desempenho BETWEEN 1 AND 5),
    satisfacao_geral smallint NOT NULL CHECK (satisfacao_geral BETWEEN 1 AND 5),
    indice_experiencia numeric(5,2) NOT NULL CHECK (indice_experiencia BETWEEN 0 AND 100),
    principal_dificuldade varchar(2000),
    melhoria_prioritaria varchar(2000),
    criticas_sugestoes_elogios varchar(3000),
    criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE pesquisa.feedback_experiencia IS
    'Respostas anonimas da pesquisa de experiencia dos usuarios do SICARD.';
COMMENT ON COLUMN pesquisa.feedback_experiencia.indice_experiencia IS
    'Indice de 0 a 100 calculado pela media normalizada das seis respostas de 1 a 5.';

CREATE INDEX IF NOT EXISTS ix_feedback_experiencia_criado_em
    ON pesquisa.feedback_experiencia (criado_em DESC);

GRANT USAGE ON SCHEMA pesquisa TO slt_user;
GRANT INSERT, SELECT ON pesquisa.feedback_experiencia TO slt_user;
