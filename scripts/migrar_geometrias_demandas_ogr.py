"""Migração manual dos cadastros existentes; simulação com rollback por padrão."""
import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import psycopg
from osgeo import ogr
from api.config import get_settings
from api.services.normalizacao_demanda import normalizar, reprojetar
from api.services import storage_remoto

TABLES = ('plano', 'programa', 'projeto', 'projeto_geometria_historico')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--aplicar', action='store_true')
    args = parser.parse_args()
    settings = get_settings()
    snapshot, report = {}, {}
    with psycopg.connect(settings.slt_database_url, connect_timeout=10) as conn:
        conn.execute("SET LOCAL lock_timeout = '10s'")
        conn.execute("SET LOCAL statement_timeout = '120s'")
        conn.execute('LOCK TABLE ' + ', '.join('demandas.' + t for t in TABLES) + ' IN ACCESS EXCLUSIVE MODE')
        for table in TABLES:
            rows = conn.execute(f'SELECT id, ST_SRID(geometria), encode(ST_AsEWKB(geometria),\'hex\'), ST_AsBinary(geometria) FROM demandas.{table} WHERE geometria IS NOT NULL ORDER BY id').fetchall()
            snapshot[table] = [{'id': str(i), 'srid': srid, 'ewkb': ewkb} for i, srid, ewkb, wkb in rows]
            converted = []
            buffered = 0
            for i, srid, ewkb, wkb in rows:
                source = ogr.CreateGeometryFromWkb(bytes(wkb))
                kind = ogr.GT_Flatten(source.GetGeometryType())
                # Histórico preserva a geometria da versão; buffers apenas no cadastro atual.
                if table != 'projeto_geometria_historico' and kind in (ogr.wkbPoint, ogr.wkbMultiPoint, ogr.wkbLineString, ogr.wkbMultiLineString):
                    target = ogr.CreateGeometryFromJson(json.dumps(normalizar(json.loads(source.ExportToJson()), crs_origem=srid)))
                    buffered += 1
                else:
                    target = reprojetar(source, srid, 4674)
                if target.IsEmpty() or not target.IsValid():
                    raise ValueError(f'{table}: geometria inválida após conversão')
                converted.append((i, bytes(target.ExportToWkb()), json.loads(target.ExportToJson())['type']))
            report[table] = {'geometrias': len(rows), 'buffers': buffered}
            # Retira somente o typmod; todas as coordenadas são transformadas pelo OGR.
            conn.execute(f'ALTER TABLE demandas.{table} ALTER COLUMN geometria TYPE geometry USING geometria::geometry')
            for i, wkb, kind in converted:
                extra = ', geometria_tipo = %s' if table in ('projeto', 'projeto_geometria_historico') else ''
                params = (wkb, kind, i) if extra else (wkb, i)
                conn.execute(f'UPDATE demandas.{table} SET geometria = ST_SetSRID(ST_GeomFromWKB(%s),4674){extra} WHERE id = %s', params)
            conn.execute(f'ALTER TABLE demandas.{table} ALTER COLUMN geometria TYPE geometry(Geometry,4674) USING geometria::geometry(Geometry,4674)')
            invalid = conn.execute(f'SELECT count(*) FROM demandas.{table} WHERE geometria IS NOT NULL AND (ST_SRID(geometria) <> 4674 OR NOT ST_IsValid(geometria) OR ST_IsEmpty(geometria))').fetchone()[0]
            if invalid:
                raise ValueError(f'{table}: validação final falhou')
        if args.aplicar:
            folder = Path('outputs/migracao-demandas')
            folder.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            name = f'{stamp}-{uuid4().hex}.json'
            path = folder / name
            payload = json.dumps({'crs_destino':4674, 'crs_calculo':5880, 'motor':'GDAL/OGR', 'anteriores':snapshot, 'resultado':report}, ensure_ascii=False).encode()
            path.write_bytes(payload)
            destination = 'demandas/migracoes/' + name
            storage_remoto.enviar(destination, path)
            if storage_remoto.baixar(destination) != payload:
                raise ValueError('Backup no Storage não confere; transação cancelada')
            print(json.dumps({'backup_storage':destination, 'sha256':hashlib.sha256(payload).hexdigest()}))
            conn.commit()
        else:
            conn.rollback()
        print(json.dumps({'aplicado': args.aplicar, 'resultado':report}))


if __name__ == '__main__':
    main()
