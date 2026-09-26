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
  var TAREFA = "Aguardando a resposta do serviço";
  function iniciar(acao) {
    if (!global.ProcessFeedback || !ativo()) return null;
    var proc = global.ProcessFeedback.iniciarCadastro(acao || "Executar ação AHP", [TAREFA]);
    proc.tarefaAtual(TAREFA);
    return { proc: proc, acao: acao || "Executar ação AHP" };
  }
  function concluir(ref, tipo, texto) {
    if (!ref) return;
    if (tipo === "error") { ref.proc.erro({ message: texto || "O serviço recusou a operação." }); return; }
    ref.proc.concluirTarefa(TAREFA, "Resposta recebida");
    ref.proc.sucesso({ message: texto || "Operação concluída.", _status: tipo === "warning" ? "partial" : undefined });
  }
  // O chamador inicia/conclui com a resposta real. Cliques e timers não
  // comprovam validação, execução ou sucesso no servidor.
  global.addEventListener("error", function (event) {
    if (!ativo() || !global.Notify) return;
    global.Notify.error("Falha no processo AHP", event.message || "Erro inesperado no navegador.");
  });
  global.addEventListener("unhandledrejection", function (event) {
    if (!ativo() || !global.Notify) return;
    var reason = event.reason && event.reason.message ? event.reason.message : String(event.reason || "Erro inesperado.");
    global.Notify.error("Falha na operação AHP", reason);
  });
  global.SLTAhpProcess = { iniciar: iniciar, concluir: concluir };
})(window);
