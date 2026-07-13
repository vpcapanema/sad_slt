from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from api.server import app
from api.services.geoespacial_service import geoespacial_service
from api.services.geoprocessamento_engine import geoprocessamento_engine


class GeoprocessamentoApiTest(unittest.TestCase):
    def setUp(self) -> None:
        geoespacial_service._camadas.clear()
        geoespacial_service._rasters.clear()
        geoespacial_service._raster_profiles.clear()
        geoespacial_service._metadados.clear()
        geoprocessamento_engine.profiles.clear()
        geoprocessamento_engine.functions.clear()
        geoprocessamento_engine.flows.clear()
        self.tempdir = tempfile.TemporaryDirectory()
        geoprocessamento_engine._definitions_path = Path(self.tempdir.name) / "definicoes.json"
        self.sample = Path(self.tempdir.name) / "amostra.geojson"
        self.sample.write_text(
            json.dumps(
                {
                    "type": "FeatureCollection",
                    "crs": {"type": "name", "properties": {"name": "EPSG:31983"}},
                    "features": [
                        {
                            "type": "Feature",
                            "properties": {"grupo": "A", "valor": 10},
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [[[300000, 7400000], [301000, 7400000], [301000, 7401000], [300000, 7401000], [300000, 7400000]]],
                            },
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def carregar(self) -> str:
        response = self.client.post(
            "/api/geoespacial/operacoes/carregar-camada",
            params={"tipo_entrada": "local", "caminho_arquivo": str(self.sample)},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["camada_id"]

    def test_operacao_registra_recurso_no_catalogo(self) -> None:
        camada_id = self.carregar()
        catalogo = self.client.get("/api/geoespacial/camadas")
        self.assertEqual(catalogo.status_code, 200)
        self.assertEqual([item["id"] for item in catalogo.json()], [camada_id])

    def test_rasterizacao_combinacao_e_preview(self) -> None:
        camada_id = self.carregar()
        params = {"camada_id": camada_id, "resolucao_raster": 500, "crs_destino": "EPSG:31983"}
        raster_1 = self.client.post("/api/geoespacial/operacoes/converter-para-raster", params=params).json()["raster_id"]
        raster_2 = self.client.post("/api/geoespacial/operacoes/criar-camada-booleana", params=params).json()["raster_id"]
        combinacao = self.client.post(
            "/api/geoespacial/operacoes/combinar-rasters",
            params=[("raster_ids", raster_1), ("raster_ids", raster_2), ("pesos", "0.7"), ("pesos", "0.3")],
        )
        self.assertEqual(combinacao.status_code, 200, combinacao.text)
        preview = self.client.get(f"/api/geoespacial/camadas/{combinacao.json()['raster_id']}/preview")
        self.assertEqual(preview.status_code, 200, preview.text)
        self.assertTrue(preview.json()["image"].startswith("data:image/png;base64,"))

    def test_funcao_persistida_validada_e_executada(self) -> None:
        camada_id = self.carregar()
        definicao = {
            "id": "funcao_teste",
            "nome": "Validar camada",
            "descricao": "Teste",
            "passos": [{"algoritmo_id": "OP-02", "parametros": {"camada_id": "$entrada"}}],
            "parametros_expostos": [],
        }
        self.assertEqual(self.client.post("/api/geoespacial/funcoes", json=definicao).status_code, 200)
        validacao = self.client.post("/api/geoespacial/funcoes/funcao_teste/validar")
        self.assertTrue(validacao.json()["valido"])
        execucao = self.client.post("/api/geoespacial/funcoes/funcao_teste/executar", json={"entrada": camada_id})
        self.assertEqual(execucao.status_code, 200, execucao.text)
        self.assertEqual(execucao.json()["status"], "concluido")

    def test_comandos_de_tabela_e_atualizacao_da_fonte(self) -> None:
        camada_id = self.carregar()

        calculo = self.client.post(
            f"/api/geoespacial/camadas/{camada_id}/calcular-campo",
            params={"campo": "valor_dobrado", "expressao": "valor * 2"},
        )
        self.assertEqual(calculo.status_code, 200, calculo.text)
        self.assertEqual(calculo.json()["feicoes_atualizadas"], 1)

        consulta = self.client.post(
            f"/api/geoespacial/camadas/{camada_id}/consultar-atributos",
            params={"expressao": "valor_dobrado == 20"},
        )
        self.assertEqual(consulta.status_code, 200, consulta.text)
        self.assertEqual(consulta.json()["total"], 1)

        atualizacao = self.client.post(f"/api/geoespacial/camadas/{camada_id}/atualizar-fonte")
        self.assertEqual(atualizacao.status_code, 200, atualizacao.text)
        self.assertEqual(atualizacao.json()["feicoes"], 1)

    def test_comandos_de_tabela_rejeitam_expressoes_invalidas(self) -> None:
        camada_id = self.carregar()
        calculo = self.client.post(
            f"/api/geoespacial/camadas/{camada_id}/calcular-campo",
            params={"campo": "campo inválido", "expressao": "valor * 2"},
        )
        consulta = self.client.post(
            f"/api/geoespacial/camadas/{camada_id}/consultar-atributos",
            params={"expressao": "campo_inexistente == 1"},
        )
        self.assertEqual(calculo.status_code, 422, calculo.text)
        self.assertEqual(consulta.status_code, 422, consulta.text)


if __name__ == "__main__":
    unittest.main()
