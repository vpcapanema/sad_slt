from __future__ import annotations

import unittest
from pathlib import Path

from api.path_policy import project_path, project_relative, relative_file_name, relative_path


class PathPolicyTest(unittest.TestCase):
    def test_normaliza_caminho_relativo(self) -> None:
        self.assertEqual(relative_path(r"data\geoespacial\camada.gpkg"), Path("data/geoespacial/camada.gpkg"))

    def test_recusa_caminhos_absolutos_de_windows_unix_e_unc(self) -> None:
        invalidos = (
            r"C:\dados\camada.gpkg",
            "/dados/camada.gpkg",
            r"\\servidor\dados\camada.gpkg",
            "~/dados/camada.gpkg",
        )
        for caminho in invalidos:
            with self.subTest(caminho=caminho), self.assertRaises(ValueError):
                relative_path(caminho)

    def test_recusa_travessia_para_fora_do_projeto(self) -> None:
        with self.assertRaises(ValueError):
            relative_path("data/../../segredo.txt")

    def test_nome_de_arquivo_nao_aceita_diretorio(self) -> None:
        with self.assertRaises(ValueError):
            relative_file_name("outra-pasta/saida.tif")

    def test_resposta_de_caminho_permanece_relativa(self) -> None:
        caminho = project_path("data/geoespacial/saida.tif")
        self.assertEqual(project_relative(caminho), "data/geoespacial/saida.tif")


if __name__ == "__main__":
    unittest.main()
