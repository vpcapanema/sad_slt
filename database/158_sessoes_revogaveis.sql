-- Preparação manual: não executar automaticamente durante o startup.
BEGIN;
CREATE SCHEMA IF NOT EXISTS cadastro;
CREATE TABLE IF NOT EXISTS cadastro.sessao_usuario (
    id uuid PRIMARY KEY,
    usuario_id uuid NOT NULL,
    criada_em timestamptz NOT NULL DEFAULT clock_timestamp(),
    expira_em timestamptz NOT NULL,
    revogada_em timestamptz
);
CREATE INDEX IF NOT EXISTS sessao_usuario_ativas_idx
    ON cadastro.sessao_usuario (usuario_id) WHERE revogada_em IS NULL;
COMMENT ON TABLE cadastro.sessao_usuario IS
    'Sessões SICARD revogáveis. Identidade externa SIGMA, sem FK entre bancos.';
COMMIT;
