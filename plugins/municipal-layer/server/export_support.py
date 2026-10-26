"""Join conservativo e documentos do pacote, compartilhados com o SICARD."""
from datetime import datetime, timezone
from io import BytesIO
import json

import geopandas as gpd
import numpy as np
import pandas as pd
from openpyxl import Workbook
from openpyxl.cell import WriteOnlyCell


def join_attributes(frame, columns, key='CD_MUN'):
    """A malha à esquerda define o universo; nunca preencher ausências com zero."""
    pattern = r'\d{15}' if key == 'CD_SETOR' else r'\d{7}'
    if not frame.index.is_unique or not frame.index.to_series().str.fullmatch(pattern).all():
        raise ValueError('Códigos territoriais da malha inválidos ou repetidos.')
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
    if len(result) != len(frame) or result[key].tolist() != frame.index.tolist():
        raise ValueError('O join alterou o universo territorial da malha.')
    result.attrs['join'] = {'tipo': 'LEFT JOIN', 'chave': key, 'feicoes_entrada': len(frame),
                            'feicoes_saida': len(result), 'campos': diagnostics}
    return result


def reopen_and_validate(path, expected):
    """Recusa perda/duplicação de feições, valores ou geometrias na gravação."""
    actual = gpd.read_file(path)
    return validate_layer(actual, expected)


def validate_layer(actual, expected):
    """Confere também camadas reabertas de buffers, sem materialização local."""
    key = 'CD_SETOR' if 'CD_SETOR' in expected else 'CD_MUN'
    if len(actual) != len(expected) or not actual[key].is_unique:
        raise ValueError('A exportação alterou a quantidade de feições da malha.')
    if set(actual[key]) != set(expected[key]) or actual.crs != expected.crs:
        raise ValueError('A exportação alterou códigos municipais ou CRS.')
    left = expected.set_index(key).sort_index()
    right = actual.set_index(key).sort_index()
    for name in left.columns:
        if name not in right:
            raise ValueError(f'Campo ausente na exportação: {name}.')
        if name == expected.geometry.name:
            import shapely
            # A malha oficial contem geometrias invalidas; identidade normalizada
            # permite valida-las sem reparo implicito nem predicado topologico.
            same = pd.Series(shapely.equals_exact(shapely.normalize(left.geometry.array),
                                                 shapely.normalize(right.geometry.array), tolerance=0),
                             index=left.index)
            valid = left.geometry.is_valid & right.geometry.is_valid
            same.loc[valid] = left.geometry[valid].geom_equals(right.geometry[valid])
            same |= left.geometry.isna() & right.geometry.isna()
        elif pd.api.types.is_numeric_dtype(left[name]):
            same = np.isclose(left[name].to_numpy(dtype=float), right[name].to_numpy(dtype=float),
                              rtol=1e-12, atol=1e-12, equal_nan=True)
        else:
            same = left[name].eq(right[name]) | (left[name].isna() & right[name].isna())
        if not np.all(same):
            raise ValueError(f'Valores ou geometrias divergentes após exportar: {name}.')
    return actual


def write_tables_and_report(folder, base, actual, manifest, controle=None, metadata_name=None, *, components=None):
    """Tabelas derivadas do arquivo reaberto, com correspondencia de cabecalhos."""
    def write_text(name, text, encoding='utf-8'):
        if components is None:
            (folder / name).write_text(text, encoding=encoding)
        else:
            components[name] = text.encode(encoding)

    table = actual.drop(columns=actual.geometry.name)
    if manifest.get('aliases_nas_tabelas'):
        table = table.rename(columns=manifest['aliases'])
        if not table.columns.is_unique:
            raise ValueError('Aliases repetidos nos cabecalhos das tabelas exportadas.')
    if controle:
        controle.mensagem('Gerando tabela de atributos em CSV, XLSX e TXT e relatório do join')
    if components is None:
        table.to_csv(folder / f'{base}_atributos.csv', index=False, encoding='utf-8-sig', na_rep='')
        table.to_csv(folder / f'{base}_atributos.txt', index=False, encoding='utf-8', sep='\t', na_rep='')
    else:
        write_text(f'{base}_atributos.csv', table.to_csv(index=False, na_rep=''), 'utf-8-sig')
        write_text(f'{base}_atributos.txt', table.to_csv(index=False, sep='\t', na_rep=''))
    # Modo streaming evita materializar milhões de células simultaneamente.
    workbook = Workbook(write_only=components is None)
    sheet = workbook.create_sheet('Atributos') if components is None else workbook.active
    sheet.title = 'Atributos'
    sheet.append([_excel_cell(sheet, v) for v in table.columns])
    for index, row in enumerate(table.itertuples(index=False, name=None), 1):
        sheet.append([_excel_cell(sheet, v) for v in row])
        if controle and (index % 25 == 0 or index == len(table)):
            controle.tarefa(index, len(table))
    if components is None:
        workbook.save(folder / f'{base}_atributos.xlsx')
    else:
        output = BytesIO()
        workbook.save(output)
        components[f'{base}_atributos.xlsx'] = output.getvalue()
    workbook.close()
    join = manifest['join']
    manifest['gerado_em_utc'] = datetime.now(timezone.utc).isoformat()
    manifest['validacao_reabertura'] = 'Contagem, códigos, CRS, geometrias, campos, valores e nulos conferidos.'
    key = join['chave']
    lines = ['RELATÓRIO DE PROCESSAMENTO — JOIN TERRITORIAL',
             f"Gerado em UTC: {manifest['gerado_em_utc']}",
             f"Malha: {manifest['geometry_source']}; ano: {manifest['geometry_year']}; CRS: {manifest['crs']}",
             f"Formato: {manifest['format']}; arquivo: {base}.{manifest['format']}",
             f'Método: LEFT JOIN por {key}, sem recorte ou filtro de cobertura.',
             f"Feições de entrada: {join['feicoes_entrada']}; feições de saída: {len(actual)}",
             f"Indicadores selecionados: {len(manifest['attributes'])}",
             'Unidades territoriais sem observação ou com valor nulo permanecem na camada.',
             'Ausências são nulas na camada e células vazias nas tabelas. Zero é preservado.',
             'Anos, unidades e multiplicadores preservados; não há estimativa ou preenchimento.',
             manifest['validacao_reabertura'],
             'CSV: UTF-8 com BOM, vírgula; TXT: UTF-8, tabulação; XLSX: códigos como texto.',
             'Tabelas sem geometria, derivadas da camada reaberta. Ordem dos registros pode variar por formato.',
             'Cabeçalhos dos indicadores: aliases.' if manifest.get('aliases_nas_tabelas')
             else 'Cabeçalhos dos indicadores: nomes dos campos exportados.',
             '', 'DIAGNÓSTICO POR INDICADOR']
    for item in manifest['attributes']:
        lines.extend([f"\nID: {item['id']}; campo bruto: {item['field']}; exportado: {item['export_field']}",
                      f"Alias: {item.get('alias', item['label'])}",
                      f"Fonte: {item['source']}; tema: {item['theme']}; ano: {item['year']}; unidade: {item.get('unit') or ''}",
                      f"Referência: {item.get('url') or ''}; cobertura informada no catálogo: {item.get('coverage')}",
                      json.dumps(join['campos'][item['field']], ensure_ascii=False)])
    lines.extend(['', 'ARQUIVOS DO PACOTE'])
    existing = {p.name for p in folder.iterdir()} if components is None else set(components)
    names = sorted(existing | {f'{base}_relatorio_join.txt', metadata_name or f'{base}_metadados.json'})
    manifest['arquivos'] = names
    lines.extend(names)
    write_text(f'{base}_relatorio_join.txt', '\n'.join(lines) + '\n')


def _excel_cell(sheet, value):
    if pd.isna(value):
        return None
    cell = WriteOnlyCell(sheet, value=value)
    if isinstance(value, str):
        cell.data_type = 's'  # Código e texto literal, inclusive quando começa por '='.
    return cell
