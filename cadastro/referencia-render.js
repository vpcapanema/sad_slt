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

  function fontesHtml(fontes) {
    if (!fontes?.length) return "";
    return `<section class="ref-block ref-fontes"><h3>Fontes e referências</h3><ul class="ref-fontes-list">${fontes
      .map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.titulo)}</a></li>`)
      .join("")}</ul></section>`;
  }

  function renderDiretoriasPage(container) {
    const ref = referencia;
    let html = `<article class="ref-intro card ref-intro-short">
      <h2>Qual diretoria escolher?</h2>
      <p class="step-intro">Leia os critérios de cada diretoria e escolha onde a demanda se encaixa.</p>
    </article>`;

    html += `<nav class="ref-toc card ref-toc-compact" aria-label="Índice">
      <ol>${ref.diretorias.map((d) => `<li><a href="#${esc(d.id)}">${esc(d.nome_oficial)}</a></li>`).join("")}</ol>
    </nav>`;

    ref.diretorias.forEach((d) => {
      html += `<article class="ref-entity card ref-entity-compact" id="${esc(d.id)}">
        <header class="ref-entity-hdr">
          <h2>${esc(d.nome_oficial)}</h2>
        </header>
        <section class="ref-block ref-guide-yes ref-block-first">
          <h3>Cadastre nesta diretoria se…</h3>
          ${listHtml(d.cadastre_quando)}
        </section>
        <section class="ref-block ref-guide-no">
          <h3>Não cadastre nesta diretoria se…</h3>
          ${listHtml(d.nao_cadastre_quando)}
        </section>
        <div class="btn-row">
          <a class="btn btn-primary" href="${cadastroUrl({ diretoria: d.id })}">Usar esta diretoria no cadastro</a>
        </div>
      </article>`;
    });

    container.innerHTML = html;
  }

  function renderPlanosPage(container, options) {
    const ref = referencia;
    const filtro = options?.diretoriaId || "";
    let planos = ref.planos;
    if (filtro) planos = planos.filter((p) => p.diretoria_id === filtro);

    let html = `<article class="ref-intro card">
      <h2>Planos estratégicos da SLT</h2>
      <p class="ref-lead">O PLI-SP e o PEF-SP são <strong>planos estratégicos</strong> vinculados à Diretoria de Planejamento. A escolha do plano define como você classificará o projeto em seguida (frente PLI ou eixo PEF).</p>
      ${
        filtro
          ? `<p class="catalog-filter-note">Filtrado para diretoria <strong>${esc(
              ref.diretorias.find((d) => d.id === filtro)?.nome_oficial || filtro
            )}</strong>. <a href="catalogo-planos.html">Ver todos os planos</a></p>`
          : ""
      }
    </article>`;

    html += `<nav class="ref-toc card"><h2>Índice — Planos</h2><ol>${planos
      .map((p) => `<li><a href="#${esc(p.id)}">${esc(p.sigla)}</a></li>`)
      .join("")}</ol></nav>`;

    planos.forEach((p) => {
      const dir = ref.diretorias.find((d) => d.id === p.diretoria_id);
      const subItems = p.frentes || p.eixos || [];

      html += `<article class="ref-entity card" id="${esc(p.id)}">
        <header class="ref-entity-hdr">
          <span class="badge">${esc(p.sigla)}</span>
          <h2>${esc(p.nome_oficial)}</h2>
          <p class="ref-decreto">Horizonte ${esc(p.horizonte)} · ${esc(p.status_elaboracao)}</p>
        </header>
        <p class="ref-lead">${esc(p.sintese)}</p>
        <dl class="catalog-meta ref-meta">
          <dt>Diretoria</dt><dd><a href="catalogo-diretorias.html#${esc(p.diretoria_id)}">${esc(dir?.nome_oficial || p.diretoria_id)}</a></dd>
          <dt>Coordenação</dt><dd>${esc(p.coordenacao)}</dd>
          <dt>Classificação seguinte</dt><dd>${esc(p.classificacao_pos_cadastro)}</dd>
        </dl>

        <section class="ref-block"><h3>Objetivos estratégicos</h3>${listHtml(p.objetivos)}</section>

        ${
          p.etapas_elaboracao
            ? `<section class="ref-block"><h3>Etapas de elaboração (PLI)</h3>${listHtml(p.etapas_elaboracao)}</section>`
            : ""
        }

        ${
          p.relacao_pli_spi
            ? `<section class="ref-block"><h3>Relação PLI — PEF — SP nos Trilhos</h3><p>${esc(p.relacao_pli_spi)}</p></section>`
            : ""
        }

        <section class="ref-block ref-guide-yes"><h3>Cadastre neste plano quando…</h3>${listHtml(p.cadastre_quando)}</section>
        <section class="ref-block ref-guide-no"><h3>Não cadastre neste plano quando…</h3>${listHtml(p.nao_cadastre_quando)}</section>

        <section class="ref-block">
          <h3>${p.frentes ? "Frentes de atuação" : "Eixos ferroviários"} (${subItems.length})</h3>
          <p class="field-help">Referência densa: <a href="${p.frentes ? "catalogo-frentes-pli.html" : "catalogo-eixos-pef.html"}">${p.frentes ? "Frentes PLI" : "Eixos PEF e TIC"}</a></p>
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
          </div>
        </section>

        ${fontesHtml(p.fontes)}

        <div class="btn-row">
          <a class="btn btn-primary" href="${cadastroUrl({ diretoria: p.diretoria_id, plano: p.id })}">Usar ${esc(p.sigla)} no cadastro</a>
        </div>
      </article>`;
    });

    container.innerHTML = html;
  }

  function entityBlocks(item) {
    let html = "";
    if (item.contexto) html += `<section class="ref-block"><h3>Contexto</h3><p>${esc(item.contexto)}</p></section>`;
    if (item.desafios) html += `<section class="ref-block"><h3>Desafios que esta frente endereça</h3>${listHtml(item.desafios)}</section>`;
    if (item.modais_enfatizados) html += `<section class="ref-block"><h3>Modais enfatizados</h3>${listHtml(item.modais_enfatizados)}</section>`;
    if (item.cadastre_quando) html += `<section class="ref-block ref-guide-yes"><h3>Cadastre nesta classificação quando…</h3>${listHtml(item.cadastre_quando)}</section>`;
    if (item.nao_cadastre_quando) html += `<section class="ref-block ref-guide-no"><h3>Não use esta classificação quando…</h3>${listHtml(item.nao_cadastre_quando)}</section>`;
    if (item.exemplos_demandas) html += `<section class="ref-block"><h3>Exemplos de demandas</h3>${listHtml(item.exemplos_demandas)}</section>`;
    if (item.regioes_tipicas) html += `<section class="ref-block"><h3>Regiões / territórios típicos</h3>${listHtml(item.regioes_tipicas)}</section>`;
    if (item.interface_spi) html += `<section class="ref-block"><h3>Interface SP nos Trilhos (SPI)</h3><p>${esc(item.interface_spi)}</p></section>`;
    return html;
  }

  function renderFrentesPage(container) {
    const c = classificacao;
    let html = `<article class="ref-intro card">
      <h2>${esc(c.intro_pli.titulo)}</h2>
      <p class="ref-lead">${esc(c.intro_pli.sintese)}</p>
      <p class="field-help"><strong>Critério de escolha:</strong> ${esc(c.intro_pli.criterio_escolha)}</p>
      ${fontesHtml(c.intro_pli.fontes)}
    </article>`;

    html += `<nav class="ref-toc card"><h2>Índice — 6 frentes PLI</h2><ol>${c.frentes_pli
      .map((f) => `<li><a href="#${esc(f.id)}">${esc(f.nome)}</a></li>`)
      .join("")}</ol></nav>`;

    c.frentes_pli.forEach((f) => {
      html += `<article class="ref-entity card" id="${esc(f.id)}">
        <header class="ref-entity-hdr">
          <span class="badge">${esc(f.id)}</span>
          <h2>${esc(f.nome)}</h2>
        </header>
        <p class="ref-lead"><strong>Definição oficial PLI:</strong> ${esc(f.descricao_oficial)}</p>
        ${entityBlocks(f)}
        <div class="btn-row">
          <a class="btn btn-primary" href="${cadastroUrl({ plano: "PLANO-PLI", diretoria: "DIR-PLAN", frente: f.id, step: "3" })}">Usar ${esc(f.id)} no cadastro</a>
          <a class="btn btn-secondary" href="catalogo-planos.html#PLANO-PLI">Ver plano PLI-SP</a>
        </div>
      </article>`;
    });

    container.innerHTML = html;
  }

  function renderEixosPage(container) {
    const c = classificacao;
    let html = `<article class="ref-intro card">
      <h2>${esc(c.intro_pef.titulo)}</h2>
      <p class="ref-lead">${esc(c.intro_pef.sintese)}</p>
      <p class="field-help"><strong>Critério de escolha:</strong> ${esc(c.intro_pef.criterio_escolha)}</p>
      ${fontesHtml(c.intro_pef.fontes)}
    </article>`;

    html += `<nav class="ref-toc card"><h2>Índice — 7 eixos PEF</h2><ol>${c.eixos_pef
      .map((e) => `<li><a href="#${esc(e.id)}">${esc(e.nome)}</a></li>`)
      .join("")}</ol></nav>`;

    c.eixos_pef.forEach((e) => {
      html += `<article class="ref-entity card" id="${esc(e.id)}">
        <header class="ref-entity-hdr">
          <span class="badge">${esc(e.id)}</span>
          <h2>${esc(e.nome)}</h2>
        </header>
        <p class="ref-lead">${esc(e.descricao)}</p>
        ${entityBlocks(e)}
        <div class="btn-row">
          <a class="btn btn-primary" href="${cadastroUrl({ plano: "PLANO-PEF", diretoria: "DIR-PLAN", eixo: e.id, step: "3" })}">Usar ${esc(e.id)} no cadastro</a>
        </div>
      </article>`;

      if (e.id === "EIXO-PEF-02") {
        html += `<section class="card ref-tic-section" id="corredores-tic">
          <h2>Corredores TIC (subnível opcional)</h2>
          <p class="hint">Quando o eixo é Trens Intercidades, o demandante pode especificar o corredor TIC se a geometria e o escopo do projeto permitirem identificá-lo.</p>
          <div class="ref-subgrid">`;
        c.corredores_tic.forEach((tic) => {
          html += `<div class="ref-subcard" id="${esc(tic.id)}">
            <h4>${esc(tic.nome)}</h4>
            <p><strong>Ligação:</strong> ${esc(tic.ligacao)}</p>
            <p>${esc(tic.contexto)}</p>
            <p class="field-help"><strong>Quando especificar:</strong> ${esc(tic.quando_especificar)}</p>
            <a class="link-catalogo" href="${cadastroUrl({ plano: "PLANO-PEF", diretoria: "DIR-PLAN", eixo: "EIXO-PEF-02", corredor_tic: tic.id, step: "3" })}">Cadastrar com ${esc(tic.id)}</a>
          </div>`;
        });
        html += `</div></section>`;
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
