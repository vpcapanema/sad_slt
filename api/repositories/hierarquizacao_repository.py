"""Acesso a dados — hierarquizacao_demandas.hierarquizacao_portfolio."""

from __future__ import annotations
from api.services.extracao_ogr import reproject as _gdal_reproject

import json
from copy import deepcopy
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection, commit_unless_atomic
from api.constants import STATUS_EM_HIERARQUIZACAO, STATUS_HIERARQUIZACAO_COMPLEMENTACAO, STATUS_POS_APROVACAO, STATUS_UNIVERSO_AHP, TIPO_DEMANDA_ID_TO_COD
from api.exceptions import DemandaValidationError
from api.services.atributos_hierarquizacao import atualizar_cadastrais, colunas_da_hierarquizacao, pendencias

_TABLE = sql.Identifier("hierarquizacao_demandas", "hierarquizacao_portfolio")

_SELECT_BASE = """
    SELECT
        h.id,
        h.codigo,
        h.config_id,
        h.matriz_id,
        h.grupo_demanda_id,
        g.codigo AS grupo_demanda_codigo,
        c.codigo AS config_codigo,
        (SELECT a.id
           FROM ahp.comparacao_colaborativa_ambiente a
          WHERE a.matriz_id = h.matriz_id
            AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(a.criterios) c WHERE c ? '_superficie_id')
          ORDER BY (a.status = 'ativa') DESC, a.criado_em DESC
          LIMIT 1) AS julgamento_id,
        c.criterios AS config_criterios,
        h.nome,
        h.descricao,
        h.tipo_demanda_id,
        h.grupo_id,
        h.status,
        g.objetos AS objetos,
        h.julgamento_projetos,
        h.pesos_projetos,
        h.ranking,
        h.dados_hierarquizacao,
        h.relatorio_fase1,
        h.relatorio_fase2,
        h.relatorio_fase3,
        h.relatorio_consolidado,
        h.homologado_em,
        h.homologado_por,
        h.criado_por,
        h.criado_em,
        h.atualizado_em
    FROM hierarquizacao_demandas.hierarquizacao_portfolio h
    LEFT JOIN ahp.config_multicriterio_portfolio c ON c.id = h.config_id
    JOIN demandas.grupos_demandas g ON g.id = h.grupo_demanda_id
"""


def status_hierarquizacao_ativo(codigo: str) -> bool:
    query = """
        SELECT 1
          FROM hierarquizacao_demandas.dom_status_hierarquizacao
         WHERE codigo = %s AND ativo = TRUE
         LIMIT 1
    """
    with get_connection() as conn:
        return conn.execute(query, (codigo,)).fetchone() is not None


def get_transicao_status_hierarquizacao(origem: str, destino: str) -> dict[str, Any] | None:
    query = """
        SELECT status_origem, status_destino, via_homologar
          FROM hierarquizacao_demandas.dom_status_hierarquizacao_transicao
         WHERE status_origem = %s AND status_destino = %s
    """
    with get_connection() as conn:
        row = conn.execute(query, (origem, destino)).fetchone()
    return dict(row) if row else None

_JSON_FIELDS = {
    "julgamento_projetos", "pesos_projetos", "ranking", "dados_hierarquizacao",
    "relatorio_fase1", "relatorio_fase2", "relatorio_fase3", "relatorio_consolidado",
}


def _json_default(obj: Any) -> Any:
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (set, frozenset)):
        return list(obj)
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="replace")
    raise TypeError(f"Objeto não serializável em JSON: {type(obj).__name__}")


def _dumps(value: Any) -> str:
    return json.dumps(value, default=_json_default, ensure_ascii=False)


def _prepare(key: str, value: Any) -> Any:
    if key in _JSON_FIELDS:
        return Jsonb(value, dumps=_dumps) if value is not None else None
    return value


def insert(data: dict[str, Any], *, status_transicao: dict[str, Any] | None = None) -> dict[str, Any]:
    data = deepcopy(data)
    columns = list(data.keys())
    query = sql.SQL("INSERT INTO {table} ({cols}) VALUES ({vals}) RETURNING id").format(
        table=_TABLE,
        cols=sql.SQL(", ").join(sql.Identifier(c) for c in columns),
        vals=sql.SQL(", ").join(sql.Placeholder(c) for c in columns),
    )
    with get_connection() as conn:
        if status_transicao:
            ids = [i for i in status_transicao.get("ids", []) if i]
            schema, table = status_transicao["tabela"]
            cadastros = conn.execute(
                sql.SQL("SELECT * FROM {} WHERE id=ANY(%s::uuid[]) ORDER BY id FOR UPDATE").format(
                    sql.Identifier(schema, table)), (ids,),
            ).fetchall() if ids else []
            por_id = {str(c["id"]): c for c in cadastros}
            from api.repositories import dominio_repository
            dominios = dominio_repository.list_atributos_objeto()
            colunas = colunas_da_hierarquizacao(data)
            for objeto in (data.get("dados_hierarquizacao") or {}).get("objetos", []):
                cab = objeto["cabecalho_objeto"]
                cadastro = por_id.get(str(cab.get("demanda_id")))
                if not cadastro:
                    raise DemandaValidationError("Demanda do agrupamento não encontrada.", field="grupo_demanda_id")
                if cadastro["status"] not in STATUS_UNIVERSO_AHP:
                    raise DemandaValidationError("A demanda não está disponível para hierarquização.", field="status")
                atualizar_cadastrais(cab, cadastro)
                faltantes = pendencias(cab, colunas, dominios)
                destino = STATUS_HIERARQUIZACAO_COMPLEMENTACAO if faltantes else STATUS_EM_HIERARQUIZACAO
                # Uma nova rodada nao conclui pendencias abertas de outra rodada.
                if cadastro["status"] == STATUS_HIERARQUIZACAO_COMPLEMENTACAO:
                    destino = STATUS_HIERARQUIZACAO_COMPLEMENTACAO
                cab["status"] = destino
                cab["complementacao_atributos"] = {"pendencias": faltantes, "concluida": not faltantes}
                conn.execute(
                    sql.SQL("UPDATE {} SET status=%s WHERE id=%s").format(sql.Identifier(schema, table)),
                    (destino, cadastro["id"]),
                )
        params = {k: _prepare(k, v) for k, v in data.items()}
        inserted = conn.execute(query, params).fetchone()
        if not inserted:
            raise RuntimeError("Insert de hierarquização não retornou id.")
        commit_unless_atomic(conn)
    found = get_by_id(inserted["id"])
    if not found:
        raise RuntimeError("Hierarquização inserida mas não recuperada.")
    return found


def _sinalizar_composicao(conn: Any, row: dict[str, Any]) -> None:
    """O grupo (agente agrupador) é a fonte da composição; divergência marca a hierarquização."""
    dados = row.get("dados_hierarquizacao")
    if not dados or not row.get("grupo_demanda_id"):
        return
    grupo = conn.execute(
        "SELECT objetos FROM demandas.grupos_demandas WHERE id=%s", (row["grupo_demanda_id"],)
    ).fetchone()
    cabecalho = dados.setdefault("cabecalho_grupo", {})
    cabecalho.pop("composicao_divergente", None)
    if not grupo:
        return
    do_grupo = {str(o["id"]) for o in grupo["objetos"] or [] if isinstance(o, dict) and o.get("id")}
    da_hierarquizacao = {
        str(o["cabecalho_objeto"]["demanda_id"]) for o in dados.get("objetos") or []
        if (o.get("cabecalho_objeto") or {}).get("demanda_id")
    }
    adicionadas, removidas = sorted(do_grupo - da_hierarquizacao), sorted(da_hierarquizacao - do_grupo)
    if adicionadas or removidas:
        cabecalho["composicao_divergente"] = {"adicionadas": adicionadas, "removidas": removidas}


def _hidratar(conn: Any, row: dict[str, Any] | None) -> dict[str, Any] | None:
    """Faz o registro cadastral vir sempre do cadastro vivo.

    A rodada só guarda o que as fases produzem (`hierarquizacao`, `atributos_fase3`,
    `complementacao_atributos`); qualquer campo cadastral copiado é sobreposto.
    """
    if not row or row.get("tipo_demanda_id") not in TIPO_DEMANDA_ID_TO_COD:
        return row
    _sinalizar_composicao(conn, row)
    objetos = (row.get("dados_hierarquizacao") or {}).get("objetos") or []
    ids = sorted({str(o["cabecalho_objeto"]["demanda_id"]) for o in objetos
                  if (o.get("cabecalho_objeto") or {}).get("demanda_id")})
    if not ids:
        return row
    tabela = sql.Identifier("demandas", TIPO_DEMANDA_ID_TO_COD[row["tipo_demanda_id"]])
    vivos = {
        str(d["id"]): d for d in conn.execute(
            sql.SQL("SELECT * FROM {} WHERE id=ANY(%s::uuid[])").format(tabela), (ids,)
        ).fetchall()
    }
    for objeto in objetos:
        cab = objeto.get("cabecalho_objeto") or {}
        vivo = vivos.get(str(cab.get("demanda_id")))
        if not vivo:
            continue
        for campo in ("codigo", "nome", "status", "latitude", "longitude"):
            cab[campo] = vivo[campo]
        atributos = cab.setdefault("atributos", {})
        for campo in atributos:
            if campo in vivo:
                atributos[campo] = vivo[campo]
    for posicao in row.get("ranking") or []:
        vivo = vivos.get(str(posicao.get("demanda_id")))
        if vivo:
            posicao["nome"], posicao["codigo"] = vivo["nome"], vivo["codigo"]
    return row


def get_by_id(hierarquizacao_id: Any) -> dict[str, Any] | None:
    query = _SELECT_BASE + " WHERE h.id = %s"
    with get_connection() as conn:
        return _hidratar(conn, conn.execute(query, (hierarquizacao_id,)).fetchone())


def get_by_codigo(codigo: str, *, for_update: bool = False) -> dict[str, Any] | None:
    query = _SELECT_BASE + " WHERE h.codigo = %s"
    if for_update:
        query += " FOR UPDATE OF h"
    with get_connection() as conn:
        return _hidratar(conn, conn.execute(query, (codigo,)).fetchone())


def list_all(
    *,
    status: str | None = None,
    grupo: str | None = None,
    tipo_demanda_id: int | None = None,
    config_id: Any = None,
) -> list[dict[str, Any]]:
    query = _SELECT_BASE + " WHERE 1=1"
    params: list[Any] = []
    if status:
        query += " AND h.status = %s"
        params.append(status)
    if grupo:
        query += " AND h.grupo_id = %s"
        params.append(grupo)
    if tipo_demanda_id is not None:
        query += " AND h.tipo_demanda_id = %s"
        params.append(tipo_demanda_id)
    if config_id:
        query += " AND h.config_id = %s"
        params.append(config_id)
    query += " ORDER BY h.criado_em DESC"
    with get_connection() as conn:
        return [_hidratar(conn, linha) for linha in conn.execute(query, params).fetchall()]


MENSAGEM_HOMOLOGADA = (
    "Esta hierarquização está homologada e não pode ser recalculada nem alterada. "
    "Peça a outro gestor ou a um administrador que reverta a homologação."
)


def update(
    codigo: str,
    data: dict[str, Any],
    *,
    permitir_homologada: bool = False,
    expected_updated_at: datetime | None = None,
) -> dict[str, Any] | None:
    """Grava a rodada. Rodada homologada só muda pelos fluxos de homologação."""
    if not data:
        return get_by_codigo(codigo)
    data = deepcopy(data)
    if not permitir_homologada and "dados_hierarquizacao" in data:
        cab = data["dados_hierarquizacao"].get("cabecalho_grupo") or {}
        if (cab.get("publicacao") or {}).get("ativa"):
            cab["publicacao"]["ativa"] = False
            _registrar_historico(data["dados_hierarquizacao"], "publicacao_invalidada", None)
    with get_connection() as conn:
        atual = conn.execute(
            sql.SQL("SELECT status, atualizado_em FROM {} WHERE codigo = %s FOR UPDATE").format(_TABLE), (codigo,)
        ).fetchone()
        if expected_updated_at and atual and atual["atualizado_em"] != expected_updated_at:
            raise DemandaValidationError(
                "A hierarquização mudou desde a prévia. Recalcule o resultado antes de salvar.",
                field="versao_esperada",
            )
        if atual and atual["status"] == "homologada" and not permitir_homologada:
            raise DemandaValidationError(MENSAGEM_HOMOLOGADA, field="status")
        assignments = [sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in data]
        params: dict[str, Any] = {k: _prepare(k, v) for k, v in data.items()}
        params["codigo"] = codigo
        if expected_updated_at:
            params["expected_updated_at"] = expected_updated_at
            query = sql.SQL("UPDATE {table} SET {sets} WHERE codigo = {codigo} AND atualizado_em = {expected_updated_at}").format(
                table=_TABLE,
                sets=sql.SQL(", ").join(assignments),
                codigo=sql.Placeholder("codigo"),
                expected_updated_at=sql.Placeholder("expected_updated_at"),
            )
        else:
            query = sql.SQL("UPDATE {table} SET {sets} WHERE codigo = {codigo}").format(
                table=_TABLE,
                sets=sql.SQL(", ").join(assignments),
                codigo=sql.Placeholder("codigo"),
            )
        cursor = conn.execute(query, params)
        if expected_updated_at and cursor.rowcount != 1:
            raise DemandaValidationError(
                "A hierarquização mudou desde a prévia. Recalcule o resultado antes de salvar.",
                field="versao_esperada",
            )
        commit_unless_atomic(conn)
    return get_by_codigo(codigo)


def sincronizar_composicao(
    codigo: str, dados: dict[str, Any], adicionadas: list[str]
) -> dict[str, Any] | None:
    """Grava a composição alinhada ao grupo; as demandas novas entram em hierarquização."""
    with get_connection() as conn:
        row = conn.execute(
            sql.SQL("SELECT status, tipo_demanda_id FROM {} WHERE codigo=%s FOR UPDATE").format(_TABLE), (codigo,)
        ).fetchone()
        if not row:
            raise DemandaValidationError("Hierarquização não encontrada.", field="codigo")
        if row["status"] == "homologada":
            raise DemandaValidationError(MENSAGEM_HOMOLOGADA, field="status")
        if adicionadas:
            tabela = sql.Identifier("demandas", TIPO_DEMANDA_ID_TO_COD[row["tipo_demanda_id"]])
            conn.execute(
                sql.SQL("UPDATE {} SET status=%s WHERE id=ANY(%s::uuid[]) AND status=%s").format(tabela),
                (STATUS_EM_HIERARQUIZACAO, adicionadas, STATUS_POS_APROVACAO),
            )
        conn.execute(
            sql.SQL("UPDATE {} SET dados_hierarquizacao=%s WHERE codigo=%s").format(_TABLE),
            (_prepare("dados_hierarquizacao", dados), codigo),
        )
        commit_unless_atomic(conn)
    return get_by_codigo(codigo)


def _concluir_demandas(conn: Any, codigo: str, dados: dict[str, Any]) -> None:
    """Conclui o ciclo técnico na mesma transação da síntese; não publica."""
    row = conn.execute(
        "SELECT tipo_demanda_id FROM hierarquizacao_demandas.hierarquizacao_portfolio WHERE codigo=%s FOR UPDATE",
        (codigo,),
    ).fetchone()
    if not row:
        raise DemandaValidationError("Hierarquização não encontrada para concluir as demandas.", field="codigo")
    tipo = TIPO_DEMANDA_ID_TO_COD[row["tipo_demanda_id"]]
    tabela = sql.Identifier("demandas", tipo)
    objetos = dados.get("objetos") or []
    ids = [o["cabecalho_objeto"]["demanda_id"] for o in objetos]
    if not ids:
        return
    cadastros = conn.execute(
        sql.SQL("SELECT id, status FROM {} WHERE id=ANY(%s::uuid[]) ORDER BY id FOR UPDATE").format(tabela),
        (ids,),
    ).fetchall()
    por_id = {str(c["id"]): c["status"] for c in cadastros}
    if any(str(i) not in por_id for i in ids):
        raise DemandaValidationError("Demanda da hierarquização não encontrada.", field="demanda_id")
    if STATUS_EM_HIERARQUIZACAO in por_id.values():
        permitida = conn.execute("""
            SELECT 1 FROM demandas.dom_status_demanda_transicao
            WHERE status_origem=%s AND status_destino='hierarq_finalizada'
        """, (STATUS_EM_HIERARQUIZACAO,)).fetchone()
        if not permitida:
            raise DemandaValidationError("O domínio não permite concluir a hierarquização das demandas.", field="status")
        conn.execute(
            sql.SQL("UPDATE {} SET status='hierarq_finalizada' WHERE id=ANY(%s::uuid[]) AND status=%s").format(tabela),
            (ids, STATUS_EM_HIERARQUIZACAO),
        )
    for objeto in objetos:
        cab = objeto["cabecalho_objeto"]
        atual = por_id[str(cab["demanda_id"])]
        cab["status"] = "hierarq_finalizada" if atual == STATUS_EM_HIERARQUIZACAO else atual


def _registrar_historico(dados: dict[str, Any], acao: str, usuario_id: Any) -> None:
    historico = dados.setdefault("cabecalho_grupo", {}).setdefault("historico_homologacao", [])
    historico.append({
        "acao": acao,
        "usuario_id": str(usuario_id) if usuario_id else None,
        "em": datetime.now().astimezone().isoformat(),
    })


def _bloquear_para_status(conn: Any, codigo: str, esperado: str, mensagem: str) -> dict[str, Any]:
    row = conn.execute(
        sql.SQL("SELECT status, ranking, homologado_por, dados_hierarquizacao FROM {} WHERE codigo=%s FOR UPDATE").format(_TABLE),
        (codigo,),
    ).fetchone()
    if not row:
        raise DemandaValidationError("Hierarquização não encontrada.", field="codigo")
    if row["status"] != esperado:
        raise DemandaValidationError(mensagem, field="status")
    return row


def homologar(codigo: str, usuario_id: Any) -> dict[str, Any] | None:
    """Homologa a rodada e conclui as demandas na mesma transação; não publica."""
    with get_connection() as conn:
        row = _bloquear_para_status(
            conn, codigo, "calculada", "Só é possível homologar uma hierarquização com ranking calculado.",
        )
        if not row["ranking"]:
            raise DemandaValidationError("Gere a síntese antes de homologar.", field="status")
        dados = deepcopy(row["dados_hierarquizacao"] or {})
        _concluir_demandas(conn, codigo, dados)
        _registrar_historico(dados, "homologada", usuario_id)
        conn.execute(
            sql.SQL("UPDATE {} SET status='homologada', homologado_em=now(), homologado_por=%s, dados_hierarquizacao=%s WHERE codigo=%s").format(_TABLE),
            (usuario_id, _prepare("dados_hierarquizacao", dados), codigo),
        )
        commit_unless_atomic(conn)
    return get_by_codigo(codigo)


def _reabrir_demandas(conn: Any, codigo: str, dados: dict[str, Any]) -> None:
    """Devolve as demandas a 'em hierarquização', salvo se outra rodada homologada as mantém."""
    row = conn.execute(
        sql.SQL("SELECT tipo_demanda_id FROM {} WHERE codigo=%s").format(_TABLE), (codigo,)
    ).fetchone()
    tabela = sql.Identifier("demandas", TIPO_DEMANDA_ID_TO_COD[row["tipo_demanda_id"]])
    ids = [o["cabecalho_objeto"]["demanda_id"] for o in dados.get("objetos") or []]
    if not ids:
        return
    permitida = conn.execute("""
        SELECT 1 FROM demandas.dom_status_demanda_transicao
        WHERE status_origem='hierarq_finalizada' AND status_destino=%s
    """, (STATUS_EM_HIERARQUIZACAO,)).fetchone()
    if not permitida:
        raise DemandaValidationError(
            "O domínio não permite reabrir a hierarquização das demandas. Aplique a migração 150.", field="status",
        )
    mantidas = {
        str(r["demanda_id"]) for r in conn.execute(
            sql.SQL("""
                SELECT DISTINCT o.item->'cabecalho_objeto'->>'demanda_id' AS demanda_id
                FROM {} h
                CROSS JOIN LATERAL jsonb_array_elements(COALESCE(h.dados_hierarquizacao->'objetos', '[]'::jsonb)) AS o(item)
                WHERE h.status='homologada' AND h.codigo<>%s AND h.tipo_demanda_id=%s
            """).format(_TABLE),
            (codigo, row["tipo_demanda_id"]),
        ).fetchall()
    }
    liberar = [i for i in ids if str(i) not in mantidas]
    if liberar:
        conn.execute(
            sql.SQL("UPDATE {} SET status=%s WHERE id=ANY(%s::uuid[]) AND status='hierarq_finalizada'").format(tabela),
            (STATUS_EM_HIERARQUIZACAO, liberar),
        )
    for objeto in dados.get("objetos") or []:
        cab = objeto["cabecalho_objeto"]
        if str(cab["demanda_id"]) in {str(i) for i in liberar} and cab.get("status") == "hierarq_finalizada":
            cab["status"] = STATUS_EM_HIERARQUIZACAO


def reverter_homologacao(codigo: str, usuario_id: Any) -> dict[str, Any] | None:
    """Reabre a rodada (volta a 'calculada') e devolve as demandas ao estado em hierarquização."""
    with get_connection() as conn:
        row = _bloquear_para_status(conn, codigo, "homologada", "Só é possível reverter uma hierarquização homologada.")
        dados = deepcopy(row["dados_hierarquizacao"] or {})
        _reabrir_demandas(conn, codigo, dados)
        if (dados.get("cabecalho_grupo", {}).get("publicacao") or {}).get("ativa"):
            dados["cabecalho_grupo"]["publicacao"]["ativa"] = False
            _registrar_historico(dados, "publicacao_revogada", usuario_id)
        _registrar_historico(dados, "revertida", usuario_id)
        conn.execute(
            sql.SQL("UPDATE {} SET status='calculada', homologado_em=NULL, homologado_por=NULL, dados_hierarquizacao=%s WHERE codigo=%s").format(_TABLE),
            (_prepare("dados_hierarquizacao", dados), codigo),
        )
        commit_unless_atomic(conn)
    return get_by_codigo(codigo)


def _liberar_demandas_universo(conn: Any, transicao: dict[str, Any]) -> None:
    """Reverte o status das demandas do universo na MESMA transação do delete.

    ``transicao`` = {"tabela": (schema, table), "ids": [...], "de": str, "para": str}.
    Só altera quem está exatamente no status de origem (idempotente e seguro).
    """
    ids = [i for i in (transicao.get("ids") or []) if i]
    if not ids:
        return
    schema, table = transicao["tabela"]
    tbl = sql.Identifier(schema, table)
    # Só liberamos quando nenhuma outra hierarquização usar um grupo que contenha o ID.
    liberaveis = []
    for demanda_id in ids:
        restante = conn.execute(
                        sql.SQL("""
                                SELECT 1
                                    FROM {hier_table} h
                                    JOIN demandas.grupos_demandas g ON g.id = h.grupo_demanda_id
                                 WHERE jsonb_path_exists(COALESCE(g.objetos, '[]'::jsonb), %s::jsonpath)
                                 LIMIT 1
                        """).format(hier_table=_TABLE),
            (f'$[*] ? (@.id == "{demanda_id}")',),
        ).fetchone()
        if not restante:
            liberaveis.append(demanda_id)
    if liberaveis:
        conn.execute(
            sql.SQL("UPDATE {tbl} SET status = %s WHERE id = ANY(%s::uuid[]) AND status = ANY(%s::text[])").format(tbl=tbl),
            (transicao["para"], liberaveis, [transicao["de"], *transicao.get("de_adicionais", [])]),
        )


def delete_by_codigo(
    codigo: str, *, liberar_demandas: dict[str, Any] | None = None
) -> bool:
    """Remove uma hierarquização pelo código legível.

    Quando ``liberar_demandas`` é informado, as demandas do universo voltam ao
    status de origem na mesma transação — ficando disponíveis para nova análise.
    """
    query = sql.SQL("DELETE FROM {table} WHERE codigo = %s RETURNING id").format(table=_TABLE)
    with get_connection() as conn:
        # A configuração de portfólio guarda uma cópia independente dos
        # critérios/premissas da hierarquização. Ao remover a origem, preserve
        # essa configuração e desfaça somente o vínculo de procedência. Isso
        # precisa ocorrer na mesma transação, antes do DELETE, por causa da FK
        # fk_config_portfolio_hierarquizacao_origem (ON DELETE RESTRICT).
        conn.execute(
            sql.SQL(
                "UPDATE ahp.config_multicriterio_portfolio c "
                "SET hierarquizacao_id = NULL, atualizado_em = now() "
                "FROM {table} h "
                "WHERE h.codigo = %s AND c.hierarquizacao_id = h.id"
            ).format(table=_TABLE),
            (codigo,),
        )
        cur = conn.execute(query, (codigo,))
        deleted = cur.fetchone()
        if deleted and liberar_demandas:
            _liberar_demandas_universo(conn, liberar_demandas)
        conn.commit()
    return deleted is not None


def intersecoes_camada(camada_id: str, *, longitude: float, latitude: float) -> list[dict[str, Any]]:
    from api.repositories import camada_geoespacial_repository as camadas
    from shapely.geometry import Point, mapping
    loaded = camadas.carregar_vetor(camada_id)
    if not loaded:
        return []
    frame, metadata = loaded
    spatial = _gdal_reproject(frame, 4326)
    indices = spatial.sindex.query(Point(longitude,latitude), predicate='intersects')
    return [{'camada_id':str(metadata['id']), 'camada_origem':metadata['nome'],
             'versao':'', 'finalidade':(metadata.get('metadados') or {}).get('finalidade'),
             'ordem':int(index), 'propriedades':camadas._json_safe(spatial.drop(columns=spatial.geometry.name).iloc[index].to_dict()),
             'geometria':mapping(spatial.geometry.iloc[index])} for index in sorted(indices)]


def conjuntos_camada(camada_id: str) -> list[str]:
    from api.repositories.camada_geoespacial_repository import carregar_vetor
    loaded = carregar_vetor(camada_id)
    if not loaded or 'conjunto' not in loaded[0]:
        return []
    return sorted(str(value) for value in loaded[0]['conjunto'].dropna().unique())


def camada_homologada(camada_id: str) -> dict[str, Any] | None:
    """Nome legado do contrato; resolve uma saída do catálogo no Storage."""
    from api.repositories.saidas_geoespaciais_repository import listar
    for row in listar():
        if camada_id in {row['id'],str((row.get('metadados') or {}).get('id_banco',''))}:
            return {**row,'versao':'','finalidade':(row.get('metadados') or {}).get('finalidade')}
    from api.repositories import camada_geoespacial_repository as camadas
    with get_connection() as conn:
        found=camadas._find_layer(conn,camada_id)
    if not found or found[0]!='processadas':
        return None
    row=found[1]
    return {**row,'id':str(row['id']),'versao':'','finalidade':(row.get('metadados') or {}).get('finalidade')}


def listar_pacotes_homologados(modulo: str) -> list[dict[str, Any]]:
    """Pacotes de homologação descontinuados; nenhum novo snapshot é criado."""
    return []


def obter_pacote_homologado(pacote_id: str, modulo: str) -> dict[str, Any] | None:
    return next((p for p in listar_pacotes_homologados(modulo) if p["pacote_id"] == pacote_id), None)


def listar_fatiamentos_fase1() -> list[dict[str, Any]]:
    with get_connection() as conn:
        return list(conn.execute("""SELECT id::text AS id,codigo,nome,descricao,padrao,parametros
            FROM geoprocessamento.configuracao_fatiamento_fase1
            WHERE ativo ORDER BY padrao DESC,nome""").fetchall())


def obter_fatiamento_fase1(config_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        return conn.execute("""SELECT id::text AS id,codigo,nome,descricao,padrao,parametros
            FROM geoprocessamento.configuracao_fatiamento_fase1 WHERE id=%s::uuid AND ativo""", (config_id,)).fetchone()


def obter_fatiamento_padrao_fase1() -> dict[str, Any] | None:
    """Classificação padrão da Fase 1 (risco + restrição binária) aplicada em toda execução."""
    with get_connection() as conn:
        return conn.execute("""SELECT id::text AS id,codigo,nome,descricao,padrao,parametros
            FROM geoprocessamento.configuracao_fatiamento_fase1
            WHERE ativo ORDER BY padrao DESC, nome LIMIT 1""").fetchone()


def salvar_fatiamento_fase1(data: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute(
            """INSERT INTO geoprocessamento.configuracao_fatiamento_fase1
                (codigo,nome,descricao,parametros) VALUES (%s,%s,%s,%s)
                ON CONFLICT (codigo) DO UPDATE SET nome=EXCLUDED.nome,descricao=EXCLUDED.descricao,
                  parametros=EXCLUDED.parametros,atualizado_em=CURRENT_TIMESTAMP
                RETURNING id::text AS id,codigo,nome,descricao,padrao,parametros""",
            (data["codigo"], data["nome"], data.get("descricao"), Jsonb(data["parametros"])),
        ).fetchone()
        conn.commit()
        if not row:
            raise RuntimeError("A configuração de fatiamento não foi persistida.")
        return row


def raster_homologado(camada_id: str) -> dict[str, Any] | None:
    """Contrato de leitura legado, agora servido pelo arquivo no Storage."""
    from api.repositories.camada_geoespacial_repository import carregar_raster
    loaded=carregar_raster(camada_id)
    if not loaded:
        return None
    content,metadata=loaded
    return {**metadata,'id':str(metadata['id']),'versao':'','dados_geotiff':content,
            'hash_conteudo':metadata.get('sha256'),'perfil':metadata.get('perfil',{})}
