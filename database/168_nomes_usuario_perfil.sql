-- Identificadores legiveis atualizados pela sincronizacao periodica SIGMA.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE usuarios.usuario_perfil
    ADD COLUMN IF NOT EXISTS sigma_user_name TEXT,
    ADD COLUMN IF NOT EXISTS sigma_nome_completo TEXT,
    ADD COLUMN IF NOT EXISTS perfil_nome TEXT;

UPDATE usuarios.usuario_perfil u
SET perfil_nome=p.nome
FROM usuarios.perfil p
WHERE p.codigo=u.perfil_codigo AND u.perfil_nome IS DISTINCT FROM p.nome;

COMMENT ON COLUMN usuarios.usuario_perfil.sigma_user_name IS
    'Cópia de usuarios.usuario.username no SIGMA, atualizada pela sincronização automática.';
COMMENT ON COLUMN usuarios.usuario_perfil.sigma_nome_completo IS
    'Cópia de cadastro.pessoa.nome_completo no SIGMA, pelo vínculo usuario.pessoa_id. Nulo quando não há pessoa ou nome na origem.';
COMMENT ON COLUMN usuarios.usuario_perfil.perfil_nome IS
    'Cópia do nome local em usuarios.perfil.nome no SICARD, pelo vínculo perfil_codigo; atualizada a cada sincronização.';

COMMIT;
