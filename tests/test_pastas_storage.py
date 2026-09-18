"""Pastas do storage no explorador do upload: listar, criar, renomear, excluir."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from api.services import pastas_storage, storage_remoto, upload_storage


class StorageEmMemoria:
    """Árvore de pastas e arquivos no lugar do SFTPGo."""

    def __init__(self):
        self.pastas = {"base-geoespacial", "base-geoespacial/vetor", "base-geoespacial/vazia",
                       "superficies-indices"}
        self.arquivos = {"base-geoespacial/vetor/a.gpkg"}
        self.apagadas: list[str] = []

    def listar(self, pasta):
        filhos = []
        for p in sorted(self.pastas):
            if p.rsplit("/", 1)[0] == pasta and "/" in p:
                filhos.append({"nome": p.rsplit("/", 1)[1], "pasta": True})
        for a in sorted(self.arquivos):
            if a.rsplit("/", 1)[0] == pasta:
                filhos.append({"nome": a.rsplit("/", 1)[1], "pasta": False})
        return filhos

    def criar_pasta(self, caminho):
        self.pastas.add(caminho)

    def mover(self, origem, destino):
        self.pastas.remove(origem)
        self.pastas.add(destino)

    def apagar_pasta(self, caminho):
        self.apagadas.append(caminho)
        self.pastas.remove(caminho)


class PastasStorageTest(unittest.TestCase):
    def setUp(self):
        self.storage = StorageEmMemoria()
        for nome in ("listar", "criar_pasta", "mover", "apagar_pasta"):
            patcher = patch.object(storage_remoto, nome, getattr(self.storage, nome))
            patcher.start()
            self.addCleanup(patcher.stop)
        self.espelho = tempfile.TemporaryDirectory()
        self.addCleanup(self.espelho.cleanup)
        patcher = patch.object(pastas_storage, "diretorio_storage", lambda: Path(self.espelho.name))
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_raiz_mostra_so_as_pastas_publicadas(self):
        dados = pastas_storage.listar("")
        self.assertEqual([p["caminho"] for p in dados["pastas"]], ["base-geoespacial", "superficies-indices"])
        self.assertTrue(all(p["raiz"] for p in dados["pastas"]))

    def test_lista_subpastas_e_arquivos(self):
        dados = pastas_storage.listar("base-geoespacial/vetor")
        self.assertEqual(dados["pastas"], [])
        self.assertEqual(dados["arquivos"], ["a.gpkg"])
        self.assertEqual([p["nome"] for p in pastas_storage.listar("base-geoespacial")["pastas"]], ["vazia", "vetor"])

    def test_fora_das_pastas_publicadas_e_recusado(self):
        for caminho in ("base-geodatabase", "../x", "base-geoespacial/../x", "base-geoespacial/.oculta"):
            with self.assertRaises(ValueError):
                pastas_storage.listar(caminho)

    def test_cria_pasta_e_acompanha_a_copia_local(self):
        nova = pastas_storage.criar("base-geoespacial/vetor", "municipios 2024")
        self.assertEqual(nova["caminho"], "base-geoespacial/vetor/municipios 2024")
        self.assertIn("base-geoespacial/vetor/municipios 2024", self.storage.pastas)
        self.assertTrue((Path(self.espelho.name) / "base-geoespacial/vetor/municipios 2024").is_dir())

    def test_nao_cria_nome_repetido_nem_invalido(self):
        with self.assertRaises(FileExistsError):
            pastas_storage.criar("base-geoespacial", "vetor")
        for nome in ("", " a", "a/b", "con", "a:b", ".x"):
            with self.assertRaises(ValueError):
                pastas_storage.criar("base-geoespacial", nome)

    def test_renomeia_so_pasta_vazia(self):
        self.assertEqual(pastas_storage.renomear("base-geoespacial/vazia", "nova")["caminho"],
                         "base-geoespacial/nova")
        with self.assertRaisesRegex(ValueError, "vazia"):
            pastas_storage.renomear("base-geoespacial/vetor", "outra")

    def test_exclui_so_pasta_vazia_e_nunca_as_raizes(self):
        with self.assertRaisesRegex(ValueError, "vazia"):
            pastas_storage.excluir("base-geoespacial/vetor")
        with self.assertRaises(ValueError):
            pastas_storage.excluir("base-geoespacial")
        with self.assertRaises(ValueError):
            pastas_storage.renomear("superficies-indices", "x")
        pastas_storage.excluir("base-geoespacial/vazia")
        self.assertEqual(self.storage.apagadas, ["base-geoespacial/vazia"])

    def test_upload_aceita_subpasta(self):
        self.assertEqual(upload_storage.pasta_destino("base-geoespacial/vetor/"), "base-geoespacial/vetor")
        with self.assertRaises(ValueError):
            upload_storage.pasta_destino("outra/vetor")


if __name__ == "__main__":
    unittest.main()
