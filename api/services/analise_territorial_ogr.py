"""Dados, projeção, overlay e GeoPackage da análise territorial, somente GDAL/OGR."""
from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4
import math
import json

from osgeo import gdal, ogr, osr
from api.services.feedback_operacao import operacao


def referencia(valor):
    if isinstance(valor, osr.SpatialReference):
        resultado = valor.Clone()
    else:
        resultado = osr.SpatialReference()
        resultado.SetFromUserInput(f'EPSG:{valor}' if isinstance(valor, int) else str(valor))
    resultado.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return resultado


def campo(nome, tipo, subtipo=ogr.OFSTNone):
    return {'nome': nome, 'tipo': tipo, 'subtipo': subtipo}


@dataclass
class Camada:
    campos: list[dict]
    registros: list[dict]
    geometrias: list
    crs: object
    metadados: dict = field(default_factory=dict)
    campos_intersecoes: list[dict] = field(default_factory=list)
    fids: list[int] = field(default_factory=list)
    fonte: dict = field(default_factory=dict)

    def __len__(self):
        return len(self.registros)

    def copiar(self):
        return Camada([c.copy() for c in self.campos], [r.copy() for r in self.registros],
                      [g.Clone() if g is not None else None for g in self.geometrias],
                      self.crs.Clone() if self.crs else None, self.metadados.copy(),
                      [c.copy() for c in self.campos_intersecoes], self.fids.copy(), self.fonte.copy())

    def adicionar(self, nome, tipo, valores):
        valores = list(valores)
        if len(valores) != len(self):
            raise ValueError('Quantidade de atributos incompatível com as feições.')
        self.campos.append(campo(nome, tipo))
        for registro, valor in zip(self.registros, valores):
            registro[nome] = valor


def ler_camada(layer):
    definition = layer.GetLayerDefn()
    campos = []
    for i in range(definition.GetFieldCount()):
        f = definition.GetFieldDefn(i)
        campos.append({**campo(f.GetName(), f.GetType(), f.GetSubType()),
                       'largura': f.GetWidth(), 'precisao': f.GetPrecision()})
    registros, geometrias, fids = [], [], []
    layer.ResetReading()
    for feature in layer:
        fids.append(feature.GetFID())
        registros.append({c['nome']: feature.GetField(c['nome']) for c in campos})
        geom = feature.GetGeometryRef()
        geometrias.append(geom.Clone() if geom is not None else None)
    srs = layer.GetSpatialRef()
    return Camada(campos, registros, geometrias, referencia(srs) if srs else None,
                  dict(layer.GetMetadata() or {}), fids=fids,
                  fonte={'componente': layer.GetName()})


def ler(fonte, camada=None):
    path = f'/vsimem/territorial-leitura-{uuid4().hex}.gpkg' if isinstance(fonte, bytes) else str(fonte)
    dataset = layer = None
    try:
        if isinstance(fonte, bytes):
            gdal.FileFromMemBuffer(path, fonte)
        dataset = gdal.OpenEx(path, gdal.OF_VECTOR | gdal.OF_READONLY)
        if dataset is None:
            raise ValueError('GDAL não conseguiu abrir a fonte vetorial.')
        layer = dataset.GetLayerByName(camada) if camada else (
            dataset.GetLayer(0) if dataset.GetLayerCount() == 1 else None)
        if layer is None:
            raise ValueError('Selecione uma camada vetorial válida no arquivo.')
        resultado = ler_camada(layer)
        resultado.fonte.update(formato=dataset.GetDriver().ShortName)
        return resultado
    finally:
        layer = dataset = None
        if isinstance(fonte, bytes):
            gdal.Unlink(path)


def resumo_vetor(path, conteudos=None):
    """Metadados para registrar exportações, sem materializar uma tabela."""
    raiz = f'/vsimem/territorial-exportacao-{uuid4().hex}'
    dataset = layer = None
    try:
        if conteudos is not None:
            from pathlib import PurePosixPath
            gdal.Mkdir(raiz, 0o700)
            for nome, dados in conteudos.items():
                if PurePosixPath(nome).name != nome or '\\' in nome:
                    raise ValueError('Nome inválido de componente vetorial.')
                gdal.FileFromMemBuffer(f'{raiz}/{nome}', dados)
            fonte = f'{raiz}/{path.name}'
        else:
            fonte = str(path)
        dataset = gdal.OpenEx(fonte, gdal.OF_VECTOR | gdal.OF_READONLY)
        if dataset is None or dataset.GetLayerCount() == 0:
            raise ValueError('GDAL não conseguiu reabrir a exportação vetorial.')
        layer = dataset.GetLayer(0)
        srs = layer.GetSpatialRef()
        codigo = srs.GetAuthorityCode(None) if srs else None
        crs = f'{srs.GetAuthorityName(None)}:{codigo}' if codigo else (srs.ExportToWkt() if srs else 'None')
        return {'feicoes': layer.GetFeatureCount(), 'crs': crs, 'reaberto_gdal': True}
    finally:
        layer = dataset = None
        if conteudos is not None:
            gdal.RmdirRecursive(raiz)


def carregar_referencia(ident):
    """Lê storage, pacotes, arquivos registrados e WKB do PostGIS sem DataFrame."""
    from api.services import storage_geoespacial as storage
    if ident.startswith('storage:'):
        arquivo, camada = storage.separar_id(ident)
        path = storage.resolver(arquivo)
        from api.services.fluxo_camadas_ogr import abrir_arquivo
        ds, layer = abrir_arquivo(path, camada)
        try:
            dados = ler_camada(layer)
            dados.fonte.update(arquivo=path, formato=ds.GetDriver().ShortName)
            dados.fonte.update(json.loads(ds.GetMetadataItem('SICARD_FONTE_PACOTE') or '{}'))
            return dados
        finally:
            layer = ds = None

    from api.repositories import camada_geoespacial_repository as repo
    from api.db.connection import get_connection
    from psycopg import sql
    with get_connection() as conn:
        found = repo._find_layer(conn, ident)
        if not found or found[1]['tipo'] != 'vetor':
            raise FileNotFoundError('Camada vetorial não encontrada no catálogo.')
        categoria, registro = found
        metadata = registro.get('metadados') or {}
        nested = metadata.get('metadados') or {}
        arquivo = metadata.get('caminho_arquivo') or nested.get('caminho_arquivo')
        if categoria == 'processadas' and registro.get('storage_caminho'):
            path = storage.resolver(registro['storage_caminho'])
            dados = ler(path, 'resultado')
            dados.fonte.update(nome=registro.get('nome', ident), arquivo=path)
            return dados
        if arquivo:
            from api.path_policy import project_path
            path = project_path(str(arquivo).replace('\\', '/'))
            dataset = gdal.OpenEx(str(path), gdal.OF_VECTOR | gdal.OF_READONLY)
            if dataset is None:
                raise ValueError('GDAL não conseguiu abrir o arquivo registrado.')
            nomes = [dataset.GetLayer(i).GetName() for i in range(dataset.GetLayerCount())]
            explicit = registro.get('camada_arquivo') or metadata.get('camada_arquivo') or nested.get('camada_arquivo')
            from api.services.camada_arquivo import alias_camada
            candidatos = ([explicit] if explicit in nomes else []) if explicit else (
                nomes if len(nomes) == 1 else [n for n in nomes if n == registro.get('nome') or alias_camada(n) == registro.get('nome')])
            if len(candidatos) != 1:
                raise ValueError('Não foi possível identificar uma única subcamada do arquivo registrado.')
            try:
                dados = ler_camada(dataset.GetLayerByName(candidatos[0]))
                dados.fonte.update(nome=registro.get('nome', ident), arquivo=path,
                                   formato=dataset.GetDriver().ShortName)
                return dados
            finally:
                dataset = None
        rows = conn.execute(sql.SQL(
            'SELECT propriedades, ST_AsBinary(geom) AS wkb FROM geoprocessamento.{} '
            'WHERE camada_id=%s ORDER BY ordem'
        ).format(sql.Identifier(repo.STORAGES[categoria][1])), (registro['id'],)).fetchall()
    registros = [dict(r['propriedades'] or {}) for r in rows]
    nomes = list(dict.fromkeys(k for r in registros for k in r))
    campos = []
    for nome in nomes:
        valores = [r[nome] for r in registros if r.get(nome) is not None]
        if all(isinstance(v, bool) for v in valores) and valores:
            spec = campo(nome, ogr.OFTInteger, ogr.OFSTBoolean)
        elif all(isinstance(v, int) for v in valores) and valores:
            spec = campo(nome, ogr.OFTInteger64)
        elif all(isinstance(v, (int, float)) for v in valores) and valores:
            spec = campo(nome, ogr.OFTReal)
        elif all(isinstance(v, str) for v in valores):
            spec = campo(nome, ogr.OFTString)
        else:
            raise ValueError(f'O campo {nome} contém tipos incompatíveis com uma coluna OGR.')
        campos.append(spec)
    dados = Camada(campos, registros, [ogr.CreateGeometryFromWkb(bytes(r['wkb']))
                                      if r['wkb'] is not None else None for r in rows], referencia(4674),
                   fonte={'nome': registro.get('nome', ident), 'formato': 'PostGIS'})
    return reproject(dados, registro['crs']) if registro.get('crs') else dados


def _coordenadas(geom, geografico):
    for ponto in geom.GetPoints() if geom.GetPointCount() else []:
        if not all(math.isfinite(v) for v in ponto):
            raise ValueError('Coordenadas não finitas na fonte ou transformação.')
        if geografico and (abs(ponto[0]) > 180 or abs(ponto[1]) > 90):
            raise ValueError('Coordenadas incompatíveis com o CRS geográfico declarado.')
    for i in range(geom.GetGeometryCount()):
        _coordenadas(geom.GetGeometryRef(i), geografico)


def reproject(camada, target, name='Camada', progress=None):
    if camada.crs is None:
        raise ValueError(f'{name}: CRS ausente.')
    source, dest = referencia(camada.crs), referencia(target)
    transform = None if source.IsSame(dest) else osr.CoordinateTransformation(source, dest)
    resultado = camada.copiar()
    with operacao(progress, f'{name}: conferir e transformar coordenadas com GDAL/OSR') as medir:
        for pos, geom in enumerate(resultado.geometrias):
            if geom is not None:
                _coordenadas(geom, bool(source.IsGeographic()))
                if transform is not None and geom.Transform(transform) != 0:
                    raise ValueError(f'{name}: GDAL/OSR não conseguiu transformar a geometria.')
                _coordenadas(geom, bool(dest.IsGeographic()))
            medir(pos + 1, len(resultado), 'geometrias')
    resultado.crs = dest
    return resultado


def area(geom):
    if geom is None or geom.IsEmpty():
        return 0.
    if ogr.GT_Flatten(geom.GetGeometryType()) in (
            ogr.wkbGeometryCollection, ogr.wkbMultiPolygon, ogr.wkbMultiLineString, ogr.wkbMultiPoint):
        return sum(area(geom.GetGeometryRef(i)) for i in range(geom.GetGeometryCount()))
    return geom.GetArea() if geom.GetDimension() == 2 else 0.


def geometria_preservada(original, persistida):
    if original is None or persistida is None:
        return original is persistida
    if original.ExportToIsoWkb() == persistida.ExportToIsoWkb():
        return True
    multiplo = {ogr.wkbPoint: ogr.wkbMultiPoint, ogr.wkbLineString: ogr.wkbMultiLineString,
                ogr.wkbPolygon: ogr.wkbMultiPolygon}
    return (multiplo.get(ogr.GT_Flatten(original.GetGeometryType())) == ogr.GT_Flatten(persistida.GetGeometryType())
            and persistida.GetGeometryCount() == 1
            and original.ExportToIsoWkb() == persistida.GetGeometryRef(0).ExportToIsoWkb())


def gravar_camada(dataset, nome, dados, *, opcoes=None, preservar_fids=False, tipo_geometria=ogr.wkbUnknown):
    if len(dados.registros) != len(dados.geometrias):
        raise ValueError('Quantidade de geometrias e atributos divergente.')
    layer = dataset.CreateLayer(nome, dados.crs, tipo_geometria, options=opcoes or [])
    for spec in dados.campos:
        definition = ogr.FieldDefn(spec['nome'], spec['tipo'])
        definition.SetSubType(spec.get('subtipo', ogr.OFSTNone))
        definition.SetWidth(spec.get('largura', 0))
        definition.SetPrecision(spec.get('precisao', 0))
        if layer.CreateField(definition) != ogr.OGRERR_NONE:
            raise ValueError(f"Falha ao criar campo: {spec['nome']}.")
    layer.SetMetadata(dados.metadados)
    layer.StartTransaction()
    try:
        for pos, (registro, geom) in enumerate(zip(dados.registros, dados.geometrias)):
            feature = ogr.Feature(layer.GetLayerDefn())
            if preservar_fids and dados.fids:
                feature.SetFID(dados.fids[pos])
            for spec in dados.campos:
                nome_campo = spec['nome']
                valor = registro.get(nome_campo)
                if valor is None:
                    feature.SetFieldNull(nome_campo)
                elif spec['tipo'] == ogr.OFTBinary:
                    feature.SetFieldBinaryFromHexString(nome_campo, bytes(valor).hex())
                else:
                    feature.SetField(nome_campo, valor)
            if geom is not None:
                feature.SetGeometry(geom)
            if layer.CreateFeature(feature) != ogr.OGRERR_NONE:
                raise ValueError(f'Falha ao gravar feição em {nome}.')
            feature = None
        layer.CommitTransaction()
    except BaseException:
        layer.RollbackTransaction()
        raise
    return layer


def serializar(dados, camada='camada', *, preservar_fids=False):
    path = f'/vsimem/camada-{uuid4().hex}.gpkg'
    dataset = layer = None
    nomes = {c['nome'].casefold() for c in dados.campos}
    fid, geom = '__sicard_fid__', '__sicard_geom__'
    while fid.casefold() in nomes:
        fid += '_'
    while geom.casefold() in nomes:
        geom += '_'
    try:
        dataset = ogr.GetDriverByName('GPKG').CreateDataSource(path)
        layer = gravar_camada(dataset, camada, dados, opcoes=[f'FID={fid}', f'GEOMETRY_NAME={geom}'],
                              preservar_fids=preservar_fids)
        layer = dataset = None
        conteudo = bytes(gdal.VSIGetMemFileBuffer_unsafe(path))
        reaberta = ler(conteudo, camada)
        conferir(dados, reaberta)
        if preservar_fids and dados.fids and dados.fids != reaberta.fids:
            raise ValueError('Os identificadores das feições não foram preservados.')
        return conteudo
    finally:
        layer = dataset = None
        gdal.Unlink(path)


def de_geojson(data, crs=4326):
    """OGR lê geometrias; os atributos JSON mantêm inteiros sem passagem por float."""
    features = data.get('features', [])
    registros = [dict(f.get('properties') or {}) for f in features]
    campos = campos_registros(registros)
    return Camada(campos, registros, [ogr.CreateGeometryFromJson(json.dumps(f['geometry']))
                  if f.get('geometry') else None for f in features], referencia(crs),
                  fids=list(range(len(features))))


def campos_registros(registros):
    nomes = list(dict.fromkeys(k for r in registros for k in r))
    campos = []
    for nome in nomes:
        valores = [r[nome] for r in registros if r.get(nome) is not None]
        if valores and all(isinstance(v, bool) for v in valores):
            spec = campo(nome, ogr.OFTInteger, ogr.OFSTBoolean)
        elif valores and all(isinstance(v, int) for v in valores):
            spec = campo(nome, ogr.OFTInteger64)
        elif valores and all(isinstance(v, (int, float)) for v in valores):
            spec = campo(nome, ogr.OFTReal)
        else:
            spec = campo(nome, ogr.OFTString)
            for registro in registros:
                valor = registro.get(nome)
                if isinstance(valor, (dict, list)):
                    registro[nome] = json.dumps(valor, ensure_ascii=False, allow_nan=False)
                elif valor is not None and not isinstance(valor, str):
                    registro[nome] = str(valor)
        campos.append(spec)
    return campos


def juntar(camadas):
    if not camadas:
        raise ValueError('Nenhuma camada foi fornecida.')
    registros, geometrias, specs = [], [], {}
    for dados in camadas:
        if not dados.crs.IsSame(camadas[0].crs):
            dados = reproject(dados, camadas[0].crs)
        registros.extend(r.copy() for r in dados.registros)
        geometrias.extend(g.Clone() if g is not None else None for g in dados.geometrias)
        for c in dados.campos:
            anterior = specs.get(c['nome'])
            if anterior and (anterior['tipo'], anterior.get('subtipo', 0)) != (c['tipo'], c.get('subtipo', 0)):
                numericos = {ogr.OFTInteger, ogr.OFTInteger64, ogr.OFTReal}
                if anterior['tipo'] in numericos and c['tipo'] in numericos:
                    tipo = ogr.OFTReal if ogr.OFTReal in (anterior['tipo'], c['tipo']) else ogr.OFTInteger64
                    specs[c['nome']] = campo(c['nome'], tipo)
                else:
                    raise ValueError(f"Tipos incompatíveis entre demandas no campo {c['nome']}.")
            else:
                specs[c['nome']] = c.copy()
    return Camada(list(specs.values()), registros, geometrias, camadas[0].crs.Clone())


def conferir(esperada, persistida, *, fragmentos=False):
    if len(esperada) != len(persistida):
        raise ValueError('A quantidade de feições não foi preservada na saída.')
    if esperada.crs is None or persistida.crs is None or not esperada.crs.IsSame(persistida.crs):
        raise ValueError('O CRS não foi preservado na saída.')
    if [c['nome'] for c in esperada.campos] != [c['nome'] for c in persistida.campos]:
        raise ValueError('Os campos não foram preservados na saída.')
    if [(c['tipo'], c.get('subtipo', ogr.OFSTNone)) for c in esperada.campos] != [
            (c['tipo'], c.get('subtipo', ogr.OFSTNone)) for c in persistida.campos]:
        raise ValueError('Os tipos dos campos não foram preservados na saída.')
    for pos, (antes, depois, ga, gb) in enumerate(zip(
            esperada.registros, persistida.registros, esperada.geometrias, persistida.geometrias), 1):
        if not geometria_preservada(ga, gb):
            raise ValueError('As geometrias não foram preservadas na saída.')
        for c in esperada.campos:
            nome = c['nome']
            if antes.get(nome) != depois.get(nome):
                mensagem = ('Os vínculos ou as áreas das interseções não foram preservados.' if fragmentos
                            else 'A saída gravada não preservou os atributos ou os valores calculados.')
                raise ValueError(f'{mensagem} Campo divergente: {nome}; registro: {pos}.')


class LayerOverlay:
    """Overlay nativo OGR; índices posicionais não dependem dos FIDs da fonte."""
    def __init__(self, geometrias, progress=None):
        self.progress = progress
        self.path = f'/vsimem/territorial-overlay-{uuid4().hex}.gpkg' if len(geometrias) > 256 else None
        self.dataset = ogr.GetDriverByName('GPKG' if self.path else 'Memory').CreateDataSource(self.path or '')
        try:
            self.layer = self._camada(self.dataset, 'base', geometrias, 'base_pos')
        except BaseException:
            self.close()
            raise

    def _camada(self, dataset, nome, geometrias, coluna):
        dados = Camada([campo(coluna, ogr.OFTInteger64)], [{coluna: i} for i in range(len(geometrias))],
                       geometrias, None)
        with operacao(self.progress, f'Carregar geometrias de {nome} no OGR'):
            return gravar_camada(dataset, nome, dados)

    def records(self, geometrias, operation='Intersection'):
        if operation != 'Intersection':
            raise ValueError('Operação de camada não suportada.')
        dataset = ogr.GetDriverByName('Memory').CreateDataSource('')
        source = result = None
        try:
            source = self._camada(dataset, 'entrada', geometrias, 'demanda_pos')
            result = dataset.CreateLayer('resultado', geom_type=ogr.wkbUnknown)
            with operacao(self.progress, 'Executar OGR Intersection'):
                code = source.Intersection(self.layer, result, options=[
                    'SKIP_FAILURES=NO', 'KEEP_LOWER_DIMENSION_GEOMETRIES=YES'])
                if code != ogr.OGRERR_NONE:
                    raise ValueError(f'GDAL/OGR: Intersection falhou ({code}).')
            rows = [(f.GetField('demanda_pos'), f.GetField('base_pos'), f.GetGeometryRef().Clone()) for f in result]
            return sorted(rows, key=lambda r: (r[0], r[1] is None, r[1] or 0))
        finally:
            source = result = dataset = None

    def close(self):
        self.layer = self.dataset = None
        if self.path:
            gdal.Unlink(self.path)
