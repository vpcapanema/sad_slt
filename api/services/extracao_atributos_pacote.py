"""Pacote obrigatório de toda extração de atributos.

Montado em memória ao final da execução e guardado no banco
(geoprocessamento.extracao_atributos): GeoPackage com a geometria resultante e a
entrada, relatório de processamento em PDF, relatório analítico em PDF, planilha
XLSX e tabela CSV. Os arquivos só passam por uma pasta temporária enquanto são
escritos; nada fica no disco.
"""
from __future__ import annotations

import io
import json
import platform
import tempfile
import zipfile
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from xml.sax.saxutils import escape
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from api.repositories.camada_geoespacial_repository import _json_safe
from api.services import extracao_atributos_exportacao as exportacao
from api.services.ciclo_vida_arquivos import apelido

# Chave -> (sufixo do arquivo, rótulo). A ordem é a ordem dentro do .zip.
ARQUIVOS = {
    'gpkg': ('.gpkg', 'GeoPackage com a geometria resultante e a entrada'),
    'pdf_processamento': ('_relatorio_processamento.pdf', 'Relatório de processamento'),
    'pdf_analitico': ('_relatorio_analitico.pdf', 'Relatório analítico'),
    'xlsx': ('_ocorrencias.xlsx', 'Planilha de ocorrências e estatísticas'),
    'csv': ('_ocorrencias.csv', 'Tabela de ocorrências'),
}
FUSO = ZoneInfo('America/Sao_Paulo')


def nomes(nome_saida: str) -> dict[str, str]:
    base = apelido(nome_saida, 60) or 'extracao'
    return {chave: f'{base}{sufixo}' for chave, (sufixo, _) in ARQUIVOS.items()}


def _para_gpkg(frame):
    """Colunas de dicionário ou lista viram texto JSON; datas, texto ISO."""
    data = frame.copy()
    if data.geometry.name != 'geometry':
        data = data.rename_geometry('geometry')
    for coluna in data.columns:
        if coluna == 'geometry':
            continue
        valores = [_json_safe(v) for v in data[coluna]]
        if any(isinstance(v, (dict, list)) for v in valores):
            data[coluna] = [None if v is None else json.dumps(v, ensure_ascii=False) for v in valores]
        elif any(hasattr(v, 'isoformat') for v in data[coluna]):
            data[coluna] = valores
    return data


def escrever_gpkg(saida, entrada, path: Path) -> None:
    for camada, frame in (('resultado', saida), ('entrada', entrada)):
        data = _para_gpkg(frame.to_crs(4674))
        extras = {'geometry_type': 'Unknown'} if data.empty else {}
        data.to_file(path, driver='GPKG', layer=camada, engine='pyogrio', index=False,
                     promote_to_multi=False, **extras)


def _hora(valor) -> str:
    if not valor:
        return '—'
    try:
        instante = datetime.fromisoformat(str(valor))
    except ValueError:
        return str(valor)
    return instante.astimezone(FUSO).strftime('%d/%m/%Y %H:%M:%S')


def _bytes(valor) -> str:
    if valor is None:
        return '—'
    numero, unidade = float(valor), 'B'
    for proxima in ('kB', 'MB', 'GB'):
        if numero < 1000:
            break
        numero, unidade = numero / 1000, proxima
    return f'{numero:,.1f} {unidade}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def pdf_processamento(proc: dict, path: Path) -> None:
    """Como a extração foi feita: parâmetros, procedência, etapas e ambiente."""
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Cell', fontName='Helvetica', fontSize=8, leading=10, wordWrap='CJK'))
    styles['BodyText'].fontSize = 9
    styles['BodyText'].leading = 12
    styles['Title'].textColor = colors.HexColor('#003b5a')
    for nome in ('Heading1', 'Heading2'):
        styles[nome].textColor = colors.HexColor('#003b5a')
        styles[nome].spaceBefore = 8
        styles[nome].spaceAfter = 4

    def p(valor, estilo='BodyText'):
        return Paragraph(escape(str(valor)), styles[estilo])

    def tabela(linhas, larguras=None, cabecalho=True):
        item = Table([[p(v, 'Cell') for v in linha] for linha in linhas], colWidths=larguras,
                     repeatRows=1 if cabecalho else 0, hAlign='LEFT')
        estilo = [('VALIGN', (0, 0), (-1, -1), 'TOP'),
                  ('ROWBACKGROUNDS', (0, 1 if cabecalho else 0), (-1, -1), [colors.white, colors.HexColor('#f5f7f8')]),
                  ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 5)]
        if cabecalho:
            estilo += [('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e6eff5')),
                       ('LINEBELOW', (0, 0), (-1, 0), .7, colors.HexColor('#02a344'))]
        item.setStyle(TableStyle(estilo))
        return item

    entrada, saida, ambiente = proc['entrada'], proc['saida'], proc['ambiente']
    opcoes = proc.get('opcoes') or {}
    historia = [
        p('SICARD | Relatório de processamento', 'Title'),
        p(f"Extração de atributos · {proc['nome_saida']}", 'Heading2'),
        tabela([
            ['Execução', proc['execucao_id']],
            ['Responsável', proc.get('responsavel') or '—'],
            ['Início', _hora(proc.get('iniciado_em'))],
            ['Fim do processamento', _hora(proc.get('finalizado_em'))],
            ['Duração', f"{proc.get('duracao_segundos', 0):.1f} s"],
            ['Operação', {'intersection': 'Interseção', 'identity': 'Identidade'}.get(proc['operacao'], proc['operacao'])],
        ], [150, 590], cabecalho=False),
        p('Parâmetros do operador de overlay (GDAL/OGR)', 'Heading1'),
        tabela([['Opção', 'Valor'], *[[chave, 'sim' if valor else 'não'] for chave, valor in opcoes.items()]], [300, 440]),
        p('Camada de entrada', 'Heading1'),
        tabela([
            ['Nome', entrada.get('nome')], ['Identificador', entrada.get('id')],
            ['Origem', 'Storage do SICARD' if entrada.get('origem') == 'storage' else 'Banco do SICARD'],
            ['Arquivo', entrada.get('arquivo') or '—'], ['Feições', entrada.get('feicoes')],
            ['CRS de origem', entrada.get('crs') or '—'],
            ['Tamanho / modificação', f"{_bytes(entrada.get('tamanho_bytes'))} · {_hora(entrada.get('modificado_em'))}"
             if entrada.get('origem') == 'storage' else '—'],
            ['SHA-256 do arquivo', entrada.get('sha256') or '—'],
        ], [150, 590], cabecalho=False),
        p('Camadas de base', 'Heading1'),
        p('Lidas do storage no momento da execução. A impressão digital (tamanho, data e SHA-256) '
          'permite verificar se o arquivo ainda é o mesmo.'),
        tabela([['Categoria', 'Camada', 'Arquivo', 'Feições', 'Tamanho', 'Modificado em', 'SHA-256'],
                *[[b.get('categoria'), b.get('nome'), b.get('arquivo') or b.get('id'), b.get('feicoes'),
                   _bytes(b.get('tamanho_bytes')), _hora(b.get('modificado_em')), b.get('sha256') or '—']
                  for b in proc['bases']]],
               [85, 95, 150, 45, 55, 85, 225]),
        p('Saída', 'Heading1'),
        tabela([
            ['Camada resultante (banco)', saida.get('camada_resultado_id')],
            ['Feições resultantes', saida.get('feicoes')],
            ['CRS no pacote', 'EPSG:4674 (SIRGAS 2000)'],
            ['Ocorrências', saida.get('ocorrencias')], ['Camadas intersectadas', saida.get('camadas_intersectadas')],
        ], [150, 590], cabecalho=False),
        p('Etapas do processamento', 'Heading1'),
        tabela([['Horário', 'Etapa'], *[[_hora(e.get('em')), e.get('mensagem')] for e in proc['etapas']]], [120, 620]),
        p('Ambiente de execução', 'Heading1'),
        tabela([[chave, valor] for chave, valor in ambiente.items()], [150, 590], cabecalho=False),
        p('Conteúdo do pacote', 'Heading1'),
        tabela([['Arquivo', 'Descrição'], *[[nome, ARQUIVOS[chave][1]] for chave, nome in proc['arquivos'].items()]], [300, 440]),
        Spacer(1, 6),
        p('As medidas e estatísticas estão no relatório analítico. O SHA-256 de cada arquivo do pacote fica '
          'registrado no banco junto com a execução.'),
    ]

    def rodape(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.drawString(36, 20, 'SICARD - Relatório de processamento da extração de atributos')
        canvas.drawRightString(805, 20, f'Página {doc.page}')
        canvas.restoreState()

    SimpleDocTemplate(str(path), pagesize=landscape(A4), rightMargin=36, leftMargin=36, topMargin=32,
                      bottomMargin=34, title='Relatório de processamento - SICARD').build(
        historia, onFirstPage=rodape, onLaterPages=rodape)


def ambiente() -> dict[str, str]:
    import geopandas
    import pyogrio
    import shapely
    from osgeo import gdal
    return {'Motor': 'GDAL/OGR', 'GDAL': gdal.VersionInfo('RELEASE_NAME'), 'GeoPandas': geopandas.__version__,
            'Shapely': shapely.__version__, 'pyogrio': pyogrio.__version__, 'Python': platform.python_version()}


def montar_pacote(result: dict, saida, entrada, proc: dict) -> tuple[bytes, str, list[dict]]:
    """Escreve os cinco arquivos, confere cada um e devolve (zip, nome do zip, manifesto)."""
    arquivos = nomes(proc['nome_saida'])
    with tempfile.TemporaryDirectory(prefix='sicard_extracao_') as temporaria:
        pasta = Path(temporaria)
        escrever_gpkg(saida, entrada, pasta / arquivos['gpkg'])
        exportacao.pdf(result, pasta / arquivos['pdf_analitico'])
        exportacao.escrever_xlsx(result, pasta / arquivos['xlsx'])
        exportacao.escrever_csv(result, pasta / arquivos['csv'])
        pdf_processamento({**proc, 'arquivos': arquivos}, pasta / arquivos['pdf_processamento'])
        manifesto = []
        memoria = io.BytesIO()
        with zipfile.ZipFile(memoria, 'w', zipfile.ZIP_DEFLATED) as pacote:
            for chave, nome in arquivos.items():
                conteudo = (pasta / nome).read_bytes()
                if not conteudo:
                    raise ValueError(f'O arquivo {nome} do pacote saiu vazio.')
                pacote.writestr(nome, conteudo)
                manifesto.append({'chave': chave, 'nome': nome, 'descricao': ARQUIVOS[chave][1],
                                  'tamanho_bytes': len(conteudo), 'sha256': sha256(conteudo).hexdigest()})
    return memoria.getvalue(), f"{Path(arquivos['gpkg']).stem}.zip", manifesto


def ler_do_pacote(pacote: bytes, nome: str) -> bytes:
    with zipfile.ZipFile(io.BytesIO(pacote)) as arquivo:
        return arquivo.read(nome)
