"""Normalização de campos persistidos — demandas.plano / programa / projeto."""
from __future__ import annotations

from typing import Any

from api.constants import SISTEMA_REPRESENTANTE_EMAIL, SISTEMA_REPRESENTANTE_NOME, SISTEMA_SIGMA_PESSOA_ID
from api.exceptions import DatabaseUnavailableError
from api.services.autoria_demanda import validar_autor
from api.repositories import sigma_cadastro_repository, sigma_usuario_repository

_CAMPOS_AUTORIA = ("criado_por", "atualizado_por", "aprovado_por", "reprovado_por")


def resolver_nomes_registros(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Anexa nomes SIGMA em lote sem substituir os IDs persistidos."""
    if not rows:
        return []

    usuario_ids = [row.get(campo) for row in rows for campo in _CAMPOS_AUTORIA]
    pessoa_ids = [row.get("sigma_pessoa_id") for row in rows]
    try:
        nomes_usuarios = sigma_usuario_repository.nomes_por_ids(usuario_ids)
        nomes_pessoas = sigma_cadastro_repository.nomes_pessoas_por_ids(pessoa_ids)
    except DatabaseUnavailableError:
        nomes_usuarios = {}
        nomes_pessoas = {}

    enriquecidas = []
    for row in rows:
        enriched = dict(row)
        pessoa_id = str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None
        enriched["representante_nome_completo"] = (
            nomes_pessoas.get(pessoa_id) if pessoa_id else None
        ) or row.get("representante_nome")
        for campo in _CAMPOS_AUTORIA:
            usuario_id = row.get(campo)
            enriched[f"{campo}_nome"] = (
                nomes_usuarios.get(str(usuario_id)) if usuario_id else None
            )
        enriquecidas.append(enriched)
    return enriquecidas


def _txt(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _pessoa_uuid(pessoa_id: str) -> str:
    return str(pessoa_id).strip()


def aplicar_auditoria_usuario(
    row: dict[str, Any], pessoa_id: str, usuario_id: str
) -> dict[str, Any]:
    """Mantém o representante legal separado da conta que executou a ação."""
    autor = validar_autor(usuario_id)
    pid = _pessoa_uuid(pessoa_id)
    row["sigma_pessoa_id"] = pid
    row["criado_por"] = autor
    row["atualizado_por"] = autor
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


def normalizar_plano(
    row: dict[str, Any], *, pessoa_id: str, usuario_id: str
) -> dict[str, Any]:
    aplicar_auditoria_usuario(row, pessoa_id, usuario_id)
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


def normalizar_programa(
    row: dict[str, Any], *, pessoa_id: str, usuario_id: str
) -> dict[str, Any]:
    aplicar_auditoria_usuario(row, pessoa_id, usuario_id)
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


def normalizar_projeto(
    row: dict[str, Any], *, pessoa_id: str, usuario_id: str
) -> dict[str, Any]:
    aplicar_auditoria_usuario(row, pessoa_id, usuario_id)
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


def apenas_alteracoes(data: dict, existing: dict) -> dict:
    """Remove campos normalizados que já possuem o valor enviado."""
    return {key: value for key, value in data.items() if value != existing.get(key)}
