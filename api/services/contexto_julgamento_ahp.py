"""Textos do julgamento a partir da matriz e do recorte do convite."""
from __future__ import annotations

import re
import unicodedata


_METODO_FORMULARIO = (
    "Para saber quanto cada um desses aspectos deve pesar na decisão, o SICARD apresenta os critérios dois a dois "
    "e registra a importância relativa atribuída pelos colaboradores. O conjunto dessas comparações é usado para "
    "calcular os pesos pelo Método de Análise Hierárquica (AHP)."
)
_RECURSOS = (
    "Esse planejamento reúne muitas demandas de investimento, e os recursos disponíveis limitam quantas intervenções "
    "podem ser realizadas e em que ritmo. Por isso, é preciso estabelecer prioridades e decidir quais demandas devem "
    "ser atendidas primeiro."
)


def _normalizar(texto: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()).strip()


def _campo(registro: dict, *nomes: str) -> str:
    campos = {_normalizar(str(chave)): valor for chave, valor in registro.items()}
    return next(
        (" ".join(campos[nome].split()) for nome in nomes if isinstance(campos.get(nome), str) and campos[nome].strip()),
        "",
    )


def eh_pli(ambiente: dict) -> bool:
    metadados = ambiente.get("matriz_contexto") or {}
    nomes = (ambiente.get("matriz_nome"), ambiente.get("arquivo_matriz_nome"), _campo(metadados, "plano", "programa"))
    return any(re.search(r"\bpli(?: sp)? 2050\b|\bpli sp\b", _normalizar(nome)) for nome in nomes if isinstance(nome, str))


def _valor_comum(criterios: list[dict], *campos: str) -> str:
    valores = {_campo(criterio, *campos) for criterio in criterios} - {""}
    return next(iter(valores)) if len(valores) == 1 else ""


def _abertura(ambiente: dict) -> str:
    if eh_pli(ambiente):
        return "O PLI-SP 2050 orienta o planejamento da infraestrutura de transportes e da logística no Estado de São Paulo até 2050."
    matriz = ambiente.get("matriz_contexto") or {}
    criterios = ambiente.get("criterios") or []
    assunto = _campo(matriz, "descricao", "contexto", "fenomeno avaliado", "fenomeno", "objetivo") or _valor_comum(
        criterios, "fenomeno avaliado", "fenomeno", "objetivo",
    )
    nome = ambiente.get("matriz_nome") or ambiente.get("hierarquizacao_nome") or ambiente.get("nome")
    if nome and assunto:
        return f"A análise “{nome}” tem o seguinte contexto registrado na matriz. {assunto.rstrip('.')}."
    etapa = _valor_comum(criterios, "etapa", "etapa da hierarquizacao", "etapa hierarquizacao")
    if nome and etapa and _normalizar(etapa).startswith("priorizacao"):
        return f"A análise “{nome}” reúne demandas para a etapa de {etapa.lower().rstrip('.')}."
    if nome:
        return f"A análise “{nome}” reúne demandas que precisam ser avaliadas para definir sua prioridade de atendimento."
    return "A análise reúne demandas que precisam ser avaliadas para definir sua prioridade de atendimento."


def abertura_convite(ambiente: dict, nomes_criterios: list[str]) -> str:
    nomes = [nome.split(" · ", 1)[-1] for nome in nomes_criterios]
    if eh_pli(ambiente):
        ordem = ("eficiencia logistica", "seguranca", "viabilidade institucional e financeira")
        nomes = sorted(nomes, key=lambda nome: ordem.index(_normalizar(nome)) if _normalizar(nome) in ordem else len(ordem))
        nomes = ["viabilidade de implantação" if _normalizar(nome) == ordem[2] else nome.lower() for nome in nomes]
    exemplos = ", ".join(nomes[:2]) + f" e {nomes[2]}" if len(nomes) >= 3 else " e ".join(nomes)
    return (
        f"{_abertura(ambiente)} {_RECURSOS} O SICARD apoia essa decisão ao organizar as demandas e os critérios "
        f"usados para avaliá-las{', como ' + exemplos if exemplos else ''}. Para definir quanto cada critério deve "
        "influenciar a priorização, o sistema reúne as avaliações dos colaboradores, que comparam os critérios dois "
        "a dois. A partir dessas comparações, são calculados os pesos de cada critério pelo Método de Análise "
        "Hierárquica (AHP)."
    )


def orientacao_convite(ambiente: dict, n: int) -> str:
    pedido = (
        "Nesta rodada, pedimos que você avalie a importância relativa das dimensões propostas para o PLI-SP 2050. "
        "No formulário, elas aparecem como critérios."
        if eh_pli(ambiente) else
        "Nesta rodada, pedimos que você avalie a importância relativa dos critérios da matriz."
    )
    quantidade = (f" Você fará {n * (n - 1) // 2} comparações entre os {n} critérios listados abaixo."
                  if n > 2 else " Você fará 1 comparação entre os 2 critérios listados abaixo." if n == 2 else "")
    return (
        f"Como participar. {pedido}{quantidade} Em cada par, indique qual deles deve ter mais influência na "
        "priorização e com que intensidade. Se os dois tiverem a mesma importância, escolha 1."
    )


def contextualizacao_formulario(ambiente: dict, criterios_atribuidos: list[dict]) -> dict:
    matriz = ambiente.get("matriz_contexto") or {}
    fenomeno = _campo(matriz, "fenomeno avaliado", "fenomeno")
    introducao = (
        "O PLI-SP 2050 reúne demandas de infraestrutura de transportes e logística para o Estado de São Paulo."
        if eh_pli(ambiente) else _abertura(ambiente)
    )
    introducao += (
        " Como os recursos disponíveis limitam o número de intervenções que podem ser atendidas em cada período, "
        "o planejamento precisa estabelecer uma ordem de prioridade. O SICARD auxilia nessa tarefa ao organizar "
        "as demandas e as informações usadas para avaliá-las."
    )
    if eh_pli(ambiente):
        introducao += (
            " A matriz considera os benefícios para a rede e para a população, as condições para executar "
            "a intervenção e os riscos que podem comprometer seus resultados."
        )
    elif fenomeno and fenomeno.lower() not in introducao.lower():
        introducao += f" Fenômeno avaliado na matriz — {fenomeno.rstrip('.')}."
    exemplos = []
    preferidos = {
        "eficiencia logistica": ("saturacao", "Considera ganhos como alívio de gargalos, redução do tempo de viagem e melhoria da conectividade."),
        "seguranca": ("vitimas", "Considera a redução estimada de vítimas fatais e graves atribuível à intervenção."),
    } if eh_pli(ambiente) else {}
    def titulo(criterio):
        return _normalizar(_campo(criterio, "criterio", "nome").split(" · ", 1)[-1])
    for criterio in sorted(criterios_atribuidos, key=lambda item: titulo(item) not in preferidos):
        nome = _campo(criterio, "criterio", "nome")
        premissa = _campo(criterio, "premissa", "premissa de avaliacao")
        if nome and premissa:
            # Mostrar uma afirmação completa da premissa, sem cortar no meio de uma frase.
            termo, resumo = preferidos.get(titulo(criterio), ("", ""))
            frase = resumo if termo and termo in _normalizar(premissa) else re.split(r"(?<=[.!?])\s+(?=[A-ZÀ-Ü])", premissa, maxsplit=1)[0]
            if len(frase) <= 360:
                exemplos.append(f"{nome} — {frase.rstrip('.')}." if frase[-1] not in "?!" else f"{nome} — {frase}")
        if len(exemplos) == 2:
            break
    n = len(criterios_atribuidos)
    pares = n * (n - 1) // 2
    recorte = f"Seu formulário reúne {n} critérios em {pares} pares." if n > 2 else (
        "Seu formulário reúne 2 critérios em 1 par." if n == 2 else ""
    )
    return {
        "introducao": introducao,
        "metodo": _METODO_FORMULARIO,
        "orientacao": (
            "O que você vai fazer. " + recorte + " Em cada par, pergunte-se qual dos dois critérios deve pesar mais "
            "ao definir a prioridade das demandas. Use o centro da régua (1) para igual importância ou indique a "
            "intensidade da preferência (3, moderada, 5, forte, 7, muito forte, ou 9, extrema). Depois de preencher "
            "todos os pares, revise a coerência das escolhas e envie a resposta quando a Razão de Consistência "
            "(RC) estiver abaixo de 0,10."
        ) if recorte else "",
        "exemplos": exemplos,
    }
