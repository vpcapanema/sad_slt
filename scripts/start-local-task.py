"""Servidor Windows e navegadores externos com Console detalhado."""
from __future__ import annotations

import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import threading
import time
from types import SimpleNamespace
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = 'http://127.0.0.1:8083'
CONSOLE = {
    'message-level-filters': {'verbose': True, 'info': True, 'warning': True, 'error': True},
    'console.text-filter': '',
    'console.sidebar-selected-filter': 'message',
    'preserve-console-log': True,
    'console-timestamps-enabled': True,
    'console-group-similar': False,
    'selected-context-filter-enabled': False,
    'network-messages': True,
    'hide-network-messages': False,
    'console-shows-cors-errors': True,
    'monitoring-xhr-enabled': True,
    'panel-selected-tab': 'console',
    'currentDockState': 'bottom',
}


def say(message):
    print(f'[SICARD local] {message}', flush=True)


def browser_executable(name):
    relative = {'Chrome': 'Google/Chrome/Application/chrome.exe',
                'Edge': 'Microsoft/Edge/Application/msedge.exe'}[name]
    for env in ('PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'):
        if os.environ.get(env):
            path = Path(os.environ[env]) / relative
            if path.is_file():
                return path
    found = shutil.which('chrome.exe' if name == 'Chrome' else 'msedge.exe')
    return Path(found) if found else None


def configure_profile(profile):
    """Nunca modifica um perfil de navegador aberto; preserva demais preferencias."""
    desired = {k: json.dumps(v, separators=(',', ':')) for k, v in CONSOLE.items()}
    path = profile / 'Default' / 'Preferences'
    original = path.read_bytes() if path.exists() else None
    data = json.loads(original) if original else {}
    # Uma queda anterior nao deve restaurar abas locais antes de o novo servidor
    # estar pronto. Este perfil e exclusivo da tarefa SICARD.
    profile_settings = data.setdefault('profile', {})
    profile_settings['exit_type'] = 'Normal'
    profile_settings['exited_cleanly'] = True
    data.setdefault('session', {})['restore_on_startup'] = 5
    devtools = data.setdefault('devtools', {})
    prefs = devtools.setdefault('preferences', {})
    before = json.dumps(data, sort_keys=True)
    prefs.update(desired)
    for store in ('synced_preferences_sync_enabled', 'synced_preferences_sync_disabled'):
        if isinstance(devtools.get(store), dict):
            for key in ('preserve-console-log', 'monitoring-xhr-enabled'):
                devtools[store][key] = desired[key]
    if before == json.dumps(data, sort_keys=True) and original is not None:
        return
    # Chromium Windows mantem este arquivo aberto sem compartilhamento.
    lock = profile / 'lockfile'
    if lock.exists():
        with lock.open('r+b'):
            pass
    path.parent.mkdir(parents=True, exist_ok=True)
    if original is not None:
        if path.read_bytes() != original:
            raise RuntimeError('Preferencias mudaram durante a leitura; feche este perfil e repita.')
        path.with_name('Preferences.before-console.bak').write_bytes(original)
    temporary = path.with_name('Preferences.sicard.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    os.replace(temporary, path)
    if json.loads(path.read_bytes()) != data:
        raise RuntimeError('Falha ao verificar preferencias do Console.')


def open_browsers(url=URL + '/'):
    root = Path(os.environ['LOCALAPPDATA']) / 'SICARD' / 'BrowserProfiles-Isolated'
    for name in ('Edge', 'Chrome'):
        executable = browser_executable(name)
        if not executable:
            say(f'{name} nao encontrado. Servidor continua em {url}')
            continue
        profile = root / name
        try:
            try:
                configure_profile(profile)
            except PermissionError:
                # O Chromium bloqueia Preferences enquanto o perfil esta aberto.
                # Como este diretorio e exclusivo da tarefa, a configuracao ja
                # aplicada pode ser reutilizada e a nova URL ainda deve abrir.
                say(f'{name}: perfil SICARD ja aberto; reutilizando a configuracao existente.')
            subprocess.Popen([
                str(executable), f'--user-data-dir={profile}', '--profile-directory=Default',
                '--no-first-run', '--no-default-browser-check',
                '--disable-extensions', '--disable-background-mode',
                '--disable-session-crashed-bubble',
                '--auto-open-devtools-for-tabs', '--new-window', url,
            ], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            say(f'{name}: abertura solicitada com Console e todos os niveis. Perfil: {profile}')
        except (OSError, ValueError, RuntimeError) as error:
            say(f'{name}: nao foi possivel preparar/abrir ({type(error).__name__}). '
                'Feche as janelas SICARD local deste navegador e reinicie a tarefa. '
                f'Servidor continua em {url}')


def open_when_ready(server, stopped, timeout=180):
    """Espera esta instancia iniciar, evitando confundir outro processo na porta."""
    deadline = time.monotonic() + timeout
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    while not stopped.is_set() and time.monotonic() < deadline:
        if server.started:
            try:
                with opener.open(URL + '/api/health', timeout=3) as response:
                    healthy = response.status == 200 and json.load(response).get('status') == 'ok'
                with opener.open(URL + '/', timeout=3) as response:
                    homepage = response.status == 200 and 'text/html' in response.headers.get('Content-Type', '')
                with opener.open(URL + '/api/auth/session', timeout=3) as response:
                    session_endpoint = response.status == 200 and 'authenticated' in json.load(response)
                with opener.open(URL + '/assets/js/admin-api.js', timeout=3) as response:
                    login_script = response.status == 200 and b'authRequest' in response.read()
                if healthy and homepage and session_endpoint and login_script and not stopped.is_set():
                    say('Servidor e pagina inicial disponiveis. Abrindo navegadores externos.')
                    open_browsers()
                    return
            except (OSError, ValueError):
                pass
        stopped.wait(0.5)
    if not stopped.is_set():
        say('Pagina inicial nao respondeu no prazo; abertura automatica cancelada. Consulte o terminal.')


def main():
    if sys.platform != 'win32':
        raise SystemExit('Esta tarefa e destinada ao Windows.')
    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT))
    from scripts.local_vm_tunnel import VmDatabaseTunnel
    tunnel = VmDatabaseTunnel(ROOT, say)
    counts = tunnel.ensure()
    # Quando o supervisor autônomo (scripts/tunnel_daemon.py) já mantém o túnel,
    # esta tarefa apenas o usa: supervisionar em paralelo faria as duas partes
    # disputarem o mesmo plink a cada sondagem.
    proprio = tunnel.process is not None
    say(f"Banco oficial confirmado: slt_db ({counts['slt_db']} projetos) e SIGMA ({counts['sigma_pli_qr53']} usuários).")
    if not proprio:
        say('Túnel mantido pelo supervisor autônomo; esta tarefa não o administra.')
    try:
        with socket.create_connection(('127.0.0.1', 8083), timeout=1):
            occupied = True
    except OSError:
        occupied = False
    if occupied:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        try:
            with opener.open(URL + '/api/health', timeout=5) as response:
                healthy = response.status == 200 and json.load(response).get('status') == 'ok'
            with opener.open(URL + '/assets/js/admin-api.js', timeout=5) as response:
                healthy = healthy and response.status == 200 and b'authRequest' in response.read()
        except (OSError, ValueError):
            healthy = False
        if healthy:
            say('Servidor SICARD já disponível na porta 8083; reutilizando a instância existente.')
            say('Esta execução não administra nem encerra a instância existente.')
            open_browsers()
            return
        raise SystemExit('Porta 8083 ocupada por um serviço que não respondeu como SICARD saudável. Encerre esse serviço antes de iniciar a task.')
    import uvicorn
    from uvicorn.supervisors import ChangeReload
    # Sem migrations ou processos extras de servidor. O auto-reload observa
    # apenas o codigo Python da aplicacao: os templates ja recarregam pelo Jinja
    # e vigiar a arvore inteira (dados, .venv, saidas) dispararia reinicios.
    config = uvicorn.Config(
        'api.server:app', host='127.0.0.1', port=8083, env_file='.env',
        reload=True, reload_dirs=[str(ROOT / 'api')],
    )
    # Vincular a porta antes de supervisionar: se outro processo ja a ocupa, o
    # erro aparece aqui, e nao como um reinicio silencioso do trabalhador.
    sock = config.bind_socket()
    server = uvicorn.Server(config)
    # Com reload, quem atende e o processo trabalhador; a porta ja e desta
    # instancia, entao a prontidao e decidida apenas pelas sondagens HTTP.
    instancia = SimpleNamespace(started=True)
    stopped = threading.Event()
    monitor = threading.Thread(target=open_when_ready, args=(instancia, stopped), daemon=True)
    tunnel_monitor = threading.Thread(target=tunnel.monitor, args=(stopped,), daemon=True)
    monitor.start()
    if proprio:
        tunnel_monitor.start()
    say('Auto-reload ativo: alteracoes em api/ reiniciam o servidor.')
    try:
        ChangeReload(config, target=server.run, sockets=[sock]).run()
    finally:
        stopped.set()
        monitor.join(timeout=7)
        if proprio:
            tunnel_monitor.join(timeout=7)
            tunnel.stop()


if __name__ == '__main__':
    main()
