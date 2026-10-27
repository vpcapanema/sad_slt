"""Complementacao dinamica dos atributos requeridos pela matriz vigente."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
from math import isfinite
from typing import Any
from uuid import UUID
from api.repositories import solicitacao_complementacao_repository as solicitacoes
from api.services.solicitacao_complementacao_service import bloquear

from fastapi import APIRouter, Body, Depends, HTTPException, File, Form, UploadFile
from pydantic import ValidationError
from psycopg import sql

from api.db.connection import atomic_connection
from api.deps.auth import require_operator, require_analyst
from api.constants import STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO
from api.services.atributos_hierarquizacao import (
    atualizar_cadastrais, colunas_da_hierarquizacao, pendencias, vazio, VINCULOS_CADASTRAIS,
    remover_resultados_fase3, valor_dinamico,
)
from api.services.complementacao_atributos_service import solicitar_hierarquizacao
from api.matriz_colunas import extrair_colunas
from api.repositories import hierarquizacao_repository, sigma_usuario_repository, demanda_repository, plano_repository, programa_repository, dominio_repository
from api.services.session_service import SessionUser
from api.services import demanda_service, plano_service, programa_service
from api.services.campos_demanda import resolver_nomes_registros, mesclar_atributos_nativos
from api.schemas.demanda import DemandaUpdateSchema
from api.schemas.plano import PlanoUpdateSchema
from api.schemas.programa import ProgramaUpdateSchema
from api.exceptions import DemandaValidationError

router = APIRouter(prefix="/complementacao", tags=["complementacao"])
STATUS_COMPLEMENTACAO = "analise_aguardando_complementacao"
CADASTROS = {
    "projeto": (demanda_repository, demanda_service, DemandaUpdateSchema, demanda_service.atualizar_demanda),
    "plano": (plano_repository, plano_service, PlanoUpdateSchema, plano_service.atualizar_plano),
    "programa": (programa_repository, programa_service, ProgramaUpdateSchema, programa_service.atualizar_programa),
}
ATRIBUTOS_CADASTRAIS = {
    "maturidade_objeto", "capex_estimado", "base_estimativa_capex",
    "prazo_referencia_meses", "base_estimativa_prazo",
}


def _visivel(demanda: dict, user: SessionUser, pessoa_id: str | None) -> bool:
    if demanda.get("status") != STATUS_COMPLEMENTACAO:
        return False
    return user.tipo_usuario.strip().upper() in {"ANALISTA", "GESTOR", "ADMIN"} or _pode_editar(
        {}, pessoa_id=pessoa_id, usuario_id=str(user.id), demanda=demanda
    )


def _demanda_autorizada(tipo: str, codigo: str, user: SessionUser, categoria: str | None = None) -> dict:
    if tipo not in CADASTROS:
        raise HTTPException(422, "Tipo de demanda inválido.")
    demanda = CADASTROS[tipo][0].get_by_codigo(codigo)
    if not demanda or not _visivel(demanda, user, _pessoa_id(user)):
        raise HTTPException(403, "Demanda indisponível para complementação por este usuário.")
    _exigir_solicitacao(tipo, codigo, categoria)
    return demanda


def _exigir_solicitacao(tipo, codigo, categoria=None, hierarquizacao=None):
    pedidos = [p for p in solicitacoes.listar(tipo=tipo, codigo=codigo)
               if p.get('hierarquizacao_codigo') == hierarquizacao
               and (categoria is None or categoria in p['categorias'])]
    if not pedidos:
        raise HTTPException(403, 'Não existe solicitação aberta para esta complementação.')
    return pedidos


@router.post('/solicitacoes/{solicitacao_id}/concluir')
def concluir_solicitacao(solicitacao_id: UUID, user: SessionUser = Depends(require_operator)):
    pedido = solicitacoes.obter(solicitacao_id)
    if not pedido:
        raise HTTPException(404, 'Solicitação não encontrada.')
    if "atributos_objeto" in pedido["categorias"]:
        concluir_atributos(pedido["hierarquizacao_codigo"], pedido["demanda_codigo"], user)
        return solicitacoes.obter(solicitacao_id)
    tipo, codigo = pedido['demanda_tipo'], pedido['demanda_codigo']
    cadastro = CADASTROS[tipo][0].get_by_codigo(codigo)
    if not cadastro or not (
        user.tipo_usuario.strip().upper() in {'ADMIN','GESTOR','ANALISTA'} or
        _pode_editar({}, pessoa_id=_pessoa_id(user), usuario_id=str(user.id), demanda=cadastro)):
        raise HTTPException(403, 'Solicitação indisponível para este usuário.')
    with atomic_connection() as conn:
        bloquear(conn, tipo, codigo)
        pedido = solicitacoes.obter(solicitacao_id, lock=True)
        if pedido['status'] != 'solicitada':
            return pedido
        faltantes = set(pedido['categorias']) - set(pedido['categorias_salvas'])
        if faltantes:
            raise HTTPException(422, 'Salve as alterações solicitadas antes de concluir: ' + ', '.join(sorted(faltantes)))
        return solicitacoes.atender(solicitacao_id, user.id)


def _pessoa_id(user: SessionUser) -> str | None:
    row = sigma_usuario_repository.find_active_by_id(user.id)
    return str(row["pessoa_id"]) if row and row.get("pessoa_id") else None


def _pode_editar(
    cabecalho: dict[str, Any],
    *,
    pessoa_id: str | None,
    usuario_id: str | None = None,
    demanda: dict[str, Any] | None = None,
) -> bool:
    if demanda is not None:
        return bool(
            (usuario_id and str(demanda.get("criado_por") or "") == usuario_id)
            or (pessoa_id and str(demanda.get("sigma_pessoa_id") or "") == pessoa_id)
        )
    atributos = cabecalho.get("atributos") or {}
    representante = atributos.get("representante") or {}
    responsaveis = [atributos.get("sigma_pessoa_id"), atributos.get("pessoa_id"), representante.get("pessoa_id")]
    return bool((usuario_id and str(atributos.get("criado_por") or "") == usuario_id)
                or (pessoa_id and any(str(p or "") == pessoa_id for p in responsaveis)))


def _cadastros() -> dict[str, dict[str, Any]]:
    return {str(d["codigo"]): d for repo in (plano_repository, programa_repository, demanda_repository)
            for d in repo.list_all()}


def _acesso(cab: dict[str, Any], user: SessionUser, pessoa_id: str | None,
            cadastros: dict[str, dict[str, Any]]) -> bool:
    # Não utiliza a cópia histórica do agrupamento como fonte de autorização.
    demanda = cadastros.get(str(cab.get("codigo")))
    return bool(demanda and (
        user.tipo_usuario.strip().upper() == "ADMIN"
        or _pode_editar({}, pessoa_id=pessoa_id, usuario_id=str(user.id), demanda=demanda)
    ))


def _pode_listar(item: dict[str, Any], user: SessionUser) -> bool:
    return item["pode_editar"]


def _matriz(row: dict[str, Any]) -> Any:
    dados = row.get("dados_hierarquizacao") or {}
    matriz = (dados.get("cabecalho_grupo") or {}).get("matriz_premissas_criterios")
    return matriz if extrair_colunas(matriz) else row.get("config_criterios") or matriz


def _item(row: dict[str, Any], obj: dict[str, Any], *, pode_editar: bool,
          dominios: list[dict] | None = None, colunas: list[dict] | None = None) -> dict[str, Any]:
    cab = obj.get("cabecalho_objeto") or {}
    if colunas is None:
        colunas = colunas_da_hierarquizacao(row, estrito=True)
    colunas_dinamicas = [col for col in colunas if col["id"] not in VINCULOS_CADASTRAIS]
    slots = cab.get("atributos_fase3") or {}
    nativos = ATRIBUTOS_CADASTRAIS - (
        {"capex_estimado", "base_estimativa_capex"} if cab.get("tipo_demanda") == "plano" else set()
    ) if dominios is None else {
        d["codigo"] for d in dominios
        if d["codigo"] in ATRIBUTOS_CADASTRAIS and cab.get("tipo_demanda") in d["tipos_objeto"]
    }
    valores_nativos = mesclar_atributos_nativos(cab.get("atributos") or {})
    preenchidos = sum(not vazio(valores_nativos.get(c)) for c in nativos) + sum(
        1 for col in colunas_dinamicas
        if not vazio(valor_dinamico(cab, col["id"]))
    )
    faltantes = pendencias(cab, colunas, dominios)
    return {
        "hierarquizacao_codigo": row["codigo"],
        "hierarquizacao_nome": row.get("nome"),
        "objeto_codigo": cab.get("codigo"),
        "objeto_nome": cab.get("nome"),
        "tipo_demanda": cab.get("tipo_demanda"),
        "total_atributos": len(colunas_dinamicas) + len(nativos),
        "atributos_preenchidos": preenchidos,
        "pode_editar": pode_editar,
        "situacao_complementacao": "em_complementacao" if faltantes else "complementada",
        "pendencias": faltantes,
        "colunas": colunas,
        "valores": slots,
    }


@router.get("/demandas/{tipo}")
def listar_demandas_complementaveis(tipo: str, user: SessionUser = Depends(require_operator)):
    if tipo not in CADASTROS:
        raise HTTPException(422, "Tipo de demanda inválido.")
    repo, service, _, _ = CADASTROS[tipo]
    pessoa_id = _pessoa_id(user)
    pedidos = [p for p in solicitacoes.listar(tipo=tipo) if not p.get('hierarquizacao_codigo')]
    por_codigo = {}
    for pedido in pedidos:
        por_codigo.setdefault(pedido['demanda_codigo'], []).append(pedido)
    rows = [row for codigo in por_codigo if (row := repo.get_by_codigo(codigo))
            and _visivel(row, user, pessoa_id)]
    rows = resolver_nomes_registros(rows)
    return [{**service._row_to_response(row, incluir_auditoria=True, nomes_resolvidos=True).model_dump(),
             'solicitacoes': por_codigo[row['codigo']]} for row in rows]


@router.get("/demandas/{tipo}/{codigo}")
def obter_demanda_complementavel(tipo: str, codigo: str, user: SessionUser = Depends(require_operator)):
    row = _demanda_autorizada(tipo, codigo, user)
    return CADASTROS[tipo][1]._row_to_response(row, incluir_auditoria=True)


@router.patch("/demandas/{tipo}/{codigo}/cadastro")
def salvar_cadastro(tipo: str, codigo: str, body: dict = Body(...), user: SessionUser = Depends(require_operator)):
    _demanda_autorizada(tipo, codigo, user, "dados_cadastrais")
    _, _, schema, atualizar = CADASTROS[tipo]
    permitidos = set(schema.model_fields) - {"status"}
    if set(body) - permitidos:
        raise HTTPException(422, "Campo não permitido na complementação cadastral.")
    try:
        with atomic_connection() as conn:
            bloquear(conn, tipo, codigo)
            _exigir_solicitacao(tipo, codigo, 'dados_cadastrais')
            resultado = atualizar(codigo, schema.model_validate(body), usuario_id=user.id)
            solicitacoes.registrar_edicao(tipo, codigo, 'dados_cadastrais', user.id)
            return resultado
    except (ValidationError, DemandaValidationError) as exc:
        raise HTTPException(422, str(exc)) from exc


@router.post("/demandas/{tipo}/{codigo}/geometria/conferir")
async def conferir_geometria_complementacao(tipo: str, codigo: str, file: UploadFile = File(...),
                                           user: SessionUser = Depends(require_operator)):
    _demanda_autorizada(tipo, codigo, user, "geometria")
    from api.routers.geometria import conferir_geometria
    return await conferir_geometria(tipo, codigo, file, user)


@router.post("/demandas/{tipo}/{codigo}/geometria/substituir")
async def substituir_geometria_complementacao(tipo: str, codigo: str, confirmacao: str = Form(...),
                                             file: UploadFile = File(...), user: SessionUser = Depends(require_operator)):
    _demanda_autorizada(tipo, codigo, user, "geometria")
    from api.routers.geometria import substituir_geometria
    return await substituir_geometria(tipo, codigo, confirmacao, file, user)


@router.get("/objetos")
def listar_objetos(user: SessionUser = Depends(require_operator)) -> list[dict[str, Any]]:
    itens: list[dict[str, Any]] = []
    pessoa_id = _pessoa_id(user)
    cadastros = _cadastros()
    dominios = dominio_repository.list_atributos_objeto()
    pedidos = [p for p in solicitacoes.listar() if 'atributos_objeto' in p['categorias']]
    por_hierarquia = {}
    for pedido in pedidos:
        por_hierarquia.setdefault(pedido['hierarquizacao_codigo'], {}).setdefault(pedido['demanda_codigo'], []).append(pedido)
    for row in hierarquizacao_repository.list_all():
        if row.get("status") in {"arquivada", "homologada"}:
            continue
        colunas = colunas_da_hierarquizacao(row)
        por_objeto = por_hierarquia.get(row["codigo"], {})
        for obj in (row.get('dados_hierarquizacao') or {}).get('objetos', []):
            objeto = deepcopy(obj)
            cab = objeto.get('cabecalho_objeto') or {}
            cadastro = cadastros.get(str(cab.get("codigo")))
            if not cadastro or not _acesso(cab, user, pessoa_id, cadastros):
                continue
            atualizar_cadastrais(cab, cadastro)
            if _disponivel(row, cab, cadastro, por_objeto, dominios, colunas):
                item = _item(row, objeto, pode_editar=True, dominios=dominios, colunas=colunas)
                item['solicitacoes'] = por_objeto.get(cab["codigo"], [])
                itens.append(item)
    return itens


def _disponivel(row: dict, cab: dict, cadastro: dict, solicitados, dominios: list[dict],
                colunas: list[dict] | None = None) -> bool:
    if row.get("status") in {"arquivada", "homologada"}:
        return False
    if cadastro.get("status") not in {STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO}:
        return False
    if cab.get("codigo") in solicitados:
        return True
    estado = cab.get("complementacao_atributos") or {}
    return bool(pendencias(cab, colunas if colunas is not None else colunas_da_hierarquizacao(row), dominios)) or estado.get("concluida") is False


def _tabela(row: dict[str, Any], user: SessionUser, pessoa_id: str | None,
            cadastros: dict[str, dict[str, Any]], dominios: list[dict[str, Any]],
            demanda_codigo: str | None = None, *, incluir_concluidas: bool = False) -> dict[str, Any]:
    objetos = []
    colunas = colunas_da_hierarquizacao(row, estrito=True)
    solicitados = {p['demanda_codigo'] for p in solicitacoes.listar(hierarquizacao=row['codigo'])
                   if 'atributos_objeto' in p['categorias']}
    for original in (row.get("dados_hierarquizacao") or {}).get("objetos", []):
        cab = original.get("cabecalho_objeto") or {}
        if (not _acesso(cab, user, pessoa_id, cadastros)
                or (demanda_codigo is not None and cab.get("codigo") != demanda_codigo)):
            continue
        objeto = deepcopy(original)
        cab = objeto["cabecalho_objeto"]
        cadastro = cadastros[str(cab["codigo"])]
        atualizar_cadastrais(cab, cadastro)
        if not incluir_concluidas and not _disponivel(row, cab, cadastro, solicitados, dominios, colunas):
            continue
        objetos.append(objeto)
    if not objetos:
        raise HTTPException(403, "Nenhuma demanda desta hierarquização está disponível para este usuário.")
    return {
        "codigo": row["codigo"], "nome": row.get("nome"), "criado_em": row.get("criado_em"),
        "tipo_demanda_id": row.get("tipo_demanda_id"), "pode_editar": True,
        "dados_hierarquizacao": {"objetos": objetos},
        "colunas": colunas,
        "dominios": dominios,
    }


def _validar_valor(coluna: dict[str, Any], valor: Any, *, cadastral: bool = False,
                   tipo: str = "") -> Any:
    codigo = coluna.get("codigo") or coluna.get("id")
    if vazio(valor):
        if cadastral and not coluna.get("permite_nao_informado", True):
            raise HTTPException(422, f"O atributo {codigo} não permite valor não informado.")
        return None
    tipo_dado = coluna.get("tipo_dado") if cadastral else coluna.get("tipo")
    if tipo_dado in {"numerico", "inteiro", "monetario"}:
        if (isinstance(valor, bool) or not isinstance(valor, (int, float))
                or (isinstance(valor, float) and not isfinite(valor))):
            raise HTTPException(422, f"Informe um número finito para {codigo}.")
        inteiro = tipo_dado == "inteiro" or coluna.get("formato") == "inteiro"
        if inteiro and valor != int(valor):
            raise HTTPException(422, f"Informe um número inteiro para {codigo}.")
        regras = coluna.get("regras_validacao") or {}
        minimo = regras.get("minimo")
        maximo = regras.get("maximo")
        if cadastral:
            maximo = min(maximo if maximo is not None else float("inf"),
                         2147483647 if inteiro else Decimal("9999999999999999.99"))
        if (minimo is not None and valor < minimo) or (maximo is not None and valor > maximo):
            raise HTTPException(422, f"Valor fora do intervalo permitido para {codigo}.")
        return int(valor) if inteiro else valor
    if tipo_dado == "booleano":
        if not isinstance(valor, bool):
            raise HTTPException(422, f"Informe Sim ou Não para {codigo}.")
        return valor
    if not cadastral and tipo_dado in {"categorico", "ordinal"}:
        mapeamento = coluna.get("mapeamento") or {}
        if not mapeamento:
            raise HTTPException(422, f"A escala de conversão de {codigo} não está configurada na matriz ou no Configurador da Fase 3.")
        if isinstance(valor, bool) or str(valor) not in mapeamento:
            raise HTTPException(422, f"Opção inválida para {codigo}.")
        return valor
    if not isinstance(valor, str):
        raise HTTPException(422, f"Informe um texto ou uma opção válida para {codigo}.")
    opcoes = coluna.get("dominio_valores") or (coluna.get("configuracao_por_tipo") or {}).get(tipo, {}).get("opcoes") or []
    permitidos = {opcao["rotulo"] for opcao in opcoes} if cadastral else set(coluna.get("mapeamento") or {})
    if permitidos and valor not in permitidos:
        raise HTTPException(422, f"Opção inválida para {codigo}.")
    return valor


@router.get("/hierarquizacoes/{codigo}")
def obter_tabela(codigo: str, user: SessionUser = Depends(require_operator),
                 demanda_codigo: str | None = None) -> dict[str, Any]:
    row = hierarquizacao_repository.get_by_codigo(codigo)
    if not row:
        raise HTTPException(404, "Hierarquização não encontrada.")
    return _tabela(row, user, _pessoa_id(user), _cadastros(), dominio_repository.list_atributos_objeto(), demanda_codigo)


@router.patch("/hierarquizacoes/{codigo}")
def salvar_tabela(codigo: str, valores: dict[str, dict[str, Any]] = Body(..., embed=True),
                  user: SessionUser = Depends(require_operator)) -> dict[str, Any]:
    if not valores or not any(valores.values()):
        raise HTTPException(422, "Nenhuma alteração de atributos foi informada.")
    pessoa_id = _pessoa_id(user)
    dominios = dominio_repository.list_atributos_objeto()
    with atomic_connection() as conn:
        row = hierarquizacao_repository.get_by_codigo(codigo, for_update=True)
        if not row:
            raise HTTPException(404, "Hierarquização não encontrada.")
        dados = deepcopy(row.get("dados_hierarquizacao") or {})
        objetos = {obj["cabecalho_objeto"]["codigo"]: obj for obj in dados.get("objetos", [])}
        colunas = {col["id"]: col for col in colunas_da_hierarquizacao(row, estrito=True)}
        cadastros = {}
        alteracoes = []
        for objeto_codigo in sorted(valores):
            if objeto_codigo not in objetos:
                raise HTTPException(403, "Demanda indisponível nesta hierarquização.")
            cab = objetos[objeto_codigo]["cabecalho_objeto"]
            tipo = str(cab.get("tipo_demanda") or "").lower()
            if tipo not in CADASTROS:
                raise HTTPException(422, "Tipo de demanda inválido nesta hierarquização.")
            tabela = "projeto" if tipo == "projeto" else tipo
            conn.execute(sql.SQL("SELECT codigo FROM demandas.{} WHERE codigo = %s FOR UPDATE").format(
                sql.Identifier(tabela)), (objeto_codigo,))
            cadastro = CADASTROS[tipo][0].get_by_codigo(objeto_codigo)
            if not cadastro or not _acesso(cab, user, pessoa_id, {objeto_codigo: cadastro}):
                raise HTTPException(403, "Este objeto não pertence ao usuário conectado.")
            pedidos = solicitacoes.listar(tipo=tipo, codigo=objeto_codigo, hierarquizacao=codigo)
            atual = deepcopy(cab)
            atualizar_cadastrais(atual, cadastro)
            if not _disponivel(row, atual, cadastro, {p["demanda_codigo"] for p in pedidos}, dominios, list(colunas.values())):
                raise HTTPException(403, "Esta demanda não está disponível para complementação de atributos.")
            cadastros[objeto_codigo] = cadastro
            dominios_tipo = {item["codigo"]: item for item in dominios
                             if item["codigo"] in ATRIBUTOS_CADASTRAIS and tipo in item["tipos_objeto"]}
            nativos, dinamicos = {}, {}
            for atributo, valor in valores[objeto_codigo].items():
                if atributo.startswith("cadastro:"):
                    chave = atributo.removeprefix("cadastro:")
                    if chave not in dominios_tipo:
                        raise HTTPException(422, f"Atributo cadastral não permitido: {atributo}")
                    nativos[chave] = _validar_valor(dominios_tipo[chave], valor, cadastral=True, tipo=tipo)
                else:
                    if atributo not in colunas:
                        raise HTTPException(422, f"Atributo não pertence à matriz vigente: {atributo}")
                    if (atributo in VINCULOS_CADASTRAIS or
                            ((cab.get("atributos_fase3") or {}).get(atributo) or {}).get("origem") == "cadastro"):
                        raise HTTPException(422, f"Edite o atributo cadastral correspondente a {atributo}.")
                    dinamicos[atributo] = _validar_valor(colunas[atributo], valor)
            alteracoes.append((objeto_codigo, cab, tipo, nativos, dinamicos))

        for objeto_codigo, cab, tipo, nativos, dinamicos in alteracoes:
            cadastrais = mesclar_atributos_nativos(cadastros[objeto_codigo])
            if nativos:
                _, _, schema, atualizar = CADASTROS[tipo]
                cadastrais.update(nativos)
                try:
                    atualizado = atualizar(objeto_codigo, schema.model_validate(
                        {"atributos_cadastrais": cadastrais}), usuario_id=user.id)
                except (ValidationError, DemandaValidationError) as exc:
                    raise HTTPException(422, str(exc)) from exc
                cadastrais = atualizado.atributos_cadastrais
            atributos = cab.get("atributos") or {}
            cab["atributos"] = atributos
            atributos["atributos_cadastrais"] = cadastrais
            for chave in ATRIBUTOS_CADASTRAIS:
                atributos[chave] = cadastrais.get(chave)
            slots = cab.get("atributos_fase3") or {}
            cab["atributos_fase3"] = slots
            for atributo, valor in dinamicos.items():
                slot = slots.setdefault(atributo, {"peso": None})
                slot.update({"valor_bruto": valor, "valor": valor, "valor_rescalonado": None,
                             "origem": "complementacao", "preenchido_por": user.id})
            atualizar_cadastrais(cab, {"atributos_cadastrais": cadastrais})
            _sincronizar_complementacao(conn, codigo, cab, list(colunas.values()), dominios, user)
        remover_resultados_fase3(dados)
        hierarquizacao_repository.update(codigo, {
            "dados_hierarquizacao": dados,
            "relatorio_fase3": {},
            "relatorio_consolidado": {},
            "ranking": [],
        })
        for objeto_codigo, cab, tipo, nativos, dinamicos in alteracoes:
            solicitacoes.registrar_edicao(tipo, objeto_codigo, 'atributos_objeto', user.id, codigo)
    return _tabela({**row, "dados_hierarquizacao": dados}, user, pessoa_id, _cadastros(),
                   dominios, incluir_concluidas=True)


def _sincronizar_complementacao(conn, codigo: str, cab: dict, colunas: list[dict],
                                dominios: list[dict], user: SessionUser) -> str:
    tipo, demanda_codigo = cab["tipo_demanda"], cab["codigo"]
    faltantes = pendencias(cab, colunas, dominios)
    valores = mesclar_atributos_nativos(cab.get("atributos") or {})
    if not faltantes:
        for dominio in dominios:
            if dominio["codigo"] in ATRIBUTOS_CADASTRAIS and tipo in dominio["tipos_objeto"]:
                _validar_valor(dominio, valores.get(dominio["codigo"]), cadastral=True, tipo=tipo)
        for coluna in colunas:
            if coluna["id"] not in VINCULOS_CADASTRAIS:
                _validar_valor(coluna, valor_dinamico(cab, coluna["id"]))
        for pedido in solicitacoes.listar(tipo=tipo, codigo=demanda_codigo, hierarquizacao=codigo):
            if "atributos_objeto" in pedido["categorias"]:
                solicitacoes.registrar_edicao(tipo, demanda_codigo, "atributos_objeto", user.id, codigo)
                solicitacoes.atender(pedido["id"], user.id)
    outras_pendencias = False
    if not faltantes:
        for outra in hierarquizacao_repository.list_all():
            if outra["codigo"] == codigo or outra.get("status") in {"arquivada", "homologada"}:
                continue
            for objeto in (outra.get("dados_hierarquizacao") or {}).get("objetos", []):
                outro_cab = deepcopy(objeto.get("cabecalho_objeto") or {})
                if outro_cab.get("codigo") == demanda_codigo:
                    atualizar_cadastrais(outro_cab, {"atributos_cadastrais": valores})
                    if pendencias(outro_cab, colunas_da_hierarquizacao(outra), dominios):
                        outras_pendencias = True
        outras_pendencias = outras_pendencias or any(
            p.get("hierarquizacao_codigo") not in {None, codigo} and "atributos_objeto" in p["categorias"]
            for p in solicitacoes.listar(tipo=tipo, codigo=demanda_codigo)
        )
    destino = STATUS_HIERARQUIZACAO_COMPLEMENTACAO if faltantes or outras_pendencias else STATUS_EM_HIERARQUIZACAO
    cab["status"] = destino
    cab["complementacao_atributos"] = {
        "pendencias": faltantes, "concluida": not faltantes, "automatica": True,
        "verificada_em": datetime.now(timezone.utc).isoformat(),
        **({"concluida_por": str(user.id)} if not faltantes else {}),
    }
    conn.execute(sql.SQL("UPDATE demandas.{} SET status=%s, atualizado_por=%s WHERE codigo=%s").format(
        sql.Identifier(tipo)), (destino, user.id, demanda_codigo))
    return destino


@router.post("/hierarquizacoes/{codigo}/solicitar")
def solicitar_atributos(codigo: str, descricao: str = Body(..., embed=True, min_length=1, max_length=5000),
                       user: SessionUser = Depends(require_analyst)) -> dict:
    return solicitar_hierarquizacao(codigo, descricao=descricao, user=user)


@router.post("/hierarquizacoes/{codigo}/demandas/{demanda_codigo}/concluir")
def concluir_atributos(codigo: str, demanda_codigo: str,
                      user: SessionUser = Depends(require_operator)) -> dict:
    pessoa_id = _pessoa_id(user)
    dominios = dominio_repository.list_atributos_objeto()
    with atomic_connection() as conn:
        row = hierarquizacao_repository.get_by_codigo(codigo, for_update=True)
        if not row:
            raise HTTPException(404, "Hierarquização não encontrada.")
        dados = deepcopy(row.get("dados_hierarquizacao") or {})
        cab = next((o["cabecalho_objeto"] for o in dados.get("objetos", [])
                    if o.get("cabecalho_objeto", {}).get("codigo") == demanda_codigo), None)
        if not cab or cab.get("tipo_demanda") not in CADASTROS:
            raise HTTPException(403, "Demanda indisponível nesta hierarquização.")
        tipo = cab["tipo_demanda"]
        bloquear(conn, tipo, demanda_codigo)
        cadastro = CADASTROS[tipo][0].get_by_codigo(demanda_codigo)
        if not cadastro or not _acesso(cab, user, pessoa_id, {demanda_codigo: cadastro}):
            raise HTTPException(403, "Esta demanda não pertence ao usuário conectado.")
        atualizar_cadastrais(cab, cadastro)
        pedidos = [p for p in solicitacoes.listar(tipo=tipo, codigo=demanda_codigo, hierarquizacao=codigo)
                   if "atributos_objeto" in p["categorias"]]
        if not _disponivel(row, cab, cadastro, {p["demanda_codigo"] for p in pedidos}, dominios):
            raise HTTPException(409, "Não há complementação de atributos aberta para esta demanda.")
        colunas = colunas_da_hierarquizacao(row)
        faltantes = pendencias(cab, colunas, dominios)
        if faltantes:
            raise HTTPException(422, "Preencha os atributos obrigatórios antes de concluir: " + ", ".join(faltantes))
        destino = _sincronizar_complementacao(conn, codigo, cab, colunas, dominios, user)
        hierarquizacao_repository.update(codigo, {"dados_hierarquizacao": dados})
    return {
        "demanda_codigo": demanda_codigo, "status": destino,
        "mensagem": (
            "Complementação concluída. A demanda retornou a Em hierarquização."
            if destino == STATUS_EM_HIERARQUIZACAO else
            "Complementação concluída nesta hierarquização. Ainda há pendências em outra rodada."
        ),
    }


@router.get("/{hierarquizacao_codigo}/{objeto_codigo}")
def obter_complementacao(hierarquizacao_codigo: str, objeto_codigo: str,
                               user: SessionUser = Depends(require_operator)) -> dict[str, Any]:
    row = hierarquizacao_repository.get_by_codigo(hierarquizacao_codigo)
    if not row:
        raise HTTPException(404, "Hierarquizacao nao encontrada.")
    pessoa_id = _pessoa_id(user)
    cadastros = _cadastros()
    for obj in (row.get("dados_hierarquizacao") or {}).get("objetos", []):
        cab = obj.get("cabecalho_objeto") or {}
        if cab.get("codigo") == objeto_codigo:
            if not _acesso(cab, user, pessoa_id, cadastros):
                raise HTTPException(403, "Você não tem acesso a esta complementação.")
            tabela = _tabela(row, user, pessoa_id, cadastros, dominio_repository.list_atributos_objeto(), objeto_codigo)
            item = _item(row, tabela["dados_hierarquizacao"]["objetos"][0], pode_editar=True,
                         dominios=tabela["dominios"])
            if not _pode_listar(item, user):
                raise HTTPException(403, "Você não tem acesso a esta complementação.")
            return item
    raise HTTPException(404, "Objeto nao encontrado nesta hierarquizacao.")


@router.patch("/{hierarquizacao_codigo}/{objeto_codigo}")
def salvar_complementacao(hierarquizacao_codigo: str, objeto_codigo: str,
                                valores: dict[str, Any] = Body(..., embed=True),
                                user: SessionUser = Depends(require_operator)) -> dict[str, Any]:
    tabela = salvar_tabela(hierarquizacao_codigo, {objeto_codigo: valores}, user)
    objeto = next(obj for obj in tabela["dados_hierarquizacao"]["objetos"]
                  if obj["cabecalho_objeto"]["codigo"] == objeto_codigo)
    return _item({"codigo": hierarquizacao_codigo, **tabela}, objeto, pode_editar=True,
                 dominios=tabela["dominios"], colunas=tabela["colunas"])
