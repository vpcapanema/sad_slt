SLTAdminAuth.requireAuth();

// Garante que a página abra no topo: o navegador restaura a rolagem anterior ao
// recarregar/voltar e alguns componentes rolam ao inicializar. Fixamos o topo
// por uma breve janela inicial, cancelando assim que o usuário rolar de propósito.
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  let userScrolled = false;
  const userEvents = ["wheel", "touchmove", "keydown"];
  const markUser = () => { userScrolled = true; cleanup(); };
  userEvents.forEach((ev) => window.addEventListener(ev, markUser, { passive: true }));

  const pinTop = () => { if (!userScrolled && window.scrollY !== 0) window.scrollTo(0, 0); };
  window.addEventListener("scroll", pinTop, { passive: true, capture: true });

  const deadline = performance.now() + 2500;
  let rafId = 0;
  const loop = () => {
    pinTop();
    if (!userScrolled && performance.now() < deadline) rafId = requestAnimationFrame(loop);
    else cleanup();
  };

  function cleanup() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("scroll", pinTop, { capture: true });
    userEvents.forEach((ev) => window.removeEventListener(ev, markUser));
  }

  window.scrollTo(0, 0);
  rafId = requestAnimationFrame(loop);
})();
