"""Acesso a dados — demandas.projeto_geometria_historico.

Histórico de geometrias de projeto, plano e programa. Cada linha descreve uma
versão completa (geometria, ponto representativo, regionalidades, origem,
autor) e, quando a origem é upload, guarda o arquivo vetorial original.
"""
from __future__ import annotations

from typing import Any, Literal

from psycopg import Connection
from psycopg.types.json import Jsonb

Alvo = Literal["projeto", "plano", "programa"]

_INSERT_UPLOAD_SQL = """
    INSERT INTO demandas.projeto_geometria_historico (
        projeto_id,
        plano_id,
        programa_id,
        origem,
        geometria,
        geometria_tipo,
        latitude,
        longitude,
        regionalidades,
        criado_por,
        nome_arquivo,
        extensao,
        tipo_mime,
        tamanho_bytes,
        sha256,
        conteudo_binario,
        storage_caminho,
        processamento
    ) VALUES (
        %(projeto_id)s,
        %(plano_id)s,
        %(programa_id)s,
        'upload',
        ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(%(geometria_geojson)s::text), 4326), Find_SRID('demandas','projeto_geometria_historico','geometria')),
        %(geometria_tipo)s,
        %(latitude)s,
        %(longitude)s,
        %(regionalidades)s,
        %(criado_por)s,
        %(nome_arquivo)s,
        %(extensao)s,
        %(tipo_mime)s,
        %(tamanho_bytes)s,
        %(sha256)s,
        %(conteudo_binario)s,
        %(storage_caminho)s,
        %(processamento)s
    )
"""


def regionalidades_de(complementos: Any) -> Jsonb | None:
    """Extrai o snapshot de regionalidades do JSONB de complementos do projeto."""
    valor = complementos.obj if isinstance(complementos, Jsonb) else complementos
    if isinstance(valor, dict) and valor.get("regionalidades") is not None:
        return Jsonb(valor["regionalidades"])
    return None


def insert_upload(
    conn: Connection,
    *,
    alvo: Alvo,
    alvo_id: Any,
    geometria_geojson: str | None,
    arquivo: dict[str, Any],
    latitude: float | None = None,
    longitude: float | None = None,
    regionalidades: Jsonb | None = None,
    criado_por: Any = None,
) -> None:
    """Registra, na transação corrente, a versão enviada por upload e seu arquivo original."""
    import hashlib, json
    from pathlib import Path
    from tempfile import TemporaryDirectory
    from uuid import uuid4
    from api.services import storage_remoto
    content = arquivo['conteudo_binario']
    checksum = hashlib.sha256(content).hexdigest()
    if arquivo.get('sha256', checksum) != checksum:
        raise ValueError('Hash do original incompatível com o conteúdo recebido.')
    suffix = Path(arquivo['nome_arquivo']).suffix.lower()
    destination = f'demandas/originais/{alvo}/{alvo_id}/{uuid4().hex}{suffix}'
    with TemporaryDirectory(prefix='sicard-original-demanda-') as folder:
        original = Path(folder) / ('original' + suffix)
        original.write_bytes(content)
        storage_remoto.enviar(destination, original)
    remote = storage_remoto.baixar(destination)
    if remote != content or hashlib.sha256(remote).hexdigest() != checksum:
        storage_remoto.apagar_arquivo(destination)
        raise ValueError('O original armazenado diverge do arquivo recebido.')
    params = {
        "projeto_id": None,
        "plano_id": None,
        "programa_id": None,
        f"{alvo}_id": alvo_id,
        "geometria_geojson": geometria_geojson,
        "latitude": latitude,
        "longitude": longitude,
        "regionalidades": regionalidades,
        "criado_por": criado_por,
        **arquivo,
        'conteudo_binario': None,
        'storage_caminho': destination,
        'sha256': checksum,
        'geometria_tipo': json.loads(geometria_geojson)['type'] if geometria_geojson else arquivo.get('geometria_tipo'),
        'processamento': Jsonb({'crs_destino': 'EPSG:4674', 'crs_origem': arquivo.get('crs_origem'), 'tipo_original': arquivo.get('geometria_tipo'),
                               'crs_calculo': 'EPSG:5880', 'motor': 'GDAL/OGR', 'buffer_ponto_m': 50, 'buffer_linha_m': 25,
                               'regra': 'gdal_ogr_epsg5880_buffer_e_reprojecao'}),
    }
    try:
        conn.execute(_INSERT_UPLOAD_SQL, params)
    except Exception:
        storage_remoto.apagar_arquivo(destination)
        raise
