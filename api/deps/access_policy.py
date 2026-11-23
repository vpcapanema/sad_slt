"""Autoriza rotas por capacidades locais; sessão não confere herança."""
from fastapi import Depends, HTTPException, Request
from api.deps.auth import get_optional_session
from api.services.session_service import SessionUser, cookie_name
from api.services import autorizacao as authz

SAFE_METHODS = frozenset({'GET', 'HEAD', 'OPTIONS'})
MOCAD = {'demandas', 'planos', 'programas', 'analise', 'sei', 'geometria', 'painel'}
MAD = {'ahp', 'hierarquizacoes', 'agrupamentos-demandas', 'universo'}


def module_for_path(path):
    parts = path.strip('/').split('/')
    if parts[0] == 'api':
        name = parts[1] if len(parts) > 1 else ''
        if path.startswith('/api/ahp/superficies-criterios'):
            return 'ferramentas'
        if path.startswith('/api/painel/operador'):
            return 'operador'
        if name in MOCAD:
            return 'mocad'
        if name in MAD:
            return 'mad'
        if name == 'complementacao':
            return 'operador' if '/solicitacoes' not in path else None
        if name in {'admin', 'email'}:
            return 'admin'
        if name in {'geoespacial', 'superficie-criterios'}:
            return 'ferramentas'
    if parts[0] == 'restrict':
        name = parts[1] if len(parts) > 1 else ''
        if name == 'admin':
            return 'admin'
        if name in {'operador', 'complementacao'}:
            return 'operador'
        if name in {'painel', 'demandas', 'demanda', 'revisao-status', 'sei-documentos', 'central-pendencias', 'solicitacao-complementacao'}:
            return 'mocad'
        if name in {'hierarquizacao', 'agrupamento-demandas', 'analise-multicriterio', 'ahp'}:
            return 'mad'
        if name == 'geoespacial':
            return 'ferramentas'
    if path.rstrip('/') == '/public/cadastro/nova-demanda':
        return 'cadastro'
    return None


def read_only(user, module):
    return bool(user and module and not authz.pode_alterar(user, module))


def page_allowed(user, path):
    module = module_for_path(path)
    if module == 'cadastro':
        return authz.permite(user, 'mocad.cadastrar_demanda') or authz.pode_visualizar(user, 'mocad')
    if module == 'operador' and '/complementacao' in path:
        return authz.pode_visualizar(user, 'operador') or authz.pode_visualizar(user, 'mocad')
    if module is None:
        return bool(user)
    if module == 'mocad' and not authz.permite(user, 'area_restrita.visualizar') and not authz.permite(user, 'mocad.visualizar', escopo='todos'):
        return False
    return authz.pode_visualizar(user, module)


def _public(path, method):
    if method == 'POST' and path in {'/api/pesquisa-experiencia/respostas', '/api/pesquisa-experiencia/ahp/respostas'}:
        return True
    if path.startswith(('/api/auth/', '/api/health', '/api/ahp/comparacao-colaborativa/publico/')):
        return True
    if method not in SAFE_METHODS:
        return False
    if path.startswith(('/api/geo/', '/api/instituicoes')):
        return True
    for kind in ('demandas', 'planos', 'programas'):
        prefix = '/api/' + kind
        if path == prefix or (path.startswith(prefix + '/') and '/internas' not in path and path.count('/') == 3):
            return True
    return path in {'/api/painel/demandas', '/api/painel/geometrias', '/api/ahp/comparacao-colaborativa/modelo-pli'}


def consultation(path, method):
    if method in SAFE_METHODS:
        return True
    return method == 'POST' and (
        path.startswith('/api/geo/analyze/')
        or path == '/api/dominios/adversidades/camadas/resolver'
        or path in {'/api/geoespacial/storage/detalhes', '/api/geoespacial/bancada-arquivos/tabela',
                    '/api/geoespacial/bancada-arquivos/geometrias', '/api/geoespacial/bancada-arquivos/consulta',
                    '/api/geoespacial/bancada-arquivos/preparar', '/api/geoespacial/catalogo/portal/stac/buscar'}
        or path.endswith('/consultar-atributos')
        or (path.startswith('/api/geoespacial/municipal/') and path.endswith('/preview'))
    )


def write_permissions(path, method):
    parts = path.strip('/').split('/')
    name = parts[1] if len(parts) > 1 else ''
    # Consumidor legado do MAD usa o CRUD genérico para renomear/excluir grupos.
    # A localização da URL não concede poderes de negócio ao Administrador.
    if path == '/api/admin/tabelas/demandas/grupos_demandas':
        return ('mad.operar',)
    if name in {'admin', 'email'} or path.startswith('/api/auth/sessoes/'):
        return ('administracao.configurar',)
    if name == 'complementacao':
        if '/solicitacoes' in path:
            if path.endswith('/concluir'):
                return ('solicitacao.cumprir',)
            return ('mocad.solicitar_complementacao', 'mad.operar')
        if path.endswith('/solicitar'):
            return ('mad.operar',)
        if method == 'PATCH' and len(parts) == 4 and parts[2] == 'hierarquizacoes':
            return ('mad.operar', 'solicitacao.cumprir')
        return ('solicitacao.cumprir',)
    if name == 'sei':
        return ('mocad.cadastrar_lote',)
    if name in {'demandas', 'planos', 'programas'}:
        if method == 'POST' and (len(parts) == 2 or parts[-1] == 'com-arquivo-geometria'):
            return ('mocad.cadastrar_demanda',)
        if method == 'DELETE':
            return ('mocad.excluir',)
        if method == 'PATCH':
            return ('mocad.analisar', 'mocad.reverter_status_inline')
        return ('mocad.analisar',)
    if name == 'analise':
        return ('mocad.solicitar_complementacao',) if path.endswith('/situacao') else ('mocad.analisar',)
    if name == 'geometria':
        return ('mocad.cadastrar_demanda', 'solicitacao.cumprir', 'ferramentas.operar') if path.endswith('/parse') else ('mocad.analisar',)
    if path.startswith('/api/geo/'):
        return ('mocad.cadastrar_demanda', 'solicitacao.cumprir', 'ferramentas.operar')
    module = module_for_path(path)
    if module == 'mad':
        return ('mad.operar',)
    if module == 'ferramentas':
        return ('ferramentas.operar',)
    return ()


def authorize_request(request, user):
    path = request.url.path.rstrip('/')
    method = request.method
    if _public(path, method) and not path.startswith('/api/auth/sessoes/'):
        return user
    if not user:
        raise HTTPException(401, 'Faça login para continuar. Sua sessão está ausente ou expirada.')
    if consultation(path, method):
        module = module_for_path(path)
        if path.startswith('/api/complementacao/solicitacoes'):
            allowed = authz.pode_visualizar(user, 'mocad') or authz.pode_visualizar(user, 'mad')
        elif path.startswith('/api/complementacao/'):
            allowed = authz.pode_visualizar(user, 'operador') or authz.pode_visualizar(user, 'mocad') or authz.pode_visualizar(user, 'mad')
        elif module:
            allowed = authz.pode_visualizar(user, module)
        else:
            allowed = True
        if not allowed:
            authz.negar(user, 'consultar este módulo', (f'{module}.visualizar',))
        if path.startswith('/api/analise/') and not (
            authz.permite(user, 'area_restrita.visualizar') or authz.permite(user, 'mocad.visualizar', escopo='todos')):
            from api.repositories import demanda_repository, plano_repository, programa_repository
            codigo = request.path_params.get('codigo')
            registro = next((r for repo in (demanda_repository, plano_repository, programa_repository)
                             if (r := repo.get_by_codigo(codigo))), None)
            authz.exigir_cadastro(user, registro or {})
        if path == '/api/painel/demandas/internas' and not (
            authz.permite(user, 'area_restrita.visualizar') or authz.permite(user, 'mocad.visualizar', escopo='todos')):
            authz.negar(user, 'consultar o painel interno completo', ('mocad.visualizar',),
                        'Utilize suas páginas de cadastro e cumprimento de solicitações.')
        return user
    codes = write_permissions(path, method)
    if path.startswith('/api/admin/tabelas/') and path != '/api/admin/tabelas/demandas/grupos_demandas':
        parts = path.split('/')
        if len(parts) >= 6 and not authz.tabela_tecnica_editavel(parts[4], parts[5]):
            authz.negar(user, 'alterar registros de negócio pela administração técnica',
                motivo='Esta tabela é de consulta na área técnica. Utilize o fluxo MOCAD ou MAD com a permissão correspondente.')
    if not codes:
        authz.negar(user, 'executar esta operação', motivo='Esta operação não está habilitada pela política de acesso do SICARD.')
    rotulos = {
        'mocad.cadastrar_demanda': 'cadastrar uma demanda',
        'mocad.cadastrar_lote': 'cadastrar ou gerenciar demandas em lote a partir dos documentos SEI',
        'mocad.analisar': 'analisar ou alterar dados de uma demanda',
        'mocad.solicitar_complementacao': 'solicitar ou gerenciar complementações do MOCAD',
        'mocad.excluir': 'excluir uma demanda',
        'mad.operar': 'operar as funções e decisões do MAD',
        'ferramentas.operar': 'executar ferramentas de apoio do SICARD',
        'administracao.configurar': 'alterar a configuração técnica do sistema',
        'solicitacao.cumprir': 'atender ou concluir uma solicitação de complementação',
    }
    return authz.exigir(user, *codes, acao=rotulos.get(codes[0], 'executar esta operação'))


def _policy_session(request: Request):
    if request.url.path.startswith('/api/ahp/comparacao-colaborativa/publico/'):
        return None
    return get_optional_session(request, request.cookies.get(cookie_name()))


def require_module_policy(request: Request, user: SessionUser | None = Depends(_policy_session)):
    authorize_request(request, user)
