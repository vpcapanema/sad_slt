"""Diretórios de trabalho exclusivamente em uma montagem do storage."""
from __future__ import annotations

import os
import logging
from pathlib import Path
import tempfile as _tempfile


def montagem(caminho: Path) -> bool:
    """Uma pasta existente ou um espelho local não comprova uma montagem."""
    if not caminho.is_dir():
        return False
    if os.path.ismount(caminho):
        return True
    # Subpastas do acervo também são storage; nunca aceitar um diretório
    # apenas por existir. A raiz configurada precisa ser uma montagem real.
    configured = os.environ.get('SICARD_STORAGE_WRITE_DIR')
    if not configured:
        return False
    root = Path(configured)
    return (root.is_absolute() and os.path.ismount(root)
            and caminho.resolve().is_relative_to(root.resolve()))


def raiz_temporaria() -> Path:
    configured = os.environ.get('SICARD_STORAGE_TEMP_DIR')
    if not configured:
        raise RuntimeError('Configure SICARD_STORAGE_TEMP_DIR com a montagem da pasta temporária do storage. Temporários locais são proibidos.')
    root = Path(configured)
    mount = raiz_escrita()
    if not root.is_absolute() or not root.resolve().is_relative_to(mount) or root.resolve() == mount or not root.is_dir():
        raise RuntimeError('SICARD_STORAGE_TEMP_DIR deve ser uma montagem existente do storage, não uma pasta local.')
    return root.resolve()


def raiz_escrita() -> Path:
    configured = os.environ.get('SICARD_STORAGE_WRITE_DIR', '')
    root = Path(configured)
    if not configured or not root.is_absolute() or not montagem(root):
        raise RuntimeError('SICARD_STORAGE_WRITE_DIR deve apontar para uma montagem existente do storage.')
    return root.resolve()


def configurar_temporarios() -> None:
    if not os.environ.get('SICARD_STORAGE_WRITE_DIR') and not os.environ.get('SICARD_STORAGE_TEMP_DIR'):
        logging.getLogger(__name__).info(
            'Sem montagem de escrita: acesso ao storage pela API. '
            'Operações que exigem temporários em arquivo devem executar na VM.'
        )
        return
    root = str(raiz_temporaria())
    # Inclui bibliotecas nativas e o spool de uploads multipart do Starlette.
    for name in ('TMPDIR', 'TMP', 'TEMP', 'CPL_TMPDIR', 'SQLITE_TMPDIR'):
        os.environ[name] = root
    _tempfile.tempdir = root


def _diretorio(kwargs):
    root = raiz_temporaria()
    directory = Path(kwargs.get('dir') or root).resolve()
    if not directory.is_relative_to(root):
        raise RuntimeError('Temporários devem permanecer na pasta temporária do storage.')
    kwargs['dir'] = directory
    return kwargs


def TemporaryDirectory(**kwargs):
    return _tempfile.TemporaryDirectory(**_diretorio(kwargs))


def NamedTemporaryFile(*args, **kwargs):
    return _tempfile.NamedTemporaryFile(*args, **_diretorio(kwargs))


def mkdtemp(**kwargs):
    return _tempfile.mkdtemp(**_diretorio(kwargs))


def mkstemp(**kwargs):
    return _tempfile.mkstemp(**_diretorio(kwargs))
