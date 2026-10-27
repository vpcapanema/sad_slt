(function (global) {
  "use strict";

  const API_COLUNAS = (codigo) => `/api/ahp/atributos-objetos/hierarquizacoes/${encodeURIComponent(codigo)}/colunas`;
  const API_DOMINIOS = "/api/dominios/atributos-objeto";
  const GRUPO_RISCO = "risco_ambiental_territorial";
  const INDICE_RISCO = "indice_de_risco_ambiental_e_territorial";
  let estado = { colunas: [], pesos: {} };
  let versaoRender = 0;

  function opcoesPesos() {
    return { fonte_pesos: estado.fonte || "manual", ponderacao: estado.ponderacao || "estratificada",
      julgamento_id: estado.fonte === "ahp" ? estado.julgamentoId || null : null };
  }

  function avisoPesos(mensagem, notificar = false) {
    const host = document.getElementById("fase3-pesos-feedback");
    if (host) host.textContent = mensagem;
    if (mensagem && notificar) global.Notify?.warning("Pesos da ponderação", mensagem);
  }

  function atualizarFonteUI() {
    const seletor = document.getElementById("fase3-julgamento");
    if (!seletor) return;
    const ahp = estado.fonte === "ahp";
    document.getElementById("fase3-julgamento-campo").hidden = !ahp;
    document.getElementById("fase3-modo-ponderacao").hidden = ahp;
    seletor.disabled = !estado.codigo || estado.carregandoJulgamentos;
    document.querySelectorAll('[name="fonte-pesos-fase3"]').forEach(input => {
      input.checked = input.value === (estado.fonte || "manual"); input.disabled = !estado.codigo;
    });
    document.querySelectorAll('[name="ponderacao-fase3"]').forEach(input => {
      input.checked = input.value === (estado.ponderacao || "estratificada"); input.disabled = !estado.codigo;
    });
    document.querySelectorAll('[data-controles-pesos] input').forEach(input => { input.disabled = ahp; });
    const ajuda = document.querySelector('.atributos-pesos-ajuda');
    if (ajuda) ajuda.textContent = ahp
      ? "Os pesos dos atributos vêm da coluna Pesos consolidados do julgamento selecionado. O índice de risco herdado da Fase 1 mantém peso 1, pois não integra a matriz julgada."
      : estado.ponderacao === "abrangente"
        ? "Todos os atributos, incluindo os de risco, participam de uma única ponderação e somam 1. Alterar um peso redistribui o saldo entre todos os demais atributos. Os contêineres identificam a origem dos atributos."
        : "Cada grupo soma 1. Alterar um peso redistribui o saldo entre os demais atributos do mesmo grupo. Os grupos presentes têm participação equivalente no cálculo final.";
  }

  function aplicarJulgamento(notificar = true) {
    estado.pesosAhpValidos = false;
    const julgamento = (estado.julgamentos || []).find(item => item.id === estado.julgamentoId);
    let erro = julgamento?.erro;
    if (!julgamento) erro = "Selecione um julgamento associado à hierarquização.";
    if (julgamento && !erro) {
      const faltantes = estado.colunas.filter(c => c.grupo !== "risco" && !Number.isFinite(julgamento.pesos?.[c.id]));
      if (faltantes.length) erro = "Pesos consolidados indisponíveis para: " + faltantes.map(c => c.alias || c.id).join("; ") + ".";
    }
    if (erro) {
      // Nunca apresenta pesos manuais como se fossem os pesos do julgamento.
      estado.colunas.forEach(c => { estado.pesos[c.id] = 0; });
      avisoPesos(erro, notificar);
    } else {
      estado.colunas.forEach(c => { estado.pesos[c.id] = c.grupo === "risco" ? 1 : julgamento.pesos[c.id]; });
      estado.pesosAhpValidos = true;
      avisoPesos("Pesos consolidados carregados de " + julgamento.nome + ".");
    }
    GRUPOS_PESO.forEach(grupo => atualizarPesos($('[data-atributos-objetos]'), grupo));
    atualizarFonteUI();
    document.dispatchEvent(new Event("atributos-pesos-alterados"));
  }

  async function carregarJulgamentos(notificar = true) {
    const captura = estado;
    estado.carregandoJulgamentos = true;
    estado.pesosAhpValidos = false;
    atualizarFonteUI();
    avisoPesos("Carregando julgamentos associados…");
    try {
      const itens = await json(`/api/ahp/comparacao-colaborativa/hierarquizacoes/${encodeURIComponent(estado.codigo)}/pesos-fase3`);
      if (estado !== captura || estado.fonte !== "ahp") return;
      estado.julgamentos = itens;
      const seletor = document.getElementById("fase3-julgamento");
      seletor.replaceChildren(new Option("Selecione um julgamento", ""), ...itens.map(j => new Option(j.nome, j.id)));
      seletor.value = estado.julgamentoId || "";
      if (!seletor.value) estado.julgamentoId = null;
      if (estado.julgamentoId) aplicarJulgamento(notificar);
      else avisoPesos(itens.length ? "Selecione o julgamento para carregar os pesos consolidados." : "Nenhum julgamento associado a esta hierarquização.", notificar && !itens.length);
    } catch (erro) {
      if (estado === captura && estado.fonte === "ahp") avisoPesos("Não foi possível carregar os julgamentos: " + erro.message, notificar);
    } finally {
      if (estado === captura) { estado.carregandoJulgamentos = false; atualizarFonteUI(); }
    }
  }

  function configurarFonte(hierarquizacao) {
    const seletor = document.getElementById("fase3-julgamento");
    if (!seletor) return;
    const config = hierarquizacao?.dados_hierarquizacao?.cabecalho_grupo?.configuracoes?.fase_3 || {};
    const homologada = hierarquizacao?.dados_hierarquizacao?.comparacao_colaborativa;
    estado.codigo = hierarquizacao?.codigo;
    estado.fonte = config.fonte_pesos || (homologada?.analise_homologada_id ? "ahp" : "manual");
    estado.ponderacao = config.ponderacao || "estratificada";
    estado.julgamentoId = config.julgamento_id || null;
    seletor.replaceChildren(new Option("Selecione um julgamento", ""));
    seletor.onchange = () => { estado.julgamentoId = seletor.value || null; aplicarJulgamento(); };
    document.querySelectorAll('[name="fonte-pesos-fase3"]').forEach(input => { input.onchange = () => {
      estado.fonte = input.value;
      avisoPesos("");
      if (estado.fonte === "ahp") {
        estado.pesosManuais = { ...estado.pesos };
        estado.colunas.forEach(c => { estado.pesos[c.id] = 0; });
        carregarJulgamentos();
      } else {
        estado.pesos = estado.pesosManuais || pesosIniciais(estado.colunas, { ponderacao: estado.ponderacao });
      }
      montarPesos($('[data-atributos-objetos]'));
      atualizarFonteUI();
      document.dispatchEvent(new Event("atributos-pesos-alterados"));
    }; });
    document.querySelectorAll('[name="ponderacao-fase3"]').forEach(input => { input.onchange = () => {
      estado.ponderacao = input.value;
      estado.pesos = pesosIniciais(estado.colunas, { ponderacao: estado.ponderacao, criterios: criteriosPayload() });
      montarPesos($('[data-atributos-objetos]'));
      atualizarFonteUI();
      document.dispatchEvent(new Event("atributos-pesos-alterados"));
    }; });
    const titulo = document.getElementById("fase3-titulo-tabela");
    if (titulo) titulo.textContent = "Tabela de atributos de demanda" + (hierarquizacao ? " - " + (hierarquizacao.nome || hierarquizacao.codigo) : "");
    avisoPesos("");
    atualizarFonteUI();
    if (estado.codigo && estado.fonte === "ahp") {
      estado.colunas.forEach(c => { estado.pesos[c.id] = 0; });
      GRUPOS_PESO.forEach(grupo => atualizarPesos($('[data-atributos-objetos]'), grupo));
      carregarJulgamentos(false);
    }
  }

  function configuracaoPayload() {
    if (estado.fonte === "ahp" && !estado.pesosAhpValidos) throw new Error("Selecione um julgamento com pesos consolidados disponíveis para todos os atributos.");
    return opcoesPesos();
  }

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const vazio = (valor) => valor == null || (typeof valor === "string" && !valor.trim());
  const numero = (valor) => {
    if (vazio(valor)) return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  };
  const tipoObjeto = (hierarquizacao) => String(
    hierarquizacao?.dados_hierarquizacao?.objetos?.[0]?.cabecalho_objeto?.tipo_demanda
      || hierarquizacao?.dados_hierarquizacao?.cabecalho_grupo?.tipo_demanda
      || "objeto",
  ).toLowerCase();
  const tituloTipo = (tipo) => ({ plano: "plano", programa: "programa", projeto: "projeto" }[tipo] || "objeto");

  async function json(url) {
    const resposta = await fetch(url, { credentials: "same-origin" });
    const corpo = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(corpo?.detail || `HTTP ${resposta.status}`);
    return corpo;
  }

  function opcoesDominio(dominio, tipo) {
    return dominio.dominio_valores || dominio.configuracao_por_tipo?.[tipo]?.opcoes || [];
  }

  function colunasCadastro(dominios, tipo) {
    const ponderaveis = new Set([
      "maturidade_objeto",
      "capex_estimado",
      "base_estimativa_capex",
      "prazo_referencia_meses",
      "base_estimativa_prazo",
    ]);
    // Rótulos vêm de demandas.dom_atributo_objeto (nome/configuracao_por_tipo.rotulo); usados apenas se a tabela não os definir.
    const nomes = {
      maturidade_objeto: `Grau de maturidade do ${tituloTipo(tipo)}`,
      capex_estimado: "Capex — custo estimado para implantação (R$)",
      base_estimativa_capex: "Grau de definição do custo de implantação",
      base_estimativa_prazo: tipo === "plano" ? "Grau de definição do horizonte temporal" : "Grau de definição do prazo de implantação",
    };
    const dominioPorCodigo = Object.fromEntries(dominios.map((item) => [item.codigo, item]));
    const direcoes = {
      maturidade_objeto: "maior_melhor",
      capex_estimado: "menor_melhor",
      base_estimativa_capex: "maior_melhor",
      prazo_referencia_meses: "menor_melhor",
      base_estimativa_prazo: "maior_melhor",
      vinculo_institucional: "maior_melhor",
    };
    return dominios.filter((item) => item.tipos_objeto.includes(tipo) && ponderaveis.has(item.codigo)).map((item) => {
      const opcoes = opcoesDominio(item, tipo);
      // O valor nativo armazenado é o rótulo completo ("Nível N — ..."), não o código curto do domínio.
      const mapeamento = Object.fromEntries(opcoes.map((opcao, indice) => [opcao.rotulo, opcoes.length === 1 ? 1 : indice / (opcoes.length - 1)]));
      if (item.codigo === "vinculo_institucional") Object.assign(mapeamento, { true: 1, false: 0, sim: 1, nao: 0 });
      return {
        id: `cadastro:${item.codigo}`,
        chave: item.codigo,
        grupo: "cadastro",
        alias: item.configuracao_por_tipo?.[tipo]?.rotulo || item.nome || nomes[item.codigo],
        unidade: item.unidade || (item.tipo_dado === "categoria" ? "escala ordinal" : null),
        tipo: ["inteiro", "monetario"].includes(item.tipo_dado) ? "numerico" : "categorico",
        formato: item.tipo_dado === "inteiro" ? "inteiro" : "decimal",
        tipo_dado: ["inteiro", "monetario"].includes(item.tipo_dado) ? "numerico" : "ordinal",
        direcao: direcoes[item.codigo] || "maior_melhor",
        relacao: direcoes[item.codigo] || "maior_melhor",
        relacao_simbolo: direcoes[item.codigo] === "menor_melhor" ? "↓" : "↑",
        mapeamento,
        rotulos: Object.fromEntries(opcoes.map((opcao) => [opcao.rotulo, opcao.rotulo])),
        rotulos_procedencia: item.codigo === "capex_estimado"
          ? Object.fromEntries(opcoesDominio(dominioPorCodigo.base_estimativa_capex || {}, tipo).map((opcao) => [opcao.rotulo, opcao.rotulo]))
          : item.codigo === "prazo_referencia_meses"
            ? Object.fromEntries(opcoesDominio(dominioPorCodigo.base_estimativa_prazo || {}, tipo).map((opcao) => [opcao.rotulo, opcao.rotulo]))
            : {},
        mandatorio: !item.permite_nao_informado,
      };
    });
  }

  function colunasDinamicas(colunas) {
    const atendidosPeloCadastro = new Set([
      "escala_ideia_estudo_projeto_basico_projeto_executivo",
      "r_custo_total_de_investimento",
      "meses_ate_a_operacao",
      "maturidade_da_demanda",
      "capex_custo_de_investimento",
      "prazo_de_implantacao",
    ]);
    const nomes = {
      r_ano: "Custo anual de operação e manutenção",
      b_c_vpl_tir: "Retorno econômico do investimento",
      de_alavancagem_por_ppp_concessao: "Participação prevista de capital privado",
      vpl_social_b_c_social: "Retorno social do investimento",
      grau_de_compatibilidade: "Compatibilidade com o planejamento territorial",
      escala_qualitativa_de_1_a_5: "Complexidade técnica e institucional",
      grau_de_aderencia_aos_planos: "Compatibilidade com os planos estratégicos",
      grau_de_consenso_atores_do_slide_58: "Apoio das instituições envolvidas",
      numero_de_mencoes_e_contribuicoes: "Manifestações favoráveis recebidas",
      variancia_entre_cenarios_de_demanda: "Variação da demanda entre os cenários",
      desvio_historico_de_prazo_e_de_custo: "Histórico de atraso e aumento de custo",
      numero_de_desapropriacoes_interferencias: "Desapropriações e interferências identificadas",
      numero_de_projetos_predecessores: "Entregas externas necessárias antes da implantação",
    };
    return colunas.filter((coluna) => !atendidosPeloCadastro.has(coluna.id)).map((coluna) => ({
      ...coluna,
      alias: nomes[coluna.id] || coluna.criterio || coluna.alias,
      chave: coluna.id,
      grupo: "dinamico",
      tipo_dado: coluna.tipo === "categorico" ? "ordinal" : coluna.tipo,
      direcao: coluna.relacao || "maior_melhor",
      obrigatorio: coluna.mandatorio,
    }));
  }

  function valorCadastro(objeto, coluna) {
    const atributos = objeto.cabecalho_objeto?.atributos || {};
    const cadastrais = atributos.atributos_cadastrais || {};
    if (coluna.chave === "vinculo_institucional") return cadastrais[coluna.chave] ?? atributos[coluna.chave] ?? false;
    return cadastrais[coluna.chave] ?? atributos[coluna.chave] ?? null;
  }

  function procedenciaCadastro(objeto, coluna) {
    const atributos = objeto.cabecalho_objeto?.atributos || {};
    const cadastrais = atributos.atributos_cadastrais || {};
    const chave = coluna.chave === "capex_estimado"
      ? "base_estimativa_capex"
      : coluna.chave === "prazo_referencia_meses" ? "base_estimativa_prazo" : null;
    if (!chave) return null;
    const valor = cadastrais[chave] ?? atributos[chave];
    return valor ? (coluna.rotulos_procedencia?.[String(valor)] || String(valor).replaceAll("_", " ")) : null;
  }

  function valorDinamico(objeto, coluna) {
    const slot = objeto.cabecalho_objeto?.atributos_fase3?.[coluna.chave];
    return slot?.valor_bruto ?? slot?.valor ?? null;
  }

  function fase1Executada(objeto) {
    return Boolean(objeto.hierarquizacao?.fase_1?.executada);
  }

  // O resumo já está vinculado ao código da demanda na gravação da Fase 1.
  function colunasRisco(objetos) {
    if (!objetos.some(fase1Executada)) return [];
    return [{
      id: INDICE_RISCO,
      chave: INDICE_RISCO,
      grupo: "risco",
      alias: "Índice de risco ambiental e territorial",
      unidade: "0–1",
      tipo: "numerico",
      tipo_dado: "numerico",
      direcao: "maior_melhor",
      relacao: "maior_melhor",
      valor_minimo: 0,
      valor_maximo: 1,
      obrigatorio: false,
    }];
  }

  function valorRisco(objeto) {
    if (!fase1Executada(objeto)) return null;
    return numero(objeto.hierarquizacao.fase_1.resumo_elegibilidade?.[INDICE_RISCO]);
  }

  function valorDaColuna(objeto, coluna) {
    if (coluna.grupo === "cadastro") return valorCadastro(objeto, coluna);
    return coluna.grupo === "risco" ? valorRisco(objeto, coluna) : valorDinamico(objeto, coluna);
  }

  function converter(valor, coluna) {
    if (vazio(valor)) return null;
    if (coluna.tipo_dado === "booleano") {
      const token = String(valor).trim().toLowerCase();
      if (["1", "true", "sim", "s", "yes"].includes(token)) return 1;
      return ["0", "false", "nao", "não", "n", "no"].includes(token) ? 0 : null;
    }
    if (["categorico", "ordinal"].includes(coluna.tipo_dado)) return numero(coluna.mapeamento?.[String(valor)]);
    return numero(valor);
  }

  function normalizarObjetos(objetos, coluna) {
    const originais = objetos.map((objeto) => valorDaColuna(objeto, coluna));
    const convertidos = originais.map((valor) => converter(valor, coluna));
    const validos = convertidos.filter((valor) => valor !== null);
    const minimo = coluna.valor_minimo ?? (validos.length ? Math.min(...validos) : 0);
    const maximo = coluna.valor_maximo ?? (validos.length ? Math.max(...validos) : 0);
    const normalizados = convertidos.map((valor) => {
      if (valor === null) return null;
      // Escala absoluta (hectares sobrepostos): sem variação, quem não sobrepõe é o melhor caso.
      const semVariacao = coluna.escala_absoluta && valor === minimo ? 0 : 1;
      let n = coluna.tipo_dado === "booleano"
        ? valor
        : (maximo > minimo ? (valor - minimo) / (maximo - minimo) : semVariacao);
      if (["menor_melhor", "negativa"].includes(coluna.direcao)) n = 1 - n;
      return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
    });
    return { originais, normalizados };
  }

  function originalFormatado(valor, coluna) {
    if (valor === null || valor === undefined || valor === "") return "Não informado";
    if (coluna.rotulos?.[String(valor)]) return coluna.rotulos[String(valor)];
    if (coluna.tipo_dado === "booleano") return converter(valor, coluna) === 1 ? "Sim" : "Não";
    if (coluna.unidade === "R$" || coluna.chave === "capex_estimado") return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    if (coluna.grupo === "risco") return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return `${valor}${coluna.unidade ? ` ${coluna.unidade}` : ""}`;
  }

  function limpar(raiz) {
    $("[data-atributos-pesos]", raiz).hidden = true;
    $("[data-atributos-tbody]", raiz).innerHTML = "";
    $("[data-atributos-thead] tr", raiz).querySelectorAll("th.col-atributo").forEach((item) => item.remove());
    $("[data-atributos-erro]", raiz).hidden = true;
    $("[data-atributos-sem-colunas]", raiz).hidden = true;
    $("[data-atributos-sem-linhas]", raiz).hidden = true;
  }

  function linhasEquilibradas(titulo) {
    const palavras = String(titulo || "").trim().split(/\s+/).filter(Boolean);
    if (palavras.length < 3 || titulo.length <= 25) return [palavras.join(" ")];

    const naoPodemEncerrar = new Set([
      "a", "o", "as", "os", "um", "uma", "uns", "umas",
      "de", "da", "do", "das", "dos", "e", "ou", "em",
      "no", "na", "nos", "nas", "ao", "aos", "à", "às",
      "com", "sem", "por", "para", "sob", "entre", "que",
    ]);
    const evitarNoInicio = new Set([
      "e", "ou", "que", "da", "do", "das", "dos", "no", "na", "nos", "nas",
    ]);
    const normalizar = (palavra) => palavra.toLocaleLowerCase("pt-BR").replace(/^[\s([{"']+|[\s)\]},;:.!?"']+$/g, "");
    let melhor = null;

    for (let corte = 1; corte < palavras.length; corte += 1) {
      const linha1 = palavras.slice(0, corte).join(" ");
      const linha2 = palavras.slice(corte).join(" ");
      const fim1 = normalizar(palavras[corte - 1]);
      const inicio2 = normalizar(palavras[corte]);
      let penalidade = Math.abs(linha1.length - linha2.length);
      if (naoPodemEncerrar.has(fim1)) penalidade += 1000;
      if (evitarNoInicio.has(inicio2)) penalidade += 80;
      if (linha1.length < titulo.length * 0.3 || linha2.length < titulo.length * 0.3) penalidade += 250;
      const abre1 = (linha1.match(/\(/g) || []).length;
      const fecha1 = (linha1.match(/\)/g) || []).length;
      if (abre1 !== fecha1) penalidade += 15;
      if (!melhor || penalidade < melhor.penalidade) melhor = { linha1, linha2, penalidade };
    }
    return melhor ? [melhor.linha1, melhor.linha2] : [palavras.join(" ")];
  }

  function preencherTituloCabecalho(elemento, titulo) {
    elemento.title = titulo;
    elemento.replaceChildren(...linhasEquilibradas(titulo).map((linha) => {
      const span = document.createElement("span");
      span.className = "col-atributo-linha";
      span.textContent = linha;
      return span;
    }));
  }

  function campoComplementacao(objeto, coluna, valor, editavel) {
    const escolhas = coluna.tipo_dado === "booleano"
      ? [["true", "Sim"], ["false", "Não"]]
      : Object.keys(coluna.mapeamento || {}).map(chave => [chave, coluna.rotulos?.[chave] || chave]);
    const input = document.createElement(escolhas.length ? "select" : "input");
    if (escolhas.length) {
      input.add(new Option("Não informado", ""));
      escolhas.forEach(([chave, rotulo]) => input.add(new Option(rotulo, chave)));
      if (valor != null && !escolhas.some(([chave]) => chave === String(valor))) {
        input.add(new Option(String(valor), String(valor)));
      }
    } else {
      input.type = "text";
    }
    input.className = "atributo-input";
    input.dataset.atributoColuna = coluna.id;
    input.dataset.atributoObjeto = objeto.cabecalho_objeto.codigo;
    input.setAttribute("aria-label", `${coluna.alias} — ${objeto.cabecalho_objeto.codigo}`);
    input.value = valor == null ? "" : String(valor);
    if (!escolhas.length && coluna.tipo_dado === "numerico") SLTInputMasks.aplicarColuna(input, coluna, valor);
    input.disabled = !editavel;
    return input;
  }

  function montarTabela(raiz, objetos, colunas, opcoes = {}) {
    const linhaCabecalho = $("[data-atributos-thead] tr", raiz);
    const corpo = $("[data-atributos-tbody]", raiz);
    const tplColuna = $("#tpl-atributo-coluna", raiz);
    const tplLinha = $("#tpl-atributo-linha", raiz);
    const tplCelula = $("#tpl-atributo-celula", raiz);
    const matrizes = colunas.map((coluna) => normalizarObjetos(objetos, coluna));
    colunas.forEach((coluna) => {
      const th = tplColuna.content.firstElementChild.cloneNode(true);
      th.classList.add(coluna.grupo === "cadastro" ? "col-estatica" : "col-dinamica");
      if (coluna.grupo === "risco") th.classList.add("col-risco");
      th.dataset.colId = coluna.id;
      preencherTituloCabecalho(
        $(".col-atributo-alias", th),
        coluna.alias || coluna.criterio || coluna.id,
      );
      $(".col-atributo-unidade", th).textContent = coluna.unidade ? `(${coluna.unidade})` : "";
      linhaCabecalho.appendChild(th);
    });
    objetos.forEach((objeto, indiceObjeto) => {
      const cabecalho = objeto.cabecalho_objeto || {};
      const tr = tplLinha.content.firstElementChild.cloneNode(true);
      tr.dataset.objetoId = cabecalho.codigo || "";
      $(".objeto-codigo", tr).textContent = cabecalho.nome || "—";
      $(".objeto-nome", tr).textContent = cabecalho.codigo || "";
      colunas.forEach((coluna, indiceColuna) => {
        const td = tplCelula.content.firstElementChild.cloneNode(true);
        const { originais, normalizados } = matrizes[indiceColuna];
        const normalizado = normalizados[indiceObjeto];
        $(".atributo-valor-normalizado", td).textContent = normalizado === null ? "—" : normalizado.toFixed(4);
        const procedencia = coluna.grupo === "cadastro" ? procedenciaCadastro(objeto, coluna) : null;
        $(".atributo-valor-original", td).textContent = `${originalFormatado(originais[indiceObjeto], coluna)}${procedencia ? ` · referência: ${procedencia}` : ""}`;
        td.dataset.colId = coluna.id;
        if (opcoes.complementacao) {
          $(".atributo-valor-normalizado", td).hidden = true;
          $(".atributo-valor-original", td).hidden = true;
          td.appendChild(campoComplementacao(objeto, coluna, originais[indiceObjeto], opcoes.editavel));
        }
        td.classList.toggle("is-vazio", normalizado === null);
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    });
  }

  const GRUPOS_PESO = ["cadastro", "dinamico", "risco"];

  function pesosIniciais(colunas, configuracao) {
    const anteriores = Object.fromEntries((configuracao?.criterios || []).map((item) => [item.nome_coluna || item.atributo_id, Number(item.peso)]));
    const pesos = {};
    for (const grupo of configuracao?.ponderacao === "abrangente" ? ["todos"] : GRUPOS_PESO) {
      const itens = colunas.filter((coluna) => grupo === "todos" || coluna.grupo === grupo);
      const valores = itens.map((coluna) => Number.isFinite(anteriores[coluna.id]) ? anteriores[coluna.id] : 1);
      if (valores.every(valor => valor === 0)) valores.fill(1);
      const soma = valores.reduce((a, b) => a + b, 0) || 1;
      itens.forEach((coluna, indice) => { pesos[coluna.id] = valores[indice] / soma; });
    }
    return pesos;
  }

  function redistribuir(colunaId, novoValor) {
    const alvo = estado.colunas.find((coluna) => coluna.id === colunaId);
    const pares = estado.colunas.filter((coluna) => (estado.ponderacao === "abrangente" || coluna.grupo === alvo.grupo) && coluna.id !== colunaId);
    novoValor = Number.isFinite(novoValor) ? Math.max(0, Math.min(1, novoValor)) : 0;
    estado.pesos[colunaId] = novoValor;
    if (!pares.length) { estado.pesos[colunaId] = 1; return; }
    const restante = 1 - novoValor;
    const somaOutros = pares.reduce((soma, coluna) => soma + estado.pesos[coluna.id], 0);
    pares.forEach((coluna) => { estado.pesos[coluna.id] = somaOutros > 0 ? restante * estado.pesos[coluna.id] / somaOutros : restante / pares.length; });
  }

  function montarPesos(raiz) {
    for (const grupo of GRUPOS_PESO) {
      const host = $(`[data-controles-pesos="${grupo}"]`, raiz);
      const itens = estado.colunas.filter((coluna) => coluna.grupo === grupo);
      host.innerHTML = itens.map((coluna) => `<label class="atributo-peso" data-peso-id="${coluna.id}"><span>${coluna.alias || coluna.criterio}</span><input class="atributo-peso-numero" type="number" min="0" max="1" step="0.001" inputmode="decimal" value="${estado.pesos[coluna.id].toFixed(3)}" aria-label="Peso de ${coluna.alias || coluna.criterio}"><input class="atributo-peso-barra" type="range" min="0" max="1" step="0.001" value="${estado.pesos[coluna.id]}"></label>`).join("");
      host.querySelectorAll(".atributo-peso-barra, .atributo-peso-numero").forEach((input) => input.addEventListener("input", () => {
        redistribuir(input.closest("[data-peso-id]").dataset.pesoId, Number(input.value));
        GRUPOS_PESO.forEach(g => atualizarPesos(raiz, g));
        document.dispatchEvent(new Event("atributos-pesos-alterados"));
      }));
      $(`[data-soma-pesos="${grupo}"]`, raiz).closest("section").hidden = !itens.length;
      atualizarPesos(raiz, grupo);
    }
    const pesos = $("[data-atributos-pesos]", raiz);
    pesos.hidden = !estado.colunas.length;
    const comRisco = estado.colunas.some((coluna) => coluna.grupo === "risco");
    pesos.classList.toggle("atributos-pesos--tres", comRisco);
    // Larguras proporcionais só aos grupos presentes, para que nenhum contêiner de peso fique espremido ou estoure.
    const fracoes = { cadastro: 1, dinamico: 2, risco: 1.4 };
    const visiveis = GRUPOS_PESO.filter((grupo) => estado.colunas.some((coluna) => coluna.grupo === grupo));
    if (comRisco) pesos.style.setProperty("--pesos-colunas", visiveis.map((grupo) => `minmax(0, ${fracoes[grupo]}fr)`).join(" "));
    else pesos.style.removeProperty("--pesos-colunas");
  }

  function atualizarPesos(raiz, grupo) {
    const itens = estado.colunas.filter((coluna) => coluna.grupo === grupo);
    itens.forEach((coluna) => {
      const linha = $(`[data-peso-id="${CSS.escape(coluna.id)}"]`, raiz);
      if (!linha) return;
      $(".atributo-peso-barra", linha).value = estado.pesos[coluna.id];
      $(".atributo-peso-numero", linha).value = estado.pesos[coluna.id].toFixed(3);
    });
    $(`[data-soma-pesos="${grupo}"]`, raiz).textContent = itens.reduce((soma, coluna) => soma + estado.pesos[coluna.id], 0).toFixed(3).replace(".", ",");
  }

  async function render(hierarquizacao, opcoes = {}) {
    const versao = ++versaoRender;
    const raiz = $("[data-atributos-objetos]");
    estado = { colunas: [], pesos: {} };
    if (!raiz) return;
    limpar(raiz);
    if (!opcoes.complementacao) configurarFonte(null);
    if (!hierarquizacao?.codigo) return;
    try {
      const [respostaColunas, dominios] = await Promise.all([
        opcoes.colunas === undefined ? json(API_COLUNAS(hierarquizacao.codigo)) : Promise.resolve({colunas: opcoes.colunas}),
        opcoes.dominios === undefined ? json(API_DOMINIOS) : Promise.resolve(opcoes.dominios),
      ]);
      if (versao !== versaoRender) return;
      const objetos = hierarquizacao.dados_hierarquizacao?.objetos || [];
      const tipo = tipoObjeto(hierarquizacao);
      const colunas = [
        ...colunasCadastro(dominios, tipo),
        ...colunasDinamicas(respostaColunas.colunas || []),
        ...(opcoes.complementacao ? [] : colunasRisco(objetos)),
      ];
      estado = {
        colunas,
        objetos,
        complementacao: Boolean(opcoes.complementacao),
        pesos: pesosIniciais(colunas, hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.configuracoes?.fase_3),
      };
      const titulo = document.getElementById("fase3-titulo-atributos");
      if (titulo) titulo.textContent = `${opcoes.complementacao ? "2.2 " : ""}Critérios de atributo de demanda`;
      montarTabela(raiz, objetos, colunas, opcoes);
      $("[data-atributos-pesos]", raiz).hidden = true;
      if (!opcoes.complementacao) montarPesos(raiz);
      if (!opcoes.complementacao) configurarFonte(hierarquizacao);
      $("[data-atributos-sem-colunas]", raiz).hidden = Boolean(colunas.length);
      $("[data-atributos-sem-linhas]", raiz).hidden = Boolean(objetos.length);
    } catch (erro) {
      if (versao !== versaoRender) return;
      const aviso = $("[data-atributos-erro]", raiz);
      aviso.textContent = `Não foi possível carregar os atributos: ${erro.message}`;
      aviso.hidden = false;
      estado = { colunas: [], pesos: {} };
      throw erro;
    }
  }

  function criteriosPayload() {
    return estado.colunas.map((coluna) => ({
      atributo_id: coluna.id,
      nome_coluna: coluna.id,
      criterio: coluna.alias || coluna.criterio || coluna.id,
      tipo_dado: coluna.tipo_dado || "numerico",
      direcao: coluna.direcao || "maior_melhor",
      peso: estado.pesos[coluna.id] || 0,
      obrigatorio: Boolean(coluna.mandatorio || coluna.obrigatorio),
      mapeamento: coluna.mapeamento || {},
      grupo_atributo: coluna.grupo === "risco" ? GRUPO_RISCO : coluna.grupo,
      ...(coluna.grupo === "risco" ? { unidade: coluna.unidade, valor_minimo: 0, valor_maximo: 1 } : {}),
    }));
  }

  function atributosAusentes(hierarquizacao) {
    const objetos = hierarquizacao?.dados_hierarquizacao?.objetos || [];
    const matrizes = new Map(estado.colunas.map(coluna => [coluna.id, normalizarObjetos(objetos, coluna).normalizados]));
    return objetos.map((objeto, indice) => {
      const cabecalho = objeto.cabecalho_objeto || {};
      const manuais = estado.colunas.filter((coluna) => coluna.grupo !== "risco");
      const nome = (coluna) => coluna.alias || coluna.criterio || coluna.id;
      const atributos = manuais.filter((coluna) => vazio(valorDaColuna(objeto, coluna))).map(nome);
      const invalidos = manuais.filter((coluna) => {
        const valor = valorDaColuna(objeto, coluna);
        return !vazio(valor) && matrizes.get(coluna.id)[indice] === null;
      }).map(nome);
      const riscos = estado.colunas.filter((coluna) => coluna.grupo === "risco" && vazio(valorDaColuna(objeto, coluna))).map(nome);
      return {
        codigo: cabecalho.codigo || "",
        nome: cabecalho.nome || "—",
        atributos,
        invalidos,
        riscos,
      };
    });
  }

  function configuracaoAlterada(hierarquizacao) {
    const config = hierarquizacao?.dados_hierarquizacao?.cabecalho_grupo?.configuracoes?.fase_3 || {};
    if (config.fonte_pesos && (config.fonte_pesos !== estado.fonte || config.ponderacao !== estado.ponderacao || (config.julgamento_id || null) !== opcoesPesos().julgamento_id)) return true;
    if (estado.fonte === "ahp" && !estado.pesosAhpValidos) return true;
    const salvos = hierarquizacao?.dados_hierarquizacao?.cabecalho_grupo?.configuracoes?.fase_3?.criterios || [];
    const assinatura = (criterios) => JSON.stringify(criterios.map((c) => ({
      id: c.nome_coluna || c.atributo_id,
      tipo: c.tipo_dado || "numerico",
      direcao: c.direcao || "maior_melhor",
      peso: Number(c.peso || 0),
      obrigatorio: Boolean(c.obrigatorio),
      mapeamento: Object.entries(c.mapeamento || {}).sort(([a], [b]) => a.localeCompare(b)),
    })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
    return assinatura(salvos) !== assinatura(criteriosPayload());
  }

  function definirEdicao(editavel) {
    document.querySelectorAll("[data-atributo-coluna]").forEach(input => { input.disabled = !editavel; });
  }

  function coletar() {
    const valores = {};
    if (!estado.complementacao) return {valores};
    document.querySelectorAll("[data-atributo-coluna]:not([disabled])").forEach(input => {
      const coluna = estado.colunas.find(item => item.id === input.dataset.atributoColuna);
      const objeto = estado.objetos.find(item => item.cabecalho_objeto.codigo === input.dataset.atributoObjeto);
      const original = coluna.grupo === "cadastro" ? valorCadastro(objeto, coluna) : valorDinamico(objeto, coluna);
      const numerico = coluna.tipo_dado === "numerico";
      const formatado = numerico ? SLTInputMasks.formatarValor(original, coluna) : String(original ?? "");
      if (input.value === formatado) return;
      const valor = input.value === "" ? null : coluna.tipo_dado === "booleano"
        ? input.value === "true" : numerico ? SLTInputMasks.parseValor(input.value, SLTInputMasks.perfilColuna(coluna)) : input.value;
      if (valor === (original ?? null)) return;
      valores[input.dataset.atributoObjeto] ||= {};
      valores[input.dataset.atributoObjeto][coluna.id] = valor;
    });
    return {valores};
  }

  global.AtributosObjetos = { render, criteriosPayload, configuracaoPayload, atributosAusentes, configuracaoAlterada, definirEdicao, coletar };
})(window);
