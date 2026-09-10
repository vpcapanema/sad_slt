"""Carrega o schema base_municipal a partir dos insumos do pacote municipal-layer.

Lê plugins/municipal-layer/data/catalog.sqlite e municipios.gpkg e popula
base_municipal.municipio, .atributo, .observacao e .procedencia. A carga é
completa e substitui o conteúdo anterior; não há mesclagem parcial.

Uso:
    .venv\\Scripts\\python.exe scripts/carregar_base_municipal.py            # carrega se vazio
    .venv\\Scripts\\python.exe scripts/carregar_base_municipal.py --recarregar
    .venv\\Scripts\\python.exe scripts/carregar_base_municipal.py --conferir  # só verifica
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import geopandas as gpd  # noqa: E402
import psycopg  # noqa: E402
from psycopg.rows import dict_row  # noqa: E402
from psycopg.types.json import Jsonb  # noqa: E402

from api.config import get_settings  # noqa: E402

ORIGEM = ROOT / 'plugins' / 'municipal-layer' / 'data'
MUNICIPIOS = 645
LOTE = 50_000


def conectar() -> psycopg.Connection:
    dsn = get_settings().slt_database_url
    if not dsn:
        raise SystemExit('SLT_DATABASE_URL não configurada.')
    return psycopg.connect(dsn, row_factory=dict_row)


def contagens(conn: psycopg.Connection) -> dict[str, int]:
    return {tabela: conn.execute(f'SELECT count(*) AS n FROM base_municipal.{tabela}').fetchone()['n']
            for tabela in ('municipio', 'atributo', 'observacao', 'procedencia')}


def ler_malha() -> gpd.GeoDataFrame:
    frame = gpd.read_file(ORIGEM / 'municipios.gpkg', layer='municipios')
    if len(frame) != MUNICIPIOS or not frame.CD_MUN.is_unique:
        raise SystemExit(f'A malha deve conter {MUNICIPIOS} municípios distintos.')
    if frame.crs.to_epsg() != 4674:
        raise SystemExit('A malha precisa estar em EPSG:4674.')
    if not (frame.geometry.geom_type == 'MultiPolygon').all():
        raise SystemExit('A malha precisa ser homogênea em MultiPolygon.')
    return frame.sort_values('CD_MUN')


def carregar(conn: psycopg.Connection) -> None:
    if not ORIGEM.is_dir():
        raise SystemExit(f'Insumos ausentes em {ORIGEM}. Restaure o pacote municipal-layer para recarregar.')
    malha = ler_malha()
    fonte = sqlite3.connect(f'file:{ORIGEM / "catalog.sqlite"}?mode=ro', uri=True)
    fonte.row_factory = sqlite3.Row

    conn.execute('TRUNCATE base_municipal.observacao, base_municipal.atributo, '
                 'base_municipal.municipio, base_municipal.procedencia')

    conn.cursor().executemany(
        'INSERT INTO base_municipal.municipio (cd_mun,nm_mun,sigla_uf,area_km2,geom) '
        "VALUES (%s,%s,%s,%s,ST_SetSRID(ST_GeomFromWKB(%s),4674))",
        [(r.CD_MUN, r.NM_MUN, r.SIGLA_UF, float(r.AREA_KM2), r.geometry.wkb)
         for r in malha.itertuples()])
    print(f'  municipio: {MUNICIPIOS}')

    atributos = [dict(row) for row in fonte.execute('SELECT * FROM attributes')]
    conn.cursor().executemany(
        'INSERT INTO base_municipal.atributo '
        '(id,fonte,ano,tema,campo,rotulo,unidade,url,detalhe,cobertura) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
        [(a['id'], a['source'], a['year'], a['theme'], a['field'], a['label'], a['unit'],
          a['url'], Jsonb(json.loads(a['detail'] or '{}')), a['coverage']) for a in atributos])
    print(f'  atributo: {len(atributos)}')

    codigos = set(malha.CD_MUN)
    gravadas = 0
    with conn.cursor().copy(
            'COPY base_municipal.observacao (atributo_id,cd_mun,valor) FROM STDIN') as copia:
        copia.set_types(['text', 'text', 'float8'])
        for linha in fonte.execute('SELECT attribute_id,municipality,value FROM observations'):
            if linha[1] not in codigos:
                raise SystemExit(f'Observação de município fora da malha: {linha[1]}')
            copia.write_row((linha[0], linha[1], linha[2]))
            gravadas += 1
            if gravadas % (LOTE * 10) == 0:
                print(f'  observacao: {gravadas}', flush=True)
    print(f'  observacao: {gravadas}')

    conn.cursor().executemany(
        'INSERT INTO base_municipal.procedencia (caminho,sha256) VALUES (%s,%s)',
        [(row['path'], row['sha256']) for row in fonte.execute('SELECT * FROM provenance')])
    fonte.close()


def conferir(conn: psycopg.Connection) -> int:
    numeros = contagens(conn)
    print('Contagens:', numeros)
    if numeros['municipio'] != MUNICIPIOS:
        print('FALHA: malha incompleta.')
        return 1
    esperado = numeros['atributo'] * MUNICIPIOS
    if numeros['observacao'] != esperado:
        print(f'AVISO: {numeros["observacao"]} observações para {esperado} combinações possíveis; '
              'a grade não está completa.')
    orfas = conn.execute('SELECT count(*) AS n FROM base_municipal.observacao o '
                         'WHERE NOT EXISTS (SELECT 1 FROM base_municipal.atributo a WHERE a.id=o.atributo_id)').fetchone()['n']
    divergentes = conn.execute(
        'SELECT count(*) AS n FROM base_municipal.atributo a WHERE a.cobertura <> '
        '(SELECT count(o.valor) FROM base_municipal.observacao o WHERE o.atributo_id=a.id)').fetchone()['n']
    invalidas = conn.execute('SELECT count(*) AS n FROM base_municipal.municipio '
                             'WHERE NOT ST_IsValid(geom) OR ST_SRID(geom) <> 4674').fetchone()['n']
    print(f'Observações órfãs: {orfas}')
    print(f'Atributos com cobertura divergente do total de valores: {divergentes}')
    print(f'Geometrias inválidas ou fora de EPSG:4674: {invalidas}')
    tamanho = conn.execute(
        "SELECT pg_size_pretty(sum(pg_total_relation_size(c.oid))) AS t FROM pg_class c "
        "JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='base_municipal'").fetchone()['t']
    print(f'Tamanho do schema: {tamanho}')
    return 1 if (orfas or divergentes or invalidas) else 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Carrega o schema base_municipal.')
    parser.add_argument('--recarregar', action='store_true',
                        help='Substitui o conteúdo existente do schema.')
    parser.add_argument('--conferir', action='store_true',
                        help='Apenas confere o que já está carregado.')
    args = parser.parse_args()

    with conectar() as conn:
        if conn.execute("SELECT to_regclass('base_municipal.observacao') AS t").fetchone()['t'] is None:
            raise SystemExit('Aplique database/106_base_municipal.sql antes de carregar.')
        if args.conferir:
            return conferir(conn)
        numeros = contagens(conn)
        if numeros['observacao'] and not args.recarregar:
            print(f'Schema já populado ({numeros}). Use --recarregar para substituir.')
            return conferir(conn)
        print('Carregando base_municipal...')
        carregar(conn)
        conn.commit()
        conn.execute('ANALYZE base_municipal.observacao')
        conn.execute('ANALYZE base_municipal.atributo')
        conn.execute('ANALYZE base_municipal.municipio')
        conn.commit()
        return conferir(conn)


if __name__ == '__main__':
    raise SystemExit(main())
