// ---------------------------------------------
// Variáveis globais (declaração única)
// ---------------------------------------------
let criteriaCount = 0;
let criteria = [];
let pairwiseValues = {};
let exportData = {};
let chosenMethod = "direct"; // "direct" ou "form"

// -----------------------------------------------------------
// 1: Processa a quantidade de critérios selecionada
// -----------------------------------------------------------
function processCriteriaCount() {
  const countSelect = document.getElementById("criteria-count");
  criteriaCount = parseInt(countSelect.value);
  showNamesSection();
}

// -----------------------------------------------------------
// 2: Gera os campos para nomes dos critérios
// -----------------------------------------------------------
function showNamesSection() {
  const container = document.getElementById("names-container");
  container.innerHTML = "";
  for (let i = 0; i < criteriaCount; i++) {
    container.innerHTML += `
      <div class="name-field">
        <label>${i + 1}.</label>
        <input type="text" id="criteria_${i}" placeholder="Nome do critério ${i + 1}">
      </div>
    `;
  }
}

// Volta da etapa 2 para a etapa 1
function backToStep1() {
  // Navegação tratada pelas abas no HTML
}

// -----------------------------------------------------------
// 2: Processa e valida os nomes dos critérios
// -----------------------------------------------------------
function processCriteriaNames() {
  criteria = [];
  let hasError = false;
  for (let i = 0; i < criteriaCount; i++) {
    let input = document.getElementById("criteria_" + i);
    let name = input.value.trim();
    if (name === "") {
      showError(input, "Preencha o nome do critério!");
      hasError = true;
    } else if (name.length < 3) {
      showError(input, "O nome deve ter mais de 3 caracteres!");
      hasError = true;
    } else {
      clearError(input);
    }
    if (!hasError) criteria.push(name);
  }
  if (!hasError) {
    showSuccess("Critérios preenchidos com sucesso!");
    // Navegação tratada pelas abas no HTML
  }
}

// Função para mostrar erro em tempo real
function showError(element, message) {
  element.style.borderColor = "red";
  element.style.boxShadow = "0 0 10px rgba(255, 0, 0, 0.5)";
  let tooltip = element.nextElementSibling;
  if (!tooltip || !tooltip.classList.contains("tooltip")) {
    tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.style.color = "red";
    tooltip.style.fontSize = "0.8em";
    tooltip.style.marginTop = "5px";
    element.parentNode.insertBefore(tooltip, element.nextSibling);
  }
  tooltip.textContent = message;
}

// Função para limpar erro
function clearError(element) {
  element.style.borderColor = "#ddd";
  element.style.boxShadow = "none";
  let tooltip = element.nextElementSibling;
  if (tooltip && tooltip.classList.contains("tooltip")) {
    tooltip.remove();
  }
}

// Função para mostrar sucesso
function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.textContent = message;
  successDiv.style.color = "green";
  successDiv.style.fontWeight = "bold";
  successDiv.style.textAlign = "center";
  successDiv.style.marginBottom = "10px";
  successDiv.style.animation = "fadeIn 0.5s ease";
  const container = document.getElementById("names-container");
  if (container) {
    container.insertBefore(successDiv, container.firstChild);
  }
  setTimeout(() => successDiv.remove(), 3000);
}

// Adicionar validação em tempo real nos inputs
document.addEventListener("DOMContentLoaded", function() {
  // ...existing code...
  // Adicionar event listeners para validação em tempo real
  setTimeout(() => {
    for (let i = 0; i < criteriaCount; i++) {
      let input = document.getElementById("criteria_" + i);
      if (input) {
        input.addEventListener("input", function() {
          let name = this.value.trim();
          if (name === "" || name.length < 3) {
            showError(this, name === "" ? "Campo obrigatório!" : "Mínimo 3 caracteres!");
          } else {
            clearError(this);
          }
        });
      }
    }
  }, 100); // Pequeno delay para garantir que os inputs existam
});

// -----------------------------------------------------------
// Volta da seleção do método para a etapa 2
// -----------------------------------------------------------
function backToNames() {
  // Navegação tratada pelas abas no HTML
}

// -----------------------------------------------------------
// Lê o método selecionado e direciona para a interface de comparação
// -----------------------------------------------------------
function selectComparisonMethod() {
  const radios = document.getElementsByName("comparisonMethod");
  for (let radio of radios) {
    if (radio.checked) {
      chosenMethod = radio.value; // "direct" ou "form"
      break;
    }
  }
  // Navegação tratada pelas abas no HTML

  const h2 = document.querySelector("#pairwise-title");
  const instructionP = document.querySelector("#step4 .instruction");

  if (chosenMethod === "direct") {
    h2.textContent = "4. Matriz direta de comparação pareada dos critérios";
    instructionP.textContent = "Para cada célula (ou par) da matriz, selecione a intensidade de importância que indica o quanto o critério da linha é mais importante que o da coluna. Os valores recíprocos serão calculados automaticamente.";
    generateDirectMatrix();
  } else {
    h2.textContent = "4. Formulário de comparação pareada dos critérios";
    instructionP.textContent = "Para cada linha (ou par) do formulário, selecione a intensidade de importância que indica o quanto o critério da primeira coluna é mais importante que o da segunda coluna. Os valores recíprocos serão calculados automaticamente.";
    generatePairwiseFormMethod();
  }
}

// -----------------------------------------------------------
// Volta da seção de comparação para a seleção do método
// -----------------------------------------------------------
function backToComparisonMethod() {
  // Navegação tratada pelas abas no HTML
}

// -----------------------------------------------------------
// Método 1: Gera a interface de comparação com matriz completa (Matriz Direta)
// -----------------------------------------------------------
function generateDirectMatrix() {
  const container = document.getElementById("pairwise-form");
  let html = "<table>";
  html += "<tr><th></th>";
  for (let j = 0; j < criteria.length; j++) {
    html += `<th>${criteria[j]}</th>`;
  }
  html += "</tr>";
  for (let i = 0; i < criteria.length; i++) {
    html += `<tr>`;
    html += `<th>${criteria[i]}</th>`;
    for (let j = 0; j < criteria.length; j++) {
      if (i === j) {
        html += `<td><strong>1</strong></td>`;
      } else if (i < j) {
        html += `<td>${createSelectInput(i, j)}</td>`;
      } else {
        // Para a parte inferior da matriz, calcular o recíproco
        const key = "pair_" + j + "_" + i;
        const currentVal = pairwiseValues[key] || 1;
        const reciprocal = (1 / currentVal).toFixed(4);
        html += `<td id="recip_${j}_${i}">${reciprocal}</td>`;
      }
    }
    html += "</tr>";
  }
  html += "</table>";
  container.innerHTML = html;
}

// -----------------------------------------------------------
// Método 2: Gera a interface de comparação pelo formulário (tabela com três colunas)
// -----------------------------------------------------------
function generatePairwiseFormMethod() {
  const container = document.getElementById("pairwise-form");
  container.innerHTML = "";
  let html = "<table><tr><th>Critério 1</th><th>Critério 2</th><th>Importância (Escala AHP)</th></tr>";
  for (let i = 0; i < criteria.length - 1; i++) {
    for (let j = i + 1; j < criteria.length; j++) {
      html += "<tr>";
      html += `<td>${criteria[i]}</td>`;
      html += `<td>${criteria[j]}</td>`;
      html += `<td>${createSelectInput(i, j)}</td>`;
      html += "</tr>";
    }
  }
  html += "</table>";
  container.innerHTML = html;
}

// -----------------------------------------------------------
// Cria o select para a célula de comparação (para i < j)
// -----------------------------------------------------------
function createSelectInput(i, j) {
  const options = [
    {value: 1/9, label: "1/9"},
    {value: 1/8, label: "1/8"},
    {value: 1/7, label: "1/7"},
    {value: 1/6, label: "1/6"},
    {value: 1/5, label: "1/5"},
    {value: 1/4, label: "1/4"},
    {value: 1/3, label: "1/3"},
    {value: 1/2, label: "1/2"},
    {value: 1,   label: "1"},
    {value: 2,   label: "2"},
    {value: 3,   label: "3"},
    {value: 4,   label: "4"},
    {value: 5,   label: "5"},
    {value: 6,   label: "6"},
    {value: 7,   label: "7"},
    {value: 8,   label: "8"},
    {value: 9,   label: "9"}
  ];
  const selectId = "pair_" + i + "_" + j;
  let selectHtml = `<select id="${selectId}" onchange="storePairwiseValue(${i}, ${j})">`;
  for (let opt of options) {
    let selected = (Number(opt.value) === 1) ? "selected" : "";
    selectHtml += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
  }
  selectHtml += "</select>";
  pairwiseValues[selectId] = 1;
  return selectHtml;
}

// -----------------------------------------------------------
// Atualiza o valor selecionado e a célula recíproca correspondente
// -----------------------------------------------------------
function storePairwiseValue(i, j) {
  const selectId = "pair_" + i + "_" + j;
  const val = parseFloat(document.getElementById(selectId).value);
  pairwiseValues[selectId] = val;
  updateReciprocal(i, j);
}

// -----------------------------------------------------------
// Atualiza a célula da parte inferior (recíproco) para o par (i, j)
// -----------------------------------------------------------
function updateReciprocal(i, j) {
  const reciprocalCellId = "recip_" + j + "_" + i;
  const selectId = "pair_" + i + "_" + j;
  const val = parseFloat(document.getElementById(selectId).value);
  const reciprocal = (1 / val).toFixed(4);
  const cell = document.getElementById(reciprocalCellId);
  if (cell) {
    cell.innerHTML = reciprocal;
  }
  // Atualiza também o valor no objeto pairwiseValues para o par oposto
  const reciprocalKey = "pair_" + j + "_" + i;
  pairwiseValues[reciprocalKey] = 1 / val;
}

// -----------------------------------------------------------
// 3/4: Calcula os pesos e as métricas do AHP e exibe os resultados
// -----------------------------------------------------------
function calculateAHP() {
  // Mostrar loading
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = '<div class="loading">Calculando pesos e consistência... <div class="spinner"></div></div>';
  // Navegação tratada pelas abas no HTML

  // Simular delay para feedback visual (pode remover em produção)
  setTimeout(() => {
    const nCriteria = criteria.length;
    let matrix = [];
    for (let i = 0; i < nCriteria; i++) {
      matrix[i] = [];
      for (let j = 0; j < nCriteria; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else if (i < j) {
          const key = "pair_" + i + "_" + j;
          const val = pairwiseValues[key] || parseFloat(document.getElementById(key).value);
          matrix[i][j] = val;
        } else {
          const key = "pair_" + j + "_" + i;
          const reciprocal = 1 / (pairwiseValues[key] || parseFloat(document.getElementById(key).value));
          matrix[i][j] = reciprocal;
        }
      }
    }
    let geoMeans = [];
    let sumGeo = 0;
    for (let i = 0; i < nCriteria; i++) {
      let prod = 1;
      for (let j = 0; j < nCriteria; j++) {
        prod *= matrix[i][j];
      }
      geoMeans[i] = Math.pow(prod, 1 / nCriteria);
      sumGeo += geoMeans[i];
    }
    let weights = geoMeans.map(gm => gm / sumGeo);
    let lambdaVector = [];
    for (let i = 0; i < nCriteria; i++) {
      let sumRow = 0;
      for (let j = 0; j < nCriteria; j++) {
        sumRow += matrix[i][j] * weights[j];
      }
      lambdaVector[i] = sumRow / weights[i];
    }
    let lambdaMax = lambdaVector.reduce((a, b) => a + b, 0) / nCriteria;
    let CI = (lambdaMax - nCriteria) / (nCriteria - 1);
    const RI_values = {
      1: 0.00,
      2: 0.00,
      3: 0.58,
      4: 0.90,
      5: 1.12,
      6: 1.24,
      7: 1.32,
      8: 1.41,
      9: 1.45,
      10: 1.49
    };
    let RI = RI_values[nCriteria] || 1.5;
    let CR = RI === 0 ? 0 : CI / RI;
    displayResults(weights, lambdaMax, CI, CR, matrix);
  }, 1000); // Delay de 1s para simular processamento
}

// -----------------------------------------------------------
// Volta da etapa 5 para a seção de comparação (etapa 4)
// -----------------------------------------------------------
function backToPairwise() {
  // Navegação tratada pelas abas no HTML
}

// -----------------------------------------------------------
// 4/5: Exibe os resultados e armazena os dados para exportação
// -----------------------------------------------------------
function displayResults(weights, lambdaMax, CI, CR, matrix) {
  const resultsDiv = document.getElementById("results");
  let html = "<h3>Pesos dos Critérios:</h3><ul>";
  for (let i = 0; i < criteria.length; i++) {
    html += `<li>${criteria[i]}: ${(weights[i] * 100).toFixed(2)}%</li>`;
  }
  html += "</ul>";
  html += "<h3>Métricas de Consistência:</h3>";
  html += `<p>λ máximo (lambda max): ${lambdaMax.toFixed(4)}</p>`;
  html += `<p>Índice de Consistência (CI): ${CI.toFixed(4)}</p>`;
  html += `<p>Razão de Consistência (CR): ${CR.toFixed(4)}</p>`;
  html += "<h3>Matriz de Comparação:</h3>";
  html += "<table><tr><th></th>";
  for (let i = 0; i < criteria.length; i++) {
    html += `<th>${criteria[i]}</th>`;
  }
  html += "</tr>";
  for (let i = 0; i < criteria.length; i++) {
    html += `<tr><th>${criteria[i]}</th>`;
    for (let j = 0; j < criteria.length; j++) {
      html += `<td>${matrix[i][j].toFixed(4)}</td>`;
    }
    html += "</tr>";
  }
  html += "</table>";
  resultsDiv.innerHTML = html;
  // Navegação tratada pelas abas no HTML
  exportData = {
    criteria: criteria,
    weights: weights,
    lambdaMax: lambdaMax,
    CI: CI,
    CR: CR,
    matrix: matrix
  };
}

// -----------------------------------------------------------
// Exporta os dados em PDF, CSV ou XLSX
// -----------------------------------------------------------
function exportDataReport() {
  const format = document.getElementById("export-format").value;
  if (format === "PDF") {
    exportPDF();
  } else if (format === "CSV") {
    exportCSV();
  } else if (format === "XLSX") {
    exportXLSX();
  } else {
    alert("Formato de exportação desconhecido.");
  }
}

// -----------------------------------------------------------
// Exporta o relatório inteiro para PDF
// -----------------------------------------------------------
function exportPDF() {
  const results = document.getElementById('results');
  const opt = {
    margin: 1,
    filename: 'resultados_ahp.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(results).save();
}

// -----------------------------------------------------------
// Exporta a matriz e métricas para CSV
// -----------------------------------------------------------
function exportCSV() {
  if (!exportData || !exportData.matrix) {
    alert("Dados de exportação não encontrados.");
    return;
  }
  let csvContent = "";
  csvContent += "," + exportData.criteria.join(",") + "\n";
  for (let i = 0; i < exportData.criteria.length; i++) {
    let row = exportData.criteria[i];
    for (let j = 0; j < exportData.criteria.length; j++) {
      row += "," + exportData.matrix[i][j].toFixed(4);
    }
    csvContent += row + "\n";
  }
  csvContent += "\nMétricas de Consistência\n";
  csvContent += "λ máximo," + exportData.lambdaMax.toFixed(4) + "\n";
  csvContent += "CI," + exportData.CI.toFixed(4) + "\n";
  csvContent += "CR," + exportData.CR.toFixed(4) + "\n";
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "matriz_ahp.csv";
  link.click();
}

// -----------------------------------------------------------
// Exporta a matriz e métricas para XLSX
// -----------------------------------------------------------
function exportXLSX() {
  if (!exportData || !exportData.matrix) {
    alert("Dados de exportação não encontrados.");
    return;
  }
  let ws_data = [];
  let header = [""].concat(exportData.criteria);
  ws_data.push(header);
  for (let i = 0; i < exportData.criteria.length; i++) {
    let row = [exportData.criteria[i]];
    for (let j = 0; j < exportData.criteria.length; j++) {
      row.push(exportData.matrix[i][j].toFixed(4));
    }
    ws_data.push(row);
  }
  ws_data.push([]);
  ws_data.push(["Métricas de Consistência"]);
  ws_data.push(["λ máximo", exportData.lambdaMax.toFixed(4)]);
  ws_data.push(["CI", exportData.CI.toFixed(4)]);
  ws_data.push(["CR", exportData.CR.toFixed(4)]);
  let ws = XLSX.utils.aoa_to_sheet(ws_data);
  let wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório AHP");
  XLSX.writeFile(wb, "matriz_ahp.xlsx");
}

// -----------------------------------------------------------
// Step 5: Gera matriz direta específica para step5-comparacao.html
// -----------------------------------------------------------
function generateDirectMatrixStep4() {
  const n = criteria.length;
  const container = document.getElementById('comparisonContent');
  let html = '<div class="matrix-table-wrap"><table class="matrix-table">';
  html += '<thead><tr><th class="matrix-corner"></th>';
  for (let j = 0; j < n; j++) {
    html += `<th class="matrix-head matrix-head--col">${criteria[j]}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (let i = 0; i < n; i++) {
    html += '<tr>';
    html += `<th class="matrix-head matrix-head--row">${criteria[i]}</th>`;
    for (let j = 0; j < n; j++) {
      if (i === j) {
        html += '<td class="matrix-cell matrix-cell--diagonal"><strong>1</strong></td>';
      } else if (i < j) {
        html += `<td class="matrix-cell matrix-cell--input">${createSelectInputStep4(i, j)}</td>`;
      } else {
        const key = "pair_" + j + "_" + i;
        const currentVal = pairwiseValues[key] || 1;
        const reciprocal = (1 / currentVal).toFixed(4);
        html += `<td class="matrix-cell matrix-cell--recip" id="recip_${i}_${j}">${reciprocal}</td>`;
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  html += '<div style="margin-top: 16px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">';
  html += '<p style="margin: 0; color: #856404; font-size: 0.9rem; text-align: justify;"><i class="fas fa-info-circle"></i> <strong>Nota:</strong> Todas as células podem ser preenchidas. Ao selecionar um valor em qualquer célula, a célula oposta (simétrica) será automaticamente preenchida com o valor recíproco. Exemplo: se você selecionar 3 na célula [A,B], a célula [B,A] será automaticamente ajustada para 1/3.</p>';
  html += '</div>';
  container.innerHTML = html;
  if (typeof updateLiveMetrics === "function") updateLiveMetrics();
}

// -----------------------------------------------------------
// Step 4: Cria select específico para matriz direta
// -----------------------------------------------------------
function createSelectInputStep4(i, j) {
  const options = [
    {value: 1/9, label: "1/9"},
    {value: 1/8, label: "1/8"},
    {value: 1/7, label: "1/7"},
    {value: 1/6, label: "1/6"},
    {value: 1/5, label: "1/5"},
    {value: 1/4, label: "1/4"},
    {value: 1/3, label: "1/3"},
    {value: 1/2, label: "1/2"},
    {value: 1,   label: "1"},
    {value: 2,   label: "2"},
    {value: 3,   label: "3"},
    {value: 4,   label: "4"},
    {value: 5,   label: "5"},
    {value: 6,   label: "6"},
    {value: 7,   label: "7"},
    {value: 8,   label: "8"},
    {value: 9,   label: "9"}
  ];
  const selectId = "pair_" + i + "_" + j;
  let selectHtml = `<select id="${selectId}" onchange="updateReciprocalStep4(${i}, ${j})">`;
  for (let opt of options) {
    let selected = (Number(opt.value) === 1) ? "selected" : "";
    selectHtml += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
  }
  selectHtml += "</select>";
  pairwiseValues[selectId] = 1;
  return selectHtml;
}

// -----------------------------------------------------------
// Step 4: Atualiza recíproco específico para matriz direta
// -----------------------------------------------------------
function updateReciprocalStep4(i, j) {
  const selectId = "pair_" + i + "_" + j;
  const selectElement = document.getElementById(selectId);
  if (!selectElement) {
    console.error("Select element not found:", selectId);
    return;
  }
  const val = parseFloat(selectElement.value);
  pairwiseValues[selectId] = val;

  // A célula recíproca está na posição (j, i), não (i, j)
  const reciprocalCellId = "recip_" + j + "_" + i;
  const reciprocal = (1 / val).toFixed(4);
  const cell = document.getElementById(reciprocalCellId);
  console.log("Updating reciprocal cell:", reciprocalCellId, "with value:", reciprocal);
  if (cell) {
    cell.innerHTML = reciprocal;
  } else {
    console.error("Reciprocal cell not found:", reciprocalCellId);
  }

  // Atualiza também o valor no objeto pairwiseValues para o par oposto
  const reciprocalKey = "pair_" + j + "_" + i;
  pairwiseValues[reciprocalKey] = 1 / val;

  // Aplica esquema de cores para relacionar valores opostos
  applyColorScheme(selectElement, cell, val);

  // Atualiza métricas instantâneas
  if (typeof updateLiveMetrics === "function") updateLiveMetrics();
}

// -----------------------------------------------------------
// Aplica esquema de cores para valores relacionados
// -----------------------------------------------------------
function applyColorScheme(selectElement, reciprocalCell, val) {
  let bgColor, textColor, borderColor;

  // Normaliza o valor para escala de 1 a 9 (valores < 1 são tratados como recíprocos)
  let normalizedVal = val >= 1 ? val : 1 / val;
  normalizedVal = Math.min(Math.max(normalizedVal, 1), 9);

  // Calcula intensidade baseada no valor (1 = claro, 9 = escuro)
  const intensity = (normalizedVal - 1) / 8; // 0 a 1

  if (val > 1) {
    // Primeiro critério mais importante - degrade de verde
    // Verde claro (62, 194, 110) a verde escuro (13, 92, 61)
    const r = Math.round(62 - (62 - 13) * intensity);
    const g = Math.round(194 - (194 - 92) * intensity);
    const b = Math.round(110 - (110 - 61) * intensity);
    const alpha = 0.1 + (0.25 * intensity);
    bgColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    textColor = `rgb(${r - 20}, ${g - 40}, ${b - 20})`;
    borderColor = `rgba(${r}, ${g}, ${b}, ${0.3 + (0.4 * intensity)})`;
  } else if (val < 1) {
    // Segundo critério mais importante - degrade de laranja/amarelo
    // Amarelo claro (255, 193, 7) a laranja escuro (255, 140, 0)
    const r = 255;
    const g = Math.round(193 - (193 - 140) * intensity);
    const b = Math.round(7 - (7 - 0) * intensity);
    const alpha = 0.1 + (0.25 * intensity);
    bgColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    textColor = `rgb(${r - 40}, ${g - 40}, ${b + 20})`;
    borderColor = `rgba(${r}, ${g}, ${b}, ${0.3 + (0.4 * intensity)})`;
  } else {
    // Igual importância - neutro
    bgColor = 'rgba(108, 117, 125, 0.1)';
    textColor = '#495057';
    borderColor = 'rgba(108, 117, 125, 0.3)';
  }

  // Pinta a CÉLULA inteira do seletor (não apenas o select)
  const inputCell = selectElement.closest('td');
  if (inputCell) {
    inputCell.style.backgroundColor = bgColor;
    inputCell.style.borderColor = borderColor;
  }
  // Seletor transparente para mostrar a cor da célula
  selectElement.style.backgroundColor = 'transparent';
  selectElement.style.color = textColor;
  selectElement.style.borderColor = borderColor;

  // Aplica a mesma cor à célula recíproca (inteira)
  if (reciprocalCell) {
    reciprocalCell.style.backgroundColor = bgColor;
    reciprocalCell.style.color = textColor;
    reciprocalCell.style.borderColor = borderColor;
    reciprocalCell.style.fontWeight = '600';
  }
}

// -----------------------------------------------------------
// Step 5: Gera formulário pareado específico para step5-comparacao.html
// -----------------------------------------------------------
// Graduações da escala de Saaty (centrada em 1), conforme a imagem de referência
const SAATY_STEPS = [
  { v: 1 / 9, label: "1/9", desc: "Extremamente" },
  { v: 1 / 7, label: "1/7", desc: "Bastante" },
  { v: 1 / 5, label: "1/5", desc: "Médio" },
  { v: 1 / 3, label: "1/3", desc: "Pouco" },
  { v: 1, label: "1", desc: "Igual" },
  { v: 3, label: "3", desc: "Pouco" },
  { v: 5, label: "5", desc: "Médio" },
  { v: 7, label: "7", desc: "Bastante" },
  { v: 9, label: "9", desc: "Extremamente" },
];
const SAATY_CENTER = 4;

function escAhp(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generatePairwiseFormStep4() {
  const n = criteria.length;
  const container = document.getElementById("comparisonContent");
  let html = '<div class="saaty-form">';
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      html += buildSaatyPair(i, j);
    }
  }
  html += "</div>";
  container.innerHTML = html;
  initSaatySliders();
}

function buildSaatyPair(i, j) {
  const pid = i + "_" + j;
  let ticks = "";
  SAATY_STEPS.forEach((s, idx) => {
    const pct = (idx / (SAATY_STEPS.length - 1)) * 100;
    ticks +=
      '<div class="saaty-tick" style="left:' + pct + '%">' +
      '<span class="saaty-tick-val">' + s.label + "</span>" +
      '<span class="saaty-tick-desc">' + s.desc + "</span>" +
      '<span class="saaty-tick-mark"></span>' +
      "</div>";
  });
  return (
    '<div class="saaty-pair" data-i="' + i + '" data-j="' + j + '">' +
    '<div class="saaty-widget">' +
    '<div class="saaty-scale" data-pid="' + pid +
    '" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="8" aria-valuenow="4" aria-label="Comparação entre ' +
    escAhp(criteria[i]) + " e " + escAhp(criteria[j]) + '">' +
    '<div class="saaty-arrow"></div>' +
    '<div class="saaty-rail">' + ticks + '<div class="saaty-handle"></div></div>' +
    "</div>" +
    '<div class="saaty-dir"><span><i class="fas fa-arrow-left"></i> Menos importante</span>' +
    '<span>Mais importante <i class="fas fa-arrow-right"></i></span></div>' +
    "</div>" +
    '<div class="saaty-criteria">' +
    '<span class="saaty-crit saaty-crit--left"><span class="saaty-crit__tag">1</span><span class="saaty-crit__name">' +
    escAhp(criteria[i]) + "</span></span>" +
    '<span class="saaty-vs">vs</span>' +
    '<span class="saaty-crit saaty-crit--right"><span class="saaty-crit__tag">2</span><span class="saaty-crit__name">' +
    escAhp(criteria[j]) + "</span></span>" +
    "</div>" +
    '<div class="saaty-readout" id="readout_' + pid + '"></div>' +
    '<input type="hidden" id="pair_' + pid + '" value="1">' +
    "</div>"
  );
}

function initSaatySliders() {
  // Largura única para todas as setas: cobre o par de critérios mais largo
  // (ou um mínimo que comporte as 9 graduações da escala).
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const fam = getComputedStyle(document.body).fontFamily || "sans-serif";
  ctx.font = "700 16px " + fam;
  let maxPair = 0;
  for (let i = 0; i < criteria.length - 1; i++) {
    for (let j = i + 1; j < criteria.length; j++) {
      const w = ctx.measureText(criteria[i]).width + ctx.measureText(criteria[j]).width;
      if (w > maxPair) maxPair = w;
    }
  }
  const width = Math.max(Math.round(maxPair + 120), 740);
  document.documentElement.style.setProperty("--saaty-w", width + "px");

  document.querySelectorAll(".saaty-pair").forEach(wireSaaty);
}

function wireSaaty(pair) {
  const scale = pair.querySelector(".saaty-scale");
  const rail = pair.querySelector(".saaty-rail");
  const handle = pair.querySelector(".saaty-handle");
  const pid = scale.dataset.pid;
  const input = document.getElementById("pair_" + pid);
  const lastIdx = SAATY_STEPS.length - 1;
  let idx = SAATY_CENTER;
  let dragging = false;

  function apply(newIdx) {
    idx = Math.max(0, Math.min(lastIdx, newIdx));
    handle.style.left = (idx / lastIdx) * 100 + "%";
    scale.setAttribute("aria-valuenow", idx);
    input.value = SAATY_STEPS[idx].v;
    updateSaatyReadout(pair, idx);
    if (typeof updateLiveMetrics === "function") updateLiveMetrics();
  }

  function idxFromX(clientX) {
    const r = rail.getBoundingClientRect();
    let ratio = (clientX - r.left) / r.width;
    ratio = Math.max(0, Math.min(1, ratio));
    return Math.round(ratio * lastIdx);
  }

  function pointerX(e) {
    return e.touches && e.touches.length ? e.touches[0].clientX : e.clientX;
  }
  function down(e) {
    dragging = true;
    scale.classList.add("saaty-scale--active");
    apply(idxFromX(pointerX(e)));
    e.preventDefault();
  }
  function move(e) {
    if (!dragging) return;
    apply(idxFromX(pointerX(e)));
    e.preventDefault();
  }
  function up() {
    dragging = false;
    scale.classList.remove("saaty-scale--active");
  }

  scale.addEventListener("mousedown", down);
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
  scale.addEventListener("touchstart", down, { passive: false });
  document.addEventListener("touchmove", move, { passive: false });
  document.addEventListener("touchend", up);

  scale.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      apply(idx - 1);
      e.preventDefault();
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      apply(idx + 1);
      e.preventDefault();
    } else if (e.key === "Home") {
      apply(0);
      e.preventDefault();
    } else if (e.key === "End") {
      apply(lastIdx);
      e.preventDefault();
    }
  });

  apply(SAATY_CENTER);
}

function updateSaatyReadout(pair, idx) {
  const el = pair.querySelector(".saaty-readout");
  if (!el) return;
  const c1 = criteria[Number(pair.dataset.i)];
  const c2 = criteria[Number(pair.dataset.j)];
  const step = SAATY_STEPS[idx];
  let txt;
  let mod = "eq";
  if (idx === SAATY_CENTER) {
    txt = "\u201C" + c1 + "\u201D tem igual importância que \u201C" + c2 + "\u201D (1)";
  } else if (idx > SAATY_CENTER) {
    txt = "\u201C" + c1 + "\u201D é " + step.desc.toLowerCase() + " mais importante que \u201C" + c2 + "\u201D (" + step.label + ")";
    mod = "pos";
  } else {
    txt = "\u201C" + c1 + "\u201D é " + step.desc.toLowerCase() + " menos importante que \u201C" + c2 + "\u201D (" + step.label + ")";
    mod = "neg";
  }
  el.textContent = txt;
  el.className = "saaty-readout saaty-readout--" + mod;
}

// -----------------------------------------------------------
// Step 4: Métricas instantâneas (RC, IC, λmáx)
// -----------------------------------------------------------
function buildLiveMatrix() {
  const n = criteria.length;
  if (!n || typeof SLTAhp === "undefined") return null;
  return SLTAhp.matrixFromUpper(n, function (i, j) {
    const el = document.getElementById("pair_" + i + "_" + j);
    const v = el ? parseFloat(el.value) : 1;
    return isFinite(v) && v > 0 ? v : 1;
  });
}

function isAllOnes(matrix) {
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix.length; j++) {
      if (Math.abs(matrix[i][j] - 1) > 1e-9) return false;
    }
  }
  return true;
}

function updateLiveMetrics() {
  const container = document.getElementById("liveMetrics");
  if (!container || typeof SLTAhp === "undefined") return;
  const matrix = buildLiveMatrix();
  if (!matrix) return;

  const res = SLTAhp.analyzeMatrix(matrix);
  const rcEl = document.getElementById("metricRCValue");
  const icEl = document.getElementById("metricICValue");
  const lambdaEl = document.getElementById("metricLambdaValue");
  if (rcEl) rcEl.textContent = res.CR.toFixed(4);
  if (icEl) icEl.textContent = res.CI.toFixed(4);
  if (lambdaEl) lambdaEl.textContent = res.lambdaMax.toFixed(4);

  let state;
  if (isAllOnes(matrix)) {
    state = "is-initial";
  } else if (res.CR <= 0.1) {
    state = "is-success";
  } else {
    state = "is-failure";
  }
  container.className = "ahp-live-metrics " + state;
}

// -----------------------------------------------------------
// Step 4: Calcula resultados e redireciona para step5
// -----------------------------------------------------------
function calculateResults() {
  const n = criteria.length;
  pairwiseMatrix = [];
  for (let i = 0; i < n; i++) {
    pairwiseMatrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        pairwiseMatrix[i][j] = 1;
      } else if (i < j) {
        const selectId = 'pair_' + i + '_' + j;
        const val = parseFloat(document.getElementById(selectId).value);
        pairwiseMatrix[i][j] = val;
      } else {
        const selectId = 'pair_' + j + '_' + i;
        const val = parseFloat(document.getElementById(selectId).value);
        pairwiseMatrix[i][j] = 1 / val;
      }
    }
  }
  localStorage.setItem('ahp_pairwiseMatrix', JSON.stringify(pairwiseMatrix));
  // Persiste a matriz na configuração (banco) antes de seguir; o localStorage é
  // apenas cache. Navega em seguida, mesmo se a persistência falhar (offline).
  if (window.SLTConfigBridge && typeof window.SLTConfigBridge.persistMatriz === 'function') {
    Promise.resolve(window.SLTConfigBridge.persistMatriz(pairwiseMatrix)).finally(function () {
      window.location.href = 'step6-resultados.html';
    });
  } else {
    window.location.href = 'step6-resultados.html';
  }
}
