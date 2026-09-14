"""Processamento estruturado de PDFs recebidos pelo SEI.

O fluxo trabalha por pagina, combina texto nativo e OCR local, classifica o
papel documental e produz candidatos auditaveis conforme o contrato do tipo de
demanda. A ausencia ou o conflito de evidencias nunca vira preenchimento.
"""
from __future__ import annotations

import io
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass
from datetime import date
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Literal

TipoDemanda = Literal["plano", "programa", "projeto"]

LIMITE_TRECHO = 420
MINIMO_TEXTO_NATIVO = 80
CONFIANCA_MINIMA = 0.62
CONFIANCA_CONFLITO = 0.08

_ROOT = Path(__file__).resolve().parents[2]
_CONTRATO = _ROOT / "config" / "campos-cadastro-demanda.json"

_PROCESSO = re.compile(r"\b\d{3}[ .]\d{8}[ /]\d{4}[ -]\d{2}\b|\b\d{3,5}\.\d{6,8}/\d{4}-\d{2}\b")
_CNPJ = re.compile(r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b")
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
_TELEFONE = re.compile(r"(?<!\d)\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}(?!\d)")
_DATA = re.compile(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b")
_MOEDA = re.compile(r"(?:R\$\s*)?((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})")
_DURACAO = re.compile(r"\b(\d{1,4})\s*(mes(?:es)?|ano(?:s)?)\b", re.I)
_DECIMAL = re.compile(r"-?\d{1,3}[.,]\d+")
_DMS = re.compile(r"(\d{1,3})\s*[°º�]\s*(?:(\d{1,2})\s*['′]\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*[\"″]?\s*)?([NSLOWE])?", re.I)

_ROTULOS: dict[str, tuple[str, ...]] = {
    "nome": ("objeto", "assunto", "titulo", "denominacao", "empreendimento", "projeto"),
    "descricao": ("descricao", "escopo", "sintese", "resumo executivo"),
    "objetivo": ("objetivo", "objetivo geral", "objetivo estrategico"),
    "justificativa": ("justificativa", "motivacao", "contextualizacao"),
    "publico_alvo": ("publico-alvo", "beneficiarios"),
    "orgao_responsavel": ("orgao responsavel", "responsavel pela execucao"),
    "instituicao_label": ("interessado", "requerente", "solicitante", "proponente", "razao social", "instituicao"),
    "representante_nome": ("representante legal", "representante", "responsavel legal", "signatario"),
    "municipio": ("municipio", "cidade", "localidade"),
    "vigencia_inicio": ("inicio da vigencia", "vigencia inicial", "data de inicio"),
    "vigencia_fim": ("fim da vigencia", "vigencia final", "data de termino"),
    "prazo_referencia_meses": ("prazo de execucao", "prazo de implantacao", "duracao", "prazo"),
    "valor_global": ("valor global", "valor total", "valor estimado", "investimento total", "investimento estimado", "capex", "orcamento total"),
    "lat": ("latitude",),
    "lng": ("longitude", "long", "lng"),
}

_PAPEIS = {
    "invólucro_administrativo": ("de:", "enviado em:", "para:", "outlook", "encaminho", "protocolo"),
    "solicitação_principal": ("ofício", "solicitamos", "solicito", "vem requerer", "assunto:"),
    "fonte_financeira": ("planilha orçamentária", "orçamento", "valor total", "bdI", "preço unitário"),
    "fonte_técnica": ("estudo de viabilidade", "projeto básico", "projeto executivo", "anteprojeto", "memorial"),
    "fonte_espacial": ("coordenadas", "latitude", "longitude", "planta", "mapa", "sirgas", "utm"),
    "evidência_complementar": ("diário oficial", "notícia", "anexo", "legislação", "lei nº"),
}

_MATURIDADE_PROJETO = (
    (7, ("pronto para contratação", "pronto para implantacao", "contrato assinado")),
    (6, ("projeto executivo concluído", "projeto executivo concluido")),
    (5, ("projeto básico concluído", "projeto basico concluido")),
    (4, ("anteprojeto concluído", "anteprojeto concluido")),
    (3, ("estudo de viabilidade concluído", "estudo de viabilidade concluido", "evtea concluído", "evtea concluido")),
    (2, ("estudos preliminares", "estudo preliminar")),
    (1, ("necessidade identificada", "ideia")),
)


@dataclass(frozen=True)
class Pagina:
    numero: int
    texto: str
    metodo: str
    papel: str
    confianca_texto: float
    aviso: str | None = None


def _sem_acento(valor: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", valor.lower()) if unicodedata.category(c) != "Mn")


def _limpar_texto(texto: str) -> str:
    texto = unicodedata.normalize("NFC", texto or "").replace("\r\n", "\n").replace("\r", "\n")
    linhas = [re.sub(r"[^\S\n]+", " ", linha).strip() for linha in texto.splitlines()]
    return "\n".join(linha for linha in linhas if linha)


def _papel(texto: str) -> str:
    normalizado = _sem_acento(texto)
    pontuacoes = {
        papel: sum(1 for sinal in sinais if _sem_acento(sinal) in normalizado)
        for papel, sinais in _PAPEIS.items()
    }
    melhor = max(pontuacoes, key=pontuacoes.get)
    return melhor if pontuacoes[melhor] else "conteúdo_não_classificado"


def _ocr(pagina: Any) -> tuple[str, str | None]:
    if not shutil.which("tesseract"):
        return "", "OCR local indisponível no servidor."
    try:
        import pytesseract
        from PIL import Image, ImageOps

        import pymupdf

        pix = pagina.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), alpha=False)
        imagem = Image.open(io.BytesIO(pix.tobytes("png")))
        imagem = ImageOps.autocontrast(ImageOps.grayscale(imagem))
        return pytesseract.image_to_string(imagem, lang="por", config="--oem 1 --psm 3"), None
    except Exception as exc:
        return "", f"Falha no OCR da página: {type(exc).__name__}."


def extrair_paginas(conteudo: bytes) -> tuple[list[Pagina], list[str]]:
    """Extrai texto e metadados de cada página, acionando OCR quando preciso."""
    import pymupdf

    paginas: list[Pagina] = []
    avisos: list[str] = []
    with pymupdf.open(stream=conteudo, filetype="pdf") as documento:
        if documento.needs_pass:
            raise ValueError("PDF protegido por senha.")
        for indice, pagina in enumerate(documento):
            nativo = _limpar_texto(pagina.get_text("text", sort=True))
            texto, metodo, aviso = nativo, "texto_nativo", None
            if len(nativo) < MINIMO_TEXTO_NATIVO:
                reconhecido, aviso = _ocr(pagina)
                reconhecido = _limpar_texto(reconhecido)
                if len(reconhecido) > len(nativo):
                    texto, metodo = reconhecido, "ocr"
                elif nativo:
                    metodo = "texto_nativo_insuficiente"
            confianca = (min(0.9, 0.7 + len(texto) / 1000) if metodo == "ocr" else (1.0 if texto else 0.0))
            paginas.append(Pagina(indice + 1, texto, metodo, _papel(texto), round(confianca, 3), aviso))
            if aviso and aviso not in avisos:
                avisos.append(aviso)
    return paginas, avisos


def _evidencia(pagina: Pagina, trecho: str, confianca: float) -> dict[str, Any]:
    return {
        "pagina": pagina.numero,
        "trecho": _limpar_texto(trecho)[:LIMITE_TRECHO],
        "metodo": pagina.metodo,
        "papel_fonte": pagina.papel,
        "confianca": round(min(confianca, pagina.confianca_texto), 3),
    }


def _linhas_rotuladas(paginas: Iterable[Pagina], campo: str) -> list[dict[str, Any]]:
    candidatos = []
    rotulos = _ROTULOS.get(campo, ())
    for pagina in paginas:
        for linha in pagina.texto.splitlines():
            normalizada = _sem_acento(linha)
            for rotulo in rotulos:
                match = re.match(rf"^\s*{re.escape(_sem_acento(rotulo))}\s*[:\-–]\s*(.+)$", normalizada)
                if match:
                    inicio = len(linha) - len(match.group(1))
                    valor = linha[inicio:].strip()
                    if valor:
                        candidatos.append({"valor": valor, "evidencia": _evidencia(pagina, linha, 0.92)})
                    break
    return candidatos


def _candidatos_formato(paginas: Iterable[Pagina], padrao: re.Pattern[str], campo: str) -> list[dict[str, Any]]:
    candidatos = []
    for pagina in paginas:
        for match in padrao.finditer(pagina.texto):
            inicio = pagina.texto.rfind("\n", 0, match.start()) + 1
            fim = pagina.texto.find("\n", match.end())
            trecho = pagina.texto[inicio: fim if fim >= 0 else len(pagina.texto)]
            confianca = 0.9 if campo in _sem_acento(trecho) else 0.75
            candidatos.append({"valor": match.group(0), "evidencia": _evidencia(pagina, trecho, confianca)})
    return candidatos


def _numero_ptbr(valor: str) -> float | None:
    try:
        return float(valor.replace("R$", "").replace(".", "").replace(",", ".").strip())
    except ValueError:
        return None


def _data_iso(valor: str) -> str | None:
    match = _DATA.search(valor)
    if not match:
        return None
    try:
        return date(int(match[3]), int(match[2]), int(match[1])).isoformat()
    except ValueError:
        return None


def _coordenada(valor: str, maximo: float) -> float | None:
    dms = _DMS.search(valor)
    if dms:
        numero = float(dms[1]) + float(dms[2] or 0) / 60 + float((dms[3] or "0").replace(",", ".")) / 3600
        if (dms[4] or "").upper() in {"S", "O", "W"}:
            numero *= -1
    else:
        decimal = _DECIMAL.search(valor)
        if not decimal:
            return None
        numero = float(decimal.group().replace(",", "."))
    return numero if -maximo <= numero <= maximo else None


def _normalizar(campo: str, valor: str) -> Any:
    if campo in {"vigencia_inicio", "vigencia_fim"}:
        return _data_iso(valor)
    if campo == "valor_global":
        moeda = _MOEDA.search(valor)
        return _numero_ptbr(moeda.group(1)) if moeda else None
    if campo == "prazo_referencia_meses":
        prazo = _DURACAO.search(valor)
        if not prazo:
            return None
        quantidade = int(prazo.group(1))
        return quantidade * 12 if _sem_acento(prazo.group(2)).startswith("ano") else quantidade
    if campo == "lat":
        return _coordenada(valor, 90)
    if campo == "lng":
        return _coordenada(valor, 180)
    if campo in {"nome", "instituicao_label", "representante_nome", "orgao_responsavel"}:
        limpo = valor.strip()
        if campo == "instituicao_label":
            limpo = re.sub(r"\s*[-–]?\s*(?:CNPJ\s*)?\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}.*$", "", limpo, flags=re.I)
        return limpo[:200]
    return valor.strip()


def _resultado(campo: str, candidatos: list[dict[str, Any]]) -> dict[str, Any]:
    normalizados = []
    for candidato in candidatos:
        valor = _normalizar(campo, candidato["valor"])
        if valor is not None and valor != "":
            normalizados.append({**candidato, "normalizado": valor})
    if not normalizados:
        return {"estado": "nao_encontrado", "confianca": 0.0, "evidencias": [], "candidatos": []}
    normalizados.sort(key=lambda item: item["evidencia"]["confianca"], reverse=True)
    distintos = []
    for item in normalizados:
        if item["normalizado"] not in [x["normalizado"] for x in distintos]:
            distintos.append(item)
    melhor = distintos[0]
    conflito = len(distintos) > 1 and abs(melhor["evidencia"]["confianca"] - distintos[1]["evidencia"]["confianca"]) <= CONFIANCA_CONFLITO
    return {
        "valor_observado": melhor["valor"] if not conflito else None,
        "valor_normalizado": melhor["normalizado"] if not conflito else None,
        "identificador_resolvido": None,
        "confianca": melhor["evidencia"]["confianca"],
        "estado": "conflitante" if conflito else "normalizado",
        "evidencias": [item["evidencia"] for item in distintos[:5]],
        "candidatos": [{"valor": item["normalizado"], "confianca": item["evidencia"]["confianca"]} for item in distintos[:5]],
        "observacoes": "Há valores concorrentes com confiança equivalente." if conflito else "",
    }


def _descricao(paginas: list[Pagina]) -> list[dict[str, Any]]:
    candidatos = _linhas_rotuladas(paginas, "descricao")
    if candidatos:
        return candidatos
    for pagina in paginas:
        if pagina.papel not in {"solicitação_principal", "fonte_técnica"}:
            continue
        paragrafos = [p.strip() for p in re.split(r"\n{2,}|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])", pagina.texto) if 80 <= len(p.strip()) <= 1200]
        for paragrafo in paragrafos[:2]:
            candidatos.append({"valor": paragrafo, "evidencia": _evidencia(pagina, paragrafo, 0.68)})
    return candidatos


def _vigencia(paginas: list[Pagina], indice: int) -> list[dict[str, Any]]:
    candidatos = _linhas_rotuladas(paginas, "vigencia_inicio" if indice == 0 else "vigencia_fim")
    for pagina in paginas:
        for linha in pagina.texto.splitlines():
            if not re.match(r"^\s*(vig[eê]ncia|per[ií]odo)\s*[:\-–]", linha, re.I):
                continue
            datas = list(_DATA.finditer(linha))
            if len(datas) > indice:
                candidatos.append({"valor": datas[indice].group(), "evidencia": _evidencia(pagina, linha, 0.9)})
    return candidatos


def _maturidade(tipo: TipoDemanda, paginas: list[Pagina], contrato: dict[str, Any]) -> dict[str, Any]:
    if tipo != "projeto":
        return {"estado": "nao_encontrado", "confianca": 0.0, "evidencias": [], "candidatos": []}
    valores = contrato["tipos_objeto"][tipo]["campos"]["maturidade_objeto"]["valores"]
    for nivel, sinais in _MATURIDADE_PROJETO:
        for pagina in paginas:
            normalizado = _sem_acento(pagina.texto)
            sinal = next((s for s in sinais if _sem_acento(s) in normalizado), None)
            if sinal:
                evidencia = _evidencia(pagina, sinal, 0.7)
                return {"valor_observado": sinal, "valor_normalizado": valores[nivel - 1], "identificador_resolvido": None, "confianca": evidencia["confianca"], "estado": "normalizado", "evidencias": [evidencia], "candidatos": [], "observacoes": "Classificação documental sujeita à confirmação humana."}
    return {"estado": "nao_encontrado", "confianca": 0.0, "evidencias": [], "candidatos": []}


def _segmentos(paginas: list[Pagina]) -> list[dict[str, Any]]:
    segmentos: list[dict[str, Any]] = []
    for pagina in paginas:
        if segmentos and segmentos[-1]["papel"] == pagina.papel:
            segmentos[-1]["pagina_final"] = pagina.numero
        else:
            segmentos.append({"pagina_inicial": pagina.numero, "pagina_final": pagina.numero, "papel": pagina.papel})
    return segmentos


def analisar(conteudo: bytes, tipo: TipoDemanda = "projeto") -> dict[str, Any]:
    contrato = json.loads(_CONTRATO.read_text(encoding="utf-8"))
    campos_contrato = contrato["tipos_objeto"][tipo]["campos"]
    paginas, avisos = extrair_paginas(conteudo)
    resultados: dict[str, Any] = {}
    formatos = {
        "instituicao_cnpj": (_CNPJ, "cnpj"),
        "representante_email": (_EMAIL, "email"),
        "representante_telefone": (_TELEFONE, "telefone"),
    }
    extraiveis = set(campos_contrato) | {"instituicao_label", "representante_nome", "representante_email", "representante_telefone", "municipio"}
    for campo in sorted(extraiveis):
        if campo in {"instituicao_id", "pessoa_id", "representante", "diretoria_id", "unidades_espaciais", "geometria", "classificacao", "complementos", "plano_id", "plano_codigo", "programa_codigo", "vinculo_tipo"}:
            resultados[campo] = {"estado": "aguardando_resolucao", "confianca": 0.0, "evidencias": [], "candidatos": []}
            continue
        if campo == "descricao":
            candidatos = _descricao(paginas)
        elif campo in {"vigencia_inicio", "vigencia_fim"}:
            candidatos = _vigencia(paginas, 0 if campo == "vigencia_inicio" else 1)
        elif campo in formatos:
            padrao, contexto = formatos[campo]
            candidatos = _candidatos_formato(paginas, padrao, contexto)
        else:
            candidatos = _linhas_rotuladas(paginas, campo)
        resultados[campo] = _resultado(campo, candidatos)
    resultados["maturidade_objeto"] = _maturidade(tipo, paginas, contrato)

    processos = _candidatos_formato(paginas, _PROCESSO, "processo")
    numero_processo = _resultado("numero_processo", processos)
    preenchiveis = {
        campo: resultado.get("valor_normalizado")
        for campo, resultado in resultados.items()
        if resultado.get("estado") == "normalizado" and resultado.get("confianca", 0) >= CONFIANCA_MINIMA
    }
    return {
        "versao": "2.0.0",
        "tipo_demanda": tipo,
        "numero_processo": numero_processo.get("valor_normalizado"),
        "campos": resultados,
        "campos_sugeridos": preenchiveis,
        "ausentes": [campo for campo, resultado in resultados.items() if resultado["estado"] in {"nao_encontrado", "aguardando_resolucao"}],
        "conflitos": [campo for campo, resultado in resultados.items() if resultado["estado"] == "conflitante"],
        "paginas": [{
            "numero": pagina.numero,
            "metodo": pagina.metodo,
            "papel": pagina.papel,
            "confianca_texto": pagina.confianca_texto,
            "aviso": pagina.aviso,
            "caracteres": len(pagina.texto),
            "hash_texto": sha256(_sem_acento(pagina.texto).encode("utf-8")).hexdigest() if pagina.texto else None,
        } for pagina in paginas],
        "segmentos": _segmentos(paginas),
        "avisos": avisos,
        "metricas": {
            "paginas": len(paginas),
            "paginas_ocr": sum(p.metodo == "ocr" for p in paginas),
            "paginas_sem_texto": sum(not p.texto for p in paginas),
            "campos_sugeridos": len(preenchiveis),
            "campos_conflitantes": sum(r["estado"] == "conflitante" for r in resultados.values()),
        },
    }
