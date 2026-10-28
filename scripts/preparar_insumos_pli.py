"""Prepara bases existentes para a FAP, sem calcular ou homologar criterios.

Sem --publicar, valida a configuracao e as fontes locais, sem escrita remota.
Com --publicar, publica novas camadas e um manifesto em pasta exclusiva no Storage.
"""
from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import sys
import uuid
import zipfile
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from api import config  # noqa: F401
from api.services import storage_remoto
from osgeo import gdal, ogr

gdal.UseExceptions()
ogr.UseExceptions()

CONFIG = ROOT / "config" / "insumos-pli-fap.json"
NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}


def ler_criterios(documento: Path) -> list[dict[str, str]]:
    with zipfile.ZipFile(documento) as archive:
        tree = ElementTree.fromstring(archive.read("ppt/slides/slide2.xml"))
    rows = []
    for row in tree.findall(".//a:tr", NS)[1:]:
        cells = [
            " ".join(node.text or "" for node in cell.findall(".//a:t", NS))
            for cell in row.findall("a:tc", NS)
        ]
        if len(cells) != 6:
            raise ValueError("Estrutura da tabela da FAP mudou.")
        rows.append(dict(zip(
            ("dimensao", "indicador", "variaveis_documento", "origem", "natureza", "oes"),
            cells,
        )))
    if len(rows) != 17:
        raise ValueError("Esperados 17 criterios na tabela da FAP.")
    return rows


def carregar() -> tuple[dict, list[dict]]:
    definition = json.loads(CONFIG.read_text(encoding="utf-8"))
    rows = ler_criterios(ROOT / definition["documento"])
    codes = {row["indicador"].split()[0] for row in rows}
    if codes != set(definition["criterios"]):
        raise ValueError("Criterios da configuracao divergem da apresentacao.")
    variables = {f"V{i:02}" for i in range(1, 33)} | {"REL"}
    associated = {v for values in definition["criterios"].values() for v in values}
    if associated != variables - {"V07"}:
        raise ValueError("Cobertura de variaveis da FAP divergente.")
    ids = set()
    for item in definition["insumos"]:
        if item["id"] in ids:
            raise ValueError(f"Insumo repetido: {item['id']}")
        ids.add(item["id"])
        if ("local" in item) == ("storage" in item):
            raise ValueError(f"Origem ambigua: {item['id']}")
        if not set(item["variaveis"]) <= variables:
            raise ValueError(f"Variavel desconhecida: {item['id']}")
        if "local" in item and not (ROOT / item["local"]).is_file():
            raise FileNotFoundError(item["local"])
    return definition, rows


def descrever(dataset: gdal.Dataset) -> list[dict]:
    result = []
    for layer in dataset:
        crs = layer.GetSpatialRef()
        if crs is None:
            raise ValueError(f"Camada sem sistema de coordenadas: {layer.GetName()}")
        fields = [
            {"nome": field.GetName(), "tipo": field.GetTypeName()}
            for field in layer.schema
        ]
        nulls = empty = invalid = 0
        for feature in layer:
            geometry = feature.GetGeometryRef()
            if geometry is None:
                nulls += 1
            elif geometry.IsEmpty():
                empty += 1
            elif not geometry.IsValid():
                invalid += 1
        count = layer.GetFeatureCount()
        if count <= 0:
            raise ValueError(f"Camada vazia: {layer.GetName()}")
        result.append({
            "camada": layer.GetName(), "feicoes": count,
            "crs": crs.ExportToWkt(), "epsg": crs.GetAuthorityCode(None),
            "extensao": list(layer.GetExtent()), "campos": fields,
            "geometrias_nulas": nulls, "geometrias_vazias": empty,
            "geometrias_invalidas": invalid,
        })
    if not result:
        raise ValueError("Fonte sem camadas vetoriais.")
    return result


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def conferir_remoto(path: str, data: bytes) -> dict:
    remote = storage_remoto.baixar(path)
    digest = hashlib.sha256(data).hexdigest()
    if len(remote) != len(data) or hashlib.sha256(remote).hexdigest() != digest:
        raise RuntimeError(f"Integridade remota divergente: {path}")
    return {"bytes": len(data), "sha256": digest}


def preparar_local(item: dict, clip: str) -> tuple[bytes, list[dict], list[dict]]:
    path = ROOT / item["local"]
    options = [f"ENCODING={item['encoding']}"] if item.get("encoding") else []
    source = gdal.OpenEx(str(path), gdal.OF_VECTOR, open_options=options)
    if source is None or any(layer.GetSpatialRef() is None for layer in source):
        raise ValueError(f"Fonte sem sistema de coordenadas: {path}")
    companions = sorted(path.parent.glob(path.stem + ".*")) if path.suffix == ".shp" else [path]
    provenance = [
        {"arquivo": str(p.relative_to(ROOT)), "bytes": p.stat().st_size,
         "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
        for p in companions if p.is_file()
    ]
    output = f"/vsimem/pli-{uuid.uuid4().hex}.gpkg"
    try:
        with gdal.OpenEx(clip, gdal.OF_VECTOR) as boundary:
            boundary_layer = boundary.GetLayer(0)
            xmin, xmax, ymin, ymax = boundary_layer.GetExtent()
            boundary_crs = boundary_layer.GetSpatialRef().ExportToWkt()
        result = gdal.VectorTranslate(
            output, source, format="GPKG", dstSRS="EPSG:4674",
            clipSrc=clip, layerName="resultado",
            spatFilter=(xmin, ymin, xmax, ymax), spatSRS=boundary_crs,
            geometryType="PROMOTE_TO_MULTI",
            layerCreationOptions=["SPATIAL_INDEX=YES"],
        )
        if result is None:
            raise RuntimeError(f"Conversao falhou: {item['id']}")
        result = None
        with gdal.OpenEx(output, gdal.OF_VECTOR) as reopened:
            metadata = descrever(reopened)
        data = bytes(gdal.VSIGetMemFileBuffer_unsafe(output))
        return data, metadata, provenance
    finally:
        gdal.Unlink(output)


def manifesto_variaveis(definition: dict, assets: list[dict]) -> list[dict]:
    result = []
    for number in range(1, 33):
        code = f"V{number:02}"
        linked = [a["id"] for a in assets if code in a["variaveis"]]
        result.append({
            "variavel": code,
            "criterios": [key for key, values in definition["criterios"].items() if code in values],
            "insumos": linked,
            "situacao": "insumos_de_apoio_disponiveis" if linked else "sem_insumo_preparado",
            "valor_fap_calculado": False,
            "observacao": (
                "Somente faseamento." if code == "V02" else
                "Calculada no D-16; fora da ponderacao." if code == "V07" else
                "Compartilhada por I2 e R1." if code == "V28" else ""
            ),
        })
    return result


def publicar(definition: dict, rows: list[dict]) -> dict:
    parent = "aplicacao/insumos-pli-fap"
    try:
        storage_remoto.listar(parent, estrito=True)
    except FileNotFoundError:
        storage_remoto.criar_pasta(parent)
    folder = f"{parent}/{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}-{uuid.uuid4().hex[:12]}"
    storage_remoto.criar_pasta(folder)
    print(f"DESTINO {folder}", flush=True)
    clip = f"/vsimem/pli-limite-{uuid.uuid4().hex}.gpkg"
    clip_bytes = storage_remoto.baixar("base-geoespacial/vetor/uf_sp.gpkg")
    gdal.FileFromMemBuffer(clip, clip_bytes)
    assets = []
    try:
        for item in definition["insumos"]:
            asset = dict(item)
            if "local" in item:
                data, metadata, provenance = preparar_local(item, clip)
                target = f"{folder}/camadas/{item['id']}.gpkg"
                storage_remoto.enviar_bytes(target, data)
                asset.update(conferir_remoto(target, data))
                asset.update(storage=target, camadas=metadata, procedencia=provenance,
                             tratamento="Recorte pelo limite SP do acervo e reprojecao EPSG:4674; atributos preservados; sem calculo FAP.")
            else:
                data = storage_remoto.baixar(item["storage"])
                mem = f"/vsimem/pli-fonte-{uuid.uuid4().hex}.gpkg"
                try:
                    gdal.FileFromMemBuffer(mem, data)
                    with gdal.OpenEx(mem, gdal.OF_VECTOR) as dataset:
                        asset["camadas"] = descrever(dataset)
                finally:
                    gdal.Unlink(mem)
                asset.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest(),
                             tratamento="Referencia a base existente, sem copia ou alteracao.")
            assets.append(asset)
            print(f"CONFERIDO {item['id']}: {sum(layer['feicoes'] for layer in asset['camadas'])} feicoes", flush=True)
    finally:
        gdal.Unlink(clip)
    variables = manifesto_variaveis(definition, assets)
    manifest = {
        "versao": 1, "criado_em": datetime.now(timezone.utc).isoformat(),
        "diretorio_storage": folder,
        "documento": definition["documento"],
        "documento_sha256": hashlib.sha256((ROOT / definition["documento"]).read_bytes()).hexdigest(),
        "configuracao_sha256": hashlib.sha256(CONFIG.read_bytes()).hexdigest(),
        "finalidade": "Insumos para calculos futuros; nenhum criterio ou valor FAP calculado ou homologado.",
        "limite_recorte": {"storage": "base-geoespacial/vetor/uf_sp.gpkg",
                           "sha256": hashlib.sha256(clip_bytes).hexdigest()},
        "criterios": [{**row, "codigo": row["indicador"].split()[0],
                       "variaveis": definition["criterios"][row["indicador"].split()[0]]} for row in rows],
        "variaveis": variables, "insumos": assets,
        "pendencias": definition["pendencias"],
        "REL": "Sigla presente na fonte, sem definicao no documento; nenhum dado associado por suposicao.",
    }
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(["variavel", "criterios", "insumos", "situacao", "valor_fap_calculado", "observacao"])
    for row in variables:
        writer.writerow([row["variavel"], ",".join(row["criterios"]), ",".join(row["insumos"]),
                         row["situacao"], False, row["observacao"]])
    csv_data = buffer.getvalue().encode("utf-8-sig")
    storage_remoto.enviar_bytes(f"{folder}/variaveis.csv", csv_data)
    conferir_remoto(f"{folder}/variaveis.csv", csv_data)
    data = json_bytes(manifest)
    storage_remoto.enviar_bytes(f"{folder}/manifesto.json", data)
    conferir_remoto(f"{folder}/manifesto.json", data)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--publicar", action="store_true")
    parser.add_argument("--manifesto", type=Path)
    args = parser.parse_args()
    definition, rows = carregar()
    if args.publicar:
        result = publicar(definition, rows)
        if args.manifesto:
            args.manifesto.parent.mkdir(parents=True, exist_ok=True)
            args.manifesto.write_bytes(json_bytes(result))
        print(json.dumps({"diretorio_storage": result["diretorio_storage"],
                          "insumos": len(result["insumos"]),
                          "variaveis_com_insumos": sum(bool(v["insumos"]) for v in result["variaveis"])},
                         ensure_ascii=False))
    else:
        for item in definition["insumos"]:
            if "local" in item:
                options = [f"ENCODING={item['encoding']}"] if item.get("encoding") else []
                with gdal.OpenEx(str(ROOT / item["local"]), gdal.OF_VECTOR, open_options=options) as dataset:
                    print(item["id"], json.dumps(descrever(dataset), ensure_ascii=False))
        print(f"Configuracao validada: {len(rows)} criterios, {len(definition['insumos'])} insumos.")
