"""Mede a preparação e um tile central usando o serviço e arquivos reais."""
import argparse
import json
import time
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import mercantile
from api.services import extracao_preparacao, storage_geoespacial


def medir(ident, zoom=7):
    inicio = time.perf_counter()
    resultado = extracao_preparacao.preparar(ident, 'benchmark-previa-real')
    preparo = time.perf_counter() - inicio
    bounds = resultado['bounds']
    tile = mercantile.tile((bounds[0]+bounds[2])/2, (bounds[1]+bounds[3])/2, zoom)
    caminho, camada = storage_geoespacial.separar_id(ident)
    inicio = time.perf_counter()
    conteudo = storage_geoespacial.tile(caminho, camada, tile.z, tile.x, tile.y)
    return {'id': ident, 'feicoes': resultado['feicoes'], 'preparacao_s': round(preparo, 3),
            'tile_s': round(time.perf_counter()-inicio, 3), 'tile_bytes': len(conteudo),
            'tile': [tile.z, tile.x, tile.y], 'copia_temporaria': bool(resultado.get('tiles_token'))}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id', action='append', required=True)
    args = parser.parse_args()
    for ident in args.id:
        print(json.dumps(medir(ident)), flush=True)
