-- Dicionário de categorias para a extração espacial de atributos das demandas SLT.
-- Categorias organizam camadas e relatórios; não determinam sinal ou intensidade
-- de impacto, nem convertem uma interseção em impedimento à demanda.
BEGIN;

CREATE SCHEMA IF NOT EXISTS dominios;

CREATE TABLE IF NOT EXISTS dominios.categoria_extracao_atributos (
    codigo      VARCHAR(50) PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    conceito    TEXT NOT NULL,
    ordem       SMALLINT NOT NULL DEFAULT 0,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_categoria_extracao_codigo
        CHECK (codigo ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_categoria_extracao_nome
        CHECK (length(btrim(nome)) > 0),
    CONSTRAINT ck_categoria_extracao_conceito
        CHECK (length(btrim(conceito)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categoria_extracao_nome
    ON dominios.categoria_extracao_atributos (lower(btrim(nome)));

COMMENT ON TABLE dominios.categoria_extracao_atributos IS
    'Dicionário editável de categorias conceituais para agrupar as camadas base e os resultados da extração de atributos da representação espacial de uma demanda de logística e transportes da SLT.';
COMMENT ON COLUMN dominios.categoria_extracao_atributos.codigo IS
    'Identificador estável da categoria para os vínculos com camadas e análises.';
COMMENT ON COLUMN dominios.categoria_extracao_atributos.conceito IS
    'Definição do recorte analítico da categoria. Não representa conclusão de impacto positivo ou negativo, risco ou impedimento da demanda.';
COMMENT ON COLUMN dominios.categoria_extracao_atributos.ativo IS
    'Indica disponibilidade para novas seleções; permite desativar sem excluir o conceito.';

-- Conceitos iniciais de organização, editáveis. Reaplicar não sobrescreve
-- conceitos, nomes, ordem ou situação alterados pelo usuário.
INSERT INTO dominios.categoria_extracao_atributos
    (codigo, nome, conceito, ordem)
VALUES
    ('ambiental', 'Ambiental',
     'Agrupa atributos dos meios físico e biótico, dos recursos naturais e das áreas de proteção ou de sensibilidade ambiental relacionados espacialmente à demanda. Apoia a identificação de elementos ambientais potencialmente afetados e a análise de efeitos favoráveis ou desfavoráveis.', 10),
    ('fundiario', 'Fundiário',
     'Agrupa atributos de imóveis, parcelas, posse, domínio, ocupação e usos da terra relacionados espacialmente à demanda. Apoia a identificação de áreas e ocupações potencialmente envolvidas em aquisição, desapropriação, servidão, regularização ou conflitos de uso.', 20),
    ('social', 'Social',
     'Agrupa atributos da população, comunidades, territórios de uso coletivo, equipamentos, serviços e condições de acesso relacionados espacialmente à demanda. Apoia a identificação de grupos potencialmente beneficiados ou prejudicados e a análise de acessibilidade, segurança, vulnerabilidade e deslocamentos.', 30),
    ('economico', 'Econômico',
     'Agrupa atributos de atividades produtivas, emprego, renda, estabelecimentos e polos econômicos relacionados espacialmente à demanda. Apoia a análise de oportunidades e possíveis efeitos sobre a produção, a circulação de bens, o acesso a mercados e a atividade econômica.', 40),
    ('logistica_transportes', 'Logística e transportes',
     'Agrupa atributos das redes, infraestruturas, instalações e serviços de transporte e logística relacionados espacialmente à demanda. Apoia a análise de conectividade, integração modal, acessibilidade, capacidade, gargalos e interferências na movimentação de pessoas e cargas.', 50),
    ('risco', 'Risco',
     'Agrupa camadas que representam perigos, exposição ou vulnerabilidades relevantes à implantação ou à operação da demanda. Organiza a identificação de situações que exigem avaliação específica; a interseção, isoladamente, não determina a probabilidade nem a gravidade de um efeito.', 60),
    ('restricao', 'Restrição',
     'Agrupa camadas que representam condicionantes, limitações ou impedimentos de uso e intervenção relevantes à demanda. Organiza a conferência das condições aplicáveis a cada área; a interseção deve ser interpretada conforme os atributos e a documentação da camada de origem.', 70)
ON CONFLICT (codigo) DO NOTHING;

GRANT USAGE ON SCHEMA dominios TO slt_user;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON dominios.categoria_extracao_atributos TO slt_user;

COMMIT;
