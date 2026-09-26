"""Gravação do mesmo registro e checksum; banco inteiramente simulado."""
from contextlib import nullcontext
from hashlib import sha256

import geopandas as gpd
import pytest
from shapely.geometry import Point

from api.repositories import camada_geoespacial_repository as repo


@pytest.mark.parametrize('categoria', ['importadas', 'processadas'])
def test_gravacao_atualiza_registro_existente_e_hash(tmp_path, monkeypatch, categoria):
    path = tmp_path / 'original.gpkg'
    path.write_bytes(b'original')
    queries = []
    class Connection:
        committed = False
        def execute(self, query, params):
            queries.append((query if isinstance(query, str) else query.as_string(), params))
            return self
        def commit(self):
            self.committed = True
    conn = Connection()
    monkeypatch.setattr(repo, 'get_connection', lambda: nullcontext(conn))
    monkeypatch.setattr(repo, '_find_working_layer', lambda *a: (categoria, {
        'id': 'id-existente', 'tipo': 'vetor', 'metadados': {'caminho_arquivo': 'original.gpkg'}}))
    monkeypatch.setattr(repo, 'project_path', lambda _: path)
    monkeypatch.setattr(repo, '_insert_features', lambda *a: None)
    frame = gpd.GeoDataFrame({'nome': ['Alterado']}, geometry=[Point(0, 0)], crs=4326)
    repo.substituir_vetor('sessao-existente', frame, {}, arquivo_editado=path,
                         gravar_arquivo=lambda: path.write_bytes(b'alterado'))
    assert conn.committed
    assert path.read_bytes() == b'alterado'
    checksum = sha256(b'alterado').hexdigest()
    updates = [(q, p) for q, p in queries if 'sha256=' in q or 'hash_arquivo=' in q]
    assert len(updates) == 1
    assert updates[0][1][0] == checksum
    assert updates[0][1][-1] == 'id-existente'
    assert all('INSERT INTO' not in q for q, _ in queries)
    # Caminho divergente é rejeitado antes de tocar no arquivo.
    with pytest.raises(ValueError, match='não corresponde'):
        repo.substituir_vetor('sessao-existente', frame, {}, arquivo_editado=tmp_path / 'outro.gpkg',
                             gravar_arquivo=lambda: pytest.fail('Não pode escrever'))
