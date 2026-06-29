"""Regras de negócio — universo de demandas elegíveis ao AHP, por tipo."""
from __future__ import annotations

from typing import Any

from api.constants import TIPOS_DEMANDA
from api.exceptions import DemandaValidationError
from api.repositories import universo_repository as repo
from api.schemas.universo import CampoUniversoSchema, UniversoItemSchema

# Máscara de tradução: nome técnico da coluna -> rótulo claro para o usuário.
_ROTULOS = {
    "status": "Situação (status)",
    "diretoria_id": "Diretoria responsável",
    "plano_id": "Plano vinculado",
    "programa_id": "Programa vinculado",
    "valor_global": "Valor global (R$)",
    "criado_em": "Data de cadastro",
    "atualizado_em": "Data da última atualização",
    "aprovado_em": "Data de aprovação",
    "status_atualizado_em": "Data da mudança de situação",
    "vigencia_inicio": "Início da vigência",
    "vigencia_fim": "Fim da vigência",
    "objetivo": "Objetivo",
    "objetivo_estrategico": "Objetivo estratégico",
    "responsavel": "Responsável",
    "publico_alvo": "Público-alvo",
    "orgao_responsavel": "Órgão responsável",
    "justificativa": "Justificativa",
    "motivo_aprovacao": "Motivo da aprovação",
    "instituicao_nome": "Instituição — nome",
    "instituicao_razao_social": "Instituição — razão social",
    "instituicao_nome_fantasia": "Instituição — nome fantasia",
    "instituicao_cnpj": "Instituição — CNPJ",
    "representante_nome": "Representante legal — nome",
    "representante_email": "Representante legal — e-mail",
    "representante_telefone": "Representante legal — telefone",
    "vinculo_institucional": "Possui vínculo institucional?",
    "vinculo_tipo": "Tipo de vínculo institucional",
    "geometria_tipo": "Tipo de geometria",
    "latitude": "Latitude",
    "longitude": "Longitude",
}


# Substantivo do nível para compor rótulos contextuais (ex.: "Nome do projeto").
_TIPO_NOUN = {"plano": "plano", "programa": "programa", "projeto": "projeto"}


def _rotulo(campo: str, tipo: str) -> str:
    noun = _TIPO_NOUN.get(tipo, "registro")
    contextual = {
        "codigo": f"Código do {noun}",
        "nome": f"Nome do {noun}",
        "descricao": f"Descrição do {noun}",
    }
    if campo in contextual:
        return contextual[campo]
    if campo in _ROTULOS:
        return _ROTULOS[campo]
    base = campo[:-3] if campo.endswith("_id") else campo
    texto = base.replace("_", " ").strip()
    return texto[:1].upper() + texto[1:] if texto else campo


def _row_to_item(tipo: str, row: dict[str, Any]) -> UniversoItemSchema:
    data = dict(row)
    data["id"] = str(data["id"])
    data["tipo_demanda"] = tipo
    return UniversoItemSchema(**data)


def listar_campos(tipo: str) -> list[CampoUniversoSchema]:
    if tipo not in TIPOS_DEMANDA:
        raise DemandaValidationError(f"Tipo de demanda inválido: {tipo}.", field="tipo")
    return [
        CampoUniversoSchema(campo=c["campo"], rotulo=_rotulo(c["campo"], tipo), tipo=c["tipo"])
        for c in repo.colunas_coletivas(tipo)
    ]


def listar_universo(tipo: str, *, status: str | None = None) -> list[UniversoItemSchema]:
    if tipo not in TIPOS_DEMANDA:
        raise DemandaValidationError(f"Tipo de demanda inválido: {tipo}.", field="tipo")
    rows = repo.list_elegiveis(tipo, status=status)
    return [_row_to_item(tipo, r) for r in rows]
