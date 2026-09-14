from scripts import carregar_rais_municipal as rais


def linha(municipio="355030", valores=None):
    dados = {rais.COLUNA_MUNICIPIO: municipio}
    dados.update({coluna: "" for coluna in rais.COLUNAS_REMUNERACAO})
    for coluna, valor in zip(rais.COLUNAS_REMUNERACAO, valores or (), strict=False):
        dados[coluna] = valor
    return dados


def test_publica_exatamente_os_dois_campos_da_planilha():
    assert rais.CAMPO_EMPREGO == "rais_emprego_medio_formal_2024"
    assert rais.CAMPO_SALARIO == "rais_salario_medio_2024"
    assert {rais.ID_EMPREGO, rais.ID_SALARIO} == {
        "f0b0f20cbea132be1f12", "72898c56a1bffd3c0fca",
    }


def test_acumula_por_municipio_do_estabelecimento():
    totais = {}
    assert rais.acumular(linha(valores=["1000.00", "0", "1200,50"]), totais)
    assert totais == {"355030": [2.0, 2200.5]}


def test_ignora_registro_fora_de_sao_paulo():
    totais = {}
    assert not rais.acumular(linha("330455", ["1000"]), totais)
    assert totais == {}


def test_numero_positivo_descarta_ausente_invalido_e_zero():
    assert rais.numero_positivo(None) is None
    assert rais.numero_positivo("") is None
    assert rais.numero_positivo("n/a") is None
    assert rais.numero_positivo("0") is None
    assert rais.numero_positivo("1234,56") == 1234.56
