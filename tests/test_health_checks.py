from __future__ import annotations

import asyncio
from types import SimpleNamespace

from api import health_checks


class _FakeConnection:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def execute(self, _query):
        return self

    def fetchone(self):
        return (True,)


def test_check_slt_database_uses_effective_settings_dsn(monkeypatch):
    expected_dsn = "postgresql://user:secret@sigma_pli_db:5432/slt_db"
    received: list[str] = []

    monkeypatch.setattr(
        health_checks,
        "get_settings",
        lambda: SimpleNamespace(slt_database_url=expected_dsn),
    )

    import psycopg

    def fake_connect(dsn, connect_timeout):
        received.append(dsn)
        assert connect_timeout == 5
        return _FakeConnection()

    monkeypatch.setattr(psycopg, "connect", fake_connect)

    result = asyncio.run(health_checks.check_slt_database())

    assert result["ok"] is True
    assert result["schema_ready"] is True
    assert received == [expected_dsn]


def test_ready_is_blocked_when_database_is_unavailable(monkeypatch):
    async def available():
        return {"ok": True, "message": "ok"}

    async def unavailable_database():
        return {"ok": False, "message": "timeout"}

    monkeypatch.setattr(health_checks, "check_sigma_instituicoes", available)
    monkeypatch.setattr(health_checks, "check_sigma_pessoas", available)
    monkeypatch.setattr(health_checks, "check_slt_database", unavailable_database)

    result = asyncio.run(health_checks.run_ready_checks())

    assert result["ok"] is False
    assert result["checks"]["slt_database"]["ok"] is False
