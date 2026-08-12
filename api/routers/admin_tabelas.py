"""Rotas HTTP — Área do Administrador (CRUD genérico das tabelas do banco).

Expõe leitura paginada e escrita real (inserir/atualizar/excluir) sobre as tabelas
dos esquemas liberados. Todos os identificadores são validados contra o catálogo do
PostgreSQL (information_schema/pg_catalog) antes de compor SQL, evitando injeção.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.deps.auth import require_admin
from api.path_policy import project_path
from api.services.session_service import SessionUser

router = APIRouter(prefix="/admin", tags=["admin-tabelas"])

# Esquemas liberados para a área do administrador.
ESQUEMAS_PERMITIDOS: tuple[str, ...] = (
    "ahp",
    "auditoria",
    "demandas",
    "geo",
    "geoprocessamento",
    "hierarquizacao_demandas",
)

# Tipos que não podem ser serializados/editados diretamente e são exibidos como texto.
_TIPOS_GEOMETRIA = {"geometry", "geography"}
_TIPOS_BINARIOS = {"bytea"}
_TIPOS_JSON = {"json", "jsonb"}


def _validar_esquema(esquema: str) -> None:
    if esquema not in ESQUEMAS_PERMITIDOS:
        raise HTTPException(status_code=404, detail=f"Esquema '{esquema}' não disponível.")


def _tabela_existe(conn: Any, esquema: str, tabela: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema=%s AND table_name=%s AND table_type='BASE TABLE'",
        (esquema, tabela),
    ).fetchone()
    return row is not None


def _validar_tabela(conn: Any, esquema: str, tabela: str) -> None:
    if not _tabela_existe(conn, esquema, tabela):
        raise HTTPException(status_code=404, detail=f"Tabela '{esquema}.{tabela}' não encontrada.")


def _colunas(conn: Any, esquema: str, tabela: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT column_name, data_type, udt_name, is_nullable, column_default "
        "FROM information_schema.columns WHERE table_schema=%s AND table_name=%s "
        "ORDER BY ordinal_position",
        (esquema, tabela),
    ).fetchall()
    return [dict(r) for r in rows]


def _chave_primaria(conn: Any, esquema: str, tabela: str) -> list[str]:
    rows = conn.execute(
        "SELECT a.attname AS nome "
        "FROM pg_index i "
        "JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) "
        "WHERE i.indrelid=%s::regclass AND i.indisprimary "
        "ORDER BY array_position(i.indkey, a.attnum)",
        (f'"{esquema}"."{tabela}"',),
    ).fetchall()
    return [r["nome"] for r in rows]


def _expr_selecao(coluna: dict[str, Any]) -> sql.Composed:
    """Expressão SELECT segura por coluna; converte tipos não serializáveis em texto."""
    ident = sql.Identifier(coluna["column_name"])
    udt = str(coluna["udt_name"]).lower()
    data_type = str(coluna["data_type"]).lower()
    if udt in _TIPOS_GEOMETRIA:
        return sql.SQL("left(ST_AsText({}), 240)").format(ident) + sql.SQL(" AS ") + ident
    if data_type in _TIPOS_BINARIOS or udt == "bytea":
        return (
            sql.SQL("('[' || COALESCE(octet_length({}),0) || ' bytes]')").format(ident)
            + sql.SQL(" AS ")
            + ident
        )
    return ident


def _coluna_editavel(coluna: dict[str, Any]) -> bool:
    udt = str(coluna["udt_name"]).lower()
    data_type = str(coluna["data_type"]).lower()
    return udt not in _TIPOS_GEOMETRIA and data_type not in _TIPOS_BINARIOS and udt != "bytea"


def _coagir_valor(valor: Any, coluna: dict[str, Any]) -> Any:
    """Ajusta o valor recebido do cliente ao tipo da coluna."""
    udt = str(coluna["udt_name"]).lower()
    if valor is None:
        return None
    if udt in _TIPOS_JSON:
        if isinstance(valor, (dict, list)):
            return Jsonb(valor)
        if isinstance(valor, str):
            texto = valor.strip()
            if not texto:
                return None
            try:
                return Jsonb(json.loads(texto))
            except json.JSONDecodeError:
                return texto
        return valor
    if isinstance(valor, str) and valor == "":
        # String vazia vira NULL para colunas não textuais.
        if udt not in {"text", "varchar", "bpchar", "name", "citext"}:
            return None
    return valor


def _colunas_map(colunas: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {c["column_name"]: c for c in colunas}


# ---- Ligação com arquivos em disco (conteúdo geoespacial) ----
_DATA_ROOT = project_path("data").resolve()


def _slug(valor: Any) -> str:
    texto = unicodedata.normalize("NFKD", str(valor)).encode("ascii", "ignore").decode("ascii")
    limpo = re.sub(r"[^A-Za-z0-9]+", "_", texto).strip("_").lower()
    return limpo or "camada"


def _resolver_arquivo(caminho: Any) -> Path | None:
    """Resolve um caminho e só o aceita se estiver dentro de data/ (proteção)."""
    if not caminho or not isinstance(caminho, str):
        return None
    alvo = Path(caminho)
    try:
        alvo = (alvo if alvo.is_absolute() else project_path(caminho)).resolve()
        alvo.relative_to(_DATA_ROOT)
    except (ValueError, OSError):
        return None
    return alvo if alvo.is_file() else None


def _colunas_de_caminho(colunas_map: dict[str, dict[str, Any]]) -> list[str]:
    return [c for c in colunas_map if c in {"uri", "arquivo_origem"} or c.endswith("_path")]


def _arquivos_da_linha(
    conn: Any, esquema: str, tabela: str, chave: dict[str, Any],
    chave_cols: list[str], colunas_map: dict[str, dict[str, Any]],
) -> set[Path]:
    """Coleta os arquivos em disco referenciados por um registro geoespacial."""
    path_cols = _colunas_de_caminho(colunas_map)
    necessarias: set[str] = set(path_cols)
    if "metadados" in colunas_map:
        necessarias.add("metadados")
    if tabela == "camada_homologada":
        necessarias.update(c for c in ("modulo_consumidor", "nome", "versao", "tipo") if c in colunas_map)
    if not necessarias:
        return set()
    condicao = sql.SQL(" AND ").join(
        sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in chave_cols
    )
    row = conn.execute(
        sql.SQL("SELECT {cols} FROM {alvo} WHERE {cond}").format(
            cols=sql.SQL(", ").join(sql.Identifier(c) for c in necessarias),
            alvo=sql.Identifier(esquema, tabela),
            cond=condicao,
        ),
        {k: chave[k] for k in chave_cols},
    ).fetchone()
    if not row:
        return set()
    arquivos: set[Path] = set()
    for coluna in path_cols:
        arq = _resolver_arquivo(row.get(coluna))
        if arq:
            arquivos.add(arq)
    meta = row.get("metadados")
    if isinstance(meta, dict):
        for chave_meta in ("arquivo_biblioteca_canonica", "caminho", "uri", "arquivo"):
            arq = _resolver_arquivo(meta.get(chave_meta))
            if arq:
                arquivos.add(arq)
    if tabela == "camada_homologada" and row.get("modulo_consumidor") and row.get("versao"):
        ext = ".gpkg" if str(row.get("tipo")) == "vetor" else ".tif"
        rel = (
            f"data/geoespacial/biblioteca_canonica/{_slug(row['modulo_consumidor'])}/"
            f"{_slug(row.get('nome') or '')}_{_slug(row['versao'])}{ext}"
        )
        arq = _resolver_arquivo(rel)
        if arq:
            arquivos.add(arq)
    return arquivos


def _preparar_escrita(
    valores: dict[str, Any], colunas_map: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    """Filtra colunas válidas/editáveis e coage os valores."""
    preparado: dict[str, Any] = {}
    for nome, valor in valores.items():
        coluna = colunas_map.get(nome)
        if coluna is None:
            raise HTTPException(status_code=422, detail=f"Coluna '{nome}' inexistente.")
        if not _coluna_editavel(coluna):
            continue  # geometria/binário não são editáveis por esta interface
        preparado[nome] = _coagir_valor(valor, coluna)
    return preparado


@router.get("/esquemas")
async def listar_esquemas(_user: SessionUser = Depends(require_admin)) -> dict[str, Any]:
    """Lista os esquemas liberados, suas tabelas e a contagem de registros de cada uma."""
    resultado: list[dict[str, Any]] = []
    with get_connection() as conn:
        for esquema in ESQUEMAS_PERMITIDOS:
            rows = conn.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema=%s AND table_type='BASE TABLE' ORDER BY table_name",
                (esquema,),
            ).fetchall()
            tabelas = []
            for r in rows:
                nome = r["table_name"]
                try:
                    total = conn.execute(
                        sql.SQL("SELECT count(*) AS n FROM {}").format(
                            sql.Identifier(esquema, nome)
                        )
                    ).fetchone()["n"]
                except Exception:
                    total = None
                tabelas.append({
                    "nome": nome,
                    "dominio": str(nome).startswith("dom_"),
                    "registros": total,
                })
            resultado.append({"esquema": esquema, "tabelas": tabelas})
    return {"esquemas": resultado}


@router.get("/tabelas/{esquema}/{tabela}")
async def obter_tabela(
    esquema: str,
    tabela: str,
    pagina: int = Query(1, ge=1),
    por_pagina: int = Query(15, ge=1, le=200),
    ordenar: str | None = Query(None),
    direcao: str = Query("asc"),
    filtro_coluna: str | None = Query(None),
    filtro_tipo: str = Query("valor"),  # valor | vazias
    filtro_valor: str | None = Query(None),
    filtro_inverter: bool = Query(False),
    _user: SessionUser = Depends(require_admin),
) -> dict[str, Any]:
    """Retorna metadados das colunas e uma página de registros (com ordenação e filtro)."""
    _validar_esquema(esquema)
    payload: dict[str, Any] | None = None
    with get_connection() as conn:
        if _tabela_existe(conn, esquema, tabela):
            colunas = _colunas(conn, esquema, tabela)
            colunas_map = _colunas_map(colunas)
            chave = _chave_primaria(conn, esquema, tabela)
            alvo = sql.Identifier(esquema, tabela)

            where = sql.SQL("")
            params: list[Any] = []
            filtro_meta = colunas_map.get(filtro_coluna) if filtro_coluna else None
            filtro_ativo = bool(filtro_coluna and filtro_meta and _coluna_editavel(filtro_meta))
            if filtro_ativo:
                ident = sql.Identifier(filtro_coluna)
                if filtro_tipo == "vazias":
                    base = sql.SQL("({c} IS NULL OR CAST({c} AS text) = '')").format(c=ident)
                    cond = (sql.SQL("NOT ") + base) if filtro_inverter else base
                else:
                    comparador = "IS DISTINCT FROM" if filtro_inverter else "="
                    cond = sql.SQL("CAST({c} AS text) {op} %s").format(
                        c=ident, op=sql.SQL(comparador)
                    )
                    params.append(filtro_valor if filtro_valor is not None else "")
                where = sql.SQL(" WHERE ") + cond

            total = conn.execute(
                sql.SQL("SELECT count(*) AS total FROM {}{}").format(alvo, where), params
            ).fetchone()["total"]

            dir_sql = sql.SQL("DESC") if str(direcao).lower() == "desc" else sql.SQL("ASC")
            if ordenar and ordenar in colunas_map and _coluna_editavel(colunas_map[ordenar]):
                ordenacao = sql.SQL("{} {} NULLS LAST").format(sql.Identifier(ordenar), dir_sql)
            elif chave:
                ordenacao = sql.SQL(", ").join(sql.Identifier(c) for c in chave)
            else:
                ordenacao = sql.SQL("1")

            selecao = sql.SQL(", ").join(_expr_selecao(c) for c in colunas)
            offset = (pagina - 1) * por_pagina
            linhas = conn.execute(
                sql.SQL(
                    "SELECT {cols} FROM {alvo}{where} ORDER BY {ordem} LIMIT %s OFFSET %s"
                ).format(cols=selecao, alvo=alvo, where=where, ordem=ordenacao),
                [*params, por_pagina, offset],
            ).fetchall()

            chave_set = set(chave)
            colunas_saida = [
                {
                    "nome": c["column_name"],
                    "tipo": c["data_type"],
                    "udt": c["udt_name"],
                    "nulo": c["is_nullable"] == "YES",
                    "default": c["column_default"],
                    "pk": c["column_name"] in chave_set,
                    "editavel": _coluna_editavel(c),
                    "ordenavel": _coluna_editavel(c),
                    "filtravel": _coluna_editavel(c),
                }
                for c in colunas
            ]
            payload = {
                "esquema": esquema,
                "tabela": tabela,
                "dominio": tabela.startswith("dom_"),
                "chave_primaria": chave,
                "colunas": colunas_saida,
                "linhas": [dict(r) for r in linhas],
                "total": total,
                "pagina": pagina,
                "por_pagina": por_pagina,
                "paginas": max(1, (total + por_pagina - 1) // por_pagina),
                "ordenar": ordenar if (ordenar in colunas_map and _coluna_editavel(colunas_map.get(ordenar, {}))) else None,
                "direcao": "desc" if str(direcao).lower() == "desc" else "asc",
                "filtro": {
                    "coluna": filtro_coluna if filtro_ativo else None,
                    "tipo": filtro_tipo,
                    "valor": filtro_valor,
                    "inverter": filtro_inverter,
                },
            }
    if payload is None:
        raise HTTPException(status_code=404, detail=f"Tabela '{esquema}.{tabela}' não encontrada.")
    return payload


@router.get("/tabelas/{esquema}/{tabela}/valores")
async def valores_coluna(
    esquema: str,
    tabela: str,
    coluna: str = Query(...),
    _user: SessionUser = Depends(require_admin),
) -> dict[str, Any]:
    """Valores distintos (como texto) de uma coluna, para o seletor de filtro."""
    _validar_esquema(esquema)
    limite = 500
    resultado: dict[str, Any] | None = None
    erro: tuple[int, str] | None = None
    with get_connection() as conn:
        if not _tabela_existe(conn, esquema, tabela):
            erro = (404, f"Tabela '{esquema}.{tabela}' não encontrada.")
        else:
            meta = _colunas_map(_colunas(conn, esquema, tabela)).get(coluna)
            if meta is None:
                erro = (404, f"Coluna '{coluna}' inexistente.")
            elif not _coluna_editavel(meta):
                erro = (422, "Coluna não filtrável.")
            else:
                ident = sql.Identifier(coluna)
                rows = conn.execute(
                    sql.SQL(
                        "SELECT DISTINCT CAST({c} AS text) AS v FROM {alvo} "
                        "WHERE {c} IS NOT NULL AND CAST({c} AS text) <> '' ORDER BY 1 LIMIT %s"
                    ).format(c=ident, alvo=sql.Identifier(esquema, tabela)),
                    (limite + 1,),
                ).fetchall()
                valores = [r["v"] for r in rows]
                resultado = {"coluna": coluna, "valores": valores[:limite], "truncado": len(valores) > limite}
    if erro:
        raise HTTPException(status_code=erro[0], detail=erro[1])
    return resultado  # type: ignore[return-value]


@router.post("/tabelas/{esquema}/{tabela}", status_code=201)
async def inserir_registro(
    esquema: str,
    tabela: str,
    valores: dict[str, Any] = Body(..., embed=True),
    _user: SessionUser = Depends(require_admin),
) -> dict[str, Any]:
    """Insere um novo registro na tabela."""
    _validar_esquema(esquema)
    resultado: dict[str, Any] | None = None
    erro: tuple[int, str] | None = None
    with get_connection() as conn:
        if not _tabela_existe(conn, esquema, tabela):
            erro = (404, f"Tabela '{esquema}.{tabela}' não encontrada.")
        else:
            colunas_map = _colunas_map(_colunas(conn, esquema, tabela))
            try:
                dados = _preparar_escrita(valores or {}, colunas_map)
                if not dados:
                    erro = (422, "Informe ao menos um valor válido.")
                else:
                    chave = _chave_primaria(conn, esquema, tabela)
                    retorno = (
                        sql.SQL(" RETURNING ")
                        + sql.SQL(", ").join(sql.Identifier(c) for c in chave)
                        if chave
                        else sql.SQL("")
                    )
                    query = (
                        sql.SQL("INSERT INTO {alvo} ({cols}) VALUES ({vals})").format(
                            alvo=sql.Identifier(esquema, tabela),
                            cols=sql.SQL(", ").join(sql.Identifier(c) for c in dados),
                            vals=sql.SQL(", ").join(sql.Placeholder(c) for c in dados),
                        )
                        + retorno
                    )
                    row = conn.execute(query, dados).fetchone()
                    conn.commit()
                    resultado = {"ok": True, "chave": dict(row) if row else None}
            except HTTPException as he:
                conn.rollback()
                erro = (he.status_code, str(he.detail))
            except Exception as exc:  # constraint/tipo → 422 amigável
                conn.rollback()
                erro = (422, str(exc).strip())
    if erro:
        raise HTTPException(status_code=erro[0], detail=erro[1])
    return resultado  # type: ignore[return-value]


@router.patch("/tabelas/{esquema}/{tabela}")
async def atualizar_registro(
    esquema: str,
    tabela: str,
    payload: dict[str, Any] = Body(...),
    _user: SessionUser = Depends(require_admin),
) -> dict[str, Any]:
    """Atualiza um registro identificado pela chave primária."""
    _validar_esquema(esquema)
    chave_valores = payload.get("chave") or {}
    valores = payload.get("valores") or {}
    if not chave_valores:
        raise HTTPException(status_code=422, detail="Chave do registro ausente.")
    afetados = 0
    erro: tuple[int, str] | None = None
    with get_connection() as conn:
        if not _tabela_existe(conn, esquema, tabela):
            erro = (404, f"Tabela '{esquema}.{tabela}' não encontrada.")
        else:
            colunas_map = _colunas_map(_colunas(conn, esquema, tabela))
            chave = _chave_primaria(conn, esquema, tabela)
            try:
                if not chave:
                    erro = (422, "Tabela sem chave primária; edição indisponível.")
                elif set(chave_valores) != set(chave):
                    erro = (422, "Chave primária incompleta.")
                else:
                    dados = _preparar_escrita(valores, colunas_map)
                    for pk in chave:  # a chave não é alterada por esta rota
                        dados.pop(pk, None)
                    if not dados:
                        erro = (422, "Nenhum campo editável para atualizar.")
                    else:
                        params = {f"set__{k}": v for k, v in dados.items()}
                        params.update({f"pk__{k}": _coagir_valor(chave_valores[k], colunas_map[k]) for k in chave})
                        atribuicoes = sql.SQL(", ").join(
                            sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(f"set__{k}")) for k in dados
                        )
                        condicao = sql.SQL(" AND ").join(
                            sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(f"pk__{k}")) for k in chave
                        )
                        query = sql.SQL("UPDATE {alvo} SET {sets} WHERE {cond}").format(
                            alvo=sql.Identifier(esquema, tabela), sets=atribuicoes, cond=condicao
                        )
                        afetados = conn.execute(query, params).rowcount
                        conn.commit()
            except HTTPException as he:
                conn.rollback()
                erro = (he.status_code, str(he.detail))
            except Exception as exc:
                conn.rollback()
                erro = (422, str(exc).strip())
    if erro:
        raise HTTPException(status_code=erro[0], detail=erro[1])
    if not afetados:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    return {"ok": True, "afetados": afetados}


@router.delete("/tabelas/{esquema}/{tabela}")
async def excluir_registros(
    esquema: str,
    tabela: str,
    payload: dict[str, Any] = Body(...),
    _user: SessionUser = Depends(require_admin),
) -> dict[str, Any]:
    """Exclui registros pela chave primária; remove também o arquivo em disco vinculado."""
    _validar_esquema(esquema)
    chaves = payload.get("chaves") or []
    if not chaves:
        raise HTTPException(status_code=422, detail="Nenhum registro selecionado.")
    removidos = 0
    arquivos: set[Path] = set()
    erro: tuple[int, str] | None = None
    with get_connection() as conn:
        if not _tabela_existe(conn, esquema, tabela):
            erro = (404, f"Tabela '{esquema}.{tabela}' não encontrada.")
        else:
            colunas_map = _colunas_map(_colunas(conn, esquema, tabela))
            chave = _chave_primaria(conn, esquema, tabela)
            alvo = sql.Identifier(esquema, tabela)
            try:
                if not chave:
                    erro = (422, "Tabela sem chave primária; exclusão indisponível.")
                else:
                    for registro in chaves:
                        if set(registro) != set(chave):
                            erro = (422, "Chave primária incompleta.")
                            break
                        chave_valores = {k: _coagir_valor(registro[k], colunas_map[k]) for k in chave}
                        # Coleta os arquivos antes de excluir o registro.
                        arquivos |= _arquivos_da_linha(conn, esquema, tabela, chave_valores, chave, colunas_map)
                        condicao = sql.SQL(" AND ").join(
                            sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in chave
                        )
                        cursor = conn.execute(
                            sql.SQL("DELETE FROM {alvo} WHERE {cond}").format(alvo=alvo, cond=condicao),
                            chave_valores,
                        )
                        removidos += cursor.rowcount
                    if erro:
                        conn.rollback()
                        arquivos.clear()
                    else:
                        conn.commit()
            except Exception as exc:
                conn.rollback()
                arquivos.clear()
                erro = (422, str(exc).strip())
    if erro:
        raise HTTPException(status_code=erro[0], detail=erro[1])
    # Só remove arquivos após o commit da exclusão no banco.
    arquivos_removidos = 0
    for arquivo in arquivos:
        try:
            arquivo.unlink()
            arquivos_removidos += 1
        except OSError:
            pass
    return {"ok": True, "removidos": removidos, "arquivos_removidos": arquivos_removidos}
