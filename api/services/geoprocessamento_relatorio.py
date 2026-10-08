"""Relatório de execução persistido para todo geoprocesso.

Até 2026-09-02 o log de nanotarefas existia apenas no dicionário em memória de
``GeoprocessamentoJobs``: ao reiniciar o processo, toda a proveniência da
execução se perdia. Foi assim que os produtos ``identity_*.gpkg`` chegaram ao
acervo sem que fosse possível reconstruir com quais parâmetros, entradas e
versões de biblioteca haviam sido gerados.

Cada job grava um relatório no destino oficial do Sicard Storage,
na pasta da execução, sem cópias permanentes na aplicação.
"""
from __future__ import annotations

import json
import platform
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any

from api.path_policy import PROJECT_ROOT

RELATORIOS_DIRNAME = "data/geoespacial/outputs/relatorios"


def _relativo(caminho: Path) -> str:
    """Relativo à raiz — resolvida em tempo de chamada, não na importação."""
    return caminho.relative_to(PROJECT_ROOT).as_posix()
SIDECAR_SUFFIX = ".relatorio.json"


def _versoes() -> dict[str, str]:
    """Versões das bibliotecas que determinam o resultado geométrico."""
    versoes: dict[str, str] = {"python": platform.python_version(), "sistema": platform.platform()}
    for modulo, rotulo in (
        ("geopandas", "geopandas"), ("shapely", "shapely"),
        ("pyogrio", "pyogrio"), ("rasterio", "rasterio"),
    ):
        try:
            versoes[rotulo] = __import__(modulo).__version__
        except Exception:  # dependência opcional ausente não invalida o relatório
            versoes[rotulo] = "indisponível"
    try:
        from osgeo import gdal

        versoes["gdal"] = gdal.__version__
    except Exception:
        versoes["gdal"] = "indisponível"
    return versoes


def _sha256_arquivo(caminho: Path) -> str | None:
    try:
        digest = sha256()
        with caminho.open("rb") as handle:
            for bloco in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(bloco)
        return digest.hexdigest()
    except OSError:
        return None


def _caminhos_de_saida(resultado: Any) -> list[Path]:
    """Coleta caminhos de arquivo citados no resultado, em qualquer profundidade."""
    encontrados: list[Path] = []

    def visitar(no: Any) -> None:
        if isinstance(no, dict):
            for chave, valor in no.items():
                if chave in {"caminho", "arquivo", "arquivo_biblioteca_canonica"} and isinstance(valor, str):
                    candidato = PROJECT_ROOT / valor
                    if candidato.is_file():
                        encontrados.append(candidato)
                else:
                    visitar(valor)
        elif isinstance(no, list):
            for item in no:
                visitar(item)

    visitar(resultado)
    return list(dict.fromkeys(encontrados))


def construir(job: dict[str, Any]) -> dict[str, Any]:
    """Monta o relatório completo a partir do estado final do job."""
    iniciado = job.get("iniciado_em")
    finalizado = datetime.now(timezone.utc).isoformat()
    duracao = None
    if iniciado:
        try:
            duracao = round(
                (datetime.fromisoformat(finalizado) - datetime.fromisoformat(iniciado)).total_seconds(), 3
            )
        except ValueError:
            duracao = None

    saidas = []
    for caminho in _caminhos_de_saida(job.get("resultado")):
        saidas.append({
            "caminho": _relativo(caminho),
            "bytes": caminho.stat().st_size,
            "sha256": _sha256_arquivo(caminho),
        })
    if job.get('execucao_id'):
        from api.repositories.saidas_geoespaciais_repository import arquivos_execucao
        saidas.extend(arquivos_execucao(job['execucao_id']))

    return {
        "esquema": "slt.geoprocessamento.relatorio/1",
        "job": {
            "id": job.get("id"),
            "tipo": job.get("tipo"),
            "algoritmo_id": job.get("algoritmo_id"),
            "algoritmo": job.get("algoritmo"),
            "status": job.get("status"),
        },
        "tempo": {"iniciado_em": iniciado, "finalizado_em": finalizado, "duracao_s": duracao},
        "parametros": job.get("parametros") or {},
        "entradas": job.get("entradas") or [],
        "progresso": {
            "etapas_concluidas": job.get("concluidas"),
            "etapas_previstas": job.get("total"),
            "percentual": job.get("percentual"),
        },
        "etapas": job.get("logs") or [],
        "resultado": job.get("resultado"),
        "saidas": saidas,
        "erro": job.get("erro"),
        "ambiente": _versoes(),
    }


def salvar(job: dict[str, Any]) -> list[str]:
    """Grava a proveniência no mesmo Storage das camadas e registra a referência."""
    from api.services import ciclo_vida_arquivos as ciclo, saidas_storage
    from api.repositories import saidas_geoespaciais_repository as catalogo
    execution = job.get('execucao_id') or (job.get('resultado') or {}).get('execucao_id')
    own = execution is None
    try:
        if own:
            execution = ciclo.iniciar('relatorio_' + str(job.get('tipo', 'job')),
                                      {'job_id':job.get('id')}, job.get('responsavel'))
        report = construir(job)
        item = saidas_storage.enviar_json(str(execution), 'relatorio_execucao.json', report)
        catalogo.registrar_documento(str(execution), str(job.get('id')), item,
                                     validacao={'json':True,'tipo':'relatorio_execucao'})
        if own:
            ciclo.finalizar(str(execution), job.get('erro'))
        return [item['caminho']]
    except Exception as exc:
        # A falha fica explícita no job; não retorna um falso caminho local.
        job['erro_relatorio'] = str(exc)
        if own and execution:
            try:
                ciclo.finalizar(str(execution), str(exc))
            except Exception:
                pass  # A indisponibilidade do banco não derruba o geoprocesso concluído.
        return []
