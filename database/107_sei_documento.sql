-- SLT — repositório de documentos recebidos do SEI em PDF.
--
-- A integração por navegação no portal SEI-SP foi descontinuada (ver
-- documentacao/geral/integracao_sei_mocad.md). O analista passa a enviar o PDF
-- da solicitação; o sistema guarda o arquivo, extrai o texto e sugere campos do
-- cadastro de demanda. O preenchimento sugerido NÃO cria demanda: a criação
-- continua passando pela revisão do analista e pelos serviços normais de
-- plano/programa/projeto.
--
-- O binário fica em `conteudo BYTEA` por decisão explícita: backup e restauração
-- do banco levam o documento junto, sem volume adicional na VM. O limite de
-- tamanho é aplicado na aplicação (api/services/sei_documentos_service.py).
--
-- Não existe schema local `usuarios` — a autenticação é delegada ao SIGMA. Por
-- isso `usuario_id` é UUID sem FK física, no mesmo padrão das demais tabelas.
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS integracoes;

CREATE OR REPLACE FUNCTION integracoes.fn_touch_atualizado_em()
RETURNS TRIGGER AS $$ BEGIN NEW.atualizado_em = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS integracoes.sei_documento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL, -- quem enviou o PDF (sessão SICARD)
    usuario_nome VARCHAR(200) NOT NULL DEFAULT '',
    nome_arquivo VARCHAR(255) NOT NULL,
    sha256 CHAR(64) NOT NULL UNIQUE, -- barra reenvio do mesmo documento
    tamanho_bytes BIGINT NOT NULL,
    conteudo BYTEA NOT NULL,
    paginas INTEGER,
    texto TEXT NOT NULL DEFAULT '', -- texto extraído com pypdf; vazio em PDF digitalizado
    -- recebido: texto lido, ainda sem leitura de campos.
    -- sem_texto: PDF sem camada de texto; nenhum campo pode ser sugerido.
    -- analisado: campos sugeridos disponíveis para revisão.
    -- demanda_criada: já gerou demanda; `demanda_id` aponta o código legível.
    status VARCHAR(20) NOT NULL DEFAULT 'recebido'
        CHECK (status IN ('recebido', 'sem_texto', 'analisado', 'demanda_criada')),
    numero_processo VARCHAR(50),
    campos_sugeridos JSONB NOT NULL DEFAULT '{}'::jsonb,
    evidencias JSONB NOT NULL DEFAULT '{}'::jsonb, -- trecho do PDF que originou cada campo
    aviso TEXT,
    demanda_id VARCHAR(64),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_sei_documento_criado_em ON integracoes.sei_documento (criado_em DESC);
CREATE INDEX IF NOT EXISTS ix_sei_documento_status ON integracoes.sei_documento (status);

DROP TRIGGER IF EXISTS trg_touch_sei_documento ON integracoes.sei_documento;
CREATE TRIGGER trg_touch_sei_documento
    BEFORE UPDATE ON integracoes.sei_documento
    FOR EACH ROW EXECUTE FUNCTION integracoes.fn_touch_atualizado_em();

GRANT USAGE ON SCHEMA integracoes TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA integracoes TO slt_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA integracoes TO slt_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA integracoes GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO slt_user;

COMMIT;
