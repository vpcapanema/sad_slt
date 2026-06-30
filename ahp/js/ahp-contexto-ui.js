/**
 * Contexto da Etapa — personalização informativa (escopo/objetivo da config carregada).
 * Não altera processamento, validação ou persistência do fluxo AHP.
 */
(function (global) {
  "use strict";

  var ETAPA_BRIDGE = {
    criterios:
      "nesta etapa você estrutura a base da análise: define quantos critérios participarão da matriz de comparação e a forma de entrada dos dados.",
    nomes:
      "nesta etapa você atribui nomes claros e operacionais a cada critério e completa a Tabela de Premissas e Critérios vinculada a esta análise.",
    metodo:
      "nesta etapa você define quem preencherá a matriz pareada (individual ou colaborativo), configura o ambiente colaborativo quando necessário e escolhe a estratégia de entrada dos dados na Etapa 5.",
    comparacao:
      "nesta etapa você compara os critérios par a par (escala de Saaty) para definir a importância relativa entre eles.",
    resultados:
      "nesta etapa você valida a matriz salva, calcula os pesos dos critérios e consulta o parecer consolidado da análise.",
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function etapaFromPath() {
    var path = (global.location && global.location.pathname) || "";
    if (path.indexOf("step3-nomes") !== -1) return "nomes";
    if (path.indexOf("step4-metodo") !== -1) return "metodo";
    if (path.indexOf("step5-comparacao") !== -1) return "comparacao";
    if (path.indexOf("step6-resultados") !== -1) return "resultados";
    return "criterios";
  }

  function findContextoBody() {
    var labels = global.document.querySelectorAll(".ahp-section-label");
    for (var i = 0; i < labels.length; i++) {
      var span = labels[i].querySelector("span");
      if (!span || span.textContent.trim() !== "Contexto da Etapa") continue;
      var section = labels[i].closest(".ahp-step-section");
      if (section) return section.querySelector(".ahp-section-body");
    }
    return null;
  }

  function markGenericIntro(body) {
    var content = body.querySelector(".info-card-content");
    if (!content) return null;
    var p = content.querySelector("p");
    if (p && !p.classList.contains("ahp-contexto-intro-generico")) {
      p.classList.add("ahp-contexto-intro-generico");
    }
    return p;
  }

  function buildIntroHtml(cfg, etapa) {
    var escopo = String(cfg.nome || cfg.escopo || "").trim();
    var objetivo = String(cfg.objetivo || "").trim();
    if (!escopo && cfg.codigo) escopo = String(cfg.codigo).trim();
    if (!escopo) return null;

    var bridge = ETAPA_BRIDGE[etapa] || ETAPA_BRIDGE.criterios;
    var html =
      "Para o escopo <strong>«" + escapeHtml(escopo) + "»</strong>";
    if (objetivo) {
      html += ", com o objetivo de <em>" + escapeHtml(objetivo) + "</em>";
    }
    html += ", " + bridge;
    return html;
  }

  function buildCardHtml(cfg, introHtml) {
    var codigo = cfg && cfg.codigo ? " — " + escapeHtml(cfg.codigo) : "";
    return (
      '<div class="ahp-recommendation ahp-contexto-personalizado" data-ahp-contexto-ui>' +
      '<div class="ahp-recommendation__head">' +
      '<i class="fas fa-bullseye" aria-hidden="true"></i>' +
      "<strong>Contexto da sua análise" +
      codigo +
      "</strong></div>" +
      '<p class="ahp-contexto-intro">' +
      introHtml +
      "</p></div>"
    );
  }

  function insertContextoCard(infoCard, cardHtml) {
    var content = infoCard.querySelector(".info-card-content");
    if (content) {
      content.insertAdjacentHTML("beforeend", cardHtml);
    } else {
      infoCard.insertAdjacentHTML("beforeend", cardHtml);
    }
  }

  function apply(cfg) {
    var body = findContextoBody();
    if (!body) return;

    var etapa = etapaFromPath();
    var introHtml = cfg ? buildIntroHtml(cfg, etapa) : null;
    var genericP = markGenericIntro(body);
    var existing = body.querySelector("[data-ahp-contexto-ui]");

    if (!introHtml) {
      if (existing) existing.remove();
      if (genericP) genericP.classList.remove("is-hidden");
      personalizarExemploSaaty(null);
      return;
    }

    var cardHtml = buildCardHtml(cfg, introHtml);
    if (existing) existing.remove();

    var infoCard = body.querySelector(".info-card");
    if (infoCard) {
      insertContextoCard(infoCard, cardHtml);
    } else {
      body.insertAdjacentHTML("beforeend", cardHtml);
    }
    if (genericP) genericP.classList.add("is-hidden");

    personalizarExemploSaaty(cfg);
  }

  /* -------------------------------------------------------
   * Personalização do bloco de exemplo da Escala de Saaty
   * Preenche com os 2 primeiros critérios reais da config.
   * Chamado quando a config é carregada (apply) ou limpa (reset).
   * ------------------------------------------------------- */
  var DEFAULTS = {
    critA: "Proximidade a centros urbanos",
    critB: "Disponibilidade de infraestrutura",
    titulo: "Exemplo prático",
    objetivo: "esta decisão",
  };

  function personalizarExemploSaaty(cfg) {
    var box = global.document.getElementById("saaty-example-box");
    if (!box) return;

    var criterios = cfg && cfg.criterios ? cfg.criterios : [];
    var nomeA = criterios.length > 0
      ? String(criterios[0].criterio || criterios[0] || "").trim() || DEFAULTS.critA
      : DEFAULTS.critA;
    var nomeB = criterios.length > 1
      ? String(criterios[1].criterio || criterios[1] || "").trim() || DEFAULTS.critB
      : DEFAULTS.critB;
    var area      = cfg && cfg.area_conhecimento ? String(cfg.area_conhecimento).trim() : "";
    var tema      = cfg && cfg.tema             ? String(cfg.tema).trim()             : "";
    var fenomeno  = cfg && cfg.fenomeno         ? String(cfg.fenomeno).trim()         : "";
    var objetivo  = cfg && cfg.objetivo         ? String(cfg.objetivo).trim()         : "";
    var escopo    = cfg && (cfg.nome || cfg.escopo) ? String(cfg.nome || cfg.escopo).trim() : "";

    var titulo = escopo ? "Exemplo com sua configuração (" + escopo + ")" : DEFAULTS.titulo;

    /* Monta frase de escopo a partir dos 4 componentes disponíveis */
    var partes = [area, tema, fenomeno].filter(Boolean);
    var escopoFrase = partes.length > 0 ? partes.join(" · ") : "favorabilidade à execução de projetos";
    if (objetivo) escopoFrase += " — " + objetivo;

    function setText(id, val) {
      var el = global.document.getElementById(id);
      if (el) el.textContent = val;
    }

    setText("saaty-ex-title",    titulo);
    setText("saaty-ex-crit-a",   "A — " + nomeA);
    setText("saaty-ex-crit-b",   "B — " + nomeB);
    /* Frase única de escopo no breadcrumb e nas perguntas */
    setText("saaty-ex-escopo",   escopoFrase);
    setText("saaty-ex-q-escopo", "'" + escopoFrase + "'");
    /* Critérios nas perguntas */
    setText("saaty-ex-q-a",  nomeA);
    setText("saaty-ex-q-b",  nomeB);
    /* Parágrafo dinâmico da introdução da escala */
    setText("saaty-intro-escopo",    escopoFrase || "desta análise");
    setText("saaty-intro-crit-ref",  nomeA || "em foco");
    setText("saaty-intro-crit-outro", nomeB || "comparado");

    /* Atualiza menções inline dentro das respostas */
    box.querySelectorAll(".saaty-ex-inline-a").forEach(function (el) {
      el.textContent = nomeA;
    });
    box.querySelectorAll(".saaty-ex-inline-b").forEach(function (el) {
      el.textContent = nomeB;
    });
    box.querySelectorAll(".saaty-ex-inline-fenomeno").forEach(function (el) {
      el.textContent = fenomeno || tema || escopoFrase;
    });

    /* Destaca visualmente o box quando personalizado */
    if (cfg) {
      box.classList.add("saaty-example-box--personalizado");
    } else {
      box.classList.remove("saaty-example-box--personalizado");
    }
  }

  function reset() {
    apply(null);
  }

  function initFromApi() {
    if (!global.SLTConfigBridge || !global.SLTConfigBridge.obterConfig) return;
    if (!global.SLTConfigBridge.getConfigAtual || !global.SLTConfigBridge.getConfigAtual()) {
      reset();
      return;
    }
    global.SLTConfigBridge.obterConfig().then(function (cfg) {
      if (cfg) apply(cfg);
      else reset();
    });
  }

  global.SLTAhpContextoUI = {
    apply: apply,
    reset: reset,
    initFromApi: initFromApi,
  };

  global.document.addEventListener("DOMContentLoaded", initFromApi);
})(window);
