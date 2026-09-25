"""Join conservativo e documentos do pacote, compartilhados com o SICARD."""
from datetime import datetime, timezone
import json

import geopandas as gpd
import numpy as np
import pandas as pd
from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell


def join_attributes(frame, columns):
    """A malha à esquerda define o universo; nunca preencher ausências com zero."""
    if not frame.index.is_unique or not frame.index.to_series().str.fullmatch(r'\d{7}').all():
        raise ValueError('Códigos municipais da malha inválidos ou repetidos.')
    diagnostics = {}
    for field, series in columns.items():
        if not series.index.is_unique:
            raise ValueError(f'Observações municipais repetidas no campo {field}.')
        aligned = series.reindex(frame.index)
        diagnostics[field] = {
            'observacoes_lidas': len(series),
            'codigos_correspondentes': int(frame.index.isin(series.index).sum()),
            'sem_observacao': int((~frame.index.isin(series.index)).sum()),
            'com_valor': int(aligned.notna().sum()),
            'sem_valor': int(aligned.isna().sum()),
            'observacoes_nulas_na_malha': int(series.reindex(frame.index.intersection(series.index)).isna().sum()),
            'zeros': int(aligned.eq(0).sum()),
            'codigos_fora_da_malha': sorted(str(c) for c in series.index.difference(frame.index)),
        }
    result = frame.join(pd.DataFrame(columns), how='left', validate='one_to_one').reset_index()
    if len(result) != len(frame) or result.CD_MUN.tolist() != frame.index.tolist():
        raise ValueError('O join alterou o universo municipal da malha.')
    result.attrs['join'] = {'tipo': 'LEFT JOIN', 'chave': 'CD_MUN', 'feicoes_entrada': len(frame),
                            'feicoes_saida': len(result), 'campos': diagnostics}
    return result


def reopen_and_validate(path, expected):
    """Recusa perda/duplicação de feições, valores ou geometrias na gravação."""
    actual = gpd.read_file(path)
    if len(actual) != len(expected) or not actual.CD_MUN.is_unique:
        raise ValueError('A exportação alterou a quantidade de feições da malha.')
    if set(actual.CD_MUN) != set(expected.CD_MUN) or actual.crs != expected.crs:
        raise ValueError('A exportação alterou códigos municipais ou CRS.')
    left = expected.set_index('CD_MUN').sort_index()
    right = actual.set_index('CD_MUN').sort_index()
    for name in left.columns:
        if name not in right:
            raise ValueError(f'Campo ausente na exportação: {name}.')
        if name == expected.geometry.name:
            same = left.geometry.geom_equals(right.geometry) | (left.geometry.isna() & right.geometry.isna())
        elif pd.api.types.is_numeric_dtype(left[name]):
            same = np.isclose(left[name].to_numpy(dtype=float), right[name].to_numpy(dtype=float),
                              rtol=1e-12, atol=1e-12, equal_nan=True)
        else:
            same = left[name].eq(right[name]) | (left[name].isna() & right[name].isna())
        if not np.all(same):
            raise ValueError(f'Valores ou geometrias divergentes após exportar: {name}.')
    return actual


def write_tables_and_report(folder, base, actual, manifest, controle=None, metadata_name=None):
    """Tabelas derivadas do arquivo reaberto: mesmos nomes, valores e registros."""
    table = actual.drop(columns=actual.geometry.name)
    if controle:
        controle.mensagem('Gerando tabela de atributos em CSV, XLSX e TXT e relatório do join')
    table.to_csv(folder / f'{base}_atributos.csv', index=False, encoding='utf-8-sig', na_rep='')
    table.to_csv(folder / f'{base}_atributos.txt', index=False, encoding='utf-8', sep='\t', na_rep='')
    # Modo streaming evita materializar milhões de células simultaneamente.
    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet('Atributos')
    sheet.append([_excel_cell(sheet, v) for v in table.columns])
    for index, row in enumerate(table.itertuples(index=False, name=None), 1):
        sheet.append([_excel_cell(sheet, v) for v in row])
        if controle and (index % 25 == 0 or index == len(table)):
            controle.tarefa(index, len(table))
    workbook.save(folder / f'{base}_atributos.xlsx')
    join = manifest['join']
    manifest['gerado_em_utc'] = datetime.now(timezone.utc).isoformat()
    manifest['validacao_reabertura'] = 'Contagem, códigos, CRS, geometrias, campos, valores e nulos conferidos.'
    lines = ['RELATÓRIO DE PROCESSAMENTO — JOIN MUNICIPAL',
             f"Gerado em UTC: {manifest['gerado_em_utc']}",
             f"Malha: {manifest['geometry_source']}; ano: {manifest['geometry_year']}; CRS: {manifest['crs']}",
             f"Formato: {manifest['format']}; arquivo: {base}.{manifest['format']}",
             'Método: LEFT JOIN por CD_MUN (texto de sete dígitos), sem recorte ou filtro de cobertura.',
             f"Feições de entrada: {join['feicoes_entrada']}; feições de saída: {len(actual)}",
             f"Indicadores selecionados: {len(manifest['attributes'])}",
             'Municípios sem observação ou com valor nulo permanecem na camada.',
             'Ausências são nulas na camada e células vazias nas tabelas. Zero é preservado.',
             'Anos, unidades e multiplicadores preservados; não há estimativa ou preenchimento.',
             manifest['validacao_reabertura'],
             'CSV: UTF-8 com BOM, vírgula; TXT: UTF-8, tabulação; XLSX: códigos como texto.',
             'Tabelas sem geometria, derivadas da camada reaberta. Ordem dos registros pode variar por formato.',
             '', 'DIAGNÓSTICO POR INDICADOR']
    for item in manifest['attributes']:
        lines.extend([f"\nID: {item['id']}; campo bruto: {item['field']}; exportado: {item['export_field']}",
                      f"Alias: {item.get('alias', item['label'])}",
                      f"Fonte: {item['source']}; tema: {item['theme']}; ano: {item['year']}; unidade: {item.get('unit') or ''}",
                      f"Referência: {item.get('url') or ''}; cobertura informada no catálogo: {item.get('coverage')}",
                      json.dumps(join['campos'][item['field']], ensure_ascii=False)])
    lines.extend(['', 'ARQUIVOS DO PACOTE'])
    names = sorted({p.name for p in folder.iterdir()} | {f'{base}_relatorio_join.txt', metadata_name or f'{base}_metadados.json'})
    manifest['arquivos'] = names
    lines.extend(names)
    (folder / f'{base}_relatorio_join.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')


def _excel_cell(sheet, value):
    if pd.isna(value):
        return None
    cell = WriteOnlyCell(sheet, value=value)
    if isinstance(value, str):
        cell.data_type = 's'  # Código e texto literal, inclusive quando começa por '='.
    return cell
