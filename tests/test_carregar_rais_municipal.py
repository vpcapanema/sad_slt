from scripts import carregar_rais_municipal as rais
import csv
from pathlib import Path


def linha(municipio="355030", valores=None):
    dados = {rais.COLUNA_MUNICIPIO: municipio}
    dados.update({coluna: "" for coluna in rais.COLUNAS_REMUNERACAO})
    for coluna, valor in zip(rais.COLUNAS_REMUNERACAO, valores or (), strict=False):
        dados[coluna] = valor
    return dados


def test_publica_exatamente_os_dois_campos_da_planilha_por_ano():
    ids = rais.identificadores(2024)
    assert ids["emprego"] == "rais_emprego_medio_formal_2024"
    assert ids["salario"] == "rais_salario_medio_2024"
    assert {ids["id_emprego"], ids["id_salario"]} == {
        "f0b0f20cbea132be1f12", "72898c56a1bffd3c0fca",
    }
    assert rais.identificadores(2022)["emprego"] == "rais_emprego_medio_formal_2022"


def test_rejeita_ano_fora_da_serie_harmonizada():
    try:
        rais.identificadores(2021)
    except ValueError as erro:
        assert "entre 2022 e 2024" in str(erro)
    else:
        raise AssertionError("Ano fora da série deveria ser rejeitado")


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


def test_le_estrutura_historica_com_ponto_e_virgula(monkeypatch, tmp_path: Path):
    dados = tmp_path / "RAIS_VINC_PUB_SP.txt"
    cabecalho = ["Município", *rais.COLUNAS_REMUNERACAO[:-1], "Vl Remun Dezembro Nom"]
    with dados.open("w", encoding="LATIN1", newline="") as stream:
        escritor = csv.DictWriter(stream, fieldnames=cabecalho, delimiter=";")
        escritor.writeheader()
        escritor.writerow({**{coluna: "" for coluna in cabecalho}, "Município": "355030",
                            "Vl Rem Janeiro SC": "1000,00", "Vl Remun Dezembro Nom": "1200,00"})
    monkeypatch.setattr(rais, "localizar_arquivo_dados", lambda arquivo, pasta: dados)
    totais, registros = rais.ler_indicadores(tmp_path / "arquivo.7z")
    assert registros == 1
    assert totais == {"355030": [2.0, 2200.0]}
