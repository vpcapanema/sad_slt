(function () {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const esc = (value) =>
    String(value ?? "—").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);

  const queryCode = new URLSearchParams(location.search).get("codigo");
  let hierarquizacoes = [];
  let pares = [];
  let fatiamentos = [];
  let relatorioAtual = null;

  const atual = () =>
    hierarquizacoes.find((item) => item.codigo === $("#fase-hierarquizacao").value);

  const parAtual = () => {
    const option = $("#camada-restricao").selectedOptions[0];
    const parId = option ? option.dataset.par : null;
    return pares.find((item) => item.pacote_id === parId);
  };

  function linha(label, value) {
    return `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
  }

  function erro(value) {
    const box = $("#fase1-erro");
    box.textContent = value?.message || value;
    box.classList.remove("hidden");
  }

  function limparErro() {
    $("#fase1-erro").classList.add("hidden");
  }

  function objetos(hierarquizacao) {
    return (
      hierarquizacao?.dados_hierarquizacao?.objetos ||
      (hierarquizacao?.objetos || []).map((item) => ({ cabecalho_objeto: item }))
    );
  }

  function finalidade(camada, termo) {
    return (
      String(camada.finalidade || "") + JSON.stringify(camada.metadados || {})
    )
      .toLowerCase()
      .includes(termo);
  }

  function codigoCurto(base) {
    const limpa = String(base || "f1")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return limpa || "f1";
  }

  function parseNumero(value, fallback = null) {
    if (value == null || value === "") {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function renderHierarquizacao() {
    const hierarquizacao = atual();
    const box = $("#fase-resumo");
    const layer = $("#gp-demandas");

    if (!hierarquizacao) {
      box.classList.add("hidden");
      layer.innerHTML = '<p class="ahp-help-text">Selecione uma hierarquização.</p>';
      return;
    }

    const list = objetos(hierarquizacao)
      .slice(0, 10)
      .map((item, index) => {
        const cabecalho = item.cabecalho_objeto || item;
        return `<li>${esc(cabecalho.codigo || cabecalho.demanda_id || `Objeto ${index + 1}`)} — ${esc(cabecalho.nome || "Sem denominação")}</li>`;
      })
      .join("");

    box.innerHTML = `<dl>${linha("Código", hierarquizacao.codigo)}${linha("Configuração multicritério", hierarquizacao.config_codigo || hierarquizacao.config_id)}${linha("Nome", hierarquizacao.nome)}<div><dt>Objetos (primeiros 10)</dt><dd><ol>${list || "<li>Nenhum objeto</li>"}</ol></dd></div></dl>`;
    box.classList.remove("hidden");

    layer.innerHTML = `<span class="fase1-layer"><i class="fas fa-location-dot"></i><span><strong>${esc(hierarquizacao.nome)}</strong><small>${objetos(hierarquizacao).length} ponto(s), espacializados por latitude/longitude</small></span></span>`;
    renderRelatorio(hierarquizacao);
  }

  function preencherRestricoes() {
    const select = $("#camada-restricao");
    const options = [];

    pares.forEach((pacote) => {
      (pacote.camadas || [])
        .filter((camada) => finalidade(camada, "restri"))
        .forEach((camada) => {
          options.push(
            `<option value="${esc(camada.id)}" data-par="${esc(pacote.pacote_id)}">${esc(camada.nome)} — ${esc(pacote.nome)} (${esc(pacote.versao)})</option>`
          );
        });
    });

    select.innerHTML = '<option value="">Selecione…</option>' + options.join("");
  }

  function associarRiscos() {
    const pacote = parAtual();
    const riscoSelect = $("#camada-risco");

    if (!pacote) {
      riscoSelect.disabled = true;
      riscoSelect.innerHTML =
        '<option value="">Selecione primeiro a camada de restrição</option>';
      $("#gp-risco-restricao").innerHTML =
        '<p class="ahp-help-text">Selecione o par homologado.</p>';
      return;
    }

    const riscos = (pacote.camadas || []).filter((camada) =>
      finalidade(camada, "risco")
    );
    riscoSelect.innerHTML =
      riscos
        .map(
          (camada) =>
            `<option value="${esc(camada.id)}">${esc(camada.nome)} — ${esc(camada.versao)}</option>`
        )
        .join("") || '<option value="">Camada associada não encontrada</option>';
    riscoSelect.disabled = !riscos.length;
    renderCamadas();
  }

  function renderCamadas() {
    const pacote = parAtual();
    const restricao = $("#camada-restricao").selectedOptions[0];
    const risco = $("#camada-risco").selectedOptions[0];

    if (!pacote) {
      return;
    }

    $("#gp-risco-restricao").innerHTML =
      `<p class="fase1-pair-id">Identificador do conjunto: <code>${esc(pacote.pacote_id)}</code></p>` +
      (restricao?.value
        ? `<span class="fase1-layer"><i class="fas fa-ban"></i><span><strong>Restrição: ${esc(restricao.textContent)}</strong></span></span>`
        : "") +
      (risco?.value
        ? `<span class="fase1-layer"><i class="fas fa-triangle-exclamation"></i><span><strong>Risco: ${esc(risco.textContent)}</strong></span></span>`
        : "");
  }

  function renderFatiamento() {
    const fatiamento = fatiamentos.find(
      (item) => item.id === $("#fatiamento-fase1").value
    );
    const box = $("#fatiamento-resumo");
    const pesos = $("#fatiamento-pesos");
    const classes = $("#fatiamento-classes");
    const limiar = $("#fatiamento-limiar");

    if (!fatiamento) {
      box.classList.add("hidden");
      pesos.innerHTML = "";
      classes.innerHTML = "";
      limiar.value = "";
      return;
    }

    const parametros = fatiamento.parametros || {};
    const classesRisco = parametros.risco?.classes || [];
    const pesosConfig = parametros.pesos || {};
    const descricaoClasses = classesRisco
      .map(
        (item) => `${item.rotulo}: ${item.minimo ?? "-inf"} a ${item.maximo ?? "+inf"}`
      )
      .join("; ");

    box.innerHTML = `<dl>${linha("Nome", fatiamento.nome)}${linha("Código", fatiamento.codigo)}${linha("Configuração padrão", fatiamento.padrao ? "Sim" : "Não")}${linha("Limiar de restrição", parametros.restricao?.limiar)}${linha("Classes de risco", descricaoClasses || "Não definido")}</dl>`;
    box.classList.remove("hidden");

    limiar.value = parseNumero(parametros.restricao?.limiar, 1) ?? 1;

    classes.innerHTML = classesRisco
      .map(
        (classe, index) =>
          `<article class="fase1-class-card" data-index="${index}"><h5>${esc(classe.rotulo || classe.codigo || `Classe ${index + 1}`)}</h5><label>Rótulo<input data-k="rotulo" value="${esc(classe.rotulo || "")}"></label><label>Código<input data-k="codigo" value="${esc(classe.codigo || classe.rotulo || `classe_${index + 1}`)}"></label><label>Mínimo<input data-k="minimo" type="number" step="0.01" value="${esc(classe.minimo ?? "")}"></label><label>Máximo<input data-k="maximo" type="number" step="0.01" value="${esc(classe.maximo ?? "")}"></label></article>`
      )
      .join("");

    const chavesPeso = Object.keys(pesosConfig);
    pesos.innerHTML = (chavesPeso.length ? chavesPeso : ["peso_padrao"]) 
      .map((chave) => {
        const valor = parseNumero(pesosConfig[chave], 1);
        return `<label>${esc(chave)}<input data-peso="${esc(chave)}" type="number" min="0" step="0.01" value="${esc(valor)}"></label>`;
      })
      .join("");
  }

  function parametrosAjustados() {
    const base = fatiamentos.find((item) => item.id === $("#fatiamento-fase1").value);
    if (!base) {
      throw new Error("Selecione uma configuração de fatiamento.");
    }

    const parametros = JSON.parse(JSON.stringify(base.parametros || {}));
    parametros.restricao = parametros.restricao || {};
    parametros.risco = parametros.risco || {};

    parametros.restricao.limiar = parseNumero($("#fatiamento-limiar").value, 1);

    const classes = [...document.querySelectorAll("#fatiamento-classes .fase1-class-card")]
      .map((card) => {
        const minimo = parseNumero(card.querySelector('[data-k="minimo"]').value);
        const maximo = parseNumero(card.querySelector('[data-k="maximo"]').value);
        return {
          rotulo: card.querySelector('[data-k="rotulo"]').value.trim() || "Sem rótulo",
          codigo: card.querySelector('[data-k="codigo"]').value.trim() || "nao_classificado",
          minimo,
          maximo,
        };
      })
      .sort((a, b) => {
        const va = a.minimo == null ? -Infinity : a.minimo;
        const vb = b.minimo == null ? -Infinity : b.minimo;
        return va - vb;
      });

    if (!classes.length) {
      throw new Error("Informe ao menos uma classe de risco.");
    }
    parametros.risco.classes = classes;

    const pesos = {};
    [...document.querySelectorAll("#fatiamento-pesos [data-peso]")].forEach((input) => {
      pesos[input.dataset.peso] = Math.max(0, parseNumero(input.value, 1));
    });
    parametros.pesos = pesos;

    return parametros;
  }

  async function salvarAjustesFatiamento() {
    const base = fatiamentos.find((item) => item.id === $("#fatiamento-fase1").value);
    if (!base) {
      throw new Error("Selecione a configuração de fatiamento base.");
    }

    const codigo = `fase1-ajuste-${Date.now().toString().slice(-9)}-${codigoCurto(base.codigo)}`;
    const payload = {
      codigo,
      nome: `${base.nome} (ajustada)`,
      descricao: "Configuração salva pela execução da Fase 1.",
      parametros: parametrosAjustados(),
    };

    const salvo = await HierApi.salvarFatiamentoFase1(payload);

    fatiamentos = await HierApi.listarFatiamentosFase1();
    const select = $("#fatiamento-fase1");
    select.innerHTML = fatiamentos
      .map(
        (item) =>
          `<option value="${esc(item.id)}">${esc(item.nome)}${item.padrao ? " (padrão)" : ""}</option>`
      )
      .join("");

    select.value = salvo.id;
    renderFatiamento();
    return salvo;
  }

  function badgeStatus(status) {
    const normalizado = String(status || "").toLowerCase();
    if (normalizado === "restrito") {
      return {
        label: "Restrito",
        css: "fase1-report-badge fase1-report-badge--restrito",
      };
    }
    if (normalizado === "apto_com_ressalva") {
      return {
        label: "Apto com ressalva",
        css: "fase1-report-badge fase1-report-badge--ressalva",
      };
    }
    if (normalizado === "apto") {
      return { label: "Apto", css: "fase1-report-badge fase1-report-badge--apto" };
    }
    return { label: "Não avaliado", css: "fase1-report-badge" };
  }

  function numero(v, padrao = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : padrao;
  }

  function montarModeloRelatorio(hierarquizacao) {
    const relatorio = hierarquizacao?.relatorio_fase1 || {};
    const dados = hierarquizacao?.dados_hierarquizacao || {};
    const listaObjetos = dados.objetos || [];
    const resumo = relatorio.resumo || {};
    const linhas = listaObjetos.map((item) => {
      const cab = item.cabecalho_objeto || {};
      const f1 = (item.hierarquizacao || {}).fase_1 || {};
      const restricao = f1.restricao || {};
      const risco = f1.risco || {};
      return {
        codigo: cab.codigo || cab.demanda_id || "—",
        nome: cab.nome || "Sem denominação",
        status: f1.status_fase1 || "nao_avaliado",
        restricaoResultado: restricao.resultado || "—",
        riscoResultado: risco.resultado || "—",
        hitRestricao: (restricao.intersecoes || []).length,
        hitRisco: (risco.intersecoes || []).length,
      };
    });
    return {
      codigo: hierarquizacao?.codigo || "",
      nome: hierarquizacao?.nome || "",
      concluidoEm: relatorio.concluido_em,
      resumo: {
        objetos: numero(resumo.objetos, linhas.length),
        restritos: numero(
          resumo.restritos,
          linhas.filter((l) => l.status === "restrito").length
        ),
        comRisco: numero(
          resumo.com_risco,
          linhas.filter((l) => l.status === "apto_com_ressalva").length
        ),
        semOcorrencia: numero(
          resumo.sem_ocorrencia,
          linhas.filter((l) => l.status === "apto").length
        ),
      },
      camadas: relatorio.camadas || {},
      fatiamento: relatorio.fatiamento || {},
      linhas,
    };
  }

  function exportarRelatorioPdf(modelo) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return erro("Biblioteca jsPDF não carregada para exportação PDF.");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    if (typeof doc.autoTable !== "function") {
      return erro("Plugin autoTable não carregado para exportação PDF.");
    }

    doc.setFillColor(15, 81, 50);
    doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Relatório da Fase 1 — Elegibilidade Territorial", 14, 15);

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.text(`Rodada: ${modelo.codigo} — ${modelo.nome}`, 14, 32);
    doc.text(`Conclusão: ${modelo.concluidoEm || "—"}`, 14, 38);
    doc.text(
      `Objetos: ${modelo.resumo.objetos} | Restritos: ${modelo.resumo.restritos} | Ressalva: ${modelo.resumo.comRisco} | Aptos: ${modelo.resumo.semOcorrencia}`,
      14,
      44
    );

    doc.autoTable({
      startY: 50,
      head: [["Código", "Nome", "Status", "Restrição", "Risco", "Hits restrição", "Hits risco"]],
      body: modelo.linhas.map((linha) => [
        linha.codigo,
        linha.nome,
        badgeStatus(linha.status).label,
        linha.restricaoResultado,
        linha.riscoResultado,
        String(linha.hitRestricao),
        String(linha.hitRisco),
      ]),
      headStyles: { fillColor: [15, 81, 50], textColor: 255 },
      styles: { fontSize: 8, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 55 },
        2: { cellWidth: 24 },
        3: { cellWidth: 27 },
        4: { cellWidth: 25 },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 18, halign: "center" },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`fase1-relatorio-${modelo.codigo || "rodada"}.pdf`);
  }

  function renderRelatorio(hierarquizacao) {
    const modelo = montarModeloRelatorio(hierarquizacao);
    relatorioAtual = modelo;
    const box = $("#fase1-relatorio");
    const botaoDownload = $("#baixar-relatorio-fase1");

    if (!modelo || !modelo.concluidoEm) {
      box.classList.add("hidden");
      botaoDownload.classList.add("hidden");
      return;
    }

    const classes =
      ((modelo.fatiamento || {}).parametros || {}).risco?.classes || [];
    const classesTxt = classes.length
      ? classes
          .map(
            (classe) =>
              `${classe.rotulo || classe.codigo}: ${classe.minimo ?? "-inf"} a ${classe.maximo ?? "+inf"}`
          )
          .join("; ")
      : "Não informado";
    const linhas = modelo.linhas
      .map((linha) => {
        const badge = badgeStatus(linha.status);
        return `<tr><td><strong>${esc(linha.codigo)}</strong></td><td>${esc(linha.nome)}</td><td><span class="${badge.css}">${esc(badge.label)}</span></td><td>${esc(linha.restricaoResultado)}</td><td>${esc(linha.riscoResultado)}</td><td>${esc(linha.hitRestricao)}</td><td>${esc(linha.hitRisco)}</td></tr>`;
      })
      .join("");

    box.innerHTML = `
      <div class="fase1-report-header">
        <div>
          <h3>Relatório da Fase 1</h3>
          <p>Rodada ${esc(modelo.codigo)} · ${esc(modelo.nome)}</p>
        </div>
        <div><small>Concluído em ${esc(modelo.concluidoEm || "—")}</small></div>
      </div>
      <div class="fase1-report-grid">
        <div class="fase1-report-kpi"><small>Objetos avaliados</small><strong>${esc(modelo.resumo.objetos)}</strong></div>
        <div class="fase1-report-kpi"><small>Restritos</small><strong>${esc(modelo.resumo.restritos)}</strong></div>
        <div class="fase1-report-kpi"><small>Aptos com ressalva</small><strong>${esc(modelo.resumo.comRisco)}</strong></div>
        <div class="fase1-report-kpi"><small>Aptos sem ocorrência</small><strong>${esc(modelo.resumo.semOcorrencia)}</strong></div>
      </div>
      <div class="fase1-report-cards">
        <article class="fase1-report-card"><h4>Camadas homologadas</h4><ul><li>Restrição: ${esc((modelo.camadas.restricao || {}).nome || "—")}</li><li>Risco: ${esc((modelo.camadas.risco || {}).nome || "—")}</li></ul></article>
        <article class="fase1-report-card"><h4>Regra aplicada</h4><ul><li>Limiar de restrição: ${esc(((modelo.fatiamento.parametros || {}).restricao || {}).limiar ?? "—")}</li><li>Classes de risco: ${esc(classesTxt)}</li></ul></article>
      </div>
      <table class="fase1-report-table">
        <thead><tr><th>Código</th><th>Nome</th><th>Status Fase 1</th><th>Restrição</th><th>Risco</th><th>Interseções restrição</th><th>Interseções risco</th></tr></thead>
        <tbody>${linhas || "<tr><td colspan='7'>Sem objetos avaliados.</td></tr>"}</tbody>
      </table>
    `;
    box.classList.remove("hidden");

    botaoDownload.classList.remove("hidden");
    botaoDownload.onclick = () => {
      exportarRelatorioPdf(modelo);
    };
  }

  async function executar() {
    const hierarquizacao = atual();
    const pacote = parAtual();
    const camadaRestricao = $("#camada-restricao").value;
    const camadaRisco = $("#camada-risco").value;

    if (!hierarquizacao || !pacote || !camadaRestricao || !camadaRisco) {
      return erro(
        "Selecione a hierarquização, as duas camadas e os ajustes da configuração."
      );
    }

    try {
      limparErro();
      $("#executar-fase1").disabled = true;

      const configuracao = await salvarAjustesFatiamento();

      const atualizado = await HierApi.executarFase1(hierarquizacao.codigo, {
        par_id: pacote.pacote_id,
        camada_restricao_id: camadaRestricao,
        camada_risco_id: camadaRisco,
        configuracao_fatiamento_id: configuracao.id,
      });

      hierarquizacoes = hierarquizacoes.map((item) =>
        item.codigo === atualizado.codigo ? atualizado : item
      );

      renderRelatorio(atualizado);
      renderHierarquizacao();
    } catch (e) {
      erro(e);
    } finally {
      $("#executar-fase1").disabled = false;
    }
  }

  async function init() {
    try {
      [hierarquizacoes, pares, fatiamentos] = await Promise.all([
        HierApi.listar(),
        HierApi.listarPacotes("fase1"),
        HierApi.listarFatiamentosFase1(),
      ]);

      const selectHier = $("#fase-hierarquizacao");
      selectHier.innerHTML =
        '<option value="">Selecione…</option>' +
        hierarquizacoes
          .map(
            (item) =>
              `<option value="${esc(item.codigo)}">${esc(item.codigo)} — ${esc(item.nome)}</option>`
          )
          .join("");
      if (queryCode) {
        selectHier.value = queryCode;
      }

      preencherRestricoes();

      const selectFatiamento = $("#fatiamento-fase1");
      selectFatiamento.innerHTML = fatiamentos
        .map(
          (item) =>
            `<option value="${esc(item.id)}" ${item.padrao ? "selected" : ""}>${esc(item.nome)}${item.padrao ? " (padrão)" : ""}</option>`
        )
        .join("");

      renderHierarquizacao();
      renderFatiamento();

      selectHier.onchange = renderHierarquizacao;
      $("#camada-restricao").onchange = associarRiscos;
      $("#camada-risco").onchange = renderCamadas;
      selectFatiamento.onchange = renderFatiamento;
      $("#salvar-ajustes-fatiamento").onclick = async () => {
        try {
          limparErro();
          const salvo = await salvarAjustesFatiamento();
          const resumo = $("#fatiamento-resumo");
          resumo.classList.remove("hidden");
          resumo.insertAdjacentHTML(
            "beforeend",
            `<p><strong>Configuração salva:</strong> ${esc(salvo.nome)} (${esc(salvo.codigo)})</p>`
          );
        } catch (e) {
          erro(e);
        }
      };
      $("#executar-fase1").onclick = executar;

      associarRiscos();
    } catch (e) {
      erro(e);
    }
  }

  init();
})();