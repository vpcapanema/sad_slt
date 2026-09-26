"""Substituição do arquivo original via SFTPGo, sem criar camada ou backup."""
from pathlib import Path
from tempfile import TemporaryDirectory
import shutil
import time

from osgeo import gdal

from api.services import storage_geoespacial as storage
from api.services import storage_remoto as remoto


def gravar(source, frame, data):
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
            shutil.copyfile(original, target)
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
            remoto.enviar(str(Path(caminho).with_name(part.name)), part)
        if original.suffix.lower() == '.shp':
            # Índices espaciais antigos apontam para posições anteriores à exclusão.
            for extension in ('.qix', '.sbn', '.sbx'):
                if original.with_suffix(extension).exists():
                    remoto.apagar_arquivo(str(Path(caminho).with_suffix(extension)))
        # A montagem FUSE local mantém metadados por até 5 segundos.
        # Na VM o bind mount vê a alteração imediatamente.
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            state = original.stat()
            if f'{state.st_mtime_ns}-{state.st_size}' != source['revisao']:
                return storage.ler_para_mapa(source['id'])
            time.sleep(.2)
        raise RuntimeError('Arquivo gravado no storage. Reabra a camada para atualizar a sessão.')
