"""Baixa os arquivos-fonte brutos da biblioteca canônica da Fase 1.

Este script SOMENTE baixa e salva as respostas dos serviços oficiais. Ele não
extrai arquivos, não converte formatos, não reprojeta dados e não gera critérios
ou superfícies. Os arquivos brutos são gravados em ``data/geoespacial/local``.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import time
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DESTINO = ROOT / "data" / "geoespacial" / "local"
RELATORIO = ROOT / "data" / "geoespacial" / "relatorios" / "inventario_fontes_brutas_fase1.json"
SP_BBOX = (-53.2, -25.5, -44.0, -19.7)
USER_AGENT = "SICARD-SLT/1.0 (download de fontes geoespaciais oficiais)"

ARCGIS = "https://pamgia.ibama.gov.br/server/rest/services"
DATAGEO = "https://datageo.ambiente.sp.gov.br/geoserver/datageo/ows"


@dataclass(frozen=True)
class Fonte:
    id: str
    titulo: str
    orgao: str
    tipo: str
    url: str
    camadas: tuple[str, ...] = ()


# Doze bases abertas atendem dezessete dos 23 critérios canônicos. Os seis
# critérios restantes não possuem publicação geoespacial aberta confirmada e,
# portanto, não recebem arquivo ou geometria inventada.
FONTES = (
    Fonte("ucs_mma", "Unidades de Conservação — CNUC/MMA", "MMA/IBAMA", "arcgis", f"{ARCGIS}/BasesSincronizadas/lim_unidades_conserva%C3%A7%C3%A3o_mma_a/FeatureServer/0"),
    Fonte("vegetacao_sp", "Inventário Florestal 2020", "IPA/SEMIL — DataGEO", "wfs", DATAGEO, ("datageo:InventarioFlorestal2020",)),
    Fonte("aprm_sp", "APRM — subáreas e zoneamentos", "SEMIL — DataGEO", "wfs", DATAGEO, (
        "datageo:APRMATC_SUBAREAS_2015_POL", "datageo:APRMAJ_ZONEAMENTO_10_SMA_2015_POL",
        "datageo:APRMB_SMA2010", "datageo:APRMG_SMA2007",
    )),
    Fonte("cavidades", "Cavidades naturais", "CECAV/ICMBio — DataGEO", "wfs", DATAGEO, ("datageo:CavidadesCecav",)),
    Fonte("terras_indigenas", "Terras Indígenas", "FUNAI", "wfs", "https://geoserver.funai.gov.br/geoserver/Funai/ows", ("Funai:tis_poligonais",)),
    Fonte("quilombos", "Territórios Quilombolas", "INCRA", "direto", "https://certificacao.incra.gov.br/csv_shp/zip/%C3%81reas%20de%20Quilombolas.zip"),
    Fonte("contaminadas", "Áreas Contaminadas e Reabilitadas", "CETESB/SEMIL — DataGEO", "wfs", DATAGEO, ("datageo:VWM_AREAS_CONTAMINADAS_GEODADOS_CETESB_PTO",)),
    Fonte("inundacao", "Áreas de risco de inundação", "Instituto Geológico/SEMIL — DataGEO", "wfs", DATAGEO, ("datageo:VWM_AREA_RISCO_INUNDACAO_IG_2014_POL",)),
    Fonte("movimento_massa", "Áreas de risco de escorregamento", "Instituto Geológico/SEMIL — DataGEO", "wfs", DATAGEO, ("datageo:VWM_AREA_RISCO_ESCORREGAMENTO_IG_2014_POL",)),
    Fonte("sitios_arqueologicos", "Sítios arqueológicos", "IPHAN/SEMIL — DataGEO", "wfs", DATAGEO, ("datageo:SitiosArqueologicos",)),
    Fonte("assentamentos", "Assentamentos", "INCRA", "direto", "https://certificacao.incra.gov.br/csv_shp/zip/Assentamento%20Brasil.zip"),
    Fonte("embargos_ibama", "Embargos ambientais federais", "IBAMA — PAMGIA/SISCOM", "arcgis", f"{ARCGIS}/01_Publicacoes_Bases/embargos_siscom_brasil/FeatureServer/2"),
)

CRITERIOS_SEM_FONTE_ABERTA = (
    "zona de amortecimento de UC estadual",
    "zona de amortecimento de UC federal",
    "faixa de domínio ou servidão de infraestrutura",
    "embargo ambiental estadual ativo",
    "interdição ativa da CETESB",
    "bens materiais tombados do IPHAN (serviço público apenas para consulta; sem exportação Shapefile)",
)


def sha256(arquivo: Path) -> str:
    digest = hashlib.sha256()
    with arquivo.open("rb") as stream:
        for bloco in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(bloco)
    return digest.hexdigest()


def baixar_bytes(url: str, destino: Path, *, tentativas: int = 4, force: bool = False) -> Path:
    if destino.is_file() and destino.stat().st_size and not force:
        return destino
    destino.parent.mkdir(parents=True, exist_ok=True)
    parcial = destino.with_suffix(destino.suffix + ".part")
    parcial.unlink(missing_ok=True)
    ultimo_erro: Exception | None = None
    url = urllib.parse.quote(url, safe=":/?&=%[]@!$'()*+,;")
    for tentativa in range(1, tentativas + 1):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "identity"})
            with urllib.request.urlopen(request, timeout=1800) as response, parcial.open("wb") as output:
                while bloco := response.read(1024 * 1024):
                    output.write(bloco)
            if not parcial.stat().st_size:
                raise RuntimeError("A fonte retornou um arquivo vazio")
            parcial.replace(destino)
            return destino
        except Exception as erro:
            ultimo_erro = erro
            parcial.unlink(missing_ok=True)
            if tentativa < tentativas:
                time.sleep(2 ** (tentativa - 1))
    raise RuntimeError(f"Download falhou após {tentativas} tentativas: {ultimo_erro}")


def validar_bruto(arquivo: Path) -> None:
    if arquivo.suffix.lower() == ".zip":
        with zipfile.ZipFile(arquivo) as pacote:
            corrompido = pacote.testzip()
            if corrompido:
                raise RuntimeError(f"ZIP corrompido na entrada {corrompido}")
    elif arquivo.suffix.lower() in {".json", ".geojson"}:
        with arquivo.open("rb") as stream:
            json.load(stream)


def baixar_zip(url: str, destino: Path, *, force: bool) -> Path:
    arquivo = baixar_bytes(url, destino, force=force)
    try:
        validar_bruto(arquivo)
    except (zipfile.BadZipFile, RuntimeError):
        arquivo.unlink(missing_ok=True)
        arquivo = baixar_bytes(url, destino, force=True)
        validar_bruto(arquivo)
    return arquivo


def url_com_parametros(url: str, parametros: dict[str, Any]) -> str:
    return f"{url}{'&' if '?' in url else '?'}{urllib.parse.urlencode(parametros)}"


def postar_formulario_json(url: str, parametros: dict[str, Any], *, tentativas: int = 4) -> dict[str, Any]:
    corpo = urllib.parse.urlencode(parametros).encode("utf-8")
    ultimo_erro: Exception | None = None
    for tentativa in range(1, tentativas + 1):
        try:
            request = urllib.request.Request(
                url, data=corpo,
                headers={"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"},
            )
            with urllib.request.urlopen(request, timeout=1800) as response:
                resultado = json.loads(response.read())
            if "error" in resultado:
                raise RuntimeError(resultado["error"].get("message", str(resultado["error"])))
            return resultado
        except Exception as erro:
            ultimo_erro = erro
            if tentativa < tentativas:
                time.sleep(2 ** (tentativa - 1))
    raise RuntimeError(f"Solicitação de exportação falhou: {ultimo_erro}")


def baixar_wfs(fonte: Fonte, *, force: bool) -> list[Path]:
    arquivos: list[Path] = []
    pasta = DESTINO / fonte.id
    for camada in fonte.camadas:
        nome = camada.split(":", 1)[-1]
        url = url_com_parametros(fonte.url, {
            "service": "WFS", "version": "1.0.0", "request": "GetFeature",
            "typeName": camada, "outputFormat": "SHAPE-ZIP",
            "bbox": ",".join(map(str, SP_BBOX)) + ",EPSG:4674",
        })
        arquivo = baixar_zip(url, pasta / f"{nome}.zip", force=force)
        arquivos.append(arquivo)
    return arquivos


def baixar_direto(fonte: Fonte, *, force: bool) -> list[Path]:
    arquivo = baixar_zip(fonte.url, DESTINO / fonte.id / f"{fonte.id}.zip", force=force)
    return [arquivo]


def baixar_arcgis(fonte: Fonte, *, force: bool) -> list[Path]:
    pasta = DESTINO / fonte.id
    destino = pasta / f"{fonte.id}.zip"
    if destino.is_file() and destino.stat().st_size and not force:
        validar_bruto(destino)
        return [destino]

    servico = fonte.url.rsplit("/", 1)[0]
    camada = fonte.url.rsplit("/", 1)[1]
    resposta = postar_formulario_json(f"{servico}/createReplica", {
        "f": "json", "replicaName": f"sicard_{fonte.id}_{int(time.time())}",
        "layers": camada, "geometry": ",".join(map(str, SP_BBOX)),
        "geometryType": "esriGeometryEnvelope", "inSR": "4674",
        "transportType": "esriTransportTypeUrl", "returnAttachments": "false",
        "async": "false", "syncModel": "none", "dataFormat": "shapefile",
    })
    download_url = resposta.get("URL") or resposta.get("url")
    if not download_url:
        raise RuntimeError("O serviço ArcGIS não retornou o pacote Shapefile exportado")
    arquivo = baixar_zip(str(download_url), destino, force=True)
    return [arquivo]


def main() -> int:
    parser = argparse.ArgumentParser(description="Baixa somente as fontes geoespaciais brutas da Fase 1")
    parser.add_argument("--force", action="store_true", help="baixa novamente arquivos que já existem")
    parser.add_argument("--fonte", action="append", choices=[fonte.id for fonte in FONTES], help="limita o download a uma fonte; pode ser repetido")
    args = parser.parse_args()

    DESTINO.mkdir(parents=True, exist_ok=True)
    # Remove somente resíduos de downloads interrompidos cujo ZIP final já existe.
    for parcial in DESTINO.rglob("*.part"):
        final = Path(str(parcial)[:-5])
        if final.is_file():
            parcial.unlink(missing_ok=True)
    selecionadas = [fonte for fonte in FONTES if not args.fonte or fonte.id in args.fonte]
    inventario: dict[str, Any] = {
        "gerado_em": datetime.now(UTC).isoformat(),
        "diretorio_fontes_brutas": str(DESTINO),
        "processamento_aplicado": "nenhum",
        "fontes": {},
        "criterios_sem_publicacao_geoespacial_aberta_confirmada": list(CRITERIOS_SEM_FONTE_ABERTA),
    }
    houve_erro = False
    for fonte in selecionadas:
        print(f"[{fonte.id}] {fonte.orgao} — {fonte.titulo}", flush=True)
        try:
            if fonte.tipo == "wfs":
                arquivos = baixar_wfs(fonte, force=args.force)
            elif fonte.tipo == "direto":
                arquivos = baixar_direto(fonte, force=args.force)
            else:
                arquivos = baixar_arcgis(fonte, force=args.force)
            inventario["fontes"][fonte.id] = {
                "status": "baixada", "titulo": fonte.titulo, "orgao": fonte.orgao,
                "url_oficial": fonte.url,
                "arquivos": [{"caminho": str(item.relative_to(DESTINO)), "bytes": item.stat().st_size, "sha256": sha256(item)} for item in arquivos],
            }
            print(f"  OK — {len(arquivos)} arquivo(s) bruto(s)", flush=True)
        except Exception as erro:
            houve_erro = True
            inventario["fontes"][fonte.id] = {"status": "erro", "titulo": fonte.titulo, "orgao": fonte.orgao, "url_oficial": fonte.url, "erro": str(erro)}
            print(f"  ERRO — {erro}", flush=True)

    RELATORIO.parent.mkdir(parents=True, exist_ok=True)
    RELATORIO.write_text(json.dumps(inventario, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Relatório: {RELATORIO}", flush=True)
    return 1 if houve_erro else 0


if __name__ == "__main__":
    raise SystemExit(main())
