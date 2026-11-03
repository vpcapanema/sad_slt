"""Reserva nomes legíveis por identidade, nunca por coincidência de títulos."""
from __future__ import annotations

from pathlib import PurePosixPath

from api.db.connection import get_connection


def reservar(escopo: str, identidade: str, nome: str, *, conn=None) -> str:
    from api.services import storage_remoto
    from api.services.pastas_storage import nome_valido
    nome_valido(nome)
    if not identidade:
        raise ValueError('A reserva de nome exige identidade verificável.')
    if conn is None:
        with get_connection() as connection:
            return reservar(escopo, identidade, nome, conn=connection)
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",
                 ('nomes-storage:' + escopo.casefold(),))
    registro = conn.execute(
        'SELECT nome FROM geoprocessamento.nome_storage WHERE escopo=%s AND identidade=%s',
        (escopo, identidade)).fetchone()
    if registro:
        return registro['nome']
    ocupados = {r['nome'].casefold() for r in conn.execute(
        'SELECT nome FROM geoprocessamento.nome_storage WHERE escopo=%s', (escopo,))}
    try:
        ocupados.update(item['nome'].casefold() for item in storage_remoto.listar(escopo, estrito=True))
    except FileNotFoundError:
        pass
    candidato = nome
    indice = 2
    path = PurePosixPath(nome)
    while candidato.casefold() in ocupados:
        sufixo = f'_{indice}'
        limite = 120 - len(sufixo) - len(path.suffix)
        if limite < 1:
            raise ValueError('Nome muito longo para distinguir elementos homônimos.')
        candidato = f'{path.stem[:limite]}{sufixo}{path.suffix}'
        indice += 1
    nome_valido(candidato)
    conn.execute(
        'INSERT INTO geoprocessamento.nome_storage (escopo,identidade,nome) VALUES (%s,%s,%s)',
        (escopo, identidade, candidato))
    return candidato
