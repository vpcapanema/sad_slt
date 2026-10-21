"""Jobs assíncronos com log auditável de nanotarefas efetivamente concluídas."""
from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from threading import Lock
from api.services.progresso_eventos import CanalProgresso
from api.services.feedback_hierarquia import Hierarquia, FINAIS
from typing import Any, Callable
from uuid import uuid4
from contextlib import contextmanager

from api.repositories import camada_geoespacial_repository
from api.services.geoespacial_service import geoespacial_service as geo
from api.services.geoprocessamento_engine import (
    CATALOG,
    REQUIRED_PARAMETERS,
    geoprocessamento_engine,
)
from api.services import geoprocessamento_relatorio, ciclo_vida_arquivos as ciclo
from api.services.geospatial_upload_storage import store_upload
from api.services.importar_camadas_service import importar_camadas


INPUT_KEYS = {
    "camada_id", "camada_id_1", "camada_id_2", "camada_ref_id",
    "raster_id", "camada_mascara_id", "camada_zona_id",
    "camada_pontos_id", "camada_poligono_id", "entrada",
}
NO_PERSISTED_OUTPUT = {"OP-02", "OP-22", "OP-23", "OP-24", "OP-25", "OP-26", "OP-27"}

OUTPUT_FORMATS = {
    "geopackage": ("gpkg", ".gpkg"), "geojson": ("geojson", ".geojson"),
    "shapefile": ("shapefile", ".shp"), "geotiff": ("geotiff", ".tif"),
}


def _input_references(params: dict[str, Any]) -> list[str]:
    references: list[str] = []
    for key, value in params.items():
        if key in {"raster_ids", "camada_ids"} and isinstance(value, list):
            references.extend(str(item) for item in value if item)
        elif key in INPUT_KEYS and isinstance(value, str) and value:
            references.append(value)
    return list(dict.fromkeys(references))


class OperacaoCancelada(Exception):
    pass


class GeoprocessamentoJobs:
    def __init__(self) -> None:
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = Lock()
        self._eventos = {}
        self._hierarquias = {}
        self._executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="gp-job")

    def _new(self, kind: str, tasks: list[str]) -> str:
        job_id = f"job_{uuid4().hex}"
        job = {
            "id": job_id, "tipo": kind, "status": "pendente",
            "microtarefas": tasks, "logs": [], "concluidas": 0,
            "total": len(tasks), "percentual": 0, "progresso_tarefa": None,
            "etapa_atual": None, "tarefa_id": 0, "tarefa_estado": "running", "revisao": 0, "resultado": None, "erro": None,
            "iniciado_em": datetime.now(timezone.utc).isoformat(),
            "parametros": {}, "entradas": [], "relatorio": [],
        }
        with self._lock:
            self._jobs[job_id] = job
            tree = Hierarquia(f"{kind.replace('_', ' ').capitalize()}", job_id)
            tree.status = "pendente"
            tree.task("execucao", "Executar " + kind.replace("_", " "))
            self._hierarquias[job_id] = tree
            job["workflow"] = tree.snapshot()
            self._eventos[job_id] = CanalProgresso()
            self._eventos[job_id].publicar(job)
        return job_id

    def get(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return {**deepcopy(job), 'eventos_url':f'/api/geoespacial/operacoes-jobs/status/{job_id}/eventos'} if job else None

    def eventos(self, job_id):
        with self._lock:
            return self._eventos.get(job_id)

    def _publicar(self, job_id):
        tree = self._hierarquias[job_id]
        if tree.status not in FINAIS:
            tree.status = self._jobs[job_id]["status"]
        self._jobs[job_id]["workflow"] = self._hierarquias[job_id].snapshot()
        canal = self._eventos.get(job_id)
        if canal:
            self._jobs[job_id]['revisao'] += 1
            canal.publicar(self._jobs[job_id])

    def cancel(self, job_id: str, responsavel: str) -> dict[str, Any]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job or job.get('responsavel') != responsavel:
                raise KeyError('Execução não encontrada')
            if job['status'] in FINAIS:
                return deepcopy(job)
            if not job.get('cancelavel'):
                raise ValueError('O algoritmo já iniciou; esta etapa não oferece interrupção segura. Aguarde a conclusão.')
            job['cancelamento_solicitado'] = True
            job['etapa_atual'] = 'Cancelamento solicitado; aguardando a leitura atual terminar'
            self._publicar(job_id)
            return deepcopy(job)

    def _begin_execution(self, job_id):
        with self._lock:
            job = self._jobs[job_id]
            if job.get('cancelamento_solicitado'):
                raise OperacaoCancelada('Execução cancelada antes de iniciar o algoritmo.')
            # Não interromper bibliotecas nativas ou gravações em andamento.
            job['cancelavel'] = False
            self._publicar(job_id)

    def _start(self, job_id: str, label: str) -> None:
        """Mensagem ativa é emitida antes do trabalho; logs registram conclusões."""
        with self._lock:
            job = self._jobs[job_id]
            if job["status"] in FINAIS:
                return
            job.update(etapa_atual=label, progresso_tarefa=None, tarefa_estado="running", status="executando",
                       tarefa_id=job["tarefa_id"] + 1)
            self._hierarquias[job_id].iniciar("execucao", label, job["tarefa_id"])
            self._publicar(job_id)

    def _advance(self, job_id: str, label: str, details: dict[str, Any] | None = None, *, concluir_tarefa: bool = True) -> None:
        with self._lock:
            job = self._jobs[job_id]
            if job["status"] in FINAIS:
                return
            if job.get('cancelamento_solicitado') and job.get('cancelavel'):
                raise OperacaoCancelada('Execução cancelada antes de iniciar o algoritmo.')
            if concluir_tarefa:
                job["concluidas"] = min(job["total"], job["concluidas"] + 1)
                job["percentual"] = round(job["concluidas"] * 100 / job["total"]) if job["total"] else None
                tree = self._hierarquias[job_id]
                op = tree.operations.get(str(job["tarefa_id"]))
                if not op or op["estado"] in FINAIS:
                    job["tarefa_id"] += 1
                    tree.iniciar("execucao", label, job["tarefa_id"])
                tree.terminar(job["tarefa_id"])
                job["etapa_atual"] = None
                job["progresso_tarefa"] = 100
                job["tarefa_estado"] = "concluido"
            job["status"] = "executando"
            job["logs"].append({
                "sequencia": len(job["logs"]) + 1,
                "em": datetime.now(timezone.utc).isoformat(),
                "nivel": "sucesso", "mensagem": label, "detalhes": details or {},
                "tipo": "concluido" if concluir_tarefa else "detalhe", "tarefa_id": job["tarefa_id"],
            })
            self._publicar(job_id)

    def _complete(self, job_id: str, result: dict[str, Any]) -> None:
        partial = result.get("status") in {"parcial", "partial"} or result.get("_status") == "partial"
        if not partial:
            self._advance(job_id, "Processo finalizado")
        with self._lock:
            job = self._jobs[job_id]
            if job["status"] in FINAIS:
                return
            job["status"] = "parcial" if partial else "concluido"
            if not partial:
                job["concluidas"] = job["total"]
                job["percentual"] = 100
                job["progresso_tarefa"] = 100
            job["tarefa_estado"] = job["status"]
            job["resultado"] = result
            tree = self._hierarquias[job_id]
            # Retorno normal confirma o bloco externo; operações internas sem
            # término continuam explicitamente interrompidas, nunca inferidas.
            if partial:
                tree.terminar(job["tarefa_id"], "parcial")
            tree.terminar_task("execucao", job["status"])
            tree.encerrar(job["status"])
            job["cancelavel"] = False
            self._publicar(job_id)
            snapshot = deepcopy(job)
        job["relatorio"] = geoprocessamento_relatorio.salvar(snapshot)
        if snapshot.get('erro_relatorio'):
            job['erro_relatorio'] = snapshot['erro_relatorio']

    def _fail(self, job_id: str, exc: Exception) -> None:
        with self._lock:
            job = self._jobs[job_id]
            if job["status"] in FINAIS:
                return
            job["status"] = "cancelado" if isinstance(exc, OperacaoCancelada) else "erro"
            job["erro"] = str(exc)
            job["tarefa_estado"] = job["status"]
            self._hierarquias[job_id].encerrar(job["status"])
            job["cancelavel"] = False
            job["etapa_atual"] = "Processo interrompido"
            job["logs"].append({
                "sequencia": len(job["logs"]) + 1,
                "em": datetime.now(timezone.utc).isoformat(),
                "nivel": "erro", "mensagem": str(exc), "detalhes": {},
            })
            self._publicar(job_id)
            snapshot = deepcopy(job)
        job["relatorio"] = geoprocessamento_relatorio.salvar(snapshot)
        if snapshot.get('erro_relatorio'):
            job['erro_relatorio'] = snapshot['erro_relatorio']

    def create(self, operation_id: str, params: dict[str, Any], responsavel: str | None = None) -> dict[str, Any]:
        op_id = operation_id.upper()
        if op_id not in CATALOG:
            raise ValueError(f"Algoritmo {op_id} não catalogado")
        required = sorted(REQUIRED_PARAMETERS.get(op_id, set()))
        inputs = _input_references(params)
        tasks = ["Solicitação registrada", "Algoritmo localizado no catálogo"]
        tasks += [f"Parâmetro {name} validado" for name in required]
        tasks.append("Parâmetros normalizados")
        for index in range(len(inputs)):
            tasks += [
                f"Entrada {index + 1} localizada no catálogo",
                f"Conteúdo da entrada {index + 1} carregado",
                f"Tipo da entrada {index + 1} conferido",
            ]
        tasks += ["Executor selecionado", "Núcleo do algoritmo concluído", "Retorno interpretado"]
        if op_id not in NO_PERSISTED_OUTPUT:
            tasks += ["Identificador da saída obtido", "Saída consultada no banco", "Persistência da saída confirmada"]
        tasks += ["Catálogo atualizado", "Resultado sincronizado", "Processo finalizado"]
        execution_id = ciclo.iniciar(op_id, params, responsavel)
        job_id = self._new("operacao", tasks)
        with self._lock:
            job = self._jobs[job_id]
            job["cancelavel"] = True
            job["responsavel"] = responsavel
            job["algoritmo_id"] = op_id
            job["algoritmo"] = CATALOG[op_id]
            job["parametros"] = deepcopy(params)
            job["entradas"] = list(inputs)
            job["execucao_id"] = execution_id
        self._advance(job_id, "Solicitação registrada")
        self._executor.submit(self._run_operation, job_id, op_id, deepcopy(params), inputs, required)
        return self.get(job_id) or {}

    def _run_operation(
        self, job_id: str, op_id: str, params: dict[str, Any],
        inputs: list[str], required: list[str],
    ) -> None:
        execution_id = self.get(job_id)["execucao_id"]
        token = ciclo.execucao_atual.set(execution_id)
        try:
            self._advance(job_id, f"Algoritmo localizado no catálogo: {CATALOG[op_id]}")
            for name in required:
                if name not in params or params[name] in (None, ""):
                    raise ValueError(f"Parâmetro obrigatório ausente: {name}")
                self._advance(job_id, f"Parâmetro obrigatório validado: {name}")
            normalized = deepcopy(params)
            self._advance(job_id, "Parâmetros copiados e normalizados")
            for index, reference in enumerate(inputs, start=1):
                self._start(job_id, f"Localizando a entrada {index} no catálogo")
                metadata = asyncio.run(geo.obter_recurso(reference))
                if metadata is None:
                    raise ValueError(f"Entrada {reference} não encontrada")
                self._advance(job_id, f"Entrada {index} localizada no catálogo", {"id": reference})
                self._start(job_id, f"Lendo o conteúdo da entrada {index}")
                if metadata["tipo"] == "raster":
                    content = geo.obter_raster_dados(reference)
                else:
                    content = geo.obter_camada_dados(reference)
                self._advance(job_id, f"Conteúdo da entrada {index} carregado")
                if content is None:
                    raise ValueError(f"Conteúdo da entrada {reference} indisponível")
                self._advance(job_id, f"Tipo da entrada {index} conferido: {metadata['tipo']}")
            self._advance(job_id, "Executor assíncrono selecionado")
            callback: Callable[[str], None] = lambda label: self._append_dynamic(job_id, label)
            self._begin_execution(job_id)
            self._start(job_id, f"Executando algoritmo: {CATALOG[op_id]}")
            result = asyncio.run(geoprocessamento_engine.execute(op_id, normalized, progress=callback))
            self._advance(job_id, f"Núcleo concluído: {CATALOG[op_id]}")
            if not isinstance(result, dict):
                raise TypeError("O algoritmo não retornou um objeto de resultado")
            self._advance(job_id, "Objeto de retorno interpretado")
            resource_id = result.get("camada_id") or result.get("raster_id")
            destination_value = normalized.get("destino")
            destination = str(destination_value).lower() if destination_value else "catalogo"
            if destination not in {"memoria", "storage", "catalogo"}:
                raise ValueError("Destino deve ser memoria ou storage")
            result["destino"] = destination
            if resource_id and destination == "storage" and not result.get("arquivo_saida"):
                requested_format = str(normalized.get("formato_saida", "")).lower()
                if requested_format not in OUTPUT_FORMATS:
                    raise ValueError("Formato de saída incompatível com storage")
                storage_format, extension = OUTPUT_FORMATS[requested_format]
                output_name = Path(str(normalized.get("nome_saida") or CATALOG[op_id])).stem + extension
                output_crs = str(normalized.get("crs_saida") or "entrada")
                self._start(job_id, "Salvando a camada de saída no storage")
                result["arquivo_saida"] = asyncio.run(geo.salvar_camada(
                    resource_id, normalized.get("pasta_saida") or "data/geoespacial/outputs", output_name,
                    "auto" if output_crs == "entrada" else output_crs, storage_format,
                ))
                self._append_dynamic(job_id, "Resultado gravado no storage")
            elif resource_id and destination == "memoria":
                result["formato_saida"] = "JSON"
                if resource_id not in inputs:
                    if resource_id in geo._metadados:
                        geo._metadados[resource_id]["destino"] = "temporario"
                    result["persistencia"] = "temporario_registrado"
                    self._append_dynamic(job_id, "Resultado temporário registrado com arquivo recuperável")
            if op_id not in NO_PERSISTED_OUTPUT:
                if not resource_id:
                    raise RuntimeError("A operação não retornou identificador de saída")
                self._advance(job_id, "Identificador da saída obtido", {"id": resource_id})
                self._start(job_id, "Consultando a camada de saída no banco")
                persisted = asyncio.run(geo.obter_recurso(resource_id))
                self._advance(job_id, "Saída consultada no banco")
                if persisted is None:
                    raise RuntimeError("A saída não foi encontrada no catálogo persistente")
                if persisted.get("caminho_arquivo"):
                    result["arquivo_resultado"] = {"caminho": persisted["caminho_arquivo"]}
                self._advance(job_id, "Persistência da saída confirmada")
            self._start(job_id, "Atualizando o catálogo de camadas")
            catalog = asyncio.run(geo.listar_recursos())
            self._advance(job_id, "Catálogo de camadas atualizado", {"itens": len(catalog)})
            if resource_id and op_id not in NO_PERSISTED_OUTPUT and not any(item["id"] == resource_id for item in catalog):
                raise RuntimeError("A saída não foi sincronizada no catálogo")
            self._advance(job_id, "Resultado sincronizado com o catálogo")
            result["execucao_id"] = execution_id
            self._complete(job_id, result)
            if resource_id:
                from api.db.connection import get_connection
                with get_connection() as conn:
                    ciclo.registrar_uso(conn, resource_id, "relatorio", job_id)
            ciclo.finalizar(execution_id, temporario=destination == "memoria")
        except Exception as exc:
            ciclo.finalizar(execution_id, erro=type(exc).__name__)
            self._fail(job_id, exc)
        finally:
            ciclo.execucao_atual.reset(token)

    def _append_dynamic(self, job_id: str, label: str) -> None:
        """Callback textual não prova descoberta nem conclusão de trabalho."""
        self._advance(job_id, label, concluir_tarefa=False)

    def create_model(self, definition: dict[str, Any], kind: str, inputs: dict[str, Any], responsavel: str) -> dict[str, Any]:
        """A interrupção ocorre entre etapas; uma gravação iniciada pode concluir."""
        execution_id = ciclo.iniciar(f"modelo_{kind}", {"modelo_id": definition["id"], "entradas": inputs}, responsavel)
        job_id = self._new("modelo", ["Modelo registrado", "Etapas do modelo", "Processo finalizado"])
        with self._lock:
            self._jobs[job_id].update(responsavel=responsavel, cancelavel=True,
                modelo_id=definition["id"], execucao_id=execution_id, parametros=deepcopy(inputs), resultados_parciais=[])
        self._executor.submit(self._run_model, job_id, deepcopy(definition), kind, deepcopy(inputs))
        return self.get(job_id) or {}

    def _run_model(self, job_id, definition, kind, inputs):
        execution_id = self.get(job_id)["execucao_id"]
        token = ciclo.execucao_atual.set(execution_id)
        def checkpoint():
            with self._lock:
                if self._jobs[job_id].get("cancelamento_solicitado"):
                    raise OperacaoCancelada("Modelo cancelado entre etapas. As saídas já concluídas foram preservadas.")

        def completed(result):
            with self._lock:
                self._jobs[job_id]["resultados_parciais"].append(deepcopy(result))
                self._publicar(job_id)

        @contextmanager
        def operation(step):
            with self._lock:
                tree = self._hierarquias[job_id]
                task = tree.task(f"passo-{len(tree.tasks)}", step.get("nome") or step["algoritmo_id"])
                ident = tree.iniciar(task, f"Executar {step['algoritmo_id']}", f"modelo-{len(tree.operations)}")
                self._publicar(job_id)
            try:
                yield
            except Exception:
                with self._lock:
                    tree.terminar(ident, "erro")
                    tree.terminar_task(task, "erro")
                    self._publicar(job_id)
                raise
            else:
                with self._lock:
                    tree.terminar(ident)
                    tree.terminar_task(task)
                    self._publicar(job_id)

        try:
            defaults = {item["chave"]: item.get("valor")
                        for item in definition.get("variaveis", []) + definition.get("parametros_expostos", [])
                        if item.get("chave") and item.get("valor") not in (None, "")}
            checkpoint()
            self._start(job_id, "Executando modelo; o cancelamento aguarda a etapa atual terminar")
            result = asyncio.run(geoprocessamento_engine.run_steps(
                definition.get("passos" if kind == "funcao" else "itens", []),
                {**defaults, **inputs}, checkpoint=checkpoint, on_result=completed, on_operation=operation))
            checkpoint()
            result["execucao_id"] = execution_id
            ciclo.finalizar(execution_id)
            self._complete(job_id, result)
        except Exception as exc:
            try:
                ciclo.finalizar(execution_id, erro=type(exc).__name__)
            finally:
                self._fail(job_id, exc)
        finally:
            ciclo.execucao_atual.reset(token)

    def create_import(self, filename: str, content: bytes) -> dict[str, Any]:
        name = Path(filename or "camada").name
        digest = sha256(content).hexdigest()
        existing = camada_geoespacial_repository.obter_importada_por_hash(digest)
        service_tasks = 0
        tasks = [
            "Upload recebido", "Nome de arquivo validado", "Conteúdo binário medido",
            "Hash SHA-256 calculado", "Catálogo de importações consultado",
        ]
        if existing:
            tasks += ["Importação existente recuperada", "Resposta preparada", "Processo finalizado"]
        else:
            tasks += ["Diretório de upload preparado", "Arquivo relativo persistido", "Formato identificado"]
            tasks += [f"Nanotarefa do importador {index + 1}" for index in range(service_tasks)]
            tasks += ["Identificador importado obtido", "Persistência confirmada", "Catálogo sincronizado", "Processo finalizado"]
        job_id = self._new("importacao", tasks)
        self._advance(job_id, "Upload recebido", {"bytes": len(content)})
        self._advance(job_id, "Nome de arquivo validado", {"arquivo": name})
        self._advance(job_id, "Conteúdo binário medido", {"bytes": len(content)})
        self._advance(job_id, "Hash SHA-256 calculado", {"sha256": digest})
        self._advance(job_id, "Catálogo de importações consultado")
        self._executor.submit(self._run_import, job_id, name, content, digest, existing)
        return self.get(job_id) or {}

    def create_validated_import(
        self, filename: str | None, content: bytes | None, *, target_crs: str | None = None,
        clip_layer_id: str | None = None, inspection_token: str | None = None,
        pasta: str | None = None,
    ) -> dict[str, Any]:
        tasks = ["Solicitação de importação registrada", "Pipeline transacional iniciado", "Processo finalizado"]
        job_id = self._new("importacao_validada", tasks)
        self._advance(job_id, "Solicitação de importação registrada", {"arquivo": filename or "inspeção prévia"})
        self._executor.submit(
            self._run_validated_import, job_id, filename, content, target_crs,
            clip_layer_id, inspection_token, pasta,
        )
        return self.get(job_id) or {}

    def _run_validated_import(
        self, job_id: str, filename: str | None, content: bytes | None,
        target_crs: str | None, clip_layer_id: str | None, inspection_token: str | None,
        pasta: str | None = None,
    ) -> None:
        try:
            self._advance(job_id, "Pipeline transacional de importação iniciado")
            callback: Callable[[str], None] = lambda label: self._append_dynamic(job_id, label)
            self._start(job_id, "Importando e validando a camada")
            result = asyncio.run(importar_camadas(
                filename, content, target_crs=target_crs, clip_layer_id=clip_layer_id,
                inspection_token=inspection_token, pasta=pasta, progress=callback,
            ))
            self._complete(job_id, result)
        except Exception as exc:
            self._fail(job_id, exc)

    def create_storage_upload(
        self, inspection_token: str, raiz: str | None, *, target_crs: str | None = None,
        clip_layer_id: str | None = None,
    ) -> dict[str, Any]:
        """Envia ao storage o arquivo já inspecionado, na pasta escolhida no upload."""
        tasks = ["Solicitação de upload registrada", "Envio ao storage iniciado", "Processo finalizado"]
        job_id = self._new("upload_storage", tasks)
        self._advance(job_id, "Solicitação de upload registrada", {"pasta": raiz})
        self._executor.submit(self._run_storage_upload, job_id, inspection_token, raiz,
                              target_crs, clip_layer_id)
        return self.get(job_id) or {}

    def _run_storage_upload(
        self, job_id: str, inspection_token: str, raiz: str | None,
        target_crs: str | None, clip_layer_id: str | None,
    ) -> None:
        from api.services.upload_storage import enviar_ao_storage
        try:
            self._advance(job_id, "Envio ao storage do SICARD iniciado")
            callback: Callable[[str], None] = lambda label: self._append_dynamic(job_id, label)
            self._start(job_id, "Enviando o arquivo ao storage")
            result = enviar_ao_storage(inspection_token, raiz, target_crs=target_crs,
                                       clip_layer_id=clip_layer_id, progress=callback)
            self._complete(job_id, result)
        except Exception as exc:
            self._fail(job_id, exc)

    def _run_import(
        self, job_id: str, name: str, content: bytes, digest: str,
        existing: dict[str, Any] | None,
    ) -> None:
        try:
            if existing:
                self._advance(job_id, "Importação existente recuperada sem duplicação")
                key = "raster_id" if existing["tipo"] == "raster" else "camada_id"
                result = {key: existing["recurso_sessao_id"], "nome": existing["nome"],
                          "tipo": existing["tipo"], "crs": existing.get("crs"), "reutilizada": True}
                self._advance(job_id, "Resposta da importação idempotente preparada")
                self._complete(job_id, result)
                return
            self._start(job_id, "Salvando o arquivo de entrada")
            stored = store_upload(name, content)
            self._advance(job_id, f"Diretório datastorage/{stored.category} preparado")
            self._advance(job_id, "Arquivo original preservado no armazenamento categorizado")
            relative = stored.relative_import_path
            self._advance(job_id, f"Formato identificado: {stored.category}")
            callback: Callable[[str], None] = lambda label: self._append_dynamic(job_id, label)
            self._start(job_id, "Importando o conteúdo geoespacial")
            if stored.category == "raster":
                result = asyncio.run(geo.importar_raster(relative, digest, progress=callback))
            else:
                result = asyncio.run(geo.importar_camada("local", relative, hash_arquivo=digest, progress=callback))
            result.update({
                "categoria_armazenamento": stored.category,
                "arquivo_original": stored.relative_original_path,
                "arquivo_compactado": stored.archive,
            })
            resource_id = result.get("camada_id") or result.get("raster_id")
            self._advance(job_id, "Identificador do recurso importado obtido", {"id": resource_id})
            if not any(item.get("recurso_sessao_id") == resource_id for item in camada_geoespacial_repository.listar()):
                raise RuntimeError("Recurso importado não foi encontrado no banco")
            self._advance(job_id, "Persistência física da importação confirmada")
            self._start(job_id, "Atualizando o catálogo de camadas")
            catalog = asyncio.run(geo.listar_recursos())
            self._advance(job_id, "Catálogo sincronizado após importação", {"itens": len(catalog)})
            self._complete(job_id, result)
        except Exception as exc:
            self._fail(job_id, exc)

    def create_load(self, resource_id: str) -> dict[str, Any]:
        tasks = ["Solicitação registrada", "Tipo conferido",
                 "Resposta preparada", "Catálogo sincronizado", "Processo finalizado"]
        job_id = self._new("carregamento", tasks)
        self._advance(job_id, "Solicitação de carregamento registrada", {"id": resource_id})
        self._executor.submit(self._run_load, job_id, resource_id)
        return self.get(job_id) or {}

    def _run_load(self, job_id: str, resource_id: str) -> None:
        try:
            callback: Callable[[str], None] = lambda label: self._advance(job_id, label, concluir_tarefa=False)
            self._start(job_id, "Carregando o recurso geoespacial")
            result = asyncio.run(geo.carregar_recurso(resource_id, progress=callback))
            self._advance(job_id, f"Tipo de conteúdo conferido: {result['tipo']}")
            self._advance(job_id, "Resposta de carregamento preparada")
            self._start(job_id, "Sincronizando o catálogo de camadas")
            asyncio.run(geo.listar_recursos())
            self._advance(job_id, "Catálogo da sessão sincronizado")
            self._complete(job_id, result)
        except Exception as exc:
            self._fail(job_id, exc)

    def create_homologation(self, resource_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        raise ValueError('Homologação de camadas descontinuada. Utilize o catálogo de saídas no Storage.')


geoprocessamento_jobs = GeoprocessamentoJobs()
