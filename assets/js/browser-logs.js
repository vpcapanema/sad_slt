/* Diagnóstico local opt-in. Nunca lê valores de campos, mensagens ou corpos HTTP. */
(function (global) {
  "use strict";
  if (global.SICARDBrowserLogs) return;
  const pages = new Set(["fase1", "fase2", "fase3", "processos", "agrupamentos", "julgamentos", "respostas"]);
  const page = document.currentScript?.dataset.sicardLogPage;
  if (!pages.has(page)) return;
  const started = performance.now();
  let sequence = 0, verbose = false;
  try {
    const option = new URLSearchParams(location.search).get("sicard_logs");
    verbose = option === "verbose" || (option !== "off" && localStorage.getItem("sicard.browserLogs") === "verbose");
  } catch (_) {
    verbose = new URLSearchParams(location.search).get("sicard_logs") === "verbose";
  }
  const numeric = new Set(["duracao_ms", "status_http", "tentativa", "entradas", "bases", "camadas", "feicoes",
    "campos", "bytes", "revisao", "percentual", "tarefa_id", "tarefa_total", "tarefa_concluidas", "eventos",
    "categorias", "finalidades", "arquivos", "camadas_visiveis", "total_fases", "fases_concluidas", "progresso_tarefa"]);
  const booleans = new Set(["valido", "busy", "resultado", "cancelavel", "cancelamento_solicitado", "loadingMap", "loadingCatalog", "uploading", "recorte", "local"]);
  const enums = {
    metodo: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    erro: ["Error", "TypeError", "AbortError", "TimeoutError", "SyntaxError", "QuotaExceededError", "outro"],
    status: ["pendente", "executando", "concluido", "parcial", "erro", "cancelado"],
    origem: ["polling", "sse", "interface", "http"],
    controle: ["button", "input", "select", "textarea", "form", "a", "outro"],
  };
  const controls = new Set(("ev-run fv-run fase-hierarquizacao fase3-ausentes fase3-executar fase3-salvar fase3-sintetizar " +
    "hier-new hier-bulk-edit hier-bulk-delete hier-bulk-view hier-save hier-cancel hier-agrupamento " +
    "ami-new ami-create-form ami-delete ami-edit ami-view ami-monitor-clear ami-copy-email-link " +
    "agrupamento-new agrupamento-save agrupamento-cancel agrupamento-nome").split(" "));
  for (const prefix of ["ev", "fv"]) {
    for (const role of ["entrada", "restricao", "risco", "grade", "rede", "bases", "hier"]) {
      for (const action of ["browse", "enviar", "salvar", "carregar", "limpar", "camadas"]) controls.add(`${prefix}-${role}-${action}`);
    }
    controls.add(`${prefix}-hierarquizacao`);
  }
  const segments = new Set(("api sicard ahp geoespacial extracao-atributos hierarquizacoes configuracoes objetos " +
    "agrupamentos-demandas comparacao-colaborativa ambientes respostas julgamentos fases atributos pesos riscos " +
    "executar calcular sintetizar sintese homologar publicar despublicar reverter-homologacao sincronizar-composicao " +
    "portfolio universo campos catalogo compatibilizar execucoes jobs cancelar pacote eventos tabela dashboard " +
    "intersecoes relatorios processamento analitico entrada-local pastas storage-upload sessoes resultado municipal " +
    "categorias preview dominios adversidades camadas resolver admin tabelas demandas grupos_demandas geo limites " +
    "estado-sao-paulo biblioteca-canonica arquivos restrict comparacao fatiamentos fase1 fase2 fase3 pacotes").split(" "));
  function safeRoute(value) {
    // Não usa URL.host nem serializa credenciais, parâmetros ou identificadores.
    let path;
    try { path = new URL(String(value), location.href).pathname; } catch (_) { return "/:ref"; }
    return "/" + path.split("/").filter(Boolean).map(part => segments.has(part) ? part : ":ref").join("/");
  }
  function snapshot(data) {
    const out = { pagina: page };
    for (const [key, value] of Object.entries(data || {})) {
      if (numeric.has(key) && typeof value === "number" && Number.isFinite(value)) out[key] = Math.round(value * 100) / 100;
      else if (booleans.has(key) && typeof value === "boolean") out[key] = value;
      else if (enums[key]?.includes(value)) out[key] = value;
      else if (key === "alvo" && controls.has(value)) out[key] = value;
      else if (key === "rota") out[key] = safeRoute(value);
      else if (["acao", "requisicao"].includes(key) && /^(inicio|[ar]-[0-9]+)$/.test(value)) out[key] = value;
    }
    return Object.freeze(out);
  }
  function log(event, data = {}, level = "info") {
    if (!verbose && level !== "error") return;
    const name = /^[a-z][a-z0-9_.-]{0,70}$/.test(event) ? event : "evento";
    try { global.console[["info", "warn", "error"].includes(level) ? level : "info"](`[SICARD][${page}] ${name}`, snapshot(data)); }
    catch (_) { /* O diagnóstico nunca interrompe a aplicação. */ }
  }
  function failure(event, error, data = {}) {
    log(event, { ...data, status_http: Number(error?.status) || 0,
      erro: enums.erro.includes(error?.name) ? error.name : "outro" }, "error");
  }
  async function request(input, options) {
    const requisicao = `r-${++sequence}`, inicio = performance.now();
    const metodo = String(options?.method || input?.method || "GET").toUpperCase();
    const rota = typeof input === "string" || input instanceof URL ? String(input) : input?.url;
    const context = { requisicao, metodo, rota };
    log("http.inicio", context);
    try {
      const response = await global.fetch(input, options);
      log("http.fim", { ...context, status_http: response.status, duracao_ms: performance.now() - inicio },
        response.ok ? "info" : "error");
      return response;
    } catch (error) {
      failure("erro.http", error, { ...context, duracao_ms: performance.now() - inicio });
      throw error;
    }
  }
  global.SICARDBrowserLogs = Object.freeze({
    log, falha: failure, fetch: request,
    ativar() { verbose = true; log("console.ativado"); },
    desativar() { log("console.desativado"); verbose = false; },
    status: () => Object.freeze({ pagina: page, verbose }),
  });
  // Observação passiva: não impede, cancela ou modifica eventos da aplicação.
  for (const type of ["click", "change", "submit", "invalid"]) {
    document.addEventListener(type, event => {
      const node = event.target?.closest?.("button,input,select,textarea,form,a");
      if (!node) return;
      log(type === "invalid" ? "validacao.nativa_rejeitada" : `acao.${type}`,
        { acao: `a-${++sequence}`, controle: node.tagName.toLowerCase(), alvo: node.id, ...(type === "invalid" ? { valido: false } : {}) },
        type === "invalid" ? "warn" : "info");
    }, true);
  }
  global.addEventListener("error", event => failure("erro.nao_tratado", event.error), true);
  global.addEventListener("unhandledrejection", event => failure("erro.promise", event.reason));
  const loaded = () => log("pagina.carregada", { duracao_ms: performance.now() - started });
  if (document.readyState === "complete") loaded();
  else global.addEventListener("load", loaded, { once: true });
  log("pagina.iniciada");
  try { console.info(`[SICARD][${page}] Diagnóstico: ?sicard_logs=verbose ou localStorage.setItem("sicard.browserLogs","verbose") e recarregue. Erros sempre visíveis. SICARDBrowserLogs.status().`); } catch (_) {}
})(window);
