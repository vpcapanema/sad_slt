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

  /** Modelo de fases e rótulos — espelha demandas.dom_status_demanda (migração 030). */
  const PROPOSTA = {
    cadastro_analise: {
      id: "cadastro_analise",
      titulo: "Fase 1 — Cadastro e análise",
      descricao:
        "Enquanto a entidade ainda é demanda: cadastro, análise e parecer de factibilidade. Após aprovação, deixa de ser demanda e passa a plano, programa ou projeto.",
      prefixo: "Demanda",
      css: "status-camada-chip--1",
      status: [
        {
          codigo: "analise_rascunho",
          nomeProposto: "Em rascunho",
          descricaoProposta: "Cadastro iniciado, ainda não submetido à análise.",
        },
        {
          codigo: "analise_em_avaliacao",
          nomeProposto: "Em análise",
          descricaoProposta: "Equipe avalia factibilidade e consistência do cadastro.",
        },
        {
          codigo: "analise_aprovada",
          nomeProposto: "Aprovada",
          descricaoProposta:
            "Parecer positivo — apta a virar objeto. Handoff via Aprovar para apta à hierarquização.",
        },
        {
          codigo: "analise_reprovada",
          nomeProposto: "Reprovada na análise",
          descricaoProposta: "Parecer negativo na análise de cadastro.",
        },
        {
          codigo: "analise_suspensa",
          nomeProposto: "Análise suspensa",
          descricaoProposta: "Análise temporariamente pausada.",
        },
        {
          codigo: "analise_cancelada",
          nomeProposto: "Cadastro cancelado",
          descricaoProposta: "Encerrada na fase de análise, sem seguir para hierarquização.",
        },
      ],
    },
    hierarquizacao: {
      id: "hierarquizacao",
      titulo: "Fase 2 — Hierarquização e ranqueamento",
      descricao:
        "Demanda aprovada vira objeto e segue para hierarquização da favorabilidade. Rótulos variam por tipo (plano/programa/projeto).",
      css: "status-camada-chip--2",
      fluxoResumo: [
        "Apta à hierarquização",
        "Em hierarquização",
        "Hierarquização concluída",
        "Ranqueada (publicada)",
      ],
      status: [
        {
          codigo: "hierarq_apta",
          ordemProposta: 1,
          nomesPorTipo: {
            plano: "Plano apto à hierarquização",
            programa: "Programa apto à hierarquização",
            projeto: "Projeto apto à hierarquização",
          },
          descricaoProposta: "Apto a compor o universo comparável (handoff da Aprovada).",
        },
        {
          codigo: "hierarq_em_andamento",
          ordemProposta: 2,
          nomesPorTipo: {
            plano: "Plano em hierarquização",
            programa: "Programa em hierarquização",
            projeto: "Projeto em hierarquização",
          },
          descricaoProposta: "Participando ativamente da comparação AHP na rodada.",
        },
        {
          codigo: "hierarq_finalizada",
          ordemProposta: 3,
          nomesPorTipo: {
            plano: "Plano hierarquizado (não publicado)",
            programa: "Programa hierarquizado (não publicado)",
            projeto: "Projeto hierarquizado (não publicado)",
          },
          descricaoProposta: "Hierarquização concluída e salva no banco, ainda não publicada.",
        },
        {
          codigo: "hierarq_ranqueada",
          ordemProposta: 4,
          nomesPorTipo: {
            plano: "Plano ranqueado",
            programa: "Programa ranqueado",
            projeto: "Projeto ranqueado",
          },
          descricaoProposta: "Ranking publicado na página pública oficial.",
        },
        {
          codigo: "hierarq_suspensa",
          nomesPorTipo: {
            plano: "Plano suspenso na hierarquização",
            programa: "Programa suspenso na hierarquização",
            projeto: "Projeto suspenso na hierarquização",
          },
          descricaoProposta: "Pausa temporária durante a hierarquização.",
        },
        {
          codigo: "hierarq_retirada",
          nomesPorTipo: {
            plano: "Plano retirado do ranking",
            programa: "Programa retirado do ranking",
            projeto: "Projeto retirado do ranking",
          },
          descricaoProposta: "Removida do universo de hierarquização.",
        },
      ],
    },
    execucao: {
      id: "execucao",
      titulo: "Fase 3 — Pós-ranqueamento e execução",
      descricao:
        "Após o ranqueamento, status globais genéricos de execução do objeto.",
      css: "status-camada-chip--pos",
      fluxoResumo: ["Em execução", "Finalizada", "Suspensa · Cancelada"],
      status: [
        {
          codigo: "exec_em_execucao",
          ordemProposta: 1,
          nomesPorTipo: {
            plano: "Plano em execução",
            programa: "Programa em execução",
            projeto: "Projeto em execução",
          },
          descricaoProposta: "Aprovado no ranking e em implementação operacional.",
        },
        {
          codigo: "exec_finalizada",
          ordemProposta: 2,
          nomesPorTipo: {
            plano: "Plano finalizado",
            programa: "Programa finalizado",
            projeto: "Projeto finalizado",
          },
          descricaoProposta: "Execução concluída com êxito.",
        },
        {
          codigo: "exec_suspensa",
          nomesPorTipo: {
            plano: "Plano com execução suspensa",
            programa: "Programa com execução suspensa",
            projeto: "Projeto com execução suspensa",
          },
          descricaoProposta: "Execução temporariamente pausada.",
        },
        {
          codigo: "exec_cancelada",
          nomesPorTipo: {
            plano: "Plano cancelado",
            programa: "Programa cancelado",
            projeto: "Projeto cancelado",
          },
          descricaoProposta: "Encerrado antes da conclusão da execução.",
        },
      ],
    },
  };

  const NOTAS = [
    "Três fases: <strong>cadastro_analise</strong> · <strong>hierarquizacao</strong> · <strong>execucao</strong> (coluna <code>fase</code>).",
    "Não há status «transversais»: suspensão/retirada têm código próprio em cada fase (<code>analise_suspensa</code>, <code>hierarq_suspensa</code>, <code>hierarq_retirada</code>, <code>exec_suspensa</code>).",
    "Aprovação dedicada: <code>analise_aprovada</code> / <code>analise_em_avaliacao</code> → <code>hierarq_apta</code> via POST /aprovar.",
    "Distinção da Fase 2: <code>hierarq_finalizada</code> = salva no banco (privada); <code>hierarq_ranqueada</code> = publicada no ranking público.",
    "Fase 1: prefixo <strong>Demanda</strong>. Fases 2 e 3: rótulos por tipo <strong>Plano / Programa / Projeto</strong>.",
    "Modelo aplicado pela migração SQL <code>030_status_fases.sql</code> em <code>dom_status_demanda</code>.",
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
    return titulo.replace(/^Fase \d+ — /, "");
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
        : camada.id === "hierarquizacao" || camada.id === "execucao"
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
                  <th>Fase</th>
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
