"""Verifica os artefatos da biblioteca antes de substituir o container ativo."""
import json
from pathlib import Path


def validar() -> None:
    raiz = Path(__file__).resolve().parents[1]
    for relativo in (
        "config/matriz-criterios-premissas-v3.json",
        "data/geoespacial/outputs/normalizacao_favorabilidade_fase2.json",
    ):
        dados = json.loads((raiz / relativo).read_text(encoding="utf-8"))
        if not dados:
            raise ValueError(f"Artefato vazio: {relativo}")
    total = 0
    for pasta in ("mapas_fase2", "mapas_fase2_normalizados"):
        diretorio = raiz / "data/geoespacial/relatorios" / pasta
        manifesto = json.loads((diretorio / "manifesto.json").read_text(encoding="utf-8"))
        if not manifesto.get("imagens"):
            raise ValueError(f"Manifesto sem imagens: {pasta}")
        for imagem in manifesto["imagens"]:
            arquivo = diretorio / imagem["arquivo"]
            with arquivo.open("rb") as entrada:
                if entrada.read(8) != b"\x89PNG\r\n\x1a\n":
                    raise ValueError(f"Mapa PNG ausente ou invalido: {arquivo}")
            total += 1
    print(f"Documentacao da favorabilidade: JSONs validos e {total} mapas PNG verificados")


if __name__ == "__main__":
    validar()
