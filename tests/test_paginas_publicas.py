"""Inventário HTTP público isolado de banco e Storage oficiais."""
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

import pytest
from fastapi.testclient import TestClient
from fastapi.responses import Response

from api.server import app
from api.services import documentacao_favorabilidade, documentacao_limite_maritimo, storage_remoto, tutoriais_publicos
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
    "/public/documentacao/visao-geral/",
    "/public/documentacao/glossario/",
    "/public/documentacao/tutoriais/",
    "/public/documentacao/risco-restricao/",
    "/public/documentacao/favorabilidade/",
    "/public/documentacao/limite-maritimo/",
    "/public/documentacao_favorabilidade_v2/",
    "/public/analise-multicriterio/formulario-comparacao-pareada/convite-teste/",
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
    monkeypatch.setattr(tutoriais_publicos, "midia", lambda request, nome: Response(b"midia-de-teste"))
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


def test_inicio_icones_acima_e_numeros_junto_aos_titulos(client):
    html = client.get("/public/").text
    for numero, icone, titulo in (
        (1, "fa-regular fa-square-plus", "Cadastro de Demandas"),
        (2, "fa-solid fa-ranking-star", "Hierarquização de Demandas"),
        (3, "fa-solid fa-chart-line", "Transparência e Acompanhamento"),
    ):
        assert (
            '<span class="module-card-icon module-card-step-number" aria-hidden="true">'
            f'<i class="{icone}"></i></span>'
        ) in html
        assert (
            f'<h3><span class="module-card-title-number" aria-hidden="true">{numero}</span>'
            f'<span>{titulo}</span></h3>'
        ) in html


def test_texto_publico_nao_promete_publicacao_por_aprovacao(client):
    for path in ["/public/", "/public/transparencia/", "/public/cadastro/", "/public/documentacao/"]:
        html = client.get(path).text
        assert "autorizados" not in html
        if path == "/public/cadastro/":
            assert "A consulta das demandas publicadas continua aberta ao público." in html
            assert "Como a demanda é processada" not in html
        else:
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
        "/public/documentacao/visao-geral/",
        "/public/documentacao/hierarquizacao/MODELO_HIERARQUIZACAO_ESPACIAL.md",
        "/public/documentacao/risco-restricao/",
        "/public/documentacao_favorabilidade_v2/",
        "/public/documentacao/hierarquizacao/MODULO_FASE3_ATRIBUTOS_PROJETO_AJUSTE.md",
        "/public/documentacao/limite-maritimo/",
        "/public/documentacao/tutoriais/",
    )
    assert parser.links == [prefix + destination for destination in destinations]
    assert len(parser.links) == len(set(parser.links))
    assert re.findall(r'<a\b[^>]*><span>([^<]+)</span>', section) == [
        "Visão geral do SICARD",
        "Modelos de hierarquização espacial",
        "Fundamentos da elegibilidade territorial — restrições e riscos",
        "Fundamentos da favorabilidade territorial — município e rede rodoviária",
        "Fundamentos da priorização de demandas por atributos",
        "Fundamentos da definição do limite marítimo paulista",
        "Tutoriais do SICARD",
    ]
    assert 'title="Referência provisória, não homologada"' in section
    for destination in destinations:
        # O proxy retira o prefixo antes de encaminhar a requisicao ao backend.
        assert client.get(destination, headers=headers).status_code == 200, destination


@pytest.mark.parametrize("prefix", ["", "/sicard"])
def test_visao_geral_integra_conceitos_fluxos_e_referencias(client, prefix):
    headers = {"X-Forwarded-Prefix": prefix} if prefix else {}
    response = client.get("/public/documentacao/visao-geral/", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    html = response.text
    parser = Links()
    parser.feed(html)
    assert parser.h1 == 1
    assert "Visão geral do SICARD" in html
    assert 'data-requer-autenticacao="true"' not in html
    assert 'class="rodape-institucional"' in html
    assert prefix + "/assets/css/visao-geral.css?v=" in html
    assert html.count("<figure ") == html.count("<figcaption ") == 4
    modulos = html.split('id="modulos"', 1)[1].split("</section>", 1)[0]
    assert re.findall(r"<li><strong>([^<]+)</strong>", modulos) == [
        "MOCAD", "MAD", "Transparência e acompanhamento",
    ]
    assert "abordagem transversal de apoio" in modulos
    assert "análises espacialmente explícitas" in modulos
    assert "em todas as etapas do processo" in modulos
    ids = re.findall(r'\bid="([^"]+)"', html)
    assert len(ids) == len(set(ids))
    indice = html.split('aria-label="Nesta página"', 1)[1].split("</nav>", 1)[0]
    capitulos = re.findall(r'href="#([^"]+)"', indice)
    assert len(capitulos) == 12
    assert set(capitulos) <= set(ids)
    for fragment in re.findall(r'aria-labelledby="([^"]+)"', html):
        assert all(value in ids for value in fragment.split())
    for term in (
        "Módulo de Cadastro e Análise de Demandas",
        "Módulo de Apoio à Decisão",
        "Objeto de demanda",
        "Favorabilidade territorial — município e rede rodoviária",
        "Priorização de demandas por atributos",
        "independentes e combináveis",
        "Município e grade não são sinônimos",
        "não publicam automaticamente",
        "Projeto", "Programa", "Plano", "SIGMA-PLI",
    ):
        assert term in html
    assert prefix + "/public/documentacao/hierarquizacao/ESPINHA_DORSAL_SISTEMA_HIERARQUIZACAO.md" in html
    for fragment in ("objeto-demanda", "status"):
        glossary = client.get("/public/documentacao/glossario/", headers=headers).text
        assert f'id="{fragment}"' in glossary
        assert prefix + "/public/documentacao/glossario/#" + fragment in html


@pytest.mark.parametrize("path, title", [
    ("/restrict/hierarquizacao/fase-1/", "Elegibilidade territorial"),
    ("/restrict/hierarquizacao/fase-2/", "Favorabilidade territorial — município e rede rodoviária"),
    ("/restrict/hierarquizacao/fase-3/", "Priorização de demandas por atributos"),
])
def test_fases_exibem_nomenclatura_oficial(client, path, title):
    html = client.get(path).text
    assert f"<span>{title}</span></h1>" in html
    assert title in html.split('<nav class="hier-link-bar"', 1)[1].split("</nav>", 1)[0]
    assert "Favorabilidade de grade e da rede" not in html
    assert "Priorização por atributos" not in html


@pytest.mark.parametrize("prefix", ["", "/sicard"])
def test_tutoriais_publicos_conectados_ao_manifesto(client, monkeypatch, prefix):
    def storage_proibido(*args, **kwargs):
        pytest.fail("O HTML do catálogo deve usar o manifesto local, sem ler as mídias.")

    monkeypatch.setattr(storage_remoto, "baixar", storage_proibido)
    headers = {"X-Forwarded-Prefix": prefix} if prefix else {}
    response = client.get("/public/documentacao/tutoriais/", headers=headers)
    assert response.status_code == 200
    html = response.text
    parser = Links()
    parser.feed(html)
    assert parser.h1 == 1
    dados = tutoriais_publicos.manifesto()
    main_parser = Links()
    main_parser.feed(html.split("<main", 1)[1].split("</main>", 1)[0])
    assert main_parser.links == [
        prefix + "/public/documentacao/",
        *[
            prefix + tutoriais_publicos.BASE_URL + tutorial[campo]
            for tutorial in dados["tutoriais"] for campo in ("video", "srt")
        ],
    ]
    assert prefix + "/assets/css/tutoriais.css?v=" in html
    assert prefix + "/public/cadastro/index.css?v=" in html
    assert prefix + "/assets/js/tutoriais.js" in html
    assert 'class="rodape-institucional"' in html
    stylesheet = client.get("/assets/css/tutoriais.css", headers=headers)
    assert stylesheet.status_code == 200
    assert "text/css" in stylesheet.headers["content-type"]
    assert "grid-template-columns:repeat(2,minmax(0,1fr))" in re.sub(r"\s+", "", stylesheet.text)
    assert len(re.findall(r"<article\b", html)) == 16
    assert html.count("Revisão pendente") == 5
    assert "Tributando camadas territoriais" in html
    assert "Complementando um cadastro — Atributos de demanda" in html
    assert "Cadastrando um usuário" in html
    assert "39.73 s · Full HD · 30 fps" in html
    assert html.count("<video ") == 16
    assert html.count("<track ") == 16
    assert html.count('preload="none"') == 16
    assert html.count('role="status" hidden') == 16
    for tutorial in dados["tutoriais"]:
        for campo in ("video", "capa", "vtt", "srt"):
            assert prefix + tutoriais_publicos.BASE_URL + tutorial[campo] in html
        assert tutorial["revisao"] in html
    for forbidden in ("aguardam definição de hospedagem", "file:///", "W:\\", "127.0.0.1", "aplicacao/documentacao", "CONFERENCIA_STATUS.txt"):
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
