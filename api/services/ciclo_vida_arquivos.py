"""Arquivo validado + registro transacional para cada saída de geoprocesso."""
from __future__ import annotations

from contextvars import ContextVar
import json
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

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
    path = project_path(f'data/geoespacial/outputs/exportacoes/{uuid4()}/{validated.name}')
    path.parent.mkdir(parents=True, exist_ok=False)
    return path


def registrar_exportacao(path: Path, recurso: str, tipo: str) -> dict:
    if tipo == 'vetor':
        frame = gpd.read_file(path, engine='pyogrio')
        validation = {'feicoes':len(frame), 'crs':str(frame.crs), 'reaberto_gdal':True}
    else:
        with rasterio.open(path) as raster:
            for _, window in raster.block_windows(1):
                raster.read(window=window)
            validation = {'largura':raster.width,'altura':raster.height,'reaberto_gdal':True}
    root = project_path('.').resolve()
    components = [{'caminho':p.relative_to(root).as_posix(),'sha256':digest(p),'bytes':p.stat().st_size}
                  for p in sorted(path.parent.iterdir()) if p.is_file()]
    execution = execucao_atual.get()
    own = execution is None
    if own:
        execution = iniciar('exportacao_direta', {'entrada':recurso})
    ident = str(uuid4())
    relative = path.relative_to(root).as_posix()
    with get_connection() as conn:
        conn.execute('''INSERT INTO geoprocessamento.arquivo_exportado
            (id,execucao_id,recurso_origem,caminho,componentes,validacao) VALUES (%s,%s,%s,%s,%s,%s)''',
            (ident,execution,recurso,relative,Jsonb(components),Jsonb(validation)))
        registrar_uso(conn,recurso,'entrada',str(execution))
    if own:
        finalizar(execution)
    return {'arquivo_exportado_id':ident,'execucao_id':execution}


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
            row = conn.execute('''SELECT a.id,a.sha256,a.caminho FROM geoprocessamento.arquivo_resultado a
                JOIN geoprocessamento.camada_processada c ON c.id=a.camada_id
                WHERE c.recurso_sessao_id=%s FOR UPDATE OF a''', (ref,)).fetchone()
            registrar_uso(conn, ref, 'entrada', ident)
            if row and (not project_path(row['caminho']).is_file() or digest(project_path(row['caminho'])) != row['sha256']):
                raise ValueError('Uma entrada está sem arquivo íntegro. Concilie antes de executar.')
            snapshots.append({'recurso_id':ref,'arquivo_id':str(row['id']) if row else None,
                              'sha256':row['sha256'] if row else None})
            if not row:
                source = conn.execute('''SELECT id,crs,hash_arquivo AS hash,metadados,'importadas' AS categoria
                    FROM geoprocessamento.camada_importada WHERE recurso_sessao_id=%s
                    UNION ALL SELECT id,crs,hash_conteudo AS hash,metadados,'homologadas'
                    FROM geoprocessamento.camada_homologada WHERE recurso_sessao_id=%s
                    UNION ALL SELECT id,crs,NULL,metadados,'processadas'
                    FROM geoprocessamento.camada_processada WHERE recurso_sessao_id=%s''',(ref,ref,ref)).fetchone()
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


def validar_vetor(path: Path, frame: gpd.GeoDataFrame) -> dict:
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


def gravar(conn, camada_id: str, metadata: dict, *, frame=None, raster_bytes=None,
           regularizacao: bool = False, responsavel: str | None = None) -> dict:
    """Usa a transação do chamador. Arquivo único; nunca sobrescreve outra saída."""
    existing = conn.execute('SELECT * FROM geoprocessamento.arquivo_resultado WHERE camada_id=%s FOR UPDATE',(camada_id,)).fetchone()
    if existing:
        path = project_path(existing['caminho'])
        if existing['estado']=='removido' or not path.is_file() or digest(path)!=existing['sha256']:
            raise ValueError('Arquivo já registrado está ausente, removido ou divergente; concilie antes de continuar.')
        return dict(existing)
    execution = execucao_atual.get()
    if execution is None:
        execution = str(uuid4())
        conn.execute('''INSERT INTO geoprocessamento.execucao_arquivo(id,operacao,status,finalizado_em,responsavel,parametros)
            VALUES (%s,%s,%s,now(),%s,%s)''',(execution,'regularizacao_legado' if regularizacao else metadata.get('origem','registro_direto'),
                                    'regularizacao' if regularizacao else 'concluido',responsavel,
                                    Jsonb({'linhagem_original':metadata.get('linhagem'), 'regularizacao':regularizacao})))
    ident = str(uuid4())
    relative = f'data/geoespacial/outputs/{execution}/{ident}' + ('.gpkg' if frame is not None else '.tif')
    path = project_path(relative)
    path.parent.mkdir(parents=True,exist_ok=True)
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
            data.to_file(path,driver='GPKG',layer='resultado',engine='pyogrio',index=False,
                         promote_to_multi=False, layer_options={'FID':fid,'GEOMETRY_NAME':geometry_column})
            validation=validar_vetor(path,data)
            validation['campos_json'] = json_fields
            format_name='GPKG'
        else:
            with path.open('xb') as output:
                output.write(raster_bytes)
            with rasterio.open(path) as raster:
                # Lê todos os blocos para detectar arquivo truncado sem carregar tudo na RAM.
                for _, window in raster.block_windows(1):
                    raster.read(window=window)
                validation={'largura':raster.width,'altura':raster.height,'bandas':raster.count,
                            'crs':str(raster.crs),'reaberto_gdal':True}
            if path.read_bytes()!=bytes(raster_bytes):
                raise ValueError('O GeoTIFF exportado difere do conteúdo original.')
            format_name='GTiff'
        checksum=digest(path)
        state='temporario' if execucao_atual.get() else 'resultado'
        conn.execute('''INSERT INTO geoprocessamento.arquivo_resultado
            (id,camada_id,execucao_id,caminho,sha256,tamanho_bytes,formato,validacao,estado)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
            (ident,camada_id,execution,relative,checksum,path.stat().st_size,format_name,Jsonb(validation),state))
        updated={**metadata,'caminho_arquivo':relative,'arquivo_resultado_id':ident,'execucao_id':execution}
        updated['campos_json_arquivo'] = validation.get('campos_json', [])
        updated['metadados']={**(updated.get('metadados') or {}),'caminho_arquivo':relative}
        updated['metadados']['campos_json_arquivo'] = updated['campos_json_arquivo']
        updated['metadados']['arquivo_resultado_id'] = ident
        updated['metadados']['execucao_id'] = execution
        from api.repositories.camada_geoespacial_repository import _jsonb
        conn.execute('UPDATE geoprocessamento.camada_processada SET metadados=%s WHERE id=%s',(_jsonb(updated),camada_id))
        metadata.update(updated)
        return {'id':ident,'caminho':relative,'sha256':checksum,'execucao_id':execution,'estado':state}
    except Exception:
        # Apenas o arquivo UUID criado por esta chamada; nenhum diretório é apagado.
        path.unlink(missing_ok=True)
        raise


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
        path=project_path(row['caminho'])
        if not path.is_file() or digest(path)!=row['sha256']:
            raise ValueError('Arquivo ausente ou com integridade divergente.')
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
            path=project_path(row['caminho']).resolve()
            if not path.is_relative_to(project_path('data/geoespacial/outputs').resolve()):
                raise ValueError('Caminho de limpeza fora do storage de resultados.')
            if path.exists() and digest(path)!=row['sha256']:
                continue
            if executar:
                path.unlink(missing_ok=True)
                conn.execute("UPDATE geoprocessamento.arquivo_resultado SET estado='removido',removido_em=now(),removido_por=%s WHERE id=%s",(responsavel,row['id']))
            removed.append(row['caminho'])
    return {'executado':executar,'arquivos':removed,'quantidade':len(removed)}
