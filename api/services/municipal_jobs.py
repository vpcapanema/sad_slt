"""Acompanhamento temporário, privado por usuário, da geração municipal."""
from concurrent.futures import ThreadPoolExecutor
from threading import RLock
from time import monotonic
from uuid import uuid4
from api.services.controle_processamento import ControleProcessamento, ProcessamentoCancelado
from api.services import municipal_layer

_jobs = {}
_lock = RLock()
_pool = ThreadPoolExecutor(max_workers=1,thread_name_prefix='municipal')


def obter(ident,user):
    with _lock:
        job = _jobs.get(ident)
        if not job or job['dono'] != str(user.id):
            raise LookupError('Processamento não encontrado para esta sessão.')
        return job


def consultar(ident,user):
    job=obter(ident,user)
    return {'id':ident,**job['controle'].snapshot(),'erro':job.get('erro'),'resultado':job.get('resultado')}


def iniciar(categoria,payload,user):
    with _lock:
        for chave,job in list(_jobs.items()):
            if job['controle'].status!='executando' and monotonic()-job['criado']>3600:
                del _jobs[chave]
        if len(_jobs)>=30:
            raise ValueError('Há muitos processamentos recentes. Aguarde antes de gerar outra camada.')
        ident=uuid4().hex
        job={'dono':str(user.id),'controle':ControleProcessamento(),'criado':monotonic()}
        _jobs[ident]=job
    def executar():
        controle=job['controle']
        try:
            controle.verificar()
            _,resultado=municipal_layer.gerar(categoria,{k:v for k,v in payload.items() if k!='nome'},payload.get('nome',''),user,controle)
            job['resultado']=resultado
            controle.encerrar('concluido')
        except ProcessamentoCancelado:
            controle.encerrar('cancelado')
        except Exception:
            job['erro']='Não foi possível gerar a camada. Confira os indicadores e tente novamente.'
            controle.encerrar('erro')
    _pool.submit(executar)
    return consultar(ident,user)


def cancelar(ident,user):
    obter(ident,user)['controle'].cancelar()
    return consultar(ident,user)


def pacote(ident,user):
    job=obter(ident,user)
    if job['controle'].status!='concluido':
        raise ValueError('O pacote ainda não está disponível.')
    # Refaz apenas o contêiner ZIP dos arquivos já validados no acervo.
    from api.path_policy import project_path
    from io import BytesIO
    from zipfile import ZipFile, ZIP_DEFLATED
    folder=project_path(job['resultado']['arquivo']).parent
    buffer=BytesIO()
    with ZipFile(buffer,'w',ZIP_DEFLATED) as archive:
        for path in sorted(folder.iterdir()):
            if path.is_file():archive.write(path,path.name)
    return buffer.getvalue(),job['resultado']
