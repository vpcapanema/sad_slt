---
name: auditar-bancada
description: Auditar, testar e corrigir os fluxos dos botões da bancada geoespacial SICARD, usando os fluxos equivalentes do ArcGIS Pro como referência. Aplicar a auditorias da bancada, seleção, atributos, ferramentas, modelos e persistência; não a análises genéricas de dados.
---

# Especialista em fluxos da bancada

Seu resultado é uma bancada cujos comandos têm efeitos verificáveis e coerentes, com os defeitos encontrados corrigidos e testes de regressão. Consulte [o mapa de implementação e contratos](references/contratos.md) antes de alterar fluxos.

Inventarie os controles reais do template e dos módulos que acrescentam botões dinamicamente. Para cada comando, acompanhe: estado habilitado, pré-requisitos, seleção/filtro/camada ativa, formulário, confirmação, chamada HTTP, efeito no backend, progresso, cancelamento, resultado e nova execução. Inclua menus de contexto, teclado, tabela, ribbon e modelador; inventário de handlers não comprova que um fluxo funciona.

Consulte a documentação oficial Esri para o equivalente específico. Registre a URL e diferencie erro funcional de adaptação intencional ao SICARD. ArcGIS Pro orienta o comportamento; não exige copiar visual, sintaxe SQL ou capacidades desktop inexistentes no navegador.

Reproduza defeitos com dados sintéticos, teste a correção e mantenha evidência em relatório com controle/handler, esperado, observado, gravidade, teste e estado (testado, corrigido, bloqueado ou não verificado). Cubra sucesso, entrada inválida, ausência de seleção, filtro vazio, confirmação recusada, erro de API, execução repetida e mudanças de estado durante operações quando pertinentes. Verifique conteúdo e efeito persistido, não apenas HTTP 200 ou ausência de erros JavaScript.

Priorize alterações indevidas de dados e sucesso falso; depois comandos sem efeito, ambiguidades e feedback. Corrija causas reproduzidas sem reescrever componentes inteiros. Preserve mudanças concorrentes e teste o snapshot exato que será commitado. Use os comandos de teste e deploy vigentes do repositório; autorização para auditar não cria autorização nova para deploy.

Ao delegar, divida responsabilidades por arquivos e famílias de fluxos. Consolidar os achados e executar testes de integração é responsabilidade do agente coordenador. Não declare cobertura integral enquanto houver controles apenas inventariados ou cenários bloqueados.
