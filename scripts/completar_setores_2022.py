"""Completa os agregados oficiais de 2022, sem desagregar dados municipais.

Uso: python scripts/completar_setores_2022.py --insumos DIRETORIO [--aplicar]
Cada arquivo e validado antes da escrita e aplicado em transacao independente.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
import requests

from api.config import get_settings
from scripts.fontes_setoriais_2022 import BASE, DICIONARIO, ENTORNO, FONTES, RENDA, url_fonte
from scripts.preparar_catalogo_territorial import (
    identificador, materializar_setores, numero, registrar_fonte,
)

COLUNAS_NASCIMENTO = {
    'Domicílios Particulares Permanentes Ocupados': ('registro_nascimento_dppo', 'Domicilios'),
    'Total de pessoas': ('registro_nascimento_populacao', 'Pessoas'),
    'Pessoas de até 5 anos': ('registro_nascimento_ate_5', 'Pessoas'),
    'Do cartório': ('registro_nascimento_cartorio', 'Pessoas'),
    'Registro Administrativo de Nascimento Indígena (RANI)': ('registro_nascimento_rani', 'Pessoas'),
    'Não tem': ('registro_nascimento_sem_registro', 'Pessoas'),
    'Não sabe': ('registro_nascimento_nao_sabe', 'Pessoas'),
    'Ignorado': ('registro_nascimento_ignorado', 'Pessoas'),
}


def baixar(folder, file, url):
    path = folder / file
    if not path.exists():
        print(f'Obtendo {file}...', flush=True)
        partial = path.with_suffix(path.suffix + '.part')
        with requests.get(url, stream=True, timeout=(10, 180)) as response:
            response.raise_for_status()
            with partial.open('wb') as stream:
                for block in response.iter_content(1024 * 1024):
                    stream.write(block)
        partial.replace(path)
    return path


def baixar_bytes(url):
    with requests.get(url, timeout=(10, 180)) as response:
        response.raise_for_status()
        return response.content


def ler_dicionarios(content, url, result):
    book = pd.ExcelFile(io.BytesIO(content))
    for sheet in book.sheet_names:
        frame = pd.read_excel(book, sheet_name=sheet).fillna('')
        for row in frame.itertuples(index=False, name=None):
            if len(row) < 2:
                continue
            key, description = map(str, row[-2:])
            if not re.fullmatch(r'V\d{4,5}', key):
                continue
            if key in result:
                raise ValueError(f'Codigo repetido entre dicionarios: {key}.')
            result[key] = {'descricao': description, 'dicionario': url,
                           'tipo': str(row[0]) if len(row) == 4 else ''}


def preparar_dicionarios(folder):
    result, paths = {}, []
    for file, url in [
        (DICIONARIO, BASE + DICIONARIO),
        ('dicionario_de_dados_renda_responsavel_20260508.xlsx',
         RENDA + 'dicionario_de_dados_renda_responsavel_20260508.xlsx'),
        ('dicionarios_de_dados_entorno.zip', ENTORNO + 'dicionarios_de_dados_entorno.zip'),
    ]:
        path = baixar(folder, file, url)
        paths.append((path, url))
        if path.suffix == '.zip':
            with zipfile.ZipFile(path) as archive:
                for member in archive.namelist():
                    if member.endswith('.xlsx'):
                        ler_dicionarios(archive.read(member), url, result)
        else:
            ler_dicionarios(path.read_bytes(), url, result)
    return result, paths


def preparar_dicionarios_memoria():
    result, sources = {}, []
    for file, url in [
        (DICIONARIO, BASE + DICIONARIO),
        ('dicionario_de_dados_renda_responsavel_20260508.xlsx',
         RENDA + 'dicionario_de_dados_renda_responsavel_20260508.xlsx'),
        ('dicionarios_de_dados_entorno.zip', ENTORNO + 'dicionarios_de_dados_entorno.zip'),
    ]:
        content = baixar_bytes(url)
        sources.append((content, url))
        if file.endswith('.zip'):
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                for member in archive.namelist():
                    if member.endswith('.xlsx'):
                        ler_dicionarios(archive.read(member), url, result)
        else:
            ler_dicionarios(content, url, result)
    return result, sources


@contextmanager
def abrir_csv(path, name=None):
    filename = path.name if isinstance(path, Path) else next(
        file for source, file, _ in FONTES if source == name
    )
    if filename.lower().endswith('.zip'):
        binary_source = path.open('rb') if isinstance(path, Path) else io.BytesIO(path)
        with binary_source, zipfile.ZipFile(binary_source) as archive:
            members = [n for n in archive.namelist() if n.lower().endswith('.csv')]
            if len(members) != 1:
                raise ValueError(f'CSV ambiguo: {filename}.')
            with archive.open(members[0]) as binary:
                encoding = 'cp1252' if '_basico_' in filename else 'utf-8-sig'
                with io.TextIOWrapper(binary, encoding=encoding) as stream:
                    yield csv.DictReader(stream, delimiter=';')
    else:
        text_source = path.open(encoding='cp1252', newline='') if isinstance(path, Path) else io.TextIOWrapper(
            io.BytesIO(path), encoding='cp1252', newline=''
        )
        with text_source as stream:
            next(stream)  # Titulo acima do cabecalho no arquivo oficial.
            yield csv.DictReader(stream, delimiter=';')


def campos_csv(reader, name, descriptions):
    headers = reader.fieldnames or []
    code = 'Setor Censitário' if name == 'registro_nascimento' else next(
        (key for key in headers if key.lower() in ('cd_setor', 'setor', 'cod_setor_m22final')), None)
    if code not in headers:
        raise ValueError(f'Coluna de setor ausente: {name}.')
    if name == 'registro_nascimento':
        if not set(COLUNAS_NASCIMENTO).issubset(headers):
            raise ValueError('Cabecalho de registro de nascimento alterado.')
        return code, dict(COLUNAS_NASCIMENTO)
    fields = [key for key in headers if re.fullmatch(r'V\d{4,5}', key, re.IGNORECASE)]
    missing = {key.upper() for key in fields} - descriptions.keys()
    if not fields or missing:
        raise ValueError(f'Campos sem dicionario: {name}: {missing}.')
    unknown = [key for key in headers if key.upper().startswith('V') and key not in fields]
    if unknown:
        raise ValueError(f'Colunas de valores nao reconhecidas: {unknown}.')
    return code, {key: (key.lower() if name == 'basico' else key, None) for key in fields}


def linhas_sp(reader, code_key, fields, codes):
    seen = set()
    for row in reader:
        code = row[code_key].strip()
        if not code.startswith('35'):
            continue
        if code not in codes or code in seen:
            raise ValueError(f'Setor fora da malha ou repetido: {code}.')
        seen.add(code)
        values, signals = {}, {}
        for column, (key, _) in fields.items():
            raw = row[column].strip()
            values[key] = numero(raw)
            if values[key] is None:
                signals[key] = raw
        yield code, values, signals


def unidade(name, key, description, tipo):
    if name == 'basico':
        return {'V0001': 'Pessoas', 'V0005': 'moradores/domicilio', 'V0006': '%'}.get(key, 'Domicilios')
    if name == 'renda':
        return {'V06001': 'Pessoas', 'V06002': 'Pessoas', 'V06003': 'Pessoas²',
                'V06004': 'R$', 'V06005': 'R$²', 'V06006': 'R$'}[key]
    if name == 'entorno_faces':
        return 'Faces'
    if name == 'entorno_domicilios':
        return 'Domicilios'
    if name == 'obitos' and key in ('V01224', 'V01225'):
        return 'Domicilios'
    if name == 'entorno_moradores' or tipo in ('Pessoas', 'Mortalidade'):
        return 'Pessoas'
    text = description.lower()
    if 'quantidade de' in text or 'moradores indígenas' in text or 'moradores quilombolas' in text:
        return 'Pessoas'
    if text.startswith('unidades de habita'):
        return 'Unidades de habitacao'
    return 'Domicilios'


def aplicar_fonte(conn, path, name, theme, url, descriptions, codes, dictionaries, only_keys=None):
    with abrir_csv(path, name) as reader:
        code_key, fields = campos_csv(reader, name, descriptions)
        if only_keys is not None:
            fields = {column: value for column, value in fields.items() if value[0] in only_keys}
            found = {value[0] for value in fields.values()}
            if found != set(only_keys):
                raise ValueError(f'Campos solicitados não encontrados em {name}: {set(only_keys) - found}.')
        keys = [key for key, _ in fields.values()]
        if len(set(keys)) != len(keys):
            raise ValueError(f'Chaves repetidas: {name}.')
        conn.execute("SET LOCAL statement_timeout='600s'")
        conn.execute("SET LOCAL lock_timeout='5s'")
        conn.execute("SELECT pg_advisory_xact_lock(hashtext('sicard-catalogo-territorial'))")
        conn.execute('CREATE TEMP TABLE entrada_completa(codigo text PRIMARY KEY,valores jsonb,sinais jsonb) ON COMMIT DROP')
        coverage = dict.fromkeys(keys, 0)
        total = suppressed = 0
        with conn.cursor().copy('COPY entrada_completa FROM STDIN') as copy:
            copy.set_types(['text', 'jsonb', 'jsonb'])
            for code, values, signals in linhas_sp(reader, code_key, fields, codes):
                total += 1
                suppressed += sum(value.upper() == 'X' for value in signals.values())
                for key, value in values.items():
                    coverage[key] += value is not None
                copy.write_row((code, Jsonb(values), Jsonb(signals)))
        if not total:
            raise ValueError(f'Nenhum setor SP: {name}.')
        ordered = sorted(codes)
        for offset in range(0, len(ordered), 2000):
            batch = ordered[offset:offset + 2000]
            conn.execute('''UPDATE base_territorial.setor s
                SET valores=(s.valores - %s::text[]) || coalesce(e.valores,'{}'::jsonb),
                    sinais=(s.sinais - %s::text[]) || coalesce(e.sinais,'{}'::jsonb)
                FROM (SELECT s0.cd_setor,e0.valores,e0.sinais FROM base_territorial.setor s0
                    LEFT JOIN entrada_completa e0 ON e0.codigo=s0.cd_setor
                    WHERE s0.cd_setor=ANY(%s)) e
                WHERE s.cd_setor=e.cd_setor''', (keys, keys, batch))
            if offset % 20000 == 0:
                print(f'{name}: {offset + len(batch)}/{len(ordered)} setores gravados na transacao.', flush=True)
        # Verifica todos os valores/sinais escritos, nao apenas contagens de linhas.
        mismatch = conn.execute('''SELECT count(*) AS n FROM entrada_completa e
            JOIN base_territorial.setor s ON s.cd_setor=e.codigo
            WHERE NOT s.valores @> e.valores OR NOT s.sinais @> e.sinais''').fetchone()['n']
        if mismatch:
            raise ValueError(f'Valores persistidos divergem do CSV: {name}: {mismatch}.')
        stale = conn.execute('''SELECT count(*) AS n FROM base_territorial.setor s
            LEFT JOIN entrada_completa e ON e.codigo=s.cd_setor
            WHERE e.codigo IS NULL AND (s.valores ?| %s::text[] OR s.sinais ?| %s::text[])''',
            (keys, keys)).fetchone()['n']
        if stale:
            raise ValueError(f'Setores ausentes no CSV conservaram valores antigos: {name}: {stale}.')
        digest = registrar_fonte(conn, path, url)
        for dictionary, dictionary_url in dictionaries:
            registrar_fonte(conn, dictionary, dictionary_url)
        entries = []
        for column, (key, declared_unit) in fields.items():
            info = descriptions.get(column.upper(), {})
            description = info.get('descricao', column)
            if name == 'registro_nascimento' and column not in list(COLUNAS_NASCIMENTO)[:3]:
                description = f'Pessoas de ate 5 anos - registro de nascimento: {column}'
            field = f'setor_{key}_2022'
            detail = {'origem_valor': 'originais', 'campo_original': column,
                      'definicao': description, 'dicionario': info.get('dicionario', url),
                      'sha256': digest, 'conjunto': name, 'registros_fonte_sp': total,
                      'sigilos_x_conjunto': suppressed,
                      'setores_sem_linha': len(codes) - total,
                      'nota': 'Publicado pelo IBGE por setor, referencia 2022. Ausencias e sigilos preservados; sem desagregacao municipal. Data de divulgacao nao altera o ano de referencia.'}
            entry_theme = '01_populacao' if name == 'basico' and column.upper() == 'V0001' else theme
            entries.append((identificador(field), field, key, entry_theme, description,
                            declared_unit or unidade(name, column.upper(), description, info.get('tipo', '')),
                            url, Jsonb(detail), coverage[key]))
        conn.cursor().executemany('''INSERT INTO base_territorial.atributo_setorial
            (id,campo,chave,origem,fonte,ano,tema,rotulo,unidade,url,detalhe,cobertura)
            VALUES (%s,%s,%s,'originais','IBGE / Censo 2022 - setores',2022,%s,%s,%s,%s,%s,%s)
            ON CONFLICT(id) DO UPDATE SET tema=EXCLUDED.tema,rotulo=EXCLUDED.rotulo,
                unidade=EXCLUDED.unidade,url=EXCLUDED.url,detalhe=EXCLUDED.detalhe,cobertura=EXCLUDED.cobertura''', entries)
        print(f'{name}: {len(fields)} campos, {total} setores, {suppressed} sigilos X; valores conferidos.', flush=True)
        return {'conjunto': name, 'url': url, 'sha256': digest, 'campos': len(fields),
                'setores': total, 'sigilos_x': suppressed, 'coberturas': coverage}


def assinatura_malha(conn):
    return dict(conn.execute('''SELECT count(*) AS setores,sum(partes) AS partes,
        md5(string_agg(md5(ST_AsEWKB(geom)::text),'' ORDER BY cd_setor)) AS geometria_md5_controle
        FROM base_territorial.setor''').fetchone())


@contextmanager
def conexao_exclusiva(aplicar):
    with psycopg.connect(get_settings().slt_database_url, connect_timeout=7,
                         row_factory=dict_row, autocommit=True) as conn:
        if aplicar:
            acquired = conn.execute(
                "SELECT pg_try_advisory_lock(hashtext('sicard-catalogo-territorial')) AS adquirido"
            ).fetchone()['adquirido']
            if not acquired:
                raise RuntimeError('Outra carga territorial esta em andamento; nenhuma escrita iniciada.')
        else:
            conn.execute('SET default_transaction_read_only = on')
        yield conn


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--insumos', type=Path, required=True)
    parser.add_argument('--aplicar', action='store_true')
    parser.add_argument('--relatorio', type=Path)
    parser.add_argument('--retomar', action='store_true',
                        help='Reutiliza somente conjuntos ja confirmados com o mesmo SHA-256 e campos.')
    args = parser.parse_args()
    with conexao_exclusiva(args.aplicar) as conn:
        executar(args, conn)


def executar(args, conn):
    args.insumos.mkdir(parents=True, exist_ok=True)
    descriptions, dictionaries = preparar_dicionarios(args.insumos)
    with conn.transaction():
        codes = {row['cd_setor'] for row in conn.execute('SELECT cd_setor FROM base_territorial.setor')}
        geometry = assinatura_malha(conn)
        previous_ids = {row['id'] for row in conn.execute('SELECT id FROM base_territorial.atributo_setorial')}
    if len(codes) != 103319:
        raise ValueError('Malha oficial de SP 2022 incompleta.')
    report, seen, prepared = [], set(), []
    for name, file, theme in FONTES:
        url = url_fonte(name, file)
        path = baixar(args.insumos, file, url)
        with abrir_csv(path) as reader:
            _, fields = campos_csv(reader, name, descriptions)
            keys = {key for key, _ in fields.values()}
            if seen & keys:
                raise ValueError(f'Colisao de variaveis entre fontes: {seen & keys}.')
            seen.update(keys)
        prepared.append((name, path, theme, url))
    expected = {key.lower() if len(key) == 5 else key for key in descriptions}
    missing = expected - seen
    if missing:
        raise ValueError(f'Campos do dicionario nao encontrados nas fontes: {sorted(missing)}.')
    for name, path, theme, url in prepared:
        if args.aplicar:
            with conn.transaction():
                if args.retomar:
                    with path.open('rb') as stream:
                        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
                    previous = conn.execute('''SELECT chave,cobertura,detalhe
                        FROM base_territorial.atributo_setorial
                        WHERE origem='originais' AND detalhe->>'conjunto'=%s''', (name,)).fetchall()
                    with abrir_csv(path) as reader:
                        _, current = campos_csv(reader, name, descriptions)
                    keys = {key for key, _ in current.values()}
                    if (len(previous) == len(keys) and {row['chave'] for row in previous} == keys
                            and all(row['detalhe'].get('sha256') == digest for row in previous)):
                        info = previous[0]['detalhe']
                        report.append({'conjunto': name, 'url': url, 'sha256': digest,
                            'campos': len(keys), 'setores': info['registros_fonte_sp'],
                            'sigilos_x': info['sigilos_x_conjunto'],
                            'coberturas': {row['chave']: row['cobertura'] for row in previous}})
                        print(f'{name}: transacao anterior confirmada, mesmo SHA-256 e campos.', flush=True)
                        continue
                print(f'Aplicando {name}...', flush=True)
                report.append(aplicar_fonte(conn, path, name, theme, url, descriptions, codes, dictionaries))
        else:
            with abrir_csv(path) as reader:
                code_key, fields = campos_csv(reader, name, descriptions)
                count = sum(1 for _ in linhas_sp(reader, code_key, fields, codes))
            print(f'{name}: {len(fields)} campos, {count} setores validados; sem escrita.', flush=True)
    if args.aplicar:
        with conn.transaction():
            conn.execute("SET LOCAL statement_timeout='600s'")
            conn.execute("SELECT pg_advisory_xact_lock(hashtext('sicard-catalogo-territorial'))")
            materializar_setores(conn)
            if assinatura_malha(conn) != geometry:
                raise ValueError('Geometria ou contagens da malha foram alteradas.')
            actual_ids = {row['id'] for row in conn.execute('SELECT id FROM base_territorial.atributo_setorial')}
            if not previous_ids.issubset(actual_ids) or len(actual_ids) != len(seen) + 10:
                raise ValueError('Catalogo final diverge dos campos validados ou perdeu IDs anteriores.')
            conn.execute('ANALYZE base_territorial.setor')
            conn.execute('ANALYZE base_territorial.atributo_setorial')
        if args.relatorio:
            args.relatorio.write_text(json.dumps({'referencia': 2022, 'conjuntos': report,
                'campos_originais': len(seen), 'malha_preservada': True,
                'assinatura_malha': geometry, 'ids_anteriores_preservados': len(previous_ids)},
                ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'Carga completa: {len(seen)} originais em {len(report)} conjuntos; combinados recalculados.', flush=True)


if __name__ == '__main__':
    main()
