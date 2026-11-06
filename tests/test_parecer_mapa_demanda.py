from datetime import datetime, timezone
from io import BytesIO
from uuid import uuid4

import pytest
from pypdf import PdfReader
from reportlab.lib.utils import ImageReader

from api.services import analise_demanda_mapa as mapa
from api.services import analise_demanda_service as service

GEOMETRIAS = {
    "poligono": {"type": "Polygon", "coordinates": [[[-46.64, -23.55], [-46.63, -23.55], [-46.63, -23.54],
                                                      [-46.64, -23.54], [-46.64, -23.55]]]},
    "linha": {"type": "LineString", "coordinates": [[-46.64, -23.55], [-46.63, -23.54]]},
    "ponto": {"type": "Point", "coordinates": [-46.635, -23.545]},
}


def _geometria(tipo_demanda="plano", geometry=None):
    return {
        "id": f"cadastro:{tipo_demanda}:P-TESTE", "tipo": tipo_demanda, "codigo": "P-TESTE",
        "nome": "Área de teste", "status": "analise", "crs_arquivo": "EPSG:4674",
        "geometria_tipo": (geometry or GEOMETRIAS["poligono"])["type"],
        "bounds": [-46.64, -23.55, -46.63, -23.54], "posicao": None,
        "geojson": {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {}, "geometry": geometry or GEOMETRIAS["poligono"]}]},
    }


@pytest.fixture
def sem_mapa_base(monkeypatch):
    original = mapa.mapa_demanda_png

    def sem_rede(geometria, largura_pol, mapa_base=True):
        return original(geometria, largura_pol, mapa_base=False)

    monkeypatch.setattr(mapa, "mapa_demanda_png", sem_rede)


@pytest.mark.parametrize("tipo_geometria", ["poligono", "linha", "ponto"])
def test_mapa_png_tem_largura_da_impressao(tipo_geometria):
    largura_pol = 6.7
    png, aviso = mapa.mapa_demanda_png(_geometria(geometry=GEOMETRIAS[tipo_geometria]), largura_pol,
                                       mapa_base=False)
    largura_px, altura_px = ImageReader(BytesIO(png)).getSize()
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    assert aviso is None
    assert abs(largura_px - largura_pol * 200) <= 2
    assert abs(altura_px - largura_pol * mapa.MAPA_RAZAO_ALTURA * 200) <= 2


def test_escala_numerica_arredonda_para_valor_legivel():
    assert mapa._escala_numerica(10_000, 0.2) == "1:50.000"
    assert mapa._escala_numerica(1_234_567, 0.2) == "1:6.200.000"


@pytest.fixture
def emitir_documento(monkeypatch):
    monkeypatch.setattr(service.sigma_usuario_repository, "nome_pessoa_por_id", lambda _id: "Ana Silva")
    monkeypatch.setattr(service, "_rotulo_status", lambda _: "Aguardando complementação")

    def emitir(tipo, geometria):
        analise = {
            "avaliador_id": str(uuid4()), "avaliador_nome": "login_analista",
            "analise_realizada_em": datetime(2026, 10, 20, 15, 30, tzinfo=timezone.utc),
        }
        pdf = service.gerar_pdf(
            demanda={"codigo": "P-TESTE", "nome": "Área de teste", "status": "analise"}, tipo=tipo,
            respostas=dict.fromkeys(service._CAMPOS_CRITERIO, True), analise=analise, decisao="aprovada",
            status_atual="analise", momento=datetime(2026, 10, 29, 19, 30, tzinfo=timezone.utc),
            geometria=geometria)
        return PdfReader(BytesIO(pdf))

    return emitir


@pytest.mark.parametrize("tipo", ["plano", "programa", "projeto"])
def test_parecer_inclui_mapa_da_geometria(tipo, sem_mapa_base, emitir_documento):
    leitor = emitir_documento(tipo, _geometria(tipo))
    texto = " ".join(" ".join(p.extract_text() for p in leitor.pages).split())
    assert "Mapa de localização da demanda" in texto
    assert any(pagina.images for pagina in leitor.pages)


def test_parecer_sem_geometria_informa_indisponibilidade(emitir_documento):
    leitor = emitir_documento("plano", None)
    texto = " ".join(" ".join(p.extract_text() for p in leitor.pages).split())
    assert "não está disponível para o mapa" in texto
