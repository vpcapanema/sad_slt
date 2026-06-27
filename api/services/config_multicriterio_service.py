"""Regras de negócio — Configuração da Análise Multicritério.

Calcula pesos dos critérios e métricas de consistência (λmax/IC/IA/RC) a partir
da matriz pareada. O cálculo é a fonte da verdade no servidor.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from api.constants import TIPO_DEMANDA_COD_TO_ID, TIPO_DEMANDA_ID_TO_COD
from api.exceptions import ConfigMulticriterioNotFoundError, DemandaValidationError
from api.repositories import config_multicriterio_repository as repo
from api.schemas.config_multicriterio import (
    ConfigCreateSchema,
    ConfigResponseSchema,
    ConfigUpdateSchema,
)
from api.services import ahp_engine

_STATUS_VALIDOS = frozenset({"rascunho", "calculada", "homologada", "arquivada"})

_UPDATE_FIELDS = frozenset(
    {
        "nome",
        "descricao",
        "status",
        "grupo_comparacao",
        "metodo_entrada",
        "metodo_comparacao",
        "n_criterios",
        "criterios",
        "matriz_comparacao",
        "arquivo_nome",
        "arquivo_tipo",
        "arquivo_hash",
        "configuracao_completa",
    }
)


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _uuid_or_none(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return str(uuid.UUID(value))
    except (ValueError, TypeError):
        return None


def _gerar_codigo(tipo: str) -> str:
    prefixo = "CFG-A" if tipo == "avulsa" else "CFG-P"
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    sufixo = secrets.token_hex(2).upper()
    return f"{prefixo}-{stamp}-{sufixo}"


def _criterio_nomes(criterios: list[dict[str, Any]]) -> list[str]:
    nomes: list[str] = []
    for idx, c in enumerate(criterios):
        nome = c.get("criterio") or c.get("nome") or f"Critério {idx + 1}"
        nomes.append(str(nome))
    return nomes


def _row_to_response(row: dict[str, Any]) -> ConfigResponseSchema:
    return ConfigResponseSchema(
        id=str(row["id"]),
        codigo=row["codigo"],
        tipo=row["tipo"],
        nome=row["nome"],
        descricao=row.get("descricao"),
        grupo_comparacao=row.get("grupo_comparacao"),
        tipo_demanda=TIPO_DEMANDA_ID_TO_COD.get(row.get("tipo_demanda_id")),
        status=row["status"],
        metodo_entrada=row.get("metodo_entrada") or "manual",
        metodo_comparacao=row.get("metodo_comparacao"),
        n_criterios=int(row.get("n_criterios") or 0),
        criterios=row.get("criterios") or [],
        matriz_comparacao=row.get("matriz_comparacao") or [],
        pesos=row.get("pesos"),
        lambda_max=_float(row.get("lambda_max")),
        indice_consistencia=_float(row.get("indice_consistencia")),
        indice_aleatorio=_float(row.get("indice_aleatorio")),
        razao_consistencia=_float(row.get("razao_consistencia")),
        consistente=row.get("consistente"),
        arquivo_nome=row.get("arquivo_nome"),
        arquivo_tipo=row.get("arquivo_tipo"),
        arquivo_hash=row.get("arquivo_hash"),
        configuracao_completa=row.get("configuracao_completa"),
        criadoEm=_iso(row.get("criado_em")) or "",
        atualizadoEm=_iso(row.get("atualizado_em")) or "",
        homologadoEm=_iso(row.get("homologado_em")),
    )


def criar_config(payload: ConfigCreateSchema, *, criado_por: str | None = None) -> ConfigResponseSchema:
    if payload.tipo == "portfolio" and not payload.grupo_comparacao:
        raise DemandaValidationError(
            "grupo_comparacao é obrigatório para configuração de portfólio.",
            field="grupo_comparacao",
        )
    if payload.tipo == "portfolio" and not payload.tipo_demanda:
        raise DemandaValidationError(
            "tipo_demanda é obrigatório para configuração de portfólio.",
            field="tipo_demanda",
        )
    data: dict[str, Any] = {
        "codigo": _gerar_codigo(payload.tipo),
        "nome": payload.nome.strip(),
        "descricao": payload.descricao,
        "status": "rascunho",
    }
    criado_uuid = _uuid_or_none(criado_por)
    if criado_uuid:
        data["criado_por"] = criado_uuid
    if payload.tipo == "portfolio":
        data["grupo_comparacao"] = payload.grupo_comparacao
        tipo_id = TIPO_DEMANDA_COD_TO_ID.get(payload.tipo_demanda)
        if tipo_id is None:
            raise DemandaValidationError(
                f"tipo_demanda inválido: {payload.tipo_demanda}.", field="tipo_demanda"
            )
        data["tipo_demanda_id"] = tipo_id
    return _row_to_response(repo.insert(payload.tipo, data))


def listar_configs(
    tipo: str,
    *,
    status: str | None = None,
    grupo: str | None = None,
    tipo_demanda: str | None = None,
) -> list[ConfigResponseSchema]:
    _validar_tipo(tipo)
    tipo_demanda_id = None
    if tipo_demanda:
        tipo_demanda_id = TIPO_DEMANDA_COD_TO_ID.get(tipo_demanda)
        if tipo_demanda_id is None:
            raise DemandaValidationError(
                f"tipo_demanda inválido: {tipo_demanda}.", field="tipo_demanda"
            )
    return [
        _row_to_response(r)
        for r in repo.list_all(tipo, status=status, grupo=grupo, tipo_demanda_id=tipo_demanda_id)
    ]


def obter_config(tipo: str, codigo: str) -> ConfigResponseSchema:
    return _row_to_response(_carregar(tipo, codigo))


def atualizar_config(tipo: str, codigo: str, payload: ConfigUpdateSchema) -> ConfigResponseSchema:
    _carregar(tipo, codigo)
    data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if k in _UPDATE_FIELDS}
    if "status" in data and data["status"] not in _STATUS_VALIDOS:
        raise DemandaValidationError(f"Status inválido: {data['status']}.", field="status")
    if not data:
        return obter_config(tipo, codigo)
    updated = repo.update(tipo, codigo, data)
    if not updated:
        raise ConfigMulticriterioNotFoundError(codigo)
    return _row_to_response(updated)


def calcular_config(tipo: str, codigo: str) -> ConfigResponseSchema:
    """Calcula pesos dos critérios e métricas de consistência da matriz pareada."""
    row = _carregar(tipo, codigo)

    matriz = row.get("matriz_comparacao") or []
    if not matriz:
        raise DemandaValidationError(
            "Defina a matriz de comparação pareada dos critérios antes de calcular.",
            field="matriz_comparacao",
        )
    n = len(matriz)
    if any(len(linha) != n for linha in matriz):
        raise DemandaValidationError(
            "A matriz de comparação deve ser quadrada (n×n).", field="matriz_comparacao"
        )

    criterios = row.get("criterios") or []
    nomes = _criterio_nomes(criterios) if criterios else [f"Critério {i + 1}" for i in range(n)]

    resultado = ahp_engine.analyze_matrix(matriz)
    pesos = {"criteria": nomes[:n], "weights": resultado["weights"]}
    rc = resultado["CR"]

    update_data: dict[str, Any] = {
        "pesos": pesos,
        "lambda_max": resultado["lambdaMax"],
        "indice_consistencia": resultado["CI"],
        "indice_aleatorio": resultado["RI"],
        "razao_consistencia": rc,
        "consistente": rc < 0.10,
        "status": "calculada",
    }
    updated = repo.update(tipo, codigo, update_data)
    if not updated:
        raise ConfigMulticriterioNotFoundError(codigo)
    return _row_to_response(updated)


def homologar_config(
    tipo: str, codigo: str, *, homologado_por: str | None = None
) -> ConfigResponseSchema:
    row = _carregar(tipo, codigo)
    if not row.get("consistente"):
        raise DemandaValidationError(
            "Só é possível homologar uma configuração consistente (RC < 0,10). Calcule antes.",
            field="status",
        )
    data: dict[str, Any] = {"status": "homologada", "homologado_em": datetime.now(timezone.utc)}
    homologado_uuid = _uuid_or_none(homologado_por)
    if homologado_uuid:
        data["homologado_por"] = homologado_uuid
    updated = repo.update(tipo, codigo, data)
    if not updated:
        raise ConfigMulticriterioNotFoundError(codigo)
    return _row_to_response(updated)


def _validar_tipo(tipo: str) -> None:
    if tipo not in repo.TIPO_CONFIG:
        raise DemandaValidationError(f"Tipo de configuração inválido: {tipo}.", field="tipo")


def _carregar(tipo: str, codigo: str) -> dict[str, Any]:
    _validar_tipo(tipo)
    row = repo.get_by_codigo(tipo, codigo)
    if not row:
        raise ConfigMulticriterioNotFoundError(codigo)
    return row
