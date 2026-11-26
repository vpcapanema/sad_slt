"""Associação extraordinária para um único julgamento público, configurada na implantação."""

import json
import math
import os
import re
import unicodedata
from collections import Counter
from hashlib import sha256
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import Lock

from api.exceptions import DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as repo
from api.repositories import divulgacao_ahp_repository as destinatarios
from api.services import ahp_engine


_GRAVACAO = Lock()
_MODOS_ORIGEM = {"todos", "dimensoes", "por_grupo"}


def disponivel(ambiente: dict) -> bool:
    return bool(
        os.getenv("SICARD_AHP_ASSOCIACAO_ARQUIVO")
        and str(ambiente.get("id")) == os.getenv("SICARD_AHP_ASSOCIACAO_JULGAMENTO")
        and ambiente.get("modo_participacao") == "publico"
        and ambiente.get("modo_comparacao") == "duas_etapas"
    )


def _arquivo() -> Path:
    return Path(os.environ["SICARD_AHP_ASSOCIACAO_ARQUIVO"])


def _ler(ambiente: dict) -> dict:
    try:
        dados = json.loads(_arquivo().read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as exc:
        raise _erro("O SICARD não conseguiu ler as associações deste julgamento.") from exc
    if not isinstance(dados, dict) or dados.get("julgamento") != str(ambiente["id"]) or not isinstance(dados.get("vinculos"), dict):
        raise _erro("O arquivo de associações não corresponde a este julgamento.")
    return dados["vinculos"]


def _gravar(ambiente: dict, vinculos: dict) -> None:
    caminho = _arquivo()
    temporario = None
    try:
        with NamedTemporaryFile(dir=caminho.parent, mode="w", encoding="utf-8", delete=False) as arquivo:
            temporario = Path(arquivo.name)
            json.dump({"julgamento": str(ambiente["id"]), "vinculos": vinculos}, arquivo, ensure_ascii=False)
            arquivo.flush()
            os.fsync(arquivo.fileno())
        temporario.replace(caminho)
    except OSError as exc:
        raise _erro("O SICARD não conseguiu gravar as associações. Confira a pasta configurada no servidor.") from exc
    finally:
        if temporario is not None:
            temporario.unlink(missing_ok=True)


def _erro(mensagem: str) -> DemandaValidationError:
    return DemandaValidationError(mensagem, field="associacao_dimensoes")


def _chave(nome: str) -> str:
    normalizado = " ".join(unicodedata.normalize("NFC", nome).casefold().split())
    return re.sub(r"^d[0-9]+ ?· ?", "", normalizado)


def _assinatura(dados) -> str:
    return sha256(json.dumps(dados, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def vinculo(ambiente: dict, email: str) -> dict | None:
    return _ler(ambiente).get(email) if disponivel(ambiente) else None


def emails_associados(ambiente: dict) -> set[str]:
    return set(_ler(ambiente)) if disponivel(ambiente) else set()


def origens(ambiente: dict) -> list[dict]:
    if not disponivel(ambiente):
        raise _erro("A associação extraordinária está indisponível para este julgamento.")
    return [
        {"id": str(item["id"]), "nome": item.get("nome") or str(item["id"])}
        for item in repo.list_ambientes()
        if item["id"] != ambiente["id"] and item.get("modo_comparacao", "todos") in _MODOS_ORIGEM
    ]


def _nomes_origem(origem: dict, resposta: dict) -> list[str]:
    from api.services.comparacao_colaborativa_service import _criterio_nomes, _criterios_resposta

    return _criterio_nomes(_criterios_resposta(origem, resposta))


def _correspondencias(nomes_origem: list[str], nomes_destino: list[str]) -> list[dict]:
    por_nome: dict[str, list[int]] = {}
    for indice, nome in enumerate(nomes_origem):
        por_nome.setdefault(_chave(nome), []).append(indice)
    chaves = Counter(_chave(nome) for nome in nomes_destino)
    pares = []
    for nome in nomes_destino:
        chave = _chave(nome)
        indices = por_nome.get(chave, [])
        if chave and len(indices) == 1 and chaves[chave] == 1:
            pares.append({"destino": nome, "origem": nomes_origem[indices[0]], "indice": indices[0], "problema": None})
        else:
            problema = "Nome ambíguo" if indices else "Sem critério de mesmo nome"
            pares.append({"destino": nome, "origem": None, "indice": None, "problema": problema})
    return pares


def _dados_dimensoes(origem: dict, resposta: dict, dimensoes: list[str]) -> tuple[dict, str]:
    from api.services.comparacao_colaborativa_service import _validar_matriz_pareada

    nomes = _nomes_origem(origem, resposta)
    pares = _correspondencias(nomes, dimensoes)
    if len(dimensoes) < 2 or len(nomes) != len(dimensoes) or any(par["problema"] for par in pares):
        raise _erro("Os critérios da resposta antiga não correspondem a todas as dimensões atuais.")
    matriz_origem = resposta.get("matriz_comparacao") or []
    if not isinstance(matriz_origem, list) or any(
        not isinstance(linha, list) or any(type(valor) not in {int, float} for valor in linha)
        for linha in matriz_origem
    ):
        raise _erro("A resposta antiga não tem uma matriz completa de intensidades.")
    _validar_matriz_pareada(matriz_origem, len(nomes))
    ordem = [par["indice"] for par in pares]
    matriz = [[matriz_origem[i][j] for j in ordem] for i in ordem]
    resultado = ahp_engine.analyze_matrix(matriz)
    if not math.isfinite(resultado["CR"]) or resultado["CR"] >= 0.10:
        raise _erro("A resposta antiga tem razão de consistência igual ou superior a 0,10.")
    assinatura = _assinatura([nomes, dimensoes, matriz_origem])
    return {"dimensoes": dimensoes, "matriz": matriz, "resultado": resultado}, assinatura


def dimensoes_para_envio(referencia: dict, email: str, dimensoes: list[str]) -> dict:
    origem = repo.get_ambiente_by_id(referencia["origem"])
    resposta = repo.get_resposta_by_ambiente_email(referencia["origem"], email) if origem else None
    if not resposta or str(resposta["id"]) != referencia["resposta"] or resposta.get("status", "enviada") != "enviada":
        raise _erro("A resposta anterior vinculada pelo gestor está indisponível. Informe o responsável pelo julgamento.")
    dados, assinatura = _dados_dimensoes(origem, resposta, dimensoes)
    if assinatura != referencia["assinatura"]:
        raise _erro("As comparações vinculadas foram alteradas. Informe o responsável pelo julgamento.")
    return dados


def _prever(ambiente: dict, origem_id: str, destino: str, emails: list[str], existentes: dict) -> tuple[dict, dict]:
    from api.services.comparacao_colaborativa_service import _criterio_nomes, _grupos_comparacao

    origem = repo.get_ambiente_by_id(origem_id)
    if not origem or origem_id == str(ambiente["id"]) or origem.get("modo_comparacao", "todos") not in _MODOS_ORIGEM:
        raise _erro("Selecione outro julgamento com respostas em uma única matriz de comparações.")
    criterios = ambiente.get("criterios") or []
    nomes = list(_grupos_comparacao(criterios)) if destino == "dimensoes" else _criterio_nomes(criterios)
    respostas: dict[str, list[dict]] = {}
    for resposta in repo.list_respostas(origem_id):
        if resposta.get("status", "enviada") == "enviada":
            respostas.setdefault(resposta["email"].strip().lower(), []).append(resposta)
    contatos = {item["email"]: item for item in destinatarios.listar(str(ambiente["id"]))}
    exemplo = next((respostas[email][0] for email in sorted(emails) if email in respostas), {})
    nomes_origem = _nomes_origem(origem, exemplo)
    correspondencias = _correspondencias(nomes_origem, nomes)
    pessoas, vinculos = [], {}
    for email in sorted(set(emails)):
        contato, encontradas = contatos.get(email), respostas.get(email, [])
        problema = None
        if not contato or (contato.get("inscrito_em") and email not in existentes):
            problema = "O destinatário precisa estar salvo e aguardar inscrição nesta coleta."
        elif not encontradas:
            problema = "Sem resposta enviada no julgamento de origem."
        elif len(encontradas) > 1:
            problema = "Há mais de uma resposta de origem para este e-mail."
        elif destino == "dimensoes":
            resposta = encontradas[0]
            try:
                _, assinatura = _dados_dimensoes(origem, resposta, nomes)
                novo = {"origem": origem_id, "resposta": str(resposta["id"]), "assinatura": assinatura}
                if email in existentes and existentes[email] != novo:
                    raise _erro("Este destinatário já tem outra associação confirmada.")
                vinculos[email] = novo
            except DemandaValidationError as exc:
                problema = str(exc)
        pessoas.append({"email": email, "nome": contato["nome"] if contato else email, "problema": problema})
    previa = {"correspondencias": correspondencias, "destinatarios": pessoas,
              "origem": nomes_origem, "prontos": len(vinculos)}
    if destino == "dimensoes" and vinculos and len(vinculos) == len(pessoas) and not any(p["problema"] for p in correspondencias):
        previa["confirmacao"] = _assinatura([previa, vinculos])
    return previa, vinculos


def associar(ambiente: dict, origem: str, destino: str, emails: list[str], confirmacao: str | None) -> dict:
    from api.services.comparacao_colaborativa_service import _validar_ambiente_ativo

    if not disponivel(ambiente):
        raise _erro("A associação extraordinária está indisponível para este julgamento.")
    _validar_ambiente_ativo(ambiente)
    with _GRAVACAO:
        existentes = _ler(ambiente)
        previa, vinculos = _prever(ambiente, origem, destino, emails, existentes)
        if confirmacao is None:
            return previa
        if confirmacao != previa.get("confirmacao"):
            raise _erro("A prévia da associação mudou. Confira as correspondências antes de confirmar.")
        _gravar(ambiente, {**existentes, **vinculos})
        return {"confirmados": len(vinculos)}
