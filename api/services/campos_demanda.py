"""Normalização de campos persistidos — demandas.plano / programa / projeto."""
from __future__ import annotations

from typing import Any

from api.constants import SISTEMA_REPRESENTANTE_EMAIL, SISTEMA_REPRESENTANTE_NOME, SISTEMA_SIGMA_PESSOA_ID


def _txt(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _pessoa_uuid(pessoa_id: str) -> str:
    return str(pessoa_id).strip()


def aplicar_auditoria_representante(row: dict[str, Any], pessoa_id: str) -> dict[str, Any]:
    """criado_por/atualizado_por = representante legal (sigma_pessoa_id)."""
    pid = _pessoa_uuid(pessoa_id)
    row["sigma_pessoa_id"] = pid
    row["criado_por"] = pid
    row["atualizado_por"] = pid
    return row


# Atributos cadastrais estáveis (migration 072) hoje vivem em colunas nativas de
# demandas.plano/programa/projeto, não mais nas chaves correspondentes do JSONB
# atributos_cadastrais. O mapeamento preserva o contrato HTTP (que continua
# aceitando/retornando essas chaves dentro de atributos_cadastrais).
_ATRIBUTO_NATIVO_MAP = {
    "maturidade_objeto": "maturidade",
    "capex_estimado": "capex_estimado",
    "base_estimativa_capex": "base_estimativa_capex",
    "prazo_referencia_meses": "prazo_referencia_meses",
    "base_estimativa_prazo": "base_estimativa_prazo",
}


def extrair_atributos_nativos(row: dict[str, Any]) -> dict[str, Any]:
    """Move os atributos cadastrais estáveis do JSONB para as colunas nativas (escrita)."""
    if "atributos_cadastrais" not in row:
        return row
    cadastrais = dict(row.get("atributos_cadastrais") or {})
    for chave_json, coluna in _ATRIBUTO_NATIVO_MAP.items():
        if chave_json in cadastrais:
            row[coluna] = cadastrais.pop(chave_json)
    row["atributos_cadastrais"] = cadastrais
    return row


def mesclar_atributos_nativos(row: dict[str, Any]) -> dict[str, Any]:
    """Recompõe atributos_cadastrais incluindo os valores das colunas nativas (leitura)."""
    cadastrais = dict(row.get("atributos_cadastrais") or {})
    for chave_json, coluna in _ATRIBUTO_NATIVO_MAP.items():
        valor = row.get(coluna)
        if valor is None:
            continue
        cadastrais[chave_json] = float(valor) if coluna == "capex_estimado" else valor
    return cadastrais


def normalizar_plano(row: dict[str, Any], *, pessoa_id: str) -> dict[str, Any]:
    aplicar_auditoria_representante(row, pessoa_id)
    row["objetivo_estrategico"] = _txt(row.get("objetivo_estrategico"))
    row["responsavel"] = _txt(row.get("responsavel"))
    row["instituicao_nome"] = _txt(row.get("instituicao_nome"))
    row["instituicao_razao_social"] = _txt(row.get("instituicao_razao_social"))
    row["instituicao_nome_fantasia"] = _txt(row.get("instituicao_nome_fantasia"))
    row["instituicao_cnpj"] = _txt(row.get("instituicao_cnpj"))
    row["representante_nome"] = _txt(row.get("representante_nome"))
    row["representante_email"] = _txt(row.get("representante_email"))
    row["representante_telefone"] = _txt(row.get("representante_telefone"))
    if row.get("valor_global") is None:
        row["valor_global"] = 0
    row.setdefault("motivo_aprovacao", "")
    extrair_atributos_nativos(row)
    return row


def normalizar_programa(row: dict[str, Any], *, pessoa_id: str) -> dict[str, Any]:
    aplicar_auditoria_representante(row, pessoa_id)
    row["objetivo"] = _txt(row.get("objetivo"))
    row["publico_alvo"] = _txt(row.get("publico_alvo"))
    row["orgao_responsavel"] = _txt(row.get("orgao_responsavel"))
    row["justificativa"] = _txt(row.get("justificativa"))
    row["instituicao_nome"] = _txt(row.get("instituicao_nome"))
    row["instituicao_razao_social"] = _txt(row.get("instituicao_razao_social"))
    row["instituicao_nome_fantasia"] = _txt(row.get("instituicao_nome_fantasia"))
    row["instituicao_cnpj"] = _txt(row.get("instituicao_cnpj"))
    row["representante_nome"] = _txt(row.get("representante_nome"))
    row["representante_email"] = _txt(row.get("representante_email"))
    row["representante_telefone"] = _txt(row.get("representante_telefone"))
    if row.get("valor_global") is None:
        row["valor_global"] = 0
    row.setdefault("motivo_aprovacao", "")
    extrair_atributos_nativos(row)
    return row


def normalizar_projeto(row: dict[str, Any], *, pessoa_id: str) -> dict[str, Any]:
    aplicar_auditoria_representante(row, pessoa_id)
    row["descricao"] = _txt(row.get("descricao"))
    row["instituicao_nome"] = _txt(row.get("instituicao_nome"))
    row["instituicao_razao_social"] = _txt(row.get("instituicao_razao_social"))
    row["instituicao_nome_fantasia"] = _txt(row.get("instituicao_nome_fantasia"))
    row["instituicao_cnpj"] = _txt(row.get("instituicao_cnpj"))
    row["representante_nome"] = _txt(row.get("representante_nome"))
    row["representante_email"] = _txt(row.get("representante_email"))
    row["representante_telefone"] = _txt(row.get("representante_telefone"))
    if not row.get("vinculo_institucional"):
        row["vinculo_tipo"] = ""
    else:
        row["vinculo_tipo"] = _txt(row.get("vinculo_tipo"))
    row.setdefault("motivo_aprovacao", "")
    if row.get("classificacao") is None:
        row["classificacao"] = {}
    if row.get("complementos") is None:
        row["complementos"] = {}
    extrair_atributos_nativos(row)
    return row


def dados_representante_sistema() -> dict[str, str]:
    return {
        "sigma_pessoa_id": SISTEMA_SIGMA_PESSOA_ID,
        "representante_nome": SISTEMA_REPRESENTANTE_NOME,
        "representante_email": SISTEMA_REPRESENTANTE_EMAIL,
        "representante_telefone": "",
        "criado_por": SISTEMA_SIGMA_PESSOA_ID,
        "atualizado_por": SISTEMA_SIGMA_PESSOA_ID,
    }
