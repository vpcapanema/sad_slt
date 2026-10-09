"""Contexto documental derivado do artefato utilizado na conferência territorial."""
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parents[2] / 'data/referencias-territoriais'

def montar_contexto():
    raw = (BASE / 'abrangencia-marinha-sp.geojson').read_bytes()
    data = json.loads(raw)
    sources = json.loads((BASE / 'abrangencia-marinha-sp-fontes.json').read_text(encoding='utf-8'))
    digest = hashlib.sha256(raw).hexdigest()
    return {
        'area_marinha': f"{data['features'][0]['properties']['area_km2']:,.1f}".replace(',', '_').replace('.', ',').replace('_', '.'),
        'sha256_marinha': digest,
        'integridade_marinha': digest == sources['sha256'],
        'limites_marinha': sources['pontos_azimutes'],
    }
