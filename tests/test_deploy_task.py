"""Isolated tests: never access the real Git repository, SSH or production."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import types

spec = importlib.util.spec_from_file_location('deploy_task', Path(__file__).resolve().parents[1] / 'scripts/deploy-task.py')
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)

class DeployTests(unittest.TestCase):
    def test_health_requires_real_database_and_all_integrations(self):
        healthy = {'ok': True, 'checks': {name: {'ok': True} for name in
                   ('api', 'sigma_instituicoes', 'sigma_pessoas', 'slt_database')}}
        healthy['checks']['slt_database'].update(configured=True, schema_ready=True)
        self.assertTrue(deploy.ready_ok(healthy))
        for name in healthy['checks']:
            bad = copy.deepcopy(healthy)
            bad['checks'][name]['ok'] = False
            self.assertFalse(deploy.ready_ok(bad))
        for flag in ('configured', 'schema_ready'):
            bad = copy.deepcopy(healthy)
            bad['checks']['slt_database'][flag] = False
            self.assertFalse(deploy.ready_ok(bad))

    def workflow(self, failure=None):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / '.git/tools').mkdir(parents=True)
            (root / '.git/tools/plink.exe').touch()
            (root / '.deploy').mkdir()
            (root / '.deploy/SRV-SISTEMA-30001480.ppk').touch()
            calls = []
            statuses = iter([' M example.py', ''])
            sha = 'a' * 40
            def fake_run(args, **kwargs):
                parts = args[1:]
                calls.append(parts)
                if failure and parts[0] == failure:
                    raise RuntimeError('simulated failure')
                if parts == ['rev-parse', '--absolute-git-dir']: return str(root / '.git')
                if parts == ['branch', '--show-current']: return 'main'
                if parts == ['remote', 'get-url', 'origin']: return 'https://github.com/vpcapanema/sad_slt.git'
                if parts == ['status', '--porcelain']: return next(statuses)
                if parts == ['rev-parse', 'HEAD']: return sha
                if parts[0] == 'ls-remote': return sha + '\trefs/heads/main'
                return ''
            try:
                with patch.object(deploy, 'ROOT', root), patch.object(deploy, 'run', fake_run), \
                     patch.object(deploy.sys, 'argv', ['deploy-task.py', '--message', 'test']), \
                     patch.object(deploy.subprocess, 'run', return_value=types.SimpleNamespace(stdout='configured')), \
                     patch.object(deploy, 'check_web') as health, \
                     patch.object(deploy.os, 'startfile', create=True) as browser:
                    if failure == 'health': health.side_effect = RuntimeError('unhealthy')
                    if failure:
                        with self.assertRaises(RuntimeError): deploy.main()
                        browser.assert_not_called()
                    else:
                        deploy.main()
                        health.assert_called_once()
                        browser.assert_called_once_with(deploy.URL + '/public/')
                    if failure in ('commit', 'merge', 'push'):
                        self.assertFalse(any(p[0] == '-ssh' and 'bash -c' in p[-1] for p in calls))
                    if failure in ('commit', 'merge'):
                        self.assertFalse(any(p[0] == 'push' for p in calls))
            finally:
                if deploy.LOG: deploy.LOG.close()
                deploy.LOG = None

    def test_success_opens_browser_last(self): self.workflow()
    def test_commit_failure_stops_publication(self): self.workflow('commit')
    def test_merge_conflict_stops_publication(self): self.workflow('merge')
    def test_push_failure_stops_deploy(self): self.workflow('push')
    def test_health_failure_does_not_open_browser(self): self.workflow('health')

if __name__ == '__main__': unittest.main()
