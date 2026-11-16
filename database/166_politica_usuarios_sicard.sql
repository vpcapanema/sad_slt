-- Autorizacao local do SICARD; identidade e autenticacao permanecem no SIGMA.
-- Esta migration prepara a politica, sem alterar a autorizacao das rotas atuais.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS usuarios;
COMMENT ON SCHEMA usuarios IS
    'Perfis, responsabilidades e permissões locais do SICARD. Autenticação externa pelo SIGMA.';

CREATE TABLE IF NOT EXISTS usuarios.perfil (
    codigo              VARCHAR(50) PRIMARY KEY,
    nome                TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
    responsabilidades   TEXT NOT NULL CHECK (length(btrim(responsabilidades)) > 0),
    ordem               SMALLINT NOT NULL DEFAULT 0 CHECK (ordem >= 0),
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_perfil_codigo CHECK (codigo ~ '^[A-Z][A-Z0-9_]*$')
);

CREATE TABLE IF NOT EXISTS usuarios.permissao (
    codigo          VARCHAR(100) PRIMARY KEY,
    nome            TEXT NOT NULL CHECK (length(btrim(nome)) > 0),
    descricao       TEXT NOT NULL CHECK (length(btrim(descricao)) > 0),
    modulo          VARCHAR(50) NOT NULL CHECK (length(btrim(modulo)) > 0),
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('visualizacao', 'operacao')),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_permissao_codigo CHECK (codigo ~ '^[a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)+$')
);

CREATE TABLE IF NOT EXISTS usuarios.perfil_permissao (
    perfil_codigo       VARCHAR(50) NOT NULL
        REFERENCES usuarios.perfil(codigo) ON DELETE RESTRICT,
    permissao_codigo    VARCHAR(100) NOT NULL
        REFERENCES usuarios.permissao(codigo) ON DELETE RESTRICT,
    escopo              VARCHAR(20) NOT NULL DEFAULT 'todos'
        CHECK (escopo IN ('todos', 'proprios')),
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (perfil_codigo, permissao_codigo)
);

CREATE TABLE IF NOT EXISTS usuarios.usuario_perfil (
    sigma_usuario_id    UUID PRIMARY KEY,
    perfil_codigo       VARCHAR(50) NOT NULL
        REFERENCES usuarios.perfil(codigo) ON DELETE RESTRICT,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por          UUID,
    atualizado_por      UUID,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_perfil_permissao_permissao
    ON usuarios.perfil_permissao (permissao_codigo) WHERE ativo;
CREATE INDEX IF NOT EXISTS idx_usuario_perfil_perfil
    ON usuarios.usuario_perfil (perfil_codigo) WHERE ativo;

COMMENT ON TABLE usuarios.perfil IS
    'Responsabilidades dos perfis SICARD, independentes e sem herança automática de permissões.';
COMMENT ON TABLE usuarios.permissao IS
    'Catálogo de capacidades SICARD. Novas ações exigem concessão explícita; não há permissão implícita pelo nome do perfil.';
COMMENT ON TABLE usuarios.perfil_permissao IS
    'Concessões explícitas por perfil. A aplicação deve validar concessão ativa, perfil ativo, permissão ativa e escopo.';
COMMENT ON COLUMN usuarios.perfil_permissao.escopo IS
    'todos: todos os registros da funcionalidade; proprios: apenas registros ou solicitações vinculados ao usuário autenticado. O escopo deve ser validado no servidor.';
COMMENT ON TABLE usuarios.usuario_perfil IS
    'Um perfil local explícito por identidade SIGMA. Sem senhas, tokens ou cópia do cadastro externo; sem FK entre bancos.';
COMMENT ON COLUMN usuarios.usuario_perfil.sigma_usuario_id IS
    'Referência lógica a usuarios.usuario.id no banco SIGMA. Não deriva perfil do username e não cria usuários no SIGMA.';
COMMENT ON COLUMN usuarios.usuario_perfil.criado_por IS
    'UUID SIGMA do responsável pela atribuição local; referência lógica sem FK entre bancos.';
COMMENT ON COLUMN usuarios.usuario_perfil.atualizado_por IS
    'UUID SIGMA do responsável pela última alteração local; referência lógica sem FK entre bancos.';

CREATE OR REPLACE FUNCTION usuarios.fn_touch_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.atualizado_em := clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_perfil_touch ON usuarios.perfil;
CREATE TRIGGER trg_perfil_touch BEFORE UPDATE ON usuarios.perfil
    FOR EACH ROW EXECUTE FUNCTION usuarios.fn_touch_atualizado_em();
DROP TRIGGER IF EXISTS trg_permissao_touch ON usuarios.permissao;
CREATE TRIGGER trg_permissao_touch BEFORE UPDATE ON usuarios.permissao
    FOR EACH ROW EXECUTE FUNCTION usuarios.fn_touch_atualizado_em();
DROP TRIGGER IF EXISTS trg_perfil_permissao_touch ON usuarios.perfil_permissao;
CREATE TRIGGER trg_perfil_permissao_touch BEFORE UPDATE ON usuarios.perfil_permissao
    FOR EACH ROW EXECUTE FUNCTION usuarios.fn_touch_atualizado_em();
DROP TRIGGER IF EXISTS trg_usuario_perfil_touch ON usuarios.usuario_perfil;
CREATE TRIGGER trg_usuario_perfil_touch BEFORE UPDATE ON usuarios.usuario_perfil
    FOR EACH ROW EXECUTE FUNCTION usuarios.fn_touch_atualizado_em();

-- A migration 167 converte codigo para UUID SIGMA; reaplicar 166 deve preservar isso.
DO $seed_perfis$
BEGIN
IF EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='usuarios' AND table_name='perfil'
             AND column_name='codigo' AND data_type='character varying') THEN
INSERT INTO usuarios.perfil (codigo, nome, responsabilidades, ordem) VALUES
    ('ADMIN', 'Administrador',
     'Configuração, manutenção e funcionamento técnico do sistema. O perfil não confere autoridade sobre decisões de negócio nem herda as permissões do Gestor.', 10),
    ('GESTOR', 'Gestor',
     'Autoridade máxima sobre decisões de negócio, fluxos e processos. Opera plenamente o MAD. Único perfil autorizado a reverter status inline na tabela de demandas do MOCAD, fora do fluxo via_aprovar.', 20),
    ('ANALISTA', 'Analista',
     'Operador máximo das funcionalidades do MOCAD: cadastra demandas, inclusive em lote, analisa demandas e solicita complementações. Visualiza o MAD e as Ações do Operador. A reversão de status inline é exclusiva do Gestor.', 30),
    ('OPERADOR', 'Operador',
     'Cadastra demandas em seu próprio nome. Opera plenamente as páginas de Ações do Operador e de cumprimento de solicitações vinculadas a ele.', 40),
    ('VISUALIZADOR', 'Visualizador',
     'Acessa e visualiza todas as páginas da área restrita para apresentação do sistema. Não cadastra, edita, exclui, aprova, reverte status ou executa operações.', 50)
ON CONFLICT (codigo) DO NOTHING;
END IF;
END;
$seed_perfis$;

-- Capacidades iniciais aprovadas; o detalhamento por acao/rota pode ser ampliado.
INSERT INTO usuarios.permissao (codigo, nome, descricao, modulo, tipo) VALUES
    ('area_restrita.visualizar', 'Visualizar área restrita',
     'Visualizar todas as páginas da área restrita, sem autorizar operações ou revelar credenciais.', 'sistema', 'visualizacao'),
    ('administracao.configurar', 'Configurar sistema',
     'Configurar funcionalidades técnicas do SICARD, sem conferir decisões de negócio.', 'administracao', 'operacao'),
    ('administracao.manter', 'Manter funcionamento técnico',
     'Executar manutenção técnica para garantir o funcionamento correto do SICARD.', 'administracao', 'operacao'),
    ('mocad.visualizar', 'Visualizar MOCAD',
     'Consultar páginas e demandas do MOCAD dentro do escopo concedido.', 'mocad', 'visualizacao'),
    ('mocad.cadastrar_demanda', 'Cadastrar demanda',
     'Cadastrar demandas; no escopo proprios, o cadastro deve ser em nome do usuário autenticado.', 'mocad', 'operacao'),
    ('mocad.cadastrar_lote', 'Cadastrar demandas em lote',
     'Cadastrar demandas em lote no MOCAD.', 'mocad', 'operacao'),
    ('mocad.analisar', 'Analisar demandas',
     'Operar a análise de demandas e suas decisões pelo fluxo regular do MOCAD, sem reversão inline.', 'mocad', 'operacao'),
    ('mocad.solicitar_complementacao', 'Solicitar complementação',
     'Solicitar complementações relacionadas ao MOCAD.', 'mocad', 'operacao'),
    ('mocad.reverter_status_inline', 'Reverter status inline',
     'Reverter status diretamente na tabela de demandas, fora do fluxo via_aprovar; exigir autor, data, status anterior, novo status e justificativa.', 'mocad', 'operacao'),
    ('mad.visualizar', 'Visualizar MAD',
     'Consultar páginas e resultados do MAD.', 'mad', 'visualizacao'),
    ('mad.operar', 'Operar MAD',
     'Operar plenamente as funcionalidades do MAD e suas decisões de negócio.', 'mad', 'operacao'),
    ('operador.visualizar', 'Visualizar Ações do Operador',
     'Consultar as páginas de Ações do Operador dentro do escopo concedido.', 'operador', 'visualizacao'),
    ('operador.executar_acoes', 'Executar Ações do Operador',
     'Operar plenamente as páginas do card Ações do Operador dentro do escopo concedido.', 'operador', 'operacao'),
    ('solicitacao.cumprir', 'Cumprir solicitações',
     'Operar o cumprimento de solicitações vinculadas ao usuário autenticado.', 'operador', 'operacao')
ON CONFLICT (codigo) DO NOTHING;

DO $seed_concessoes$
BEGIN
IF EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema='usuarios' AND table_name='perfil'
             AND column_name='codigo' AND data_type='character varying') THEN
INSERT INTO usuarios.perfil_permissao (perfil_codigo, permissao_codigo, escopo) VALUES
    ('ADMIN', 'area_restrita.visualizar', 'todos'),
    ('ADMIN', 'administracao.configurar', 'todos'),
    ('ADMIN', 'administracao.manter', 'todos'),
    ('GESTOR', 'mocad.visualizar', 'todos'),
    ('GESTOR', 'mocad.reverter_status_inline', 'todos'),
    ('GESTOR', 'mad.visualizar', 'todos'),
    ('GESTOR', 'mad.operar', 'todos'),
    ('ANALISTA', 'mocad.visualizar', 'todos'),
    ('ANALISTA', 'mocad.cadastrar_demanda', 'todos'),
    ('ANALISTA', 'mocad.cadastrar_lote', 'todos'),
    ('ANALISTA', 'mocad.analisar', 'todos'),
    ('ANALISTA', 'mocad.solicitar_complementacao', 'todos'),
    ('ANALISTA', 'mad.visualizar', 'todos'),
    ('ANALISTA', 'operador.visualizar', 'todos'),
    ('OPERADOR', 'mocad.visualizar', 'proprios'),
    ('OPERADOR', 'mocad.cadastrar_demanda', 'proprios'),
    ('OPERADOR', 'operador.visualizar', 'proprios'),
    ('OPERADOR', 'operador.executar_acoes', 'proprios'),
    ('OPERADOR', 'solicitacao.cumprir', 'proprios'),
    ('VISUALIZADOR', 'area_restrita.visualizar', 'todos')
ON CONFLICT (perfil_codigo, permissao_codigo) DO NOTHING;
END IF;
END;
$seed_concessoes$;

-- Vinculos de pessoas nao sao inferidos nem copiados automaticamente do SIGMA.
GRANT USAGE ON SCHEMA usuarios TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    usuarios.perfil, usuarios.permissao,
    usuarios.perfil_permissao, usuarios.usuario_perfil TO slt_user;

COMMIT;
