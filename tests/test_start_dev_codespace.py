"""Preflight local: valida a ponte antes do banco e recupera apenas o túnel necessário."""
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock, patch
import subprocess
import sys

import psycopg

SCRIPT = (Path(__file__).resolve().parents[1] / 'scripts/start-dev-codespace.sh').read_text()
PREFLIGHT = SCRIPT.split("<<'PY'\n", 1)[1].split('\nPY\n', 1)[0]


def run_preflight(bridge=0, database_fails=False, dsn='postgresql://localhost:15433/test'):
    config = ModuleType('api.config')
    config.get_settings = lambda: SimpleNamespace(slt_database_url=dsn)
    connect = MagicMock()
    if database_fails:
        connect.side_effect = [psycopg.OperationalError('offline'), MagicMock()]
    with patch.dict(sys.modules, {'api.config': config}), \
         patch.object(subprocess, 'run', return_value=SimpleNamespace(returncode=bridge)) as run, \
         patch.object(psycopg, 'connect', connect), patch('time.sleep'):
        error = None
        try:
            exec(compile(PREFLIGHT, '<preflight>', 'exec'), {})
        except SystemExit as exc:
            error = str(exc)
    return run, connect, error


def test_bridge_failure_preserves_server_and_does_not_probe_database():
    run, connect, error = run_preflight(bridge=1)
    assert 'Ponte Windows indisponível' in error
    connect.assert_not_called()
    assert run.call_count == 1


def test_healthy_connection_does_not_restart_tunnel():
    run, connect, error = run_preflight()
    assert error is None
    assert run.call_count == 1
    assert 'default_transaction_read_only=on' in connect.call_args.kwargs['options']
    connect.return_value.__enter__.return_value.execute.assert_called_once_with('SELECT 1')


def test_failed_database_restarts_tunnel_then_rechecks():
    run, connect, error = run_preflight(database_fails=True)
    assert error is None
    assert connect.call_count == 2
    assert run.call_args.args[0] == ['bash', 'scripts/start-database-tunnel.sh', '--restart']


def test_external_database_does_not_control_local_tunnel():
    run, connect, error = run_preflight(dsn='postgresql://example.invalid:5432/test')
    assert error is None
    run.assert_not_called()
