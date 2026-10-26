import csv
import io
import zipfile

import pytest

from scripts.completar_setores_2022 import (
    COLUNAS_NASCIMENTO, abrir_csv, campos_csv, linhas_sp, unidade,
)


def test_basico_preserva_chaves_existentes_e_adiciona_vagos():
    reader = csv.DictReader(io.StringIO('CD_SETOR;V0001;V0008;V0009\n'), delimiter=';')
    code, fields = campos_csv(reader, 'basico', dict.fromkeys(['V0001', 'V0008', 'V0009']))
    assert code == 'CD_SETOR'
    assert fields == {'V0001': ('v0001', None), 'V0008': ('v0008', None), 'V0009': ('v0009', None)}


def test_basico_aceita_nomes_minusculos_publicados():
    reader = csv.DictReader(io.StringIO('CD_SETOR;v0001;v0008;v0009\n'), delimiter=';')
    _, fields = campos_csv(reader, 'basico', dict.fromkeys(['V0001', 'V0008', 'V0009']))
    assert fields['v0001'] == ('v0001', None)


def test_variavel_sem_dicionario_impede_carga():
    reader = csv.DictReader(io.StringIO('CD_setor;V99999\n'), delimiter=';')
    with pytest.raises(ValueError, match='sem dicionario'):
        campos_csv(reader, 'renda', {})


def test_leitura_streaming_preserva_sigilo_zero_e_ausencia():
    reader = csv.DictReader(io.StringIO(
        'setor;V06001;V06002\n110001505000002;1;2\n350010505000001;0;X\n'
        '350010505000002;.;5\n'), delimiter=';')
    fields = {'V06001': ('V06001', None), 'V06002': ('V06002', None)}
    result = list(linhas_sp(reader, 'setor', fields, {'350010505000001', '350010505000002'}))
    assert result == [
        ('350010505000001', {'V06001': 0, 'V06002': None}, {'V06002': 'X'}),
        ('350010505000002', {'V06001': None, 'V06002': 5}, {'V06001': '.'}),
    ]


@pytest.mark.parametrize('codes', [set(), {'350010505000001'}])
def test_setor_fora_da_malha_ou_repetido_impede_carga(codes):
    reader = csv.DictReader(io.StringIO(
        'setor;V06001\n350010505000001;1\n350010505000001;2\n'), delimiter=';')
    with pytest.raises(ValueError, match='fora da malha ou repetido'):
        list(linhas_sp(reader, 'setor', {'V06001': ('V06001', None)}, codes))


def test_registro_nascimento_preserva_cabecalho_e_universo(tmp_path):
    path = tmp_path / 'nascimento.csv'
    headers = ['Setor Censitário', *COLUNAS_NASCIMENTO]
    path.write_text(';;;;;;;;;;Registro de Nacimento;;;;\n' + ';'.join(headers) +
                    '\n350010505000001;10;30;4;3;0;X;0;0\n', encoding='cp1252')
    with abrir_csv(path) as reader:
        code, fields = campos_csv(reader, 'registro_nascimento', {})
        result = list(linhas_sp(reader, code, fields, {'350010505000001'}))
    assert len(fields) == 8
    assert result[0][1]['registro_nascimento_ate_5'] == 4
    assert result[0][1]['registro_nascimento_sem_registro'] is None
    assert result[0][2] == {'registro_nascimento_sem_registro': 'X'}


def test_zip_nao_escolhe_csv_arbitrario(tmp_path):
    path = tmp_path / 'ambiguo.zip'
    with zipfile.ZipFile(path, 'w') as archive:
        archive.writestr('a.csv', '')
        archive.writestr('b.csv', '')
    with pytest.raises(ValueError, match='ambiguo'):
        with abrir_csv(path):
            pass


@pytest.mark.parametrize('name,key,description,tipo,expected', [
    ('renda', 'V06004', '', '', 'R$'),
    ('renda', 'V06005', '', '', 'R$²'),
    ('entorno_faces', 'V05400', '', '', 'Faces'),
    ('entorno_moradores', 'V05200', '', '', 'Pessoas'),
    ('obitos', 'V01224', 'Existe pessoa falecida no domicilio', 'Mortalidade', 'Domicilios'),
    ('domicilios_indigenas', 'V01501', 'Moradores indígenas no domicílio', 'Domicílio', 'Pessoas'),
    ('pessoas_indigenas', 'V02000', '', 'Pessoas', 'Pessoas'),
    ('basico', 'V0005', '', '', 'moradores/domicilio'),
])
def test_unidades_respeitam_o_universo(name, key, description, tipo, expected):
    assert unidade(name, key, description, tipo) == expected
