import json
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import UUID
from api.services import comparacao_colaborativa_service as s
from api.schemas.comparacao_colaborativa import AmbienteColaborativoCreateSchema, AmbienteColaborativoUpdateSchema

hid = UUID('44444444-4444-4444-4444-444444444444')
criteria = [{'criterio':'C1'}, {'criterio':'C2'}]
h = {'id':hid, 'codigo':'H1', 'dados_hierarquizacao':{'cabecalho_grupo':{'matriz_premissas_criterios':criteria}}}
current = {'id':'j1','status':'ativa','criterios':criteria,'hierarquizacao_id':hid,'total_respostas':0}
invite = [{'nome':'Pessoa Teste','email':'pessoa@example.com'}]
captured = {}
with patch.object(s,'_carregar_hierarquizacao',return_value=h), patch.object(s,'_ambiente_to_response',side_effect=lambda r,**kw:r), patch.object(s.repo,'encerrar_ambientes_anteriores') as close, patch.object(s.repo,'insert_ambiente',side_effect=lambda d:captured.update(create=d) or d), patch.object(s.repo,'get_ambiente_by_id',return_value=current), patch.object(s.repo,'update_ambiente',side_effect=lambda _id,d:captured.update(update=d) or d), patch.object(s.repo,'list_respostas',return_value=[]):
    s.criar_ambiente(AmbienteColaborativoCreateSchema(hierarquizacao_id=hid,convites=invite,valido_ate=datetime(2030,1,1,tzinfo=timezone.utc)))
    s.atualizar_ambiente('j1',AmbienteColaborativoUpdateSchema(convites=invite))
    result={'input':invite,'createInvites':captured['create']['convites'],'updateInvites':captured['update']['convites'],'closesPreviousRound':close.called}
print(json.dumps(result,indent=2))
