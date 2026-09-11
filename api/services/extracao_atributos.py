"""Catálogo, execução persistida e recuperação das extrações de atributos."""
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from threading import Lock
from uuid import UUID

from api.db.connection import get_connection
from api.path_policy import project_path
from api.repositories import camada_geoespacial_repository as repo
from api.services import ciclo_vida_arquivos as ciclo
from api.services.extracao_atributos_analise import analisar
from api.services.geoespacial_service import geoespacial_service as geo

_log = logging.getLogger(__name__)
_pool = ThreadPoolExecutor(max_workers=1,thread_name_prefix='extracao')
_progress = {}
_lock = Lock()


def caminho_arquivo(row):
    """Caminho relativo registrado da camada; a lista da bancada guarda esta referência."""
    metadata = row.get('metadados') or {}
    nested = metadata.get('metadados') or {}
    valor = metadata.get('caminho_arquivo') or nested.get('caminho_arquivo')
    return str(valor).replace('\\', '/') if valor else None


def catalogo():
    with get_connection() as conn:
        categories = [dict(r) for r in conn.execute('''SELECT codigo AS id,nome,conceito
            FROM dominios.categoria_extracao_atributos WHERE ativo ORDER BY ordem,nome''').fetchall()]
        hidden = {r['recurso_sessao_id'] for r in conn.execute('''SELECT c.recurso_sessao_id
            FROM geoprocessamento.arquivo_resultado a JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
            WHERE a.estado IN ('temporario','removido')''').fetchall()}
    layers = [{'id':r['recurso_sessao_id'],'nome':r['nome'],'tipo':'vetor','crs':r['crs'],
               'origem':r['categoria'],'arquivo':caminho_arquivo(r)}
              for r in repo.listar() if r['tipo']=='vetor' and r['recurso_sessao_id'] not in hidden]
    return {'categorias':categories,'camadas':layers}


def caminho(ident, pasta=None):
    """Arquivo do resultado. A pasta leva o nome da saida, nao o UUID.

    O nome fica gravado em execucao_arquivo.parametros porque so o identificador
    chega aqui na leitura. Execucoes antigas continuam na pasta com o UUID.
    """
    ident = str(UUID(str(ident)))
    if pasta is None:
        with get_connection() as conn:
            linha = conn.execute("""SELECT parametros->>'pasta_resultado' AS pasta
                FROM geoprocessamento.execucao_arquivo WHERE id=%s""", (ident,)).fetchone()
        pasta = (linha or {}).get('pasta')
    if not pasta:
        return project_path(f'data/geoespacial/outputs/{ident}/extracao.json')
    return project_path(f'data/geoespacial/outputs/{pasta}/extracao.json')


def iniciar(payload, user):
    catalog = catalogo()
    layers = {r['id']:r for r in catalog['camadas']}
    categories = {r['id']:r for r in catalog['categorias']}
    input_id = payload['input_id']
    if input_id not in layers:
        raise ValueError('A camada de entrada não está disponível no catálogo vetorial.')
    used, selected = set(), []
    for group in payload['categorias']:
        if group['id'] not in categories:
            raise ValueError('Categoria inexistente ou inativa. Atualize o catálogo.')
        if any(c['id']==group['id'] for c in selected):
            raise ValueError('Categoria repetida.')
        bases = []
        for ident in group['camadas']:
            if ident not in layers or ident == input_id or ident in used:
                raise ValueError('Base indisponível, repetida ou igual à entrada.')
            used.add(ident); bases.append(layers[ident])
        selected.append({**categories[group['id']],'camadas':bases})
    from api.services.extracao_atributos_analise import OPCOES_PADRAO
    opcoes = {chave: bool((payload.get('opcoes') or {}).get(chave, valor))
              for chave, valor in OPCOES_PADRAO.items()}
    params = {'camada_id':input_id,'camada_ids':sorted(used),'categorias':selected,
              'operacao':payload['operacao'],'opcoes':opcoes,'input_nome':layers[input_id]['nome'],
              'nome_saida':str(payload.get('nome_saida') or '').strip()[:200]}
    ident = ciclo.iniciar('extracao_atributos',params,str(user.id))
    with _lock: _progress[ident] = [_etapa('Na fila de processamento')]
    try:
        _pool.submit(_execute,ident,params)
    except Exception:
        ciclo.finalizar(ident,erro='Não foi possível iniciar o processamento.')
        raise
    return {'id':ident,'status':'executando'}


LIMITE_ETAPAS = 300


def _etapa(mensagem):
    return {'em': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'mensagem': mensagem}


def _execute(ident, params):
    token = ciclo.execucao_atual.set(ident)
    def progress(message):
        # O modal de acompanhamento lê esta lista; o corte evita crescer sem limite.
        with _lock:
            etapas = _progress.setdefault(ident, [])
            etapas.append(_etapa(message))
            del etapas[:-LIMITE_ETAPAS]
    try:
        progress('Carregando entrada e bases')
        from api.services.municipal_layer import carregar_para_extracao
        source = carregar_para_extracao(params['camada_id'])
        categories = [{**c,'camadas':[{**b,'frame':carregar_para_extracao(b['id'])} for b in c['camadas']]}
                      for c in params['categorias']]
        result, frame = analisar(source,categories,params['operacao'],progress,params.get('opcoes'))
        progress('Gravando geometria e relatório da análise')
        nome_saida = params.get('nome_saida') or f"Extração de {params['input_nome']}"
        layer_id = geo.registrar_camada(frame,nome_saida,'OP-05',linhagem=params)
        from osgeo import gdal
        result.update(id=ident,camada_resultado_id=layer_id,input_id=params['camada_id'],input_nome=params['input_nome'],
                      criado_em=datetime.now(timezone.utc).isoformat(),gdal=gdal.VersionInfo())
        destino = ciclo.pasta_de_saida(nome_saida, ident)
        path = caminho(ident, destino.name)
        # Exclusivo desta execução; resultado só fica disponível após finalizar.
        with path.open('x',encoding='utf-8') as stream:
            json.dump(result,stream,ensure_ascii=False,allow_nan=False)
        with get_connection() as conn:
            conn.execute("""UPDATE geoprocessamento.execucao_arquivo
                SET parametros = jsonb_set(coalesce(parametros,'{}'::jsonb),
                    '{pasta_resultado}', to_jsonb(%s::text)) WHERE id=%s""", (destino.name, ident))
            ciclo.registrar_uso(conn,layer_id,'relatorio',ident)
        ciclo.finalizar(ident)
    except Exception as exc:
        message = str(exc) if isinstance(exc,ValueError) else 'Falha ao processar ou persistir a análise. Verifique os dados e o serviço.'
        # O texto genérico protege o usuário de detalhe interno, mas sem este
        # log a causa real da falha não ficava registrada em lugar nenhum.
        _log.exception('Extração de atributos %s falhou', ident)
        ciclo.finalizar(ident,erro=message)
    finally:
        ciclo.execucao_atual.reset(token)
        with _lock: _progress.pop(ident,None)


def consultar(ident, user, completo=False):
    ident = str(UUID(str(ident)))
    with get_connection() as conn:
        row = conn.execute("SELECT id,status,erro,responsavel FROM geoprocessamento.execucao_arquivo WHERE id=%s AND operacao='extracao_atributos'",(ident,)).fetchone()
    if not row or row['responsavel'] != str(user.id):
        raise LookupError('Extração não encontrada para esta sessão.')
    response = {'id':ident,'status':row['status'],'erro':row['erro']}
    with _lock: etapas = list(_progress.get(ident) or [])
    response['etapas'] = etapas
    response['etapa'] = (etapas[-1]['mensagem'] if etapas
                         else 'Processamento em execução' if row['status'] == 'executando' else row['status'])
    if row['status']=='concluido' and completo:
        response['resultado'] = json.loads(caminho(ident).read_text(encoding='utf-8'))
    return response
