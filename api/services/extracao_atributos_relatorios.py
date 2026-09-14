"""Relatórios PDF da extração de atributos, os dois em A4 retrato com margens de 12 mm.

Processamento (técnico, nomes brutos): cabeçalho identificador, etapas, resultados
técnicos, a tabela de atributos da geometria de saída inteira, por categoria e por
camada base, metodologia, ambiente e conteúdo do pacote.

Analítico (para quem precisa concluir, nomes amigáveis): o mesmo cabeçalho com
aliases, indicadores, mapa, gráficos, análise por categoria, conclusões sustentadas
por números e o dicionário de aliases.
"""
from __future__ import annotations

import textwrap
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from api.services import extracao_atributos_aliases as aliases
from api.services.extracao_atributos_exportacao import OPERACOES, colunas, registros, texto

MARGEM = 12 * mm
# O quadro do SimpleDocTemplate tem 6 pt de respiro de cada lado, dentro das margens.
LARGURA = A4[0] - 2 * MARGEM - 12
ALTURA = A4[1] - 2 * MARGEM - 24
FUSO = ZoneInfo('America/Sao_Paulo')
AZUL = colors.HexColor('#003b5a')
VERDE = colors.HexColor('#02a344')
AZUL_CLARO = colors.HexColor('#e6eff5')
FUNDO = colors.HexColor('#f5f7f8')
LINHA = colors.HexColor('#c9d5df')
TEXTO_SUAVE = colors.HexColor('#4a5d6e')
# Uma cor por camada no mapa e por categoria nos gráficos.
PALETA = ['#1769aa', '#e07b24', '#8c4495', '#217f83', '#b58900', '#52812e', '#a34242', '#58657a']
COLUNAS_POR_BLOCO = 5
DIMENSOES = {0: 'pontos: uma linha por ponto, com presença ou ausência em cada camada',
             1: 'linhas: uma linha por interseção, com comprimento em km',
             2: 'polígonos: uma linha por interseção, com área em hectares'}
TIPOS = {0: 'Pontos', 1: 'Linhas', 2: 'Polígonos'}
UNIDADE = {0: 'ponto(s)', 1: 'km', 2: 'ha'}
MEDIDA = {0: 'Pontos', 1: 'Extensão atingida', 2: 'Área atingida'}
TOTAL = {0: 'Pontos na entrada', 1: 'Extensão da entrada', 2: 'Área da entrada'}


# ------------------------------------------------------------------ formatação

def numero(valor, casas: int = 2) -> str:
    if valor is None or (isinstance(valor, float) and valor != valor):
        return '—'
    return f'{float(valor):,.{casas}f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def na_unidade(si, dimensao: int) -> float:
    return float(si) / (10000 if dimensao == 2 else 1000 if dimensao == 1 else 1)


def medida(si, dimensao: int) -> str:
    """m² -> ha, m -> km, pontos como contagem; poucas casas quando o valor é grande."""
    if si is None:
        return '—'
    valor = na_unidade(si, dimensao)
    casas = 0 if dimensao == 0 else 2 if abs(valor) >= 1 or valor == 0 else 4
    return f'{numero(valor, casas)} {UNIDADE[dimensao]}'


def percentual(valor) -> str:
    if valor is None:
        return '—'
    return f'{numero(valor, 2 if valor == 0 or abs(valor) >= .01 else 4)}%'


def hora(valor) -> str:
    if not valor:
        return '—'
    try:
        return datetime.fromisoformat(str(valor)).astimezone(FUSO).strftime('%d/%m/%Y %H:%M:%S')
    except ValueError:
        return str(valor)


def _vazio(valor) -> str:
    return '—' if valor is None or valor == '' else str(valor)


# ------------------------------------------------------------------ blocos de página

def _estilos() -> dict:
    base = {'fontName': 'Helvetica', 'wordWrap': 'CJK'}
    estilos = {
        'corpo': ParagraphStyle('corpo', fontName='Helvetica', fontSize=8.5, leading=11.5),
        'nota': ParagraphStyle('nota', fontName='Helvetica-Oblique', fontSize=7.5, leading=10, textColor=TEXTO_SUAVE),
        'cel': ParagraphStyle('cel', fontSize=6.8, leading=8.4, **base),
        'celD': ParagraphStyle('celD', fontSize=6.8, leading=8.4, alignment=2, **base),
        'celN': ParagraphStyle('celN', fontSize=6.8, leading=8.4, textColor=AZUL, **{**base, 'fontName': 'Helvetica-Bold'}),
        'quadro': ParagraphStyle('quadro', fontName='Helvetica-Bold', fontSize=7.5, leading=9, textColor=colors.white),
        'titulo': ParagraphStyle('titulo', fontName='Helvetica-Bold', fontSize=15, leading=18, textColor=colors.white),
        'subtitulo': ParagraphStyle('subtitulo', fontName='Helvetica', fontSize=9.5, leading=12.5, textColor=colors.white),
        'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=11.5, leading=14, textColor=AZUL,
                             spaceBefore=10, spaceAfter=5),
        'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=AZUL,
                             spaceBefore=7, spaceAfter=3),
        'kpiValor': ParagraphStyle('kpiValor', fontName='Helvetica-Bold', fontSize=12, leading=14.5, textColor=AZUL,
                                   alignment=1),
        'kpiRotulo': ParagraphStyle('kpiRotulo', fontName='Helvetica', fontSize=6.8, leading=8.5, textColor=TEXTO_SUAVE,
                                    alignment=1),
        'item': ParagraphStyle('item', fontName='Helvetica', fontSize=8.5, leading=11.5, leftIndent=11, bulletIndent=1,
                               spaceAfter=3),
    }
    return estilos


def _p(estilos, valor, estilo='corpo', **extra):
    return Paragraph(escape(_vazio(valor)), estilos[estilo], **extra)


def _tabela(estilos, linhas, larguras, cabecalho=True, direita=()):
    dados = []
    for indice, linha in enumerate(linhas):
        dados.append([valor if hasattr(valor, 'wrap') else Paragraph(escape(_vazio(valor)), estilos[
            'celN' if cabecalho and indice == 0 else 'celD' if coluna in direita else 'cel'])
            for coluna, valor in enumerate(linha)])
    tabela = Table(dados, colWidths=larguras, repeatRows=1 if cabecalho else 0, hAlign='LEFT')
    comandos = [('VALIGN', (0, 0), (-1, -1), 'TOP'), ('GRID', (0, 0), (-1, -1), .25, LINHA),
                ('ROWBACKGROUNDS', (0, 1 if cabecalho else 0), (-1, -1), [colors.white, FUNDO]),
                ('LEFTPADDING', (0, 0), (-1, -1), 3), ('RIGHTPADDING', (0, 0), (-1, -1), 3),
                ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]
    if cabecalho:
        comandos += [('BACKGROUND', (0, 0), (-1, 0), AZUL_CLARO), ('LINEBELOW', (0, 0), (-1, 0), .8, VERDE)]
    tabela.setStyle(TableStyle(comandos))
    return tabela


def _quadro(estilos, titulo, pares, largura, chave=.4):
    """Quadro do cabeçalho: faixa azul com o título e pares chave/valor."""
    dados = [[Paragraph(escape(titulo), estilos['quadro']), '']]
    dados += [[Paragraph(escape(str(k)), estilos['celN']), Paragraph(escape(_vazio(v)), estilos['cel'])] for k, v in pares]
    tabela = Table(dados, colWidths=[largura * chave, largura * (1 - chave)], hAlign='LEFT')
    tabela.setStyle(TableStyle([
        ('SPAN', (0, 0), (-1, 0)), ('BACKGROUND', (0, 0), (-1, 0), AZUL), ('BOX', (0, 0), (-1, -1), .6, AZUL),
        ('LINEBELOW', (0, 1), (-1, -2), .25, LINHA), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]))
    return tabela


def _lado_a_lado(esquerda, direita):
    tabela = Table([[esquerda, direita]], colWidths=[LARGURA / 2, LARGURA / 2], hAlign='LEFT')
    tabela.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                                ('ALIGN', (1, 0), (1, 0), 'RIGHT'), ('LEFTPADDING', (0, 0), (-1, -1), 0),
                                ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    return tabela


def _faixa_titulo(estilos, titulo, subtitulo, linha3):
    tabela = Table([[[Paragraph(escape(titulo), estilos['titulo']), Paragraph(escape(subtitulo), estilos['subtitulo']),
                      Paragraph(escape(linha3), estilos['subtitulo'])]]], colWidths=[LARGURA], hAlign='LEFT')
    tabela.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), AZUL), ('LINEBELOW', (0, 0), (-1, -1), 3, VERDE),
                                ('LEFTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 8),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 8)]))
    return tabela


def _imagem(path: Path, largura: float = LARGURA, altura_maxima: float = ALTURA * .8):
    w, h = ImageReader(str(path)).getSize()
    altura = largura * h / w
    if altura > altura_maxima:
        largura, altura = altura_maxima * w / h, altura_maxima
    return Image(str(path), width=largura, height=altura)


def _construir(path, titulo, historia):
    def rodape(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(VERDE)
        canvas.setLineWidth(.6)
        canvas.line(MARGEM, MARGEM + 2, A4[0] - MARGEM, MARGEM + 2)
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(TEXTO_SUAVE)
        canvas.drawString(MARGEM, MARGEM - 7, f'SICARD - {titulo}')
        canvas.drawRightString(A4[0] - MARGEM, MARGEM - 7, f'Página {doc.page}')
        canvas.restoreState()

    SimpleDocTemplate(str(path), pagesize=A4, leftMargin=MARGEM, rightMargin=MARGEM, topMargin=MARGEM,
                      bottomMargin=MARGEM + 6, title=f'{titulo} - SICARD').build(
        historia, onFirstPage=rodape, onLaterPages=rodape)


# ------------------------------------------------------------------ relatório de processamento

def _em_blocos(estilos, linhas, cols, chave):
    """Tabela larga em blocos de colunas; a coluna-chave se repete e liga os blocos."""
    if not linhas:
        return [_p(estilos, 'Nenhuma linha neste recorte.'), Spacer(1, 6)]
    outras = [coluna for coluna in cols if coluna != chave]
    partes = []
    for inicio in range(0, max(len(outras), 1), COLUNAS_POR_BLOCO):
        bloco = [chave, *outras[inicio:inicio + COLUNAS_POR_BLOCO]]
        larguras = [52] + [(LARGURA - 52) / max(len(bloco) - 1, 1)] * (len(bloco) - 1)
        dados = [bloco, *[[texto(linha.get(coluna)) or '—' for coluna in bloco] for linha in linhas]]
        partes += [_tabela(estilos, dados, larguras), Spacer(1, 6)]
    return partes


def _resultados_tecnicos(estilos, result):
    dimensao = result['dimensao_input']
    chave = 'pontos_dentro' if dimensao == 0 else 'medida_unica_si'

    def total(nivel, categoria, camada, resumo):
        valor = resumo.get(chave)
        return [nivel, categoria, camada, resumo.get('ocorrencias'),
                valor if dimensao == 0 else numero(valor, 3), numero(resumo.get('percentual'), 4)]

    totais = [['nivel', 'categoria_id', 'camada', 'ocorrencias', chave, 'percentual'],
              total('geral', '—', '—', result['resumo'])]
    if dimensao == 0:
        campos = ['pontos_dentro', 'pontos_fora']
    else:
        campos = ['n', 'media', 'mediana', 'minimo', 'maximo', 'desvio_padrao', 'q1', 'q3']
    estatisticas = [['categoria_id', 'camada', *campos]]
    for categoria in result['categorias']:
        totais.append(total('categoria', categoria['id'], '—', categoria['resumo']))
        linhas = [('—', categoria['estatisticas'])] + [(c['nome'], c['estatisticas']) for c in categoria['camadas']]
        for camada in categoria['camadas']:
            totais.append(total('camada', categoria['id'], camada['nome'], camada['resumo']))
        for nome, valores in linhas:
            estatisticas.append([categoria['id'], nome, *[
                valores.get(c) if c in ('n', 'pontos_dentro', 'pontos_fora') else numero(valores.get(c), 2)
                for c in campos]])
    largura_estat = [52, 82] + [(LARGURA - 134) / len(campos)] * len(campos)
    return [
        # Título e nota vão com a primeira tabela: nada de título sozinho no pé da página.
        KeepTogether([
            _p(estilos, 'Resultados técnicos', 'h1'),
            _p(estilos, 'Medidas em unidades SI no EPSG:5880 (m para linhas, m² para polígonos). O percentual é sobre '
                        'medida_total_input_si e não se soma entre linhas: camadas e categorias podem se sobrepor.', 'nota'),
            _p(estilos, 'Totais únicos (resumo)', 'h2'),
            _tabela(estilos, totais, [55, 80, 170, 60, 85, 65], direita=(3, 4, 5))]),
        KeepTogether([_p(estilos, 'Estatísticas por feição da entrada (estatisticas)', 'h2'),
                      _tabela(estilos, estatisticas, largura_estat, direita=tuple(range(2, 2 + len(campos))))]),
    ]


def pdf_processamento(result, tabela, proc, path, conteudo) -> None:
    """conteudo: [(arquivo, descrição, tamanho em bytes ou None, sha256)] do pacote."""
    estilos = _estilos()
    estrutura = result['tabela_saida']
    dimensao = result['dimensao_input']
    entrada, saida, resumo = proc['entrada'], proc['saida'], result['resumo']
    metade = LARGURA / 2 - 3
    identificacao = _quadro(estilos, 'Identificação', [
        ('execucao_id', proc['execucao_id']), ('nome_saida', proc['nome_saida']),
        ('responsavel', proc.get('responsavel')), ('responsavel_nome', proc.get('responsavel_nome')),
        ('iniciado_em', hora(proc.get('iniciado_em'))), ('finalizado_em', hora(proc.get('finalizado_em'))),
        ('duracao_segundos', numero(proc.get('duracao_segundos', 0), 1)), ('operacao', proc['operacao'])], metade)
    parametros = _quadro(estilos, 'Parâmetros do operador (opcoes)',
                         [(k, 'true' if v else 'false') for k, v in (proc.get('opcoes') or {}).items()], metade, .55)
    quadro_entrada = _quadro(estilos, 'Camada de entrada (entrada)', [
        ('id', entrada.get('id')), ('nome', entrada.get('nome')), ('origem', entrada.get('origem')),
        ('arquivo', entrada.get('arquivo')), ('camada', entrada.get('camada')), ('feicoes', entrada.get('feicoes')),
        ('crs', entrada.get('crs')), ('dimensao_input', dimensao),
        ('medida_total_input_si', numero(result.get('medida_total_input_si'), 3)),
        ('tamanho_bytes', entrada.get('tamanho_bytes')), ('modificado_em', hora(entrada.get('modificado_em'))),
        ('sha256', entrada.get('sha256'))], metade)
    quadro_saida = _quadro(estilos, 'Saída (saida)', [
        ('camada_resultado_id', saida.get('camada_resultado_id')), ('linhas_tabela', len(tabela)),
        ('ocorrencias', saida.get('ocorrencias')), ('camadas_intersectadas', saida.get('camadas_intersectadas')),
        ('pontos_dentro' if dimensao == 0 else 'medida_unica_si',
         resumo.get('pontos_dentro') if dimensao == 0 else numero(resumo.get('medida_unica_si'), 3)),
        ('percentual', numero(resumo.get('percentual'), 4)), ('crs_pacote', 'EPSG:4674')], metade)
    bases = [['categoria_id', 'nome', 'arquivo', 'feicoes', 'tamanho_bytes', 'modificado_em', 'sha256'],
             *[[b.get('categoria_id') or b.get('categoria'), b.get('nome'), b.get('arquivo') or b.get('id'),
                b.get('feicoes'), b.get('tamanho_bytes'), hora(b.get('modificado_em')), b.get('sha256')]
               for b in proc['bases']]]
    historia = [
        _faixa_titulo(estilos, 'Relatório de processamento', proc['nome_saida'],
                      'SICARD · Extração de atributos · nomes brutos dos campos'),
        Spacer(1, 8),
        _lado_a_lado(identificacao, parametros), Spacer(1, 6),
        _lado_a_lado(quadro_entrada, quadro_saida), Spacer(1, 6),
        KeepTogether([_p(estilos, 'Camadas base (bases)', 'h2'),
                      _tabela(estilos, bases, [56, 82, 110, 36, 58, 62, LARGURA - 404], direita=(3, 4))]),
        KeepTogether([_p(estilos, 'Etapas do processamento (etapas)', 'h1'),
                      _tabela(estilos, [['em', 'mensagem'], *[[hora(e.get('em')), e.get('mensagem')]
                                                              for e in proc['etapas']]], [85, LARGURA - 85])]),
        *_resultados_tecnicos(estilos, result),
    ]

    linhas = list(registros(tabela))
    chave = estrutura['fixos'][0]
    base = [*estrutura['fixos'], *estrutura['entrada']]
    historia += [
        PageBreak(),
        _p(estilos, 'Tabela de atributos da geometria de saída', 'h1'),
        _p(estilos, f'{len(linhas)} linha(s). Entrada de {DIMENSOES[dimensao]}. Os campos da entrada mantêm o nome '
                    'original; os campos da base e as medidas levam o prefixo categoria__camada__. As colunas estão '
                    f'em blocos, e a coluna {chave} liga os blocos da mesma linha.'),
        *_em_blocos(estilos, linhas, colunas(tabela), chave),
        PageBreak(), _p(estilos, 'Por categoria', 'h1'),
    ]
    for categoria_id, categoria in dict.fromkeys((g['categoria_id'], g['categoria']) for g in estrutura['grupos']):
        cols = base + [c for g in estrutura['grupos'] if g['categoria_id'] == categoria_id for c in g['campos']]
        recorte = linhas if dimensao == 0 else [linha for linha in linhas if linha.get('categoria') == categoria]
        historia += [_p(estilos, f'{categoria_id} ({categoria})', 'h2'), *_em_blocos(estilos, recorte, cols, chave)]
    historia += [PageBreak(), _p(estilos, 'Por camada base', 'h1')]
    for grupo in estrutura['grupos']:
        recorte = linhas if dimensao == 0 else [
            linha for linha in linhas
            if linha.get('categoria') == grupo['categoria'] and linha.get('camada_base') == grupo['camada']]
        historia += [_p(estilos, grupo['prefixo'], 'h2'), *_em_blocos(estilos, recorte, base + grupo['campos'], chave)]

    historia += [
        KeepTogether([_p(estilos, 'Metodologia', 'h1'), _p(estilos, result.get('metodologia_estatistica')),
                      Spacer(1, 3), _p(estilos, f"convencao_ids: {result.get('convencao_ids', '—')}")]),
        KeepTogether([_p(estilos, 'Ambiente de execução (ambiente)', 'h1'),
                      _tabela(estilos, [['chave', 'valor'], *[[k, v] for k, v in proc['ambiente'].items()]],
                              [120, LARGURA - 120])]),
        KeepTogether([_p(estilos, 'Conteúdo do pacote (arquivos)', 'h1'),
                      _tabela(estilos, [['arquivo', 'descricao', 'tamanho_bytes', 'sha256'],
                                        *[[n, d, t, s] for n, d, t, s in conteudo]],
                              [130, 135, 62, LARGURA - 327], direita=(2,)),
                      _p(estilos, 'O SHA-256 deste relatório e o do pacote .zip ficam registrados no banco, junto '
                                  'com a execução.', 'nota')]),
    ]
    _construir(path, 'Relatório de processamento da extração de atributos', historia)


# ------------------------------------------------------------------ relatório analítico

def feicoes_atingidas(result, tabela) -> list[dict]:
    """Uma entrada por feição de base atingida, com a medida da união das suas partes, da maior para a menor."""
    from shapely.ops import unary_union
    from api.services.extracao_atributos_analise import measure

    estrutura, dimensao = result['tabela_saida'], result['dimensao_input']
    total = result['medida_total_input_si']
    itens = []
    for grupo in estrutura['grupos']:
        prefixo, info = grupo['prefixo'], aliases.camada(grupo['camada_id'], grupo['camada'])
        coluna_fid = prefixo + 'fid_base'
        if coluna_fid not in tabela.columns:
            continue
        linhas = tabela[tabela[coluna_fid].notna()]
        if dimensao == 0:
            linhas = linhas[linhas[prefixo + 'presenca'] == 'sim']
        nome_campo = next((prefixo + c for c in (info['campo_nome'], f"base_{info['campo_nome']}")
                           if info['campo_nome'] and prefixo + c in tabela.columns), None)
        for fid, partes in linhas.groupby(coluna_fid):
            valor = len(partes) if dimensao == 0 else measure(unary_union(list(partes.geometry)), dimensao)
            nomes = partes[nome_campo].dropna().astype(str) if nome_campo else []
            itens.append({'categoria_id': grupo['categoria_id'], 'categoria': grupo['categoria'],
                          'camada_id': grupo['camada_id'], 'camada': info['nome'], 'fid': int(fid),
                          'nome': nomes.iloc[0] if len(nomes) else f'Feição {int(fid)} da base',
                          'medida_si': float(valor), 'percentual': 100 * valor / total if total else 0})
    # Nome repetido na mesma camada (ex.: várias subáreas "SUC") ganha o número da feição.
    contagem = {}
    for item in itens:
        contagem[(item['camada_id'], item['nome'])] = contagem.get((item['camada_id'], item['nome']), 0) + 1
    for item in itens:
        if contagem[(item['camada_id'], item['nome'])] > 1:
            item['nome'] = f"{item['nome']} · feição {item['fid']}"
    return sorted(itens, key=lambda item: item['medida_si'], reverse=True)


def _grafico(path, rotulos, valores, textos, cores, eixo, legenda=None, empilhado=None):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.patches import Patch
    from matplotlib.ticker import FuncFormatter

    quantidade = len(rotulos)
    rotulos = [textwrap.fill(r, 46) for r in rotulos]
    # A altura acompanha as linhas dos rótulos: rótulo de três linhas não invade a barra vizinha.
    linhas = sum(max(r.count('\n') + 1, 2) for r in rotulos)
    fig, ax = plt.subplots(figsize=(7.2, max(1.5, .2 * linhas + .7)), dpi=200)
    posicoes = list(range(quantidade))
    ax.barh(posicoes, valores, color=cores, height=.62, zorder=3)
    maximo = max([*valores, *([a + b for a, b in zip(valores, empilhado['valores'])] if empilhado else [])] or [0]) or 1
    if empilhado:
        ax.barh(posicoes, empilhado['valores'], left=valores, color=empilhado['cor'], height=.62, zorder=3)
    for posicao, (valor, rotulo) in enumerate(zip(valores, textos)):
        extra = empilhado['valores'][posicao] if empilhado else 0
        ax.text(valor + extra + maximo * .012, posicao, rotulo, va='center', fontsize=7, color='#1b2a38', zorder=4)
    ax.set_yticks(posicoes)
    ax.set_yticklabels(rotulos, fontsize=7)
    ax.invert_yaxis()
    ax.set_xlim(0, maximo * 1.32)
    ax.xaxis.set_major_formatter(FuncFormatter(lambda v, _: numero(v, 0 if maximo >= 10 else 2)))
    ax.set_xlabel(eixo, fontsize=7.5, color='#33495c')
    ax.tick_params(axis='x', labelsize=7, colors='#33495c')
    ax.tick_params(axis='y', length=0)
    for lado in ('top', 'right'):
        ax.spines[lado].set_visible(False)
    ax.grid(axis='x', color='#e3e9ee', linewidth=.6, zorder=0)
    if legenda:
        ax.legend(handles=[Patch(color=c, label=r) for r, c in legenda], loc='lower left', bbox_to_anchor=(0, 1.01),
                  ncol=min(len(legenda), 4), fontsize=7, frameon=False)
    fig.savefig(path, dpi=200, bbox_inches='tight', pad_inches=.05)
    plt.close(fig)
    return path


def _kpis(estilos, itens):
    largura = LARGURA / len(itens)
    tabela = Table([[[Paragraph(escape(valor), estilos['kpiValor']), Paragraph(escape(rotulo), estilos['kpiRotulo'])]
                     for valor, rotulo in itens]], colWidths=[largura] * len(itens), hAlign='LEFT')
    tabela.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eef4f8')), ('LINEABOVE', (0, 0), (-1, 0), 2.5, VERDE),
        ('LINEAFTER', (0, 0), (-2, -1), 4, colors.white), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    return tabela


def _conclusoes(result, proc, feicoes, nomes_camada) -> list[str]:
    dimensao, resumo = result['dimensao_input'], result['resumo']
    quantidade_bases = sum(len(c['camadas']) for c in result['categorias'])
    frases = []
    if dimensao == 0:
        total = int(result['medida_total_input_si'])
        if resumo.get('pontos_dentro'):
            frases.append(f"{resumo['pontos_dentro']} de {total} ponto(s) da entrada ({percentual(resumo['percentual'])}) "
                          f"estão dentro de ao menos uma das {quantidade_bases} camadas base consideradas.")
        else:
            frases.append(f'Nenhum dos {total} ponto(s) da entrada está dentro das {quantidade_bases} camadas base consideradas.')
    elif resumo.get('ocorrencias'):
        frases.append(f"{medida(resumo['medida_unica_si'], dimensao)} ({percentual(resumo['percentual'])}) da entrada "
                      f"têm interseção com ao menos uma das {quantidade_bases} camadas base consideradas: "
                      f"{resumo['camadas_intersectadas']} camada(s) atingida(s), em {resumo['ocorrencias']} interseção(ões).")
    else:
        frases.append(f'Nenhuma das {quantidade_bases} camadas base consideradas tem interseção com a entrada.')

    chave = 'pontos_dentro' if dimensao == 0 else 'medida_unica_si'
    soma = 0.0
    for categoria in result['categorias']:
        if not categoria['resumo'].get('ocorrencias'):
            continue
        soma += categoria['resumo']['percentual']
        maior = max(categoria['camadas'], key=lambda c: c['resumo'].get(chave) or 0)
        destaque = next((f for f in feicoes if f['categoria_id'] == categoria['id']), None)
        if dimensao == 0:
            frase = (f"{categoria['nome']}: {categoria['resumo']['pontos_dentro']} ponto(s) "
                     f"({percentual(categoria['resumo']['percentual'])}), com mais pontos em "
                     f"{nomes_camada[maior['id']]} ({maior['resumo']['pontos_dentro']})")
        else:
            frase = (f"{categoria['nome']}: {medida(categoria['resumo']['medida_unica_si'], dimensao)} "
                     f"({percentual(categoria['resumo']['percentual'])}) da entrada, com a maior parcela em "
                     f"{nomes_camada[maior['id']]} ({medida(maior['resumo']['medida_unica_si'], dimensao)}, "
                     f"{percentual(maior['resumo']['percentual'])})")
        if destaque:
            frase += (f"; a feição {'com mais pontos' if dimensao == 0 else 'mais atingida'} é "
                      f"{destaque['nome']} ({medida(destaque['medida_si'], dimensao)})")
        frases.append(frase + '.')
    sem = [nomes_camada[c['id']] for categoria in result['categorias'] for c in categoria['camadas']
           if not c['resumo'].get('ocorrencias')]
    if sem:
        frases.append('Sem interseção com a entrada: ' + '; '.join(sem) + '.')
    if soma > resumo.get('percentual', 0) + .01:
        frases.append(f"As categorias se sobrepõem: a soma das parcelas por categoria ({percentual(soma)}) passa da "
                      f"parcela única atingida ({percentual(resumo['percentual'])}), por isso os percentuais não se somam.")
    frases.append('A interseção indica relação espacial com a entrada, não impacto positivo ou negativo. A leitura de '
                  'cada caso depende dos atributos e da documentação da camada de origem.')
    return frases


def pdf_analitico(result, tabela, proc, path, mapa=None, aviso_mapa=None) -> None:
    estilos = _estilos()
    pasta = Path(path).parent
    estrutura, dimensao, resumo = result['tabela_saida'], result['dimensao_input'], result['resumo']
    entrada = proc['entrada']
    info_entrada = aliases.camada(entrada.get('id'), entrada.get('nome'))
    nomes_camada = {c['id']: aliases.nome_camada(c['id'], c['nome'])
                    for categoria in result['categorias'] for c in categoria['camadas']}
    ocorrencias_camada = {c['id']: c['resumo'].get('ocorrencias') or 0
                          for categoria in result['categorias'] for c in categoria['camadas']}
    categorias = list(dict.fromkeys(c['nome'] for c in result['categorias']))
    cor_categoria = {nome: PALETA[i % len(PALETA)] for i, nome in enumerate(categorias)}
    feicoes = feicoes_atingidas(result, tabela)
    quantidade_bases = len(nomes_camada)
    metade = LARGURA / 2 - 3

    # 1. Cabeçalho identificador com nomes amigáveis.
    identificacao = _quadro(estilos, 'Identificação', [
        ('Nome da saída', proc['nome_saida']), ('Responsável', proc.get('responsavel_nome') or proc.get('responsavel')),
        ('Data da execução', hora(proc.get('finalizado_em'))),
        ('Duração', f"{numero(proc.get('duracao_segundos', 0), 1)} s"),
        ('Operação', OPERACOES.get(proc['operacao'], proc['operacao']))], metade)
    quadro_entrada = _quadro(estilos, 'Camada de entrada', [
        ('Camada', info_entrada['nome']), ('Tipo de geometria', TIPOS[dimensao]),
        ('Feições', entrada.get('feicoes')),
        (TOTAL[dimensao], medida(result['medida_total_input_si'], dimensao)),
        ('Origem', 'Storage de dados geoespaciais' if entrada.get('origem') == 'storage' else 'Banco do SICARD')], metade)
    parametros = _quadro(estilos, 'Parâmetros do processamento',
                         [(aliases.opcao(k), 'Sim' if v else 'Não') for k, v in (proc.get('opcoes') or {}).items()],
                         metade, .6)
    quadro_resultado = _quadro(estilos, 'Resultado', [
        ('Linhas na tabela de saída', len(tabela)), ('Interseções', resumo.get('ocorrencias')),
        ('Camadas atingidas', f"{resumo.get('camadas_intersectadas', 0)} de {quantidade_bases}"),
        ('Categorias atingidas', f"{sum(1 for c in result['categorias'] if c['resumo'].get('ocorrencias'))} "
                                 f"de {len(result['categorias'])}"),
        ('Sistema de referência do pacote', 'SIRGAS 2000 (EPSG:4674)')], metade, .55)
    bases = [['Categoria', 'Camada base', 'Fonte', 'Feições', 'Situação']]
    for b in proc['bases']:
        info = aliases.camada(b.get('id'), b.get('nome'))
        bases.append([b.get('categoria'), info['nome'], info['fonte'], b.get('feicoes'),
                      'Com interseção' if ocorrencias_camada.get(b.get('id')) else 'Sem interseção'])
    historia = [
        _faixa_titulo(estilos, 'Relatório analítico', proc['nome_saida'],
                      f"SICARD · Extração de atributos · {hora(proc.get('finalizado_em'))}"),
        Spacer(1, 8),
        _lado_a_lado(identificacao, quadro_entrada), Spacer(1, 6),
        _lado_a_lado(parametros, quadro_resultado), Spacer(1, 6),
        KeepTogether([_p(estilos, 'Camadas base consideradas', 'h2'),
                      _tabela(estilos, bases, [70, 175, 150, 45, LARGURA - 440], direita=(3,))]),
    ]

    # 2. Resumo executivo.
    if dimensao == 0:
        indicadores = [(numero(result['medida_total_input_si'], 0), 'Pontos na entrada'),
                       (numero(resumo.get('pontos_dentro'), 0), 'Pontos em alguma base'),
                       (percentual(resumo.get('percentual')), 'Parcela dos pontos'),
                       (f"{resumo.get('camadas_intersectadas', 0)} de {quantidade_bases}", 'Camadas com pontos')]
    else:
        indicadores = [(medida(result['medida_total_input_si'], dimensao), TOTAL[dimensao]),
                       (medida(resumo.get('medida_unica_si'), dimensao), f"{MEDIDA[dimensao]} (total único)"),
                       (percentual(resumo.get('percentual')), 'Parcela da entrada atingida'),
                       (numero(resumo.get('ocorrencias'), 0), 'Interseções'),
                       (f"{resumo.get('camadas_intersectadas', 0)} de {quantidade_bases}", 'Camadas atingidas')]
    historia += [KeepTogether([_p(estilos, 'Resumo executivo', 'h1'), _kpis(estilos, indicadores)])]

    # 3. Mapa.
    if mapa:
        historia += [KeepTogether([
            _p(estilos, 'Mapa de localização', 'h1'), _imagem(mapa, altura_maxima=ALTURA * .78),
            _p(estilos, 'Camada de entrada (azul-escuro) sobre todas as camadas base consideradas, com o entorno. '
                        + ('Em vermelho, os pontos dentro de alguma base.' if dimensao == 0 else 'Em vermelho, as partes atingidas.')
                        + (f' {aviso_mapa}' if aviso_mapa else ''), 'nota')])]

    # 4. Gráficos.
    historia += [PageBreak(), _p(estilos, 'Gráficos', 'h1')]
    if not resumo.get('ocorrencias'):
        historia += [_p(estilos, 'Nenhuma interseção com as camadas base: não há gráficos a apresentar.')]
    elif dimensao == 0:
        camadas = [(categoria, c) for categoria in result['categorias'] for c in categoria['camadas']]
        dentro = [c['estatisticas'].get('pontos_dentro', 0) for _, c in camadas]
        historia += [KeepTogether([
            _p(estilos, 'Pontos dentro e fora de cada camada base', 'h2'),
            _imagem(_grafico(pasta / 'grafico_camadas.png', [nomes_camada[c['id']] for _, c in camadas], dentro,
                             [f"{d} dentro · {c['estatisticas'].get('pontos_fora', 0)} fora" for d, (_, c) in zip(dentro, camadas)],
                             '#02a344', 'Pontos',
                             legenda=[('Dentro', '#02a344'), ('Fora', '#c9d5df')],
                             empilhado={'valores': [c['estatisticas'].get('pontos_fora', 0) for _, c in camadas],
                                        'cor': '#c9d5df'}), altura_maxima=ALTURA * .6)])]
    else:
        unidade = UNIDADE[dimensao]
        historia += [KeepTogether([
            _p(estilos, f'{MEDIDA[dimensao]} por categoria (total único)', 'h2'),
            _imagem(_grafico(pasta / 'grafico_categorias.png', [c['nome'] for c in result['categorias']],
                             [na_unidade(c['resumo'].get('medida_unica_si') or 0, dimensao) for c in result['categorias']],
                             [f"{medida(c['resumo'].get('medida_unica_si'), dimensao)} · {percentual(c['resumo']['percentual'])}"
                              for c in result['categorias']],
                             [cor_categoria[c['nome']] for c in result['categorias']], unidade), altura_maxima=ALTURA * .4)])]
        camadas = [(categoria, c) for categoria in result['categorias'] for c in categoria['camadas']]
        historia += [KeepTogether([
            _p(estilos, f'{MEDIDA[dimensao]} por camada base (total único)', 'h2'),
            _imagem(_grafico(pasta / 'grafico_camadas.png', [nomes_camada[c['id']] for _, c in camadas],
                             [na_unidade(c['resumo'].get('medida_unica_si') or 0, dimensao) for _, c in camadas],
                             [f"{medida(c['resumo'].get('medida_unica_si'), dimensao)} · {percentual(c['resumo']['percentual'])}"
                              for _, c in camadas],
                             [cor_categoria[categoria['nome']] for categoria, _ in camadas], unidade,
                             legenda=[(nome, cor_categoria[nome]) for nome in categorias]), altura_maxima=ALTURA * .6)])]
    if feicoes:
        ranking = feicoes[:10]
        historia += [KeepTogether([
            _p(estilos, 'Feições das bases mais atingidas (até 10)', 'h2'),
            _imagem(_grafico(pasta / 'grafico_ranking.png', [f"{f['nome']} ({f['camada']})" for f in ranking],
                             [na_unidade(f['medida_si'], dimensao) for f in ranking],
                             [f"{medida(f['medida_si'], dimensao)} · {percentual(f['percentual'])}" for f in ranking],
                             [cor_categoria[f['categoria']] for f in ranking], UNIDADE[dimensao],
                             legenda=[(n, cor_categoria[n]) for n in dict.fromkeys(f['categoria'] for f in ranking)]),
                    altura_maxima=ALTURA * .55),
            _p(estilos, 'Cada feição é identificada pelo campo de nome da sua camada; a medida é a união das partes '
                        'atingidas daquela feição.', 'nota')])]

    # 5. Análise por categoria.
    historia += [PageBreak(), _p(estilos, 'Análise por categoria', 'h1')]
    rotulo_medida = 'Pontos' if dimensao == 0 else f'{MEDIDA[dimensao]} ({UNIDADE[dimensao]})'
    for categoria in result['categorias']:
        c_resumo = categoria['resumo']
        atingidas = sum(1 for c in categoria['camadas'] if c['resumo'].get('ocorrencias'))
        valor = (f"{c_resumo.get('pontos_dentro', 0)} ponto(s)" if dimensao == 0
                 else medida(c_resumo.get('medida_unica_si'), dimensao))
        bloco = [_p(estilos, categoria['nome'], 'h2'), _p(estilos, categoria.get('conceito'), 'nota'), Spacer(1, 2),
                 _p(estilos, f"{MEDIDA[dimensao]}: {valor} ({percentual(c_resumo.get('percentual'))} da entrada) · "
                             f"Interseções: {c_resumo.get('ocorrencias', 0)} · Camadas atingidas: {atingidas} de "
                             f"{len(categoria['camadas'])}")]
        da_categoria = [f for f in feicoes if f['categoria_id'] == categoria['id']]
        if da_categoria:
            linhas = [['Feição', 'Camada base', rotulo_medida, '% da entrada']]
            linhas += [[f['nome'], f['camada'],
                        numero(na_unidade(f['medida_si'], dimensao), 0 if dimensao == 0 else 4),
                        percentual(f['percentual'])] for f in da_categoria[:15]]
            bloco += [Spacer(1, 3), _tabela(estilos, linhas, [190, 175, 85, LARGURA - 450], direita=(2, 3))]
            if len(da_categoria) > 15:
                bloco.append(_p(estilos, f'Mais {len(da_categoria) - 15} feição(ões) atingida(s) nesta categoria: '
                                         'a lista completa está no XLSX do pacote.', 'nota'))
        sem = [nomes_camada[c['id']] for c in categoria['camadas'] if not c['resumo'].get('ocorrencias')]
        if sem:
            bloco.append(_p(estilos, 'Sem interseção: ' + '; '.join(sem) + '.', 'nota'))
        historia += [KeepTogether(bloco[:6]), *bloco[6:], Spacer(1, 4)]

    # 6. Conclusões.
    historia += [KeepTogether([_p(estilos, 'O que se pode concluir', 'h1'),
                               *[_p(estilos, frase, 'item', bulletText='•')
                                 for frase in _conclusoes(result, proc, feicoes, nomes_camada)]])]

    # 7. Metodologia resumida, limitações e dicionário de aliases.
    limitacoes = [
        'Interseção calculada pelo GDAL/OGR com as geometrias em SIRGAS 2000 / Brazil Polyconic (EPSG:5880); as '
        'medidas são planimétricas e estão sujeitas às distorções dessa projeção.',
        'Parcela atingida = medida da união das partes atingidas ÷ medida da união da entrada. Sobreposições entre '
        'camadas não são contadas duas vezes, e percentuais de grupos diferentes não se somam.',
        'As camadas base foram lidas do storage no momento da execução; a procedência de cada arquivo (tamanho, data e '
        'SHA-256) está no relatório de processamento.',
        'O resultado reflete a versão das bases usada; atualizações posteriores das fontes não estão incluídas.',
        'Os nomes amigáveis seguem o dicionário do apêndice; os marcados como regra automática não tiveram o '
        'significado confirmado. A tabela completa, com os nomes brutos, está no XLSX e no CSV do pacote.',
    ]
    if dimensao == 0:
        limitacoes.insert(1, 'Ponto sobre o limite de uma feição da base conta como dentro.')
    historia += [KeepTogether([_p(estilos, 'Metodologia resumida e limitações', 'h1'),
                               *[_p(estilos, frase, 'item', bulletText='•') for frase in limitacoes]])]
    dicionario = aliases.dicionario(colunas(tabela), estrutura, (entrada.get('id'), entrada.get('nome')))
    historia += [PageBreak(), _p(estilos, 'Apêndice · Dicionário de aliases', 'h1'),
                 _p(estilos, 'Campo bruto da tabela de atributos da geometria de saída e o nome amigável usado neste '
                             'relatório.', 'nota'), Spacer(1, 3),
                 _tabela(estilos, [['Campo bruto', 'Alias', 'Origem do alias'], *[list(item) for item in dicionario]],
                         [235, 180, LARGURA - 415])]
    _construir(path, 'Relatório analítico da extração de atributos', historia)
