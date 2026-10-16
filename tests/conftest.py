"""Fixtures opt-in para dados sinteticos; nenhuma montagem real e criada."""
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest


@pytest.fixture
def storage_sintetico(monkeypatch):
    from api import storage_policy
    from api.services import storage_geoespacial

    with TemporaryDirectory(prefix="sicard-teste-storage-") as directory:
        root = Path(directory)
        temporary = root / "temporarios-sicard"
        temporary.mkdir()
        monkeypatch.setenv("SICARD_STORAGE_WRITE_DIR", str(root))
        monkeypatch.setenv("SICARD_STORAGE_TEMP_DIR", str(temporary))
        monkeypatch.setattr(storage_policy, "montagem", lambda path: Path(path) == root)
        # Somente testes opt-in simulam montagem; testes da politica nao a usam.
        monkeypatch.setattr(storage_geoespacial, "montado", lambda: True)
        yield root
