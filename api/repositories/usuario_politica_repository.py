"""Leitura da política vigente no SICARD; nenhuma herança por nome do perfil."""
from api.db.connection import get_connection


def carregar(user):
    with get_connection() as conn:
        rows = conn.execute('''SELECT p.codigo,p.sigla,p.nome,
            a.codigo AS permissao,pp.escopo
            FROM usuarios.usuario_perfil u
            JOIN usuarios.perfil p ON p.codigo=u.perfil_codigo
            LEFT JOIN usuarios.perfil_permissao pp ON pp.perfil_codigo=p.codigo AND pp.ativo
            LEFT JOIN usuarios.permissao a ON a.codigo=pp.permissao_codigo AND a.ativo
            WHERE u.sigma_usuario_id=%s AND u.ativo AND u.sigma_ativo
              AND p.ativo AND p.sigma_ativo''', (user.id,)).fetchall()
    if not rows:
        return None
    return dict(codigo=str(rows[0]['codigo']), sigla=rows[0]['sigla'], nome=rows[0]['nome'],
                permissoes={r['permissao']: r['escopo'] for r in rows if r['permissao']})
