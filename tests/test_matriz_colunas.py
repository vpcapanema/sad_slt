from api.matriz_colunas import extrair_colunas


def test_extrai_criterio_de_ajuste_por_atributo_do_objeto() -> None:
    matriz = {
        "linhas": [
            {
                "Etapa": "Ajuste por atributos do objeto de demanda",
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
