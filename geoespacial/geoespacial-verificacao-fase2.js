/* Verificação Fase 2 — Módulo Geoespacial */
(function () {
  const API_BASE = "/api/geoespacial";
  let mapInitialized = false;
  let selectedOperation = null;

  const OPERACOES_FASE2 = {
    cadastrar_criterio: {
      nome: "Cadastrar Critério",
      variaveis: [
        { id: "criterio_nome", label: "Nome do Critério", tipo: "text" },
        { id: "dimensao", label: "Dimensão", tipo: "text" },
        { id: "operador_espacial", label: "Operador Espacial", tipo: "select", opcoes: ["distancia_euclidiana", "densidade_kernel", "interpolacao", "agregacao"] },
        { id: "relacao", label: "Relação", tipo: "select", opcoes: ["positiva", "negativa"] },
        { id: "peso_ahp", label: "Peso AHP", tipo: "number" },
      ],
    },
    importar_camada_criterio: {
      nome: "Importar Camada de Critério",
      variaveis: [
        { id: "tipo_entrada", label: "Tipo de Entrada", tipo: "select", opcoes: ["local", "WFS"] },
        { id: "caminho_arquivo", label: "Caminho do Arquivo", tipo: "text" },
        { id: "crs_origem", label: "CRS de Origem", tipo: "text" },
      ],
    },
    compatibilizar_camada: {
      nome: "Compatibilizar Camada",
      variaveis: [
        { id: "recortar_area_estudo", label: "Recortar Área de Estudo", tipo: "checkbox" },
        { id: "reprojetar_crs_destino", label: "Reprojetar CRS", tipo: "checkbox" },
        { id: "remover_geometrias_vazias", label: "Remover Geometrias Vazias", tipo: "checkbox" },
      ],
    },
    aplicar_operador_espacial: {
      nome: "Aplicar Operador Espacial",
      variaveis: [
        { id: "operador_espacial", label: "Operador", tipo: "select", opcoes: ["distancia_euclidiana", "densidade_kernel", "interpolacao"] },
        { id: "resolucao_raster", label: "Resolução do Raster", tipo: "number" },
        { id: "parametros_operador", label: "Parâmetros do Operador", tipo: "text" },
      ],
    },
    normalizar_raster: {
      nome: "Normalizar Raster (0-1)",
      variaveis: [
        { id: "regra_normalizacao", label: "Regra de Normalização", tipo: "select", opcoes: ["linear", "winsorizacao", "quebras_naturais", "fuzzy"] },
        { id: "percentil_inferior", label: "Percentil Inferior", tipo: "number" },
        { id: "percentil_superior", label: "Percentil Superior", tipo: "number" },
      ],
    },
    inverter_criterio: {
      nome: "Inverter Critério Negativo",
      variaveis: [
        { id: "regra_inversao", label: "Regra de Inversão", tipo: "select", opcoes: ["1 - valor"] },
        { id: "fator_inversao", label: "Fator de Inversão", tipo: "number" },
      ],
    },
    combinar_rasters: {
      nome: "Combinar Rasters (Álgebra de Mapas)",
      variaveis: [
        { id: "operador_algebra", label: "Operador de Álgebra", tipo: "select", opcoes: ["media_simples", "media_ponderada", "fuzzy_membership", "fuzzy_or", "fuzzy_and", "fuzzy_gamma"] },
        { id: "regra_nodata", label: "Regra NoData", tipo: "select", opcoes: ["bloquear", "neutro", "minimo", "interpolacao"] },
        { id: "valor_neutro", label: "Valor Neutro", tipo: "number" },
        { id: "gamma", label: "Gamma (Fuzzy)", tipo: "number" },
      ],
    },
    exportar_raster: {
      nome: "Exportar Raster Final",
      variaveis: [
        { id: "nome_arquivo", label: "Nome do Arquivo", tipo: "text" },
        { id: "formato_saida", label: "Formato", tipo: "select", opcoes: ["GeoTIFF", "TIFF"] },
        { id: "opcao_salvamento", label: "Opção de Salvamento", tipo: "select", opcoes: ["memoria", "persistir_sistema"] },
      ],
    },
  };

  function init() {
    if (!mapInitialized) {
      GeoespacialMap.init("map-geoespacial");
      mapInitialized = true;
    }

    setupEventListeners();
    loadCamadas();
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

  async function loadCamadas() {
    try {
      const response = await fetch(`${API_BASE}/biblioteca-camadas?modulo=fase2`);
      const camadas = (await response.json()).map((camada) => ({
        ...camada, nome: camada.nome_publicacao || camada.nome,
      }));
      renderCamadas(camadas);
    } catch (error) {
      console.error("Erro ao carregar camadas:", error);
    }
  }

  function renderCamadas(camadas) {
    const container = document.getElementById("geoespacial-layers-list");

    if (camadas.length === 0) {
      container.innerHTML = '<p class="hint">Nenhum insumo homologado para a Fase 2.</p>';
      return;
    }

    container.innerHTML = camadas
      .map(
        (camada) => `
        <div class="geoespacial-layer-item" data-id="${camada.id}">
          <input type="checkbox" class="geoespacial-layer-checkbox" id="layer-${camada.id}">
          <label for="layer-${camada.id}" class="geoespacial-layer-name">${camada.nome}</label>
        </div>
      `
      )
      .join("");

    container.querySelectorAll(".geoespacial-layer-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const layerId = e.target.closest(".geoespacial-layer-item").dataset.id;
        toggleCamada(layerId, e.target.checked);
      });
    });
  }

  async function toggleCamada(layerId, visible) {
    console.log("Toggle camada:", layerId, visible);
  }

  function selectOperation(opId) {
    selectedOperation = opId;
    const opConfig = OPERACOES_FASE2[opId];

    document.querySelectorAll("[data-op]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.op === opId);
    });

    const variablesPanel = document.getElementById("geoespacial-variables-panel");
    const variablesContainer = document.getElementById("geoespacial-variables-container");

    if (opConfig && opConfig.variaveis) {
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
    }
  }

  function renderVariableInput(variable) {
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
        return `<input type="number" id="var-${variable.id}" class="geoespacial-variable-input" step="0.01">`;
      default:
        return `<input type="text" id="var-${variable.id}" class="geoespacial-variable-input">`;
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

    const opConfig = OPERACOES_FASE2[selectedOperation];
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

      // Mapear operações para endpoints
      const endpointMap = {
        cadastrar_criterio: "/criterios-fase2",
        normalizar_raster: "/operacoes/normalizar-raster",
        combinar_rasters: "/operacoes/combinar-rasters",
      };

      const endpoint = endpointMap[selectedOperation];
      if (endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const resultado = await response.json();
        addLog(`Operação concluída: ${opConfig.nome}`, "success");
        addLog(JSON.stringify(resultado), "info");

        // Atualizar listas se necessário
        if (selectedOperation === "cadastrar_criterio") {
          await loadCriterios();
        }
      } else {
        // Simular para operações não implementadas
        for (let i = 0; i <= 100; i += 10) {
          await sleep(100);
          progressFill.style.width = `${i}%`;
          progressText.textContent = `${i}%`;
        }
        addLog(`Operação simulada: ${opConfig.nome}`, "warning");
      }
    } catch (error) {
      addLog(`Erro: ${error.message}`, "error");
    }
  }

  async function loadCriterios() {
    try {
      const response = await fetch(`${API_BASE}/criterios-fase2`);
      const criterios = await response.json();
      console.log("Critérios carregados:", criterios);
    } catch (error) {
      console.error("Erro ao carregar critérios:", error);
    }
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

  function handleAbrirCamadas() {
    console.log("Abrir camadas");
  }

  function handleImportarCamadas() {
    console.log("Importar camadas");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
