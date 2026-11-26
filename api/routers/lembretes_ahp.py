"""Rotas restritas da Central de lembretes."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from psycopg.errors import UndefinedColumn, UndefinedTable
from pydantic import AwareDatetime, EmailStr

from api.deps.auth import require_authenticated
from api.exceptions import DatabaseUnavailableError, DemandaValidationError
from api.schemas.lembretes_ahp import FrequenciaLembretesSchema, NotificacoesLembretesSchema
from api.services import autorizacao, lembretes_ahp
from api.services.session_service import SessionUser

router = APIRouter(prefix="/ahp/comparacao-colaborativa", tags=["ahp-lembretes"],
                   dependencies=[Depends(require_authenticated)])
_FALTA_MIGRACAO = "A Central de lembretes requer as migrações 188 e 190 do banco."


@router.get("/lembretes")
def configuracoes() -> list[dict]:
    try:
        return lembretes_ahp.configuracoes()
    except (UndefinedTable, UndefinedColumn) as exc:
        raise HTTPException(503, detail=_FALTA_MIGRACAO) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}/lembretes")
def listar(ambiente_id: UUID) -> dict:
    try:
        return lembretes_ahp.listar(str(ambiente_id))
    except DemandaValidationError as exc:
        raise HTTPException(404, detail=str(exc)) from exc
    except (UndefinedTable, UndefinedColumn) as exc:
        raise HTTPException(503, detail=_FALTA_MIGRACAO) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.put("/ambientes/{ambiente_id}/lembretes")
def configurar(ambiente_id: UUID, dados: FrequenciaLembretesSchema,
               user: SessionUser = Depends(require_authenticated)) -> dict:
    autorizacao.exigir(user, "mad.operar", acao="configurar a frequência dos lembretes")
    try:
        return lembretes_ahp.configurar(str(ambiente_id), dados, user.id)
    except DemandaValidationError as exc:
        raise HTTPException(404, detail=str(exc)) from exc
    except (UndefinedTable, UndefinedColumn) as exc:
        raise HTTPException(503, detail=_FALTA_MIGRACAO) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.put("/ambientes/{ambiente_id}/lembretes/notificacoes")
def definir_notificacoes(ambiente_id: UUID, dados: NotificacoesLembretesSchema,
                        user: SessionUser = Depends(require_authenticated)) -> dict:
    autorizacao.exigir(user, "mad.operar", acao="ativar ou desativar notificações de lembretes")
    try:
        return lembretes_ahp.definir_notificacoes(str(ambiente_id), dados.notificacoes_ativas)
    except DemandaValidationError as exc:
        raise HTTPException(404, detail=str(exc)) from exc
    except (UndefinedTable, UndefinedColumn) as exc:
        raise HTTPException(503, detail=_FALTA_MIGRACAO) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("/ambientes/{ambiente_id}/lembretes/previa")
def previa(ambiente_id: UUID, dados: FrequenciaLembretesSchema, email: EmailStr | None = None,
           apos: AwareDatetime | None = None, user: SessionUser = Depends(require_authenticated)) -> dict:
    autorizacao.exigir(user, "mad.operar", acao="simular a frequência dos lembretes")
    try:
        if email:
            return lembretes_ahp.historico(str(ambiente_id), email.lower(), apos, dados)
        return {"participantes": lembretes_ahp.listar(str(ambiente_id), dados)["participantes"]}
    except DemandaValidationError as exc:
        raise HTTPException(404, detail=str(exc)) from exc
    except (UndefinedTable, UndefinedColumn) as exc:
        raise HTTPException(503, detail=_FALTA_MIGRACAO) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.get("/ambientes/{ambiente_id}/lembretes/historico")
def historico(ambiente_id: UUID, email: EmailStr, apos: AwareDatetime | None = None) -> dict:
    try:
        return lembretes_ahp.historico(str(ambiente_id), email.lower(), apos)
    except DemandaValidationError as exc:
        raise HTTPException(404, detail=str(exc)) from exc
    except (UndefinedTable, UndefinedColumn) as exc:
        raise HTTPException(503, detail=_FALTA_MIGRACAO) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
