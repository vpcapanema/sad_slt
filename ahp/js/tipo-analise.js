(function () {
  const STORAGE_KEY = "slt_ahp_tipo";
  const cards = document.querySelectorAll(".ahp-tipo-card");
  const form = document.getElementById("form-tipo-analise");

  function syncSelection() {
    cards.forEach(function (card) {
      const input = card.querySelector('input[type="radio"]');
      card.classList.toggle("selected", input.checked);
    });
  }

  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      const input = card.querySelector('input[type="radio"]');
      input.checked = true;
      syncSelection();
    });
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "avulsa" || saved === "portfolio") {
    const input = form.querySelector('input[value="' + saved + '"]');
    if (input) {
      input.checked = true;
      syncSelection();
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const selected = form.querySelector('input[name="tipo_analise"]:checked');
    if (!selected) {
      alert("Selecione o tipo de análise para continuar.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, selected.value);
    window.location.href = "step1-criterios.html";
  });
})();
