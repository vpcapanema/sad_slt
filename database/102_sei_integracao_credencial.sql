-- SLT — integração SEI-SP: guarda opcional de credencial ("Lembrar minha credencial")
-- do usuário do SICARD para reautenticação automática no portal SEI. A senha nunca
-- é gravada em texto puro — fica criptografada simetricamente (Fernet) com a chave
-- lida de SEI_CREDENTIALS_SECRET_KEY (ver .env.example). Quando o usuário NÃO marca
-- "lembrar", nada é persistido aqui: a sessão/senha fica só em memória do processo
-- (ver api/services/sei_integracao_service.py, `_SEI_SESSIONS`).
--
-- Não existe schema local `usuarios` — a autenticação do SICARD é delegada ao SIGMA
-- (ver database/002_schema_cadastro_auditoria.sql e api/services/session_service.py).
-- Por isso `usuario_id` é UUID sem FK física, no mesmo padrão de `criado_por UUID`
-- usado nas demais tabelas do projeto para referenciar o usuário autenticado.
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS integracoes;

CREATE TABLE IF NOT EXISTS integracoes.sei_credencial (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL UNIQUE,
    tipo_login VARCHAR(20) NOT NULL CHECK (tipo_login IN ('interno', 'externo')),
    identificador VARCHAR(200) NOT NULL, -- txtUsuario (interno) ou txtEmail (externo)
    orgao_selecionado VARCHAR(200), -- selOrgao — só se aplica ao login interno
    senha_criptografada TEXT NOT NULL, -- cryptography.fernet.Fernet, chave em SEI_CREDENTIALS_SECRET_KEY
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION integracoes.fn_touch_atualizado_em()
RETURNS TRIGGER AS $$ BEGIN NEW.atualizado_em = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_sei_credencial ON integracoes.sei_credencial;
CREATE TRIGGER trg_touch_sei_credencial
    BEFORE UPDATE ON integracoes.sei_credencial
    FOR EACH ROW EXECUTE FUNCTION integracoes.fn_touch_atualizado_em();

GRANT USAGE ON SCHEMA integracoes TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA integracoes TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA integracoes TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA integracoes GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
