"""Regras de negócio — preenchimento colaborativo da matriz pareada AHP."""
from __future__ import annotations

import math
import secrets
import unicodedata
import base64
import binascii
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from api.exceptions import DemandaValidationError
from api.repositories import comparacao_colaborativa_repository as repo
from api.repositories import hierarquizacao_repository as hierarq_repo
from api.repositories import config_multicriterio_repository as config_repo
from api.repositories import comparacao_colaborativa_analise_repository as analise_repo
from api.schemas.comparacao_colaborativa import (
    AmbienteColaborativoCreateSchema,
    AmbienteColaborativoResponseSchema,
    AmbienteColaborativoUpdateSchema,
    AmbientePublicoSchema,
    AnaliseColaborativaCreateSchema,
    AnaliseColaborativaResponseSchema,
    ConsolidacaoColaborativaSchema,
    IdentificacaoColaboradorSchema,
    RespostaColaborativaCreateSchema,
    RespostaColaborativaInicioSchema,
    RespostaColaborativaProgressoSchema,
    RespostaColaborativaResponseSchema,
    RespostaColaborativaUpdateSchema,
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
    dados = hierarq.get("dados_hierarquizacao") or {}
    matriz = (dados.get("cabecalho_grupo") or {}).get("matriz_premissas_criterios")
    if isinstance(matriz, dict):
        for chave in ("linhas", "rows", "criterios", "dados"):
            if isinstance(matriz.get(chave), list):
                return [item for item in matriz[chave] if isinstance(item, dict)]
    if isinstance(matriz, list):
        return [item for item in matriz if isinstance(item, dict)]
    return [item for item in (dados.get("criterios") or []) if isinstance(item, dict)]


def _criterios_from_matriz(matriz: Any) -> list[dict[str, Any]]:
    """Retém as linhas completas da matriz usada como contexto do julgamento."""
    if isinstance(matriz, dict):
        for chave in ("linhas", "rows", "criterios", "dados"):
            if isinstance(matriz.get(chave), list):
                return [item for item in matriz[chave] if isinstance(item, dict)]
    if isinstance(matriz, list):
        return [item for item in matriz if isinstance(item, dict)]
    return []


def _arquivo_matriz(base64_value: str | None) -> bytes | None:
    if not base64_value:
        return None
    try:
        conteudo = base64.b64decode(base64_value, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise DemandaValidationError(
            "O arquivo original da matriz possui codificação inválida.",
            field="arquivo_matriz_base64",
        ) from exc
    if len(conteudo) > 20 * 1024 * 1024:
        raise DemandaValidationError(
            "O arquivo original da matriz deve ter no máximo 20 MB.",
            field="arquivo_matriz_base64",
        )
    return conteudo


def _criterio_nomes(criterios: list[dict[str, Any]]) -> list[str]:
    nomes: list[str] = []
    for idx, c in enumerate(criterios):
        normalizados = {
            unicodedata.normalize("NFKD", str(chave)).encode("ascii", "ignore").decode("ascii").casefold(): valor
            for chave, valor in c.items()
        }
        nome = normalizados.get("criterio") or normalizados.get("nome") or f"Critério {idx + 1}"
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
        hierarquizacao_id=str(row["hierarquizacao_id"]) if row.get("hierarquizacao_id") else None,
        hierarquizacao_codigo=row.get("hierarquizacao_codigo") or row.get("config_codigo", ""),
        hierarquizacao_nome=row.get("hierarquizacao_nome"),
        config_tipo=row.get("config_tipo"),
        config_id=str(row["config_id"]) if row.get("config_id") else None,
        config_codigo=row.get("config_codigo"),
        config_nome=row.get("config_nome"),
        criterios=row.get("criterios") or [],
        n_criterios=int(row.get("n_criterios") or 0),
        arquivo_matriz_nome=row.get("arquivo_matriz_nome"),
        token=token,
        convites=row.get("convites") or [],
        valido_ate=_iso(row.get("valido_ate")) or "",
        status=row["status"],
        url_publica=url,
        criadoEm=_iso(row.get("criado_em")) or "",
        atualizadoEm=_iso(row.get("atualizado_em")) or "",
        total_respostas=int(row.get("total_respostas") or 0),
        respostas_em_preenchimento=int(row.get("respostas_em_preenchimento") or 0),
        respostas_consistentes=int(row.get("respostas_consistentes") or 0),
        total_analises=int(row.get("total_analises") or 0),
        analise_homologada_id=str(row["analise_homologada_id"]) if row.get("analise_homologada_id") else None,
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
        status=row.get("status") or "enviada",
        estatisticas=row.get("estatisticas") or {},
        iniciadoEm=_iso(row.get("iniciado_em")),
        atualizadoEm=_iso(row.get("atualizado_em")),
        enviadoEm=_iso(row.get("enviado_em")),
    )


def criar_ambiente(
    payload: AmbienteColaborativoCreateSchema, *, base_url: str = ""
) -> AmbienteColaborativoResponseSchema:
    """Cria ambiente colaborativo a partir de uma configuração multicritério."""
    if payload.config_tipo and payload.config_id:
        if payload.config_tipo not in {"avulsa", "portfolio"}:
            raise DemandaValidationError("Origem de configuração inválida.", field="config_tipo")
        config = config_repo.get_by_id(payload.config_tipo, payload.config_id)
        if not config:
            raise DemandaValidationError("Configuração multicritério não encontrada.", field="config_id")
        criterios = config.get("criterios") or []
        hierarq = None
    elif payload.hierarquizacao_id:
        hierarq = _carregar_hierarquizacao(payload.hierarquizacao_id)
        criterios = _criterios_from_matriz(payload.matriz_premissas_criterios)
        if not criterios:
            # Compatibilidade com hierarquizações cadastradas antes da separação dos componentes.
            criterios = _criterios_from_hierarquizacao(hierarq)
        config = None
    else:
        raise DemandaValidationError("Selecione uma configuração multicritério.", field="config_id")

    if len(criterios) < 2:
        raise DemandaValidationError(
            "A matriz de premissas e critérios deve possuir ao menos dois critérios para abrir um ambiente colaborativo.",
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

    if config:
        repo.encerrar_ambientes_anteriores_config(payload.config_tipo, payload.config_id)
    else:
        repo.encerrar_ambientes_anteriores(payload.hierarquizacao_id)
    token = secrets.token_urlsafe(32)
    nomes_criterios = _criterio_nomes(criterios)

    row = repo.insert_ambiente(
        {
            "hierarquizacao_id": str(payload.hierarquizacao_id) if payload.hierarquizacao_id else (
                str(config["hierarquizacao_id"]) if config and config.get("hierarquizacao_id") else None
            ),
            "hierarquizacao_codigo": hierarq.get("codigo", "") if hierarq else None,
            "config_tipo": payload.config_tipo if config else None,
            "config_id": str(payload.config_id) if config else None,
            "config_avulsa_id": str(payload.config_id) if config and payload.config_tipo == "avulsa" else None,
            "config_portfolio_id": str(payload.config_id) if config and payload.config_tipo == "portfolio" else None,
            "config_codigo": config.get("codigo") if config else None,
            "config_nome": config.get("nome") if config else None,
            "criterios": criterios,
            "n_criterios": len(nomes_criterios),
            "arquivo_excel_matriz_criterios_premissas": _arquivo_matriz(payload.arquivo_matriz_base64),
            "arquivo_matriz_nome": payload.arquivo_matriz_nome,
            "token": token,
            "convites": convites,
            "valido_ate": valido_ate,
            "status": "ativa",
        }
    )
    if hierarq:
        row["hierarquizacao_nome"] = hierarq.get("nome")
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


def listar_configuracoes_origem() -> list[dict[str, Any]]:
    itens: list[dict[str, Any]] = []
    for tipo in ("avulsa", "portfolio"):
        for config in config_repo.list_all(tipo):
            itens.append({
                "id": str(config["id"]), "tipo": tipo, "codigo": config["codigo"],
                "nome": config["nome"], "descricao": config.get("descricao"),
                "status": config.get("status"), "criterios": config.get("criterios") or [],
                "n_criterios": int(config.get("n_criterios") or len(config.get("criterios") or [])),
                "alias": f'{config["nome"]} — {config["codigo"]}',
            })
    return sorted(itens, key=lambda item: (item["nome"].casefold(), item["codigo"].casefold()))


def listar_ambientes(*, base_url: str = "") -> list[AmbienteColaborativoResponseSchema]:
    """Lista todos os julgamentos interativos persistidos."""
    return [_ambiente_to_response(row, base_url=base_url) for row in repo.list_ambientes()]


def atualizar_ambiente(
    ambiente_id: str,
    payload: AmbienteColaborativoUpdateSchema,
    *,
    base_url: str = "",
) -> AmbienteColaborativoResponseSchema:
    atual = repo.get_ambiente_by_id(ambiente_id)
    if not atual:
        raise DemandaValidationError("Julgamento não encontrado.", field="julgamento_id")
    if atual.get("status") != "ativa":
        raise DemandaValidationError(
            "Somente julgamentos abertos podem ser editados.", field="status"
        )
    data: dict[str, Any] = {}
    if payload.arquivo_matriz_base64 is not None:
        if int(atual.get("total_respostas") or 0) > 0:
            raise DemandaValidationError(
                "O arquivo da matriz não pode ser alterado após o recebimento de respostas.",
                field="arquivo_matriz_base64",
            )
        data["arquivo_excel_matriz_criterios_premissas"] = _arquivo_matriz(payload.arquivo_matriz_base64)
        data["arquivo_matriz_nome"] = payload.arquivo_matriz_nome
    if payload.hierarquizacao_id is not None and (
        payload.config_tipo is not None or payload.config_id is not None
    ):
        raise DemandaValidationError(
            "Informe somente a hierarquização selecionada.", field="hierarquizacao_id"
        )
    if (payload.config_tipo is None) != (payload.config_id is None):
        raise DemandaValidationError(
            "Informe o tipo e o identificador da configuração.", field="config_id"
        )
    if payload.hierarquizacao_id is not None:
        hierarq = _carregar_hierarquizacao(payload.hierarquizacao_id)
        criterios = _criterios_from_matriz(payload.matriz_premissas_criterios)
        if not criterios:
            criterios = _criterios_from_hierarquizacao(hierarq)
        if len(criterios) < 2:
            raise DemandaValidationError(
                "A hierarquização deve possuir ao menos dois critérios.",
                field="hierarquizacao_id",
            )
        origem_alterada = str(atual.get("hierarquizacao_id") or "") != str(payload.hierarquizacao_id)
        if origem_alterada and int(atual.get("total_respostas") or 0) > 0:
            raise DemandaValidationError(
                "A hierarquização não pode ser alterada após o recebimento de respostas.",
                field="hierarquizacao_id",
            )
        outro_ambiente = repo.get_ambiente_by_hierarquizacao(payload.hierarquizacao_id)
        if (
            origem_alterada
            and outro_ambiente
            and outro_ambiente.get("status") == "ativa"
            and str(outro_ambiente.get("id")) != str(ambiente_id)
        ):
            raise DemandaValidationError(
                "A hierarquização selecionada já possui outro julgamento aberto.",
                field="hierarquizacao_id",
            )
        data.update(
            {
                "hierarquizacao_id": str(payload.hierarquizacao_id),
                "hierarquizacao_codigo": hierarq.get("codigo"),
                "config_tipo": None,
                "config_id": None,
                "config_avulsa_id": None,
                "config_portfolio_id": None,
                "config_codigo": None,
                "config_nome": None,
                "criterios": criterios,
                "n_criterios": len(_criterio_nomes(criterios)),
            }
        )
    elif payload.matriz_premissas_criterios is not None:
        criterios = _criterios_from_matriz(payload.matriz_premissas_criterios)
        if len(criterios) < 2:
            raise DemandaValidationError(
                "A matriz deve possuir ao menos dois critérios.", field="criterios"
            )
        if int(atual.get("total_respostas") or 0) > 0:
            raise DemandaValidationError(
                "A matriz não pode ser alterada após o recebimento de respostas.",
                field="criterios",
            )
        data.update({"criterios": criterios, "n_criterios": len(_criterio_nomes(criterios))})
    elif payload.config_tipo is not None and payload.config_id is not None:
        if payload.config_tipo not in {"avulsa", "portfolio"}:
            raise DemandaValidationError("Origem de configuração inválida.", field="config_tipo")
        config = config_repo.get_by_id(payload.config_tipo, payload.config_id)
        if not config:
            raise DemandaValidationError("Configuração multicritério não encontrada.", field="config_id")
        criterios = config.get("criterios") or []
        if len(criterios) < 2:
            raise DemandaValidationError(
                "A configuração deve possuir ao menos dois critérios.", field="config_id"
            )
        origem_alterada = (
            atual.get("config_tipo") != payload.config_tipo
            or str(atual.get("config_id") or "") != str(payload.config_id)
        )
        if origem_alterada and int(atual.get("total_respostas") or 0) > 0:
            raise DemandaValidationError(
                "A hierarquização não pode ser alterada após o recebimento de respostas.",
                field="config_id",
            )
        outro_ambiente = repo.get_active_ambiente_by_config(payload.config_tipo, payload.config_id)
        if origem_alterada and outro_ambiente and str(outro_ambiente.get("id")) != str(ambiente_id):
            raise DemandaValidationError(
                "A configuração selecionada já possui outro julgamento aberto.",
                field="config_id",
            )
        data.update(
            {
                "hierarquizacao_id": str(config["hierarquizacao_id"]) if config.get("hierarquizacao_id") else None,
                "hierarquizacao_codigo": None,
                "config_tipo": payload.config_tipo,
                "config_id": str(payload.config_id),
                "config_avulsa_id": str(payload.config_id) if payload.config_tipo == "avulsa" else None,
                "config_portfolio_id": str(payload.config_id) if payload.config_tipo == "portfolio" else None,
                "config_codigo": config.get("codigo"),
                "config_nome": config.get("nome"),
                "criterios": criterios,
                "n_criterios": len(_criterio_nomes(criterios)),
            }
        )
    if payload.convites is not None:
        convites = [{"email": str(item.email).strip().lower()} for item in payload.convites]
        emails = [item["email"] for item in convites]
        if len(set(emails)) != len(emails):
            raise DemandaValidationError("Há e-mails duplicados.", field="convites")
        data["convites"] = convites
    if payload.valido_ate is not None:
        limite = payload.valido_ate
        if limite.tzinfo is None:
            limite = limite.replace(tzinfo=timezone.utc)
        if limite <= datetime.now(timezone.utc):
            raise DemandaValidationError("O prazo deve ser futuro.", field="valido_ate")
        data["valido_ate"] = limite
    atualizado = repo.update_ambiente(ambiente_id, data)
    if not atualizado:
        raise DemandaValidationError("Julgamento não encontrado.", field="julgamento_id")
    atualizado["total_respostas"] = sum(1 for r in repo.list_respostas(ambiente_id) if r.get("status", "enviada") == "enviada")
    if payload.hierarquizacao_id is not None:
        atualizado["hierarquizacao_nome"] = hierarq.get("nome")
    return _ambiente_to_response(atualizado, base_url=base_url)


def excluir_ambiente(ambiente_id: str) -> None:
    if not repo.delete_ambiente(ambiente_id):
        raise DemandaValidationError("Julgamento não encontrado.", field="julgamento_id")


def listar_ambientes_hierarquizacao(
    hierarq_id: UUID, *, base_url: str = ""
) -> list[AmbienteColaborativoResponseSchema]:
    """Lista o histórico completo de julgamentos colaborativos da hierarquização."""
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


def iniciar_resposta(token: str, payload: RespostaColaborativaInicioSchema) -> RespostaColaborativaResponseSchema:
    """Cria ou recupera o preenchimento persistente assim que o formulário é liberado."""
    ambiente = repo.get_ambiente_by_token(token)
    if not ambiente:
        raise DemandaValidationError("Ambiente não encontrado.", field="token")
    _validar_ambiente_ativo(ambiente)
    ident = payload.identificacao
    email = str(ident.email).strip().lower()
    if email not in _emails_convites(ambiente.get("convites") or []):
        raise DemandaValidationError("Este e-mail não está autorizado a preencher este formulário.", field="email")
    existente = repo.get_resposta_by_ambiente_email(str(ambiente["id"]), email)
    if existente:
        return _resposta_to_response(existente)
    n = len(_criterio_nomes(ambiente.get("criterios") or []))
    matriz_inicial = [[1.0 for _ in range(n)] for _ in range(n)]
    inserted = repo.insert_resposta({
        "ambiente_id": str(ambiente["id"]),
        "nome_completo": ident.nome_completo.strip(),
        "email": email,
        "instituicao": ident.instituicao.strip(),
        "matriz_comparacao": matriz_inicial,
        "consistente": False,
        "status": "em_preenchimento",
        "estatisticas": {},
        "enviado_em": None,
    })
    if not inserted:
        inserted = repo.get_resposta_by_ambiente_email(str(ambiente["id"]), email)
    return _resposta_to_response(inserted)


def salvar_progresso_resposta(token: str, payload: RespostaColaborativaProgressoSchema) -> RespostaColaborativaResponseSchema:
    ambiente = repo.get_ambiente_by_token(token)
    if not ambiente:
        raise DemandaValidationError("Ambiente não encontrado.", field="token")
    _validar_ambiente_ativo(ambiente)
    email = payload.email.strip().lower()
    resposta = repo.get_resposta_by_ambiente_email(str(ambiente["id"]), email)
    if not resposta:
        raise DemandaValidationError("Inicie o preenchimento antes de salvar o progresso.", field="email")
    if resposta.get("status", "enviada") == "enviada":
        raise DemandaValidationError("Esta resposta já foi enviada.", field="status")
    _validar_matriz_pareada(payload.matriz_comparacao, len(_criterio_nomes(ambiente.get("criterios") or [])))
    updated = repo.update_resposta_progresso(str(resposta["id"]), {
        "matriz_comparacao": payload.matriz_comparacao,
        "estatisticas": payload.estatisticas or {},
    })
    return _resposta_to_response(updated)
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

    existente = repo.get_resposta_by_ambiente_email(str(row["id"]), email)
    if existente and existente.get("status", "enviada") == "enviada":
        raise DemandaValidationError("Já existe uma resposta enviada para este e-mail.", field="email")

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

    dados_resposta = {
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
            "status": "enviada",
            "estatisticas": payload.estatisticas or {},
            "enviado_em": datetime.now(timezone.utc),
        }
    inserted = repo.update_resposta_progresso(str(existente["id"]), dados_resposta) if existente else repo.insert_resposta(dados_resposta)
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


def listar_respostas_central() -> list[dict[str, Any]]:
    """Lista todas as respostas com a procedência do ambiente e da hierarquização."""
    return [
        {
            **_resposta_to_response(row).model_dump(),
            "hierarquizacao_id": str(row["hierarquizacao_id"]) if row.get("hierarquizacao_id") else None,
            "hierarquizacao_codigo": row.get("hierarquizacao_codigo", ""),
            "hierarquizacao_nome": row.get("hierarquizacao_nome"),
            "criterios": row.get("criterios") or [],
            "token": row["token"],
            "config_tipo": row.get("config_tipo"),
            "config_id": str(row["config_id"]) if row.get("config_id") else None,
            "config_codigo": row.get("config_codigo"),
            "config_nome": row.get("config_nome"),
        }
        for row in repo.list_respostas_central()
    ]


def atualizar_resposta(
    resposta_id: str, payload: RespostaColaborativaUpdateSchema
) -> RespostaColaborativaResponseSchema:
    data = payload.model_dump(exclude_none=True)
    for field in ("nome_completo", "email", "instituicao"):
        if field in data:
            data[field] = str(data[field]).strip()
    if "email" in data:
        data["email"] = data["email"].lower()
    atualizado = repo.update_resposta(resposta_id, data)
    if not atualizado:
        raise DemandaValidationError("Resposta não encontrada.", field="resposta_id")
    return _resposta_to_response(atualizado)


def excluir_resposta(resposta_id: str) -> None:
    if not repo.delete_resposta(resposta_id):
        raise DemandaValidationError("Resposta não encontrada.", field="resposta_id")


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


def _analise_response(row: dict[str, Any]) -> AnaliseColaborativaResponseSchema:
    return AnaliseColaborativaResponseSchema(
        id=str(row["id"]), ambiente_id=str(row["ambiente_id"]), codigo=row["codigo"], nome=row["nome"],
        descricao=row.get("descricao"), metodo_agregacao=row["metodo_agregacao"], rc_maximo=float(row["rc_maximo"]),
        excluir_inconsistentes=bool(row["excluir_inconsistentes"]), matriz_consolidada=row["matriz_consolidada"],
        pesos_consolidados=row["pesos_consolidados"], lambda_max=float(row["lambda_max"]),
        indice_consistencia=float(row["indice_consistencia"]), indice_aleatorio=float(row["indice_aleatorio"]),
        razao_consistencia=float(row["razao_consistencia"]), consistente=bool(row["consistente"]),
        estatisticas_analise=row.get("estatisticas_analise") or {}, status=row["status"],
        respostas_incluidas=int(row.get("respostas_incluidas") or 0), resposta_ids=analise_repo.list_resposta_ids(str(row["id"])),
        criadoEm=_iso(row.get("criado_em")) or "", atualizadoEm=_iso(row.get("atualizado_em")) or "",
        homologadoEm=_iso(row.get("homologado_em")),
    )


def _estatisticas_respostas(respostas: list[dict[str, Any]], criterios: list[str]) -> dict[str, Any]:
    individuais = []
    for resposta in respostas:
        resultado = ahp_engine.analyze_matrix(resposta["matriz_comparacao"])
        individuais.append({"resposta_id": str(resposta["id"]), "respondente": resposta["nome_completo"], "email": resposta["email"], "pesos": resultado["weights"], "rc": float(resultado["CR"])})
    por_criterio = []
    for i, nome in enumerate(criterios):
        valores = [item["pesos"][i] for item in individuais]
        media = sum(valores) / len(valores)
        por_criterio.append({"criterio": nome, "valores": valores, "media": media, "minimo": min(valores), "maximo": max(valores), "desvio": math.sqrt(sum((v-media)**2 for v in valores)/len(valores))})
    por_par = []
    for i in range(len(criterios)):
        for j in range(i + 1, len(criterios)):
            valores = [float(r["matriz_comparacao"][i][j]) for r in respostas]
            gm = math.exp(sum(math.log(v) for v in valores) / len(valores))
            dispersao = math.sqrt(sum((math.log(v)-math.log(gm))**2 for v in valores)/len(valores))
            por_par.append({"i": i, "j": j, "criterio_a": criterios[i], "criterio_b": criterios[j], "valores": valores, "media_geometrica": gm, "dispersao_log": dispersao})
    return {"individuais": individuais, "por_criterio": por_criterio, "por_par": por_par}


def criar_analise(ambiente_id: str, payload: AnaliseColaborativaCreateSchema, usuario_id: str | None = None) -> AnaliseColaborativaResponseSchema:
    ambiente = repo.get_ambiente_by_id(ambiente_id)
    if not ambiente:
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    respostas = [r for r in repo.list_respostas(ambiente_id) if r.get("status", "enviada") == "enviada"]
    selecionadas = {str(v) for v in payload.resposta_ids} if payload.resposta_ids else None
    if selecionadas is not None:
        respostas = [r for r in respostas if str(r["id"]) in selecionadas]
    if payload.excluir_inconsistentes:
        respostas = [r for r in respostas if r.get("consistente") and float(r.get("razao_consistencia") or 0) <= payload.rc_maximo]
    if not respostas:
        raise DemandaValidationError("Nenhuma resposta enviada atende aos filtros da análise.", field="respostas")
    consolidada = media_geometrica_matrizes([r["matriz_comparacao"] for r in respostas])
    resultado = ahp_engine.analyze_matrix(consolidada)
    nomes = _criterio_nomes(ambiente.get("criterios") or [])
    estatisticas = _estatisticas_respostas(respostas, nomes)
    estatisticas["total_respostas"] = len(respostas)
    row = analise_repo.insert_with_respostas({
        "ambiente_id": ambiente_id, "codigo": "ANL-" + secrets.token_hex(6).upper(), "nome": payload.nome.strip(),
        "descricao": payload.descricao, "metodo_agregacao": "aij_media_geometrica", "rc_maximo": payload.rc_maximo,
        "excluir_inconsistentes": payload.excluir_inconsistentes, "matriz_consolidada": consolidada,
        "pesos_consolidados": resultado["weights"], "lambda_max": resultado["lambdaMax"],
        "indice_consistencia": resultado["CI"], "indice_aleatorio": resultado["RI"],
        "razao_consistencia": resultado["CR"], "consistente": float(resultado["CR"]) < payload.rc_maximo,
        "estatisticas_analise": estatisticas, "status": "calculada", "criado_por": usuario_id,
    }, [{"resposta_id": str(r["id"]), "considerada_por": usuario_id} for r in respostas])
    row["respostas_incluidas"] = len(respostas)
    return _analise_response(row)


def listar_analises(ambiente_id: str) -> list[AnaliseColaborativaResponseSchema]:
    return [_analise_response(row) for row in analise_repo.list_by_ambiente(ambiente_id)]


def obter_espaco_analitico(ambiente_id: str, *, base_url: str = "") -> dict[str, Any]:
    ambiente = repo.get_ambiente_by_id(ambiente_id)
    if not ambiente:
        raise DemandaValidationError("Julgamento não encontrado.", field="ambiente_id")
    respostas = repo.list_respostas(ambiente_id)
    enviados = [r for r in respostas if r.get("status", "enviada") == "enviada"]
    nomes = _criterio_nomes(ambiente.get("criterios") or [])
    estatisticas = _estatisticas_respostas(enviados, nomes) if enviados else {"individuais": [], "por_criterio": [], "por_par": []}
    return {
        "ambiente": _ambiente_to_response(ambiente, base_url=base_url).model_dump(),
        "participacao": {"convidados": len(ambiente.get("convites") or []), "nao_iniciados": max(0, len(ambiente.get("convites") or [])-len(respostas)), "em_preenchimento": sum(r.get("status") == "em_preenchimento" for r in respostas), "enviadas": len(enviados), "consistentes": sum(bool(r.get("consistente")) for r in enviados), "inconsistentes": sum(not bool(r.get("consistente")) for r in enviados)},
        "respostas": [_resposta_to_response(r).model_dump() for r in respostas],
        "estatisticas": estatisticas,
        "analises": [a.model_dump() for a in listar_analises(ambiente_id)],
        "analise_homologada_id": str(ambiente["analise_homologada_id"]) if ambiente.get("analise_homologada_id") else None,
    }


def homologar_analise(analise_id: str, usuario_id: str | None = None, *, base_url: str = "") -> AnaliseColaborativaResponseSchema:
    analise = analise_repo.get_by_id(analise_id)
    if not analise:
        raise DemandaValidationError("Análise não encontrada.", field="analise_id")
    if not analise.get("consistente"):
        raise DemandaValidationError("Somente uma análise consistente pode ser homologada.", field="consistente")
    ambiente = repo.get_ambiente_by_id(str(analise["ambiente_id"]))
    atualizado = analise_repo.homologar(analise_id, str(analise["ambiente_id"]), usuario_id)
    agora = datetime.now(timezone.utc)
    repo.atualizar_consolidacao(str(analise["ambiente_id"]), {
        "matriz_consolidada": analise["matriz_consolidada"], "pesos_consolidados": analise["pesos_consolidados"],
        "lambda_max": analise["lambda_max"], "indice_consistencia": analise["indice_consistencia"],
        "indice_aleatorio": analise["indice_aleatorio"], "razao_consistencia": analise["razao_consistencia"],
        "consistente": analise["consistente"], "respostas_consolidadas": len(analise_repo.list_resposta_ids(analise_id)),
        "consolidado_em": agora, "status": "consolidada",
    }, {"comparacao_colaborativa": {"analise_homologada_id": analise_id, "matriz_comparacao": analise["matriz_consolidada"], "pesos": {"criteria": _criterio_nomes(ambiente.get("criterios") or []), "weights": analise["pesos_consolidados"]}}} if ambiente and ambiente.get("hierarquizacao_id") else None)
    atualizado["respostas_incluidas"] = len(analise_repo.list_resposta_ids(analise_id))
    return _analise_response(atualizado)


def consolidar_ambiente(
    ambiente_id: str, *, base_url: str = ""
) -> AmbienteColaborativoResponseSchema:
    """Consolida as respostas consistentes por média geométrica e grava o resultado."""
    amb = repo.get_ambiente_by_id(ambiente_id)
    if not amb:
        raise DemandaValidationError("Ambiente não encontrado.", field="ambiente_id")

    respostas = [
        r for r in repo.list_respostas(ambiente_id)
        if r.get("status", "enviada") == "enviada" and r.get("consistente")
    ]
    if not respostas:
        raise DemandaValidationError(
            "Nenhuma resposta consistente recebida até o momento — não há o que consolidar.",
            field="respostas",
        )

    matrizes = [r.get("matriz_comparacao") or [] for r in respostas]
    consolidada = media_geometrica_matrizes(matrizes)
    resultado = ahp_engine.analyze_matrix(consolidada)
    rc = float(resultado["CR"])

    criterios = amb.get("criterios") or []
    nomes = _criterio_nomes(criterios)
    pesos = {"criteria": nomes, "weights": resultado["weights"]}

    agora = datetime.now(timezone.utc)

    colaborativa = {
        "versao": 1,
        "hierarquizacao_id": str(amb["hierarquizacao_id"]) if amb.get("hierarquizacao_id") else None,
        "hierarquizacao_codigo": amb.get("hierarquizacao_codigo"),
        "config_tipo": amb.get("config_tipo"),
        "config_id": str(amb["config_id"]) if amb.get("config_id") else None,
        "config_codigo": amb.get("config_codigo"),
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
        {"comparacao_colaborativa": colaborativa} if amb.get("hierarquizacao_id") else None,
    )
    if not atualizado:
        raise DemandaValidationError("Falha ao gravar a consolidação.", field="ambiente_id")
    atualizado["total_respostas"] = sum(1 for r in repo.list_respostas(ambiente_id) if r.get("status", "enviada") == "enviada")
    if amb.get("config_tipo") and amb.get("config_codigo"):
        config_repo.update(amb["config_tipo"], amb["config_codigo"], {
            "matriz_comparacao": consolidada,
            "pesos": resultado["weights"],
            "lambda_max": resultado["lambdaMax"],
            "indice_consistencia": resultado["CI"],
            "indice_aleatorio": resultado["RI"],
            "razao_consistencia": rc,
            "consistente": rc < 0.10,
            "modo_preenchimento": "colaborativo",
        })
    return _ambiente_to_response(atualizado, base_url=base_url)
