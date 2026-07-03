import pandas as pd

df = pd.read_excel('D:/REPOSITORIOS/sistema_apoio_a_tomada_de_decisao_web/data/ESTRUTURA_MODELO_HIERARQUIZACAO_PLI_FASE1_INTEGRADA.xlsx')

print('Colunas:', df.columns.tolist())
print('\n')
print(df.to_string())
