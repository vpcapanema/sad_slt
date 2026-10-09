from unittest.mock import patch
import pytest
from fastapi import HTTPException
from api.routers import complementacao as mod
from api.services.session_service import SessionUser

def user(profile='OPERADOR'):
    return SessionUser('criador', '', '', '', profile)

@pytest.mark.parametrize('owner,person,allowed', [('criador','outra',True),('outro','pessoa',True),('outro','outra',False)])
def test_autoria_ou_representacao(owner,person,allowed):
    assert mod._pode_editar({}, pessoa_id='pessoa',usuario_id='criador',
                           demanda={'criado_por':owner,'sigma_pessoa_id':person}) is allowed

@pytest.mark.parametrize('profile,owned,state,allowed', [
    ('OPERADOR',True,'em_complementacao',True),
    ('OPERADOR',False,'em_complementacao',False),
    ('OPERADOR',True,'complementada',False),
    ('GESTOR',False,'em_complementacao',True),
    ('GESTOR',False,'complementada',True),
    ('ADMIN',False,'em_complementacao',True),
    ('ADMIN',False,'complementada',True),
])
def test_listagem(profile,owned,state,allowed):
    assert mod._pode_listar({'pode_editar':owned,'situacao_complementacao':state},user(profile)) is allowed

def test_acesso_direto_nao_contorna_filtro():
    row={'codigo':'H','dados_hierarquizacao':{'objetos':[{'cabecalho_objeto':{'codigo':'X'}}]}}
    with patch.object(mod.hierarquizacao_repository,'get_by_codigo',return_value=row), \
         patch.object(mod,'_pessoa_id',return_value='pessoa'), \
         patch.object(mod,'_cadastros',return_value={'X':{'criado_por':'outro','sigma_pessoa_id':'outra'}}), \
         patch.object(mod,'_matriz',return_value=[]):
        with pytest.raises(HTTPException) as err:
            mod.obter_complementacao('H','X',user())
        assert err.value.status_code==403

def test_snapshot_antigo_nao_concede_acesso():
    assert not mod._acesso({'codigo':'X','atributos':{'criado_por':'criador'}},user(),'pessoa',{})
