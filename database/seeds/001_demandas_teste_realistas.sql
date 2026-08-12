-- Massa controlada para testes integrados do SICARD.
-- ATENÇÃO: substitui todos os planos, programas e projetos existentes.
-- Ordem obrigatória: planos -> programas -> projetos.

BEGIN;

-- Remove snapshots e referências produzidos a partir do universo anterior.
DELETE FROM hierarquizacao_demandas.hierarquizacao_portfolio;
DELETE FROM ahp.config_multicriterio_portfolio
 WHERE plano_id IN (SELECT id FROM demandas.plano)
    OR programa_id IN (SELECT id FROM demandas.programa);
DELETE FROM demandas.indicadores
 WHERE plano_id IS NOT NULL OR programa_id IS NOT NULL OR projeto_id IS NOT NULL;
DELETE FROM demandas.programa_unidade_espacial;
DELETE FROM demandas.plano_unidade_espacial;
DELETE FROM demandas.projeto;
DELETE FROM demandas.programa;
DELETE FROM demandas.plano;

CREATE TEMP TABLE seed_instituicao (
    ordem int PRIMARY KEY, id uuid, nome text, razao text, fantasia text, cnpj text
) ON COMMIT DROP;
INSERT INTO seed_instituicao VALUES
 (1,'6d1f6699-8cfe-4a81-9f06-ddf5d32e4ef1','SECRETARIA DE MEIO AMBIENTE INFRAESTRUTURA E LOGISTICA','SECRETARIA DE MEIO AMBIENTE INFRAESTRUTURA E LOGISTICA','SEMIL / DATAGEO','56089790000188'),
 (2,'c61f4bad-2f1a-437d-87b7-16bfe27638ee','DEPARTAMENTO DE ESTRADAS DE RODAGEM','DEPARTAMENTO DE ESTRADAS DE RODAGEM','DER','43052497000102'),
 (3,'a03ee19f-7f86-4b14-9090-ce1312e62889','COMPANHIA PAULISTA DE TRENS METROPOLITANOS - CPTM','COMPANHIA PAULISTA DE TRENS METROPOLITANOS - CPTM','CPTM','71832679000123'),
 (4,'efd51d53-b8d2-42d0-a542-6bb1735664be','SECRETARIA DE DESENVOLVIMENTO ECONOMICO DO ESTADO DE SAO PAULO','SECRETARIA DE DESENVOLVIMENTO ECONOMICO DO ESTADO DE SAO PAULO','SDE-SP','10663610000129'),
 (5,'0a5f45f2-9162-4b77-b6bd-d6d796eef339','MINISTERIO DOS TRANSPORTES','MINISTERIO DOS TRANSPORTES','MT','37115342000167');

CREATE TEMP TABLE seed_pessoa (
    ordem int PRIMARY KEY, id uuid, nome text, email text, telefone text
) ON COMMIT DROP;
INSERT INTO seed_pessoa VALUES
 (1,'23a5ce5f-d54c-41d0-85c2-499159f4822d','Vinicius do Prado Capanema','vpcapanema@outlook.com','11999851023'),
 (2,'70d056c6-0566-43b3-9806-02bcb3661762','Joseane Carvalho Queiroz','pli2050@sp.gov.br','11984222367'),
 (3,'fc879c85-f680-4aea-bb52-0206af36044a','Fabio Takayama Garrafoli','fabio.garrafoli@cptm.sp.gov.br','11996187548'),
 (4,'fc4c7c59-5300-4891-92a1-204397b912a4','Carolina Hakas','carolina.hakas@sp.gov.br','11982711483'),
 (5,'42a49173-67cd-4804-9757-451e065bd240','Sandra Sati Nakashima','sandra.sati@sp.gov.br','11991311209');

-- 1. PLANOS: precisam existir antes de qualquer programa.
WITH dados(ordem,codigo,diretoria,nome,descricao,objetivo,inicio,fim,valor,maturidade,prazo,base,status) AS (
 VALUES
 (1,'I-PLA-TESTE-001','DIR-PLAN','Plano Estadual de Logística Integrada 2040','Instrumento estadual de planejamento multimodal para integração das redes rodoviária, ferroviária, hidroviária e aeroportuária.','Orientar a carteira de investimentos logísticos do Estado até 2040.','2026-01-01'::date,'2040-12-31'::date,185000000000::numeric,'vigente',180,'cronograma_vigente','analise_aprovada'),
 (2,'I-PLA-TESTE-002','DIR-INFRA','Plano de Expansão da Infraestrutura Metropolitana','Planejamento integrado da expansão da infraestrutura de mobilidade e conexões metropolitanas.','Ampliar capacidade, integração e resiliência dos sistemas metropolitanos.','2027-01-01','2038-12-31',92000000000,'aprovado',144,'cronograma_aprovado','analise_aprovada'),
 (3,'I-PLA-TESTE-003','DIR-GEST','Plano Estadual de Segurança Viária 2035','Plano de redução de sinistros e qualificação da operação da malha viária paulista.','Reduzir mortes e lesões graves no trânsito mediante infraestrutura e gestão.','2026-07-01','2035-12-31',12800000000,'consulta',114,'cronograma_consultas','analise_aprovada'),
 (4,'I-PLA-TESTE-004','DIR-PLAN','Plano de Logística de Baixo Carbono','Planejamento de ações para redução das emissões da logística e adaptação climática da infraestrutura.','Promover transição energética e resiliência climática no transporte.','2027-01-01','2045-12-31',47000000000,'elaboracao',228,'cronograma_elaboracao','analise_aprovada'),
 (5,'I-PLA-TESTE-005','DIR-INFRA','Plano de Conectividade Regional do Vale do Ribeira','Plano territorial para melhoria da acessibilidade, segurança e integração econômica do Vale do Ribeira.','Estruturar intervenções prioritárias de conectividade regional.','2028-01-01','2040-12-31',8600000000,'concepcao',156,'estimativa_preliminar','analise_em_avaliacao')
)
INSERT INTO demandas.plano (
 codigo,diretoria_id,nome,descricao,objetivo_estrategico,responsavel,vigencia_inicio,vigencia_fim,
 valor_global,status,status_atualizado_em,criado_em,atualizado_em,criado_por,atualizado_por,
 aprovado_em,aprovado_por,motivo_aprovacao,sigma_pessoa_id,representante_nome,
 representante_email,representante_telefone,sigma_instituicao_id,instituicao_nome,
 instituicao_razao_social,instituicao_nome_fantasia,instituicao_cnpj,atributos_cadastrais
)
SELECT d.codigo,d.diretoria,d.nome,d.descricao,d.objetivo,i.nome,d.inicio,d.fim,d.valor,d.status,
       now(),now()-make_interval(days=>d.ordem*12),now(),p.id,p.id,
       CASE WHEN d.status='analise_aprovada' THEN now()-make_interval(days=>d.ordem*3) END,
       CASE WHEN d.status='analise_aprovada' THEN p.id END,
       CASE WHEN d.status='analise_aprovada' THEN 'Cadastro tecnicamente consistente e apto à hierarquização.' ELSE '' END,
       p.id,p.nome,p.email,p.telefone,i.id,i.nome,i.razao,i.fantasia,i.cnpj,
       jsonb_build_object('maturidade_objeto',d.maturidade,'prazo_referencia_meses',d.prazo,'base_estimativa_prazo',d.base)
FROM dados d JOIN seed_instituicao i ON i.ordem=d.ordem JOIN seed_pessoa p ON p.ordem=d.ordem;

-- Sentinela necessário aos programas sem vínculo institucional.
INSERT INTO demandas.plano (
 codigo,diretoria_id,nome,descricao,objetivo_estrategico,responsavel,valor_global,status,
 criado_por,atualizado_por,aprovado_em,aprovado_por,motivo_aprovacao,sigma_pessoa_id,
 representante_nome,representante_email,representante_telefone,sigma_instituicao_id,
 instituicao_nome,instituicao_razao_social,instituicao_nome_fantasia,instituicao_cnpj,atributos_cadastrais
)
SELECT 'PLANO-OUTROS','DIR-PLAN','Outros planos','Registro técnico para programas sem vínculo institucional com plano.','Agrupar programas avulsos.','SEMIL',0,'analise_aprovada',p.id,p.id,now(),p.id,'Registro técnico do sistema.',p.id,p.nome,p.email,p.telefone,i.id,i.nome,i.razao,i.fantasia,i.cnpj,
       jsonb_build_object('maturidade_objeto','vigente','prazo_referencia_meses',0,'base_estimativa_prazo','cronograma_vigente')
FROM seed_instituicao i JOIN seed_pessoa p ON p.ordem=1 WHERE i.ordem=1;

-- Abrangência dos planos: estadual para planos 1, 2 e 4; regiões administrativas coerentes nos demais.
INSERT INTO demandas.plano_unidade_espacial(plano_id,unidade_espacial_id)
SELECT p.id,ue.id FROM demandas.plano p JOIN geo.unidade_espacial ue ON
 (p.codigo IN ('I-PLA-TESTE-001','I-PLA-TESTE-002','I-PLA-TESTE-004','PLANO-OUTROS') AND ue.tipo_regionalizacao='estado' AND ue.codigo='35') OR
 (p.codigo='I-PLA-TESTE-003' AND ue.tipo_regionalizacao='regiao_administrativa' AND ue.codigo IN ('4','13','15')) OR
 (p.codigo='I-PLA-TESTE-005' AND ue.tipo_regionalizacao='regiao_administrativa' AND ue.codigo='16');

-- 2. PROGRAMAS: metade vinculada a planos reais; metade vinculada ao sentinela.
WITH dados(ordem,codigo,nome,descricao,objetivo,publico,orgao,justificativa,valor,maturidade,prazo,basec,basep,status,vinculo,plano_codigo) AS (
 VALUES
 (1,'I-PRO-TESTE-001','Programa de Modernização Rodoviária','Duplicação, recuperação e adequação de corredores rodoviários estratégicos.','Elevar capacidade e segurança dos principais eixos estaduais.','Usuários das rodovias e cadeias produtivas','DER-SP','Gargalos de capacidade e altos índices de sinistros.',24000000000::numeric,'implantacao',96,'projeto_basico','cronograma_pactuado','analise_aprovada',true,'I-PLA-TESTE-001'),
 (2,'I-PRO-TESTE-002','Programa de Expansão Ferroviária Metropolitana','Ampliação de linhas, estações, pátios e sistemas ferroviários metropolitanos.','Aumentar a oferta e a confiabilidade do transporte sobre trilhos.','Passageiros metropolitanos','CPTM','Demanda crescente e saturação de trechos existentes.',31500000000,'aprovado',120,'anteprojeto','cronograma_consolidado','analise_aprovada',true,'I-PLA-TESTE-002'),
 (3,'I-PRO-TESTE-003','Programa Estradas Seguras','Intervenções de segurança viária, sinalização e tratamento de pontos críticos.','Reduzir sinistros graves na malha estadual.','Condutores, passageiros, ciclistas e pedestres','DER-SP','Concentração de ocorrências em segmentos prioritários.',4800000000,'implantacao',72,'projeto_executivo','cronogramas_componentes','analise_aprovada',true,'I-PLA-TESTE-003'),
 (4,'I-PRO-TESTE-004','Programa Corredores Logísticos Verdes','Infraestrutura e incentivos para descarbonização dos corredores logísticos.','Reduzir emissões e aumentar eficiência energética.','Operadores logísticos e comunidades lindeiras','SEMIL','Necessidade de compatibilizar crescimento logístico e metas climáticas.',9600000000,'pactuacao',108,'estudo_viabilidade','cronograma_aprovado','analise_aprovada',true,'I-PLA-TESTE-004'),
 (5,'I-PRO-TESTE-005','Programa de Acessibilidade do Vale do Ribeira','Melhorias viárias, pontes e conexões intermunicipais no Vale do Ribeira.','Ampliar acesso a serviços e mercados regionais.','População e produtores do Vale do Ribeira','SEMIL','Baixa conectividade e vulnerabilidade de acessos.',3200000000,'estruturacao',84,'estimativa_preliminar','cronograma_programa','analise_em_avaliacao',true,'I-PLA-TESTE-005'),
 (6,'I-PRO-TESTE-006','Programa de Terminais Intermodais Regionais','Implantação de terminais de integração de cargas em polos regionais.','Reduzir custos de transbordo e ampliar a intermodalidade.','Embarcadores e operadores de transporte','SEMIL','Ausência de infraestrutura integrada em polos produtivos.',7800000000,'aprovado',90,'anteprojeto','cronograma_consolidado','analise_aprovada',false,'PLANO-OUTROS'),
 (7,'I-PRO-TESTE-007','Programa de Resiliência de Pontes e Obras de Arte','Recuperação e adaptação climática de pontes e estruturas críticas.','Reduzir riscos de interrupção da rede de transportes.','Usuários da malha estadual','DER-SP','Ativos envelhecidos e aumento de eventos extremos.',5400000000,'implantacao',60,'projeto_basico','cronogramas_componentes','analise_aprovada',false,'PLANO-OUTROS'),
 (8,'I-PRO-TESTE-008','Programa de Mobilidade Turística Sustentável','Qualificação de acessos e conexões a destinos turísticos paulistas.','Melhorar a mobilidade turística com baixo impacto ambiental.','Moradores, visitantes e setor turístico','SETUR-SP','Acessos inadequados limitam o desenvolvimento regional.',2100000000,'pactuacao',72,'estudo_viabilidade','cronograma_aprovado','analise_em_avaliacao',false,'PLANO-OUTROS'),
 (9,'I-PRO-TESTE-009','Programa de Dados para Planejamento Logístico','Integração de bases e monitoramento de desempenho da infraestrutura.','Aprimorar decisões com dados territoriais e operacionais confiáveis.','Gestores públicos e operadores','SEMIL','Bases fragmentadas reduzem a capacidade de planejamento.',680000000,'estruturacao',48,'estimativa_preliminar','cronograma_programa','analise_em_avaliacao',false,'PLANO-OUTROS'),
 (10,'I-PRO-TESTE-010','Programa de Concessões de Infraestrutura Regional','Estruturação de concessões e parcerias para ativos de transporte.','Mobilizar capital e melhorar a prestação dos serviços.','Usuários e investidores','SEMIL','Necessidade de acelerar investimentos com boa alocação de riscos.',12500000000,'concepcao',108,'estimativa_preliminar','estimativa_preliminar','analise_em_avaliacao',false,'PLANO-OUTROS')
)
INSERT INTO demandas.programa (
 codigo,plano_id,nome,descricao,objetivo,publico_alvo,orgao_responsavel,justificativa,valor_global,
 status,status_atualizado_em,criado_em,atualizado_em,criado_por,atualizado_por,aprovado_em,
 aprovado_por,motivo_aprovacao,sigma_pessoa_id,representante_nome,representante_email,
 representante_telefone,sigma_instituicao_id,instituicao_nome,instituicao_razao_social,
 instituicao_nome_fantasia,instituicao_cnpj,vinculo_institucional,atributos_cadastrais
)
SELECT d.codigo,pl.id,d.nome,d.descricao,d.objetivo,d.publico,d.orgao,d.justificativa,d.valor,d.status,
 now(),now()-make_interval(days=>d.ordem*5),now(),p.id,p.id,
 CASE WHEN d.status='analise_aprovada' THEN now()-make_interval(days=>d.ordem) END,
 CASE WHEN d.status='analise_aprovada' THEN p.id END,
 CASE WHEN d.status='analise_aprovada' THEN 'Programa consistente com o escopo e apto à hierarquização.' ELSE '' END,
 p.id,p.nome,p.email,p.telefone,i.id,i.nome,i.razao,i.fantasia,i.cnpj,d.vinculo,
 jsonb_build_object('maturidade_objeto',d.maturidade,'capex_estimado',d.valor,
 'base_estimativa_capex',d.basec,'prazo_referencia_meses',d.prazo,'base_estimativa_prazo',d.basep,
 'vinculo_institucional',d.vinculo)
FROM dados d JOIN demandas.plano pl ON pl.codigo=d.plano_codigo
JOIN seed_instituicao i ON i.ordem=((d.ordem-1)%5)+1
JOIN seed_pessoa p ON p.ordem=((d.ordem-1)%5)+1;

INSERT INTO demandas.programa (
 codigo,plano_id,nome,descricao,objetivo,publico_alvo,orgao_responsavel,justificativa,valor_global,status,
 criado_por,atualizado_por,aprovado_em,aprovado_por,motivo_aprovacao,sigma_pessoa_id,representante_nome,
 representante_email,representante_telefone,sigma_instituicao_id,instituicao_nome,
 instituicao_razao_social,instituicao_nome_fantasia,instituicao_cnpj,vinculo_institucional,atributos_cadastrais
)
SELECT 'PROG-OUTROS',pl.id,'Outros programas','Registro técnico para projetos sem vínculo institucional com programa.','Agrupar projetos avulsos.','Não se aplica','SEMIL','Registro técnico do sistema.',0,'analise_aprovada',p.id,p.id,now(),p.id,'Registro técnico do sistema.',p.id,p.nome,p.email,p.telefone,i.id,i.nome,i.razao,i.fantasia,i.cnpj,false,
 jsonb_build_object('maturidade_objeto','implantacao','capex_estimado',0,'base_estimativa_capex','valor_contratado','prazo_referencia_meses',0,'base_estimativa_prazo','cronogramas_componentes','vinculo_institucional',false)
FROM demandas.plano pl JOIN seed_instituicao i ON i.ordem=1 JOIN seed_pessoa p ON p.ordem=1 WHERE pl.codigo='PLANO-OUTROS';

-- Abrangência coerente e existente: municípios alternados; sentinela estadual.
WITH municipios AS (
 SELECT id,row_number() OVER (ORDER BY codigo) rn FROM geo.unidade_espacial
 WHERE tipo_regionalizacao='municipio' AND codigo IN ('3509502','3518800','3525904','3534401','3543402','3548500','3549904','3550308','3552205','3557006')
)
INSERT INTO demandas.programa_unidade_espacial(programa_id,unidade_espacial_id)
SELECT pg.id,m.id FROM demandas.programa pg JOIN municipios m ON m.rn=((substring(pg.codigo from '[0-9]+$')::int-1)%10)+1
WHERE pg.codigo LIKE 'I-PRO-TESTE-%'
UNION ALL
SELECT pg.id,ue.id FROM demandas.programa pg JOIN geo.unidade_espacial ue ON ue.tipo_regionalizacao='estado' AND ue.codigo='35' WHERE pg.codigo='PROG-OUTROS';

-- 3. PROJETOS: somente agora, com planos e programas já materializados.
WITH nomes_base AS (
 SELECT * FROM unnest(ARRAY[
 'Duplicação da SP-075 entre Campinas e Indaiatuba','Adequação do Contorno de Sorocaba','Recuperação da SP-270 no sudoeste paulista','Novo acesso ao Polo Industrial de São José dos Campos','Implantação do corredor ferroviário Leste','Modernização de estações da Linha 12-Safira','Novo pátio ferroviário metropolitano','Sistema de sinalização ferroviária integrada','Tratamento de pontos críticos da SP-330','Passarelas e travessias seguras na SP-310','Barreiras de proteção em corredores serranos','Centro estadual de monitoramento viário','Estações de recarga em corredores logísticos','Terminal intermodal de Campinas','Terminal intermodal de Sorocaba','Terminal intermodal de Ribeirão Preto','Reforço estrutural da Ponte do Rio Tietê','Recuperação de obras de arte na SP-055','Adaptação climática de acessos ao litoral','Drenagem resiliente no corredor Anchieta-Imigrantes','Pavimentação de acesso a comunidades do Vale do Ribeira','Nova ponte sobre o Rio Ribeira de Iguape','Conexão regional Registro–Cajati','Melhoria de acesso ao Parque Estadual Turístico do Alto Ribeira','Plataforma estadual de dados logísticos','Rede de sensores de tráfego e clima','Observatório de desempenho das concessões','Corredor de ônibus turístico sustentável','Estruturação da concessão de terminais regionais','Estudo de viabilidade do corredor hidroviário paulista'
 ]) WITH ORDINALITY n(nome,ordem)
), nomes AS (
 SELECT ordem,nome FROM nomes_base
 UNION ALL
 SELECT ordem+30,nome||' — etapa complementar' FROM nomes_base
), coords_base AS (
 SELECT * FROM (VALUES
 (1,-22.9056,-47.0608),(2,-23.5015,-47.4526),(3,-23.5329,-49.2445),(4,-23.1896,-45.8841),(5,-23.5505,-46.6333),
 (6,-23.5229,-46.1918),(7,-23.1864,-46.8978),(8,-23.9608,-46.3336),(9,-22.9056,-47.0608),(10,-21.1704,-47.8103),
 (11,-23.1791,-45.8872),(12,-23.5505,-46.6333),(13,-22.7253,-47.6492),(14,-22.9056,-47.0608),(15,-23.5015,-47.4526),
 (16,-21.1704,-47.8103),(17,-22.3145,-49.0587),(18,-23.9608,-46.3336),(19,-23.9928,-46.2564),(20,-23.9618,-46.3322),
 (21,-24.4979,-47.8449),(22,-24.7081,-47.5553),(23,-24.4979,-47.8449),(24,-24.5557,-48.6650),(25,-23.5505,-46.6333),
 (26,-22.9056,-47.0608),(27,-23.5015,-47.4526),(28,-23.9608,-46.3336),(29,-21.1704,-47.8103),(30,-22.3145,-49.0587)
 ) c(ordem,lat,lng)
), coords AS (
 SELECT ordem,lat,lng FROM coords_base
 UNION ALL
 SELECT ordem+30,lat+0.018,lng+0.018 FROM coords_base
), base AS (
 SELECT n.ordem,n.nome,c.lat,c.lng,
   CASE WHEN n.ordem%3=1 THEN 'programa' WHEN n.ordem%3=2 THEN 'plano' ELSE '' END vinculo_tipo,
   CASE WHEN n.ordem<=48 THEN 'analise_aprovada' ELSE 'analise_em_avaliacao' END status,
   (ARRAY['ideia','estudo_preliminar','estudo_viabilidade','anteprojeto','projeto_basico','projeto_executivo','pronto_implantacao'])[((n.ordem-1)%7)+1] maturidade,
   (ARRAY['estimativa_preliminar','estudo_viabilidade','anteprojeto','projeto_basico','projeto_executivo','valor_contratado'])[((n.ordem-1)%6)+1] basec,
   (ARRAY['estimativa_preliminar','cronograma_estudos','cronograma_anteprojeto','cronograma_projeto_basico','cronograma_projeto_executivo','cronograma_contratual'])[((n.ordem-1)%6)+1] basep
 FROM nomes n JOIN coords c USING(ordem)
)
INSERT INTO demandas.projeto (
 codigo,status,status_atualizado_em,sigma_instituicao_id,instituicao_nome,instituicao_razao_social,
 instituicao_nome_fantasia,instituicao_cnpj,sigma_pessoa_id,representante_nome,representante_email,
 representante_telefone,diretoria_id,plano_id,nome,descricao,latitude,longitude,geometria_tipo,geometria,
 classificacao,complementos,criado_em,atualizado_em,criado_por,atualizado_por,programa_id,aprovado_em,
 aprovado_por,motivo_aprovacao,vinculo_institucional,vinculo_tipo,vigencia_inicio,vigencia_fim,
 valor_global,atributos_cadastrais
)
SELECT 'I-PRJ-TESTE-'||lpad(b.ordem::text,3,'0'),b.status,now(),i.id,i.nome,i.razao,i.fantasia,i.cnpj,
 p.id,p.nome,p.email,p.telefone,
 (ARRAY['DIR-PLAN','DIR-GEST','DIR-INFRA'])[((b.ordem-1)%3)+1],
 CASE WHEN b.vinculo_tipo='programa' THEN plpg.codigo WHEN b.vinculo_tipo='plano' THEN pl.codigo ELSE 'PLANO-OUTROS' END,
 b.nome,'Projeto fictício realista para validação integrada do cadastro, da análise, da complementação, do geoprocessamento e da hierarquização.',
 b.lat,b.lng,'Point',ST_SetSRID(ST_MakePoint(b.lng,b.lat),4326),
 jsonb_build_object('tipo','carteira_teste','modal',(ARRAY['rodoviario','ferroviario','multimodal'])[((b.ordem-1)%3)+1],
 'tipologia',(ARRAY['implantacao','ampliacao','modernizacao','recuperacao'])[((b.ordem-1)%4)+1]),
 jsonb_build_object('data_base','2026-01-01','fonte','Massa controlada de testes SICARD','dependencias_conhecidas',jsonb_build_array('licenciamento','disponibilidade_orcamentaria')),
 now()-make_interval(days=>b.ordem::int),now(),p.id,p.id,
 CASE WHEN b.vinculo_tipo='programa' THEN pg.id ELSE sentinel.id END,
 CASE WHEN b.status='analise_aprovada' THEN now()-make_interval(hours=>b.ordem::int) END,
 CASE WHEN b.status='analise_aprovada' THEN p.id END,
 CASE WHEN b.status='analise_aprovada' THEN 'Projeto com informações suficientes para composição do universo de hierarquização.' ELSE '' END,
 b.vinculo_tipo<>'',b.vinculo_tipo,date '2027-01-01'+(b.ordem||' days')::interval,
 date '2027-01-01'+(b.ordem||' days')::interval+make_interval(months=>(18+(b.ordem%48))::int),
 (25000000::numeric+b.ordem*17500000),
 jsonb_build_object('maturidade_objeto',b.maturidade,'capex_estimado',(25000000::numeric+b.ordem*17500000),
 'base_estimativa_capex',b.basec,'prazo_referencia_meses',18+(b.ordem%48),'base_estimativa_prazo',b.basep,
 'vinculo_institucional',b.vinculo_tipo<>'')
FROM base b
JOIN seed_instituicao i ON i.ordem=((b.ordem-1)%5)+1
JOIN seed_pessoa p ON p.ordem=((b.ordem-1)%5)+1
JOIN demandas.programa sentinel ON sentinel.codigo='PROG-OUTROS'
LEFT JOIN demandas.programa pg ON pg.codigo='I-PRO-TESTE-'||lpad((((b.ordem-1)%7)+1)::text,3,'0')
LEFT JOIN demandas.plano plpg ON plpg.id=pg.plano_id
LEFT JOIN demandas.plano pl ON pl.codigo='I-PLA-TESTE-'||lpad((((b.ordem-1)%4)+1)::text,3,'0');

-- Asserções: qualquer falha aborta e reverte toda a operação.
DO $$
BEGIN
 IF (SELECT count(*) FROM demandas.plano) <> 6 THEN RAISE EXCEPTION 'Carga inválida de planos'; END IF;
 IF (SELECT count(*) FROM demandas.programa) <> 11 THEN RAISE EXCEPTION 'Carga inválida de programas'; END IF;
 IF (SELECT count(*) FROM demandas.projeto) <> 60 THEN RAISE EXCEPTION 'Carga inválida de projetos'; END IF;
 IF EXISTS (SELECT 1 FROM demandas.programa pg LEFT JOIN demandas.plano pl ON pl.id=pg.plano_id WHERE pl.id IS NULL) THEN RAISE EXCEPTION 'Programa sem plano pai'; END IF;
 IF EXISTS (SELECT 1 FROM demandas.projeto p LEFT JOIN demandas.programa pg ON pg.id=p.programa_id WHERE pg.id IS NULL) THEN RAISE EXCEPTION 'Projeto sem programa técnico pai'; END IF;
 IF EXISTS (SELECT 1 FROM demandas.projeto WHERE geometria IS NULL OR atributos_cadastrais='{}'::jsonb) THEN RAISE EXCEPTION 'Projeto incompleto'; END IF;
END $$;

COMMIT;
