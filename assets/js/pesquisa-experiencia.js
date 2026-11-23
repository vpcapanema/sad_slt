(() => {
  "use strict";

  const container = document.querySelector("#perguntas-avaliacao");
  const form = document.querySelector("#pesquisa-form");
  const status = document.querySelector("#pesquisa-status");
  const sucesso = document.querySelector("#pesquisa-sucesso");
  if (!container || !form || !status || !sucesso) return;

  const perguntas = form.dataset.pesquisa === "ahp" ? [
    ["facilidade", "Foi fácil identificar os dois critérios de cada comparação."],
    ["autonomia", "Consegui preencher as comparações sem precisar de ajuda adicional."],
    ["clareza_interface", "A escala de importância deixou claro como registrar minha preferência entre os dois critérios."],
    ["compreensao_resultados", "A indicação da Razão de Consistência (RC) me ajudou a entender se precisava revisar minhas comparações."],
    ["desempenho", "O formulário respondeu rapidamente durante o preenchimento e o envio."],
    ["satisfacao_geral", "De modo geral, fiquei satisfeito com a experiência de preencher o formulário."],
  ] : [
    ["facilidade", "É fácil encontrar as funções que preciso."],
    ["autonomia", "Consigo realizar minhas atividades sem precisar de ajuda."],
    ["clareza_interface", "Os textos, botões e instruções são claros."],
    ["compreensao_resultados", "Os resultados apresentados são fáceis de compreender."],
    ["desempenho", "O sistema responde de maneira adequada durante o uso."],
    ["satisfacao_geral", "De modo geral, estou satisfeito com o SICARD."],
  ];

  const niveis = [
    "Discordo totalmente", "Discordo", "Discordo um pouco", "Neutro",
    "Concordo um pouco", "Concordo", "Concordo totalmente",
  ];
  perguntas.forEach(([nome, texto], indice) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "pergunta-escala";
    fieldset.innerHTML = `<legend><span>${indice + 1}.</span> ${texto}</legend>
      <div class="escala-opcoes">
        ${niveis.map((nivel, indice) => [nivel, indice + 1]).map(([nivel, nota]) => `<label title="${nivel}">
          <input type="radio" name="${nome}" value="${nota}" aria-label="${nota} — ${nivel}" required>
          <span>${nota}</span>
        </label>`).join("")}
      </div>
      <div class="escala-extremos" aria-hidden="true"><span>Discordo totalmente</span><span>Neutro</span><span>Concordo totalmente</span></div>`;
    container.appendChild(fieldset);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "pesquisa-status";
    status.textContent = "";
    if (!form.reportValidity()) return;

    const botao = form.querySelector("button[type=submit]");
    botao.disabled = true;
    botao.textContent = "Enviando…";
    const dados = Object.fromEntries(new FormData(form).entries());
    dados.escala_maxima = niveis.length;
    perguntas.forEach(([nome]) => { dados[nome] = Number(dados[nome]); });

    try {
      const response = await fetch(form.action, {
        method: form.method,
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dados),
      });
      const resultado = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resultado.detail || "Não foi possível registrar sua avaliação.");
      form.hidden = true;
      sucesso.hidden = false;
      sucesso.focus();
    } catch (error) {
      status.className = "pesquisa-status pesquisa-status--erro";
      status.textContent = error.message || "Não foi possível registrar sua avaliação. Tente novamente.";
      botao.disabled = false;
      botao.textContent = "Enviar avaliação";
    }
  });
})();
