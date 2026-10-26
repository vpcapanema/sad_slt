"""Escopo e URLs dos agregados oficiais usados na carga setorial completa."""

CENSO = 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/'
BASE = CENSO + 'Agregados_por_Setores_Censitarios/'
DICIONARIO = 'dicionario_de_dados_agregados_por_setores_censitarios_20260520.xlsx'
RENDA = CENSO + 'Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/'
ENTORNO = CENSO + 'Agregados_por_Setores_Censitarios_Caracteristicas_urbanisticas_do_entorno_dos_domicilios/'
NASCIMENTO = CENSO + 'Agregados_por_Setores_Censitarios_Registro_de_Nascimento/'
FONTES = [
    ('basico', 'Agregados_por_setores_basico_BR_20260520.zip', '03_domicilios'),
    ('demografia', 'Agregados_por_setores_demografia_BR.zip', '01_populacao'),
    ('alfabetizacao', 'Agregados_por_setores_alfabetizacao_BR.zip', '05_educacao'),
    ('domicilio1', 'Agregados_por_setores_caracteristicas_domicilio1_BR_20261021.zip', '03_domicilios'),
    ('domicilio2', 'Agregados_por_setores_caracteristicas_domicilio2_BR_20250417.zip', '04_saneamento'),
    ('domicilio3', 'Agregados_por_setores_caracteristicas_domicilio3_BR_20250417.zip', '03_domicilios'),
    ('cor_raca', 'Agregados_por_setores_cor_ou_raca_BR.zip', '02_cor_raca'),
    ('obitos', 'Agregados_por_setores_obitos_BR.zip', '18_registro_obitos'),
    ('parentesco', 'Agregados_por_setores_parentesco_BR.zip', '14_familias_fecundidade'),
    ('domicilios_indigenas', 'Agregados_por_setores_domicilios_indigenas_BR.zip', '10_indigenas'),
    ('pessoas_indigenas', 'Agregados_por_setores_pessoas_indigenas_BR.zip', '10_indigenas'),
    ('domicilios_quilombolas', 'Agregados_por_setores_domicilios_quilombolas_BR.zip', '11_quilombolas'),
    ('pessoas_quilombolas', 'Agregados_por_setores_pessoas_quilombolas_BR.zip', '11_quilombolas'),
    ('renda', 'Agregados_por_setores_renda_responsavel_BR_20260508_csv.zip', '06_renda'),
    ('entorno_domicilios', 'Agregados_por_setores_entorno_domicílios_BR.zip', '09_entorno_urbano'),
    ('entorno_faces', 'Agregados_por_setores_entorno_faces_BR.zip', '09_entorno_urbano'),
    ('entorno_moradores', 'Agregados_por_setores_entorno_moradores_BR.zip', '09_entorno_urbano'),
    ('registro_nascimento', 'Registro_de_nascimento_por_setor.csv', 'registro_nascimento'),
]


def url_fonte(name, file):
    if name == 'renda':
        return RENDA + file
    if name.startswith('entorno_'):
        return ENTORNO + 'Agregados_por_Setor_csv/' + file
    if name == 'registro_nascimento':
        return NASCIMENTO + file
    return BASE + 'Agregados_por_Setor_csv/' + file
