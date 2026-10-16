"""Referências territoriais lidas do storage, exclusivamente em memória."""
import hashlib
import json
import httpx

from fastapi import HTTPException
from api.services import storage_remoto

RAIZ = 'referencias-territoriais'


def carregar_marinha():
    """Confere a geometria contra o hash publicado junto com suas fontes."""
    try:
        raw = storage_remoto.baixar(f'{RAIZ}/abrangencia-marinha-sp.geojson')
        sources = json.loads(storage_remoto.baixar(f'{RAIZ}/abrangencia-marinha-sp-fontes.json'))
        digest = hashlib.sha256(raw).hexdigest()
        if digest != sources['sha256']:
            raise ValueError('Hash divergente')
        data = json.loads(raw)
        if not data['features'][0]['geometry']:
            raise ValueError('Geometria ausente')
        return data, sources, digest
    except (FileNotFoundError, storage_remoto.StorageIndisponivel, httpx.HTTPError,
            ValueError, KeyError, IndexError, TypeError) as exc:
        raise HTTPException(503, 'Referência territorial marítima indisponível ou sem integridade no storage.') from exc
