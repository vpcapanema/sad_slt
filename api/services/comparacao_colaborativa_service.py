"""Regras de negócio — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

import math
import secrets
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from api.exceptions import DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as repo
from api.repositories import hierarquizacao_repository as hierarq_repo
from api.schemas.comparacao_colaborativa import (
    AmbienteColaborativoCreateSchema,
    AmbienteColaborativoResponseSchema,
    AmbientePublicoSchema,
    ConsolidacaoColaborativaSchema,
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


def _carregar_hierarquizacao(hierarq_id: UUID) -> dict[str, Any]:
    """Carrega a hierarquização e sua matriz de premissas e critérios."""
    row = hierarq_repo.get_by_id(hierarq_id)
    if not row:
        raise DemandaValidationError(
            f"Hierarquização {hierarq_id} não encontrada.", field="hierarquizacao_id"
        )
    return row


def _criterios_from_hierarquizacao(hierarq: dict[str, Any]) -> list[dict[str, Any]]:
    """Extrai a lista de critérios da matriz de premissas e critérios da hierarquização."""
    matriz_premissas = hierarq.get("dados_hierarquizacao") or {}
    criterios = matriz_premissas.get("criterios") or []
    return criterios


def _criterio_nomes(criterios: list[dict[str, Any]]) -> list[str]:
    nomes: list[str] = []
    for idx, c in enumerate(criterios):
        nome = c.get("criterio") or c.get("nome") or f"Critério {idx + 1}"
        nomes.append(str(nome))
    return nomes


def _consolidacao_from_row(row: dict[str, Any]) -> ConsolidacaoColaborativaSchema | None:
    matriz = row.get("matriz_consolidada")
    if not matriz:
        return None
    return ConsolidacaoColaborativaSchema(
        matriz_consolidada=matriz,
        pesos_consolidados=row.get("pesos_consolidados") or [],
        lambda_max=_float(row.get("lambda_max")) or 0.0,
        indice_consistencia=_float(row.get("indice_consistencia")) or 0.0,
        indice_aleatorio=_float(row.get("indice_aleatorio")) or 0.0,
        razao_consistencia=_float(row.get("razao_consistencia")) or 0.0,
        consistente=bool(row.get("consistente")),
        respostas_consolidadas=int(row.get("respostas_consolidadas") or 0),
        consolidadoEm=_iso(row.get("consolidado_em")) or "",
    )


def _ambiente_to_response(row: dict[str, Any], *, base_url: str = "") -> AmbienteColaborativoResponseSchema:
    token = row["token"]
    url = f"{base_url.rstrip('/')}/public/ahp/colaborativa/?token={token}" if base_url else (
        f"/public/ahp/colaborativa/?token={token}"
    )
    return AmbienteColaborativoResponseSchema(
        id=str(row["id"]),
        hierarquizacao_id=str(row["hierarquizacao_id"]),
        hierarquizacao_codigo=row.get("hierarquizacao_codigo", ""),
        criterios=row.get("criterios") or [],
        n_criterios=int(row.get("n_criterios") or 0),
        token=token,
        convites=row.get("convites") or [],
        valido_ate=_iso(row.get("valido_ate")) or "",
        status=row["status"],
        url_publica=url,
        criadoEm=_iso(row.get("criado_em")) or "",
        atualizadoEm=_iso(row.get("atualizado_em")) or "",
        total_respostas=int(row.get("total_respostas") or 0),
        consolidacao=_consolidacao_from_row(row),
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
    """Cria ambiente colaborativo para a hierarquização informada."""
    hierarq = _carregar_hierarquizacao(payload.hierarquizacao_id)
    criterios = _criterios_from_hierarquizacao(hierarq)

    if len(criterios) < 2:
        raise DemandaValidationError(
            "A hierarquização deve possuir ao menos dois critérios para abrir um ambiente colaborativo.",
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

    repo.encerrar_ambientes_anteriores(payload.hierarquizacao_id)
    token = secrets.token_urlsafe(32)
    nomes_criterios = _criterio_nomes(criterios)

    row = repo.insert_ambiente(
        {
            "hierarquizacao_id": str(payload.hierarquizacao_id),
            "hierarquizacao_codigo": hierarq.get("codigo", ""),
            "criterios": criterios,
            "n_criterios": len(nomes_criterios),
            "token": token,
            "convites": convites,
            "valido_ate": valido_ate,
            "status": "ativa",
        }
    )
    return _ambiente_to_response(row, base_url=base_url)


def obter_ambiente_hierarquizacao(hierarq_id: UUID, *, base_url: str = "") -> AmbienteColaborativoResponseSchema | None:
    """Retorna o ambiente colaborativo mais recente da hierarquização."""
    row = repo.get_ambiente_by_hierarquizacao(hierarq_id)
    if not row:
        return None
    return _ambiente_to_response(row, base_url=base_url)


def obter_ambiente_id(ambiente_id: str, *, base_url: str = "") -> AmbienteColaborativoResponseSchema:
    """Retorna o registro completo do ambiente para a gestão autenticada."""
    row = repo.get_ambiente_by_id(ambiente_id)
    if not row:
        raise DemandaValidationError("Ambiente não encontrado.", field="ambiente_id")
    return _ambiente_to_response(row, base_url=base_url)


def listar_ambientes_hierarquizacao(
    hierarq_id: UUID, *, base_url: str = ""
) -> list[AmbienteColaborativoResponseSchema]:
    """Lista o histórico completo de rodadas colaborativas da hierarquização."""
    _carregar_hierarquizacao(hierarq_id)
    return [
        _ambiente_to_response(row, base_url=base_url)
        for row in repo.list_ambientes_by_hierarquizacao(hierarq_id)
    ]


def obter_ambiente_publico(token: str, email: str | None = None) -> AmbientePublicoSchema:
    """Metadados públicos do ambiente (sem matriz de respostas de terceiros)."""
    row = repo.get_ambiente_by_token(token)
    if not row:
        raise DemandaValidationError("Link de preenchimento inválido ou expirado.", field="token")

    criterios_snapshot = row.get("criterios") or []
    if criterios_snapshot:
        criterios = _criterio_nomes(criterios_snapshot)
    else:
        hierarq = _carregar_hierarquizacao(row["hierarquizacao_id"])
        criterios_lista = _criterios_from_hierarquizacao(hierarq)
        criterios = _criterio_nomes(criterios_lista)

    valido_ate = row.get("valido_ate")
    if isinstance(valido_ate, datetime) and valido_ate.tzinfo is None:
        valido_ate = valido_ate.replace(tzinfo=timezone.utc)

    status = row["status"]
    if status == "ativa" and valido_ate and valido_ate < datetime.now(timezone.utc):
        status = "encerrada"

    emails_ok = _emails_convites(row.get("convites") or [])
    email_norm = (email or "").strip().lower()

    # Tenta carregar a hierarquização para preencher escopo e objetivo
    try:
        hierarq = _carregar_hierarquizacao(row["hierarquizacao_id"])
        escopo = hierarq.get("nome") or hierarq.get("codigo")
        objetivo = hierarq.get("objetivo")
    except DemandaValidationError:
        escopo = None
        objetivo = None

    return AmbientePublicoSchema(
        token=token,
        escopo=escopo,
        objetivo=objetivo,
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


def _validar_matriz_pareada(matriz: list[list[float]], n: int) -> None:
    if len(matriz) != n or any(len(linha) != n for linha in matriz):
        raise DemandaValidationError(
            f"A matriz deve ser {n}×{n} para os critérios deste convite.",
            field="matriz_comparacao",
        )
    for i in range(n):
        for j in range(n):
            valor = float(matriz[i][j])
            if not math.isfinite(valor) or valor <= 0:
                raise DemandaValidationError(
                    "Todos os valores da matriz devem ser positivos e finitos.",
                    field="matriz_comparacao",
                )
            if i == j and not math.isclose(valor, 1.0, rel_tol=0.0, abs_tol=1e-9):
                raise DemandaValidationError(
                    "A diagonal principal da matriz deve ser igual a 1.",
                    field="matriz_comparacao",
                )
            if i < j and not math.isclose(
                valor * float(matriz[j][i]), 1.0, rel_tol=1e-6, abs_tol=1e-6
            ):
                raise DemandaValidationError(
                    "A matriz deve ser recíproca: a comparação inversa deve ser 1/valor.",
                    field="matriz_comparacao",
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

    criterios_snapshot = row.get("criterios") or []
    if criterios_snapshot:
        nomes = _criterio_nomes(criterios_snapshot)
    else:
        hierarq = _carregar_hierarquizacao(row["hierarquizacao_id"])
        criterios_lista = _criterios_from_hierarquizacao(hierarq)
        nomes = _criterio_nomes(criterios_lista)

    matriz = payload.matriz_comparacao
    n = len(nomes)
    _validar_matriz_pareada(matriz, n)

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
    if not inserted:
        raise DemandaValidationError(
            "Já existe uma resposta registrada para este e-mail.", field="email"
        )
    return _resposta_to_response(inserted)


def listar_respostas(ambiente_id: str) -> list[RespostaColaborativaResponseSchema]:
    """Lista respostas de um ambiente colaborativo."""
    amb = repo.get_ambiente_by_id(ambiente_id)
    if not amb:
        raise DemandaValidationError("Ambiente não encontrado.", field="ambiente_id")
    return [_resposta_to_response(r) for r in repo.list_respostas(ambiente_id)]


def media_geometrica_matrizes(matrizes: list[list[list[float]]]) -> list[list[float]]:
    """Agrega matrizes pareadas por média geométrica elemento a elemento (AIJ)."""
    if not matrizes:
        raise DemandaValidationError("Não há matrizes para consolidar.", field="respostas")
    n = len(matrizes[0])
    for m in matrizes:
        if len(m) != n or any(len(linha) != n for linha in m):
            raise DemandaValidationError(
                "As respostas possuem matrizes de dimensões diferentes.",
                field="respostas",
            )
    k = len(matrizes)
    consolidada: list[list[float]] = []
    for i in range(n):
        linha: list[float] = []
        for j in range(n):
            produto = 1.0
            for m in matrizes:
                valor = float(m[i][j])
                if valor <= 0:
                    raise DemandaValidationError(
                        "Há valores inválidos (≤ 0) nas matrizes enviadas.",
                        field="respostas",
                    )
                produto *= valor
            linha.append(produto ** (1.0 / k))
        consolidada.append(linha)
    return consolidada


def consolidar_ambiente(
    ambiente_id: str, *, base_url: str = ""
) -> AmbienteColaborativoResponseSchema:
    """Consolida as respostas consistentes por média geométrica e grava o resultado."""
    amb = repo.get_ambiente_by_id(ambiente_id)
    if not amb:
        raise DemandaValidationError("Ambiente não encontrado.", field="ambiente_id")

    respostas = [r for r in repo.list_respostas(ambiente_id) if r.get("consistente")]
    if not respostas:
        raise DemandaValidationError(
            "Nenhuma resposta consistente recebida até o momento — não há o que consolidar.",
            field="respostas",
        )

    matrizes = [r.get("matriz_comparacao") or [] for r in respostas]
    consolidada = media_geometrica_matrizes(matrizes)
    resultado = ahp_engine.analyze_matrix(consolidada)
    rc = float(resultado["CR"])

    # Extrai a hierarquização e seus critérios
    hierarq = _carregar_hierarquizacao(amb["hierarquizacao_id"])
    criterios = _criterios_from_hierarquizacao(hierarq)
    nomes = _criterio_nomes(criterios)
    pesos = {"criteria": nomes, "weights": resultado["weights"]}

    agora = datetime.now(timezone.utc)

    colaborativa = {
        "versao": 1,
        "hierarquizacao_id": str(amb["hierarquizacao_id"]),
        "hierarquizacao_codigo": amb.get("hierarquizacao_codigo", ""),
        "metodo_comparacao": "formulario",
        "modo_preenchimento": "colaborativo",
        "n_criterios": len(criterios),
        "criterios": criterios,
        "matriz_comparacao": consolidada,
        "pesos": pesos,
        "lambda_max": resultado["lambdaMax"],
        "indice_consistencia": resultado["CI"],
        "indice_aleatorio": resultado["RI"],
        "razao_consistencia": rc,
        "consistente": rc < 0.10,
        "respostas_consolidadas": len(respostas),
        "consolidado_em": agora.isoformat(),
    }

    atualizado = repo.atualizar_consolidacao(
        ambiente_id,
        {
            "matriz_consolidada": consolidada,
            "pesos_consolidados": resultado["weights"],
            "lambda_max": resultado["lambdaMax"],
            "indice_consistencia": resultado["CI"],
            "indice_aleatorio": resultado["RI"],
            "razao_consistencia": rc,
            "consistente": rc < 0.10,
            "respostas_consolidadas": len(respostas),
            "consolidado_em": agora,
            "status": "consolidada",
        },
        {"comparacao_colaborativa": colaborativa},
    )
    if not atualizado:
        raise DemandaValidationError("Falha ao gravar a consolidação.", field="ambiente_id")
    atualizado["total_respostas"] = len(repo.list_respostas(ambiente_id))
    return _ambiente_to_response(atualizado, base_url=base_url)
