"""Exercise only the isolated Storage sync function, with no SSH or real Docker."""
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess

import pytest

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'.deploy/update_vm.sh'
FILES=('templates/common/base.html','static/sicard/cores.css')


def bash_executable():
    git_bash=Path(os.environ.get('ProgramFiles',''))/'Git'/'bin'/'bash.exe'
    return str(git_bash) if os.name=='nt' and git_bash.is_file() else shutil.which('bash')


def run_sync(tmp_path,*,current=False,image='drakkan/sftpgo:v2.7.5',mount_ok=True,healthy=True,missing=False):
    bash=bash_executable()
    assert bash, 'Bash is required to validate the deployment function'
    app=tmp_path/'app'
    storage=tmp_path/'storage'
    calls=tmp_path/'calls'
    for relative in FILES:
        source=app/'.deploy/storage'/relative
        target=storage/relative
        source.parent.mkdir(parents=True,exist_ok=True)
        target.parent.mkdir(parents=True,exist_ok=True)
        source.write_text('storageSavedTheme '+relative,encoding='utf-8')
        target.write_text(source.read_text() if current else 'old '+relative,encoding='utf-8')
    protected=storage/'config/sensitive'
    protected.parent.mkdir()
    protected.write_text('unchanged',encoding='ascii')
    if missing:
        (storage/FILES[1]).unlink()
    function=re.search(r'^sync_storage_branding\(\) \{.*?^\}',SCRIPT.read_text(encoding='utf-8'),re.M|re.S).group()
    deployed_storage=re.search(r'local storage_dir="([^"]+)"',function).group(1)
    function=function.replace(deployed_storage,storage.as_posix())
    template_mount=(storage/FILES[0]).as_posix() if mount_ok else '/wrong/template'
    setup=f'''
set -eu
APP_DIR={shlex.quote(app.as_posix())}
CALLS={shlex.quote(calls.as_posix())}
step() {{ :; }}
ok() {{ :; }}
info() {{ :; }}
die() {{ echo "$*" >&2; exit 1; }}
sudo() {{ printf '%s\\n' "$*" >> "$CALLS"; "$@"; }}
sleep() {{ :; }}
docker() {{
    printf '%s\\n' "$*" >> "$CALLS"
    if [[ "$1" == restart ]]; then return 0; fi
    case "$3" in
      *Config.Image*) printf '%s\\n' {shlex.quote(image)};;
      *templates/common*) printf '%s\\n' {shlex.quote(template_mount)};;
      *static/sicard*) printf '%s\\n' {shlex.quote((storage/'static/sicard').as_posix())};;
      *) exit 90;;
    esac
}}
curl() {{
    printf '%s\\n' "$*" >> "$CALLS"
    if [[ {shlex.quote(str(healthy))} != True ]]; then return 22; fi
    case "${{@: -1}}" in
      */cores.css) cat "$APP_DIR/.deploy/storage/static/sicard/cores.css";;
      */login) printf 'storageSavedTheme';;
      *) exit 91;;
    esac
}}
'''
    result=subprocess.run([bash,'-c',setup+function+'\nsync_storage_branding'],capture_output=True,text=True,timeout=15)
    assert protected.read_text()=='unchanged'
    return result,app,storage,calls.read_text() if calls.exists() else ''


def test_sync_publishes_only_template_and_css_then_restarts(tmp_path):
    result,app,storage,calls=run_sync(tmp_path)
    assert result.returncode==0,result.stderr
    for relative in FILES:
        assert (storage/relative).read_bytes()==(app/'.deploy/storage'/relative).read_bytes()
    assert calls.count('cp ')==2
    assert calls.count('restart sicard_storage')==1
    assert '/web/admin/login' in calls and '/web/client/login' in calls
    assert 'compose ' not in calls and 'sicard_app' not in calls


def test_identical_files_do_not_restart_storage(tmp_path):
    result,_,_,calls=run_sync(tmp_path,current=True)
    assert result.returncode==0,result.stderr
    assert 'cp ' not in calls and 'restart ' not in calls


@pytest.mark.parametrize('options',[
    {'image':'drakkan/sftpgo:v3'},
    {'mount_ok':False},
    {'missing':True},
])
def test_preflight_failure_stops_before_any_copy(tmp_path,options):
    result,_,_,calls=run_sync(tmp_path,**options)
    assert result.returncode!=0
    assert 'cp ' not in calls and 'restart ' not in calls


def test_health_failure_is_not_reported_as_success(tmp_path):
    result,_,_,_=run_sync(tmp_path,healthy=False)
    assert result.returncode!=0
    assert 'Storage nao confirmou' in result.stderr


def test_storage_only_sync_follows_checkout_and_skips_app_build():
    script=SCRIPT.read_text(encoding='utf-8')
    scope=script.index('if [[ "$DEPLOY_SCOPE" == "storage" ]]')
    assert script.index('git reset --hard')<scope<script.index('docker compose -f "$COMPOSE_FILE" build')
    block=script[scope:script.index('\nfi',scope)]
    assert 'sync_storage_branding' in block and 'exit 0' in block
