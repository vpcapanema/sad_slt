"""Leitura determinística do texto de um PDF do SEI para sugerir campos.

Não há inferência estatística nem modelo de linguagem: cada campo vem de um
rótulo reconhecido ou de um formato inequívoco (CNPJ, e-mail, número de
processo, coordenada, moeda, data). O que não casar com uma regra volta ausente
— nunca preenchido por aproximação, nunca zero no lugar de ausência. Cada valor
sugerido é acompanhado do trecho que o originou, para conferência do analista.

O módulo é uma função pura sobre texto: não acessa banco, rede nem disco.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date
from typing import Any, Callable

# Limite da descrição sugerida, igual ao praticado pelo fluxo anterior.
LIMITE_DESCRICAO = 60000
LIMITE_TRECHO = 240

_CLASSES_ACENTO = {
    "a": "aáàâã", "e": "eéèê", "i": "ií", "o": "oóòôõ", "u": "uúùü", "c": "cç",
}


def _tolerante(termo: str) -> str:
    """Converte um rótulo em ASCII no padrão que também aceita os acentos."""
    partes = []
    for char in termo:
        classe = _CLASSES_ACENTO.get(char.lower())
        if classe:
            partes.append(f"[{classe}]")
        elif char == " ":
            partes.append(r"\s+")
        else:
            partes.append(re.escape(char))
    return "".join(partes)


def _rotulo(*termos: str) -> re.Pattern[str]:
    """Casa `Rótulo: valor` no início de uma linha, com ou sem acentos."""
    alternativas = "|".join(_tolerante(termo) for termo in termos)
    return re.compile(rf"^[^\S\n]*(?:{alternativas})[^\S\n]*[:\-–][^\S\n]*(.+)$", re.I | re.M)


NUMERO_PROCESSO = re.compile(r"\b\d{3,5}\.\d{6,8}/\d{4}-\d{2}\b")
_CNPJ = re.compile(r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b")
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
_TELEFONE = re.compile(r"(?<!\d)\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}(?!\d)")
_DATA = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")
_MOEDA = re.compile(r"R\$\s*([\d.]+,\d{2}|\d+(?:\.\d{3})*)")
_MESES = re.compile(rf"(\d{{1,4}})\s*(?:{_tolerante('meses')}|{_tolerante('mes')})\b", re.I)
_ANOS = re.compile(rf"(\d{{1,3}})\s*(?:{_tolerante('anos')}|{_tolerante('ano')})\b", re.I)
_DECIMAL = re.compile(r"-?\d{1,3}[.,]\d+")
_GRAUS = re.compile(
    r"(\d{1,3})\s*[°º]\s*(?:(\d{1,2})\s*['′]\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*[\"″]?\s*)?([NSLOWE])?",
    re.I,
)

_ROTULO_NOME = _rotulo("objeto", "assunto", "referencia", "titulo", "denominacao", "empreendimento")
_ROTULO_INSTITUICAO = _rotulo(
    "interessado", "requerente", "solicitante", "proponente", "razao social",
    "instituicao", "entidade", "orgao",
)
_ROTULO_REPRESENTANTE = _rotulo(
    "representante legal", "representante", "responsavel legal", "responsavel",
    "signatario", "subscritor",
)
_ROTULO_MUNICIPIO = _rotulo("municipio", "cidade", "localidade")
_ROTULO_VALOR = _rotulo(
    "valor global", "valor total", "valor estimado", "valor", "investimento estimado",
    "investimento", "orcamento estimado", "orcamento",
)
_ROTULO_PRAZO = _rotulo("prazo de execucao", "prazo estimado", "prazo", "duracao")
_ROTULO_VIGENCIA = _rotulo("vigencia", "periodo de vigencia", "periodo")
_ROTULO_INICIO = _rotulo("inicio previsto", "data de inicio", "inicio")
_ROTULO_FIM = _rotulo("termino previsto", "data de termino", "termino", "conclusao", "fim")
_ROTULO_LATITUDE = _rotulo("latitude", "lat")
_ROTULO_LONGITUDE = _rotulo("longitude", "long", "lng")
_ROTULO_COORDENADAS = _rotulo("coordenadas", "coordenada", "localizacao geografica")
_ROTULO_EMAIL = _rotulo("e-mail", "email", "correio eletronico")
_ROTULO_TELEFONE = _rotulo("telefone", "fone", "contato", "celular")

_LIXO_FINAL = re.compile(r"[\s.;,:\-]+$")


def _limpar(valor: str) -> str:
    return _LIXO_FINAL.sub("", re.sub(r"\s+", " ", valor)).strip()


def _trecho(texto: str, inicio: int, fim: int) -> str:
    linha_inicio = texto.rfind("\n", 0, inicio) + 1
    linha_fim = texto.find("\n", fim)
    bruto = texto[linha_inicio: linha_fim if linha_fim != -1 else len(texto)]
    return _limpar(bruto)[:LIMITE_TRECHO]


def _por_rotulo(texto: str, padrao: re.Pattern[str]) -> tuple[str, str] | None:
    encontrado = padrao.search(texto)
    if not encontrado:
        return None
    valor = _limpar(encontrado.group(1))
    if not valor:
        return None
    return valor, _trecho(texto, encontrado.start(), encontrado.end())


def _por_formato(texto: str, padrao: re.Pattern[str]) -> tuple[str, str] | None:
    encontrado = padrao.search(texto)
    if not encontrado:
        return None
    return encontrado.group(0).strip(), _trecho(texto, encontrado.start(), encontrado.end())


def _numero_ptbr(bruto: str) -> float | None:
    limpo = bruto.strip().replace(".", "").replace(",", ".")
    try:
        return float(limpo)
    except ValueError:
        return None


def _data_iso(dia: str, mes: str, ano: str) -> str | None:
    try:
        return date(int(ano), int(mes), int(dia)).isoformat()
    except ValueError:
        return None


def _coordenada(fragmento: str, *, maximo: float) -> float | None:
    """Aceita grau decimal (-23,55) e grau/minuto/segundo (23 graus 33' 00" S)."""
    graus = _GRAUS.search(fragmento)
    if graus and graus.group(1):
        valor = float(graus.group(1))
        valor += float(graus.group(2) or 0) / 60
        valor += float((graus.group(3) or "0").replace(",", ".")) / 3600
        hemisferio = (graus.group(4) or "").upper()
        if hemisferio in ("S", "O", "W"):
            valor = -valor
        elif not hemisferio and fragmento.lstrip().startswith("-"):
            valor = -valor
    else:
        decimal = _DECIMAL.search(fragmento)
        if not decimal:
            return None
        bruto = decimal.group(0)
        valor = float(bruto.replace(",", ".")) if "," in bruto else float(bruto)
        if re.search(r"\b[SOW]\b", fragmento, re.I) and valor > 0:
            valor = -valor
    return valor if -maximo <= valor <= maximo else None


def _nome(texto: str) -> tuple[Any, str] | None:
    achado = _por_rotulo(texto, _ROTULO_NOME)
    if not achado:
        return None
    valor, trecho = achado
    return valor[:200], trecho


def _instituicao(texto: str) -> tuple[Any, str] | None:
    achado = _por_rotulo(texto, _ROTULO_INSTITUICAO)
    if not achado:
        return None
    valor, trecho = achado
    # O rótulo costuma trazer o CNPJ colado ao nome; o CNPJ tem campo próprio.
    valor = _limpar(re.sub(r"(?i)\bcnpj\b", "", _CNPJ.sub("", valor)))
    return (valor[:200], trecho) if valor else None


def _representante(texto: str) -> tuple[Any, str] | None:
    achado = _por_rotulo(texto, _ROTULO_REPRESENTANTE)
    if not achado:
        return None
    valor, trecho = achado
    return valor[:200], trecho


def _valor_global(texto: str) -> tuple[Any, str] | None:
    linha = _por_rotulo(texto, _ROTULO_VALOR)
    alvo = linha[0] if linha else ""
    na_linha = _MOEDA.search(alvo)
    if linha and na_linha:
        valor = _numero_ptbr(na_linha.group(1))
        return (valor, linha[1]) if valor is not None else None
    solto = _MOEDA.search(texto)
    if not solto:
        return None
    valor = _numero_ptbr(solto.group(1))
    if valor is None:
        return None
    return valor, _trecho(texto, solto.start(), solto.end())


def _prazo_meses(texto: str) -> tuple[Any, str] | None:
    achado = _por_rotulo(texto, _ROTULO_PRAZO)
    if not achado:
        return None
    valor, trecho = achado
    meses = _MESES.search(valor)
    if meses:
        return int(meses.group(1)), trecho
    anos = _ANOS.search(valor)
    if anos:
        return int(anos.group(1)) * 12, trecho
    return None


def _vigencia(texto: str) -> dict[str, tuple[Any, str]]:
    resultado: dict[str, tuple[Any, str]] = {}
    periodo = _por_rotulo(texto, _ROTULO_VIGENCIA)
    if periodo:
        datas = _DATA.findall(periodo[0])
        if len(datas) >= 2:
            inicio = _data_iso(*datas[0])
            fim = _data_iso(*datas[1])
            if inicio:
                resultado["vigencia_inicio"] = (inicio, periodo[1])
            if fim:
                resultado["vigencia_fim"] = (fim, periodo[1])
            return resultado
    for chave, padrao in (("vigencia_inicio", _ROTULO_INICIO), ("vigencia_fim", _ROTULO_FIM)):
        achado = _por_rotulo(texto, padrao)
        if not achado:
            continue
        data_encontrada = _DATA.search(achado[0])
        if not data_encontrada:
            continue
        iso = _data_iso(*data_encontrada.groups())
        if iso:
            resultado[chave] = (iso, achado[1])
    return resultado


def _coordenadas(texto: str) -> dict[str, tuple[Any, str]]:
    resultado: dict[str, tuple[Any, str]] = {}
    latitude = _por_rotulo(texto, _ROTULO_LATITUDE)
    longitude = _por_rotulo(texto, _ROTULO_LONGITUDE)
    if latitude:
        valor = _coordenada(latitude[0], maximo=90)
        if valor is not None:
            resultado["lat"] = (valor, latitude[1])
    if longitude:
        valor = _coordenada(longitude[0], maximo=180)
        if valor is not None:
            resultado["lng"] = (valor, longitude[1])
    if resultado:
        return resultado
    par = _por_rotulo(texto, _ROTULO_COORDENADAS)
    if not par:
        return resultado
    partes = [p for p in re.split(r"[;/]|,\s(?=-?\d)|\se\s", par[0]) if p.strip()]
    if len(partes) < 2:
        return resultado
    lat = _coordenada(partes[0], maximo=90)
    lng = _coordenada(partes[1], maximo=180)
    if lat is not None and lng is not None:
        resultado["lat"] = (lat, par[1])
        resultado["lng"] = (lng, par[1])
    return resultado


def _contato(texto: str, rotulo: re.Pattern[str], formato: re.Pattern[str]) -> tuple[Any, str] | None:
    achado = _por_rotulo(texto, rotulo)
    if achado:
        encontrado = formato.search(achado[0])
        if encontrado:
            return _limpar(encontrado.group(0)), achado[1]
    return _por_formato(texto, formato)


_SIMPLES: dict[str, Callable[[str], tuple[Any, str] | None]] = {
    "nome": _nome,
    "instituicao_label": _instituicao,
    "instituicao_cnpj": lambda texto: _por_formato(texto, _CNPJ),
    "representante_nome": _representante,
    "representante_email": lambda texto: _contato(texto, _ROTULO_EMAIL, _EMAIL),
    "representante_telefone": lambda texto: _contato(texto, _ROTULO_TELEFONE, _TELEFONE),
    "municipio": lambda texto: _por_rotulo(texto, _ROTULO_MUNICIPIO),
    "valor_global": _valor_global,
    "prazo_referencia_meses": _prazo_meses,
}


def normalizar_texto(texto: str) -> str:
    """Uniformiza quebras e espaços do PDF sem remover acentuação."""
    limpo = unicodedata.normalize("NFC", texto or "").replace("\r\n", "\n").replace("\r", "\n")
    # Espaco inquebravel e travessoes do PDF viram espaco/hifen simples.
    limpo = limpo.replace(" ", " ").replace("–", "-").replace("—", "-")
    return "\n".join(re.sub(r"[^\S\n]+", " ", linha).strip() for linha in limpo.split("\n"))


def extrair_campos(texto: str) -> dict[str, Any]:
    """Devolve campos sugeridos, o trecho de origem de cada um e o que faltou.

    Campos ausentes não aparecem em `campos`: o formulário os mantém em branco
    para o analista preencher.
    """
    limpo = normalizar_texto(texto)
    campos: dict[str, Any] = {}
    evidencias: dict[str, str] = {}

    processo = NUMERO_PROCESSO.search(limpo)
    numero_processo = processo.group(0) if processo else None
    if processo:
        evidencias["numero_processo"] = _trecho(limpo, processo.start(), processo.end())

    for chave, regra in _SIMPLES.items():
        achado = regra(limpo)
        if achado is None:
            continue
        campos[chave], evidencias[chave] = achado

    for grupo in (_vigencia(limpo), _coordenadas(limpo)):
        for chave, (valor, trecho) in grupo.items():
            campos[chave], evidencias[chave] = valor, trecho

    if limpo.strip():
        campos["descricao"] = limpo.strip()[:LIMITE_DESCRICAO]
        evidencias["descricao"] = "Texto integral extraído do PDF."

    if "nome" not in campos and numero_processo:
        # Sem rótulo de objeto, o nome fica a cargo do analista; o número serve
        # apenas como identificação provisória e visível do documento.
        campos["nome"] = f"Processo SEI {numero_processo}"[:200]
        evidencias["nome"] = "Sugerido a partir do número do processo; confirme o objeto real."

    ausentes = [chave for chave in _SIMPLES if chave not in campos]
    ausentes += [chave for chave in ("vigencia_inicio", "vigencia_fim", "lat", "lng") if chave not in campos]
    return {
        "numero_processo": numero_processo,
        "campos": campos,
        "evidencias": evidencias,
        "ausentes": sorted(ausentes),
    }
