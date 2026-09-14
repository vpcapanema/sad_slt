# Indicadores municipais da RAIS

O esquema `rais` guarda somente os dois indicadores da planilha
`Indicadores_ACB_Criterios_AHP-DANI.xlsx`, aba `PLI_Todos`:

- emprego médio formal;
- salário médio.

A granularidade é município e ano. Para 2024, a fonte é o arquivo público de
vínculos da RAIS para o estado de São Paulo. Os microdados são lidos como insumo
transitório e não permanecem no PostgreSQL.

## Cálculo

`Emprego médio formal` é a soma dos vínculos com remuneração positiva em cada
mês, dividida por 12. `Salário médio` é a soma das remunerações mensais positivas
dividida pelo total de vínculos-mês remunerados. O município é o do
estabelecimento, identificado pelo campo `Município - Código` e conciliado com o
código IBGE de sete dígitos da `base_municipal.municipio`.

## Persistência

- `rais.indicador_municipal`: uma linha por município e ano, com apenas os dois
  resultados;
- `rais.fonte_indicador_municipal`: procedência e SHA-256 do arquivo utilizado;
- `base_municipal.atributo`: exatamente dois atributos da fonte `MTE / RAIS`;
- `base_municipal.observacao`: uma observação para cada atributo e município.

Os campos publicados são `rais_emprego_medio_formal_2024` e
`rais_salario_medio_2024`.

Na interface do gerador, ambos aparecem na fonte `MTE / RAIS`, ano 2024, tema
`Econômico-produtivo`.
