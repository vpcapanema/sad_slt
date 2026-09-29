# Login: feedback, Console e permanência

O formulário público usa o componente global `ProcessFeedback`, acompanhado de
estado inline acessível (`role=status`, `aria-live`) que permanece funcional se
o componente não carregar. O botão mostra **Entrando…** e bloqueia submissões
duplicadas. Etapas: envio/autenticação, confirmação do cookie pela API e abertura
da área restrita. Enquanto um pedido está pendente, há atualização a cada cinco
segundos com tempo decorrido, sem inventar etapas internas do SIGMA.

O Console registra `[SICARD][Login]`: inicialização, validação, início/fim/falha HTTP,
espera, confirmação e restauração de sessão. Mostra tentativa, etapa, status e
duração; não registra usuário, senha, token, payload ou resposta privada. Os
pedidos têm prazo de 45 segundos para login e 12 segundos para consulta da sessão.
Falhas de rede, HTTP e timeout aparecem no formulário; o botão é liberado para
nova tentativa. A consulta inicial é cancelada quando o usuário envia o login,
evitando que uma resposta antiga sobrescreva o estado atual.

**Permanecer conectado** vem desmarcado:

- Marcado: cookie e assinatura válidos por até 30 dias (prazo absoluto).
- Desmarcado: cookie de sessão do navegador, assinatura limitada a 8 horas.
- **Sair** remove o cookie deste navegador. A aplicação mantém o contrato atual
  de token assinado; não há armazenamento de senha no navegador nem renovação
  indefinida da validade. A restauração de sessões do próprio navegador pode
  conservar cookies de sessão, mas não estende a expiração da assinatura.

Cookie `HttpOnly`, `SameSite=Lax`, com `Secure` em HTTPS; HTTP local continua
funcionando. Referências: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
e [Starlette set_cookie](https://starlette.dev/responses/).

O `.env` deve conter **SLT_SESSION_SECRET estável**, exclusivo do ambiente e fora
do Git. Sem ele, a configuração existente gera uma chave nova por processo e
reiniciar o servidor invalida as sessões. A configuração local recebeu uma chave
aleatória persistente, sem alteração dos demais valores. Reinicie a tarefa local
para carregar o novo backend e a chave; será necessário autenticar uma vez.
Perfis diferentes de Edge/Chrome mantêm cookies separados.

Diagnóstico de 26/09/2026: página, JavaScript e consulta pública de sessão local
responderam HTTP 200. O código anterior apenas desabilitava o botão, não emitia
logs de login nem limitava a espera; não havia opção de permanência e faltava a
chave estável no `.env`. Isso explica a ausência de feedback e a perda de sessão
ao reiniciar, sem demonstrar falha nas credenciais reais do SIGMA.

Testes: `tests/test_login_persistencia.py` e `tests/browser/login-feedback.cjs`,
com autenticação/rede simuladas. Nenhuma credencial real ou escrita no banco
oficial foi usada na validação.
