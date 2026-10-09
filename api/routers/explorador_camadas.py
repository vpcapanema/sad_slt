"""Navegação e download autenticados do explorador geoespacial."""
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from api.deps.auth import require_geospatial_access
from api.services.session_service import SessionUser
from api.services import explorador_camadas as service
router=APIRouter(prefix='/explorador',tags=['explorador'])


def _error(exc):
    if isinstance(exc,PermissionError): return HTTPException(403,str(exc))
    if isinstance(exc,FileNotFoundError): return HTTPException(404,str(exc))
    return HTTPException(422,str(exc))


@router.get('/navegar')
def navegar(fonte:str='',caminho:str='',user:SessionUser=Depends(require_geospatial_access)):
    try: return service.navegar(fonte,caminho)
    except (ValueError,FileNotFoundError,PermissionError) as exc: raise _error(exc) from exc


@router.get('/detalhes')
def detalhes(fonte:str,id:str,user:SessionUser=Depends(require_geospatial_access)):
    try: return service.detalhes(fonte,id,user)
    except (ValueError,FileNotFoundError,PermissionError) as exc: raise _error(exc) from exc


@router.get('/download')
def download(fonte:str,id:str,user:SessionUser=Depends(require_geospatial_access)):
    try: file,name,temporary=service.pacote(fonte,id,user)
    except (ValueError,FileNotFoundError,PermissionError) as exc: raise _error(exc) from exc
    def content():
        try:
            with file.open('rb') as stream:
                while block:=stream.read(1024*1024): yield block
        finally: temporary.cleanup()
    return StreamingResponse(content(),media_type='application/zip',background=BackgroundTask(temporary.cleanup),headers={
        'Content-Disposition':"attachment; filename*=UTF-8''"+quote(name),
        'Content-Length':str(file.stat().st_size),'Cache-Control':'no-store'})
