from __future__ import annotations

from contextlib import contextmanager
import unittest
from unittest.mock import patch

from api.repositories import universo_repository


class _FakeResult:
    def __init__(self, rows: list[dict]):
        self._rows = rows

    def fetchall(self) -> list[dict]:
        return self._rows


class _FakeConnection:
    def __init__(self, rows: list[dict]):
        self.rows = rows
        self.calls: list[tuple[str, object]] = []

    def execute(self, query: str, params: object) -> _FakeResult:
        self.calls.append((query, params))
        return _FakeResult(self.rows)


def _connection_context(rows: list[dict]):
    connection = _FakeConnection(rows)

    @contextmanager
    def fake_get_connection():
        yield connection

    return connection, fake_get_connection


class UniversoRepositoryTest(unittest.TestCase):
    def _call(self, tipo: str, status: str | None, rows: list[dict]):
        connection, fake_get_connection = _connection_context(rows)
        with (
            patch.object(
                universo_repository,
                "get_connection",
                fake_get_connection,
            ),
            patch.object(
                universo_repository,
                "colunas_validas",
                lambda _tipo: {"id", "codigo", "nome", "status"},
            ),
        ):
            result = universo_repository.list_elegiveis(tipo, status=status)
        return connection, result

    def test_status_todas_retorna_elegiveis_e_inelegiveis_sem_filtro(self) -> None:
        rows = [
            {"id": "1", "codigo": "P-1", "nome": "Elegível", "status": "analise_aprovada"},
            {"id": "2", "codigo": "P-2", "nome": "Inapta", "status": "rascunho"},
        ]

        connection, result = self._call("projeto", "todas", rows)

        self.assertEqual(result, rows)
        query, params = connection.calls[0]
        self.assertNotIn("status =", query)
        self.assertNotIn("status = ANY", query)
        self.assertEqual(params, [])

    def test_status_explicito_permanece_parametrizado(self) -> None:
        connection, _result = self._call("programa", "analise_aprovada", [])

        query, params = connection.calls[0]
        self.assertIn("AND base.status = %s", query)
        self.assertIn("LEFT JOIN demandas.plano pai", query)
        self.assertIn("AS plano_id_alias", query)
        self.assertEqual(params, ["analise_aprovada"])

    def test_sem_status_mantem_filtro_padrao_do_universo(self) -> None:
        connection, _result = self._call("plano", None, [])

        query, params = connection.calls[0]
        self.assertIn("AND base.status = ANY(%s)", query)
        self.assertEqual(params, [list(universo_repository.AHP_STATUSES)])


if __name__ == "__main__":
    unittest.main()
