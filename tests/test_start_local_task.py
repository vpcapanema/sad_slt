import importlib.util
import json
from pathlib import Path
import threading
from types import SimpleNamespace
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location('start_local_task', Path(__file__).parents[1] / 'scripts/start-local-task.py')
task = importlib.util.module_from_spec(spec)
spec.loader.exec_module(task)


def test_profile_preserves_unrelated_settings_and_enables_every_level(tmp_path):
    pref = tmp_path / 'Default/Preferences'
    pref.parent.mkdir()
    original = {'profile': {'name': 'Teste'}, 'devtools': {'preferences': {'other': 'keep'},
                'synced_preferences_sync_enabled': {'preserve-console-log': 'false'}}}
    pref.write_text(json.dumps(original), encoding='utf-8')
    task.configure_profile(tmp_path)
    data = json.loads(pref.read_bytes())
    assert data['profile']['name'] == original['profile']['name']
    assert data['profile']['exit_type'] == 'Normal'
    assert data['profile']['exited_cleanly'] is True
    assert data['session']['restore_on_startup'] == 5
    assert data['devtools']['preferences']['other'] == 'keep'
    assert all(json.loads(data['devtools']['preferences']['message-level-filters']).values())
    assert data['devtools']['preferences']['panel-selected-tab'] == '"console"'
    assert data['devtools']['synced_preferences_sync_enabled']['preserve-console-log'] == 'true'
    assert json.loads(pref.with_name('Preferences.before-console.bak').read_bytes()) == original
    modified = pref.stat().st_mtime_ns
    task.configure_profile(tmp_path)
    assert pref.stat().st_mtime_ns == modified


def test_external_browser_arguments_and_missing_browser(tmp_path, monkeypatch):
    monkeypatch.setenv('LOCALAPPDATA', str(tmp_path))
    monkeypatch.setattr(task, 'browser_executable', lambda name: tmp_path / (name + '.exe'))
    popen = Mock()
    monkeypatch.setattr(task.subprocess, 'Popen', popen)
    task.open_browsers()
    assert popen.call_count == 2
    for call in popen.call_args_list:
        args = call.args[0]
        assert '--auto-open-devtools-for-tabs' in args
        assert '--disable-extensions' in args
        assert '--disable-background-mode' in args
        assert '--disable-session-crashed-bubble' in args
        assert '--new-window' in args
        assert args[-1] == 'http://127.0.0.1:8083/'
        assert any(a.startswith('--user-data-dir=') and 'BrowserProfiles-Isolated' in a for a in args)
        assert not any('remote-debugging' in a for a in args)
    popen.reset_mock()
    monkeypatch.setattr(task, 'configure_profile', Mock(side_effect=PermissionError))
    task.open_browsers()
    assert popen.call_count == 2
    popen.reset_mock()
    monkeypatch.setattr(task, 'browser_executable', lambda name: None)
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
