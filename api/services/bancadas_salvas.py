"""Bancadas privadas por usuário, persistidas no volume de configurações da VM."""
import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from uuid import UUID, uuid4
from api.path_policy import project_path

MAX_BYTES = 64 * 1024 * 1024

def pasta(usuario):
    path = project_path('data/geoespacial/configuracoes/extracao-atributos/bancadas') / hashlib.sha256(str(usuario).encode()).hexdigest()
    path.mkdir(parents=True, exist_ok=True)
    return path

def salvar(usuario, nome, snapshot):
    nome = str(nome).strip()
    if not nome or len(nome) > 200:
        raise ValueError('Informe um nome de até 200 caracteres.')
    if not isinstance(snapshot, dict) or snapshot.get('versao') != 1:
        raise ValueError('Formato da bancada inválido.')
    grupos = ('bancadaEntradas', 'bancadaBases', 'bancadaResultados', 'bancadaAdicionais')
    if any(not isinstance(snapshot.get(g, []), list) for g in grupos):
        raise ValueError('Camadas da bancada inválidas.')
    if not any(snapshot.get(g) for g in grupos):
        raise ValueError('Adicione camadas à bancada antes de salvar.')
    ident = str(uuid4())
    meta = dict(id=ident, nome=nome, salvo_em=datetime.now(timezone.utc).isoformat(), camadas=len(snapshot.get('painel', [])))
    data = json.dumps(dict(**meta, snapshot=snapshot), ensure_ascii=False, allow_nan=False).encode('utf-8')
    if len(data) > MAX_BYTES:
        raise ValueError('A bancada excede 64 MB. Cadastre os arquivos locais no storage antes de salvar.')
    path = pasta(usuario)
    fd, tmp = tempfile.mkstemp(dir=path, suffix='.tmp')
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp, path / f'{ident}.json')
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
    preparar_cache(usuario, dict(**meta, snapshot=snapshot))
    return meta

def listar(usuario):
    items = []
    for path in pasta(usuario).glob('*.json'):
        if path.name.endswith('.cache.json'): continue
        data = json.loads(path.read_text(encoding='utf-8'))
        items.append({k:data[k] for k in ('id', 'nome', 'salvo_em', 'camadas')})
    return sorted(items, key=lambda i:i['salvo_em'], reverse=True)

def carregar(usuario, ident):
    path = pasta(usuario) / f'{UUID(str(ident))}.json'
    if not path.is_file(): raise FileNotFoundError('Bancada não encontrada para este usuário.')
    data = json.loads(path.read_text(encoding='utf-8'))
    preparar_cache(usuario, data, verificar=True)
    return data


def camadas(snapshot):
    for entry in snapshot.get('bancadaEntradas', []):
        source = entry.get('layer', {})
        for layer in source.get('camadas_bancada', [source]):
            yield layer, source.get('arquivo_local')
    for group in ('bancadaBases', 'bancadaResultados', 'bancadaAdicionais'):
        for item in snapshot.get(group, []):
            yield item.get('layer', item), None


def assinatura(layer, original=None):
    """Consulta só tamanho/data do arquivo ou metadados do catálogo; não lê feições."""
    if original:
        return hashlib.sha256(original['conteudo_base64'].encode()).hexdigest(), 0
    ident = str(layer['id'])
    if ident.startswith('storage:'):
        from api.services import storage_geoespacial as storage
        path = storage.resolver(storage.separar_id(ident)[0])
    else:
        from api.db.connection import get_connection
        from api.repositories.camada_geoespacial_repository import _find_layer
        from api.services.extracao_atributos import caminho_arquivo
        with get_connection() as conn:
            found = _find_layer(conn, ident)
        if not found: raise FileNotFoundError('Camada ausente')
        row = found[1]
        arquivo = caminho_arquivo(row)
        if not arquivo:
            date = row.get('atualizado_em') or row.get('criado_em')
            return str(date), date.timestamp() if hasattr(date, 'timestamp') else float('inf')
        path = project_path(arquivo)
    files = sorted(path.parent.glob(path.stem + '.*')) if path.suffix.lower() == '.shp' else [path]
    stats = [(p.name, p.stat().st_size, p.stat().st_mtime_ns) for p in files]
    return hashlib.sha256(repr(stats).encode()).hexdigest(), max(p.stat().st_mtime for p in files)


def preparar_cache(usuario, data, verificar=False):
    from api.services.extracao_preparacao import _pasta
    cache_path = pasta(usuario) / f"{data['id']}.cache.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    salvo = datetime.fromisoformat(data['salvo_em']).timestamp()
    for layer, original in camadas(data['snapshot']):
        layer.pop('previa_reutilizavel', None)
        token = layer.get('tiles_token', '')
        if not re.fullmatch(r'[a-f0-9]{32}', token): continue
        preview = _pasta(usuario) / f'{token}.gpkg'
        if not preview.is_file(): continue
        try:
            atual, alterado = assinatura(layer, original)
        except Exception:
            continue  # Sem comprovar a origem, mantém a validação normal desta camada.
        anterior = cache.get(token)
        # Migração de bancadas salvas antes do cache: só se a origem anteceder o salvamento.
        if anterior is None and alterado <= salvo:
            cache[token] = atual
            anterior = atual
        if anterior == atual:
            preview.with_suffix('.pin').touch(exist_ok=True)
            if verificar: layer['previa_reutilizavel'] = True
    fd, tmp = tempfile.mkstemp(dir=cache_path.parent, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream: json.dump(cache, stream)
        os.replace(tmp, cache_path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
