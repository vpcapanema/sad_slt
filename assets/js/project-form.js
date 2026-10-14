(function (global) {
  const {escapeHtml, formatCnpj, instituicaoLabel, fillSelect, PLANO_PLI, PLANO_PEF} = SLTAdminLabels;
  const $ = selector => document.querySelector(selector);
  function buildClassificacaoFields(planoId) {
    if (planoId === PLANO_PLI) {
      return `
        <div class="form-field">
          <label for="fld-frente">Frente PLI</label>
          <select id="fld-frente"></select>
        </div>`;
    }
    if (planoId === PLANO_PEF) {
      return `
        <div class="form-field">
          <label for="fld-eixo">Eixo Ferroviário</label>
          <select id="fld-eixo"></select>
        </div>
        <div class="form-field span-2" id="wrap-tic">
          <label for="fld-tic">Corredor TIC</label>
          <select id="fld-tic"></select>
        </div>`;
    }
    return `
      <div class="form-field">
        <span class="field-help">Classificação disponível para planos PLI ou PEF.</span>
      </div>`;
  }

  function populateClassificacaoSelects(d) {
    const planoId = $("#fld-plano")?.value || d.plano_id;
    if (planoId === PLANO_PLI) {
      const sel = $("#fld-frente");
      if (!sel) return;
      fillSelect(
        sel,
        SLTCatalog.frentesPorPlano(planoId),
        "id",
        (f) => f.nome_oficial,
      );
      sel.value = d.classificacao?.frente_id || "";
    } else if (planoId === PLANO_PEF) {
      const selEixo = $("#fld-eixo");
      if (!selEixo) return;
      fillSelect(
        selEixo,
        SLTCatalog.eixosPorPlano(planoId),
        "id",
        (e) => e.nome_oficial,
      );
      selEixo.value = d.classificacao?.eixo_id || "";
      refreshTicSelect(d);
    }
  }

  function refreshTicSelect(d) {
    const eixoId = $("#fld-eixo")?.value;
    const wrap = $("#wrap-tic");
    const sel = $("#fld-tic");
    if (!wrap || !sel) return;
    const tics = SLTCatalog.ticsPorEixo(eixoId);
    wrap.style.display = tics.length ? "" : "none";
    fillSelect(sel, tics, "id", (t) => t.nome_oficial, "— Não especificado —");
    sel.value = d?.classificacao?.corredor_tic_id || "";
  }

  function refreshClassificacaoFields(d) {
    const container = $("#classificacao-fields");
    if (!container) return;
    const planoId = $("#fld-plano")?.value || d.plano_id;
    container.innerHTML = buildClassificacaoFields(planoId);
    populateClassificacaoSelects(d);
    $("#fld-eixo")?.addEventListener("change", () =>
      refreshTicSelect({ classificacao: {} }),
    );
  }

  function html(d) {
    const {infoSubcard} = SLTAdminAnalysisInfo;
    const rep = d.representante || {};
    const institucional = infoSubcard(
      "Institucional e Projeto",
      `
      <div class="admin-form-grid">
        <div class="form-field">
          <label for="fld-instituicao">Instituição interessada</label>
          <input type="text" id="fld-instituicao" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(instituicaoLabel(d))}" readonly aria-readonly="true">
        </div>
        <div class="form-field">
          <label for="fld-cnpj">CNPJ</label>
          <input type="text" id="fld-cnpj" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(formatCnpj(d.instituicao_cnpj))}" readonly aria-readonly="true">
        </div>
        <div class="form-field span-2">
          <label for="fld-diretoria">Diretoria</label>
          <select id="fld-diretoria"></select>
        </div>
        <div class="form-field">
          <label for="fld-plano">Plano</label>
          <select id="fld-plano"></select>
        </div>
        <div id="classificacao-fields" class="admin-form-grid" style="display: contents;">
          ${buildClassificacaoFields(d.plano_id)}
        </div>
        <div class="admin-form-grid admin-form-grid--3 span-2">
          <div class="form-field">
            <label for="fld-modal">Modal</label>
            <select id="fld-modal"></select>
          </div>
          <div class="form-field">
            <label for="fld-tipologia">Tipologia</label>
            <select id="fld-tipologia"></select>
          </div>
          <div class="form-field">
            <label for="fld-carteira">Carteira</label>
            <select id="fld-carteira"></select>
          </div>
        </div>
        <div class="form-field">
          <label for="fld-lat">Latitude</label>
          <input type="number" step="any" id="fld-lat" value="${d.lat ?? ""}">
        </div>
        <div class="form-field">
          <label for="fld-lng">Longitude</label>
          <input type="number" step="any" id="fld-lng" value="${d.lng ?? ""}">
        </div>
      </div>`,
    );

    const representante = infoSubcard(
      "Representante Legal",
      `
      <div class="admin-form-grid">
        <div class="form-field span-2">
          <label for="fld-rep-nome">Nome Completo</label>
          <input type="text" id="fld-rep-nome" value="${escapeHtml(rep.nome || "")}">
        </div>
        <div class="form-field">
          <label for="fld-rep-email">E-mail</label>
          <input type="email" id="fld-rep-email" value="${escapeHtml(rep.email || "")}">
        </div>
        <div class="form-field">
          <label for="fld-rep-tel">Telefone</label>
          <input type="text" id="fld-rep-tel" value="${escapeHtml(rep.telefone || "")}">
        </div>
      </div>`,
    );

    return SLTAdminAnalysisInfo.projectCadastroHtml(d) + institucional + representante;
  }
  function bind(d) {
    fillSelect(
      $("#fld-diretoria"),
      SLTCatalog.ativos(SLTCatalog.catalog.diretorias),
      "id",
      (x) => x.nome_oficial,
    );
    $("#fld-diretoria").value = d.diretoria_id;

    fillSelect(
      $("#fld-plano"),
      SLTCatalog.planosPorDiretoria($("#fld-diretoria").value),
      "id",
      (p) => `${p.sigla} — ${p.nome_oficial}`,
    );
    $("#fld-plano").value = d.plano_id;

    fillSelect(
      $("#fld-modal"),
      SLTCatalog.ativos(SLTCatalog.catalog.modais),
      "id",
      (m) => m.nome,
    );
    fillSelect(
      $("#fld-tipologia"),
      SLTCatalog.ativos(SLTCatalog.catalog.tipologias),
      "id",
      (t) => t.nome,
    );
    fillSelect(
      $("#fld-carteira"),
      SLTCatalog.carteirasPorPlano($("#fld-plano").value),
      "id",
      (c) => c.nome,
    );

    $("#fld-modal").value = d.complementos?.modal_id || "";
    $("#fld-tipologia").value = d.complementos?.tipologia_id || "";
    $("#fld-carteira").value = d.complementos?.carteira_id || "";

    populateClassificacaoSelects(d);

    $("#fld-diretoria").addEventListener("change", () => {
      fillSelect(
        $("#fld-plano"),
        SLTCatalog.planosPorDiretoria($("#fld-diretoria").value),
        "id",
        (p) => `${p.sigla} — ${p.nome_oficial}`,
      );
      fillSelect(
        $("#fld-carteira"),
        SLTCatalog.carteirasPorPlano($("#fld-plano").value),
        "id",
        (c) => c.nome,
      );
    });

    $("#fld-plano").addEventListener("change", () => {
      refreshClassificacaoFields({
        ...d,
        classificacao: {},
        plano_id: $("#fld-plano").value,
      });
      fillSelect(
        $("#fld-carteira"),
        SLTCatalog.carteirasPorPlano($("#fld-plano").value),
        "id",
        (c) => c.nome,
      );
    });

    $("#fld-eixo")?.addEventListener("change", () =>
      refreshTicSelect({ classificacao: {} }),
    );

  }
  function collect() {
    const planoId = $("#fld-plano").value;
    let classificacao = null;
    if (planoId === PLANO_PLI && $("#fld-frente")?.value) {
      classificacao = { tipo: "frente_pli", frente_id: $("#fld-frente").value };
    } else if (planoId === PLANO_PEF && $("#fld-eixo")?.value) {
      classificacao = {
        tipo: "eixo_pef",
        eixo_id: $("#fld-eixo").value,
        corredor_tic_id: $("#fld-tic")?.value || null,
      };
    }
    const complementos = {};
    if ($("#fld-modal").value) complementos.modal_id = $("#fld-modal").value;
    if ($("#fld-tipologia").value)
      complementos.tipologia_id = $("#fld-tipologia").value;
    if ($("#fld-carteira").value)
      complementos.carteira_id = $("#fld-carteira").value;

    return {
      nome: $("#fld-nome").value.trim(),
      descricao: $("#fld-descricao").value.trim() || null,
      diretoria_id: $("#fld-diretoria").value,
      plano_id: planoId,
      classificacao,
      complementos: Object.keys(complementos).length ? complementos : null,
      lat: parseFloat($("#fld-lat").value),
      lng: parseFloat($("#fld-lng").value),
      representante: {
        nome: $("#fld-rep-nome").value.trim(),
        email: $("#fld-rep-email").value.trim() || null,
        telefone: $("#fld-rep-tel").value.trim() || null,
      },
    };
  }
  global.SLTProjectForm = {html, bind, collect};
})(window);
