/* Camadas do storage do SICARD — árvore de pastas e exibição no mapa.
 * Usado pelo Visualizador de bases geoespaciais e pelas Camadas de
 * Superfícies-índice: cada pasta do storage é um grupo e cada camada dos
 * arquivos da pasta é uma camada do grupo. Os tiles vêm direto do arquivo.
 */
(function () {
  "use strict";
  const API = "/api/geoespacial";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const formatCrs = (value) => String(value || "CRS não informado").replace(/EPSG:4674(?!\s*\()/g, "EPSG:4674 (SIRGAS 2000)");
  // Base 1000 (kB, MB), a mesma unidade exibida na área de arquivos do storage.
  function formatBytes(bytes) {
    const valor = Number(bytes) || 0;
    const unidades = ["B", "kB", "MB", "GB"];
    const indice = Math.min(unidades.length - 1, valor > 0 ? Math.floor(Math.log10(valor) / 3) : 0);
    return `${(valor / 1000 ** indice).toLocaleString("pt-BR", { maximumFractionDigits: indice ? 1 : 0 })} ${unidades[indice]}`;
  }
  function formatDate(segundos) {
    if (!segundos) return "—";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(segundos * 1000));
  }
  function contar(grupo) {
    return grupo.camadas.length + grupo.grupos.reduce((total, filho) => total + contar(filho), 0);
  }
  function consulta(camada) {
    const params = new URLSearchParams({ caminho: camada.arquivo });
    if (camada.camada) params.set("camada", camada.camada);
    return params.toString();
  }

  window.GeoespacialStorage = {
    escapeHtml,
    formatCrs,

    async carregarArvore(raiz) {
      const response = await fetch(`${API}/storage/${encodeURIComponent(raiz)}/arvore`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Storage indisponível (${response.status})`);
      return response.json();
    },

    camadasDaArvore(grupo) {
      return [...grupo.camadas, ...grupo.grupos.flatMap((filho) => this.camadasDaArvore(filho))];
    },

    async adicionarNoMapa(camada, opcoes = {}) {
      if (camada.erro) throw new Error(camada.erro);
      if (camada.tipo === "raster") throw new Error("A exibição de raster do storage ainda não está disponível no mapa.");
      const query = consulta(camada);
      GeoespacialMap.addVectorTileLayer(camada.id, `${API}/storage/camada/tiles/{z}/{x}/{y}.pbf?${query}`, opcoes);
      try {
        const response = await fetch(`${API}/storage/camada/bounds?${query}`);
        if (!response.ok) throw new Error(`Não foi possível obter a extensão da camada (${response.status})`);
        const { bounds } = await response.json();
        if (bounds) {
          GeoespacialMap.layers.get(camada.id).bounds = bounds;
          GeoespacialMap.fitBounds(camada.id);
        }
      } catch (error) {
        GeoespacialMap.removeLayer(camada.id);
        throw error;
      }
    },

    detalhesHtml(camada) {
      const partes = String(camada.arquivo || "").split("/");
      const linhas = [
        ["Nome", camada.nome],
        ["Tipo", camada.geometria_tipo || camada.tipo],
        ["CRS", camada.tipo === "raster" ? "—" : formatCrs(camada.crs)],
        ["Feições", camada.feicoes == null ? "—" : Number(camada.feicoes).toLocaleString("pt-BR")],
        ["Pasta no storage", partes.slice(0, -1).join("/")],
        ["Arquivo", camada.camada && camada.nome !== partes.at(-1)?.replace(/\.[^.]+$/, "") ? `${partes.at(-1)} · ${camada.camada}` : partes.at(-1)],
        ["Tamanho do arquivo", formatBytes(camada.tamanho_bytes)],
        ["Atualização do arquivo", formatDate(camada.modificado_em)],
      ];
      if (camada.erro) linhas.push(["Situação", camada.erro]);
      return `<div class="geoespacial-detail-grid">${linhas.map(([rotulo, valor]) => `<div class="geoespacial-detail-row"><span>${rotulo}</span><strong>${escapeHtml(valor)}</strong></div>`).join("")}</div>`;
    },

    /* Monta a árvore em `container`. `opcoes`: nome(camada), simbolo(camada),
     * aoSelecionar(camada), aoEditar(camada, linha), aoAlternar(camada, visivel)
     * e aoFalhar(erro, camada). Devolve as camadas na ordem exibida. */
    renderArvore(container, arvore, opcoes) {
      const camadas = [];
      const prefixo = container.id || "storage";
      const linhaCamada = (camada) => {
        const indice = camadas.push(camada) - 1;
        const domId = `${prefixo}-camada-${indice}`;
        return `<div class="layer-group layer-group--record geo-layer-record" role="listitem" data-id="${escapeHtml(camada.id)}" data-indice="${indice}"><div class="layer-group-header-row"><label class="layer-visibility-toggle" for="${domId}"><input type="checkbox" class="layer-visibility-input" id="${domId}" ${camada.erro ? "disabled" : ""}></label><button type="button" class="layer-group-header layer-group-header--record" aria-expanded="false" title="${escapeHtml(camada.arquivo)}"><span class="layer-group-toggle" aria-hidden="true">›</span><span class="geo-layer-copy"><span class="layer-group-name">${escapeHtml(opcoes.nome(camada))}</span>${opcoes.simbolo(camada)}</span></button></div></div>`;
      };
      const blocoGrupo = (grupo) => {
        const total = contar(grupo);
        const itens = [...grupo.grupos.map(blocoGrupo), ...grupo.camadas.map(linhaCamada)].join("");
        return `<div class="layer-group layer-group--tipo geo-storage-group" data-caminho="${escapeHtml(grupo.caminho)}"><div class="layer-group-header-row layer-group-header-row--tipo"><label class="layer-visibility-toggle" title="Exibir ou ocultar as camadas da pasta"><input type="checkbox" class="layer-visibility-input geo-storage-group-input" ${total ? "" : "disabled"}></label><button type="button" class="layer-group-header layer-group-header--tipo" aria-expanded="true"><span class="layer-group-toggle" aria-hidden="true">▼</span><span class="layer-group-name layer-group-name--tipo">${escapeHtml(grupo.nome)}</span><span class="layer-group-active-count">${total}</span></button></div><div class="layer-group-body admin-records-list" role="list">${itens || '<p class="layers-empty layers-empty--nested">Pasta sem camadas.</p>'}</div></div>`;
      };
      const conteudo = [...arvore.grupos.map(blocoGrupo), ...arvore.camadas.map(linhaCamada)].join("");
      container.innerHTML = arvore.disponivel === false
        ? '<p class="layers-empty layers-empty--nested">Storage indisponível neste ambiente.</p>'
        : conteudo || '<p class="layers-empty layers-empty--nested">Nenhuma pasta no storage.</p>';

      const sincronizarGrupos = () => container.querySelectorAll(".geo-storage-group").forEach((grupo) => {
        const entradas = [...grupo.querySelectorAll(".geo-layer-record .layer-visibility-input:not(:disabled)")];
        const entradaGrupo = grupo.querySelector(":scope > .layer-group-header-row .geo-storage-group-input");
        if (entradas.length) entradaGrupo.checked = entradas.every((entrada) => entrada.checked);
      });
      container.querySelectorAll(".geo-layer-record").forEach((linha) => {
        const camada = camadas[Number(linha.dataset.indice)];
        const botao = linha.querySelector("button");
        botao.addEventListener("click", () => { const expandida = linha.classList.toggle("expanded"); botao.setAttribute("aria-expanded", String(expandida)); opcoes.aoSelecionar(camada); });
        linha.querySelector(".layer-visibility-input").addEventListener("change", async (event) => {
          try { await opcoes.aoAlternar(camada, event.target.checked); }
          catch (error) { event.target.checked = false; opcoes.aoFalhar?.(error, camada); }
          sincronizarGrupos();
        });
      });
      container.querySelectorAll(".geo-storage-group").forEach((grupo) => {
        const cabecalho = grupo.querySelector(":scope > .layer-group-header-row .layer-group-header--tipo");
        cabecalho.addEventListener("click", () => { const recolhido = grupo.classList.toggle("collapsed"); cabecalho.setAttribute("aria-expanded", String(!recolhido)); });
        grupo.querySelector(":scope > .layer-group-header-row .geo-storage-group-input").addEventListener("change", (event) => {
          grupo.querySelectorAll(".geo-layer-record .layer-visibility-input:not(:disabled)").forEach((entrada) => {
            if (entrada.checked !== event.target.checked) { entrada.checked = event.target.checked; entrada.dispatchEvent(new Event("change")); }
          });
        });
      });
      // Delegado: o símbolo é trocado ao salvar as propriedades da camada.
      container.onclick = (event) => {
        const simbolo = event.target.closest(".geo-layer-tree-symbol");
        if (!simbolo) return;
        event.stopPropagation();
        const linha = simbolo.closest(".geo-layer-record");
        if (linha) opcoes.aoEditar(camadas[Number(linha.dataset.indice)], linha);
      };
      return camadas;
    },
  };
})();
