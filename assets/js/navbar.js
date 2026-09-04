/**
 * Stub inerte da navbar client-side, mantido apenas como mitigação de cache.
 *
 * As navbars passaram a ser renderizadas no servidor (templates/componentes/
 * navbar_*.html), e `tests/test_templates.py` garante isso. A versão antiga
 * deste arquivo montava o menu no cliente e sobrescrevia o `innerHTML` de toda
 * `nav.app-nav` — se uma página em cache antigo ainda a carregasse, ela apagaria
 * a navbar vinda do servidor e a trocaria por um menu com links desatualizados.
 *
 * `api/server.py` serve este caminho com `Cache-Control: no-store` justamente
 * para entregar esta versão neutra a quem ainda o requisita. Não voltar a
 * escrever no DOM aqui; o `SLTNavbar` fica definido só para não quebrar
 * chamadores antigos.
 */
(function (global) {
  "use strict";

  global.SLTNavbar = {
    init() {
      /* Sem efeito: a navbar é renderizada pelo servidor. */
    },
  };
})(window);
