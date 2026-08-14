/* Monitor transversal do fluxo AHP: progresso, erros e status das ações. */
(function (global) {
  "use strict";
  function ativo() { return document.body.classList.contains("ahp-module-page") || document.body.classList.contains("ahp-colaborativa-page"); }
  function mensagem(el) { return (el && (el.getAttribute("aria-label") || el.textContent || "")).replace(/\s+/g, " ").trim(); }
  function iniciar(acao) {
    if (!global.SLTFeedback || !ativo()) return null;
    var proc = global.SLTFeedback.processo(acao || "Executando ação AHP");
    var p1 = proc.passo("Validando dados…");
    proc.atualizar(p1, "success", "Dados validados");
    var p2 = proc.passo("Enviando operação…");
    return { proc: proc, passo: p2 };
  }
  function concluir(ref, tipo, texto) {
    if (!ref) return;
    ref.proc.atualizar(ref.passo, tipo === "success" ? "success" : typeo(tipo), texto);
    ref.proc.concluir({ type: tipo || "success", message: texto || "Operação concluída." });
  }
  function typeo(tipo) { return tipo === "warning" ? "warning" : tipo === "error" ? "error" : "info"; }
  document.addEventListener("click", function (event) {
    if (!ativo()) return;
    var el = event.target.closest("button[type=submit], button.btn, [data-evento-inline]");
    if (!el || el.disabled || el.dataset.ahpMonitor === "1") return;
    var label = mensagem(el);
    if (!/continuar|salvar|salvar|persist|calcular|confirmar|homologar|enviar|consolidar|executar/i.test(label)) return;
    el.dataset.ahpMonitor = "1";
    var ref = iniciar(label);
    if (ref) global.setTimeout(function () {
      if (document.body.contains(el)) concluir(ref, "info", "Ação iniciada. Acompanhe o processamento nesta página.");
    }, 900);
  }, true);
  global.addEventListener("error", function (event) {
    if (!ativo() || !global.SLTFeedback) return;
    global.SLTFeedback.error(event.message || "Erro inesperado no navegador.", "Falha no processo AHP");
  });
  global.addEventListener("unhandledrejection", function (event) {
    if (!ativo() || !global.SLTFeedback) return;
    var reason = event.reason && event.reason.message ? event.reason.message : String(event.reason || "Erro inesperado.");
    global.SLTFeedback.error(reason, "Falha na operação AHP");
  });
  global.SLTAhpProcess = { iniciar: iniciar, concluir: concluir };
})(window);
