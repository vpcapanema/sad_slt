(function () {
  const select = document.querySelector("#complementacao-hierarquizacao");
  const form = document.querySelector("#complementacao-form");
  const campos = document.querySelector("#complementacao-campos");
  const resumo = document.querySelector("#complementacao-resumo");
  const status = document.querySelector("#complementacao-status");
  const salvar = form.querySelector('button[type="submit"]');
  let itens = [];
  let atual = null;
  let selecionada = null;
  let tipo = "projeto";
  let revisao = 0;
  const editor = document.querySelector('#complementacao-editor');
  const controles = [...document.querySelectorAll('[data-complementacao]')];
  const cadastro = document.querySelector('#complementacao-cadastro');
  const grupos = ['cadastro', 'geometria', 'atributos'];
  const camposCadastro = {
    origem_sei_processo: ['Processo SEI', 'text'],
    nome: ['Nome', 'text'], descricao: ['Descrição', 'textarea'],
    objetivo_estrategico: ['Objetivo estratégico', 'textarea'], responsavel: ['Responsável', 'text'],
    objetivo: ['Objetivo', 'textarea'], publico_alvo: ['Público-alvo', 'textarea'],
    justificativa: ['Justificativa', 'textarea'], orgao_responsavel: ['Órgão responsável', 'text'],
    vigencia_inicio: ['Vigência inicial', 'date'], vigencia_fim: ['Vigência final', 'date'],
    valor_global: ['Valor global (R$)', 'number'],
  };
  const porTipo = {
    projeto: ['nome', 'descricao', 'vigencia_inicio', 'vigencia_fim', 'valor_global'],
    plano: ['origem_sei_processo', 'nome', 'descricao', 'objetivo_estrategico', 'responsavel', 'vigencia_inicio', 'vigencia_fim', 'valor_global'],
    programa: ['origem_sei_processo', 'nome', 'descricao', 'objetivo', 'publico_alvo', 'justificativa', 'orgao_responsavel', 'valor_global'],
  };

  const caminho = (tipoDemanda, codigo) => `/api/complementacao/demandas/${encodeURIComponent(tipoDemanda)}/${encodeURIComponent(codigo)}`;
  window.SLTComplementacaoTabela = {
    listar: tipoDemanda => api(`/api/complementacao/demandas/${encodeURIComponent(tipoDemanda)}`),
    selecionar(tipoDemanda, registros) {
      const proxima = registros.length === 1 ? registros[0] : null;
      if (tipo !== tipoDemanda || selecionada?.id !== proxima?.id) {
        revisao += 1;
        editor.classList.add('hidden');
        atual = null;
        mensagem('');
        controles.forEach(button => button.setAttribute('aria-pressed', 'false'));
      }
      tipo = tipoDemanda;
      selecionada = proxima;
      controles.forEach(button => { button.disabled = !selecionada; });
      document.querySelector('#complementacao-selecao').textContent = selecionada
        ? `${selecionada.id} — ${selecionada.nome}`
        : registros.length > 1 ? 'Selecione somente uma demanda para complementar.' : 'Selecione uma demanda na tabela para complementar.';
    },
  };

  function mensagem(texto, erro = false) {
    status.textContent = texto;
    status.classList.toggle('is-error', erro);
  }

  async function abrir(modo) {
    if (!selecionada) return;
    const versao = ++revisao;
    const alvo = selecionada, tipoAlvo = tipo;
    editor.classList.remove('hidden');
    grupos.forEach(grupo => document.querySelector(`#complementacao-${grupo}`).classList.add('hidden'));
    controles.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.complementacao === modo)));
    document.querySelector('#complementacao-editor-titulo').textContent = controles.find(button => button.dataset.complementacao === modo).textContent;
    resumo.textContent = `${alvo.id} — ${alvo.nome}`;
    mensagem('Carregando…');
    try {
      const registro = await api(caminho(tipoAlvo, alvo.id));
      if (revisao !== versao) return;
      if (modo === 'cadastro') {
        document.querySelector('#complementacao-editor-titulo').textContent = tipoAlvo === 'projeto' ? 'Informa\u00e7\u00f5es do Projeto' : 'Dados cadastrais';
        document.querySelector('#complementacao-cadastro-campos').classList.toggle('complementacao-grid', tipoAlvo !== 'projeto');
        document.querySelector('#complementacao-cadastro-campos').innerHTML = tipoAlvo === 'projeto'
          ? SLTProjectForm.html(registro)
          : porTipo[tipoAlvo].map(campo => {
          const [rotulo, formato] = camposCadastro[campo];
          let valor = registro[campo] ?? '';
          if (formato === 'date') valor = String(valor).slice(0, 10);
          const attrs = `id="cadastro-${campo}" name="${campo}"${campo === 'nome' ? ' required maxlength="200"' : ''}`;
          return `<div class="form-field"><label for="cadastro-${campo}">${rotulo}</label>${formato === 'textarea'
            ? `<textarea ${attrs} rows="3">${esc(valor)}</textarea>`
            : `<input ${attrs} type="${formato}" value="${esc(valor)}"${formato === 'number' ? ' step="0.01" min="0"' : ''}>`}</div>`;
        }).join('');
        if (tipoAlvo === 'projeto') SLTProjectForm.bind(registro);
      } else if (modo === 'atributos') {
        const dados = await api('/api/complementacao/objetos');
        if (revisao !== versao) return;
        itens = dados.filter(item => item.objeto_codigo === alvo.id);
        select.innerHTML = itens.map((item, indice) => `<option value="${indice}">${esc(item.hierarquizacao_nome || item.hierarquizacao_codigo)}</option>`).join('');
        select.disabled = !itens.length;
        document.querySelector('#complementacao-sem-atributos').classList.toggle('hidden', itens.length > 0);
        form.classList.toggle('hidden', !itens.length);
        atual = null;
        if (itens.length) render(itens[0]);
      } else {
        document.querySelector('#complementacao-arquivo').value = '';
      }
      document.querySelector(`#complementacao-${modo}`).classList.remove('hidden');
      mensagem('');
    } catch (erro) {
      if (revisao === versao) mensagem(erro.message, true);
    }
  }
  controles.forEach(button => button.addEventListener('click', () => abrir(button.dataset.complementacao)));

  cadastro.addEventListener('submit', async event => {
    event.preventDefault();
    if (!selecionada) return;
    const url = caminho(tipo, selecionada.id), versao = revisao;
    const payload = tipo === 'projeto' ? SLTProjectForm.collect() : {};
    for (const input of (tipo === 'projeto' ? [] : cadastro.querySelectorAll('[name]'))) {
      payload[input.name] = input.value.trim() === '' ? null : input.type === 'number' ? Number(input.value) : input.value;
    }
    const button = cadastro.querySelector('button');
    button.disabled = true;
    try {
      await api(`${url}/cadastro`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      if (versao === revisao) mensagem('Dados cadastrais salvos. A demanda permanece aguardando complementação até a retomada da análise.');
      document.dispatchEvent(new Event('complementacao-salva'));
    } catch (erro) { mensagem(erro.message, true); }
    finally { button.disabled = false; }
  });

  document.querySelector('#complementacao-enviar').addEventListener('click', async event => {
    const file = document.querySelector('#complementacao-arquivo').files[0];
    if (!selecionada || !file) { mensagem('Selecione o arquivo da geometria.', true); return; }
    const url = caminho(tipo, selecionada.id), versao = revisao;
    const button = event.currentTarget;
    button.disabled = true;
    const enviar = (etapa, confirmacao) => {
      const body = new FormData(); body.append('file', file);
      if (confirmacao) body.append('confirmacao', confirmacao);
      return api(`${url}/geometria/${etapa}`, {method: 'POST', body});
    };
    try {
      mensagem('Conferindo geometria…');
      const resultado = await enviar('conferir');
      if (versao !== revisao) return;
      if (!resultado.permitido) throw new Error(resultado.mensagem || 'Geometria fora da abrangência permitida.');
      const confirmou = await SLTAdminUi.showConfirm({title: 'Substituir geometria', message: resultado.mensagem, confirmLabel: 'Confirmar e substituir', cancelLabel: 'Cancelar'});
      if (!confirmou || versao !== revisao) { mensagem('Substituição cancelada.'); return; }
      mensagem('Salvando geometria…');
      await enviar('substituir', resultado.confirmacao);
      if (versao === revisao) mensagem('Geometria substituída. Arquivo original e versões anteriores preservados no histórico.');
      document.dispatchEvent(new Event('complementacao-salva'));
    } catch (erro) { mensagem(erro.message, true); }
    finally { button.disabled = false; }
  });

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
      const valorBruto = slot.valor_bruto ?? slot.valor;
      return `<div class="complementacao-campo${bloqueado ? " is-readonly" : ""}"><label for="attr-${coluna.id}">${esc(coluna.alias || coluna.criterio)}${coluna.mandatorio ? ' <span class="req">*</span>' : ""}</label><div class="complementacao-meta">${esc(coluna.unidade || "Sem unidade")} ${esc(coluna.relacao_simbolo || "")} · ${origem}</div>${input(coluna, valorBruto, bloqueado)}${coluna.premissa ? `<p class="complementacao-premissa">${esc(coluna.premissa)}</p>` : ""}</div>`;
    }).join("");
    form.classList.remove("hidden");
    salvar.disabled = !item.pode_editar;
    salvar.classList.toggle("hidden", !item.pode_editar);
    resumo.textContent = `${item.objeto_codigo} · ${item.tipo_demanda} · ${item.atributos_preenchidos} de ${item.total_atributos} atributos preenchidos · ${item.hierarquizacao_nome || item.hierarquizacao_codigo} · ${item.pode_editar ? "Edição permitida" : "Somente leitura"}`;
    status.className = "complementacao-status";
    status.textContent = item.pode_editar ? "" : "Você pode consultar esta demanda, mas somente o responsável pode complementá-la.";
    for (const coluna of item.colunas) {
      const elemento = document.querySelector(`#attr-${CSS.escape(coluna.id)}`);
      const slot = item.valores[coluna.id] || {};
      const valor = slot.valor_bruto ?? slot.valor;
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
    const versao = revisao;
    const alvo = atual;
    salvar.disabled = true;
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
      const salvo = await api(`/api/complementacao/${encodeURIComponent(alvo.hierarquizacao_codigo)}/${encodeURIComponent(alvo.objeto_codigo)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valores }),
      });
      if (revisao !== versao) return;
      render(salvo);
      mensagem("Complementação salva com sucesso.");
    } catch (erro) {
      if (revisao === versao) mensagem(erro.message, true);
    } finally { salvar.disabled = !atual?.pode_editar; }
  });

})();
