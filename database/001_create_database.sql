-- SLT — criação manual do banco (somente se NÃO usar docker-compose)
-- No fluxo normal, o container slt_postgres já cria slt_db via POSTGRES_DB.
--
-- Executar conectado ao banco postgres (superusuário):
--   psql -h 127.0.0.1 -p 5434 -U postgres -d postgres -f database/001_create_database.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'slt_user') THEN
        CREATE ROLE slt_user WITH LOGIN PASSWORD 'slt_pass';
        RAISE NOTICE 'Role slt_user criada.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'slt_db') THEN
        EXECUTE 'CREATE DATABASE slt_db
            WITH OWNER = slt_user
            ENCODING = ''UTF8''
            LC_COLLATE = ''C''
            LC_CTYPE = ''C''
            TEMPLATE = template0
            CONNECTION LIMIT = -1';
        RAISE NOTICE 'Banco slt_db criado.';
    ELSE
        RAISE NOTICE 'Banco slt_db ja existe.';
    END IF;
END $$;

COMMENT ON DATABASE slt_db IS
    'Sistema de Apoio a Tomada de Decisao (SLT) — demandas, hierarquizacao e auditoria';
