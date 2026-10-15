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
      { id: "sec-analise", label: "Análise" },
      { id: "sec-acoes", label: "Ações" },
    ],
    programa: [
      { id: "sec-info", label: "Informações do Programa" },
      { id: "sec-analise", label: "Análise" },
      { id: "sec-acoes", label: "Ações" },
    ],
  };

  /** Situação intermediária -> status visível no mapa, sem decisão final. */
  const SITUACOES = [
    {
      id: "suspender",
      label: "Suspender análise",
      status: "analise_suspensa",
      statusLabel: "Análise suspensa",
      from: ["analise_em_avaliacao"],
      message: "Suspender a análise? A demanda passará para «Análise suspensa» e o mapa deixará de destacá-la como em análise.",
    },
    {
      id: "complementar",
      label: "Solicitar complementação",
      status: "analise_aguardando_complementacao",
      statusLabel: "Aguardando complementação",
      from: ["analise_em_avaliacao"],
      message: "Solicitar complementação? A demanda passará para «Aguardando complementação» e o mapa passará a usar a cor deste status.",
    },
    {
      id: "retomar",
      label: "Retomar análise",
      status: "analise_em_avaliacao",
      statusLabel: "Em análise",
      from: ["analise_suspensa", "analise_aguardando_complementacao"],
      message: "Retomar a análise? A demanda voltará para «Em análise» e o mapa voltará a destacá-la.",
    },
  ];

  /** Desfecho da análise -> rótulo do botão e confirmação. */
  const DECISOES = [
    {
      id: "aprovada",
      label: "Aprovar demanda",
      status: "analise_aprovada",
      statusLabel: "Aprovada na análise",
      danger: false,
    },
    {
      id: "ressalvas",
      label: "Aprovar com ressalvas",
      status: "analise_aprovada",
      statusLabel: "Aprovada com ressalvas",
      danger: false,
      requerComplemento: true,
    },
    {
      id: "reprovada",
      label: "Reprovar demanda",
      status: "analise_reprovada",
      statusLabel: "Reprovada na análise",
      danger: true,
      requerComplemento: true,
    },
  ];

  let tipo = "projeto";
  let record = null;
  let originalFormPayload = null;
  let selectedId = null;
  let layerFilterApi = null;
  let complementoSalvo = "";
  let geometriaSaveTimer = null;
  let geometriaSaveQueue = Promise.resolve();
  let geometriaSaveRevision = 0;
  const lists = { projeto: [], programa: [], plano: [] };
  const groupVisibility = { projeto: true, programa: true, plano: true };

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
      SLTAdminAnalysisMap.initPreviewMap("admin-preview-map-wrap", payload, {
        visible: groupVisibility[demandTipo] !== false,
      });
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

    const campos = SLTProjectForm.html(d);


    return `
      <section id="sec-info" class="card admin-dashboard-section">
        <h2>Informações do Projeto</h2>
        <div class="admin-dashboard-columns">
          <div class="admin-dashboard-col">
            <div class="admin-info-fields">
              ${campos}
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
        <section class="analise-criterio analise-geometria" hidden style="display:none" aria-labelledby="geometria-avaliacao-titulo">
          <span class="analise-criterio-rotulo" id="geometria-avaliacao-titulo">Geometria</span>
          <span class="field-help" id="geometria-pergunta">A geometria apresentada é suficientemente adequada para representar o objeto da demanda?</span>
          <div id="geometria-criterios-grid"></div>
          <div class="admin-dashboard-actions geometria-actions">
            <button type="button" class="btn btn-primary" id="btn-aprovar-geometria" hidden>Aprovar geometria</button>
          </div>
          <p id="geometria-confirmada" role="status" hidden>Geometria confirmada. Item 6 concluído.</p>
          <div id="geometria-encaminhamento" hidden>
            <span class="field-help" id="geometria-encaminhamento-rotulo">Como a geometria será ajustada?</span>
            <div class="admin-dashboard-actions geometria-actions" role="group" aria-labelledby="geometria-encaminhamento-rotulo">
              <button type="button" class="btn btn-secondary" data-geometria-encaminhamento="complementacao" aria-pressed="false">Solicitar complementação</button>
              <button type="button" class="btn btn-secondary" id="btn-geometria" data-geometria-encaminhamento="substituicao" aria-pressed="false">Enviar/substituir geometria</button>
            </div>
            <p class="field-help" id="geometria-complementacao-tipo" hidden>Tipo de complementação: Ajuste de geometria. Conclua pelo botão Solicitar complementação no bloco Ações.</p>
            <label class="sr-only" for="arquivo-nova-geometria">Arquivo da nova geometria</label>
            <input type="file" id="arquivo-nova-geometria" name="arquivo-nova-geometria" accept=".zip,.gpkg,.kml,.kmz,.geojson,.json" hidden>
          </div>
          <div class="form-field analise-geometria-observacao">
            <label for="fld-avaliacao-geometria-observacao">Observação sobre a geometria</label>
            <textarea id="fld-avaliacao-geometria-observacao" rows="3" maxlength="3000" placeholder="Registre uma observação objetiva, se necessário."></textarea>
          </div>
          <p class="analise-geometria-salvamento" id="geometria-avaliacao-salvamento" role="status"></p>
        </section>
        <section class="analise-geometria-historico" aria-labelledby="geometria-historico-titulo">
          <h4 id="geometria-historico-titulo">Histórico de versões da geometria</h4>
          <p class="field-help">
            O histórico informa as versões registradas no sistema. Geometrias anteriores sem registro
            não podem ser reconstruídas; a origem desconhecida é identificada como tal.
          </p>
          <div id="geometria-historico-lista" aria-live="polite">
            <span class="field-help">Carregando histórico…</span>
          </div>
        </section>
      </section>`;
  }

  function parecerSectionHtml() {
    const canAnalyze = SLTAdminAuth.can("analyze");
    return `
      <section id="sec-parecer" class="admin-analise-subcard admin-dashboard-section">
        <h3>Parecer técnico</h3>
        <div class="admin-form-grid">
          <div class="form-field span-2">
            <span class="analise-criterio-rotulo" id="analise-resultado-rotulo">Resultado da análise</span>
            <p class="analise-resultado" id="analise-resultado" aria-labelledby="analise-resultado-rotulo">
              <span class="analise-resultado-badge is-pendente">Pendente</span>
              <span class="analise-resultado-placar">Responda os cinco critérios para apurar o resultado.</span>
            </p>
          </div>
          <div class="form-field span-2">
            <label for="fld-parecer">Parecer técnico <span class="field-help">(gerado automaticamente)</span></label>
            <textarea id="fld-parecer" class="admin-field-readonly analise-parecer" rows="14" readonly aria-readonly="true"></textarea>
          </div>
          <div class="form-field span-2" id="wrap-complemento" hidden>
            <label for="fld-parecer-complemento">Complementação do parecer — justificativa obrigatória para reprovar</label>
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
              `<button type="button" class="btn btn-status" data-status="${escapeHtml(dec.status)}" data-decisao="${dec.id}"${dec.id === "reprovada" ? ' disabled title="Complemente o parecer com uma justificativa para reprovar."' : ""}>${escapeHtml(dec.label)}</button>`,
          ).join("\n          ")
        : "";
    const situacaoButtons = canAnalyze
      ? SITUACOES.filter((acao) => acao.from.includes(d.status))
          .map(
            (acao) =>
              `<button type="button" class="btn btn-status" data-status="${escapeHtml(acao.status)}" data-situacao="${acao.id}">${escapeHtml(acao.label)}</button>`,
          )
          .join("\n          ")
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
        ${situacaoButtons}
        ${decisionButtons}
      </div>`;
  }

    function analiseSectionHtml(d) {
      return `
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
        </section>`;
    }

  function criterioRowHtml(criterio, editavel) {
    const nome = `crit-${criterio.campo}`;
    const eliminatorio = ["criterio_competencia", "criterio_nao_duplicidade"].includes(criterio.campo);
    const peso = criterio.peso ?? ({ criterio_clareza: 20, criterio_finalidade_publica: 30, criterio_relevancia_setorial: 50 })[criterio.campo];
    const marcado = (valor) => (criterio.resposta === valor ? " checked" : "");
    const desabilitado = editavel ? "" : " disabled";
    return `
      <div class="form-field span-2 analise-criterio" data-campo="${escapeHtml(criterio.campo)}">
        <span class="analise-criterio-rotulo" id="${nome}-rotulo">${escapeHtml(criterio.rotulo)} — ${eliminatorio ? "Eliminatório" : `Classificatório (${peso}%)`}</span>
        <span class="field-help">${escapeHtml(criterio.pergunta)}</span>
        <div class="analise-criterio-opcoes" role="radiogroup" aria-labelledby="${nome}-rotulo">
          <label class="analise-opcao analise-opcao--sim" for="${nome}-sim">
            <input type="radio" id="${nome}-sim" name="${nome}" value="sim"${marcado(true)}${desabilitado}>
            <span>Sim${criterio.campo === "criterio_nao_duplicidade" ? " (é inédita)" : ""}</span>
          </label>
          <label class="analise-opcao analise-opcao--nao" for="${nome}-nao">
            <input type="radio" id="${nome}-nao" name="${nome}" value="nao"${marcado(false)}${desabilitado}>
            <span>Não${criterio.campo === "criterio_nao_duplicidade" ? " (duplicada)" : ""}</span>
          </label>
        </div>
      </div>`;
  }

  function collectCriterios() {
    const respostas = {};
    document.querySelectorAll("#criterios-grid .analise-criterio").forEach((row) => {
      const campo = row.dataset.campo;
      const marcado = row.querySelector("input[type=radio]:checked");
      respostas[campo] = marcado ? marcado.value === "sim" : null;
    });
    respostas.demanda_duplicada_codigo = $("#demanda-duplicada")?.value || null;
    return respostas;
  }

  function collectAvaliacaoGeometria() {
    const resposta = document.querySelector('[name="geometria-adequada"]:checked')?.value;
    return {
      adequada: resposta ? resposta === "sim" : null,
      confirmada: resposta === "sim" && $("#geometria-criterios-grid").dataset.confirmada === "true",
      encaminhamento: resposta === "nao" ? document.querySelector('[data-geometria-encaminhamento][aria-pressed="true"]')?.dataset.geometriaEncaminhamento || null : null,
      observacao: $("#fld-avaliacao-geometria-observacao")?.value.trim() || null,
    };
  }

  function renderResumoAvaliacaoGeometria(avaliacao) {
    const confirmada = avaliacao.adequada === true && avaliacao.confirmada === true;
    $("#btn-aprovar-geometria").hidden = avaliacao.adequada !== true || confirmada;
    $("#geometria-confirmada").hidden = !confirmada;
    document.querySelector('.analise-geometria').classList.toggle('is-confirmada', confirmada);
    $("#geometria-encaminhamento").hidden = avaliacao.adequada !== false;
    $("#geometria-complementacao-tipo").hidden = avaliacao.encaminhamento !== "complementacao";
  }

  async function salvarGeometriaAntesDaAcao() {
    const criterios = collectCriterios();
    if (criterios.criterio_competencia !== true || criterios.criterio_nao_duplicidade !== true) return;
    clearTimeout(geometriaSaveTimer);
    geometriaSaveRevision += 1;
    await geometriaSaveQueue;
    if (!canApprove(record?.status)) return;
    const data = await SLTAdminApi.saveAnaliseAvaliacaoGeometria(record.id, collectAvaliacaoGeometria());
    if (data.parecer_texto) $("#fld-parecer").value = data.parecer_texto;
  }

  function renderAvaliacaoGeometria(data, editavel) {
    const avaliacao = data.avaliacao_geometria || {};
    const grid = $("#geometria-criterios-grid");
    if (grid) {
      grid.dataset.confirmada = String(avaliacao.confirmada === true);
      grid.innerHTML = `<div class="geometria-respostas" role="radiogroup" aria-labelledby="geometria-pergunta">
        <label><input type="radio" name="geometria-adequada" value="sim"${avaliacao.adequada === true ? " checked" : ""}${editavel ? "" : " disabled"}><span>Sim</span></label>
        <label><input type="radio" name="geometria-adequada" value="nao"${avaliacao.adequada === false ? " checked" : ""}${editavel ? "" : " disabled"}><span>Não</span></label>
      </div>`;
    }
    document.querySelectorAll('[data-geometria-encaminhamento]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.geometriaEncaminhamento === avaliacao.encaminhamento));
      button.disabled = !editavel;
      button.onclick = () => {
        document.querySelectorAll('[data-geometria-encaminhamento]').forEach(option => {
          option.setAttribute('aria-pressed', String(option === button));
        });
        onAvaliacaoGeometriaChange();
      };
    });
    document.querySelectorAll('.analise-geometria input[type=radio]').forEach(input => {
      input.onchange = () => {
        grid.dataset.confirmada = "false";
        document.querySelectorAll('[data-geometria-encaminhamento]').forEach(button => button.setAttribute('aria-pressed', 'false'));
        onAvaliacaoGeometriaChange();
      };
    });
    const aprovar = $("#btn-aprovar-geometria");
    aprovar.disabled = !editavel;
    aprovar.onclick = async () => {
      aprovar.disabled = true;
      const codigo = record.id;
      clearTimeout(geometriaSaveTimer);
      geometriaSaveRevision += 1;
      document.querySelectorAll('[name="geometria-adequada"]').forEach(input => { input.disabled = true; });
      try {
        await geometriaSaveQueue;
        const payload = {...collectAvaliacaoGeometria(), confirmada: true};
        const atualizada = await SLTAdminApi.saveAnaliseAvaliacaoGeometria(codigo, payload);
        if (record?.id !== codigo) return;
        grid.dataset.confirmada = String(atualizada.avaliacao_geometria?.confirmada === true);
        renderResumoAvaliacaoGeometria(collectAvaliacaoGeometria());
        if (atualizada.parecer_texto) $("#fld-parecer").value = atualizada.parecer_texto;
        $("#geometria-avaliacao-salvamento").textContent = "Aprovação da geometria salva.";
      } catch (err) {
        reportarErroAnalise(err.message, "Aprovar geometria");
      } finally {
        aprovar.disabled = !editavel;
        grid.querySelectorAll('input').forEach(input => { input.disabled = !editavel; });
      }
    };
    $("#btn-geometria").disabled = !editavel || !SLTAdminAuth.can("operate");
    $("#arquivo-nova-geometria").disabled = !editavel || !SLTAdminAuth.can("operate");
    const observacao = $("#fld-avaliacao-geometria-observacao");
    if (observacao) {
      observacao.value = avaliacao.observacao || "";
      observacao.disabled = !editavel;
      observacao.addEventListener("input", () => onAvaliacaoGeometriaChange());
    }
    renderResumoAvaliacaoGeometria(avaliacao);
    const status = $("#geometria-avaliacao-salvamento");
    if (status) {
      if (!editavel) {
        status.textContent = "Avaliação somente para consulta: a demanda já saiu da etapa de análise.";
      } else if (avaliacao.avaliada_em) {
        const autor = avaliacao.avaliada_por ? ` por ${avaliacao.avaliada_por}` : "";
        status.textContent = `Último salvamento: ${formatGeometryDate(avaliacao.avaliada_em)}${autor}.`;
      } else {
        status.textContent = "As respostas e observações são salvas automaticamente.";
      }
    }
  }

  function formatGeometryDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "data não registrada" : date.toLocaleString("pt-BR");
  }

  function onAvaliacaoGeometriaChange() {
    const payload = collectAvaliacaoGeometria();
    renderResumoAvaliacaoGeometria(payload);
    const status = $("#geometria-avaliacao-salvamento");
    if (status) status.textContent = "Alterações pendentes de salvamento…";
    const revision = ++geometriaSaveRevision;
    const codigo = record?.id;
    clearTimeout(geometriaSaveTimer);
    geometriaSaveTimer = setTimeout(() => {
      geometriaSaveQueue = geometriaSaveQueue
        .then(async () => {
          if (revision !== geometriaSaveRevision || !codigo) return;
          const atualizada = await SLTAdminApi.saveAnaliseAvaliacaoGeometria(codigo, payload);
          if (revision !== geometriaSaveRevision || record?.id !== codigo) return;
          if (atualizada.parecer_texto) $("#fld-parecer").value = atualizada.parecer_texto;
          const salvo = atualizada.avaliacao_geometria || {};
          if (status) {
            const autor = salvo.avaliada_por ? ` por ${salvo.avaliada_por}` : "";
            status.textContent = `Salvo às ${formatGeometryDate(salvo.avaliada_em)}${autor}.`;
          }
        })
        .catch((err) => {
          if (revision !== geometriaSaveRevision || record?.id !== codigo) return;
          if (status) status.textContent = "Não foi possível salvar a avaliação geométrica.";
          reportarErroAnalise(err.message, "Avaliação da geometria");
        });
    }, 350);
  }

  function renderHistoricoGeometria(data) {
    const alvo = $("#geometria-historico-lista");
    if (!alvo) return;
    if (!data.tem_historico || !data.itens?.length) {
      alvo.innerHTML = '<p class="analise-geometria-vazio">Não há versões registradas para esta demanda. Versões anteriores sem registro não podem ser recuperadas.</p>';
      return;
    }
    const origens = {
      desenho: "Desenho no mapa",
      upload: "Arquivo enviado",
      coordenadas: "Coordenadas informadas",
      nao_identificada: "Origem não registrada",
    };
    const aviso = data.aviso_historico_incompleto
      ? '<p class="analise-geometria-aviso">Há versões antigas sem registro de substituição. O sistema não informa uma data ou um responsável que não foram registrados.</p>'
      : "";
    alvo.innerHTML = `${aviso}<ol class="analise-geometria-historico-lista">${data.itens.map((item) => `
      <li class="analise-geometria-versao${item.vigente ? " is-vigente" : ""}">
        <div class="analise-geometria-versao-cabecalho">
          <strong>${item.vigente
            ? "Versão vigente"
            : item.substituido_em
              ? "Versão substituída"
              : item.substituicao_nao_registrada
                ? "Substituição não registrada"
                : "Vigência não confirmada"}</strong>
          <span>Registrada em <time datetime="${escapeHtml(item.criado_em)}">${formatGeometryDate(item.criado_em)}</time></span>
        </div>
        <dl>
          <div><dt>Origem</dt><dd>${origens[item.origem] || "Origem não identificada"}</dd></div>
          ${item.geometria_tipo ? `<div><dt>Geometria</dt><dd>${escapeHtml(item.geometria_tipo)}</dd></div>` : ""}
          ${item.nome_arquivo ? `<div><dt>Arquivo original</dt><dd>${escapeHtml(item.nome_arquivo)}</dd></div>` : ""}
          ${item.autor_id ? `<div><dt>Autor registrado (ID)</dt><dd>${escapeHtml(item.autor_id)}</dd></div>` : ""}
          ${item.substituido_em ? `<div><dt>Substituída em</dt><dd>${formatGeometryDate(item.substituido_em)}</dd></div>` : ""}
          ${item.substituido_por_id ? `<div><dt>Substituída por (ID)</dt><dd>${escapeHtml(item.substituido_por_id)}</dd></div>` : ""}
          ${item.substituido_em ? `<div><dt>Motivo</dt><dd>${escapeHtml(item.motivo_substituicao || "Não registrado.")}</dd></div>` : ""}
        </dl>
      </li>`).join("")}</ol>`;
  }

  const pesosCriterios = { criterio_clareza: 20, criterio_finalidade_publica: 30, criterio_relevancia_setorial: 50 };
  let gravacaoCriterios = Promise.resolve();
  let demandasDuplicidade = null;
  function computeResultado(respostas) {
    const eliminada = respostas.criterio_competencia === false || respostas.criterio_nao_duplicidade === false;
    const liberado = respostas.criterio_competencia === true && respostas.criterio_nao_duplicidade === true;
    const completo = eliminada || (liberado && Object.keys(pesosCriterios).every(k => typeof respostas[k] === "boolean"));
    const pontuacao = Object.entries(pesosCriterios).reduce((soma, [key,peso]) => soma + (respostas[key] === true ? peso : 0), 0);
    return { completo, pontuacao, eliminada, resultado: completo ? (eliminada || pontuacao <= 50 ? "reprovado" : "aprovado") : null };
  }
  function atualizarVisibilidadeCriterios() {
    const respostas = collectCriterios();
    const liberado = respostas.criterio_competencia === true && respostas.criterio_nao_duplicidade === true;
    Object.keys(pesosCriterios).forEach(campo => {
      const row = document.querySelector(`[data-campo="${campo}"]`);
      if (!row) return;
      row.hidden = !liberado;
      row.style.display = liberado ? "" : "none";
      if (!liberado) row.querySelectorAll('input').forEach(input => { input.checked = false; });
    });
    const geometria = document.querySelector(".analise-geometria");
    if (geometria) {
      geometria.hidden = !liberado;
      geometria.style.display = liberado ? "" : "none";
    }
    const wrap = $("#demanda-duplicada-wrap");
    if (wrap) wrap.hidden = respostas.criterio_nao_duplicidade !== false;
    if (respostas.criterio_nao_duplicidade !== false && $("#demanda-duplicada")) $("#demanda-duplicada").value = "";
  }
  async function carregarDemandasDuplicidade(codigo, editavel) {
    const select = $("#demanda-duplicada");
    if (!select) return;
    select.disabled = true;
    try {
      if (!demandasDuplicidade) demandasDuplicidade = (await Promise.all([
        SLTAdminApi.listPlanos(), SLTAdminApi.listProgramas(), SLTAdminApi.listDemandas()
      ])).flat();
      if (!select.isConnected) return;
      select.innerHTML = '<option value="">Selecione uma demanda</option>' + demandasDuplicidade.filter(d => d.id !== record.id)
        .sort((a,b) => String(a.id).localeCompare(String(b.id)))
        .map(d => `<option value="${escapeHtml(d.id)}">${escapeHtml(d.id)} — ${escapeHtml(d.nome || "")}</option>`).join("");
      select.value = codigo || "";
      select.disabled = !editavel;
    } catch (err) { reportarErroAnalise(err.message, "Lista de demandas para duplicidade"); }
  }

  function renderResultado(placar) {
    const alvo = $("#analise-resultado");
    if (!alvo) return;
    const rotulo = { aprovado: "Aprovado", reprovado: "Reprovado" };
    const classe = placar.resultado ? `is-${placar.resultado}` : "is-pendente";
    const texto = placar.resultado ? rotulo[placar.resultado] : "Pendente";
    const detalhe = placar.eliminada ? "Reprovada em critério eliminatório." : placar.completo
      ? `${placar.pontuacao}% favoráveis · ${100 - placar.pontuacao}% contrários. Aprovação exige mais de 50%.`
      : "Responda os critérios aplicáveis. Os classificatórios aparecem após dois Sim nos eliminatórios.";
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
          `<div class="form-field span-2"><span class="field-help">${!SLTAdminAuth.can("analyze")
            ? "A edição dos critérios exige perfil Analista ou Gestor."
            : `A edição dos critérios exige status Em avaliação. Status atual: ${escapeHtml(record?.status || "não informado")}.`}</span></div>`,
        );
      }
      grid.querySelectorAll("input[type=radio]").forEach((input) => {
        input.addEventListener("change", () => onCriterioChange());
      });
    }

    const duplicidade = grid?.querySelector('[data-campo="criterio_nao_duplicidade"]');
    if (duplicidade) duplicidade.insertAdjacentHTML("beforeend", `<div id="demanda-duplicada-wrap" hidden>
      <label for="demanda-duplicada">Demanda já cadastrada *</label>
      <select id="demanda-duplicada" required ${editavel ? "" : "disabled"}><option value="${escapeHtml(data.demanda_duplicada_codigo || "")}">${escapeHtml(data.demanda_duplicada_codigo || "Carregando demandas…")}</option></select>
    </div>`);
    $("#demanda-duplicada")?.addEventListener("change", onCriterioChange);
    atualizarVisibilidadeCriterios();
    renderResultado(computeResultado(collectCriterios()));
    carregarDemandasDuplicidade(data.demanda_duplicada_codigo, editavel);
    renderAvaliacaoGeometria(data, editavel);

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

    atualizarBotaoReprovar();
    const baixar = $("#analise-parecer-baixar");
    if (baixar) {
      if (data.tem_parecer_pdf) baixar.removeAttribute("hidden");
      else baixar.setAttribute("hidden", "");
    }
  }

  async function onCriterioChange() {
    atualizarVisibilidadeCriterios();
    const respostas = collectCriterios();
    renderResultado(computeResultado(respostas));
    const codigo = record.id;
    gravacaoCriterios = gravacaoCriterios.catch(() => {}).then(async () => {
      const atualizada = await SLTAdminApi.saveAnaliseCriterios(codigo, respostas);
      const parecer = $("#fld-parecer");
      if (record.id === codigo && parecer && atualizada.parecer_texto) parecer.value = atualizada.parecer_texto;
    });
    try { await gravacaoCriterios; }
    catch (err) { reportarErroAnalise(err.message, "Critérios de análise"); }
  }

  function atualizarBotaoReprovar() {
    const preenchido = Boolean($("#fld-parecer-complemento")?.value.trim());
    const botao = document.querySelector('[data-decisao="reprovada"]');
    if (botao) {
      botao.disabled = !preenchido;
      botao.title = preenchido ? "Reprovar demanda" : "Clique em Complementar parecer e informe a justificativa para reprovar.";
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
    atualizarBotaoReprovar();
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
      reportarErroAnalise(err.message, "Complementação do parecer");
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

  /**
   * Erro de decisão/análise no modal de erro do ProcessFeedback (SIGMA): o
   * servidor recusa por regra de negócio (critérios pendentes, transição
   * inválida, ressalva sem complementação) e o texto precisa ficar na tela.
   * Toast é usado apenas onde o feedback não está carregado.
   */
  function reportarErroAnalise(mensagem, titulo) {
    const texto = mensagem || "Erro na requisição.";
    if (window.StatusFeedback) window.StatusFeedback.erro({ actionTitle: titulo || "Análise da demanda", message: texto });
    else SLTAdminUi.showToast(texto, true);
  }

  async function alterarSituacao(acaoId) {
    const acao = SITUACOES.find((item) => item.id === acaoId);
    if (!acao || !record) return;
    const ok = await SLTAdminUi.showConfirm({
      title: acao.label,
      message: acao.message,
      confirmLabel: acao.label,
      cancelLabel: "Cancelar",
      danger: false,
    });
    if (!ok) return;

    try {
      await salvarGeometriaAntesDaAcao();
      await SLTAdminApi.alterarSituacaoAnalise(record.id, acao.id);
      try {
        await refreshLists();
        renderPage(await API[tipo].get(record.id));
      } catch (err) {
        if (window.StatusFeedback) {
          window.StatusFeedback.parcial({
            actionTitle: acao.label,
            title: "Status alterado, tela desatualizada",
            message: `A demanda passou para «${acao.statusLabel}», mas a tela não foi atualizada: ${err.message}`,
          });
        } else {
          SLTAdminUi.showToast(`Status alterado, mas a tela não foi atualizada: ${err.message}`, true);
        }
        return;
      }
      if (window.StatusFeedback) {
        window.StatusFeedback.sucesso({
          actionTitle: acao.label,
          title: "Status atualizado",
          message: `A demanda passou para «${acao.statusLabel}». O mapa passa a usar a cor deste status.`,
        });
      } else {
        SLTAdminUi.showToast(`Demanda atualizada para «${acao.statusLabel}».`);
      }
    } catch (err) {
      reportarErroAnalise(err.message, acao.label);
    }
  }

  async function decideRecord(decisaoId) {
    const decisao = DECISOES.find((item) => item.id === decisaoId);
    if (!decisao) return;

    const respostas = collectCriterios();
    const placar = computeResultado(respostas);
    if (!placar.completo) {
      reportarErroAnalise(
        "Responda os critérios aplicáveis antes de registrar a decisão.",
        decisao.label,
      );
      $("#sec-criterios")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (respostas.criterio_nao_duplicidade === false && !respostas.demanda_duplicada_codigo) {
      reportarErroAnalise("Selecione a demanda já cadastrada.", decisao.label);
      $("#demanda-duplicada")?.focus(); return;
    }
    if (decisaoId !== "reprovada" && placar.resultado !== "aprovado") {
      reportarErroAnalise("Os critérios não permitem aprovar esta demanda.", decisao.label); return;
    }
    if (decisao.requerComplemento) {
      const campo = $("#fld-parecer-complemento");
      const texto = campo?.value.trim() || "";
      if (!texto) {
        reportarErroAnalise(
          decisaoId === "reprovada" ? "Para reprovar, complemente o parecer com uma justificativa." : "Para aprovar com ressalvas é obrigatório preencher a complementação do parecer.",
          decisao.label,
        );
        abrirComplemento();
        campo?.focus();
        return;
      }
      try {
        await SLTAdminApi.saveAnaliseComplemento(record.id, texto);
      } catch (err) {
        reportarErroAnalise(err.message, "Complementação do parecer");
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
      await salvarGeometriaAntesDaAcao();
      await gravacaoCriterios;
      await SLTAdminApi.saveAnaliseCriterios(record.id, collectCriterios());
      await SLTAdminApi.decidirAnalise(record.id, decisao.id);
      SLTAdminUi.showToast("Decisão registrada. Baixando o parecer em PDF…");
      try {
        await downloadParecer(record.id);
      } catch (err) {
        reportarErroAnalise(
          `Decisão registrada, mas o download do parecer falhou: ${err.message}`,
          decisao.label,
        );
      }
      await refreshLists();
      renderPage(await API[tipo].get(record.id));
    } catch (err) {
      reportarErroAnalise(err.message, `Decisão «${decisao.label}» não registrada`);
    }
  }

  function bindAnalise(d) {
    $("#fld-parecer-complemento")?.addEventListener("input", atualizarBotaoReprovar);
    clearTimeout(geometriaSaveTimer);
    geometriaSaveRevision += 1;
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
    document.querySelectorAll("[data-situacao]").forEach((btn) => {
      btn.addEventListener("click", () => alterarSituacao(btn.dataset.situacao));
    });

    SLTAdminApi.getAnalise(d.id)
      .then((data) => {
        if (record?.id === d.id) renderAnalise(data);
      })
      .catch((err) => {
        const grid = $("#criterios-grid");
        if (grid) {
          grid.innerHTML = `<div class="form-field span-2"><span class="field-help">Não foi possível carregar os critérios: ${escapeHtml(err.message)}</span></div>`;
        }
      });
    SLTAdminApi.getAnaliseGeometriaHistorico(d.id)
      .then((data) => {
        if (record?.id === d.id) renderHistoricoGeometria(data);
      })
      .catch((err) => {
        const historico = $("#geometria-historico-lista");
        if (historico && record?.id === d.id) {
          historico.innerHTML = `<p class="analise-geometria-erro">Não foi possível carregar o histórico: ${escapeHtml(err.message)}</p>`;
        }
      });
  }

  function projetoPageHtml(d) {
    return `
      <div class="admin-dashboard-layout">
        ${demandHeadHtml(d)}
        <div class="admin-demand-body">
        ${projectInfoHtml(d)}
        ${analiseSectionHtml(d)}
        </div>
      </div>`;
  }

  function bindProjeto(d) {
    SLTProjectForm.bind(d);
    mountAnalysisMap(d, "projeto");
    bindAnalise(d);
  }

  function collectProjeto() { return SLTProjectForm.collect(); }

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
              <label for="fld-processo-sei">Processo SEI</label>
              <input type="text" id="fld-processo-sei" maxlength="50" value="${escapeHtml(d.origem_sei_processo || "")}">
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
            ${SLTAdminAuth.can("operate") ? `<div class="admin-dashboard-actions" id="info-edit-actions">
              <button type="button" class="btn btn-secondary" id="btn-editar">Editar</button>
              <button type="button" class="btn btn-primary" id="btn-salvar" hidden>Salvar alterações</button>
              <button type="button" class="btn btn-secondary" id="btn-cancelar-edicao" hidden>Cancelar</button>

            </div>` : ""}
            </div>
            <div class="admin-dashboard-col">
              ${analysisMapColumnHtml(d)}
            </div>
          </div>
        </section>

        ${analiseSectionHtml(d)}
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
    bindAnalise(d);
  }

  function collectPlano() {
    return {
      nome: $("#fld-nome").value.trim(),
      origem_sei_processo: $("#fld-processo-sei").value.trim() || null,
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
              <label for="fld-processo-sei">Processo SEI</label>
              <input type="text" id="fld-processo-sei" maxlength="50" value="${escapeHtml(d.origem_sei_processo || "")}">
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
            ${SLTAdminAuth.can("operate") ? `<div class="admin-dashboard-actions" id="info-edit-actions">
              <button type="button" class="btn btn-secondary" id="btn-editar">Editar</button>
              <button type="button" class="btn btn-primary" id="btn-salvar" hidden>Salvar alterações</button>
              <button type="button" class="btn btn-secondary" id="btn-cancelar-edicao" hidden>Cancelar</button>

            </div>` : ""}
            </div>
            <div class="admin-dashboard-col">
              ${analysisMapColumnHtml(d)}
            </div>
          </div>
        </section>

        ${analiseSectionHtml(d)}
        </div>
      </div>`;
  }

  function bindPrograma(d) {
    mountAnalysisMap(d, "programa");
    bindAnalise(d);
  }

  function collectPrograma() {
    return {
      nome: $("#fld-nome").value.trim(),
      origem_sei_processo: $("#fld-processo-sei").value.trim() || null,
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
    originalFormPayload = structuredClone(collectPayload());
    {
      setInfoEditMode(false);
      $("#btn-editar")?.addEventListener("click", () => setInfoEditMode(true));
      $("#btn-cancelar-edicao")?.addEventListener("click", () => renderPage(record));
    }
    $("#btn-salvar")?.addEventListener("click", () => saveRecord());
    $("#btn-geometria")?.addEventListener("click", () => $("#arquivo-nova-geometria")?.click());
    $("#arquivo-nova-geometria")?.addEventListener("change", uploadReplacementGeometry);
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
      visibility: {
        isGroupVisible: (groupId) => groupVisibility[groupId] !== false,
        isRecordVisible: () => true,
      },
      showRecordVisibility: false,
      onGroupVisibilityChange: (groupId, visible) => {
        if (!Object.prototype.hasOwnProperty.call(groupVisibility, groupId)) return;
        groupVisibility[groupId] = visible;
        syncRootVisibilityCheckbox();
        if (selectedId && findTipoOf(selectedId) === groupId) {
          SLTAdminAnalysisMap.setPreviewMapVisibility("admin-preview-map-wrap", visible);
        }
      },
      forceExpandGroupIds: gruposEmAnalise(groups),
      selectedId,
      getRecordId: (r) => r.id,
      getRecordLabel: (r) => r.nome || r.id,
      getRecordBadgeHtml: (r) => statusBadgeHtml(r.status, r.__tipo),
      sectionsFor: (r) => SECTIONS[r.__tipo] || SECTIONS.projeto,
      emptyMessage: "Nenhuma demanda registrada.",
      onSelect: (id) => onSelectFromSidebar(id),
    });
    syncRootVisibilityCheckbox();
  }

  function syncRootVisibilityCheckbox() {
    const checkbox = $("#toggle-records-visibility");
    if (!checkbox) return;
    const visibleCount = TIPOS.filter((item) => groupVisibility[item.id] !== false).length;
    checkbox.checked = visibleCount === TIPOS.length;
    checkbox.indeterminate = visibleCount > 0 && visibleCount < TIPOS.length;
    checkbox.setAttribute("aria-checked", checkbox.indeterminate ? "mixed" : String(checkbox.checked));
  }

  function bindRootVisibilityCheckbox() {
    const checkbox = $("#toggle-records-visibility");
    if (!checkbox || checkbox.dataset.visibilityBound === "1") return;
    checkbox.dataset.visibilityBound = "1";
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      TIPOS.forEach((item) => {
        groupVisibility[item.id] = checkbox.checked;
        const group = [...document.querySelectorAll("#records-list .layer-group--tipo")]
          .find((element) => element.dataset.groupId === item.id);
        if (!group) return;
        const groupCheckbox = group.querySelector(".layer-visibility-input--group");
        if (groupCheckbox) groupCheckbox.checked = checkbox.checked;
        group.classList.toggle("is-map-hidden", !checkbox.checked);
      });
      syncRootVisibilityCheckbox();
      SLTAdminAnalysisMap.setPreviewMapVisibility("admin-preview-map-wrap", checkbox.checked);
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

  async function uploadReplacementGeometry(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (JSON.stringify(collectPayload()) !== JSON.stringify(originalFormPayload)) {
      const message = "Salve ou cancele as alterações do formulário antes de substituir a geometria.";
      if (window.StatusFeedback) {
        window.StatusFeedback.erro({
          actionTitle: "Substituir geometria",
          message,
          solution: "Salve as alterações do formulário ou cancele a edição e selecione o arquivo novamente.",
        });
      } else {
        SLTAdminUi.showToast(message, true);
      }
      event.target.value = "";
      return;
    }
    const selectedTipo = tipo, selectedCode = record.id;
    const button = $("#btn-geometria");
    const input = event.target;
    const CHECK = "Conferir a geometria e sua abrangência territorial";
    const REPLACE = "Substituir a geometria e preservar o arquivo original";
    button.disabled = true;
    button.textContent = "Conferindo geometria…";
    async function send(path, token) {
      const form = new FormData(); form.append("file", file);
      if (token) form.append("confirmacao", token);
      const response = await fetch(`/api/geometria/${path}/${selectedTipo}/${encodeURIComponent(selectedCode)}`, {
        method: "POST", credentials: "include", body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = data?.detail;
        const message = typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg || item.message || JSON.stringify(item)).join("; ")
            : "Falha na conferência ou substituição da geometria.";
        const error = new Error(message);
        error.status = response.status;
        error.detail = detail;
        throw error;
      }
      return data;
    }
    const proc = ProcessFeedback.iniciarCadastro({
      title: "Substituir geometria",
      subtitle: file.name,
      tasks: [CHECK, REPLACE],
    });
    proc.tarefaAtual(CHECK, "Enviando o arquivo para conferência territorial…");
    try {
      await salvarGeometriaAntesDaAcao();
      const check = await send("conferir");
      proc.concluirTarefa(CHECK, check.permitido ? "Abrangência territorial confirmada" : "Geometria fora da abrangência");
      if (!check.permitido) {
        proc.sucesso({
          _status: "partial",
          title: "Geometria não substituída",
          message: check.mensagem || "A geometria não passou na conferência territorial.",
          subprocesses: [
            { name: "Conferência territorial", status: "warning", detail: check.fonte || "A localização não foi autorizada." },
            { name: "Substituição", status: "skip", detail: "Nenhuma alteração foi feita na demanda." },
          ],
        });
        return;
      }

      const confirmed = await ProcessFeedback.confirmar({
        title: "Confirmar localização da geometria",
        message: check.mensagem,
        warning: "A conferência avalia a geometria original. Ao confirmar, ela substituirá a geometria atual e o arquivo original será preservado no histórico.",
        confirmLabel: "Confirmar e substituir",
        cancelLabel: "Enviar outra geometria",
      });
      if (!confirmed) {
        proc.sucesso({
          _status: "partial",
          title: "Substituição cancelada",
          message: "A conferência territorial foi concluída, mas a geometria da demanda não foi alterada.",
          subprocesses: [
            { name: "Conferência territorial", status: "success", detail: check.fonte || "Localização dentro da abrangência." },
            { name: "Substituição", status: "skip", detail: "Cancelada pelo usuário; nenhum dado foi alterado." },
          ],
        });
        return;
      }

      proc.tarefaAtual(REPLACE, "Validando a confirmação e gravando a nova geometria e o arquivo original…");
      button.textContent = "Substituindo geometria…";
      await send("substituir", check.confirmacao);
      proc.concluirTarefa(REPLACE, "Geometria atualizada; arquivo original preservado no histórico");
      try {
        const updated = await API[selectedTipo].get(selectedCode);
        if (tipo === selectedTipo && record.id === selectedCode) renderPage(updated);
        await refreshLists();
        proc.sucesso({
          title: "Geometria substituída",
          message: "A demanda foi atualizada e o arquivo original foi preservado no histórico.",
          summary: [
            { label: "Demanda", value: selectedCode },
            { label: "Tipo", value: selectedTipo },
            { label: "Arquivo original", value: file.name },
          ],
        });
      } catch (refreshError) {
        proc.sucesso({
          _status: "partial",
          title: "Geometria substituída; tela não atualizada",
          message: "O servidor confirmou a substituição e preservou o arquivo original, mas a tela não conseguiu recarregar os dados. Recarregue a demanda antes de continuar.",
          subprocesses: [
            { name: "Substituição no servidor", status: "success", detail: "Geometria atualizada e original preservado." },
            { name: "Atualização da tela", status: "warning", detail: refreshError.message },
          ],
        });
      }
    } catch (error) {
      proc.erro({
        title: "Não foi possível substituir a geometria",
        message: error.message,
        details: error.detail ? [error.detail] : [],
        solution: "A conferência não altera a demanda. Se a falha ocorreu durante a substituição ou houve interrupção de conexão, confira a geometria atual e o histórico antes de tentar novamente.",
      });
    } finally {
      input.value = "";
      button.disabled = false;
      button.textContent = "Enviar/substituir geometria";
    }
  }

  async function saveRecord() {
    try {
      const current = collectPayload();
      const changes = Object.fromEntries(Object.entries(current).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(originalFormPayload?.[key])
      ));
      if (!Object.keys(changes).length) {
        SLTAdminUi.showToast("Nenhuma alteração foi feita.");
        setInfoEditMode(false);
        return;
      }
      const updated = await API[tipo].update(record.id, changes);
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
    bindRootVisibilityCheckbox();
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
