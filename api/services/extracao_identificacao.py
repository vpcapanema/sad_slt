"""Inspeção descritiva de identificadores; sugestões dependem de confirmação."""
import re
import unicodedata
from api.repositories.camada_geoespacial_repository import _json_safe


def inspecionar(frame, fid_nativo=None):
    campos = []
    for name in frame.columns:
        if name == frame.geometry.name:
            continue
        series = frame[name]
        preenchidos = series.notna() & series.astype(str).str.strip().ne('')
        vals = series[preenchidos].map(str)
        normal = unicodedata.normalize('NFKD', str(name)).encode('ascii','ignore').decode().lower()
        nativo = bool(re.fullmatch(r'(fid|object_?id|ogc_fid|oid|slt_fid_origem)', normal)) or name == fid_nativo
        demanda = bool(re.search(r'demanda|projeto|empreendimento|intervencao|codigo|cod_|^id$', normal))
        campos.append({'nome':str(name), 'preenchidos':int(preenchidos.sum()), 'distintos':int(vals.nunique()),
                       'repetidos':int(vals.size-vals.nunique()), 'nulos':int((~preenchidos).sum()),
                       'amostra':_json_safe(series[preenchidos].head(4).tolist()),
                       'id_feicao':nativo, 'candidato_demanda':demanda and not nativo})
    candidatos = sorted((c for c in campos if c['candidato_demanda'] and not c['nulos']),
                        key=lambda c:(not bool(re.search('demanda|projeto',c['nome'],re.I)),c['nome']))
    return {'total':len(frame),'campos':campos,'fid_nativo':fid_nativo,
            'sugestao':candidatos[0]['nome'] if candidatos else '__feicao__','completa':True}
