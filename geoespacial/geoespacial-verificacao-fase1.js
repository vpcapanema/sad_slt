/* Verificação Fase 1 — Módulo Geoespacial */
(function () {
  const API_BASE = "/api/geoespacial";
  let mapInitialized = false;
  let selectedOperation = null;

  const OPERACOES = {
    "OP-01": {
      nome: "Carregar Camada",
      descricao: "Carregar camada vetorial de arquivo ou WFS",
      variaveis: [
        { id: "informar_tipo_entrada", label: "Tipo de Entrada", tipo: "select", opcoes: ["local", "WFS"] },
        { id: "informar_caminho_arquivo", label: "Caminho do Arquivo/URL", tipo: "text" },
        { id: "informar_crs_origem", label: "CRS de Origem", tipo: "text" },
        { id: "definir_filtro_espacial", label: "Filtro Espacial (Bbox)", tipo: "text" },
        { id: "definir_filtro_atributivo", label: "Filtro Atributivo", tipo: "text" },
      ],
    },
    "OP-02": {
      nome: "Validar Camada",
      descricao: "Validar topologia e geometria da camada",
      variaveis: [
        { id: "validar_sobreposicoes", label: "Validar Sobreposições", tipo: "checkbox" },
        { id: "validar_lacunas", label: "Validar Lacunas", tipo: "checkbox" },
        { id: "validar_intersecoes_invalidas", label: "Validar Interseções Inválidas", tipo: "checkbox" },
        { id: "validar_gaps", label: "Validar Gaps", tipo: "checkbox" },
        { id: "validar_dangles", label: "Validar Dangles", tipo: "checkbox" },
        { id: "validar_crs", label: "Validar CRS", tipo: "checkbox" },
        { id: "validar_tipo_geometrico", label: "Validar Tipo Geométrico", tipo: "checkbox" },
        { id: "validar_campos_obrigatorios", label: "Validar Campos Obrigatórios", tipo: "checkbox" },
        { id: "definir_tolerancia_topologica", label: "Tolerância Topológica", tipo: "number" },
        { id: "definir_percentual_critico_erros", label: "Percentual Crítico de Erros", tipo: "number" },
      ],
    },
    "OP-02-CORR": {
      nome: "Reparar Geometrias",
      descricao: "Reparar geometrias inválidas e topologia",
      variaveis: [
        { id: "corrigir_geometrias_invalidas", label: "Corrigir Geometrias Inválidas", tipo: "checkbox" },
        { id: "corrigir_orientacao_aneis", label: "Corrigir Orientação de Anéis", tipo: "checkbox" },
        { id: "corrigir_fechamento_aneis", label: "Corrigir Fechamento de Anéis", tipo: "checkbox" },
        { id: "corrigir_repeticao_pontos", label: "Corrigir Repetição de Pontos", tipo: "checkbox" },
        { id: "corrigir_auto_intersecoes", label: "Corrigir Auto-interseções", tipo: "checkbox" },
        { id: "corrigir_geometrias_degeneradas", label: "Corrigir Geometrias Degeneradas", tipo: "checkbox" },
        { id: "corrigir_vertices_colineares", label: "Corrigir Vértices Colineares", tipo: "checkbox" },
        { id: "definir_tolerancia_correcao", label: "Tolerância de Correção", tipo: "number" },
        { id: "manter_geometria_original_falha", label: "Manter Original se Falhar", tipo: "checkbox" },
      ],
    },
    "OP-03": {
      nome: "Normalizar Camada",
      descricao: "Normalizar CRS, recortar e padronizar",
      variaveis: [
        { id: "definir_crs_destino", label: "CRS de Destino", tipo: "text", valor: "EPSG:4674" },
        { id: "recortar_area_estudo", label: "Recortar Área de Estudo", tipo: "checkbox" },
        { id: "definir_area_estudo", label: "Área de Estudo (Bbox)", tipo: "text" },
        { id: "corrigir_geometrias_invalidas", label: "Corrigir Geometrias", tipo: "checkbox" },
        { id: "remover_geometrias_vazias", label: "Remover Geometrias Vazias", tipo: "checkbox" },
        { id: "explodir_multipartes", label: "Explodir Multipartes", tipo: "checkbox" },
        { id: "padronizar_nomes_campos", label: "Padronizar Nomes de Campos", tipo: "checkbox" },
        { id: "definir_regra_nomenclatura", label: "Regra de Nomenclatura", tipo: "text", valor: "<fonte_id>__<nome_campo>" },
      ],
    },
    "OP-04": {
      nome: "Criar Buffer",
      descricao: "Criar buffer espacial ao redor de geometrias",
      variaveis: [
        { id: "definir_distancia_buffer", label: "Distância do Buffer", tipo: "number" },
        { id: "definir_unidade_buffer", label: "Unidade", tipo: "select", opcoes: ["metros", "graus"] },
        { id: "selecionar_tipo_buffer", label: "Tipo de Buffer", tipo: "select", opcoes: ["cheio", "externo"] },
        { id: "dissolver_geometrias", label: "Dissolver Geometrias", tipo: "checkbox" },
        { id: "recortar_area_estudo", label: "Recortar Área de Estudo", tipo: "checkbox" },
      ],
    },
    "OP-05": {
      nome: "Sobrepor Camadas",
      descricao: "Sobrepor camadas com operação de overlay",
      variaveis: [
        { id: "selecionar_tipo_overlay", label: "Tipo de Overlay", tipo: "select", opcoes: ["identity", "intersection", "union", "difference"] },
        { id: "resolver_conflitos_campos", label: "Resolver Conflitos de Campos", tipo: "checkbox" },
        { id: "definir_regra_nomenclatura_conflito", label: "Regra de Nomenclatura", tipo: "text", valor: "<fonte_id>__<nome_campo>" },
      ],
    },
    "OP-06": {
      nome: "Dissolver",
      descricao: "Dissolver geometrias baseado em atributos",
      variaveis: [
        { id: "definir_campo_agrupamento", label: "Campo de Agrupamento", tipo: "text" },
        { id: "manter_atributos", label: "Função de Agregação", tipo: "select", opcoes: ["soma", "media", "mediana", "max", "min"] },
        { id: "manter_geometria_multi", label: "Manter Geometria Multi", tipo: "checkbox" },
      ],
    },
    "OP-07": {
      nome: "Selecionar por Localização",
      descricao: "Selecionar feições por localização espacial",
      variaveis: [
        { id: "selecionar_tipo_selecao", label: "Tipo de Seleção", tipo: "select", opcoes: ["intersects", "contains", "within", "touches"] },
        { id: "inverter_selecao", label: "Inverter Seleção", tipo: "checkbox" },
      ],
    },
    "OP-08": {
      nome: "Converter para Raster",
      descricao: "Converter camada vetorial para raster",
      variaveis: [
        { id: "definir_resolucao_raster", label: "Resolução do Raster", tipo: "number" },
        { id: "definir_crs_destino", label: "CRS de Destino", tipo: "text" },
        { id: "selecionar_metodo_rasterizacao", label: "Método de Rasterização", tipo: "select", opcoes: ["ponto_central", "area_ponderada", "maioria"] },
        { id: "selecionar_atributo_rasterizacao", label: "Atributo para Rasterizar", tipo: "text" },
        { id: "definir_valor_preenchimento", label: "Valor de Preenchimento", tipo: "number" },
        { id: "processar_todas_celulas_tocadas", label: "Processar Todas as Células Tocadas", tipo: "checkbox" },
      ],
    },
    "OP-10": {
      nome: "Calcular Distância",
      descricao: "Calcular distância euclidiana raster",
      variaveis: [
        { id: "definir_resolucao_distancia", label: "Resolução da Distância", tipo: "number" },
        { id: "definir_distancia_maxima", label: "Distância Máxima", tipo: "number" },
        { id: "definir_unidade_distancia", label: "Unidade de Distância", tipo: "select", opcoes: ["metros", "graus"] },
      ],
    },
    "OP-11": {
      nome: "Calcular Distância Ponderada",
      descricao: "Calcular distância ponderada por atributo",
      variaveis: [
        { id: "selecionar_atributo_peso", label: "Atributo de Peso", tipo: "text" },
        { id: "definir_resolucao_distancia", label: "Resolução da Distância", tipo: "number" },
        { id: "normalizar_resultado", label: "Normalizar Resultado", tipo: "checkbox" },
      ],
    },
    "OP-12": {
      nome: "Calcular Densidade",
      descricao: "Calcular densidade de kernel",
      variaveis: [
        { id: "selecionar_tipo_kernel", label: "Tipo de Kernel", tipo: "select", opcoes: ["gaussiano", "epanechnikov", "quadratic"] },
        { id: "definir_largura_kernel", label: "Largura do Kernel", tipo: "number" },
        { id: "definir_resolucao_kernel", label: "Resolução do Grid", tipo: "number" },
        { id: "normalizar_resultado", label: "Normalizar Resultado", tipo: "checkbox" },
      ],
    },
    "OP-13": {
      nome: "Calcular Custo Acumulado",
      descricao: "Calcular custo acumulado em rede",
      variaveis: [
        { id: "informar_raster_custo", label: "Raster de Custo", tipo: "text" },
        { id: "informar_pontos_origem", label: "Pontos de Origem", tipo: "text" },
        { id: "definir_custo_maximo", label: "Custo Máximo", tipo: "number" },
      ],
    },
    "OP-14": {
      nome: "Interpolar Valores",
      descricao: "Interpolar valores de pontos para grid",
      variaveis: [
        { id: "selecionar_metodo_interpolacao", label: "Método de Interpolação", tipo: "select", opcoes: ["idw", "kriging", "spline"] },
        { id: "definir_resolucao_interpolacao", label: "Resolução do Grid", tipo: "number" },
        { id: "definir_potencia_interpolacao", label: "Potência (IDW)", tipo: "number" },
        { id: "definir_raio_busca", label: "Raio de Busca", tipo: "number" },
      ],
    },
    "OP-15": {
      nome: "Agregar por Território",
      descricao: "Agregar valores por unidade territorial",
      variaveis: [
        { id: "selecionar_campo_unidade", label: "Campo de Unidade", tipo: "text" },
        { id: "selecionar_funcao_agregacao", label: "Função de Agregação", tipo: "select", opcoes: ["soma", "media", "mediana", "max", "min"] },
        { id: "selecionar_atributo_agregacao", label: "Atributo a Agregar", tipo: "text" },
        { id: "definir_resolucao_saida", label: "Resolução de Saída", tipo: "number" },
      ],
    },
    "OP-26": {
      nome: "Somar Rasters",
      descricao: "Somar dois ou mais rasters",
      variaveis: [
        { id: "selecionar_rasters", label: "Rasters a Somar", tipo: "text" },
        { id: "definir_valor_nodata", label: "Valor NoData", tipo: "number" },
      ],
    },
    "OP-27": {
      nome: "Subtrair Rasters",
      descricao: "Subtrair rasters",
      variaveis: [
        { id: "selecionar_raster_a", label: "Raster A", tipo: "text" },
        { id: "selecionar_raster_b", label: "Raster B", tipo: "text" },
        { id: "definir_valor_nodata", label: "Valor NoData", tipo: "number" },
      ],
    },
    "OP-28": {
      nome: "Multiplicar Rasters",
      descricao: "Multiplicar raster por escalar",
      variaveis: [
        { id: "selecionar_raster", label: "Raster", tipo: "text" },
        { id: "definir_escalar", label: "Escalar", tipo: "number" },
        { id: "definir_valor_nodata", label: "Valor NoData", tipo: "number" },
      ],
    },
    "OP-23": {
      nome: "Normalizar Raster",
      descricao: "Normalizar raster para escala 0-1",
      variaveis: [
        { id: "selecionar_metodo_normalizacao", label: "Método", tipo: "select", opcoes: ["linear", "minmax", "zscore"] },
        { id: "definir_valor_minimo", label: "Valor Mínimo", tipo: "number" },
        { id: "definir_valor_maximo", label: "Valor Máximo", tipo: "number" },
      ],
    },
    "OP-25": {
      nome: "Exportar Camada",
      descricao: "Exportar camada vetorial",
      variaveis: [
        { id: "definir_nome_arquivo", label: "Nome do Arquivo", tipo: "text" },
        { id: "selecionar_formato_saida", label: "Formato", tipo: "select", opcoes: ["GeoPackage", "GeoJSON", "Shapefile"] },
        { id: "definir_crs_saida", label: "CRS de Saída", tipo: "text" },
        { id: "selecionar_opcao_salvamento", label: "Opção de Salvamento", tipo: "select", opcoes: ["memoria", "persistir_sistema"] },
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
        GeoToolbox.show("algoritmos");
        GeoToolbox.hide("funcoes");
      }
    });
    document.getElementById("btn-toolbox-funcoes")?.addEventListener("click", () => {
      if (typeof GeoToolbox !== "undefined") {
        GeoToolbox.show("funcoes");
        GeoToolbox.hide("algoritmos");
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
      const response = await fetch(`${API_BASE}/camadas`);
      const camadas = await response.json();
      renderCamadas(camadas);
    } catch (error) {
      console.error("Erro ao carregar camadas:", error);
    }
  }

  function renderCamadas(camadas) {
    const container = document.getElementById("geoespacial-layers-list");

    if (camadas.length === 0) {
      container.innerHTML = '<p class="hint">Nenhuma camada carregada.</p>';
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
    const opConfig = OPERACOES[opId];

    document.querySelectorAll("[data-op]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.op === opId);
    });

    const operationsList = document.getElementById("geoespacial-operations-list");
    const variablesPanel = document.getElementById("geoespacial-variables-panel");
    const variablesContainer = document.getElementById("geoespacial-variables-container");

    if (opConfig) {
      operationsList.innerHTML = `
        <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #ffffff;">${opConfig.nome}</p>
        <p style="margin: 0 0 1rem 0; font-size: 0.75rem; color: #b0b0b0;">${opConfig.descricao}</p>
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
          <button type="button" class="geoespacial-operation-btn" id="btn-executar-op" style="margin-top: 0.5rem;">Executar</button>
        `;

        document.getElementById("btn-executar-op").addEventListener("click", executeOperation);
      } else {
        variablesPanel.classList.add("hidden");
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

    const opConfig = OPERACOES[selectedOperation];
    addLog(`Iniciando operação: ${opConfig.nome}`, "info");

    try {
      // Coletar valores das variáveis
      const params: Record<string, any> = {};
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
      const endpointMap: Record<string, string> = {
        "OP-01": "/operacoes/carregar-camada",
        "OP-02": "/operacoes/validar-camada",
        "OP-02-CORR": "/operacoes/reparar-geometrias",
        "OP-03": "/operacoes/normalizar-camada",
        "OP-04": "/operacoes/criar-buffer",
        "OP-05": "/operacoes/sobrepor-camadas",
        "OP-25": "/operacoes/exportar-camada",
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

        // Atualizar lista de camadas se necessário
        if (resultado.camada_id || resultado.raster_id) {
          await loadCamadas();
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
