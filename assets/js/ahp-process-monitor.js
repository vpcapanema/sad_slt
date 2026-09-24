/* Monitor transversal do fluxo AHP: progresso, erros e status das ações. */
(function (global) {
  "use strict";
  // Páginas com `feedback-proprio` relatam o processo real (confirmação, log do
  // servidor e desfecho). O monitor não substitui esse acompanhamento.
  function ativo() {
    if (document.body.classList.contains("feedback-proprio")) return false;
    return document.body.classList.contains("ahp-module-page") || document.body.classList.contains("ahp-colaborativa-page");
  }
  function mensagem(el) { return (el && (el.getAttribute("aria-label") || el.textContent || "")).replace(/\s+/g, " ").trim(); }
  function iniciar(acao) {
    if (!global.SLTFeedback || !ativo()) return null;
    var proc = global.SLTFeedback.processo(acao || "Executar ação AHP");
    var p2 = proc.passo("Aguardando a resposta do serviço…");
    return { proc: proc, passo: p2 };
  }
  function concluir(ref, tipo, texto) {
    if (!ref) return;
    ref.proc.atualizar(ref.passo, tipo === "success" ? "success" : typeo(tipo), texto);
    ref.proc.concluir({ type: tipo || "success", message: texto || "Operação concluída." });
  }
  function typeo(tipo) { return tipo === "warning" ? "warning" : tipo === "error" ? "error" : "info"; }
  // O chamador inicia/conclui com a resposta real. Cliques e timers não
  // comprovam validação, execução ou sucesso no servidor.
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
