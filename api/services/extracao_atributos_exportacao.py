"""Arquivos da extração a partir da tabela de atributos da geometria de saída.

A tabela vem de extracao_atributos_saida: uma linha por interseção (ou por ponto),
campos da entrada com o nome original e, para cada categoria e camada base, os
campos da base e as medidas com o prefixo categoria__camada__. O CSV leva a
tabela como está; o XLSX agrupa as colunas por categoria e camada no cabeçalho;
o relatório analítico traz o mapa, a tabela inteira e os recortes por categoria e
por camada base. Quem monta o pacote é extracao_atributos_pacote.
"""
import csv
import math
from xml.sax.saxutils import escape

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# Uma célula XLSX guarda no máximo 32.767 caracteres. O pacote é obrigatório, então
# o texto é cortado com aviso; o CSV do mesmo pacote leva o conteúdo completo.
LIMITE_CELULA_XLSX = 32767
AVISO_CORTE = ' … [texto completo no CSV do pacote]'
OPERACOES = {'intersection': 'Interseção', 'identity': 'Identidade'}
# Cor por categoria no cabeçalho do XLSX (tons claros, legíveis com texto escuro).
CORES_CATEGORIA = ['DCEAF7', 'FBE3D0', 'E6DAF0', 'D5ECEC', 'F6ECC9', 'DDEBD3', 'F2D6D6', 'E1E5EA']
COR_ENTRADA = 'E8EEF3'
COLUNAS_POR_BLOCO = 7
DIMENSOES = {0: 'pontos: uma linha por ponto, com presença ou ausência em cada camada',
             1: 'linhas: uma linha por interseção, com comprimento em km',
             2: 'polígonos: uma linha por interseção, com área em hectares'}


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


def pdf(result, tabela, path, mapa=None, aviso_mapa=None):
    """Mapa, tabela de atributos da geometria de saída, recorte por categoria e por camada base."""
    estrutura = result['tabela_saida']
    dimensao = estrutura['dimensao']
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Cell', fontName='Helvetica', fontSize=6.5, leading=8, wordWrap='CJK'))
    styles.add(ParagraphStyle(name='Head', fontName='Helvetica-Bold', fontSize=6.5, leading=8, wordWrap='CJK',
                              textColor=colors.HexColor('#173a53')))
    styles['BodyText'].fontSize = 9
    styles['BodyText'].leading = 12
    styles['Title'].textColor = colors.HexColor('#003b5a')
    for nome in ('Heading1', 'Heading2'):
        styles[nome].textColor = colors.HexColor('#003b5a')
        styles[nome].spaceBefore = 6
        styles[nome].spaceAfter = 4

    def p(valor, estilo='BodyText'):
        return Paragraph(escape(str(valor)), styles[estilo])

    linhas_tabela = list(registros(tabela))
    chave = estrutura['fixos'][0]

    def em_blocos(linhas, cols):
        if not linhas:
            return [p('Nenhuma linha neste recorte.'), Spacer(1, 6)]
        outras = [coluna for coluna in cols if coluna != chave]
        partes = []
        for inicio in range(0, max(len(outras), 1), COLUNAS_POR_BLOCO):
            bloco = [chave, *outras[inicio:inicio + COLUNAS_POR_BLOCO]]
            larguras = [45] + [(770 - 45) / max(len(bloco) - 1, 1)] * (len(bloco) - 1)
            dados = [[Paragraph(escape(coluna), styles['Head']) for coluna in bloco]]
            dados += [[Paragraph(escape(texto(linha.get(coluna)) or '—'), styles['Cell']) for coluna in bloco]
                      for linha in linhas]
            item = Table(dados, colWidths=larguras, repeatRows=1, hAlign='LEFT')
            item.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6eff5')),
                ('LINEBELOW', (0, 0), (-1, 0), .7, colors.HexColor('#02a344')),
                ('GRID', (0, 0), (-1, -1), .25, colors.HexColor('#c9d5df')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f7f8')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 3), ('RIGHTPADDING', (0, 0), (-1, -1), 3)]))
            partes += [item, Spacer(1, 8)]
        return partes

    base = [*estrutura['fixos'], *estrutura['entrada']]
    historia = [
        p('SICARD | Extração de atributos', 'Title'),
        p(f"Entrada: {result.get('input_nome', '—')} · Operação: {OPERACOES.get(result.get('operacao'), result.get('operacao'))}"),
        p(f"Execução: {result.get('id', '—')} · {data_hora(result.get('criado_em', ''))} · Motor: {result.get('motor', 'GDAL/OGR')} {result.get('gdal', '')}"),
    ]
    if mapa:
        largura, altura = ImageReader(str(mapa)).getSize()
        historia += [p('Mapa de localização', 'Heading2'), Image(str(mapa), width=770, height=770 * altura / largura),
                     p('Camada de entrada (contorno azul) sobre todas as camadas consideradas no processamento, com o '
                       'entorno. Em vermelho, a área extraída pela interseção.' + (f' {aviso_mapa}' if aviso_mapa else ''))]
    historia += [
        PageBreak(),
        p('Tabela de atributos da geometria de saída', 'Heading1'),
        p(f'{len(linhas_tabela)} linha(s). Entrada de {DIMENSOES[dimensao]}. Os campos da entrada mantêm o nome '
          'original; os campos da base e as medidas levam o prefixo categoria__camada__. As colunas estão em blocos, '
          f'e a coluna {chave} liga os blocos da mesma linha.'),
        *em_blocos(linhas_tabela, colunas(tabela)),
        PageBreak(),
        p('Por categoria', 'Heading1'),
    ]
    for categoria_id, categoria in dict.fromkeys((g['categoria_id'], g['categoria']) for g in estrutura['grupos']):
        cols = base + [c for g in estrutura['grupos'] if g['categoria_id'] == categoria_id for c in g['campos']]
        linhas = linhas_tabela if dimensao == 0 else [l for l in linhas_tabela if l.get('categoria') == categoria]
        historia += [p(categoria, 'Heading2'), *em_blocos(linhas, cols)]
    historia += [PageBreak(), p('Por camada base', 'Heading1')]
    for grupo in estrutura['grupos']:
        linhas = linhas_tabela if dimensao == 0 else [
            l for l in linhas_tabela if l.get('categoria') == grupo['categoria'] and l.get('camada_base') == grupo['camada']]
        historia += [p(f"{grupo['categoria']} · {grupo['camada']}", 'Heading2'), *em_blocos(linhas, base + grupo['campos'])]

    def rodape(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.drawString(36, 20, 'SICARD - Extração espacial de atributos')
        canvas.drawRightString(805, 20, f'Página {doc.page}')
        canvas.restoreState()

    SimpleDocTemplate(str(path), pagesize=landscape(A4), rightMargin=36, leftMargin=36, topMargin=32,
                      bottomMargin=34, title='Extração de atributos - SICARD').build(
        historia, onFirstPage=rodape, onLaterPages=rodape)
