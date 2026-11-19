(function () {
  "use strict";
  const valor = document.getElementById("ami-copy-key-value");
  const botao = document.getElementById("ami-copy-key-button");
  const feedback = document.getElementById("ami-copy-key-feedback");
  let chave = "";
  try { chave = decodeURIComponent(location.hash.slice(1)); } catch (_error) {}
  if (!/^[A-Za-z0-9_-]{43}$/.test(chave)) {
    valor.textContent = "Chave ausente ou inválida.";
    feedback.textContent = "Abra novamente o botão Copiar chave recebido no e-mail.";
    return;
  }
  valor.textContent = chave;
  botao.disabled = false;
  botao.addEventListener("click", async function () {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(chave);
      else {
        const campo = document.createElement("textarea");
        campo.value = chave; campo.setAttribute("readonly", ""); campo.style.position = "fixed";
        campo.style.opacity = "0"; document.body.appendChild(campo); campo.select();
        if (!document.execCommand("copy")) throw new Error("Cópia não autorizada pelo navegador.");
        campo.remove();
      }
      feedback.textContent = "Chave copiada. Volte ao formulário e cole no campo solicitado.";
    } catch (_error) {
      feedback.textContent = "Não foi possível copiar automaticamente. Selecione a chave acima e use Copiar.";
    }
  });
})();
