"""Estrutura comum dos relatórios decisórios das Fases 1 e 2."""
from io import BytesIO
from pathlib import Path
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Flowable, PageBreak, Spacer, Paragraph, Table, TableStyle
from PIL import Image

from api.services import cartografia_relatorio_fases as cartografia
from api.services import extracao_atributos_relatorios as estilo, elegibilidade_sintese as sintese


SLOGAN = ('Inteligência territorial para apoiar as decisões da '
          'Subsecretaria de Logística e Transporte (SLT)')


def _hero(e, titulo_documento=None):
    caminho = Path(__file__).resolve().parents[2] / 'assets' / 'img' / 'brand' / 'sicard-simbolo.png'
    # O arquivo institucional tem margens transparentes; o recorte só remove essas margens.
    with Image.open(caminho) as imagem:
        logo = imagem.convert('RGBA')
        logo = logo.crop(logo.getchannel('A').getbbox())
        buffer = BytesIO()
        logo.save(buffer, format='PNG')
    from reportlab.platypus import Image as ImagemPDF
    altura = 46 * logo.height / logo.width
    marca = ImagemPDF(BytesIO(buffer.getvalue()), width=46, height=altura)
    titulo = ParagraphStyle('marca', parent=e['titulo'], fontSize=17, leading=20)
    nome = ParagraphStyle('nomeSistema', parent=e['subtitulo'], fontSize=10.5, leading=14)
    slogan = ParagraphStyle('slogan', parent=e['subtitulo'], fontSize=8.5, leading=12)
    texto = [Paragraph('SICARD', titulo),
             Paragraph('Sistema Inteligente de Cadastro e Ranking de Demandas', nome),
             Spacer(1, 5), Paragraph(escape(SLOGAN), slogan)]
    if titulo_documento:
        texto += [Spacer(1, 8), Paragraph(escape(titulo_documento), nome)]
    tabela = Table([[marca, texto]], colWidths=[68, estilo.LARGURA - 68])
    tabela.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), estilo.AZUL),
        ('LINEBELOW', (0, 0), (-1, -1), 3, estilo.VERDE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12)]))
    return tabela


def _campos(e, pares):
    linhas = []
    for rotulo, valor in pares:
        linhas.append([estilo._p(e, rotulo, 'celN'), estilo._p(e, valor, 'corpo')])
    tabela = Table(linhas, colWidths=[125, estilo.LARGURA - 125], hAlign='LEFT')
    tabela.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, -1), estilo.AZUL_CLARO),
        ('BACKGROUND', (1, 0), (1, -1), estilo.FUNDO),
        ('GRID', (0, 0), (-1, -1), .4, estilo.LINHA),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    return tabela


def _cards_situacao(e, fichas):
    contagem = sintese.indicadores(fichas)
    itens = [('total', 'Demandas analisadas', estilo.AZUL),
             *[(s, sintese.SITUACOES[s], colors.HexColor(sintese.CORES_SITUACAO[s]))
               for s in ('restricao', 'risco', 'ambas', 'livre')]]
    dados = []
    for chave, rotulo, cor in itens:
        valor = ParagraphStyle('valor-' + chave, parent=e['kpiValor'], textColor=cor)
        legenda = ParagraphStyle('rotulo-' + chave, parent=e['kpiRotulo'], textColor=cor)
        dados.append([Paragraph(str(contagem[chave]), valor), Paragraph(escape(rotulo), legenda)])
    tabela = Table([dados], colWidths=[estilo.LARGURA / 5] * 5)
    comandos = [('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 7),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]
    for pos, (_, _, cor) in enumerate(itens):
        fundo = colors.Color(.92 + .08 * cor.red, .92 + .08 * cor.green, .92 + .08 * cor.blue)
        comandos += [('BACKGROUND', (pos, 0), (pos, 0), fundo),
                     ('LINEABOVE', (pos, 0), (pos, 0), 2, cor)]
    tabela.setStyle(TableStyle(comandos))
    return tabela


def _tabela_situacao(e, fichas, area_pdf):
    tabela = sintese.tabela_resumo(e, fichas, area_pdf)
    comandos = []
    for pos, ficha in enumerate(sintese.ordenar_por_situacao(fichas), 1):
        cor = colors.HexColor(sintese.CORES_SITUACAO[ficha['situacao']])
        fundo = colors.Color(.92 + .08 * cor.red, .92 + .08 * cor.green, .92 + .08 * cor.blue)
        comandos += [('BACKGROUND', (1, pos), (1, pos), fundo),
                     ('LINEBEFORE', (1, pos), (1, pos), 2, cor)]
    tabela.setStyle(TableStyle(comandos))
    return tabela


def _organizar_topicos(historia, e):
    resultado = []
    for bloco in historia:
        if isinstance(bloco, Paragraph) and bloco.style.name in ('corpo', 'nota'):
            estilo_item = ParagraphStyle('topico-' + bloco.style.name, parent=bloco.style,
                                         alignment=TA_JUSTIFY, leftIndent=10, bulletIndent=0,
                                         spaceAfter=4)
            for trecho in re.split(r'(?<=[.!?])\s+(?=[A-ZÀ-Ú])', bloco.text):
                resultado.append(Paragraph(trecho, estilo_item, bulletText='•'))
        else:
            resultado.append(bloco)
    return resultado


class AmostraLegenda(Flowable):
    def __init__(self, cor, textura=None):
        super().__init__()
        self.width, self.height = 24, 12
        self.cor, self.textura = cor, textura

    def draw(self):
        imagem = cartografia.amostra_simbolo(self.cor, self.textura)
        self.canv.drawImage(ImageReader(imagem), 0, 0, self.width, self.height)


class MapaContexto(Flowable):
    def __init__(self, mapa):
        super().__init__()
        self.mapa = mapa
        self.width = estilo.LARGURA
        self.height = self.width * mapa['altura'] / mapa['largura'] + 28

    def draw(self):
        c, m = self.canv, self.mapa
        altura = self.height - 28
        c.drawImage(ImageReader(BytesIO(m['png'])), 0, 28, self.width, altura)
        c.setStrokeColor(colors.HexColor('#455a64'))
        c.rect(0, 28, self.width, altura, fill=0, stroke=1)
        usados = set()
        for r in m['rotulos']:
            x = r['x'] / m['largura'] * self.width
            y = 28 + (1 - r['y'] / m['altura']) * altura
            gx, gy = round(x / 16), round(y / 12)
            for deslocamento in range(1000):
                dx = (deslocamento % 15) - 7 if deslocamento else 0
                dy = deslocamento // 15 if deslocamento else 0
                celula = (gx + dx, gy + dy)
                lx, ly = celula[0] * 16, celula[1] * 12
                if celula not in usados and 8 <= lx <= self.width - 8 and 36 <= ly <= self.height - 12:
                    usados.add(celula)
                    break
            else:
                raise ValueError('Demandas demais para rotular legivelmente neste mapa. Divida o conjunto para emitir o relatório.')
            c.setStrokeColor(colors.HexColor('#111827'))
            c.setLineWidth(.4)
            c.line(x, y, lx, ly)
            c.setFillColor(colors.HexColor('#111827'))
            c.circle(x, y, 1.8, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.circle(lx, ly, 5.7, fill=1, stroke=1)
            c.setFillColor(colors.HexColor('#111827'))
            c.setFont('Helvetica-Bold', 5.8)
            c.drawCentredString(lx, ly - 2, str(r['numero']))
        c.setFillColor(estilo.AZUL)
        c.setFont('Helvetica-Bold', 9)
        c.drawRightString(self.width - 9, self.height - 13, 'N')
        c.line(self.width - 12, self.height - 40, self.width - 12, self.height - 20)
        c.line(self.width - 15, self.height - 24, self.width - 12, self.height - 20)
        c.line(self.width - 9, self.height - 24, self.width - 12, self.height - 20)
        metros = m['pixel_m'] * m['largura'] / self.width * 80
        c.setFont('Helvetica', 7)
        c.line(5, 14, 85, 14)
        c.line(5, 11, 5, 17)
        c.line(85, 11, 85, 17)
        c.drawString(5, 2, f'{estilo.numero(metros / 1000)} km')
        c.drawRightString(self.width, 2, 'SIRGAS 2000 / Brazil Polyconic · EPSG:5880')


class ComparacaoIndices(Flowable):
    def __init__(self, linhas):
        super().__init__()
        self.linhas = linhas
        self.width = estilo.LARGURA
        self.height = 46 + 24 * len(linhas)

    def draw(self):
        c = self.canv
        esquerda, largura = 40, self.width - 65
        y = self.height - 12
        c.setFont('Helvetica', 7)
        for valor in (0, .25, .5, .75, 1):
            x = esquerda + largura * valor
            c.setStrokeColor(colors.HexColor('#d1d5db'))
            c.line(x, 20, x, y)
            c.setFillColor(estilo.AZUL)
            c.drawCentredString(x, y + 2, str(valor).replace('.', ','))
        for pos, linha in enumerate(self.linhas):
            yy = y - 16 - pos * 24
            c.setFillColor(estilo.AZUL)
            c.drawString(2, yy - 3, str(linha['numero']))
            for deslocamento, papel, cor in ((0, 'grade', '#176878'), (-8, 'rede', '#69438a')):
                valor = linha[papel]['indice']
                if valor is None or not 0 <= valor <= 1:
                    continue
                c.setFillColor(colors.HexColor(cor))
                c.rect(esquerda, yy + deslocamento, largura * valor, 5, fill=1, stroke=0)
                if valor == 0:
                    c.circle(esquerda, yy + deslocamento + 2.5, 2, fill=1, stroke=0)
        c.setFillColor(colors.HexColor('#176878'))
        c.rect(2, 4, 8, 6, fill=1, stroke=0)
        c.drawString(14, 4, 'Grade')
        c.setFillColor(colors.HexColor('#69438a'))
        c.rect(75, 4, 8, 6, fill=1, stroke=0)
        c.drawString(87, 4, 'Rede')


def resultados_favorabilidade(entrada, config):
    from api.services import agregacao_favorabilidade as agregacao
    linhas = []
    for pos, linha in enumerate(entrada['linhas'], 1):
        resultado = {'numero': pos, 'nome': linha['nome'] or f'Demanda {linha["id"]}'}
        for papel in ('grade', 'rede'):
            raster = next((r for r in linha.get('rasters', []) if r['papel'] == papel), None)
            itens = [s for s in linha['sobreposicoes'] if s['papel'] == papel]
            validos = [s['favorabilidade']['indice'] for s in itens if s['favorabilidade']['estado_indice'] == 'valido']
            if raster:
                valor, metodo = raster['indice'], 'Média ponderada pela área'
                cobertura = f'{estilo.numero(raster["cobertura_percentual"])}%'
            elif config:
                valor, metodo = agregacao.calcular(validos, config), f'Medida salva: {config["medida"]}'
                cobertura = 'Não calculada para vetor'
            elif len(validos) == 1:
                valor, metodo, cobertura = validos[0], 'Único índice válido', 'Não calculada para vetor'
            else:
                valor, metodo, cobertura = None, 'Agregação não definida' if validos else 'Sem índice válido', 'Não calculada para vetor'
            bases = [b for b in entrada['campos'] if b['papel'] == papel]
            if not bases:
                metodo, cobertura = 'Superfície não utilizada', '—'
            resultado[papel] = {'indice': valor, 'metodo': metodo, 'cobertura': cobertura,
                                'validos': len(validos), 'sem_indice': len(itens) - len(validos),
                                'unidade': '%' if config and config['medida'] == 'cv' and not raster else 'índice'}
        linhas.append(resultado)
    return linhas


def _celula_indice(e, item):
    valor = item['indice']
    if valor is None:
        texto = 'Sem resultado' if item['validos'] else 'Sem índice válido'
    else:
        texto = estilo.numero(valor) + ('%' if item['unidade'] == '%' else '')
    return Paragraph(f'<b>{escape(texto)}</b><br/>{escape(item["metodo"])}<br/>'
                     f'Cobertura válida: {escape(item["cobertura"])}'
                     + (f'<br/>{item["sem_indice"]} ocorrência(s) sem índice válido' if item['sem_indice'] else ''), e['cel'])


def _legenda(e, mapa):
    if mapa['tipo'] == 'bases':
        grupos = {papel: [] for papel in ('restricao', 'risco')}
        for item in mapa['simbolos']:
            grupos[item['papel']].append([
                AmostraLegenda(item['cor'], item['textura']), estilo._p(e, item['nome'], 'cel')])
        tabelas = []
        largura = estilo.LARGURA / 2
        for papel, titulo in (('restricao', 'Restrições'), ('risco', 'Riscos')):
            linhas = [[estilo._p(e, titulo, 'h2'), ''], *grupos[papel]]
            if not grupos[papel]:
                linhas.append([estilo._p(e, 'Nenhuma camada utilizada.', 'nota'), ''])
            coluna = Table(linhas, colWidths=[30, largura - 40], hAlign='LEFT')
            coluna.setStyle(TableStyle([('SPAN', (0, 0), (-1, 0)),
                                       ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                       ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
            tabelas.append(coluna)
        return estilo._lado_a_lado(*tabelas)
    linhas = []
    for nome, cor in mapa['legenda']:
        celula = Table([['']], colWidths=[10], rowHeights=[9])
        celula.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(cor))]))
        linhas.append([celula, estilo._p(e, nome, 'cel')])
    if not linhas:
        return estilo._p(e, 'Nenhuma base utilizada neste componente.', 'nota')
    return Table(linhas, colWidths=[18, estilo.LARGURA - 18], hAlign='LEFT')


def documento(modelo):
    from api.services import elegibilidade_relatorio as relatorio
    from api.services import criterios_relatorio_fases
    analise = modelo.get('analise', 'elegibilidade')
    fase = 1 if analise == 'elegibilidade' else 2
    assunto = relatorio._titulo_analise(analise)
    objetivo = ('Identificar restrições e riscos ambientais e territoriais nas demandas analisadas.'
                if fase == 1 else 'Apresentar os índices de favorabilidade territorial de grade e de rede de cada demanda.')
    pergunta = ('Quais demandas apresentam restrições ou riscos nas camadas utilizadas?'
                if fase == 1 else 'Quais são os índices de favorabilidade de cada demanda e como se comparam?')
    e = estilo._estilos()
    for chave in ('corpo', 'nota', 'item'):
        e[chave].alignment = TA_JUSTIFY
    for chave in ('h1', 'h2'):
        e[chave].keepWithNext = True
    titulo_relatorio = f'Relatório de {assunto} à Implantação/Execução de Demandas de Logística e Transportes'
    historia = [_hero(e), Spacer(1, 12),
                estilo._p(e, titulo_relatorio, 'h1'),
                estilo._p(e, f'Fase {fase} — {assunto}', 'h2'),
                estilo._p(e, '1 — Identificação e alcance da análise', 'h1'),
                _campos(e, [('Emitido em', estilo.hora(modelo['gerado_em'])),
                            ('Objetivo:', objetivo), ('Pergunta da fase:', pergunta),
                            ('Entradas concluídas:', f'{modelo["concluidas"]} de {modelo["previstas"]}')]),
                estilo._p(e,
                          'Todas as demandas concluídas estão incluídas, independentemente dos filtros da página.')]
    if modelo['concluidas'] != modelo['previstas']:
        historia.append(estilo._p(e, 'RELATÓRIO PARCIAL. Entradas não concluídas não recebem resultado.', 'h2'))
    for entrada in modelo['entradas']:
        historia += [Spacer(1, 5), _campos(e, [
            ('Hierarquização / análise', entrada.get('hierarquizacao') or 'Análise avulsa'),
            ('Conjunto de demandas', entrada['nome']), ('Execução', entrada['id']),
            ('Conclusão', estilo.hora(entrada.get('concluido_em'))),
            ('Demandas', entrada['feicoes'])])]
    historia += [estilo._p(e, '2 — Resultados por demanda', 'h1'),
                 estilo._p(e, sintese.CONCEITO if fase == 1 else
                           'Os índices de favorabilidade são o resultado principal desta fase. Valores maiores representam '
                           'maior favorabilidade segundo os critérios das superfícies, não prioridade final de investimento. '
                           'Os componentes grade e rede são apresentados separadamente, sem criar um escore combinado.')]
    for entrada in modelo['entradas']:
        historia.append(estilo._p(e, entrada['nome'], 'h2'))
        if fase == 1:
            fichas = sintese.caracterizar(entrada)
            indicadores = sintese.indicadores(fichas)
            historia += [estilo._p(e, f'Demandas analisadas: {len(fichas)}.'),
                         estilo._p(e, f'Demandas com restrição ou risco: {len(fichas) - indicadores["livre"]}. '
                                      f'Demandas livres de restrições e riscos: {indicadores["livre"]}.'),
                         _cards_situacao(e, fichas),
                         estilo._p(e, 'Situação das Demandas quanto a Restrições e Riscos', 'h2'),
                         _tabela_situacao(e, fichas, relatorio._area_pdf),
                         estilo._p(e, 'Resumo da Elegibilidade', 'h2'), estilo._p(e, sintese.NOTA_INDICE, 'nota'),
                         sintese.tabela_resumo_elegibilidade(e, entrada)]
        else:
            linhas = resultados_favorabilidade(entrada, modelo.get('agregacao'))
            tabela = [['Nº / Demanda', 'Índice de favorabilidade territorial de grade', 'Índice de favorabilidade de rede']]
            tabela += [[f'{r["numero"]} — {r["nome"]}', _celula_indice(e, r['grade']), _celula_indice(e, r['rede'])] for r in linhas]
            historia.append(estilo._tabela(e, tabela, [estilo.LARGURA * .4, estilo.LARGURA * .3, estilo.LARGURA * .3]))
            historia.append(estilo._p(e, 'Comparação dos índices por demanda', 'h2'))
            for inicio in range(0, len(linhas), 16):
                historia.append(ComparacaoIndices(linhas[inicio:inicio + 16]))
            historia.append(estilo._p(e, 'Escala fixa de 0 a 1. As barras usam a numeração da tabela, sem ordenar ou criar ranking. '
                                     'Ausências não recebem barra; zero válido aparece como ponto no início do eixo. '
                                     'Medidas fora da escala de índice, como coeficiente de variação, ficam somente na tabela.', 'nota'))
    historia += [estilo._p(e, '3 — Como ler os resultados', 'h1'),
                 estilo._p(e, sintese.NOTA_LEITURA if fase == 1 else
                           'Zero é um índice válido; sem dados, campo ausente e índice inválido não são zero. '
                           'Raster: média ponderada pela área efetiva das células, acompanhada da cobertura válida; '
                           'NoData não participa da média. Cobertura parcial descreve somente a parcela com dados. '
                           'Vetores: utiliza-se a medida salva na análise; sem medida salva, um único índice válido é '
                           'apresentado diretamente e múltiplos valores permanecem sem síntese, sem inventar uma média. '
                           'Sem interseção significa ausência de feição interceptada, não índice zero. '
                           'As classes e os valores individuais permanecem nas tabelas do pacote, que preservam a precisão disponível.')]
    limite = cartografia.limite_sp()
    mapas = [(entrada, cartografia.preparar(entrada, analise, limite)) for entrada in modelo['entradas']]
    historia += [PageBreak(), estilo._p(e, '4 — Localização das demandas e bases utilizadas', 'h1')]
    for entrada, conjunto in mapas:
        for mapa in conjunto:
            historia += [estilo._p(e, f'{entrada["nome"]} — {mapa["titulo"]}', 'h2'), MapaContexto(mapa),
                         _legenda(e, mapa), estilo._p(e, mapa['interpretacao'], 'nota'),
                         estilo._p(e, 'Fontes: ' + ' '.join(mapa['fontes']) + ' Limite estadual: ' + mapa['limite'] + '.', 'nota')]
            if mapa['tipo'] == 'demandas':
                historia.append(estilo._tabela(e, [['Nº no mapa', 'Demanda'],
                    *[[r['numero'], r['nome']] for r in mapa['rotulos']]], [50, estilo.LARGURA - 50]))
            historia.append(PageBreak())
    historia.append(estilo._p(e, '5 — Critérios e metodologia das bases utilizadas', 'h1'))
    for entrada in modelo['entradas']:
        historia.append(estilo._p(e, entrada['nome'], 'h2'))
        for base in criterios_relatorio_fases.descrever(entrada['campos'], analise=analise):
            historia.append(estilo._p(e, base['nome'], 'h2'))
            for criterio in base['criterios']:
                historia.append(estilo._p(e, f'{criterio["nome"]}: {criterio["descricao"]}'))
                if criterio.get('fonte'):
                    historia.append(estilo._p(e, f'Fonte do critério: {criterio["fonte"]}', 'nota'))
            if base.get('agregacao'):
                historia.append(estilo._p(e, f'Composição dos índices: {base["agregacao"]}'))
            for evidencia in base.get('evidencias', []):
                historia.append(estilo._p(e, f'Evidência documental: {evidencia}', 'nota'))
            for aviso in base.get('avisos', []):
                historia.append(estilo._p(e, aviso, 'nota'))
            historia.append(estilo._p(e, f'Fonte vinculada: {base["id"]}', 'nota'))
    historia += [estilo._p(e, 'Metodologia da extração', 'h2'), estilo._p(e, modelo['metodologia']),
                 estilo._p(e, '6 — Limites, rastreabilidade e próximos passos', 'h1'),
                 estilo._p(e, 'Os índices e situações se limitam às fontes efetivamente utilizadas. '
                           'Não constituem benefício previsto, viabilidade comprovada, ranking ou homologação. '
                           'A emissão não altera o cadastro: o registro dos resultados da fase exige confirmação explícita. '
                           'O índice de risco ambiental e territorial da Fase 1 não constitui critério multicritério.'
                           if fase == 1 else
                           'Os índices se limitam aos critérios e fontes efetivamente utilizados. Não constituem benefício '
                           'previsto, viabilidade comprovada, ranking ou homologação. A emissão não altera o cadastro; '
                           'o registro dos resultados da fase exige confirmação explícita.'),
                 estilo._p(e, 'Os mapas das bases representam as fontes consultadas na emissão, recortadas a São Paulo, '
                           'e não somente os fragmentos internos às demandas. A revisão física é conferida quando '
                           'preservada nos metadados. Sem revisão histórica, a fonte atual é identificada como tal, '
                           'sem afirmar identidade com a versão histórica. Uma fonte indisponível ou uma revisão '
                           'divergente impede a emissão, não produz mapa vazio com aparência de sucesso. '
                           'Sobreposições e escala podem ocultar feições: os resultados numéricos e os recortes '
                           'preservados no GeoPackage são a referência para a conferência.'),
                 estilo._p(e, 'O pacote inclui GeoPackages, Excel, CSV e metadados com SHA-256. '
                           'Pixels e fragmentos detalhados ficam nesses arquivos de auditoria, sem substituir a síntese '
                           'por demanda. Editar uma cópia não atualiza o SICARD; corrija a fonte e gere nova execução '
                           'quando necessário, preservando o produto anterior.')]
    buffer = BytesIO()
    estilo._construir(buffer, assunto, _organizar_topicos(historia, e))
    return buffer.getvalue()
