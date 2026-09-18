"""Upload de arquivo local para o storage do SICARD pela API do SFTPGo."""
from __future__ import annotations

import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import geopandas as gpd
import httpx
from shapely.geometry import Point

from api.services import storage_remoto, upload_storage
from api.services.importar_camadas_service import inspecionar_camadas


def _geojson() -> bytes:
    frame = gpd.GeoDataFrame({"nome": ["a", "b"]}, geometry=[Point(-47.0, -23.0), Point(-47.1, -23.1)],
                             crs="EPSG:4674")
    return frame.to_json().encode("utf-8")


class StorageFalso:
    """Faz o papel do SFTPGo: guarda o que chegou e o que já existia na pasta."""

    def __init__(self, existentes=()):
        self.existentes = set(existentes)
        self.enviados: dict[str, bytes] = {}

    def listar(self, pasta):
        return [{"nome": nome, "pasta": False} for nome in self.existentes]

    def enviar(self, destino, origem):
        self.enviados[destino] = Path(origem).read_bytes()


class UploadStorageTest(unittest.TestCase):
    def setUp(self):
        self.storage = StorageFalso()
        self.espelho = tempfile.TemporaryDirectory()
        self.addCleanup(self.espelho.cleanup)
        for alvo, valor in (("configurado", lambda: True), ("listar", self.storage.listar),
                            ("enviar", self.storage.enviar)):
            patcher = patch.object(storage_remoto, alvo, valor)
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = patch.object(upload_storage, "diretorio_storage", lambda: Path(self.espelho.name))
        patcher.start()
        self.addCleanup(patcher.stop)

    def _inspecionar(self, nome, conteudo):
        return inspecionar_camadas(nome, conteudo)["token_importacao"]

    def test_arquivo_vai_para_a_pasta_escolhida_com_o_nome_original(self):
        token = self._inspecionar("pontos_teste.geojson", _geojson())
        resultado = upload_storage.enviar_ao_storage(token, "superficies-indices")
        self.assertEqual(list(self.storage.enviados), ["superficies-indices/pontos_teste.geojson"])
        self.assertEqual(self.storage.enviados["superficies-indices/pontos_teste.geojson"], _geojson())
        self.assertEqual(resultado["pasta"], "superficies-indices")
        camada = resultado["camadas"][0]
        # A camada de um GeoJSON leva o nome do arquivo gravado, não o do staging.
        self.assertEqual(camada["id"], "storage:superficies-indices/pontos_teste.geojson::pontos_teste")
        self.assertEqual(camada["nome"], "pontos_teste")
        # Servidor local: a cópia do storage recebe o mesmo arquivo.
        self.assertTrue((Path(self.espelho.name) / "superficies-indices" / "pontos_teste.geojson").is_file())

    def test_pasta_fora_do_storage_e_recusada(self):
        for pasta in ("", None, "base-geodatabase", "../base-geoespacial", "outra"):
            with self.assertRaises(ValueError):
                upload_storage.pasta_destino(pasta)
        self.assertEqual(upload_storage.pasta_destino("base-geoespacial"), "base-geoespacial")

    def test_nao_sobrescreve_arquivo_existente(self):
        self.storage.existentes.add("pontos_teste.geojson")
        token = self._inspecionar("pontos_teste.geojson", _geojson())
        with self.assertRaises(FileExistsError):
            upload_storage.enviar_ao_storage(token, "base-geoespacial")
        self.assertEqual(self.storage.enviados, {})

    def test_pacote_zip_sobe_extraido(self):
        pacote = io.BytesIO()
        with zipfile.ZipFile(pacote, "w") as zf:
            zf.writestr("limites.geojson", _geojson())
        token = self._inspecionar("limites.zip", pacote.getvalue())
        resultado = upload_storage.enviar_ao_storage(token, "base-geoespacial")
        self.assertTrue(all(nome.startswith("base-geoespacial/") for nome in self.storage.enviados))
        self.assertFalse(any(nome.endswith(".zip") for nome in self.storage.enviados))
        self.assertEqual(len(resultado["camadas"]), 1)

    def test_reprojecao_sobe_geopackage_no_crs_pedido(self):
        token = self._inspecionar("pontos_teste.geojson", _geojson())
        upload_storage.enviar_ao_storage(token, "base-geoespacial", target_crs="EPSG:31983")
        self.assertEqual(list(self.storage.enviados), ["base-geoespacial/pontos_teste.gpkg"])
        with tempfile.TemporaryDirectory() as pasta:
            arquivo = Path(pasta) / "saida.gpkg"
            arquivo.write_bytes(self.storage.enviados["base-geoespacial/pontos_teste.gpkg"])
            self.assertEqual(gpd.read_file(arquivo).crs.to_epsg(), 31983)

    def test_sem_configuracao_nao_consome_a_inspecao(self):
        token = self._inspecionar("pontos_teste.geojson", _geojson())
        with patch.object(storage_remoto, "configurado", lambda: False):
            with self.assertRaises(storage_remoto.StorageIndisponivel):
                upload_storage.enviar_ao_storage(token, "base-geoespacial")
        # A inspeção continua valendo: o usuário corrige a configuração e envia.
        upload_storage.enviar_ao_storage(token, "base-geoespacial")
        self.assertEqual(len(self.storage.enviados), 1)


class StorageRemotoTest(unittest.TestCase):
    def setUp(self):
        self.pedidos: list[httpx.Request] = []
        storage_remoto._token.update(valor=None, expira=0.0, chave=None)
        ambiente = {"SICARD_STORAGE_API_URL": "https://vm.teste/sicard/storage-api",
                    "SICARD_STORAGE_API_USER": "sicard_app", "SICARD_STORAGE_API_PASSWORD": "segredo"}
        patcher = patch.dict("os.environ", ambiente)
        patcher.start()
        self.addCleanup(patcher.stop)

    def _cliente(self, responder):
        def tratar(pedido):
            self.pedidos.append(pedido)
            return responder(pedido)
        transporte = httpx.MockTransport(tratar)
        return lambda: httpx.Client(base_url="https://vm.teste/sicard/storage-api", transport=transporte)

    def test_envio_autentica_e_grava_no_caminho_absoluto(self):
        def responder(pedido):
            if pedido.url.path.endswith("/user/token"):
                self.assertTrue(pedido.headers["authorization"].startswith("Basic "))
                return httpx.Response(200, json={"access_token": "tk"})
            self.assertEqual(pedido.headers["authorization"], "Bearer tk")
            return httpx.Response(201, json={"message": "ok"})
        with tempfile.TemporaryDirectory() as pasta, patch.object(storage_remoto, "_cliente", self._cliente(responder)):
            origem = Path(pasta) / "a.geojson"
            origem.write_bytes(b"{}")
            storage_remoto.enviar("base-geoespacial/a.geojson", origem)
        envio = self.pedidos[-1]
        self.assertEqual(envio.url.path, "/sicard/storage-api/user/files/upload")
        self.assertEqual(envio.url.params["path"], "/base-geoespacial/a.geojson")
        self.assertEqual(envio.url.params["mkdir_parents"], "true")

    def test_senha_recusada_vira_erro_claro(self):
        with patch.object(storage_remoto, "_cliente", self._cliente(lambda _p: httpx.Response(401, json={}))):
            with self.assertRaisesRegex(storage_remoto.StorageIndisponivel, "recusou o usuário"):
                storage_remoto.listar("base-geoespacial")

    def test_listar_distingue_pasta_de_arquivo_e_pasta_ausente(self):
        def responder(pedido):
            if pedido.url.path.endswith("/user/token"):
                return httpx.Response(200, json={"access_token": "tk"})
            if pedido.url.params["path"] == "/ausente":
                return httpx.Response(404, json={"message": "not found"})
            return httpx.Response(200, content=json.dumps([
                {"name": "sub", "mode": 2147484141}, {"name": "a.gpkg", "mode": 420, "size": 3}]))
        with patch.object(storage_remoto, "_cliente", self._cliente(responder)):
            self.assertEqual(storage_remoto.listar("base-geoespacial"),
                             [{"nome": "sub", "pasta": True}, {"nome": "a.gpkg", "pasta": False}])
            self.assertEqual(storage_remoto.listar("ausente"), [])


if __name__ == "__main__":
    unittest.main()
