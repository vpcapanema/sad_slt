"""Regressões sem criar arquivos de dados no disco local."""
from pathlib import Path
from unittest.mock import Mock

import pytest

from api import storage_policy as policy
from api.path_policy import project_path, project_relative, PROJECT_ROOT
from api.services import storage_remoto, saidas_storage


@pytest.fixture
def storage(monkeypatch):
    root = Path(Path.cwd().anchor) / 'storage'
    monkeypatch.setenv('SICARD_STORAGE_WRITE_DIR', str(root))
    monkeypatch.setenv('SICARD_STORAGE_TEMP_DIR', str(root / 'temporarios-sicard'))
    monkeypatch.setattr(policy, 'montagem', lambda path: path == root)
    monkeypatch.setattr(Path, 'is_dir', lambda path: True)
    return root.resolve()


def test_sem_configuracao_nao_usa_temp_local(monkeypatch):
    monkeypatch.delenv('SICARD_STORAGE_TEMP_DIR', raising=False)
    create = Mock()
    monkeypatch.setattr(policy._tempfile, 'mkdtemp', create)
    with pytest.raises(RuntimeError, match='locais'):
        policy.mkdtemp()
    create.assert_not_called()


def test_pasta_local_nao_e_montagem(storage, monkeypatch):
    monkeypatch.setattr(policy, 'montagem', lambda path: False)
    with pytest.raises(RuntimeError, match='montagem'):
        policy.raiz_temporaria()


def test_temporario_fora_da_raiz_recusado(storage, monkeypatch):
    monkeypatch.setenv('SICARD_STORAGE_TEMP_DIR', str(storage.parent / 'outro'))
    with pytest.raises(RuntimeError):
        policy.raiz_temporaria()


@pytest.mark.parametrize('name', ['TemporaryDirectory', 'NamedTemporaryFile', 'mkdtemp', 'mkstemp'])
def test_wrappers_usam_storage(storage, monkeypatch, name):
    create = Mock()
    monkeypatch.setattr(policy._tempfile, name, create)
    getattr(policy, name)(prefix='teste-')
    create.assert_called_once_with(prefix='teste-', dir=storage / 'temporarios-sicard')


def test_dir_explicito_nao_permite_fallback(storage):
    with pytest.raises(RuntimeError, match='permanecer'):
        policy.TemporaryDirectory(dir=PROJECT_ROOT)


def test_temporarios_nativos_e_multipart(storage, monkeypatch):
    monkeypatch.setattr(policy._tempfile, 'tempdir', None)
    for name in ('TMPDIR', 'TMP', 'TEMP', 'CPL_TMPDIR', 'SQLITE_TMPDIR'):
        monkeypatch.setenv(name, 'anterior')
    policy.configurar_temporarios()
    import os
    assert all(os.environ[name] == str(storage / 'temporarios-sicard')
               for name in ('TMPDIR', 'TMP', 'TEMP', 'CPL_TMPDIR', 'SQLITE_TMPDIR'))
    assert policy._tempfile.tempdir == str(storage / 'temporarios-sicard')


@pytest.mark.parametrize('logical', ['tmp/uploads/a.gpkg', 'data/geoespacial/outputs/a.tif'])
def test_caminhos_de_dados_e_retorno(storage, logical):
    physical = project_path(logical)
    assert physical.is_relative_to(storage)
    assert project_relative(physical) == logical


def test_codigo_permanece_somente_leitura_no_projeto(storage):
    assert project_path('assets/teste.js') == PROJECT_ROOT / 'assets/teste.js'


def test_envio_bytes_nao_materializa_arquivo(monkeypatch):
    upload = Mock()
    monkeypatch.setattr(storage_remoto, 'enviar_bytes', upload)
    monkeypatch.setattr(storage_remoto, 'baixar', lambda path: b'conteudo')
    monkeypatch.setattr(saidas_storage, 'destino', lambda *args: 'saidas-geoespaciais/execucoes/00000000-0000-0000-0000-000000000001/relatorios/a.json')
    result = saidas_storage.enviar_bytes('execucao', 'relatorios', 'a.json', b'conteudo')
    upload.assert_called_once_with(result['caminho'], b'conteudo')
    assert result['tamanho_bytes'] == 8


def test_envio_corrompido_e_recusado(monkeypatch):
    monkeypatch.setattr(storage_remoto, 'enviar_bytes', Mock())
    monkeypatch.setattr(storage_remoto, 'baixar', lambda path: b'errado')
    remove = Mock()
    monkeypatch.setattr(storage_remoto, 'apagar_arquivo', remove)
    monkeypatch.setattr(saidas_storage, 'destino', lambda *args: 'saidas-geoespaciais/execucoes/00000000-0000-0000-0000-000000000001/relatorios/a.json')
    with pytest.raises(ValueError, match='hash'):
        saidas_storage.enviar_bytes('execucao', 'relatorios', 'a.json', b'conteudo')
    remove.assert_called_once()


def test_fuse_grava_em_memoria_e_publica_no_flush(monkeypatch):
    import sys
    from types import SimpleNamespace
    from api.services import storage_httpfs

    captured = []
    monkeypatch.setitem(sys.modules, 'fuse', SimpleNamespace(
        FUSE=lambda filesystem, *args, **kwargs: captured.append(filesystem),
        FuseOSError=OSError, Operations=object))
    api = Mock()
    api.path.side_effect = lambda path: path
    monkeypatch.setattr(storage_httpfs, 'StorageHTTP', lambda root: api)
    upload = Mock()
    monkeypatch.setattr(storage_remoto, 'enviar_bytes', upload)
    storage_httpfs.mount('temporarios-sicard', '/montagem', writable=True)
    fs = captured[0]
    handle = fs.create('/a.gpkg', 0o600)
    fs.write('/a.gpkg', b'abc', 0, handle)
    fs.truncate('/a.gpkg', 5, handle)
    assert fs.read('/a.gpkg', 5, 0, handle) == b'abc\0\0'
    fs.flush('/a.gpkg', handle)
    upload.assert_called_once_with('/a.gpkg', b'abc\0\0')
    fs.release('/a.gpkg', handle)
    assert not fs.handles


def test_storage_montado_dentro_do_projeto_mantem_caminho_logico(monkeypatch):
    root = PROJECT_ROOT.resolve() / 'storage-escrita'
    monkeypatch.setattr(policy, 'raiz_escrita', lambda: root)
    monkeypatch.setattr(policy, 'raiz_temporaria', lambda: root / 'temporarios-sicard')
    assert project_relative(root / 'aplicacao/data/a.tif') == 'data/a.tif'
    assert project_relative(root / 'temporarios-sicard/a.gpkg') == 'tmp/a.gpkg'
