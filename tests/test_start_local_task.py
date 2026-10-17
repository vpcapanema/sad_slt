import importlib.util
from pathlib import Path
import threading
from types import SimpleNamespace
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location('start_local_task', Path(__file__).parents[1] / 'scripts/start-local-task.py')
task = importlib.util.module_from_spec(spec)
spec.loader.exec_module(task)


def test_opens_only_edge_without_overriding_profile(tmp_path, monkeypatch):
    executable = Mock(return_value=tmp_path / 'msedge.exe')
    monkeypatch.setattr(task, 'browser_executable', executable)
    popen = Mock()
    monkeypatch.setattr(task.subprocess, 'Popen', popen)
    task.open_browsers()
    executable.assert_called_once_with('Edge')
    popen.assert_called_once()
    assert popen.call_args.args[0] == [str(tmp_path / 'msedge.exe'), 'http://127.0.0.1:8083/']
    assert list(tmp_path.iterdir()) == []
    popen.reset_mock()
    executable.return_value = None
    task.open_browsers()
    popen.assert_not_called()


def test_browser_opens_only_after_this_server_and_homepage_ready(monkeypatch):
    import io

    def response(body, content_type):
        value = io.BytesIO(body)
        value.status = 200
        value.headers = {'Content-Type': content_type}
        return value
    opener = Mock()
    opener.open.side_effect = [response(b'{"status":"ok"}', 'application/json'),
                               response(b'<html></html>', 'text/html'),
                               response(b'{"authenticated":false}', 'application/json'),
                               response(b'async function authRequest(){}', 'text/javascript')]
    monkeypatch.setattr(task.urllib.request, 'build_opener', lambda *a: opener)
    launch = Mock()
    monkeypatch.setattr(task, 'open_browsers', launch)
    task.open_when_ready(SimpleNamespace(started=True), threading.Event(), timeout=1)
    launch.assert_called_once_with()
    launch.reset_mock()
    task.open_when_ready(SimpleNamespace(started=False), threading.Event(), timeout=0)
    launch.assert_not_called()
    stopped = threading.Event()
    stopped.set()
    task.open_when_ready(SimpleNamespace(started=True), stopped)
    launch.assert_not_called()


def test_unhealthy_or_failed_homepage_does_not_launch(monkeypatch):
    opener = Mock()
    opener.open.side_effect = OSError('not ready')
    monkeypatch.setattr(task.urllib.request, 'build_opener', lambda *a: opener)
    launch = Mock()
    monkeypatch.setattr(task, 'open_browsers', launch)
    task.open_when_ready(SimpleNamespace(started=True), threading.Event(), timeout=0.01)
    launch.assert_not_called()
