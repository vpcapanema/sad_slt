"""Arquivos da extração a partir da tabela de atributos da geometria de saída.

A tabela vem de extracao_atributos_saida: uma linha por interseção (ou por ponto),
campos da entrada com o nome original e, para cada categoria e camada base, os
campos da base e as medidas com o prefixo categoria__camada__. O CSV leva a
tabela como está; o XLSX agrupa as colunas por categoria e camada no cabeçalho.
Os relatórios PDF ficam em extracao_atributos_relatorios; quem monta o pacote é
extracao_atributos_pacote.
"""
import csv
import math

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

# Uma célula XLSX guarda no máximo 32.767 caracteres. O pacote é obrigatório, então
# o texto é cortado com aviso; o CSV do mesmo pacote leva o conteúdo completo.
LIMITE_CELULA_XLSX = 32767
AVISO_CORTE = ' … [texto completo no CSV do pacote]'
OPERACOES = {'intersection': 'Interseção', 'identity': 'Identidade'}
# Cor por categoria no cabeçalho do XLSX (tons claros, legíveis com texto escuro).
CORES_CATEGORIA = ['DCEAF7', 'FBE3D0', 'E6DAF0', 'D5ECEC', 'F6ECC9', 'DDEBD3', 'F2D6D6', 'E1E5EA']
COR_ENTRADA = 'E8EEF3'


def data_hora(valor):
    """ISO em UTC -> data e hora de São Paulo; texto que não for data passa como veio."""
    from datetime import datetime
    from zoneinfo import ZoneInfo
    try:
        return datetime.fromisoformat(str(valor)).astimezone(ZoneInfo('America/Sao_Paulo')).strftime('%d/%m/%Y %H:%M:%S')
    except ValueError:
        return str(valor)


def safe(value):
    # Evita que atributos externos sejam executados como fórmulas no Excel/CSV.
    if isinstance(value, str) and value.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')):
        return "'" + value
    return value


def celula_xlsx(value):
    value = safe(value)
    if isinstance(value, str) and len(value) > LIMITE_CELULA_XLSX:
        return value[:LIMITE_CELULA_XLSX - len(AVISO_CORTE)] + AVISO_CORTE
    return value


def _nulo(valor):
    """None, NaN e o vazio dos inteiros nullable (pd.NA)."""
    if valor is None or (isinstance(valor, float) and math.isnan(valor)):
        return True
    try:
        return bool(pd.isna(valor))
    except (TypeError, ValueError):
        return False


def colunas(tabela):
    return [coluna for coluna in tabela.columns if coluna != tabela.geometry.name]


def registros(tabela):
    """Linhas sem a geometria; valores ausentes viram None e escalares NumPy viram Python."""
    for linha in tabela[colunas(tabela)].to_dict('records'):
        yield {chave: (None if _nulo(valor) else (valor.item() if hasattr(valor, 'item') else valor))
               for chave, valor in linha.items()}


def texto(valor):
    """Valor para leitura em português: vírgula decimal, sem notação científica."""
    if valor is None:
        return ''
    if isinstance(valor, bool):
        return 'sim' if valor else 'não'
    if isinstance(valor, float):
        return f'{valor:.6f}'.rstrip('0').rstrip('.').replace('.', ',')
    return str(valor)


def escrever_csv(tabela, path):
    nomes = colunas(tabela)
    with open(path, 'w', newline='', encoding='utf-8-sig') as stream:
        escritor = csv.writer(stream, delimiter=';')
        escritor.writerow(nomes)
        for linha in registros(tabela):
            escritor.writerow([safe(linha[n]) if isinstance(linha[n], str) else texto(linha[n]) for n in nomes])


def blocos_de_colunas(estrutura):
    """[(categoria, camada, colunas)] na ordem das colunas da tabela."""
    blocos = [('Identificação', 'Identificação', estrutura['fixos']),
              ('Camada de entrada', 'Atributos da entrada', estrutura['entrada'])]
    blocos += [(g['categoria'], g['camada'], g['campos']) for g in estrutura['grupos']]
    return [bloco for bloco in blocos if bloco[2]]


def escrever_xlsx(tabela, estrutura, path):
    """Cabeçalho em três linhas: categoria, camada base e campo, com cor por categoria."""
    book = Workbook()
    sheet = book.active
    sheet.title = 'Tabela de atributos'
    linha_fina = Side(style='thin', color='9FB2C3')
    caixa = Border(left=linha_fina, right=linha_fina, top=linha_fina, bottom=linha_fina)
    categorias = list(dict.fromkeys(g['categoria'] for g in estrutura['grupos']))
    blocos = blocos_de_colunas(estrutura)
    nomes = [coluna for _, _, cols in blocos for coluna in cols]
    nomes += [coluna for coluna in colunas(tabela) if coluna not in nomes]

    def cor(categoria):
        return CORES_CATEGORIA[categorias.index(categoria) % len(CORES_CATEGORIA)] if categoria in categorias else COR_ENTRADA

    def cabecalho(linha, inicio, fim, valor, preenchimento, tamanho):
        celula = sheet.cell(row=linha, column=inicio, value=valor)
        celula.font = Font(bold=True, size=tamanho, color='173A53')
        celula.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        for coluna in range(inicio, fim + 1):
            alvo = sheet.cell(row=linha, column=coluna)
            alvo.fill = PatternFill('solid', fgColor=preenchimento)
            alvo.border = caixa
        if fim > inicio:
            sheet.merge_cells(start_row=linha, start_column=inicio, end_row=linha, end_column=fim)

    # Linha 1: categorias consecutivas numa célula só; linha 2: uma célula por camada base.
    coluna = 1
    trechos = []
    for categoria, camada, cols in blocos:
        inicio, fim = coluna, coluna + len(cols) - 1
        cabecalho(2, inicio, fim, camada, cor(categoria), 10)
        if trechos and trechos[-1][0] == categoria:
            trechos[-1][2] = fim
        else:
            trechos.append([categoria, inicio, fim])
        coluna = fim + 1
    for categoria, inicio, fim in trechos:
        cabecalho(1, inicio, fim, categoria, cor(categoria), 11)
    for indice, nome in enumerate(nomes, start=1):
        celula = sheet.cell(row=3, column=indice, value=nome)
        celula.font = Font(bold=True, size=9, color='173A53')
        celula.alignment = Alignment(vertical='center', wrap_text=True)
        celula.border = caixa
        sheet.column_dimensions[get_column_letter(indice)].width = min(max(len(nome) * 0.85, 12), 48)
    sheet.row_dimensions[3].height = 42
    for numero, linha in enumerate(registros(tabela), start=4):
        for indice, nome in enumerate(nomes, start=1):
            sheet.cell(row=numero, column=indice, value=celula_xlsx(linha.get(nome))).border = caixa
    sheet.freeze_panes = sheet.cell(row=4, column=len(estrutura['fixos']) + 1)
    sheet.auto_filter.ref = f'A3:{get_column_letter(max(len(nomes), 1))}{max(sheet.max_row, 3)}'
    book.save(path)

