#!/usr/bin/env python3
"""Show Codex command calls and results in a VS Code task terminal."""

import json
import os
import re
from pathlib import Path
import time

ROOT = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")) / "sessions"
WORKSPACE = Path(__file__).resolve().parent.parent
COMMAND_CALLS = set()


def latest_session():
    matches = []
    for path in ROOT.glob("*/*/*/rollout-*.jsonl"):
        try:
            with path.open(encoding="utf-8") as stream:
                first = json.loads(stream.readline())
            meta = first.get("payload", {})
            if Path(meta.get("cwd", "")).resolve() == WORKSPACE and isinstance(meta.get("source"), str):
                matches.append(path)
        except (OSError, ValueError, json.JSONDecodeError):
            continue
    return max(matches, key=lambda item: item.name, default=None)


def show(line):
    try:
        item = json.loads(line)
    except json.JSONDecodeError:
        return
    if item.get("type") != "response_item":
        return
    payload = item.get("payload", {})
    kind = payload.get("type")
    if kind == "custom_tool_call" and payload.get("name") == "exec":
        source = payload.get("input", "")
        if "tools.exec_command" in source:
            COMMAND_CALLS.add(payload.get("call_id"))
            commands = re.findall(r'\bcmd\s*:\s*("(?:\\.|[^"\\])*")', source)
            print("\n$ Codex executou:", flush=True)
            if commands:
                for command in commands:
                    try:
                        print(json.loads(command), flush=True)
                    except json.JSONDecodeError:
                        print(command, flush=True)
            else:
                print(source, flush=True)
    elif kind == "custom_tool_call_output" and payload.get("call_id") in COMMAND_CALLS:
        COMMAND_CALLS.discard(payload.get("call_id"))
        for part in payload.get("output", []):
            if part.get("type") != "input_text":
                continue
            raw = part.get("text", "")
            if not raw.strip():
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                if "\nOutput:\n" in raw:
                    raw = raw.split("\nOutput:\n", 1)[1].strip()
                    for line in raw.splitlines():
                        try:
                            nested = json.loads(line)
                        except json.JSONDecodeError:
                            print(line, flush=True)
                            continue
                        print(nested.get("output", line) if isinstance(nested, dict) else line, flush=True)
                else:
                    print(raw, flush=True)
                continue
            if isinstance(data, dict):
                result = data.get("result", {}).get("value", {})
                if isinstance(result, dict) and "output" in result:
                    print(result["output"], flush=True)
                    continue
            print(raw, flush=True)


def main():
    print(f"Acompanhando comandos do Codex em {WORKSPACE}", flush=True)
    current = None
    stream = None
    pending = ""
    while True:
        path = latest_session()
        if path != current:
            if stream:
                stream.close()
            current = path
            stream = path.open(encoding="utf-8") if path else None
            pending = ""
            if path:
                stream.seek(0, os.SEEK_END)
                print(f"\nSessão: {path.name}", flush=True)
        if stream:
            chunk = stream.read()
            if chunk:
                pending += chunk
                *lines, pending = pending.split("\n")
                for line in lines:
                    show(line)
        time.sleep(1)


if __name__ == "__main__":
    main()
