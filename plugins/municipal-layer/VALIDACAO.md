# Validação da entrega

- `npm run build`: passou, biblioteca ES e demonstração compiladas.
- `npm test`: 4 testes passaram, em 28,529 segundos na execução final do backend.
- Banco: 6.347 combinações atributo/período e 4.093.815 registros; integridade SQLite `ok`, sem violações de chave estrangeira.
- Exportação mista em FGB, GPKG e SHP: 645 municípios, EPSG:4674, geometria válida e espacialmente igual à base. Valores e nulos comparados após reabertura.
- Exportação completa FGB: 6.347 indicadores e quatro campos fixos, com comparação de todos os valores após reabertura.
- Interface no navegador desktop: seleção de PIB 2022, troca para Seade preservando seleção, inclusão de IPDM 2022, prévia combinada e geração concluída pela interface.
- Layout desktop inspecionado visualmente. CSS responsivo incluído; viewport móvel não foi inspecionado nesta execução.
- API local respondeu HTTP 200 ao catálogo. Servidor deixado em `http://127.0.0.1:18765`.

Esses testes validam a transformação e a exportação, não constituem auditoria estatística independente de todas as publicações de origem. Fontes, unidades, multiplicadores, períodos e definições acompanham os dados.


## Validação SICARD — 25/09/2026

Cópia autorizada, somente leitura, da malha e de nove indicadores reais do
PostgreSQL de produção para `/tmp` no Codespace. A seleção inclui Seade/IPDM,
IDHM, RAIS, InfoSiga, PIB e campos com cobertura nula e parcial. Nenhum arquivo
foi registrado no acervo e nenhum dado da produção foi alterado.

| Formato | Feições de entrada/saída | Indicadores | Arquivos no ZIP | Resultado |
| --- | ---: | ---: | ---: | --- |
| FlatGeobuf | 645 / 645 | 9 | 8 | Passou |
| GeoPackage | 645 / 645 | 9 | 8 | Passou |
| Shapefile | 645 / 645 | 9 | 12 | Passou |
| GeoJSON | 645 / 645 | 9 | 8 | Passou |

Camadas reabertas pelo exportador e pelo materializador SICARD: códigos,
CRS EPSG:4674, equivalência geométrica, valores e nulos comparados. CSV, XLSX e
TXT reabertos e comparados à camada por código municipal; glossário, relatório,
inventário do manifesto e integridade ZIP conferidos. A gravação GeoJSON passou
a usar 17 casas para coordenadas e 17 algarismos significativos, após o teste
real detectar arredondamento da configuração padrão. A validação geométrica
permanece sem tolerância aproximada.

Reprodução, com o snapshot autorizado disponível apenas em arquivo temporário:

```bash
SICARD_MUNICIPAL_SNAPSHOT=/tmp/sicard-municipal-real.json python -m pytest -q tests/test_municipal_export_real.py
```

Os quatro casos de exportação isolados do SICARD e os três testes isolados do
servidor standalone também passaram. A suíte histórica do catálogo SQLite
original continua dependendo dos insumos não provisionados neste Codespace;
não se declara exportação do catálogo inteiro nesta validação. Os dados reais
não foram adicionados ao Git. Esta validação não constitui deploy.
