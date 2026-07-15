"""Repository — Módulo Geoespacial."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from psycopg import sql
from psycopg.types.json import Jsonb

from api.db.connection import get_connection


class GeoespacialRepository:
    """Repository para operações geoespaciais."""

    def __init__(self) -> None:
        self._camadas: dict[str, dict[str, Any]] = {}
        self._funcoes: dict[str, dict[str, Any]] = {}
        self._fluxos: dict[str, dict[str, Any]] = {}
        self._fontes: dict[str, dict[str, Any]] = {}
        self._criterios_fase2: dict[str, dict[str, Any]] = {}
        self._atributos_fase3: dict[str, dict[str, Any]] = {}
        self._pacotes_fase1: dict[str, dict[str, Any]] = {}
        self._pacotes_fase2: dict[str, dict[str, Any]] = {}
        self._rodadas_fase3: dict[str, dict[str, Any]] = {}

    # ==================== PRODUTOS GERADORES (POSTGIS) ====================

    async def listar_produtos_geradores(self, modulo: str | None = None) -> list[dict[str, Any]]:
        query = """
            SELECT p.*, COALESCE(f1.configuracao, f2.configuracao, '{}'::jsonb) AS configuracao
              FROM geoprocessamento.produto p
              LEFT JOIN geoprocessamento.produto_fase1 f1 ON f1.produto_id = p.id
              LEFT JOIN geoprocessamento.produto_fase2 f2 ON f2.produto_id = p.id
        """
        params: tuple[Any, ...] = ()
        if modulo:
            query += " WHERE p.modulo = %s"
            params = (modulo,)
        query += " ORDER BY p.atualizado_em DESC"
        with get_connection() as conn:
            return [dict(row) for row in conn.execute(query, params).fetchall()]

    async def criar_produto_gerador(self, data: dict[str, Any]) -> dict[str, Any]:
        modulo = data["modulo"]
        configuracao = data.pop("configuracao", {})
        metadados = data.get("metadados", {})
        data["metadados"] = Jsonb(metadados)
        columns = list(data)
        query = sql.SQL(
            "INSERT INTO geoprocessamento.produto ({}) VALUES ({}) RETURNING id"
        ).format(
            sql.SQL(", ").join(map(sql.Identifier, columns)),
            sql.SQL(", ").join(sql.Placeholder(column) for column in columns),
        )
        with get_connection() as conn:
            row = conn.execute(query, data).fetchone()
            if not row:
                raise RuntimeError("Cadastro do produto não retornou identificador")
            produto_id = row["id"]
            if modulo == "fase1":
                conn.execute(
                    """INSERT INTO geoprocessamento.produto_fase1
                       (produto_id, regra_sobreposicao, regra_conflito_atributos, restricao_prevalece, configuracao)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (produto_id, configuracao.get("regra_sobreposicao", "identity"),
                     configuracao.get("regra_conflito_atributos", "prefixo_fonte"),
                     configuracao.get("restricao_prevalece", True), Jsonb(configuracao)),
                )
            elif modulo == "fase2":
                conn.execute(
                    """INSERT INTO geoprocessamento.produto_fase2
                       (produto_id, resolucao, unidade_resolucao, regra_nodata, metodo_combinacao, configuracao)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (produto_id, configuracao.get("resolucao", 50), configuracao.get("unidade_resolucao", "m"),
                     configuracao.get("regra_nodata", "bloquear"), configuracao.get("metodo_combinacao", "media_ponderada"),
                     Jsonb(configuracao)),
                )
            else:
                raise ValueError("Módulo deve ser fase1 ou fase2")
            conn.commit()
        return await self.obter_produto_gerador(str(produto_id)) or {}

    async def obter_produto_gerador(self, produto_id: str) -> dict[str, Any] | None:
        query = """
            SELECT p.*, COALESCE(f1.configuracao, f2.configuracao, '{}'::jsonb) AS configuracao
              FROM geoprocessamento.produto p
              LEFT JOIN geoprocessamento.produto_fase1 f1 ON f1.produto_id = p.id
              LEFT JOIN geoprocessamento.produto_fase2 f2 ON f2.produto_id = p.id
             WHERE p.id = %s
        """
        with get_connection() as conn:
            row = conn.execute(query, (produto_id,)).fetchone()
            return dict(row) if row else None

    async def criar_fluxo_produto(self, produto_id: str, data: dict[str, Any]) -> dict[str, Any]:
        itens = data.pop("itens", [])
        with get_connection() as conn:
            row = conn.execute(
                """INSERT INTO geoprocessamento.configuracao_fluxo (produto_id, nome, descricao)
                   VALUES (%s, %s, %s) RETURNING *""",
                (produto_id, data["nome"], data.get("descricao")),
            ).fetchone()
            if not row:
                raise RuntimeError("Cadastro do fluxo não retornou identificador")
            for ordem, item in enumerate(itens, start=1):
                conn.execute(
                    """INSERT INTO geoprocessamento.configuracao_fluxo_item
                       (fluxo_id, ordem, tipo, referencia_id, nome_snapshot, parametros, mapeamento_entrada, mapeamento_saida)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (row["id"], item.get("ordem", ordem), item["tipo"], item["referencia_id"], item.get("nome"),
                     Jsonb(item.get("parametros", {})), Jsonb(item.get("entrada", {})), Jsonb(item.get("saida", {}))),
                )
            conn.commit()
            result = dict(row)
            result["itens"] = itens
            return result

    async def listar_fluxos_produto(self, produto_id: str) -> list[dict[str, Any]]:
        with get_connection() as conn:
            fluxos = [dict(row) for row in conn.execute(
                "SELECT * FROM geoprocessamento.configuracao_fluxo WHERE produto_id=%s ORDER BY atualizado_em DESC",
                (produto_id,),
            ).fetchall()]
            for fluxo in fluxos:
                fluxo["itens"] = [dict(item) for item in conn.execute(
                    "SELECT tipo, referencia_id, nome_snapshot AS nome, ordem, parametros, mapeamento_entrada AS entrada, mapeamento_saida AS saida FROM geoprocessamento.configuracao_fluxo_item WHERE fluxo_id=%s ORDER BY ordem",
                    (fluxo["id"],),
                ).fetchall()]
            return fluxos

    # ==================== CAMADAS ====================

    async def listar_camadas(self) -> list[dict[str, Any]]:
        """Lista todas as camadas."""
        return list(self._camadas.values())

    async def criar_camada(self, camada: dict[str, Any]) -> dict[str, Any]:
        """Cria uma nova camada."""
        camada_id = camada.get("id") or f"camada_{len(self._camadas) + 1}"
        camada["id"] = camada_id
        camada["data_importacao"] = datetime.now().isoformat()
        self._camadas[camada_id] = camada
        return camada

    async def obter_camada(self, camada_id: str) -> dict[str, Any] | None:
        """Obtém uma camada por ID."""
        return self._camadas.get(camada_id)

    async def deletar_camada(self, camada_id: str) -> bool:
        """Deleta uma camada."""
        if camada_id in self._camadas:
            del self._camadas[camada_id]
            return True
        return False

    # ==================== FONTES (FASE 1) ====================

    async def listar_fontes(self) -> list[dict[str, Any]]:
        """Lista fontes persistidas no banco geoespacial."""
        with get_connection() as conn:
            rows = conn.execute("SELECT * FROM geoprocessamento.fonte ORDER BY atualizado_em DESC").fetchall()
            return [self._fonte_db_para_schema(dict(row)) for row in rows]

    async def criar_fonte(self, fonte: dict[str, Any]) -> dict[str, Any]:
        """Cria uma fonte no PostgreSQL/PostGIS."""
        codigo = fonte.get("fonte_id") or f"fonte_{uuid4().hex[:12]}"
        extras = {key: fonte.get(key) for key in (
            "tipo_tratamento", "criterio_associado", "base_legal_ou_tecnica",
            "severidade_padrao", "observacao_metodologica"
        )}
        with get_connection() as conn:
            row = conn.execute(
                """INSERT INTO geoprocessamento.fonte
                   (codigo,nome,tipo,url_origem,arquivo_origem,orgao_responsavel,data_referencia,importado_em,metadados)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP,%s) RETURNING *""",
                (codigo, fonte["nome_fonte"], fonte["tipo_fonte"], fonte.get("url_origem"),
                 fonte.get("arquivo_origem"), fonte.get("orgao_responsavel"),
                 fonte.get("data_referencia_dado"), Jsonb(extras)),
            ).fetchone()
            conn.commit()
            if not row:
                raise RuntimeError("Cadastro da fonte não retornou registro")
            return self._fonte_db_para_schema(dict(row))

    async def obter_fonte(self, fonte_id: str) -> dict[str, Any] | None:
        """Obtém uma fonte persistida por UUID ou código."""
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM geoprocessamento.fonte WHERE id::text=%s OR codigo=%s",
                (fonte_id, fonte_id),
            ).fetchone()
            return self._fonte_db_para_schema(dict(row)) if row else None

    @staticmethod
    def _fonte_db_para_schema(row: dict[str, Any]) -> dict[str, Any]:
        meta = row.get("metadados") or {}
        return {
            "fonte_id": row["codigo"], "nome_fonte": row["nome"], "tipo_fonte": row["tipo"],
            "url_origem": row.get("url_origem"), "arquivo_origem": row.get("arquivo_origem"),
            "orgao_responsavel": row.get("orgao_responsavel"),
            "data_importacao": row.get("importado_em") or row["criado_em"],
            "data_referencia_dado": None, "tipo_tratamento": meta.get("tipo_tratamento", "insumo_para_risco_derivado"),
            "criterio_associado": meta.get("criterio_associado"),
            "base_legal_ou_tecnica": meta.get("base_legal_ou_tecnica"),
            "severidade_padrao": meta.get("severidade_padrao"),
            "observacao_metodologica": meta.get("observacao_metodologica"),
        }

    # ==================== CRITÉRIOS (FASE 2) ====================

    async def listar_criterios_fase2(self) -> list[dict[str, Any]]:
        """Lista critérios persistidos da Fase 2."""
        with get_connection() as conn:
            rows = conn.execute("SELECT * FROM geoprocessamento.criterio_fase2 WHERE ativo ORDER BY nome").fetchall()
            return [self._criterio_db_para_schema(dict(row)) for row in rows]

    async def criar_criterio_fase2(self, criterio: dict[str, Any]) -> dict[str, Any]:
        """Cria um critério da Fase 2 no banco."""
        codigo = criterio.get("criterio_id") or f"criterio_{uuid4().hex[:12]}"
        config = {key: criterio.get(key) for key in (
            "fonte_id", "peso_ahp", "resolucao_saida", "crs_saida", "extensao_processamento"
        )}
        with get_connection() as conn:
            row = conn.execute(
                """INSERT INTO geoprocessamento.criterio_fase2
                   (codigo,nome,dimensao,tipo_dado_entrada,operador_espacial,relacao,unidade_original,regra_normalizacao,observacao_metodologica,configuracao)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                (codigo, criterio["criterio_nome"], criterio.get("dimensao"), criterio["tipo_dado_entrada"],
                 criterio["operador_espacial"], criterio["relacao"], criterio.get("unidade_original"),
                 criterio["regra_normalizacao"], criterio.get("observacao_metodologica"), Jsonb(config)),
            ).fetchone()
            conn.commit()
            if not row:
                raise RuntimeError("Cadastro do critério não retornou registro")
            return self._criterio_db_para_schema(dict(row))

    async def obter_criterio_fase2(self, criterio_id: str) -> dict[str, Any] | None:
        """Obtém um critério persistido por UUID ou código."""
        with get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM geoprocessamento.criterio_fase2 WHERE id::text=%s OR codigo=%s",
                (criterio_id, criterio_id),
            ).fetchone()
            return self._criterio_db_para_schema(dict(row)) if row else None

    @staticmethod
    def _criterio_db_para_schema(row: dict[str, Any]) -> dict[str, Any]:
        config = row.get("configuracao") or {}
        return {
            "criterio_id": row["codigo"], "criterio_nome": row["nome"], "dimensao": row.get("dimensao"),
            "fonte_id": config.get("fonte_id"), "tipo_dado_entrada": row["tipo_dado_entrada"],
            "operador_espacial": row["operador_espacial"], "relacao": row["relacao"],
            "peso_ahp": config.get("peso_ahp", 0), "unidade_original": row.get("unidade_original"),
            "regra_normalizacao": row["regra_normalizacao"], "resolucao_saida": config.get("resolucao_saida"),
            "crs_saida": config.get("crs_saida"), "extensao_processamento": config.get("extensao_processamento"),
            "observacao_metodologica": row.get("observacao_metodologica"),
        }

    # ==================== ATRIBUTOS (FASE 3) ====================

    async def listar_atributos_fase3(self) -> list[dict[str, Any]]:
        """Lista todos os atributos da Fase 3."""
        return list(self._atributos_fase3.values())

    async def criar_atributo_fase3(self, atributo: dict[str, Any]) -> dict[str, Any]:
        """Cria um novo atributo da Fase 3."""
        atributo_id = atributo.get("atributo_id") or f"atributo_{len(self._atributos_fase3) + 1}"
        atributo["atributo_id"] = atributo_id
        self._atributos_fase3[atributo_id] = atributo
        return atributo

    async def obter_atributo_fase3(self, atributo_id: str) -> dict[str, Any] | None:
        """Obtém um atributo por ID."""
        return self._atributos_fase3.get(atributo_id)

    # ==================== PACOTES (FASE 1) ====================

    async def listar_pacotes_fase1(self) -> list[dict[str, Any]]:
        """Lista todos os pacotes da Fase 1."""
        return list(self._pacotes_fase1.values())

    async def criar_pacote_fase1(self, pacote: dict[str, Any]) -> dict[str, Any]:
        """Cria um novo pacote da Fase 1."""
        pacote_id = pacote.get("pacote_id") or f"fase1_pacote_{len(self._pacotes_fase1) + 1}"
        pacote["pacote_id"] = pacote_id
        pacote["data_criacao"] = datetime.now()
        pacote["status"] = "rascunho"
        self._pacotes_fase1[pacote_id] = pacote
        return pacote

    async def obter_pacote_fase1(self, pacote_id: str) -> dict[str, Any] | None:
        """Obtém um pacote por ID."""
        return self._pacotes_fase1.get(pacote_id)

    async def homologar_pacote_fase1(self, pacote_id: str, responsavel: str) -> dict[str, Any] | None:
        """Homologa um pacote da Fase 1."""
        pacote = self._pacotes_fase1.get(pacote_id)
        if pacote:
            pacote["status"] = "homologado"
            pacote["data_homologacao"] = datetime.now()
            pacote["responsavel_tecnico"] = responsavel
            return pacote
        return None

    # ==================== PACOTES (FASE 2) ====================

    async def listar_pacotes_fase2(self) -> list[dict[str, Any]]:
        """Lista todos os pacotes da Fase 2."""
        return list(self._pacotes_fase2.values())

    async def criar_pacote_fase2(self, pacote: dict[str, Any]) -> dict[str, Any]:
        """Cria um novo pacote da Fase 2."""
        pacote_id = pacote.get("pacote_id") or f"fase2_pacote_{len(self._pacotes_fase2) + 1}"
        pacote["pacote_id"] = pacote_id
        pacote["data_criacao"] = datetime.now()
        pacote["status"] = "rascunho"
        self._pacotes_fase2[pacote_id] = pacote
        return pacote

    async def obter_pacote_fase2(self, pacote_id: str) -> dict[str, Any] | None:
        """Obtém um pacote por ID."""
        return self._pacotes_fase2.get(pacote_id)

    async def homologar_pacote_fase2(self, pacote_id: str, responsavel: str) -> dict[str, Any] | None:
        """Homologa um pacote da Fase 2."""
        pacote = self._pacotes_fase2.get(pacote_id)
        if pacote:
            pacote["status"] = "homologado"
            pacote["data_homologacao"] = datetime.now()
            pacote["responsavel_tecnico"] = responsavel
            return pacote
        return None

    # ==================== RODADAS (FASE 3) ====================

    async def listar_rodadas_fase3(self) -> list[dict[str, Any]]:
        """Lista todas as rodadas da Fase 3."""
        return list(self._rodadas_fase3.values())

    async def criar_rodada_fase3(self, rodada: dict[str, Any]) -> dict[str, Any]:
        """Cria uma nova rodada da Fase 3."""
        rodada_id = rodada.get("rodada_id") or f"fase3_rodada_{len(self._rodadas_fase3) + 1}"
        rodada["rodada_id"] = rodada_id
        rodada["data_importacao"] = datetime.now()
        rodada["status"] = "rascunho"
        self._rodadas_fase3[rodada_id] = rodada
        return rodada

    async def obter_rodada_fase3(self, rodada_id: str) -> dict[str, Any] | None:
        """Obtém uma rodada por ID."""
        return self._rodadas_fase3.get(rodada_id)

    async def homologar_rodada_fase3(self, rodada_id: str, responsavel: str) -> dict[str, Any] | None:
        """Homologa uma rodada da Fase 3."""
        rodada = self._rodadas_fase3.get(rodada_id)
        if rodada:
            rodada["status"] = "homologado"
            rodada["data_homologacao"] = datetime.now()
            rodada["responsavel"] = responsavel
            return rodada
        return None

    # ==================== FUNÇÕES E FLUXOS ====================

    async def listar_funcoes(self) -> list[dict[str, Any]]:
        """Lista todas as funções."""
        return list(self._funcoes.values())

    async def listar_fluxos(self) -> list[dict[str, Any]]:
        """Lista todos os fluxos."""
        return list(self._fluxos.values())


geoespacial_repository = GeoespacialRepository()
