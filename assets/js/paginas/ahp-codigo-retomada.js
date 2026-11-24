document.addEventListener("DOMContentLoaded", function () {
  const painel = document.getElementById("collab-retomada");
  if (!painel) return;
  const campo = document.getElementById("collab-retomada-codigo");
  const status = document.getElementById("collab-retomada-feedback");
  let carregando = false;

  painel.addEventListener("toggle", async function () {
    if (!painel.open || campo.value || carregando) return;
    carregando = true;
    status.textContent = "Carregando o código…";
    try {
      const resposta = await fetch(painel.dataset.api, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: painel.dataset.email }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        throw new Error(typeof dados.detail === "string" ? dados.detail : "Não foi possível carregar o código.");
      }
      campo.value = dados.codigo_retomada;
      campo.hidden = false;
      status.textContent = "";
    } catch (erro) {
      status.textContent = erro.message || "Não foi possível carregar o código.";
    } finally {
      carregando = false;
    }
  });
});
