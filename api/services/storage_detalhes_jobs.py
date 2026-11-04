"""Totais de bytes em segundo plano, sem abrir nem baixar arquivos do storage."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from pathlib import PurePosixPath
from threading import RLock
from time import monotonic
from uuid import uuid4

from api.services import storage_geoespacial as storage

_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="storage-detalhes")
_lock = RLock()
_jobs = {}
_TTL = 900


def totais(caminho):
    """Uma listagem por diretório; inclui ocultos e arquivos não geoespaciais."""
    resultado = {}
    pilha = [(caminho, False)]
    listagens = {}
    inicio = monotonic()
    while pilha:
        if monotonic() - inicio > 120:
            raise TimeoutError("A consulta de tamanhos excedeu o prazo. Tente novamente.")
        pasta, somar = pilha.pop()
        if not somar:
            itens = storage._listar(pasta, incluir_ocultos=True)
            listagens[pasta] = itens
            pilha.append((pasta, True))
            for item in itens:
                nome = str(item.get("nome") or "")
                if not nome or nome in {".", ".."} or "/" in nome or "\\" in nome:
                    raise ValueError("O storage retornou um nome inválido.")
                if item["pasta"]:
                    pilha.append((f"{pasta}/{nome}", False))
        else:
            total = 0
            for item in listagens.pop(pasta):
                if item["pasta"]:
                    total += resultado[f"{pasta}/{item['nome']}"]
                else:
                    tamanho = item.get("tamanho")
                    if not isinstance(tamanho, int) or tamanho < 0:
                        raise ValueError("O storage não informou o tamanho de todos os arquivos.")
                    total += tamanho
            resultado[pasta] = total
    return resultado


def _snapshot(job):
    return deepcopy({k: v for k, v in job.items() if k not in {"dono", "criado"}})


def obter(ident, dono):
    with _lock:
        job = _jobs.get(ident)
        if not job or job["dono"] != str(dono):
            raise FileNotFoundError("Consulta de tamanhos não encontrada ou expirada.")
        if job["status"] not in {"pendente", "executando"} and monotonic() - job["criado"] > _TTL:
            del _jobs[ident]
            raise FileNotFoundError("Consulta de tamanhos não encontrada ou expirada.")
        return _snapshot(job)


def iniciar(caminho, dono):
    caminho = str(caminho or "").strip().replace("\\", "/").strip("/")
    partes = PurePosixPath(caminho).parts
    if not partes or ".." in partes or partes[0] not in storage.RAIZES_LEITURA:
        raise ValueError("Pasta do storage inválida")
    with _lock:
        for ident, job in list(_jobs.items()):
            if job["status"] not in {"pendente", "executando"} and monotonic() - job["criado"] > _TTL:
                del _jobs[ident]
        ativos = [j for j in _jobs.values() if j["status"] in {"pendente", "executando"}]
        for job in ativos:
            if job["dono"] == str(dono) and job["caminho"] == caminho:
                return _snapshot(job)
        if len(ativos) >= 8 or sum(j["dono"] == str(dono) for j in ativos) >= 2:
            raise ValueError("Há consultas de tamanhos em andamento. Aguarde a conclusão.")
        terminados = sorted((j for j in _jobs.values() if j not in ativos), key=lambda j: j["criado"])
        for job in terminados[:max(0, len(_jobs) - 23)]:
            del _jobs[job["id"]]
        ident = uuid4().hex
        job = dict(id=ident, caminho=caminho, dono=str(dono), criado=monotonic(),
                   status="pendente", resultado=None, erro=None)
        _jobs[ident] = job
        _pool.submit(_executar, job)
        return _snapshot(job)


def _executar(job):
    with _lock:
        job["status"] = "executando"
    try:
        resultado = totais(job["caminho"])
    except Exception:
        with _lock:
            job.update(status="erro", erro="Não foi possível consultar o tamanho total das pastas. Tente novamente.", resultado=None)
    else:
        with _lock:
            job.update(status="concluido", resultado=resultado)
