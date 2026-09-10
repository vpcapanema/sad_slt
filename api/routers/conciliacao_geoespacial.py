"""Conciliação administrativa e ações explícitas do ciclo de vida de arquivos."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.templating import Jinja2Templates

from api.deps.auth import require_admin
from api.exceptions import DatabaseUnavailableError
from api.path_policy import project_path
from api.services.catalogo_arquivos import obter_conciliacao, normalizar_vinculo
from api.services.session_service import SessionUser
from api.services import ciclo_vida_arquivos as ciclo
from pydantic import BaseModel, Field, StrictInt

router = APIRouter(dependencies=[Depends(require_admin)])
templates = Jinja2Templates(directory=str(project_path("templates")))


@router.get("/catalogo/conciliacao")
def consultar():
    try:
        return obter_conciliacao()
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, "Banco indisponível. A conciliação não foi realizada.") from exc


@router.get("/catalogo/conciliacao/pagina")
def pagina(request: Request):
    return templates.TemplateResponse(request=request, name="paginas/geoespacial/conciliacao.html")


@router.post("/catalogo/conciliacao/{categoria}/{recurso_id}/normalizar")
def normalizar(categoria: str, recurso_id: str, user: SessionUser = Depends(require_admin)):
    try:
        return normalizar_vinculo(categoria, recurso_id, str(user.id))
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    except DatabaseUnavailableError as exc:
        raise HTTPException(503, "Não foi possível confirmar a alteração no banco.") from exc


def _executar(action):
    try:
        return action()
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    except DatabaseUnavailableError as exc:
        if isinstance(exc.__cause__, ValueError):
            raise HTTPException(409, str(exc.__cause__)) from exc
        raise HTTPException(503, "Não foi possível confirmar a operação no banco.") from exc


@router.get('/catalogo/conciliacao/ciclo-vida')
def ciclo_vida():
    return _executar(lambda: {'arquivos':ciclo.listar(), 'politica':ciclo.politica()})


@router.post('/catalogo/conciliacao/resultados/{recurso_id}/regularizar')
def regularizar(recurso_id: str, user: SessionUser = Depends(require_admin)):
    return _executar(lambda: ciclo.regularizar(recurso_id, str(user.id)))


@router.post('/catalogo/conciliacao/resultados/{recurso_id}/publicar')
def publicar(recurso_id: str, user: SessionUser = Depends(require_admin)):
    return _executar(lambda: ciclo.publicar(recurso_id, str(user.id)))


class RetencaoInput(BaseModel):
    dias_temporarios: StrictInt | None = Field(default=None, ge=1, le=3650)


@router.put('/catalogo/conciliacao/retencao')
def configurar_retencao(payload: RetencaoInput, user: SessionUser = Depends(require_admin)):
    return _executar(lambda: ciclo.politica(payload.dias_temporarios, str(user.id), salvar=True))


@router.get('/catalogo/conciliacao/retencao/previa')
def previa(user: SessionUser = Depends(require_admin)):
    return _executar(lambda: ciclo.limpar(str(user.id)))


@router.post('/catalogo/conciliacao/retencao/executar')
def reter(user: SessionUser = Depends(require_admin)):
    return _executar(lambda: ciclo.limpar(str(user.id), executar=True))
