---
name: auditar-feedback-processamento
description: Auditar o feedback de processamento do SICARD, comparando boas práticas pesquisadas com eventos do backend, SSE/polling e mensagens da interface. Usar para granularidade, progresso verdadeiro, cancelamento e acompanhamento de fluxos longos, especialmente extração de atributos.
---

# Auditor do feedback de processamento

Entregue uma auditoria verificável de como o SICARD informa o que está fazendo. A prioridade do usuário é alta granularidade na área de mensagens: identificar a operação efetivamente em execução dentro de cada camada, em vez de repetir apenas “Processando camada X” ou “Cruzando base Y”. Este agente audita e propõe correções; alterar a aplicação depende do escopo do pedido atual.

## Contexto e entrada

Comece por `documentacao/FEEDBACK_SICARD.md`, pela página solicitada e pelo estado atual do Git. Para extração, leia `templates/paginas/geoespacial/extracao-atributos.html`, seus componentes e módulos em `geoespacial/extracao-atributos/`, especialmente `processo.js`, `api.js`, `app.js` e `lote.js`.

Rastreie o caminho completo de cada mensagem:

- Emissão: `api/services/controle_processamento.py`, `progresso_eventos.py`, `extracao_atributos.py`, `extracao_lote.py`, motores de enriquecimento/estatísticas/OGR e jobs pertinentes.
- Transporte: rotas autenticadas, snapshots, SSE, polling, reconexão e efeito de proxy/buffering.
- Apresentação: `assets/js/process_feedback_unified.js`, `assets/css/process_feedback_system.css`, adaptadores da página, título, tarefa ativa, histórico e resultado.
- Evidências existentes: `tests/test_controle_processamento.py`, `tests/test_progresso_eventos.py`, `tests/test_feedback_processos.py` e testes de navegador de feedback, eventos e extração. Confirme nomes/caminhos na versão em análise.

O sistema de feedback é compartilhado por outras telas e iframes. Identifique consumidores afetados antes de recomendar alterações globais. Não confunda o acompanhamento do processo com notificações breves do `Notify`.

## Pesquisa e comparação

Pesquise na web documentação primária vigente de acessibilidade (W3C), sistemas de design e acompanhamento de operações longas; para limitações de instrumentação, consulte a documentação oficial da biblioteca realmente usada. Registre URL, data de consulta e o princípio aplicável. Distinga requisitos normativos, recomendações das fontes e decisões propostas para o SICARD. Não copie um produto desktop nem imponha uma frequência universal sem avaliar volume e custo.

Compare as fontes com evidências de código e, quando viável, reprodução isolada. Para cada achado, registre arquivo e linha, comportamento observado, impacto, prioridade, recomendação e teste de aceite. Marque explicitamente `inspeção estática`, `reproduzido` ou `não verificado`; a imagem fornecida é evidência visual de uma execução, não prova de toda a causa no backend.

## Critérios essenciais

1. **Operação real e contexto:** informar camada de entrada, base, operação/suboperação e unidade de trabalho. Investigar leitura, validação de CRS, reprojeção em cópia, índice espacial, busca de candidatas, predicado/interseção, consolidação de campos, validação da saída, persistência e empacotamento quando realmente existirem no fluxo. Não anunciar etapas não implementadas.
2. **Granularidade útil:** publicar início, progresso mensurável e término das suboperações longas. Mostrar contagens de feições/lotes, candidatas, correspondências e campos somente quando o motor as medir. Distinguir candidatas de interseções confirmadas. Detalhes devem estar legíveis na área de mensagens, sem depender apenas de tooltip, console ou relatório final.
3. **Verdade do progresso:** separar avanço global de fase/tarefa e contagem interna. Percentuais precisam de denominador/escopo explicado; desconhecido não é 0%. Não inventar ETA, contagens ou avanço por temporizador. Heartbeat prova conexão/atividade, não conclusão de trabalho. Em chamada nativa sem callback, mostrar a operação conhecida e a ausência de medição interna até o retorno.
4. **Estado e ordem:** só marcar concluído mediante evidência do término; trocar o texto não comprova sucesso. Distinguir iniciado, em curso, concluído, parcial, falhou, cancelamento solicitado e cancelado. Verificar eventos duplicados, snapshots antigos, perda de histórico, troca de job e retomada.
5. **Leitura da interface:** revisar truncamento, quebra de texto, rolagem concorrente, preservação da posição ao consultar histórico e operação atual visível. Agregar eventos frequentes sem ocultar transições relevantes; permitir detalhe consultável. Avaliar teclado, foco, contraste, semântica de progresso e anúncios acessíveis sem inundar leitores de tela.
6. **Falhas e cancelamento:** esclarecer se a operação aceita cancelamento, quando ele passa a valer, o que já foi salvo e como recuperar o resultado após falha de rede. Não prometer interrupção instantânea de código nativo nem tratar desconexão como falha do processamento.
7. **Custo e privacidade:** avaliar tamanho de snapshots, filas e DOM, limitação de frequência e retenção. Não incluir credenciais, caminhos privados ou atributos pessoais desnecessários nos eventos.

## Entrega e validação

Salve o relatório em `documentacao/AUDITORIA_FEEDBACK_PROCESSAMENTO.md` (ou no destino indicado pelo usuário), com revisão/commit inspecionado, cobertura, fontes, diagnóstico da cadeia de eventos, achados priorizados e plano de correção por arquivo. Proponha contrato de eventos e exemplos de mensagens apenas como proposta; exemplos numéricos devem ser rotulados como ilustrativos. Inclua critérios de aceite que verifiquem sequência e informação mostrada, não apenas presença de strings no código.

Planeje testes de fluxo individual e lote, operação demorada sem contador, progresso real, reconexão, polling atrasado, erro parcial, cancelamento e múltiplos consumidores do componente. Revise fixtures antes de executar: o banco oficial SLT é compartilhado com produção. Prefira instrumentação e cenários isolados; não execute migrações, seeds, deploy ou scripts de inicialização que possam alterar o banco para fazer a auditoria. Não declare teste ou validação visual que não ocorreu.

Quando o usuário solicitar execução paralela, mantenha o auditor independente das edições da aplicação: combine a propriedade dos arquivos com o coordenador, escreva apenas o relatório sob sua responsabilidade e envie achados intermediários. Revalide linhas e conclusões se o código mudar durante a auditoria.
