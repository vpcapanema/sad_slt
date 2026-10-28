"""Busca, valida e persiste agregados setoriais somente quando forem solicitados."""
from __future__ import annotations

from pathlib import Path

from api import storage_policy
from api.db.connection import get_connection
from scripts import completar_setores_2022 as carga
from scripts.fontes_setoriais_2022 import FONTES, url_fonte
from scripts.preparar_catalogo_territorial import materializar_setores


def recalcular_combinados(codigos: set[str]) -> None:
    if not codigos:
        return
    with get_connection() as conn:
        with conn.transaction():
            conn.execute("SET LOCAL statement_timeout='600s'")
            conn.execute("SET LOCAL lock_timeout='5s'")
            conn.execute("SELECT pg_advisory_xact_lock(hashtext('sicard-catalogo-territorial'))")
            materializar_setores(conn, somente=codigos)


def carregar_atributos(solicitados: dict[str, set[str]]) -> None:
    if not solicitados:
        return
    fontes = {name: (file, theme) for name, file, theme in FONTES}
    desconhecidos = solicitados.keys() - fontes.keys()
    if desconhecidos:
        raise ValueError(f'Conjuntos setoriais sem fonte configurada: {sorted(desconhecidos)}.')
    if storage_policy.sem_montagem():
        descriptions, dictionaries = carga.preparar_dicionarios_memoria()
        # Os pacotes podem ser grandes; mantenha apenas um ZIP de fonte em RAM.
        for name in sorted(solicitados):
            url = url_fonte(name, fontes[name][0])
            download = {name: (carga.baixar_bytes(url), fontes[name][1], url)}
            _persistir({name: solicitados[name]}, download, descriptions, dictionaries)
        return
    with storage_policy.TemporaryDirectory(prefix='catalogo-setorial-') as temporary:
        insumos = Path(temporary)
        descriptions, dictionaries = carga.preparar_dicionarios(insumos)
        downloads = {
            name: (carga.baixar(insumos, fontes[name][0], url_fonte(name, fontes[name][0])),
                   fontes[name][1], url_fonte(name, fontes[name][0]))
            for name in sorted(solicitados)
        }
        _persistir(solicitados, downloads, descriptions, dictionaries)


def _persistir(solicitados, downloads, descriptions, dictionaries) -> None:
    with get_connection() as conn:
        with conn.transaction():
            conn.execute("SET LOCAL statement_timeout='600s'")
            conn.execute("SET LOCAL lock_timeout='5s'")
            conn.execute("SELECT pg_advisory_xact_lock(hashtext('sicard-catalogo-territorial'))")
            loaded = {
                row['conjunto']: row['chaves']
                for row in conn.execute('''SELECT detalhe->>'conjunto' AS conjunto,
                        array_agg(chave) AS chaves
                    FROM base_territorial.atributo_setorial
                    WHERE origem='originais' AND detalhe->>'sha256' IS NOT NULL
                    GROUP BY detalhe->>'conjunto' ''')
            }
            codes = {row['cd_setor'] for row in conn.execute(
                'SELECT cd_setor FROM base_territorial.setor'
            )}
            if len(codes) != 103319:
                raise ValueError('Malha setorial incompleta; não é possível carregar a fonte sob demanda.')
            for name, (source, theme, url) in downloads.items():
                keys = solicitados[name] - set(loaded.get(name, []))
                if not keys:
                    continue
                carga.aplicar_fonte(
                    conn, source, name, theme, url, descriptions, codes, dictionaries,
                    only_keys=keys,
                )
