"""Obtém um cookie de sessão real para os testes de navegador (.cjs).

Lê a conta de agente em ``credencias_sigma_agentes.txt`` (raiz do repositório,
ignorado pelo Git), autentica pelo fluxo normal ``POST /api/auth/login`` e
imprime apenas o valor do cookie, para uso em ``SICARD_BROWSER_SESSION``:

    $env:SICARD_BROWSER_SESSION = (.venv\\Scripts\\python.exe scripts\\sessao_agente.py)
    node tests\\browser\\elegibilidade-reabrir.cjs

A sessão é temporária (sem "permanecer conectado"); nenhum valor do arquivo
de credenciais é impresso ou gravado.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from http.cookies import SimpleCookie
from pathlib import Path

ARQUIVO = Path(__file__).resolve().parent.parent / "credencias_sigma_agentes.txt"
COOKIE = "slt_session"
CHAVES_SENHA = ("senha inicial", "senha", "password")


def contas(caminho: Path = ARQUIVO) -> list[dict[str, str]]:
    """Blocos "Chave:<tab>valor" do arquivo; um dicionário por conta."""
    if not caminho.exists():
        raise FileNotFoundError(f"Arquivo de credenciais ausente: {caminho.name}")
    blocos: list[dict[str, str]] = []
    atual: dict[str, str] = {}
    for linha in caminho.read_text(encoding="utf-8", errors="replace").splitlines():
        if ":" not in linha:
            continue
        chave, _, valor = linha.partition(":")
        chave, valor = chave.strip().casefold(), valor.strip()
        if not valor:
            continue
        if chave == "username" and "username" in atual:
            blocos.append(atual)
            atual = {}
        atual[chave] = valor
    if atual:
        blocos.append(atual)
    return [b for b in blocos if "username" in b and any(k in b for k in CHAVES_SENHA)]


def selecionar(perfil: str | None, caminho: Path = ARQUIVO) -> dict[str, str]:
    lista = contas(caminho)
    if perfil:
        alvo = perfil.strip().casefold()
        lista = [c for c in lista if c.get("tipo", "").casefold().startswith(alvo)
                 or c["username"].rsplit("_", 1)[-1].casefold() == alvo]
    if not lista:
        raise LookupError("Nenhuma conta de agente compatível com o perfil solicitado.")
    return lista[0]


def login(base: str, conta: dict[str, str]) -> str:
    senha = next(conta[k] for k in CHAVES_SENHA if k in conta)
    corpo = json.dumps({"username": conta["username"], "senha": senha, "permanecer_conectado": False}).encode()
    pedido = urllib.request.Request(base.rstrip("/") + "/api/auth/login", data=corpo,
                                    headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(pedido, timeout=30) as resposta:
            cabecalhos = resposta.headers.get_all("Set-Cookie") or []
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"Login recusado ({exc.code}) para a conta de agente; verifique a conta no SIGMA.") from None
    except urllib.error.URLError as exc:
        raise SystemExit(f"Servidor indisponível em {base}: {exc.reason}") from None
    for cabecalho in cabecalhos:
        jar = SimpleCookie()
        jar.load(cabecalho)
        if COOKIE in jar:
            return jar[COOKIE].value
    raise SystemExit("Login sem cookie de sessão na resposta.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--base", default="http://127.0.0.1:8083", help="URL do servidor SICARD")
    parser.add_argument("--perfil", default=None, help="Tipo da conta (ADMIN, GESTOR, ANALISTA...)")
    args = parser.parse_args()
    try:
        conta = selecionar(args.perfil)
    except (FileNotFoundError, LookupError) as exc:
        raise SystemExit(str(exc)) from None
    sys.stdout.write(login(args.base, conta))


if __name__ == "__main__":
    main()
