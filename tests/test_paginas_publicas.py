"""Inventário HTTP público isolado de banco e Storage oficiais."""
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

import pytest
from fastapi.testclient import TestClient

from api.server import app
from api.services import documentacao_favorabilidade, documentacao_limite_maritimo, storage_remoto
from api.services.session_service import SessionUser, cookie_name, create_token


PAGES = (
    "/public/",
    "/public/cadastro/",
    "/public/cadastro/catalogo-diretorias/",
    "/public/cadastro/catalogo-planos/",
    "/public/cadastro/catalogo-frentes-pli/",
    "/public/cadastro/catalogo-eixos-pef/",
    "/public/painel/",
    "/public/transparencia/",
    "/public/login/",
    "/public/documentacao/",
    "/public/documentacao/glossario/",
    "/public/documentacao/tutoriais/",
    "/public/documentacao/risco-restricao/",
    "/public/documentacao/favorabilidade/",
    "/public/documentacao/limite-maritimo/",
    "/public/documentacao_favorabilidade_v2/",
    "/public/analise-multicriterio/convite-teste/",
    "/public/documentacao/saidas_modelos/index.html",
    "/public/documentacao/saidas_modelos/claude_fable5_1/index.html",
    "/public/documentacao/saidas_modelos/gpt_61_sol/index.html",
    "/public/documentacao/saidas_modelos/gemini/index.html",
    "/public/documentacao/saidas_modelos/grok_4_7/index.html",
    "/public/documentacao/saidas_modelos/rede_der/index.html",
    "/public/documentacao/apresentacao_hierarquizacao/index.html",
    "/public/documentacao/feedback-preview.html",
    "/public/documentacao/feedback-hierarquia.html",
)


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "h1":
            self.h1 += 1
        if tag in {"a", "script", "link", "img"}:
            value = attrs.get("href") if tag in {"a", "link"} else attrs.get("src")
            if value:
                self.links.append(value)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("SICARD_STORAGE_WRITE_DIR", raising=False)
    monkeypatch.setattr(documentacao_favorabilidade, "montar_contexto", lambda: {})
    monkeypatch.setattr(documentacao_limite_maritimo, "montar_contexto", lambda: {})
    monkeypatch.setattr(storage_remoto, "baixar", lambda path: b"imagem-de-teste")
    return TestClient(app)


@pytest.mark.parametrize("path", PAGES)
def test_inventario_e_links_locais(client, path):
    response = client.get(path)
    assert response.status_code == 200, path
    parser = Links()
    parser.feed(response.text)
    for value in parser.links:
        target = urlsplit(urljoin("http://testserver" + path, value))
        if target.netloc != "testserver" or value.startswith("#"):
            continue
        # Restrito e cadastro protegido preservam seus contratos de autenticação.
        if target.path.startswith("/restrict/") and not target.path.endswith((".js", ".css")):
            continue
        resource = client.get(target.path, follow_redirects=False)
        if target.path.startswith("/data/geoespacial/relatorios/mapas_fase1/"):
            # Este conjunto é servido somente pelo Storage nativo da VM.
            assert resource.status_code == 503
            assert "acesso nativo ao storage" in resource.json()["detail"]
            continue
        assert resource.status_code in {
            200, 301, 302, 303, 307, 308
        }, (path, value)


@pytest.mark.parametrize("slug", ["diretorias", "planos", "frentes-pli", "eixos-pef"])
def test_catalogo_tem_titulo_e_feedback(client, slug):
    html = client.get(f"/public/cadastro/catalogo-{slug}/").text
    parser = Links()
    parser.feed(html)
    assert parser.h1 == 1
    assert 'id="conteudo" aria-live="polite"' in html


def test_texto_publico_nao_promete_publicacao_por_aprovacao(client):
    for path in ["/public/", "/public/transparencia/", "/public/cadastro/", "/public/documentacao/"]:
        html = client.get(path).text
        assert "autorizados" not in html
        assert "homologação" in html or "aprovação" in html
    painel = client.get("/public/painel/").text
    assert 'id="painel-load-status"' in painel
    assert "/assets/js/storage.js" not in painel
    assert "provisória, não AHP homologado" in client.get("/public/documentacao/favorabilidade/").text


def test_cadastro_continua_protegido_e_legado_retornado(client):
    response = client.get("/public/cadastro/nova-demanda/?tipo=plano", follow_redirects=False)
    assert response.status_code == 303
    assert "/public/login/" in response.headers["location"]
    assert "tipo%3Dplano" in response.headers["location"]
    assert client.get("/public/ahp/colaborativa/").status_code == 410


@pytest.mark.parametrize("profile, expected", [
    ("VISUALIZADOR", 403),
    ("OPERADOR", 200),
    ("ANALISTA", 200),
    ("GESTOR", 200),
    ("ADMIN", 200),
])
def test_cadastro_respeita_perfis(client, profile, expected):
    client.cookies.set(cookie_name(), create_token(SessionUser(
        id="public-pages-test",
        email="teste@example.org",
        username=f"teste_{profile.lower()}",
        nome="Pessoa de teste",
        tipo_usuario=profile,
    )))
    assert client.get("/public/cadastro/nova-demanda/").status_code == expected


@pytest.mark.parametrize("source, destination", [
    ("/cadastro/", "/public/cadastro/"),
    ("/public/cadastro/index.html", "/public/cadastro/"),
    ("/cadastro/catalogo-planos.html", "/public/cadastro/catalogo-planos/"),
    ("/cadastro/nova-demanda.html", "/public/cadastro/nova-demanda/"),
])
def test_alias_preserva_query_e_prefixo(client, source, destination):
    response = client.get(
        source + "?diretoria=teste",
        headers={"X-Forwarded-Prefix": "/sicard"},
        follow_redirects=False,
    )
    assert response.status_code == 308
    assert response.headers["location"] == "/sicard" + destination + "?diretoria=teste"


@pytest.mark.parametrize("prefix", ["", "/sicard"])
def test_hierarquizacao_tem_destinos_unicos_e_prefixados(client, prefix):
    headers = {"X-Forwarded-Prefix": prefix} if prefix else {}
    response = client.get("/public/documentacao/", headers=headers)
    assert response.status_code == 200
    section = response.text.split('class="secao-metodologia-hierarquizacao', 1)[1].split("</section>", 1)[0]
    parser = Links()
    parser.feed(section)
    destinations = (
        "/public/documentacao/risco-restricao/",
        "/public/documentacao_favorabilidade_v2/",
        "/public/documentacao/limite-maritimo/",
        "/public/documentacao/saidas_modelos/index.html",
        "/public/documentacao/hierarquizacao/ESPINHA_DORSAL_SISTEMA_HIERARQUIZACAO.md",
        "/public/documentacao/hierarquizacao/MODELO_HIERARQUIZACAO_ESPACIAL.md",
        "/public/documentacao/hierarquizacao/MODULO_FASE3_ATRIBUTOS_PROJETO_AJUSTE.md",
        "/public/documentacao/tutoriais/",
    )
    assert parser.links == [prefix + destination for destination in destinations]
    assert len(parser.links) == len(set(parser.links))
    assert "referência provisória, não homologada" in section
    for destination in destinations:
        # O proxy retira o prefixo antes de encaminhar a requisicao ao backend.
        assert client.get(destination, headers=headers).status_code == 200, destination


@pytest.mark.parametrize("prefix", ["", "/sicard"])
def test_tutoriais_publicos_catalogo_sem_midias_nao_publicadas(client, monkeypatch, prefix):
    def storage_proibido(*args, **kwargs):
        pytest.fail("O catálogo não deve consultar Storage ou publicar mídias.")

    monkeypatch.setattr(storage_remoto, "baixar", storage_proibido)
    headers = {"X-Forwarded-Prefix": prefix} if prefix else {}
    response = client.get("/public/documentacao/tutoriais/", headers=headers)
    assert response.status_code == 200
    html = response.text
    parser = Links()
    parser.feed(html)
    assert parser.h1 == 1
    assert parser.links == [prefix + "/public/documentacao/"]
    assert html.count("<article>") == 16
    assert html.count("Revisão pendente") == 5
    assert "Tributando camadas territoriais" in html
    assert "Complementando um cadastro — Atributos de demanda" in html
    assert "Cadastrando um usuário" in html
    assert "39.73 s · Full HD · 30 fps" in html
    assert "Vídeos ainda não disponíveis" in html
    assert "aguardam definição de hospedagem" in html
    for forbidden in ("<video", "<img", "<script", " src=", "poster=", " download>", " download=", "file:///", "W:\\", "127.0.0.1"):
        assert forbidden not in html


@pytest.mark.parametrize("document", [
    "ESPINHA_DORSAL_SISTEMA_HIERARQUIZACAO.md",
    "MODELO_HIERARQUIZACAO_ESPACIAL.md",
    "MODULO_FASE1_GERADOR_RESTRICAO_RISCO.md",
    "MODULO_FASE2_GERADOR_FAVORABILIDADE_TERRITORIAL.md",
    "MODULO_FASE3_ATRIBUTOS_PROJETO_AJUSTE.md",
])
def test_documentos_publicos_preservam_conteudo_e_lista_autorizada(client, document):
    legacy = client.get("/documentos/hierarquizacao/" + document)
    public = client.get("/public/documentacao/hierarquizacao/" + document)
    assert legacy.status_code == public.status_code == 200
    assert public.content == legacy.content
    assert public.headers["content-type"].startswith("text/markdown")


@pytest.mark.parametrize("document", ["inexistente.md", "privado.html", ".env"])
def test_documentacao_hierarquizacao_nao_publica_documentos_arbitrarios(client, document):
    for root in ("/documentos/hierarquizacao/", "/public/documentacao/hierarquizacao/"):
        response = client.get(root + document)
        assert response.status_code == 404
        assert response.json()["detail"] == "Documento não encontrado"
