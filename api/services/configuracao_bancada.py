"""Configurações da bancada: quais camadas o usuário agrupou em cada categoria.

O arquivo guarda apenas referências: identificador, nome e caminho de cada
camada. Não copia geometria nem atributos. Inclui as camadas municipais
materializadas no acervo; referências que não existirem mais são informadas
ao carregar, como qualquer outra base.
"""
from __future__ import annotations

import json
import re
import os
import tempfile
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from api.path_policy import project_path

PASTA = 'data/geoespacial/configuracoes/extracao-atributos'
# Versão 2 guarda a regra de cada base (papel, ligação, multiplicidade, campos...).
# Versão 3 guarda também as entradas (identificador, filtro, campos) e as
# finalidades. Versões anteriores continuam legíveis: o que falta vira o padrão.
# Versão 4 também preserva algoritmo, opções e nome da saída.
VERSAO = 4
VERSOES_LIDAS = (1, 2, 3, 4)
LIMITE_ARQUIVOS = 300


def raiz() -> Path:
    destino = project_path(PASTA)
    destino.mkdir(parents=True, exist_ok=True)
    return destino.resolve()


def identificador(nome: str) -> str:
    texto = unicodedata.normalize('NFKD', str(nome)).encode('ascii', 'ignore').decode()
    texto = re.sub(r'[^a-zA-Z0-9]+', '-', texto).strip('-').lower()[:80]
    if not texto:
        raise ValueError('Informe um nome com ao menos uma letra ou número.')
    return texto


def arquivo(chave: str) -> Path:
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,79}', str(chave)):
        raise ValueError('Identificador de configuração inválido.')
    destino = (raiz() / f'{chave}.json').resolve()
    if destino.parent != raiz():
        raise ValueError('Caminho fora da pasta de configurações.')
    return destino


def montar(nome: str, categorias: list[dict], user, entradas: list[dict] | None = None,
           finalidades: list[dict] | None = None, *, operacao: str = 'intersection',
           opcoes: dict | None = None, nome_saida: str = '') -> dict:
    """Valida a lista contra o catálogo e devolve o conteúdo a gravar.

    ``categorias``: [{id, camadas: [ids], regras?: {id da camada: regra}}].
    ``entradas``: [{id, config?}] (a primeira é a principal). ``finalidades``: [{nome, campos}].
    """
    from api.services import extracao_atributos_regras as regras
    from api.services.extracao_atributos_analise import OPCOES_PADRAO
    if operacao not in ('intersection','identity','enriquecimento'):
        raise ValueError('Algoritmo de processamento inválido.')
    if set(opcoes or {}) - set(OPCOES_PADRAO):
        raise ValueError('Opção do algoritmo desconhecida.')
    from api.services.extracao_atributos import catalogo
    catalog = catalogo()
    layers = {item['id']: item for item in catalog['camadas']}
    categories = {item['id']: item for item in catalog['categorias']}
    conteudo, vistos = [], set()
    for grupo in categorias:
        if grupo['id'] not in categories:
            raise ValueError('Categoria inexistente ou inativa. Atualize o catálogo.')
        if any(item['id'] == grupo['id'] for item in conteudo):
            raise ValueError('Categoria repetida na configuração.')
        camadas = []
        for ident in grupo['camadas']:
            if ident not in layers:
                raise ValueError('Camada indisponível no catálogo. Atualize o catálogo.')
            if ident in vistos:
                raise ValueError('A mesma camada aparece em mais de uma categoria.')
            vistos.add(ident)
            camadas.append({'id': ident, 'nome': layers[ident]['nome'],
                            'arquivo': layers[ident].get('arquivo'),
                            'regra': regras.normalizar((grupo.get('regras') or {}).get(ident))})
        if camadas:
            conteudo.append({'id': grupo['id'], 'nome': categories[grupo['id']]['nome'],
                             'camadas': camadas})
    if not conteudo:
        raise ValueError('Selecione ao menos uma base disponível no catálogo.')
    # Restrições entre bases (uma só unidade de recorte, prefixo informado repetido).
    regras.validar_conjunto(conteudo)
    entradas_gravadas = []
    for item in entradas or []:
        ident = item['id']
        if ident not in layers:
            raise ValueError('Camada de entrada indisponível no catálogo. Atualize o catálogo.')
        if any(e['id'] == ident for e in entradas_gravadas):
            raise ValueError('A mesma camada aparece duas vezes nas entradas.')
        if ident in vistos:
            raise ValueError('A camada de entrada não pode ser também uma base.')
        entradas_gravadas.append({'id': ident, 'nome': layers[ident]['nome'],
                                  'arquivo': layers[ident].get('arquivo'),
                                  'config': regras.normalizar_entrada(item.get('config'))})
    return {'versao': VERSAO, 'nome': str(nome).strip()[:120],
            'operacao':operacao,'opcoes':{**OPCOES_PADRAO,**(opcoes or {})},
            'nome_saida':str(nome_saida).strip()[:200],
            'salvo_em': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'salvo_por': str(getattr(user, 'id', '')), 'categorias': conteudo,
            'entradas': entradas_gravadas, 'finalidades': regras.normalizar_finalidades(finalidades),
            'camadas_ignoradas': 0}


def salvar(nome: str, categorias: list[dict], user, entradas: list[dict] | None = None,
           finalidades: list[dict] | None = None, **execucao) -> dict:
    conteudo = montar(nome, categorias, user, entradas, finalidades, **execucao)
    chave = identificador(conteudo['nome'])
    destino = arquivo(chave)
    if not destino.exists() and len(list(raiz().glob('*.json'))) >= LIMITE_ARQUIVOS:
        raise ValueError(f'Limite de {LIMITE_ARQUIVOS} configurações atingido. Apague alguma antes.')
    temporario = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=destino.parent,
                                         suffix='.tmp', delete=False) as stream:
            temporario = Path(stream.name)
            json.dump(conteudo, stream, ensure_ascii=False, indent=2)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporario, destino)
    finally:
        if temporario is not None:
            temporario.unlink(missing_ok=True)
    return {'chave': chave, 'nome': conteudo['nome'], 'salvo_em': conteudo['salvo_em'],
            'categorias': len(conteudo['categorias']),
            'camadas': sum(len(c['camadas']) for c in conteudo['categorias']),
            'entradas': len(conteudo['entradas']), 'finalidades': len(conteudo['finalidades']),
            'camadas_ignoradas': conteudo['camadas_ignoradas']}


def _resumo(path: Path) -> dict | None:
    try:
        dados = json.loads(path.read_text(encoding='utf-8'))
        return {'chave': path.stem, 'nome': dados.get('nome') or path.stem,
                'arquivo': path.name, 'bytes': path.stat().st_size,
                'salvo_em': dados.get('salvo_em'),
                'categorias': len(dados.get('categorias') or []),
                'camadas': sum(len(c.get('camadas') or []) for c in dados.get('categorias') or []),
                'entradas': len(dados.get('entradas') or []),
                'finalidades': len(dados.get('finalidades') or [])}
    except (OSError, ValueError):
        return None  # Um arquivo corrompido não impede listar os demais.


def listar() -> list[dict]:
    itens = [item for path in sorted(raiz().glob('*.json')) if (item := _resumo(path))]
    return sorted(itens, key=lambda item: item['salvo_em'] or '', reverse=True)


def carregar(chave: str) -> dict:
    destino = arquivo(chave)
    if not destino.is_file():
        raise FileNotFoundError('Configuração não encontrada.')
    try:
        dados = json.loads(destino.read_text(encoding='utf-8'))
    except ValueError as exc:
        raise ValueError('Arquivo de configuração ilegível.') from exc
    if dados.get('versao') not in VERSOES_LIDAS:
        raise ValueError('Configuração gravada por outra versão do sistema.')
    from api.services import extracao_atributos_regras as regras
    # O catálogo muda com o tempo: separar o que ainda existe do que se perdeu.
    from api.services.extracao_atributos import catalogo
    catalog = catalogo()
    layers = {item['id']: item for item in catalog['camadas']}
    categories = {item['id'] for item in catalog['categorias']}
    presentes, ausentes = [], []
    for grupo in dados.get('categorias') or []:
        if grupo.get('id') not in categories:
            ausentes.extend(f"{item.get('nome')} (categoria removida)" for item in grupo.get('camadas') or [])
            continue
        camadas = []
        for item in grupo.get('camadas') or []:
            if item.get('id') in layers:
                try:
                    regra = regras.normalizar(item.get('regra'))
                except ValueError:
                    # Arquivo editado à mão com regra inválida: a camada volta com o padrão.
                    regra = regras.normalizar(None)
                camadas.append({'id': item['id'], 'nome': layers[item['id']]['nome'],
                                'arquivo': layers[item['id']].get('arquivo'), 'regra': regra})
            else:
                ausentes.append(item.get('nome') or item.get('id'))
        if camadas:
            presentes.append({'id': grupo['id'], 'camadas': camadas})
    entradas = []
    for item in dados.get('entradas') or []:
        if item.get('id') in layers:
            try:
                config = regras.normalizar_entrada(item.get('config'))
            except ValueError:
                config = regras.normalizar_entrada(None)
            entradas.append({'id': item['id'], 'nome': layers[item['id']]['nome'],
                             'arquivo': layers[item['id']].get('arquivo'), 'config': config})
        else:
            ausentes.append(f"{item.get('nome') or item.get('id')} (entrada)")
    try:
        finalidades = regras.normalizar_finalidades(dados.get('finalidades'))
    except ValueError:
        finalidades = []  # Arquivo editado à mão: a lista de finalidades é descartada.
    return {'chave': destino.stem, 'nome': dados.get('nome') or destino.stem,
            'operacao':dados.get('operacao'),'opcoes':dados.get('opcoes') or {},
            'nome_saida':dados.get('nome_saida') or '',
            'salvo_em': dados.get('salvo_em'), 'categorias': presentes, 'entradas': entradas,
            'finalidades': finalidades, 'ausentes': ausentes}


def excluir(chave: str) -> None:
    destino = arquivo(chave)
    if not destino.is_file():
        raise FileNotFoundError('Configuração não encontrada.')
    destino.unlink()
