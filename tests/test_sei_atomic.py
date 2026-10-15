from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from api.db import connection as db

@pytest.mark.parametrize("falha", [False, True])
def test_unidade_atomica_confirma_so_no_final(monkeypatch, falha):
    conn = Mock()
    @contextmanager
    def borrow(dsn):
        yield conn
    monkeypatch.setattr(db, "_borrow", borrow)
    monkeypatch.setattr(db, "get_settings", lambda: SimpleNamespace(slt_database_url="teste"))
    def executar():
        with db.atomic_connection():
            with db.get_connection() as inner:
                db.commit_unless_atomic(inner)
            conn.commit.assert_not_called()
            if falha:
                raise ValueError("vinculo falhou")
    if falha:
        with pytest.raises(ValueError):
            executar()
        conn.commit.assert_not_called()
        conn.rollback.assert_called_once()
    else:
        executar()
        conn.commit.assert_called_once()
    assert not getattr(db._thread_connections, "atomic", False)
