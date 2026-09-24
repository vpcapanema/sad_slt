"""Exploração recursiva de pacotes locais, sem extração em disco ou cadastro."""
from __future__ import annotations

from contextlib import contextmanager
from pathlib import PurePosixPath
from uuid import uuid4
import bz2
import gzip
import io
import lzma
import time

import libarchive
from osgeo import gdal, ogr

COMPACTADOS = {'.zip', '.kmz', '.rar', '.7z', '.tar', '.tgz', '.tbz2', '.txz', '.gz', '.bz2', '.xz'}
VETORES = {'.gpkg': 'GPKG', '.shp': 'ESRI Shapefile', '.geojson': 'GeoJSON',
           '.json': 'GeoJSON', '.fgb': 'FlatGeobuf', '.kml': 'KML', '.gml': 'GML',
           '.gdb': 'OpenFileGDB'}
RASTERS = {'.tif': 'GTiff', '.tiff': 'GTiff', '.img': 'HFA', '.asc': 'AAIGrid',
           '.jp2': 'JP2OpenJPEG', '.gpkg': 'GPKG', '.gdb': 'OpenFileGDB'}
MAX_COMPONENTES = 2000
MAX_PROFUNDIDADE = 5


def componentes(conteudo, nome, limite):
    """Limite global inclui bytes de TODOS os níveis (não só o pacote final)."""
    saida, vistos = {}, set()
    total = quantidade = 0
    prazo = time.monotonic() + 60

    def verificar():
        if time.monotonic() > prazo:
            raise ValueError('O pacote excedeu o tempo de exploração de 60 segundos.')

    def caminho(nome):
        p = PurePosixPath(str(nome).replace('\\', '/'))
        if p.is_absolute() or '..' in p.parts or ':' in str(p) or '\x00' in str(p) or not p.parts:
            raise ValueError('O pacote contém um caminho não permitido.')
        return p

    def contabilizar(tamanho):
        nonlocal total
        total += tamanho
        if total > limite:
            raise ValueError('O pacote excede o limite de bytes descompactados (32 MB, somando todos os níveis).')

    def explorar(dados, nome, nivel=0):
        nonlocal quantidade
        verificar()
        ext = PurePosixPath(nome).suffix.lower()
        if ext not in COMPACTADOS:
            if nome in saida:
                raise ValueError('O pacote contém nomes de arquivos repetidos.')
            saida[nome] = dados
            return
        if nivel >= MAX_PROFUNDIDADE:
            raise ValueError('O pacote excede o limite de 5 níveis de compactação.')
        # Cada pacote tem seu namespace: homônimos de outros pacotes não colidem.
        prefixo = '' if nivel == 0 else nome + '.contents/'
        if ext in {'.gz', '.bz2', '.xz'} and not nome.lower().endswith(('.tar.gz', '.tar.bz2', '.tar.xz')):
            opener = {'.gz': gzip.open, '.bz2': bz2.BZ2File, '.xz': lzma.LZMAFile}[ext]
            with opener(io.BytesIO(dados), 'rb') as stream:
                result = stream.read(limite - total + 1)
            contabilizar(len(result))
            explorar(result, prefixo + PurePosixPath(nome).name[:-len(ext)], nivel + 1)
            return
        with libarchive.memory_reader(dados) as pacote:
            for item in pacote:
                verificar()
                quantidade += 1
                if quantidade > MAX_COMPONENTES:
                    raise ValueError('O pacote excede o limite de 2000 componentes.')
                p = caminho(item.pathname)
                if item.issym or item.islnk or (not item.isdir and not item.isfile):
                    raise ValueError('O pacote contém um link ou componente não permitido.')
                if item.isdir:
                    continue
                chave = prefixo + str(p)
                if chave in vistos:
                    raise ValueError('O pacote contém nomes de arquivos repetidos.')
                vistos.add(chave)
                if item.size is not None and item.size > limite - total:
                    raise ValueError('O pacote excede o limite de bytes descompactados.')
                buffer = bytearray()
                for block in item.get_blocks():
                    verificar(); contabilizar(len(block)); buffer.extend(block)
                if '__MACOSX' in p.parts or p.name.startswith('.'):
                    continue
                explorar(bytes(buffer), chave, nivel + 1)
    try:
        explorar(conteudo, nome)
    except (libarchive.exception.ArchiveError, OSError, EOFError, lzma.LZMAError) as exc:
        raise ValueError('Não foi possível descompactar o pacote. Verifique integridade, formato e senha; pacotes protegidos ou multipartidos não são aceitos.') from exc
    return saida


@contextmanager
def abrir(componentes):
    """Expõe arquivos em /vsimem e enumera TODAS as camadas, vetoriais e raster."""
    raiz = f'/vsimem/entrada-{uuid4().hex}'
    gdal.Mkdir(raiz, 0o700)
    datasets, opcoes = [], []
    diretorios = {raiz}
    avisos = []
    try:
        for relativo, dados in componentes.items():
            partes = PurePosixPath(relativo).parts[:-1]
            for i in range(len(partes)):
                diretorio = f"{raiz}/{'/'.join(partes[:i+1])}"
                if diretorio not in diretorios:
                    gdal.Mkdir(diretorio, 0o700); diretorios.add(diretorio)
            gdal.FileFromMemBuffer(f'{raiz}/{relativo}', dados)
        candidatos = set()
        for relativo in componentes:
            parts = PurePosixPath(relativo).parts
            gdb = next((i for i, p in enumerate(parts) if p.lower().endswith('.gdb')), None)
            candidatos.add('/'.join(parts[:gdb+1]) if gdb is not None else relativo)
        for relativo in sorted(candidatos):
            ext = PurePosixPath(relativo).suffix.lower()
            if ext not in {*VETORES, *RASTERS}:
                continue
            if ext == '.shp':
                radical = str(PurePosixPath(relativo).with_suffix('')).lower()
                nomes = {p.lower() for p in componentes}
                faltando = [e for e in ('.shx', '.dbf', '.prj') if radical+e not in nomes]
                if faltando:
                    avisos.append(f'Shapefile incompleto em {relativo}: faltam {", ".join(faltando)}.'); continue
            path = f'{raiz}/{relativo}'
            encontrou = False
            for tipo, drivers in [('vetor', VETORES), ('raster', RASTERS)]:
                if ext not in drivers:
                    continue
                gdal.PushErrorHandler('CPLQuietErrorHandler')
                try:
                    try:
                        ds = gdal.OpenEx(path, (gdal.OF_VECTOR if tipo == 'vetor' else gdal.OF_RASTER) | gdal.OF_READONLY,
                                         allowed_drivers=[drivers[ext]])
                    except RuntimeError:
                        ds = None
                finally:
                    gdal.PopErrorHandler()
                if ds is None:
                    continue
                datasets.append(ds)
                if tipo == 'vetor':
                    for i in range(ds.GetLayerCount()):
                        layer = ds.GetLayerByIndex(i)
                        if layer.GetGeomType() != ogr.wkbNone:
                            encontrou = True
                            opcoes.append(dict(chave=f'{relativo}::{i}', nome=layer.GetName(), arquivo=relativo,
                                               tipo=tipo, formato=drivers[ext], layer=layer))
                else:
                    subs = ds.GetSubDatasets()
                    for i, (subpath, descricao) in enumerate(subs or [(path, PurePosixPath(relativo).stem)]):
                        raster = gdal.OpenEx(subpath, gdal.OF_RASTER | gdal.OF_READONLY, allowed_drivers=[drivers[ext]]) if subs else ds
                        if raster is not None and raster.RasterCount:
                            datasets.append(raster); encontrou = True
                            opcoes.append(dict(chave=f'{relativo}::raster:{i}', nome=descricao.replace(raiz+'/', ''),
                                               arquivo=relativo, tipo=tipo, formato=drivers[ext], raster=raster))
            if not encontrou:
                avisos.append(f'Não foi possível ler dados geoespaciais em {relativo} ({VETORES.get(ext, RASTERS.get(ext))}: arquivo inválido ou recurso não suportado pelo driver instalado).')
        if not opcoes:
            raise ValueError('Nenhuma camada vetorial ou raster compatível foi encontrada. ' + ' '.join(avisos))
        yield opcoes, avisos, raiz
    finally:
        opcoes.clear(); datasets.clear()
        ds = layer = raster = None
        gdal.RmdirRecursive(raiz)


def inventario(opcoes):
    return [{k: v for k, v in o.items() if k not in ('layer', 'raster')} for o in opcoes]
