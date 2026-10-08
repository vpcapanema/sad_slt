-- Histórico de geometrias das demandas.
--
-- A geometria oficial da demanda vive sempre em demandas.projeto.geometria,
-- tenha sido desenhada no mapa, informada por coordenadas ou enviada em arquivo.
-- Esta tabela guarda:
--   1. o arquivo vetorial original, quando a geometria veio de upload
--      (papel que a tabela já tinha como demanda_arquivo_geometria_upload);
--   2. o estado anterior da geometria no momento em que ela for substituída
--      (geometria, tipo, ponto representativo e regionalidades), com quem
--      a criou e quem a substituiu.
-- Uma linha com substituido_em nulo descreve a geometria em vigor; uma linha
-- com substituido_em preenchido é uma versão anterior.
--
-- O fluxo de substituição ainda não existe na aplicação; esta migration só
-- prepara a estrutura.
BEGIN;

ALTER TABLE demandas.demanda_arquivo_geometria_upload
    RENAME TO projeto_geometria_historico;

ALTER INDEX IF EXISTS demandas.idx_demanda_arquivo_geometria_upload_projeto
    RENAME TO idx_projeto_geometria_historico_projeto;
ALTER INDEX IF EXISTS demandas.idx_demanda_arquivo_geometria_upload_plano
    RENAME TO idx_projeto_geometria_historico_plano;
ALTER INDEX IF EXISTS demandas.idx_demanda_arquivo_geometria_upload_programa
    RENAME TO idx_projeto_geometria_historico_programa;
ALTER TABLE demandas.projeto_geometria_historico
    RENAME CONSTRAINT ck_demanda_arquivo_geometria_upload_alvo TO ck_projeto_geometria_historico_alvo;

-- Arquivo passa a ser opcional: geometrias desenhadas ou por coordenadas não têm arquivo.
ALTER TABLE demandas.projeto_geometria_historico
    ALTER COLUMN nome_arquivo DROP NOT NULL,
    ALTER COLUMN extensao DROP NOT NULL,
    ALTER COLUMN tipo_mime DROP NOT NULL,
    ALTER COLUMN tamanho_bytes DROP NOT NULL,
    ALTER COLUMN sha256 DROP NOT NULL,
    ALTER COLUMN conteudo_binario DROP NOT NULL;

ALTER TABLE demandas.projeto_geometria_historico
    ADD COLUMN IF NOT EXISTS geometria            geometry(Geometry, 4326),
    ADD COLUMN IF NOT EXISTS latitude             DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude            DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS regionalidades       JSONB,
    ADD COLUMN IF NOT EXISTS origem               VARCHAR(20),
    ADD COLUMN IF NOT EXISTS motivo_substituicao  TEXT,
    ADD COLUMN IF NOT EXISTS criado_por           UUID,
    ADD COLUMN IF NOT EXISTS substituido_em       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS substituido_por      UUID;

-- Linhas existentes são todas uploads do cadastro, ainda em vigor: copia-se a
-- geometria atual do projeto para que cada linha descreva uma versão completa.
UPDATE demandas.projeto_geometria_historico h
   SET origem     = 'upload',
       geometria  = p.geometria,
       latitude   = p.latitude,
       longitude  = p.longitude,
       regionalidades = p.complementos -> 'regionalidades',
       criado_por = p.criado_por
  FROM demandas.projeto p
 WHERE h.projeto_id = p.id
   AND h.origem IS NULL;

UPDATE demandas.projeto_geometria_historico
   SET origem = 'upload'
 WHERE origem IS NULL;

ALTER TABLE demandas.projeto_geometria_historico
    ALTER COLUMN origem SET NOT NULL,
    ADD CONSTRAINT ck_projeto_geometria_historico_origem
        CHECK (origem IN ('desenho', 'upload', 'coordenadas')),
    ADD CONSTRAINT ck_projeto_geometria_historico_coordenadas
        CHECK (
            (latitude IS NULL AND longitude IS NULL)
            OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
        ),
    -- Arquivo é tudo-ou-nada, e só existe quando a origem é upload.
    ADD CONSTRAINT ck_projeto_geometria_historico_arquivo_completo
        CHECK (
            num_nonnulls(nome_arquivo, extensao, tipo_mime, tamanho_bytes, sha256, conteudo_binario) IN (0, 6)
        ),
    ADD CONSTRAINT ck_projeto_geometria_historico_arquivo_por_origem
        CHECK (
            (origem = 'upload' AND conteudo_binario IS NOT NULL)
            OR (origem <> 'upload' AND conteudo_binario IS NULL)
        ),
    -- Quem substituiu e quando andam juntos.
    ADD CONSTRAINT ck_projeto_geometria_historico_substituicao
        CHECK (
            (substituido_em IS NULL AND substituido_por IS NULL AND motivo_substituicao IS NULL)
            OR substituido_em IS NOT NULL
        );

CREATE INDEX IF NOT EXISTS idx_projeto_geometria_historico_vigente
    ON demandas.projeto_geometria_historico (projeto_id)
    WHERE projeto_id IS NOT NULL AND substituido_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_projeto_geometria_historico_geometria_gist
    ON demandas.projeto_geometria_historico USING GIST (geometria);

COMMENT ON TABLE demandas.projeto_geometria_historico IS
    'Histórico de geometrias de demanda (e arquivos originais de plano/programa). A geometria oficial é demandas.projeto.geometria; aqui ficam o arquivo vetorial original de cada upload e o estado anterior de cada geometria substituída.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.geometria IS
    'Geometria desta versão em EPSG:4326; cópia do que estava em projeto.geometria.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.latitude IS
    'Ponto representativo (latitude) desta versão.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.longitude IS
    'Ponto representativo (longitude) desta versão.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.regionalidades IS
    'Snapshot do enquadramento territorial desta versão (mesmo formato de projeto.complementos.regionalidades).';
COMMENT ON COLUMN demandas.projeto_geometria_historico.origem IS
    'Como a geometria foi produzida: desenho no mapa, upload de arquivo ou coordenadas digitadas.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.motivo_substituicao IS
    'Justificativa informada por quem substituiu esta geometria.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.criado_por IS
    'Usuário que registrou esta geometria.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.substituido_em IS
    'Momento em que esta geometria deixou de ser a oficial; nulo enquanto vigente.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.substituido_por IS
    'Usuário que substituiu esta geometria.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.conteudo_binario IS
    'Bytes originais do arquivo vetorial, sem conversão ou alteração; nulo quando a origem não é upload.';
COMMENT ON COLUMN demandas.projeto_geometria_historico.sha256 IS
    'Hash SHA-256 hexadecimal dos bytes originais enviados.';

COMMIT;
