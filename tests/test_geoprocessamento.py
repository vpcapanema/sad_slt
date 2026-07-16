from __future__ import annotations

import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import geopandas as gpd
from fastapi.testclient import TestClient
from shapely.geometry import Point

from api.path_policy import project_relative
from api.db.connection import get_connection
from api.repositories import camada_geoespacial_repository
from api.server import app
from api.services.geoespacial_service import geoespacial_service
from api.services.geoprocessamento_engine import geoprocessamento_engine
from api.services.session_service import SessionUser, cookie_name, create_token


class GeoprocessamentoApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.persisted_before = {
            item["recurso_sessao_id"]
            for item in camada_geoespacial_repository.listar()
            if item.get("recurso_sessao_id")
        }
        geoespacial_service._camadas.clear()
        geoespacial_service._rasters.clear()
        geoespacial_service._raster_profiles.clear()
        geoespacial_service._metadados.clear()
        geoprocessamento_engine.profiles.clear()
        geoprocessamento_engine.functions.clear()
        geoprocessamento_engine.flows.clear()
        Path("data/geoespacial/tests").mkdir(parents=True, exist_ok=True)
        self.tempdir = tempfile.TemporaryDirectory(dir="data/geoespacial/tests")
        temp_path = Path(project_relative(Path(self.tempdir.name)))
        geoprocessamento_engine._definitions_path = temp_path / "definicoes.json"
        self.sample = temp_path / "amostra.geojson"
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
        token = create_token(
            SessionUser(
                id="00000000-0000-0000-0000-000000000010",
                email="gestor@example.org",
                username="teste_gestor",
                nome="Gestor de teste",
                tipo_usuario="GESTOR",
            )
        )
        self.client.cookies.set(cookie_name(), token)

    def tearDown(self) -> None:
        for item in camada_geoespacial_repository.listar():
            recurso_id = item.get("recurso_sessao_id")
            if recurso_id and recurso_id not in self.persisted_before:
                camada_geoespacial_repository.excluir(recurso_id)
        self.tempdir.cleanup()

    def carregar(self) -> str:
        response = self.client.post(
            "/api/geoespacial/operacoes/importar-camada",
            params={"tipo_entrada": "local", "caminho_arquivo": str(self.sample)},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["camada_id"]

    def test_operacao_registra_recurso_no_catalogo(self) -> None:
        camada_id = self.carregar()
        with get_connection() as conn:
            importada = conn.execute(
                "SELECT 1 FROM geoprocessamento.camada_importada WHERE recurso_sessao_id=%s",
                (camada_id,),
            ).fetchone()
            catalogo_legado = conn.execute(
                "SELECT 1 FROM geoprocessamento.camada WHERE recurso_sessao_id=%s",
                (camada_id,),
            ).fetchone()
        self.assertIsNotNone(importada)
        self.assertIsNone(catalogo_legado)
        geoespacial_service._camadas.pop(camada_id, None)
        geoespacial_service._metadados.pop(camada_id, None)
        geojson = self.client.get(f"/api/geoespacial/camadas/{camada_id}/geojson")
        self.assertEqual(geojson.status_code, 200, geojson.text)
        self.assertEqual(len(geojson.json()["features"]), 1)
        catalogo = self.client.get("/api/geoespacial/camadas")
        self.assertEqual(catalogo.status_code, 200)
        self.assertIn(camada_id, [item["id"] for item in catalogo.json()])

    def test_carregar_usa_diretorio_interno_sem_duplicar_camada(self) -> None:
        camada_id = self.carregar()
        total_antes = len(camada_geoespacial_repository.listar())
        diretorio = self.client.get("/api/geoespacial/camadas-diretorio")
        self.assertEqual(diretorio.status_code, 200, diretorio.text)
        self.assertIn(camada_id, [item["id"] for item in diretorio.json()["importadas"]])

        geoespacial_service._camadas.clear()
        geoespacial_service._metadados.clear()
        resposta = self.client.post(f"/api/geoespacial/camadas/{camada_id}/carregar")
        self.assertEqual(resposta.status_code, 200, resposta.text)
        self.assertTrue(resposta.json()["carregada"])
        self.assertEqual(len(camada_geoespacial_repository.listar()), total_antes)

    def test_upload_repetido_reutiliza_a_mesma_importacao(self) -> None:
        payload = self.sample.read_bytes()
        filename = "teste_idempotencia.geojson"
        upload_path = Path("data/geoespacial/uploads") / filename
        try:
            primeira = self.client.post(
                "/api/geoespacial/camadas/importar",
                files={"arquivo": (filename, payload, "application/geo+json")},
            )
            segunda = self.client.post(
                "/api/geoespacial/camadas/importar",
                files={"arquivo": (filename, payload, "application/geo+json")},
            )
            self.assertEqual(primeira.status_code, 200, primeira.text)
            self.assertEqual(segunda.status_code, 200, segunda.text)
            self.assertEqual(primeira.json()["camada_id"], segunda.json()["camada_id"])
            self.assertTrue(segunda.json()["reutilizada"])
            with get_connection() as conn:
                total = conn.execute(
                    """SELECT count(*) AS total
                       FROM geoprocessamento.camada_importada
                       WHERE recurso_sessao_id=%s""",
                    (primeira.json()["camada_id"],),
                ).fetchone()["total"]
            self.assertEqual(total, 1)
        finally:
            upload_path.unlink(missing_ok=True)

    def test_persistencia_converte_nan_de_atributos_para_json_null(self) -> None:
        gdf = gpd.GeoDataFrame(
            [{"Contaminan": float("nan"), "Nome": "Posto de combustível"}],
            geometry=[Point(-46.63, -23.55)],
            crs="EPSG:4326",
        )
        camada_id = geoespacial_service.registrar_camada(
            gdf, "Camada com NaN", "arquivo", indicador=float("nan")
        )
        with get_connection() as conn:
            row = conn.execute(
                """SELECT f.propriedades, c.metadados
                   FROM geoprocessamento.camada_importada c
                   JOIN geoprocessamento.camada_importada_feicao f ON f.camada_id=c.id
                   WHERE c.recurso_sessao_id=%s""",
                (camada_id,),
            ).fetchone()
        self.assertIsNone(row["propriedades"]["Contaminan"])
        self.assertIsNone(row["metadados"]["metadados"]["indicador"])

    def test_simbologia_separa_pontos_linhas_e_poligonos(self) -> None:
        script = Path("geoespacial/geoprocessamento.js").read_text(encoding="utf-8")
        self.assertIn('filter:["==",["geometry-type"],"Point"]', script)
        self.assertIn('filter:["==",["geometry-type"],"LineString"]', script)

    def test_componente_separa_remocao_visual_exclusao_e_exibe_progresso(self) -> None:
        script = Path("geoespacial/geoprocessamento.js").read_text(encoding="utf-8")
        ribbon = Path("geoespacial/geoprocessamento-ribbon.js").read_text(encoding="utf-8")
        commands = Path("geoespacial/geoprocessamento-commands.js").read_text(encoding="utf-8")
        styles = Path("assets/css/geoprocessamento.css").read_text(encoding="utf-8")
        self.assertIn('"trash-2","Remover camada","remove"', script)
        self.assertIn('"x","Excluir camada","delete-layer"', script)
        self.assertIn('.ribbon-action[data-action="delete-layer"] svg', styles)
        self.assertIn("function removeLayerFromMap", script)
        self.assertIn("async function deleteLayerFromSystem", script)
        self.assertIn('className="execution-progress"', script)
        self.assertIn('role="progressbar"', script)
        self.assertIn("job.concluidas}/${job.total} nanotarefas", script)
        self.assertIn("if(job.total>3)", script)
        self.assertNotIn("selected.length*4", script)
        self.assertNotIn("configure(4", ribbon)
        self.assertIn("importar-job", script)
        self.assertIn("carregar-job", ribbon)
        self.assertIn("homologar-job", ribbon)
        self.assertIn("job.logs", script)
        self.assertIn("#gp-right-pane .editor-head h2", styles)
        self.assertIn("#gp-right-pane .field input", styles)
        self.assertIn("#gp-right-pane .field select", styles)
        self.assertIn('type="color"', script)
        self.assertIn("function applyLayerColor", script)
        self.assertIn('setPaintProperty(id,"fill-color",color)', script)
        self.assertIn('setPaintProperty(`${id}-line`,"line-color",color)', script)
        self.assertIn('setPaintProperty(`${id}-point`,"circle-color",color)', script)
        self.assertIn('layerColors:load("gp-layer-colors",{})', script)
        self.assertIn("removeLayerFromMap(activeLayerId())", ribbon)
        self.assertIn("const SELECT_CURSOR", commands)
        self.assertIn("style.cursor = SELECT_CURSOR", commands)

    def test_progresso_varia_com_numero_real_de_entradas(self) -> None:
        camada_id = self.carregar()
        camada_ref_id = self.carregar()

        simples = self.client.post(
            "/api/geoespacial/operacoes-jobs/OP-02",
            json={"camada_id": camada_id},
        )
        composto = self.client.post(
            "/api/geoespacial/operacoes-jobs/OP-07",
            json={
                "camada_id": camada_id,
                "camada_ref_id": camada_ref_id,
                "tipo_selecao": "intersects",
            },
        )
        self.assertEqual(simples.status_code, 202, simples.text)
        self.assertEqual(composto.status_code, 202, composto.text)
        self.assertGreater(simples.json()["total"], 4)
        self.assertGreater(composto.json()["total"], simples.json()["total"])
        self.assertIn("logs", simples.json())

        for job_id in (simples.json()["id"], composto.json()["id"]):
            for _ in range(100):
                status = self.client.get(f"/api/geoespacial/operacoes-jobs/status/{job_id}")
                self.assertEqual(status.status_code, 200, status.text)
                if status.json()["status"] in {"concluido", "erro"}:
                    break
                time.sleep(0.05)
            self.assertEqual(status.json()["status"], "concluido", status.text)
            self.assertEqual(status.json()["concluidas"], status.json()["total"])
            self.assertEqual(status.json()["percentual"], 100)

    def test_importacao_e_carregamento_expoem_logs_reais_de_nanotarefas(self) -> None:
        filename = "teste_nanotarefas.geojson"
        upload_path = Path("data/geoespacial/uploads") / filename
        homologated_id = None
        try:
            started = self.client.post(
                "/api/geoespacial/camadas/importar-job",
                files={"arquivo": (filename, self.sample.read_bytes(), "application/geo+json")},
            )
            self.assertEqual(started.status_code, 202, started.text)
            self.assertGreater(started.json()["total"], 4)
            job_id = started.json()["id"]
            for _ in range(200):
                status = self.client.get(f"/api/geoespacial/operacoes-jobs/status/{job_id}")
                if status.json()["status"] in {"concluido", "erro"}:
                    break
                time.sleep(0.05)
            imported = status.json()
            self.assertEqual(imported["status"], "concluido", status.text)
            self.assertEqual(imported["concluidas"], imported["total"])
            self.assertEqual(len(imported["logs"]), imported["total"])
            messages = [item["mensagem"] for item in imported["logs"]]
            self.assertTrue(any("driver geoespacial" in message for message in messages))
            self.assertTrue(any("PostGIS" in message for message in messages))

            camada_id = imported["resultado"]["camada_id"]
            geoespacial_service._camadas.clear()
            geoespacial_service._metadados.clear()
            load_started = self.client.post(
                f"/api/geoespacial/camadas/{camada_id}/carregar-job"
            )
            self.assertEqual(load_started.status_code, 202, load_started.text)
            load_id = load_started.json()["id"]
            for _ in range(200):
                load_status = self.client.get(
                    f"/api/geoespacial/operacoes-jobs/status/{load_id}"
                )
                if load_status.json()["status"] in {"concluido", "erro"}:
                    break
                time.sleep(0.05)
            loaded = load_status.json()
            self.assertEqual(loaded["status"], "concluido", load_status.text)
            self.assertGreater(loaded["total"], 4)
            self.assertEqual(len(loaded["logs"]), loaded["total"])

            homologation_started = self.client.post(
                f"/api/geoespacial/camadas/{camada_id}/homologar-job",
                json={
                    "modulo_consumidor": "ambos",
                    "nome_publicacao": "Teste de nanotarefas",
                    "versao": "v1",
                    "metadados": {},
                },
            )
            self.assertEqual(homologation_started.status_code, 202, homologation_started.text)
            homologation_id = homologation_started.json()["id"]
            for _ in range(200):
                homologation_status = self.client.get(
                    f"/api/geoespacial/operacoes-jobs/status/{homologation_id}"
                )
                if homologation_status.json()["status"] in {"concluido", "erro"}:
                    break
                time.sleep(0.05)
            homologated = homologation_status.json()
            self.assertEqual(homologated["status"], "concluido", homologation_status.text)
            self.assertGreater(homologated["total"], 4)
            self.assertEqual(len(homologated["logs"]), homologated["total"])
            self.assertTrue(any(
                "Transação de homologação" in item["mensagem"]
                for item in homologated["logs"]
            ))
            homologated_id = homologated["resultado"]["id"]
        finally:
            if homologated_id:
                with get_connection() as conn:
                    conn.execute("ALTER TABLE geoprocessamento.camada_homologada DISABLE TRIGGER trg_gp_homologada_snapshot_imutavel")
                    conn.execute("ALTER TABLE geoprocessamento.camada_homologada_feicao DISABLE TRIGGER trg_gp_homologada_feicao_imutavel")
                    conn.execute("ALTER TABLE geoprocessamento.camada_homologada_raster DISABLE TRIGGER trg_gp_homologada_raster_imutavel")
                    conn.execute(
                        """DELETE FROM geoprocessamento.camada_homologada_feicao
                           WHERE camada_id IN (SELECT id FROM geoprocessamento.camada_homologada
                                               WHERE nome_publicacao='Teste de nanotarefas')"""
                    )
                    conn.execute(
                        """DELETE FROM geoprocessamento.camada_homologada_raster
                           WHERE camada_id IN (SELECT id FROM geoprocessamento.camada_homologada
                                               WHERE nome_publicacao='Teste de nanotarefas')"""
                    )
                    conn.execute("DELETE FROM geoprocessamento.camada_homologada WHERE nome_publicacao='Teste de nanotarefas'")
                    conn.execute("ALTER TABLE geoprocessamento.camada_homologada ENABLE TRIGGER trg_gp_homologada_snapshot_imutavel")
                    conn.execute("ALTER TABLE geoprocessamento.camada_homologada_feicao ENABLE TRIGGER trg_gp_homologada_feicao_imutavel")
                    conn.execute("ALTER TABLE geoprocessamento.camada_homologada_raster ENABLE TRIGGER trg_gp_homologada_raster_imutavel")
                    conn.commit()
            upload_path.unlink(missing_ok=True)

    def test_camada_homologada_rejeita_mutacao(self) -> None:
        camada_id = self.carregar()
        with patch.object(camada_geoespacial_repository, "esta_homologada", return_value=True):
            calculo = self.client.post(
                f"/api/geoespacial/camadas/{camada_id}/calcular-campo",
                params={"campo": "novo", "expressao": "valor * 2"},
            )
            exclusao = self.client.delete(f"/api/geoespacial/camadas/{camada_id}")
        self.assertEqual(calculo.status_code, 422, calculo.text)
        self.assertIn("somente leitura", calculo.json()["detail"])
        self.assertEqual(exclusao.status_code, 409, exclusao.text)

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
        raster_final = combinacao.json()["raster_id"]
        with get_connection() as conn:
            processado = conn.execute(
                """SELECT 1 FROM geoprocessamento.camada_processada p
                   JOIN geoprocessamento.camada_processada_raster r ON r.camada_id=p.id
                   WHERE p.recurso_sessao_id=%s""",
                (raster_final,),
            ).fetchone()
        self.assertIsNotNone(processado)
        geoespacial_service._rasters.pop(raster_final, None)
        geoespacial_service._raster_profiles.pop(raster_final, None)
        geoespacial_service._metadados.pop(raster_final, None)
        geoprocessamento_engine.profiles.pop(raster_final, None)
        preview = self.client.get(f"/api/geoespacial/camadas/{raster_final}/preview")
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
