(function (global) {
  let referencia = null;
  let classificacao = null;

  async function loadReferencia(basePath) {
    const base = basePath || "../";
    if (!referencia) {
      const res = await fetch(base + "data/referencia-institucional.json");
      if (!res.ok) throw new Error("Não foi possível carregar a referência institucional.");
      referencia = await res.json();
    }
    if (!classificacao) {
      const res2 = await fetch(base + "data/referencia-classificacao.json");
      if (!res2.ok) throw new Error("Não foi possível carregar a referência de classificação.");
      classificacao = await res2.json();
    }
    return referencia;
  }

  function getClassificacao() {
    return classificacao;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cadastroUrl(params) {
    return "index.html?" + new URLSearchParams(params).toString();
  }

  function listHtml(items, cls) {
    if (!items?.length) return "";
    return `<ul class="${cls || "ref-list"}">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
  }

  function sectionLabel(title, icon, extraClass) {
    const cls = ["pli-section-label", extraClass].filter(Boolean).join(" ");
    return `<div class="${cls}"><i class="fas ${icon}" aria-hidden="true"></i><span class="pli-section-title">${title}</span></div>`;
  }

  function entityHeader(title, icon, opts) {
    const badge = opts?.badge;
    const meta = opts?.meta;
    let hdr = `<div class="pli-section-label"><i class="fas ${icon}" aria-hidden="true"></i><span class="pli-section-title">${esc(title)}</span>`;
    if (badge) hdr += `<span class="badge">${esc(badge)}</span>`;
    hdr += "</div>";
    if (meta) hdr += `<p class="ref-entity-badge-meta">${meta}</p>`;
    return hdr;
  }

  function blockSection(title, icon, bodyHtml, extraBlockClass) {
    const blockCls = ["ref-block", extraBlockClass].filter(Boolean).join(" ");
    return `<section class="${blockCls}">${sectionLabel(title, icon, "pli-section-label--sub")}<div class="ref-block-inner">${bodyHtml}</div></section>`;
  }

  function introCard(title, icon, bodyHtml, extraClass) {
    const cls = ["ref-intro", "card", "ref-card", extraClass].filter(Boolean).join(" ");
    return `<article class="${cls}">${sectionLabel(title, icon)}<div class="ref-card-body">${bodyHtml}</div></article>`;
  }

  function tocCard(title, icon, itemsHtml, extraClass) {
    const cls = ["ref-toc", "card", "ref-card", extraClass].filter(Boolean).join(" ");
    return `<nav class="${cls}" aria-label="Índice">${sectionLabel(title, icon)}<div class="ref-card-body"><ol>${itemsHtml}</ol></div></nav>`;
  }

  function entityCard(id, headerHtml, bodyHtml, extraClass) {
    const cls = ["ref-entity", "card", "ref-card", extraClass].filter(Boolean).join(" ");
    const idAttr = id ? ` id="${esc(id)}"` : "";
    return `<article class="${cls}"${idAttr}>${headerHtml}<div class="ref-card-body">${bodyHtml}</div></article>`;
  }

  function fontesHtml(fontes) {
    if (!fontes?.length) return "";
    const body = `<ul class="ref-fontes-list">${fontes
      .map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a></li>`)
      .join("")}</ul>`;
    return blockSection("Fontes e referências", "fa-book", body, "ref-fontes");
  }

  function renderDiretoriasPage(container) {
    const ref = referencia;
    let html = introCard(
      "Qual diretoria escolher?",
      "fa-circle-info",
      `<p class="step-intro">Leia os critérios de cada diretoria e escolha onde a demanda se encaixa.</p>`,
      "ref-intro-short"
    );

    html += tocCard(
      "Índice — Diretorias",
      "fa-list",
      ref.diretorias.map((d) => `<li><a href="#${esc(d.id)}">${esc(d.nome_oficial)}</a></li>`).join(""),
      "ref-toc-compact"
    );

    ref.diretorias.forEach((d) => {
      html += entityCard(
        d.id,
        entityHeader(d.nome_oficial, "fa-building"),
        `${blockSection("Cadastre nesta diretoria se…", "fa-circle-check", listHtml(d.cadastre_quando), "ref-guide-yes ref-block-first")}
        ${blockSection("Não cadastre nesta diretoria se…", "fa-circle-xmark", listHtml(d.nao_cadastre_quando), "ref-guide-no")}
        <div class="btn-row">
          <a class="btn btn-primary" href="${cadastroUrl({ diretoria: d.id })}">Usar esta diretoria no cadastro</a>
        </div>`,
        "ref-entity-compact"
      );
    });

    container.innerHTML = html;
  }

  function renderPlanosPage(container, options) {
    const ref = referencia;
    const filtro = options?.diretoriaId || "";
    let planos = ref.planos;
    if (filtro) planos = planos.filter((p) => p.diretoria_id === filtro);

    let html = introCard(
      "Planos estratégicos da SLT",
      "fa-map",
      `<p class="ref-lead">O PLI-SP e o PEF-SP são <strong>planos estratégicos</strong> vinculados à Diretoria de Planejamento. A escolha do plano define como você classificará o projeto em seguida (frente PLI ou eixo PEF).</p>
      ${
        filtro
          ? `<p class="catalog-filter-note">Filtrado para diretoria <strong>${esc(
              ref.diretorias.find((d) => d.id === filtro)?.nome_oficial || filtro
            )}</strong>. <a href="catalogo-planos.html">Ver todos os planos</a></p>`
          : ""
      }`
    );

    if (!planos.length) {
      const dirNome = filtro ? ref.diretorias.find((d) => d.id === filtro)?.nome_oficial || filtro : "";
      html += entityCard(
        "",
        entityHeader("Nenhum plano vinculado", "fa-circle-info"),
        `${blockSection(
          "Orientação",
          "fa-circle-info",
          `<p>${
            filtro
              ? `A diretoria <strong>${esc(dirNome)}</strong> não possui planos estratégicos vinculados.`
              : "Não há planos cadastrados no momento."
          } Os planos estratégicos (PLI-SP 2050 e PEF-SP 2050) pertencem à <strong>Diretoria de Planejamento</strong>.</p>`,
          "ref-guide-no ref-block-first"
        )}
        <div class="btn-row">
          <a class="btn btn-primary" href="catalogo-planos.html">Ver todos os planos</a>
        </div>`
      );
      container.innerHTML = html;
      return;
    }

    html += tocCard(
      "Índice — Planos",
      "fa-list",
      planos.map((p) => `<li><a href="#${esc(p.id)}">${esc(p.sigla)}</a></li>`).join("")
    );

    planos.forEach((p) => {
      const dir = ref.diretorias.find((d) => d.id === p.diretoria_id);
      const subItems = p.frentes || p.eixos || [];

      html += entityCard(
        p.id,
        entityHeader(p.nome_oficial, "fa-map", {
          badge: p.sigla,
          meta: `Horizonte ${esc(p.horizonte)} · ${esc(p.status_elaboracao)}`,
        }),
        `<p class="ref-lead">${esc(p.sintese)}</p>
        <dl class="catalog-meta ref-meta">
          <dt>Diretoria</dt><dd><a href="catalogo-diretorias.html#${esc(p.diretoria_id)}">${esc(dir?.nome_oficial || p.diretoria_id)}</a></dd>
          <dt>Coordenação</dt><dd>${esc(p.coordenacao)}</dd>
          <dt>Classificação seguinte</dt><dd>${esc(p.classificacao_pos_cadastro)}</dd>
        </dl>

        ${blockSection("Objetivos estratégicos", "fa-bullseye", listHtml(p.objetivos))}

        ${
          p.etapas_elaboracao
            ? blockSection("Etapas de elaboração (PLI)", "fa-list-check", listHtml(p.etapas_elaboracao))
            : ""
        }

        ${
          p.relacao_pli_spi
            ? blockSection("Relação PLI — PEF — SP nos Trilhos", "fa-link", `<p>${esc(p.relacao_pli_spi)}</p>`)
            : ""
        }

        ${blockSection("Cadastre neste plano quando…", "fa-circle-check", listHtml(p.cadastre_quando), "ref-guide-yes")}
        ${blockSection("Não cadastre neste plano quando…", "fa-circle-xmark", listHtml(p.nao_cadastre_quando), "ref-guide-no")}

        ${blockSection(
          `${p.frentes ? "Frentes de atuação" : "Eixos ferroviários"} (${subItems.length})`,
          "fa-tags",
          `<div class="field-help-row">
            <a class="link-catalogo" href="${p.frentes ? "catalogo-frentes-pli.html" : "catalogo-eixos-pef.html"}" target="_blank" rel="noopener">Consulte ${p.frentes ? "as frentes PLI" : "os eixos PEF e TIC"} ↗</a>
          </div>
          <div class="ref-subgrid">
            ${subItems
              .map(
                (item) => `<div class="ref-subcard">
                  <h4>${esc(item.nome)}</h4>
                  <p>${esc(item.descricao || item.descricao_oficial)}</p>
                  ${item.nota ? `<p class="field-help">${esc(item.nota)}</p>` : ""}
                  ${item.exemplos ? `<p class="ref-ex-label">Exemplos:</p>${listHtml(item.exemplos, "ref-list ref-list-compact")}` : ""}
                </div>`
              )
              .join("")}
          </div>`
        )}

        ${fontesHtml(p.fontes)}

        <div class="btn-row">
          <a class="btn btn-primary" href="${cadastroUrl({ diretoria: p.diretoria_id, plano: p.id })}">Usar ${esc(p.sigla)} no cadastro</a>
        </div>`
      );
    });

    container.innerHTML = html;
  }

  function entityBlocks(item) {
    let html = "";
    if (item.contexto) html += blockSection("Contexto", "fa-file-lines", `<p>${esc(item.contexto)}</p>`);
    if (item.desafios) html += blockSection("Desafios que esta frente endereça", "fa-triangle-exclamation", listHtml(item.desafios));
    if (item.modais_enfatizados) html += blockSection("Modais enfatizados", "fa-train", listHtml(item.modais_enfatizados));
    if (item.cadastre_quando) html += blockSection("Cadastre nesta classificação quando…", "fa-circle-check", listHtml(item.cadastre_quando), "ref-guide-yes");
    if (item.nao_cadastre_quando) html += blockSection("Não use esta classificação quando…", "fa-circle-xmark", listHtml(item.nao_cadastre_quando), "ref-guide-no");
    if (item.exemplos_demandas) html += blockSection("Exemplos de demandas", "fa-lightbulb", listHtml(item.exemplos_demandas));
    if (item.regioes_tipicas) html += blockSection("Regiões / territórios típicos", "fa-map-location-dot", listHtml(item.regioes_tipicas));
    if (item.interface_spi) html += blockSection("Interface SP nos Trilhos (SPI)", "fa-route", `<p>${esc(item.interface_spi)}</p>`);
    return html;
  }

  function renderFrentesPage(container) {
    const c = classificacao;
    let html = introCard(
      esc(c.intro_pli.titulo),
      "fa-tags",
      `<p class="ref-lead">${esc(c.intro_pli.sintese)}</p>
      <p class="field-help"><strong>Critério de escolha:</strong> ${esc(c.intro_pli.criterio_escolha)}</p>
      ${fontesHtml(c.intro_pli.fontes)}`
    );

    html += tocCard(
      "Índice — 6 frentes PLI",
      "fa-list",
      c.frentes_pli.map((f) => `<li><a href="#${esc(f.id)}">${esc(f.nome)}</a></li>`).join("")
    );

    c.frentes_pli.forEach((f) => {
      html += entityCard(
        f.id,
        entityHeader(f.nome, "fa-tags", { badge: f.id }),
        `<p class="ref-lead"><strong>Definição oficial PLI:</strong> ${esc(f.descricao_oficial)}</p>
        ${entityBlocks(f)}
        <div class="btn-row">
          <a class="btn btn-primary" href="${cadastroUrl({ plano: "PLANO-PLI", diretoria: "DIR-PLAN", frente: f.id, step: "3" })}">Usar ${esc(f.id)} no cadastro</a>
          <a class="btn btn-secondary" href="catalogo-planos.html#PLANO-PLI">Ver plano PLI-SP</a>
        </div>`
      );
    });

    container.innerHTML = html;
  }

  function renderEixosPage(container) {
    const c = classificacao;
    let html = introCard(
      esc(c.intro_pef.titulo),
      "fa-train",
      `<p class="ref-lead">${esc(c.intro_pef.sintese)}</p>
      <p class="field-help"><strong>Critério de escolha:</strong> ${esc(c.intro_pef.criterio_escolha)}</p>
      ${fontesHtml(c.intro_pef.fontes)}`
    );

    html += tocCard(
      "Índice — 7 eixos PEF",
      "fa-list",
      c.eixos_pef.map((e) => `<li><a href="#${esc(e.id)}">${esc(e.nome)}</a></li>`).join("")
    );

    c.eixos_pef.forEach((e) => {
      html += entityCard(
        e.id,
        entityHeader(e.nome, "fa-train", { badge: e.id }),
        `<p class="ref-lead">${esc(e.descricao)}</p>
        ${entityBlocks(e)}
        <div class="btn-row">
          <a class="btn btn-primary" href="${cadastroUrl({ plano: "PLANO-PEF", diretoria: "DIR-PLAN", eixo: e.id, step: "3" })}">Usar ${esc(e.id)} no cadastro</a>
        </div>`
      );

      if (e.id === "EIXO-PEF-02") {
        html += `<section class="card ref-tic-section ref-card" id="corredores-tic">
          ${sectionLabel("Corredores TIC (subnível opcional)", "fa-train-subway")}
          <div class="ref-card-body">
            <p class="hint">Quando o eixo é Trens Intercidades, o demandante pode especificar o corredor TIC se a geometria e o escopo do projeto permitirem identificá-lo.</p>
            <div class="ref-subgrid">`;
        c.corredores_tic.forEach((tic) => {
          html += `<div class="ref-subcard" id="${esc(tic.id)}">
            <h4>${esc(tic.nome)}</h4>
            <p><strong>Ligação:</strong> ${esc(tic.ligacao)}</p>
            <p>${esc(tic.contexto)}</p>
            <p class="field-help"><strong>Quando especificar:</strong> ${esc(tic.quando_especificar)}</p>
            <div class="field-help-row">
              <a class="link-catalogo" href="${cadastroUrl({ plano: "PLANO-PEF", diretoria: "DIR-PLAN", eixo: "EIXO-PEF-02", corredor_tic: tic.id, step: "3" })}">Cadastrar com ${esc(tic.id)} ↗</a>
            </div>
          </div>`;
        });
        html += `</div></div></section>`;
      }
    });

    container.innerHTML = html;
  }

  global.SLTReferencia = {
    loadReferencia,
    getClassificacao,
    renderDiretoriasPage,
    renderPlanosPage,
    renderFrentesPage,
    renderEixosPage,
    cadastroUrl,
  };
})(window);
