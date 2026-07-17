/* Toolbox de Algoritmos — Bloco de Geoprocessamento */
(function () {
  window.GeoToolbox = {
    algoritmos: {
      "Geo-objetos": {
        icon: "📐",
        itens: [
          { id: "OP-01", nome: "Carregar Camada", icon: "📂" },
          { id: "OP-02", nome: "Validar Camada", icon: "✓" },
          { id: "OP-02-CORR", nome: "Reparar Geometrias", icon: "🔧" },
          { id: "OP-03", nome: "Normalizar Camada", icon: "📏" },
          { id: "OP-04", nome: "Criar Buffer", icon: "⭕" },
          { id: "OP-05", nome: "Sobrepor Camadas", icon: "🔀" },
          { id: "OP-06", nome: "Dissolver", icon: "🔗" },
          { id: "OP-07", nome: "Selecionar por Localização", icon: "📍" },
        ],
      },
      "Transformação": {
        icon: "🔄",
        itens: [
          { id: "OP-08", nome: "Converter para Raster", icon: "🗺️" },
        ],
      },
      "Geo-campos": {
        icon: "🗜️",
        itens: [
          { id: "OP-10", nome: "Calcular Distância", icon: "📏" },
          { id: "OP-11", nome: "Distância Ponderada", icon: "⚖️" },
          { id: "OP-12", nome: "Calcular Densidade", icon: "📊" },
          { id: "OP-13", nome: "Custo Acumulado", icon: "💰" },
          { id: "OP-14", nome: "Interpolar Valores", icon: "📈" },
          { id: "OP-15", nome: "Agregar por Território", icon: "🏘️" },
          { id: "OP-16", nome: "Criar Camada Booleana", icon: "🔘" },
          { id: "OP-17", nome: "Combinar Rasters", icon: "➕" },
          { id: "OP-20", nome: "Normalizar Raster", icon: "📊" },
          { id: "OP-21", nome: "Recortar Raster", icon: "✂️" },
          { id: "OP-22", nome: "Estatísticas por Zona", icon: "📊" },
        ],
      },
      "Operações Mistas": {
        icon: "🔀",
        itens: [
          { id: "OP-23", nome: "Amostrar Raster em Pontos", icon: "🎯" },
          { id: "OP-24", nome: "Extrair Valores em Polígono", icon: "🔍" },
        ],
      },
      "Exportação": {
        icon: "💾",
        itens: [
          { id: "OP-25", nome: "Exportar Camada", icon: "📁" },
          { id: "OP-26", nome: "Exportar Raster", icon: "🖼️" },
        ],
      },
    },

    funcoes: {
      "Fase 1": {
        icon: "1️⃣",
        itens: [
          { id: "fase1-importar-fonte", nome: "Importar Fonte", icon: "📂" },
          { id: "fase1-criar-pacote", nome: "Criar Pacote", icon: "📦" },
          { id: "fase1-homologar", nome: "Homologar", icon: "✅" },
        ],
      },
      "Fase 2": {
        icon: "2️⃣",
        itens: [
          { id: "fase2-cadastrar-criterio", nome: "Cadastrar Critério", icon: "📝" },
          { id: "fase2-criar-pacote", nome: "Criar Pacote", icon: "📦" },
          { id: "fase2-homologar", nome: "Homologar", icon: "✅" },
        ],
      },
      "Fase 3": {
        icon: "3️⃣",
        itens: [
          { id: "fase3-importar-tabela", nome: "Importar Tabela", icon: "📂" },
          { id: "fase3-cadastrar-atributo", nome: "Cadastrar Atributo", icon: "📝" },
          { id: "fase3-criar-rodada", nome: "Criar Rodada", icon: "📦" },
          { id: "fase3-homologar", nome: "Homologar", icon: "✅" },
        ],
      },
    },

    init: function (containerId, onAlgoritmoSelect, onFuncaoSelect) {
      const container = document.getElementById(containerId);
      if (!container) return;

      this.renderToolbox(container, "algoritmos", this.algoritmos, onAlgoritmoSelect);
      this.renderToolbox(container, "funcoes", this.funcoes, onFuncaoSelect);

      // Configurar botão de fechar modal
      document.getElementById("btn-close-toolbox")?.addEventListener("click", () => {
        this.closeModal();
      });
    },

    renderToolbox: function (container, type, dados, onSelect) {
      const toolboxPanel = document.createElement("div");
      toolboxPanel.className = "geoespacial-toolbox-panel";
      toolboxPanel.id = `toolbox-${type}`;

      // Abas para alternar entre algoritmos e funções
      const tabs = document.createElement("div");
      tabs.className = "geoespacial-toolbox-tabs";
      tabs.innerHTML = `
        <button class="geoespacial-toolbox-tab ${type === "algoritmos" ? "active" : ""}" data-type="algoritmos">Algoritmos</button>
        <button class="geoespacial-toolbox-tab ${type === "funcoes" ? "active" : ""}" data-type="funcoes">Funções</button>
      `;

      tabs.querySelectorAll(".geoespacial-toolbox-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.querySelectorAll(".geoespacial-toolbox-tab").forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          this.switchTab(tab.dataset.type);
        });
      });

      const content = document.createElement("div");
      content.className = "geoespacial-toolbox-content";
      content.id = `toolbox-${type}-content`;

      for (const [grupoNome, grupoData] of Object.entries(dados)) {
        const grupo = document.createElement("div");
        grupo.className = "geoespacial-toolbox-group";

        const grupoTitulo = document.createElement("div");
        grupoTitulo.className = "geoespacial-toolbox-group-title";
        grupoTitulo.innerHTML = `${grupoData.icon} ${grupoNome}`;
        grupo.appendChild(grupoTitulo);

        const itens = document.createElement("div");
        itens.className = "geoespacial-toolbox-items";

        grupoData.itens.forEach((item) => {
          const itemBtn = document.createElement("div");
          itemBtn.className = "geoespacial-toolbox-item";
          itemBtn.dataset.id = item.id;
          itemBtn.innerHTML = `
            <span class="geoespacial-toolbox-item-icon">${item.icon}</span>
            <span class="geoespacial-toolbox-item-label">${item.nome}</span>
          `;
          itemBtn.addEventListener("click", () => {
            if (onSelect) onSelect(item);
            // Remove active class from all items
            itens.querySelectorAll(".geoespacial-toolbox-item").forEach((i) => i.classList.remove("active"));
            itemBtn.classList.add("active");
            this.closeModal();
          });
          itens.appendChild(itemBtn);
        });

        grupo.appendChild(itens);
        content.appendChild(grupo);
      }

      toolboxPanel.appendChild(tabs);
      toolboxPanel.appendChild(content);
      container.appendChild(toolboxPanel);
    },

    switchTab: function (type) {
      const algoritmosPanel = document.getElementById("toolbox-algoritmos");
      const funcoesPanel = document.getElementById("toolbox-funcoes");
      
      if (type === "algoritmos") {
        algoritmosPanel?.classList.remove("hidden");
        funcoesPanel?.classList.add("hidden");
      } else {
        algoritmosPanel?.classList.add("hidden");
        funcoesPanel?.classList.remove("hidden");
      }
    },

    openModal: function (type = "algoritmos") {
      const modal = document.getElementById("toolbox-modal");
      if (modal) {
        modal.classList.remove("hidden");
        this.switchTab(type);
      }
    },

    closeModal: function () {
      const modal = document.getElementById("toolbox-modal");
      if (modal) {
        modal.classList.add("hidden");
      }
    },
  };
})();
