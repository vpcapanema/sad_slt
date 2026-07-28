"""Classificação e armazenamento dos arquivos geoespaciais recebidos por upload."""
from __future__ import annotations

import hashlib
import re
import shutil
import tarfile
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Iterable

from api.path_policy import project_path, project_relative


VECTOR_EXTENSIONS = {
    ".shp", ".geojson", ".json", ".kml", ".gml", ".fgb",
    ".tab", ".mif", ".parquet", ".feather",
}
RASTER_EXTENSIONS = {
    ".tif", ".tiff", ".img", ".asc", ".vrt", ".jp2", ".grd", ".nc",
}
GEODATABASE_EXTENSIONS = {".gpkg", ".sqlite", ".geodatabase"}
ARCHIVE_EXTENSIONS = {".zip", ".rar", ".7z", ".tar", ".tgz", ".gz", ".bz2", ".xz"}
IGNORED_EXTENSIONS = {
    ".dbf", ".shx", ".prj", ".cpg", ".qix", ".sbn", ".sbx", ".xml",
    ".aux", ".ovr", ".tfw", ".tifw", ".wld", ".lock",
}


@dataclass(frozen=True)
class StoredUpload:
    category: str
    original_path: Path
    import_path: Path
    archive: bool
    members: tuple[str, ...]
    sha256: str
    created_original: bool = False
    created_extracted: bool = False

    @property
    def relative_original_path(self) -> str:
        return project_relative(self.original_path)

    @property
    def relative_import_path(self) -> str:
        return project_relative(self.import_path)


@dataclass(frozen=True)
class PreparedUpload:
    name: str
    category: str
    original_path: Path
    import_path: Path
    extracted_path: Path | None
    archive: bool
    members: tuple[str, ...]
    sha256: str


def _safe_name(name: str) -> str:
    safe = Path(name or "camada").name.strip().replace("\x00", "")
    if not safe or safe in {".", ".."}:
        raise ValueError("Nome de arquivo inválido")
    lower = safe.lower()
    compound_extension = next(
        (extension for extension in (".tar.gz", ".tar.bz2", ".tar.xz") if lower.endswith(extension)),
        None,
    )
    extension = compound_extension or Path(safe).suffix.lower()
    stem = safe[:-len(extension)] if extension else safe
    stem = re.sub(r"(?<=[a-zà-öø-ÿ0-9])(?=[A-ZÀ-ÖØ-Þ])", " ", stem)
    stem = re.sub(r"(?<=[A-ZÀ-ÖØ-Þ])(?=[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ])", " ", stem)
    stem = unicodedata.normalize("NFKD", stem)
    stem = "".join(character for character in stem if not unicodedata.combining(character))
    stem = re.sub(r"[^A-Za-z0-9]+", "_", stem).strip("_").lower() or "camada"
    return f"{stem}{extension}"


def _normalize_extracted_tree(root: Path, category: str) -> None:
    """Normaliza cópias extraídas, sem tocar no conteúdo original do pacote."""
    if category == "geodatabase":
        return
    paths = sorted(root.rglob("*"), key=lambda path: len(path.parts), reverse=True)
    for path in paths:
        normalized = _safe_name(path.name)
        destination = path.with_name(normalized)
        if destination == path:
            continue
        if destination.exists():
            raise ValueError(f"A normalização gera nomes duplicados no pacote: {normalized}")
        path.rename(destination)


def _archive_kind(path: Path) -> str | None:
    lower = path.name.lower()
    if lower.endswith(".tar.gz") or lower.endswith(".tar.bz2") or lower.endswith(".tar.xz"):
        return "tar"
    if path.suffix.lower() == ".zip":
        return "zip"
    if path.suffix.lower() in {".tar", ".tgz", ".gz", ".bz2", ".xz"}:
        return "tar"
    if path.suffix.lower() == ".rar":
        return "rar"
    if path.suffix.lower() == ".7z":
        return "7z"
    return None


def _validate_member_name(name: str) -> str:
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    if path.is_absolute() or ".." in path.parts or (path.parts and ":" in path.parts[0]):
        raise ValueError(f"Caminho inseguro dentro do pacote: {name}")
    return normalized


def _archive_members(path: Path, kind: str) -> list[str]:
    if kind == "zip":
        with zipfile.ZipFile(path) as archive:
            return [_validate_member_name(item.filename) for item in archive.infolist() if not item.is_dir()]
    if kind == "tar":
        with tarfile.open(path, "r:*") as archive:
            return [_validate_member_name(item.name) for item in archive.getmembers() if item.isfile()]
    if kind == "rar":
        try:
            import rarfile
        except ImportError as exc:
            raise ValueError("Suporte a RAR indisponível; instale a dependência rarfile") from exc
        with rarfile.RarFile(path) as archive:
            return [_validate_member_name(item.filename) for item in archive.infolist() if not item.isdir()]
    if kind == "7z":
        try:
            import py7zr
        except ImportError as exc:
            raise ValueError("Suporte a 7z indisponível; instale a dependência py7zr") from exc
        with py7zr.SevenZipFile(path, "r") as archive:
            return [_validate_member_name(name) for name in archive.getnames() if not name.endswith("/")]
    raise ValueError("Formato compactado não reconhecido")


def _member_category(name: str) -> str | None:
    normalized = name.replace("\\", "/")
    parts = PurePosixPath(normalized).parts
    if any(part.lower().endswith(".gdb") for part in parts):
        return "geodatabase"
    suffix = Path(normalized).suffix.lower()
    if suffix in GEODATABASE_EXTENSIONS:
        return "geodatabase"
    if suffix in VECTOR_EXTENSIONS:
        return "vetor"
    if suffix in RASTER_EXTENSIONS:
        return "raster"
    return None


def _classify(path: Path, members: Iterable[str] = ()) -> str:
    if members:
        categories = {category for name in members if (category := _member_category(name))}
    else:
        category = _member_category(path.name)
        categories = {category} if category else set()
    if not categories:
        raise ValueError("Nenhum vetor, raster ou geodatabase reconhecido no upload")
    if len(categories) > 1:
        names = ", ".join(sorted(categories))
        raise ValueError(f"Pacote geoespacial misto ({names}); envie cada categoria separadamente")
    return categories.pop()


def _extract(path: Path, destination: Path, kind: str) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    if kind == "zip":
        with zipfile.ZipFile(path) as archive:
            for item in archive.infolist():
                name = _validate_member_name(item.filename)
                if item.is_dir():
                    continue
                target = destination.joinpath(*PurePosixPath(name).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(item) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
        return
    if kind == "tar":
        with tarfile.open(path, "r:*") as archive:
            for item in archive.getmembers():
                if not item.isfile():
                    continue
                name = _validate_member_name(item.name)
                source = archive.extractfile(item)
                if source is None:
                    continue
                target = destination.joinpath(*PurePosixPath(name).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                with source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
        return
    if kind == "rar":
        import rarfile
        with rarfile.RarFile(path) as archive:
            for item in archive.infolist():
                if item.isdir():
                    continue
                name = _validate_member_name(item.filename)
                target = destination.joinpath(*PurePosixPath(name).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(item) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
        return
    if kind == "7z":
        import py7zr
        with py7zr.SevenZipFile(path, "r") as archive:
            archive.extractall(destination)
        return


def _primary_dataset(root: Path, category: str) -> Path:
    if category == "geodatabase":
        gdb_directories = sorted(path for path in root.rglob("*") if path.is_dir() and path.suffix.lower() == ".gdb")
        if gdb_directories:
            return gdb_directories[0]
        candidates = sorted(path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in GEODATABASE_EXTENSIONS)
    elif category == "raster":
        candidates = sorted(path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in RASTER_EXTENSIONS)
    else:
        candidates = sorted(path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in VECTOR_EXTENSIONS)
    if not candidates:
        raise ValueError(f"Conteúdo {category} não foi localizado depois da extração")
    return candidates[0]


def prepare_upload(filename: str, content: bytes) -> PreparedUpload:
    """Analisa e extrai em staging, sem publicar o arquivo no datastorage."""
    name = _safe_name(filename)
    digest = hashlib.sha256(content).hexdigest()
    staging_key = digest[:16]
    staging = project_path("data/geoespacial/uploads/datastorage/.staging")
    staging.mkdir(parents=True, exist_ok=True)
    temporary = staging / f"{digest}.part"
    temporary.write_bytes(content)
    probe = staging / f"{staging_key}_{name}"
    temporary.replace(probe)
    try:
        archive_kind = _archive_kind(probe)
        members = tuple(_archive_members(probe, archive_kind)) if archive_kind else ()
        category = _classify(probe, members)
        import_path = probe
        extracted = None
        if archive_kind:
            extracted = staging / f"{staging_key}.contents"
            if extracted.exists():
                shutil.rmtree(extracted)
            _extract(probe, extracted, archive_kind)
            _normalize_extracted_tree(extracted, category)
            import_path = _primary_dataset(extracted, category)
        else:
            import_path = probe
        return PreparedUpload(
            name, category, probe, import_path, extracted,
            bool(archive_kind), members, digest,
        )
    except Exception:
        probe.unlink(missing_ok=True)
        extracted_candidate = staging / f"{staging_key}.contents"
        if extracted_candidate.exists():
            shutil.rmtree(extracted_candidate)
        raise


def discard_prepared(prepared: PreparedUpload) -> None:
    prepared.original_path.unlink(missing_ok=True)
    if prepared.extracted_path and prepared.extracted_path.exists():
        shutil.rmtree(prepared.extracted_path)


def commit_prepared(prepared: PreparedUpload) -> StoredUpload:
    """Move um upload previamente validado do staging para o destino definitivo.

    Para pacotes compactados, apenas a extração normalizada é persistida em
    ``<categoria>/<nome>.contents/``; o binário compactado é descartado após a
    extração para não duplicar o mesmo conteúdo no datastorage.
    """
    folder = project_path(f"data/geoespacial/uploads/datastorage/{prepared.category}")
    folder.mkdir(parents=True, exist_ok=True)

    if prepared.archive and prepared.extracted_path is not None:
        extracted_destination = folder / f"{prepared.name}.contents"
        if extracted_destination.exists():
            # Colisão de nome sem colisão de hash (o dedup por sha256 ocorre a
            # montante). Preserva a versão anterior anexando o hash curto.
            stem = Path(prepared.name).stem
            suffix = Path(prepared.name).suffix
            extracted_destination = folder / (
                f"{stem}_{prepared.sha256[:12]}{suffix}.contents"
            )
        prepared.extracted_path.replace(extracted_destination)
        # O binário compactado do staging vai embora — a extração é o dado físico.
        prepared.original_path.unlink(missing_ok=True)
        relative_import = prepared.import_path.relative_to(prepared.extracted_path)
        import_path = extracted_destination / relative_import
        return StoredUpload(
            prepared.category, extracted_destination, import_path, True,
            prepared.members, prepared.sha256,
            created_original=False, created_extracted=True,
        )

    # Arquivo solto (não-compactado): mantém a lógica original.
    destination = folder / prepared.name
    if destination.exists() and _file_sha256(destination) != prepared.sha256:
        destination = folder / f"{destination.stem}_{prepared.sha256[:12]}{destination.suffix}"
    created_original = not destination.exists()
    if created_original:
        prepared.original_path.replace(destination)
    else:
        prepared.original_path.unlink(missing_ok=True)
    return StoredUpload(
        prepared.category, destination, destination, False,
        prepared.members, prepared.sha256,
        created_original=created_original, created_extracted=False,
    )


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def remove_stored(stored: StoredUpload) -> None:
    """Compensação de filesystem usada quando a transação de importação falha."""
    if stored.archive:
        # Para pacotes, `original_path` aponta para a pasta extraída (.contents/).
        if stored.created_extracted and stored.original_path.exists():
            shutil.rmtree(stored.original_path)
        return
    if stored.created_original:
        stored.original_path.unlink(missing_ok=True)


def store_upload(filename: str, content: bytes) -> StoredUpload:
    """Compatibilidade: prepara e confirma sem validação temática adicional."""
    prepared = prepare_upload(filename, content)
    try:
        return commit_prepared(prepared)
    except Exception:
        discard_prepared(prepared)
        raise
