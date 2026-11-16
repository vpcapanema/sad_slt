-- Capacidades complementares para aplicar a separacao aprovada nas rotas existentes.
BEGIN;
INSERT INTO usuarios.permissao (codigo,nome,descricao,modulo,tipo) VALUES
 ('mocad.excluir','Excluir demandas','Excluir registros pelo fluxo próprio do MOCAD.','mocad','operacao'),
 ('ferramentas.visualizar','Visualizar ferramentas','Consultar as ferramentas de apoio e suas bases.','ferramentas','visualizacao'),
 ('ferramentas.operar','Operar ferramentas','Executar ferramentas de apoio aos fluxos MOCAD e MAD.','ferramentas','operacao')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO usuarios.perfil_permissao (perfil_codigo,permissao_codigo,escopo)
SELECT p.codigo,v.permissao,'todos'
FROM (VALUES ('ANALISTA','mocad.excluir'),
             ('ANALISTA','ferramentas.visualizar'),('ANALISTA','ferramentas.operar'),
             ('GESTOR','ferramentas.visualizar'),('GESTOR','ferramentas.operar')) v(sigla,permissao)
JOIN usuarios.perfil p ON p.sigla=v.sigla
ON CONFLICT (perfil_codigo,permissao_codigo) DO NOTHING;
COMMIT;
