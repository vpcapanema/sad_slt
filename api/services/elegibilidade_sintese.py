"""Situação de cada demanda quanto a restrições e riscos, para o relatório e o pacote da Elegibilidade Territorial.

A demanda é o objeto da análise; as camadas de restrição e de risco apenas a caracterizam. Cada demanda tem
restrição, tem risco, tem ambos (uma situação, não um conceito) ou está livre de restrições e riscos.
As regras espelham as do painel interativo (cinco-resultados_elegibilidade_v2-dados.js).
"""
from __future__ import annotations

import csv
from io import BytesIO, StringIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.platypus import Flowable

from api.services import extracao_atributos_relatorios as estilo

CATEGORIAS = ('restricao', 'risco')
ROTULOS = {'restricao': 'Restrição', 'risco': 'Risco'}
SITUACOES = {'ambas': 'Com restrição e risco', 'restricao': 'Com restrição', 'risco': 'Com risco',
             'livre': 'Livre de restrições e riscos'}
ORDEM_SITUACOES = ('ambas', 'restricao', 'risco', 'livre')
CORES_SITUACAO = {'ambas': '#7a4a1d', 'restricao': '#b42335', 'risco': '#c18b00', 'livre': '#2aa358'}
PREFIXOS_FORMULA = ('=', '+', '-', '@', '\t', '\r')
CONCEITO = ('A demanda é o objeto da análise; as bases de restrição e de risco servem para caracterizá-la. '
            'Para cada demanda, este relatório informa se ela tem restrição, tem risco, tem ambos ou está livre de '
            'restrições e riscos ambientais e territoriais, conforme as camadas consultadas.')
NOTA_LEITURA = ('Livre de restrições e riscos significa que não foi encontrada sobreposição com as camadas consultadas. '
                'O percentual usa a área total da demanda como base; áreas atingidas por camadas diferentes podem coincidir '
                'e não são somadas. “Apenas toca o limite” indica contato sem área atingida. '
                'O relatório informa a situação de cada demanda; não a classifica como elegível ou inelegível.')


def caracterizar(entrada: dict) -> list[dict]:
    """Uma ficha por demanda, com o que foi encontrado em cada categoria."""
    camadas = {c['id']: c['nome'] for c in entrada['campos']}
    fichas = []
    for linha in entrada['linhas']:
        cats = {c: [] for c in CATEGORIAS}
        for item in linha['sobreposicoes']:
            if item['papel'] in cats:
                cats[item['papel']].append({**item, 'camada': camadas[item['base_id']]})
        restricao, risco = bool(cats['restricao']), bool(cats['risco'])
        fichas.append({'linha': linha, 'nome': linha['nome'] or f'Demanda {linha["id"]}', 'cats': cats,
                       'situacao': 'ambas' if restricao and risco else 'restricao' if restricao
                       else 'risco' if risco else 'livre'})
    return fichas


def ordenar_por_situacao(fichas: list[dict]) -> list[dict]:
    return sorted(fichas, key=lambda f: (ORDEM_SITUACOES.index(f['situacao']), f['nome'].casefold()))


def indicadores(fichas: list[dict]) -> dict:
    return {'total': len(fichas), **{s: sum(f['situacao'] == s for f in fichas) for s in ORDEM_SITUACOES}}


def nomes_encontrados(itens: list[dict], limite: int | None = None) -> str:
    nomes = list(dict.fromkeys(i['nome'] for i in itens))
    if limite and len(nomes) > limite:
        return '; '.join(nomes[:limite]) + f' e mais {len(nomes) - limite}'
    return '; '.join(nomes)


def descrever(ficha: dict, limite: int | None = None) -> str:
    """O que a demanda tem, em linguagem corrente."""
    if ficha['situacao'] == 'livre':
        return 'Livre de restrições e riscos nas camadas consultadas.'
    plural = {'restricao': ('restrição', 'restrições'), 'risco': ('risco', 'riscos')}
    frases = []
    for c in CATEGORIAS:
        itens = ficha['cats'][c]
        if itens:
            tem = f'Tem {plural[c][0]}' if len(itens) == 1 else f'Tem {len(itens)} {plural[c][1]}'
            frases.append(f'{tem}: {nomes_encontrados(itens, limite)}.')
    return ' '.join(frases)


def registros_detalhados(modelo: dict) -> list[dict]:
    """Formato longo: uma linha por demanda × item encontrado (ou uma linha “livre”)."""
    registros = []
    for entrada in modelo['entradas']:
        for ficha in caracterizar(entrada):
            linha = ficha['linha']
            base = {'entrada': entrada['nome'], 'id': linha['id'], 'demanda': ficha['nome'],
                    'situacao': SITUACOES[ficha['situacao']], 'area_total_m2': linha['area_total_m2']}
            if ficha['situacao'] == 'livre':
                registros.append({**base, 'tipo': None, 'observacao': 'Nenhuma restrição ou risco encontrado nas camadas consultadas'})
                continue
            itens = [i for c in CATEGORIAS for i in ficha['cats'][c]]
            for item in sorted(itens, key=lambda s: -s['area_m2']):
                registros.append({**base, 'tipo': ROTULOS[item['papel']], 'camada': item['camada'], 'item': item['nome'],
                                  'area_m2': item['area_m2'], 'percentual': item['percentual'],
                                  'observacao': 'Apenas toca o limite da demanda, sem área atingida' if item['area_m2'] == 0 else ''})
    return registros


# ------------------------------------------------------------------ planilhas

def xlsx(modelo: dict) -> bytes:
    livro = Workbook()
    cabecalho_fundo = PatternFill('solid', start_color='003B5A')
    cabecalho_fonte = Font(bold=True, color='FFFFFF')

    def folha(ws, titulo, colunas, linhas, larguras):
        ws.title = titulo
        ws.append(colunas)
        for celula in ws[1]:
            celula.fill, celula.font = cabecalho_fundo, cabecalho_fonte
            celula.alignment = Alignment(wrap_text=True, vertical='center')
        for linha in linhas:
            ws.append(linha)
        for linha in ws.iter_rows(min_row=2):
            for celula in linha:
                if isinstance(celula.value, str):
                    celula.data_type = 's'
        for indice, largura in enumerate(larguras, 1):
            ws.column_dimensions[get_column_letter(indice)].width = largura
        ws.freeze_panes = 'A2'
        ws.auto_filter.ref = ws.dimensions

    resumo = []
    for entrada in modelo['entradas']:
        for f in ordenar_por_situacao(caracterizar(entrada)):
            linha = f['linha']
            resumo.append([entrada['nome'], linha['id'], f['nome'], SITUACOES[f['situacao']],
                           nomes_encontrados(f['cats']['restricao']) or '—', nomes_encontrados(f['cats']['risco']) or '—',
                           len(f['cats']['restricao']), len(f['cats']['risco']),
                           linha['area_total_m2'] / 1e6, linha['area_total_m2'] / 1e4])
    ws = livro.active
    folha(ws, 'Situação das Demandas',
          ['Conjunto de demandas', 'Identificador', 'Demanda', 'Situação', 'Restrições encontradas', 'Riscos encontrados',
           'Nº de restrições', 'Nº de riscos', 'Área da demanda (km²)', 'Área da demanda (ha)'],
          resumo, [30, 16, 38, 28, 44, 44, 14, 12, 18, 18])
    for linha in ws.iter_rows(min_row=2):
        linha[8].number_format = '#,##0.00####'
        linha[9].number_format = '#,##0.0000'

    detalhe = []
    for r in registros_detalhados(modelo):
        livre = r['tipo'] is None
        detalhe.append([r['entrada'], r['id'], r['demanda'], r['situacao'], r['tipo'] or '—',
                        '—' if livre else r['item'], '—' if livre else r['camada'],
                        None if livre else r['area_m2'] / 1e6, None if livre else r['area_m2'] / 1e4,
                        None if livre else r['percentual'] / 100, r['observacao']])
    ws = livro.create_sheet()
    folha(ws, 'Restrições e Riscos',
          ['Conjunto de demandas', 'Identificador', 'Demanda', 'Situação da demanda', 'Tipo', 'Restrição ou risco encontrado',
           'Camada consultada', 'Área atingida (km²)', 'Área atingida (ha)', '% da área da demanda', 'Observação'],
          detalhe, [30, 16, 38, 28, 12, 40, 36, 18, 18, 20, 44])
    for linha in ws.iter_rows(min_row=2):
        linha[7].number_format = '#,##0.00####'
        linha[8].number_format = '#,##0.0000'
        linha[9].number_format = '0.00####%'

    ws = livro.create_sheet()
    folha(ws, 'Camadas Consultadas', ['Papel', 'Nome de apresentação'],
          [[{'entrada': 'Conjunto de demandas', 'restricao': 'Restrição', 'risco': 'Risco'}[f['papel']], f['nome']]
           for f in modelo['fontes'] if f['tipo'] == 'camada'], [24, 60])

    ws = livro.create_sheet('Como Ler')
    for texto in (CONCEITO, NOTA_LEITURA, modelo['metodologia']):
        ws.append([texto])
        ws.append([])
    ws.column_dimensions['A'].width = 120
    for linha in ws.iter_rows():
        for celula in linha:
            celula.alignment = Alignment(wrap_text=True, vertical='top')
    memoria = BytesIO()
    livro.save(memoria)
    return memoria.getvalue()


def _celula_csv(valor) -> str:
    if valor is None:
        return ''
    if isinstance(valor, float):
        return format(valor, 'f').rstrip('0').rstrip('.').replace('.', ',') if valor else '0'
    texto = str(valor)
    return "'" + texto if texto.startswith(PREFIXOS_FORMULA) else texto


def csv_detalhe(modelo: dict) -> bytes:
    saida = StringIO()
    escritor = csv.writer(saida, delimiter=';', lineterminator='\r\n')
    escritor.writerow(['Conjunto de demandas', 'Identificador', 'Demanda', 'Situação da demanda', 'Área da demanda (m²)',
                       'Tipo', 'Restrição ou risco encontrado', 'Camada consultada', 'Área atingida (m²)',
                       '% da área da demanda', 'Observação'])
    for r in registros_detalhados(modelo):
        livre = r['tipo'] is None
        escritor.writerow([_celula_csv(v) for v in (
            r['entrada'], r['id'], r['demanda'], r['situacao'], r['area_total_m2'], r['tipo'] or '',
            '' if livre else r['item'], '' if livre else r['camada'], None if livre else r['area_m2'],
            None if livre else r['percentual'], r['observacao'])])
    return saida.getvalue().encode('utf-8-sig')


def leia_me(modelo: dict, relatorio: str, arquivos: list[str]) -> bytes:
    ind = indicadores([f for e in modelo['entradas'] for f in caracterizar(e)])
    linhas = [
        'RELATÓRIO E CAMADAS — ELEGIBILIDADE TERRITORIAL', '',
        CONCEITO, '',
        f'Demandas analisadas: {ind["total"]}. Com restrição: {ind["restricao"]}. Com risco: {ind["risco"]}. '
        f'Com restrição e risco: {ind["ambas"]}. Livres de restrições e riscos: {ind["livre"]}.',
        f'Conjuntos de demandas concluídos: {modelo["concluidas"]} de {modelo["previstas"]}.', '',
        'CONTEÚDO DO PACOTE',
        f'- {relatorio}: leitura para decisão. Situação de cada demanda, mapa, resumo e detalhe por demanda; '
        'as matrizes de área por camada ficam no anexo.',
        '- Tabelas/Situação das Demandas.xlsx: situação de cada demanda, restrições e riscos encontrados e camadas consultadas, com filtros.',
        '- Tabelas/Situação das Demandas.csv: o mesmo detalhe em texto (UTF-8, separador ponto e vírgula).',
        '- Camadas/NN/*.gpkg: cópia integral de cada conjunto de demandas, com áreas e sobreposições gravadas na execução (para uso em SIG).',
        '- Metadados da Análise.json: identificação, fontes, nomes revisados e assinatura (SHA-256) dos arquivos.', '',
        'COMO LER', NOTA_LEITURA, '',
        'ARQUIVOS DE CAMADAS', *[f'- {nome}' for nome in arquivos],
    ]
    return ('\r\n'.join(linhas) + '\r\n').encode('utf-8-sig')


# ------------------------------------------------------------------ PDF

def kpis(e: dict, fichas: list[dict]):
    i = indicadores(fichas)
    return estilo._kpis(e, [(str(i['total']), 'Demandas analisadas'), (str(i['livre']), 'Livres de restrições e riscos'),
                            (str(i['restricao']), 'Com restrição'), (str(i['risco']), 'Com risco'),
                            (str(i['ambas']), 'Com restrição e risco')])


class GraficoSituacoes(Flowable):
    """Barras horizontais com a quantidade de demandas em cada situação."""
    LINHA = 22

    def __init__(self, fichas):
        super().__init__()
        self.contagem = indicadores(fichas)
        self.width = estilo.LARGURA
        self.height = self.LINHA * len(ORDEM_SITUACOES) + 6

    def wrap(self, largura, altura):
        return self.width, self.height

    def draw(self):
        c = self.canv
        x0, x1 = 150, self.width - 70
        total = self.contagem['total'] or 1
        c.saveState()
        for indice, situacao in enumerate(ORDEM_SITUACOES):
            y = self.height - (indice + 1) * self.LINHA
            valor = self.contagem[situacao]
            c.setFillColor(estilo.AZUL)
            c.setFont('Helvetica', 8)
            c.drawString(0, y + 6, SITUACOES[situacao])
            c.setFillColor(colors.HexColor('#e6edf2'))
            c.rect(x0, y + 4, x1 - x0, 10, stroke=0, fill=1)
            if valor:
                c.setFillColor(colors.HexColor(CORES_SITUACAO[situacao]))
                c.rect(x0, y + 4, max(1.5, (x1 - x0) * valor / total), 10, stroke=0, fill=1)
            c.setFillColor(estilo.TEXTO_SUAVE)
            c.setFont('Helvetica', 7.5)
            c.drawString(x1 + 6, y + 6, f'{valor} · {estilo.percentual(valor / total * 100)}')
        c.restoreState()


def tabela_resumo(e: dict, fichas: list[dict], area_km2) -> object:
    linhas = [['Demanda', 'Situação', 'O que foi encontrado', 'Área da demanda']]
    for f in ordenar_por_situacao(fichas):
        linhas.append([f['nome'], SITUACOES[f['situacao']], descrever(f, 3), area_km2(e, f['linha']['area_total_m2'])])
    tabela = estilo._tabela(e, linhas, [estilo.LARGURA * p for p in (.26, .17, .41, .16)])
    tabela.splitInRow = 1
    return tabela
