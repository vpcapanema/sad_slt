import pytest

from api.matriz_colunas import extrair_colunas


@pytest.mark.parametrize("etapa", [
    "Ajuste por atributos do objeto de demanda",
    "Priorização de demandas por atributos",
])
def test_extrai_criterio_de_ajuste_por_atributo_do_objeto(etapa) -> None:
    matriz = {
        "linhas": [
            {
                "Etapa": etapa,
                "Critério": "Apoio institucional",
                "Premissa": "Maior apoio reduz riscos de implantação.",
                "Métrica (o que é medido)": "Grau de apoio institucional",
                "Unidade de medida": "escala ordinal",
                "Relação": "↑ Positiva",
                "Mandatório": "Não",
            }
        ]
    }

    colunas = extrair_colunas(matriz)

    assert len(colunas) == 1
    assert colunas[0]["id"] == "grau_de_apoio_institucional"
    assert colunas[0]["criterio"] == "Apoio institucional"
    assert colunas[0]["premissa"] == "Maior apoio reduz riscos de implantação."


def test_escala_ordinal_declarada_no_dado_nao_se_perde_quando_existe_metrica():
    colunas = extrair_colunas([{
        "Etapa": "Ajuste por atributos do objeto de demanda",
        "Métrica (o que é medido)": "Nível de complexidade",
        "Dado": "Nível de complexidade · Indicador: escala qualitativa de 1 a 5",
        "Variável (interface de leitura)": "Atributo preenchido via complementação",
        "Unidade de medida": "escala ordinal",
        "Relação": "↓ Negativa",
    }])
    assert colunas[0]["id"] == "nivel_de_complexidade"
    assert colunas[0]["mapeamento"] == {"1": 0, "2": 0.25, "3": 0.5, "4": 0.75, "5": 1}


def test_escala_ordinal_nao_e_inventada_quando_a_matriz_nao_a_declara():
    colunas = extrair_colunas([{
        "Etapa": "Priorização", "Métrica": "Complexidade", "Unidade": "escala ordinal",
    }])
    assert colunas[0]["mapeamento"] == {}
