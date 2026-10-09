"""Explorador somente leitura das mesmas fontes e níveis do visualizador."""
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
from datetime import datetime
from api.repositories import cadastro_geometria_repository as demandas
from api.repositories import saidas_geoespaciais_repository as saidas
from api.services import storage_geoespacial as storage, storage_remoto
from api.services.session_service import is_gestor

ROOTS = (("demandas","DEMANDAS"),("storage","SICARD Storage"),("saidas","Geometrias de saída"))
STORAGE_ROOTS = (("base-geodatabase","Base-Geodatabase"),("base-geoespacial","Base-Geoespacial"),("superficies-indices","Superfícies-Índice"))
TYPES = {"plano":"Plano","programa":"Programa","projeto":"Projeto"}
SIDECARS = {".shp",".shx",".dbf",".prj",".cpg",".qpj",".sbn",".sbx"}


_SIGLAS = set("sp aprm ucs uc ibama cetesb iphan condephaat sigam uf ig mma pli pef zee ugrhi ra rg rm sma idesp sicg cecav incra pol pto lin".split())
def _friendly(name):
    parts=re.split(r"[_\-\s]+",re.sub(r"\.[a-z0-9]+$","",str(name),flags=re.I))
    return " ".join("UCs" if part.lower()=="ucs" else part.upper() if part.lower() in _SIGLAS else part if part[:1].isdigit() else part.capitalize() for part in parts if part)


def _folder(name, path, source):
    return {"nome":name,"pasta":True,"caminho":path,"fonte":source}


def _output_key(row):
    return hashlib.sha256(str(row.get("ferramenta") or row.get("operacao") or "Outras saídas").encode()).hexdigest()[:20]


def _file(row, source):
    path=row.get("arquivo") or ""
    extension=PurePosixPath(path).suffix.removeprefix('.').upper() or row.get("formato") or ("GEOJSON" if not path else "")
    return {"id":row["id"],"nome":row.get("alias") or row.get("nome") or PurePosixPath(path).name,
        "pasta":False,"fonte":source,"arquivo":path,"extensao":extension,
        "nome_arquivo":PurePosixPath(path).name if path else str(row.get("codigo") or row["id"])+".geojson",
        "tamanho_bytes":row.get("tamanho_bytes"),"modificado_em":row.get("modificado_em") or row.get("criado_em"),
        "camada":row.get("camada"),"geometria_tipo":str(row.get("geometria_tipo") or "").removeprefix("ST_") or None,
        "status":row.get("status"),"tipo":row.get("tipo"),"inventariar":row.get("inventariar",False),
        "mapeavel":row.get("mapeavel",not path or PurePosixPath(path).suffix.lower() in storage.EXTENSOES_VETOR | storage.EXTENSOES_RASTER | storage.storage_pacotes.COMPACTADOS)}


def _parts(path):
    parts=PurePosixPath(path).parts if path else ()
    if path.startswith('/') or '\\' in path or '..' in parts:
        raise ValueError("Pasta inválida")
    return parts


def navegar(source="", path=""):
    parts=_parts(path)
    if not source:
        if path: raise ValueError("Escolha um repositório")
        return {"itens":[_folder(label,"",key) for key,label in ROOTS]}
    if source=="demandas":
        if not parts:
            items=[_folder(label,key,source) for key,label in TYPES.items()]
        elif len(parts)==1 and parts[0] in TYPES:
            items=[_file(row,source) for row in demandas.listar_arquivos(parts[0])]
        else: raise ValueError("Pasta de demandas inválida")
    elif source=="storage":
        if not parts:
            items=[_folder(label,key,source) for key,label in STORAGE_ROOTS]
        elif parts[0] in dict(STORAGE_ROOTS):
            if not storage._via_api() and not storage.diretorio_storage().joinpath(*parts).resolve().is_relative_to(storage.diretorio_storage().resolve()):
                raise ValueError("Pasta fora do Storage")
            entries=storage._listar(path,incluir_ocultos=True)
            from api.services.extracao_atributos_aliases import nome_camada
            items=[]
            for entry in entries:
                relative=f"{path}/{entry['nome']}"
                if entry["pasta"]:
                    items.append(_folder(_friendly(entry["nome"]),relative,source))
                else:
                    ident=f"storage:{relative}"
                    items.append(_file(dict(id=ident,arquivo=relative,
                        alias=nome_camada(ident,_friendly(PurePosixPath(entry["nome"]).stem)),
                        tamanho_bytes=entry.get("tamanho"),modificado_em=entry.get("modificado")),source))
        else: raise ValueError("Pasta do Storage inválida")
    elif source=="saidas":
        rows=saidas.listar()
        if not parts:
            groups={_output_key(row):str(row.get("ferramenta") or row.get("operacao") or "Outras saídas") for row in rows}
            items=[_folder(_friendly(name),key,source) for key,name in groups.items()]
        elif len(parts)==1:
            executions={}
            for row in rows:
                if _output_key(row)==parts[0]: executions.setdefault(str(row["execucao_id"]),row)
            items=[_folder(f"{row['nome']} · {row.get('criado_em') or ''}",f"{path}/{key}",source) for key,row in executions.items()]
        elif len(parts)==2:
            selected=[row for row in rows if _output_key(row)==parts[0] and str(row["execucao_id"])==parts[1]]
            metadata={}
            for parent in {str(PurePosixPath(row["arquivo"]).parent) for row in selected}:
                from api.services.saidas_storage import validar
                for row in selected: validar(row["arquivo"])
                try:
                    for entry in storage._listar(parent,incluir_ocultos=True):
                        if not entry["pasta"]: metadata[f"{parent}/{entry['nome']}"]=entry
                except FileNotFoundError: pass
            items=[]
            for row in selected:
                item=_file(row,source);meta=metadata.get(row["arquivo"],{})
                if "tamanho" in meta:item["tamanho_bytes"]=meta["tamanho"]
                if "modificado" in meta:item["modificado_em"]=meta["modificado"]
                if not meta and item["tamanho_bytes"] is None:
                    try:
                        file=storage.resolver(row["arquivo"]);stat=file.stat();item.update(tamanho_bytes=stat.st_size,modificado_em=stat.st_mtime)
                    except FileNotFoundError: pass
                items.append(item)
            catalogued={row["arquivo"] for row in selected}
            for relative,meta in metadata.items():
                if relative in catalogued: continue
                anchor=next(row for row in selected if PurePosixPath(row["arquivo"]).parent==PurePosixPath(relative).parent)
                items.append(_file(dict(id=f"arquivo-saida:{anchor['id']}::{relative}",arquivo=relative,
                    nome=_friendly(PurePosixPath(relative).stem),tamanho_bytes=meta.get("tamanho"),
                    modificado_em=meta.get("modificado"),mapeavel=False),source))

        else: raise ValueError("Pasta de saídas inválida")
    else: raise ValueError("Repositório desconhecido")
    return {"itens":items,"folha":bool(parts) and not any(item["pasta"] for item in items)}


def _storage_identity(ident):
    path,layer=storage.separar_id(ident)
    parts=_parts(path)
    if not parts or parts[0] not in dict(STORAGE_ROOTS): raise ValueError("Arquivo fora dos repositórios do explorador")
    file=storage.resolver(path)
    if isinstance(file,Path) and not file.resolve().is_relative_to(storage.diretorio_storage().resolve()):
        raise ValueError("Arquivo fora do Storage")
    return path,layer,file


def _output(ident,user):
    extra=None
    if ident.startswith("arquivo-saida:"):
        ident,separator,extra=ident[len("arquivo-saida:"):].partition("::")
        if not separator: raise ValueError("Arquivo de saída inválido")
        _parts(extra)
    row=next((row for row in saidas.listar() if str(row["id"])==ident),None)
    if not row: raise FileNotFoundError("Saída não encontrada")
    ref=saidas.referencia(row["arquivo"])
    if not ref: raise FileNotFoundError("Arquivo não encontrado no catálogo")
    if ref["privado"] and ref.get("responsavel") and str(ref["responsavel"])!=str(user.id) and not is_gestor(user):
        raise PermissionError("Você não tem acesso a este arquivo")
    from api.services.saidas_storage import validar
    validar(row["arquivo"])
    if extra:
        if PurePosixPath(extra).parent!=PurePosixPath(row["arquivo"]).parent:
            raise ValueError("Arquivo fora da pasta da saída")
        file=storage.resolver(extra)
        if isinstance(file,Path) and not file.resolve().is_relative_to(storage.diretorio_storage().resolve()):
            raise ValueError("Arquivo fora do Storage")
        stat=file.stat()
        row=dict(row,id=f"arquivo-saida:{ident}::{extra}",arquivo=extra,nome=PurePosixPath(extra).name,
                 tamanho_bytes=stat.st_size,modificado_em=stat.st_mtime,mapeavel=False)
        ref=dict(ref,sha256=None)
    return row,ref


def detalhes(source,ident,user):
    if source=="demandas":
        prefix,tipo,codigo=ident.split(':',2)
        if prefix!="cadastro" or tipo not in TYPES: raise ValueError("Demanda inválida")
        row=next((row for row in demandas.listar_arquivos(tipo) if row['codigo']==codigo),None)
        if not row: raise FileNotFoundError("Geometria não encontrada")
        return dict(row,formato="GeoJSON (exportação)",arquivo_virtual=True,
                    observacao="Geometria cadastrada no PostGIS. O ZIP exporta a geometria no CRS cadastral; não é o arquivo original enviado no cadastro.")
    if source=="storage":
        path,layer,file=_storage_identity(ident)
        stat=file.stat()
        result={"arquivo":path,"nome":file.name,"extensao":file.suffix.lstrip('.').upper(),
                "tamanho_bytes":stat.st_size,"modificado_em":stat.st_mtime}
        if file.suffix.lower() in storage.EXTENSOES_VETOR | storage.EXTENSOES_RASTER | storage.storage_pacotes.COMPACTADOS:
            result["camadas"]=storage._itens_do_arquivo(file,path)
            if layer:
                result["camadas"]=[row for row in result["camadas"] if row.get("camada")==layer]
                if not result["camadas"]: raise FileNotFoundError("Camada interna não encontrada")
        return dict(result,observacao="O download preserva o arquivo original; SHP inclui seus componentes associados.")
    if source=="saidas":
        row,ref=_output(ident,user)
        return dict(row,sha256=ref.get("sha256"))
    raise ValueError("Repositório desconhecido")


def _copy_zip(zipfile,file,relative,name):
    timestamp=file.stat().st_mtime
    date=datetime.fromtimestamp(timestamp).timetuple()[:6] if timestamp>=315532800 else (1980,1,1,0,0,0)
    info=ZipInfo(name,date_time=date);info.compress_type=ZIP_DEFLATED
    with zipfile.open(info,'w',force_zip64=True) as out:
        if isinstance(file,storage.ArquivoStorage):
            return storage_remoto.copiar_para(relative,out)
        digest=hashlib.sha256()
        with file.open('rb') as stream:
            while block:=stream.read(1024*1024):
                digest.update(block);out.write(block)
        return digest.hexdigest()


def pacote(source,ident,user):
    """ZIP temporário, streaming de origens e nenhuma escrita nos repositórios."""
    temporary=TemporaryDirectory(prefix='sicard-explorador-')
    target=Path(temporary.name)/'download.zip'
    try:
        with ZipFile(target,'w',compression=ZIP_DEFLATED,allowZip64=True) as archive:
            if source=="demandas":
                prefix,tipo,codigo=ident.split(':',2)
                if prefix!="cadastro" or tipo not in TYPES: raise ValueError("Demanda inválida")
                data=demandas.exportar_original(tipo,codigo)
                name=re.sub(r'[^\w.-]+','_',codigo)+'.geojson'
                archive.writestr(name,json.dumps(data,ensure_ascii=False,allow_nan=False))
            else:
                checksum=None
                if source=="storage":
                    relative,_,file=_storage_identity(ident)
                elif source=="saidas":
                    row,ref=_output(ident,user);relative=row['arquivo'];file=storage.resolver(relative);checksum=ref.get('sha256')
                else: raise ValueError("Repositório desconhecido")
                name=PurePosixPath(relative).name
                if name.lower().endswith('.shp'):
                    parent=PurePosixPath(relative).parent
                    listed=storage._listar(str(parent))
                    entries=[item for item in listed if not item['pasta'] and PurePosixPath(item['nome']).stem.casefold()==PurePosixPath(name).stem.casefold() and PurePosixPath(item['nome']).suffix.lower() in SIDECARS]
                    if not {'.shp','.shx','.dbf'}.issubset({PurePosixPath(item['nome']).suffix.lower() for item in entries}):
                        raise ValueError("Shapefile incompleto: faltam SHP, SHX ou DBF")
                    for item in entries:
                        component=f"{parent}/{item['nome']}"
                        resolved=storage.resolver(component)
                        if isinstance(resolved,Path) and not resolved.resolve().is_relative_to(storage.diretorio_storage().resolve()): raise ValueError("Componente fora do Storage")
                        digest=_copy_zip(archive,resolved,component,item['nome'])
                        if component==relative and checksum and digest!=checksum: raise ValueError("Hash do arquivo diverge do catálogo")
                else:
                    digest=_copy_zip(archive,file,relative,name)
                    if checksum and digest!=checksum: raise ValueError("Hash do arquivo diverge do catálogo")
        return target,Path(name).stem+'.zip',temporary
    except BaseException:
        temporary.cleanup();raise
