"""Orçamento compartilhado para bytes efetivos, membros e tempo de extração."""
import time
import io
from threading import RLock
from pathlib import PurePosixPath

MAX_MEMBERS = 2000
MAX_SECONDS = 60
UPLOAD_BYTES = 50 * 1024 * 1024


class ArchiveBudget:
    def __init__(self, limit=UPLOAD_BYTES):
        self.limit = limit
        self.total = 0
        self.members = set()
        self.deadline = time.monotonic() + MAX_SECONDS

    def check(self):
        if time.monotonic() > self.deadline:
            raise ValueError("O pacote excedeu o tempo de extração de 60 segundos.")

    def member(self, name, size=0, link=False):
        self.check()
        path = PurePosixPath(str(name).replace("\\", "/"))
        key = str(path).casefold()
        if (not path.parts or path.is_absolute() or ".." in path.parts
                or ":" in str(path) or "\x00" in str(path) or link):
            raise ValueError("O pacote contém caminho ou link não permitido.")
        if key in self.members:
            raise ValueError("O pacote contém nomes de arquivos repetidos.")
        self.members.add(key)
        if len(self.members) > MAX_MEMBERS:
            raise ValueError("O pacote excede 2000 membros.")
        if size < 0 or size > self.limit - self.total:
            raise ValueError("O pacote excede o orçamento de bytes descompactados.")
        return path

    def chunks(self, source):
        while True:
            self.check()
            block = source.read(min(65536, self.limit - self.total + 1))
            self.check()
            if not block:
                return
            self.total += len(block)
            if self.total > self.limit:
                raise ValueError("O pacote excede o orçamento de bytes descompactados.")
            yield block

    def read(self, source):
        return b"".join(self.chunks(source))

    def copy(self, source, target):
        for block in self.chunks(source):
            target.write(block)


def zip_members(archive, budget):
    # Valida todos, inclusive entradas ignoradas pelo leitor de geometrias.
    for info in archive.infolist():
        mode = info.external_attr >> 16
        path = budget.member(info.filename, info.file_size, (mode & 0o170000) == 0o120000)
        yield info, path


def sevenzip_contents(archive, budget):
    """A fábrica aborta durante a escrita, antes de alocar além do orçamento."""
    from py7zr.io import Py7zIO, WriterFactory

    lock = RLock()
    infos = archive.list()
    for info in infos:
        forbidden = bool(getattr(info, "is_symlink", False)) or not (
            info.is_directory or getattr(info, "is_file", True))
        budget.member(info.filename, info.uncompressed or 0, forbidden)

    class Writer(Py7zIO):
        def __init__(self):
            self.buffer = io.BytesIO()

        def write(self, data):
            with lock:
                budget.check()
                if budget.total + len(data) > budget.limit:
                    raise ValueError("O pacote excede o orçamento de bytes descompactados.")
                budget.total += len(data)
                return self.buffer.write(data)

        def read(self, size=None):
            return self.buffer.read(size)

        def seek(self, offset, whence=0):
            position = self.buffer.seek(offset, whence)
            if position > budget.limit:
                raise ValueError("Posição de escrita excede o orçamento do pacote.")
            return position

        def flush(self):
            self.buffer.flush()

        def size(self):
            return self.buffer.getbuffer().nbytes

    class Factory(WriterFactory):
        def __init__(self):
            self.products = {}

        def create(self, filename):
            budget.check()
            normalized = str(PurePosixPath(filename.replace("\\", "/"))).casefold()
            if normalized not in budget.members or filename in self.products:
                raise ValueError("Componente 7z inesperado ou repetido.")
            writer = Writer()
            self.products[filename] = writer
            return writer

    factory = Factory()
    archive.extractall(factory=factory)
    budget.check()
    return {name: writer.buffer.getvalue() for name, writer in factory.products.items()}
