"""Processamento estruturado de PDFs recebidos pelo SEI.

O fluxo trabalha por pagina, combina texto nativo e OCR local, classifica o
papel documental e produz candidatos auditaveis conforme o contrato do tipo de
demanda. A ausencia ou o conflito de evidencias nunca vira preenchimento.

Os documentos reais raramente usam o rotulo do formulario. Por isso cada campo
tem sinonimos (ofícios, requerimentos, fichas técnicas, planilhas) e varias
estrategias, cada uma com confianca propria:

- rotulo com separador ("Valor total: R$ ...")                       0,92
- rotulo com complemento ("Valor total da obra: R$ ...")             0,88
- valor na linha seguinte ao rotulo                                  0,85
- par de coordenadas numa linha de coordenadas                       0,84
- mencao em frase, so para valores de formato verificavel            0,74
- descricao por paragrafo de solicitacao                             0,72
- assinatura, ente municipal citado                                  0,70
- primeiro paragrafo da solicitacao                                  0,66

Paginas de e-mail de encaminhamento perdem 0,10. Valores distintos com
confianca proxima continuam conflitantes e nao sao sugeridos.
"""
from __future__ import annotations

import io
import json
import re
import shutil
import unicodedata
from dataclasses import dataclass, replace
from datetime import date
from hashlib import sha256
from pathlib import Path
from typing import Any, Iterable, Literal

TipoDemanda = Literal["plano", "programa", "projeto"]

LIMITE_TRECHO = 420
MINIMO_TEXTO_NATIVO = 80
CONFIANCA_MINIMA = 0.62
CONFIANCA_CONFLITO = 0.08
PENALIDADE_INVOLUCRO = 0.10

# O extrator não tenta ler estes campos do PDF: são identificadores e vínculos
# resolvidos no SIGMA ou escolhidos pelo analista. Ficam sempre
# "aguardando_resolucao" e por isso não entram no desfecho da análise.
CAMPOS_NAO_EXTRAIVEIS = frozenset({
    "instituicao_id", "pessoa_id", "representante", "diretoria_id", "unidades_espaciais",
    "geometria", "classificacao", "complementos", "plano_id", "plano_codigo",
    "programa_codigo", "vinculo_tipo",
})
# Lidos pelo formato do próprio valor, sem depender de rótulo no documento.
CAMPOS_POR_FORMATO = frozenset({"instituicao_cnpj", "representante_email", "representante_telefone"})

_ROOT = Path(__file__).resolve().parents[2]
_CONTRATO = _ROOT / "config" / "campos-cadastro-demanda.json"

_PROCESSO = re.compile(r"\b\d{3}[ .]\d{8}[ /]\d{4}[ -]\d{2}\b|\b\d{3,5}\.\d{6,8}/\d{4}-\d{2}\b")
# O SEI carimba o processo no nome do arquivo, e muitas vezes o nome traz o
# único título de projeto que existe: "SEI nº 020 00016588 2025 13 -
# 02___Terminal_Urbano.pdf". O bloco do meio aparece com espaço interno ou com
# zero sobrando, então é normalizado para oito dígitos.
_PROCESSO_NO_NOME = re.compile(r"(\d{3})[\s.]+(\d[\d\s]{6,12}?)[\s.]+(\d{4})[\s.]+(\d{2})(?!\d)")
_PREFIXO_SEI = re.compile(r"^SEI\s*n?[ºo°]?\s*[\d\s.]+(?:\s*e\s*[\d\s./-]+)?\s*[-–]?\s*", re.I)
# Tipo documental e canal de entrega não nomeiam projeto nenhum.
_TIPO_DOCUMENTAL = re.compile(
    r"^(?:oficio|of|ofic|email|e[\s_-]?mail|gs|memorando|carta|planilha\s+orcamentaria|"
    r"planilha|apresentacao|estudo|livro|anexo|doc|protocolo)\b[\s\-–.]*", re.I)
_CANAL_NO_NOME = re.compile(r"\s*[-–]\s*(?:outlook|protocolo\s+spi|email|e[\s_-]?mail)\b.*$", re.I)
_NOME_SEM_VALOR = re.compile(r"^(?:untitled|xerox\s*scan|scan|img|digitalizar|sn)\b", re.I)
_VERBO_DE_PEDIDO = re.compile(
    r"\b(?:solicitacao|proposta|projeto|implantacao|criacao|revitalizacao)\b", re.I)
# Abaixo de qualquer rótulo do documento (0,92 / 0,88 / 0,85): onde o documento
# diz "Assunto:", o texto é melhor que o nome do arquivo. A folga precisa passar
# de CONFIANCA_CONFLITO, senão os dois empatam e o campo some em vez de escolher.
CONFIANCA_NOME_ARQUIVO = 0.72
# Acima do texto (máximo 0,90), também com folga maior que CONFIANCA_CONFLITO:
# o carimbo do SEI no nome do arquivo é a fonte mais confiável do processo.
CONFIANCA_PROCESSO_NO_NOME = 0.99
_CNPJ = re.compile(r"\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b")
_CNPJ_NUMERICO = re.compile(r"(?<!\d)\d{14}(?!\d)")
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
# Em página digitalizada o OCR costuma ler o arroba como "(Q", "(q" ou "©", e o
# e-mail do proponente se perde. Só vale entre o nome e um domínio com ponto,
# para que parêntese solto no meio do texto não vire endereço.
_ARROBA_QUEBRADA = re.compile(r"(?<=[\w.+-])\s*(?:\(Q|\(q|©|\(@)\s*(?=[\w-]+(?:\.[\w-]+)+)")
_TELEFONE = re.compile(r"(?<!\d)\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}(?!\d)")
_DATA = re.compile(r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b")
_MESES = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6, "julho": 7,
    "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}
_DATA_EXTENSO = re.compile(rf"\b(\d{{1,2}})(?:º|°|o)?\s+de\s+({'|'.join(_MESES)})\s+de\s+(\d{{4}})\b")
# R$ com ou sem centavos; sem R$, só com centavos (evita confundir com qualquer número).
_MOEDA = re.compile(r"R\$\s*((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2})?)|((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})")
# Documento real abrevia a escala ("R$ 11 bi", "R$ 3,0 bi"); sem reconhecê-la o
# valor lido virava onze reais.
_MOEDA_EXTENSO = re.compile(
    r"(?:R\$\s*)?(\d{1,3}(?:,\d{1,3})?)\s*(mil|milh(?:ao|oes)|mi|bilh(?:ao|oes)|bi)\b")
_DURACAO = re.compile(r"\b(\d{1,4})\s*(?:\([^)]{0,40}\)\s*)?(mes(?:es)?|ano(?:s)?)\b")
_DECIMAL = re.compile(r"-?\d{1,3}[.,]\d+")
_DMS = re.compile(r"(\d{1,3})\s*[°º�]\s*(?:(\d{1,2})\s*['′]\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*[\"″]?\s*)?([NSLOWE])?", re.I)
_PAR_DECIMAL = re.compile(r"(-?\d{1,2}[.,]\d{3,})(?:\s*[;/|]\s*|,\s+|\s+)(-?\d{1,3}[.,]\d{3,})")
_ENUMERADOR = re.compile(r"^\s*(?:\(?\d{1,2}(?:\.\d{1,2})*[.)\-–]?|\(?[a-z][.)]|[•·*▪►\-–])\s+")
# Linha que endereça alguém: o ente citado aqui é o destinatário, não quem pede.
_ENDERECAMENTO = (
    "ao senhor", "a senhora", "ao exmo", "a exma", "excelentissimo", "excelentissima",
    "ao ilustrissimo", "a ilustrissima", "ao prefeito", "a prefeita", "ao magnifico",
    "destinatario", "para:", "a sua excelencia",
)

# Sinônimos por campo. Comparação sem acento e sem caixa; os mais longos são
# testados primeiro. Termos de uma palavra só valem como rótulo (com separador).
_ROTULOS: dict[str, tuple[str, ...]] = {
    "nome": (
        "objeto", "objeto do contrato", "objeto do convenio", "objeto da solicitacao", "objeto do pedido",
        "assunto", "titulo", "denominacao", "empreendimento", "nome do empreendimento", "nome da obra",
        "obra", "intervencao", "identificacao do objeto", "ref.", "ref",
    ),
    "descricao": (
        "descricao", "descricao do objeto", "descricao do projeto", "descricao da obra",
        "descricao do empreendimento", "descricao sumaria", "breve descricao", "escopo", "escopo do projeto",
        "escopo da obra", "sintese", "resumo", "resumo executivo", "detalhamento", "detalhamento do objeto",
        "caracterizacao", "caracterizacao do empreendimento", "especificacao do objeto", "memorial descritivo",
    ),
    "objetivo": (
        "objetivo", "objetivos", "objetivo geral", "objetivos gerais", "objetivo principal", "finalidade",
        "proposito", "meta", "metas",
    ),
    "objetivo_estrategico": (
        "objetivo estrategico", "objetivos estrategicos", "diretriz estrategica", "diretrizes estrategicas",
        "objetivo", "objetivos", "objetivo geral", "finalidade", "proposito",
    ),
    "justificativa": (
        "justificativa", "justificativas", "justificativa tecnica", "motivacao", "contextualizacao", "contexto",
        "fundamentacao", "necessidade", "problema", "diagnostico", "situacao atual",
    ),
    "publico_alvo": (
        "publico-alvo", "publico alvo", "beneficiarios", "beneficiarios diretos", "populacao beneficiada",
        "populacao atendida", "usuarios beneficiados",
    ),
    "orgao_responsavel": (
        "orgao responsavel", "orgao executor", "entidade executora", "executor", "unidade responsavel",
        "unidade executora", "responsavel pela execucao", "orgao gestor", "orgao interveniente",
    ),
    "instituicao_label": (
        "interessado", "interessada", "requerente", "solicitante", "proponente", "razao social", "instituicao",
        "instituicao proponente", "entidade", "entidade proponente", "orgao solicitante", "orgao interessado",
        "orgao proponente", "convenente", "tomador",
        # Cabeçalho de autuação do SEI.
        "remetente", "procedencia", "origem", "unidade geradora", "unidade de origem", "especificacao",
    ),
    "representante_nome": (
        "representante legal", "representante", "nome do representante", "responsavel legal", "responsavel",
        "signatario", "assinado por", "subscritor", "prefeito", "prefeita", "prefeito municipal",
        "prefeita municipal", "secretario", "secretario municipal", "dirigente", "ordenador de despesa",
    ),
    "municipio": (
        "municipio", "municipios", "municipio beneficiado", "municipios beneficiados", "municipio sede",
        "cidade", "localidade",
    ),
    "vigencia_inicio": (
        "inicio da vigencia", "vigencia inicial", "data de inicio", "data inicial", "inicio", "inicio previsto",
        "inicio da execucao", "inicio das obras", "data prevista de inicio",
    ),
    "vigencia_fim": (
        "fim da vigencia", "vigencia final", "data de termino", "data final", "termino", "termino previsto",
        "fim", "conclusao prevista", "data de conclusao", "previsao de conclusao", "termino da execucao",
        "encerramento",
    ),
    "prazo_referencia_meses": (
        "prazo de execucao", "prazo de implantacao", "prazo de conclusao", "prazo estimado", "prazo previsto",
        "prazo total", "prazo da obra", "prazo", "duracao", "duracao prevista", "tempo de execucao",
        "tempo estimado", "periodo de execucao",
    ),
    "valor_global": (
        "valor global", "valor total", "valor estimado", "valor total estimado", "valor do investimento",
        "valor da obra", "valor do projeto", "valor do empreendimento", "valor solicitado", "valor pleiteado",
        "valor do convenio", "valor do contrato", "valor", "investimento", "investimento total",
        "investimento estimado", "investimento previsto", "custo total", "custo estimado", "custo da obra",
        "custo do projeto", "custo", "orcamento", "orcamento total", "orcamento estimado", "montante", "capex",
        "recursos necessarios", "recursos solicitados", "total geral", "preco global", "estimativa de custo",
    ),
    "lat": ("latitude", "lat", "lat."),
    "lng": ("longitude", "long", "long.", "lng", "lon"),
}

_ROTULOS_POR_TIPO: dict[str, dict[str, tuple[str, ...]]] = {
    "plano": {"nome": ("nome do plano", "plano", "titulo do plano")},
    "programa": {"nome": ("nome do programa", "programa", "titulo do programa")},
    "projeto": {"nome": ("nome do projeto", "projeto", "titulo do projeto")},
}

# Menção em frase: além dos sinônimos de mais de uma palavra.
_CONTEXTO_EXTRA: dict[str, tuple[str, ...]] = {
    "valor_global": ("capex", "investimento"),
    "lat": ("latitude",),
    "lng": ("longitude",),
}
_CAMPOS_CONTEXTUAIS = frozenset({"valor_global", "prazo_referencia_meses", "lat", "lng"})

# Qualificadores aceitos entre o rótulo e os dois-pontos ("Valor total da obra:").
_QUALIFICADOR = (
    r"(?:d[oa]s?|de|n[oº°]\.?|para|previst[oa]s?|estimad[oa]s?|total|global|geral|inicial|final|"
    r"aproximad[oa]s?|necessari[oa]s?|solicitad[oa]s?)"
)
# O complemento muda o sentido: não é o valor/prazo do empreendimento.
_EXCLUSOES: dict[str, tuple[str, ...]] = {
    "valor_global": ("contrapartida", "unitari", "mensal", "anual", "parcela", "bdi", "medicao", "empenh", "aditivo"),
    "prazo_referencia_meses": ("validade", "garantia", "pagamento", "resposta", "recurso", "proposta"),
}

_CONTEXTO_FORMATO: dict[str, tuple[str, ...]] = {
    "cnpj": ("cnpj",),
    "email": ("e-mail", "email", "correio eletronico"),
    "telefone": ("telefone", "tel.", "tel:", "fone", "celular", "contato", "whatsapp"),
    "processo": ("processo",),
}

_GATILHOS_COORDENADAS = (
    "coordenad", "lat/long", "lat/lon", "latitude e longitude", "latitude/longitude",
    "localizacao geografica", "georreferenc",
)
_GATILHOS_VIGENCIA = ("prazo de vigencia", "periodo de execucao", "vigencia", "periodo", "cronograma")

_CARGO_ASSINATURA = re.compile(
    r"^(?:vice-)?(?:prefeit[oa](?: municipal)?|secretari[oa](?: municipal| estadual| executiv[oa]| de estado)?"
    r"|diretor[a]?(?: presidente| geral| executiv[oa])?|president[ea]|superintendente|representante legal)"
    r"(?:\s*(?:de|da|do|-|–|—)\s*.+)?$"
)
_NOME_PESSOA = re.compile(r"^[A-ZÀ-Ý][A-Za-zÀ-ÿ'´.\-]+(?:\s+(?:d[aeo]s?|e|[A-ZÀ-Ý][A-Za-zÀ-ÿ'´.\-]+)){1,6}$")
_TERMOS_INSTITUCIONAIS = (
    "prefeitura", "secretaria", "governo", "estado", "municipio", "departamento", "companhia", "ministerio",
    "camara", "fundacao", "instituto", "universidade", "ltda", "s/a", "s.a", "consorcio", "assessoria",
    "gabinete", "diretoria", "coordenadoria",
)
# Gatilho do ente, casado no texto em minúscula; o nome vem logo depois.
_ENTE_MUNICIPAL = re.compile(r"\b(prefeitura municipal|prefeitura|camara municipal|municipio)\s+(?:de|da|do)\s+")
# O nome é uma sequência de palavras capitalizadas, com conectores no meio
# ("Sao Jose do Rio Preto"). A primeira palavra em minúscula encerra o nome:
# antes, a lista fixa de verbos deixava passar "Bauru informa o seguinte".
_PALAVRA_NOME = r"[A-Z][A-Za-z']*"
_CONECTOR_NOME = r"(?:d[aeo]s?|D[AEO]S?)"
_NOME_MUNICIPIO = re.compile(rf"{_PALAVRA_NOME}(?:\s+(?:{_CONECTOR_NOME}\s+)?{_PALAVRA_NOME}){{0,5}}")
# Brasão ao lado do cabeçalho vira letra solta no fim da linha: a mesma
# prefeitura saiu como "DOIS CÓRREGOS CA" na VM e "DOIS CÓRREGOS <" aqui. Como
# nome de município não termina em token de uma ou duas letras, o resto é ruído
# de reconhecimento — e sem cortá-lo o documento conflitava consigo mesmo.
_RUIDO_NO_FIM_DO_NOME = re.compile(r"(?:\s+[A-Za-z]{1,2})+$")
# Fecho de cortesia. Em ofício brasileiro a assinatura de quem pede vem depois
# dele; o bloco de endereçamento (o destinatário) vem antes, e às vezes também
# no rodapé da última página — por isso posição na página não resolve sozinha.
_FECHO_CORTESIA = re.compile(
    r"^(?:atenciosamente|respeitosamente|cordialmente|certos da aten|na certeza|"
    r"sem mais|subscrevo|aproveito o ensejo)"
)
_TITULO_PESSOAL = re.compile(r"^(?:prof|profa|dr|dra|sr|sra|exmo|exma|eng|arq)[.ªº]*\s+", re.I)
# Assinatura depois do fecho ganha folga maior que CONFIANCA_CONFLITO sobre a de
# antes dele: sem isso as duas empatam, viram conflito e o campo fica vazio.
CONFIANCA_ASSINATURA_POS_FECHO = 0.78
CONFIANCA_ASSINATURA_PRE_FECHO = 0.62

_VERBOS_SOLICITACAO = (
    "solicit", "requer", "pleite", "trata-se", "vimos por meio", "vem por meio", "tem por objetivo",
    "tem por objeto", "visa ", "consiste",
)

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


def _sem_acento_caixa(valor: str) -> str:
    """Sem acento, preservando a caixa. É por ela que o nome do município sabe
    onde termina: `_sem_acento` joga a caixa fora, e sem ela a prosa depois do
    nome era indistinguível do nome."""
    return "".join(c for c in unicodedata.normalize("NFD", valor) if unicodedata.category(c) != "Mn")


_TODOS_ROTULOS = frozenset(
    _sem_acento(rotulo)
    for grupo in (*_ROTULOS.values(), *(r for tipo in _ROTULOS_POR_TIPO.values() for r in tipo.values()))
    for rotulo in grupo
)


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
    if pagina.papel == "invólucro_administrativo":
        confianca -= PENALIDADE_INVOLUCRO
    return {
        "pagina": pagina.numero,
        "trecho": _limpar_texto(trecho)[:LIMITE_TRECHO],
        "metodo": pagina.metodo,
        "papel_fonte": pagina.papel,
        "confianca": round(min(confianca, pagina.confianca_texto), 3),
    }


def _candidato(pagina: Pagina, valor: str, trecho: str, confianca: float) -> dict[str, Any]:
    return {"valor": valor, "evidencia": _evidencia(pagina, trecho, confianca)}


def _rotulos(campo: str, tipo: TipoDemanda) -> list[str]:
    extras = _ROTULOS_POR_TIPO.get(tipo, {}).get(campo, ())
    return sorted({_sem_acento(r) for r in (*_ROTULOS.get(campo, ()), *extras)}, key=len, reverse=True)


def _sem_enumerador(normalizada: str) -> str:
    return _ENUMERADOR.sub("", normalizada, count=1).strip()


def _excluido(campo: str, texto: str) -> bool:
    return any(termo in _sem_acento(texto) for termo in _EXCLUSOES.get(campo, ()))


def _casar_rotulo_espacado(normalizada: str, rotulo: str) -> str | None:
    """"I n t e r e s s a d o: X" — espaçamento entre caracteres, comum em PDF
    oficial, inclusive parcial ("Pr o cu r aç ã o", "Inte r essado").

    `_limpar_texto` já colapsou os espaços, então não há como saber onde
    terminava cada palavra: a comparação descarta todo espaço dos dois lados e
    exige igualdade integral com o sinônimo. Só o lado do rótulo é tocado; o
    valor sai intacto da linha original, o que preserva o alinhamento por
    sufixo de que `_linhas_rotuladas` depende.
    """
    corte = re.search(r"[:\-–—=]\s*", normalizada)
    if not corte or corte.start() > 60:
        return None
    cabeca = re.sub(r"\s+", "", normalizada[:corte.start()])
    compacto = rotulo.replace(" ", "")
    if cabeca not in {compacto, f"{compacto}s"}:
        return None
    return normalizada[corte.end():] or None


def _casar_rotulo(normalizada: str, rotulo: str, campo: str) -> tuple[str | None, float]:
    # O plural é a forma de autuação do SEI ("Interessados:", "Requerentes:");
    # sem o `s?` o sinônimo certo passa batido por causa de uma letra.
    base = rf"{re.escape(rotulo)}s?"
    simples = re.match(rf"^{base}(?:\s*\([^)]{{0,30}}\))?\s*[:\-–—=]\s*(.+)$", normalizada)
    if simples:
        return simples.group(1), 0.92
    qualificado = re.match(rf"^{base}\s+({_QUALIFICADOR}\b[^:]{{0,50}}):\s*(.+)$", normalizada)
    if qualificado and not _excluido(campo, qualificado.group(1)):
        return qualificado.group(2), 0.88
    # Cabeçalho que junta dois dados na linha: "Processo 123/2026 - Interessado: X".
    meio = re.search(rf"[-–—|]\s*{base}\s*[:\-–—=]\s*(.+)$", normalizada)
    if meio:
        return meio.group(1), 0.86
    espacado = _casar_rotulo_espacado(normalizada, rotulo)
    if espacado:
        return espacado, 0.80
    return None, 0.0


def _so_rotulo(normalizada: str, rotulo: str) -> bool:
    return re.fullmatch(rf"{re.escape(rotulo)}s?(?:\s*\([^)]{{0,30}}\))?\s*[:\-–—=]?", normalizada) is not None


def _parece_rotulo(linha: str) -> bool:
    normalizada = _sem_enumerador(_sem_acento(linha)).rstrip()
    if normalizada.endswith(":"):
        return True
    nucleo = normalizada.rstrip(" :-–—=")
    return nucleo in _TODOS_ROTULOS or (nucleo.endswith("s") and nucleo[:-1] in _TODOS_ROTULOS)


_EMENDA_ANTES = ("-", "–", "—", ",")
_FIM_DE_FRASE = (".", "!", "?", ";", ":")


def _continuacao(linhas: list[str], indice: int, valor: str) -> str:
    """Valor rotulado que segue nas linhas de baixo ("Assunto:" que quebra).

    Só emenda quando a quebra é visível: a linha termina em travessão ou
    vírgula, a seguinte começa em minúscula, ou a seguinte abre com travessão.
    Sem essa exigência o valor engolia a saudação logo abaixo ("Prezados, bom
    dia!") e o endereçamento do documento.
    """
    partes = [valor]
    for proxima in linhas[indice + 1: indice + 4]:
        seguinte = proxima.strip()
        acumulado = " ".join(partes).rstrip()
        if not seguinte or len(acumulado) >= 300 or acumulado.endswith(_FIM_DE_FRASE):
            break
        if _parece_rotulo(seguinte) or _enderecamento(seguinte):
            break
        if not (acumulado.endswith(_EMENDA_ANTES) or seguinte[0].islower() or seguinte[0] in "-–—"):
            break
        partes.append(seguinte)
    return " ".join(partes)


def _linhas_rotuladas(paginas: Iterable[Pagina], campo: str, tipo: TipoDemanda = "projeto") -> list[dict[str, Any]]:
    candidatos = []
    rotulos = _rotulos(campo, tipo)
    for pagina in paginas:
        linhas = pagina.texto.splitlines()
        for indice, linha in enumerate(linhas):
            normalizada = _sem_enumerador(_sem_acento(linha))
            for rotulo in rotulos:
                valor, confianca = _casar_rotulo(normalizada, rotulo, campo)
                if valor:
                    # A normalização preserva o comprimento: o sufixo do original é o valor com acentos.
                    original = linha[len(linha) - len(valor):].strip()
                    if original:
                        candidatos.append(_candidato(pagina, _continuacao(linhas, indice, original), linha, confianca))
                    break
                if _so_rotulo(normalizada, rotulo) and indice + 1 < len(linhas):
                    proxima = linhas[indice + 1].strip()
                    if len(proxima) >= 2 and not _parece_rotulo(proxima):
                        candidatos.append(_candidato(pagina, proxima, f"{linha}\n{proxima}", 0.85))
                    break
    return candidatos


def _posicao_termo(normalizada: str, termo: str) -> int:
    achado = re.search(rf"(?<![a-z0-9]){re.escape(termo)}(?![a-z0-9])", normalizada)
    return achado.end() if achado else -1


def _posicao_valor(campo: str, texto: str) -> int:
    normalizado = _sem_acento(texto)
    if campo == "valor_global":
        achados = [m.start() for m in (_MOEDA.search(texto), _MOEDA_EXTENSO.search(normalizado)) if m]
    elif campo == "prazo_referencia_meses":
        achados = [m.start() for m in (_DURACAO.search(normalizado),) if m]
    else:
        achados = [m.start() for m in (_DMS.search(texto), _DECIMAL.search(texto)) if m]
    return min(achados) if achados else -1


def _mencoes(paginas: Iterable[Pagina], campo: str, tipo: TipoDemanda) -> list[dict[str, Any]]:
    """Valor citado em frase, logo após um sinônimo ("com investimento total de R$ 3,2 milhões")."""
    termos = [r for r in _rotulos(campo, tipo) if " " in r]
    termos += [_sem_acento(t) for t in _CONTEXTO_EXTRA.get(campo, ()) if _sem_acento(t) not in termos]
    termos.sort(key=len, reverse=True)
    candidatos = []
    for pagina in paginas:
        for linha in pagina.texto.splitlines():
            normalizada = _sem_acento(linha)
            for termo in termos:
                fim = _posicao_termo(normalizada, termo)
                if fim < 0:
                    continue
                restante = linha[fim:fim + 160]
                inicio_valor = _posicao_valor(campo, restante)
                if inicio_valor < 0 or inicio_valor > 80 or _excluido(campo, restante[:inicio_valor]):
                    continue
                candidatos.append(_candidato(pagina, restante, linha, 0.74))
                break
    return candidatos


def _candidatos_formato(paginas: Iterable[Pagina], padrao: re.Pattern[str], contexto: str) -> list[dict[str, Any]]:
    termos = _CONTEXTO_FORMATO.get(contexto, (contexto,))
    candidatos = []
    for pagina in paginas:
        for match in padrao.finditer(pagina.texto):
            inicio = pagina.texto.rfind("\n", 0, match.start()) + 1
            fim = pagina.texto.find("\n", match.end())
            trecho = pagina.texto[inicio: fim if fim >= 0 else len(pagina.texto)]
            confianca = 0.9 if any(termo in _sem_acento(trecho) for termo in termos) else 0.75
            candidatos.append(_candidato(pagina, match.group(0), trecho, confianca))
    return candidatos


def _cnpj_sem_mascara(paginas: Iterable[Pagina]) -> list[dict[str, Any]]:
    candidatos = []
    for pagina in paginas:
        for linha in pagina.texto.splitlines():
            if "cnpj" in _sem_acento(linha):
                candidatos += [_candidato(pagina, m.group(0), linha, 0.9) for m in _CNPJ_NUMERICO.finditer(linha)]
    return candidatos


def _coordenadas_pareadas(paginas: Iterable[Pagina], campo: str) -> list[dict[str, Any]]:
    """"Coordenadas: -22.2139, -49.9458" ou em graus com hemisfério."""
    candidatos = []
    for pagina in paginas:
        for linha in pagina.texto.splitlines():
            if not any(gatilho in _sem_acento(linha) for gatilho in _GATILHOS_COORDENADAS):
                continue
            par = _PAR_DECIMAL.search(linha)
            if par:
                candidatos.append(_candidato(pagina, par.group(1) if campo == "lat" else par.group(2), linha, 0.84))
                continue
            for dms in _DMS.finditer(linha):
                hemisferio = (dms.group(4) or "").upper()
                if hemisferio and ((campo == "lat" and hemisferio in {"N", "S"}) or (campo == "lng" and hemisferio in {"O", "W", "L", "E"})):
                    candidatos.append(_candidato(pagina, dms.group(0), linha, 0.84))
                    break
    return candidatos


def _enderecamento(linha: str) -> bool:
    """A linha abre um bloco de endereçamento? O artigo é descartado antes da
    comparação: "À Excelentíssima Senhora" normaliza para "a excelentissima..."
    e não casaria com o marcador."""
    normalizada = re.sub(r"^(?:a|ao|as|aos)\s+", "", _sem_acento(linha).strip())
    return any(normalizada.startswith(marca) for marca in _ENDERECAMENTO)


def _nome_assinatura(bruto: str) -> str:
    """"Prof.ª Dra. Telma ..." e "DEPUTADO ESTADUAL - RICARDO MADALENA" trazem o
    nome junto do tratamento ou do cargo."""
    valor = bruto.strip(" ,.;")
    if " - " in valor:
        valor = valor.split(" - ")[-1].strip()
    anterior = None
    while valor != anterior:
        anterior = valor
        valor = _TITULO_PESSOAL.sub("", valor).strip()
    return valor


def _assinaturas(paginas: Iterable[Pagina]) -> list[dict[str, Any]]:
    """Bloco de assinatura: nome da pessoa na linha acima do cargo.

    O padrão "nome sobre cargo" também descreve o destinatário no cabeçalho
    ("Natália Resende / Secretária de Meio Ambiente"), e era ele que vinha
    preenchido como se fosse quem pede. Quem endereça fica de fora, e quem
    assina depois do fecho de cortesia vale mais que quem aparece antes.
    """
    candidatos = []
    for pagina in paginas:
        linhas = pagina.texto.splitlines()
        fecho = next((i for i, linha in enumerate(linhas) if _FECHO_CORTESIA.match(_sem_acento(linha).strip())), None)
        for indice in range(1, len(linhas)):
            cargo = _sem_acento(linhas[indice]).strip(" ,.;")
            if not _CARGO_ASSINATURA.match(cargo):
                continue
            if _enderecamento(linhas[indice - 1]) or (indice >= 2 and _enderecamento(linhas[indice - 2])):
                continue
            nome = _nome_assinatura(linhas[indice - 1])
            if not _NOME_PESSOA.match(nome) or re.search(r"\d|:", nome):
                continue
            if any(termo in _sem_acento(nome) for termo in _TERMOS_INSTITUCIONAIS):
                continue
            confianca = (CONFIANCA_ASSINATURA_POS_FECHO if fecho is not None and indice > fecho
                         else CONFIANCA_ASSINATURA_PRE_FECHO)
            candidatos.append(_candidato(pagina, nome, f"{linhas[indice - 1]}\n{linhas[indice]}", confianca))
    return candidatos


def _entes_municipais(paginas: Iterable[Pagina], campo: str) -> list[dict[str, Any]]:
    """"Prefeitura Municipal de X" dá a instituição; qualquer "... de X" municipal dá o município."""
    candidatos = []
    for pagina in paginas:
        for linha in pagina.texto.splitlines():
            # A caixa é preservada aqui e descartada só na comparação: as duas
            # formas têm o mesmo comprimento, então as posições valem na linha
            # original.
            caixa = _sem_acento_caixa(linha)
            normalizada = caixa.lower()
            # Sem rótulo, a pesca não distingue quem pede de quem recebe: numa
            # linha de endereçamento ela preenchia a instituição errada com
            # aparência de acerto.
            if any(normalizada.startswith(marca) for marca in _ENDERECAMENTO):
                continue
            for gatilho in _ENTE_MUNICIPAL.finditer(normalizada):
                nome = _NOME_MUNICIPIO.match(caixa, gatilho.end())
                if not nome:
                    continue
                fim = nome.end()
                ruido = _RUIDO_NO_FIM_DO_NOME.search(caixa, nome.start(), fim)
                if ruido:
                    fim = ruido.start()
                if fim <= nome.start():
                    continue
                if campo == "instituicao_label":
                    if gatilho.group(1) == "municipio":
                        continue
                    valor = linha[gatilho.start():fim]
                else:
                    valor = linha[nome.start():fim]
                if valor.strip():
                    candidatos.append(_candidato(pagina, valor.strip(), linha, 0.7))
    return candidatos


def _numero_ptbr(valor: str) -> float | None:
    try:
        return float(valor.replace("R$", "").replace(".", "").replace(",", ".").strip())
    except ValueError:
        return None


def _data_valida(ano: int, mes: int, dia: int) -> str | None:
    try:
        return date(ano, mes, dia).isoformat()
    except ValueError:
        return None


def _datas(texto: str) -> list[tuple[int, str, str]]:
    """Datas numéricas e por extenso na ordem em que aparecem: (posição, ISO, trecho original)."""
    normalizado = _sem_acento(texto)
    achados = []
    for match in _DATA.finditer(normalizado):
        iso = _data_valida(int(match[3]), int(match[2]), int(match[1]))
        if iso:
            achados.append((match.start(), iso, texto[match.start():match.end()]))
    for match in _DATA_EXTENSO.finditer(normalizado):
        iso = _data_valida(int(match[3]), _MESES[match[2]], int(match[1]))
        if iso:
            achados.append((match.start(), iso, texto[match.start():match.end()]))
    return sorted(achados)


def _data_iso(valor: str) -> str | None:
    datas = _datas(valor)
    return datas[0][1] if datas else None


def _escala(termo: str) -> int:
    """Multiplicador da escala escrita por extenso ou abreviada."""
    normalizado = _sem_acento(termo)
    if normalizado.startswith("bi"):
        return 1_000_000_000
    if normalizado.startswith("milh") or normalizado == "mi":
        return 1_000_000
    return 1_000


def _valor_monetario(valor: str) -> float | None:
    normalizado = _sem_acento(valor)
    moeda = _MOEDA.search(valor)
    extenso = _MOEDA_EXTENSO.search(normalizado)
    # Compara o início dos números: "R$ 3,2 milhões" casa "R$ 3" em _MOEDA e "3,2 milhoes" por extenso.
    inicio_moeda = (moeda.start(1) if moeda.group(1) else moeda.start(2)) if moeda else None
    if extenso and (inicio_moeda is None or extenso.start(1) <= inicio_moeda):
        base = float(extenso.group(1).replace(",", "."))
        return round(base * _escala(extenso.group(2)), 2)
    if moeda:
        return _numero_ptbr(moeda.group(1) or moeda.group(2))
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
        return _valor_monetario(valor)
    if campo == "prazo_referencia_meses":
        prazo = _DURACAO.search(_sem_acento(valor))
        if not prazo:
            return None
        quantidade = int(prazo.group(1))
        return quantidade * 12 if prazo.group(2).startswith("ano") else quantidade
    if campo == "lat":
        return _coordenada(valor, 90)
    if campo == "lng":
        return _coordenada(valor, 180)
    if campo == "instituicao_cnpj":
        digitos = re.sub(r"\D", "", valor)
        return f"{digitos[:2]}.{digitos[2:5]}.{digitos[5:8]}/{digitos[8:12]}-{digitos[12:]}" if len(digitos) == 14 else None
    if campo in {"nome", "instituicao_label", "representante_nome", "orgao_responsavel", "municipio"}:
        limpo = valor.strip()
        if campo == "instituicao_label":
            limpo = re.sub(r"\s*[-–]?\s*(?:CNPJ\s*)?\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}.*$", "", limpo, flags=re.I)
        return limpo[:200]
    return valor.strip()


def _chave_do_valor(valor: Any) -> Any:
    """Chave que decide se dois candidatos dizem a mesma coisa.

    Um documento que repete o próprio nome em caixa alta no cabeçalho e normal
    no corpo produzia "DOIS CÓRREGOS" e "Dois Córregos" como valores distintos:
    empatavam em confiança, viravam conflito e o campo ficava vazio — o
    documento cancelava a si mesmo.
    """
    return _sem_acento(valor).strip() if isinstance(valor, str) else valor


def _resultado(campo: str, candidatos: list[dict[str, Any]]) -> dict[str, Any]:
    normalizados = []
    for candidato in candidatos:
        valor = _normalizar(campo, candidato["valor"])
        if valor is not None and valor != "":
            normalizados.append({**candidato, "normalizado": valor})
    if not normalizados:
        return {"estado": "nao_encontrado", "confianca": 0.0, "evidencias": [], "candidatos": []}
    normalizados.sort(key=lambda item: item["evidencia"]["confianca"], reverse=True)
    distintos, vistos = [], set()
    for item in normalizados:
        chave = _chave_do_valor(item["normalizado"])
        if chave in vistos:
            continue
        vistos.add(chave)
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


def _descricao(paginas: list[Pagina], tipo: TipoDemanda = "projeto") -> list[dict[str, Any]]:
    candidatos = _linhas_rotuladas(paginas, "descricao", tipo)
    if candidatos:
        return candidatos
    paragrafos = []
    for pagina in paginas:
        if pagina.papel not in {"solicitação_principal", "fonte_técnica"}:
            continue
        for trecho in re.split(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚ])", pagina.texto):
            paragrafo = " ".join(trecho.split())
            # O cabeçalho do ofício não tem ponto final, então o endereçamento
            # inteiro virava um parágrafo e era descrito como se fosse o objeto.
            if 80 <= len(paragrafo) <= 1200 and not _enderecamento(paragrafo):
                paragrafos.append((pagina, paragrafo))
    # Um único candidato por estratégia: dois parágrafos equivalentes virariam conflito.
    com_verbo = next(((p, t) for p, t in paragrafos if any(v in _sem_acento(t) for v in _VERBOS_SOLICITACAO)), None)
    if com_verbo:
        return [_candidato(com_verbo[0], com_verbo[1], com_verbo[1], 0.72)]
    if paragrafos:
        return [_candidato(paragrafos[0][0], paragrafos[0][1], paragrafos[0][1], 0.66)]
    return []


def _vigencia(paginas: list[Pagina], indice: int, tipo: TipoDemanda = "projeto") -> list[dict[str, Any]]:
    candidatos = _linhas_rotuladas(paginas, "vigencia_inicio" if indice == 0 else "vigencia_fim", tipo)
    rotulado = re.compile(rf"^(?:{'|'.join(map(re.escape, _GATILHOS_VIGENCIA))})\b[^:]{{0,40}}[:\-–]")
    for pagina in paginas:
        for linha in pagina.texto.splitlines():
            normalizada = _sem_enumerador(_sem_acento(linha))
            if not any(gatilho in normalizada for gatilho in _GATILHOS_VIGENCIA):
                continue
            datas = _datas(linha)
            # Só um intervalo completo define início e fim; uma data solta é ambígua.
            if len(datas) < 2:
                continue
            confianca = 0.9 if rotulado.match(normalizada) else 0.78
            candidatos.append(_candidato(pagina, datas[indice][2], linha, confianca))
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


def _com_arroba_corrigida(paginas: list[Pagina]) -> list[Pagina]:
    """Páginas com o arroba recomposto, só para a busca de e-mail.

    A correção não vaza para os demais campos: eles continuam vendo o texto
    exatamente como o OCR entregou.
    """
    return [replace(pagina, texto=_ARROBA_QUEBRADA.sub("@", pagina.texto)) for pagina in paginas]


def _candidatos_campo(campo: str, paginas: list[Pagina], tipo: TipoDemanda) -> list[dict[str, Any]]:
    if campo == "descricao":
        return _descricao(paginas, tipo)
    if campo in {"vigencia_inicio", "vigencia_fim"}:
        return _vigencia(paginas, 0 if campo == "vigencia_inicio" else 1, tipo)
    if campo == "instituicao_cnpj":
        return _candidatos_formato(paginas, _CNPJ, "cnpj") + _cnpj_sem_mascara(paginas)
    if campo == "representante_email":
        return _candidatos_formato(_com_arroba_corrigida(paginas), _EMAIL, "email")
    if campo == "representante_telefone":
        return _candidatos_formato(paginas, _TELEFONE, "telefone")
    candidatos = _linhas_rotuladas(paginas, campo, tipo)
    if campo in _CAMPOS_CONTEXTUAIS:
        candidatos += _mencoes(paginas, campo, tipo)
    if campo in {"lat", "lng"}:
        candidatos += _coordenadas_pareadas(paginas, campo)
    if campo == "representante_nome":
        candidatos += _assinaturas(paginas)
    if campo in {"instituicao_label", "municipio"}:
        candidatos += _entes_municipais(paginas, campo)
    return candidatos


def _evidencia_do_nome(nome_arquivo: str, confianca: float) -> dict[str, Any]:
    """Evidência de um valor tirado do nome do arquivo, e não de uma página."""
    return {"pagina": 0, "trecho": nome_arquivo[:LIMITE_TRECHO], "metodo": "nome_arquivo",
            "papel_fonte": "nome_arquivo", "confianca": round(confianca, 3)}


def numero_no_nome(nome_arquivo: str | None) -> str | None:
    """Número do processo como o SEI o carimba no nome do arquivo."""
    achado = _PROCESSO_NO_NOME.search(nome_arquivo or "")
    if not achado:
        return None
    meio = re.sub(r"\D", "", achado.group(2)).lstrip("0").zfill(8)
    return f"{achado.group(1)}.{meio}/{achado.group(3)}-{achado.group(4)}"


def titulo_no_nome(nome_arquivo: str | None) -> str | None:
    """Título aproveitável como nome do objeto, quando o nome do arquivo tiver um.

    Devolve None para o que só descreve o documento ("Ofício nº 1.145/2025",
    "PLANILHA ORCAMENTARIA", "Xerox Scan 06182025"): virariam nome de projeto.
    """
    if not nome_arquivo:
        return None
    titulo = re.sub(r"\.pdf$", "", nome_arquivo.strip(), flags=re.I)
    titulo = _PREFIXO_SEI.sub("", titulo)
    titulo = re.sub(r"_{2,}", " - ", titulo).replace("_", " ")
    titulo = _CANAL_NO_NOME.sub("", re.sub(r"\s{2,}", " ", titulo).strip(" -–"))
    titulo = re.sub(r"^[\d.]+\s*[-–]?\s*", "", titulo)
    pedido = _VERBO_DE_PEDIDO.search(titulo)
    if pedido and pedido.start() > 0:
        # "Oficio Bracell n - 043 - 2025 - Solicitacao Porto ..." começa no pedido.
        titulo = titulo[pedido.start():]
    else:
        anterior = None
        while titulo != anterior:
            anterior = titulo
            titulo = _TIPO_DOCUMENTAL.sub("", titulo)
            if re.match(r"^(?:n[º°o]?\.?\s*)?\d", titulo):
                titulo = re.sub(r"^(?:n[º°o]?\.?\s*)?[\d.\/-]+[\s\-–]*", "", titulo)
            titulo = titulo.strip(" -–")
    titulo = re.sub(r"\s{2,}", " ", titulo).strip(" -–")
    if len(titulo) < 10 or _NOME_SEM_VALOR.match(titulo):
        return None
    if len(re.findall(r"[A-Za-zÀ-ÿ]{3,}", titulo)) < 2:
        return None
    return titulo[:200]


def numero_processo(conteudo: bytes, nome_arquivo: str | None = None) -> str | None:
    """Só o número do processo SEI, quando identificado sem conflito."""
    do_nome = numero_no_nome(nome_arquivo)
    if do_nome:
        return do_nome
    paginas, _ = extrair_paginas(conteudo)
    return _resultado("numero_processo", _candidatos_formato(paginas, _PROCESSO, "processo")).get("valor_normalizado")


def com_regra(campo: str, tipo: TipoDemanda) -> bool:
    """Existe alguma estratégia capaz de ler este campo do PDF?

    Campo sem regra nenhuma nunca seria preenchido; cobrá-lo no desfecho
    transformaria toda análise em ressalva por um limite do próprio extrator.
    """
    if campo in CAMPOS_POR_FORMATO:
        return True
    if campo == "maturidade_objeto":
        return tipo == "projeto"
    return bool(_ROTULOS.get(campo) or _ROTULOS_POR_TIPO.get(tipo, {}).get(campo))


def analisar(conteudo: bytes, tipo: TipoDemanda = "projeto", nome_arquivo: str | None = None) -> dict[str, Any]:
    contrato = json.loads(_CONTRATO.read_text(encoding="utf-8"))
    campos_contrato = contrato["tipos_objeto"][tipo]["campos"]
    paginas, avisos = extrair_paginas(conteudo)
    resultados: dict[str, Any] = {}
    extraiveis = set(campos_contrato) | {"instituicao_label", "representante_nome", "representante_email", "representante_telefone", "municipio"}
    for campo in sorted(extraiveis):
        if campo in CAMPOS_NAO_EXTRAIVEIS:
            resultados[campo] = {"estado": "aguardando_resolucao", "confianca": 0.0, "evidencias": [], "candidatos": []}
            continue
        candidatos = _candidatos_campo(campo, paginas, tipo)
        if campo == "nome" and (titulo := titulo_no_nome(nome_arquivo)):
            candidatos = [*candidatos, {"valor": titulo,
                                        "evidencia": _evidencia_do_nome(nome_arquivo, CONFIANCA_NOME_ARQUIVO)}]
        resultados[campo] = _resultado(campo, candidatos)
    resultados["maturidade_objeto"] = _maturidade(tipo, paginas, contrato)

    processos = _candidatos_formato(paginas, _PROCESSO, "processo")
    if numero_no_arquivo := numero_no_nome(nome_arquivo):
        processos = [*processos, {"valor": numero_no_arquivo,
                                  "evidencia": _evidencia_do_nome(nome_arquivo, CONFIANCA_PROCESSO_NO_NOME)}]
    numero_processo = _resultado("numero_processo", processos)
    preenchiveis = {
        campo: resultado.get("valor_normalizado")
        for campo, resultado in resultados.items()
        if resultado.get("estado") == "normalizado" and resultado.get("confianca", 0) >= CONFIANCA_MINIMA
    }
    # Desfecho da análise. Só entra no julgamento o que o extrator sabe procurar
    # neste tipo: campo sem regra e campo resolvido no SIGMA ficam de fora.
    avaliados = sorted(c for c in resultados if c not in CAMPOS_NAO_EXTRAIVEIS and com_regra(c, tipo))
    conflitantes = [c for c in avaliados if resultados[c]["estado"] == "conflitante"]
    # Valor abaixo da confiança mínima também não chega ao formulário: falta igual.
    faltando = [c for c in avaliados if c not in preenchiveis and c not in conflitantes]
    resumo = {
        "desfecho": "sucesso" if not faltando and not conflitantes else "ressalvas",
        "campos_avaliados": avaliados,
        "campos_lidos": [c for c in avaliados if c in preenchiveis],
        "campos_faltando": faltando,
        "campos_conflitantes": conflitantes,
        "campos_sem_regra": sorted(c for c in resultados if c not in CAMPOS_NAO_EXTRAIVEIS and not com_regra(c, tipo)),
    }
    return {
        "versao": "2.2.0",
        "tipo_demanda": tipo,
        "numero_processo": numero_processo.get("valor_normalizado"),
        "campos": resultados,
        "campos_sugeridos": preenchiveis,
        "ausentes": [campo for campo, resultado in resultados.items() if resultado["estado"] in {"nao_encontrado", "aguardando_resolucao"}],
        "conflitos": [campo for campo, resultado in resultados.items() if resultado["estado"] == "conflitante"],
        "resumo": resumo,
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
