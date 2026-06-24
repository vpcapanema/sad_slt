-- SLT · sessao SQLTools
-- Conexao: SLT (slt_postgres · local 5434)
-- Esquemas: cadastro, auditoria

SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname IN ('cadastro', 'auditoria')
ORDER BY 1, 2;
