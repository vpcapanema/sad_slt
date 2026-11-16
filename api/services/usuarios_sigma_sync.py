"""Concilia identidades SIGMA com a política local, sem importar permissões."""
from __future__ import annotations

import json
from uuid import UUID

from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.db.sigma_connection import get_sigma_connection
from api.path_policy import project_path

PERFIS = frozenset({'ADMIN', 'GESTOR', 'ANALISTA', 'OPERADOR', 'VISUALIZADOR'})


def validar_origem(perfis: list[dict], usuarios: list[dict]) -> list[dict]:
    """Recusa origem incompleta ou ambígua antes de alterar o banco SICARD."""
    if len(perfis) != len(PERFIS) or {p['nome'] for p in perfis} != PERFIS:
        raise ValueError('A origem deve conter exatamente os cinco perfis reconhecidos.')
    por_sigla = {p['nome']: UUID(str(p['id'])) for p in perfis}
    if len(set(por_sigla.values())) != len(PERFIS):
        raise ValueError('UUIDs de perfis SIGMA duplicados.')
    vistos: set[UUID] = set()
    vinculos = []
    for usuario in usuarios:
        identidade = UUID(str(usuario['id']))
        if identidade in vistos or usuario['tipo_usuario'] not in por_sigla:
            raise ValueError('Usuário duplicado ou tipo de usuário sem perfil correspondente.')
        if not isinstance(usuario['ativo'], bool):
            raise ValueError('Situação do usuário SIGMA inválida.')
        vistos.add(identidade)
        vinculos.append({
            'sigma_usuario_id': str(identidade),
            'perfil_codigo': str(por_sigla[usuario['tipo_usuario']]),
            'sigma_ativo': usuario['ativo'],
            'sigma_user_name': usuario.get('username'),
            'sigma_nome_completo': usuario.get('nome_completo'),
        })
    if not all(isinstance(p['ativo'], bool) for p in perfis):
        raise ValueError('Situação do papel SIGMA inválida.')
    return vinculos


def ler_origem() -> tuple[list[dict], list[dict]]:
    with get_sigma_connection() as conn:
        conn.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
        perfis = conn.execute('SELECT id,nome,ativo FROM usuarios.papel').fetchall()
        usuarios = conn.execute('''SELECT u.id,u.tipo_usuario,u.ativo,u.username,p.nome_completo
            FROM usuarios.usuario u
            LEFT JOIN cadastro.pessoa p ON p.id=u.pessoa_id''').fetchall()
    return perfis, usuarios


def aplicar_origem(conn, perfis: list[dict], usuarios: list[dict], *, migrar: bool = False) -> dict:
    """Participa da transação do chamador; não confirma alterações isoladamente."""
    vinculos = validar_origem(perfis, usuarios)
    conn.execute("SELECT pg_advisory_xact_lock(hashtext('sicard.usuarios_sigma_sync'))")
    if migrar:
        contexto = [dict(id=str(p['id']), nome=p['nome'], ativo=p['ativo']) for p in perfis]
        conn.execute("SELECT set_config('sicard.sigma_perfis', %s, true)", (json.dumps(contexto),))
        conn.execute(project_path('database/167_referenciar_perfis_sigma.sql').read_text(encoding='utf-8-sig'))
        # A transação pertence ao chamador; não executar os BEGIN/COMMIT da migration.
        nomes_sql = project_path('database/168_nomes_usuario_perfil.sql').read_text(encoding='utf-8-sig')
        conn.execute('\n'.join(line for line in nomes_sql.splitlines() if line not in ('BEGIN;', 'COMMIT;')))

    locais = conn.execute('SELECT codigo,sigla FROM usuarios.perfil').fetchall()
    if {p['sigla']: str(p['codigo']) for p in locais} != {p['nome']: str(p['id']) for p in perfis}:
        raise ValueError('Perfis locais não correspondem ao SIGMA; execute a migration 167.')

    conn.execute('''CREATE TEMP TABLE IF NOT EXISTS sicard_usuarios_sigma (
        sigma_usuario_id UUID PRIMARY KEY,
        perfil_codigo UUID NOT NULL,
        sigma_ativo BOOLEAN NOT NULL,
        sigma_user_name TEXT,
        sigma_nome_completo TEXT
    ) ON COMMIT DROP''')
    conn.execute('TRUNCATE TABLE pg_temp.sicard_usuarios_sigma')
    conn.execute('''INSERT INTO sicard_usuarios_sigma
        SELECT * FROM jsonb_to_recordset(%s) AS origem(
            sigma_usuario_id UUID, perfil_codigo UUID, sigma_ativo BOOLEAN,
            sigma_user_name TEXT, sigma_nome_completo TEXT)''', (Jsonb(vinculos),))
    anteriores = conn.execute('SELECT count(*) AS total FROM usuarios.usuario_perfil').fetchone()['total']
    for perfil in perfis:
        conn.execute('UPDATE usuarios.perfil SET sigma_ativo=%s WHERE codigo=%s AND sigma_ativo IS DISTINCT FROM %s',
                     (perfil['ativo'], perfil['id'], perfil['ativo']))
    conn.execute('''INSERT INTO usuarios.usuario_perfil
        (sigma_usuario_id,perfil_codigo,sigma_ativo,sigma_sincronizado_em,
         sigma_user_name,sigma_nome_completo,perfil_nome)
        SELECT s.sigma_usuario_id,s.perfil_codigo,s.sigma_ativo,clock_timestamp(),
               s.sigma_user_name,s.sigma_nome_completo,p.nome
        FROM sicard_usuarios_sigma s JOIN usuarios.perfil p ON p.codigo=s.perfil_codigo
        ON CONFLICT (sigma_usuario_id) DO UPDATE SET
            perfil_codigo=EXCLUDED.perfil_codigo,
            sigma_ativo=EXCLUDED.sigma_ativo,
            sigma_user_name=EXCLUDED.sigma_user_name,
            sigma_nome_completo=EXCLUDED.sigma_nome_completo,
            perfil_nome=EXCLUDED.perfil_nome,
            sigma_sincronizado_em=EXCLUDED.sigma_sincronizado_em''')
    ausentes = conn.execute('''UPDATE usuarios.usuario_perfil u
        SET sigma_ativo=FALSE,sigma_sincronizado_em=clock_timestamp()
        WHERE u.sigma_ativo AND NOT EXISTS (
            SELECT 1 FROM sicard_usuarios_sigma s WHERE s.sigma_usuario_id=u.sigma_usuario_id)''').rowcount
    total = conn.execute('SELECT count(*) AS total FROM usuarios.usuario_perfil').fetchone()['total']
    return dict(usuarios_sigma=len(usuarios), usuarios_sicard=total,
                novos=total-anteriores, ausentes_desativados=ausentes,
                ativos_sigma=sum(u['ativo'] for u in usuarios))


def sincronizar(*, migrar: bool = False, simular: bool = False) -> dict:
    perfis, usuarios = ler_origem()
    with get_connection() as conn:
        resultado = aplicar_origem(conn, perfis, usuarios, migrar=migrar)
        if simular:
            conn.rollback()
    return resultado
