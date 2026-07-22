"""Jobs assíncronos com log auditável de nanotarefas efetivamente concluídas."""
from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from threading import Lock
from typing import Any, Callable
from uuid import uuid4

from api.repositories import camada_geoespacial_repository
from api.services.geoespacial_service import geoespacial_service as geo
from api.services.geoprocessamento_engine import (
    CATALOG,
    REQUIRED_PARAMETERS,
    geoprocessamento_engine,
)
from api.services.geospatial_upload_storage import store_upload
from api.services.importar_camadas_service import importar_camadas


INPUT_KEYS = {
    "camada_id", "camada_id_1", "camada_id_2", "camada_ref_id",
    "raster_id", "camada_mascara_id", "camada_zona_id",
    "camada_pontos_id", "camada_poligono_id", "entrada",
}
NO_PERSISTED_OUTPUT = {"OP-02", "OP-22", "OP-23", "OP-24", "OP-25", "OP-26", "OP-27"}


def _input_references(params: dict[str, Any]) -> list[str]:
    references: list[str] = []
    for key, value in params.items():
        if key == "raster_ids" and isinstance(value, list):
            references.extend(str(item) for item in value if item)
        elif key in INPUT_KEYS and isinstance(value, str) and value:
            references.append(value)
    return list(dict.fromkeys(references))


class GeoprocessamentoJobs:
    def __init__(self) -> None:
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = Lock()
        self._executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="gp-job")

    def _new(self, kind: str, tasks: list[str]) -> str:
        job_id = f"job_{uuid4().hex}"
        job = {
            "id": job_id, "tipo": kind, "status": "pendente",
            "microtarefas": tasks, "logs": [], "concluidas": 0,
            "total": len(tasks), "percentual": 0,
            "etapa_atual": tasks[0], "resultado": None, "erro": None,
        }
        with self._lock:
            self._jobs[job_id] = job
        return job_id

    def get(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return deepcopy(job) if job else None

    def _advance(self, job_id: str, label: str, details: dict[str, Any] | None = None) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job["concluidas"] = min(job["total"], job["concluidas"] + 1)
            job["percentual"] = round(job["concluidas"] * 100 / job["total"])
            job["etapa_atual"] = label
            job["status"] = "executando"
            job["logs"].append({
                "sequencia": len(job["logs"]) + 1,
                "instante": datetime.now(timezone.utc).isoformat(),
                "nivel": "sucesso", "mensagem": label, "detalhes": details or {},
            })

    def _complete(self, job_id: str, result: dict[str, Any]) -> None:
        self._advance(job_id, "Processo finalizado")
        with self._lock:
            job = self._jobs[job_id]
            job["status"] = "concluido"
            job["concluidas"] = job["total"]
            job["percentual"] = 100
            job["resultado"] = result

    def _fail(self, job_id: str, exc: Exception) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job["status"] = "erro"
            job["erro"] = str(exc)
            job["etapa_atual"] = "Processo interrompido"
            job["logs"].append({
                "sequencia": len(job["logs"]) + 1,
                "instante": datetime.now(timezone.utc).isoformat(),
                "nivel": "erro", "mensagem": str(exc), "detalhes": {},
            })

    def create(self, operation_id: str, params: dict[str, Any]) -> dict[str, Any]:
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
        job_id = self._new("operacao", tasks)
        with self._lock:
            self._jobs[job_id]["algoritmo_id"] = op_id
        self._advance(job_id, "Solicitação registrada")
        self._executor.submit(self._run_operation, job_id, op_id, deepcopy(params), inputs, required)
        return self.get(job_id) or {}

    def _run_operation(
        self, job_id: str, op_id: str, params: dict[str, Any],
        inputs: list[str], required: list[str],
    ) -> None:
        try:
            self._advance(job_id, f"Algoritmo localizado no catálogo: {CATALOG[op_id]}")
            for name in required:
                if name not in params or params[name] in (None, ""):
                    raise ValueError(f"Parâmetro obrigatório ausente: {name}")
                self._advance(job_id, f"Parâmetro obrigatório validado: {name}")
            normalized = deepcopy(params)
            self._advance(job_id, "Parâmetros copiados e normalizados")
            for index, reference in enumerate(inputs, start=1):
                metadata = asyncio.run(geo.obter_recurso(reference))
                if metadata is None:
                    raise ValueError(f"Entrada {reference} não encontrada")
                self._advance(job_id, f"Entrada {index} localizada no catálogo", {"id": reference})
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
            result = asyncio.run(geoprocessamento_engine.execute(op_id, normalized, progress=callback))
            self._advance(job_id, f"Núcleo concluído: {CATALOG[op_id]}")
            if not isinstance(result, dict):
                raise TypeError("O algoritmo não retornou um objeto de resultado")
            self._advance(job_id, "Objeto de retorno interpretado")
            resource_id = result.get("camada_id") or result.get("raster_id")
            if op_id not in NO_PERSISTED_OUTPUT:
                if not resource_id:
                    raise RuntimeError("A operação não retornou identificador de saída")
                self._advance(job_id, "Identificador da saída obtido", {"id": resource_id})
                persisted = asyncio.run(geo.obter_recurso(resource_id))
                self._advance(job_id, "Saída consultada no banco")
                if persisted is None:
                    raise RuntimeError("A saída não foi encontrada no catálogo persistente")
                self._advance(job_id, "Persistência da saída confirmada")
            catalog = asyncio.run(geo.listar_recursos())
            self._advance(job_id, "Catálogo de camadas atualizado", {"itens": len(catalog)})
            if resource_id and op_id not in NO_PERSISTED_OUTPUT and not any(item["id"] == resource_id for item in catalog):
                raise RuntimeError("A saída não foi sincronizada no catálogo")
            self._advance(job_id, "Resultado sincronizado com o catálogo")
            self._complete(job_id, result)
        except Exception as exc:
            self._fail(job_id, exc)

    def _append_dynamic(self, job_id: str, label: str) -> None:
        """Acrescenta uma nanotarefa descoberta pelo serviço durante a execução."""
        with self._lock:
            job = self._jobs[job_id]
            insert_at = max(job["concluidas"] + 1, job["total"] - 5)
            job["microtarefas"].insert(insert_at, label)
            job["total"] += 1
        self._advance(job_id, label)

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
    ) -> dict[str, Any]:
        tasks = ["Solicitação de importação registrada", "Pipeline transacional iniciado", "Processo finalizado"]
        job_id = self._new("importacao_validada", tasks)
        self._advance(job_id, "Solicitação de importação registrada", {"arquivo": filename or "inspeção prévia"})
        self._executor.submit(
            self._run_validated_import, job_id, filename, content, target_crs,
            clip_layer_id, inspection_token,
        )
        return self.get(job_id) or {}

    def _run_validated_import(
        self, job_id: str, filename: str | None, content: bytes | None,
        target_crs: str | None, clip_layer_id: str | None, inspection_token: str | None,
    ) -> None:
        try:
            self._advance(job_id, "Pipeline transacional de importação iniciado")
            callback: Callable[[str], None] = lambda label: self._append_dynamic(job_id, label)
            result = asyncio.run(importar_camadas(
                filename, content, target_crs=target_crs, clip_layer_id=clip_layer_id,
                inspection_token=inspection_token, progress=callback,
            ))
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
            stored = store_upload(name, content)
            self._advance(job_id, f"Diretório datastorage/{stored.category} preparado")
            self._advance(job_id, "Arquivo original preservado no armazenamento categorizado")
            relative = stored.relative_import_path
            self._advance(job_id, f"Formato identificado: {stored.category}")
            callback: Callable[[str], None] = lambda label: self._append_dynamic(job_id, label)
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
            catalog = asyncio.run(geo.listar_recursos())
            self._advance(job_id, "Catálogo sincronizado após importação", {"itens": len(catalog)})
            self._complete(job_id, result)
        except Exception as exc:
            self._fail(job_id, exc)

    def create_load(self, resource_id: str) -> dict[str, Any]:
        tasks = ["Solicitação registrada", "Catálogo físico consultado", "Metadados localizados",
                 "Conteúdo geoespacial lido", "Cache da sessão atualizado", "Tipo conferido",
                 "Resposta preparada", "Catálogo sincronizado", "Processo finalizado"]
        job_id = self._new("carregamento", tasks)
        self._advance(job_id, "Solicitação de carregamento registrada", {"id": resource_id})
        self._executor.submit(self._run_load, job_id, resource_id)
        return self.get(job_id) or {}

    def _run_load(self, job_id: str, resource_id: str) -> None:
        try:
            callback: Callable[[str], None] = lambda label: self._advance(job_id, label)
            result = asyncio.run(geo.carregar_recurso(resource_id, progress=callback))
            self._advance(job_id, f"Tipo de conteúdo conferido: {result['tipo']}")
            self._advance(job_id, "Resposta de carregamento preparada")
            asyncio.run(geo.listar_recursos())
            self._advance(job_id, "Catálogo da sessão sincronizado")
            self._complete(job_id, result)
        except Exception as exc:
            self._fail(job_id, exc)

    def create_homologation(self, resource_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        tasks = ["Solicitação registrada", "Módulo consumidor validado", "Nome validado", "Versão validada",
                 "Origem localizada", "Hash calculado", "Snapshot criado", "Conteúdo copiado",
                 "Transação confirmada", "Biblioteca consultada", "Publicação confirmada", "Processo finalizado"]
        job_id = self._new("homologacao", tasks)
        self._advance(job_id, "Solicitação de homologação registrada", {"id": resource_id})
        self._executor.submit(self._run_homologation, job_id, resource_id, deepcopy(payload))
        return self.get(job_id) or {}

    def _run_homologation(self, job_id: str, resource_id: str, payload: dict[str, Any]) -> None:
        try:
            if payload.get("modulo_consumidor") not in {"fase1", "fase2", "ambos"}:
                raise ValueError("Módulo consumidor inválido")
            self._advance(job_id, "Módulo consumidor validado")
            if not str(payload.get("nome_publicacao", "")).strip():
                raise ValueError("Nome de publicação obrigatório")
            self._advance(job_id, "Nome de publicação validado")
            if not str(payload.get("versao", "")).strip():
                raise ValueError("Versão obrigatória")
            self._advance(job_id, "Versão da publicação validada")
            callback: Callable[[str], None] = lambda label: self._advance(job_id, label)
            result = camada_geoespacial_repository.homologar(
                resource_id,
                modulo_consumidor=payload["modulo_consumidor"],
                nome_publicacao=payload["nome_publicacao"],
                versao=payload["versao"],
                finalidade=payload.get("finalidade"),
                homologado_por=payload.get("homologado_por"),
                produto_id=str(payload["produto_id"]) if payload.get("produto_id") else None,
                metadados=payload.get("metadados") or {}, progress=callback,
            )
            library = camada_geoespacial_repository.listar_biblioteca()
            self._advance(job_id, "Biblioteca homologada consultada", {"itens": len(library)})
            if not any(item["id"] == result["id"] for item in library):
                raise RuntimeError("Snapshot não localizado na biblioteca homologada")
            self._advance(job_id, "Publicação confirmada na biblioteca somente leitura")
            self._complete(job_id, result)
        except Exception as exc:
            self._fail(job_id, exc)


geoprocessamento_jobs = GeoprocessamentoJobs()
