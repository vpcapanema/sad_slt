/* Verificação Fase 3 — Módulo Geoespacial */
(function () {
  const API_BASE = "/api/geoespacial";
  let mapInitialized = false;
  let selectedOperation = null;

  const OPERACOES_FASE3 = {
    importar_tabela: {
      nome: "Importar Tabela",
      variaveis: [
        { id: "tipo_arquivo", label: "Tipo de Arquivo", tipo: "select", opcoes: ["CSV", "XLSX", "XLS", "parquet"] },
        { id: "caminho_arquivo", label: "Caminho do Arquivo", tipo: "text" },
        { id: "nome_rodada", label: "Nome da Rodada", tipo: "text" },
        { id: "responsavel", label: "Responsável", tipo: "text" },
      ],
    },
    exportar_resultado: {
      nome: "Exportar Resultado",
      variaveis: [
        { id: "formato_saida", label: "Formato", tipo: "select", opcoes: ["CSV", "XLSX", "parquet"] },
        { id: "nome_arquivo", label: "Nome do Arquivo", tipo: "text" },
      ],
    },
    cadastrar_atributo: {
      nome: "Cadastrar Atributo",
      variaveis: [
        { id: "nome_coluna", label: "Nome da Coluna", tipo: "text" },
        { id: "rotulo", label: "Rótulo", tipo: "text" },
        { id: "tipo_dado", label: "Tipo de Dado", tipo: "select", opcoes: ["numerico", "ordinal", "booleano", "categorico", "data"] },
        { id: "criterio_fase3", label: "Critério Fase 3", tipo: "checkbox" },
        { id: "direcao", label: "Direção", tipo: "select", opcoes: ["maior_melhor", "menor_melhor"] },
        { id: "regra_normalizacao", label: "Regra de Normalização", tipo: "select", opcoes: ["minmax", "zscore", "rank"] },
        { id: "obrigatorio", label: "Obrigatório", tipo: "checkbox" },
        { id: "peso_inicial", label: "Peso Inicial", tipo: "number" },
        { id: "peso_minimo", label: "Peso Mínimo", tipo: "number" },
        { id: "peso_maximo", label: "Peso Máximo", tipo: "number" },
      ],
    },
    listar_atributos: {
      nome: "Listar Atributos",
      variaveis: [],
    },
    normalizar_atributos: {
      nome: "Normalizar Atributos",
      variaveis: [
        { id: "metodo_normalizacao", label: "Método", tipo: "select", opcoes: ["minmax", "zscore", "rank"] },
        { id: "tratar_nulos", label: "Tratar Nulos", tipo: "checkbox" },
        { id: "valor_padrao_nulos", label: "Valor Padrão para Nulos", tipo: "text" },
      ],
    },
    ajustar_pesos: {
      nome: "Ajustar Pesos",
      variaveis: [
        { id: "normalizar_pesos", label: "Normalizar Pesos", tipo: "checkbox" },
        { id: "metodo_ajuste", label: "Método de Ajuste", tipo: "select", opcoes: ["manual", "ahp", "igual"] },
      ],
    },
    calcular_score: {
      nome: "Calcular Score Fase 3",
      variaveis: [
        { id: "herdar_riscos_fase1", label: "Herdar Riscos Fase 1", tipo: "checkbox" },
        { id: "pacote_fase1_id", label: "Pacote Fase 1", tipo: "text" },
      ],
    },
    gerar_ranking: {
      nome: "Gerar Ranking",
      variaveis: [
        { id: "ordem_ranking", label: "Ordem", tipo: "select", opcoes: ["decrescente", "crescente"] },
        { id: "incluir_score_fase1", label: "Incluir Score Fase 1", tipo: "checkbox" },
      ],
    },
    criar_rodada: {
      nome: "Criar Rodada",
      variaveis: [
        { id: "nome_rodada", label: "Nome da Rodada", tipo: "text" },
        { id: "versao", label: "Versão", tipo: "text" },
        { id: "responsavel", label: "Responsável", tipo: "text" },
      ],
    },
    homologar_rodada: {
      nome: "Homologar",
      variaveis: [
        { id: "rodada_id", label: "ID da Rodada", tipo: "text" },
        { id: "responsavel", label: "Responsável", tipo: "text" },
      ],
    },
  };

  function init() {
    setupEventListeners();
    loadAtributos();
    loadRodadas();
    initToolbox();
  }

  function setupEventListeners() {
    document.querySelectorAll("[data-op]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const opId = e.target.dataset.op;
        selectOperation(opId);
      });
    });

    document.getElementById("btn-toolbox-algoritmos")?.addEventListener("click", () => {
      if (typeof GeoToolbox !== "undefined") {
        GeoToolbox.openModal("algoritmos");
      }
    });
    document.getElementById("btn-toolbox-funcoes")?.addEventListener("click", () => {
      if (typeof GeoToolbox !== "undefined") {
        GeoToolbox.openModal("funcoes");
      }
    });
    document.getElementById("btn-executar")?.addEventListener("click", executeOperation);
  }

  function initToolbox() {
    if (typeof GeoToolbox !== "undefined") {
      GeoToolbox.init("toolbox-container", onAlgoritmoSelect, onFuncaoSelect);
    }
  }

  function onAlgoritmoSelect(item) {
    selectOperation(item.id);
  }

  function onFuncaoSelect(item) {
    console.log("Função selecionada:", item);
  }

  async function loadAtributos() {
    try {
      const response = await fetch(`${API_BASE}/atributos-fase3`);
      const atributos = await response.json();
      renderAtributos(atributos);
    } catch (error) {
      console.error("Erro ao carregar atributos:", error);
    }
  }

  function renderAtributos(atributos) {
    const container = document.getElementById("geoespacial-atributos-list");

    if (atributos.length === 0) {
      container.innerHTML = '<p class="hint">Nenhum atributo cadastrado.</p>';
      return;
    }

    container.innerHTML = atributos
      .map(
        (attr) => `
        <div class="geoespacial-layer-item" data-id="${attr.atributo_id}">
          <input type="checkbox" class="geoespacial-layer-checkbox" id="attr-${attr.atributo_id}">
          <label for="attr-${attr.atributo_id}" class="geoespacial-layer-name">${attr.rotulo}</label>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".geoespacial-layer-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const attrId = e.target.closest(".geoespacial-layer-item").dataset.id;
        toggleAtributo(attrId, e.target.checked);
      });
    });

    document.getElementById("geoespacial-status-atributos").textContent = `Atributos: ${atributos.length}`;
  }

  function toggleAtributo(atributoId, active) {
    console.log("Toggle atributo:", atributoId, active);
  }

  async function loadRodadas() {
    try {
      const response = await fetch(`${API_BASE}/rodadas-fase3`);
      const rodadas = await response.json();
      if (rodadas.length > 0) {
        const ultimaRodada = rodadas[rodadas.length - 1];
        document.getElementById("geoespacial-status-rodada").textContent = `Rodada: ${ultimaRodada.rodada_id} (${ultimaRodada.status})`;
      }
    } catch (error) {
      console.error("Erro ao carregar rodadas:", error);
    }
  }

  function selectOperation(opId) {
    selectedOperation = opId;
    const opConfig = OPERACOES_FASE3[opId];

    document.querySelectorAll("[data-op]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.op === opId);
    });

    const operationsList = document.getElementById("geoespacial-operations-list");
    const variablesPanel = document.getElementById("geoespacial-variables-panel");
    const variablesContainer = document.getElementById("geoespacial-variables-container");

    if (opConfig) {
      operationsList.innerHTML = `
        <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #ffffff;">${opConfig.nome}</p>
        <p style="margin: 0 0 1rem 0; font-size: 0.75rem; color: #b0b0b0;">Execute a operação selecionada.</p>
      `;

      if (opConfig.variaveis && opConfig.variaveis.length > 0) {
        variablesPanel.classList.remove("hidden");
        variablesContainer.innerHTML = opConfig.variaveis
          .map(
            (v) => `
            <div class="geoespacial-variable-group">
              <label class="geoespacial-variable-label" for="var-${v.id}">${v.label}</label>
              ${renderVariableInput(v)}
            </div>
          `
          )
          .join("") + `
          <button type="button" class="geoespacial-operation-btn" id="btn-executar-op">Executar</button>
        `;

        document.getElementById("btn-executar-op").addEventListener("click", executeOperation);
      } else {
        variablesPanel.classList.add("hidden");
        // Executar automaticamente se não houver variáveis
        executeOperation();
      }
    } else {
      operationsList.innerHTML = '<p class="hint">Selecione uma operação na barra superior.</p>';
      variablesPanel.classList.add("hidden");
    }
  }

  function renderVariableInput(variable) {
    const valorPadrao = variable.valor ? ` value="${variable.valor}"` : "";

    switch (variable.tipo) {
      case "select":
        return `
          <select id="var-${variable.id}" class="geoespacial-variable-select">
            ${variable.opcoes.map((op) => `<option value="${op}">${op}</option>`).join("")}
          </select>
        `;
      case "checkbox":
        return `<input type="checkbox" id="var-${variable.id}" class="geoespacial-variable-checkbox">`;
      case "number":
        return `<input type="number" id="var-${variable.id}" class="geoespacial-variable-input" step="0.01"${valorPadrao}>`;
      default:
        return `<input type="text" id="var-${variable.id}" class="geoespacial-variable-input"${valorPadrao}>`;
    }
  }

  async function executeOperation() {
    if (!selectedOperation) return;

    const progressPanel = document.getElementById("geoespacial-progress-panel");
    const progressFill = document.getElementById("geoespacial-progress-fill");
    const progressText = document.getElementById("geoespacial-progress-text");
    const logsContainer = document.getElementById("geoespacial-logs");

    progressPanel.classList.remove("hidden");
    logsContainer.innerHTML = "";

    const opConfig = OPERACOES_FASE3[selectedOperation];
    addLog(`Iniciando operação: ${opConfig.nome}`, "info");

    try {
      // Coletar valores das variáveis
      const params = {};
      if (opConfig.variaveis) {
        opConfig.variaveis.forEach((v) => {
          const input = document.getElementById(`var-${v.id}`);
          if (input) {
            if (v.tipo === "checkbox") {
              params[v.id] = input.checked;
            } else if (v.tipo === "number") {
              params[v.id] = parseFloat(input.value);
            } else {
              params[v.id] = input.value;
            }
          }
        });
      }

      // Executar operação específica
      let resultado;
      switch (selectedOperation) {
        case "cadastrar_atributo":
          resultado = await cadastrarAtributo(params);
          break;
        case "listar_atributos":
          resultado = await loadAtributos();
          break;
        case "criar_rodada":
          resultado = await criarRodada(params);
          break;
        case "homologar_rodada":
          resultado = await homologarRodada(params);
          break;
        default:
          // Simular progresso para operações não implementadas
          for (let i = 0; i <= 100; i += 10) {
            await sleep(100);
            progressFill.style.width = `${i}%`;
            progressText.textContent = `${i}%`;
          }
          resultado = { mensagem: "Operação simulada" };
      }

      addLog(`Operação concluída: ${opConfig.nome}`, "success");
      if (resultado) {
        addLog(JSON.stringify(resultado), "info");
      }
    } catch (error) {
      addLog(`Erro: ${error.message}`, "error");
    }
  }

  async function cadastrarAtributo(params) {
    const response = await fetch(`${API_BASE}/atributos-fase3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const resultado = await response.json();
    await loadAtributos();
    return resultado;
  }

  async function criarRodada(params) {
    const response = await fetch(`${API_BASE}/rodadas-fase3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const resultado = await response.json();
    await loadRodadas();
    return resultado;
  }

  async function homologarRodada(params) {
    const { rodada_id, responsavel } = params;
    const response = await fetch(`${API_BASE}/rodadas-fase3/${rodada_id}/homologar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responsavel }),
    });
    const resultado = await response.json();
    await loadRodadas();
    return resultado;
  }

  function addLog(message, type = "info") {
    const logsContainer = document.getElementById("geoespacial-logs");
    const logEntry = document.createElement("div");
    logEntry.className = `geoespacial-log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
