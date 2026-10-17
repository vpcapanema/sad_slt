# Plano de correção — execução parcial

## Fechamento operacional acordado — 16/10/2026

**Situação:** plano operacional concluído, com 1.671 aprovações, três casos
condicionais por dados ausentes, quatro subtestes e cinco scripts adicionais
aprovados. Nenhuma falha ou erro na regressão final.

O usuário escolheu encerrar no escopo operacional e publicar após regressão
aprovada, sem condicionar o aceite à matriz exaustiva original.
A integração real da extração com a bancada única foi validada; não há
segunda implementação a homologar integralmente.

A concorrência da edição revelou uma janela entre conferir a revisão e
substituir o arquivo. Foi adicionado bloqueio de sessão PostgreSQL por arquivo
na edição completa e na publicação incremental de atributos/geometrias.
Os testes cobrem dois editores, liberação entre processos e encerramento
abrupto do processo que detém o bloqueio. Falhas controladas de upload e
catálogo verificam descarte do envio e nova execução.

O plano histórico abaixo permanece como registro e possível trabalho futuro,
não como lista ilimitada de condições para este fechamento.

## Encerramento desta rodada — 16/10/2026

A rodada de correções e regressão foi concluída: **1.664 testes aprovados,
três ignorados e quatro subtestes aprovados**, com 14 integrações de banco
revertidas e E2E real OP-03 no navegador, exportação, recarga, reabertura e
reprocessamento. Temporários e saídas foram verificados no storage, sem
montagem Windows nem temporários locais no fluxo testado.

Os scripts de feedback, destino, integridade de sessão e modelador passaram;
o teste do modelador foi atualizado para o Edge instalado, confirmação nativa,
submissão de job assíncrono e carregamento do explorador compartilhado.
Não se alterou a aplicação para acomodar os contratos antigos desses testes.

Os itens de homologação exaustiva permanecem abertos conforme
[COBERTURA_PENDENCIAS.md](COBERTURA_PENDENCIAS.md). Particularmente, faltam
E2E completo da segunda bancada e recuperação/concorrência entre processos.
Não há bloqueio de regressão conhecido nesta rodada; os dados ausentes dos
três skips não foram substituídos por aprovações. A regressão permite seguir
para a publicação pelo script oficial e sua verificação de saúde.

## Plano e evidências históricos

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
