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
  let camadasHomologadas = [];
  let relatorioAtual = null;

  const CRITERIO_ALIAS = {
    uc_pi_federal: "Unidade de conservação federal — proteção integral",
    uc_pi_estadual: "Unidade de conservação estadual — proteção integral",
    uc_us_federal: "Unidade de conservação federal — uso sustentável",
    uc_us_estadual: "Unidade de conservação estadual — uso sustentável",
    za_uc_federal: "Zona de amortecimento — UC federal",
    za_uc_estadual: "Zona de amortecimento — UC estadual",
    vegetacao_protegida: "Vegetação nativa protegida",
    aprm: "Área de proteção e recuperação de mananciais (APRM)",
    ecossistema_costeiro: "Ecossistema costeiro sensível",
    cavidade_maxima: "Cavidade natural — grau de relevância máximo",
    cavidade_demais: "Cavidade natural — demais graus",
    terra_indigena: "Terra indígena",
    territorio_quilombola: "Território quilombola",
    area_contaminada: "Área contaminada cadastrada",
    inundacao: "Suscetibilidade a inundação",
    movimento_massa: "Suscetibilidade a movimento de massa",
    bem_tombado: "Bem tombado",
    sitio_arqueologico: "Sítio arqueológico",
    assentamento: "Assentamento rural",
    servidao: "Faixa de servidão / domínio",
    embargo_ibama: "Embargo federal (IBAMA)",
    embargo_estadual: "Embargo estadual (SEMIL/CETESB)",
    interdicao_cetesb: "Interdição CETESB",
  };

  const FONTE_ALIAS = {
    mma_cnuc_pi_federal: "MMA — CNUC (UC PI federal)",
    mma_cnuc_us_federal: "MMA — CNUC (UC US federal)",
    sp_ff_uc_pi: "Fundação Florestal SP — UC PI",
    sp_ff_uc_us: "Fundação Florestal SP — UC US",
    funai_ti: "FUNAI — Terras Indígenas",
    incra_quilombolas: "INCRA — Territórios quilombolas",
    ipt_susc_inundacao: "IPT — Suscetibilidade a inundação",
    ipt_susc_mmassa: "IPT — Suscetibilidade a movimento de massa",
    cetesb_areas_contaminadas: "CETESB — Áreas contaminadas",
    iphan_bens_tombados: "IPHAN — Bens tombados",
    condephaat_bens: "CONDEPHAAT — Bens tombados",
    iphan_sitios_arqueologicos: "IPHAN — Sítios arqueológicos",
    ibama_embargos: "IBAMA — Embargos",
    semil_embargos: "SEMIL — Embargos",
    incra_assentamentos: "INCRA — Assentamentos",
    itesp_assentamentos: "ITESP — Assentamentos",
  };

  const SEVERIDADE_ALIAS = {
    1: "Baixa",
    2: "Média",
    3: "Alta",
    4: "Crítica",
  };

  const STATUS_ALIAS = {
    restrito: "Restrito",
    apto_com_ressalva: "Apto com ressalva",
    apto: "Apto",
    nao_avaliado: "Não avaliado",
  };

  function aliasCriterio(id) {
    if (!id) return "";
    if (CRITERIO_ALIAS[id]) return CRITERIO_ALIAS[id];
    return String(id).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function aliasFonte(id) {
    if (!id) return "";
    if (FONTE_ALIAS[id]) return FONTE_ALIAS[id];
    return String(id).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function aliasSeveridade(n) {
    const key = Number(n);
    return SEVERIDADE_ALIAS[key] || "";
  }

  const CATEGORIAS_UC = [
    { re: /^\s*áreas?\s+de\s+prote(ç|c)ão\s+ambiental\b/i, sigla: "APA" },
    { re: /^\s*áreas?\s+de\s+relevante\s+interesse\s+ecológico\b/i, sigla: "ARIE" },
    { re: /^\s*reservas?\s+biológicas?\b/i, sigla: "ReBio" },
    { re: /^\s*esta(ç|c)(ões|ão)\s+ecológicas?\b/i, sigla: "ESEC" },
    { re: /^\s*parques?\s+nacionais?\b/i, sigla: "PARNA" },
    { re: /^\s*parques?\s+estaduais?\b/i, sigla: "PES" },
    { re: /^\s*parques?\s+municipais?\b/i, sigla: "PM" },
    { re: /^\s*florestas?\s+nacionais?\b/i, sigla: "FLONA" },
    { re: /^\s*florestas?\s+estaduais?\b/i, sigla: "FE" },
    { re: /^\s*reservas?\s+extrativistas?\b/i, sigla: "RESEX" },
    { re: /^\s*reservas?\s+de\s+desenvolvimento\s+sustentável\b/i, sigla: "RDS" },
    { re: /^\s*reservas?\s+particulares?\s+do\s+patrimônio\s+natural\b/i, sigla: "RPPN" },
    { re: /^\s*reservas?\s+de\s+fauna\b/i, sigla: "REFAU" },
    { re: /^\s*refúgios?\s+de\s+vida\s+silvestre\b/i, sigla: "REVIS" },
    { re: /^\s*monumentos?\s+naturais?\b/i, sigla: "MONA" },
    { re: /^\s*terras?\s+indígenas?\b/i, sigla: "TI" },
    { re: /^\s*territórios?\s+quilombolas?\b/i, sigla: "TQ" },
    { re: /^\s*zonas?\s+de\s+amortecimento\b/i, sigla: "ZA" },
  ];

  const CONECTIVOS_MIN = new Set([
    "a","o","as","os","à","às",
    "de","da","do","das","dos",
    "e","em","no","na","nos","nas",
    "para","por","com","sob","sobre","entre","até","desde",
    "um","uma","uns","umas",
  ]);

  const SIGLAS_UPPER = new Set([
    "APA","ARIE","ReBio","ESEC","PARNA","PES","PM","FLONA","FE","RESEX","RDS","RPPN","REFAU","REVIS","MONA","TI","TQ","ZA",
    "SP","MG","RJ","ES","PR","SC","RS","MS","MT","GO","DF","BA","PE","CE","PB","RN","AL","SE","PI","MA","PA","AP","AM","RR","AC","RO","TO",
    "UC","SNUC","APP","CAR","RL","EIA","RIMA","LP","LI","LO","CETESB","IBAMA","ICMBio","MMA","FUNAI","INCRA","IPHAN","CONDEPHAAT","SEMIL",
  ]);

  function tituloNormaCulta(texto) {
    if (!texto) return "";
    const bruto = String(texto).trim().toLowerCase();
    if (!bruto) return "";
    const palavras = bruto.split(/(\s+|[-—/])/);
    let primeiraPalavra = true;
    return palavras
      .map((tok) => {
        if (/^\s+$/.test(tok) || /^[-—/]$/.test(tok)) return tok;
        const upper = tok.toUpperCase();
        for (const s of SIGLAS_UPPER) {
          if (upper === s.toUpperCase()) { primeiraPalavra = false; return s; }
        }
        if (!primeiraPalavra && CONECTIVOS_MIN.has(tok)) return tok;
        primeiraPalavra = false;
        if (/^[ivxlcdm]+$/i.test(tok) && tok.length <= 5) return tok.toUpperCase();
        return tok.charAt(0).toUpperCase() + tok.slice(1);
      })
      .join("");
  }

  function detectarEsfera(h, a, origem) {
    const cid = String(h.criterio_id || a.criterio_id || "").toLowerCase();
    if (cid.endsWith("_federal") || cid.startsWith("terra_indigena") || cid.startsWith("territorio_quilombola") || cid === "embargo_ibama") return "Federal";
    if (cid.endsWith("_estadual") || cid === "interdicao_cetesb") return "Estadual";
    if (cid.endsWith("_municipal")) return "Municipal";
    const esf = String(a.esfera || a.jurisdicao || origem.esfera || origem.jurisdicao || "").trim().toLowerCase();
    if (esf.startsWith("fed")) return "Federal";
    if (esf.startsWith("est")) return "Estadual";
    if (esf.startsWith("mun")) return "Municipal";
    return "";
  }

  function separarCategoriaNome(nomeBruto) {
    if (!nomeBruto) return { sigla: "", resto: "" };
    const texto = String(nomeBruto).trim().replace(/\s+/g, " ");
    for (const cat of CATEGORIAS_UC) {
      const match = texto.match(cat.re);
      if (match) {
        const resto = texto.slice(match[0].length).trim().replace(/^[-–—:]\s*/, "");
        return { sigla: cat.sigla, resto };
      }
    }
    return { sigla: "", resto: texto };
  }

  function formatarNomeFeicao(nomeBruto, esfera) {
    if (!nomeBruto) return "";
    const { sigla, resto } = separarCategoriaNome(nomeBruto);
    const restoTratado = tituloNormaCulta(resto);
    const prefixo = esfera ? `${esfera}: ` : "";
    if (sigla && restoTratado) return `${prefixo}${sigla} - ${restoTratado}`;
    if (sigla) return `${prefixo}${sigla}`;
    return `${prefixo}${restoTratado || tituloNormaCulta(nomeBruto)}`;
  }

  function bancadaWindow() {
    const frame = document.getElementById("gp-frame");
    return frame?.contentWindow || null;
  }

  function comBancada(callback) {
    const win = bancadaWindow();
    if (!win) return Promise.resolve();
    if (win.gpApp) return Promise.resolve(callback(win.gpApp));
    return new Promise((resolve) => {
      const frame = document.getElementById("gp-frame");
      frame?.addEventListener(
        "load",
        () => {
          if (win.gpApp) resolve(callback(win.gpApp));
          else resolve();
        },
        { once: true }
      );
    });
  }

  const COR_PADRAO_BANCADA = { restricao: "#e11919", risco: "#f5c518" };
  function corPadraoBancada(chave) {
    const c = String(chave || "").toLowerCase();
    if (c.includes("restri")) return COR_PADRAO_BANCADA.restricao;
    if (c.includes("risco")) return COR_PADRAO_BANCADA.risco;
    return null;
  }

  async function enviarCamadaParaBancada(camadaId, chave, rotulo) {
    if (!camadaId) return false;
    const logChave = chave ? `${chave}-bancada` : "";
    if (logChave) logCarregamento(logChave, `Carregando camada de ${rotulo} na bancada…`);
    return Boolean(await comBancada(async (gpApp) => {
      let ultimoErro;
      for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        try {
          const recurso = await gpApp.carregarPorId(camadaId);
          gpApp.aplicarCorPadraoCamada?.(camadaId, corPadraoBancada(chave));
          if (logChave) {
            logCarregamento(
              logChave,
              `${rotulo === "restrição" ? "Restrição" : "Risco"} carregada na bancada: ${recurso?.nome || camadaId}.`,
              "ok"
            );
          }
          return true;
        } catch (e) {
          ultimoErro = e;
        }
      }
      console.warn("Falha ao empurrar camada para bancada", ultimoErro);
      if (logChave) logCarregamento(logChave, `Falha ao carregar ${rotulo}: ${ultimoErro?.message || "erro desconhecido"}`, "err");
      return false;
    }));
  }

  async function enviarCamadasParaBancada(camadas) {
    const validas = camadas.filter((camada) => camada.id);
    validas.forEach((camada) =>
      logCarregamento(`${camada.chave}-bancada`, `Carregando camada de ${camada.rotulo} na bancada…`)
    );
    return Boolean(await comBancada(async (gpApp) => {
      if (typeof gpApp.carregarPorIds !== "function") {
        return Promise.all(validas.map((camada) => enviarCamadaParaBancada(camada.id, camada.chave, camada.rotulo)));
      }
      try {
        const recursos = await gpApp.carregarPorIds(validas.map((camada) => camada.id));
        validas.forEach((camada, indice) => {
          const recurso = recursos[indice];
          gpApp.aplicarCorPadraoCamada?.(camada.id, corPadraoBancada(camada.chave));
          logCarregamento(
            `${camada.chave}-bancada`,
            `${camada.rotulo === "restrição" ? "Restrição" : "Risco"} carregada na bancada: ${recurso?.nome || camada.id}.`,
            "ok"
          );
        });
        return true;
      } catch (e) {
        validas.forEach((camada) =>
          logCarregamento(`${camada.chave}-bancada`, `Falha ao carregar ${camada.rotulo}: ${e.message}`, "err")
        );
        console.warn("Falha ao empurrar camadas para bancada", e);
        return false;
      }
    }));
  }

  function logCarregamento(chave, texto, estado) {
    const box = document.getElementById("camadas-log");
    if (!box) return;
    let entry = box.querySelector(`[data-log="${chave}"]`);
    if (!entry) {
      entry = document.createElement("div");
      entry.className = "fase1-log-entry";
      entry.dataset.log = chave;
      box.appendChild(entry);
    }
    entry.classList.remove("ok", "err");
    if (estado === "ok") entry.classList.add("ok");
    if (estado === "err") entry.classList.add("err");
    const icone =
      estado === "ok"
        ? '<i class="fas fa-check-circle" aria-hidden="true"></i>'
        : estado === "err"
        ? '<i class="fas fa-triangle-exclamation" aria-hidden="true"></i>'
        : '<span class="spin" aria-hidden="true"></span>';
    entry.innerHTML = `${icone}<span>${texto}</span>`;
  }

  function hierarquizacaoParaGeoJson(hier) {
    const features = objetos(hier)
      .map((item) => {
        const cab = item.cabecalho_objeto || item;
        const lon = Number(cab.longitude);
        const lat = Number(cab.latitude);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lon, lat] },
          properties: {
            demanda_id: cab.demanda_id || cab.codigo || null,
            codigo: cab.codigo || null,
            nome: cab.nome || null,
            status: cab.status || null,
            hierarquizacao: hier.codigo,
          },
        };
      })
      .filter(Boolean);
    return { type: "FeatureCollection", features };
  }

  function enviarHierarquizacaoParaBancada(hier) {
    if (!hier) return;
    const geojson = hierarquizacaoParaGeoJson(hier);
    if (!geojson.features.length) return;
    const id = `hier_${codigoCurto(hier.codigo)}`;
    const nome = `Hierarquização · ${hier.nome || hier.codigo}`;
    comBancada((gpApp) => {
      try {
        gpApp.adicionarCamadaGeoJsonEmMemoria(id, nome, geojson, {
          tipo: "vetorial (memória)",
          origem: "Hierarquização Fase 1",
          geometria_tipo: "Point",
          simbologia: "status",
        });
      } catch (e) {
        console.warn("Falha ao adicionar hierarquização na bancada", e);
      }
    });
  }

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
    if (box) {
      box.textContent = value?.message || value;
      box.classList.remove("hidden");
    }
    if (window.SLTFeedback) {
      window.SLTFeedback.error(value?.message || String(value), "Não foi possível continuar");
    }
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

  const TIPO_DEMANDA_LABEL = {
    1: "Plano", 2: "Programa", 3: "Projeto",
    plano: "Plano", programa: "Programa", projeto: "Projeto",
  };

  function tipoDemandaLabel(hierarquizacao, objs) {
    const t =
      hierarquizacao?.tipo_demanda_id ??
      hierarquizacao?.tipo_demanda ??
      objs?.[0]?.tipo_demanda ??
      objs?.[0]?.cabecalho_objeto?.tipo_demanda;
    return TIPO_DEMANDA_LABEL[t] || (t ? String(t) : "—");
  }

  function abrirModalObjeto(o) {
    if (!o) return;
    const modal = document.getElementById("modal-objetos");
    if (!modal) return;
    modal.querySelector("[data-modal-title]").textContent =
      `${o.codigo || ""} — ${o.nome || "Objeto"}`.replace(/^ — /, "");
    const body = modal.querySelector("[data-modal-body]");
    body.innerHTML = "";
    if (window.SLTObjetoDetalhe?.corpo) body.appendChild(SLTObjetoDetalhe.corpo(o));
    modal.classList.remove("hidden");
  }

  function renderHierarquizacao() {
    const hierarquizacao = atual();
    const layer = $("#gp-demandas");

    if (!hierarquizacao) {
      if (layer) layer.innerHTML = '<p class="ahp-help-text">Selecione uma hierarquização.</p>';
      ocultarRelatorio();
      return;
    }

    const objs =
      hierarquizacao.objetos && hierarquizacao.objetos.length
        ? hierarquizacao.objetos
        : objetos(hierarquizacao).map((x) => x.cabecalho_objeto || x);

    const objsTexto = objs
      .map((o, index) => {
        const cod = o.codigo || o.demanda_id || `Objeto ${index + 1}`;
        return `<button type="button" class="fase1-gp-obj" data-idx="${index}">${esc(o.nome || "Sem denominação")} <span class="cod">(${esc(cod)})</span></button>`;
      })
      .join("");

    layer.innerHTML = `
      <div class="fase1-gp-meta">
        <div class="fase1-gp-card"><small>Nome</small><strong>${esc(hierarquizacao.nome || "—")}</strong></div>
        <div class="fase1-gp-card"><small>Código</small><strong>${esc(hierarquizacao.codigo || "—")}</strong></div>
        <div class="fase1-gp-card"><small>Tipo de objeto</small><strong>${esc(tipoDemandaLabel(hierarquizacao, objs))}</strong></div>
      </div>
      <div class="fase1-gp-objs">
        <h5><i class="fas fa-list-ul"></i> Objetos do grupo (${objs.length})</h5>
        <p class="fase1-gp-objs-list">${objsTexto || '<span class="ahp-help-text">Nenhum objeto.</span>'}</p>
      </div>`;

    layer.querySelectorAll(".fase1-gp-obj").forEach((btn) => {
      btn.addEventListener("click", () => {
        abrirModalObjeto(objs[Number(btn.dataset.idx)]);
      });
    });

    ocultarRelatorio();
    enviarHierarquizacaoParaBancada(hierarquizacao);
  }

  function ehRestricao(camada) {
    const alvo = String(
      camada.nome_publicacao || camada.nome || camada.finalidade || ""
    ).toLowerCase();
    return alvo.includes("restri") || finalidade(camada, "restri");
  }

  function ehRisco(camada) {
    const alvo = String(
      camada.nome_publicacao || camada.nome || camada.finalidade || ""
    ).toLowerCase();
    return alvo.includes("risco") || finalidade(camada, "risco");
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

    camadasHomologadas
      .filter(ehRestricao)
      .forEach((camada) => {
        options.push(
          `<option value="${esc(camada.id)}" data-standalone="1">${esc(camada.nome_publicacao || camada.nome)} · ${esc(camada.versao)} (biblioteca canônica)</option>`
        );
      });

    select.innerHTML = '<option value="">Selecione…</option>' + options.join("");
  }

  function associarRiscos() {
    const pacote = parAtual();
    const riscoSelect = $("#camada-risco");
    const restricaoOption = $("#camada-restricao").selectedOptions[0];
    const standalone = restricaoOption?.dataset.standalone === "1";

    if (!pacote && !standalone) {
      riscoSelect.disabled = true;
      riscoSelect.innerHTML =
        '<option value="">Selecione primeiro a camada de restrição</option>';
      $("#gp-risco-restricao").innerHTML =
        '<p class="ahp-help-text">Selecione o par homologado.</p>';
      return;
    }

    const riscos = pacote
      ? (pacote.camadas || []).filter((c) => finalidade(c, "risco"))
      : camadasHomologadas.filter(ehRisco);
    riscoSelect.innerHTML =
      riscos
        .map((camada) => {
          const label = pacote
            ? `${esc(camada.nome)} — ${esc(camada.versao)}`
            : `${esc(camada.nome_publicacao || camada.nome)} · ${esc(camada.versao)} (biblioteca canônica)`;
          return `<option value="${esc(camada.id)}">${label}</option>`;
        })
        .join("") ||
      '<option value="">Camada associada não encontrada</option>';
    riscoSelect.disabled = !riscos.length;
    if (riscos.length && riscoSelect.options[0]?.value) {
      riscoSelect.value = riscoSelect.options[0].value;
    }
    renderCamadas();
    revalidarCampos();
    // Carrega o par inteiro em uma única reconciliação do catálogo da bancada.
    (async () => {
      await enviarCamadasParaBancada([
        { id: restricaoOption?.value, chave: "restricao", rotulo: "restrição" },
        { id: riscoSelect.value, chave: "risco", rotulo: "risco" },
      ]);
    })();
  }

  function renderCamadas() {
    const pacote = parAtual();
    const restricao = $("#camada-restricao").selectedOptions[0];
    const risco = $("#camada-risco").selectedOptions[0];
    const alvo = $("#gp-risco-restricao");

    if (!restricao?.value && !risco?.value) {
      alvo.innerHTML =
        '<p class="ahp-help-text">Selecione a camada de restrição em <strong>2.1</strong> (e a associada em <strong>2.2</strong>) para vê-las aqui.</p>';
      return;
    }

    const identificador = pacote
      ? `<p class="fase1-pair-id">Identificador do conjunto: <code>${esc(pacote.pacote_id)}</code></p>`
      : '<p class="fase1-pair-id">Camadas da <strong>biblioteca canônica</strong>.</p>';

    alvo.innerHTML =
      identificador +
      `<div class="fase1-cr-grid">` +
      (restricao?.value
        ? `<div class="fase1-cr-card fase1-cr-card--restricao"><small><i class="fas fa-ban"></i> Restrição</small><strong>${esc(restricao.textContent)}</strong></div>`
        : "") +
      (risco?.value
        ? `<div class="fase1-cr-card fase1-cr-card--risco"><small><i class="fas fa-triangle-exclamation"></i> Risco</small><strong>${esc(risco.textContent)}</strong></div>`
        : "") +
      `</div>`;
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
      const geo = f1.geometria_ou_area_afetada || {};
      const lat = Number(geo.latitude ?? cab.latitude);
      const lon = Number(geo.longitude ?? cab.longitude);
      const detalharHit = (h) => {
        const a = h.atributos || {};
        let origem = {};
        if (typeof a.atributos_origem === "string") {
          try { origem = JSON.parse(a.atributos_origem) || {}; } catch (_) { origem = {}; }
        } else if (a.atributos_origem && typeof a.atributos_origem === "object") {
          origem = a.atributos_origem;
        }
        const nomeBruto =
          a.nome_origem ||
          origem.nome ||
          origem.NOME ||
          origem.nome_uc ||
          origem.NM_UC ||
          origem.denominacao ||
          origem.nm_ti ||
          origem.nm_terrai ||
          origem.nome_comun ||
          origem.nome_comunidade ||
          origem.titulo ||
          origem.descricao ||
          origem.name ||
          h.nome ||
          "";
        const esfera = detectarEsfera(h, a, origem);
        const criterio =
          aliasCriterio(a.criterio_id || h.criterio_id) ||
          h.criterio_nome ||
          a.criterio_nome ||
          "";
        const fonte = aliasFonte(a.fonte_id || h.fonte_id);
        const severidade = aliasSeveridade(a.severidade ?? h.severidade);
        const nomeFinal = nomeBruto
          ? formatarNomeFeicao(nomeBruto, esfera)
          : criterio
          ? `${esfera ? esfera + ": " : ""}${criterio} (sem denominação)`
          : `Feição ${h.feature_id || a.feicao_origem_id || ""}`.trim();
        return { nome: nomeFinal, criterio, fonte, severidade, geometria: h.geometria || null };
      };
      const featuresRestricao = (restricao.intersecoes || []).map(detalharHit);
      const featuresRisco = (risco.intersecoes || []).map(detalharHit);
      return {
        codigo: cab.codigo || cab.demanda_id || "—",
        nome: cab.nome || "Sem denominação",
        status: f1.status_fase1 || "nao_avaliado",
        restricaoResultado: restricao.resultado || "—",
        riscoResultado: risco.resultado || "—",
        hitRestricao: featuresRestricao.length,
        hitRisco: featuresRisco.length,
        featuresRestricao,
        featuresRisco,
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lon) ? lon : null,
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

  async function exportarRelatorioPdf(modelo) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return erro("Biblioteca jsPDF não carregada para exportação PDF.");
    }

    const botao = document.getElementById("baixar-relatorio-fase1");
    const rotuloOriginal = botao ? botao.innerHTML : "";
    if (botao) {
      botao.disabled = true;
      botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PDF…';
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const largura = doc.internal.pageSize.getWidth();
      const altura = doc.internal.pageSize.getHeight();
      const margem = 12;
      const larguraUtil = largura - margem * 2;
      const dataGeracao = new Date().toLocaleString("pt-BR");
      const texto = (valor, fallback = "—") => {
        const normalizado = String(valor ?? "").replace(/\s+/g, " ").trim();
        return normalizado || fallback;
      };
      const adicionarCabecalho = () => {
        const larguraPagina = doc.internal.pageSize.getWidth();
        doc.setFillColor(28, 61, 89);
        doc.rect(0, 0, larguraPagina, 23, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Relatório da Fase 1 — Elegibilidade Territorial", margem, 12);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(`Rodada ${texto(modelo.codigo)}`, margem, 18);
        doc.setTextColor(25, 25, 25);
      };
      const adicionarRodape = (pagina, total) => {
        const larguraPagina = doc.internal.pageSize.getWidth();
        const alturaPagina = doc.internal.pageSize.getHeight();
        doc.setDrawColor(215, 222, 228);
        doc.line(margem, alturaPagina - 11, larguraPagina - margem, alturaPagina - 11);
        doc.setFontSize(7.5);
        doc.setTextColor(85, 95, 105);
        doc.text(`Gerado em ${dataGeracao}`, margem, alturaPagina - 6);
        doc.text(`Página ${pagina} de ${total}`, larguraPagina - margem, alturaPagina - 6, { align: "right" });
        doc.setTextColor(25, 25, 25);
      };
      const novaPagina = () => {
        doc.addPage();
        adicionarCabecalho();
        return 31;
      };

      adicionarCabecalho();
      let y = 31;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(texto(modelo.nome, "Hierarquização sem nome"), margem, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const concluido = `Conclusão: ${texto(modelo.concluidoEm)}   |   Objetos avaliados: ${texto(modelo.resumo?.objetos, "0")}`;
      doc.text(concluido, margem, y);
      y += 8;

      const kpis = [
        ["Restritos", texto(modelo.resumo?.restritos, "0"), [192, 57, 43]],
        ["Aptos com ressalva", texto(modelo.resumo?.comRisco, "0"), [212, 160, 23]],
        ["Aptos sem ocorrência", texto(modelo.resumo?.semOcorrencia, "0"), [22, 125, 76]],
      ];
      const larguraKpi = (larguraUtil - 6) / 3;
      kpis.forEach(([rotulo, valor, cor], indice) => {
        const x = margem + indice * (larguraKpi + 3);
        doc.setFillColor(247, 249, 250);
        doc.setDrawColor(...cor);
        doc.roundedRect(x, y, larguraKpi, 19, 1.5, 1.5, "FD");
        doc.setFontSize(7.5);
        doc.setTextColor(75, 85, 95);
        doc.text(rotulo, x + 3, y + 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(...cor);
        doc.text(valor, x + 3, y + 15);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(25, 25, 25);
      });
      y += 27;

      doc.autoTable({
        startY: y,
        margin: { left: margem, right: margem },
        theme: "grid",
        head: [["Parâmetro", "Valor"]],
        body: [
          ["Camada de restrição", texto(modelo.camadas?.restricao?.nome)],
          ["Camada de risco", texto(modelo.camadas?.risco?.nome)],
          ["Limiar de restrição", texto(modelo.fatiamento?.parametros?.restricao?.limiar)],
          ["Classes de risco", (modelo.fatiamento?.parametros?.risco?.classes || []).map((classe) => `${texto(classe.rotulo || classe.codigo)}: ${classe.minimo ?? "sem limite inferior"} a ${classe.maximo ?? "sem limite superior"}`).join("; ") || "Não informado"],
        ],
        styles: { fontSize: 8, cellPadding: 2.2, overflow: "linebreak" },
        headStyles: { fillColor: [28, 61, 89], textColor: 255 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: "bold" }, 1: { cellWidth: larguraUtil - 42 } },
      });

      y = doc.lastAutoTable.finalY + 8;
      if (y > altura - 55) y = novaPagina();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("Tabela síntese da elegibilidade", margem, y);
      y += 4;
      const linhasPdf = (modelo.linhas || []).flatMap((linha) => {
        const sobreposicoes = [
          ...(linha.featuresRestricao || []).map((feature) => ({ tipo: "restrição", nome: feature.nome })),
          ...(linha.featuresRisco || []).map((feature) => ({ tipo: "risco", nome: feature.nome })),
        ];
        const base = [
          texto(linha.nome),
          texto(badgeStatus(linha.status).label),
          texto(linha.restricaoResultado),
          texto(linha.riscoResultado),
        ];
        return sobreposicoes.length
          ? sobreposicoes.map((item) => [...base, `${item.tipo}: ${texto(item.nome)}`])
          : [[...base, "Sem sobreposição"]];
      });
      doc.autoTable({
        startY: y,
        margin: { left: margem, right: margem, bottom: 16 },
        theme: "grid",
        head: [["Demanda", "Status", "Restrição", "Risco", "Sobreposição identificada"]],
        body: linhasPdf.length ? linhasPdf : [["Sem objetos avaliados.", "", "", "", ""]],
        styles: { fontSize: 7, cellPadding: 1.8, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: [28, 61, 89], textColor: 255, fontSize: 7.2 },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 24 }, 2: { cellWidth: 27 }, 3: { cellWidth: 27 }, 4: { cellWidth: 65 } },
        didParseCell: (dados) => {
          if (dados.section !== "body" || dados.column.index !== 1) return;
          const status = String(dados.cell.raw || "").toLowerCase();
          if (status.includes("restrito")) dados.cell.styles.fillColor = [253, 226, 225];
          else if (status.includes("ressalva")) dados.cell.styles.fillColor = [255, 243, 205];
          else if (status.includes("apto")) dados.cell.styles.fillColor = [223, 246, 232];
        },
      });

      const mapaInserido = await adicionarMapaAoPdf(doc, modelo, {
        margem,
        adicionarCabecalho,
      });
      if (!mapaInserido) {
        console.warn("Mapa-síntese não pôde ser incorporado ao PDF.");
      }

      const totalPaginas = doc.getNumberOfPages();
      for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
        doc.setPage(pagina);
        adicionarRodape(pagina, totalPaginas);
      }

      doc.save(`fase1-relatorio-${modelo.codigo || "rodada"}.pdf`);
    } catch (e) {
      console.error(e);
      erro("Falha ao gerar PDF do relatório.");
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.innerHTML = rotuloOriginal;
      }
    }
  }

  let mapaFase1 = null;
  let mapaFase1Pronto = Promise.resolve();
  let contornoSaoPauloPromise = null;

  function obterContornoSaoPaulo() {
    if (!contornoSaoPauloPromise) {
      contornoSaoPauloPromise = fetch("/api/geo/limites/estado-sao-paulo", {
        credentials: "same-origin",
      }).then((resposta) => {
        if (!resposta.ok) throw new Error("Não foi possível carregar o limite de São Paulo.");
        return resposta.json();
      });
    }
    return contornoSaoPauloPromise;
  }

  function adicionarMolduraCartografica(mapa, titulo) {
    const host = mapa.getContainer();
    const adicionar = (classe, html, rotulo) => {
      const elemento = document.createElement("div");
      elemento.className = `fase1-map-layout ${classe}`;
      elemento.setAttribute("aria-label", rotulo);
      elemento.innerHTML = html;
      host.appendChild(elemento);
      return elemento;
    };
    adicionar("fase1-map-layout--title", `<strong>${esc(titulo)}</strong>`, titulo);
    adicionar("fase1-map-layout--north", '<span class="fase1-map-north-arrow"></span><strong>N</strong>', "Rosa dos ventos: norte");
    const escala = adicionar("fase1-map-layout--scale", '<span class="fase1-map-scale-line"></span><span class="fase1-map-scale-label"></span>', "Escala gráfica");
    const linha = escala.querySelector(".fase1-map-scale-line");
    const rotulo = escala.querySelector(".fase1-map-scale-label");
    const atualizarEscala = () => {
      const tamanho = mapa.getSize();
      if (!tamanho.x || !tamanho.y) return;
      const origem = mapa.containerPointToLatLng([0, tamanho.y / 2]);
      const referencia = mapa.containerPointToLatLng([100, tamanho.y / 2]);
      const metrosPor100Px = origem.distanceTo(referencia);
      if (!Number.isFinite(metrosPor100Px) || metrosPor100Px <= 0) return;
      const potencia = 10 ** Math.floor(Math.log10(metrosPor100Px));
      const base = metrosPor100Px / potencia;
      const distancia = (base >= 5 ? 5 : base >= 2 ? 2 : 1) * potencia;
      const larguraPx = Math.max(30, Math.min(120, (distancia / metrosPor100Px) * 100));
      linha.style.width = `${larguraPx}px`;
      rotulo.textContent = distancia >= 1000 ? `${(distancia / 1000).toLocaleString("pt-BR")} km` : `${Math.round(distancia)} m`;
    };
    mapa.on("zoomend moveend resize", atualizarEscala);
    if (mapa._loaded) atualizarEscala();
    else mapa.whenReady(atualizarEscala);
  }

  function linhasDaGeometria(coordenadas) {
    if (!Array.isArray(coordenadas) || !coordenadas.length) return [];
    if (typeof coordenadas[0]?.[0] === "number") return [coordenadas];
    return coordenadas.flatMap(linhasDaGeometria);
  }

  function criarImagemCartograficaPdf(modelo, contorno) {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 980;
    const ctx = canvas.getContext("2d");
    const linhasContorno = linhasDaGeometria(contorno?.geometry?.coordinates || []);
    const geometrias = [];
    (modelo.linhas || []).filter((linha) => linha.status === "restrito" || linha.status === "apto_com_ressalva").forEach((linha) => {
      (linha.featuresRestricao || []).forEach((feature) => geometrias.push({ geometria: feature.geometria, cor: "#c0392b", tipo: "Restrição" }));
      (linha.featuresRisco || []).forEach((feature) => geometrias.push({ geometria: feature.geometria, cor: "#d4a017", tipo: "Risco" }));
    });
    const pontos = [];
    linhasContorno.forEach((linha) => linha.forEach((ponto) => pontos.push(ponto)));
    geometrias.forEach((item) => linhasDaGeometria(item.geometria?.coordinates || []).forEach((linha) => linha.forEach((ponto) => pontos.push(ponto))));
    (modelo.linhas || []).forEach((linha) => {
      if (Number.isFinite(linha.longitude) && Number.isFinite(linha.latitude)) pontos.push([linha.longitude, linha.latitude]);
    });
    if (!pontos.length) return null;
    const pontosEnquadramento = linhasContorno.flatMap((linha) => linha);
    let minX = Math.min(...pontosEnquadramento.map((ponto) => ponto[0]));
    let maxX = Math.max(...pontosEnquadramento.map((ponto) => ponto[0]));
    let minY = Math.min(...pontosEnquadramento.map((ponto) => ponto[1]));
    let maxY = Math.max(...pontosEnquadramento.map((ponto) => ponto[1]));
    const margemGeo = 0.04;
    const larguraGeo = maxX - minX || 1;
    const alturaGeo = maxY - minY || 1;
    minX -= larguraGeo * margemGeo; maxX += larguraGeo * margemGeo;
    minY -= alturaGeo * margemGeo; maxY += alturaGeo * margemGeo;
    const quadro = { x: 70, y: 92, largura: 1460, altura: 785 };
    const projetar = (ponto) => [
      quadro.x + ((ponto[0] - minX) / (maxX - minX)) * quadro.largura,
      quadro.y + ((maxY - ponto[1]) / (maxY - minY)) * quadro.altura,
    ];
    const desenharLinhas = (linhas, cor, largura, preenchimento = null) => {
      ctx.strokeStyle = cor;
      ctx.lineWidth = largura;
      linhas.forEach((linha) => {
        if (linha.length < 2) return;
        ctx.beginPath();
        linha.forEach((ponto, indice) => {
          const [x, y] = projetar(ponto);
          if (indice) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        });
        if (preenchimento) { ctx.fillStyle = preenchimento; ctx.fill(); }
        ctx.stroke();
      });
    };
    ctx.fillStyle = "#f5f8fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#eaf0f3";
    ctx.fillRect(quadro.x, quadro.y, quadro.largura, quadro.altura);
    for (let grade = 1; grade < 6; grade += 1) {
      ctx.strokeStyle = "rgba(28,61,89,.12)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(quadro.x + (quadro.largura * grade) / 6, quadro.y); ctx.lineTo(quadro.x + (quadro.largura * grade) / 6, quadro.y + quadro.altura); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(quadro.x, quadro.y + (quadro.altura * grade) / 6); ctx.lineTo(quadro.x + quadro.largura, quadro.y + (quadro.altura * grade) / 6); ctx.stroke();
    }
    desenharLinhas(linhasContorno, "#173f5a", 4, "rgba(255,255,255,.18)");
    geometrias.forEach((item) => desenharLinhas(linhasDaGeometria(item.geometria?.coordinates || []), item.cor, 4, item.tipo === "Restrição" ? "rgba(192,57,43,.18)" : "rgba(212,160,23,.18)"));
    const capital = [-46.6333, -23.5505];
    const [capitalX, capitalY] = projetar(capital);
    ctx.beginPath(); ctx.moveTo(capitalX, capitalY - 11); ctx.lineTo(capitalX + 11, capitalY); ctx.lineTo(capitalX, capitalY + 11); ctx.lineTo(capitalX - 11, capitalY); ctx.closePath(); ctx.fillStyle = "#6c3fa0"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.font = "bold 20px Arial"; ctx.textAlign = "left"; ctx.fillStyle = "#6c3fa0";
    ctx.fillText("São Paulo — Capital", capitalX + 14, capitalY - 12);
    (modelo.linhas || []).filter((linha) => linha.status === "restrito" || linha.status === "apto_com_ressalva").forEach((linha) => {
      if (!Number.isFinite(linha.longitude) || !Number.isFinite(linha.latitude)) return;
      const [x, y] = projetar([linha.longitude, linha.latitude]);
      const cor = linha.status === "restrito" ? "#c0392b" : "#d4a017";
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
    });
    ctx.fillStyle = "#173f5a";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Mapa-síntese — Elegibilidade territorial", canvas.width / 2, 50);
    ctx.textAlign = "center";
    ctx.font = "bold 26px Arial";
    ctx.fillText("N", 1450, 55);
    ctx.beginPath(); ctx.moveTo(1450, 65); ctx.lineTo(1435, 100); ctx.lineTo(1450, 91); ctx.lineTo(1465, 100); ctx.closePath(); ctx.fill();
    const latitudeMedia = (minY + maxY) / 2;
    const kmPorPx = ((maxX - minX) * 111.32 * Math.cos((latitudeMedia * Math.PI) / 180)) / quadro.largura;
    const meta = kmPorPx * 180;
    const potencia = 10 ** Math.floor(Math.log10(Math.max(meta, 0.1)));
    const escalaKm = (meta / potencia >= 5 ? 5 : meta / potencia >= 2 ? 2 : 1) * potencia;
    const escalaPx = escalaKm / kmPorPx;
    const escalaX = (canvas.width - escalaPx) / 2;
    const escalaY = 925;
    ctx.strokeStyle = "#102f45"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(escalaX, escalaY); ctx.lineTo(escalaX + escalaPx, escalaY); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(escalaX, escalaY - 8); ctx.lineTo(escalaX, escalaY + 8); ctx.moveTo(escalaX + escalaPx, escalaY - 8); ctx.lineTo(escalaX + escalaPx, escalaY + 8); ctx.stroke();
    ctx.font = "bold 22px Arial"; ctx.textAlign = "center"; ctx.fillStyle = "#102f45"; ctx.fillText(`${escalaKm.toLocaleString("pt-BR")} km`, canvas.width / 2, 960);
    ctx.textAlign = "left"; ctx.font = "20px Arial";
    [["#c0392b", "Restrição"], ["#d4a017", "Risco"], ["#6c3fa0", "Capital"]].forEach(([cor, rotulo], indice) => {
      const x = 85 + indice * 220;
      ctx.fillStyle = cor; ctx.fillRect(x, 895, 18, 18); ctx.fillStyle = "#1d2f3a"; ctx.fillText(rotulo, x + 27, 911);
    });
    return canvas;
  }

  async function adicionarMapaAoPdf(doc, modelo, opcoes) {
    const mapa = document.getElementById("fase1-relatorio-mapa");
    if (!mapa || mapa.classList.contains("hidden")) return false;
    try {
      if (mapaFase1) mapaFase1.invalidateSize();
      const contorno = await obterContornoSaoPaulo();
      const canvas = criarImagemCartograficaPdf(modelo, contorno);
      if (!canvas || !canvas.width || !canvas.height) return false;
      doc.addPage("a4", "landscape");
      opcoes.adicionarCabecalho();
      const larguraUtil = doc.internal.pageSize.getWidth() - opcoes.margem * 2;
      const y = 31;
      const alturaImagem = Math.min(170, (canvas.height * larguraUtil) / canvas.width);
      doc.addImage(canvas.toDataURL("image/png"), "PNG", opcoes.margem, y, larguraUtil, alturaImagem);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`Rodada ${modelo.codigo || "—"} · Limite do Estado de São Paulo (IBGE)`, opcoes.margem, y + alturaImagem + 10);
      return true;
    } catch (erroMapa) {
      console.warn("Falha ao gerar a imagem cartográfica do PDF", erroMapa);
      return false;
    }
  }

  // Gera cor HSL determinística por índice, com boa separação visual.
  function corPorIndice(i, total) {
    const passo = total > 0 ? 360 / total : 30;
    const h = Math.round((i * passo) % 360);
    return `hsl(${h}, 70%, 45%)`;
  }

  function renderMapaSobreposicao(modelo) {
    const container = document.getElementById("fase1-relatorio-mapa");
    const vazio = document.getElementById("fase1-relatorio-mapa-vazio");
    if (!container || typeof window.L === "undefined") return;

    const renderComItens = (itens) => {
      itens = (itens || []).filter(
        (p) =>
          Number.isFinite(p.latitude) &&
          Number.isFinite(p.longitude) &&
          Array.isArray(p.feicoes) &&
          p.feicoes.length
      );
      if (!itens.length) {
        container.classList.add("hidden");
        if (vazio) vazio.classList.remove("hidden");
        if (mapaFase1) {
          mapaFase1.remove();
          mapaFase1 = null;
        }
        return;
      }
      container.classList.remove("hidden");
      if (vazio) vazio.classList.add("hidden");
      if (mapaFase1) {
        mapaFase1.remove();
        mapaFase1 = null;
      }
      container.querySelectorAll(".fase1-map-layout").forEach((elemento) => elemento.remove());

      const featIndex = new Map();
      itens.forEach((p) => {
        (p.feicoes || []).forEach((f) => {
          if (!featIndex.has(f.nome)) featIndex.set(f.nome, { nome: f.nome, tipo: f.tipo });
        });
      });
      const feicoes = Array.from(featIndex.values());
      const paleta = new Map();
      feicoes.forEach((f, i) => paleta.set(f.nome, corPorIndice(i, feicoes.length)));

      mapaFase1 = window.L.map(container, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: "© OpenStreetMap · © CARTO",
        crossOrigin: true,
      }).addTo(mapaFase1);
      const mapaAtual = mapaFase1;
      const painelContorno = mapaFase1.createPane("fase1-contorno-sp");
      painelContorno.style.zIndex = "350";
      mapaFase1Pronto = obterContornoSaoPaulo()
        .then((contorno) => {
          if (mapaFase1 !== mapaAtual) return;
          const limiteSp = window.L.geoJSON(contorno, {
            pane: "fase1-contorno-sp",
            interactive: false,
            style: { color: "#173f5a", weight: 2, opacity: 0.9, fill: false },
          }).addTo(mapaAtual);
          const capital = window.L.marker([-23.5505, -46.6333], {
            icon: window.L.divIcon({
              className: "fase1-map-capital-marker",
              html: '<span aria-hidden="true"></span>',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            }),
            interactive: false,
          }).addTo(mapaAtual);
          capital.bindTooltip("São Paulo — Capital", {
            permanent: true,
            direction: "right",
            offset: [9, 0],
            className: "fase1-report-map-label fase1-report-map-label--capital",
          });
          mapaAtual.fitBounds(limiteSp.getBounds(), {
            paddingTopLeft: [76, 100],
            paddingBottomRight: [76, 68],
            maxZoom: 7.35,
            animate: false,
          });
        })
        .catch((erroContorno) => console.warn("Contorno de São Paulo indisponível", erroContorno));
      adicionarMolduraCartografica(mapaFase1, "Mapa-síntese — Elegibilidade territorial");

      const grupo = window.L.featureGroup();
      itens.forEach((p) => {
        (p.feicoes || []).forEach((f, idx) => {
          const cor = paleta.get(f.nome) || "#1a1a1a";
          if (f.geometria && typeof f.geometria === "object") {
            try {
              const camada = window.L.geoJSON(f.geometria, {
                style: { color: cor, weight: 2, fillColor: cor, fillOpacity: 0.2 },
              });
              camada.bindPopup(
                `<strong>${esc(p.codigo)}</strong><br>${esc(p.nome)}<br>` +
                  `<div class="fase1-popup-sec"><em>${f.tipo === "restricao" ? "Restrição" : "Risco"}:</em><br>${esc(f.nome)}</div>`
              );
              grupo.addLayer(camada);
            } catch (_) {}
          }
        });
        const marker = window.L.circleMarker([p.latitude, p.longitude], {
          radius: 7,
          color: "#ffffff",
          weight: 1.8,
          fillColor: p.status === "restrito" ? "#c0392b" : "#d4a017",
          fillOpacity: 0.95,
        });
        marker.bindTooltip(esc(p.nome), {
          permanent: true,
          direction: "right",
          offset: [8, 0],
          className: "fase1-report-map-label",
        });
        grupo.addLayer(marker);
      });
      grupo.addTo(mapaFase1);

      // O enquadramento final é aplicado quando o limite oficial de São Paulo chega.
      // Enquanto isso, uma visão provisória impede que o Leaflet fique sem centro/zoom.
      mapaFase1.setView([-22.5, -48.5], 6.4, { animate: false });
      setTimeout(() => mapaFase1 && mapaFase1.invalidateSize(), 60);
    };

    // Constrói itens do próprio modelo como fallback (para o caso do endpoint falhar).
    const itensLocais = (modelo.linhas || [])
      .filter(
        (l) =>
          (l.status === "restrito" || l.status === "apto_com_ressalva") &&
          Number.isFinite(l.latitude) &&
          Number.isFinite(l.longitude)
      )
      .map((l) => ({
        codigo: l.codigo,
        nome: l.nome,
        status: l.status,
        latitude: l.latitude,
        longitude: l.longitude,
        feicoes: [
          ...(l.featuresRestricao || []).map((f) => ({ nome: f.nome, tipo: "restricao", geometria: f.geometria || null })),
          ...(l.featuresRisco || []).map((f) => ({ nome: f.nome, tipo: "risco", geometria: f.geometria || null })),
        ],
      }));

    if (window.HierApi && typeof window.HierApi.mapaSobreposicaoFase1 === "function" && modelo.codigo) {
      window.HierApi
        .mapaSobreposicaoFase1(modelo.codigo)
        .then((res) => renderComItens((res && res.itens) || itensLocais))
        .catch(() => renderComItens(itensLocais));
    } else {
      renderComItens(itensLocais);
    }
  }


  function ocultarRelatorio() {
    relatorioAtual = null;
    const box = $("#fase1-relatorio");
    const botaoDownload = $("#baixar-relatorio-fase1");
    const vazio = $("#fase1-resultado-vazio");
    if (box) {
      box.classList.add("hidden");
      const conteudo = $("fase1-relatorio-conteudo");
      const tbody = $("fase1-relatorio-tbody");
      if (conteudo) conteudo.innerHTML = "";
      if (tbody) tbody.innerHTML = "";
    }
    if (botaoDownload) botaoDownload.classList.add("hidden");
    if (vazio) vazio.classList.remove("hidden");
  }

  function renderRelatorio(hierarquizacao) {
    const modelo = montarModeloRelatorio(hierarquizacao);
    relatorioAtual = modelo;
    const box = $("#fase1-relatorio");
    const botaoDownload = $("#baixar-relatorio-fase1");
    const vazio = $("#fase1-resultado-vazio");

    if (!modelo || !modelo.concluidoEm) {
      box.classList.add("hidden");
      botaoDownload.classList.add("hidden");
      if (vazio) vazio.classList.remove("hidden");
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
      .flatMap((linha) => {
        const badge = badgeStatus(linha.status);
        const normalizado = String(linha.status || "").toLowerCase();
        let rowCls = "";
        if (normalizado === "restrito") rowCls = " class=\"fase1-report-row--restrito\"";
        else if (normalizado === "apto_com_ressalva") rowCls = " class=\"fase1-report-row--ressalva\"";
        const sobreposicoes = [
          ...(linha.featuresRestricao || []).map((feature) => ({ tipo: "restricao", feature })),
          ...(linha.featuresRisco || []).map((feature) => ({ tipo: "risco", feature })),
        ];
        const registros = sobreposicoes.length ? sobreposicoes : [null];
        return registros.map((sobreposicao) => {
          const restricao = sobreposicao?.tipo === "restricao" ? esc(sobreposicao.feature.nome) : "Sem sobreposição";
          const risco = sobreposicao?.tipo === "risco" ? esc(sobreposicao.feature.nome) : "Sem sobreposição";
          return `<tr${rowCls}><td><span class="${badge.css}">${esc(badge.label)}</span></td><td>${esc(linha.nome)}</td><td>${esc(linha.restricaoResultado)}</td><td>${esc(linha.riscoResultado)}</td><td>${restricao}</td><td>${risco}</td></tr>`;
        });
      })
      .join("");

    $("fase1-relatorio-conteudo").innerHTML = `
      <div class="fase1-report-header">
        <div>
          <h3>Relatório da Fase 1</h3>
          <p>Rodada ${esc(modelo.codigo)} · ${esc(modelo.nome)}</p>
        </div>
        <div><small>Concluído em ${esc(modelo.concluidoEm || "—")}</small></div>
      </div>
      <section class="fase1-report-section">
        <header class="fase1-report-section-head"><h4>Informações gerais</h4></header>
        <div class="fase1-report-section-body">
          <div class="fase1-report-grid">
            <div class="fase1-report-kpi"><small>Objetos avaliados</small><strong>${esc(modelo.resumo.objetos)}</strong></div>
            <div class="fase1-report-kpi"><small>Restritos</small><strong>${esc(modelo.resumo.restritos)}</strong></div>
            <div class="fase1-report-kpi"><small>Aptos com ressalva</small><strong>${esc(modelo.resumo.comRisco)}</strong></div>
            <div class="fase1-report-kpi"><small>Aptos sem ocorrência</small><strong>${esc(modelo.resumo.semOcorrencia)}</strong></div>
          </div>
          <div class="fase1-report-cards">
            <article class="fase1-report-card">
              <h4>Camadas homologadas</h4>
              <dl class="fase1-report-dl">
                <dt>Restrição</dt><dd>${esc((modelo.camadas.restricao || {}).nome || "—")}</dd>
                <dt>Risco</dt><dd>${esc((modelo.camadas.risco || {}).nome || "—")}</dd>
              </dl>
            </article>
            <article class="fase1-report-card">
              <h4>Regra aplicada</h4>
              <dl class="fase1-report-dl">
                <dt>Limiar de restrição</dt><dd>${esc(((modelo.fatiamento.parametros || {}).restricao || {}).limiar ?? "—")}</dd>
                <dt>Categoria de risco</dt><dd>${esc(classesTxt)}</dd>
              </dl>
            </article>
          </div>
        </div>
      </section>`;
    $("fase1-relatorio-tbody").innerHTML =
      linhas || '<tr><td colspan="6">Sem objetos avaliados.</td></tr>';
    box.classList.remove("hidden");
    if (vazio) vazio.classList.add("hidden");

    renderMapaSobreposicao(modelo);

    botaoDownload.classList.remove("hidden");
    botaoDownload.onclick = () => {
      exportarRelatorioPdf(modelo);
    };
  }

  async function executar() {
    const hierarquizacao = atual();
    const pacote = parAtual();
    const restricaoOption = $("#camada-restricao").selectedOptions[0];
    const camadaRestricao = $("#camada-restricao").value;
    const camadaRisco = $("#camada-risco").value;
    const standalone = restricaoOption?.dataset.standalone === "1";

    if (!hierarquizacao || !camadaRestricao || !camadaRisco || (!pacote && !standalone)) {
      return erro(
        "Selecione a hierarquização e as duas camadas homologadas."
      );
    }

    try {
      limparErro();
      $("#executar-fase1").disabled = true;

      const atualizado = await HierApi.executarFase1(hierarquizacao.codigo, {
        par_id: pacote ? pacote.pacote_id : null,
        camada_restricao_id: camadaRestricao,
        camada_risco_id: camadaRisco,
      });

      hierarquizacoes = hierarquizacoes.map((item) =>
        item.codigo === atualizado.codigo ? atualizado : item
      );

      renderHierarquizacao();
      renderRelatorio(atualizado);
      if (window.SLTFeedback) {
        window.SLTFeedback.success(
          "Fase 1 executada. Confira o relatório de risco e restrição abaixo.",
          "Cálculo concluído"
        );
      }
    } catch (e) {
      erro(e);
    } finally {
      $("#executar-fase1").disabled = false;
    }
  }

  const CAMPOS_VALIDACAO = [
    "#fase-hierarquizacao",
    "#camada-restricao",
    "#camada-risco",
    "#modelo-fase1",
  ];

  function marcarCampo(control) {
    if (!control) return;
    const rotulo = control.closest("label") || control.parentElement;
    if (!rotulo) return;
    const preenchido = !control.disabled && String(control.value || "").trim() !== "";
    rotulo.classList.toggle("campo-valido", preenchido);
    rotulo.classList.toggle("campo-pendente", !preenchido);
  }

  function revalidarCampos() {
    CAMPOS_VALIDACAO.forEach((sel) => marcarCampo(document.querySelector(sel)));
  }

  function configurarValidacaoVisual() {
    CAMPOS_VALIDACAO.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const evento = el.tagName === "SELECT" ? "change" : "input";
      el.addEventListener(evento, () => marcarCampo(el));
    });
  }

  function moverControlesParaCards() {
    const mover = (hostId, ...labelIds) => {
      const host = document.getElementById(hostId);
      if (!host) return;
      labelIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) host.appendChild(el);
      });
    };
    mover("gp-demandas-ctrl", "ctrl-hier");
    mover("gp-risco-restricao-ctrl", "ctrl-restricao", "ctrl-risco");
    const origem = document.getElementById("fase1-controles-origem");
    if (origem) origem.removeAttribute("hidden");
  }

  async function init() {
    try {
      moverControlesParaCards();
      const bibliotecaPromise = fetch(
        "/api/geoespacial/biblioteca-canonica/arquivos?modulo=fase1",
        { credentials: "same-origin" }
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
      [hierarquizacoes, pares, camadasHomologadas] =
        await Promise.all([
          HierApi.listar(),
          HierApi.listarPacotes("fase1"),
          bibliotecaPromise,
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

      renderHierarquizacao();

      selectHier.onchange = renderHierarquizacao;
      $("#camada-restricao").onchange = associarRiscos;
      $("#camada-risco").onchange = () => {
        renderCamadas();
        enviarCamadaParaBancada($("#camada-risco").value, "risco", "risco");
        revalidarCampos();
      };
      configurarValidacaoVisual();
      $("#executar-fase1").onclick = executar;

      const modalObjetos = document.getElementById("modal-objetos");
      if (modalObjetos) {
        const fecharModal = () => modalObjetos.classList.add("hidden");
        modalObjetos.querySelector("[data-modal-close]")?.addEventListener("click", fecharModal);
        modalObjetos.addEventListener("click", (e) => {
          if (e.target === modalObjetos) fecharModal();
        });
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && !modalObjetos.classList.contains("hidden")) fecharModal();
        });
      }

      associarRiscos();
      revalidarCampos();
    } catch (e) {
      erro(e);
    }
  }

  init();
})();
