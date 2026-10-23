"""Arquivo validado + registro transacional para cada saída de geoprocesso."""
from __future__ import annotations

from contextvars import ContextVar
import json
import re
import unicodedata
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from api.storage_policy import mkdtemp, TemporaryDirectory, sem_montagem

import geopandas as gpd
import rasterio
from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.path_policy import project_path

execucao_atual: ContextVar[str | None] = ContextVar("execucao_arquivo", default=None)


def digest(path: Path) -> str:
    with path.open('rb') as stream:
        return sha256_stream(stream)


def caminho_exportacao(nome: str, categoria: str) -> Path:
    from api.path_policy import geo_output_path
    validated = geo_output_path(nome, categoria=categoria, label='saída')
    # A pasta leva o nome do que foi exportado; o UUID nao diz nada a quem abre.
    base = project_path('tmp/saidas-exportacao')
    pasta = base / f'{apelido(validated.stem, 48) or "exportacao"}_{uuid4().hex[:8]}'
    pasta.mkdir(parents=True, exist_ok=False)
    return pasta / validated.name


def registrar_exportacao(path: Path, recurso: str, tipo: str, *, pasta_saida: str | None = None,
                         conteudos: dict[str, bytes] | None = None) -> dict:
    if pasta_saida is None:
        return _registrar_exportacao(path, recurso, tipo, conteudos=conteudos)
    from api.services.saidas_storage import pasta_exportacao
    pasta_saida = pasta_exportacao(pasta_saida)
    with get_connection() as conn:
        locked = conn.execute(
            'SELECT pg_try_advisory_lock(hashtextextended(%s,0)) AS adquirido',
            ('saida-storage:' + pasta_saida.casefold(),),
        ).fetchone()
        if locked is None:
            raise RuntimeError('O banco não confirmou o controle de concorrência da pasta de saída.')
        if not locked['adquirido']:
            raise ValueError('Outra saída está sendo gravada nesta pasta. Aguarde e tente novamente.')
        try:
            return _registrar_exportacao(path, recurso, tipo, pasta_saida=pasta_saida, conteudos=conteudos)
        finally:
            conn.execute(
                'SELECT pg_advisory_unlock(hashtextextended(%s,0))',
                ('saida-storage:' + pasta_saida.casefold(),),
            )


def registrar_exportacao_memoria(nome: str, conteudos: dict[str, bytes], recurso: str, tipo: str,
                                *, pasta_saida: str | None = None) -> dict:
    from api.services.arquivos_geoespaciais_memoria import trabalho
    with trabalho(conteudos):
        return registrar_exportacao(Path(nome), recurso, tipo, pasta_saida=pasta_saida, conteudos=conteudos)


def _registrar_exportacao(path: Path, recurso: str, tipo: str, *, pasta_saida: str | None = None,
                          conteudos: dict[str, bytes] | None = None) -> dict:
    from api.services import saidas_storage, storage_remoto
    if pasta_saida is not None:
        pasta_saida = saidas_storage.pasta_exportacao(pasta_saida)
    if tipo == 'relatorio':
        json.loads(conteudos[path.name].decode('utf-8') if conteudos is not None else path.read_text(encoding='utf-8'))
        validation = {'tipo': 'relatorio', 'reaberto_json': True}
    elif tipo == 'vetor':
        from api.services.analise_territorial_ogr import resumo_vetor
        validation = resumo_vetor(path, conteudos)
    else:
        with rasterio.open(BytesIO(conteudos[path.name]) if conteudos is not None else path) as raster:
            for _, window in raster.block_windows(1):
                raster.read(window=window)
            validation = {'largura':raster.width,'altura':raster.height,'crs':str(raster.crs),'reaberto_gdal':True}
    validation['nome']=path.stem
    execution = execucao_atual.get()
    own = execution is None
    if own:
        execution = iniciar('exportacao_direta', {'entrada':recurso, 'nome_saida':path.stem})
    ident = str(uuid4())
    created = []
    # Um único prefixo mantém .shp, .shx, .dbf e .prj associados.
    stem = path.stem if pasta_saida else f'{apelido(path.stem, 60) or "saida"}_{uuid4().hex[:12]}'
    try:
        pasta_automatica = saidas_storage.pasta_execucao(execution) if not pasta_saida else None
        files = ([Path(name) for name in sorted(conteudos)] if conteudos is not None else
                 [component for component in sorted(path.parent.iterdir()) if component.is_file()])
        if pasta_saida:
            existing = {item['nome'].casefold() for item in storage_remoto.listar(pasta_saida, estrito=True)}
            if any(component.name.casefold() in existing for component in files):
                raise FileExistsError('Já existe uma saída com esse nome na pasta escolhida. Escolha outro nome.')
        for component in files:
            if conteudos is not None or component.is_file():
                if pasta_saida:
                    target = f'{pasta_saida}/{component.name}'
                    item = (saidas_storage.enviar_conteudo(target, conteudos[component.name]) if conteudos is not None
                            else saidas_storage.enviar_exportacao(target, component))
                else:
                    target = f'{pasta_automatica}/{stem}{component.name[len(path.stem):]}'
                    item = (saidas_storage.enviar_bytes(execution, 'camadas', component.name, conteudos[component.name], caminho=target)
                            if conteudos is not None else saidas_storage.enviar_arquivo(execution, 'camadas', component, caminho=target))
                item['nome'] = component.name
                created.append(item)
        relative = next(x['caminho'] for x in created if x['nome']==path.name)
        components = created
    except Exception as exc:
        for item in created:
            saidas_storage.remover(item['caminho'])
        if own:
            finalizar(execution, erro=str(exc))
        raise
    committing=False
    try:
        with get_connection() as conn:
            conn.execute('''INSERT INTO geoprocessamento.arquivo_exportado
                (id,execucao_id,recurso_origem,caminho,componentes,validacao) VALUES (%s,%s,%s,%s,%s,%s)''',
                (ident,execution,recurso,relative,Jsonb(components),Jsonb(validation)))
            registrar_uso(conn,recurso,'entrada',str(execution))
            committing=True
            conn.commit()
    except Exception as exc:
        if not committing:
            for item in created:
                saidas_storage.remover(item['caminho'])
        if own:
            try:
                finalizar(execution,erro=str(exc))
            except Exception:
                pass
        raise
    if own:
        finalizar(execution)
    if conteudos is None:
        for component in list(path.parent.iterdir()):
            if component.is_file():
                component.unlink()
        path.parent.rmdir()
    return {'arquivo_exportado_id':ident,'execucao_id':execution,'caminho':relative,
            'destino':str(Path(relative).parent),'componentes':components}


def exportar_relatorio(resultado: dict, pasta: str, nome: str, origem: str) -> dict:
    from api.services.pastas_storage import nome_valido
    from api.services.saidas_storage import pasta_exportacao
    pasta_exportacao(pasta)
    nome_valido(nome)
    filename = nome if nome.lower().endswith('.json') else nome + '.json'
    nome_valido(filename)
    from api.storage_policy import sem_montagem
    if sem_montagem():
        content = json.dumps(resultado, ensure_ascii=False, allow_nan=False, default=str).encode('utf-8')
        return registrar_exportacao_memoria(filename, {filename: content}, origem, 'relatorio', pasta_saida=pasta)
    with TemporaryDirectory(prefix='sicard-relatorio-') as directory:
        path = Path(directory) / filename
        path.write_text(json.dumps(resultado, ensure_ascii=False, allow_nan=False, default=str), encoding='utf-8')
        return registrar_exportacao(path, origem, 'relatorio', pasta_saida=pasta)


def migrar_exportacao(ident: str, raiz_arquivos: Path | None = None) -> dict:
    """Copia a exportação legada com todos os acompanhantes, conservando seu registro."""
    from api.services import saidas_storage
    root=(raiz_arquivos or project_path('.')).resolve()
    uploaded=[]
    committing=False
    with get_connection() as conn:
        row=conn.execute('SELECT * FROM geoprocessamento.arquivo_exportado WHERE id=%s FOR UPDATE',(ident,)).fetchone()
        if not row:
            raise ValueError('Exportação não encontrada.')
        if row['caminho'].startswith(saidas_storage.RAIZ+'/'):
            for item in row['componentes']:
                saidas_storage.conferir(item['caminho'],item['sha256'])
            return dict(row)
        sources=[]
        for item in row['componentes']:
            relative=Path(item['caminho'])
            if relative.is_absolute() or '..' in relative.parts or not relative.as_posix().startswith('data/geoespacial/outputs/'):
                raise ValueError('Componente fora do destino legado de saídas.')
            source=(root/relative).resolve()
            if not source.is_relative_to(root) or digest(source)!=item['sha256']:
                raise ValueError('Arquivo legado ausente ou divergente do hash registrado.')
            sources.append((item,source))
        name=Path(row['caminho']).stem
        stem=apelido(name,60)+'_'+uuid4().hex[:12]
        try:
            pasta = saidas_storage.pasta_execucao(str(row['execucao_id']), conn=conn)
            for item,source in sources:
                destination=f"{pasta}/{stem}{source.name[len(name):]}"
                record=saidas_storage.enviar_arquivo(str(row['execucao_id']),'camadas',source,caminho=destination)
                record['nome']=source.name
                uploaded.append(record)
            primary=next(item['caminho'] for item in uploaded if item['nome']==Path(row['caminho']).name)
            validation={**row['validacao'],'nome':name,'migracao_storage':True}
            conn.execute('UPDATE geoprocessamento.arquivo_exportado SET caminho=%s,componentes=%s,validacao=%s WHERE id=%s',
                         (primary,Jsonb(uploaded),Jsonb(validation),ident))
            committing=True
            conn.commit()
        except Exception:
            if not committing:
                for item in uploaded:
                    saidas_storage.remover(item['caminho'])
            raise
    return {'id':ident,'caminho':primary,'componentes':uploaded,'validacao':validation}


def exigir_editavel(recurso: str) -> None:
    with get_connection() as conn:
        row = conn.execute('''SELECT a.id FROM geoprocessamento.arquivo_resultado a
            JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
            WHERE c.recurso_sessao_id=%s''',(recurso,)).fetchone()
    if row:
        raise ValueError('Resultado com arquivo é imutável. Gere uma nova camada para editar seu conteúdo.')


def verificar_resultado(recurso: str) -> None:
    """Impede reutilização de arquivo retirado, inclusive em caches de outros workers."""
    with get_connection() as conn:
        row = conn.execute('''SELECT a.estado FROM geoprocessamento.arquivo_resultado a
            JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
            WHERE c.recurso_sessao_id=%s FOR UPDATE OF a''',(recurso,)).fetchone()
        if row and row['estado'] == 'removido':
            raise ValueError('Arquivo retirado pela retenção; a camada permanece apenas no histórico.')
        execution = execucao_atual.get()
        if row and execution:
            registrar_uso(conn,recurso,'entrada',execution)


def sha256_stream(stream) -> str:
    h = sha256()
    for part in iter(lambda: stream.read(1024 * 1024), b''):
        h.update(part)
    return h.hexdigest()


def referencias(params: dict) -> list[str]:
    keys = {'camada_id','camada_id_1','camada_id_2','camada_ref_id','raster_id','raster_ids',
            'camada_ids','camada_mascara_id','camada_zona_id','camada_pontos_id','camada_poligono_id','entrada'}
    return list(dict.fromkeys(str(x) for key, value in params.items() if key in keys
                             for x in (value if isinstance(value,list) else [value]) if x))


def iniciar(operacao: str, parametros: dict, responsavel: str | None = None) -> str:
    from api.repositories.camada_geoespacial_repository import _jsonb
    ident = str(uuid4())
    snapshots = []
    with get_connection() as conn:
        for ref in referencias(parametros):
            if ref.startswith('storage:'):
                # Camada lida direto do storage (SFTPGo): não há registro nem
                # arquivo de resultado no banco para travar ou conferir.
                snapshots.append({'recurso_id': ref, 'origem': 'storage'})
                continue
            row = conn.execute('''SELECT a.id,a.sha256,a.caminho FROM geoprocessamento.arquivo_resultado a
                JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
                WHERE c.recurso_sessao_id=%s FOR UPDATE OF a''', (ref,)).fetchone()
            registrar_uso(conn, ref, 'entrada', ident)
            if row:
                from api.services import saidas_storage
                if row['caminho'].startswith(saidas_storage.RAIZ + '/'):
                    saidas_storage.conferir(row['caminho'], row['sha256'])
                elif not project_path(row['caminho']).is_file() or digest(project_path(row['caminho'])) != row['sha256']:
                    raise ValueError('Uma entrada está sem arquivo íntegro. Concilie antes de executar.')
            snapshots.append({'recurso_id':ref,'arquivo_id':str(row['id']) if row else None,
                              'sha256':row['sha256'] if row else None})
            if not row:
                source = conn.execute('''SELECT id,crs,hash_arquivo AS hash,metadados,'importadas' AS categoria
                    FROM geoprocessamento.camada_importada WHERE recurso_sessao_id=%s
                    UNION ALL SELECT id,crs,NULL,metadados,'processadas'
                    FROM geoprocessamento.camada_processada WHERE recurso_sessao_id=%s''',(ref,ref)).fetchone()
                if source:
                    snapshots[-1].update(camada_id=str(source['id']),crs=source['crs'],
                        hash_origem=source['hash'],categoria=source['categoria'],metadados=source['metadados'])
        conn.execute('''INSERT INTO geoprocessamento.execucao_arquivo(id,operacao,responsavel,parametros,entradas,status)
            VALUES (%s,%s,%s,%s,%s,'executando')''', (ident,operacao,responsavel,_jsonb(parametros),_jsonb(snapshots)))
    return ident


def finalizar(ident: str, erro: str | None = None, temporario: bool = False) -> None:
    with get_connection() as conn:
        conn.execute('''UPDATE geoprocessamento.execucao_arquivo SET status=%s,erro=%s,finalizado_em=now()
            WHERE id=%s''', ('erro' if erro else 'concluido', erro, ident))
        if not erro and not temporario:
            conn.execute("UPDATE geoprocessamento.arquivo_resultado SET estado='resultado' WHERE execucao_id=%s AND estado='temporario'",(ident,))


def validar_vetor(path: Path | BytesIO, frame: gpd.GeoDataFrame) -> dict:
    # GeoPandas usa o GDAL instalado via pyogrio. Reabre o arquivo gravado.
    loaded = gpd.read_file(path, engine='pyogrio')
    if len(loaded) != len(frame) or loaded.crs != frame.crs:
        raise ValueError('A exportação alterou a contagem de feições ou o CRS.')
    if set(loaded.columns) != set(frame.columns):
        raise ValueError('A exportação alterou os campos da camada.')
    for a,b in zip(frame.geometry,loaded.geometry):
        if a is None and b is None:
            continue
        if a is None or b is None or not a.equals_exact(b, 1e-10):
            raise ValueError('A exportação alterou uma geometria.')
    # Compara atributos normalizados; datas podem ser serializadas pelo GDAL.
    from api.repositories.camada_geoespacial_repository import _json_safe
    for name in frame.columns:
        if name != frame.geometry.name:
            left = [_json_safe(x) for x in frame[name]]
            right = [_json_safe(x) for x in loaded[name]]
            if left != right:
                raise ValueError(f'A exportação alterou os atributos do campo {name}.')
    return {'feicoes':len(frame),'crs':str(frame.crs),'reaberto_gdal':True,'conteudo_conferido':True}


def apelido(nome: str | None, limite: int = 60) -> str:
    """Reduz o nome da camada a algo seguro para nome de pasta ou de arquivo."""
    texto = unicodedata.normalize('NFKD', str(nome or '')).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Za-z0-9]+', '_', texto).strip('_').lower()[:limite].strip('_')


def pasta_de_saida(nome: str | None, referencia: str) -> Path:
    """Cria a pasta da saida com o nome da camada, nao com o UUID da execucao.

    Quem abre outputs/ le o que cada pasta contem. O sufixo curto vem do
    identificador da execucao e so existe para separar execucoes homonimas;
    se ainda assim colidir, entra um contador.
    """
    base = apelido(nome, 48) or 'saida'
    curto = re.sub(r'[^0-9a-f]', '', str(referencia).lower())[:8] or uuid4().hex[:8]
    raiz = project_path('tmp/saidas-trabalho')
    alvo = raiz / f'{base}_{curto}'
    conta = 1
    while alvo.exists():
        conta += 1
        alvo = raiz / f'{base}_{curto}_{conta}'
    alvo.mkdir(parents=True)
    return alvo


def _nome_de_arquivo(pasta: Path, nome: str | None, extensao: str) -> Path:
    """Arquivo com o nome da camada dentro da pasta; contador se houver homonimo."""
    base = apelido(nome) or 'saida'
    alvo = pasta / f'{base}{extensao}'
    conta = 1
    while alvo.exists():
        conta += 1
        alvo = pasta / f'{base}_{conta}{extensao}'
    return alvo


def gravar(conn, camada_id: str, metadata: dict, *, frame=None, raster_bytes=None,
           regularizacao: bool = False, responsavel: str | None = None,
           execucao_id: str | None = None, caminho_destino: str | None = None) -> dict:
    """Usa a transação do chamador. Arquivo único; nunca sobrescreve outra saída."""
    existing = conn.execute('SELECT * FROM geoprocessamento.arquivo_resultado WHERE camada_id=%s FOR UPDATE',(camada_id,)).fetchone()
    from api.services import saidas_storage
    if existing and existing['caminho'].startswith(saidas_storage.RAIZ + '/'):
        if existing['estado']=='removido':
            raise ValueError('Arquivo retirado pela retenção.')
        saidas_storage.conferir(existing['caminho'], existing['sha256'])
        return dict(existing)
    if existing and not regularizacao:
        raise ValueError('Migre a saída legada para o storage antes de reutilizá-la.')
    execution = str(existing['execucao_id']) if existing else (execucao_id or execucao_atual.get())
    if execution is None:
        execution = str(uuid4())
        conn.execute('''INSERT INTO geoprocessamento.execucao_arquivo(id,operacao,status,finalizado_em,responsavel,parametros)
            VALUES (%s,%s,%s,now(),%s,%s)''',(execution,'regularizacao_legado' if regularizacao else metadata.get('origem','registro_direto'),
                                    'regularizacao' if regularizacao else 'concluido',responsavel,
                                    Jsonb({'linhagem_original':metadata.get('linhagem'), 'regularizacao':regularizacao,
                                           'nome_saida':metadata.get('nome')})))
    # ident e a chave primaria de arquivo_resultado, tem de continuar UUID.
    # O nome do arquivo em disco e outra coisa: leva o nome da camada.
    ident = str(existing['id']) if existing else str(uuid4())
    pasta = None if sem_montagem() else Path(mkdtemp(prefix='sicard-saida-'))
    extension = '.gpkg' if frame is not None else '.tif'
    path = (_nome_de_arquivo(pasta, metadata.get('nome'), extension) if pasta is not None else
            Path((apelido(metadata.get('nome')) or 'saida') + extension))
    content = None
    remote_path = None
    try:
        if frame is not None:
            # Nome de geometria padronizado só no arquivo, sem mudar o objeto de entrada.
            data=frame.copy()
            if data.geometry.name != 'geometry':
                data=data.rename_geometry('geometry')
            from api.repositories.camada_geoespacial_repository import _json_safe
            json_fields = []
            for column in data.columns:
                if column == data.geometry.name:
                    continue
                values = [_json_safe(v) for v in data[column]]
                if any(isinstance(v, (dict,list)) for v in values):
                    data[column] = [json.dumps(v, ensure_ascii=False, allow_nan=False) for v in values]
                    json_fields.append(column)
                elif any(hasattr(v, 'isoformat') for v in data[column]):
                    data[column] = values
            fid = 'slt_fid_' + uuid4().hex
            geometry_column = 'slt_geom_' + uuid4().hex
            output = BytesIO() if pasta is None else path
            data.to_file(output,driver='GPKG',layer='resultado',engine='pyogrio',index=False,
                         promote_to_multi=False, layer_options={'FID':fid,'GEOMETRY_NAME':geometry_column})
            if isinstance(output, BytesIO):
                content = output.getvalue()
            validation=validar_vetor(BytesIO(content) if content is not None else path,data)
            validation['campos_json'] = json_fields
            format_name='GPKG'
        else:
            if raster_bytes is None:
                raise ValueError('Informe o conteúdo GeoTIFF para gravar o resultado raster.')
            if pasta is None:
                content = bytes(raster_bytes)
            else:
                with path.open('xb') as output:
                    output.write(raster_bytes)
            with rasterio.open(BytesIO(content) if content is not None else path) as raster:
                # Lê todos os blocos para detectar arquivo truncado sem carregar tudo na RAM.
                for _, window in raster.block_windows(1):
                    raster.read(window=window)
                validation={'largura':raster.width,'altura':raster.height,'bandas':raster.count,
                            'crs':str(raster.crs),'reaberto_gdal':True}
            if content is None and path.read_bytes()!=bytes(raster_bytes):
                raise ValueError('O GeoTIFF exportado difere do conteúdo original.')
            format_name='GTiff'
        if content is not None:
            from api.services.arquivos_geoespaciais_memoria import trabalho
            checksum = sha256(content).hexdigest()
            size = len(content)
            destino = caminho_destino or saidas_storage.destino(
                execution, 'camadas', path.name, pasta=saidas_storage.pasta_execucao(execution, conn=conn))
            with trabalho({path.name: content}):
                uploaded = saidas_storage.enviar_bytes(execution, 'camadas', path.name, content, caminho=destino)
                remote_path = uploaded['caminho']
        else:
            checksum = digest(path)
            size = path.stat().st_size
            destino = caminho_destino or saidas_storage.destino(
                execution, 'camadas', path.name, pasta=saidas_storage.pasta_execucao(execution, conn=conn))
            uploaded = saidas_storage.enviar_arquivo(execution, 'camadas', path, caminho=destino)
        relative = remote_path = uploaded['caminho']
        state='temporario' if execucao_atual.get() else 'resultado'
        conn.execute('''INSERT INTO geoprocessamento.arquivo_resultado
            (id,camada_id,execucao_id,caminho,sha256,tamanho_bytes,formato,validacao,estado)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (camada_id) DO UPDATE SET caminho=EXCLUDED.caminho,
                sha256=EXCLUDED.sha256,tamanho_bytes=EXCLUDED.tamanho_bytes,
                formato=EXCLUDED.formato,validacao=EXCLUDED.validacao''',
            (ident,camada_id,execution,relative,checksum,size,format_name,Jsonb(validation),state))
        updated={**metadata,'caminho_arquivo':relative,'arquivo_resultado_id':ident,'execucao_id':execution,
                 'sha256':checksum,'origem_armazenamento':'storage'}
        updated['campos_json_arquivo'] = validation.get('campos_json', [])
        updated['metadados']={**(updated.get('metadados') or {}),'caminho_arquivo':relative}
        updated['metadados']['campos_json_arquivo'] = updated['campos_json_arquivo']
        updated['metadados']['arquivo_resultado_id'] = ident
        updated['metadados']['execucao_id'] = execution
        from api.repositories.camada_geoespacial_repository import _jsonb
        conn.execute('UPDATE geoprocessamento.camada_processada SET metadados=%s,storage_caminho=%s,formato=%s WHERE id=%s',(_jsonb(updated),relative,format_name,camada_id))
        metadata.update(updated)
        return {'id':ident,'caminho':relative,'sha256':checksum,'execucao_id':execution,'estado':state}
    except Exception:
        if remote_path:
            saidas_storage.remover(remote_path)
        raise
    finally:
        if pasta is not None:
            path.unlink(missing_ok=True)
            pasta.rmdir()


def gravar_e_confirmar(conn, camada_id, metadata, **kwargs):
    """Confirma registro após validação; não apaga arquivo em commit ambíguo.

    Em falha de conexão durante COMMIT, o banco pode já ter confirmado. O UUID
    permanece para conciliação, evitando excluir um arquivo com registro válido.
    """
    result = gravar(conn, camada_id, metadata, **kwargs)
    conn.commit()
    return result


def regularizar(recurso_id: str, responsavel: str | None = None) -> dict:
    # Conexão dedicada evita commits implícitos do carregador durante o bloqueio.
    from api.config import get_settings
    import psycopg
    from psycopg.rows import dict_row
    with psycopg.connect(get_settings().slt_database_url,row_factory=dict_row,connect_timeout=5) as conn:
        row=conn.execute('SELECT * FROM geoprocessamento.camada_processada WHERE recurso_sessao_id=%s FOR UPDATE',(recurso_id,)).fetchone()
        if not row:
            raise ValueError('Camada processada não encontrada.')
        if row.get('storage_caminho'):
            from api.services.saidas_storage import conferir
            item = conn.execute('SELECT * FROM geoprocessamento.arquivo_resultado WHERE camada_id=%s',(row['id'],)).fetchone()
            conferir(item['caminho'],item['sha256'])
            return dict(item)
        row['metadados'] = {**(row['metadados'] or {}), 'nome':row['nome']}
        if row['tipo']=='vetor':
            features = conn.execute('''SELECT propriedades,ST_AsEWKB(geom) AS geometria
                FROM geoprocessamento.camada_processada_feicao WHERE camada_id=%s ORDER BY ordem''',(row['id'],)).fetchall()
            geometry = gpd.GeoSeries.from_wkb([bytes(f['geometria']) if f['geometria'] else None for f in features],crs=4674)
            frame = gpd.GeoDataFrame([f['propriedades'] for f in features],geometry=geometry,crs=4674)
            result=gravar_e_confirmar(conn,str(row['id']),row['metadados'] or {},frame=frame,regularizacao=True,responsavel=responsavel)
        else:
            data=conn.execute('SELECT dados_geotiff FROM geoprocessamento.camada_processada_raster WHERE camada_id=%s',(row['id'],)).fetchone()
            if data is None: raise ValueError('Conteúdo raster ausente.')
            result=gravar_e_confirmar(conn,str(row['id']),row['metadados'] or {},raster_bytes=bytes(data['dados_geotiff']),regularizacao=True,responsavel=responsavel)
    return result


def registrar_uso(conn, recurso_id: str, tipo: str, referencia: str) -> None:
    row = conn.execute('''SELECT a.id,a.estado FROM geoprocessamento.arquivo_resultado a
        JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
        WHERE c.recurso_sessao_id=%s FOR UPDATE OF a''', (recurso_id,)).fetchone()
    if row:
        if row['estado'] == 'removido':
            raise ValueError('O arquivo desta camada foi removido pela retenção.')
        conn.execute('''INSERT INTO geoprocessamento.arquivo_resultado_uso VALUES (%s,%s,%s)
            ON CONFLICT DO NOTHING''', (row['id'],tipo,referencia))


def publicar(recurso_id: str, responsavel: str) -> dict:
    with get_connection() as conn:
        row=conn.execute('''SELECT a.* FROM geoprocessamento.arquivo_resultado a
            JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
            JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id
            WHERE c.recurso_sessao_id=%s AND e.status IN ('concluido','regularizacao') FOR UPDATE OF a''',(recurso_id,)).fetchone()
        if not row or row['estado'] not in {'resultado','acervo'}:
            raise ValueError('Somente um resultado concluído pode ser publicado.')
        from api.services.saidas_storage import conferir
        conferir(row['caminho'],row['sha256'])
        conn.execute("UPDATE geoprocessamento.arquivo_resultado SET estado='acervo',publicado_em=COALESCE(publicado_em,now()),publicado_por=COALESCE(publicado_por,%s) WHERE id=%s",(responsavel,row['id']))
        return {'arquivo':row['caminho'],'estado':'acervo'}


def listar() -> list[dict]:
    with get_connection() as conn:
        return [dict(r) for r in conn.execute('''SELECT a.*,c.recurso_sessao_id,e.status AS status_execucao
            FROM geoprocessamento.arquivo_resultado a JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
            JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id''').fetchall()]


def politica(dias=None, responsavel=None, salvar=False):
    if salvar and dias is not None and (isinstance(dias,bool) or not isinstance(dias,int) or not 1<=dias<=3650):
        raise ValueError('Prazo deve ser inteiro entre 1 e 3650 dias, ou vazio para desativar.')
    with get_connection() as conn:
        if salvar:
            conn.execute('UPDATE geoprocessamento.politica_retencao_arquivo SET dias_temporarios=%s,atualizado_por=%s,atualizado_em=now() WHERE id=true',(dias,responsavel))
        return dict(conn.execute('SELECT * FROM geoprocessamento.politica_retencao_arquivo WHERE id=true').fetchone())


def limpar(responsavel: str, executar=False) -> dict:
    """Retenção só de arquivos temporários concluídos, sem nenhuma referência de uso."""
    removed=[]
    with get_connection() as conn:
        rows=conn.execute('''SELECT a.* FROM geoprocessamento.arquivo_resultado a
            JOIN geoprocessamento.execucao_arquivo e ON e.id=a.execucao_id
            CROSS JOIN geoprocessamento.politica_retencao_arquivo p
            WHERE a.estado='temporario' AND e.status IN ('concluido','erro')
              AND p.dias_temporarios IS NOT NULL AND e.finalizado_em < now()-p.dias_temporarios*interval '1 day'
              AND NOT EXISTS (SELECT 1 FROM geoprocessamento.arquivo_resultado_uso u WHERE u.arquivo_id=a.id)
            FOR UPDATE OF a''').fetchall()
        for row in rows:
            # A consulta inicial pode ter aguardado um bloqueio enquanto outra
            # transação registrava uso. Reconsulta com snapshot novo sob o lock.
            protected = conn.execute('''SELECT 1 FROM geoprocessamento.arquivo_resultado_uso
                WHERE arquivo_id=%s LIMIT 1''',(row['id'],)).fetchone()
            if protected:
                continue
            from api.services import saidas_storage
            saidas_storage.validar(row['caminho'])
            try:
                saidas_storage.conferir(row['caminho'],row['sha256'])
            except ValueError:
                continue
            if executar:
                saidas_storage.remover(row['caminho'])
                conn.execute("UPDATE geoprocessamento.arquivo_resultado SET estado='removido',removido_em=now(),removido_por=%s WHERE id=%s",(responsavel,row['id']))
            removed.append(row['caminho'])
    return {'executado':executar,'arquivos':removed,'quantidade':len(removed)}
