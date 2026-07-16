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
    uc_pi_estadual: "Unidades de Conservação de Proteção Integral estaduais",
    uc_pi_federal: "Unidades de Conservação de Proteção Integral federais",
    uc_us_estadual: "Unidades de Conservação de Uso Sustentável estaduais",
    uc_us_federal: "Unidades de Conservação de Uso Sustentável federais",
    za_uc_estadual: "Zonas de amortecimento de UC estaduais",
    za_uc_federal: "Zonas de amortecimento de UC federais",
    vegetacao_protegida: "Vegetação nativa protegida",
    aprm: "Áreas de proteção e recuperação de mananciais",
    ecossistema_costeiro: "Ecossistemas costeiros sensíveis",
    cavidade_demais: "Cavidades naturais subterrâneas",
    cavidade_maxima: "Cavidades naturais de relevância máxima",
    terra_indigena: "Terras Indígenas",
    territorio_quilombola: "Territórios quilombolas",
    area_contaminada: "Áreas contaminadas",
    inundacao: "Suscetibilidade a inundação",
    movimento_massa: "Suscetibilidade a movimentos de massa",
    bem_tombado: "Bens tombados e áreas envoltórias",
    sitio_arqueologico: "Sítios arqueológicos",
    assentamento: "Assentamentos e regimes fundiários",
    servidao: "Faixas de domínio e servidões",
    embargo_ibama: "Áreas embargadas pelo IBAMA",
    embargo_estadual: "Áreas sob embargo ambiental estadual",
    interdicao_cetesb: "Áreas ou estabelecimentos interditados pela CETESB",
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
    const term = $("#criterio-busca").value.toLowerCase(),
      tipo = $("#criterio-tipo").value;
    const xs = biblioteca.criterios.filter((c) => {
      const m = metricas.criterios[c.id] || {};
      return corresponde(c, m, term, tipo);
    });
    $("#criterios-tabela").innerHTML =
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
      metodo: $("#metodologia-fatiamento").value,
      baixo: Number($("#limiar-baixo").value),
      alto: Number($("#limiar-medio").value),
      pesos,
    };
  }
  function preview() {
    const c = cfg(),
      ok =
        c.nome &&
        c.codigo &&
        c.versao &&
        c.baixo > 0 &&
        c.alto > c.baixo &&
        c.alto < 100 &&
        Object.values(c.pesos).some((v) => v > 0);
    $("#faixas-preview").innerHTML =
      `<div data-level="1"><b>Risco baixo</b><span>0 a &lt; ${c.baixo}</span></div><div data-level="2"><b>Risco médio</b><span>${c.baixo} a &lt; ${c.alto}</span></div><div data-level="3"><b>Risco alto</b><span>${c.alto} a 100</span></div>`;
    $("#limiares-validacao").textContent = ok
      ? "Configuração coerente."
      : "Revise identificação, cortes e pesos.";
    $("#limiares-validacao").className =
      `gerador-feedback ${ok ? "is-success" : "is-error"}`;
    return ok;
  }
  function metodo() {
    if ($("#metodologia-fatiamento").value === "intervalos_iguais") {
      $("#limiar-baixo").value = 33.33;
      $("#limiar-medio").value = 66.67;
    }
    preview();
  }
  async function salvar() {
    if (!preview()) return;
    const c = cfg(),
      body = {
        codigo: c.codigo,
        nome: c.nome,
        descricao: `${c.metodo} · biblioteca ${biblioteca.versao}`,
        parametros: {
          metodologia: c.metodo,
          pesos: c.pesos,
          normalizacao: metricas.normalizacao,
          risco: {
            classes: [
              {
                codigo: "baixo",
                rotulo: "Risco baixo",
                minimo: 0,
                maximo: c.baixo,
              },
              {
                codigo: "medio",
                rotulo: "Risco médio",
                minimo: c.baixo,
                maximo: c.alto,
              },
              {
                codigo: "alto",
                rotulo: "Risco alto",
                minimo: c.alto,
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
      fetch("../data/geoespacial/biblioteca_criterios_risco_restricao.json", {
        cache: "no-store",
      }),
      fetch("../data/geoespacial/metricas_criterios_risco_restricao.json", {
        cache: "no-store",
      }),
    ]);
    biblioteca = await b.json();
    metricas = await m.json();
    $("#biblioteca-versao").textContent =
      `Versão ${biblioteca.versao} · métricas ${metricas.versao}`;
    render();
    preview();
    $("#criterio-busca").oninput = render;
    $("#criterio-tipo").onchange = render;
    document
      .querySelectorAll("input,[data-peso]")
      .forEach((i) => (i.oninput = preview));
    $("#metodologia-fatiamento").onchange = metodo;
    $("#restaurar-limiares").onclick = metodo;
    $("#validar-metodologia").onclick = salvar;
  }
  init().catch(
    (e) =>
      ($("#criterios-tabela").innerHTML =
        `<tr><td colspan="9">${esc(e.message)}</td></tr>`),
  );
})();
