# InfoSiga-SP: microdados e localização espacial

## Escopo da carga

O esquema `infosiga` mantém os arquivos de sinistros, pessoas e veículos sem
indicadores calculados. A carga aceita os arquivos publicados em conjuntos
2015-2021 e 2022-2026, mas inclui somente registros cujo `ano_sinistro` seja
menor ou igual a 2025. Registros de 2026 permanecem fora do banco.

Todos os campos publicados nos CSVs são armazenados como `TEXT`. O catálogo
`infosiga.arquivo_importado` registra checksums, cabeçalhos, quantidade total,
quantidade importada e quantidade excluída por arquivo.

Tabelas brutas:

- `infosiga.sinistro`
- `infosiga.pessoa`
- `infosiga.veiculo`

## Enriquecimento espacial

A tabela `infosiga.sinistro_localizacao` é derivada e não altera os registros
brutos. Para cada sinistro, ela registra:

- o código municipal informado pela fonte;
- o município calculado pelo ponto em latitude/longitude;
- o trecho da malha rodoviária mais próximo em até 300 metros, somente quando
  o tipo de via indica estrada ou rodovia;
- a rodovia, o município do trecho e a distância até o trecho;
- estados explícitos para coordenada inválida, coordenada `0,0` usada como
  placeholder, divergência municipal e evento rodoviário fora da tolerância.

A malha usada está em `infosiga.trecho_rodoviario`, no CRS EPSG:5880. Os pontos
dos sinistros são armazenados em EPSG:4674. O vínculo com município usa
`ST_Covers`; o vínculo rodoviário usa vizinho mais próximo com limite de 300 m.

## Execução

Primeiro aplique `database/112_infosiga_microdados_localizacao.sql`. Depois:

```powershell
.\.venv\Scripts\python.exe scripts\carregar_infosiga.py `
  --dados-zip "CAMINHO\dados_infosiga.zip" `
  --malha-zip "CAMINHO\Sistema Rodoviário Estadual.zip" `
  --substituir
```

Essa rotina carrega os microdados e a localização. A migration
`114_infosiga_indicadores_municipais.sql` publica no gerador, para 2015–2025,
duas opções anuais com 645 observações cada: `Óbitos em sinistros de trânsito`
e `Sinistros de trânsito com veículos de carga`.

As opções são os numeradores comprováveis dos indicadores da planilha
AHP-DANI. Elas não são rotuladas como taxas: a taxa de óbitos ainda depende da
população municipal do mesmo ano, e a taxa de sinistros com veículos de carga
depende da frota municipal anual. Caminhão é a aproximação disponível para
veículo de carga na fonte carregada.
