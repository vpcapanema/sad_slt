"""Capacidades do usuário autenticado, carregadas das tabelas usuarios do SICARD."""
from dataclasses import replace

from fastapi import HTTPException

from api.exceptions import AuthError
from api.repositories import usuario_politica_repository


def vincular(user):
    politica = usuario_politica_repository.carregar(user)
    if not politica:
        raise AuthError('Usuário autenticado no SIGMA, mas sem vínculo ativo de perfil no SICARD. Solicite a verificação do seu acesso.')
    return replace(user, tipo_usuario=politica['sigla'], perfil_codigo=politica['codigo'],
                   perfil_nome=politica['nome'], permissoes=politica['permissoes'])


def concessoes(user):
    if not user:
        return {}
    if getattr(user, 'permissoes', None) is None:
        politica = usuario_politica_repository.carregar(user)
        return politica['permissoes'] if politica else {}
    return user.permissoes


def permite(user, codigo, *, escopo=None):
    valor = concessoes(user).get(codigo)
    return bool(valor and (escopo is None or valor == 'todos' or valor == escopo))


def negar(user, acao, permissoes=(), motivo=None):
    nome = (getattr(user, 'perfil_nome', None) or getattr(user, 'tipo_usuario', '') or 'não identificado')
    detalhe = (f'Ação não autorizada: {acao}. Seu perfil no SICARD ({nome}) não possui a permissão necessária. '
               + (motivo or 'Nenhuma alteração foi realizada por esta solicitação.'))
    raise HTTPException(403, detalhe, headers={
        'X-SICARD-Permission-Denied': 'true', 'Cache-Control': 'no-store',
        'X-SICARD-Required-Permission': ','.join(permissoes),
    })


def exigir(user, *codigos, acao='executar esta ação', escopo=None):
    if not user:
        raise HTTPException(401, 'Faça login para continuar. Sua sessão está ausente ou expirada.')
    if not any(permite(user, c, escopo=escopo) for c in codigos):
        negar(user, acao, codigos)
    return user


def pode_visualizar(user, modulo):
    codigos = {'mocad': ('mocad.visualizar',), 'mad': ('mad.visualizar',),
               'ferramentas': ('ferramentas.visualizar',), 'operador': ('operador.visualizar',),
               'admin': ('administracao.configurar', 'administracao.manter')}
    return permite(user, 'area_restrita.visualizar') or any(permite(user, c) for c in codigos.get(modulo, ()))


def pode_alterar(user, modulo):
    codigos = {'mocad': ('mocad.analisar', 'mocad.cadastrar_lote', 'mocad.reverter_status_inline'), 'mad': ('mad.operar',),
               'cadastro': ('mocad.cadastrar_demanda',),
               'ferramentas': ('ferramentas.operar',), 'operador': ('operador.executar_acoes',),
               'admin': ('administracao.configurar', 'administracao.manter')}
    return any(permite(user, c) for c in codigos.get(modulo, ()))


def pertence(user, registro):
    def campo(nome):
        return registro.get(nome) if isinstance(registro, dict) else getattr(registro, nome, None)
    return bool((campo('criado_por') and str(campo('criado_por')) == str(user.id)) or
                (getattr(user, 'pessoa_id', None) and str(campo('sigma_pessoa_id') or campo('pessoa_id') or '') == user.pessoa_id))


def filtrar_cadastros(user, registros):
    if permite(user, 'area_restrita.visualizar') or permite(user, 'mocad.visualizar', escopo='todos'):
        return registros
    exigir(user, 'mocad.visualizar', acao='consultar demandas')
    return [r for r in registros if pertence(user, r)]


def exigir_cadastro(user, registro):
    if permite(user, 'area_restrita.visualizar') or permite(user, 'mocad.visualizar', escopo='todos'):
        return
    exigir(user, 'mocad.visualizar', acao='consultar esta demanda')
    if not pertence(user, registro):
        negar(user, 'consultar uma demanda de outro responsável', ('mocad.visualizar',),
              'Seu acesso é limitado às demandas vinculadas ao seu usuário ou à sua pessoa no SIGMA.')


def exigir_criacao(user, body):
    exigir(user, 'mocad.cadastrar_demanda', acao='cadastrar uma demanda')
    from api.constants import STATUS_INICIAL_DEMANDA
    if getattr(body, 'status', STATUS_INICIAL_DEMANDA) != STATUS_INICIAL_DEMANDA:
        negar(user, 'definir um status de decisão pelo cadastro de demanda',
              motivo='Novas demandas iniciam em análise. Utilize o fluxo de análise ou a reversão inline autorizada para alterar o status.')
    if permite(user, 'mocad.cadastrar_demanda', escopo='todos'):
        return
    pessoa = getattr(user, 'pessoa_id', None)
    representantes = [body.pessoa_id, body.representante.pessoa_id]
    if (not pessoa or body.representante.instituicao_id
            or not any(representantes)
            or any(str(valor) != str(pessoa) for valor in representantes if valor)):
        negar(user, 'cadastrar uma demanda em nome de outro responsável', ('mocad.cadastrar_demanda',),
              'O cadastro com escopo próprio deve usar sua pessoa vinculada no SIGMA como representante.')


def tabela_tecnica_editavel(esquema, tabela):
    if esquema == 'auditoria':
        return False
    if esquema in {'demandas', 'ahp', 'hierarquizacao_demandas'}:
        return tabela.startswith('dom_')
    if esquema == 'geoprocessamento':
        return tabela in {'modelo_geoprocessamento', 'portal_servico', 'nome_storage', 'politica_retencao_arquivo', 'configuracao_fluxo', 'fonte', 'produto', 'criterio_fase2', 'fonte_fase1'}
    return True
