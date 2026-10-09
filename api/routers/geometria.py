"""Rotas HTTP — parse de geometria (upload)."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from api.geometria_parser import MAX_GEOMETRIA_UPLOAD_BYTES, parse_upload

router = APIRouter(tags=["geometria"])


@router.post("/geometria/parse")
def api_geometria_parse(file: UploadFile = File(...)):
    content = file.file.read()
    if len(content) > MAX_GEOMETRIA_UPLOAD_BYTES:
        raise HTTPException(413, "Arquivo maior que 50 MB.")
    try:
        parsed = parse_upload(file.filename or "", content)
        from api.services.normalizacao_demanda import normalizar
        geom = normalizar(parsed['geojson']['geometry'], crs_saida=4326)
        return {**parsed, 'tipo_original': parsed['tipo'], 'tipo': geom['type'],
                'coordinates': geom['coordinates'], 'geojson': {**parsed['geojson'], 'geometry': geom},
                'crs_armazenamento': 'EPSG:4674', 'buffer_ponto_m': 50, 'buffer_linha_m': 25}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, f"Erro ao processar arquivo: {exc}") from exc


from fastapi import Depends, Form
from api.deps.auth import require_operator
from api.services.session_service import SessionUser
from api.services.conferencia_geometria import conferir, emitir_confirmacao, validar_confirmacao
from api.services.substituicao_geometria import substituir, TIPOS
from api.services.arquivo_geometria import receber_arquivo_geometria
from api.schemas.demanda import GeometriaSchema

@router.post("/geometria/conferir/{tipo}/{codigo}")
async def conferir_geometria(tipo: str,codigo: str,file: UploadFile=File(...),user: SessionUser=Depends(require_operator)):
    if tipo not in TIPOS:raise HTTPException(422,"Tipo de demanda inválido.")
    content=await file.read(MAX_GEOMETRIA_UPLOAD_BYTES+1)
    if len(content)>MAX_GEOMETRIA_UPLOAD_BYTES:raise HTTPException(413,"Arquivo maior que 50 MB.")
    parsed=parse_upload(file.filename or "",content)
    result=conferir(parsed['geojson']['geometry'])
    if result['permitido']:result['confirmacao']=emitir_confirmacao(content,user.id,tipo,codigo)
    return result

@router.post("/geometria/substituir/{tipo}/{codigo}")
async def substituir_geometria(tipo: str,codigo: str,confirmacao: str=Form(...),file: UploadFile=File(...),user: SessionUser=Depends(require_operator)):
    content=await file.read(MAX_GEOMETRIA_UPLOAD_BYTES+1)
    if len(content)>MAX_GEOMETRIA_UPLOAD_BYTES:raise HTTPException(413,"Arquivo maior que 50 MB.")
    validar_confirmacao(confirmacao,content,user.id,tipo,codigo)
    parsed=parse_upload(file.filename or "",content)
    # Confere novamente no servidor; um token não substitui a regra territorial.
    result=conferir(parsed['geojson']['geometry'])
    if not result['permitido']:raise HTTPException(422,result['mensagem'])
    from api.services.normalizacao_demanda import normalizar
    geom=normalizar(parsed['geojson']['geometry'],crs_saida=4326)
    await file.seek(0)
    arquivo=await receber_arquivo_geometria(file,GeometriaSchema(tipo=geom['type'],coordinates=geom['coordinates']))
    return substituir(tipo,codigo,parsed['geojson']['geometry'],arquivo,user.id)
