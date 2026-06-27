"""Regras de negócio — painéis de acompanhamento."""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from api.repositories import painel_repository
from api.schemas.demanda import GeometriaSchema, RepresentanteSchema
from api.schemas.painel import PainelDemandaSchema


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _geometria_from_row(row: dict[str, Any]) -> GeometriaSchema | None:
    raw = row.get("geometria_geojson")
    if not raw:
        return None
    if isinstance(raw, str):
        raw = json.loads(raw)
    return GeometriaSchema(tipo=raw.get("type"), coordinates=raw.get("coordinates"))


def _row_to_item(row: dict[str, Any]) -> PainelDemandaSchema:
    lat = row.get("latitude")
    lng = row.get("longitude")
    rep = None
    if row.get("representante_nome") or row.get("sigma_pessoa_id"):
        rep = RepresentanteSchema(
            pessoa_id=str(row["sigma_pessoa_id"]) if row.get("sigma_pessoa_id") else None,
            nome=row.get("representante_nome") or "",
            email=row.get("representante_email"),
            telefone=row.get("representante_telefone"),
        )
    valor = row.get("valor_global")
    abr = row.get("abrangencia_nomes") or []
    return PainelDemandaSchema(
        id=row["codigo"],
        tipo=row["tipo"],
        status=row["status"],
        criadoEm=_iso(row.get("criado_em")) or "",
        nome=row["nome"],
        descricao=row.get("descricao"),
        geometria=_geometria_from_row(row),
        lat=float(lat) if lat is not None else None,
        lng=float(lng) if lng is not None else None,
        diretoria_id=row.get("diretoria_id"),
        plano_id=row.get("plano_id"),
        plano_codigo=row.get("plano_codigo"),
        plano_nome=row.get("plano_nome"),
        programa_id=str(row["programa_id"]) if row.get("programa_id") else None,
        programa_nome=row.get("programa_nome"),
        abrangencia=list(abr),
        instituicao_id=str(row["sigma_instituicao_id"]) if row.get("sigma_instituicao_id") else None,
        instituicao_label=row.get("instituicao_nome"),
        instituicao_cnpj=row.get("instituicao_cnpj"),
        representante=rep,
        classificacao=row.get("classificacao"),
        complementos=row.get("complementos"),
        objetivo_estrategico=row.get("objetivo_estrategico"),
        responsavel=row.get("responsavel"),
        vigencia_inicio=_iso(row.get("vigencia_inicio")),
        vigencia_fim=_iso(row.get("vigencia_fim")),
        valor_global=float(valor) if valor is not None else None,
        objetivo=row.get("objetivo"),
        publico_alvo=row.get("publico_alvo"),
        orgao_responsavel=row.get("orgao_responsavel"),
        justificativa=row.get("justificativa"),
    )


def listar_demandas_painel() -> list[PainelDemandaSchema]:
    """Retorna todas as demandas com geometria pronta para o mapa."""
    return [_row_to_item(row) for row in painel_repository.list_all()]
