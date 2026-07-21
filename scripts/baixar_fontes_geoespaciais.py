"""Baixa as bases oficiais usadas pelos critérios e as entrega em Shapefile.

Não gera critérios, pesos ou superfícies. Cada saída é uma base-fonte.
"""
from __future__ import annotations

import json
import shutil
import tempfile
import zipfile
from datetime import UTC, datetime
from pathlib import Path


from construir_biblioteca_canonica import (
    ROOT,
    SOURCES,
    checksum,
    download_source,
    read_validated,
    safe_shapefile_columns,
)


DESTINO = ROOT / "data" / "geoespacial" / "local"
RELATORIO = DESTINO / "inventario_fontes.json"


def empacotar_shapefile(chave: str, frame) -> Path:
    saida = DESTINO / f"{chave}.zip"
    with tempfile.TemporaryDirectory(prefix=f"sicard_{chave}_") as temp:
        pasta = Path(temp)
        arquivo = pasta / f"{chave}.shp"
        copia = frame.copy()
        # O driver Shapefile exige um único tipo simples por camada.
        # Explodir multipartes preserva todos os componentes geométricos.
        if copia.geometry.geom_type.str.startswith("Multi").any():
            copia = copia.explode(index_parts=False, ignore_index=True)
        # Shapefile limita nomes a 10 caracteres; mantém os atributos da fonte.
        usados: set[str] = {"geometry"}
        renomear: dict[str, str] = {}
        for coluna in copia.columns:
            if coluna == "geometry":
                continue
            base = str(coluna).lower().replace(" ", "_")[:10] or "campo"
            nome = base
            indice = 1
            while nome in usados:
                sufixo = str(indice)
                nome = f"{base[:10-len(sufixo)]}{sufixo}"
                indice += 1
            usados.add(nome)
            renomear[coluna] = nome
        copia = copia.rename(columns=renomear)
        copia.to_file(arquivo, driver="ESRI Shapefile", encoding="UTF-8")
        temporario = saida.with_suffix(".zip.part")
        with zipfile.ZipFile(temporario, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as pacote:
            for item in sorted(pasta.iterdir()):
                pacote.write(item, item.name)
        temporario.replace(saida)
    return saida


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    inventario = {
        "gerado_em": datetime.now(UTC).isoformat(),
        "finalidade": "Bases-fonte oficiais; não contém critérios ou superfícies derivados.",
        "fontes": {},
    }
    for chave, fonte in SOURCES.items():
        print(f"[{chave}] baixando {fonte.organization}", flush=True)
        try:
            original = download_source(fonte)
            frame, validacao = read_validated(original)
            pacote = empacotar_shapefile(chave, frame)
            inventario["fontes"][chave] = {
                "status": "disponivel",
                "titulo": fonte.title,
                "orgao": fonte.organization,
                "url_oficial": fonte.url,
                "arquivo_shapefile": pacote.name,
                "sha256": checksum(pacote),
                **validacao,
            }
            print(f"[{chave}] OK: {pacote.name} ({len(frame)} feições)", flush=True)
        except Exception as erro:
            inventario["fontes"][chave] = {
                "status": "erro",
                "titulo": fonte.title,
                "orgao": fonte.organization,
                "url_oficial": fonte.url,
                "erro": str(erro),
            }
            print(f"[{chave}] ERRO: {erro}", flush=True)
        RELATORIO.write_text(json.dumps(inventario, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Inventário: {RELATORIO}", flush=True)


if __name__ == "__main__":
    main()
