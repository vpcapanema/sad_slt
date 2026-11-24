document.addEventListener("DOMContentLoaded", function () {
  const status = document.getElementById("ahp-fila-status");
  if (!status) return;

  async function atualizarPosicao() {
    try {
      const resposta = await fetch(status.dataset.api, {
        method: "POST", credentials: "same-origin",
      });
      const atual = await resposta.json();
      if (resposta.status === 422) {
        status.textContent = atual.detail;
        return;
      }
      if (!resposta.ok) throw new Error();
      if (atual.situacao !== "aguardando") {
        window.location.reload();
        return;
      }
      status.textContent = "Sua posição na fila é " + atual.posicao + ".";
    } catch (_erro) {
      status.textContent = "Não foi possível consultar sua posição. A consulta será repetida automaticamente.";
    }
    window.setTimeout(atualizarPosicao, 6000 + Math.random() * 2000);
  }

  window.setTimeout(atualizarPosicao, 6000 + Math.random() * 2000);
});
