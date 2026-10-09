"""Conferência territorial OGR, sem buffer ou alteração do arquivo original."""
from functools import lru_cache
from pathlib import Path
import json, hashlib, hmac, time
from osgeo import ogr
from fastapi import HTTPException
from api.config import get_settings
from api.db.connection import get_connection
from api.services.normalizacao_demanda import reprojetar

@lru_cache(maxsize=1)
def cobertura_marinha():
    path=Path(__file__).resolve().parents[2]/"data/referencias-territoriais/abrangencia-marinha-sp.geojson"
    if not path.is_file():raise HTTPException(503,"Base territorial marítima indisponível.")
    data=json.loads(path.read_text(encoding="utf-8"))
    geom=ogr.CreateGeometryFromJson(json.dumps(data['features'][0]['geometry']))
    return reprojetar(geom,4674,5880)

@lru_cache(maxsize=1)
def municipios_metricos():
    with get_connection() as conn:
        rows=conn.execute("SELECT cd_mun,nm_mun,ST_AsBinary(geom) AS geom FROM base_municipal.municipio WHERE sigla_uf='SP' ORDER BY cd_mun").fetchall()
    if len(rows)!=645:raise HTTPException(503,"Malha municipal paulista incompleta; conferência suspensa.")
    return tuple((row['cd_mun'],row['nm_mun'],reprojetar(ogr.CreateGeometryFromWkb(bytes(row['geom'])),4674,5880)) for row in rows)

def conferir(geometry):
    g=ogr.CreateGeometryFromJson(json.dumps(geometry))
    if g is None or g.IsEmpty() or not g.IsValid():raise HTTPException(422,"Geometria vazia ou inválida.")
    g=reprojetar(g,4326,5880)
    names=[]; coverage=None
    for code,name,m in municipios_metricos():
        if not g.Intersects(m):continue
        names.append({'codigo':code,'nome':name})
        coverage=m.Clone() if coverage is None else coverage.Union(m)
    remaining=g if coverage is None else g.Difference(coverage)
    if remaining.IsEmpty():
        return {'situacao':'municipal','permitido':True,'municipios':names,
            'mensagem':'A geometria está inserida em: '+', '.join(n['nome'] for n in names)+'. Confirma a localização? Para retificar, envie outra geometria.',
            'fonte':'IBGE · Malha municipal 2022 · São Paulo'}
    marine=cobertura_marinha()
    if remaining.Difference(marine).IsEmpty():
        places=', '.join(n['nome'] for n in names)
        message=('A geometria está inserida na área marítima de referência de São Paulo.' if not places else
                 'A geometria está inserida em '+places+' e na área marítima de referência de São Paulo.')
        return {'situacao':'marinha' if not names else 'mista','permitido':True,'municipios':names,
            'mensagem':message+' Confirma a localização? Para retificar, envie outra geometria.',
            'fonte':'IBGE/ANP · Projeções estaduais e Sistema Costeiro-Marinho 2024',
            'referencia_marinha':'recorte operacional estimado de São Paulo'}
    return {'situacao':'fora_abrangencia','permitido':False,'municipios':names,
        'mensagem':'A geometria está total ou parcialmente fora da área de abrangência terrestre e marítima de São Paulo. Envie uma geometria dentro da área de abrangência do estado.',
        'fonte':'IBGE · Malha municipal paulista e área marítima de referência SP'}

def emitir_confirmacao(content,usuario,tipo,codigo):
    payload=json.dumps({'hash':hashlib.sha256(content).hexdigest(),'usuario':usuario,'tipo':tipo,'codigo':codigo,'exp':int(time.time())+900},sort_keys=True)
    signature=hmac.new(get_settings().session_secret.encode(),payload.encode(),hashlib.sha256).hexdigest()
    return payload+'|'+signature

def validar_confirmacao(token,content,usuario,tipo,codigo):
    try:
        payload,signature=token.rsplit('|',1)
        expected=hmac.new(get_settings().session_secret.encode(),payload.encode(),hashlib.sha256).hexdigest()
        data=json.loads(payload)
        valid=hmac.compare_digest(signature,expected) and data['exp']>=time.time() and data['hash']==hashlib.sha256(content).hexdigest() and data['usuario']==usuario and data['tipo']==tipo and data['codigo']==codigo
    except (ValueError,KeyError,TypeError):valid=False
    if not valid:raise HTTPException(422,"Conferência expirada ou incompatível com o arquivo, demanda ou usuário. Confira novamente.")
