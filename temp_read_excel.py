import pandas as pd

file_path = (
    'D:/REPOSITORIOS/sistema_apoio_a_tomada_de_decisao_web/'
    'data/ESTRUTURA_MODELO_HIERARQUIZACAO_PLI_FASE1_INTEGRADA.xlsx'
)
df = pd.read_excel(file_path)

print('Colunas:', df.columns.tolist())
print('\n')
print(df.to_string())
