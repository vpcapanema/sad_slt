"""Leitura por demanda da API existente do SFTPGo, sem cache em disco.

O adaptador FUSE preserva os caminhos usados por GDAL, GeoPandas e Shapefiles.
Somente arquivos abertos para gravacao usam uma area temporaria protegida.
"""
from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from pathlib import Path, PurePosixPath
import errno
import os
import stat
import tempfile
import time

from api.services import storage_remoto as remote

BLOCK = 512 * 1024


class StorageHTTP:
    def __init__(self, root=""):
        self.root = self.normalizar(root)
        self.client = remote._cliente()
        self.client.timeout = remote.httpx.Timeout(30.0, connect=10.0)
        self.dirs = {}

    @staticmethod
    def normalizar(path):
        value = PurePosixPath("/" + str(path).lstrip("/"))
        if ".." in value.parts or "\\" in str(path):
            raise ValueError("Caminho invalido")
        return str(value)

    def path(self, path):
        return self.root.rstrip("/") + self.normalizar(path)

    def listar(self, path):
        path = self.normalizar(path)
        cached = self.dirs.get(path)
        if cached and time.monotonic() - cached[0] < 5:
            return cached[1]
        r = remote._pedir(self.client, "GET", "/user/dirs", params={"path": self.path(path)})
        if r.status_code == 404:
            raise FileNotFoundError(path)
        r.raise_for_status()
        entries = {v['name']: v for v in r.json() if v['name'] not in ('.', '..')}
        self.dirs[path] = (time.monotonic(), entries)
        return entries

    def info(self, path):
        path = self.normalizar(path)
        if path == '/':
            return {'mode': 1 << 31, 'size': 0, 'last_modified': '2026-01-01T00:00:00Z'}
        p = PurePosixPath(path)
        try:
            return self.listar(str(p.parent))[p.name]
        except KeyError as exc:
            raise FileNotFoundError(path) from exc

    @lru_cache(maxsize=64)
    def block(self, path, start, size, version):
        end = min(start + BLOCK, size) - 1
        if end < start:
            return b''
        for attempt in range(2):
            token = remote._obter_token(self.client, renovar=bool(attempt))
            with self.client.stream('GET', '/user/files', params={'path': self.path(path)},
                headers={'Authorization': 'Bearer '+token, 'Range': f'bytes={start}-{end}',
                         'Accept-Encoding': 'identity'}) as r:
                if r.status_code == 401 and not attempt:
                    continue
                r.raise_for_status()
                expected = f'bytes {start}-{end}/{size}'
                if r.status_code != 206 or r.headers.get('Content-Range') != expected:
                    raise OSError('Storage nao respeitou leitura parcial; download integral recusado')
                result = bytearray()
                for chunk in r.iter_bytes(chunk_size=65536):
                    result.extend(chunk)
                    if len(result) > end-start+1:
                        raise OSError('Resposta excede o trecho solicitado')
                if len(result) != end-start+1:
                    raise OSError('Leitura parcial incompleta')
                return bytes(result)
        raise OSError('Autenticacao recusada')

    def read(self, path, offset, length):
        meta = self.info(path)
        size = meta['size']
        end = min(offset+length, size)
        result = bytearray()
        while offset < end:
            start = offset // BLOCK * BLOCK
            block = self.block(path, start, size, meta['last_modified'])
            part = block[offset-start:min(end-start, len(block))]
            if not part:
                raise OSError('Leitura remota sem progresso')
            result.extend(part)
            offset += len(part)
        return bytes(result)

    def invalidate(self):
        self.dirs.clear()
        self.block.cache_clear()


def mount(root, target, writable=False, foreground=False):
    from fuse import FUSE, FuseOSError, Operations

    class Filesystem(Operations):
        def __init__(self):
            self.api = StorageHTTP(root)
            self.handles = {}
            self.next_handle = 0

        def __call__(self, op, *args):
            try:
                return super().__call__(op, *args)
            except FileNotFoundError:
                raise FuseOSError(errno.ENOENT)
            except PermissionError:
                raise FuseOSError(errno.EACCES)
            except FuseOSError:
                raise
            except Exception:
                # Nunca registrar URLs autenticadas, tokens ou corpos de erro.
                raise FuseOSError(errno.EIO)

        def getattr(self, path, fh=None):
            if fh is None:
                fh = next((key for key, value in self.handles.items()
                           if value['path'] == path and value['file']), None)
            if fh in self.handles and self.handles[fh]['file']:
                s = os.fstat(self.handles[fh]['file'].fileno())
                return dict(st_mode=stat.S_IFREG | 0o600, st_size=s.st_size,
                            st_mtime=s.st_mtime, st_ctime=s.st_ctime, st_atime=s.st_atime,
                            st_uid=os.getuid(), st_gid=os.getgid(), st_nlink=1)
            meta = self.api.info(path)
            is_dir = bool(meta['mode'] & (1 << 31))
            modified = datetime.fromisoformat(meta['last_modified'].replace('Z', '+00:00')).timestamp()
            return dict(st_mode=(stat.S_IFDIR | 0o700) if is_dir else (stat.S_IFREG | (0o600 if writable else 0o400)),
                st_nlink=2 if is_dir else 1, st_size=meta.get('size', 0), st_mtime=modified,
                st_ctime=modified, st_atime=modified, st_uid=os.getuid(), st_gid=os.getgid())

        def readdir(self, path, fh):
            names = set(self.api.listar(path))
            names.update(PurePosixPath(v['path']).name for v in self.handles.values()
                         if str(PurePosixPath(v['path']).parent) == path)
            return ['.', '..', *sorted(names)]

        def open(self, path, flags):
            write = bool(flags & (os.O_WRONLY | os.O_RDWR))
            if write and not writable:
                raise FuseOSError(errno.EROFS)
            if not (flags & os.O_CREAT):
                self.api.info(path)
            self.next_handle += 1
            handle = {'file': None, 'path': path, 'dirty': False, 'failed': False}
            if write:
                cache = Path.home()/'.cache/sicard-write'
                cache.mkdir(parents=True, exist_ok=True, mode=0o700)
                f = tempfile.NamedTemporaryFile(prefix='pending-', dir=cache, delete=False)
                handle['file'] = f
                if not flags & os.O_TRUNC:
                    try:
                        size = self.api.info(path)['size']
                    except FileNotFoundError:
                        size = 0
                    for offset in range(0, size, BLOCK):
                        f.write(self.api.read(path, offset, BLOCK))
                handle['dirty'] = bool(flags & (os.O_CREAT | os.O_TRUNC))
            self.handles[self.next_handle] = handle
            return self.next_handle

        def create(self, path, mode, fi=None):
            return self.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC)

        def read(self, path, size, offset, fh):
            handle = self.handles[fh]
            if handle['file']:
                handle['file'].seek(offset)
                return handle['file'].read(size)
            return self.api.read(path, offset, size)

        def write(self, path, data, offset, fh):
            handle = self.handles[fh]
            if not handle['file']:
                raise FuseOSError(errno.EROFS)
            handle['file'].seek(offset)
            handle['dirty'] = True
            return handle['file'].write(data)

        def flush(self, path, fh):
            handle = self.handles[fh]
            if handle['file'] and handle['dirty']:
                handle['file'].flush()
                try:
                    remote.enviar(self.api.path(path), Path(handle['file'].name))
                except Exception:
                    handle['failed'] = True
                    raise
                handle.update(dirty=False, failed=False)
                self.api.invalidate()
            return 0

        def fsync(self, path, datasync, fh):
            return self.flush(path, fh)

        def release(self, path, fh):
            handle = self.handles[fh]
            try:
                self.flush(path, fh)
            finally:
                if handle['file']:
                    name = handle['file'].name
                    handle['file'].close()
                    if not handle['dirty'] and not handle['failed']:
                        Path(name).unlink()
                self.handles.pop(fh)
            return 0

        def truncate(self, path, length, fh=None):
            own = fh is None
            if own:
                fh = self.open(path, os.O_RDWR)
            self.handles[fh]['file'].truncate(length)
            self.handles[fh]['dirty'] = True
            if own:
                self.release(path, fh)

        def change(self, method, endpoint, **params):
            if not writable:
                raise FuseOSError(errno.EROFS)
            r = remote._pedir(self.api.client, method, endpoint, params=params)
            r.raise_for_status()
            self.api.invalidate()
            return 0

        def mkdir(self, path, mode):
            return self.change('POST', '/user/dirs', path=self.api.path(path))

        def unlink(self, path):
            return self.change('DELETE', '/user/files', path=self.api.path(path))

        def rmdir(self, path):
            if self.api.listar(path):
                raise FuseOSError(errno.ENOTEMPTY)
            return self.change('DELETE', '/user/dirs', path=self.api.path(path))

        def rename(self, old, new):
            return self.change('POST', '/user/file-actions/move', path=self.api.path(old), target=self.api.path(new))

        def chmod(self, path, mode):
            return 0

        def utimens(self, path, times=None):
            return 0

        def statfs(self, path):
            s = os.statvfs(Path.home())
            return {k: getattr(s,k) for k in ('f_bsize','f_frsize','f_blocks','f_bfree','f_bavail','f_files','f_ffree','f_favail','f_flag','f_namemax')}

    FUSE(Filesystem(), str(target), foreground=foreground, nothreads=True,
         ro=not writable, fsname='sicard-api', attr_timeout=1, entry_timeout=1)
