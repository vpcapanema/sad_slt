#!/usr/bin/env python3
"""Gera 2 configs Fase 1 e 2 configs Fase 2 válidas (testes práticos AHP).

Uso (na raiz do repositório):
    python scripts/seed_configs_ahp_teste.py

Requisitos: SLT_DATABASE_URL, projetos SEED com status hierarq_apta (031_seed).
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.db.connection import get_connection
from api.schemas.config_multicriterio import (
    ConfigCreateSchema,
    ConfigResponseSchema,
    ConfigUpdateSchema,
)
from api.services import config_multicriterio_service as svc
from api.services.ahp_engine import analyze_matrix

MATRIZ_3 = [[1, 2, 4], [0.5, 1, 2], [0.25, 0.5, 1]]
MATRIZ_4 = [[1, 2, 3, 4], [0.5, 1, 2, 3], [1 / 3, 0.5, 1, 2], [0.25, 1 / 3, 0.5, 1]]

CRITERIOS_3 = [
    {
        "dimensao": "Técnica",
        "criterio": "VDM — Volume Diário Médio",
        "premissa": "O tráfego elevado indica necessidade de intervenção na infraestrutura.",
        "relacao": "↑ Positiva",
        "metricas": "Veículos/dia (contagem permanente)",
        "fonte": "DER-SP / DNIT",
        "mandatorio": "Não",
    },
    {
        "dimensao": "Financeiro",
        "criterio": "Custo total de investimento (CAPEX)",
        "premissa": "Recursos limitados exigem comparar a eficiência do gasto público.",
        "relacao": "↓ Negativa",
        "metricas": "R$ (valor presente)",
        "fonte": "Orçamento do empreendimento",
        "mandatorio": "Não",
    },
    {
        "dimensao": "Ambiental",
        "criterio": "Emissões de GEE evitadas",
        "premissa": "A sustentabilidade orienta a priorização conforme o PLI-SP 2050.",
        "relacao": "↑ Positiva",
        "metricas": "tCO₂e/ano",
        "fonte": "Inventário de emissões",
        "mandatorio": "Não",
    },
]

CRITERIOS_4 = [
    {
        "dimensao": "Técnica",
        "criterio": "Índice de conservação do pavimento (ICP)",
        "premissa": "A condição física da via reflete a urgência de manutenção.",
        "relacao": "↓ Negativa",
        "metricas": "ICP (0–100)",
        "fonte": "Levantamento rodoviário",
        "mandatorio": "Não",
    },
    {
        "dimensao": "Social",
        "criterio": "População beneficiada",
        "premissa": "A equidade regional deve orientar a alocação de recursos.",
        "relacao": "↑ Positiva",
        "metricas": "Habitantes no entorno",
        "fonte": "IBGE / RAIO de influência",
        "mandatorio": "Não",
    },
    {
        "dimensao": "Econômica",
        "criterio": "Redução do tempo de viagem",
        "premissa": "Ganhos de produtividade regional sustentam a priorização.",
        "relacao": "↑ Positiva",
        "metricas": "Horas/ano economizadas",
        "fonte": "Modelo de demanda",
        "mandatorio": "Não",
    },
    {
        "dimensao": "Institucional",
        "criterio": "Alinhamento ao plano de investimentos",
        "premissa": "Coerência institucional reduz risco de execução e retrabalho.",
        "relacao": "↑ Positiva",
        "metricas": "Checklist de conformidade",
        "fonte": "Plano plurianual / portfolio",
        "mandatorio": "Sim",
    },
]


def _fetch_projetos(limit: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id::text, codigo, nome
            FROM demandas.projeto
            WHERE status = 'hierarq_apta'
              AND codigo LIKE %s
            ORDER BY codigo
            LIMIT %s
            """,
            ("PROJ-SEED-%", limit),
        ).fetchall()
    return [
        {
            "id": r["id"],
            "codigo": r["codigo"],
            "nome": r["nome"],
            "tipo_demanda": "projeto",
        }
        for r in rows
    ]


def _promover_fase_2(tipo: str, codigo: str, criterios: list, matriz: list) -> ConfigResponseSchema:
    svc.atualizar_config(
        tipo,
        codigo,
        ConfigUpdateSchema(
            nome=None,
            criterios=criterios,
            matriz_comparacao=matriz,
            n_criterios=len(criterios),
            metodo_entrada="manual",
            metodo_comparacao="formulario",
            pacote_fase="fase_2",
            alertas_conceituais=[],
        ),
    )
    calc = svc.calcular_config(tipo, codigo)
    if not calc.consistente:
        raise RuntimeError(f"{codigo}: matriz inconsistente (RC={calc.razao_consistencia})")
    return calc


def main() -> None:
    for label, m in [("3×3", MATRIZ_3), ("4×4", MATRIZ_4)]:
        r = analyze_matrix(m)
        if r["CR"] >= 0.10:
            raise RuntimeError(f"Matriz {label} inválida para teste (RC={r['CR']})")

    projetos = _fetch_projetos(8)
    if len(projetos) < 5:
        print("ERRO: são necessários ao menos 5 projetos SEED com status hierarq_apta.\nExecute database/031_seed_planos_programas_projetos.sql e atualize status.")
        sys.exit(1)

    # --- Fase 1 (Etapa 1): duas configs distintas ---
    f1_avulsa = svc.criar_config(
        ConfigCreateSchema(
            tipo="avulsa",
            tipo_demanda=None,
            nome="[TESTE] Aptidão de alternativas de corredor logístico à expansão",
            area_conhecimento="Infraestrutura de transportes",
            tema="Logística",
            fenomeno="Aptidão",
            objetivo=(
                "Comparar alternativas de corredor logístico de infraestrutura de transportes "
                "com base na análise da aptidão à logística, obtida por meio da comparação "
                "pareada de um conjunto de critérios."
            ),
            descricao=(
                "Comparar alternativas de corredor logístico de infraestrutura de transportes "
                "sob o escopo da aptidão à logística, considerando a aderência a um conjunto de "
                "critérios, cujos critérios podem abranger as dimensões ambientais, sociais, "
                "econômicas e técnicas, com o propósito de apoiar a tomada de decisão."
            ),
            configuracao_completa={
                "incluir_dimensoes": "sim",
                "dimensoes": ["ambientais", "sociais", "econômicas", "técnicas"],
            },
        )
    )

    f1_portfolio = svc.criar_config(
        ConfigCreateSchema(
            tipo="portfolio",
            nome="[TESTE] Priorização de projetos rodoviários da carteira SEED — Região Metropolitana",
            area_conhecimento="Infraestrutura de transportes",
            tema="Manutenção",
            fenomeno="Prioridade",
            objetivo=(
                "Priorizar projetos de infraestrutura de transportes com base na análise da "
                "prioridade à manutenção, obtida por meio da comparação pareada de um conjunto "
                "de critérios."
            ),
            descricao=(
                "Priorizar projetos de infraestrutura de transportes sob o escopo da prioridade "
                "à manutenção, considerando a aderência a um conjunto de critérios, cujos "
                "critérios podem abranger as dimensões técnicas, financeiras e ambientais, com "
                "o propósito de apoiar a tomada de decisão."
            ),
            tipo_demanda="projeto",
            subconjunto={"tipo_demanda": "projeto", "modo": "dnf", "grupos": []},
            universo_objetos=projetos[0:3],
            configuracao_completa={
                "incluir_dimensoes": "sim",
                "dimensoes": ["técnicas", "financeiras", "ambientais"],
            },
        )
    )

    # --- Fase 2 (Etapa 2 concluída): duas configs distintas ---
    f2_avulsa = svc.criar_config(
        ConfigCreateSchema(
            tipo="avulsa",
            tipo_demanda=None,
            nome="[TESTE] Favorabilidade de empreendimentos de mobilidade urbana",
            area_conhecimento="Planejamento urbano",
            tema="Mobilidade",
            fenomeno="Favorabilidade",
            objetivo=(
                "Classificar empreendimentos de mobilidade urbana de planejamento urbano à luz da favorabilidade à mobilidade, mediante a comparação pareada entre critérios."
            ),
            descricao=(
                "Classificar empreendimentos de mobilidade urbana de planejamento urbano "
                "a partir da favorabilidade à mobilidade, com base em um conjunto de critérios "
                "abrangendo as dimensões sociais, econômicas e institucionais, visando apoiar "
                "a tomada de decisão."
            ),
            configuracao_completa={
                "incluir_dimensoes": "sim",
                "dimensoes": ["sociais", "econômicas", "institucionais"],
            },
        )
    )
    f2_avulsa = _promover_fase_2("avulsa", f2_avulsa.codigo, CRITERIOS_3, MATRIZ_3)

    f2_portfolio = svc.criar_config(
        ConfigCreateSchema(
            tipo="portfolio",
            nome="[TESTE] Hierarquização de projetos SEED — eixo intermodal VP",
            area_conhecimento="Infraestrutura de transportes",
            tema="Integração intermodal",
            fenomeno="Relevância",
            objetivo=(
                "Hierarquizar projetos de infraestrutura de transportes com base na análise da "
                "relevância à integração intermodal, obtida por meio da comparação pareada de um "
                "conjunto de critérios."
            ),
            descricao=(
                "Hierarquizar projetos de infraestrutura de transportes sob o escopo da "
                "relevância à integração intermodal, considerando a aderência a um conjunto de "
                "critérios, cujos critérios podem abranger as dimensões técnicas, sociais, "
                "econômicas e institucionais, com o propósito de apoiar a tomada de decisão."
            ),
            tipo_demanda="projeto",
            subconjunto={"tipo_demanda": "projeto", "modo": "dnf", "grupos": []},
            universo_objetos=projetos[3:7],
            configuracao_completa={
                "incluir_dimensoes": "sim",
                "dimensoes": ["técnicas", "sociais", "econômicas", "institucionais"],
            },
        )
    )
    f2_portfolio = _promover_fase_2("portfolio", f2_portfolio.codigo, CRITERIOS_4, MATRIZ_4)

    print("\n=== Configurações de teste gravadas ===\n")
    linhas = [
        ("Fase 1 (Etapa 1)", f1_avulsa),
        ("Fase 1 (Etapa 1)", f1_portfolio),
        ("Fase 2 (Etapa 2)", f2_avulsa),
        ("Fase 2 (Etapa 2)", f2_portfolio),
    ]
    for rotulo, cfg in linhas:
        rc = cfg.razao_consistencia
        rc_txt = f"{rc:.4f}" if rc is not None else "—"
        print(f"  [{rotulo}] {cfg.tipo} · {cfg.codigo}")
        print(f"    Escopo: {cfg.nome}")
        print(f"    Pacote: {cfg.pacote_fase} | Status: {cfg.status} | Critérios: {cfg.n_criterios}")
        if cfg.pacote_fase == "fase_2":
            print(f"    RC: {rc_txt} | Consistente: {cfg.consistente}")
        print()


if __name__ == "__main__":
    main()
