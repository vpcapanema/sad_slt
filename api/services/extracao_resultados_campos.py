"""Semântica dos campos de resultado a partir dos dicionários das fontes."""
import csv
import json
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def nome_claro(row):
    """Reduz a hierarquia apenas quando o significado dos níveis é conhecido."""
    original = row.get('indicador') or row.get('variavel') or ''
    partes = [p.strip() for p in original.split(' / ')]
    tema = row.get('tema')
    if tema == 'financas_publicas':
        if partes[0] == 'Despesas orçamentárias brutas' and len(partes) >= 2:
            nome = 'Despesas brutas ' + partes[1]
            if len(partes) > 2: nome += ' — ' + ' · '.join(partes[2:]).lower()
            return nome
        if partes[0] == 'Receitas orçamentárias brutas realizadas':
            receitas = {
                'Impostos, Taxas e Contribuições de melhoria':'Arrecadação de impostos, taxas e contribuição de melhoria',
                'Impostos':'Arrecadação de impostos', 'Taxas':'Arrecadação de taxas',
                'Contribuição de melhoria':'Arrecadação com contribuição de melhoria',
                'Contribuições':'Arrecadação de contribuições',
                'Receita patrimonial':'Arrecadação de receitas patrimoniais',
                'Receita agropecuária':'Arrecadação de receitas agropecuárias',
                'Receita industrial':'Arrecadação de receitas industriais',
                'Receita de serviços':'Arrecadação de receitas de serviços',
                'Transferências correntes':'Transferências correntes recebidas',
                'Outras receitas correntes':'Outras receitas correntes arrecadadas',
                'Operações de crédito':'Receitas de operações de crédito',
                'Alienação de bens':'Receitas de alienação de bens',
                'Amortização de empréstimos':'Receitas de amortização de empréstimos',
                'Transferências de capital':'Transferências de capital recebidas',
                'Outras receitas de capital':'Outras receitas de capital arrecadadas',
                'Capital':'Receitas de capital arrecadadas (brutas)',
                'Correntes':'Receitas correntes arrecadadas (brutas)',
            }
            return receitas.get(partes[-1], 'Receita orçamentária arrecadada (bruta)') if len(partes)==1 or partes[-1] in receitas else ' · '.join(partes)
    if tema == 'empresas_emprego':
        return ' · '.join(p for p in partes if p != 'Classificação Nacional de Atividades Econômicas - CNAE')
    if tema == 'ideb' and partes[0] == 'Índice de Desenvolvimento da Educação Básica':
        etapa = next((p.lower() for p in partes if p in ('Anos iniciais','Anos finais')), '')
        ensino = next((p.lower() for p in partes if p.startswith('Ensino ')), '')
        rede = next((p.lower() for p in reversed(partes) if p in ('Municipal','Estadual','Federal','Privada','Pública')), '')
        conhecidos = {'Índice de Desenvolvimento da Educação Básica','Anos iniciais','Anos finais','Municipal','Estadual','Federal','Privada','Pública','Ensino fundamental','Ensino médio'}
        if all(p in conhecidos for p in partes):
            return 'IDEB — ' + (' do '.join(p for p in (etapa,ensino) if p)) + (f' · rede {rede}' if rede else '')
    # Fonte e pesquisa são apresentadas separadamente; universo e recortes ficam.
    nome = re.sub(r'\s*\((Atlas DH - Censo|Censo)\)', '', original)
    return nome.replace(' / ', ' · ')


def procedencia(row):
    fonte = row.get('fonte') or ''
    url = row.get('url_fonte') or (fonte if fonte.startswith(('https://','http://')) else None)
    try: nota = json.loads(row.get('nota') or '{}')
    except (ValueError, TypeError): nota = {}
    fontes = (nota.get('periodo') or {}).get('fonte', []) if isinstance(nota,dict) else []
    original = ' · '.join(fontes) if isinstance(fontes,list) else str(fontes)
    if 'Siconfi' in original: rotulo = 'Siconfi / Tesouro Nacional · via IBGE'
    elif 'INEP' in original.upper(): rotulo = 'Inep / MEC · via IBGE'
    elif fonte.startswith('Ipeadata'): rotulo = 'Atlas do Desenvolvimento Humano · via Ipeadata'
    elif 'sidra.ibge.gov.br' in (url or '') or 'Censo' in fonte: rotulo = 'IBGE · Censo Demográfico'
    elif fonte.startswith('IBGE'): rotulo = fonte.replace(' / ', ' · ')
    else: rotulo = fonte if not fonte.startswith(('https://','http://')) else 'Fonte de origem'
    return {'fonte_nome':rotulo or 'Fonte não informada', 'fonte_url':url, 'fonte_original':original or fonte}


@lru_cache(maxsize=1)
def catalogo():
    campos = {}
    for relativo in ('socioeconomico_desenvolvimento/dicionario_campos.csv', 'camada_unica/dicionario_campos.csv'):
        path = ROOT / 'plugins/censo2022_sp' / relativo
        with path.open(encoding='utf-8-sig', newline='') as stream:
            for row in csv.DictReader(stream):
                nome_original = row.get('indicador') or row.get('variavel')
                nome = nome_claro(row)
                if not nome: continue
                recorte = row.get('categorias')
                if not recorte and row.get('definicao') and row['definicao'] != nome_original and re.search(r'_V[0-9]+_',row['campo']):
                    recorte = row['definicao']
                if recorte: nome += ' · ' + recorte
                ano = row.get('ano') or '2022'
                unidade = row.get('unidade') or ''
                if unidade == '-': unidade = 'índice'
                multiplicador = float(row.get('multiplicador') or 1)
                if multiplicador != 1: unidade += f' × {multiplicador:g}'
                label = f'{nome} — {ano}' + (f' ({unidade})' if unidade else '')
                formato = 'moeda' if 'R$' in unidade else 'percentual' if '%' in unidade else 'numero'
                campos[row['campo']] = {'alias':label, 'nome':nome, 'nome_original':nome_original, 'ano':ano, 'unidade':unidade,
                    'multiplicador':multiplicador, 'formato':formato,
                    'fonte':row.get('url_fonte') or row.get('fonte'),
                    'descricao':row.get('definicao') or nome_original, **procedencia(row)}
    return campos


def metadado(campo, fallback):
    encontrado = catalogo().get(campo)
    if encontrado: return dict(encontrado)
    return {'alias':fallback, 'unidade':None, 'formato':'original'}
