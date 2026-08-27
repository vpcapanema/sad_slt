"""Limpa e recria exemplos integrados de hierarquização e julgamento colaborativo."""
from __future__ import annotations

import math
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from psycopg.types.json import Jsonb

from api.db.connection import get_connection
from api.services import ahp_engine


NAMESPACE = uuid.UUID("b620f426-82ed-47aa-96a8-c72e39cbb782")
CRITERIOS = [
    {"criterio": "Impacto estratégico", "premissa": "Maior alinhamento estratégico é preferível.", "dimensao": "Estratégia"},
    {"criterio": "Urgência", "premissa": "Maior urgência exige priorização.", "dimensao": "Prazo"},
    {"criterio": "Benefício social", "premissa": "Maior alcance social é preferível.", "dimensao": "Sociedade"},
    {"criterio": "Viabilidade", "premissa": "Maior viabilidade técnica e financeira é preferível.", "dimensao": "Execução"},
]


def uid(chave: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, chave)


def matriz_pesos(pesos: list[float]) -> list[list[float]]:
    return [[pesos[i] / pesos[j] for j in range(len(pesos))] for i in range(len(pesos))]


def matriz_geometrica(matrizes: list[list[list[float]]]) -> list[list[float]]:
    n = len(matrizes[0])
    return [[math.exp(sum(math.log(m[i][j]) for m in matrizes) / len(matrizes)) for j in range(n)] for i in range(n)]


def main() -> None:
    agora = datetime.now(timezone.utc)
    with get_connection() as conn:
        projetos = [dict(row) for row in conn.execute(
            """SELECT id, codigo, nome, status FROM demandas.projeto
                 WHERE codigo LIKE 'I-PRJ-TESTE-%'
                 ORDER BY codigo LIMIT 12"""
        ).fetchall()]
        if len(projetos) < 8:
            raise RuntimeError("São necessárias pelo menos oito demandas de exemplo I-PRJ-TESTE.")

        # Desvincula somente a referência impeditiva; configurações não são apagadas.
        conn.execute("UPDATE ahp.config_multicriterio_portfolio SET hierarquizacao_id = NULL WHERE hierarquizacao_id IS NOT NULL")
        conn.execute("DELETE FROM ahp.comparacao_colaborativa_resposta")
        conn.execute("DELETE FROM ahp.comparacao_colaborativa_ambiente")
        conn.execute("DELETE FROM hierarquizacao_demandas.hierarquizacao_portfolio")

        cenarios = [
            ("HIER-EX-001", "Corredores rodoviários prioritários", "ativa", agora + timedelta(days=30)),
            ("HIER-EX-002", "Modernização da infraestrutura ferroviária", "ativa", agora + timedelta(days=45)),
            ("HIER-EX-003", "Segurança e resiliência da malha", "consolidada", agora + timedelta(days=60)),
            ("HIER-EX-004", "Acessibilidade e integração regional", "encerrada", agora - timedelta(days=2)),
        ]
        pesos_respostas = [
            [0.45, 0.25, 0.20, 0.10],
            [0.35, 0.30, 0.20, 0.15],
            [0.30, 0.20, 0.35, 0.15],
        ]

        for indice, (codigo, nome, status_ambiente, prazo) in enumerate(cenarios):
            hier_id = uid(f"hier-{indice + 1}")
            ambiente_id = uid(f"ambiente-{indice + 1}")
            objetos = [projetos[(indice * 3 + deslocamento) % len(projetos)] for deslocamento in range(3)]
            objetos_json = [{"id": str(p["id"]), "codigo": p["codigo"], "nome": p["nome"], "status": p["status"]} for p in objetos]
            dados = {
                "versao": 1,
                "cabecalho_grupo": {
                    "codigo": codigo, "nome": nome,
                    "descricao": "Registro de exemplo para testes integrados do fluxo colaborativo.",
                    "tipo_demanda": "projeto", "quantidade_objetos": len(objetos_json),
                    "fases_a_executar": [], "pacotes": {}, "criado_em": agora.isoformat(),
                },
                "objetos": [{"cabecalho_objeto": objeto} for objeto in objetos_json],
            }
            conn.execute(
                """INSERT INTO hierarquizacao_demandas.hierarquizacao_portfolio
                   (id,codigo,nome,descricao,status,objetos,tipo_demanda_id,grupo_id,dados_hierarquizacao,criado_em,atualizado_em)
                   VALUES (%s,%s,%s,%s,'em_julgamento',%s,3,%s,%s,%s,%s)""",
                (hier_id, codigo, nome, "Exemplo para validação das ferramentas de hierarquização e AHP.", Jsonb(objetos_json), f"EXEMPLO-{indice + 1}", Jsonb(dados), agora - timedelta(days=10 - indice), agora),
            )

            convites = [{"email": f"especialista{numero}.ex{indice + 1}@exemplo.gov.br"} for numero in range(1, 4)]
            matrizes_enviadas = [matriz_pesos(p) for p in pesos_respostas]
            consolidacao = None
            if status_ambiente == "consolidada":
                consolidada = matriz_geometrica(matrizes_enviadas)
                analise = ahp_engine.analyze_matrix(consolidada)
                consolidacao = (Jsonb(consolidada), Jsonb(analise["weights"]), analise["lambdaMax"], analise["CI"], analise["RI"], analise["CR"], analise["CR"] < 0.10, 3, agora)
            else:
                consolidacao = (None, None, None, None, None, None, None, None, None)
            conn.execute(
                """INSERT INTO ahp.comparacao_colaborativa_ambiente
                   (id,token,convites,valido_ate,status,criterios,n_criterios,hierarquizacao_id,hierarquizacao_codigo,
                    matriz_consolidada,pesos_consolidados,lambda_max,indice_consistencia,indice_aleatorio,
                    razao_consistencia,consistente,respostas_consolidadas,consolidado_em,criado_em,atualizado_em)
                   VALUES (%s,%s,%s,%s,%s,%s,4,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (ambiente_id, f"exemplo-colaborativo-{indice + 1:02d}-{uid(f'token-{indice + 1}').hex[:20]}", Jsonb(convites), prazo, status_ambiente, Jsonb(CRITERIOS), hier_id, codigo, *consolidacao, agora - timedelta(days=7 - indice), agora),
            )

            enviados = 3 if status_ambiente == "consolidada" else (1 if indice == 1 else 2)
            if status_ambiente == "encerrada":
                enviados = 2
            for resposta_indice in range(enviados):
                matriz = matrizes_enviadas[resposta_indice]
                analise = ahp_engine.analyze_matrix(matriz)
                email = convites[resposta_indice]["email"]
                conn.execute(
                    """INSERT INTO ahp.comparacao_colaborativa_resposta
                       (id,ambiente_id,nome_completo,email,instituicao,matriz_comparacao,lambda_max,
                        indice_consistencia,indice_aleatorio,razao_consistencia,consistente,estatisticas,
                        status,iniciado_em,atualizado_em,enviado_em)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,TRUE,%s,'enviada',%s,%s,%s)""",
                    (uid(f"resposta-{indice + 1}-{resposta_indice + 1}"), ambiente_id, f"Especialista {resposta_indice + 1} do cenário {indice + 1}", email, "Instituição de exemplo", Jsonb(matriz), analise["lambdaMax"], analise["CI"], analise["RI"], analise["CR"], Jsonb({"duracao_ms": 180000 + resposta_indice * 45000, "revisoes_por_par": {"0_1": 2, "0_2": 1}}), agora - timedelta(days=3), agora - timedelta(days=2), agora - timedelta(days=2)),
                )

            if status_ambiente == "ativa" and enviados < 3:
                email = convites[enviados]["email"]
                conn.execute(
                    """INSERT INTO ahp.comparacao_colaborativa_resposta
                       (id,ambiente_id,nome_completo,email,instituicao,matriz_comparacao,consistente,
                        estatisticas,status,iniciado_em,atualizado_em,enviado_em)
                       VALUES (%s,%s,%s,%s,%s,%s,FALSE,%s,'em_preenchimento',%s,%s,NULL)""",
                    (uid(f"resposta-{indice + 1}-rascunho"), ambiente_id, f"Especialista em preenchimento {indice + 1}", email, "Instituição de exemplo", Jsonb(matriz_pesos([0.4, 0.3, 0.2, 0.1])), Jsonb({"revisoes_por_par": {"0_1": 1}}), agora - timedelta(hours=6), agora - timedelta(minutes=20)),
                )

        conn.commit()
        totais = conn.execute(
            """SELECT
              (SELECT count(*) FROM hierarquizacao_demandas.hierarquizacao_portfolio) hierarquizacoes,
              (SELECT count(*) FROM ahp.comparacao_colaborativa_ambiente) ambientes,
              (SELECT count(*) FROM ahp.comparacao_colaborativa_resposta) respostas,
              (SELECT count(*) FROM ahp.comparacao_colaborativa_resposta WHERE status='em_preenchimento') em_preenchimento"""
        ).fetchone()
        print(dict(totais))


if __name__ == "__main__":
    main()
