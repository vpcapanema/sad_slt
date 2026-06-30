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
  const denominacaoInput = document.getElementById("config-denominacao");
  // Comboboxes (select + campo "Outro") criados na inicialização.
  let areaCombo, temaCombo, fenomenoCombo;
  // Comboboxes da construção do objetivo.
  let acaoCombo, objetoCombo;
  // Instâncias do componente de Sugestões (escopo / objetivo / descrição).
  let sugEscopo, sugObjetivo, sugDescricao;
  const portfolioSection = document.getElementById("portfolio-section");
  const tipoDemandaSel = document.getElementById("config-tipo-demanda");
  const gruposWrap = document.getElementById("universo-grupos");
  const addGrupoBtn = document.getElementById("add-grupo");
  const resumoWrap = document.getElementById("amostra-resumo");
  const acoesWrap = document.getElementById("amostra-acoes");
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

  // ---- Construção da descrição ----
  // A perspectiva (verbo no infinitivo da descrição) deriva do verbo do objetivo.
  const PERSPECTIVA_DO_VERBO = {
    comparar: "Comparar",
    classificar: "Classificar",
    selecionar: "Selecionar",
    priorizar: "Priorizar",
    ranquear: "Ranquear",
    rankear: "Ranquear",
    hierarquizar: "Hierarquizar",
    ordenar: "Ordenar",
  };
  function perspectivaDoVerbo() {
    const v = (acaoCombo ? acaoCombo.get() : "").trim().toLowerCase();
    if (!v) return "";
    return PERSPECTIVA_DO_VERBO[v] || "Analisar";
  }

  // A finalidade é a do próprio sistema (apoio à decisão) — inserida sempre.
  const FINALIDADE_FIXA = "apoiar a tomada de decisão";

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

  // Junta lista com vírgulas e "e" antes do último item.
  function juntarLista(itens) {
    const xs = itens.filter(Boolean);
    if (xs.length === 0) return "";
    if (xs.length === 1) return xs[0];
    return xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1];
  }

  function textoPt() {
    return window.SLTAhpTextoPt || null;
  }

  function polirTitulo(s) {
    const T = textoPt();
    return T ? T.normalizarTitulo(s) : String(s || "").trim().replace(/[.!?]+$/, "");
  }

  function polirParagrafo(s) {
    const T = textoPt();
    if (T) return T.normalizarParagrafo(s);
    const t = String(s || "").trim();
    if (!t) return "";
    return /[.!?]$/.test(t) ? t : t + ".";
  }

  function polirCampo(s) {
    const T = textoPt();
    return T ? T.normalizarCampo(s) : String(s || "").trim();
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
      setDisabled(d) {
        sel.disabled = !!d;
        cust.disabled = !!d;
        if (window.SLTFieldFilled) window.SLTFieldFilled.sync(sel);
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

    return [
      polirTitulo(ucFirst(v1.trim())),
      polirTitulo(ucFirst(v2.trim())),
      polirTitulo(ucFirst(v3.trim())),
    ];
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
    if (construto) v2 += " à luz " + aC + " " + construto;
    if (recorte) v2 += " " + ar + " " + recorte;
    v2 += ", mediante a comparação pareada entre critérios.";

    let v3 = frag + dom;
    if (construto) v3 += ", considerando " + aCs + " " + construto;
    if (recorte) v3 += " " + ar + " " + recorte;
    v3 += ", por meio da comparação pareada de um conjunto de critérios.";

    return [polirParagrafo(v1), polirParagrafo(v2), polirParagrafo(v3)];
  }

  // Descrição: [Perspectiva-inf] [objeto] de [domínio] ... dimensões ... propósito.
  function descricaoVariantes() {
    const isPort = tipoSelecionado() === "portfolio";
    const persp = perspectivaDoVerbo();
    const objeto = isPort
      ? alternativaNome().toLowerCase()
      : (objetoCombo ? objetoCombo.get() : "").toLowerCase();
    if (!persp || !objeto) return ["", "", ""];
    const dominio = (areaCombo ? areaCombo.get() : "").toLowerCase();
    const construto = (fenomenoCombo ? fenomenoCombo.get() : "").toLowerCase();
    const recorte = (temaCombo ? temaCombo.get() : "").toLowerCase();
    const fin = FINALIDADE_FIXA;
    // Inclui as dimensões só quando o usuário escolheu "Sim".
    const dims = state.incluirDim === "sim" ? juntarLista(state.dimensoes) : "";
    const dom = dominio ? " de " + dominio : "";
    const aC = artigoConstruto(construto);
    const aCs = artSimplesConstruto(construto);
    const ar = artigoA(recorte);

    let v1 = persp + " " + objeto + dom;
    if (construto) v1 += " sob o escopo " + aC + " " + construto;
    if (recorte) v1 += " " + ar + " " + recorte;
    v1 += ", considerando sua aderência a um conjunto de critérios";
    if (dims) v1 += ", cujos critérios podem abranger as dimensões " + dims;
    if (fin) v1 += ", com o propósito de " + fin;
    v1 += ".";

    let v2 = persp + " " + objeto + dom;
    if (construto) v2 += " a partir " + aC + " " + construto;
    if (recorte) v2 += " " + ar + " " + recorte;
    v2 += ", com base em um conjunto de critérios";
    if (dims) v2 += " abrangendo as dimensões " + dims;
    if (fin) v2 += ", visando " + fin;
    v2 += ".";

    let v3 = persp + " " + objeto + dom;
    if (construto) v3 += ", examinando " + aCs + " " + construto;
    if (recorte) v3 += " " + ar + " " + recorte;
    v3 += " por meio dos critérios";
    if (dims) v3 += " que abrangem as dimensões " + dims;
    if (fin) v3 += ", a fim de " + fin;
    v3 += ".";

    return [polirParagrafo(v1), polirParagrafo(v2), polirParagrafo(v3)];
  }

  const state = {
    tiposDemanda: [], // [{id, codigo, nome}]
    diretorias: [], // [{id, nome}]
    planos: [], // [{id, nome, diretoria_id}]
    programas: [], // [{id, nome, plano_id}]
    demandas: [], // universo do tipo atual (colunas ricas)
    campos: [], // metadados dos campos: [{campo, rotulo, tipo:'data'|'texto'}]
    // Universo (DNF): lista de grupos; registro entra se atende a QUALQUER grupo
    // e, dentro do grupo, a TODAS as condições.
    // grupos: [{ condicoes: [{campo, operador, valor} | {campo, de, ate} (data)] }]
    grupos: [],
    universoConfirmado: false, // conjunto de objetos travado pelo usuário
    universoObjetos: [], // snapshot confirmado: [{id, codigo, nome, tipo_demanda}]
    universoSig: "", // assinatura do conjunto confirmado (auto-invalidação)
    excluidos: [], // ids desmarcados manualmente no resumo (ajuste fino)
    sessionUser: null, // usuário autenticado (mesmo da barra de sessão)
    dimensoes: DIMENSOES_PADRAO.slice(), // dimensões marcadas (descrição)
    incluirDim: "", // "sim" | "nao" — incluir dimensões dos critérios?
    dimConfirmado: false, // usuário confirmou a escolha das dimensões
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

    function polirSugestao(texto) {
      return opts.chave === "escopo" ? polirTitulo(texto) : polirParagrafo(texto);
    }

    function regenerar() {
      const novos = opts.gerar();
      for (let i = 0; i < 3; i++) {
        if (!st.editados[i]) st.textos[i] = polirSugestao(novos[i] || "");
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
      if (textareaEdicao) st.textos[i] = polirSugestao(textareaEdicao.value);
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
      st.confirmado = polirSugestao(st.textos[st.sel]);
      st.textos[st.sel] = st.confirmado;
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

    return { regenerar: regenerar, render: render, estaConfirmado: estaConfirmado };
  }

  // Mudança nas dimensões invalida a confirmação (exige reconfirmar) e atualiza
  // a sugestão de descrição.
  function onDimensoesMudou() {
    state.dimConfirmado = false;
    refreshGates();
    if (sugDescricao) sugDescricao.regenerar();
    saveDraft();
  }

  // Lista apenas (sem caixas seletoras): ao incluir dimensões, o sistema considera
  // TODAS as dimensões cadastradas. A lista é só para conferência.
  function renderDimensoes() {
    const wrap = document.getElementById("config-dimensoes");
    if (!wrap) return;
    state.dimensoes = DIMENSOES.slice();
    wrap.innerHTML = "";
    const ul = document.createElement("ul");
    ul.className = "ahp-dim-list";
    DIMENSOES.forEach((dim) => {
      const li = document.createElement("li");
      li.textContent = dim;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
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

  function condicaoPreenchida(c) {
    return !!c.campo && (!!c.valor || !!c.de || !!c.ate);
  }

  function buildSubconjuntoPayload() {
    const codigo = tipoDemandaCodigo();
    if (!codigo) return null;
    const grupos = state.grupos
      .map(function (g) {
        return { condicoes: (g.condicoes || []).filter(condicaoPreenchida) };
      })
      .filter(function (g) {
        return g.condicoes.length > 0;
      });
    return {
      tipo_demanda: codigo,
      modo: "dnf",
      grupos: grupos,
    };
  }

  function buildCreatePayload() {
    const tipo = tipoSelecionado();
    const payload = {
      tipo: tipo,
      nome: polirTitulo(nomeInput.value) || null,
      area_conhecimento: polirCampo(areaCombo ? areaCombo.get() : "") || null,
      tema: polirCampo(temaCombo ? temaCombo.get() : "") || null,
      fenomeno: polirCampo(fenomenoCombo ? fenomenoCombo.get() : "") || null,
      descricao: polirParagrafo(descInput.value) || null,
      objetivo: polirParagrafo(objInput ? objInput.value : "") || null,
      denominacao: denominacaoInput ? (denominacaoInput.value.trim() || null) : null,
      configuracao_completa: {
        incluir_dimensoes: state.incluirDim || null,
        dimensoes: state.dimensoes.slice(),
      },
    };

    if (tipo === "portfolio") {
      payload.tipo_demanda = tipoDemandaCodigo();
      payload.subconjunto = buildSubconjuntoPayload();
      payload.universo_objetos = state.universoConfirmado ? state.universoObjetos.slice() : null;
    }

    return payload;
  }

  function escapeConfHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatTipoAnalise(tipo) {
    if (tipo === "portfolio") return "Análise de portfólio SLT (portfolio)";
    if (tipo === "avulsa") return "Análise avulsa (avulsa)";
    return null;
  }

  function formatTipoDemanda(codigo) {
    if (!codigo) return null;
    const found = state.tiposDemanda.find(function (t) {
      return t.codigo === codigo;
    });
    return found ? found.nome + " (" + codigo + ")" : codigo;
  }

  function formatConfScalar(val) {
    if (val === null || val === undefined || val === "") return null;
    return String(val);
  }

  function formatConfJson(val) {
    if (val === null || val === undefined) return null;
    try {
      return JSON.stringify(val, null, 2);
    } catch (_e) {
      return String(val);
    }
  }

  function formatAutorSessao(user) {
    if (!user) return null;
    const nome = polirCampo(user.nome || "");
    const username = polirCampo(user.username || "");
    const email = polirCampo(user.email || "");
    const id = polirCampo(user.id || "");

    const partes = [];
    if (nome) partes.push(nome);
    if (username) partes.push("@" + username);
    else if (email) partes.push(email);
    if (id) partes.push("UUID: " + id);

    return partes.length ? partes.join(" · ") : null;
  }

  async function carregarUsuarioSessao() {
    try {
      if (window.SLTAhpAuth && typeof window.SLTAhpAuth.whenReady === "function") {
        state.sessionUser = (await window.SLTAhpAuth.whenReady()) || null;
        return;
      }
      if (window.SLTAdminAuth && typeof window.SLTAdminAuth.fetchMe === "function") {
        state.sessionUser = (await window.SLTAdminAuth.fetchMe()) || null;
        return;
      }
    } catch (_e) {
      // Mantém fallback pendente quando não houver sessão válida.
    }
    state.sessionUser = null;
  }

  function renderConfRow(campo, alias, valor, opts) {
    opts = opts || {};
    const pendente = valor === null || valor === undefined || valor === "";
    const display = pendente ? opts.pendenteTexto || "(pendente)" : valor;
    const isBlock =
      opts.block || (!pendente && typeof display === "string" && display.indexOf("\n") !== -1);
    const valueClass =
      "ahp-conf-value" + (pendente ? " is-pending" : "") + (isBlock ? " ahp-conf-value--block" : "");
    const valueHtml = isBlock
      ? '<dd class="ahp-conf-value-wrap"><pre class="' +
        valueClass +
        '">' +
        escapeConfHtml(display) +
        "</pre></dd>"
      : '<dd class="' + valueClass + '">' + escapeConfHtml(display) + "</dd>";
    return (
      '<div class="ahp-conf-item">' +
      '<dt class="ahp-conf-label">' +
      '<span class="ahp-conf-field-key">' +
      escapeConfHtml(campo) +
      "</span>" +
      '<strong class="ahp-conf-field-name">' +
      escapeConfHtml(alias) +
      "</strong>" +
      "</dt>" +
      valueHtml +
      "</div>"
    );
  }

  function renderConferenciaGrupo(titulo, rowsHtml) {
    if (!rowsHtml) return "";
    return (
      '<div class="ahp-conf-group">' +
      '<h3 class="ahp-conf-group-title">' +
      escapeConfHtml(titulo) +
      "</h3>" +
      '<dl class="ahp-conf-list">' +
      rowsHtml +
      "</dl></div>"
    );
  }

  function renderConferenciaArtefato() {
    const host = document.getElementById("conferencia-artefato-body");
    if (!host) return;

    const payload = buildCreatePayload();
    const tipo = payload.tipo;
    let html = "";

    html += renderConferenciaGrupo(
      "1 — Destino e objeto da análise",
      renderConfRow("denominacao", "Denominação", formatConfScalar(payload.denominacao), {
          pendenteTexto: "(defina a denominação da configuração)",
        }) +
        renderConfRow("tipo", "Destino da análise", formatTipoAnalise(tipo)) +
        (tipo === "portfolio"
          ? renderConfRow(
              "tipo_demanda",
              "Objeto da análise (tipo de demanda)",
              formatTipoDemanda(payload.tipo_demanda)
            )
          : "")
    );

    html += renderConferenciaGrupo(
      "2 — Escopo da análise",
      renderConfRow("fenomeno", "Fenômeno", formatConfScalar(payload.fenomeno)) +
        renderConfRow("area_conhecimento", "Área do conhecimento", formatConfScalar(payload.area_conhecimento)) +
        renderConfRow("tema", "Tema", formatConfScalar(payload.tema)) +
        renderConfRow("nome", "Título confirmado", formatConfScalar(payload.nome), {
          pendenteTexto: "(confirme o escopo nas sugestões)",
        })
    );

    html += renderConferenciaGrupo(
      "3 — Objetivo",
      renderConfRow(
        "acao",
        "Verbo de ação",
        formatConfScalar(polirCampo(acaoCombo ? acaoCombo.get() : "")),
        {
          pendenteTexto: "(selecione ou digite o verbo da ação)",
        }
      ) +
        renderConfRow("objetivo", "Objetivo confirmado", formatConfScalar(payload.objetivo), {
          pendenteTexto: "(confirme o objetivo nas sugestões)",
        })
    );

    const incluirDim =
      payload.configuracao_completa.incluir_dimensoes === "sim"
        ? "Sim"
        : payload.configuracao_completa.incluir_dimensoes === "nao"
          ? "Não"
          : null;
    const dims =
      payload.configuracao_completa.incluir_dimensoes === "sim" && payload.configuracao_completa.dimensoes.length
        ? payload.configuracao_completa.dimensoes.join(", ")
        : payload.configuracao_completa.incluir_dimensoes === "nao"
          ? "—"
          : null;

    html += renderConferenciaGrupo(
      "4 — Descrição",
      renderConfRow(
        "configuracao_completa.incluir_dimensoes",
        "Incluir dimensões dos critérios",
        incluirDim
      ) +
        (payload.configuracao_completa.incluir_dimensoes === "sim"
          ? renderConfRow(
              "configuracao_completa.dimensoes",
              "Dimensões selecionadas",
              dims,
              { pendenteTexto: "(confirme a lista de dimensões)" }
            )
          : "") +
        renderConfRow("descricao", "Descrição confirmada", formatConfScalar(payload.descricao), {
          pendenteTexto: "(confirme a descrição nas sugestões)",
        })
    );

    if (tipo === "portfolio") {
      const subPayload = payload.subconjunto || buildSubconjuntoPayload();
      const subText =
        subPayload && subPayload.grupos && subPayload.grupos.length
          ? formatConfJson(subPayload)
          : formatConfJson(subPayload) +
            "\n\n(sem filtros — todos os registros elegíveis do tipo selecionado)";
      html += renderConferenciaGrupo(
        "5 — Universo da análise · Filtros",
        renderConfRow("subconjunto", "Recorte do universo (JSON)", subText, { block: true })
      );

      const universoVal = payload.universo_objetos
        ? payload.universo_objetos.length +
          " objeto(s)\n\n" +
          formatConfJson(payload.universo_objetos)
        : null;
      html += renderConferenciaGrupo(
        "6 — Universo da análise · Conjunto confirmado",
        renderConfRow("universo_objetos", "Snapshot dos objetos", universoVal, {
          block: true,
          pendenteTexto: "(confirme o universo no resumo)",
        })
      );
    }

    html += renderConferenciaGrupo(
      "Metadados gerados pelo sistema",
      renderConfRow("codigo", "Código da configuração", "(gerado automaticamente ao salvar)") +
        renderConfRow("status", "Status inicial", "rascunho") +
        renderConfRow("metodo_entrada", "Método de entrada", "manual") +
        renderConfRow("criado_por", "Autor (sessão ativa)", formatAutorSessao(state.sessionUser), {
          pendenteTexto: "(sessão ativa não identificada)",
        })
    );

    host.innerHTML = html || '<p class="ahp-conf-empty">Preencha o formulário para visualizar o artefato.</p>';
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
      dimensoes: state.dimensoes,
      incluirDim: state.incluirDim,
      dimConfirmado: state.dimConfirmado,
      sug: state.sug,
      tipo: tipoSelecionado(),
      tipo_demanda_id: tipoDemandaSel.value || null,
      grupos: state.grupos,
      universoConfirmado: state.universoConfirmado,
      universoObjetos: state.universoObjetos,
      universoSig: state.universoSig,
      excluidos: state.excluidos,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      /* ignore */
    }
    renderConferenciaArtefato();
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
    // A seção "Universo da análise" fica SEMPRE visível; o conteúdo depende apenas
    // de haver um tipo de demanda (objeto) selecionado.
    if (portfolioSection) portfolioSection.classList.remove("is-hidden");
    // O card "Objeto da análise" fica SEMPRE visível: por padrão mostra a variante
    // de portfólio (tipo de demanda) e só troca para o objeto manual na avulsa.
    if (miniDimensao) miniDimensao.classList.toggle("is-hidden", tipo === "avulsa");
    if (miniObjetoAvulsa) miniObjetoAvulsa.classList.toggle("is-hidden", tipo === "avulsa" ? false : true);
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

  // ---- Construtor do universo (grupos em forma normal disjuntiva) ----
  // Renderiza todos os grupos; cada grupo tem suas condições (campo/operador/valor)
  // combinadas por E. Os grupos entre si combinam por OU.
  function renderUniverso() {
    if (!gruposWrap) return;
    gruposWrap.innerHTML = "";
    if (!tipoDemandaCodigo()) return;
    if (state.grupos.length === 0) state.grupos.push({ condicoes: [{ campo: "" }] });

    state.grupos.forEach((grupo, gi) => {
      if (!Array.isArray(grupo.condicoes) || grupo.condicoes.length === 0) {
        grupo.condicoes = [{ campo: "" }];
      }

      if (gi > 0) {
        const ou = document.createElement("div");
        ou.className = "ahp-grupo-ou";
        ou.textContent = "OU";
        gruposWrap.appendChild(ou);
      }

      const card = document.createElement("div");
      card.className = "ahp-grupo-card";

      const head = document.createElement("div");
      head.className = "ahp-grupo-head";
      const titulo = document.createElement("span");
      titulo.className = "ahp-grupo-titulo";
      titulo.innerHTML =
        '<i class="fas fa-layer-group" aria-hidden="true"></i> Grupo ' +
        (gi + 1) +
        " — atende a <strong>todas</strong> as condições";
      head.appendChild(titulo);
      if (state.grupos.length > 1) {
        const rmGrupo = removeButton("Remover grupo", function () {
          state.grupos.splice(gi, 1);
          renderUniverso();
          saveDraft();
          atualizarPreview();
        });
        head.appendChild(rmGrupo);
      }
      card.appendChild(head);

      card.appendChild(headerRow(["Campo", "Operador", "Valor", ""], "ahp-cond-row"));

      grupo.condicoes.forEach((cond, ci) => {
        const row = document.createElement("div");
        row.className = "ahp-cond-row";

        const campoSel = campoSelect(cond.campo);
        const isData = cond.campo && campoTipo(cond.campo) === "data";

        const opSel = document.createElement("select");
        opSel.className = "c-form-control";
        OPERADORES.forEach((o) => opSel.appendChild(makeOption(o.value, o.label)));
        opSel.value = cond.operador || "eq";
        if (isData) opSel.disabled = true; // data usa período (de/até)

        const cell = valorCell(cond, function () {
          saveDraft();
          atualizarPreview();
        });

        campoSel.addEventListener("change", function () {
          grupo.condicoes[ci] = { campo: campoSel.value || "", operador: "eq" };
          renderUniverso();
          saveDraft();
          atualizarPreview();
        });
        opSel.addEventListener("change", function () {
          grupo.condicoes[ci].operador = opSel.value;
          saveDraft();
          atualizarPreview();
        });
        const rmCond = removeButton("Remover condição", function () {
          grupo.condicoes.splice(ci, 1);
          if (grupo.condicoes.length === 0) grupo.condicoes.push({ campo: "" });
          renderUniverso();
          saveDraft();
          atualizarPreview();
        });

        row.appendChild(campoSel);
        row.appendChild(opSel);
        row.appendChild(cell);
        row.appendChild(rmCond);
        card.appendChild(row);
      });

      const addCond = document.createElement("button");
      addCond.type = "button";
      addCond.className = "btn btn-secondary btn-sm ahp-grupo-add-cond";
      addCond.innerHTML = '<i class="fas fa-plus" aria-hidden="true"></i> Adicionar condição (E)';
      addCond.addEventListener("click", function () {
        grupo.condicoes.push({ campo: "", operador: "eq" });
        renderUniverso();
        saveDraft();
      });
      card.appendChild(addCond);

      gruposWrap.appendChild(card);
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

  // Um grupo é satisfeito quando TODAS as suas condições preenchidas batem (E).
  function matchGrupo(d, grupo) {
    const conds = (grupo && grupo.condicoes) || [];
    return conds.every((c) => matchCondicao(d, c));
  }

  // Universo (DNF): registro entra se atende a QUALQUER grupo (OU). Grupos vazios
  // (sem condições preenchidas) não restringem nada.
  function gruposAtivos() {
    return state.grupos.filter((g) =>
      (g.condicoes || []).some((c) => c.campo && (c.valor || c.de || c.ate))
    );
  }

  function amostraFiltrada() {
    const ativos = gruposAtivos();
    if (ativos.length === 0) return state.demandas.slice();
    return state.demandas.filter((d) => ativos.some((g) => matchGrupo(d, g)));
  }

  // ---- Resumo: tabela com os registros filtrados ----
  const RESUMO_MAX = 50;

  function colunasResumo() {
    const cols = [
      { campo: "codigo", rotulo: "Código" },
      { campo: "nome", rotulo: "Nome" },
      { campo: "status", rotulo: "Status" },
    ];
    // Acrescenta só os campos efetivamente usados nas condições (resultado focado).
    const usados = [];
    const addUsado = (campo) => {
      if (!campo) return;
      if (["codigo", "nome", "status"].indexOf(campo) !== -1) return;
      if (usados.indexOf(campo) === -1) usados.push(campo);
    };
    state.grupos.forEach((g) => (g.condicoes || []).forEach((c) => addUsado(c.campo)));
    usados.forEach((campo) => {
      const meta = camposDisponiveis().find((c) => c.campo === campo);
      cols.push({ campo, rotulo: meta ? meta.rotulo : campo });
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

  // Linhas que entram de fato no universo: filtradas E não desmarcadas no resumo.
  function linhasSelecionadas() {
    return amostraFiltrada().filter((d) => state.excluidos.indexOf(String(d.id)) === -1);
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
        confirmarUniverso(linhasSelecionadas());
      });
      acoes.appendChild(confirmar);
    }
    return acoes;
  }

  function renderResumo() {
    if (!resumoWrap) return;
    resumoWrap.innerHTML = "";
    if (acoesWrap) acoesWrap.innerHTML = "";
    const codigo = tipoDemandaCodigo();
    if (!codigo) return;
    const linhas = amostraFiltrada();
    const selecionadas = linhasSelecionadas();

    // Auto-invalidação: se o conjunto selecionado mudou após confirmar, destrava.
    if (state.universoConfirmado && sigDe(selecionadas) !== state.universoSig) {
      state.universoConfirmado = false;
      state.universoObjetos = [];
      state.universoSig = "";
      saveDraft();
    }

    if (linhas.length === 0) {
      resumoWrap.innerHTML = '<p class="ahp-page-desc">Nenhum registro com os filtros atuais.</p>';
      if (acoesWrap) acoesWrap.appendChild(renderResumoAcoes(selecionadas));
      return;
    }
    const cols = colunasResumo();
    const travado = state.universoConfirmado;
    const table = document.createElement("table");
    table.className = "ahp-resumo-table";

    const thead = document.createElement("thead");
    const trh = document.createElement("tr");
    // Coluna de seleção (incluir/excluir registro do universo).
    const thSel = document.createElement("th");
    thSel.className = "ahp-resumo-sel";
    const todas = document.createElement("input");
    todas.type = "checkbox";
    todas.title = "Selecionar todos";
    todas.checked = selecionadas.length === linhas.length;
    todas.disabled = travado;
    todas.addEventListener("change", function () {
      state.excluidos = todas.checked ? [] : linhas.map((d) => String(d.id));
      saveDraft();
      renderResumo();
    });
    thSel.appendChild(todas);
    trh.appendChild(thSel);
    cols.forEach((c) => {
      const th = document.createElement("th");
      th.textContent = c.rotulo;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    linhas.slice(0, RESUMO_MAX).forEach((d) => {
      const id = String(d.id);
      const tr = document.createElement("tr");
      const incluido = state.excluidos.indexOf(id) === -1;
      if (!incluido) tr.classList.add("is-excluido");

      const tdSel = document.createElement("td");
      tdSel.className = "ahp-resumo-sel";
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = incluido;
      chk.disabled = travado;
      chk.addEventListener("change", function () {
        if (chk.checked) {
          state.excluidos = state.excluidos.filter((x) => x !== id);
        } else if (state.excluidos.indexOf(id) === -1) {
          state.excluidos.push(id);
        }
        saveDraft();
        renderResumo();
      });
      tdSel.appendChild(chk);
      tr.appendChild(tdSel);

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

    // Contagem de selecionados para conferência rápida.
    const cont = document.createElement("p");
    cont.className = "ahp-resumo-contagem";
    cont.innerHTML =
      "<strong>" + selecionadas.length + "</strong> de " + linhas.length +
      " registro(s) selecionado(s) para o universo.";
    resumoWrap.appendChild(cont);

    if (acoesWrap) acoesWrap.appendChild(renderResumoAcoes(selecionadas));
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
    if (Array.isArray(draft.dimensoes)) state.dimensoes = draft.dimensoes;
    state.incluirDim = draft.incluirDim || "";
    state.dimConfirmado = !!draft.dimConfirmado;
    renderDimensoes();
    // Reflete a escolha Sim/Não e a visibilidade do card de dimensões.
    if (state.incluirDim) {
      const r = form.querySelector('input[name="incluir-dimensoes"][value="' + state.incluirDim + '"]');
      if (r) r.checked = true;
    }
    const dimCard = document.getElementById("mini-dimensoes-lista");
    if (dimCard) dimCard.classList.toggle("is-hidden", state.incluirDim !== "sim");
    // Restaura o estado das Sugestões e reflete os valores confirmados nos
    // campos ocultos que vão ao backend.
    if (draft.sug) state.sug = draft.sug;
    if (nomeInput) nomeInput.value = state.sug.escopo.confirmado || "";
    if (objInput) objInput.value = state.sug.objetivo.confirmado || "";
    if (descInput) descInput.value = state.sug.descricao.confirmado || "";
    const tipo = draft.tipo;
    if (tipo === "avulsa" || tipo === "portfolio") {
      const input = form.querySelector('input[value="' + tipo + '"]');
      if (input) input.checked = true;
    }
    if (Array.isArray(draft.grupos)) {
      state.grupos = draft.grupos;
    }
    if (Array.isArray(draft.excluidos)) {
      state.excluidos = draft.excluidos.map((x) => String(x));
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
    renderUniverso();
    atualizarPreview();
  }

  cards.forEach((card) => {
    card.addEventListener("click", function () {
      const input = card.querySelector('input[type="radio"]');
      input.checked = true;
      syncCards();
      togglePortfolio();
      onEscopoChange();
      atualizarPreview();
    });
  });

  tipoDemandaSel.addEventListener("change", async function () {
    // Trocar o nível reinicia a amostra (campos/valores mudam por tipo).
    state.grupos = [];
    state.excluidos = [];
    state.universoConfirmado = false;
    state.universoObjetos = [];
    state.universoSig = "";
    onEscopoChange();
    await carregarDemandas();
    renderUniverso();
    atualizarPreview();
  });

  if (addGrupoBtn) {
    addGrupoBtn.addEventListener("click", function () {
      state.grupos.push({ condicoes: [{ campo: "", operador: "eq" }] });
      renderUniverso();
      saveDraft();
    });
  }

  // ---- Liberação progressiva (gating) + validação visual ----
  function objetoPreenchido() {
    return tipoSelecionado() === "portfolio"
      ? !!tipoDemandaSel.value
      : !!(objetoCombo && objetoCombo.get());
  }
  function escopoPodeMostrar() {
    return (
      !!tipoSelecionado() &&
      objetoPreenchido() &&
      !!(fenomenoCombo && fenomenoCombo.get()) &&
      !!(areaCombo && areaCombo.get()) &&
      !!(temaCombo && temaCombo.get())
    );
  }
  function objetivoPodeMostrar() {
    return !!(sugEscopo && sugEscopo.estaConfirmado()) && !!(acaoCombo && acaoCombo.get());
  }
  function descricaoPodeMostrar() {
    return !!(sugObjetivo && sugObjetivo.estaConfirmado()) && state.dimConfirmado;
  }

  // Habilita/desabilita seletores conforme a etapa liberada e reseta o que
  // depende de etapas anteriores ainda não cumpridas.
  // Texto "Tipo de demanda/objeto selecionado: …" no topo do Universo da análise.
  function objetoSelecionadoLabel() {
    if (tipoSelecionado() === "portfolio") {
      const f = state.tiposDemanda.find(
        (t) => String(t.id) === String(tipoDemandaSel.value)
      );
      return f ? f.nome : "";
    }
    return (objetoCombo && objetoCombo.get()) || "";
  }
  function pluralizar(palavra) {
    const p = palavra.trim();
    if (!p) return p;
    if (/s$/i.test(p)) return p;
    if (/[aeiou]$/i.test(p)) return p + "s";
    if (/r$|z$/i.test(p)) return p + "es";
    if (/m$/i.test(p)) return p.slice(0, -1) + "ns";
    return p + "s";
  }
  function atualizarUniversoObjeto() {
    const label = objetoSelecionadoLabel();
    const el = document.getElementById("universo-objeto-valor");
    if (el) el.textContent = label || "—";
    const plural = label ? pluralizar(label).toLowerCase() : "objetos";
    document.querySelectorAll(".universo-obj-ref").forEach((s) => {
      s.textContent = plural;
    });
  }

  function refreshGates() {
    atualizarUniversoObjeto();
    const destinoOk = !!tipoSelecionado();
    const objOk = objetoPreenchido();
    const escopoOk = !!(sugEscopo && sugEscopo.estaConfirmado());
    const objetivoOk = !!(sugObjetivo && sugObjetivo.estaConfirmado());

    // Escopo: fenômeno/área/tema só ativos após destino + objeto.
    const escopoSelEnabled = destinoOk && objOk;
    [fenomenoCombo, areaCombo, temaCombo].forEach((c) => {
      if (c) c.setDisabled(!escopoSelEnabled);
    });

    // Objetivo: verbo só ativo após escopo confirmado.
    if (acaoCombo) acaoCombo.setDisabled(!escopoOk);

    // Descrição: incluir dimensões só após objetivo confirmado.
    const dimEnabled = escopoOk && objetivoOk;
    const radios = form.querySelectorAll('input[name="incluir-dimensoes"]');
    radios.forEach((r) => {
      r.disabled = !dimEnabled;
    });
    const dimConfirmar = document.getElementById("dim-confirmar");
    // Confirmar só vale para "Sim" (no "Não" a escolha já confirma).
    if (dimConfirmar) dimConfirmar.disabled = !dimEnabled || state.incluirDim !== "sim";
    // Se a etapa anterior caiu, a confirmação de dimensões deixa de valer.
    if (!dimEnabled && state.dimConfirmado) state.dimConfirmado = false;
  }

  // Mudança no escopo afeta título, objetivo e descrição (todos reaproveitam).
  function onEscopoChange() {
    if (sugEscopo) sugEscopo.regenerar();
    if (sugObjetivo) sugObjetivo.regenerar();
    if (sugDescricao) sugDescricao.regenerar();
    refreshGates();
    saveDraft();
  }
  function onObjetivoChange() {
    if (sugObjetivo) sugObjetivo.regenerar();
    if (sugDescricao) sugDescricao.regenerar();
    refreshGates();
    saveDraft();
  }

  // Incluir dimensões? (Sim/Não):
  // - "Sim" mostra o card da lista de dimensões para conferir e confirmar.
  // - "Não" já confirma (a sugestão de descrição aparece sem dimensões).
  form.querySelectorAll('input[name="incluir-dimensoes"]').forEach((r) => {
    r.addEventListener("change", function () {
      state.incluirDim = r.value;
      const ehSim = state.incluirDim === "sim";
      state.dimConfirmado = !ehSim; // "Não" confirma direto; "Sim" exige confirmar
      const dimCard = document.getElementById("mini-dimensoes-lista");
      if (dimCard) dimCard.classList.toggle("is-hidden", !ehSim);
      refreshGates();
      if (sugDescricao) sugDescricao.regenerar();
      saveDraft();
    });
  });

  const dimConfirmarBtn = document.getElementById("dim-confirmar");
  if (dimConfirmarBtn) {
    dimConfirmarBtn.addEventListener("click", function () {
      if (!state.incluirDim) return;
      state.dimConfirmado = true;
      if (sugDescricao) sugDescricao.regenerar();
      refreshGates();
      saveDraft();
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const tipo = tipoSelecionado();
    if (!tipo) {
      alert("Selecione o tipo de análise para continuar.");
      return;
    }

    const payload = buildCreatePayload();

    if (!payload.nome) {
      alert("Confirme o escopo (título) nas Sugestões antes de continuar.");
      if (areaCombo) areaCombo.focus();
      return;
    }

    if (nomeInput) nomeInput.value = payload.nome;
    if (objInput && payload.objetivo) objInput.value = payload.objetivo;
    if (descInput && payload.descricao) descInput.value = payload.descricao;

    if (payload.tipo === "portfolio") {
      if (!payload.tipo_demanda) {
        alert("Selecione o tipo de demanda do portfólio.");
        tipoDemandaSel.focus();
        return;
      }

      if (!state.universoConfirmado || !payload.universo_objetos || payload.universo_objetos.length === 0) {
        alert(
          "Confirme o universo da análise (botão «Confirmar universo de análise» no Resumo) antes de continuar."
        );
        return;
      }
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
      if (window.SLTAhpNav && window.SLTAhpNav.irPara) {
        window.SLTAhpNav.irPara("step2-criterios.html");
      } else {
        window.location.href = "step2-criterios.html";
      }
    } catch (err) {
      alert("Não foi possível criar a configuração: " + (err && err.message ? err.message : err));
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Inicialização
  (async function init() {
    // A cada carregamento/recarregamento a página começa limpa: campos vazios e
    // seletores nos placeholders padrão (não restauramos rascunho anterior).
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      /* ignore */
    }
    await carregarUsuarioSessao();
    areaCombo = makeCombo("config-area", "config-area-custom", SUGESTOES_AREA);
    temaCombo = makeCombo("config-tema", "config-tema-custom", SUGESTOES_TEMA);
    fenomenoCombo = makeCombo("config-fenomeno", "config-fenomeno-custom", SUGESTOES_FENOMENO);
    acaoCombo = makeCombo("config-acao", "config-acao-custom", SUGESTOES_ACAO, onObjetivoChange);
    objetoCombo = makeCombo("config-objeto", "config-objeto-custom", SUGESTOES_OBJETO, function () {
      // Objeto (avulsa) é parte do escopo e do objetivo/descrição.
      onEscopoChange();
    });
    renderDimensoes();

    // Componentes de Sugestões (3 versões + ações + confirmar) com gating.
    sugEscopo = criarSugestoes({
      containerId: "sug-escopo",
      chave: "escopo",
      gerar: escopoVariantes,
      podeMostrar: escopoPodeMostrar,
      aoConfirmar: function (texto) {
        if (nomeInput) nomeInput.value = texto || "";
      },
    });
    sugObjetivo = criarSugestoes({
      containerId: "sug-objetivo",
      chave: "objetivo",
      gerar: objetivoVariantes,
      podeMostrar: objetivoPodeMostrar,
      aoConfirmar: function (texto) {
        if (objInput) objInput.value = texto || "";
      },
    });
    sugDescricao = criarSugestoes({
      containerId: "sug-descricao",
      chave: "descricao",
      gerar: descricaoVariantes,
      podeMostrar: descricaoPodeMostrar,
      aoConfirmar: function (texto) {
        if (descInput) descInput.value = texto || "";
      },
    });

    await Promise.all([carregarDominios(), carregarFontesPortfolio()]);
    sugEscopo.regenerar();
    sugObjetivo.regenerar();
    sugDescricao.regenerar();
    refreshGates();
    renderConferenciaArtefato();
    if (window.SLTFieldFilled) window.SLTFieldFilled.syncAll(document);
  })();
})();
