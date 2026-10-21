"""Publica somente dependências do HTML autorizado, sem alterar a origem."""
from __future__ import annotations

import argparse
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api import config  # noqa: F401 — carrega as credenciais existentes.
from api.services import storage_remoto


class Catalogo(HTMLParser):
    def __init__(self):
        super().__init__()
        self.arquivos = set()
        self.tutoriais = []
        self.atual = None
        self.campo = None
        self.footer = False
        self.ressalvas = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "article":
            self.atual = {"titulo": "", "revisao": "", "duracao": ""}
            self.tutoriais.append(self.atual)
        if tag == "footer":
            self.footer = True
        if tag == "h2":
            self.campo = "titulo"
        elif tag == "small":
            self.campo = "revisao"
        elif tag == "span" and self.atual is not None:
            self.campo = "duracao"
        elif tag == "p" and self.footer:
            self.ressalvas.append("")
            self.campo = "ressalva"
        for attribute in ("src", "poster", "href"):
            value = attrs.get(attribute, "")
            name = urlsplit(value).path
            if name and "/" not in name and "\\" not in name:
                self.arquivos.add(name)
                if tag == "video" and self.atual is not None:
                    self.atual["capa" if attribute == "poster" else "video"] = name

    def handle_endtag(self, tag):
        if tag in {"h2", "small", "span", "p"}:
            self.campo = None
        if tag == "article":
            self.atual = None

    def handle_data(self, data):
        if self.campo == "ressalva":
            self.ressalvas[-1] += data
        elif self.atual is not None and self.campo:
            self.atual[self.campo] += data


def preparar(origem: Path):
    html = (origem / "index.html").read_bytes()
    catalogo = Catalogo()
    catalogo.feed(html.decode("utf-8"))
    if len(catalogo.tutoriais) != 16 or len(catalogo.arquivos) != 50:
        raise ValueError("A fonte mudou: esperado HTML com 16 tutoriais e 50 dependências.")
    arquivos = {nome: (origem / nome).read_bytes() for nome in sorted(catalogo.arquivos)}
    for tutorial in catalogo.tutoriais:
        base = Path(tutorial["video"]).stem
        tutorial["srt"] = base + ".srt"
        tutorial["vtt"] = base + ".vtt"
        tutorial["revisao"] = tutorial["revisao"].strip().removeprefix("·").strip()
        # O vídeo já tem legendas gravadas; VTT opcional deriva fielmente do SRT.
        srt = arquivos[tutorial["srt"]].decode("utf-8-sig").replace("\r\n", "\n")
        vtt = "WEBVTT\n\n" + re.sub(r"(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", srt)
        arquivos[tutorial["vtt"]] = vtt.encode("utf-8")
    manifest = {
        "versao": 1,
        "conteudo_publico": True,
        "origem": "TUTORIAIS_MAD_FULLHD/index.html",
        "origem_html_sha256": sha256(html).hexdigest(),
        "origem_html_bytes": len(html),
        "tutoriais": catalogo.tutoriais,
        "ressalvas": catalogo.ressalvas,
        "arquivos": {
            nome: {"bytes": len(dados), "sha256": sha256(dados).hexdigest()}
            for nome, dados in sorted(arquivos.items())
        },
    }
    identidade = sha256(json.dumps(manifest, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    manifest["diretorio_storage"] = f"aplicacao/documentacao/tutoriais/20261021-{identidade[:16]}"
    return manifest, arquivos


def publicar(origem: Path, destino_manifest: Path):
    manifest, arquivos = preparar(origem)
    pasta = manifest["diretorio_storage"]
    try:
        storage_remoto.listar(pasta, estrito=True)
    except FileNotFoundError:
        pass
    else:
        raise RuntimeError("Destino já existe; publicação abortada para não sobrescrever arquivos.")
    # O diretório exclusivo deve ser criado antes de qualquer arquivo.
    storage_remoto.criar_pasta(pasta)
    for nome, dados in arquivos.items():
        storage_remoto.enviar_bytes(f"{pasta}/{nome}", dados)
    dados_manifest = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
    storage_remoto.enviar_bytes(f"{pasta}/manifesto.json", dados_manifest)
    esperados = {**arquivos, "manifesto.json": dados_manifest}
    listagem = storage_remoto.listar(pasta, estrito=True)
    if {item["nome"]: item["tamanho"] for item in listagem} != {
        nome: len(dados) for nome, dados in esperados.items()
    }:
        raise RuntimeError("Listagem remota diverge da publicação.")
    for nome, dados in esperados.items():
        remoto = storage_remoto.baixar(f"{pasta}/{nome}")
        if len(remoto) != len(dados) or sha256(remoto).digest() != sha256(dados).digest():
            raise RuntimeError(f"Integridade remota divergente: {nome}")
    destino_manifest.write_bytes(dados_manifest)
    print(json.dumps({
        "diretorio_storage": pasta,
        "arquivos": len(esperados),
        "bytes": sum(map(len, esperados.values())),
        "dependencias_originais_bytes": sum(len(arquivos[n]) for n in arquivos if not n.endswith(".vtt")),
        "manifesto_sha256": sha256(dados_manifest).hexdigest(),
        "validacao": "listagem, tamanho e SHA-256 de todos os arquivos remotos",
    }, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--origem", type=Path, required=True)
    parser.add_argument("--manifesto", type=Path, required=True)
    args = parser.parse_args()
    publicar(args.origem, args.manifesto)
