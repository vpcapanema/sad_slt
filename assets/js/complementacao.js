(function () {
  const select = document.querySelector("#complementacao-objeto");
  const form = document.querySelector("#complementacao-form");
  const campos = document.querySelector("#complementacao-campos");
  const resumo = document.querySelector("#complementacao-resumo");
  const status = document.querySelector("#complementacao-status");
  const salvar = form.querySelector('button[type="submit"]');
  let itens = [];
  let atual = null;

  const esc = (valor) => String(valor ?? "").replace(
    /[&<>"']/g,
    (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[caractere]),
  );

  async function api(url, opcoes) {
    const resposta = await fetch(url, { credentials: "same-origin", ...opcoes });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.detail || `HTTP ${resposta.status}`);
    return corpo;
  }

  function input(coluna, valor, bloqueado) {
    const id = `attr-${coluna.id}`;
    const obrigatorio = coluna.mandatorio && !bloqueado ? " required" : "";
    if (coluna.tipo === "booleano") {
      return `<select id="${id}" data-id="${coluna.id}"${obrigatorio}${bloqueado ? " disabled" : ""}><option value="">— Não informado —</option><option value="true">Sim</option><option value="false">Não</option></select>`;
    }
    if (coluna.tipo === "numerico") {
      return `<input id="${id}" data-id="${coluna.id}" type="number" step="${coluna.formato === "inteiro" ? "1" : "any"}" value="${esc(valor ?? "")}"${obrigatorio}${bloqueado ? " readonly" : ""}>`;
    }
    return `<input id="${id}" data-id="${coluna.id}" type="text" value="${esc(valor ?? "")}"${obrigatorio}${bloqueado ? " readonly" : ""}>`;
  }

  function render(item) {
    atual = item;
    campos.innerHTML = item.colunas.map((coluna) => {
      const slot = item.valores[coluna.id] || {};
      const cadastral = slot.origem === "cadastro";
      const bloqueado = cadastral || !item.pode_editar;
      const origem = cadastral ? "Obtido do cadastro" : (item.pode_editar ? "Complementação" : "Somente leitura");
      return `<div class="complementacao-campo${bloqueado ? " is-readonly" : ""}"><label for="attr-${coluna.id}">${esc(coluna.alias || coluna.criterio)}${coluna.mandatorio ? ' <span class="req">*</span>' : ""}</label><div class="complementacao-meta">${esc(coluna.unidade || "Sem unidade")} ${esc(coluna.relacao_simbolo || "")} · ${origem}</div>${input(coluna, slot.valor, bloqueado)}${coluna.premissa ? `<p class="complementacao-premissa">${esc(coluna.premissa)}</p>` : ""}</div>`;
    }).join("");
    form.classList.remove("hidden");
    salvar.disabled = !item.pode_editar;
    salvar.classList.toggle("hidden", !item.pode_editar);
    resumo.textContent = `${item.tipo_demanda} · ${item.atributos_preenchidos} de ${item.total_atributos} atributos preenchidos · ${item.hierarquizacao_nome || item.hierarquizacao_codigo} · ${item.pode_editar ? "Sua demanda — edição permitida" : "Demanda de outro responsável — somente leitura"}`;
    status.className = "complementacao-status";
    status.textContent = item.pode_editar ? "" : "Você pode consultar esta demanda, mas somente o responsável pode complementá-la.";
    for (const coluna of item.colunas) {
      const elemento = document.querySelector(`#attr-${CSS.escape(coluna.id)}`);
      const valor = item.valores[coluna.id]?.valor;
      if (elemento && coluna.tipo === "booleano" && valor != null) elemento.value = String(valor).toLowerCase();
    }
  }

  select.addEventListener("change", () => {
    const item = itens[Number(select.value)];
    if (item) render(item);
    else form.classList.add("hidden");
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!atual?.pode_editar) return;
    const valores = {};
    campos.querySelectorAll("[data-id]:not([disabled]):not([readonly])").forEach((elemento) => {
      let valor = elemento.value;
      if (valor === "") valor = null;
      else if (elemento.type === "number") valor = Number(valor);
      else if (valor === "true" || valor === "false") valor = valor === "true";
      valores[elemento.dataset.id] = valor;
    });
    status.className = "complementacao-status";
    status.textContent = "Salvando…";
    try {
      atual = await api(`/api/complementacao/${encodeURIComponent(atual.hierarquizacao_codigo)}/${encodeURIComponent(atual.objeto_codigo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores }),
      });
      status.textContent = "Complementação salva com sucesso.";
      render(atual);
    } catch (erro) {
      status.classList.add("is-error");
      status.textContent = erro.message;
    }
  });

  api("/api/complementacao/objetos").then((dados) => {
    itens = dados;
    select.innerHTML = '<option value="">— Selecione —</option>' + dados.map((item, indice) => `<option value="${indice}">${item.pode_editar ? "Minha demanda" : "Somente leitura"} · ${esc(item.objeto_codigo)} — ${esc(item.objeto_nome)} (${item.atributos_preenchidos}/${item.total_atributos})</option>`).join("");
    if (!dados.length) resumo.textContent = "Nenhuma demanda complementável disponível.";
  }).catch((erro) => {
    select.innerHTML = '<option value="">Falha ao carregar</option>';
    status.classList.add("is-error");
    status.textContent = erro.message;
  });
})();
