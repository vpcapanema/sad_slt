(function () {
  const {
    escapeHtml,
    formatDate,
    formatCnpj,
    statusBadgeHtml,
    instituicaoLabel,
    planoLabel,
    classificacaoLabel,
    representanteLabel,
    fillSelect,
    diretoriaLabel,
    labelById,
    PLANO_PLI,
    PLANO_PEF,
  } = SLTAdminLabels;

  const STATUS_PRE_APROVACAO = new Set([
    "analise_em_avaliacao",
  ]);

  const TIPOS = [
    { id: "plano", label: "Plano" },
    { id: "programa", label: "Programa" },
    { id: "projeto", label: "Projetos" },
  ];

  const SECTIONS = {
    projeto: [
      { id: "sec-info", label: "Informações do Projeto" },
      { id: "sec-analise", label: "Análise" },
      { id: "sec-acoes", label: "Ações" },
    ],
    plano: [
      { id: "sec-info", label: "Informações do Plano" },
      { id: "sec-acoes", label: "Ações" },
    ],
    programa: [
      { id: "sec-info", label: "Informações do Programa" },
      { id: "sec-acoes", label: "Ações" },
    ],
  };

  /** Desfecho da análise -> rótulo do botão e confirmação. */
  const DECISOES = [
    {
      id: "aprovada",
      label: "Aprovar demanda",
      btnClass: "btn-primary",
      statusLabel: "Aprovada na análise",
      danger: false,
    },
    {
      id: "ressalvas",
      label: "Aprovar com ressalvas",
      btnClass: "btn-secondary",
      statusLabel: "Aprovada com ressalvas",
      danger: false,
      requerComplemento: true,
    },
    {
      id: "reprovada",
      label: "Reprovar demanda",
      btnClass: "btn-danger",
      statusLabel: "Reprovada na análise",
      danger: true,
    },
  ];

  let tipo = "projeto";
  let record = null;
  let selectedId = null;
  let layerFilterApi = null;
  let complementoSalvo = "";
  const lists = { projeto: [], programa: [], plano: [] };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function formatCentsBR(cents) {
    const padded = String(cents).padStart(3, "0");
    const inteiro = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${inteiro},${padded.slice(-2)}`;
  }

  /** Número (reais) -> string mascarada "1.234,56" para o input. */
  function currencyInputValue(value) {
    if (value == null || value === "") return "";
    const cents = Math.round(Number(value) * 100);
    return Number.isFinite(cents) ? formatCentsBR(cents) : "";
  }

  /** String mascarada -> número em reais (ou null). */
  function parseCurrencyBR(text) {
    const digits = String(text ?? "").replace(/\D/g, "");
    return digits ? Number(digits) / 100 : null;
  }

  /** Máscara de moeda (BRL): dígitos digitados são interpretados como centavos. */
  function attachCurrencyMask(input) {
    if (!input || input.dataset.currencyMask) return;
    input.dataset.currencyMask = "1";
    const apply = () => {
      const digits = input.value.replace(/\D/g, "");
      input.value = digits ? formatCentsBR(Number(digits)) : "";
    };
    input.addEventListener("input", apply);
    apply();
  }

  function paramsFromUrl() {
    const sp = new URLSearchParams(location.search);
    return { tipo: sp.get("tipo"), id: sp.get("id") };
  }

  function canApprove(status) {
    return STATUS_PRE_APROVACAO.has(status);
  }

  function canReject(status) {
    return STATUS_PRE_APROVACAO.has(status);
  }

  function tipoLabelAtual() {
    return TIPOS.find((t) => t.id === tipo)?.label || tipo;
  }

  function demandHeadHtml(d) {
    return `
      <header class="admin-demand-head card">
        <p class="admin-demand-head-kicker">${escapeHtml(tipoLabelAtual())}</p>
        <h1 class="admin-demand-head-title">${escapeHtml(d.nome || d.id)}</h1>
        <p class="admin-demand-head-meta">
          <code>${escapeHtml(d.id)}</code>
          ${statusBadgeHtml(d.status, tipo)}
        </p>
      </header>`;
  }

  function actionsHtml(d, { withApprove, withReject }) {
    const canAnalyze = SLTAdminAuth.can("analyze");
    const decisionFields = canAnalyze && (withApprove || withReject)
      ? `
      <div class="form-field span-2">
        <label for="fld-motivo-aprov">Motivo da aprovação <span class="field-help">(opcional)</span></label>
        <textarea id="fld-motivo-aprov" class="admin-field-motivo" rows="3" maxlength="2000" placeholder="Motivo opcional para aprovação"></textarea>
      </div>
      <div class="form-field span-2">
        <label for="fld-justificativa-reprov">Justificativa da reprovação</label>
        <textarea id="fld-justificativa-reprov" class="admin-field-motivo" rows="3" maxlength="2000" required aria-required="true" placeholder="Informe por que a demanda deve ser reprovada"></textarea>
      </div>`
      : "";
    const rejectionRecord = d.motivo_reprovacao
      ? `
      <div class="form-field span-2">
        <label for="fld-motivo-reprov-registrado">Justificativa da reprovação registrada</label>
        <textarea id="fld-motivo-reprov-registrado" class="admin-field-readonly" rows="3" readonly aria-readonly="true">${escapeHtml(d.motivo_reprovacao)}</textarea>
        ${d.reprovadoEm ? `<span class="field-help">Decisão registrada em ${escapeHtml(formatDate(d.reprovadoEm))}.</span>` : ""}
      </div>`
      : "";
    return `
      ${decisionFields}
      ${rejectionRecord}
      <div class="admin-dashboard-actions span-2">
        <a href="/restrict/demandas/" class="btn btn-secondary">Voltar à lista</a>
        ${withReject && canAnalyze ? '<button type="button" class="btn btn-danger" id="btn-reprovar">Reprovar demanda</button>' : ""}
        ${withApprove && canAnalyze ? '<button type="button" class="btn btn-primary" id="btn-aprovar">Aprovar demanda</button>' : ""}
        ${SLTAdminAuth.can("operate") ? '<button type="button" class="btn btn-primary" id="btn-salvar">Salvar alterações</button>' : ""}
      </div>`;
  }

  // ===========================================================================
  // PROJETO (detalhe completo — mantém o comportamento atual)
  // ===========================================================================
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

  function catalogLabel(list, id) {
    return labelById(list, id, "nome");
  }

  function analysisMapColumnHtml(d) {
    const coords = SLTAdminAnalysisMap.coordsFromRecord(d);
    const coordText = coords
      ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
      : "—";
    return `
      <div class="admin-info-map">
        <div id="admin-preview-map-wrap"></div>
        <p class="admin-info-coords">${escapeHtml(coordText)}</p>
      </div>`;
  }

  function mountAnalysisMap(d, demandTipo) {
    const record = { ...d, tipo: demandTipo };
    const render = (payload) => {
      SLTAdminAnalysisMap.initPreviewMap("admin-preview-map-wrap", payload);
    };

    if (record.geometria?.tipo && record.geometria.coordinates) {
      render(record);
      return;
    }

    SLTAdminApi.listPainelDemandas()
      .then((items) => {
        const hit = (items || []).find(
          (item) => item.tipo === demandTipo && item.id === d.id,
        );
        if (!hit) {
          render(record);
          return;
        }
        render({
          ...record,
          geometria: hit.geometria || record.geometria,
          lat: record.lat ?? hit.lat,
          lng: record.lng ?? hit.lng,
          status: record.status || hit.status,
        });
      })
      .catch(() => render(record));
  }

  function projectInfoHtml(d) {
    const { infoSubcard } = SLTAdminAnalysisInfo;
    const rep = d.representante || {};

    const cadastro = infoSubcard(
      "Cadastro",
      `
      <div class="admin-form-grid">
        <div class="form-field">
          <label for="fld-nome">Nome do Projeto</label>
          <input type="text" id="fld-nome" maxlength="200" value="${escapeHtml(d.nome)}">
        </div>
        <div class="form-field">
          <label for="fld-codigo">Código</label>
          <input type="text" id="fld-codigo" class="admin-field-readonly" value="${escapeHtml(d.id)}" readonly aria-readonly="true">
        </div>
        <div class="form-field span-2">
          <label for="fld-descricao">Descrição</label>
          <textarea id="fld-descricao" rows="3">${escapeHtml(d.descricao || "")}</textarea>
        </div>
        <div class="form-field">
          <label for="fld-data-cadastro">Data de Cadastro</label>
          <input type="text" id="fld-data-cadastro" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(formatDate(d.criadoEm))}" readonly aria-readonly="true">
        </div>
        <div class="form-field">
          <span class="admin-info-label">Status</span>
          <div class="admin-info-value">${statusBadgeHtml(d.status, tipo)}</div>
        </div>
      </div>`,
    );

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

    return `
      <section id="sec-info" class="card admin-dashboard-section">
        <h2>Informações do Projeto</h2>
        <div class="admin-dashboard-columns">
          <div class="admin-dashboard-col">
            <div class="admin-info-fields">
              ${cadastro}
              ${institucional}
              ${representante}
              ${
                SLTAdminAuth.can("operate")
                  ? `<div class="admin-dashboard-actions" id="info-edit-actions">
                <button type="button" class="btn btn-secondary" id="btn-editar">Editar</button>
                <button type="button" class="btn btn-primary" id="btn-salvar" hidden>Salvar alterações</button>
                <button type="button" class="btn btn-secondary" id="btn-cancelar-edicao" hidden>Cancelar</button>
              </div>`
                  : ""
              }
            </div>
          </div>
          <div class="admin-dashboard-col">
            ${analysisMapColumnHtml(d)}
          </div>
        </div>
      </section>`;
  }

  // ===========================================================================
  // Análise — critérios, parecer e decisão
  // ===========================================================================
  function criteriosSectionHtml() {
    return `
      <section id="sec-criterios" class="admin-analise-subcard admin-dashboard-section">
        <h3>Critérios de análise</h3>
        <div class="admin-form-grid" id="criterios-grid">
          <div class="form-field span-2">
            <span class="field-help">Carregando critérios…</span>
          </div>
        </div>
      </section>`;
  }

  function parecerSectionHtml() {
    const canAnalyze = SLTAdminAuth.can("analyze");
    return `
      <section id="sec-parecer" class="admin-analise-subcard admin-dashboard-section">
        <h3>Parecer técnico</h3>
        <div class="admin-form-grid">
          <div class="form-field span-2">
            <label>Resultado da análise</label>
            <p class="analise-resultado" id="analise-resultado">
              <span class="analise-resultado-badge is-pendente">Pendente</span>
              <span class="analise-resultado-placar">Responda os cinco critérios para apurar o resultado.</span>
            </p>
          </div>
          <div class="form-field span-2">
            <label for="fld-parecer">Parecer técnico <span class="field-help">(gerado automaticamente)</span></label>
            <textarea id="fld-parecer" class="admin-field-readonly analise-parecer" rows="14" readonly aria-readonly="true"></textarea>
          </div>
          <div class="form-field span-2" id="wrap-complemento" hidden>
            <label for="fld-parecer-complemento">Complementação do parecer</label>
            <textarea id="fld-parecer-complemento" rows="4" maxlength="5000" placeholder="Texto adicional do avaliador — não substitui o parecer gerado."></textarea>
          </div>
          ${
            canAnalyze
              ? `<div class="admin-dashboard-actions span-2">
            <button type="button" class="btn btn-secondary" id="btn-complementar">Complementar parecer</button>
            <button type="button" class="btn btn-primary" id="btn-salvar-complemento" hidden>Salvar</button>
            <button type="button" class="btn btn-secondary" id="btn-cancelar-complemento" hidden>Cancelar</button>
          </div>`
              : ""
          }
        </div>
      </section>`;
  }

  function analiseActionsHtml(d, { withDecisions }) {
    const canAnalyze = SLTAdminAuth.can("analyze");
    const decisionButtons =
      withDecisions && canAnalyze
        ? DECISOES.map(
            (dec) =>
              `<button type="button" class="btn ${dec.btnClass}" data-decisao="${dec.id}">${escapeHtml(dec.label)}</button>`,
          ).join("\n          ")
        : "";
    const rejectionRecord = d.motivo_reprovacao
      ? `
      <div class="form-field span-2">
        <label for="fld-motivo-reprov-registrado">Justificativa da reprovação registrada</label>
        <textarea id="fld-motivo-reprov-registrado" class="admin-field-readonly" rows="3" readonly aria-readonly="true">${escapeHtml(d.motivo_reprovacao)}</textarea>
        ${d.reprovadoEm ? `<span class="field-help">Decisão registrada em ${escapeHtml(formatDate(d.reprovadoEm))}.</span>` : ""}
      </div>`
      : "";
    return `
      ${rejectionRecord}
      <div class="form-field span-2" id="analise-parecer-baixar" hidden>
        <span class="field-help">Um parecer em PDF já foi gerado para esta demanda.</span>
        <div class="admin-dashboard-actions">
          <button type="button" class="btn btn-secondary" id="btn-baixar-parecer">Baixar parecer (PDF)</button>
        </div>
      </div>
      <div class="admin-dashboard-actions span-2">
        <a href="/restrict/demandas/" class="btn btn-secondary">Voltar à lista</a>
        ${decisionButtons}
      </div>`;
  }

  function criterioRowHtml(criterio, editavel) {
    const nome = `crit-${criterio.campo}`;
    const marcado = (valor) => (criterio.resposta === valor ? " checked" : "");
    const desabilitado = editavel ? "" : " disabled";
    return `
      <div class="form-field span-2 analise-criterio" data-campo="${escapeHtml(criterio.campo)}">
        <label>${escapeHtml(criterio.rotulo)}</label>
        <span class="field-help">${escapeHtml(criterio.pergunta)}</span>
        <div class="analise-criterio-opcoes" role="radiogroup" aria-label="${escapeHtml(criterio.rotulo)}">
          <label class="analise-opcao analise-opcao--sim">
            <input type="radio" name="${nome}" value="sim"${marcado(true)}${desabilitado}>
            <span>Sim</span>
          </label>
          <label class="analise-opcao analise-opcao--nao">
            <input type="radio" name="${nome}" value="nao"${marcado(false)}${desabilitado}>
            <span>Não</span>
          </label>
        </div>
      </div>`;
  }

  function collectCriterios() {
    const respostas = {};
    document.querySelectorAll(".analise-criterio").forEach((row) => {
      const campo = row.dataset.campo;
      const marcado = row.querySelector("input[type=radio]:checked");
      respostas[campo] = marcado ? marcado.value === "sim" : null;
    });
    return respostas;
  }

  /** Média simples de 5 critérios: nunca empata (3+ Sim aprova, 3+ Não reprova). */
  function computeResultado(respostas) {
    const valores = Object.values(respostas);
    const sim = valores.filter((v) => v === true).length;
    const nao = valores.filter((v) => v === false).length;
    const total = valores.length;
    const completo = total > 0 && sim + nao === total;
    return {
      sim,
      nao,
      total,
      completo,
      resultado: completo ? (sim >= Math.ceil(total / 2) ? "aprovado" : "reprovado") : null,
    };
  }

  function renderResultado(placar) {
    const alvo = $("#analise-resultado");
    if (!alvo) return;
    const rotulo = { aprovado: "Aprovado", reprovado: "Reprovado" };
    const classe = placar.resultado ? `is-${placar.resultado}` : "is-pendente";
    const texto = placar.resultado ? rotulo[placar.resultado] : "Pendente";
    const detalhe = placar.completo
      ? `${placar.sim} de ${placar.total} critérios atendidos.`
      : `${placar.sim + placar.nao} de ${placar.total} critérios respondidos — responda todos para apurar o resultado.`;
    alvo.innerHTML = `
      <span class="analise-resultado-badge ${classe}">${escapeHtml(texto)}</span>
      <span class="analise-resultado-placar">${escapeHtml(detalhe)}</span>`;
  }

  function renderAnalise(data) {
    const editavel = SLTAdminAuth.can("analyze") && canApprove(record?.status);
    const grid = $("#criterios-grid");
    if (grid) {
      grid.innerHTML = (data.criterios || [])
        .map((c) => criterioRowHtml(c, editavel))
        .join("");
      if (!editavel) {
        grid.insertAdjacentHTML(
          "beforeend",
          '<div class="form-field span-2"><span class="field-help">Os critérios não são mais editáveis: a demanda já saiu da avaliação.</span></div>',
        );
      }
      grid.querySelectorAll("input[type=radio]").forEach((input) => {
        input.addEventListener("change", () => onCriterioChange());
      });
    }

    renderResultado({
      sim: data.sim || 0,
      nao: data.nao || 0,
      total: data.total_criterios || (data.criterios || []).length,
      completo: !!data.completo,
      resultado: data.resultado || null,
    });

    const parecer = $("#fld-parecer");
    if (parecer) {
      parecer.value =
        data.parecer_texto ||
        "O parecer é gerado automaticamente assim que os critérios de análise forem respondidos.";
    }
    complementoSalvo = data.parecer_complemento || "";
    const complemento = $("#fld-parecer-complemento");
    if (complemento && complementoSalvo && !complemento.value) {
      complemento.value = complementoSalvo;
      $("#wrap-complemento")?.removeAttribute("hidden");
    }

    const baixar = $("#analise-parecer-baixar");
    if (baixar) {
      if (data.tem_parecer_pdf) baixar.removeAttribute("hidden");
      else baixar.setAttribute("hidden", "");
    }
  }

  async function onCriterioChange() {
    const respostas = collectCriterios();
    renderResultado(computeResultado(respostas));
    try {
      const atualizada = await SLTAdminApi.saveAnaliseCriterios(record.id, respostas);
      const parecer = $("#fld-parecer");
      if (parecer && atualizada.parecer_texto) parecer.value = atualizada.parecer_texto;
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  function abrirComplemento() {
    $("#wrap-complemento")?.removeAttribute("hidden");
    $("#btn-salvar-complemento")?.removeAttribute("hidden");
    $("#btn-cancelar-complemento")?.removeAttribute("hidden");
  }

  /** Volta ao estado anterior ao clique em «Complementar parecer». */
  function fecharComplemento() {
    $("#btn-salvar-complemento")?.setAttribute("hidden", "");
    $("#btn-cancelar-complemento")?.setAttribute("hidden", "");
    const wrap = $("#wrap-complemento");
    if (!wrap) return;
    if (complementoSalvo) wrap.removeAttribute("hidden");
    else wrap.setAttribute("hidden", "");
  }

  async function saveComplemento() {
    const campo = $("#fld-parecer-complemento");
    if (!campo) return;
    const texto = campo.value.trim();
    try {
      await SLTAdminApi.saveAnaliseComplemento(record.id, texto || null);
      complementoSalvo = texto;
      SLTAdminUi.showToast("Complementação do parecer salva.");
      fecharComplemento();
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  async function downloadParecer(codigo) {
    const blob = await SLTAdminApi.fetchAnaliseParecerPdf(codigo);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `parecer-analise-${codigo}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function decideRecord(decisaoId) {
    const decisao = DECISOES.find((item) => item.id === decisaoId);
    if (!decisao) return;

    const respostas = collectCriterios();
    const placar = computeResultado(respostas);
    if (!placar.completo) {
      SLTAdminUi.showToast(
        "Responda os cinco critérios de análise antes de registrar a decisão.",
        true,
      );
      $("#sec-criterios")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (decisao.requerComplemento) {
      const campo = $("#fld-parecer-complemento");
      const texto = campo?.value.trim() || "";
      if (!texto) {
        SLTAdminUi.showToast(
          "Para aprovar com ressalvas é obrigatório preencher a complementação do parecer.",
          true,
        );
        abrirComplemento();
        campo?.focus();
        return;
      }
      try {
        await SLTAdminApi.saveAnaliseComplemento(record.id, texto);
      } catch (err) {
        SLTAdminUi.showToast(err.message, true);
        return;
      }
    }

    const ok = await SLTAdminUi.showConfirm({
      title: decisao.label,
      message: `Registrar a decisão «${decisao.label}»? A demanda passará para o status «${decisao.statusLabel}» e o parecer será gerado em PDF.`,
      confirmLabel: decisao.label,
      cancelLabel: "Cancelar",
      danger: decisao.danger,
    });
    if (!ok) return;

    try {
      await SLTAdminApi.decidirAnalise(record.id, decisao.id);
      SLTAdminUi.showToast("Decisão registrada. Baixando o parecer em PDF…");
      try {
        await downloadParecer(record.id);
      } catch (err) {
        SLTAdminUi.showToast(`Decisão registrada, mas o download falhou: ${err.message}`, true);
      }
      await refreshLists();
      renderPage(await API[tipo].get(record.id));
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  function bindAnalise(d) {
    $("#btn-complementar")?.addEventListener("click", () => {
      abrirComplemento();
      $("#fld-parecer-complemento")?.focus();
    });
    $("#btn-salvar-complemento")?.addEventListener("click", () => saveComplemento());
    $("#btn-cancelar-complemento")?.addEventListener("click", () => {
      const campo = $("#fld-parecer-complemento");
      if (campo) campo.value = complementoSalvo;
      fecharComplemento();
    });
    $("#btn-baixar-parecer")?.addEventListener("click", () => {
      downloadParecer(d.id).catch((err) => SLTAdminUi.showToast(err.message, true));
    });
    document.querySelectorAll("[data-decisao]").forEach((btn) => {
      btn.addEventListener("click", () => decideRecord(btn.dataset.decisao));
    });

    SLTAdminApi.getAnalise(d.id)
      .then((data) => renderAnalise(data))
      .catch((err) => {
        const grid = $("#criterios-grid");
        if (grid) {
          grid.innerHTML = `<div class="form-field span-2"><span class="field-help">Não foi possível carregar os critérios: ${escapeHtml(err.message)}</span></div>`;
        }
      });
  }

  function projetoPageHtml(d) {
    return `
      <div class="admin-dashboard-layout">
        ${demandHeadHtml(d)}
        <div class="admin-demand-body">
        ${projectInfoHtml(d)}

        <section id="sec-analise" class="card admin-dashboard-section">
          <h2>Análise</h2>
          <div class="admin-analise-stack">
              ${criteriosSectionHtml()}

              ${parecerSectionHtml()}

              <section id="sec-acoes" class="admin-analise-subcard admin-dashboard-section">
                <h3>Ações</h3>
                <div class="admin-form-grid">
                  ${analiseActionsHtml(d, { withDecisions: canApprove(d.status) })}
                </div>
              </section>
          </div>
        </section>
        </div>
      </div>`;
  }

  function bindProjeto(d) {
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

    mountAnalysisMap(d, "projeto");
    bindAnalise(d);
  }

  function collectProjeto() {
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

  // ===========================================================================
  // PLANO
  // ===========================================================================
  function planoPageHtml(d) {
    return `
      <div class="admin-dashboard-layout">
        ${demandHeadHtml(d)}
        <div class="admin-demand-body">
        <section id="sec-info" class="card admin-dashboard-section">
          <h2>Informações do Plano</h2>
          <div class="admin-dashboard-columns">
            <div class="admin-dashboard-col">
          <div class="admin-form-grid">
            <div class="form-field">
              <label for="fld-codigo">Código</label>
              <input type="text" id="fld-codigo" class="admin-field-readonly" value="${escapeHtml(d.id)}" readonly aria-readonly="true">
            </div>
            <div class="form-field">
              <label for="fld-diretoria">Diretoria</label>
              <select id="fld-diretoria"></select>
            </div>
            <div class="form-field span-2">
              <label for="fld-nome">Nome do Plano</label>
              <input type="text" id="fld-nome" maxlength="200" value="${escapeHtml(d.nome)}">
            </div>
            <div class="form-field span-2">
              <label for="fld-descricao">Descrição</label>
              <textarea id="fld-descricao" rows="3">${escapeHtml(d.descricao || "")}</textarea>
            </div>
            <div class="form-field span-2">
              <label for="fld-objetivo">Objetivo estratégico</label>
              <textarea id="fld-objetivo" rows="2">${escapeHtml(d.objetivo_estrategico || "")}</textarea>
            </div>
            <div class="form-field">
              <label for="fld-responsavel">Instituição interessada</label>
              <input type="text" id="fld-responsavel" value="${escapeHtml(d.responsavel || "")}">
            </div>
            <div class="form-field">
              <label for="fld-valor">Valor global (R$)</label>
              <input type="text" inputmode="numeric" id="fld-valor" class="admin-currency-input" value="${currencyInputValue(d.valor_global)}" placeholder="0,00">
            </div>
            <div class="form-field">
              <label for="fld-vig-ini">Vigência início</label>
              <input type="date" id="fld-vig-ini" value="${escapeHtml((d.vigencia_inicio || "").slice(0, 10))}">
            </div>
            <div class="form-field">
              <label for="fld-vig-fim">Vigência fim</label>
              <input type="date" id="fld-vig-fim" value="${escapeHtml((d.vigencia_fim || "").slice(0, 10))}">
            </div>
            <div class="form-field span-2">
              <span class="field-help">Cadastrado em ${escapeHtml(formatDate(d.criadoEm))}.</span>
            </div>
          </div>
            </div>
            <div class="admin-dashboard-col">
              ${analysisMapColumnHtml(d)}
            </div>
          </div>
        </section>

        <section id="sec-acoes" class="card admin-dashboard-section">
          <h3>Ações</h3>
          <div class="admin-form-grid">
            ${actionsHtml(d, { withApprove: canApprove(d.status), withReject: canReject(d.status) })}
          </div>
        </section>
        </div>
      </div>`;
  }

  function bindPlano(d) {
    fillSelect(
      $("#fld-diretoria"),
      SLTCatalog.ativos(SLTCatalog.catalog.diretorias),
      "id",
      (x) => x.nome_oficial,
    );
    $("#fld-diretoria").value = d.diretoria_id || "";
    mountAnalysisMap(d, "plano");
  }

  function collectPlano() {
    return {
      nome: $("#fld-nome").value.trim(),
      descricao: $("#fld-descricao").value.trim() || null,
      diretoria_id: $("#fld-diretoria").value || null,
      objetivo_estrategico: $("#fld-objetivo").value.trim() || null,
      responsavel: $("#fld-responsavel").value.trim() || null,
      valor_global: parseCurrencyBR($("#fld-valor").value),
      vigencia_inicio: $("#fld-vig-ini").value || null,
      vigencia_fim: $("#fld-vig-fim").value || null,
    };
  }

  // ===========================================================================
  // PROGRAMA
  // ===========================================================================
  function programaPageHtml(d) {
    return `
      <div class="admin-dashboard-layout">
        ${demandHeadHtml(d)}
        <div class="admin-demand-body">
        <section id="sec-info" class="card admin-dashboard-section">
          <h2>Informações do Programa</h2>
          <div class="admin-dashboard-columns">
            <div class="admin-dashboard-col">
          <div class="admin-form-grid">
            <div class="form-field">
              <label for="fld-codigo">Código</label>
              <input type="text" id="fld-codigo" class="admin-field-readonly" value="${escapeHtml(d.id)}" readonly aria-readonly="true">
            </div>
            <div class="form-field">
              <label for="fld-plano">Plano</label>
              <input type="text" id="fld-plano" class="admin-field-readonly admin-field-readonly--plain" value="${escapeHtml(d.plano_nome || d.plano_codigo || "—")}" readonly aria-readonly="true">
            </div>
            <div class="form-field span-2">
              <label for="fld-nome">Nome do Programa</label>
              <input type="text" id="fld-nome" maxlength="200" value="${escapeHtml(d.nome)}">
            </div>
            <div class="form-field span-2">
              <label for="fld-descricao">Descrição</label>
              <textarea id="fld-descricao" rows="3">${escapeHtml(d.descricao || "")}</textarea>
            </div>
            <div class="form-field span-2">
              <label for="fld-objetivo">Objetivo</label>
              <textarea id="fld-objetivo" rows="2">${escapeHtml(d.objetivo || "")}</textarea>
            </div>
            <div class="form-field span-2">
              <label for="fld-publico">Público-alvo</label>
              <textarea id="fld-publico" rows="2">${escapeHtml(d.publico_alvo || "")}</textarea>
            </div>
            <div class="form-field span-2">
              <label for="fld-justificativa">Justificativa</label>
              <textarea id="fld-justificativa" rows="2">${escapeHtml(d.justificativa || "")}</textarea>
            </div>
            <div class="form-field">
              <label for="fld-orgao">Órgão responsável</label>
              <input type="text" id="fld-orgao" value="${escapeHtml(d.orgao_responsavel || "")}">
            </div>
            <div class="form-field">
              <label for="fld-valor">Valor global (R$)</label>
              <input type="text" inputmode="numeric" id="fld-valor" class="admin-currency-input" value="${currencyInputValue(d.valor_global)}" placeholder="0,00">
            </div>
            <div class="form-field span-2">
              <span class="field-help">Cadastrado em ${escapeHtml(formatDate(d.criadoEm))}.</span>
            </div>
          </div>
            </div>
            <div class="admin-dashboard-col">
              ${analysisMapColumnHtml(d)}
            </div>
          </div>
        </section>

        <section id="sec-acoes" class="card admin-dashboard-section">
          <h3>Ações</h3>
          <div class="admin-form-grid">
            ${actionsHtml(d, { withApprove: canApprove(d.status), withReject: canReject(d.status) })}
          </div>
        </section>
        </div>
      </div>`;
  }

  function bindPrograma(d) {
    mountAnalysisMap(d, "programa");
  }

  function collectPrograma() {
    return {
      nome: $("#fld-nome").value.trim(),
      descricao: $("#fld-descricao").value.trim() || null,
      objetivo: $("#fld-objetivo").value.trim() || null,
      publico_alvo: $("#fld-publico").value.trim() || null,
      justificativa: $("#fld-justificativa").value.trim() || null,
      orgao_responsavel: $("#fld-orgao").value.trim() || null,
      valor_global: parseCurrencyBR($("#fld-valor").value),
    };
  }

  // ===========================================================================
  // Dispatch por tipo
  // ===========================================================================
  const API = {
    projeto: {
      get: (id) => SLTAdminApi.getDemanda(id),
      update: (id, p) => SLTAdminApi.updateDemanda(id, p),
      aprovar: (id, p) => SLTAdminApi.aprovarDemanda(id, p),
      reprovar: (id, p) => SLTAdminApi.reprovarDemanda(id, p),
    },
    plano: {
      get: (id) => SLTAdminApi.getPlano(id),
      update: (id, p) => SLTAdminApi.updatePlano(id, p),
      aprovar: (id, p) => SLTAdminApi.aprovarPlano(id, p),
      reprovar: (id, p) => SLTAdminApi.reprovarPlano(id, p),
    },
    programa: {
      get: (id) => SLTAdminApi.getPrograma(id),
      update: (id, p) => SLTAdminApi.updatePrograma(id, p),
      aprovar: (id, p) => SLTAdminApi.aprovarPrograma(id, p),
      reprovar: (id, p) => SLTAdminApi.reprovarPrograma(id, p),
    },
  };

  function pageHtml(d) {
    if (tipo === "plano") return planoPageHtml(d);
    if (tipo === "programa") return programaPageHtml(d);
    return projetoPageHtml(d);
  }

  /** Alterna o card de informações entre visualização e edição. */
  function setInfoEditMode(ligado) {
    const sec = $("#sec-info");
    if (!sec) return;
    sec.querySelectorAll("input, select, textarea").forEach((campo) => {
      if (campo.readOnly || campo.classList.contains("admin-field-readonly")) return;
      campo.disabled = !ligado;
    });
    const alterna = (sel, visivel) => {
      const el = $(sel);
      if (!el) return;
      if (visivel) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    };
    alterna("#btn-editar", !ligado);
    alterna("#btn-salvar", ligado);
    alterna("#btn-cancelar-edicao", ligado);
  }

  function bindEvents(d) {
    if (tipo === "projeto") bindProjeto(d);
    if (tipo === "plano") bindPlano(d);
    if (tipo === "programa") bindPrograma(d);
    attachCurrencyMask($("#fld-valor"));
    if (tipo === "projeto") {
      setInfoEditMode(false);
      $("#btn-editar")?.addEventListener("click", () => setInfoEditMode(true));
      $("#btn-cancelar-edicao")?.addEventListener("click", () => renderPage(record));
    }
    $("#btn-salvar")?.addEventListener("click", () => saveRecord());
    $("#btn-aprovar")?.addEventListener("click", () => approveRecord());
    $("#btn-reprovar")?.addEventListener("click", () => rejectRecord());
    $("#fld-justificativa-reprov")?.addEventListener("input", (event) => {
      event.target.setCustomValidity("");
    });
  }

  function collectPayload() {
    if (tipo === "plano") return collectPlano();
    if (tipo === "programa") return collectPrograma();
    return collectProjeto();
  }

  // ===========================================================================
  // Sidebar (agrupada por tipo) + seleção
  // ===========================================================================
  function filterItem(r) {
    return { ...r, tipo: r.__tipo || tipo };
  }

  function allFilterItems() {
    return TIPOS.flatMap((t) => (lists[t.id] || []).map(filterItem));
  }

  function filteredRecords(tipoId) {
    const activeFilter = layerFilterApi?.getFilter?.();
    return (lists[tipoId] || []).filter((r) =>
      SLTPainelLayerFilter.matches(filterItem(r), activeFilter),
    );
  }

  function initLayerFilter() {
    layerFilterApi = SLTPainelLayerFilter.init({
      container: "#painel-layer-filter",
      getAllItems: allFilterItems,
      statusLabel: (code) =>
        SLTStatusColors.STATUS_OBJETO[code]
          ? SLTStatusColors.getStatusObjeto(code).nome
          : SLTStatusColors.getStatusDemanda(code).nome,
      onFilterChange: renderSidebar,
    });
  }

  function gruposEmAnalise(groups) {
    return groups
      .filter((g) => (g.records || []).some((r) => STATUS_PRE_APROVACAO.has(r.status)))
      .map((g) => g.id);
  }

  function primeiroRegistroEmAnalise(groups) {
    for (const g of groups) {
      const r = (g.records || []).find((rec) => STATUS_PRE_APROVACAO.has(rec.status));
      if (r) return r;
    }
    return null;
  }

  function scrollableAncestor(el) {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const overflowY = getComputedStyle(node).overflowY;
      const rolavel = overflowY === "auto" || overflowY === "scroll";
      if (rolavel && node.scrollHeight > node.clientHeight) return node;
    }
    return null;
  }

  function scrollSidebarParaEmAnalise(registro) {
    if (!registro) return;
    const el = document.querySelector(
      `.layer-group--record[data-record-id="${CSS.escape(String(registro.id))}"]`,
    );
    if (!el) return;
    const scroller = scrollableAncestor(el);
    if (!scroller) return;
    scroller.scrollTop +=
      el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  }

  function renderSidebar() {
    const groups = TIPOS.map((t) => ({
      id: t.id,
      label: t.label,
      records: filteredRecords(t.id),
    }));
    SLTAdminDashboard.renderGroupedRecordsSidebar({
      groups,
      forceExpandGroupIds: gruposEmAnalise(groups),
      selectedId,
      getRecordId: (r) => r.id,
      getRecordLabel: (r) => r.nome || r.id,
      getRecordBadgeHtml: (r) => statusBadgeHtml(r.status, r.__tipo),
      sectionsFor: (r) => SECTIONS[r.__tipo] || SECTIONS.projeto,
      emptyMessage: "Nenhuma demanda registrada.",
      onSelect: (id) => onSelectFromSidebar(id),
    });
  }

  function findTipoOf(id) {
    for (const t of TIPOS) {
      if ((lists[t.id] || []).some((r) => r.id === id)) return t.id;
    }
    return tipo;
  }

  function onSelectFromSidebar(id) {
    const novoTipo = findTipoOf(id);
    selectRecord(novoTipo, id);
  }

  function renderPage(d) {
    record = d;
    selectedId = d.id;
    document.title = `${d.id} — ${tipo} — Admin SLT`;
    $("#dashboard-content").innerHTML = pageHtml(d);
    bindEvents(d);
    renderSidebar();
    SLTAdminDashboard.initSectionNav({
      navSelector: ".layer-group--record.is-selected .admin-record-sections",
    });
  }

  async function selectRecord(novoTipo, id, { updateUrl = true } = {}) {
    tipo = novoTipo;
    selectedId = id;
    renderSidebar();
    $("#dashboard-content").innerHTML = '<p class="hint">Carregando…</p>';
    if (updateUrl) {
      history.replaceState(
        null,
        "",
        `/restrict/demanda/?tipo=${encodeURIComponent(tipo)}&id=${encodeURIComponent(id)}`,
      );
    }
    const d = await API[tipo].get(id);
    renderPage(d);
    const active = document.querySelector(
      `.layer-group--record[data-record-id="${CSS.escape(id)}"]`,
    );
    active?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function refreshLists() {
    const [projeto, programa, plano] = await Promise.all([
      SLTAdminApi.listDemandas().catch(() => []),
      SLTAdminApi.listProgramas().catch(() => []),
      SLTAdminApi.listPlanos().catch(() => []),
    ]);
    lists.projeto = projeto.map((r) => ({ ...r, __tipo: "projeto" }));
    lists.programa = programa.map((r) => ({ ...r, __tipo: "programa" }));
    lists.plano = plano.map((r) => ({ ...r, __tipo: "plano" }));
  }

  async function saveRecord() {
    try {
      const updated = await API[tipo].update(record.id, collectPayload());
      SLTAdminUi.showToast("Alterações salvas.");
      await refreshLists();
      renderPage(updated);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  async function approveRecord() {
    const ok = await SLTAdminUi.showConfirm({
      title: "Aprovar demanda",
      message:
        "Aprovar esta demanda? Ela passará para o status «Aprovada».",
      confirmLabel: "Aprovar",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;
    try {
      const motivo = $("#fld-motivo-aprov")?.value.trim() || null;
      const updated = await API[tipo].aprovar(record.id, { motivo });
      SLTAdminUi.showToast("Demanda aprovada.");
      await refreshLists();
      renderPage(updated);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }

  async function rejectRecord() {
    const field = $("#fld-justificativa-reprov");
    const justificativa = field?.value.trim() || "";
    if (!justificativa) {
      field?.setCustomValidity("Informe a justificativa da reprovação.");
      field?.reportValidity();
      return;
    }
    const ok = await SLTAdminUi.showConfirm({
      title: "Reprovar demanda",
      message: "Reprovar esta demanda? Ela passará para o status «Reprovada na análise».",
      confirmLabel: "Reprovar",
      cancelLabel: "Cancelar",
      danger: true,
    });
    if (!ok) return;
    try {
      const updated = await API[tipo].reprovar(record.id, { justificativa });
      SLTAdminUi.showToast("Demanda reprovada.");
      await refreshLists();
      renderPage(updated);
    } catch (err) {
      SLTAdminUi.showToast(err.message, true);
    }
  }


  async function boot() {
    const { tipo: urlTipo, id } = paramsFromUrl();
    if (id) {
      const t = urlTipo && lists[urlTipo] ? urlTipo : findTipoOf(id);
      await selectRecord(t, id, { updateUrl: false });
      return;
    }
    record = null;
    selectedId = null;
    $("#dashboard-content").innerHTML =
      '<p class="hint">Nenhuma demanda selecionada. Selecione uma demanda na barra lateral para iniciar a análise.</p>';
    renderSidebar();
    scrollSidebarParaEmAnalise(
      primeiroRegistroEmAnalise(
        TIPOS.map((t) => ({ id: t.id, records: filteredRecords(t.id) })),
      ),
    );
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    await SLTAdminLabels.init("../");
    initLayerFilter();
    SLTAdminDashboard.initRecordsRootCollapse({});
    await refreshLists();
    await boot();
  }

  init().catch((err) => {
    console.error(err);
    if (err.code === "UNAUTHORIZED") {
      location.replace(SLTAdminAuth.loginUrl());
      return;
    }
    $("#dashboard-content").innerHTML =
      `<p class="hint">Erro: ${escapeHtml(err.message)}</p>`;
    SLTAdminUi.showToast(err.message, true);
  });
})();
