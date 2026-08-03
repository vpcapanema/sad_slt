-- Fase 1 · regras de classificação por feição (restrição vs risco)
-- Referência: MODULO_FASE1_GERADOR_RESTRICAO_RISCO.md + data/taxonomia_fase_1_obras_estaduais.md
-- Cada regra é avaliada sobre os atributos da FEIÇÃO (não da camada).
-- A primeira regra ativa (menor 'ordem') cujo 'expressao' avaliar como verdadeiro
-- determina 'tipo_tratamento_resultante' e 'severidade'. Regra default (ordem 999)
-- garante classificação padrão quando nenhuma condição específica casar.
BEGIN;

CREATE TABLE IF NOT EXISTS geoprocessamento.regra_classificacao_fase1 (
    id                          SERIAL PRIMARY KEY,
    criterio_id                 VARCHAR(80)  NOT NULL,
    ordem                       INTEGER      NOT NULL,
    expressao                   TEXT         NOT NULL,
    tipo_tratamento_resultante  VARCHAR(20)  NOT NULL
        CHECK (tipo_tratamento_resultante IN ('restricao','risco')),
    severidade                  INTEGER      NOT NULL
        CHECK (severidade BETWEEN 1 AND 4),
    base_legal                  TEXT         NOT NULL,
    observacao                  TEXT,
    ativo                       BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em                   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em               TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (criterio_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_regra_classificacao_fase1_criterio
    ON geoprocessamento.regra_classificacao_fase1 (criterio_id, ordem)
    WHERE ativo = TRUE;

-- Seed: regras derivadas da biblioteca de critérios PLI-SP e da taxonomia oficial.
-- Sintaxe de expressão: pandas.query() sobre os atributos da feição.
INSERT INTO geoprocessamento.regra_classificacao_fase1
    (criterio_id, ordem, expressao, tipo_tratamento_resultante, severidade, base_legal, observacao)
VALUES
-- UC Proteção Integral federal
('uc_pi_federal', 10, $expr$categoria == 'Reserva Biológica'$expr$, 'restricao', 4,
 'Lei 9985/2000 art. 10', 'ReBio: uso indireto exclusivo, veda intervenção.'),
('uc_pi_federal', 20, $expr$categoria == 'Estação Ecológica'$expr$, 'restricao', 4,
 'Lei 9985/2000 art. 9', 'ESEC: uso indireto exclusivo.'),
('uc_pi_federal', 30, $expr$categoria == 'Parque Nacional'$expr$, 'risco', 3,
 'Lei 9985/2000 art. 11', 'PARNA: intervenção sujeita a plano de manejo.'),
('uc_pi_federal', 999, $expr$True$expr$, 'risco', 3,
 'Lei 9985/2000', 'Default UC PI federal.'),
-- UC Proteção Integral estadual
('uc_pi_estadual', 10, $expr$categoria in ['Reserva Biológica','Estação Ecológica']$expr$, 'restricao', 4,
 'Lei 9985/2000 art. 9-10', 'Categorias PI de uso indireto exclusivo.'),
('uc_pi_estadual', 999, $expr$True$expr$, 'risco', 3,
 'Lei 9985/2000; Fundação Florestal', 'Default UC PI estadual.'),
-- UC Uso Sustentável
('uc_us_federal', 999, $expr$True$expr$, 'risco', 2,
 'Lei 9985/2000', 'US federal: uso admitido sob regras próprias.'),
('uc_us_estadual', 999, $expr$True$expr$, 'risco', 2,
 'Lei 9985/2000; Fundação Florestal', 'US estadual: uso admitido sob regras próprias.'),
-- Zona de Amortecimento
('za_uc_federal', 999, $expr$True$expr$, 'risco', 1,
 'Res. CONAMA 428/2010; 473/2015', 'ZA: participação ICMBio, sem transferência de licenciamento.'),
('za_uc_estadual', 999, $expr$True$expr$, 'risco', 1,
 'Res. CONAMA 473/2015; SMA-SP 85/2008', 'ZA: participação gestor estadual.'),
-- Vegetação nativa
('vegetacao_protegida', 10, $expr$estagio in ['medio','avancado','primaria']$expr$, 'restricao', 4,
 'Lei 11428/2006 art. 8', 'Mata Atlântica estágio médio/avançado: supressão vedada regra geral.'),
('vegetacao_protegida', 999, $expr$True$expr$, 'risco', 3,
 'Lei 12651/2012', 'Vegetação nativa: autorização de supressão.'),
-- APRM
('aprm', 10, $expr$classe in ['ARP','APRM-1']$expr$, 'restricao', 4,
 'Lei Estadual 9866/1997', 'Área de Restrição à Ocupação em APRM.'),
('aprm', 999, $expr$True$expr$, 'risco', 2,
 'Lei Estadual 9866/1997', 'APRM: uso condicionado a lei específica.'),
-- Ecossistemas costeiros
('ecossistema_costeiro', 10, $expr$tipo == 'manguezal'$expr$, 'restricao', 4,
 'Lei 12651/2012 art. 4 VII', 'Manguezal em toda extensão é APP.'),
('ecossistema_costeiro', 20, $expr$tipo == 'restinga_fixadora'$expr$, 'restricao', 4,
 'Lei 12651/2012 art. 4 VI', 'Restinga fixadora de dunas é APP.'),
('ecossistema_costeiro', 999, $expr$True$expr$, 'risco', 3,
 'Res. CONAMA 303/2002', 'Demais ecossistemas costeiros sensíveis.'),
-- Cavidades naturais
('cavidade_maxima', 10, $expr$True$expr$, 'restricao', 4,
 'Dec. 10935/2022 art. 4', 'Cavidade grau máximo: buffer 250 m; supressão só por utilidade pública.'),
('cavidade_demais', 999, $expr$True$expr$, 'risco', 2,
 'Dec. 10935/2022; IN ICMBio 02/2017', 'Demais cavidades: estudo de impacto obrigatório.'),
-- Terras Indígenas / territórios quilombolas
('terra_indigena', 10, $expr$situacao in ['Homologada','Regularizada','Declarada']$expr$, 'restricao', 4,
 'CF/88 art. 231; Port. Interministerial 60/2015', 'TI homologada: consulta FUNAI, buffer 8 km rodovias.'),
('terra_indigena', 999, $expr$True$expr$, 'risco', 3,
 'Convenção 169 OIT', 'TI em identificação: risco alto.'),
('territorio_quilombola', 10, $expr$situacao in ['Titulado','Reconhecido']$expr$, 'restricao', 4,
 'Dec. 4887/2003; Port. Interministerial 60/2015', 'Território titulado: consulta Palmares/INCRA, buffer 8 km.'),
('territorio_quilombola', 999, $expr$True$expr$, 'risco', 3,
 'Convenção 169 OIT', 'Território em reconhecimento: risco alto.'),
-- Área contaminada
('area_contaminada', 10, $expr$classe in ['ACRe','ACRi','AI']$expr$, 'restricao', 4,
 'Dec. Est. SP 59263/2013', 'AC com Risco Confirmado ou sob Investigação: uso vedado até remediação.'),
('area_contaminada', 999, $expr$True$expr$, 'risco', 2,
 'CETESB — Relação de Áreas Contaminadas', 'Passivo ambiental cadastrado.'),
-- Suscetibilidade a desastres
('inundacao', 10, $expr$grau in ['muito_alto','alto']$expr$, 'risco', 3,
 'Defesa Civil; IPT; SGB/CPRM', 'Susceptibilidade alta: risco alto.'),
('inundacao', 999, $expr$True$expr$, 'risco', 2,
 'DAEE', 'Susceptibilidade moderada.'),
('movimento_massa', 10, $expr$grau in ['muito_alto','alto']$expr$, 'risco', 3,
 'IPT; SGB/CPRM', 'Susceptibilidade alta a escorregamento/erosão.'),
('movimento_massa', 999, $expr$True$expr$, 'risco', 2,
 'Defesa Civil', 'Susceptibilidade moderada.'),
-- Patrimônio
('bem_tombado', 10, $expr$situacao == 'Tombado' and area_envoltoria == True$expr$, 'restricao', 4,
 'Dec-Lei 25/1937; IN IPHAN 001/2015', 'Área envoltória oficial: intervenção sujeita a anuência.'),
('bem_tombado', 999, $expr$True$expr$, 'risco', 3,
 'IPHAN; CONDEPHAAT', 'Bem tombado sem envoltória: buffer preliminar 300 m.'),
('sitio_arqueologico', 10, $expr$relevancia == 'nacional'$expr$, 'restricao', 4,
 'Lei 3924/1961; Port. IPHAN 375/2018', 'Sítio de relevância nacional: preservação obrigatória.'),
('sitio_arqueologico', 999, $expr$True$expr$, 'risco', 3,
 'Lei 3924/1961', 'Sítio arqueológico: prospecção e resgate.'),
-- Fundiário / servidões
('assentamento', 999, $expr$True$expr$, 'risco', 2,
 'INCRA; ITESP', 'Assentamento: negociação fundiária.'),
('servidao', 999, $expr$True$expr$, 'risco', 1,
 'Normas dos operadores', 'Faixa de domínio/servidão: compatibilização.'),
-- Atos jurídicos impeditivos (sempre restrição quando ativo)
('embargo_ibama', 10, $expr$situacao == 'Ativo'$expr$, 'restricao', 4,
 'Lei 9605/1998 art. 72; Dec. 6514/2008', 'Embargo IBAMA ativo: restrição jurídica.'),
('embargo_ibama', 999, $expr$True$expr$, 'risco', 3,
 'IBAMA', 'Embargo suspenso/encerrado: risco residual.'),
('embargo_estadual', 10, $expr$situacao == 'Ativo'$expr$, 'restricao', 4,
 'Dec. Est. SP 8468/1976; Lei Est. SP 9509/1997', 'Embargo SEMIL/CETESB ativo.'),
('embargo_estadual', 999, $expr$True$expr$, 'risco', 3,
 'SEMIL', 'Embargo suspenso.'),
('interdicao_cetesb', 10, $expr$situacao == 'Ativa'$expr$, 'restricao', 4,
 'Dec. Est. SP 8468/1976', 'Interdição CETESB ativa: restrição.'),
('interdicao_cetesb', 999, $expr$True$expr$, 'risco', 3,
 'CETESB', 'Interdição encerrada.')
ON CONFLICT (criterio_id, ordem) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON geoprocessamento.regra_classificacao_fase1 TO slt_user;
GRANT USAGE, SELECT
    ON SEQUENCE geoprocessamento.regra_classificacao_fase1_id_seq TO slt_user;

COMMIT;
