(function () {
  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "index.html";

  const EYE_OPEN =
    '<path d="M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>';
  const EYE_CLOSED =
    '<path d="M12 6.5c2.5 0 4.6 1.2 6.1 3.1l1.4-1.4C17.2 5.6 14.7 4.5 12 4.5 7 4.5 2.7 7.6 1 11.5l1.5 1.5C4 9.4 7.7 6.5 12 6.5zm0 3a3 3 0 0 0-2.8 4.1l1.4-1.4A1.5 1.5 0 1 1 13.5 12l1.4-1.4A3 3 0 0 0 12 9.5zM3.3 4.2 2 5.5l3.2 3.2C3.6 10.2 2.2 11.6 1 13.5l1.5 1.5c1.2-2.2 3.4-4 6.2-5.1l2.8 2.8c-.5.2-1 .5-1.5.9L16.5 16l1.3 1.3 14-14L20.7 2 6.5 16.2l-1.4-1.4 1.8-1.8C5.8 12.1 4.6 11 3.5 9.7L3.3 4.2z"/>';

  async function init() {
    try {
      await SLTAdminApi.fetchSession();
      location.replace(next);
      return;
    } catch {
      /* sem sessão — permanece na tela de login */
    }

    const form = document.getElementById("form-login");
    const erro = document.getElementById("login-erro");
    const btn = document.getElementById("btn-entrar");
    const senhaInput = document.getElementById("senha");
    const toggleSenha = document.getElementById("btn-toggle-senha");
    const eyeIcon = toggleSenha.querySelector(".icon-eye");

    toggleSenha.addEventListener("click", () => {
      const visible = senhaInput.type === "text";
      senhaInput.type = visible ? "password" : "text";
      eyeIcon.innerHTML = visible ? EYE_OPEN : EYE_CLOSED;
      toggleSenha.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
      toggleSenha.setAttribute("aria-pressed", visible ? "false" : "true");
      toggleSenha.title = visible ? "Mostrar senha" : "Ocultar senha";
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erro.classList.add("hidden");
      btn.disabled = true;
      try {
        await SLTAdminApi.login(
          document.getElementById("login").value.trim(),
          document.getElementById("senha").value
        );
        location.replace(next);
      } catch (err) {
        erro.textContent = err.message || "Não foi possível entrar.";
        erro.classList.remove("hidden");
        SLTAdminUi.showToast(erro.textContent, true);
      } finally {
        btn.disabled = false;
      }
    });
  }

  init().catch(console.error);
})();
