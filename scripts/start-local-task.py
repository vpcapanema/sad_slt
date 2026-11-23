"""Servidor Windows e pagina inicial no perfil atual do Edge."""
from __future__ import annotations

import argparse
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
from urllib.error import HTTPError, URLError
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
    """Delega ao Edge a abertura no perfil atual, sem criar ou alterar perfis."""
    executable = browser_executable('Edge')
    if not executable:
        say(f'Edge nao encontrado. Servidor continua em {url}')
        return
    try:
        subprocess.Popen(
            [str(executable), url],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        say('Pagina inicial enviada ao Edge, usando o perfil atual.')
    except OSError as error:
        say(f'Nao foi possivel abrir o Edge ({type(error).__name__}). Servidor continua em {url}')


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
                    say('Servidor e pagina inicial disponiveis. Abrindo no Edge com o perfil atual.')
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


def verificar_prontidao():
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(URL + '/api/health/ready', timeout=15) as response:
            status = response.status
            report = json.load(response)
    except HTTPError as error:
        raise SystemExit(f'O SICARD respondeu com HTTP {error.code} na rota de prontidão.') from None
    except URLError as error:
        if isinstance(error.reason, ConnectionRefusedError):
            raise SystemExit(
                'Nenhum servidor SICARD está escutando na porta 8083. '
                'Execute a tarefa "SICARD: Iniciar servidor local".'
            ) from None
        raise SystemExit(f'Falha na conexão com {URL}: {error.reason}') from None
    except TimeoutError:
        raise SystemExit(f'O SICARD local não respondeu no prazo em {URL}.') from None
    except ValueError:
        raise SystemExit('A rota de prontidão do SICARD não retornou um relatório JSON válido.') from None
    print(f'HTTP {status}')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not isinstance(report, dict) or report.get('ok') is not True:
        raise SystemExit('O servidor respondeu, mas há verificações de prontidão pendentes.')


def main():
    parser = argparse.ArgumentParser(description='Inicia ou verifica o servidor SICARD local.')
    parser.add_argument('--check', action='store_true', help='Consulta a prontidão do servidor em execução.')
    parser.add_argument('--no-browser', action='store_true', help='Inicia sem abrir o Edge.')
    options = parser.parse_args()
    if options.check:
        verificar_prontidao()
        return
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
            if not options.no_browser:
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
    monitor = None
    if not options.no_browser:
        monitor = threading.Thread(target=open_when_ready, args=(instancia, stopped), daemon=True)
        monitor.start()
    say('Auto-reload ativo: alteracoes em api/ reiniciam o servidor.')
    try:
        ChangeReload(config, target=server.run, sockets=[sock]).run()
    finally:
        stopped.set()
        if monitor is not None:
            monitor.join(timeout=7)


if __name__ == '__main__':
    main()
