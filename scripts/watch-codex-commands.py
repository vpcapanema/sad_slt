"""Read-only mirror of Codex command records in a VS Code terminal."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import time

ROOT = Path(os.environ.get('CODEX_HOME', Path.home() / '.codex')) / 'sessions'
WORKSPACE = Path(__file__).resolve().parent.parent

def normalized(path):
    return os.path.normcase(os.path.abspath(path))

def render_output(value):
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict) and item.get('type') in ('input_text', 'text'):
                render_output(item.get('text', ''))
        return
    if isinstance(value, dict):
        if 'output' in value:
            render_output(value['output'])
            if value.get('session_id') is not None:
                print(f"[processo em andamento: {value['session_id']}]", flush=True)
            if value.get('exit_code') is not None:
                print(f"[codigo de saida: {value['exit_code']}]", flush=True)
        elif 'result' in value:
            render_output(value['result'].get('value', value['result']))
        return
    if not isinstance(value, str) or not value.strip():
        return
    try:
        parsed = json.loads(value)
    except (ValueError, TypeError):
        print(value.rstrip(), flush=True)
    else:
        if parsed == value:
            print(value, flush=True)
        else:
            render_output(parsed)

class Session:
    def __init__(self, path, session_id):
        self.path = path
        self.id = session_id[-12:]
        self.calls = set()
        self.cells = set()
        self.offset = 0
        self.pending = b''

    def show(self, item):
        if item.get('type') != 'response_item': return
        p = item.get('payload', {})
        kind = p.get('type', '')
        name = p.get('name', '').split('.')[-1]
        if kind in ('custom_tool_call', 'function_call'):
            source = p.get('input', p.get('arguments', ''))
            direct = name in ('exec_command', 'write_stdin')
            orchestration = name == 'exec' and re.search(r'tools\.(exec_command|write_stdin)\s*\(', source)
            polling = name == 'wait' and any(cell in source for cell in self.cells)
            if not (direct or orchestration or polling): return
            self.calls.add(p.get('call_id'))
            timestamp = item.get('timestamp', '')
            print(f'\n=== {self.id} | {timestamp} | {name} ===', flush=True)
            if name in ('write_stdin', 'wait'):
                print('[acompanhando processo em execucao]', flush=True)
            elif direct:
                try: print(json.loads(source).get('cmd', source), flush=True)
                except ValueError: print(source, flush=True)
            else:
                # Keep the exact orchestration source: JS expressions and multiple
                # command strings cannot be reliably decoded with a single regex.
                print(source, flush=True)
        elif kind in ('custom_tool_call_output', 'function_call_output') and p.get('call_id') in self.calls:
            self.calls.discard(p.get('call_id'))
            output = p.get('output', '')
            self.cells.update(re.findall(r'Script running with cell ID ([\w-]+)', str(output)))
            print(f'--- saida | {self.id} ---', flush=True)
            render_output(output)

    def read(self, initial=False):
        with self.path.open('rb') as stream:
            size = self.path.stat().st_size
            if initial:
                stream.seek(max(0, size - 65536))
                if stream.tell(): stream.readline()
            else:
                if size < self.offset:
                    self.offset = 0
                    self.pending = b''
                stream.seek(self.offset)
            data = self.pending + stream.read()
            self.offset = stream.tell()
        *lines, self.pending = data.split(b'\n')
        for line in lines:
            try: self.show(json.loads(line))
            except (ValueError, UnicodeError): pass

def discover(extra_ids):
    # Today and yesterday only: avoid scanning the entire history each second.
    now = datetime.datetime.now()
    for day in (now, now - datetime.timedelta(days=1)):
        directory = ROOT / day.strftime('%Y/%m/%d')
        for path in directory.glob('rollout-*.jsonl'):
            try:
                with path.open(encoding='utf-8') as stream:
                    meta = json.loads(stream.readline()).get('payload', {})
                if normalized(meta.get('cwd', '')) == normalized(WORKSPACE) or meta.get('id') in extra_ids:
                    yield path, meta.get('id', path.stem)
            except (OSError, ValueError): pass
    # Explicitly linked sessions can be older than yesterday.
    for session_id in extra_ids:
        for path in ROOT.glob(f'*/*/*/rollout-*-{session_id}.jsonl'):
            yield path, session_id

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--once', action='store_true', help='Read current records and exit')
    args = parser.parse_args()
    config = WORKSPACE / '.git/info/codex-monitor.json'
    extra_ids = json.loads(config.read_text(encoding='utf-8')).get('session_ids', []) if config.exists() else []
    print('SICARD | Comandos do Codex\nMonitor somente de leitura; Ctrl+C encerra apenas o monitor.', flush=True)
    print('As saidas chegam quando o Codex as registra; podem estar truncadas pela ferramenta.\n', flush=True)
    sessions = {}
    next_scan = 0
    while True:
        if time.monotonic() >= next_scan:
            for path, session_id in discover(extra_ids):
                if path not in sessions:
                    sessions[path] = Session(path, session_id)
                    print(f'\nSessao conectada: {session_id}', flush=True)
                    sessions[path].read(initial=True)
            next_scan = time.monotonic() + 5
        for session in sessions.values():
            try: session.read()
            except OSError: pass
        if args.once: return
        time.sleep(0.5)

if __name__ == '__main__':
    try: main()
    except KeyboardInterrupt: print('\nMonitor encerrado. Os comandos do Codex continuam normalmente.')
