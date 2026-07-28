import json
import importlib
import mimetypes
import uuid
import socket
import sys
import time
from pathlib import Path
import urllib.request
import urllib.error

ROOT = Path(r"d:\REPOSITORIOS\sistema_apoio_a_tomada_de_decisao_web")
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

BASE = "http://127.0.0.1:8080"
INVENTARIO = (
    ROOT
    / "data"
    / "geoespacial"
    / "relatorios"
    / "inventario_fontes_brutas_fase1.json"
)
LOCAL_BASE = ROOT / "data" / "geoespacial" / "local"
RELATORIO_OUT = (
    ROOT
    / "data"
    / "geoespacial"
    / "relatorios"
    / "importacao_recorte_sp_fase1.json"
)
JOB_ENDPOINT = f"{BASE}/api/geoespacial/importar_camadas/job"
JOB_STATUS_ENDPOINT = f"{BASE}/api/geoespacial/operacoes-jobs/status"

# Camada de máscara identificada no catálogo operacional.
RECORTAR_CAMADA_ID = "camada_80aee0da561d4a9f9f3c337a46bc4807"


def _session_tools() -> tuple[type, callable]:
    module = importlib.import_module("api.services.session_service")
    return module.SessionUser, module.create_token


def build_multipart(
    file_path: Path,
    fields: dict[str, str],
) -> tuple[bytes, str]:
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    parts: list[bytes] = []

    for key, value in fields.items():
        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(
            f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(
                "utf-8"
            )
        )
        parts.append(value.encode("utf-8"))
        parts.append(b"\r\n")

    mime = (
        mimetypes.guess_type(file_path.name)[0]
        or "application/octet-stream"
    )
    content = file_path.read_bytes()
    parts.append(f"--{boundary}\r\n".encode("utf-8"))
    parts.append(
        (
            "Content-Disposition: form-data; name=\"arquivo\"; "
            f"filename=\"{file_path.name}\"\r\n"
            f"Content-Type: {mime}\r\n\r\n"
        ).encode("utf-8")
    )
    parts.append(content)
    parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode("utf-8"))

    body = b"".join(parts)
    content_type = f"multipart/form-data; boundary={boundary}"
    return body, content_type


def _parse_json_or_text(payload: str) -> dict | str:
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return payload


def _payload_text(payload: dict | str | None) -> str:
    if payload is None:
        return ""
    if isinstance(payload, str):
        return payload
    return json.dumps(payload, ensure_ascii=False).lower()


def classify_failure(status: int, phase: str, payload: dict | str | None) -> str:
    text = _payload_text(payload)
    if "camada vetorial sem feições" in text or "sem feições" in text:
        return "camada_sem_feicoes"
    if "execução não encontrada" in text or "execucao nao encontrada" in text:
        return "status_job_indisponivel"
    if "timeout" in text or status == 0:
        return "timeout_processamento"
    if "connection refused" in text or "conexão recusada" in text:
        return "api_indisponivel_conexao_recusada"
    if phase == "submeter_job" and status in {502, 503, 504}:
        return "api_indisponivel"
    if status == 404:
        return "recurso_nao_encontrado"
    if 400 <= status < 500:
        return "erro_validacao_dados"
    if status >= 500:
        return "erro_servidor"
    return "falha_indeterminada"


def get_catalog_directory(cookie: str) -> dict | str:
    req = urllib.request.Request(
        f"{BASE}/api/geoespacial/camadas-diretorio",
        method="GET",
        headers={"Cookie": cookie},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            text = resp.read().decode("utf-8")
            return _parse_json_or_text(text)
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        return {"erro": "http_error", "status": exc.code, "retorno": _parse_json_or_text(text)}
    except (TimeoutError, socket.timeout):
        return {"erro": "timeout_catalogo"}
    except urllib.error.URLError as exc:
        return {"erro": f"url_error: {exc.reason}"}


def summarize_catalog(report: dict, catalog: dict | str) -> dict:
    if not isinstance(catalog, dict) or "erro" in catalog:
        return {"status": "indisponivel", "retorno": catalog}

    rows = []
    for category in ("importadas", "processadas", "homologadas"):
        for row in catalog.get(category, []):
            rows.append({**row, "categoria_catalogo": category})

    by_id = {row.get("id"): row for row in rows if row.get("id")}
    checked = []
    for item in report["success"]:
        payload = item.get("retorno") or {}
        resources = payload.get("recursos") if isinstance(payload, dict) else None
        if not resources and isinstance(payload, dict):
            resource_id = payload.get("camada_id") or payload.get("raster_id")
            resources = [{"id": resource_id}] if resource_id else []
        for resource in resources or []:
            resource_id = resource.get("id")
            row = by_id.get(resource_id)
            checked.append({
                "arquivo": item.get("arquivo"),
                "camada_id": resource_id,
                "nome": resource.get("nome") or (row or {}).get("nome"),
                "tipo": resource.get("tipo") or (row or {}).get("tipo"),
                "pronta_catalogo": row is not None,
                "categoria_catalogo": (row or {}).get("categoria_catalogo"),
            })

    missing = [item for item in checked if not item["pronta_catalogo"]]
    return {
        "status": "ok" if not missing else "pendente",
        "total_catalogo": len(rows),
        "sucessos_conferidos": len(checked),
        "sucessos_prontos": len(checked) - len(missing),
        "sucessos_ausentes": missing,
        "camadas": checked,
    }


def post_import_job(file_path: Path, cookie: str) -> tuple[int, dict | str]:
    fields = {"recortar_camada_id": RECORTAR_CAMADA_ID}
    body, content_type = build_multipart(file_path, fields)
    req = urllib.request.Request(
        JOB_ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Content-Type": content_type,
            "Cookie": cookie,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            text = resp.read().decode("utf-8")
            return resp.status, _parse_json_or_text(text)
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        return exc.code, _parse_json_or_text(text)
    except (TimeoutError, socket.timeout):
        return 0, {"erro": "timeout"}
    except urllib.error.URLError as exc:
        return 0, {"erro": f"url_error: {exc.reason}"}
    except Exception as exc:  # noqa: BLE001
        return 0, {"erro": f"erro_inesperado: {exc}"}


def poll_job(
    job_id: str,
    cookie: str,
    *,
    timeout_seconds: int = 5400,
) -> tuple[int, dict | str]:
    started = time.time()
    sleep_seconds = 2
    transient_errors = 0
    last_payload: dict | str | None = None

    while True:
        if time.time() - started > timeout_seconds:
            return 0, {
                "erro": "timeout_job",
                "job_id": job_id,
                "ultimo_status": last_payload,
            }

        req = urllib.request.Request(
            f"{JOB_STATUS_ENDPOINT}/{job_id}",
            method="GET",
            headers={"Cookie": cookie},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                text = resp.read().decode("utf-8")
                payload = _parse_json_or_text(text)
                last_payload = payload
                if isinstance(payload, dict):
                    status = str(payload.get("status", "")).lower()
                    if status == "concluido":
                        return 200, payload.get("resultado", payload)
                    if status == "erro":
                        return 422, {
                            "erro": payload.get("erro") or "job_erro",
                            "job_id": job_id,
                            "status": payload.get("status"),
                            "etapa_atual": payload.get("etapa_atual"),
                            "logs": payload.get("logs", [])[-5:],
                        }
                transient_errors = 0
        except urllib.error.HTTPError as exc:
            text = exc.read().decode("utf-8", errors="replace")
            parsed = _parse_json_or_text(text)
            if exc.code in {502, 503, 504}:
                transient_errors += 1
            else:
                return exc.code, parsed
        except (TimeoutError, socket.timeout, urllib.error.URLError):
            transient_errors += 1

        if transient_errors > 20:
            return 0, {
                "erro": "falha_rede_polling",
                "job_id": job_id,
                "ultimo_status": last_payload,
            }

        time.sleep(sleep_seconds)
        sleep_seconds = min(8, sleep_seconds + 1)


def main() -> None:
    inv = json.loads(INVENTARIO.read_text(encoding="utf-8"))

    SessionUser, create_token = _session_tools()
    user = SessionUser(
        id="dev-operator",
        email="dev@slt.local",
        username="dev_operador",
        nome="Dev Operador",
        tipo_usuario="OPERADOR",
    )
    token = create_token(user)
    cookie = f"slt_session={token}"

    expected_files: list[Path] = []
    for _, meta in inv.get("fontes", {}).items():
        for arq in meta.get("arquivos", []):
            expected_files.append(LOCAL_BASE / arq["caminho"])

    success = []
    failed = []

    for idx, path in enumerate(expected_files, start=1):
        print(f"[{idx}/{len(expected_files)}] INICIO: {path.name}")
        if not path.exists():
            failed.append(
                {
                    "arquivo": str(path),
                    "status": 0,
                    "erro": "Arquivo não encontrado",
                }
            )
            print(
                f"[{idx}/{len(expected_files)}] FALHA (nao encontrado):"
                f" {path.name}"
            )
            continue
        status_code, payload = post_import_job(path, cookie)
        if not (200 <= status_code < 300):
            failed.append({
                "arquivo": str(path),
                "status": status_code,
                "fase": "submeter_job",
                "causa": classify_failure(status_code, "submeter_job", payload),
                "retorno": payload,
            })
            print(
                f"[{idx}/{len(expected_files)}] FALHA submit"
                f" {status_code}: {path.name}"
            )
            continue

        if not isinstance(payload, dict) or not payload.get("id"):
            failed.append({
                "arquivo": str(path),
                "status": 0,
                "fase": "submeter_job",
                "causa": "resposta_job_sem_id",
                "retorno": {"erro": "resposta_job_sem_id", "payload": payload},
            })
            print(
                f"[{idx}/{len(expected_files)}] FALHA submit sem"
                f" job_id: {path.name}"
            )
            continue

        job_id = str(payload["id"])
        print(f"[{idx}/{len(expected_files)}] JOB {job_id}: {path.name}")

        final_status, final_payload = poll_job(job_id, cookie)
        if 200 <= final_status < 300:
            success.append({
                "arquivo": str(path),
                "status": final_status,
                "fase": "job_concluido",
                "job_id": job_id,
                "retorno": final_payload,
            })
            print(
                f"[{idx}/{len(expected_files)}] OK job"
                f" {job_id}: {path.name}"
            )
        else:
            failed.append({
                "arquivo": str(path),
                "status": final_status,
                "fase": "job_execucao",
                "job_id": job_id,
                "causa": classify_failure(final_status, "job_execucao", final_payload),
                "retorno": final_payload,
            })
            print(
                f"[{idx}/{len(expected_files)}] FALHA job"
                f" {job_id} ({final_status}): {path.name}"
            )

    falhas_por_causa: dict[str, int] = {}
    for item in failed:
        cause = item.get("causa", "falha_indeterminada")
        falhas_por_causa[cause] = falhas_por_causa.get(cause, 0) + 1

    report = {
        "total": len(expected_files),
        "sucesso": len(success),
        "falha": len(failed),
        "recortar_camada_id": RECORTAR_CAMADA_ID,
        "modo_execucao": "importar_camadas/job + polling",
        "falhas_por_causa": falhas_por_causa,
        "success": success,
        "failed": failed,
    }
    report["catalogo_geoespacial"] = summarize_catalog(
        report,
        get_catalog_directory(cookie),
    )
    RELATORIO_OUT.write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print("--- RESUMO ---")
    print("total", report["total"])
    print("sucesso", report["sucesso"])
    print("falha", report["falha"])
    print("falhas_por_causa", report["falhas_por_causa"])
    print("catalogo_geoespacial", report["catalogo_geoespacial"].get("status"))
    print("relatorio", RELATORIO_OUT)


if __name__ == "__main__":
    main()
