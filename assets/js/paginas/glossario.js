(() => {
  "use strict";
  const form = document.getElementById("glossario-busca");
  const input = document.getElementById("glossario-termo");
  if (!form || !input) return;

  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const entries = Array.from(document.querySelectorAll(".glossario-entrada"), (element) => ({
    element,
    text: normalize(element.textContent),
    index: document.querySelector(`[data-indice-termo="${element.id}"]`),
  }));
  const groups = Array.from(document.querySelectorAll(".glossario-grupo"));
  const count = document.getElementById("glossario-contagem");
  const empty = document.getElementById("glossario-sem-resultados");

  function filter() {
    const words = normalize(input.value).trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    entries.forEach(({ element, text, index }) => {
      const matches = words.every((word) => text.includes(word));
      element.hidden = !matches;
      if (index) index.hidden = !matches;
      if (matches) visible += 1;
    });
    groups.forEach((group) => {
      group.hidden = !group.querySelector(".glossario-entrada:not([hidden])");
      const index = document.querySelector(`[data-indice-grupo="${group.id}"]`);
      if (index) index.hidden = group.hidden;
    });
    count.textContent = `${visible} de ${entries.length} termos`;
    empty.hidden = visible !== 0;
  }

  function revealFragment() {
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !target.closest("#glossario-conteudo")) return;
    if (target.hidden || target.closest("[hidden]")) {
      input.value = "";
      filter();
    }
    target.scrollIntoView({ block: "start" });
  }

  form.addEventListener("submit", (event) => event.preventDefault());
  input.addEventListener("input", filter);
  form.addEventListener("reset", (event) => {
    event.preventDefault();
    input.value = "";
    filter();
    input.focus();
  });
  window.addEventListener("hashchange", revealFragment);
  form.hidden = false;
  filter();
  revealFragment();
})();
