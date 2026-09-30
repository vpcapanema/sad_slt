"""Semântica dos campos de resultado a partir dos dicionários das fontes."""
import csv
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


@lru_cache(maxsize=1)
def catalogo():
    campos = {}
    for relativo in ('socioeconomico_desenvolvimento/dicionario_campos.csv', 'camada_unica/dicionario_campos.csv'):
        path = ROOT / 'plugins/censo2022_sp' / relativo
        with path.open(encoding='utf-8-sig', newline='') as stream:
            for row in csv.DictReader(stream):
                nome = row.get('indicador') or row.get('variavel')
                if not nome: continue
                recorte = row.get('categorias')
                if recorte: nome += ' · ' + recorte
                ano = row.get('ano') or '2022'
                unidade = row.get('unidade') or ''
                if unidade == '-': unidade = 'índice'
                multiplicador = float(row.get('multiplicador') or 1)
                if multiplicador != 1: unidade += f' × {multiplicador:g}'
                label = f'{nome} — {ano}' + (f' ({unidade})' if unidade else '')
                formato = 'moeda' if 'R$' in unidade else 'percentual' if '%' in unidade else 'numero'
                campos[row['campo']] = {'alias':label, 'nome':nome, 'ano':ano, 'unidade':unidade,
                    'multiplicador':multiplicador, 'formato':formato,
                    'fonte':row.get('url_fonte') or row.get('fonte'),
                    'descricao':row.get('definicao') or nome}
    return campos


def metadado(campo, fallback):
    encontrado = catalogo().get(campo)
    if encontrado: return dict(encontrado)
    return {'alias':fallback, 'unidade':None, 'formato':'original'}
