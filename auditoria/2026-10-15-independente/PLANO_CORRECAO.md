# Plano de correção — execução parcial

**Atualização de 16/10/2026:** as propostas abaixo são o plano original. A retomada
confirmou correções anteriores, corrigiu ingresso legado de NoData, validação
recursiva/ciclos, contrato do seed de exportação e proteção de custo acumulado,
além de endurecer identidade de seleção e ordenação da validação antes de gravar
o arquivo. Foram aprovados 43 testes Python focados e dois scripts de feedback.
Detalhamento e limitações estão na atualização ao final de [DEFEITOS.md](DEFEITOS.md).

**Complemento de publicação:** a regressão completa posterior passou com
1.617 aprovações, zero falhas e zero erros; 17 casos permanecem condicionais
conforme os motivos registrados em [DEFEITOS.md](DEFEITOS.md). Os dois scripts
de feedback passaram novamente. O bloqueio de inicialização Windows por montagem
foi removido sem relaxar a política de produção. A migração 136 está aplicada.
Os itens abaixo continuam sendo o plano histórico de auditoria exaustiva, não
uma declaração de homologação de todos os cenários.

1. **P0 — preservar contêineres e transação de edição.** DATA-MULTICAMADA-003: editar uma camada não pode substituir as demais. Atualizar cópia integral, validar todas as camadas e coordenar confirmação arquivo/banco. Regressão com falhas de banco/arquivo e comparação de todos os conteúdos.
2. **P1 — identidade de subcamadas.** DATA-MULTICAMADA-002/UI-MULTICAMADA-001: persistir nome interno e usá-lo em arquivo local, storage e cache frio. Quatro IDs devem devolver quatro conteúdos corretos após reinício.
3. **P1 — seleção e cardinalidade.** GEO-SELECAO-001/NUM-005: seleção espacial deve produzir subconjunto da fonte; fallback sem chave comparável deve falhar. Testar sobreposições, campos repetidos, mapa/tabela e paginação.
4. **P1 — importação e coordenadas.** IMPORT-INTEIRO-001: converter dtype antes de preencher NaN. IMPORT-COORD-001: calcular lat/long em CRS geográfico explícito. Testar tipos inteiros/flutuantes, máscaras e CRS projetado/geográfico.
5. **P2 — contratos e modelos.** Alinhar unidades oferecidas e aceitas; atualizar seeds inválidos e validar funções aninhadas recursivamente, incluindo ciclos e saídas. Não substituir modelos particulares pelos seeds.
6. **P2 — feedback local.** UI-FEEDBACK-001: orientação visível sem reintroduzir modal global indiscriminado. Verificar pré-condições, falhas e recuperação.
7. **P2 — caminhos legados de NoData.** NUM-001/002/004 são condicionais; os casos reais do importador novo passaram. Reproduzir outros percursos com sentinelas finitas antes de generalizar a correção.

O ambiente AUDIT foi preparado e testado na auditoria original. Sua disponibilidade
atual não foi confirmada nesta retomada. A execução atual usou arquivos sintéticos
e persistência simulada, sem escrever nos serviços oficiais.

Critério de aceite futuro: testes UI → API real → processamento → banco/storage isolados → reabertura, com contagem, geometria, atributos e tolerâncias. A aprovação de um cenário não encerra os demais cenários do controle.
