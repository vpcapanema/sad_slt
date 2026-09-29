"""Substituição do arquivo original via SFTPGo, sem criar camada ou backup."""
import json
import math
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory
import time
from uuid import uuid4

from osgeo import gdal, ogr, osr

from api.services import storage_geoespacial as storage
from api.services import storage_remoto as remoto


def gravar(source, frame, data, incluir_geojson=True):
    from api.services.bancada_arquivos import abrir
    caminho, camada = storage.separar_id(source['id'])
    original = storage.resolver(caminho)
    if original.suffix.lower() not in storage.EXTENSOES_VETOR:
        raise ValueError('Abra o arquivo vetorial descompactado para editar o original.')
    with TemporaryDirectory(prefix='sicard-edicao-') as directory:
        target = Path(directory) / original.name
        ds = gdal.OpenEx(str(original), gdal.OF_VECTOR | gdal.OF_READONLY)
        layer = ds.GetLayerByName(camada) if camada else ds.GetLayer(0)
        layer_name, driver, fid_column = layer.GetName(), ds.GetDriver().ShortName, layer.GetFIDColumn()
        if ds.GetLayerCount() > 1 and driver != 'GPKG':
            raise ValueError('Edição de arquivos multicamada requer GeoPackage.')
        ds = None
        # Em GeoPackage, mantém as outras camadas do mesmo arquivo.
        if driver == 'GPKG':
            target.write_bytes(original.read_bytes())
            if fid_column:
                frame = frame.copy()
                used = [int(f['id']) for f in source['geojson']['features'] if str(f['id']).isdigit()]
                next_id = max(used, default=0) + 1
                ids = []
                for feature in data['features']:
                    value = str(feature['id'])
                    if value.isdigit():
                        ids.append(int(value))
                    else:
                        ids.append(next_id)
                        next_id += 1
                frame.index = ids
                frame.index.name = fid_column
        frame.to_file(target, driver=driver, layer=layer_name, engine='pyogrio',
                      index=bool(fid_column and driver == 'GPKG'),
                      **({'FID': fid_column} if fid_column and driver == 'GPKG' else {}))
        # Nunca começa a sobrescrever se a revisão já ficou desatualizada.
        abrir(source['arquivo'], source['revisao'], source['id'])
        for part in Path(directory).iterdir():
            destino = str(PurePosixPath(caminho).with_name(part.name))
            remoto.enviar(destino, part)
        if original.suffix.lower() == '.shp':
            # Índices espaciais antigos apontam para posições anteriores à exclusão.
            for extension in ('.qix', '.sbn', '.sbx'):
                if original.with_suffix(extension).exists():
                    remoto.apagar_arquivo(str(PurePosixPath(caminho).with_suffix(extension)))
        # A montagem FUSE local mantém metadados por até 5 segundos.
        # Na VM o bind mount vê a alteração imediatamente.
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            # Reabre o arquivo na origem: sem montagem, os metadados só mudam
            # quando o storage é consultado de novo.
            state = storage.resolver(caminho).stat()
            if f'{state.st_mtime_ns}-{state.st_size}' != source['revisao']:
                if incluir_geojson:
                    refreshed = storage.ler_para_mapa(source['id'])
                else:
                    from api.services.bancada_camada_original import preparar

                    refreshed = preparar(source['id'], caminho)
                final = storage.resolver(caminho).stat()
                if refreshed['revisao'] == f'{final.st_mtime_ns}-{final.st_size}':
                    return refreshed
            time.sleep(.2)
        raise RuntimeError('Arquivo gravado no storage. Reabra a camada para atualizar a sessão.')


# ---------------------------------------------------------------------------
# Edição incremental de atributos (sessão de arquivo nativo do storage).
#
# Diferente de `gravar`, não recebe a coleção inteira: aplica somente as
# alterações indexadas pelo FID original sobre uma cópia do próprio arquivo,
# confere a integridade da cópia e só então a publica no mesmo caminho.
# ---------------------------------------------------------------------------
DRIVERS_INCREMENTAIS = {'.gpkg': 'GPKG', '.shp': 'ESRI Shapefile', '.geojson': 'GeoJSON', '.json': 'GeoJSON'}
# .shp por último: é ele que define a revisão da sessão.
PARTES_SHAPEFILE = ('.dbf', '.shx', '.cpg', '.prj', '.shp')
INDICES_SHAPEFILE = ('.qix', '.sbn', '.sbx')
REVISAO_OBSOLETA = 'O arquivo mudou desde a abertura. Reabra antes de salvar ou executar.'
LIMITE_INT32 = (-2 ** 31, 2 ** 31 - 1)
PERFIS_EDICAO = frozenset({'OPERADOR', 'ANALISTA', 'GESTOR', 'ADMIN'})


def _revisao(caminho):
    estado = storage.resolver(caminho).stat()
    return f'{estado.st_mtime_ns}-{estado.st_size}'


def _fid(valor):
    texto = str(valor).strip()
    if not texto.isdigit():
        raise ValueError(f'FID inválido: {valor!r}. Use o FID original da feição.')
    return int(texto)


def _valor(defn, valor):
    """Valor da requisição no tipo do campo OGR, sem conversões silenciosas."""
    nome, tipo, subtipo = defn.GetName(), defn.GetType(), defn.GetSubType()
    if valor is None:
        if not defn.IsNullable():
            raise ValueError(f'O campo {nome} não aceita valor nulo.')
        return None
    if subtipo == ogr.OFSTBoolean:
        if not isinstance(valor, bool):
            raise ValueError(f'O campo {nome} exige um valor booleano.')
        return int(valor)
    if subtipo == ogr.OFSTJSON or (tipo == ogr.OFTString and isinstance(valor, (dict, list))):
        valor = valor if isinstance(valor, str) else json.dumps(valor, ensure_ascii=False, allow_nan=False)
    if tipo in (ogr.OFTInteger, ogr.OFTInteger64):
        if not isinstance(valor, int) or isinstance(valor, bool):
            raise ValueError(f'O campo {nome} exige um número inteiro.')
        if tipo == ogr.OFTInteger and not LIMITE_INT32[0] <= valor <= LIMITE_INT32[1]:
            raise ValueError(f'O valor do campo {nome} excede o limite de inteiro de 32 bits.')
        return valor
    if tipo == ogr.OFTReal:
        if not isinstance(valor, (int, float)) or isinstance(valor, bool) or not math.isfinite(valor):
            raise ValueError(f'O campo {nome} exige um número finito.')
        return float(valor)
    if tipo in (ogr.OFTString, ogr.OFTDate, ogr.OFTDateTime, ogr.OFTTime):
        if not isinstance(valor, str):
            raise ValueError(f'O campo {nome} exige texto.')
        if tipo == ogr.OFTString and defn.GetWidth() and len(valor) > defn.GetWidth():
            # Shapefile trunca em silêncio: recusar antes de gravar.
            raise ValueError(f'O campo {nome} aceita no máximo {defn.GetWidth()} caracteres.')
        return valor
    raise ValueError(f'O campo {nome} ({defn.GetFieldTypeName(tipo)}) não pode ser editado pela bancada.')


def _normalizado(feature, defn, indice):
    """Valor gravado no formato que a sessão recebe do GeoJSON de abertura."""
    if not feature.IsFieldSetAndNotNull(indice):
        return None
    campo = defn.GetFieldDefn(indice)
    tipo, subtipo = campo.GetType(), campo.GetSubType()
    if subtipo == ogr.OFSTBoolean:
        return bool(feature.GetFieldAsInteger(indice))
    if subtipo == ogr.OFSTJSON:
        return json.loads(feature.GetFieldAsString(indice))
    if tipo == ogr.OFTDate:
        ano, mes, dia, *_ = feature.GetFieldAsDateTime(indice)
        return f'{ano:04d}-{mes:02d}-{dia:02d}'
    if tipo == ogr.OFTDateTime:
        return feature.GetFieldAsISO8601DateTime(indice)
    if tipo == ogr.OFTInteger64:
        return feature.GetFieldAsInteger64(indice)
    return feature.GetField(indice)


def _feicao(layer, fid):
    try:
        return layer.GetFeature(fid)
    except RuntimeError:
        return None


def _inventario(ds):
    result = {}
    for indice in range(ds.GetLayerCount()):
        layer = ds.GetLayer(indice)
        srs = layer.GetSpatialRef()
        result[layer.GetName()] = (layer.GetFeatureCount(), srs.ExportToWkt() if srs else '')
    return result


def _validar_pedido(edicoes, excluidos, permitir_vazio=False):
    if isinstance(edicoes, dict):
        edicoes = [{'fid': fid, 'campos': campos} for fid, campos in edicoes.items()]
    pares = []
    for item in edicoes or []:
        if not isinstance(item, dict) or 'fid' not in item or not isinstance(item.get('campos') or {}, dict):
            raise ValueError('Cada edição deve ter o formato {"fid": ..., "campos": {...}}.')
        pares.append((_fid(item['fid']), dict(item.get('campos') or {})))
    if len({fid for fid, _ in pares}) != len(pares):
        raise ValueError('Há FIDs repetidos na lista de edições.')
    edicoes = dict(pares)
    excluidos = [_fid(fid) for fid in (excluidos or [])]
    if len(set(excluidos)) != len(excluidos):
        raise ValueError('Há FIDs repetidos na lista de exclusão.')
    if set(edicoes) & set(excluidos):
        raise ValueError('Uma feição não pode ser editada e excluída na mesma gravação.')
    if not any(edicoes.values()) and not excluidos and not permitir_vazio:
        raise ValueError('Nenhuma alteração de atributo ou exclusão foi informada.')
    for valores in edicoes.values():
        if {'geometry', 'geometria'} & set(valores):
            raise ValueError('A edição incremental altera apenas atributos; a geometria é preservada.')
    return {fid: valores for fid, valores in edicoes.items() if valores}, excluidos


def _baixar(caminho, original, pasta, driver):
    """Cópia de trabalho do arquivo (e acompanhantes do shapefile) em disco temporário."""
    alvo = pasta / original.name
    alvo.write_bytes(original.read_bytes())
    if driver != 'ESRI Shapefile':
        return alvo, [(alvo, caminho)]
    partes = []
    for sufixo in PARTES_SHAPEFILE:
        remoto_parte = str(PurePosixPath(caminho).with_suffix(sufixo))
        local = alvo.with_suffix(sufixo)
        if sufixo != '.shp':
            try:
                local.write_bytes(storage.resolver(remoto_parte).read_bytes())
            except FileNotFoundError:
                if sufixo in ('.dbf', '.shx'):
                    raise ValueError(f'O shapefile não possui o componente {sufixo}.')
                continue
        if sufixo in ('.dbf', '.shx', '.shp'):
            partes.append((local, remoto_parte))
    return alvo, partes


def _aplicar(ds, layer, driver, edicoes, excluidos):
    defn = layer.GetLayerDefn()
    esperado = []
    transacao = driver == 'GPKG'
    if transacao:
        layer.StartTransaction()
    try:
        for fid, valores in edicoes.items():
            feature = _feicao(layer, fid)
            if feature is None:
                raise ValueError(f'A feição FID {fid} não existe no arquivo original.')
            geometria = feature.GetGeometryRef()
            if geometria is None or geometria.IsEmpty():
                raise ValueError(f'A feição FID {fid} não possui geometria e não pertence à sessão.')
            for nome, valor in valores.items():
                indice = defn.GetFieldIndex(nome)
                if indice < 0 or defn.GetFieldDefn(indice).GetName() != nome:
                    raise ValueError(f'O campo {nome} não existe na camada original.')
                campo = defn.GetFieldDefn(indice)
                convertido = _valor(campo, valor)
                if convertido is None:
                    feature.SetFieldNull(indice)
                    continue
                try:
                    if campo.GetType() == ogr.OFTInteger64:
                        feature.SetFieldInteger64(indice, convertido)
                    else:
                        feature.SetField(indice, convertido)
                except RuntimeError as exc:
                    raise ValueError(f'Valor inválido para o campo {nome}: {exc}') from exc
                if not feature.IsFieldSetAndNotNull(indice):
                    raise ValueError(f'Valor inválido para o campo {nome}.')
            if layer.SetFeature(feature) != 0:
                raise RuntimeError(f'O GDAL recusou gravar a feição FID {fid}.')
            esperado.append((fid, geometria.ExportToIsoWkb(),
                             {nome: _normalizado(feature, defn, defn.GetFieldIndex(nome)) for nome in valores}))
        for fid in excluidos:
            feature = _feicao(layer, fid)
            if feature is None:
                raise ValueError(f'A feição FID {fid} não existe no arquivo original.')
            if layer.DeleteFeature(fid) != 0:
                raise RuntimeError(f'O GDAL recusou excluir a feição FID {fid}.')
        if transacao:
            layer.CommitTransaction()
    except Exception:
        if transacao:
            layer.RollbackTransaction()
        raise
    if excluidos and driver == 'ESRI Shapefile':
        # Remove fisicamente os registros marcados; reenumera os FIDs.
        ds.ExecuteSQL(f'REPACK {layer.GetName()}')
    return esperado


def _editar_copia(alvo, driver, camada, edicoes, excluidos):
    try:
        ds = gdal.OpenEx(str(alvo), gdal.OF_VECTOR | gdal.OF_UPDATE, allowed_drivers=[driver])
    except RuntimeError as exc:
        raise ValueError(f'O arquivo não pode ser aberto para edição ({driver}).') from exc
    try:
        if ds.GetLayerCount() > 1 and driver != 'GPKG':
            raise ValueError('Edição de arquivos multicamada requer GeoPackage.')
        layer = ds.GetLayerByName(camada) if camada else ds.GetLayer(0)
        if layer is None:
            raise FileNotFoundError('Camada não encontrada no arquivo.')
        if edicoes and not layer.TestCapability(ogr.OLCRandomWrite):
            raise ValueError('O formato do arquivo não permite atualizar feições.')
        if excluidos and not layer.TestCapability(ogr.OLCDeleteFeature):
            raise ValueError('O formato do arquivo não permite excluir feições.')
        nome_camada = layer.GetName()
        antes = _inventario(ds)
        if excluidos and antes[nome_camada][0] - len(excluidos) < 1:
            raise ValueError('A camada deve manter ao menos uma feição.')
        return nome_camada, antes, _aplicar(ds, layer, driver, edicoes, excluidos)
    finally:
        # Fecha mesmo com referências presas no traceback: grava a cópia e
        # libera os arquivos temporários (exigência do Windows).
        ds.Close()


def _conferir(alvo, nome_camada, antes, esperado, excluidos, driver):
    """Reabre a cópia e confere camadas, CRS, contagem, valores e geometrias."""
    try:
        ds = gdal.OpenEx(str(alvo), gdal.OF_VECTOR | gdal.OF_READONLY)
    except RuntimeError as exc:
        raise RuntimeError('A cópia editada não pôde ser reaberta; o original foi preservado.') from exc
    try:
        return _verificar(ds, nome_camada, antes, esperado, excluidos, driver)
    finally:
        ds.Close()


def _verificar(ds, nome_camada, antes, esperado, excluidos, driver, adicionados=0):
    depois = _inventario(ds)
    if set(depois) != set(antes):
        raise RuntimeError('A gravação alterou o conjunto de camadas; o original foi preservado.')
    for nome, (total, crs) in antes.items():
        novo_total, novo_crs = depois[nome]
        esperado_total = total - len(excluidos) + adicionados if nome == nome_camada else total
        if novo_total != esperado_total or novo_crs != crs:
            raise RuntimeError(f'Falha de integridade na camada {nome}; o original foi preservado.')
    if driver == 'GPKG':
        resultado = ds.ExecuteSQL('PRAGMA integrity_check')
        estado = resultado.GetNextFeature().GetField(0)
        ds.ReleaseResultSet(resultado)
        if estado != 'ok':
            raise RuntimeError('O GeoPackage editado falhou na verificação de integridade.')
    layer = ds.GetLayerByName(nome_camada)
    defn = layer.GetLayerDefn()
    estavel = driver == 'GPKG' or not excluidos
    if estavel:
        for fid in excluidos:
            if _feicao(layer, fid) is not None:
                raise RuntimeError(f'A feição FID {fid} não foi excluída.')
        for fid, wkb, valores in esperado:
            feature = _feicao(layer, fid)
            if feature is None or feature.GetGeometryRef().ExportToIsoWkb() != wkb or \
                    {n: _normalizado(feature, defn, defn.GetFieldIndex(n)) for n in valores} != valores:
                raise RuntimeError(f'A feição FID {fid} não foi gravada como esperado.')
    else:
        # Sem FID estável após a compactação: confere pelo par geometria + valores.
        pendentes = [(wkb, valores) for _, wkb, valores in esperado]
        layer.ResetReading()
        for feature in layer:
            if not pendentes:
                break
            geometria = feature.GetGeometryRef()
            wkb = geometria.ExportToIsoWkb() if geometria is not None else None
            for i, (alvo_wkb, valores) in enumerate(pendentes):
                if wkb == alvo_wkb and {n: _normalizado(feature, defn, defn.GetFieldIndex(n))
                                        for n in valores} == valores:
                    pendentes.pop(i)
                    break
        if pendentes:
            raise RuntimeError('Nem todas as edições foram encontradas na cópia gravada.')
    return estavel


def _publicar(caminho, revisao, partes):
    """Envia para nomes temporários e reverte substituições multipartes se uma falhar."""
    marca = uuid4().hex
    enviados = []
    backups = []
    locais_backup = []
    try:
        for local, destino in partes:
            temporario = f'{destino}.sicard-edicao-{marca}.tmp'
            enviados.append((temporario, destino))
            remoto.enviar(temporario, local)
        if len(partes) > 1:
            for _, destino in partes:
                local_backup = Path(partes[0][0]).parent / f'{Path(destino).name}.sicard-backup-{marca}'
                local_backup.write_bytes(storage.resolver(destino).read_bytes())
                remoto_backup = f'{destino}.sicard-backup-{marca}.tmp'
                locais_backup.append(local_backup)
                backups.append((remoto_backup, destino))
                remoto.enviar(remoto_backup, local_backup)
        # Última conferência antes de tocar no original.
        if _revisao(caminho) != revisao:
            raise ValueError(REVISAO_OBSOLETA)
    except Exception as exc:
        falhas_limpeza = []
        for temporario, _ in enviados:
            try:
                remoto.apagar_arquivo(temporario)
            except Exception as cleanup_exc:
                falhas_limpeza.append(f'{temporario}: {cleanup_exc}')
        for backup, _ in backups:
            try:
                remoto.apagar_arquivo(backup)
            except Exception as cleanup_exc:
                falhas_limpeza.append(f'{backup}: {cleanup_exc}')
        if falhas_limpeza:
            raise RuntimeError(f'{exc} Não foi possível remover temporários do storage: '
                               f'{", ".join(falhas_limpeza)}') from exc
        raise
    tentados = []
    for indice, (temporario, destino) in enumerate(enviados):
        tentados.append(destino)
        try:
            remoto.mover(temporario, destino)
        except Exception as exc:
            falhas_restauracao = []
            for backup, alvo in reversed(backups):
                if alvo not in tentados:
                    try:
                        remoto.apagar_arquivo(backup)
                    except Exception as cleanup_exc:
                        falhas_restauracao.append(f'{backup}: {cleanup_exc}')
                    continue
                try:
                    remoto.mover(backup, alvo)
                except Exception as restore_exc:
                    falhas_restauracao.append(f'{alvo}: {restore_exc}')
            for resto, _ in enviados[indice:]:
                try:
                    remoto.apagar_arquivo(resto)
                except Exception as cleanup_exc:
                    falhas_restauracao.append(f'{resto}: {cleanup_exc}')
            if falhas_restauracao:
                raise RuntimeError('A gravação falhou durante a publicação e a restauração '
                                   f'não foi completa. Verifique o storage: {", ".join(falhas_restauracao)}. '
                                   f'{exc}') from exc
            if indice == 0:
                raise RuntimeError(f'O storage não aceitou a substituição; o original foi preservado. {exc}') from exc
            raise RuntimeError('A gravação foi revertida após uma falha ao substituir '
                               f'{PurePosixPath(destino).name}. Reabra o arquivo antes de nova edição. {exc}') from exc
    falhas_limpeza = []
    for backup, _ in backups:
        try:
            remoto.apagar_arquivo(backup)
        except Exception as exc:
            falhas_limpeza.append(f'{backup}: {exc}')
    if falhas_limpeza:
        raise RuntimeError('Os arquivos foram publicados, mas não foi possível remover os '
                           f'backups temporários: {", ".join(falhas_limpeza)}')
    for local in locais_backup:
        local.unlink(missing_ok=True)


def _aguardar_revisao(caminho, anterior):
    # A montagem FUSE local mantém metadados por até 5 segundos.
    limite = time.monotonic() + 8
    while time.monotonic() < limite:
        atual = _revisao(caminho)
        if atual != anterior:
            return atual
        time.sleep(.2)
    raise RuntimeError('Arquivo gravado no storage. Reabra a camada para atualizar a sessão.')


def gravar_incremental(ident, revisao, edicoes, excluidos, user):
    """Aplica edições de atributos e exclusões por FID no arquivo nativo do storage.

    Nunca converte a camada inteira em GeoJSON: lê e grava só as feições
    envolvidas numa cópia do próprio arquivo, preservando CRS, geometrias e as
    demais camadas de um GeoPackage.
    """
    perfil = str(getattr(user, 'tipo_usuario', '') or '').strip().upper()
    if perfil not in PERFIS_EDICAO:
        raise PermissionError('Seu perfil não permite editar arquivos do storage.')
    edicoes, excluidos = _validar_pedido(edicoes, excluidos)
    caminho, camada = storage.separar_id(ident)
    original = storage.resolver(caminho)
    driver = DRIVERS_INCREMENTAIS.get(original.suffix.lower())
    if driver is None:
        raise ValueError('Edição incremental disponível apenas para GeoPackage, Shapefile e GeoJSON '
                         'nativos do storage. Pacotes compactados, FlatGeobuf e KML não são editáveis.')
    if _revisao(caminho) != revisao:
        raise ValueError(REVISAO_OBSOLETA)
    with TemporaryDirectory(prefix='sicard-edicao-') as pasta, \
            gdal.ExceptionMgr(useExceptions=True), ogr.ExceptionMgr(useExceptions=True):
        alvo, partes = _baixar(caminho, original, Path(pasta), driver)
        if _revisao(caminho) != revisao:
            raise ValueError(REVISAO_OBSOLETA)
        nome_camada, antes, esperado = _editar_copia(alvo, driver, camada, edicoes, excluidos)
        estavel = _conferir(alvo, nome_camada, antes, esperado, excluidos, driver)
        _publicar(caminho, revisao, partes)
    if excluidos and driver == 'ESRI Shapefile':
        # Índices espaciais antigos apontam para posições anteriores à exclusão.
        for sufixo in INDICES_SHAPEFILE:
            try:
                remoto.apagar_arquivo(str(PurePosixPath(caminho).with_suffix(sufixo)))
            except Exception:
                pass
    nova = _aguardar_revisao(caminho, revisao)
    return {
        'id': ident, 'arquivo': caminho, 'camada': nome_camada, 'revisao': nova,
        'editadas': len(esperado), 'excluidas': len(excluidos),
        'total_feicoes': antes[nome_camada][0] - len(excluidos),
        # Após compactar shapefile/GeoJSON os FIDs mudam: a sessão precisa reabrir.
        'recarregar': not estavel,
        'fids_excluidos': [str(fid) for fid in excluidos],
        'atributos': {str(fid): valores for fid, _, valores in esperado} if estavel else {},
    }


def _geometria_entrada(valor, srs_origem, srs_destino, tipo_camada, transformacao):
    if not isinstance(valor, dict) or not valor.get('type'):
        raise ValueError('Cada geometria deve ser um objeto GeoJSON válido.')
    try:
        geometria = ogr.CreateGeometryFromJson(json.dumps(valor, allow_nan=False))
    except (TypeError, ValueError, RuntimeError) as exc:
        raise ValueError(f'Geometria GeoJSON inválida: {exc}') from exc
    if geometria is None or geometria.IsEmpty() or not geometria.IsValid():
        raise ValueError('A geometria está vazia ou inválida.')
    tipo = geometria.GetGeometryType()
    if ogr.GT_Flatten(tipo) != ogr.GT_Flatten(tipo_camada):
        raise ValueError('Preserve o tipo de geometria da camada de origem.')
    if ogr.GT_HasZ(tipo) != ogr.GT_HasZ(tipo_camada) or ogr.GT_HasM(tipo) != ogr.GT_HasM(tipo_camada):
        raise ValueError('Preserve as dimensões Z/M da camada de origem.')
    west, south, east, north = geometria.GetEnvelope()
    if not all(math.isfinite(value) for value in (west, south, east, north)) or \
            not (-180 <= west <= east <= 180 and -90 <= south <= north <= 90):
        raise ValueError('As coordenadas de edição devem estar em longitude/latitude EPSG:4326.')
    geometria.AssignSpatialReference(srs_origem)
    if geometria.Transform(transformacao) != 0:
        raise ValueError('Não foi possível transformar a geometria para o CRS da camada.')
    geometria.AssignSpatialReference(srs_destino)
    if geometria.IsEmpty() or not geometria.IsValid():
        raise ValueError('A geometria transformada ficou vazia ou inválida.')
    envelope = geometria.GetEnvelope()
    if not all(math.isfinite(value) for value in envelope):
        raise ValueError('A geometria transformada contém coordenadas inválidas.')
    return geometria


def _validar_edicoes_geometria(edicoes, excluidos, novas):
    if not isinstance(edicoes, list) or not isinstance(novas, list):
        raise ValueError('As edições e as novas feições devem ser listas.')
    if len(edicoes) + len(excluidos or []) + len(novas) > 100:
        raise ValueError('O lote de edição geométrica pode conter no máximo 100 feições.')
    geometries = {}
    atualizacoes = []
    for item in edicoes:
        if not isinstance(item, dict) or 'fid' not in item or 'geometry' not in item:
            raise ValueError('Cada edição deve conter fid e geometry.')
        fid = _fid(item['fid'])
        if fid in geometries:
            raise ValueError('Há FIDs repetidos na lista de edições.')
        geometries[fid] = item['geometry']
        campos = item.get('campos', {})
        if campos is None:
            campos = {}
        if not isinstance(campos, dict):
            raise ValueError(f'Os campos da feição FID {fid} devem ser um objeto.')
        atualizacoes.append({'fid': fid, 'campos': campos})
    excluidos = [_fid(fid) for fid in (excluidos or [])]
    if len(set(excluidos)) != len(excluidos):
        raise ValueError('Há FIDs repetidos na lista de exclusão.')
    if set(geometries) & set(excluidos):
        raise ValueError('Uma feição não pode ser editada e excluída na mesma gravação.')
    if not geometries and not excluidos and not novas:
        raise ValueError('Nenhuma alteração geométrica foi informada.')
    atributos, _ = _validar_pedido(atualizacoes, excluidos, permitir_vazio=True)
    for item in novas:
        if not isinstance(item, dict) or 'geometry' not in item:
            raise ValueError('Cada nova feição deve conter geometry e properties.')
        if not isinstance(item.get('properties', {}), dict):
            raise ValueError('As propriedades de uma nova feição devem ser um objeto.')
        if {'geometry', 'geometria'} & set(item.get('properties', {})):
            raise ValueError('As propriedades devem conter apenas campos da camada.')
    return geometries, atributos, excluidos, novas


def _aplicar_geometrias(ds, layer, driver, geometrias, atributos, excluidos, novas):
    defn = layer.GetLayerDefn()
    srs_destino = layer.GetSpatialRef()
    if srs_destino is None:
        raise ValueError('A camada não informa seu CRS.')
    srs_destino = srs_destino.Clone()
    srs_destino.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    srs_origem = osr.SpatialReference()
    srs_origem.ImportFromEPSG(4326)
    srs_origem.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    try:
        transformacao = osr.CoordinateTransformation(srs_origem, srs_destino)
    except RuntimeError as exc:
        raise ValueError(f'Não foi possível transformar de EPSG:4326 para o CRS da camada: {exc}') from exc

    esperadas = []
    transacao = driver == 'GPKG'
    if transacao:
        layer.StartTransaction()
    try:
        for fid, geojson in geometrias.items():
            feature = _feicao(layer, fid)
            if feature is None:
                raise ValueError(f'A feição FID {fid} não existe no arquivo original.')
            geometria = _geometria_entrada(geojson, srs_origem, srs_destino,
                                           layer.GetGeomType(), transformacao)
            if feature.SetGeometry(geometria) != 0:
                raise RuntimeError(f'O GDAL recusou a geometria da feição FID {fid}.')
            valores = atributos.get(fid, {})
            for nome, valor in valores.items():
                indice = defn.GetFieldIndex(nome)
                if indice < 0 or defn.GetFieldDefn(indice).GetName() != nome:
                    raise ValueError(f'O campo {nome} não existe na camada original.')
                campo = defn.GetFieldDefn(indice)
                convertido = _valor(campo, valor)
                if convertido is None:
                    feature.SetFieldNull(indice)
                elif campo.GetType() == ogr.OFTInteger64:
                    feature.SetFieldInteger64(indice, convertido)
                else:
                    feature.SetField(indice, convertido)
                if convertido is not None and not feature.IsFieldSetAndNotNull(indice):
                    raise ValueError(f'Valor inválido para o campo {nome}.')
            if layer.SetFeature(feature) != 0:
                raise RuntimeError(f'O GDAL recusou gravar a geometria da feição FID {fid}.')
            esperado = feature.GetGeometryRef().Clone().ExportToIsoWkb()
            esperadas.append((fid, esperado, {
                nome: _normalizado(feature, defn, defn.GetFieldIndex(nome)) for nome in valores
            }))

        for item in novas:
            feature = ogr.Feature(defn)
            geometria = _geometria_entrada(item['geometry'], srs_origem, srs_destino,
                                           layer.GetGeomType(), transformacao)
            if feature.SetGeometry(geometria) != 0:
                raise RuntimeError('O GDAL recusou a geometria da nova feição.')
            valores = {}
            for nome, valor in item.get('properties', {}).items():
                indice = defn.GetFieldIndex(nome)
                if indice < 0 or defn.GetFieldDefn(indice).GetName() != nome:
                    raise ValueError(f'O campo {nome} não existe na camada original.')
                campo = defn.GetFieldDefn(indice)
                convertido = _valor(campo, valor)
                if convertido is None:
                    feature.SetFieldNull(indice)
                elif campo.GetType() == ogr.OFTInteger64:
                    feature.SetFieldInteger64(indice, convertido)
                else:
                    feature.SetField(indice, convertido)
                valores[nome] = _normalizado(feature, defn, indice)
            if layer.CreateFeature(feature) != 0:
                raise RuntimeError('O GDAL recusou criar uma nova feição.')
            fid = feature.GetFID()
            if fid < 0:
                raise RuntimeError('O driver não devolveu o FID da nova feição.')
            gravada = _feicao(layer, fid)
            if gravada is None or gravada.GetGeometryRef() is None:
                raise RuntimeError(f'A nova feição FID {fid} não pôde ser lida após a gravação.')
            esperadas.append((fid, gravada.GetGeometryRef().Clone().ExportToIsoWkb(), {
                nome: _normalizado(gravada, defn, defn.GetFieldIndex(nome)) for nome in valores
            }))
        for fid in excluidos:
            if _feicao(layer, fid) is None:
                raise ValueError(f'A feição FID {fid} não existe no arquivo original.')
            if layer.DeleteFeature(fid) != 0:
                raise RuntimeError(f'O GDAL recusou excluir a feição FID {fid}.')
        if transacao:
            layer.CommitTransaction()
    except Exception:
        if transacao:
            layer.RollbackTransaction()
        raise
    if excluidos and driver == 'ESRI Shapefile':
        ds.ExecuteSQL(f'REPACK {layer.GetName()}')
    return esperadas


def gravar_geometrias(ident, revisao, edicoes, excluidos, novas, user):
    """Edita geometrias e atributos pontuais sem materializar a camada em GeoJSON."""
    perfil = str(getattr(user, 'tipo_usuario', '') or '').strip().upper()
    if perfil not in PERFIS_EDICAO:
        raise PermissionError('Seu perfil não permite editar arquivos do storage.')
    geometrias, atributos, excluidos, novas = _validar_edicoes_geometria(edicoes, excluidos, novas)
    caminho, camada = storage.separar_id(ident)
    original = storage.resolver(caminho)
    driver = DRIVERS_INCREMENTAIS.get(original.suffix.lower())
    if driver is None:
        raise ValueError('Edição geométrica disponível apenas para GeoPackage, Shapefile e GeoJSON '
                         'nativos do storage. Pacotes compactados, FlatGeobuf, KML e outros formatos não são editáveis.')
    if _revisao(caminho) != revisao:
        raise ValueError(REVISAO_OBSOLETA)
    with TemporaryDirectory(prefix='sicard-edicao-geometria-') as pasta, \
            gdal.ExceptionMgr(useExceptions=True), ogr.ExceptionMgr(useExceptions=True):
        alvo, partes = _baixar(caminho, original, Path(pasta), driver)
        if _revisao(caminho) != revisao:
            raise ValueError(REVISAO_OBSOLETA)
        ds = gdal.OpenEx(str(alvo), gdal.OF_VECTOR | gdal.OF_READONLY, allowed_drivers=[driver])
        if ds is None:
            raise ValueError(f'O arquivo não pôde ser aberto para edição ({driver}).')
        try:
            if ds.GetLayerCount() > 1 and driver != 'GPKG':
                raise ValueError('Edição de arquivos multicamada requer GeoPackage.')
            layer = ds.GetLayerByName(camada) if camada else ds.GetLayer(0)
            if layer is None:
                raise FileNotFoundError('Camada não encontrada no arquivo.')
            nome_camada = layer.GetName()
            tipo_camada = layer.GetGeomType()
            if ogr.GT_Flatten(tipo_camada) == ogr.wkbNone:
                raise ValueError('A camada não possui geometrias editáveis.')
            if layer.GetSpatialRef() is None:
                raise ValueError('A camada não informa seu CRS.')
            antes = _inventario(ds)
            if antes[nome_camada][0] - len(excluidos) + len(novas) < 1:
                raise ValueError('A camada deve manter ao menos uma feição.')
        finally:
            ds.Close()

        ds = gdal.OpenEx(str(alvo), gdal.OF_VECTOR | gdal.OF_UPDATE, allowed_drivers=[driver])
        if ds is None:
            raise ValueError(f'O arquivo não pode ser aberto para edição ({driver}).')
        try:
            layer = ds.GetLayerByName(nome_camada)
            if not layer.TestCapability(ogr.OLCRandomWrite) and geometrias:
                raise ValueError('O formato do arquivo não permite atualizar feições.')
            if not layer.TestCapability(ogr.OLCSequentialWrite) and novas:
                raise ValueError('O formato do arquivo não permite criar feições.')
            if not layer.TestCapability(ogr.OLCDeleteFeature) and excluidos:
                raise ValueError('O formato do arquivo não permite excluir feições.')
            esperado = _aplicar_geometrias(ds, layer, driver, geometrias, atributos, excluidos, novas)
        finally:
            ds.Close()
        _verificar_copia_geometrias(alvo, nome_camada, antes, esperado, excluidos, driver, len(novas))
        _publicar(caminho, revisao, partes)
    if excluidos and driver == 'ESRI Shapefile':
        for sufixo in INDICES_SHAPEFILE:
            remoto.apagar_arquivo(str(PurePosixPath(caminho).with_suffix(sufixo)))
    nova = _aguardar_revisao(caminho, revisao)
    return {
        'id': ident, 'arquivo': caminho, 'camada': nome_camada, 'revisao': nova,
        'geometrias_atualizadas': len(geometrias), 'atributos_atualizados': len(atributos),
        'novas': len(novas), 'excluidas': len(excluidos),
        'total_feicoes': antes[nome_camada][0] - len(excluidos) + len(novas),
        'recarregar': True, 'fids_excluidos': [str(fid) for fid in excluidos],
        'atributos': {str(fid): valores for fid, _, valores in esperado if fid in atributos},
    }


def _verificar_copia_geometrias(alvo, nome_camada, antes, esperado, excluidos, driver, adicionados):
    """Executa as mesmas verificações de integridade para uma cópia com novas feições."""
    try:
        ds = gdal.OpenEx(str(alvo), gdal.OF_VECTOR | gdal.OF_READONLY, allowed_drivers=[driver])
    except RuntimeError as exc:
        raise RuntimeError('A cópia editada não pôde ser reaberta; o original foi preservado.') from exc
    if ds is None:
        raise RuntimeError('A cópia editada não pôde ser reaberta; o original foi preservado.')
    try:
        return _verificar(ds, nome_camada, antes, esperado, excluidos, driver, adicionados)
    finally:
        ds.Close()
