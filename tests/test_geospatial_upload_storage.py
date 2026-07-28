from __future__ import annotations

import io
import zipfile
from pathlib import Path

import pytest

from api.services import geospatial_upload_storage as storage


def _zip(entries: dict[str, bytes]) -> bytes:
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        for name, content in entries.items():
            archive.writestr(name, content)
    return stream.getvalue()


@pytest.fixture
def isolated_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(storage, "project_path", lambda value: tmp_path / Path(value))
    monkeypatch.setattr(
        storage,
        "project_relative",
        lambda value: Path(value).relative_to(tmp_path).as_posix(),
    )
    return tmp_path


def test_zip_shapefile_goes_to_vector(isolated_storage: Path) -> None:
    content = _zip({"municipios.shp": b"shp", "municipios.dbf": b"dbf", "municipios.prj": b"prj"})
    result = storage.store_upload("municipios.zip", content)
    assert result.category == "vetor"
    assert result.archive is True
    # Somente a extração normalizada é preservada; o pacote .zip é descartado.
    assert result.original_path.parent.name == "vetor"
    assert result.original_path.name == "municipios.zip.contents"
    assert result.original_path.is_dir()
    assert not (result.original_path.parent / "municipios.zip").exists()
    assert result.import_path.name == "municipios.shp"
    assert result.import_path.parent == result.original_path


def test_storage_filename_is_normalized_without_rewriting_zip(isolated_storage: Path) -> None:
    content = _zip({"Área de Risco.shp": b"shp", "Área de Risco.dbf": b"dbf"})
    result = storage.store_upload("ÁreasDe Risco - 2026.ZIP", content)
    # O nome da pasta extraída preserva o nome normalizado do pacote de origem,
    # mas o próprio pacote não é mantido em disco.
    assert result.original_path.name == "areas_de_risco_2026.zip.contents"
    assert result.original_path.is_dir()
    assert not (result.original_path.parent / "areas_de_risco_2026.zip").exists()
    assert result.import_path.name == "area_de_risco.shp"


def test_zip_geotiff_goes_to_raster(isolated_storage: Path) -> None:
    result = storage.store_upload("declividade.zip", _zip({"declividade.tif": b"tiff"}))
    assert result.category == "raster"
    assert result.original_path.parent.name == "raster"
    assert result.original_path.name == "declividade.zip.contents"
    assert result.original_path.is_dir()
    assert not (result.original_path.parent / "declividade.zip").exists()
    assert result.import_path.name == "declividade.tif"


def test_file_geodatabase_goes_to_geodatabase(isolated_storage: Path) -> None:
    result = storage.store_upload("cadastro.gdb.zip", _zip({"cadastro.gdb/a00000001.gdbtable": b"data"}))
    assert result.category == "geodatabase"
    assert result.original_path.parent.name == "geodatabase"
    assert result.original_path.name == "cadastro_gdb.zip.contents"
    assert result.original_path.is_dir()
    assert not (result.original_path.parent / "cadastro_gdb.zip").exists()
    assert result.import_path.name == "cadastro.gdb"


def test_geopackage_goes_to_geodatabase_without_modification(isolated_storage: Path) -> None:
    content = b"SQLite format 3\x00original"
    result = storage.store_upload("camadas.gpkg", content)
    assert result.category == "geodatabase"
    assert result.original_path.read_bytes() == content
    assert result.import_path == result.original_path


def test_mixed_archive_is_rejected(isolated_storage: Path) -> None:
    with pytest.raises(ValueError, match="misto"):
        storage.store_upload("misturado.zip", _zip({"camada.shp": b"shp", "imagem.tif": b"tif"}))


def test_archive_path_traversal_is_rejected(isolated_storage: Path) -> None:
    with pytest.raises(ValueError, match="inseguro"):
        storage.store_upload("malicioso.zip", _zip({"../fora.shp": b"shp"}))
