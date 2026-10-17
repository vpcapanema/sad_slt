"""Opt-in: navegador + API/GDAL/storage reais; banco em transacao revertida."""
from contextlib import contextmanager
from io import BytesIO
import os
import json
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
from shapely.geometry import box, Point, LineString, GeometryCollection
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
        frame.to_file(buffer, driver="GPKG", engine="pyogrio", layer="Poligonos", index=False,
                      geometry_type="Unknown")
        original_content = buffer.getvalue()
        storage_remoto.enviar_bytes(source, original_content)
        symbols = []
        for name, geometries, css, title in [
            ("Linhas", [LineString([(-46, -23), (-45, -22)]),
                        GeometryCollection([LineString([(-47, -24), (-46, -23)]), Point(-47, -24)])],
             "line", "linha"),
            ("Pontos", [Point(-46, -23), Point(-47, -24)], "point", "ponto"),
        ]:
            content = BytesIO()
            gpd.GeoDataFrame(geometry=geometries, crs=4326).to_file(
                content, driver="GPKG", engine="pyogrio", layer=name, index=False, geometry_type="Unknown")
            symbol_source = source_folder + "/" + name + ".gpkg"
            storage_remoto.enviar_bytes(symbol_source, content.getvalue())
            symbols.append({"arquivo": symbol_source, "camada": name, "classe": css, "titulo": title})
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        server = uvicorn.Server(uvicorn.Config(
            app, host="127.0.0.1", port=port, log_level="error", lifespan="off",
            timeout_graceful_shutdown=10,
        ))
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
               "SICARD_E2E_SOURCE": source, "SICARD_E2E_OUTPUT": output_folder,
               "SICARD_E2E_SYMBOLS": json.dumps(symbols)}
        result = subprocess.run(["node", str(Path(__file__).parent / "browser" / "bancada-storage-e2e.cjs")],
                                env=env, capture_output=True, text=True, encoding="utf-8", timeout=240)
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
        assert thread is None or not thread.is_alive(), "Servidor de auditoria não encerrou."


@pytest.mark.parametrize("kind", ["destino", "edicao"])
@pytest.mark.parametrize("stop", ["liberacao", "interrupcao"])
def test_bloqueio_entre_processos_e_recuperacao(monkeypatch, kind, stop):
    from api.services import ciclo_vida_arquivos as ciclo, edicao_storage

    folder = "saidas-geoespaciais/auditoria-lock-" + uuid4().hex
    prefix = "saida-storage:" if kind == "destino" else "edicao-storage:"
    script = """
import sys
import psycopg
from api.config import get_settings
with psycopg.connect(get_settings().slt_database_url, connect_timeout=5) as conn:
    conn.execute("SELECT pg_advisory_lock(hashtextextended(%s,0))",
                 (sys.argv[2] + sys.argv[1].casefold(),))
    print("LOCKED", flush=True)
    sys.stdin.readline()
    conn.execute("SELECT pg_advisory_unlock(hashtextextended(%s,0))",
                 (sys.argv[2] + sys.argv[1].casefold(),))
"""
    process = subprocess.Popen(
        [sys.executable, "-c", script, folder, prefix],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8",
    )
    ready = threading.Event()
    received = []

    def read_ready():
        received.append(process.stdout.readline())
        ready.set()

    reader = threading.Thread(target=read_ready, daemon=True)
    reader.start()
    attempts = []

    def register(*args, **kwargs):
        attempts.append(kwargs["pasta_saida"])
        return {"caminho": folder + "/saida.gpkg"}

    monkeypatch.setattr(ciclo, "_registrar_exportacao", register)

    def attempt():
        if kind == "destino":
            return ciclo.registrar_exportacao(Path("saida.gpkg"), "teste", "vetor", pasta_saida=folder)
        with edicao_storage.bloquear_arquivo(folder):
            return register(pasta_saida=folder)

    try:
        assert ready.wait(15), "Processo de concorrência não respondeu em 15 segundos."
        assert received == ["LOCKED\n"], "Processo não adquiriu o bloqueio de teste."
        with pytest.raises(ValueError, match="Outra saída|Outra edição"):
            attempt()
        assert not attempts, "Não pode enviar arquivos quando outra sessão detém a pasta."
        if stop == "interrupcao":
            process.kill()
            process.communicate(timeout=10)
        else:
            process.communicate("\n", timeout=10)
            assert process.returncode == 0
        assert attempt() == {"caminho": folder + "/saida.gpkg"}
        assert attempts == [folder]
    finally:
        if process.poll() is None:
            process.kill()
            process.communicate(timeout=10)
        reader.join(timeout=5)
