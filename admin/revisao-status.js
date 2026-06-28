(function () {
  const TIPOS = ["plano", "programa", "projeto"];
  const TIPO_TITULO = { plano: "Plano", programa: "Programa", projeto: "Projeto" };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Proposta de camadas e rótulos — editável aqui até migrar para o banco. */
  const PROPOSTA = {
    cadastro_analise: {
      id: "cadastro_analise",
      titulo: "Camada 1 — Cadastro e análise",
      descricao:
        "Enquanto a entidade ainda é demanda: intake, triagem e parecer de factibilidade. Após aprovação, deixa de ser demanda e passa a plano, programa ou projeto.",
      prefixo: "Demanda",
      css: "status-camada-chip--1",
      status: [
        {
          codigo: "rascunho",
          nomeProposto: "Demanda em rascunho",
          descricaoProposta: "Cadastro iniciado, ainda não submetido à análise.",
        },
        {
          codigo: "em_analise",
          nomeProposto: "Demanda em análise",
          descricaoProposta: "Equipe avalia factibilidade e consistência do cadastro.",
        },
        {
          codigo: "aprovada",
          nomeProposto: "Demanda aprovada",
          descricaoProposta:
            "Parecer positivo — último status como demanda. Handoff direto para aguardando hierarquização (tipado).",
        },
        {
          codigo: "reprovada",
          nomeProposto: "Demanda reprovada",
          descricaoProposta: "Parecer negativo na análise de cadastro.",
        },
        {
          codigo: "arquivada",
          nomeProposto: "Demanda arquivada",
          descricaoProposta: "Encerrada na camada de análise, sem seguir para hierarquização.",
        },
      ],
    },
    hierarquizacao: {
      id: "hierarquizacao",
      titulo: "Camada 2 — Hierarquização",
      descricao:
        "Demanda aprovada vai direto para aguardando hierarquização — não existe status «aprovado para hierarquização». Rótulos variam por tipo; códigos internos permanecem para migração.",
      css: "status-camada-chip--2",
      fluxoResumo: [
        "Demanda aprovada",
        "Aguardando hierarquização",
        "Fila de hierarquização",
        "Em hierarquização",
        "Hierarquizado",
      ],
      status: [
        {
          codigo: "elegivel_ahp",
          ordemProposta: 1,
          nomesPorTipo: {
            plano: "Plano aguardando hierarquização",
            programa: "Programa aguardando hierarquização",
            projeto: "Projeto aguardando hierarquização",
          },
          descricaoProposta:
            "Primeiro status da Camada 2 (handoff da Demanda aprovada). Código legado: elegivel_ahp.",
        },
        {
          codigo: "fila_hierarquizacao",
          ordemProposta: 2,
          nomesPorTipo: {
            plano: "Plano na fila de hierarquização",
            programa: "Programa na fila de hierarquização",
            projeto: "Projeto na fila de hierarquização",
          },
          descricaoProposta: "Entrou na fila da rodada de hierarquização.",
        },
        {
          codigo: "em_hierarquizacao",
          ordemProposta: 3,
          nomesPorTipo: {
            plano: "Plano em hierarquização",
            programa: "Programa em hierarquização",
            projeto: "Projeto em hierarquização",
          },
          descricaoProposta: "Participando ativamente da comparação AHP na rodada.",
        },
        {
          codigo: "hierarquizado",
          ordemProposta: 4,
          nomesPorTipo: {
            plano: "Plano hierarquizado",
            programa: "Programa hierarquizado",
            projeto: "Projeto hierarquizado",
          },
          descricaoProposta: "Ranking concluído em rodada homologada.",
        },
      ],
    },
    pos_hierarquizado: {
      id: "pos_hierarquizado",
      titulo: "Após hierarquizado — desfechos",
      descricao:
        "Status sequentes possíveis depois de hierarquizado: execução, conclusão, pausa, saída do ranking, cancelamento ou arquivamento.",
      css: "status-camada-chip--pos",
      fluxoResumo: [
        "Hierarquizado",
        "Em execução",
        "Finalizado",
        "Suspenso · Retirado · Cancelado · Arquivado",
      ],
      status: [
        {
          codigo: "em_execucao",
          ordemProposta: 1,
          nomesPorTipo: {
            plano: "Plano em execução",
            programa: "Programa em execução",
            projeto: "Projeto em execução",
          },
          descricaoProposta: "Aprovado no ranking e em implementação operacional.",
        },
        {
          codigo: "finalizado",
          ordemProposta: 2,
          nomesPorTipo: {
            plano: "Plano finalizado",
            programa: "Programa finalizado",
            projeto: "Projeto finalizado",
          },
          descricaoProposta: "Execução concluída com êxito.",
        },
        {
          codigo: "suspenso",
          nomesPorTipo: {
            plano: "Plano suspenso",
            programa: "Programa suspenso",
            projeto: "Projeto suspenso",
          },
          descricaoProposta: "Pausa temporária após hierarquização (também aplicável durante a Camada 2).",
        },
        {
          codigo: "retirado",
          nomesPorTipo: {
            plano: "Plano retirado do ranking",
            programa: "Programa retirado do ranking",
            projeto: "Projeto retirado do ranking",
          },
          descricaoProposta: "Removido do ranking ou do universo AHP ativo.",
        },
        {
          codigo: "cancelado",
          nomesPorTipo: {
            plano: "Plano cancelado",
            programa: "Programa cancelado",
            projeto: "Projeto cancelado",
          },
          descricaoProposta: "Encerrado antes da conclusão — decisão de não prosseguir com a execução.",
        },
        {
          codigo: "arquivada",
          nomesPorTipo: {
            plano: "Plano arquivado",
            programa: "Programa arquivado",
            projeto: "Projeto arquivado",
          },
          descricaoProposta:
            "Encerramento definitivo após hierarquização. Na Camada 1 o mesmo código aparece como Demanda arquivada.",
        },
      ],
    },
    transversal: {
      id: "transversal",
      titulo: "Transversais (Camada 1)",
      descricao:
        "Suspenso e retirado também podem ocorrer na análise de demanda, antes da hierarquização.",
      css: "status-camada-chip--x",
      status: [
        {
          codigo: "suspenso",
          nomeCamada1: "Demanda suspensa",
          descricaoProposta: "Pausa temporária durante cadastro ou análise.",
        },
        {
          codigo: "retirado",
          nomeCamada1: "Demanda retirada",
          descricaoProposta: "Removido do fluxo de análise antes de virar plano/programa/projeto.",
        },
      ],
    },
  };

  const NOTAS = [
    "Não existe status «aprovado para hierarquização» — <code>aprovada</code> vai direto para <code>elegivel_ahp</code> com rótulo «aguardando hierarquização».",
    "Mapeamento de códigos legados: <code>elegivel_ahp</code> → aguardando · <code>fila_hierarquizacao</code> → fila · <code>em_hierarquizacao</code> → em hierarquização.",
    "Camada 1: prefixo <strong>Demanda</strong>. Camada 2 e pós-hierarquizado: prefixo <strong>Plano / Programa / Projeto</strong>.",
    "Após <code>hierarquizado</code>: em execução, finalizado, suspenso, retirado, cancelado ou arquivado (códigos novos: <code>em_execucao</code>, <code>finalizado</code>, <code>cancelado</code>).",
    "Hoje <code>fila_hierarquizacao</code> ainda aparece na Camada 1 no banco — na proposta ela fica só na hierarquização.",
    "Depois de validar, migração SQL em <code>dom_status_demanda</code> (camada, rótulos por tipo e matriz de transição).",
  ];

  function $(sel) {
    return document.querySelector(sel);
  }

  function labelProposto(item, camada) {
    if (item.nomeProposto) return item.nomeProposto;
    if (item.nomeCamada1 && camada?.id === "transversal") return item.nomeCamada1;
    return "";
  }

  function renderNomesPorTipo(nomesPorTipo) {
    if (!nomesPorTipo) return "";
    return `
      <div class="status-proposta-tipos">
        ${TIPOS.map(
          (t) => `
          <div class="status-proposta-tipo">
            <span class="status-proposta-kicker">${escapeHtml(TIPO_TITULO[t])}</span>
            <p class="status-proposta-valor status-proposta-valor--novo">${escapeHtml(nomesPorTipo[t])}</p>
          </div>`
        ).join("")}
      </div>`;
  }

  function camadaCurta(titulo) {
    return titulo
      .replace(/^Camada 1 — /, "")
      .replace(/^Camada 2 — /, "")
      .replace(/^Após hierarquizado — /, "Pós-hierarquização")
      .replace("Transversais (Camada 1)", "Transversal");
  }

  function renderStatusCard(item, camada, atualMap) {
    const atual = atualMap[item.codigo];
    const nomeAtual = atual?.nome || "— (consultar banco)";
    const temTipos = Boolean(item.nomesPorTipo);
    const labelSimples = labelProposto(item, camada);

    const compareNovo = temTipos
      ? renderNomesPorTipo(item.nomesPorTipo)
      : `<p class="status-proposta-valor status-proposta-valor--novo">${escapeHtml(labelSimples)}</p>`;

    const ordemBadge =
      item.ordemProposta != null
        ? `<span class="status-proposta-seq">Passo ${item.ordemProposta}</span>`
        : "";

    const transversalCamada1 =
      camada.id === "transversal" && item.nomeCamada1
        ? `
        <div class="status-proposta-camada1">
          <span class="status-proposta-kicker">Camada 1</span>
          <p class="status-proposta-valor status-proposta-valor--novo">${escapeHtml(item.nomeCamada1)}</p>
        </div>`
        : "";

    return `
      <article class="status-proposta-card${temTipos ? " status-proposta-card--tipos" : ""}">
        <div class="status-proposta-card-head">
          <p class="status-proposta-codigo"><code>${escapeHtml(item.codigo)}</code></p>
          ${ordemBadge}
        </div>
        <div class="status-proposta-compare${temTipos ? " status-proposta-compare--tipos" : ""}">
          <div class="status-proposta-col">
            <span class="status-proposta-kicker">Nome atual (banco)</span>
            <p class="status-proposta-valor status-proposta-valor--atual">${escapeHtml(nomeAtual)}</p>
          </div>
          <div class="status-proposta-arrow" aria-hidden="true">→</div>
          <div class="status-proposta-col">
            <span class="status-proposta-kicker">Nome proposto</span>
            ${transversalCamada1}
            ${compareNovo}
          </div>
        </div>
        <p class="status-proposta-desc">${escapeHtml(item.descricaoProposta)}</p>
      </article>`;
  }

  function renderStatusCards(camada, atualMap) {
    return camada.status.map((item) => renderStatusCard(item, camada, atualMap)).join("");
  }

  function renderFluxoResumo(camada) {
    if (!camada.fluxoResumo?.length) return "";
    const chips = camada.fluxoResumo
      .map((passo, i) => {
        const arrow = i < camada.fluxoResumo.length - 1 ? '<span aria-hidden="true">→</span>' : "";
        return `<span class="status-fluxo-passo">${escapeHtml(passo)}</span>${arrow}`;
      })
      .join("");
    return `
      <div class="status-fluxo-resumo" aria-label="Sequência proposta">
        <span class="status-proposta-kicker">Sequência proposta</span>
        <div class="status-fluxo-track">${chips}</div>
      </div>`;
  }

  function renderTableRow(item, camada, atualMap) {
    const atual = atualMap[item.codigo];
    const nomeAtual = atual?.nome || "— (consultar banco)";
    const ordem = item.ordemProposta ?? atual?.ordem ?? "—";

    if (item.nomesPorTipo) {
      const cols = TIPOS.map((t) => `<td><strong>${escapeHtml(item.nomesPorTipo[t])}</strong></td>`).join("");
      const headTipos = `<th>Plano</th><th>Programa</th><th>Projeto</th>`;

      return {
        headTipos,
        row: `
        <tr>
          <td><code>${escapeHtml(item.codigo)}</code></td>
          <td>${escapeHtml(nomeAtual)}</td>
          <td><span class="status-camada-chip ${camada.css} status-camada-chip--inline">${escapeHtml(camadaCurta(camada.titulo))}</span></td>
          ${cols}
          <td class="status-revisao-desc">${escapeHtml(item.descricaoProposta)}</td>
          <td class="num">${escapeHtml(String(ordem))}</td>
        </tr>`,
      };
    }

    return {
      headTipos: `<th>Nome proposto</th>`,
      row: `
        <tr>
          <td><code>${escapeHtml(item.codigo)}</code></td>
          <td>${escapeHtml(nomeAtual)}</td>
          <td><span class="status-camada-chip ${camada.css} status-camada-chip--inline">${escapeHtml(camadaCurta(camada.titulo))}</span></td>
          <td><strong class="status-nome-proposto">${escapeHtml(labelProposto(item, camada))}</strong></td>
          <td class="status-revisao-desc">${escapeHtml(item.descricaoProposta)}</td>
          <td class="num">${escapeHtml(String(ordem))}</td>
        </tr>`,
    };
  }

  function renderCamada(camada, atualMap) {
    const tableParts = camada.status.map((item) => renderTableRow(item, camada, atualMap));
    const usaTipos = camada.status.some((s) => s.nomesPorTipo);
    const headTipos = usaTipos
      ? tableParts.find((p) => p.headTipos.includes("Plano"))?.headTipos ||
        `<th>Plano</th><th>Programa</th><th>Projeto</th>`
      : `<th>Nome proposto</th>`;
    const rows = tableParts.map((p) => p.row).join("");

    const prefixoHint =
      camada.id === "cadastro_analise"
        ? `<p class="hint">Prefixo de exibição: <strong>Demanda · …</strong></p>`
        : camada.id === "hierarquizacao" || camada.id === "pos_hierarquizado"
          ? `<p class="hint">Rótulos por tipo: <strong>Plano / Programa / Projeto · …</strong></p>`
          : "";

    return `
      <section class="status-camada-block card admin-card-nested" id="camada-${camada.id}">
        <header class="status-camada-block-head">
          <span class="status-camada-chip ${camada.css}">${escapeHtml(camada.titulo)}</span>
          <p class="status-camada-block-desc">${escapeHtml(camada.descricao)}</p>
          ${prefixoHint}
          ${renderFluxoResumo(camada)}
        </header>
        <div class="status-proposta-grid">${renderStatusCards(camada, atualMap)}</div>
        <details class="status-revisao-detalhe">
          <summary>Tabela comparativa</summary>
          <div class="admin-table-wrap">
            <table class="admin-table status-revisao-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome atual (banco)</th>
                  <th>Camada</th>
                  ${headTipos}
                  <th>Descrição proposta</th>
                  <th>Ordem</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </details>
      </section>`;
  }

  function renderOrfaos(atualMap) {
    const propostos = new Set();
    Object.values(PROPOSTA).forEach((c) => c.status.forEach((s) => propostos.add(s.codigo)));
    const orfaos = Object.keys(atualMap).filter((c) => !propostos.has(c));
    if (!orfaos.length) return "";

    const rows = orfaos
      .map(
        (codigo) => `
        <tr>
          <td><code>${escapeHtml(codigo)}</code></td>
          <td>${escapeHtml(atualMap[codigo].nome)}</td>
          <td colspan="4" class="hint">Status no banco ainda não classificado nesta proposta.</td>
        </tr>`
      )
      .join("");

    return `
      <section class="status-camada-block card admin-card-nested">
        <header class="status-camada-block-head">
          <span class="status-camada-chip status-camada-chip--warn">Fora da proposta</span>
          <p class="status-camada-block-desc">Registros em <code>dom_status_demanda</code> não mapeados acima.</p>
        </header>
        <div class="admin-table-wrap">
          <table class="admin-table status-revisao-table">
            <thead><tr><th>Código</th><th>Nome atual</th><th colspan="4">Observação</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }

  function mapAtual(statusList) {
    const m = {};
    (statusList || []).forEach((s) => {
      m[s.codigo] = s;
    });
    return m;
  }

  function renderPagina(atualMap) {
    const host = $("#revisao-camadas");
    const notas = $("#revisao-notas");
    if (!host) return;

    host.innerHTML =
      Object.values(PROPOSTA).map((c) => renderCamada(c, atualMap)).join("") + renderOrfaos(atualMap);

    if (notas) {
      notas.innerHTML = NOTAS.map((n) => `<li>${n}</li>`).join("");
    }
  }

  renderPagina({});

  async function enrichFromApi() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;

    await SLTAdminLabels.init("../");
    renderPagina(mapAtual(SLTAdminLabels.statusDemanda));

    const hint = $("#revisao-api-hint");
    if (hint) {
      hint.textContent = "Nomes atuais carregados do banco.";
      hint.classList.remove("hidden");
    }
  }

  enrichFromApi().catch((err) => {
    console.error(err);
    if (err.code === "UNAUTHORIZED") {
      location.replace(SLTAdminAuth.loginUrl());
      return;
    }
    const el = $("#revisao-erro");
    if (el) {
      el.textContent = `Proposta exibida offline. API: ${err.message}`;
      el.classList.remove("hidden");
    }
  });
})();
