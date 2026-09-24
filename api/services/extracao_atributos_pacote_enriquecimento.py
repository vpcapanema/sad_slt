"""Pacote do modo enriquecimento (etapas 6 e 7 do fluxo configurável).

Conteúdo do .zip:

* GeoPackage com uma camada por tipo de geometria da entrada (pontos, linhas,
  polígonos) e a camada de entrada, com os apelidos gravados como nome alternativo
  dos campos;
* uma tabela CSV por camada;
* planilha XLSX com uma aba por camada e a aba ``dicionario_campos``;
* dicionário de campos em CSV (campo, apelido, tema, base, campo de origem, regra);
* ``configuracao.json`` com entrada, bases, regras e procedência, para reproduzir
  o processamento.
"""
from __future__ import annotations

import csv
import io
import json
import tempfile
import zipfile
from hashlib import sha256
from pathlib import Path

from openpyxl import Workbook
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from api.services import extracao_atributos_exportacao as exportacao
from api.services.ciclo_vida_arquivos import apelido
from api.services.extracao_atributos_pacote import _para_gpkg

COLUNAS_DICIONARIO = ['camada', 'campo', 'apelido', 'tema', 'base', 'campo_origem', 'regra']


def nomes(nome_saida: str, camadas, finalidades=None) -> dict[str, tuple[str, str]]:
    base = apelido(nome_saida, 60) or 'extracao'
    arquivos = {'gpkg': (f'{base}.gpkg', 'GeoPackage com uma camada por tipo de geometria, as finalidades e a entrada')}
    for camada in camadas:
        arquivos[f'csv_{camada}'] = (f'{base}_{camada}.csv', f'Tabela de atributos da camada {camada}')
    for chave, item in (finalidades or {}).items():
        for camada in item['camadas']:
            descricao = f"Finalidade {item['nome']}: camada {camada}"
            arquivos[f'csv_{chave}_{camada}'] = (f'{base}_{chave}_{camada}.csv', descricao)
    arquivos['xlsx'] = (f'{base}_tabelas.xlsx', 'Planilha com uma aba por camada e o dicionário de campos')
    arquivos['csv_dicionario'] = (f'{base}_dicionario_campos.csv', 'Dicionário de campos')
    arquivos['configuracao'] = (f'{base}_configuracao.json', 'Configuração usada no processamento')
    arquivos['validacao'] = (f'{base}_validacao.json', 'Conferência do resultado')
    return arquivos


def _texto_xlsx(valor):
    valor = exportacao.celula_xlsx(valor)
    # Caractere de controle (ex.: \x0b vindo de texto colado) é recusado pelo Excel.
    return ILLEGAL_CHARACTERS_RE.sub('', valor) if isinstance(valor, str) else valor


def escrever_gpkg(camadas: dict, entrada, dicionario: list[dict], path: Path, finalidades=None, preservar_geometrias=False) -> None:
    from osgeo import gdal, ogr
    # nome da camada no GeoPackage -> (tabela, camada de saída de onde vêm os apelidos)
    todas = {nome: (frame, nome) for nome, frame in camadas.items()}
    for chave, item in (finalidades or {}).items():
        for nome, frame in item['camadas'].items():
            todas[f'{chave}_{nome}'] = (frame, nome)
    for nome, (frame, _) in {**todas, 'entrada': (entrada, None)}.items():
        _para_gpkg(frame.to_crs(4674)).to_file(path, driver='GPKG', layer=nome, engine='pyogrio', index=False,
                                                promote_to_multi=not preservar_geometrias,
                                                **({'geometry_type': 'Unknown'} if preservar_geometrias else {}))
    gdal.UseExceptions()
    fonte = ogr.Open(str(path), 1)
    try:
        for nome, (_, origem) in todas.items():
            camada = fonte.GetLayerByName(nome)
            definicao = camada.GetLayerDefn()
            apelidos_usados = set()
            for item in dicionario:
                if item['camada'] != origem or not item.get('apelido'):
                    continue
                indice = definicao.GetFieldIndex(item['campo'])
                if indice < 0:
                    continue
                campo = ogr.FieldDefn(item['campo'], definicao.GetFieldDefn(indice).GetType())
                apelido_campo = str(item['apelido'])[:255]
                raiz_apelido, numero = apelido_campo, 2
                while apelido_campo.casefold() in apelidos_usados:
                    sufixo = f' ({numero})'
                    apelido_campo = raiz_apelido[:255-len(sufixo)] + sufixo
                    numero += 1
                apelidos_usados.add(apelido_campo.casefold())
                campo.SetAlternativeName(apelido_campo)
                camada.AlterFieldDefn(indice, campo, ogr.ALTER_ALTERNATIVE_NAME_FLAG)
    finally:
        fonte = None


def escrever_dicionario_csv(dicionario: list[dict], path: Path) -> None:
    with open(path, 'w', newline='', encoding='utf-8-sig') as stream:
        escritor = csv.writer(stream, delimiter=';')
        escritor.writerow(COLUNAS_DICIONARIO)
        for item in dicionario:
            escritor.writerow([exportacao.safe(item.get(c)) if item.get(c) is not None else '' for c in COLUNAS_DICIONARIO])


def escrever_xlsx(camadas: dict, dicionario: list[dict], path: Path) -> None:
    livro = Workbook()
    livro.remove(livro.active)
    apelidos = {(d['camada'], d['campo']): d.get('apelido') for d in dicionario}
    for nome, frame in camadas.items():
        folha = livro.create_sheet(nome[:31])
        colunas = exportacao.colunas(frame)
        for j, coluna in enumerate(colunas, start=1):
            celula = folha.cell(row=1, column=j, value=coluna)
            celula.font = Font(bold=True)
            dica = apelidos.get((nome, coluna))
            if dica:
                from openpyxl.comments import Comment
                celula.comment = Comment(_texto_xlsx(dica), 'SICARD')
            folha.column_dimensions[get_column_letter(j)].width = min(max(len(coluna) * 0.9, 12), 45)
        for i, linha in enumerate(exportacao.registros(frame), start=2):
            for j, coluna in enumerate(colunas, start=1):
                folha.cell(row=i, column=j, value=_texto_xlsx(linha.get(coluna)))
        folha.freeze_panes = 'A2'
    folha = livro.create_sheet('dicionario_campos')
    folha.append(COLUNAS_DICIONARIO)
    for celula in folha[1]:
        celula.font = Font(bold=True)
    for item in dicionario:
        folha.append([_texto_xlsx(item.get(c)) for c in COLUNAS_DICIONARIO])
    livro.save(path)


def montar_pacote(camadas: dict, entrada, dicionario: list[dict], configuracao: dict,
                  nome_saida: str, finalidades=None, validacao=None, preservar_geometrias=False) -> tuple[bytes, str, list[dict]]:
    """Escreve os arquivos, confere cada um e devolve (zip, nome do zip, manifesto)."""
    arquivos = nomes(nome_saida, camadas, finalidades)
    with tempfile.TemporaryDirectory(prefix='sicard_enriquecimento_') as temporaria:
        pasta = Path(temporaria)
        escrever_gpkg(camadas, entrada, dicionario, pasta / arquivos['gpkg'][0], finalidades, preservar_geometrias)
        for nome, frame in camadas.items():
            exportacao.escrever_csv(frame, pasta / arquivos[f'csv_{nome}'][0])
        for chave, item in (finalidades or {}).items():
            for nome, frame in item['camadas'].items():
                exportacao.escrever_csv(frame, pasta / arquivos[f'csv_{chave}_{nome}'][0])
        (pasta / arquivos['validacao'][0]).write_text(
            json.dumps(validacao or {}, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
        escrever_xlsx(camadas, dicionario, pasta / arquivos['xlsx'][0])
        escrever_dicionario_csv(dicionario, pasta / arquivos['csv_dicionario'][0])
        (pasta / arquivos['configuracao'][0]).write_text(
            json.dumps(configuracao, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
        manifesto = []
        memoria = io.BytesIO()
        with zipfile.ZipFile(memoria, 'w', zipfile.ZIP_DEFLATED) as pacote:
            for chave, (nome, descricao) in arquivos.items():
                dados = (pasta / nome).read_bytes()
                if not dados:
                    raise ValueError(f'O arquivo {nome} do pacote saiu vazio.')
                pacote.writestr(nome, dados)
                manifesto.append({'chave': chave, 'nome': nome, 'descricao': descricao,
                                  'tamanho_bytes': len(dados), 'sha256': sha256(dados).hexdigest()})
    return memoria.getvalue(), f"{Path(arquivos['gpkg'][0]).stem}.zip", manifesto
