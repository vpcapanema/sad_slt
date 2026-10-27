/* Simbologia das superfícies de favorabilidade territorial.
 * Fonte única para o visualizador de camadas, a prévia e a bancada: identifica a
 * superfície, obtém o contraste Jenks do índice contínuo, monta a expressão de cor
 * MapLibre e descreve a legenda. Funciona como script clássico e como import de
 * efeito colateral em módulos ES; nos dois casos expõe
 * globalThis.FavorabilidadeSimbologia uma única vez. */
(function (global) {
  "use strict";
  if (global.FavorabilidadeSimbologia) return;
  const API = "/api/geoespacial";
  const PASTA = "superficies-indices/hierarquizacao/favorabilidade";
  const SUPERFICIES = {
    [`${PASTA}/Favorabilidade Rede Trechos pol.gpkg`]: { camada: "subtrechos", campo: "fav_rede_dim", classe: "fav_rede_classe" },
    [`${PASTA}/favorabilidade_rede_trechos.gpkg`]: { camada: "subtrechos", campo: "fav_rede_dim" },
    [`${PASTA}/indicadores_municipais.gpkg`]: { camada: "municipios", campo: "fav_territorial_dim" },
  };
  // Identificação pelo atributo presente, na ordem de precedência. Saídas de
  // interseção da Fase 2 preservam os atributos como "<campo>__<original>".
  const REGRAS_CAMPOS = [
    { classe: "fav_rede_classe", campo: "fav_rede_dim" },
    { campo: "fav_rede_dim" },
    { campo: "fav_territorial_dim" },
    { campo: "fav_grade" },
  ];
  const CORES = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
  const SEM_DADO = "#9ca3af";
  const GEOMETRIA_INVALIDA = "#dc2626";
  const CLASSE_DESCONHECIDA = "#808080";
  const GRADIENTE = `linear-gradient(90deg, ${CORES.map((cor, i) => `${cor} ${i * 25}%`).join(", ")})`;
  const CLASSES = [
    { valores: ["muito baixa"], rotulo: "Muito baixa" },
    { valores: ["baixa"], rotulo: "Baixa" },
    { valores: ["média", "media", "moderada"], rotulo: "Média" },
    { valores: ["alta"], rotulo: "Alta" },
    { valores: ["muito alta"], rotulo: "Muito alta" },
  ];
  const ESCALA_CONTINUA = ["1 · Maior", "0,75", "0,5", "0,25", "0 · Menor"];
  const PROVISORIA = Object.freeze({ min: 0, max: 1, quebras: [0.25, 0.5, 0.75], provisoria: true });
  const PREENCHIMENTO = Object.freeze({ "fill-outline-color": "rgba(0, 0, 0, 0)", "fill-opacity": 1, "fill-antialias": false });

  function separarId(id) {
    const texto = String(id || "");
    if (!texto.startsWith("storage:")) return { arquivo: null, camada: null };
    const resto = texto.slice(8), corte = resto.indexOf("::");
    return corte < 0 ? { arquivo: resto, camada: null } : { arquivo: resto.slice(0, corte), camada: resto.slice(corte + 2) || null };
  }
  function nomesCampos(desc) {
    const lista = [desc.campos, desc.metadados_local?.campos].find(Array.isArray) || [];
    const nomes = lista.map(campo => typeof campo === "string" ? campo : campo?.nome).filter(Boolean);
    if (desc.propriedades && typeof desc.propriedades === "object") nomes.push(...Object.keys(desc.propriedades));
    return [...new Set(nomes.map(String))];
  }
  function localizarCampo(nomes, original) {
    const alvo = original.toLowerCase();
    return nomes.find(nome => nome.toLowerCase() === alvo) || nomes.find(nome => nome.toLowerCase().endsWith(`__${alvo}`)) || null;
  }
  /** Configuração de favorabilidade da camada ou null. Aceita {id, arquivo|caminho, camada, campos, metadados_local, propriedades}. */
  function identificar(desc) {
    if (!desc) return null;
    const doId = separarId(desc.id);
    const arquivo = String(desc.arquivo || desc.caminho || doId.arquivo || "").replace(/^storage:/, "").replace(/::.*$/, "") || null;
    const camada = desc.camada || doId.camada || null;
    const conhecida = arquivo ? SUPERFICIES[arquivo] : null;
    if (conhecida && (!camada || camada === conhecida.camada)) return { ...conhecida, arquivo, camada: camada || conhecida.camada };
    const nomes = nomesCampos(desc);
    if (!nomes.length) return null;
    for (const regra of REGRAS_CAMPOS) {
      if (regra.classe) {
        const classe = localizarCampo(nomes, regra.classe);
        if (!classe) continue;
        const prefixo = classe.slice(0, classe.length - regra.classe.length);
        const campo = nomes.find(nome => nome.toLowerCase() === `${prefixo}${regra.campo}`.toLowerCase()) || regra.campo;
        return { campo, classe, arquivo, camada };
      }
      const campo = localizarCampo(nomes, regra.campo);
      if (campo) return { campo, arquivo, camada };
    }
    return null;
  }
  function corProporcao(proporcao) {
    const posicao = proporcao * (CORES.length - 1);
    const indice = Math.min(Math.floor(posicao), CORES.length - 2);
    const canais = CORES.slice(indice, indice + 2).map(cor => cor.slice(1).match(/../g).map(canal => parseInt(canal, 16)));
    return `#${canais[0].map((canal, i) => Math.round(canal + (posicao - indice) * (canais[1][i] - canal)).toString(16).padStart(2, "0")).join("")}`;
  }
  function paradas(classificacao) {
    const limites = [...new Set([classificacao.min, ...classificacao.quebras, classificacao.max])];
    if (limites.length === 1) return [[0, corProporcao(.5)], [1, corProporcao(.5)]];
    const intervalos = limites.length - 1;
    // Inclui as inflexões de Jenks e da paleta, sem saturar valores dentro do intervalo observado.
    const proporcoes = [...new Set([...limites.map((_, i) => i / intervalos), ...CORES.map((_, i) => i / (CORES.length - 1))])].sort((a, b) => a - b);
    const lista = proporcoes.map(proporcao => {
      const posicao = proporcao * intervalos, indice = Math.min(Math.floor(posicao), intervalos - 1);
      return [limites[indice] + (posicao - indice) * (limites[indice + 1] - limites[indice]), corProporcao(proporcao)];
    });
    if (limites[0] > 0) lista.unshift([0, CORES[0]]);
    if (limites[intervalos] < 1) lista.push([1, CORES[CORES.length - 1]]);
    return lista;
  }
  /** Expressão MapLibre de cor. Sem classificação, usa a rampa contínua 0–1 provisória. */
  function expressaoCor(config, classificacao) {
    if (config.classe) {
      const expr = ["match", ["downcase", ["to-string", ["get", config.classe]]]];
      CLASSES.forEach((classe, i) => expr.push(classe.valores.length === 1 ? classe.valores[0] : classe.valores, CORES[i]));
      expr.push(CLASSE_DESCONHECIDA);
      return expr;
    }
    const valor = ["number", ["get", config.campo], -1];
    return ["case",
      ["==", ["get", "slt_geometria_valida"], false], GEOMETRIA_INVALIDA,
      ["all", [">=", valor, 0], ["<=", valor, 1]],
      ["interpolate", ["linear"], valor, ...paradas(classificacao || PROVISORIA).flat()],
      SEM_DADO,
    ];
  }
  function gradiente(lista, direcao = "0deg") {
    return `linear-gradient(${direcao}, ${lista.map(([valor, cor]) => `${cor} ${valor * 100}%`).join(", ")})`;
  }
  /** Dados de legenda: classes decrescentes ou rampa contínua com as paradas Jenks. */
  function legenda(config, classificacao) {
    if (config.classe) {
      return { tipo: "categorias", campo: config.classe, titulo: "Classe de favorabilidade",
        itens: CLASSES.map((classe, i) => ({ rotulo: classe.rotulo, cor: CORES[i] })).reverse(),
        semClasse: { rotulo: "Sem classe reconhecida", cor: CLASSE_DESCONHECIDA } };
    }
    const lista = paradas(classificacao || PROVISORIA);
    return { tipo: "continua", campo: config.campo, titulo: `Índice por dimensões · ${config.campo}`,
      paradas: lista, gradiente: gradiente(lista), escala: [...ESCALA_CONTINUA],
      provisoria: !classificacao, semDado: SEM_DADO, geometriaInvalida: GEOMETRIA_INVALIDA };
  }
  function validarClassificacao(data, campo) {
    if (data.metodo !== "jenks" || data.campo !== campo || !Number.isInteger(data.classes) || data.classes < 1 || data.classes > 5 ||
        !Number.isFinite(data.min) || !Number.isFinite(data.max) || data.min < 0 || data.max > 1 || data.min > data.max ||
        !Array.isArray(data.quebras) || data.quebras.length !== data.classes - 1 ||
        data.quebras.some((valor, i) => !Number.isFinite(valor) || valor <= data.min || valor > data.max || (i > 0 && valor <= data.quebras[i - 1]))) {
      throw new Error("A classificação Jenks retornou limites inválidos para a superfície.");
    }
    return data;
  }
  const cache = new Map();
  const chaveCache = ({ id, arquivo, campo, revisao }) => JSON.stringify([id, arquivo, campo, revisao || ""]);
  async function buscarClassificacao({ id, arquivo, campo }, fetcher) {
    const opcoes = body => ({ method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let response = await fetcher(`${API}/bancada-arquivos/preparar`, opcoes({ id, arquivo }));
    const meta = await response.json();
    if (!response.ok) throw new Error(meta.detail || "Não foi possível ler a revisão da superfície.");
    response = await fetcher(`${API}/bancada-arquivos/classificacao`, opcoes({ camada_id: id, arquivo, revisao: meta.revisao, campo, metodo: "jenks", classes: 5, dominio: [0, 1] }));
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Não foi possível calcular as classes Jenks.");
    return validarClassificacao(data, campo);
  }
  /** Classificação Jenks (5 classes, domínio 0–1) do campo contínuo na camada inteira. */
  function obterClassificacao(desc, { fetch: fetcher = global.fetch.bind(global), cache: usarCache = false } = {}) {
    const doId = separarId(desc.id);
    const alvo = { id: desc.id, arquivo: desc.arquivo || doId.arquivo, campo: desc.campo, revisao: desc.revisao };
    if (!alvo.id || !alvo.arquivo || !alvo.campo) return Promise.reject(new Error("A superfície não tem arquivo no storage para calcular o contraste Jenks."));
    if (!usarCache) return buscarClassificacao(alvo, fetcher);
    const chave = chaveCache(alvo);
    if (!cache.has(chave)) {
      const entrada = { valor: null, promessa: null };
      entrada.promessa = buscarClassificacao(alvo, fetcher).then(valor => { entrada.valor = valor; return valor; },
        erro => { cache.delete(chave); throw erro; });
      cache.set(chave, entrada);
    }
    return cache.get(chave).promessa;
  }
  /** Classificação já resolvida no cache, para pintar sem estado provisório. */
  function classificacaoEmCache(desc) {
    const doId = separarId(desc.id);
    return cache.get(chaveCache({ id: desc.id, arquivo: desc.arquivo || doId.arquivo, campo: desc.campo, revisao: desc.revisao }))?.valor || null;
  }

  global.FavorabilidadeSimbologia = Object.freeze({
    SUPERFICIES, CORES, SEM_DADO, GEOMETRIA_INVALIDA, CLASSE_DESCONHECIDA, GRADIENTE, PREENCHIMENTO, ESCALA_CONTINUA,
    identificar, corProporcao, paradas, expressaoCor, gradiente, legenda, obterClassificacao, classificacaoEmCache,
  });
})(globalThis);
