"""Acesso a dados — demandas.projeto_geometria_historico.

Histórico de geometrias de projeto, plano e programa. Cada linha descreve uma
versão completa (geometria, ponto representativo, regionalidades, origem,
autor) e, quando a origem é upload, guarda o arquivo vetorial original.
"""
from __future__ import annotations

from typing import Any, Literal

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import ConnectionDict, get_connection

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

_INSERT_SNAPSHOT_SQL = """
    INSERT INTO demandas.projeto_geometria_historico (
        projeto_id, plano_id, programa_id, origem, geometria, geometria_tipo,
        latitude, longitude, regionalidades, criado_por
    ) VALUES (
        %(projeto_id)s, %(plano_id)s, %(programa_id)s, 'nao_identificada',
        ST_Transform(
            ST_SetSRID(ST_GeomFromGeoJSON(%(geometria_geojson)s), 4326),
            Find_SRID('demandas', 'projeto_geometria_historico', 'geometria')
        ),
        %(geometria_tipo)s, %(latitude)s, %(longitude)s, %(regionalidades)s, %(criado_por)s
    )
"""

_SELECT_HISTORY_SQL = sql.SQL("""
    SELECT id, origem, geometria_tipo, nome_arquivo, criado_em, criado_por,
           substituido_em, substituido_por, motivo_substituicao, processamento
      FROM demandas.projeto_geometria_historico
     WHERE {alvo_id} = %(alvo_id)s
     ORDER BY criado_em DESC, id DESC
""")


def _alvo_coluna(alvo: str) -> str:
    if alvo not in {"projeto", "plano", "programa"}:
        raise ValueError(f"Tipo de demanda inválido para histórico: {alvo}")
    return f"{alvo}_id"


def regionalidades_de(complementos: Any) -> Jsonb | None:
    """Extrai o snapshot de regionalidades do JSONB de complementos do projeto."""
    valor = complementos.obj if isinstance(complementos, Jsonb) else complementos
    if isinstance(valor, dict) and valor.get("regionalidades") is not None:
        return Jsonb(valor["regionalidades"])
    return None


def marcar_vigentes_substituidas(
    conn: ConnectionDict,
    *,
    alvo: Alvo,
    alvo_id: Any,
    substituido_por: Any,
    geometria_geojson: str | None = None,
    geometria_tipo: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    regionalidades: Jsonb | None = None,
) -> int:
    """Fecha a última versão registrada e sinaliza encerramentos antigos ausentes."""
    alvo_id_sql = sql.Identifier(_alvo_coluna(alvo))
    if geometria_geojson:
        preencher_geometria = sql.SQL(
            """
            UPDATE demandas.projeto_geometria_historico
               SET geometria = COALESCE(
                       geometria,
                       ST_Transform(
                           ST_SetSRID(ST_GeomFromGeoJSON(%(geometria_geojson)s), 4326),
                           Find_SRID('demandas', 'projeto_geometria_historico', 'geometria')
                       )
                   ),
                   geometria_tipo = COALESCE(geometria_tipo, %(geometria_tipo)s),
                   latitude = COALESCE(latitude, %(latitude)s),
                   longitude = COALESCE(longitude, %(longitude)s),
                   regionalidades = COALESCE(regionalidades, %(regionalidades)s)
             WHERE {alvo_id} = %(alvo_id)s
               AND id = (
                   SELECT id
                     FROM demandas.projeto_geometria_historico
                    WHERE {alvo_id} = %(alvo_id)s
                      AND substituido_em IS NULL
                    ORDER BY criado_em DESC, id DESC
                    LIMIT 1
               )
            """
        ).format(alvo_id=alvo_id_sql)
        conn.execute(
            preencher_geometria,
            {
                "alvo_id": alvo_id,
                "geometria_geojson": geometria_geojson,
                "geometria_tipo": geometria_tipo,
                "latitude": latitude,
                "longitude": longitude,
                "regionalidades": regionalidades,
            },
        )

    sinalizar_antigas = sql.SQL(
        """
        UPDATE demandas.projeto_geometria_historico
           SET processamento =
               (CASE WHEN jsonb_typeof(processamento) = 'object'
                     THEN processamento ELSE jsonb_build_object() END)
               || jsonb_build_object('substituicao_nao_registrada', TRUE)
         WHERE {alvo_id} = %(alvo_id)s
           AND substituido_em IS NULL
           AND id <> (
               SELECT id
                 FROM demandas.projeto_geometria_historico
                WHERE {alvo_id} = %(alvo_id)s
                  AND substituido_em IS NULL
                ORDER BY criado_em DESC, id DESC
                LIMIT 1
           )
        """
    ).format(alvo_id=alvo_id_sql)
    conn.execute(sinalizar_antigas, {"alvo_id": alvo_id})
    query = sql.SQL(
        """
        UPDATE demandas.projeto_geometria_historico
           SET substituido_em = CURRENT_TIMESTAMP,
               substituido_por = %(substituido_por)s
         WHERE {alvo_id} = (
               SELECT id
                 FROM demandas.projeto_geometria_historico
                WHERE {alvo_id} = %(alvo_id)s
                  AND substituido_em IS NULL
                ORDER BY criado_em DESC, id DESC
                LIMIT 1
           )
           AND substituido_em IS NULL
        """
    ).format(alvo_id=alvo_id_sql)
    cursor = conn.execute(
        query,
        {"alvo_id": alvo_id, "substituido_por": substituido_por},
    )
    return cursor.rowcount


def insert_snapshot(
    conn: ConnectionDict,
    *,
    alvo: Alvo,
    alvo_id: Any,
    geometria_geojson: str,
    geometria_tipo: str,
    latitude: float | None,
    longitude: float | None,
    regionalidades: Jsonb | None,
    criado_por: Any,
) -> None:
    """Registra uma geometria anterior sem atribuir origem ou arquivo não conhecidos."""
    params = {
        "projeto_id": None,
        "plano_id": None,
        "programa_id": None,
        f"{alvo}_id": alvo_id,
        "geometria_geojson": geometria_geojson,
        "geometria_tipo": geometria_tipo,
        "latitude": latitude,
        "longitude": longitude,
        "regionalidades": regionalidades,
        "criado_por": criado_por,
    }
    conn.execute(_INSERT_SNAPSHOT_SQL, params)


def listar(alvo: str, alvo_id: Any) -> list[dict[str, Any]]:
    query = _SELECT_HISTORY_SQL.format(
        alvo_id=sql.Identifier(_alvo_coluna(alvo))
    )
    with get_connection() as conn:
        rows = conn.execute(query, {"alvo_id": alvo_id}).fetchall()
    return [dict(row) for row in rows]


def insert_upload(
    conn: ConnectionDict,
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
    from api.storage_policy import TemporaryDirectory
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
