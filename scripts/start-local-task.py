"""Servidor Windows e pagina inicial no perfil atual do Chrome."""
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


def open_browsers(url=URL + '/'):
    """Delega ao Chrome a abertura no perfil atual, sem criar ou alterar perfis."""
    executable = browser_executable('Chrome')
    if not executable:
        say(f'Chrome nao encontrado. Servidor continua em {url}')
        return
    try:
        subprocess.Popen(
            [str(executable), url],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        say('Pagina inicial enviada ao Chrome, usando o perfil atual.')
    except OSError as error:
        say(f'Nao foi possivel abrir o Chrome ({type(error).__name__}). Servidor continua em {url}')


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
                    say('Servidor e pagina inicial disponiveis. Abrindo no Chrome com o perfil atual.')
                    open_browsers()
                    return
            except (OSError, ValueError):
                pass
        stopped.wait(0.5)
    if not stopped.is_set():
        say('Pagina inicial nao respondeu no prazo; abertura automatica cancelada. Consulte o terminal.')


def confirmar_bancos():
    from dotenv import dotenv_values
    import psycopg

    values = dotenv_values(ROOT / '.env')
    consultas = {
        'slt_db': (values.get('SLT_DATABASE_URL') or '', 'demandas', 'projeto'),
        'sigma_pli_qr53': (values.get('SIGMA_DATABASE_URL') or '', 'usuarios', 'usuario'),
    }
    counts = {}
    for nome, (url, schema, table) in consultas.items():
        if 'pg-pli.pli.internal' not in url or 'sslmode=verify-full' not in url:
            raise SystemExit(f'O acesso local de {nome} não usa o gateway TLS persistente.')
        with psycopg.connect(url, autocommit=True) as connection:
            connection.execute('SET default_transaction_read_only = on')
            database, read_only = connection.execute(
                "SELECT current_database(), current_setting('transaction_read_only')"
            ).fetchone()
            if database != nome or read_only != 'on':
                raise SystemExit(f'A conexão de {nome} não está no banco oficial em modo somente leitura.')
            exists = connection.execute(
                'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema=%s AND table_name=%s)',
                (schema, table),
            ).fetchone()[0]
            if not exists:
                raise SystemExit(f'A tabela esperada de {nome} não foi encontrada.')
            counts[nome] = connection.execute(f'SELECT count(*) FROM "{schema}"."{table}"').fetchone()[0]
    return counts


def main():
    if sys.platform != 'win32':
        raise SystemExit('Esta tarefa e destinada ao Windows.')
    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT))
    counts = confirmar_bancos()
    say(f"Banco oficial confirmado por TLS: slt_db ({counts['slt_db']} projetos) e SIGMA ({counts['sigma_pli_qr53']} usuários).")
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
    monitor.start()
    say('Auto-reload ativo: alteracoes em api/ reiniciam o servidor.')
    try:
        ChangeReload(config, target=server.run, sockets=[sock]).run()
    finally:
        stopped.set()
        monitor.join(timeout=7)


if __name__ == '__main__':
    main()
