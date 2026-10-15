# Auditoria do feedback compartilhado da bancada

Leitura integral de `assets/js/process_feedback_unified.js`, `assets/js/notification_system.js`, `assets/js/status-colors.js`, `geoespacial/bancada-feedback.js`, `assets/css/process_feedback_system.css`, `assets/css/bancada-arquivos.css` e `assets/css/storage-pastas.css`.

Dois defeitos reproduzidos em navegador e corrigidos no controlador compartilhado:

- **Ocultar acompanhamento** encerrava SSE e monitor de atividade. Agora apenas oculta; `fechar()` continua encerrando os recursos quando solicitado pelo fluxo.
- **Baixar relatório de erro** funcionava somente no primeiro clique. Agora permite repetir o download enquanto o mesmo erro estiver apresentado.

Demais controles revisados: confirmar/cancelar, entrada obrigatória, confirmação de credencial, seguir histórico, baixar histórico, ver/ocultar detalhes, fechar resultado e notificações. Sem nova divergência confirmada entre nome e ação no escopo da bancada. Cores/status e CSS foram lidos integralmente; não foi necessário alterá-los.

Validação isolada, sem banco real: `tests/browser/bancada-feedback-ocultar.cjs`, `tests/browser/bancada-feedback.cjs`, `tests/browser/feedback-global.cjs` e `tests/browser/feedback-sigma.cjs` passaram. Cobrem foco, Escape, Tab, credencial, diálogo nativo, notificações, fetch, erro FastAPI/rede, NDJSON, SSE e eventos de job. A reprodução anterior à correção está em `outputs/bancada-feedback-auditoria.cjs` (asserções documentam os defeitos antigos, não constitui teste de regressão).

Limite: esta complementação verificou o contrato compartilhado de feedback; não executou um arquivo local real de ponta a ponta na página de extração.
