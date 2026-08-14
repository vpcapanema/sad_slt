(function () {
  "use strict";
  const $ = (s) => document.querySelector(s),
    esc = (v) =>
      String(v ?? "—").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  let biblioteca, metricas;
  const CAMADAS = {
    cavidades_influencia: "cavidades_influencia",
    inundacao: "Suscetibilidade a inundação",
    movimento_massa: "Suscetibilidade a movimentos de massa",
    aprm_alto_juquery: "aprm_alto_juquery",
    aprm_alto_tiete_cabec: "aprm_alto_tiete_cabec",
    aprm_billings: "aprm_billings",
    aprm_guarapiranga: "aprm_guarapiranga",
    areas_contaminadas_cetesb: "areas_contaminadas_cetesb",
    areas_restricao_cetesb: "areas_restricao_cetesb",
    assentamentos_sp: "assentamentos_sp",
    bens_tombados_condephaat: "bens_tombados_condephaat",
    bens_tombados_iphan_sp: "bens_tombados_iphan_sp",
    embargos_estaduais_sigam: "embargos_estaduais_sigam",
    embargos_ibama_ativos_sp: "embargos_ibama_ativos_sp",
    manguezais_ibama_sp: "manguezais_ibama_sp",
    quilombos_sp: "quilombos_sp",
    sitios_arqueologicos: "sitios_arqueologicos",
    terras_indigenas_sp: "terras_indigenas_sp",
    ucs_protecao_integral_estadual_sp: "ucs_protecao_integral_estadual_sp",
    ucs_protecao_integral_federal_sp: "ucs_protecao_integral_federal_sp",
    ucs_uso_sustentavel_estadual_sp: "ucs_uso_sustentavel_estadual_sp",
    ucs_uso_sustentavel_federal_sp: "ucs_uso_sustentavel_federal_sp",
  };
  function refs(m) {
    return (
      (m.referencias || [])
        .map((id) => metricas.referencias[id])
        .filter(Boolean)
        .map(
          (r) =>
            `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.titulo)}</a>`,
        )
        .join("<br>") || "Não informada"
    );
  }
  const COMPONENTES = [
    "sensibilidade_meio",
    "complexidade_licenciamento",
    "complexidade_tecnica",
    "incerteza_decisoria",
  ];
  const NOTACAO_COMPONENTES = {
    sensibilidade_meio: "SMA",
    complexidade_licenciamento: "CL",
    complexidade_tecnica: "CTM",
    incerteza_decisoria: "ID",
  };
  const numeroPtBr = (valor, casas = 2) =>
    Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas,
    });
  function componente(m, id) {
    const indiceComponente = COMPONENTES.indexOf(id),
      escore = Number(m.escores_componentes?.[indiceComponente]),
      c =
        m.componentes_risco?.[id] ||
        (Number.isFinite(escore)
          ? {
              valor_absoluto: `Nível ${escore}/4`,
              normalizado: escore / 4,
            }
          : null);
    if (
      !c ||
      c.valor_absoluto == null ||
      !Number.isFinite(Number(c.normalizado))
    )
      return '<span class="fase1-pending">Não parametrizado</span>';
    const unidade = c.unidade ? ` ${esc(c.unidade)}` : "",
      sigla = NOTACAO_COMPONENTES[id],
      nivel = Number.isFinite(escore) ? escore : Number(c.valor_absoluto),
      prazo =
        id === "complexidade_licenciamento" && m.prazo_dias
          ? `<br><small>Prazo normativo: ${esc(m.prazo_dias)} dias</small>`
          : "";
    return `<strong><var>${sigla}<sub>i</sub></var> = ${numeroPtBr(nivel)}${unidade}</strong><br><small><var>${sigla}<sub>i</sub><sup>*</sup></var> = ${numeroPtBr(c.normalizado)}</small>${prazo}`;
  }
  function indiceRisco(m) {
    const cs = m.componentes_risco || {},
      valores = COMPONENTES.map((id, i) =>
        Number(cs[id]?.normalizado ?? Number(m.escores_componentes?.[i]) / 4),
      );
    if (valores.some((v) => !Number.isFinite(v)))
      return '<span class="fase1-pending">Não calculável</span>';
    const pesos = m.pesos_componentes || {},
      somaPesos = COMPONENTES.reduce((s, id) => s + Number(pesos[id] ?? 1), 0);
    if (somaPesos <= 0)
      return '<span class="fase1-pending">Pesos inválidos</span>';
    const indice =
      (COMPONENTES.reduce(
        (s, id, i) => s + valores[i] * Number(pesos[id] ?? 1),
        0,
      ) /
        somaPesos) *
      100;
    return `<strong><var>IRc<sub>i</sub></var> = ${numeroPtBr(indice)}</strong><small>Escala normalizada: 0–100</small>`;
  }
  function classificacao(m) {
    return m.restricao_direta ? "Restrição" : "Risco";
  }
  function corresponde(c, m, term, tipo) {
    return (
      (!tipo || classificacao(m) === tipo) &&
      (!term ||
        `${classificacao(m)} ${CAMADAS[c.id] || ""} ${c.nome}`
          .toLowerCase()
          .includes(term))
    );
  }
  function render() {
    const buscaEl = $("#criterio-busca"),
      tipoEl = $("#criterio-tipo"),
      tabelaEl = $("#criterios-tabela");
    if (!buscaEl || !tipoEl || !tabelaEl) return;
    const term = buscaEl.value.toLowerCase(),
      tipo = tipoEl.value;
    const xs = biblioteca.criterios.filter((c) => {
      const m = metricas.criterios[c.id] || {};
      return corresponde(c, m, term, tipo);
    });
    tabelaEl.innerHTML =
      xs
        .map((c) => {
          const m = metricas.criterios[c.id] || {},
            classe = classificacao(m),
            restricao = classe === "Restrição",
            celulas = restricao
              ? COMPONENTES.map(
                  () => '<td><span class="fase1-na">Não se aplica</span></td>',
                ).join("")
              : COMPONENTES.map((id) => `<td>${componente(m, id)}</td>`).join(
                  "",
                );
          return `<tr><td><span class="fase1-classification fase1-classification--${restricao ? "restriction" : "risk"}">${classe}</span></td><td><strong>${esc(CAMADAS[c.id] || c.dimensao)}</strong></td><td>${esc(c.nome)}</td>${celulas}<td class="fase1-score">${restricao ? "Restrição booleana" : indiceRisco(m)}</td><td>${refs(m)}</td></tr>`;
        })
        .join("") ||
      '<tr><td colspan="9">Nenhum critério encontrado.</td></tr>';
  }
  function cfg() {
    const pesos = {};
    document
      .querySelectorAll("[data-peso]")
      .forEach((i) => (pesos[i.dataset.peso] = Number(i.value)));
    return {
      nome: $("#nome-configuracao").value.trim(),
      codigo: $("#codigo-configuracao").value.trim(),
      versao: $("#versao-metodologia").value.trim(),
      pesos,
    };
  }
  function preview() {
    const c = cfg(),
      ok =
        c.nome &&
        c.codigo &&
        c.versao &&
        Object.values(c.pesos).some((v) => v > 0);
    $("#limiares-validacao").textContent = ok
      ? "Configuração coerente."
      : "Revise identificação e pesos.";
    $("#limiares-validacao").className =
      `gerador-feedback ${ok ? "is-success" : "is-error"}`;
    return ok;
  }
  async function salvar() {
    if (!preview()) return;
    const c = cfg(),
      body = {
        codigo: c.codigo,
        nome: c.nome,
        descricao: `Classificação binária de risco e restrição · biblioteca ${biblioteca.versao}`,
        parametros: {
          pesos: c.pesos,
          normalizacao: metricas.normalizacao,
          risco: {
            classes: [
              {
                codigo: "risco",
                rotulo: "Risco",
                minimo: 0,
                maximo: 100,
              },
            ],
          },
          restricao: {
            regra: "ato_vigente * intersecao_validada * aplicabilidade",
            valor_confirmado: 1,
          },
          biblioteca_versao: biblioteca.versao,
          metricas_versao: metricas.versao,
          versao_metodologica: c.versao,
        },
      };
    try {
      const r = await fetch("/api/ahp/hierarquizacoes/fatiamentos/fase1", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw Error(b.detail || `HTTP ${r.status}`);
      }
      localStorage.setItem(
        "sicard:fase1:metodologia",
        JSON.stringify({
          ...body.parametros,
          nome: c.nome,
          codigo: c.codigo,
          versao: c.versao,
          validada_em: new Date().toISOString(),
        }),
      );
      $("#validar-metodologia").textContent = "Configuração salva";
    } catch (e) {
      $("#limiares-validacao").textContent = `Falha ao salvar: ${e.message}`;
      $("#limiares-validacao").className = "gerador-feedback is-error";
    }
  }
  async function init() {
    const [b, m] = await Promise.all([
      fetch("/data/geoespacial/biblioteca_criterios_risco_restricao.json", {
        cache: "no-store",
      }),
      fetch("/data/geoespacial/metricas_criterios_risco_restricao.json", {
        cache: "no-store",
      }),
    ]);
    biblioteca = await b.json();
    metricas = await m.json();
    const versaoEl = $("#biblioteca-versao");
    if (versaoEl)
      versaoEl.textContent = `Versão ${biblioteca.versao} · métricas ${metricas.versao}`;
    if ($("#criterios-tabela")) render();
    preview();
    if ($("#criterio-busca")) $("#criterio-busca").oninput = render;
    if ($("#criterio-tipo")) $("#criterio-tipo").onchange = render;
    document
      .querySelectorAll("input,[data-peso]")
      .forEach((i) => (i.oninput = preview));
    $("#validar-metodologia").onclick = salvar;
  }
  init().catch((e) => {
    const tabela = $("#criterios-tabela");
    if (tabela)
      tabela.innerHTML = `<tr><td colspan="9">${esc(e.message)}</td></tr>`;
  });
})();
