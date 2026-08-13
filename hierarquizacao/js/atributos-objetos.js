(function (global) {
  "use strict";

  const API_COLUNAS = (codigo) => `/api/ahp/atributos-objetos/hierarquizacoes/${encodeURIComponent(codigo)}/colunas`;
  const API_DOMINIOS = "/api/dominios/atributos-objeto";
  let estado = { colunas: [], pesos: {} };

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const numero = (valor) => {
    if (valor === null || valor === undefined || valor === "") return null;
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

  function converter(valor, coluna) {
    if (valor === null || valor === undefined || valor === "") return null;
    if (coluna.tipo_dado === "booleano") return [true, 1, "1", "true", "sim"].includes(typeof valor === "string" ? valor.toLowerCase() : valor) ? 1 : 0;
    if (["categorico", "ordinal"].includes(coluna.tipo_dado)) return numero(coluna.mapeamento?.[String(valor)]);
    return numero(valor);
  }

  function normalizarObjetos(objetos, coluna) {
    const originais = objetos.map((objeto) => coluna.grupo === "cadastro" ? valorCadastro(objeto, coluna) : valorDinamico(objeto, coluna));
    const convertidos = originais.map((valor) => converter(valor, coluna));
    const validos = convertidos.filter((valor) => valor !== null);
    const minimo = validos.length ? Math.min(...validos) : 0;
    const maximo = validos.length ? Math.max(...validos) : 0;
    const normalizados = convertidos.map((valor) => {
      if (valor === null) return null;
      let n = coluna.tipo_dado === "booleano"
        ? valor
        : (maximo > minimo ? (valor - minimo) / (maximo - minimo) : 1);
      if (["menor_melhor", "negativa"].includes(coluna.direcao)) n = 1 - n;
      return Math.max(0, Math.min(1, n));
    });
    return { originais, normalizados };
  }

  function originalFormatado(valor, coluna) {
    if (valor === null || valor === undefined || valor === "") return "Não informado";
    if (coluna.rotulos?.[String(valor)]) return coluna.rotulos[String(valor)];
    if (coluna.tipo_dado === "booleano") return converter(valor, coluna) === 1 ? "Sim" : "Não";
    if (coluna.unidade === "R$" || coluna.chave === "capex_estimado") return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return `${valor}${coluna.unidade ? ` ${coluna.unidade}` : ""}`;
  }

  function limpar(raiz) {
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

  function montarTabela(raiz, objetos, colunas) {
    const linhaCabecalho = $("[data-atributos-thead] tr", raiz);
    const corpo = $("[data-atributos-tbody]", raiz);
    const tplColuna = $("#tpl-atributo-coluna", raiz);
    const tplLinha = $("#tpl-atributo-linha", raiz);
    const tplCelula = $("#tpl-atributo-celula", raiz);
    const matrizes = colunas.map((coluna) => normalizarObjetos(objetos, coluna));
    colunas.forEach((coluna) => {
      const th = tplColuna.content.firstElementChild.cloneNode(true);
      th.classList.add(coluna.grupo === "cadastro" ? "col-estatica" : "col-dinamica");
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
      $(".objeto-codigo", tr).textContent = cabecalho.nome || "—";
      $(".objeto-nome", tr).textContent = cabecalho.codigo || "";
      colunas.forEach((coluna, indiceColuna) => {
        const td = tplCelula.content.firstElementChild.cloneNode(true);
        const { originais, normalizados } = matrizes[indiceColuna];
        const normalizado = normalizados[indiceObjeto];
        $(".atributo-valor-normalizado", td).textContent = normalizado === null ? "—" : normalizado.toFixed(4);
        const procedencia = coluna.grupo === "cadastro" ? procedenciaCadastro(objeto, coluna) : null;
        $(".atributo-valor-original", td).textContent = `${originalFormatado(originais[indiceObjeto], coluna)}${procedencia ? ` · referência: ${procedencia}` : ""}`;
        td.classList.toggle("is-vazio", normalizado === null);
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    });
  }

  function pesosIniciais(colunas, configuracao) {
    const anteriores = Object.fromEntries((configuracao?.criterios || []).map((item) => [item.nome_coluna || item.atributo_id, Number(item.peso)]));
    const pesos = {};
    for (const grupo of ["cadastro", "dinamico"]) {
      const itens = colunas.filter((coluna) => coluna.grupo === grupo);
      const valores = itens.map((coluna) => Number.isFinite(anteriores[coluna.id]) ? anteriores[coluna.id] : 1);
      const soma = valores.reduce((a, b) => a + b, 0) || 1;
      itens.forEach((coluna, indice) => { pesos[coluna.id] = valores[indice] / soma; });
    }
    return pesos;
  }

  function redistribuir(colunaId, novoValor) {
    const alvo = estado.colunas.find((coluna) => coluna.id === colunaId);
    const pares = estado.colunas.filter((coluna) => coluna.grupo === alvo.grupo && coluna.id !== colunaId);
    novoValor = Number.isFinite(novoValor) ? Math.max(0, Math.min(1, novoValor)) : 0;
    estado.pesos[colunaId] = novoValor;
    if (!pares.length) { estado.pesos[colunaId] = 1; return; }
    const restante = 1 - novoValor;
    const somaOutros = pares.reduce((soma, coluna) => soma + estado.pesos[coluna.id], 0);
    pares.forEach((coluna) => { estado.pesos[coluna.id] = somaOutros > 0 ? restante * estado.pesos[coluna.id] / somaOutros : restante / pares.length; });
  }

  function montarPesos(raiz) {
    for (const grupo of ["cadastro", "dinamico"]) {
      const host = $(`[data-controles-pesos="${grupo}"]`, raiz);
      const itens = estado.colunas.filter((coluna) => coluna.grupo === grupo);
      host.innerHTML = itens.map((coluna) => `<label class="atributo-peso" data-peso-id="${coluna.id}"><span>${coluna.alias || coluna.criterio}</span><input class="atributo-peso-numero" type="number" min="0" max="1" step="0.001" inputmode="decimal" value="${estado.pesos[coluna.id].toFixed(3)}" aria-label="Peso de ${coluna.alias || coluna.criterio}"><input class="atributo-peso-barra" type="range" min="0" max="1" step="0.001" value="${estado.pesos[coluna.id]}"></label>`).join("");
      host.querySelectorAll(".atributo-peso-barra, .atributo-peso-numero").forEach((input) => input.addEventListener("input", () => {
        redistribuir(input.closest("[data-peso-id]").dataset.pesoId, Number(input.value));
        atualizarPesos(raiz, grupo);
      }));
      $(`[data-soma-pesos="${grupo}"]`, raiz).closest("section").hidden = !itens.length;
      atualizarPesos(raiz, grupo);
    }
    $("[data-atributos-pesos]", raiz).hidden = !estado.colunas.length;
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

  async function render(hierarquizacao) {
    const raiz = $("[data-atributos-objetos]");
    if (!raiz || !hierarquizacao?.codigo) return;
    limpar(raiz);
    try {
      const [respostaColunas, dominios] = await Promise.all([json(API_COLUNAS(hierarquizacao.codigo)), json(API_DOMINIOS)]);
      const objetos = hierarquizacao.dados_hierarquizacao?.objetos || [];
      const tipo = tipoObjeto(hierarquizacao);
      const colunas = [...colunasCadastro(dominios, tipo), ...colunasDinamicas(respostaColunas.colunas || [])];
      estado = {
        colunas,
        pesos: pesosIniciais(colunas, hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.configuracoes?.fase_3),
      };
      const titulo = document.getElementById("fase3-titulo-atributos");
      if (titulo) titulo.textContent = `2. Critérios atributo de ${tituloTipo(tipo)}`;
      montarTabela(raiz, objetos, colunas);
      montarPesos(raiz);
      $("[data-atributos-sem-colunas]", raiz).hidden = Boolean(colunas.length);
      $("[data-atributos-sem-linhas]", raiz).hidden = Boolean(objetos.length);
    } catch (erro) {
      const aviso = $("[data-atributos-erro]", raiz);
      aviso.textContent = `Não foi possível carregar os atributos: ${erro.message}`;
      aviso.hidden = false;
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
      grupo_atributo: coluna.grupo,
    }));
  }

  function atributosAusentes(hierarquizacao) {
    const objetos = hierarquizacao?.dados_hierarquizacao?.objetos || [];
    return objetos.map((objeto) => {
      const cabecalho = objeto.cabecalho_objeto || {};
      const atributos = estado.colunas.filter((coluna) => {
        const valor = coluna.grupo === "cadastro"
          ? valorCadastro(objeto, coluna)
          : valorDinamico(objeto, coluna);
        return valor === null || valor === undefined || valor === "";
      }).map((coluna) => coluna.alias || coluna.criterio || coluna.id);
      return {
        codigo: cabecalho.codigo || "",
        nome: cabecalho.nome || "—",
        atributos,
      };
    });
  }

  global.AtributosObjetos = { render, criteriosPayload, atributosAusentes, coletar: () => ({ valores: {} }) };
})(window);
