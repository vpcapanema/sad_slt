"""Opt-in: navegador + API/GDAL/storage reais; banco em transacao revertida."""
from contextlib import contextmanager
from io import BytesIO
import os
from pathlib import Path, PurePosixPath
import socket
import subprocess
import sys
import threading
import time
from uuid import uuid4

import geopandas as gpd
import psycopg
from psycopg.rows import dict_row
import pytest
from shapely.geometry import box
import uvicorn

from api.config import get_settings
from api.db import connection as database
from api.server import app
from api.services import storage_remoto
from api.services.session_service import SessionUser, cookie_name, create_token

pytestmark = pytest.mark.skipif(
    os.getenv("SLT_TEST_STORAGE_E2E") != "1",
    reason="Integração opt-in: navegador e storage reais, catálogo com rollback",
)


def test_interface_processa_exporta_reabre_e_reprocessa(monkeypatch):
    for key in ("SICARD_STORAGE_WRITE_DIR", "SICARD_STORAGE_TEMP_DIR"):
        monkeypatch.delenv(key, raising=False)
    for root in ("temporarios-sicard", "saidas-geoespaciais", "base-geoespacial"):
        storage_remoto.listar(root, estrito=True)
    ident = "auditoria-" + uuid4().hex
    source_folder = "base-geoespacial/" + ident
    output_folder = "saidas-geoespaciais/" + ident
    sent = []
    created_folders = set()
    upload = storage_remoto.enviar_bytes

    def tracked_upload(path, content):
        sent.append(path)
        upload(path, content)

    monkeypatch.setattr(storage_remoto, "enviar_bytes", tracked_upload)
    conn = psycopg.connect(get_settings().slt_database_url, row_factory=dict_row, connect_timeout=5)
    conn.execute("SELECT 1")
    lock = threading.RLock()

    class Transaction:
        def execute(self, *args, **kwargs):
            return conn.execute(*args, **kwargs)

        def cursor(self):
            return conn.cursor()

        def commit(self):
            pass

    @contextmanager
    def connection():
        with lock:
            yield Transaction()

    original = database.get_connection
    for module in tuple(sys.modules.values()):
        if module is not None and str(getattr(module, "__name__", "")).startswith("api."):
            if getattr(module, "get_connection", None) is original:
                monkeypatch.setattr(module, "get_connection", connection)
    server = None
    thread = None
    sock = None
    try:
        for folder in (source_folder, output_folder):
            storage_remoto.criar_pasta(folder)
            created_folders.add(folder)
        source = source_folder + "/entrada.gpkg"
        frame = gpd.GeoDataFrame({"valor": [7, 11]}, geometry=[box(-46, -23, -45.99, -22.99),
                                                          box(-47, -24, -46.99, -23.99)], crs=4326)
        buffer = BytesIO()
        frame.to_file(buffer, driver="GPKG", engine="pyogrio", layer="Poligonos", index=False)
        original_content = buffer.getvalue()
        storage_remoto.enviar_bytes(source, original_content)
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error", lifespan="off"))
        thread = threading.Thread(target=server.run, kwargs={"sockets": [sock]}, daemon=True)
        thread.start()
        deadline = time.monotonic() + 20
        while not server.started and thread.is_alive() and time.monotonic() < deadline:
            time.sleep(.05)
        assert server.started, "Servidor de auditoria não iniciou."
        user = SessionUser(id="00000000-0000-0000-0000-000000000010", email="audit@example.invalid",
                           username="auditoria_gestor", nome="Auditoria com rollback", tipo_usuario="GESTOR")
        env = {**os.environ, "SICARD_E2E_URL": f"http://127.0.0.1:{port}",
               "SICARD_E2E_COOKIE": cookie_name(), "SICARD_E2E_TOKEN": create_token(user),
               "SICARD_E2E_SOURCE": source, "SICARD_E2E_OUTPUT": output_folder}
        result = subprocess.run(["node", str(Path(__file__).parent / "browser" / "bancada-storage-e2e.cjs")],
                                env=env, capture_output=True, text=True, encoding="utf-8", timeout=180)
        assert result.returncode == 0, result.stdout + result.stderr
        print(result.stdout)
        assert storage_remoto.baixar(source) == original_content
        for name in ("Resultado.gpkg", "Reprocessado.geojson"):
            content = storage_remoto.baixar(output_folder + "/" + name)
            loaded = gpd.read_file(BytesIO(content), engine="pyogrio")
            assert loaded.valor.tolist() == [7, 11]
            assert loaded.crs.to_epsg() == 3857
        with lock:
            records = conn.execute(
                "SELECT caminho FROM geoprocessamento.arquivo_exportado WHERE caminho=ANY(%s)",
                ([output_folder + "/Resultado.gpkg", output_folder + "/Reprocessado.geojson"],),
            ).fetchall()
            assert len(records) == 2
            for record in records:
                assert record["caminho"] in sent
    finally:
        if server is not None:
            server.should_exit = True
        if thread is not None:
            thread.join(timeout=20)
            assert not thread.is_alive(), "Servidor de auditoria não encerrou."
        if sock is not None:
            sock.close()
        conn.rollback()
        conn.close()
        for path in set(sent):
            storage_remoto.apagar_arquivo(path)
            parent = PurePosixPath(path).parent
            while len(parent.parts) > 1 and str(parent) != "saidas-geoespaciais/execucoes":
                created_folders.add(str(parent))
                parent = parent.parent
        for folder in sorted(created_folders, key=lambda item: item.count("/"), reverse=True):
            try:
                items = storage_remoto.listar(folder, estrito=True)
            except FileNotFoundError:
                continue
            assert not items, "A pasta exclusiva da auditoria contém arquivos não previstos: " + folder
            storage_remoto.apagar_pasta(folder)
