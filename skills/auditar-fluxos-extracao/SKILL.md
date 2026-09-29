---
name: auditar-fluxos-extracao
description: Auditar fluxos ilógicos, errados, incompletos ou ambíguos da página de extração de atributos do SICARD, seguindo interface, estado e backend. Entregar uma lista curta de problemas e decisões para o usuário, sem corrigir automaticamente.
---

# Auditor de fluxos da extração

Identifique problemas concretos no percurso do usuário em `templates/paginas/geoespacial/extracao-atributos.html` e apresente uma lista curta para ele decidir o que e como resolver. O objetivo é coerência funcional, não redesenho estético nem aplicação automática de correções.

## Rastreio

Leia as instruções aplicáveis e confira o Git. Parta dos controles reais da página e de `templates/componentes/extracao_atributos/`; acompanhe os handlers e o estado em `geoespacial/extracao-atributos/`, as rotas `api/routers/extracao_atributos.py` e os serviços efetivamente chamados. Consulte `documentacao/EXTRACAO_ATRIBUTOS_INTERFACE.md` e os testes pertinentes como referências, sem assumir que documentação e implementação coincidem.

Para cada percurso, ligue: intenção do usuário → pré-requisitos → ação → mudança de estado → payload → validação e efeito no backend → resultado visível → próxima ação ou recuperação. A existência de um botão ou endpoint não comprova que o fluxo se completa.

Cubra seleção de entradas locais/storage/municipais; identificação das feições; bases, categorias e regras; preparação e composição na bancada; camadas presentes, visíveis e selecionadas; troca de algoritmo; individual/lote; salvar/carregar configuração; execução repetida; erro/cancelamento/retomada; análise e exportação. Examine especialmente mudanças de seleção/configuração após uma prévia ou execução e resultados antigos que possam permanecer associados a uma configuração nova.

## O que constitui achado

- **Erro:** ação ou contrato contradiz o comportamento demonstrado pelo código/teste/reprodução, aceita combinação inválida ou atua sobre dados diferentes dos indicados.
- **Ilógico:** ordem, dependência ou transição impossibilita a intenção anunciada ou exige passos circulares/contraditórios.
- **Incompleto:** existe entrada ou promessa de fluxo, mas falta uma etapa necessária, destino, persistência ou caminho de recuperação.
- **Ambiguidade:** duas interpretações plausíveis produzem resultados diferentes e a interface/contrato não permite ao usuário distinguir qual vale. Apresente a decisão necessária sem escolher silenciosamente uma regra de negócio.

Não trate preferência estética como defeito. Não declare problema a partir de nome de função isolado: verifique consumidores, guardas e validações do servidor. Agrupe sintomas da mesma causa. Diferencie falha comprovada, risco inferido e decisão de produto. Marque a evidência como `estático`, `reproduzido` ou `não verificado`.

O feedback detalhado tem auditor próprio em `skills/auditar-feedback-processamento/SKILL.md`. Encaminhe dependências para ele; mantenha aqui apenas efeitos sobre a lógica do percurso, como cancelamento que permite iniciar outra operação antes de a anterior encerrar.

## Entrega curta, orientada a decisão

Salve em `documentacao/AUDITORIA_FLUXOS_EXTRACAO.md`, ou no destino pedido. Informe commit/estado analisado e alcance em até duas linhas. Liste até oito achados prioritários, sem preencher cota. Use este formato compacto:

`F01 · prioridade · tipo · evidência — Ao [ação], [problema e consequência]. Decidir: [opções curtas e, se útil, recomendação]. Referência: arquivo:linha.`

Limite o relatório a aproximadamente 600 palavras e a resposta no chat a até seis itens. Não inclua inventário extenso, narrativa da investigação ou checklist genérico. Se existirem achados adicionais relevantes ou percursos não examinados, declare a cobertura parcial; não anuncie auditoria integral. Inclua referências suficientes para localizar cada problema sem transformar o resumo em relatório longo.

Não implemente as soluções: aguarde a escolha do usuário. Nas sugestões, explicite a consequência das alternativas quando mudar seleção, preservação de dados ou resultado analítico. Para correção posteriormente autorizada, releia os arquivos envolvidos e valide o fluxo escolhido.

## Execução segura e paralela

O banco SLT é compartilhado com produção. Faça inspeção estática e, quando necessário, testes previamente revisados em isolamento. Não inicie scripts que aplicam migrations, não grave dados de teste no banco oficial e não execute deploy. Não confunda análise estática com teste de navegador.

Quando executado em paralelo, combine responsabilidade exclusiva pelo relatório com o coordenador e não altere arquivos da aplicação ou dos outros auditores. Envie achados intermediários úteis. Se houver alterações concorrentes, confira novamente referências e declare o snapshot analisado.
