document.addEventListener("DOMContentLoaded", function () {
  const prazo = document.getElementById("inscricao-prazo");
  if (prazo) {
    prazo.textContent = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo",
    }).format(new Date(prazo.dateTime));
  }
  const form = document.getElementById("ahp-inscricao");
  if (!form) return;
  const feedback = document.getElementById("inscricao-feedback");
  const secaoCodigo = form.querySelector("details");
  const campoCodigo = form.elements.codigo_retomada;
  secaoCodigo.addEventListener("toggle", function () {
    form.elements.nome_completo.required = !secaoCodigo.open;
    form.elements.instituicao.required = !secaoCodigo.open;
    campoCodigo.disabled = !secaoCodigo.open;
    campoCodigo.required = secaoCodigo.open;
  });
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const botao = form.querySelector("button[type=submit]");
    if (botao.disabled) return;
    const dados = Object.fromEntries(new FormData(form));
    if (secaoCodigo.open) {
      delete dados.nome_completo;
      delete dados.instituicao;
      dados.codigo_retomada = dados.codigo_retomada.trim();
    } else {
      delete dados.codigo_retomada;
    }
    botao.disabled = true;
    feedback.textContent = "Confirmando sua inscrição…";
    try {
      const resposta = await fetch(form.dataset.api, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(typeof corpo?.detail === "string" ? corpo.detail :
          "Confira se os dados da inscrição estão corretos e completos.");
      }
      window.location.replace(form.dataset.formularioUrl);
    } catch (erro) {
      feedback.textContent = erro.message || "Falha ao confirmar sua inscrição. Tente novamente.";
      botao.disabled = false;
    }
  });
});
