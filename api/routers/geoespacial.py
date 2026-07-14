"""Rotas HTTP — Módulo Geoespacial."""
from __future__ import annotations

from pathlib import Path
from hashlib import sha256

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from api.path_policy import project_path
from api.repositories import camada_geoespacial_repository
from api.repositories.geoespacial_repository import geoespacial_repository
from api.schemas.geoespacial import (
    AtributoFase3InputSchema,
    AtributoFase3Schema,
    CamadaInputSchema,
    CamadaSchema,
    HomologarCamadaSchema,
    CriterioFase2InputSchema,
    CriterioFase2Schema,
    FluxoSchema,
    FonteInputSchema,
    FonteSchema,
    FuncaoSchema,
    PacoteFase1Schema,
    PacoteFase2Schema,
    ProdutoGeradorInputSchema,
    ProdutoGeradorSchema,
    FluxoProdutoInputSchema,
    FluxoProdutoSchema,
    ProcessamentoResultSchema,
    ProcessamentoSchema,
    RodadaFase3Schema,
)
from api.services.geoespacial_service import geoespacial_service
from api.services.geoprocessamento_engine import CATALOG, OPERATION_ENDPOINTS, geoprocessamento_engine
from api.services.geoprocessamento_jobs import geoprocessamento_jobs

router = APIRouter(prefix="/geoespacial", tags=["geoespacial"])


@router.get("/algoritmos")
async def listar_algoritmos() -> list[dict]:
    return [
        {
            "id": key,
            "nome": value,
            "endpoint": f"/api/geoespacial/operacoes/{OPERATION_ENDPOINTS[key]}",
        }
        for key, value in CATALOG.items()
    ]


@router.post("/algoritmos/{algoritmo_id}/executar")
async def executar_algoritmo(algoritmo_id: str, parametros: dict) -> dict:
    try:
        resultado = await geoprocessamento_engine.execute(algoritmo_id.upper(), parametros)
        nome_saida = parametros.get("saida")
        if nome_saida:
            if resultado.get("camada_id"):
                exportado = await geoespacial_service.salvar_camada(
                    resultado["camada_id"],
                    parametros.get("destino") or "data/geoespacial",
                    Path(nome_saida).name,
                    parametros.get("crs", "auto"),
                    parametros.get("formato", "auto"),
                )
            elif resultado.get("raster_id"):
                exportado = await geoespacial_service.salvar_camada(
                    resultado["raster_id"],
                    parametros.get("destino") or "data/geoespacial",
                    Path(nome_saida).name,
                    parametros.get("crs", "auto"),
                    parametros.get("formato", "auto"),
                )
            else:
                exportado = None
            resultado["saida"] = exportado
        return resultado
    except (ValueError, KeyError, TypeError, RuntimeError, NotImplementedError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/operacoes-jobs/{algoritmo_id}", status_code=status.HTTP_202_ACCEPTED)
async def iniciar_operacao_com_progresso(algoritmo_id: str, parametros: dict) -> dict:
    """Inicia operação e retorna seu contador real de microtarefas."""
    try:
        return geoprocessamento_jobs.create(algoritmo_id, parametros)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/operacoes-jobs/status/{job_id}")
async def consultar_progresso_operacao(job_id: str) -> dict:
    job = geoprocessamento_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Execução não encontrada")
    return job


@router.post("/operacoes/salvar-camada")
async def salvar_camada(parametros: dict) -> dict:
    """Salva uma camada usando somente entrada, destino e saída."""
    try:
        return await geoespacial_service.salvar_camada(
            parametros["entrada"], parametros["destino"], parametros["saida"],
            parametros.get("crs", "auto"), parametros.get("formato", "auto"),
        )
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/funcoes")
async def salvar_funcao(funcao: dict) -> dict:
    funcao_id = funcao.get("id") or f"funcao_{len(geoprocessamento_engine.functions)+1}"
    funcao["id"] = funcao_id
    geoprocessamento_engine.functions[funcao_id] = funcao
    geoprocessamento_engine.save_definitions()
    return funcao


@router.put("/funcoes/{funcao_id}")
async def editar_funcao(funcao_id: str, funcao: dict) -> dict:
    funcao["id"] = funcao_id
    geoprocessamento_engine.functions[funcao_id] = funcao
    geoprocessamento_engine.save_definitions()
    return funcao


@router.get("/funcoes/{funcao_id}")
async def obter_funcao(funcao_id: str) -> dict:
    funcao = geoprocessamento_engine.functions.get(funcao_id)
    if not funcao:
        raise HTTPException(status_code=404, detail="Função não encontrada")
    return funcao


@router.delete("/funcoes/{funcao_id}")
async def excluir_funcao(funcao_id: str) -> dict:
    if not geoprocessamento_engine.functions.pop(funcao_id, None):
        raise HTTPException(status_code=404, detail="Função não encontrada")
    geoprocessamento_engine.save_definitions()
    return {"message": "Função excluída"}


@router.post("/funcoes/{funcao_id}/validar")
async def validar_funcao(funcao_id: str) -> dict:
    funcao = geoprocessamento_engine.functions.get(funcao_id)
    if not funcao:
        raise HTTPException(status_code=404, detail="Função não encontrada")
    erros = geoprocessamento_engine.validate_steps(funcao.get("passos", []))
    return {"valido": not erros, "erros": erros}


@router.post("/funcoes/{funcao_id}/executar")
async def executar_funcao(funcao_id: str, entradas: dict) -> dict:
    funcao = geoprocessamento_engine.functions.get(funcao_id)
    if not funcao: raise HTTPException(status_code=404, detail="Função não encontrada")
    try:
        return await geoprocessamento_engine.run_steps(funcao.get("passos", []), entradas)
    except (ValueError, KeyError, TypeError, RuntimeError, NotImplementedError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/fluxos")
async def salvar_fluxo(fluxo: dict) -> dict:
    fluxo_id = fluxo.get("id") or f"fluxo_{len(geoprocessamento_engine.flows)+1}"
    fluxo["id"] = fluxo_id
    geoprocessamento_engine.flows[fluxo_id] = fluxo
    geoprocessamento_engine.save_definitions()
    return fluxo


@router.put("/fluxos/{fluxo_id}")
async def editar_fluxo(fluxo_id: str, fluxo: dict) -> dict:
    fluxo["id"] = fluxo_id
    geoprocessamento_engine.flows[fluxo_id] = fluxo
    geoprocessamento_engine.save_definitions()
    return fluxo


@router.get("/fluxos/{fluxo_id}")
async def obter_fluxo(fluxo_id: str) -> dict:
    fluxo = geoprocessamento_engine.flows.get(fluxo_id)
    if not fluxo:
        raise HTTPException(status_code=404, detail="Fluxo não encontrado")
    return fluxo


@router.delete("/fluxos/{fluxo_id}")
async def excluir_fluxo(fluxo_id: str) -> dict:
    if not geoprocessamento_engine.flows.pop(fluxo_id, None):
        raise HTTPException(status_code=404, detail="Fluxo não encontrado")
    geoprocessamento_engine.save_definitions()
    return {"message": "Fluxo excluído"}


@router.post("/fluxos/{fluxo_id}/validar")
async def validar_fluxo(fluxo_id: str) -> dict:
    fluxo = geoprocessamento_engine.flows.get(fluxo_id)
    if not fluxo:
        raise HTTPException(status_code=404, detail="Fluxo não encontrado")
    erros: list[str] = []
    for indice, item in enumerate(fluxo.get("itens", []), 1):
        if item.get("funcao_id") and item["funcao_id"] not in geoprocessamento_engine.functions:
            erros.append(f"Item {indice}: função {item['funcao_id']} não encontrada")
        elif item.get("algoritmo_id") not in CATALOG and not item.get("funcao_id"):
            erros.append(f"Item {indice}: algoritmo inválido")
    return {"valido": not erros, "erros": erros}


@router.post("/fluxos/{fluxo_id}/executar")
async def executar_fluxo(fluxo_id: str, entradas: dict) -> dict:
    fluxo = geoprocessamento_engine.flows.get(fluxo_id)
    if not fluxo: raise HTTPException(status_code=404, detail="Fluxo não encontrado")
    context=dict(entradas); results=[]
    try:
        for item in fluxo.get("itens", []):
            parametros = {
                chave: context.get(valor[1:]) if isinstance(valor, str) and valor.startswith("$") else valor
                for chave, valor in item.get("parametros", {}).items()
            }
            contexto_item = {**context, **parametros}
            if item.get("funcao_id"):
                fn=geoprocessamento_engine.functions.get(item["funcao_id"])
                if not fn: raise ValueError(f"Função {item['funcao_id']} não encontrada")
                result=await geoprocessamento_engine.run_steps(fn.get("passos",[]),contexto_item)
            else:
                result=await geoprocessamento_engine.run_steps([item],contexto_item)
            results.append(result); context.update(result.get("contexto",{}))
    except (ValueError, KeyError, TypeError, RuntimeError, NotImplementedError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"status":"concluido","resultados":results,"contexto":context}


# ==================== CAMADAS ====================

@router.get("/camadas", response_model=list[CamadaSchema])
async def listar_camadas() -> list[CamadaSchema]:
    """Lista todas as camadas disponíveis no sistema."""
    camadas = await geoespacial_service.listar_recursos()
    return [CamadaSchema(**c) for c in camadas]


@router.post("/camadas", response_model=CamadaSchema)
async def criar_camada(camada: CamadaInputSchema) -> CamadaSchema:
    """Importa uma camada de arquivo externo ou WFS."""
    origem = camada.url_origem or camada.caminho_arquivo
    if not origem:
        raise HTTPException(status_code=422, detail="Informe caminho_arquivo ou url_origem")
    try:
        resultado = await geoespacial_service.importar_camada(
            "WFS" if camada.url_origem else "local", origem, camada.crs
        )
        recurso = await geoespacial_service.obter_recurso(resultado["camada_id"])
        if recurso is None:
            raise RuntimeError("Camada carregada não foi encontrada no catálogo")
        return CamadaSchema(**recurso)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/camadas/{camada_id}", response_model=CamadaSchema)
async def obter_camada(camada_id: str) -> CamadaSchema:
    """Obtém uma camada específica por ID."""
    camada = await geoespacial_service.obter_recurso(camada_id)
    if not camada:
        raise HTTPException(status_code=404, detail="Camada não encontrada")
    return CamadaSchema(**camada)


@router.delete("/camadas/{camada_id}")
async def deletar_camada(camada_id: str) -> dict[str, str]:
    """Deleta uma camada do sistema."""
    try:
        deletado = await geoespacial_service.excluir_recurso(camada_id)
    except Exception as exc:
        raise HTTPException(
            status_code=409, detail="Camadas homologadas não podem ser excluídas"
        ) from exc
    if not deletado:
        raise HTTPException(status_code=404, detail="Camada não encontrada")
    return {"message": "Camada deletada com sucesso"}


@router.post("/camadas/importar")
@router.post("/camadas/upload", deprecated=True, include_in_schema=False)
async def importar_arquivo_camada(arquivo: UploadFile = File(...)) -> dict:
    """Importa um arquivo geoespacial externo para o banco."""
    nome = Path(arquivo.filename or "camada").name
    conteudo = await arquivo.read()
    hash_arquivo = sha256(conteudo).hexdigest()
    existente = camada_geoespacial_repository.obter_importada_por_hash(hash_arquivo)
    if existente:
        id_key = "raster_id" if existente["tipo"] == "raster" else "camada_id"
        return {
            id_key: existente["recurso_sessao_id"],
            "nome": existente["nome"],
            "tipo": existente["tipo"],
            "crs": existente.get("crs"),
            "reutilizada": True,
        }
    pasta = project_path("data/geoespacial/uploads")
    pasta.mkdir(parents=True, exist_ok=True)
    caminho = pasta / nome
    caminho.write_bytes(conteudo)
    caminho_relativo = f"data/geoespacial/uploads/{nome}"
    try:
        if caminho.suffix.lower() in {".tif", ".tiff"}:
            return await geoespacial_service.importar_raster(caminho_relativo, hash_arquivo)
        return await geoespacial_service.importar_camada(
            "local", caminho_relativo, hash_arquivo=hash_arquivo
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/camadas/importar-job", status_code=status.HTTP_202_ACCEPTED)
async def iniciar_importacao_com_logs(arquivo: UploadFile = File(...)) -> dict:
    """Recebe o upload e inicia importação auditável em nanotarefas."""
    conteudo = await arquivo.read()
    return geoprocessamento_jobs.create_import(arquivo.filename or "camada", conteudo)


@router.get("/camadas-diretorio")
async def listar_diretorio_camadas() -> dict[str, list[dict]]:
    """Diretório interno para carregar camadas já importadas/processadas."""
    return camada_geoespacial_repository.listar_diretorio()


@router.post("/camadas/{camada_id}/carregar")
async def carregar_camada_do_sistema(camada_id: str) -> dict:
    """Carrega uma camada existente do banco para a bancada/cache."""
    try:
        return await geoespacial_service.carregar_recurso(camada_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/camadas/{camada_id}/carregar-job", status_code=status.HTTP_202_ACCEPTED)
async def iniciar_carregamento_com_logs(camada_id: str) -> dict:
    """Carrega uma camada por job e registra cada nanotarefa concluída."""
    return geoprocessamento_jobs.create_load(camada_id)


@router.post("/camadas/{camada_id}/homologar", status_code=201)
async def homologar_camada(camada_id: str, body: HomologarCamadaSchema) -> dict:
    """Publica uma camada na biblioteca imutável."""
    if body.modulo_consumidor not in {"fase1", "fase2", "ambos"}:
        raise HTTPException(status_code=422, detail="Módulo consumidor inválido")
    try:
        return camada_geoespacial_repository.homologar(
            camada_id,
            modulo_consumidor=body.modulo_consumidor,
            nome_publicacao=body.nome_publicacao,
            versao=body.versao,
            finalidade=body.finalidade,
            homologado_por=body.homologado_por,
            produto_id=str(body.produto_id) if body.produto_id else None,
            metadados=body.metadados,
        )
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/camadas/{camada_id}/homologar-job", status_code=status.HTTP_202_ACCEPTED)
async def iniciar_homologacao_com_logs(camada_id: str, body: HomologarCamadaSchema) -> dict:
    """Homologa por job com log granular de persistência e verificação."""
    return geoprocessamento_jobs.create_homologation(
        camada_id, body.model_dump(mode="json")
    )


@router.get("/biblioteca-camadas")
async def listar_biblioteca_camadas(modulo: str | None = None) -> list[dict]:
    """Biblioteca somente leitura de insumos homologados."""
    if modulo and modulo not in {"fase1", "fase2"}:
        raise HTTPException(status_code=422, detail="Módulo consumidor inválido")
    return camada_geoespacial_repository.listar_biblioteca(modulo)


@router.get("/camadas/{camada_id}/geojson")
async def obter_camada_geojson(camada_id: str) -> dict:
    try:
        return await geoespacial_service.camada_geojson(camada_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/camadas/{camada_id}/atributos")
async def obter_atributos_camada(
    camada_id: str,
    limite: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> dict:
    try:
        return await geoespacial_service.atributos_camada(camada_id, limite, offset)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/camadas/{raster_id}/preview")
async def obter_preview_raster(raster_id: str) -> dict:
    try:
        return await geoespacial_service.preview_raster(raster_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/camadas/{camada_id}/calcular-campo")
async def calcular_campo(camada_id: str, campo: str, expressao: str) -> dict:
    """Cria ou atualiza um campo por expressão."""
    try:
        return await geoespacial_service.calcular_campo(camada_id, campo, expressao)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/camadas/{camada_id}/consultar-atributos")
async def consultar_atributos(camada_id: str, expressao: str) -> dict:
    """Seleciona ou filtra feições por expressão atributiva."""
    try:
        return await geoespacial_service.consultar_por_atributo(camada_id, expressao)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/camadas/{camada_id}/atualizar-fonte")
async def atualizar_fonte(camada_id: str) -> dict:
    """Relê a fonte externa da camada."""
    try:
        return await geoespacial_service.atualizar_fonte(camada_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ==================== PRODUTOS DOS MÓDULOS GERADORES ====================

@router.get("/produtos-geradores", response_model=list[ProdutoGeradorSchema])
async def listar_produtos_geradores(modulo: str | None = None) -> list[ProdutoGeradorSchema]:
    produtos = await geoespacial_repository.listar_produtos_geradores(modulo)
    return [ProdutoGeradorSchema(**produto) for produto in produtos]


@router.post("/produtos-geradores", response_model=ProdutoGeradorSchema, status_code=201)
async def criar_produto_gerador(body: ProdutoGeradorInputSchema) -> ProdutoGeradorSchema:
    try:
        produto = await geoespacial_repository.criar_produto_gerador(body.model_dump())
        return ProdutoGeradorSchema(**produto)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/produtos-geradores/{produto_id}", response_model=ProdutoGeradorSchema)
async def obter_produto_gerador(produto_id: str) -> ProdutoGeradorSchema:
    produto = await geoespacial_repository.obter_produto_gerador(produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto gerador não encontrado")
    return ProdutoGeradorSchema(**produto)


@router.get("/produtos-geradores/{produto_id}/fluxos", response_model=list[FluxoProdutoSchema])
async def listar_fluxos_produto(produto_id: str) -> list[FluxoProdutoSchema]:
    fluxos = await geoespacial_repository.listar_fluxos_produto(produto_id)
    return [FluxoProdutoSchema(**fluxo) for fluxo in fluxos]


@router.post("/produtos-geradores/{produto_id}/fluxos", response_model=FluxoProdutoSchema, status_code=201)
async def criar_fluxo_produto(produto_id: str, body: FluxoProdutoInputSchema) -> FluxoProdutoSchema:
    if not await geoespacial_repository.obter_produto_gerador(produto_id):
        raise HTTPException(status_code=404, detail="Produto gerador não encontrado")
    fluxo = await geoespacial_repository.criar_fluxo_produto(produto_id, body.model_dump())
    return FluxoProdutoSchema(**fluxo)


# ==================== FONTES (FASE 1) ====================

@router.get("/fontes", response_model=list[FonteSchema])
async def listar_fontes() -> list[FonteSchema]:
    """Lista todas as fontes."""
    fontes = await geoespacial_repository.listar_fontes()
    return [FonteSchema(**f) for f in fontes]


@router.post("/fontes", response_model=FonteSchema)
async def criar_fonte(fonte: FonteInputSchema) -> FonteSchema:
    """Cria uma nova fonte."""
    fonte_dict = fonte.model_dump()
    nova_fonte = await geoespacial_repository.criar_fonte(fonte_dict)
    return FonteSchema(**nova_fonte)


@router.get("/fontes/{fonte_id}", response_model=FonteSchema)
async def obter_fonte(fonte_id: str) -> FonteSchema:
    """Obtém uma fonte por ID."""
    fonte = await geoespacial_repository.obter_fonte(fonte_id)
    if not fonte:
        raise HTTPException(status_code=404, detail="Fonte não encontrada")
    return FonteSchema(**fonte)


# ==================== CRITÉRIOS (FASE 2) ====================

@router.get("/criterios-fase2", response_model=list[CriterioFase2Schema])
async def listar_criterios_fase2() -> list[CriterioFase2Schema]:
    """Lista todos os critérios da Fase 2."""
    criterios = await geoespacial_repository.listar_criterios_fase2()
    return [CriterioFase2Schema(**c) for c in criterios]


@router.post("/criterios-fase2", response_model=CriterioFase2Schema)
async def criar_criterio_fase2(criterio: CriterioFase2InputSchema) -> CriterioFase2Schema:
    """Cria um novo critério da Fase 2."""
    criterio_dict = criterio.model_dump()
    novo_criterio = await geoespacial_repository.criar_criterio_fase2(criterio_dict)
    return CriterioFase2Schema(**novo_criterio)


@router.get("/criterios-fase2/{criterio_id}", response_model=CriterioFase2Schema)
async def obter_criterio_fase2(criterio_id: str) -> CriterioFase2Schema:
    """Obtém um critério por ID."""
    criterio = await geoespacial_repository.obter_criterio_fase2(criterio_id)
    if not criterio:
        raise HTTPException(status_code=404, detail="Critério não encontrado")
    return CriterioFase2Schema(**criterio)


# ==================== ATRIBUTOS (FASE 3) ====================

@router.get("/atributos-fase3", response_model=list[AtributoFase3Schema])
async def listar_atributos_fase3() -> list[AtributoFase3Schema]:
    """Lista todos os atributos da Fase 3."""
    atributos = await geoespacial_repository.listar_atributos_fase3()
    return [AtributoFase3Schema(**a) for a in atributos]


@router.post("/atributos-fase3", response_model=AtributoFase3Schema)
async def criar_atributo_fase3(atributo: AtributoFase3InputSchema) -> AtributoFase3Schema:
    """Cria um novo atributo da Fase 3."""
    atributo_dict = atributo.model_dump()
    novo_atributo = await geoespacial_repository.criar_atributo_fase3(atributo_dict)
    return AtributoFase3Schema(**novo_atributo)


@router.get("/atributos-fase3/{atributo_id}", response_model=AtributoFase3Schema)
async def obter_atributo_fase3(atributo_id: str) -> AtributoFase3Schema:
    """Obtém um atributo por ID."""
    atributo = await geoespacial_repository.obter_atributo_fase3(atributo_id)
    if not atributo:
        raise HTTPException(status_code=404, detail="Atributo não encontrado")
    return AtributoFase3Schema(**atributo)


# ==================== PACOTES (FASE 1) ====================

@router.get("/pacotes-fase1", response_model=list[PacoteFase1Schema])
async def listar_pacotes_fase1() -> list[PacoteFase1Schema]:
    """Lista todos os pacotes da Fase 1."""
    pacotes = await geoespacial_repository.listar_pacotes_fase1()
    return [PacoteFase1Schema(**p) for p in pacotes]


@router.post("/pacotes-fase1", response_model=PacoteFase1Schema)
async def criar_pacote_fase1(pacote: dict) -> PacoteFase1Schema:
    """Cria um novo pacote da Fase 1."""
    novo_pacote = await geoespacial_repository.criar_pacote_fase1(pacote)
    return PacoteFase1Schema(**novo_pacote)


@router.get("/pacotes-fase1/{pacote_id}", response_model=PacoteFase1Schema)
async def obter_pacote_fase1(pacote_id: str) -> PacoteFase1Schema:
    """Obtém um pacote por ID."""
    pacote = await geoespacial_repository.obter_pacote_fase1(pacote_id)
    if not pacote:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    return PacoteFase1Schema(**pacote)


@router.post("/pacotes-fase1/{pacote_id}/homologar", response_model=PacoteFase1Schema)
async def homologar_pacote_fase1(pacote_id: str, responsavel: str) -> PacoteFase1Schema:
    """Homologa um pacote da Fase 1."""
    pacote = await geoespacial_repository.homologar_pacote_fase1(pacote_id, responsavel)
    if not pacote:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    return PacoteFase1Schema(**pacote)


# ==================== PACOTES (FASE 2) ====================

@router.get("/pacotes-fase2", response_model=list[PacoteFase2Schema])
async def listar_pacotes_fase2() -> list[PacoteFase2Schema]:
    """Lista todos os pacotes da Fase 2."""
    pacotes = await geoespacial_repository.listar_pacotes_fase2()
    return [PacoteFase2Schema(**p) for p in pacotes]


@router.post("/pacotes-fase2", response_model=PacoteFase2Schema)
async def criar_pacote_fase2(pacote: dict) -> PacoteFase2Schema:
    """Cria um novo pacote da Fase 2."""
    novo_pacote = await geoespacial_repository.criar_pacote_fase2(pacote)
    return PacoteFase2Schema(**novo_pacote)


@router.get("/pacotes-fase2/{pacote_id}", response_model=PacoteFase2Schema)
async def obter_pacote_fase2(pacote_id: str) -> PacoteFase2Schema:
    """Obtém um pacote por ID."""
    pacote = await geoespacial_repository.obter_pacote_fase2(pacote_id)
    if not pacote:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    return PacoteFase2Schema(**pacote)


@router.post("/pacotes-fase2/{pacote_id}/homologar", response_model=PacoteFase2Schema)
async def homologar_pacote_fase2(pacote_id: str, responsavel: str) -> PacoteFase2Schema:
    """Homologa um pacote da Fase 2."""
    pacote = await geoespacial_repository.homologar_pacote_fase2(pacote_id, responsavel)
    if not pacote:
        raise HTTPException(status_code=404, detail="Pacote não encontrado")
    return PacoteFase2Schema(**pacote)


# ==================== RODADAS (FASE 3) ====================

@router.get("/rodadas-fase3", response_model=list[RodadaFase3Schema])
async def listar_rodadas_fase3() -> list[RodadaFase3Schema]:
    """Lista todas as rodadas da Fase 3."""
    rodadas = await geoespacial_repository.listar_rodadas_fase3()
    return [RodadaFase3Schema(**r) for r in rodadas]


@router.post("/rodadas-fase3", response_model=RodadaFase3Schema)
async def criar_rodada_fase3(rodada: dict) -> RodadaFase3Schema:
    """Cria uma nova rodada da Fase 3."""
    nova_rodada = await geoespacial_repository.criar_rodada_fase3(rodada)
    return RodadaFase3Schema(**nova_rodada)


@router.get("/rodadas-fase3/{rodada_id}", response_model=RodadaFase3Schema)
async def obter_rodada_fase3(rodada_id: str) -> RodadaFase3Schema:
    """Obtém uma rodada por ID."""
    rodada = await geoespacial_repository.obter_rodada_fase3(rodada_id)
    if not rodada:
        raise HTTPException(status_code=404, detail="Rodada não encontrada")
    return RodadaFase3Schema(**rodada)


@router.post("/rodadas-fase3/{rodada_id}/homologar", response_model=RodadaFase3Schema)
async def homologar_rodada_fase3(rodada_id: str, responsavel: str) -> RodadaFase3Schema:
    """Homologa uma rodada da Fase 3."""
    rodada = await geoespacial_repository.homologar_rodada_fase3(rodada_id, responsavel)
    if not rodada:
        raise HTTPException(status_code=404, detail="Rodada não encontrada")
    return RodadaFase3Schema(**rodada)


# ==================== OPERAÇÕES GEOSPACIAIS ====================

@router.post("/operacoes/importar-camada")
@router.post("/operacoes/carregar-camada", deprecated=True, include_in_schema=False)
async def importar_camada(
    tipo_entrada: str,
    caminho_arquivo: str,
    crs_origem: str | None = None,
    filtro_espacial: str | None = None,
    filtro_atributivo: str | None = None,
) -> dict:
    """Importa camada vetorial de uma origem externa."""
    resultado = await geoespacial_service.importar_camada(
        tipo_entrada, caminho_arquivo, crs_origem, filtro_espacial, filtro_atributivo
    )
    return resultado


@router.post("/operacoes/validar-camada")
async def validar_camada(
    camada_id: str,
    validar_sobreposicoes: bool = False,
    validar_lacunas: bool = False,
    validar_intersecoes_invalidas: bool = True,
    validar_gaps: bool = False,
    validar_dangles: bool = False,
    validar_crs: bool = True,
    validar_tipo_geometrico: bool = True,
    validar_campos_obrigatorios: bool = False,
    tolerancia_topologica: float = 0.001,
    percentual_critico_erros: float = 10.0,
) -> dict:
    """Valida camada."""
    resultado = await geoespacial_service.validar_camada(
        camada_id,
        validar_sobreposicoes,
        validar_lacunas,
        validar_intersecoes_invalidas,
        validar_gaps,
        validar_dangles,
        validar_crs,
        validar_tipo_geometrico,
        validar_campos_obrigatorios,
        tolerancia_topologica,
        percentual_critico_erros,
    )
    return resultado


@router.post("/operacoes/reparar-geometrias")
async def reparar_geometrias(
    camada_id: str,
    corrigir_geometrias_invalidas: bool = True,
    corrigir_orientacao_aneis: bool = False,
    corrigir_fechamento_aneis: bool = False,
    corrigir_repeticao_pontos: bool = False,
    corrigir_auto_intersecoes: bool = True,
    corrigir_geometrias_degeneradas: bool = False,
    corrigir_vertices_colineares: bool = False,
    tolerancia_correcao: float = 0.001,
    manter_geometria_original_falha: bool = True,
) -> dict:
    """Repara geometrias."""
    resultado = await geoespacial_service.reparar_geometrias(
        camada_id,
        corrigir_geometrias_invalidas,
        corrigir_orientacao_aneis,
        corrigir_fechamento_aneis,
        corrigir_repeticao_pontos,
        corrigir_auto_intersecoes,
        corrigir_geometrias_degeneradas,
        corrigir_vertices_colineares,
        tolerancia_correcao,
        manter_geometria_original_falha,
    )
    return resultado


@router.post("/operacoes/normalizar-camada")
async def normalizar_camada(
    camada_id: str,
    crs_destino: str = "EPSG:4674",
    recortar_area_estudo: bool = False,
    area_estudo: str | None = None,
    corrigir_geometrias_invalidas: bool = True,
    remover_geometrias_vazias: bool = True,
    explodir_multipartes: bool = False,
    padronizar_nomes_campos: bool = False,
    regra_nomenclatura: str = "<fonte_id>__<nome_campo>",
) -> dict:
    """Normaliza camada."""
    resultado = await geoespacial_service.normalizar_camada(
        camada_id,
        crs_destino,
        recortar_area_estudo,
        area_estudo,
        corrigir_geometrias_invalidas,
        remover_geometrias_vazias,
        explodir_multipartes,
        padronizar_nomes_campos,
        regra_nomenclatura,
    )
    return resultado


@router.post("/operacoes/criar-buffer")
async def criar_buffer(
    camada_id: str,
    distancia_buffer: float,
    unidade_buffer: str = "metros",
    tipo_buffer: str = "cheio",
    dissolver_geometrias: bool = False,
    recortar_area_estudo: bool = False,
) -> dict:
    """Cria buffer."""
    resultado = await geoespacial_service.criar_buffer(
        camada_id, distancia_buffer, unidade_buffer, tipo_buffer, dissolver_geometrias, recortar_area_estudo
    )
    return resultado


@router.post("/operacoes/sobrepor-camadas")
async def sobrepor_camadas(
    camada_id_1: str,
    camada_id_2: str,
    tipo_overlay: str = "identity",
    resolver_conflitos_campos: bool = True,
    regra_nomenclatura: str = "<fonte_id>__<nome_campo>",
) -> dict:
    """Sobrepõe camadas."""
    resultado = await geoespacial_service.sobrepor_camadas(
        camada_id_1, camada_id_2, tipo_overlay, resolver_conflitos_campos, regra_nomenclatura
    )
    return resultado


@router.post("/operacoes/exportar-camada")
async def exportar_camada(
    camada_id: str,
    nome_arquivo: str,
    formato_saida: str = "GeoPackage",
    crs_saida: str | None = None,
    opcao_salvamento: str = "memoria",
) -> dict:
    """Exporta camada."""
    resultado = await geoespacial_service.exportar_camada(
        camada_id, nome_arquivo, formato_saida, crs_saida, opcao_salvamento
    )
    return resultado


@router.post("/operacoes/normalizar-raster")
async def normalizar_raster(
    raster_id: str,
    metodo_normalizacao: str = "linear",
    valor_minimo: float | None = None,
    valor_maximo: float | None = None,
) -> dict:
    """Normaliza raster."""
    return await geoprocessamento_engine.execute("OP-20", {
        "raster_id": raster_id, "metodo_normalizacao": metodo_normalizacao,
        "valor_minimo": valor_minimo, "valor_maximo": valor_maximo,
    })


@router.post("/operacoes/combinar-rasters")
async def combinar_rasters(
    raster_ids: list[str] = Query(...),
    pesos: list[float] | None = Query(None),
    operador: str = "media_ponderada",
) -> dict:
    """Combina rasters."""
    return await geoprocessamento_engine.execute("OP-17", {
        "raster_ids": raster_ids, "pesos": pesos, "operador": operador,
    })


@router.post("/operacoes/dissolver")
async def dissolver(
    camada_id: str,
    campo_agrupamento: str | None = None,
    funcao_agregacao: str = "soma",
    manter_geometria_multi: bool = False,
) -> dict:
    """Dissolve geometrias."""
    resultado = await geoespacial_service.dissolver(camada_id, campo_agrupamento, funcao_agregacao, manter_geometria_multi)
    return resultado


@router.post("/operacoes/selecionar-por-localizacao")
async def selecionar_por_localizacao(
    camada_id: str,
    camada_ref_id: str,
    tipo_selecao: str = "intersects",
    inverter_selecao: bool = False,
) -> dict:
    """Seleciona por localização."""
    resultado = await geoespacial_service.selecionar_por_localizacao(camada_id, camada_ref_id, tipo_selecao, inverter_selecao)
    return resultado


@router.post("/operacoes/converter-para-raster")
async def converter_para_raster(
    camada_id: str,
    resolucao_raster: float = 10.0,
    crs_destino: str | None = None,
    metodo_rasterizacao: str = "ponto_central",
    atributo_rasterizacao: str | None = None,
    valor_preenchimento: float = 0.0,
) -> dict:
    """Converte para raster."""
    return await geoprocessamento_engine.execute("OP-08", {
        "camada_id": camada_id, "resolucao_raster": resolucao_raster,
        "crs_destino": crs_destino, "metodo_rasterizacao": metodo_rasterizacao,
        "atributo_rasterizacao": atributo_rasterizacao,
        "valor_preenchimento": valor_preenchimento,
    })


@router.post("/operacoes/calcular-distancia")
async def calcular_distancia(
    camada_id: str,
    resolucao_distancia: float = 10.0,
    distancia_maxima: float | None = None,
    unidade_distancia: str = "metros",
) -> dict:
    """Calcula distância."""
    return await geoprocessamento_engine.execute("OP-10", {
        "camada_id": camada_id, "resolucao_distancia": resolucao_distancia,
        "distancia_maxima": distancia_maxima, "unidade_distancia": unidade_distancia,
    })


@router.post("/operacoes/calcular-distancia-ponderada")
async def calcular_distancia_ponderada(
    camada_id: str,
    atributo_peso: str,
    resolucao_distancia: float = 50.0,
    distancia_maxima: float | None = None,
) -> dict:
    """Calcula distância usando o atributo informado como ponderador."""
    return await geoprocessamento_engine.execute("OP-11", {
        "camada_id": camada_id, "atributo_peso": atributo_peso,
        "resolucao_distancia": resolucao_distancia, "distancia_maxima": distancia_maxima,
    })


@router.post("/operacoes/calcular-densidade")
async def calcular_densidade(
    camada_id: str,
    tipo_kernel: str = "gaussiano",
    largura_kernel: float = 1.0,
    resolucao_kernel: float = 10.0,
    normalizar_resultado: bool = True,
) -> dict:
    """Calcula densidade."""
    return await geoprocessamento_engine.execute("OP-12", {
        "camada_id": camada_id, "tipo_kernel": tipo_kernel,
        "largura_kernel": largura_kernel, "resolucao_kernel": resolucao_kernel,
        "normalizar_resultado": normalizar_resultado,
    })


@router.post("/operacoes/calcular-custo-acumulado")
async def calcular_custo_acumulado(
    raster_id: str,
    origem_linha: int = 0,
    origem_coluna: int = 0,
) -> dict:
    """Calcula custo acumulado sobre raster de fricção."""
    return await geoprocessamento_engine.execute("OP-13", {
        "raster_id": raster_id, "origem_linha": origem_linha,
        "origem_coluna": origem_coluna,
    })


@router.post("/operacoes/interpolar-valores")
async def interpolar_valores(
    camada_id: str,
    atributo_valor: str | None = None,
    metodo_interpolacao: str = "idw",
    resolucao_interpolacao: float = 10.0,
    potencia_interpolacao: float = 2.0,
    raio_busca: float | None = None,
) -> dict:
    """Interpola valores."""
    return await geoprocessamento_engine.execute("OP-14", {
        "camada_id": camada_id, "metodo_interpolacao": metodo_interpolacao,
        "atributo_valor": atributo_valor,
        "resolucao_interpolacao": resolucao_interpolacao,
        "potencia_interpolacao": potencia_interpolacao, "raio_busca": raio_busca,
    })


@router.post("/operacoes/criar-camada-booleana")
async def criar_camada_booleana(
    camada_id: str,
    resolucao_raster: float = 50.0,
    crs_destino: str | None = None,
) -> dict:
    """Rasteriza presença como 1 e ausência como 0."""
    return await geoprocessamento_engine.execute("OP-16", {
        "camada_id": camada_id, "resolucao_raster": resolucao_raster,
        "crs_destino": crs_destino,
    })


@router.post("/operacoes/recortar-raster")
async def recortar_raster(raster_id: str, camada_mascara_id: str) -> dict:
    """Recorta raster usando uma camada vetorial como máscara."""
    return await geoprocessamento_engine.execute("OP-21", {
        "raster_id": raster_id, "camada_mascara_id": camada_mascara_id,
    })


@router.post("/operacoes/estatisticas-por-zona")
async def estatisticas_por_zona(raster_id: str, camada_zona_id: str) -> dict:
    """Calcula estatísticas do raster por feição de uma camada zonal."""
    return await geoprocessamento_engine.execute("OP-22", {
        "raster_id": raster_id, "camada_zona_id": camada_zona_id,
    })


@router.post("/operacoes/amostrar-raster-pontos")
async def amostrar_raster_pontos(raster_id: str, camada_pontos_id: str) -> dict:
    """Amostra valores raster nas geometrias de uma camada."""
    return await geoprocessamento_engine.execute("OP-23", {
        "raster_id": raster_id, "camada_pontos_id": camada_pontos_id,
    })


@router.post("/operacoes/extrair-valores-poligono")
async def extrair_valores_poligono(
    raster_id: str,
    camada_poligono_id: str,
    estatistica: str = "media",
) -> dict:
    """Extrai estatística raster para cada polígono."""
    return await geoprocessamento_engine.execute("OP-24", {
        "raster_id": raster_id, "camada_poligono_id": camada_poligono_id,
        "estatistica": estatistica,
    })


@router.post("/operacoes/agregar-por-territorio")
async def agregar_por_territorio(
    camada_id: str,
    campo_unidade: str,
    funcao_agregacao: str = "soma",
    atributo_agregacao: str | None = None,
    resolucao_saida: float | None = None,
) -> dict:
    """Agrega por território."""
    resultado = await geoespacial_service.agregar_por_territorio(
        camada_id, campo_unidade, funcao_agregacao, atributo_agregacao, resolucao_saida
    )
    return resultado


@router.post("/operacoes/exportar-raster")
async def exportar_raster(
    raster_id: str,
    nome_arquivo: str,
    formato_saida: str = "GeoTIFF",
    comprimir_arquivo: bool = False,
    opcao_salvamento: str = "memoria",
) -> dict:
    """Exporta raster."""
    resultado = await geoespacial_service.exportar_raster(
        raster_id, nome_arquivo, formato_saida, comprimir_arquivo, opcao_salvamento
    )
    return resultado


# ==================== FUNÇÕES E FLUXOS ====================

@router.get("/funcoes", response_model=list[FuncaoSchema])
async def listar_funcoes() -> list[FuncaoSchema]:
    """Lista todas as funções disponíveis."""
    funcoes = list(geoprocessamento_engine.functions.values())
    return [FuncaoSchema(**f) for f in funcoes]


@router.get("/fluxos", response_model=list[FluxoSchema])
async def listar_fluxos() -> list[FluxoSchema]:
    """Lista todos os fluxos disponíveis."""
    fluxos = list(geoprocessamento_engine.flows.values())
    return [FluxoSchema(**f) for f in fluxos]


@router.post("/processar", response_model=ProcessamentoResultSchema)
async def processar_fluxo(processamento: ProcessamentoSchema) -> ProcessamentoResultSchema:
    """Inicia o processamento de um fluxo geoespacial."""
    # TODO: Implementar processamento assíncrono completo
    return ProcessamentoResultSchema(
        status="em_andamento",
        progresso=0.0,
        logs=["Processamento iniciado"],
        camadas_saida=[],
        erros=[],
    )


@router.get("/processamento/{processamento_id}", response_model=ProcessamentoResultSchema)
async def obter_status_processamento(processamento_id: str) -> ProcessamentoResultSchema:
    """Obtém o status de um processamento em andamento."""
    # TODO: Implementar tracking de processamento
    return ProcessamentoResultSchema(
        status="concluido",
        progresso=100.0,
        logs=["Processamento concluído"],
        camadas_saida=[],
        erros=[],
    )
