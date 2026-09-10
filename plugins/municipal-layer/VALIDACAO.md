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
