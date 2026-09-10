"""Configurações da bancada: quais camadas o usuário agrupou em cada categoria.

O arquivo guarda apenas referências: identificador, nome e caminho de cada
camada. Não copia geometria nem atributos. Camadas geradas pelo plugin municipal
ficam de fora, porque cada geração cria um arquivo próprio no acervo e a
referência não se repetiria em outro ambiente.
"""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from api.db.connection import get_connection
from api.path_policy import project_path

PASTA = 'data/geoespacial/configuracoes/extracao-atributos'
VERSAO = 1
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


def geradas_pelo_plugin(ids: list[str]) -> set[str]:
    if not ids:
        return set()
    with get_connection() as conn:
        rows = conn.execute('''SELECT recurso_sessao_id FROM geoprocessamento.camada_importada
            WHERE recurso_sessao_id = ANY(%s) AND metadados->>'origem' = 'municipal-layer' ''',
            (list(ids),)).fetchall()
    return {row['recurso_sessao_id'] for row in rows}


def montar(nome: str, categorias: list[dict], user) -> dict:
    """Valida a lista contra o catálogo e devolve o conteúdo a gravar."""
    from api.services.extracao_atributos import catalogo
    catalog = catalogo()
    layers = {item['id']: item for item in catalog['camadas']}
    categories = {item['id']: item for item in catalog['categorias']}
    excluidas = geradas_pelo_plugin([ident for grupo in categorias for ident in grupo['camadas']])
    conteudo, vistos, ignoradas = [], set(), 0
    for grupo in categorias:
        if grupo['id'] not in categories:
            raise ValueError('Categoria inexistente ou inativa. Atualize o catálogo.')
        if any(item['id'] == grupo['id'] for item in conteudo):
            raise ValueError('Categoria repetida na configuração.')
        camadas = []
        for ident in grupo['camadas']:
            if ident in excluidas:
                ignoradas += 1
                continue
            if ident not in layers:
                raise ValueError('Camada indisponível no catálogo. Atualize o catálogo.')
            if ident in vistos:
                raise ValueError('A mesma camada aparece em mais de uma categoria.')
            vistos.add(ident)
            camadas.append({'id': ident, 'nome': layers[ident]['nome'],
                            'arquivo': layers[ident].get('arquivo')})
        if camadas:
            conteudo.append({'id': grupo['id'], 'nome': categories[grupo['id']]['nome'],
                             'camadas': camadas})
    if not conteudo:
        raise ValueError('Nenhuma camada elegível. Camadas geradas pelo plugin não são salvas.')
    return {'versao': VERSAO, 'nome': str(nome).strip()[:120],
            'salvo_em': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'salvo_por': str(getattr(user, 'id', '')), 'categorias': conteudo,
            'camadas_ignoradas': ignoradas}


def salvar(nome: str, categorias: list[dict], user) -> dict:
    conteudo = montar(nome, categorias, user)
    chave = identificador(conteudo['nome'])
    destino = arquivo(chave)
    if not destino.exists() and len(list(raiz().glob('*.json'))) >= LIMITE_ARQUIVOS:
        raise ValueError(f'Limite de {LIMITE_ARQUIVOS} configurações atingido. Apague alguma antes.')
    destino.write_text(json.dumps(conteudo, ensure_ascii=False, indent=2), encoding='utf-8')
    return {'chave': chave, 'nome': conteudo['nome'], 'salvo_em': conteudo['salvo_em'],
            'categorias': len(conteudo['categorias']),
            'camadas': sum(len(c['camadas']) for c in conteudo['categorias']),
            'camadas_ignoradas': conteudo['camadas_ignoradas']}


def _resumo(path: Path) -> dict | None:
    try:
        dados = json.loads(path.read_text(encoding='utf-8'))
        return {'chave': path.stem, 'nome': dados.get('nome') or path.stem,
                'arquivo': path.name, 'bytes': path.stat().st_size,
                'salvo_em': dados.get('salvo_em'),
                'categorias': len(dados.get('categorias') or []),
                'camadas': sum(len(c.get('camadas') or []) for c in dados.get('categorias') or [])}
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
    if dados.get('versao') != VERSAO:
        raise ValueError('Configuração gravada por outra versão do sistema.')
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
                camadas.append({'id': item['id'], 'nome': layers[item['id']]['nome'],
                                'arquivo': layers[item['id']].get('arquivo')})
            else:
                ausentes.append(item.get('nome') or item.get('id'))
        if camadas:
            presentes.append({'id': grupo['id'], 'camadas': camadas})
    return {'chave': destino.stem, 'nome': dados.get('nome') or destino.stem,
            'salvo_em': dados.get('salvo_em'), 'categorias': presentes, 'ausentes': ausentes}


def excluir(chave: str) -> None:
    destino = arquivo(chave)
    if not destino.is_file():
        raise FileNotFoundError('Configuração não encontrada.')
    destino.unlink()
