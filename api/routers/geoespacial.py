"""Rotas HTTP — Módulo Geoespacial."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.repositories.geoespacial_repository import geoespacial_repository
from api.schemas.geoespacial import (
    AtributoFase3InputSchema,
    AtributoFase3Schema,
    CamadaInputSchema,
    CamadaSchema,
    CriterioFase2InputSchema,
    CriterioFase2Schema,
    FluxoSchema,
    FonteInputSchema,
    FonteSchema,
    FuncaoSchema,
    PacoteFase1Schema,
    PacoteFase2Schema,
    ProcessamentoResultSchema,
    ProcessamentoSchema,
    RodadaFase3Schema,
)
from api.services.geoespacial_service import geoespacial_service

router = APIRouter(prefix="/geoespacial", tags=["geoespacial"])


# ==================== CAMADAS ====================

@router.get("/camadas", response_model=list[CamadaSchema])
async def listar_camadas() -> list[CamadaSchema]:
    """Lista todas as camadas disponíveis no sistema."""
    camadas = await geoespacial_repository.listar_camadas()
    return [CamadaSchema(**c) for c in camadas]


@router.post("/camadas", response_model=CamadaSchema)
async def criar_camada(camada: CamadaInputSchema) -> CamadaSchema:
    """Cria uma nova camada no sistema."""
    camada_dict = camada.model_dump()
    nova_camada = await geoespacial_repository.criar_camada(camada_dict)
    return CamadaSchema(**nova_camada)


@router.get("/camadas/{camada_id}", response_model=CamadaSchema)
async def obter_camada(camada_id: str) -> CamadaSchema:
    """Obtém uma camada específica por ID."""
    camada = await geoespacial_repository.obter_camada(camada_id)
    if not camada:
        raise HTTPException(status_code=404, detail="Camada não encontrada")
    return CamadaSchema(**camada)


@router.delete("/camadas/{camada_id}")
async def deletar_camada(camada_id: str) -> dict[str, str]:
    """Deleta uma camada do sistema."""
    deletado = await geoespacial_repository.deletar_camada(camada_id)
    if not deletado:
        raise HTTPException(status_code=404, detail="Camada não encontrada")
    return {"message": "Camada deletada com sucesso"}


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

@router.post("/operacoes/carregar-camada")
async def carregar_camada(
    tipo_entrada: str,
    caminho_arquivo: str,
    crs_origem: str | None = None,
    filtro_espacial: str | None = None,
    filtro_atributivo: str | None = None,
) -> dict:
    """Carrega camada vetorial."""
    resultado = await geoespacial_service.carregar_camada(
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
    resultado = await geoespacial_service.normalizar_raster(
        raster_id, metodo_normalizacao, valor_minimo, valor_maximo
    )
    return resultado


@router.post("/operacoes/combinar-rasters")
async def combinar_rasters(
    raster_ids: list[str],
    pesos: list[float] | None = None,
    operador: str = "media_ponderada",
) -> dict:
    """Combina rasters."""
    resultado = await geoespacial_service.combinar_rasters(raster_ids, pesos, operador)
    return resultado


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
    resultado = await geoespacial_service.converter_para_raster(
        camada_id, resolucao_raster, crs_destino, metodo_rasterizacao, atributo_rasterizacao, valor_preenchimento
    )
    return resultado


@router.post("/operacoes/calcular-distancia")
async def calcular_distancia(
    camada_id: str,
    resolucao_distancia: float = 10.0,
    distancia_maxima: float | None = None,
    unidade_distancia: str = "metros",
) -> dict:
    """Calcula distância."""
    resultado = await geoespacial_service.calcular_distancia(
        camada_id, resolucao_distancia, distancia_maxima, unidade_distancia
    )
    return resultado


@router.post("/operacoes/calcular-densidade")
async def calcular_densidade(
    camada_id: str,
    tipo_kernel: str = "gaussiano",
    largura_kernel: float = 1.0,
    resolucao_kernel: float = 10.0,
    normalizar_resultado: bool = True,
) -> dict:
    """Calcula densidade."""
    resultado = await geoespacial_service.calcular_densidade(
        camada_id, tipo_kernel, largura_kernel, resolucao_kernel, normalizar_resultado
    )
    return resultado


@router.post("/operacoes/interpolar-valores")
async def interpolar_valores(
    camada_id: str,
    metodo_interpolacao: str = "idw",
    resolucao_interpolacao: float = 10.0,
    potencia_interpolacao: float = 2.0,
    raio_busca: float | None = None,
) -> dict:
    """Interpola valores."""
    resultado = await geoespacial_service.interpolar_valores(
        camada_id, metodo_interpolacao, resolucao_interpolacao, potencia_interpolacao, raio_busca
    )
    return resultado


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
    funcoes = await geoespacial_repository.listar_funcoes()
    return [FuncaoSchema(**f) for f in funcoes]


@router.get("/fluxos", response_model=list[FluxoSchema])
async def listar_fluxos() -> list[FluxoSchema]:
    """Lista todos os fluxos disponíveis."""
    fluxos = await geoespacial_repository.listar_fluxos()
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
