"""Contexto documental derivado do artefato utilizado na conferência territorial."""
from api.services.referencias_territoriais import carregar_marinha

def montar_contexto():
    data, sources, digest = carregar_marinha()
    return {
        'area_marinha': f"{data['features'][0]['properties']['area_km2']:,.1f}".replace(',', '_').replace('.', ',').replace('_', '.'),
        'sha256_marinha': digest,
        'integridade_marinha': digest == sources['sha256'],
        'limites_marinha': sources['pontos_azimutes'],
    }
