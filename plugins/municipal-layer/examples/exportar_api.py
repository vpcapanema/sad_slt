"""PIB e IPDM 2022 em uma camada real. Requer a API em execução."""
import argparse
from pathlib import Path
import requests

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:18765/api')
    parser.add_argument('--format', choices=['fgb', 'gpkg', 'shp'], default='gpkg')
    parser.add_argument('--output', type=Path, default=Path('municipios_configurados.zip'))
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit(f'Arquivo já existe; escolha outro --output: {args.output}')
    base = args.base_url.rstrip('/')
    response = requests.get(f'{base}/catalog', timeout=60)
    response.raise_for_status()
    required = {'economia_pib_mil_reais_2022', 'seade_ipdm_2022'}
    selected = [a for a in response.json()['attributes'] if a['field'] in required]
    if {a['field'] for a in selected} != required:
        raise SystemExit('Indicadores do exemplo ausentes no catálogo.')
    response = requests.post(f'{base}/export', json={'attributes':[a['id'] for a in selected], 'format':args.format}, timeout=300)
    response.raise_for_status()
    if 'application/zip' not in response.headers.get('Content-Type', ''):
        raise SystemExit('A API não retornou um ZIP.')
    with args.output.open('xb') as output:
        output.write(response.content)
    print(f'Camada gerada: {args.output.resolve()} ({len(response.content)} bytes)')

if __name__ == '__main__':
    main()
