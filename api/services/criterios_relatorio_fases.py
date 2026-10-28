"""Descrição documental das bases da auditoria, sem banco, rede ou leitura de rasters.

``descrever`` aceita os descritores ``id/nome/papel`` de ``campos`` da auditoria.
Retorna uma entrada por par (id, papel), na ordem recebida, excluindo a entrada
e papéis de outra análise. ``criterios`` descreve somente vínculos documentais;
``avisos`` registra lacunas. Não atesta integridade, incidência espacial ou
homologação e não altera enquadramento, índices, pesos ou metodologia.

Metadados recebidos: ``campo['raster']['metodologia_origem']`` (dict ou JSON),
ou ``SICARD_METODOLOGIA``, também dentro de ``raster['metadados']``. Não se seguem caminhos de
manifestos recebidos. As únicas leituras são JSON pequenos, fixos, do projeto.
O catálogo histórico abaixo é uma transcrição identificada do Git, não o
catálogo R01–R16 da normalização v3 (que tem códigos diferentes).
"""
from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[2]
BIBLIOTECA = "config/geoespacial/biblioteca_criterios_risco_restricao.json"
ALIASES = "config/geoespacial/aliases_extracao_atributos.json"
MATRIZ = "config/matriz-criterios-premissas-v3.json"
NORMALIZACAO = "data/geoespacial/outputs/normalizacao_favorabilidade_fase2.json"
HISTORICO = (
    "git:c7b477bc:documentacao/saidas_modelos/claude_fable5_1/pipeline/"
)
FONTE_RODADA = (
    "/saidas-geoespaciais/analises-avulsas/processamento/"
    "tomtom-rede-completa-20261027T205730Z/favorabilidade_rede_trechos_20261027.gpkg"
)
FONTE_HISTORICA = (
    "/superficies-indices/hierarquizacao/favorabilidade/Favorabilidade Rede Trechos pol.gpkg"
)
GPKG_HISTORICO = (
    "documentacao/saidas_modelos/claude_fable5_1/produtos/favorabilidade_rede_trechos.gpkg"
)
# catalogo.py: códigos, dimensões, nomes e medidas; rede.py: composição efetiva.
REDE_HISTORICA = (
    ("R1", "Técnica", "Proximidade com segmentos rodoviários de VDM alto",
     "VDM médio do subtrecho, por média dos pontos amostrados do modelo de capacidade."),
    ("R2", "Técnica", "Proximidade com segmentos de saturação elevada",
     "Relação volume/capacidade de pico e pior nível de serviço do subtrecho (A=1 a F=6)."),
    ("R3", "Técnica", "Proximidade com segmentos de lentidão recorrente",
     "Atraso relativo: velocidade de fluxo livre dividida pela velocidade observada menos 1; média dos pontos amostrados."),
    ("R4", "Técnica", "Proximidade com segmentos de geometria deficiente",
     "Classe de relevo (plano=0, ondulado=0,5, montanhoso=1) e velocidade livre de referência invertida."),
    ("R5", "Segurança", "Proximidade com segmentos de alta gravidade de acidentes",
     "Óbitos e feridos graves associados ao subtrecho, por ano e por km."),
    ("R6", "Segurança", "Proximidade com segmentos de alta incidência de acidentes com usuários vulneráveis",
     "Pedestres, ciclistas e motociclistas envolvidos em sinistros associados ao subtrecho, por ano e por km."),
    ("R7", "Segurança", "Maior necessidade de mitigação em eixos de cargas",
     "Caminhões envolvidos em sinistros associados ao subtrecho, por ano e por km."),
    ("R8", "Territorial", "Proximidade com segmentos de alto conflito urbano-regional",
     "Fração da extensão do subtrecho inserida em área urbanizada (IBGE 2019)."),
    ("R9", "Econômica", "Maior acessibilidade funcional à malha ferroviária estratégica",
     "Distância mínima do subtrecho à ferrovia ativa mais próxima."),
    ("R10", "Econômica", "Maior acessibilidade funcional a eixos hidroviários eficientes",
     "Distância mínima do subtrecho ao terminal hidroviário de carga mais próximo."),
    ("R11", "Social", "Maior acessibilidade funcional a polos logísticos estratégicos",
     "Distância mínima do subtrecho ao polo logístico estratégico mais próximo."),
)
FONTE_DER = (
    "DER-SP — Sistema Rodoviário Estadual e modelo de capacidade cap_rodo "
    "(volume atribuído, V/C, nível de serviço, velocidade livre e relevo por link), "
    "agregados por subtrecho na camada favorabilidade_rede do SICARD (2026-09-04)."
)
FONTE_INFOSIGA = (
    "InfoSiga SP (Detran-SP/CGSV) — microdados de sinistros 2019–2024, tipo de via "
    "Estradas e rodovias, agregados por município (cod_ibge); carga oficial no "
    "esquema infosiga do SICARD."
)
FONTES_HISTORICAS = {
    "R1": FONTE_DER, "R2": FONTE_DER, "R4": FONTE_DER,
    "R3": "TomTom Traffic Flow API — Segment Data; coleta própria, janela registrada nos insumos.",
    "R5": FONTE_INFOSIGA, "R6": FONTE_INFOSIGA, "R7": FONTE_INFOSIGA,
    "R8": "IBGE — Áreas Urbanizadas do Brasil 2019, fração urbana por subtrecho.",
    "R9": "DNIT/ANTT — Malha ferroviária federal, linhas ativas (CodigoSitu = 1).",
    "R10": "Terminais da Hidrovia Tietê-Paraná, levantamento DH/SEMIL; 18 terminais de carga.",
    "R11": "ANTAQ — portos organizados de Santos e São Sebastião; ANAC — aeroportos SBKP e SBGR (2021).",
}


def _ler_json(relativo: str):
    """Somente artefatos locais conhecidos; indisponibilidade vira aviso."""
    try:
        caminho = ROOT.joinpath(*relativo.split("/"))
        if caminho.stat().st_size > 2_000_000:
            return None
        return json.loads(caminho.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return None


def _dict(valor) -> dict:
    if isinstance(valor, str):
        try:
            valor = json.loads(valor)
        except ValueError:
            return {}
    return valor if isinstance(valor, dict) else {}


def _arquivo(ident: str) -> tuple[str, str]:
    caminho, _, camada = ident.removeprefix("storage:").replace("\\", "/").partition("::")
    return caminho, camada


def _historicos() -> list[dict]:
    return [
        {"codigo": codigo, "campo": f"crit_{codigo}", "dimensao": dimensao,
         "nome": nome, "descricao": descricao, "fonte": FONTES_HISTORICAS[codigo],
         "evidencia": HISTORICO + "catalogo.py"}
        for codigo, dimensao, nome, descricao in REDE_HISTORICA
    ]


def _rede_historica(entrada: dict, campo: str) -> None:
    entrada["criterios"] = _historicos()
    entrada["evidencias"].extend([HISTORICO + "catalogo.py", HISTORICO + "rede.py"])
    entrada["agregacao"] = (
        "Média simples dos critérios dentro de cada dimensão e média simples das "
        "cinco dimensões (fav_rede_dim); exige valores completos, sem renormalizar "
        "pesos localmente."
        if campo == "fav_rede_dim" else
        "Média simples dos 11 critérios (fav_rede), exigindo valores completos."
    )
    entrada["avisos"].append(
        "Composição documental vinculada ao pipeline histórico c7b477bc; "
        "a integridade e a versão do GeoPackage não foram verificadas nesta descrição."
    )


def _normalizados(entrada: dict, caminho: str, camada: str) -> bool:
    grupo = entrada["papel"]
    esperado = f"data/geoespacial/outputs/favorabilidade_{grupo}_normalizada.gpkg"
    # Não atribuir o catálogo a uma cópia homônima ou a outra subcamada.
    if caminho.lstrip("/") not in (esperado, "aplicacao/" + esperado):
        return False
    registro = _dict(_ler_json(NORMALIZACAO))
    base = _dict(registro.get(grupo))
    if str(base.get("arquivo", "")).replace("\\", "/") != esperado or camada:
        entrada["avisos"].append("Subcamada ou vínculo com o registro de normalização não verificável.")
        return True
    fichas = _ler_json(MATRIZ)
    fichas = {f.get("Critério"): f for f in fichas if isinstance(f, dict)} if isinstance(fichas, list) else {}
    grupos = _dict(registro.get("criterios_matriz_v3"))
    criterios = grupos.get(grupo, [])
    for criterio in criterios if isinstance(criterios, list) else []:
        if not isinstance(criterio, dict) or criterio.get("disponivel") is not True:
            continue
        nome = criterio.get("criterio")
        ficha = fichas.get(nome, {})
        entrada["criterios"].append({
            "codigo": criterio.get("codigo"), "nome": nome,
            "campo": criterio.get("campo"), "componentes": deepcopy(criterio.get("componentes", [])),
            "descricao": ficha.get("Premissa") or "Premissa não disponível na matriz local.",
            "dimensao": ficha.get("Dimensão"), "fonte": ficha.get("Fonte"),
            "operador": ficha.get("Operador"), "metrica": ficha.get("Métrica (o que é medido)"),
            "unidade": ficha.get("Unidade de medida"),
        })
    entrada["evidencias"].extend([NORMALIZACAO, MATRIZ])
    entrada["agregacao"] = registro.get("agregacao_final")
    entrada["avisos"].append(
        "Registro local da normalização v3; não comprova a versão nem a integridade "
        "da superfície usada. Não equivale ao pipeline histórico R1–R11."
    )
    return True


def _raster(entrada: dict, descritor: dict) -> None:
    raster = _dict(descritor.get("raster"))
    bruto = raster.get("metodologia_origem")
    if bruto is None:
        bruto = raster.get("SICARD_METODOLOGIA")
    if bruto is None:
        bruto = _dict(raster.get("metadados")).get("SICARD_METODOLOGIA")
    metodo = _dict(bruto)
    if not metodo:
        entrada["avisos"].append(
            "SICARD_METODOLOGIA ausente ou inválido: composição do raster não verificável. "
            "O nome do arquivo não comprova os critérios utilizados."
        )
        return
    entrada["metodologia_raster"] = deepcopy(metodo)
    entrada["evidencias"].append("auditoria:campo.raster.SICARD_METODOLOGIA")
    fonte, camada = _arquivo(str(metodo.get("fonte", "")))
    campo = metodo.get("campo")
    if (entrada["papel"] == "rede" and fonte in (FONTE_RODADA, FONTE_HISTORICA)
            and not camada and campo in ("fav_rede_dim", "fav_rede")):
        _rede_historica(entrada, campo)
    else:
        entrada["avisos"].append(
            "A metodologia recebida não estabelece vínculo verificável entre a fonte "
            "do raster e um catálogo de critérios; nenhum catálogo genérico foi atribuído."
        )
    if metodo.get("formula"):
        entrada["transformacao_raster"] = str(metodo["formula"])
    entrada["avisos"].append(
        "Metadados recebidos, sem reabertura do raster ou verificação de hash. "
        "A composição do índice de origem não se confunde com a média das células "
        "ponderada pela área intersectada na demanda."
    )


def descrever(campos: list[dict], *, analise: str) -> list[dict]:
    """Descreve as bases usadas, nunca bases apenas disponíveis no catálogo.

    Análises aceitas: ``elegibilidade`` e ``favorabilidade``. Entradas sem id ou
    com papel alheio são ignoradas; duplicatas id/papel são consolidadas.
    Descritores conflitantes não recebem composição inferida. Rótulos recebidos
    são preservados como texto, sem produção de HTML.
    """
    papeis = {"elegibilidade": {"risco", "restricao"}, "favorabilidade": {"grade", "rede"}}
    if analise not in papeis:
        raise ValueError("Análise deve ser elegibilidade ou favorabilidade.")
    biblioteca = _dict(_ler_json(BIBLIOTECA))
    criterios = {
        c["id"]: c for c in biblioteca.get("criterios", [])
        if isinstance(c, dict) and c.get("id")
    }
    aliases = _dict(_dict(_ler_json(ALIASES)).get("camadas"))
    grupos = {}
    for campo in campos:
        if not isinstance(campo, dict) or campo.get("papel") not in papeis[analise] or not campo.get("id"):
            continue
        chave = (str(campo["id"]), campo["papel"])
        grupos.setdefault(chave, []).append(campo)
    resultado = []
    for (ident, papel), descritores in grupos.items():
        descritor = descritores[0]
        caminho, camada = _arquivo(ident)
        codigo = camada or PurePosixPath(caminho).stem
        # UUIDs/ids de banco não recebem vínculo pelo nome de exibição.
        item = criterios.get(codigo) if ident.startswith("storage:") or ident == codigo else None
        alias = _dict(aliases.get(codigo))
        entrada = {
            "id": ident, "nome": descritor.get("nome") or (item or alias).get("nome") or ident,
            "papel": papel, "criterios": [], "avisos": [], "evidencias": [],
        }
        conflitantes = any(
            d.get("raster") != descritor.get("raster") or d.get("tipo") != descritor.get("tipo")
            for d in descritores[1:]
        )
        if conflitantes:
            entrada["avisos"].append("Descritores conflitantes para a mesma base e papel; composição não verificável.")
        elif descritor.get("tipo") == "raster" or "raster" in descritor:
            _raster(entrada, descritor)
        elif analise == "elegibilidade" and item:
            entrada["criterios"] = [{
                "codigo": item["id"], "nome": item["nome"], "descricao": item.get("fundamento"),
                "fonte": item.get("fonte"), "componente": item.get("componente"),
                "enquadramento_catalogo": item.get("tipo"), "condicao_elevacao": item.get("elevacao"),
            }]
            entrada["evidencias"].append(BIBLIOTECA)
            entrada["avisos"].append(
                "Vínculo pelo identificador canônico da biblioteca, sem verificar conteúdo "
                "ou versão da base. O papel aplicado é o da auditoria, não uma decisão jurídica."
            )
        elif analise == "favorabilidade":
            if (papel == "rede" and caminho in (FONTE_RODADA, FONTE_HISTORICA,
                                                GPKG_HISTORICO, "/aplicacao/" + GPKG_HISTORICO)
                    and camada in ("", "subtrechos")):
                _rede_historica(entrada, "fav_rede_dim")
                entrada["avisos"].append(
                    "Composição descrita para fav_rede_dim; o relatório deve conferir "
                    "o campo de índice efetivamente lido na superfície vetorial."
                )
            else:
                _normalizados(entrada, caminho, camada)
        if not entrada["criterios"]:
            entrada["avisos"].append(
                "Composição da fonte não verificável nos artefatos disponíveis; "
                "não foram atribuídos critérios por semelhança de nome ou pelo papel."
            )
        resultado.append(entrada)
    return resultado
