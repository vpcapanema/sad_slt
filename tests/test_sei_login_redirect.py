"""Regressão com transporte simulado; não autentica no SEI real."""
import asyncio
from urllib.parse import parse_qs

import httpx
import pytest

from api.services import sei_integracao_service as sei


@pytest.mark.parametrize("action", ["login.php?destino=sei", ""])
def test_login_uses_final_page_url_and_preserves_session(action):
    final_url = "https://sei.sp.gov.br/sip/login.php?destino=sei"
    posts = []

    def handle(request):
        if request.method == "POST":
            posts.append(request)
            return httpx.Response(200, text="Resposta simulada")
        if request.url.path == "/sei/controlador.php":
            return httpx.Response(302, headers={"location": final_url})
        return httpx.Response(
            200,
            headers={"set-cookie": "sessao=simulada; Path=/sip/"},
            text=f'<form id="frmLogin" action="{action}">'
            '<input type="hidden" name="hdnAcao" value="teste" /></form>',
        )

    async def run():
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(handle), follow_redirects=True
        ) as client:
            await sei._submeter_login(
                client, tipo_login="interno", identificacao="teste",
                senha="senha-simulada", orgao="teste", captcha=None,
            )

    asyncio.run(run())
    assert len(posts) == 1
    assert str(posts[0].url) == final_url
    assert posts[0].headers["cookie"] == "sessao=simulada"
    assert parse_qs(posts[0].content.decode())["hdnAcao"] == ["teste"]
