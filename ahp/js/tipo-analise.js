(function () {
  "use strict";

  const TIPO_KEY = "slt_ahp_tipo";
  const DRAFT_KEY = "slt_ahp_config_draft";
  const CONFIG_KEY = "slt_ahp_config_atual";
  const API = "/api";

  const form = document.getElementById("form-tipo-analise");
  const cards = document.querySelectorAll(".ahp-tipo-card");
  const nomeInput = document.getElementById("config-nome");
  const descInput = document.getElementById("config-descricao");
  const objInput = document.getElementById("config-objetivo");
  // Comboboxes (select + campo "Outro") criados na inicialização.
  let areaCombo, temaCombo, fenomenoCombo;
  // Comboboxes da construção do objetivo.
  let acaoCombo, objetoCombo;
  // Comboboxes da construção da descrição.
  let perspectivaCombo, finalidadeCombo;
  // Instâncias do componente de Sugestões (escopo / objetivo / descrição).
  let sugEscopo, sugObjetivo, sugDescricao;
  const portfolioSection = document.getElementById("portfolio-section");
  const tipoDemandaSel = document.getElementById("config-tipo-demanda");
  const filtrosWrap = document.getElementById("portfolio-filtros");
  const addFiltroBtn = document.getElementById("add-filtro");
  const logicosWrap = document.getElementById("filtros-logicos");
  const addLogicoBtn = document.getElementById("add-logico");
  const resumoWrap = document.getElementById("amostra-resumo");
  const previewText = document.getElementById("portfolio-preview-text");

  // Biblioteca de sugestões para orientar a construção do escopo, do geral ao
  // específico: área do conhecimento -> tema -> fenômeno -> objetivo.
  // São apenas pontos de partida — o usuário pode digitar livremente.
  const SUGESTOES_AREA = [
    "Logística e transporte",
    "Mobilidade urbana",
    "Infraestrutura",
    "Planejamento territorial",
    "Meio ambiente e sustentabilidade",
    "Saneamento",
    "Gestão de riscos e desastres",
  ];

  // Tema = aspecto sob o qual as alternativas são avaliadas (entra após "à").
  const SUGESTOES_TEMA = [
    "Execução",
    "Implantação",
    "Operação",
    "Manutenção",
    "Planejamento",
    "Priorização",
    "Investimento",
  ];

  const SUGESTOES_FENOMENO = [
    "Favorabilidade",
    "Aptidão",
    "Viabilidade",
    "Vulnerabilidade",
    "Suscetibilidade",
    "Prioridade",
    "Risco",
    "Impacto",
  ];

  // ---- Bibliotecas para a construção do objetivo ----
  // Ação final: verbo da ação que a análise produz. O sistema pode reescrever o
  // verbo para uma redação mais formal (ex.: "ranquear" -> "Estabelecer um ranking de").
  const SUGESTOES_ACAO = [
    "Ranquear",
    "Priorizar",
    "Classificar",
    "Selecionar",
    "Comparar",
  ];

  // Objeto (somente avulsa — no portfólio vem do tipo de demanda).
  const SUGESTOES_OBJETO = [
    "alternativas",
    "projetos",
    "empreendimentos",
    "intervenções",
  ];

  // ---- Bibliotecas para a construção da descrição ----
  // Perspectiva: abordagem do estudo (vira verbo no infinitivo na frase).
  const SUGESTOES_PERSPECTIVA = ["Análise", "Avaliação", "Exame"];
  const PERSPECTIVA_INF = {
    análise: "Analisar",
    analise: "Analisar",
    avaliação: "Avaliar",
    avaliacao: "Avaliar",
    exame: "Examinar",
  };

  // Finalidade do estudo (propósito final da frase).
  const SUGESTOES_FINALIDADE = [
    "apoiar a decisão",
    "estruturar a análise",
    "comparar alternativas",
  ];
  const FINALIDADE_FRASE = {
    "apoiar a decisão": "apoiar a tomada de decisão",
  };

  // Dimensões dos critérios (conceito metodológico adiantado para esta seção).
  const DIMENSOES = [
    "ambientais",
    "sociais",
    "econômicas",
    "técnicas",
    "institucionais",
    "territoriais",
  ];
  const DIMENSOES_PADRAO = ["ambientais", "sociais", "econômicas", "técnicas"];

  function perspectivaInfinitivo(p) {
    const k = (p || "").trim().toLowerCase();
    if (!k) return "";
    return PERSPECTIVA_INF[k] || ucFirst(k);
  }

  function finalidadeFrase(f) {
    const k = (f || "").trim().toLowerCase();
    if (!k) return "";
    return FINALIDADE_FRASE[k] || k;
  }

  // Junta lista com vírgulas e "e" antes do último item.
  function juntarLista(itens) {
    const xs = itens.filter(Boolean);
    if (xs.length === 0) return "";
    if (xs.length === 1) return xs[0];
    return xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1];
  }

  // Reescrita do verbo para uma forma de objetivo (verbo + complemento).
  // Mapa de verbos conhecidos; verbos livres caem no fallback infinitivo.
  const VERBO_FRAG = {
    ranquear: "Estabelecer um ranking de",
    rankear: "Estabelecer um ranking de",
    priorizar: "Priorizar",
    hierarquizar: "Hierarquizar",
    classificar: "Classificar",
    ordenar: "Ordenar",
    selecionar: "Selecionar",
    comparar: "Comparar",
  };

  // Fragmento da ação já ligado ao objeto (cada verbo conecta diferente).
  function acaoFragmento(verbo, objeto) {
    const v = (verbo || "").trim().toLowerCase();
    const obj = (objeto || "").trim();
    if (!v || !obj) return "";
    const frag = VERBO_FRAG[v] || ucFirst(v);
    return frag + " " + obj;
  }

  // Artigo do construto (fenômeno): "da" (fem.) por padrão, "do" p/ masculinos.
  const CONSTRUTO_MASC = new Set(["risco", "impacto"]);
  function artigoConstruto(fen) {
    return CONSTRUTO_MASC.has((fen || "").trim().toLowerCase()) ? "do" : "da";
  }

  // Conector do recorte (tema): "à sua" (fem.) ou "ao seu" (masc.).
  const RECORTE_MASC = new Set([
    "planejamento",
    "investimento",
    "desenvolvimento",
  ]);
  function conectorRecorte(tema) {
    return RECORTE_MASC.has((tema || "").trim().toLowerCase()) ? "ao seu" : "à sua";
  }

  // Contração simples a+artigo: "à" (fem.) ou "ao" (masc.) — usada na descrição.
  function artigoA(tema) {
    return RECORTE_MASC.has((tema || "").trim().toLowerCase()) ? "ao" : "à";
  }

  // No AHP a base de julgamento é sempre o conjunto de critérios — implícito.
  const BASE_JULGAMENTO = "um conjunto de critérios";

  function preencherSelect(sel, valores) {
    if (!sel) return;
    sel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
    valores.forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
  }

  // Combobox: lista suspensa que já serve os valores da biblioteca + "Outro (digitar)".
  function makeCombo(selectId, customId, valores, onChange) {
    const sel = document.getElementById(selectId);
    const cust = document.getElementById(customId);
    const notify = onChange || onEscopoChange;
    preencherSelect(sel, valores);
    const outro = document.createElement("option");
    outro.value = "__outro__";
    outro.textContent = "Outro (digitar)…";
    sel.appendChild(outro);

    function sync() {
      cust.classList.toggle("is-hidden", sel.value !== "__outro__");
    }
    sel.addEventListener("change", function () {
      sync();
      if (sel.value === "__outro__") cust.focus();
      notify();
    });
    cust.addEventListener("input", notify);

    return {
      get() {
        return (sel.value === "__outro__" ? cust.value : sel.value).trim();
      },
      set(v) {
        v = v || "";
        const has = Array.prototype.some.call(
          sel.options,
          (o) => o.value === v && o.value !== "__outro__"
        );
        if (v && has) {
          sel.value = v;
          cust.value = "";
        } else if (v) {
          sel.value = "__outro__";
          cust.value = v;
        } else {
          sel.value = "";
          cust.value = "";
        }
        sync();
      },
      focus() {
        sel.focus();
      },
    };
  }

  function lcFirst(s) {
    return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  }

  function ucFirst(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  // Nome (plural simples) da alternativa, vindo do tipo de demanda do portfólio.
  // Ex.: "Projeto" -> "Projetos". É o objeto hierarquizado.
  function alternativaNome() {
    const found = state.tiposDemanda.find(
      (t) => String(t.id) === String(tipoDemandaSel.value)
    );
    if (!found || !found.nome) return "";
    const n = found.nome.trim();
    return /s$/i.test(n) ? n : n + "s";
  }

  // Artigo simples do construto: "a" (fem.) / "o" (masc.).
  function artSimplesConstruto(fen) {
    return CONSTRUTO_MASC.has((fen || "").trim().toLowerCase()) ? "o" : "a";
  }

  // Objeto do escopo: no portfólio vem do tipo de demanda (plural); na avulsa,
  // do campo objeto.
  function objetoEscopo() {
    if (tipoSelecionado() === "portfolio") return alternativaNome();
    return objetoCombo ? ucFirst(objetoCombo.get()) : "";
  }

  // ---- Geradores de 3 versões "polidas" para o componente de Sugestões ----

  // Escopo (título): {Fenômeno} de {Objeto} de {Área} à {Tema} (e variações).
  function escopoVariantes() {
    const fen = fenomenoCombo ? fenomenoCombo.get() : "";
    const area = areaCombo ? areaCombo.get() : "";
    const tema = temaCombo ? temaCombo.get() : "";
    const obj = objetoEscopo();
    if (!fen && !area && !tema && !obj) return ["", "", ""];
    const temaL = lcFirst(tema);
    const aTema = artigoA(tema);

    let v1 = fen;
    if (obj) v1 += (v1 ? " de " : "") + obj;
    if (area) v1 += (v1 ? " de " : "") + area;
    if (tema) v1 += (v1 ? " " + aTema + " " : "") + temaL;

    let v2 = fen;
    if (obj) v2 += (v2 ? " de " : "") + obj;
    if (area) v2 += (v2 ? " em " : "") + area;
    if (tema) v2 += (v2 ? " quanto " + aTema + " " : "") + temaL;

    let v3 = fen;
    if (tema) v3 += (v3 ? " " + aTema + " " : "") + temaL;
    if (obj) v3 += (v3 ? " de " : "") + obj;
    if (area) v3 += (v3 ? " no campo de " : "") + area;

    return [ucFirst(v1.trim()), ucFirst(v2.trim()), ucFirst(v3.trim())];
  }

  // Objetivo: [Ação+objeto] de [domínio] ... comparação pareada de critérios.
  function objetivoVariantes() {
    const isPort = tipoSelecionado() === "portfolio";
    const acao = acaoCombo ? acaoCombo.get() : "";
    const objeto = isPort
      ? alternativaNome().toLowerCase()
      : (objetoCombo ? objetoCombo.get() : "").toLowerCase();
    const frag = acaoFragmento(acao, objeto);
    if (!frag) return ["", "", ""];
    const dominio = (areaCombo ? areaCombo.get() : "").toLowerCase();
    const construto = (fenomenoCombo ? fenomenoCombo.get() : "").toLowerCase();
    const recorte = (temaCombo ? temaCombo.get() : "").toLowerCase();
    const dom = dominio ? " de " + dominio : "";
    const aC = artigoConstruto(construto);
    const aCs = artSimplesConstruto(construto);
    const cr = conectorRecorte(recorte);
    const ar = artigoA(recorte);

    let v1 = frag + dom;
    if (construto) v1 += " com base na análise " + aC + " " + construto;
    if (recorte) v1 += " " + cr + " " + recorte;
    v1 += ", obtida por meio da comparação pareada de " + BASE_JULGAMENTO + ".";

    let v2 = frag + dom;
    if (construto) v2 += " segundo " + aCs + " " + construto;
    if (recorte) v2 += " " + ar + " " + recorte;
    v2 += ", mediante comparação pareada de critérios.";

    let v3 = frag + dom;
    if (construto) v3 += ", considerando " + aCs + " " + construto;
    if (recorte) v3 += " " + ar + " " + recorte;
    v3 += ", por meio de comparação pareada de um conjunto de critérios.";

    return [v1, v2, v3];
  }

  // Descrição: [Perspectiva-inf] [objeto] de [domínio] ... dimensões ... propósito.
  function descricaoVariantes() {
    const isPort = tipoSelecionado() === "portfolio";
    const persp = perspectivaInfinitivo(perspectivaCombo ? perspectivaCombo.get() : "");
    const objeto = isPort
      ? alternativaNome().toLowerCase()
      : (objetoCombo ? objetoCombo.get() : "").toLowerCase();
    if (!persp || !objeto) return ["", "", ""];
    const dominio = (areaCombo ? areaCombo.get() : "").toLowerCase();
    const construto = (fenomenoCombo ? fenomenoCombo.get() : "").toLowerCase();
    const recorte = (temaCombo ? temaCombo.get() : "").toLowerCase();
    const fin = finalidadeFrase(finalidadeCombo ? finalidadeCombo.get() : "");
    const dims = juntarLista(state.dimensoes);
    const dom = dominio ? " de " + dominio : "";
    const aC = artigoConstruto(construto);
    const aCs = artSimplesConstruto(construto);
    const ar = artigoA(recorte);

    let v1 = persp + " " + objeto + dom;
    if (construto) v1 += " sob o escopo " + aC + " " + construto;
    if (recorte) v1 += " " + ar + " " + recorte;
    v1 += ", considerando sua aderência a um conjunto de critérios";
    if (dims) v1 += ", cujos critérios podem abranger dimensões " + dims;
    if (fin) v1 += ", com o propósito de " + fin;
    v1 += ".";

    let v2 = persp + " " + objeto + dom;
    if (construto) v2 += " a partir " + aC + " " + construto;
    if (recorte) v2 += " " + ar + " " + recorte;
    v2 += ", com base em um conjunto de critérios";
    if (dims) v2 += " das dimensões " + dims;
    if (fin) v2 += ", visando " + fin;
    v2 += ".";

    let v3 = persp + " " + objeto + dom;
    if (construto) v3 += ", examinando " + aCs + " " + construto;
    if (recorte) v3 += " " + ar + " " + recorte;
    v3 += " por meio de critérios";
    if (dims) v3 += " que abrangem dimensões " + dims;
    if (fin) v3 += ", a fim de " + fin;
    v3 += ".";

    return [v1, v2, v3];
  }

  const state = {
    tiposDemanda: [], // [{id, codigo, nome}]
    diretorias: [], // [{id, nome}]
    planos: [], // [{id, nome, diretoria_id}]
    programas: [], // [{id, nome, plano_id}]
    demandas: [], // universo do tipo atual (colunas ricas)
    campos: [], // metadados dos campos: [{campo, rotulo, tipo:'data'|'texto'}]
    subconjunto: [], // filtro simples: [{campo, valor}] ou {campo, de, ate} (data)
    logicos: [], // filtros lógicos: [{conector, campo, operador, valor}] ou data com de/ate
    universoConfirmado: false, // conjunto de objetos travado pelo usuário
    universoObjetos: [], // snapshot confirmado: [{id, codigo, nome, tipo_demanda}]
    universoSig: "", // assinatura do conjunto confirmado (auto-invalidação)
    dimensoes: DIMENSOES_PADRAO.slice(), // dimensões marcadas (descrição)
    // Estado das Sugestões por seção: textos (3), travas de edição, seleção e
    // texto confirmado (o que persiste).
    sug: {
      escopo: { textos: ["", "", ""], editados: [false, false, false], sel: -1, confirmado: "" },
      objetivo: { textos: ["", "", ""], editados: [false, false, false], sel: -1, confirmado: "" },
      descricao: { textos: ["", "", ""], editados: [false, false, false], sel: -1, confirmado: "" },
    },
  };

  // Fábrica do componente de Sugestões. Renderiza 3 versões geradas, permite
  // selecionar (clique no card), editar/cancelar/salvar (ícones) e confirmar.
  function criarSugestoes(opts) {
    const container = document.getElementById(opts.containerId);
    const st = state.sug[opts.chave];
    const editando = [false, false, false]; // estado de edição (não persistido)
    let textareaEdicao = null;

    function persistirEstado() {
      saveDraft();
    }

    function regenerar() {
      const novos = opts.gerar();
      for (let i = 0; i < 3; i++) {
        if (!st.editados[i]) st.textos[i] = novos[i] || "";
      }
      // Cascata: se o texto selecionado mudou em relação ao confirmado, a
      // confirmação deixa de valer (e destrava as etapas seguintes).
      if (st.confirmado && (st.sel < 0 || st.confirmado !== st.textos[st.sel])) {
        st.confirmado = "";
        opts.aoConfirmar("");
      }
      render();
      refreshGates();
    }

    function estaConfirmado() {
      return (
        st.sel >= 0 &&
        !!st.confirmado &&
        st.confirmado === st.textos[st.sel] &&
        (!opts.podeMostrar || opts.podeMostrar())
      );
    }

    function selecionar(i) {
      if (editando[i]) return;
      st.sel = i;
      persistirEstado();
      render();
      refreshGates();
    }

    function iniciarEdicao(i) {
      editando[i] = true;
      st.preEdicao = st.preEdicao || ["", "", ""];
      st.preEdicao[i] = st.textos[i];
      render();
      if (textareaEdicao) textareaEdicao.focus();
    }

    function cancelarEdicao(i) {
      editando[i] = false;
      if (st.preEdicao) st.textos[i] = st.preEdicao[i];
      render();
    }

    function salvarEdicao(i) {
      if (textareaEdicao) st.textos[i] = textareaEdicao.value.trim();
      st.editados[i] = true;
      editando[i] = false;
      // Editar invalida a confirmação anterior — exige reconfirmar.
      if (st.confirmado && (st.sel < 0 || st.confirmado !== st.textos[st.sel])) {
        st.confirmado = "";
        opts.aoConfirmar("");
      }
      persistirEstado();
      render();
      refreshGates();
    }

    function confirmar() {
      if (st.sel < 0) return;
      st.confirmado = st.textos[st.sel];
      opts.aoConfirmar(st.confirmado);
      persistirEstado();
      render();
      refreshGates();
    }

    function iconBtn(icon, titulo, variante, onClick) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-icon " + (variante || "btn-secondary");
      b.title = titulo;
      b.innerHTML = '<i class="fas ' + icon + '" aria-hidden="true"></i>';
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        onClick();
      });
      return b;
    }

    function render() {
      container.innerHTML = "";
      // O card de Sugestões inteiro fica oculto até a etapa estar liberada
      // (o card pai encolhe/expande dinamicamente).
      const liberado = !opts.podeMostrar || opts.podeMostrar();
      const temConteudo = st.textos.some((t) => t && t.trim());
      if (!liberado || !temConteudo) {
        container.classList.add("is-hidden");
        return;
      }
      container.classList.remove("is-hidden");

      const head = document.createElement("div");
      head.className = "ahp-sug-head";
      head.innerHTML = '<i class="fas fa-lightbulb" aria-hidden="true"></i> Sugestões';
      container.appendChild(head);

      const list = document.createElement("div");
      list.className = "ahp-sug-list";
      textareaEdicao = null;

      st.textos.forEach((texto, i) => {
        const item = document.createElement("div");
        item.className = "ahp-sug-item";
        if (st.sel === i) item.classList.add("selected");
        if (st.confirmado && st.confirmado === texto && st.sel === i) {
          item.classList.add("confirmado");
        }

        const card = document.createElement("div");
        card.className = "ahp-sug-card";

        if (editando[i]) {
          const ta = document.createElement("textarea");
          ta.className = "c-form-control ahp-sug-edit";
          ta.value = texto;
          card.appendChild(ta);
          textareaEdicao = ta;
        } else {
          card.addEventListener("click", function () {
            selecionar(i);
          });
          if (st.confirmado && st.confirmado === texto && st.sel === i) {
            const badge = document.createElement("span");
            badge.className = "ahp-sug-badge";
            badge.textContent = "Confirmada";
            card.appendChild(badge);
          }
          const p = document.createElement("p");
          p.className = "ahp-sug-text";
          p.textContent = texto || "—";
          card.appendChild(p);
        }

        const actions = document.createElement("div");
        actions.className = "ahp-sug-actions";
        if (editando[i]) {
          actions.appendChild(
            iconBtn("fa-floppy-disk", "Salvar edição", "btn-primary", function () {
              salvarEdicao(i);
            })
          );
          actions.appendChild(
            iconBtn("fa-xmark", "Cancelar edição", "btn-secondary", function () {
              cancelarEdicao(i);
            })
          );
        } else {
          actions.appendChild(
            iconBtn("fa-pencil", "Editar esta versão", "btn-secondary", function () {
              iniciarEdicao(i);
            })
          );
        }

        item.appendChild(card);
        item.appendChild(actions);
        list.appendChild(item);
      });
      container.appendChild(list);

      const confirmWrap = document.createElement("div");
      confirmWrap.className = "ahp-sug-confirm-wrap";
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "btn btn-primary";
      confirmBtn.textContent =
        st.confirmado && st.confirmado === st.textos[st.sel] ? "Confirmado" : "Confirmar";
      confirmBtn.disabled = st.sel < 0 || editando.some(Boolean);
      confirmBtn.addEventListener("click", confirmar);
      confirmWrap.appendChild(confirmBtn);
      container.appendChild(confirmWrap);
    }

    return { regenerar: regenerar, render: render };
  }

  // Monta os checkboxes de dimensões dos critérios.
  function renderDimensoes() {
    const wrap = document.getElementById("config-dimensoes");
    if (!wrap) return;
    wrap.innerHTML = "";
    DIMENSOES.forEach((dim) => {
      const label = document.createElement("label");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.value = dim;
      chk.checked = state.dimensoes.indexOf(dim) !== -1;
      chk.addEventListener("change", function () {
        if (chk.checked) {
          if (state.dimensoes.indexOf(dim) === -1) state.dimensoes.push(dim);
        } else {
          state.dimensoes = state.dimensoes.filter((d) => d !== dim);
        }
        // Reordena conforme a ordem canônica das dimensões.
        state.dimensoes = DIMENSOES.filter((d) => state.dimensoes.indexOf(d) !== -1);
        onDescricaoChange();
      });
      const span = document.createElement("span");
      span.textContent = dim;
      label.appendChild(chk);
      label.appendChild(span);
      wrap.appendChild(label);
    });
  }

  const OPERADORES = [
    { value: "eq", label: "igual a" },
    { value: "ne", label: "diferente de" },
    { value: "contains", label: "contém" },
  ];

  function tipoSelecionado() {
    const sel = form.querySelector('input[name="tipo_analise"]:checked');
    return sel ? sel.value : null;
  }

  function tipoDemandaCodigo() {
    const id = tipoDemandaSel.value;
    const found = state.tiposDemanda.find((t) => String(t.id) === String(id));
    return found ? found.codigo : null;
  }

  async function apiGet(path) {
    const res = await fetch(API + path, { credentials: "same-origin" });
    if (!res.ok) throw new Error("Falha ao carregar " + path + " (" + res.status + ")");
    return res.json();
  }

  function syncCards() {
    cards.forEach((card) => {
      const input = card.querySelector('input[type="radio"]');
      card.classList.toggle("selected", input.checked);
    });
  }

  function saveDraft() {
    const draft = {
      nome: nomeInput.value,
      area_conhecimento: areaCombo ? areaCombo.get() : "",
      tema: temaCombo ? temaCombo.get() : "",
      fenomeno: fenomenoCombo ? fenomenoCombo.get() : "",
      descricao: descInput ? descInput.value : "",
      objetivo: objInput ? objInput.value : "",
      acao: acaoCombo ? acaoCombo.get() : "",
      objeto: objetoCombo ? objetoCombo.get() : "",
      perspectiva: perspectivaCombo ? perspectivaCombo.get() : "",
      finalidade: finalidadeCombo ? finalidadeCombo.get() : "",
      dimensoes: state.dimensoes,
      sug: state.sug,
      tipo: tipoSelecionado(),
      tipo_demanda_id: tipoDemandaSel.value || null,
      subconjunto: state.subconjunto,
      logicos: state.logicos,
      universoConfirmado: state.universoConfirmado,
      universoObjetos: state.universoObjetos,
      universoSig: state.universoSig,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      /* ignore */
    }
  }

  function loadDraft() {
    try {
      return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  const miniDimensao = document.getElementById("mini-dimensao");
  const miniObjetoAvulsa = document.getElementById("mini-objeto-avulsa");

  function togglePortfolio() {
    const tipo = tipoSelecionado();
    const isPortfolio = tipo === "portfolio";
    portfolioSection.classList.toggle("is-hidden", !isPortfolio);
    // A dimensão (tipo de demanda) só faz sentido no portfólio: é a chave que
    // delimita o universo e entra no título.
    if (miniDimensao) miniDimensao.classList.toggle("is-hidden", !isPortfolio);
    // Objeto manual só na avulsa (no portfólio o objeto vem do tipo de demanda).
    if (miniObjetoAvulsa) miniObjetoAvulsa.classList.toggle("is-hidden", tipo !== "avulsa");
  }

  // Campos disponíveis para estratificar (ricos, vindos do backend).
  function camposDisponiveis() {
    return state.campos;
  }

  function campoTipo(campo) {
    const c = state.campos.find((x) => x.campo === campo);
    return c ? c.tipo : "texto";
  }

  function rotuloValor(campo, val) {
    if (campo === "diretoria_id") {
      const d = state.diretorias.find((x) => String(x.id) === String(val));
      return d ? d.nome : val;
    }
    if (campo === "plano_id") {
      const p = state.planos.find((x) => String(x.id) === String(val));
      return p ? p.nome : val;
    }
    if (campo === "programa_id") {
      const p = state.programas.find((x) => String(x.id) === String(val));
      return p ? p.nome : val;
    }
    return val;
  }

  // Valores distintos presentes no universo carregado para um dado campo.
  function valoresDe(campo) {
    const set = new Set();
    state.demandas.forEach((d) => {
      const v = d[campo];
      if (v !== null && v !== undefined && v !== "") set.add(String(v));
    });
    return Array.from(set)
      .map((v) => ({ value: v, label: String(rotuloValor(campo, v)) }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }

  function makeOption(value, label) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
  }

  // Célula de valor: select único, ou dois date inputs (período) para campo data.
  function valorCell(cond, onChange) {
    const cell = document.createElement("div");
    cell.className = "ahp-valor-cell";
    if (cond.campo && campoTipo(cond.campo) === "data") {
      const de = document.createElement("input");
      de.type = "date";
      de.className = "c-form-control";
      de.value = cond.de || "";
      de.title = "De";
      const ate = document.createElement("input");
      ate.type = "date";
      ate.className = "c-form-control";
      ate.value = cond.ate || "";
      ate.title = "Até";
      de.addEventListener("change", function () {
        cond.de = de.value || "";
        onChange();
      });
      ate.addEventListener("change", function () {
        cond.ate = ate.value || "";
        onChange();
      });
      cell.classList.add("ahp-valor-cell--data");
      cell.appendChild(de);
      cell.appendChild(ate);
    } else {
      const sel = document.createElement("select");
      sel.className = "c-form-control";
      sel.appendChild(makeOption("", "Selecione o valor…"));
      let conhecido = false;
      if (cond.campo) {
        valoresDe(cond.campo).forEach((v) => {
          sel.appendChild(makeOption(v.value, v.label));
          if (String(v.value) === String(cond.valor)) conhecido = true;
        });
      }
      sel.appendChild(makeOption("__outro__", "Outro (digitar)…"));
      sel.disabled = !cond.campo;

      const custom = document.createElement("input");
      custom.type = "text";
      custom.className = "c-form-control";
      custom.placeholder = "Digite o valor";
      const ehOutro = !!cond.valor && !conhecido;
      custom.classList.toggle("is-hidden", !ehOutro);
      if (ehOutro) custom.value = cond.valor;
      sel.value = ehOutro ? "__outro__" : cond.valor || "";

      sel.addEventListener("change", function () {
        if (sel.value === "__outro__") {
          custom.classList.remove("is-hidden");
          cond.valor = custom.value || "";
          custom.focus();
        } else {
          custom.classList.add("is-hidden");
          cond.valor = sel.value || "";
        }
        onChange();
      });
      custom.addEventListener("input", function () {
        cond.valor = custom.value || "";
        onChange();
      });
      cell.appendChild(sel);
      cell.appendChild(custom);
    }
    return cell;
  }

  function tipoDemandaNome() {
    const f = state.tiposDemanda.find((t) => String(t.id) === String(tipoDemandaSel.value));
    return f ? f.nome.toLowerCase() : "demanda";
  }

  function campoSelect(valorAtual) {
    const sel = document.createElement("select");
    sel.className = "c-form-control";
    sel.appendChild(
      makeOption("", "Selecione o atributo de " + tipoDemandaNome() + " que deseja filtrar…")
    );
    camposDisponiveis().forEach((c) => sel.appendChild(makeOption(c.campo, c.rotulo)));
    sel.value = valorAtual || "";
    return sel;
  }

  // Cabeçalho de colunas (rótulos) para uma grade de filtros.
  function headerRow(rotulos, classe) {
    const head = document.createElement("div");
    head.className = classe + " ahp-filtro-head";
    rotulos.forEach((r) => {
      const span = document.createElement("span");
      span.textContent = r;
      head.appendChild(span);
    });
    return head;
  }

  function removeButton(titulo, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-icon ahp-filtro-remove";
    btn.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';
    btn.title = titulo;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderFiltros() {
    filtrosWrap.innerHTML = "";
    if (!tipoDemandaCodigo()) return;
    if (state.subconjunto.length === 0) state.subconjunto.push({ campo: "" });

    filtrosWrap.appendChild(headerRow(["Campo", "Valor", ""], "ahp-filtro-row"));

    state.subconjunto.forEach((filtro, idx) => {
      const row = document.createElement("div");
      row.className = "ahp-filtro-row";

      const campoSel = campoSelect(filtro.campo);
      campoSel.addEventListener("change", function () {
        state.subconjunto[idx] = { campo: campoSel.value || "" };
        renderFiltros();
        saveDraft();
        atualizarPreview();
      });

      const cell = valorCell(filtro, function () {
        saveDraft();
        atualizarPreview();
      });

      const removeBtn = removeButton("Remover filtro", function () {
        state.subconjunto.splice(idx, 1);
        renderFiltros();
        saveDraft();
        atualizarPreview();
      });

      row.appendChild(campoSel);
      row.appendChild(cell);
      row.appendChild(removeBtn);
      filtrosWrap.appendChild(row);
    });
  }

  // ---- Filtros lógicos (operadores booleanos E/OU + operador por condição) ----
  function renderLogicos() {
    logicosWrap.innerHTML = "";
    if (!tipoDemandaCodigo()) return;
    if (state.logicos.length > 0) {
      logicosWrap.appendChild(
        headerRow(["", "Campo", "Operador", "Valor", ""], "ahp-logico-row")
      );
    }

    state.logicos.forEach((cond, idx) => {
      const row = document.createElement("div");
      row.className = "ahp-logico-row";

      if (idx > 0) {
        const conSel = document.createElement("select");
        conSel.className = "c-form-control ahp-conector";
        conSel.appendChild(makeOption("and", "E"));
        conSel.appendChild(makeOption("or", "OU"));
        conSel.value = cond.conector || "and";
        conSel.addEventListener("change", function () {
          state.logicos[idx].conector = conSel.value;
          saveDraft();
          atualizarPreview();
        });
        row.appendChild(conSel);
      } else {
        const spacer = document.createElement("span");
        spacer.className = "ahp-conector ahp-conector-fixo";
        spacer.textContent = "Onde";
        row.appendChild(spacer);
      }

      const campoSel = campoSelect(cond.campo);

      const isData = cond.campo && campoTipo(cond.campo) === "data";
      const opSel = document.createElement("select");
      opSel.className = "c-form-control";
      OPERADORES.forEach((o) => opSel.appendChild(makeOption(o.value, o.label)));
      opSel.value = cond.operador || "eq";
      if (isData) {
        opSel.disabled = true; // data usa período (de/até)
      }

      const cell = valorCell(cond, function () {
        saveDraft();
        atualizarPreview();
      });

      campoSel.addEventListener("change", function () {
        state.logicos[idx] = {
          conector: cond.conector || "and",
          campo: campoSel.value || "",
          operador: "eq",
        };
        renderLogicos();
        saveDraft();
        atualizarPreview();
      });
      opSel.addEventListener("change", function () {
        state.logicos[idx].operador = opSel.value;
        saveDraft();
        atualizarPreview();
      });
      const removeBtn = removeButton("Remover condição", function () {
        state.logicos.splice(idx, 1);
        renderLogicos();
        saveDraft();
        atualizarPreview();
      });

      row.appendChild(campoSel);
      row.appendChild(opSel);
      row.appendChild(cell);
      row.appendChild(removeBtn);
      logicosWrap.appendChild(row);
    });
  }

  function _toDate(v) {
    if (!v) return null;
    const d = new Date(String(v).slice(0, 10));
    return isNaN(d.getTime()) ? null : d;
  }

  function matchData(value, de, ate) {
    if (!de && !ate) return true;
    const v = _toDate(value);
    if (!v) return false;
    if (de) {
      const dd = _toDate(de);
      if (dd && v < dd) return false;
    }
    if (ate) {
      const da = _toDate(ate);
      if (da && v > da) return false;
    }
    return true;
  }

  // Avalia uma condição (com operador) — usada nos filtros lógicos.
  function matchCondicao(d, cond) {
    if (!cond.campo) return true;
    if (campoTipo(cond.campo) === "data") return matchData(d[cond.campo], cond.de, cond.ate);
    if (!cond.valor) return true;
    const v = d[cond.campo];
    if (cond.operador === "ne") return String(v) !== String(cond.valor);
    if (cond.operador === "contains") {
      return String(v == null ? "" : v).toLowerCase().includes(String(cond.valor).toLowerCase());
    }
    return String(v) === String(cond.valor); // eq (padrão)
  }

  function matchLogicos(d) {
    if (state.logicos.length === 0) return true;
    let acc = null;
    state.logicos.forEach((cond, i) => {
      const r = matchCondicao(d, cond);
      if (i === 0) acc = r;
      else acc = cond.conector === "or" ? acc || r : acc && r;
    });
    return acc === null ? true : acc;
  }

  // Filtro simples: igualdade (texto) ou período (data), combinados por E.
  function matchSimples(d) {
    return state.subconjunto.every((f) => {
      if (!f.campo) return true;
      if (campoTipo(f.campo) === "data") return matchData(d[f.campo], f.de, f.ate);
      return !f.valor || String(d[f.campo]) === String(f.valor);
    });
  }

  // Amostra final = filtro simples (E) combinado com filtros lógicos.
  function amostraFiltrada() {
    return state.demandas.filter((d) => matchSimples(d) && matchLogicos(d));
  }

  // ---- Resumo: tabela com os registros filtrados ----
  const RESUMO_MAX = 50;

  function colunasResumo() {
    const cols = [
      { campo: "codigo", rotulo: "Código" },
      { campo: "nome", rotulo: "Nome" },
      { campo: "status", rotulo: "Status" },
    ];
    camposDisponiveis().forEach((c) => {
      if (c.campo !== "status") cols.push(c);
    });
    return cols;
  }

  // Assinatura do conjunto (ids ordenados) — base da auto-invalidação.
  function sigDe(linhas) {
    return linhas
      .map((d) => String(d.id))
      .sort()
      .join(",");
  }

  // Snapshot enxuto e congelado do conjunto confirmado.
  function objetoSnapshot(linhas) {
    const tipo = tipoDemandaCodigo();
    return linhas.map((d) => ({
      id: String(d.id),
      codigo: d.codigo,
      nome: d.nome,
      tipo_demanda: tipo,
    }));
  }

  function confirmarUniverso(linhas) {
    state.universoObjetos = objetoSnapshot(linhas);
    state.universoSig = sigDe(linhas);
    state.universoConfirmado = true;
    saveDraft();
    renderResumo();
  }

  function refazerUniverso() {
    state.universoConfirmado = false;
    state.universoObjetos = [];
    state.universoSig = "";
    saveDraft();
    renderResumo();
  }

  function renderResumoAcoes(linhas) {
    const acoes = document.createElement("div");
    acoes.className = "ahp-universo-confirm";

    if (state.universoConfirmado) {
      const banner = document.createElement("p");
      banner.className = "ahp-universo-confirm__ok";
      banner.innerHTML =
        '<i class="fas fa-circle-check" aria-hidden="true"></i> Universo confirmado: <strong>' +
        state.universoObjetos.length +
        " objeto(s)</strong>. Estes entram na hierarquização ao continuar.";
      acoes.appendChild(banner);

      const refazer = document.createElement("button");
      refazer.type = "button";
      refazer.className = "btn btn-secondary btn-sm";
      refazer.innerHTML = '<i class="fas fa-rotate-left" aria-hidden="true"></i> Refazer seleção';
      refazer.addEventListener("click", refazerUniverso);
      acoes.appendChild(refazer);
    } else {
      const confirmar = document.createElement("button");
      confirmar.type = "button";
      confirmar.className = "btn btn-primary btn-sm";
      confirmar.disabled = linhas.length === 0;
      confirmar.innerHTML =
        '<i class="fas fa-circle-check" aria-hidden="true"></i> Confirmar universo de análise';
      confirmar.addEventListener("click", function () {
        confirmarUniverso(amostraFiltrada());
      });
      acoes.appendChild(confirmar);
    }
    return acoes;
  }

  function renderResumo() {
    if (!resumoWrap) return;
    resumoWrap.innerHTML = "";
    const codigo = tipoDemandaCodigo();
    if (!codigo) return;
    const linhas = amostraFiltrada();

    // Auto-invalidação: se o conjunto mudou após confirmar, destrava.
    if (state.universoConfirmado && sigDe(linhas) !== state.universoSig) {
      state.universoConfirmado = false;
      state.universoObjetos = [];
      state.universoSig = "";
      saveDraft();
    }

    if (linhas.length === 0) {
      resumoWrap.innerHTML = '<p class="ahp-page-desc">Nenhum registro com os filtros atuais.</p>';
      resumoWrap.appendChild(renderResumoAcoes(linhas));
      return;
    }
    const cols = colunasResumo();
    const table = document.createElement("table");
    table.className = "ahp-resumo-table";

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    cols.forEach((c) => {
      const th = document.createElement("th");
      th.textContent = c.rotulo;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    linhas.slice(0, RESUMO_MAX).forEach((d) => {
      const tr = document.createElement("tr");
      cols.forEach((c) => {
        const td = document.createElement("td");
        const raw = d[c.campo];
        td.textContent =
          raw == null || raw === "" ? "—" : String(rotuloValor(c.campo, raw));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    resumoWrap.appendChild(table);

    if (linhas.length > RESUMO_MAX) {
      const more = document.createElement("p");
      more.className = "ahp-page-desc";
      more.textContent =
        "Exibindo " + RESUMO_MAX + " de " + linhas.length + " registros.";
      resumoWrap.appendChild(more);
    }

    resumoWrap.appendChild(renderResumoAcoes(linhas));
  }

  function atualizarPreview() {
    const codigo = tipoDemandaCodigo();
    if (!codigo) {
      previewText.textContent = "Selecione a dimensão (tipo de demanda) para ver o universo.";
      if (resumoWrap) resumoWrap.innerHTML = "";
      return;
    }
    const n = amostraFiltrada().length;
    previewText.textContent =
      n + " demanda(s) elegível(is) no universo com os filtros atuais.";
    renderResumo();
  }

  // Carrega o universo (população) real do tipo selecionado para servir os
  // valores dos filtros e calcular a amostra localmente.
  async function carregarDemandas() {
    const codigo = tipoDemandaCodigo();
    if (!codigo) {
      state.demandas = [];
      state.campos = [];
      return;
    }
    try {
      const [itens, campos] = await Promise.all([
        apiGet("/ahp/universo/" + codigo),
        apiGet("/ahp/universo/" + codigo + "/campos"),
      ]);
      state.demandas = Array.isArray(itens) ? itens : [];
      state.campos = Array.isArray(campos) ? campos : [];
    } catch (e) {
      state.demandas = [];
      state.campos = [];
    }
    // Fallback: se os metadados não vierem, deriva os campos do próprio universo.
    if (state.campos.length === 0 && state.demandas.length > 0) {
      state.campos = Object.keys(state.demandas[0])
        .filter((k) => k !== "id" && k !== "grupo_id" && k !== "tipo_demanda")
        .map((k) => ({
          campo: k,
          rotulo: k,
          tipo: /(_em|_inicio|_fim|data|vigencia)/.test(k) ? "data" : "texto",
        }));
    }
  }

  async function carregarDominios() {
    try {
      state.tiposDemanda = await apiGet("/dominios/tipo-demanda");
      tipoDemandaSel.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
      state.tiposDemanda.forEach((t) => {
        const o = document.createElement("option");
        o.value = t.id;
        o.textContent = t.nome;
        o.dataset.codigo = t.codigo;
        tipoDemandaSel.appendChild(o);
      });
    } catch (e) {
      /* mantém apenas o placeholder */
    }
  }

  async function carregarFontesPortfolio() {
    try {
      await window.SLTCatalog.loadCatalog("../");
      const cat = window.SLTCatalog.catalog || {};
      state.diretorias = window.SLTCatalog.ativos(cat.diretorias).map((d) => ({
        id: d.id,
        nome: d.nome || d.sigla || d.id,
      }));
    } catch (e) {
      state.diretorias = [];
    }
    try {
      const planos = await apiGet("/planos");
      state.planos = (planos || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        diretoria_id: p.diretoria_id || null,
      }));
    } catch (e) {
      state.planos = [];
    }
    try {
      const programas = await apiGet("/programas");
      state.programas = (programas || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        plano_id: p.plano_id || null,
      }));
    } catch (e) {
      state.programas = [];
    }
  }

  async function prefill() {
    const draft = loadDraft();
    if (areaCombo) areaCombo.set(draft.area_conhecimento);
    if (temaCombo) temaCombo.set(draft.tema);
    if (fenomenoCombo) fenomenoCombo.set(draft.fenomeno);
    if (acaoCombo) acaoCombo.set(draft.acao);
    if (objetoCombo) objetoCombo.set(draft.objeto);
    if (perspectivaCombo) perspectivaCombo.set(draft.perspectiva);
    if (finalidadeCombo) finalidadeCombo.set(draft.finalidade);
    if (Array.isArray(draft.dimensoes)) state.dimensoes = draft.dimensoes;
    renderDimensoes();
    // Restaura o estado das Sugestões e reflete os valores confirmados nos
    // campos ocultos que vão ao backend.
    if (draft.sug) state.sug = draft.sug;
    if (nomeInput) nomeInput.value = state.sug.escopo.confirmado || "";
    if (objInput) objInput.value = state.sug.objetivo.confirmado || "";
    if (descInput) descInput.value = state.sug.descricao.confirmado || "";
    const tipo = draft.tipo || localStorage.getItem(TIPO_KEY);
    if (tipo === "avulsa" || tipo === "portfolio") {
      const input = form.querySelector('input[value="' + tipo + '"]');
      if (input) input.checked = true;
    }
    if (Array.isArray(draft.subconjunto)) {
      state.subconjunto = draft.subconjunto;
    }
    if (Array.isArray(draft.logicos)) {
      state.logicos = draft.logicos;
    }
    if (draft.universoConfirmado && Array.isArray(draft.universoObjetos)) {
      state.universoConfirmado = true;
      state.universoObjetos = draft.universoObjetos;
      state.universoSig = draft.universoSig || "";
    }
    syncCards();
    togglePortfolio();
    if (draft.tipo_demanda_id) {
      tipoDemandaSel.value = draft.tipo_demanda_id;
      await carregarDemandas();
    }
    renderFiltros();
    renderLogicos();
    if (tipoSelecionado() === "portfolio") atualizarPreview();
  }

  cards.forEach((card) => {
    card.addEventListener("click", function () {
      const input = card.querySelector('input[type="radio"]');
      input.checked = true;
      syncCards();
      togglePortfolio();
      onEscopoChange();
      if (tipoSelecionado() === "portfolio") atualizarPreview();
    });
  });

  tipoDemandaSel.addEventListener("change", async function () {
    // Trocar o nível reinicia a amostra (campos/valores mudam por tipo).
    state.subconjunto = [];
    state.logicos = [];
    onEscopoChange();
    await carregarDemandas();
    renderFiltros();
    renderLogicos();
    atualizarPreview();
  });

  if (addFiltroBtn) {
    addFiltroBtn.addEventListener("click", function () {
      state.subconjunto.push({ campo: "", valor: "" });
      renderFiltros();
      saveDraft();
    });
  }

  if (addLogicoBtn) {
    addLogicoBtn.addEventListener("click", function () {
      state.logicos.push({ conector: "and", campo: "", operador: "eq", valor: "" });
      renderLogicos();
      saveDraft();
    });
  }

  // Mudança no escopo afeta título, objetivo e descrição (todos reaproveitam).
  function onEscopoChange() {
    if (sugEscopo) sugEscopo.regenerar();
    if (sugObjetivo) sugObjetivo.regenerar();
    if (sugDescricao) sugDescricao.regenerar();
    saveDraft();
  }
  function onObjetivoChange() {
    if (sugObjetivo) sugObjetivo.regenerar();
    saveDraft();
  }
  function onDescricaoChange() {
    if (sugDescricao) sugDescricao.regenerar();
    saveDraft();
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const tipo = tipoSelecionado();
    if (!tipo) {
      alert("Selecione o tipo de análise para continuar.");
      return;
    }
    const nome = nomeInput.value.trim();
    if (!nome) {
      alert("Confirme o escopo (título) nas Sugestões antes de continuar.");
      if (areaCombo) areaCombo.focus();
      return;
    }

    const payload = {
      tipo: tipo,
      nome: nome,
      area_conhecimento: (areaCombo ? areaCombo.get() : "") || null,
      tema: (temaCombo ? temaCombo.get() : "") || null,
      fenomeno: (fenomenoCombo ? fenomenoCombo.get() : "") || null,
      descricao: descInput.value.trim() || null,
      objetivo: (objInput ? objInput.value.trim() : "") || null,
    };

    if (tipo === "portfolio") {
      const codigo = tipoDemandaCodigo();
      if (!codigo) {
        alert("Selecione o tipo de demanda do portfólio.");
        tipoDemandaSel.focus();
        return;
      }
      payload.tipo_demanda = codigo;

      // Filtros válidos (campo e valor preenchidos).
      const filtros = state.subconjunto.filter((f) => f.campo && f.valor);
      const logicos = state.logicos.filter((f) => f.campo && f.valor);
      if (filtros.length === 0 && logicos.length === 0) {
        alert("Adicione ao menos um filtro (campo e valor) no universo amostral.");
        return;
      }

      if (!state.universoConfirmado || state.universoObjetos.length === 0) {
        alert(
          "Confirme o universo da análise (botão «Confirmar universo de análise» no Resumo) antes de continuar."
        );
        return;
      }

      // Recorte do universo gravado como JSON único (configuração dos campos).
      payload.subconjunto = {
        tipo_demanda: codigo,
        filtros: filtros,
        logicos: logicos,
      };
      // Snapshot congelado do conjunto confirmado (alvo da hierarquização).
      payload.universo_objetos = state.universoObjetos;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const created = await window.SLTConfigApi.criar(payload);
      localStorage.setItem(TIPO_KEY, tipo);
      localStorage.setItem(
        CONFIG_KEY,
        JSON.stringify({ tipo: created.tipo, codigo: created.codigo })
      );
      saveDraft();
      window.location.href = "step1-criterios.html";
    } catch (err) {
      alert("Não foi possível criar a configuração: " + (err && err.message ? err.message : err));
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Inicialização
  (async function init() {
    areaCombo = makeCombo("config-area", "config-area-custom", SUGESTOES_AREA);
    temaCombo = makeCombo("config-tema", "config-tema-custom", SUGESTOES_TEMA);
    fenomenoCombo = makeCombo("config-fenomeno", "config-fenomeno-custom", SUGESTOES_FENOMENO);
    acaoCombo = makeCombo("config-acao", "config-acao-custom", SUGESTOES_ACAO, onObjetivoChange);
    objetoCombo = makeCombo("config-objeto", "config-objeto-custom", SUGESTOES_OBJETO, function () {
      // Objeto (avulsa) alimenta tanto o objetivo quanto a descrição.
      onObjetivoChange();
      onDescricaoChange();
    });
    perspectivaCombo = makeCombo(
      "config-perspectiva",
      "config-perspectiva-custom",
      SUGESTOES_PERSPECTIVA,
      onDescricaoChange
    );
    finalidadeCombo = makeCombo(
      "config-finalidade",
      "config-finalidade-custom",
      SUGESTOES_FINALIDADE,
      onDescricaoChange
    );
    renderDimensoes();

    // Componentes de Sugestões (3 versões + ações + confirmar).
    sugEscopo = criarSugestoes({
      containerId: "sug-escopo",
      chave: "escopo",
      gerar: escopoVariantes,
      aoConfirmar: function (texto) {
        if (nomeInput) nomeInput.value = texto || "";
      },
    });
    sugObjetivo = criarSugestoes({
      containerId: "sug-objetivo",
      chave: "objetivo",
      gerar: objetivoVariantes,
      aoConfirmar: function (texto) {
        if (objInput) objInput.value = texto || "";
      },
    });
    sugDescricao = criarSugestoes({
      containerId: "sug-descricao",
      chave: "descricao",
      gerar: descricaoVariantes,
      aoConfirmar: function (texto) {
        if (descInput) descInput.value = texto || "";
      },
    });

    await Promise.all([carregarDominios(), carregarFontesPortfolio()]);
    await prefill();
    sugEscopo.regenerar();
    sugObjetivo.regenerar();
    sugDescricao.regenerar();
  })();
})();
