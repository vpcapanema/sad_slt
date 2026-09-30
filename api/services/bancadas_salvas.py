"""Bancadas privadas por usuário, persistidas no volume de configurações da VM."""
import hashlib
import json
import os
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
    return meta

def listar(usuario):
    items = []
    for path in pasta(usuario).glob('*.json'):
        data = json.loads(path.read_text(encoding='utf-8'))
        items.append({k:data[k] for k in ('id', 'nome', 'salvo_em', 'camadas')})
    return sorted(items, key=lambda i:i['salvo_em'], reverse=True)

def carregar(usuario, ident):
    path = pasta(usuario) / f'{UUID(str(ident))}.json'
    if not path.is_file(): raise FileNotFoundError('Bancada não encontrada para este usuário.')
    return json.loads(path.read_text(encoding='utf-8'))
