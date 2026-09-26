"""SICARD: status, commit, sync, VM deploy and verified external browser launch."""
from __future__ import annotations
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = "https://56.125.163.194/sicard"
HOST_KEY = "SHA256:eaE7ZPAGxV4DfSDRZyi09s5LkeRgJcrA8qvMSCCxnf0"
LOG = None

def say(message):
    line = f"[{dt.datetime.now():%H:%M:%S}] {message}"
    print(line, flush=True)
    if LOG:
        LOG.write(line + "\n")
        LOG.flush()

def run(args, capture=False, timeout=None):
    # List arguments, never interpolate local shell commands. Stream deploy output.
    if capture:
        result = subprocess.run(args, cwd=ROOT, text=True, encoding="utf-8",
                                errors="replace", capture_output=True, timeout=timeout)
        if result.returncode:
            raise RuntimeError(f"{Path(args[0]).name} falhou ({result.returncode}): {result.stderr.strip()}")
        return result.stdout.strip()
    proc = subprocess.Popen(args, cwd=ROOT, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
    try:
        for line in proc.stdout:
            say(line.rstrip())
        if proc.wait():
            raise RuntimeError(f"{Path(args[0]).name} falhou (codigo {proc.returncode}).")
    except BaseException:
        proc.terminate()
        proc.wait()
        raise
    return ""

def ready_ok(data):
    checks = data.get("checks", {})
    required = ("api", "sigma_instituicoes", "sigma_pessoas", "slt_database")
    return (data.get("ok") is True
            and all(checks.get(name, {}).get("ok") is True for name in required)
            and checks["slt_database"].get("configured") is True
            and checks["slt_database"].get("schema_ready") is True)

def check_web():
    for attempt in range(1, 13):
        try:
            with urllib.request.urlopen(URL + "/api/health/ready", timeout=90) as response:
                data = json.load(response)
            for name, check in data.get("checks", {}).items():
                say(f"Saude {name}: {'OK' if check.get('ok') else 'FALHOU'}")
            if not ready_ok(data):
                raise RuntimeError("API, integracoes ou schema do banco ainda indisponiveis")
            with urllib.request.urlopen(URL + "/public/", timeout=30) as response:
                if response.status != 200 or "text/html" not in response.headers.get("Content-Type", ""):
                    raise RuntimeError("Pagina inicial nao retornou HTML HTTP 200")
            say("HTTPS, pagina inicial, API, SIGMA e banco SLT: OK")
            return
        except Exception as exc:
            say(f"Saude: tentativa {attempt}/12 falhou ({type(exc).__name__}).")
            if attempt == 12:
                raise RuntimeError("Saude final nao confirmada; navegador nao sera aberto.") from exc
            time.sleep(5)

def main():
    global LOG
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--message", default="")
    parser.add_argument("--check", action="store_true", help="Somente pre-requisitos locais e SSH; sem commit/push/deploy")
    args = parser.parse_args()
    git = shutil.which("git") or r"C:\Program Files\Git\cmd\git.exe"
    def g(*parts, capture=False):
        return run([git, *parts], capture=capture)
    git_dir = Path(g("rev-parse", "--absolute-git-dir", capture=True))
    logs = git_dir / "deploy-logs"
    logs.mkdir(exist_ok=True)
    log_path = logs / (dt.datetime.now().strftime("%Y%m%d-%H%M%S") + ".log")
    LOG = log_path.open("a", encoding="utf-8")
    say(f"Log detalhado: {log_path}")
    say("1/7 - Pre-requisitos e status do Git")
    branch = g("branch", "--show-current", capture=True)
    if branch != "main":
        raise RuntimeError("Deploy permitido apenas na branch main.")
    origin = g("remote", "get-url", "origin", capture=True)
    if origin not in ("https://github.com/vpcapanema/sad_slt.git", "git@github.com:vpcapanema/sad_slt.git"):
        raise RuntimeError("origin nao corresponde a vpcapanema/sad_slt.")
    for state in ("MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD"):
        if (git_dir / state).exists():
            raise RuntimeError("Conclua a operacao Git pendente antes de publicar.")
    g("status", "--short", "--branch")
    key = ROOT / ".deploy/SRV-SISTEMA-30001480.ppk"
    plink = next((str(p) for p in (git_dir / "tools/plink.exe", Path(r"C:\Program Files\PuTTY\plink.exe")) if p.is_file()), None)
    if not plink or not key.is_file():
        raise RuntimeError("Plink ou chave .deploy/SRV-SISTEMA-30001480.ppk ausente.")
    ssh = [plink, "-ssh", "-batch", "-T", "-no-antispoof", "-hostkey", HOST_KEY, "-i", str(key), "ubuntu@56.125.163.194"]
    say("Verificando acesso SSH e ferramentas da VM (sem deploy)...")
    run([*ssh, "cd /opt/sicard && test -f .env && test -z \"$(git status --porcelain --untracked-files=no)\" && git --version && git lfs version && docker compose version && command -v flock && sudo -n nginx -t"], capture=True, timeout=40)
    if args.check:
        say("Pre-requisitos e acesso SSH OK. Nenhum commit, push ou deploy executado.")
        return
    # Use the repository Git identity without interactive questions.
    g("var", "GIT_AUTHOR_IDENT", capture=True)
    g("var", "GIT_COMMITTER_IDENT", capture=True)
    say("2/7 - Commit das alteracoes visiveis (ignorados e exclusoes locais preservados)")
    if g("status", "--porcelain", capture=True):
        g("add", "-A")
        g("diff", "--cached", "--stat")
        g("commit", "-m", args.message.strip() or f"chore: atualizacao SICARD {dt.datetime.now():%Y-%m-%d %H:%M}")
    else:
        say("Nenhuma alteracao para commitar.")
    say("3/7 - Sincronizacao com origin/main")
    g("fetch", "origin", "main")
    protected_file = git_dir / "info/local-only-reports.json"
    if protected_file.exists():
        protected = json.loads(protected_file.read_text(encoding="utf-8"))
        incoming = set(g("diff", "--name-only", "HEAD...origin/main", capture=True).splitlines())
        if incoming.intersection(protected.get("assume_unchanged_paths", [])):
            raise RuntimeError("Atualizacao remota afeta relatorios locais protegidos. Integracao manual necessaria; nada enviado.")
    # Merge preserves existing commits; conflicts stop before push and VM mutation.
    g("merge", "--no-edit", "origin/main")
    if g("status", "--porcelain", capture=True):
        raise RuntimeError("Surgiram alteracoes durante a sincronizacao. Revise antes de publicar.")
    sha = g("rev-parse", "HEAD", capture=True)
    g("push", "origin", "HEAD:refs/heads/main")
    remote = g("ls-remote", "origin", "refs/heads/main", capture=True).split()[0]
    if remote != sha:
        raise RuntimeError("GitHub mudou durante a publicacao; execute novamente.")
    say(f"4/7 - Deploy da revisao {sha}; build e reinicio com saida ao vivo")
    # Fetch the committed deploy script, not an outdated copy in the VM checkout.
    command = ("set -eu; cd /opt/sicard; exec 9>/opt/sicard/.git/sicard-deploy.lock; "
               "flock -n 9 || { echo 'Outro deploy esta em andamento'; exit 1; }; "
               "test -z \"$(git status --porcelain --untracked-files=no)\"; "
               "git fetch origin main; "
               f"test \"$(git rev-parse origin/main)\" = {sha}; "
               "f=$(mktemp); trap 'rm -f \"$f\"' EXIT; "
               f"git show {sha}:.deploy/update_vm.sh >\"$f\"; "
               f"BUILDKIT_PROGRESS=plain bash \"$f\" main {sha}; "
               f"test \"$(git rev-parse HEAD)\" = {sha}; "
               "docker compose -f docker-compose.vm.yml ps; "
               "docker logs --tail 60 sicard_app; "
               "for i in $(seq 1 30); do "
               "s=$(docker inspect --format '{{.State.Health.Status}}' sicard_app); "
               "echo \"Container: $s (tentativa $i/30)\"; "
               "[ \"$s\" != healthy ] || exit 0; sleep 5; done; exit 1")
    run([*ssh, "bash -c " + __import__("shlex").quote(command)])
    say("5/7 - Checagem publica da saude e das conexoes reais")
    check_web()
    say(f"6/7 - Concluido: local, GitHub e VM na revisao {sha}")
    say("7/7 - Abrindo pagina inicial no navegador externo padrao")
    os.startfile(URL + "/public/")
    say("Fluxo finalizado com sucesso.")

if __name__ == "__main__":
    try:
        main()
    except (Exception, KeyboardInterrupt) as exc:
        say(f"INTERROMPIDO: {exc or 'cancelado pelo usuario'}. Etapas seguintes nao executadas.")
        sys.exit(1)
    finally:
        if LOG:
            LOG.close()
