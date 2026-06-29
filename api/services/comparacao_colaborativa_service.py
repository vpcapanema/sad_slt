"""Regras de negócio — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from api.exceptions import DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as repo
from api.repositories import config_multicriterio_repository as config_repo
from api.schemas.comparacao_colaborativa import (
    AmbienteColaborativoCreateSchema,
    AmbienteColaborativoResponseSchema,
    AmbientePublicoSchema,
    IdentificacaoColaboradorSchema,
    RespostaColaborativaCreateSchema,
    RespostaColaborativaResponseSchema,
)
from api.services import ahp_engine


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _float(value: Any) -> float | None:
    if value is None:
        return None
    return float(value)


def _emails_convites(convites: list[dict[str, Any]]) -> list[str]:
    return [str(c.get("email", "")).strip().lower() for c in convites if c.get("email")]


def _carregar_config(tipo: str, codigo: str) -> dict[str, Any]:
    row = config_repo.get_by_codigo(tipo, codigo)
    if not row:
        raise DemandaValidationError(
            f"Configuração {codigo} não encontrada.", field="codigo"
        )
    return row


def _criterio_nomes(config: dict[str, Any]) -> list[str]:
    criterios = config.get("criterios") or []
    nomes: list[str] = []
    for idx, c in enumerate(criterios):
        nome = c.get("criterio") or c.get("nome") or f"Critério {idx + 1}"
        nomes.append(str(nome))
    return nomes


def _ambiente_to_response(row: dict[str, Any], *, base_url: str = "") -> AmbienteColaborativoResponseSchema:
    token = row["token"]
    url = f"{base_url.rstrip('/')}/ahp/colaborativa.html?token={token}" if base_url else (
        f"/ahp/colaborativa.html?token={token}"
    )
    return AmbienteColaborativoResponseSchema(
        id=str(row["id"]),
        config_tipo=row["config_tipo"],
        config_codigo=row["config_codigo"],
        token=token,
        convites=row.get("convites") or [],
        valido_ate=_iso(row.get("valido_ate")) or "",
        status=row["status"],
        url_publica=url,
        criadoEm=_iso(row.get("criado_em")) or "",
        atualizadoEm=_iso(row.get("atualizado_em")) or "",
        total_respostas=int(row.get("total_respostas") or 0),
    )


def _resposta_to_response(row: dict[str, Any]) -> RespostaColaborativaResponseSchema:
    return RespostaColaborativaResponseSchema(
        id=str(row["id"]),
        ambiente_id=str(row["ambiente_id"]),
        nome_completo=row["nome_completo"],
        email=row["email"],
        instituicao=row["instituicao"],
        matriz_comparacao=row.get("matriz_comparacao") or [],
        lambda_max=_float(row.get("lambda_max")),
        indice_consistencia=_float(row.get("indice_consistencia")),
        indice_aleatorio=_float(row.get("indice_aleatorio")),
        razao_consistencia=_float(row.get("razao_consistencia")),
        consistente=bool(row.get("consistente")),
        estatisticas=row.get("estatisticas") or {},
        enviadoEm=_iso(row.get("enviado_em")) or "",
    )


def criar_ambiente(
    payload: AmbienteColaborativoCreateSchema, *, base_url: str = ""
) -> AmbienteColaborativoResponseSchema:
    """Cria ambiente colaborativo para a configuração informada."""
    config = _carregar_config(payload.tipo, payload.codigo)
    criterios = _criterio_nomes(config)
    if len(criterios) < 2:
        raise DemandaValidationError(
            "Cadastre ao menos dois critérios na Etapa 3 antes de abrir o ambiente colaborativo.",
            field="criterios",
        )

    valido_ate = payload.valido_ate
    if valido_ate.tzinfo is None:
        valido_ate = valido_ate.replace(tzinfo=timezone.utc)
    if valido_ate <= datetime.now(timezone.utc):
        raise DemandaValidationError(
            "A data limite deve ser futura.", field="valido_ate"
        )

    convites = [{"email": str(c.email).strip().lower()} for c in payload.convites]
    emails = {c["email"] for c in convites}
    if len(emails) != len(convites):
        raise DemandaValidationError(
            "Há e-mails duplicados na lista de convites.", field="convites"
        )

    repo.encerrar_ambientes_anteriores(payload.tipo, payload.codigo)
    token = secrets.token_urlsafe(32)
    row = repo.insert_ambiente(
        {
            "config_tipo": payload.tipo,
            "config_codigo": payload.codigo,
            "token": token,
            "convites": convites,
            "valido_ate": valido_ate,
            "status": "ativa",
        }
    )
    return _ambiente_to_response(row, base_url=base_url)


def obter_ambiente_config(tipo: str, codigo: str, *, base_url: str = "") -> AmbienteColaborativoResponseSchema | None:
    """Retorna o ambiente colaborativo mais recente da configuração."""
    row = repo.get_ambiente_by_config(tipo, codigo)
    if not row:
        return None
    return _ambiente_to_response(row, base_url=base_url)


def obter_ambiente_publico(token: str, email: str | None = None) -> AmbientePublicoSchema:
    """Metadados públicos do ambiente (sem matriz de respostas de terceiros)."""
    row = repo.get_ambiente_by_token(token)
    if not row:
        raise DemandaValidationError("Link de preenchimento inválido ou expirado.", field="token")

    config = _carregar_config(row["config_tipo"], row["config_codigo"])
    criterios = _criterio_nomes(config)
    valido_ate = row.get("valido_ate")
    if isinstance(valido_ate, datetime) and valido_ate.tzinfo is None:
        valido_ate = valido_ate.replace(tzinfo=timezone.utc)

    status = row["status"]
    if status == "ativa" and valido_ate and valido_ate < datetime.now(timezone.utc):
        status = "encerrada"

    emails_ok = _emails_convites(row.get("convites") or [])
    email_norm = (email or "").strip().lower()
    return AmbientePublicoSchema(
        token=token,
        escopo=config.get("nome"),
        objetivo=config.get("objetivo"),
        criterios=criterios,
        valido_ate=_iso(valido_ate) or "",
        status=status,
        email_autorizado=bool(email_norm and email_norm in emails_ok),
    )


def _validar_ambiente_ativo(row: dict[str, Any]) -> None:
    if row.get("status") != "ativa":
        raise DemandaValidationError(
            "Este ambiente de preenchimento não está mais ativo.", field="status"
        )
    valido_ate = row.get("valido_ate")
    if isinstance(valido_ate, datetime):
        limite = valido_ate if valido_ate.tzinfo else valido_ate.replace(tzinfo=timezone.utc)
        if limite < datetime.now(timezone.utc):
            raise DemandaValidationError(
                "O prazo para preenchimento encerrou.", field="valido_ate"
            )


def registrar_resposta(token: str, payload: RespostaColaborativaCreateSchema) -> RespostaColaborativaResponseSchema:
    """Registra resposta colaborativa após validar e-mail, matriz e RC < 0,10."""
    row = repo.get_ambiente_by_token(token)
    if not row:
        raise DemandaValidationError("Ambiente não encontrado.", field="token")
    _validar_ambiente_ativo(row)

    ident: IdentificacaoColaboradorSchema = payload.identificacao
    email = str(ident.email).strip().lower()
    convites = _emails_convites(row.get("convites") or [])
    if email not in convites:
        raise DemandaValidationError(
            "Este e-mail não está autorizado a preencher este formulário.", field="email"
        )

    if repo.resposta_existe(str(row["id"]), email):
        raise DemandaValidationError(
            "Já existe uma resposta registrada para este e-mail.", field="email"
        )

    config = _carregar_config(row["config_tipo"], row["config_codigo"])
    nomes = _criterio_nomes(config)
    matriz = payload.matriz_comparacao
    n = len(nomes)
    if len(matriz) != n or any(len(linha) != n for linha in matriz):
        raise DemandaValidationError(
            f"A matriz deve ser {n}×{n} para os critérios cadastrados.",
            field="matriz_comparacao",
        )

    resultado = ahp_engine.analyze_matrix(matriz)
    rc = float(resultado["CR"])
    if rc >= 0.10:
        raise DemandaValidationError(
            f"Resposta rejeitada: RC = {rc:.4f} (necessário RC < 0,10). "
            "Revise as comparações antes de enviar.",
            field="razao_consistencia",
        )

    inserted = repo.insert_resposta(
        {
            "ambiente_id": str(row["id"]),
            "nome_completo": ident.nome_completo.strip(),
            "email": email,
            "instituicao": ident.instituicao.strip(),
            "matriz_comparacao": matriz,
            "lambda_max": resultado["lambdaMax"],
            "indice_consistencia": resultado["CI"],
            "indice_aleatorio": resultado["RI"],
            "razao_consistencia": rc,
            "consistente": True,
            "estatisticas": payload.estatisticas or {},
        }
    )
    return _resposta_to_response(inserted)


def listar_respostas(ambiente_id: str) -> list[RespostaColaborativaResponseSchema]:
    """Lista respostas de um ambiente colaborativo."""
    amb = repo.get_ambiente_by_id(ambiente_id)
    if not amb:
        raise DemandaValidationError("Ambiente não encontrado.", field="ambiente_id")
    return [_resposta_to_response(r) for r in repo.list_respostas(ambiente_id)]
