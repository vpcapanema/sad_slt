(() => {
  "use strict";

  const container = document.querySelector("#perguntas-avaliacao");
  const form = document.querySelector("#pesquisa-form");
  const status = document.querySelector("#pesquisa-status");
  const sucesso = document.querySelector("#pesquisa-sucesso");
  if (!container || !form || !status || !sucesso) return;
  const acesso = document.querySelector("#pesquisa-acesso");
  const acessoStatus = document.querySelector("#pesquisa-acesso-status");
  let credenciais = null;

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

  async function enviarJson(formulario, dados, mensagem) {
    const response = await fetch(formulario.action, {
      method: formulario.method,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(dados),
    });
    if (!response.ok) {
      const resultado = await response.json().catch(() => ({}));
      const detalhe = resultado.detail;
      const erro = new Error(resultado.message || detalhe?.mensagem ||
        (typeof detalhe === "string" ? detalhe : mensagem));
      erro.codigo = detalhe?.codigo;
      throw erro;
    }
  }

  function exibirErro(destino, mensagem) {
    destino.className = "pesquisa-status pesquisa-status--erro";
    destino.textContent = mensagem;
  }

  function abrirPesquisa(dados, focar) {
    credenciais = dados;
    acesso.reset();
    acessoStatus.textContent = "";
    acesso.hidden = true;
    form.hidden = false;
    if (focar) form.elements.namedItem("perfil").focus();
  }

  const julgamento = acesso?.elements.namedItem("julgamento")?.value;
  if (julgamento) {
    const sessao = { julgamento };
    enviarJson(acesso, sessao, "Não foi possível validar a inscrição.")
      .then(() => { if (!credenciais) abrirPesquisa(sessao, false); })
      .catch(() => { /* O formulário de retomada permanece disponível. */ });
  }

  acesso?.addEventListener("submit", async (event) => {
    event.preventDefault();
    acessoStatus.className = "pesquisa-status";
    acessoStatus.textContent = "";
    if (!acesso.reportValidity()) return;

    const botao = acesso.querySelector("button[type=submit]");
    if (botao.disabled) return;
    botao.disabled = true;
    acessoStatus.textContent = "Validando o acesso…";
    const dados = Object.fromEntries(new FormData(acesso));
    try {
      await enviarJson(acesso, dados, "Não foi possível validar o acesso.");
      abrirPesquisa(dados, true);
    } catch (error) {
      exibirErro(acessoStatus, error.message);
    } finally {
      botao.disabled = false;
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "pesquisa-status";
    status.textContent = "";
    if (!form.reportValidity()) return;
    if (acesso && !credenciais) return;

    const botao = form.querySelector("button[type=submit]");
    if (botao.disabled) return;
    botao.disabled = true;
    botao.textContent = "Enviando…";
    const dados = Object.fromEntries(new FormData(form).entries());
    dados.escala_maxima = niveis.length;
    perguntas.forEach(([nome]) => { dados[nome] = Number(dados[nome]); });
    if (acesso) dados.acesso = credenciais;

    try {
      await enviarJson(form, dados, "Não foi possível registrar sua avaliação.");
      credenciais = null;
      form.hidden = true;
      sucesso.hidden = false;
      sucesso.focus();
    } catch (error) {
      if (acesso && ["convite_invalido", "inscricao_invalida"].includes(error.codigo)) {
        acesso.elements.namedItem("email").value = credenciais.email || "";
        credenciais = null;
        form.hidden = true;
        acesso.hidden = false;
        exibirErro(acessoStatus, error.message);
        acesso.elements.namedItem("token_acesso").focus();
      } else {
        exibirErro(status, error.message || "Não foi possível registrar sua avaliação. Tente novamente.");
      }
      botao.disabled = false;
      botao.textContent = "Enviar avaliação";
    }
  });
})();
