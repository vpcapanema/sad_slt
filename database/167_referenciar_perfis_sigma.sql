-- Executar pelo aplicador ou scripts/sincronizar_usuarios_sigma.py --migrar.
-- O chamador abre a transacao e fornece sicard.sigma_perfis por parametro,
-- consultando o SIGMA em somente leitura. Nenhum UUID de ambiente e fixado aqui.
SET LOCAL lock_timeout = '5s';
LOCK TABLE usuarios.perfil, usuarios.perfil_permissao, usuarios.usuario_perfil
    IN ACCESS EXCLUSIVE MODE;

CREATE TEMP TABLE IF NOT EXISTS sicard_perfis_sigma (
    codigo UUID PRIMARY KEY,
    sigla VARCHAR(50) NOT NULL UNIQUE,
    ativo BOOLEAN NOT NULL
) ON COMMIT DROP;
TRUNCATE TABLE pg_temp.sicard_perfis_sigma;
INSERT INTO sicard_perfis_sigma (codigo, sigla, ativo)
SELECT id, nome, ativo
FROM jsonb_to_recordset(current_setting('sicard.sigma_perfis', true)::jsonb)
    AS origem(id UUID, nome TEXT, ativo BOOLEAN);

DO $$
BEGIN
    IF (SELECT count(*) FROM sicard_perfis_sigma) <> 5
       OR EXISTS (SELECT 1 FROM sicard_perfis_sigma
                  WHERE sigla NOT IN ('ADMIN','GESTOR','ANALISTA','OPERADOR','VISUALIZADOR')) THEN
        RAISE EXCEPTION '167: os cinco perfis SIGMA devem ser fornecidos pelo sincronizador';
    END IF;
END;
$$;

ALTER TABLE usuarios.perfil ADD COLUMN IF NOT EXISTS sigla VARCHAR(50);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='usuarios' AND table_name='perfil'
                 AND column_name='codigo' AND data_type='character varying') THEN
        IF EXISTS (SELECT 1 FROM usuarios.perfil p
                   LEFT JOIN sicard_perfis_sigma s ON s.sigla=p.codigo
                   WHERE s.codigo IS NULL) THEN
            RAISE EXCEPTION '167: perfil local sem correspondencia no SIGMA';
        END IF;
        ALTER TABLE usuarios.perfil_permissao
            DROP CONSTRAINT perfil_permissao_perfil_codigo_fkey;
        ALTER TABLE usuarios.usuario_perfil
            DROP CONSTRAINT usuario_perfil_perfil_codigo_fkey;
        ALTER TABLE usuarios.perfil DROP CONSTRAINT IF EXISTS ck_perfil_codigo;

        UPDATE usuarios.perfil SET sigla=codigo;
        UPDATE usuarios.perfil_permissao p SET perfil_codigo=s.codigo::text
            FROM sicard_perfis_sigma s WHERE p.perfil_codigo=s.sigla;
        UPDATE usuarios.usuario_perfil p SET perfil_codigo=s.codigo::text
            FROM sicard_perfis_sigma s WHERE p.perfil_codigo=s.sigla;
        UPDATE usuarios.perfil p SET codigo=s.codigo::text
            FROM sicard_perfis_sigma s WHERE p.sigla=s.sigla;

        ALTER TABLE usuarios.perfil ALTER COLUMN codigo TYPE UUID USING codigo::uuid;
        ALTER TABLE usuarios.perfil_permissao
            ALTER COLUMN perfil_codigo TYPE UUID USING perfil_codigo::uuid;
        ALTER TABLE usuarios.usuario_perfil
            ALTER COLUMN perfil_codigo TYPE UUID USING perfil_codigo::uuid;
        ALTER TABLE usuarios.perfil_permissao
            ADD CONSTRAINT perfil_permissao_perfil_codigo_fkey
            FOREIGN KEY (perfil_codigo) REFERENCES usuarios.perfil(codigo) ON DELETE RESTRICT;
        ALTER TABLE usuarios.usuario_perfil
            ADD CONSTRAINT usuario_perfil_perfil_codigo_fkey
            FOREIGN KEY (perfil_codigo) REFERENCES usuarios.perfil(codigo) ON DELETE RESTRICT;
    END IF;
    IF EXISTS (SELECT 1 FROM usuarios.perfil p
               FULL JOIN sicard_perfis_sigma s ON s.codigo=p.codigo AND s.sigla=p.sigla
               WHERE p.codigo IS NULL OR s.codigo IS NULL) THEN
        RAISE EXCEPTION '167: identidades dos perfis locais e SIGMA divergem';
    END IF;
END;
$$;

ALTER TABLE usuarios.perfil ALTER COLUMN sigla SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_perfil_sigla ON usuarios.perfil(sigla);
ALTER TABLE usuarios.perfil ADD COLUMN IF NOT EXISTS sigma_ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios.usuario_perfil ADD COLUMN IF NOT EXISTS sigma_ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuarios.usuario_perfil ADD COLUMN IF NOT EXISTS sigma_sincronizado_em TIMESTAMPTZ;

COMMENT ON COLUMN usuarios.perfil.codigo IS
    'Mesmo UUID de usuarios.papel.id no SIGMA. Referência lógica entre bancos, validada pelo sincronizador.';
COMMENT ON COLUMN usuarios.perfil.sigla IS
    'Nome técnico do papel no SIGMA: ADMIN, GESTOR, ANALISTA, OPERADOR ou VISUALIZADOR. Não determina herança de permissões.';
COMMENT ON COLUMN usuarios.perfil.sigma_ativo IS
    'Disponibilidade do papel no SIGMA, separada da ativação local do perfil.';
COMMENT ON TABLE usuarios.usuario_perfil IS
    'Espelho dos vínculos de todos os usuários SIGMA aos perfis SICARD. Sem senhas ou tokens. Política e permissões permanecem locais.';
COMMENT ON COLUMN usuarios.usuario_perfil.perfil_codigo IS
    'Perfil identificado pelo UUID SIGMA, obtido de usuario.tipo_usuario e papel.nome, sem derivação pelo username.';
COMMENT ON COLUMN usuarios.usuario_perfil.ativo IS
    'Habilitação local no SICARD. A sincronização preserva este valor; autorizar exige também usuário e papel ativos no SIGMA.';
COMMENT ON COLUMN usuarios.usuario_perfil.sigma_ativo IS
    'Situação do usuário no SIGMA; falso também quando removido da origem. Não substitui a validação de autenticação ou bloqueio no SIGMA.';
COMMENT ON COLUMN usuarios.usuario_perfil.sigma_sincronizado_em IS
    'Data da última conciliação com a lista completa de usuários SIGMA.';
