/* Explorador de pastas do storage do SICARD, para escolher onde gravar um upload.
 * Abre como modal próprio sobre o de importação. Navega a partir das pastas
 * publicadas do storage (base-geoespacial e superficies-indices) e permite criar,
 * renomear e excluir pastas; renomear e excluir só valem para pasta vazia, e o
 * servidor confere isso de novo antes de agir.
 *
 * Uso: const pasta = await StoragePastas.escolher({ inicial: "base-geoespacial/vetor" });
 *      (null se o usuário cancelar)
 */
(function () {
  "use strict";
  const API = "/api/geoespacial/storage/pastas";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  async function pedir(url, opcoes = {}) {
    const resposta = await fetch(url, { credentials: "include", ...opcoes });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(corpo.detail || `Falha no storage (HTTP ${resposta.status})`);
    return corpo;
  }
  const enviar = (metodo, corpo) => pedir(API, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

  function montar() {
    const dialog = document.createElement("dialog");
    dialog.className = "storage-pastas-dialog";
    dialog.setAttribute("aria-labelledby", "storage-pastas-titulo");
    dialog.innerHTML = `
      <div class="storage-pastas">
        <header class="storage-pastas-head">
          <div><h2 id="storage-pastas-titulo">Escolher pasta no storage</h2><p>Navegue até a pasta onde o arquivo será gravado.</p></div>
          <button type="button" class="storage-pastas-fechar" data-acao="cancelar" aria-label="Fechar">×</button>
        </header>
        <nav class="storage-pastas-trilha" aria-label="Caminho atual"></nav>
        <div class="storage-pastas-ferramentas" role="toolbar" aria-label="Ações de pasta">
          <button type="button" class="storage-pastas-btn" data-acao="criar"><i class="fas fa-folder-plus" aria-hidden="true"></i><span>Criar pasta</span></button>
          <button type="button" class="storage-pastas-btn" data-acao="renomear"><i class="fas fa-pen" aria-hidden="true"></i><span>Renomear</span></button>
          <button type="button" class="storage-pastas-btn storage-pastas-perigo" data-acao="excluir"><i class="fas fa-trash-can" aria-hidden="true"></i><span>Excluir</span></button>
          <button type="button" class="storage-pastas-btn storage-pastas-atualizar" data-acao="atualizar" title="Atualizar" aria-label="Atualizar"><i class="fas fa-rotate" aria-hidden="true"></i></button>
        </div>
        <form class="storage-pastas-edicao" hidden></form>
        <div class="storage-pastas-lista" role="listbox" aria-label="Pastas" tabindex="0"></div>
        <p class="storage-pastas-status" aria-live="polite"></p>
        <footer class="storage-pastas-rodape">
          <div class="storage-pastas-destino"><span>Destino</span><strong>Nenhuma pasta escolhida</strong></div>
          <div class="storage-pastas-botoes">
            <button type="button" class="btn btn-secondary" data-acao="cancelar">Cancelar</button>
            <button type="button" class="btn btn-primary" data-acao="salvar" disabled>Selecionar pasta</button>
          </div>
        </footer>
      </div>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  function escolher(opcoes = {}) {
    const dialog = montar();
    const saida = opcoes.saida;
    const raiz = saida ? "saidas-geoespaciais" : "";
    const api = saida ? "/api/geoespacial/storage/saidas/pastas" : API;
    const listarPasta = caminho => pedir(`${api}?caminho=${encodeURIComponent(caminho || raiz)}`);
    const enviarPasta = (metodo, corpo) => pedir(api, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const $ = (seletor) => dialog.querySelector(seletor);
    if (saida) {
      $("#storage-pastas-titulo").textContent = "Destino da saída no storage";
      $('[data-acao="renomear"]').hidden = true;
      $('[data-acao="excluir"]').hidden = true;
      $(".storage-pastas-rodape").insertAdjacentHTML("beforebegin", `<div class="storage-pastas-saida"><label>Nome da saída <input data-saida-nome required maxlength="110" value="${escapeHtml(saida.nome || "resultado")}" autocomplete="off"></label><label>Formato <select data-saida-formato>${saida.formatos.map(formato => `<option value="${escapeHtml(formato)}">${escapeHtml(formato)}</option>`).join("")}</select></label></div>`);
      $("[data-saida-formato]").value = saida.formatos.includes(saida.formato) ? saida.formato : saida.formatos[0];
      $('[data-acao="salvar"]').textContent = "Definir saída";
    }
    const lista = $(".storage-pastas-lista"), status = $(".storage-pastas-status"), edicao = $(".storage-pastas-edicao");
    const estado = { atual: "", pastas: [], arquivos: [], selecionada: null, ocupado: false, leitura: 0 };

    const destino = () => estado.selecionada || estado.atual;
    function avisar(texto, erro = false) { status.textContent = texto || ""; status.classList.toggle("erro", Boolean(erro)); }

    function sincronizar() {
      const sel = estado.pastas.find((p) => p.caminho === estado.selecionada);
      $('[data-acao="criar"]').disabled = estado.ocupado || !estado.atual;
      $('[data-acao="renomear"]').disabled = estado.ocupado || !sel || sel.raiz;
      $('[data-acao="excluir"]').disabled = estado.ocupado || !sel || sel.raiz;
      $('[data-acao="salvar"]').disabled = estado.ocupado || !destino();
      $(".storage-pastas-destino strong").textContent = destino() || "Nenhuma pasta escolhida";
      lista.querySelectorAll(".storage-pastas-item[data-caminho]").forEach((item) => {
        const ativo = item.dataset.caminho === estado.selecionada;
        item.classList.toggle("selecionada", ativo);
        item.setAttribute("aria-selected", String(ativo));
      });
    }

    function desenharTrilha() {
      const partes = estado.atual ? estado.atual.split("/") : [];
      const trilha = $(".storage-pastas-trilha");
      trilha.innerHTML = (raiz ? "" : `<button type="button" data-ir=""><i class="fas fa-hard-drive" aria-hidden="true"></i> Storage</button>`)
        + partes.map((parte, i) => `${i ? '<span aria-hidden="true">/</span>' : ""}<button type="button" data-ir="${escapeHtml(partes.slice(0, i + 1).join("/"))}">${escapeHtml(parte)}</button>`).join("");
      trilha.querySelectorAll("[data-ir]").forEach((botao) => botao.addEventListener("click", () => abrir(botao.dataset.ir)));
    }

    function desenharLista() {
      const acima = estado.atual && estado.atual !== raiz ? `<div class="storage-pastas-item storage-pastas-acima" data-ir="${escapeHtml(estado.atual.split("/").slice(0, -1).join("/"))}"><i class="fas fa-arrow-turn-up" aria-hidden="true"></i><span>Voltar</span></div>` : "";
      const pastas = estado.pastas.map((p) => `
        <div class="storage-pastas-item" role="option" tabindex="-1" aria-selected="false" data-caminho="${escapeHtml(p.caminho)}">
          <i class="fas ${p.raiz ? "fa-database" : "fa-folder"}" aria-hidden="true"></i><span>${escapeHtml(p.nome)}</span>
          <button type="button" class="storage-pastas-entrar" data-entrar="${escapeHtml(p.caminho)}" title="Abrir pasta" aria-label="Abrir ${escapeHtml(p.nome)}"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>
        </div>`).join("");
      const arquivos = estado.arquivos.map((nome) => `<div class="storage-pastas-item storage-pastas-arquivo" aria-disabled="true"><i class="far fa-file" aria-hidden="true"></i><span>${escapeHtml(nome)}</span></div>`).join("");
      const vazio = !estado.pastas.length && !estado.arquivos.length ? '<p class="storage-pastas-vazio">Pasta vazia. Salve para gravar aqui ou crie uma subpasta.</p>' : "";
      lista.innerHTML = acima + pastas + arquivos + vazio;
      lista.querySelector(".storage-pastas-acima")?.addEventListener("click", (e) => abrir(e.currentTarget.dataset.ir));
      lista.querySelectorAll(".storage-pastas-item[data-caminho]").forEach((item) => {
        item.addEventListener("click", () => { estado.selecionada = item.dataset.caminho; fecharEdicao(); sincronizar(); });
        item.addEventListener("dblclick", () => abrir(item.dataset.caminho));
      });
      lista.querySelectorAll("[data-entrar]").forEach((botao) => botao.addEventListener("click", (e) => { e.stopPropagation(); abrir(botao.dataset.entrar); }));
    }

    async function abrir(caminho, selecionar = null) {
      if (raiz && caminho !== raiz && !caminho.startsWith(`${raiz}/`)) caminho = raiz;
      const leitura=++estado.leitura;
      estado.ocupado = true; sincronizar(); avisar("Lendo o storage…");
      try {
        const dados = await listarPasta(caminho);
        if(leitura!==estado.leitura||!dialog.isConnected)return;
        Object.assign(estado, { atual: dados.caminho, pastas: dados.pastas, arquivos: dados.arquivos, selecionada: selecionar });
        fecharEdicao(); desenharTrilha(); desenharLista(); avisar("");
      } catch (erro) { if(leitura===estado.leitura&&dialog.isConnected)avisar(erro.message, true); }
      finally { if(leitura===estado.leitura&&dialog.isConnected){estado.ocupado = false; sincronizar();} }
    }

    function fecharEdicao() { edicao.hidden = true; edicao.innerHTML = ""; }
    function abrirEdicao(html, aoConfirmar) {
      edicao.innerHTML = html; edicao.hidden = false;
      edicao.querySelector("input")?.focus(); edicao.querySelector("input")?.select();
      edicao.onsubmit = async (e) => {
        e.preventDefault();
        if(estado.ocupado)return;
        estado.ocupado = true; sincronizar();
        try { await aoConfirmar(edicao.querySelector("input")?.value.trim()); }
        catch (erro) { avisar(erro.message, true); }
        finally { estado.ocupado = false; sincronizar(); }
      };
      edicao.querySelector('[data-edicao="voltar"]').addEventListener("click", () => { fecharEdicao(); avisar(""); });
    }
    const campoNome = (rotulo, valor, confirmar) => `<label><span>${rotulo}</span><input type="text" maxlength="120" required value="${escapeHtml(valor)}" autocomplete="off"></label><button type="submit" class="btn btn-primary">${confirmar}</button><button type="button" class="btn btn-secondary" data-edicao="voltar">Voltar</button>`;

    const acoes = {
      criar() {
        abrirEdicao(campoNome(`Nova pasta em ${escapeHtml(estado.atual)}`, "", "Criar"), async (nome) => {
          const nova = await enviarPasta("POST", { caminho: estado.atual, nome });
          await abrir(estado.atual, nova.caminho);
          avisar(`Pasta criada: ${nova.caminho}`);
        });
      },
      renomear() {
        const sel = estado.pastas.find((p) => p.caminho === estado.selecionada); if (!sel) return;
        abrirEdicao(campoNome(`Novo nome para “${escapeHtml(sel.nome)}”`, sel.nome, "Renomear"), async (nome) => {
          const nova = await enviar("PATCH", { caminho: sel.caminho, nome });
          await abrir(estado.atual, nova.caminho);
          avisar(`Pasta renomeada para ${nova.nome}.`);
        });
      },
      excluir() {
        const sel = estado.pastas.find((p) => p.caminho === estado.selecionada); if (!sel) return;
        abrirEdicao(`<p class="storage-pastas-confirmar">Excluir a pasta <strong>${escapeHtml(sel.caminho)}</strong>? Só pastas vazias podem ser excluídas.</p><button type="submit" class="btn btn-danger">Excluir</button><button type="button" class="btn btn-secondary" data-edicao="voltar">Voltar</button>`, async () => {
          await pedir(`${API}?caminho=${encodeURIComponent(sel.caminho)}`, { method: "DELETE" });
          await abrir(estado.atual);
          avisar(`Pasta excluída: ${sel.caminho}`);
        });
      },
      atualizar() { abrir(estado.atual, estado.selecionada); },
    };

    return new Promise((resolver) => {
      function encerrar(valor) { dialog.close(); dialog.remove(); resolver(valor); }
      dialog.addEventListener("click", (e) => {
        const acao = e.target.closest("[data-acao]")?.dataset.acao;
        if (!acao) return;
        if (acao === "cancelar") encerrar(null);
        else if (acao === "salvar") {
          if (!estado.ocupado && destino()) {
            if (!saida) encerrar(destino());
            else {
              const nome = $("[data-saida-nome]");
              if (!nome.reportValidity()) return;
              if (/^[.\s]|[.\s]$|[<>:"/\\|?*\x00-\x1f]/.test(nome.value)) { avisar("Informe um nome de saída sem barras ou caracteres reservados.", true); return; }
              encerrar({ pasta: destino(), nome: nome.value, formato: $("[data-saida-formato]").value });
            }
          }
        }
        else if (!estado.ocupado) { avisar(""); acoes[acao](); }
      });
      dialog.addEventListener("cancel", (e) => { e.preventDefault(); encerrar(null); });
      lista.addEventListener("keydown", (e) => {
        const itens = [...lista.querySelectorAll(".storage-pastas-item[data-caminho]")];
        const i = itens.findIndex((item) => item.dataset.caminho === estado.selecionada);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const proximo = itens[Math.max(0, Math.min(itens.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
          if (proximo) { estado.selecionada = proximo.dataset.caminho; sincronizar(); proximo.scrollIntoView({ block: "nearest" }); }
        } else if (e.key === "Enter" && estado.selecionada) { e.preventDefault(); abrir(estado.selecionada); }
        else if (e.key === "Backspace" && estado.atual) { e.preventDefault(); abrir(estado.atual.split("/").slice(0, -1).join("/")); }
      });
      dialog.showModal();
      // Abre já na pasta escolhida antes, se houver: a pai dela, com ela selecionada.
      const inicial = String(opcoes.inicial || raiz);
      const partes = inicial.split("/").filter(Boolean);
      if (raiz) abrir(inicial);
      else abrir(partes.slice(0, -1).join("/"), partes.length ? partes.join("/") : null);
    });
  }

  function configurarSaida({ destino, nome, formato, pasta, formatos, aoMudar }) {
    if (!destino || destino.dataset.exploradorSaida) return;
    destino.dataset.exploradorSaida = "true";
    destino.value = "storage";
    destino.hidden = true;
    destino.style.display = "none";
    for (const controle of [nome, formato]) {
      const field = controle.closest(".field");
      if (field) {
        field.hidden = true;
        field.style.display = "none";
      }
      controle.hidden = true;
    }
    destino.insertAdjacentHTML("afterend", `<div class="local-file-picker"><input type="text" class="readonly-active" data-pasta-saida readonly aria-label="Pasta de destino no storage" value="${escapeHtml(pasta || "saidas-geoespaciais")}"><button type="button" class="browse-btn" data-explorar-saida title="Escolher destino da saída" aria-label="Escolher destino da saída"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6A2 2 0 0 1 18.46 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v1"/></svg></button></div>`);
    const campo = destino.nextElementSibling.querySelector("[data-pasta-saida]"), botao = campo.nextElementSibling;
    campo.name = "pasta_saida";
    botao.addEventListener("click", async () => {
      try {
        const resultado = await escolher({ inicial: campo.value, saida: { nome: nome.value, formato: formato.value, formatos: formatos() } });
        if (!resultado || !destino.isConnected) return;
        campo.value = resultado.pasta; nome.value = resultado.nome; formato.value = resultado.formato;
        nome.dataset.userEdited = "true";
        [campo, nome, formato].forEach(controle => controle.dispatchEvent(new Event("change", { bubbles: true })));
        aoMudar?.(resultado);
      } catch (erro) {
        if (window.gpFeedback) window.gpFeedback.Notify.error("Destino da saída", erro.message);
        else window.gpApp.log(erro.message, "error");
      }
    });
    return campo;
  }

  window.StoragePastas = { escolher, configurarSaida };
})();
