/* Motor de cálculo da Mesa de consolidação.
 * Funções puras, sem DOM: espelham api/services/ahp_engine.py e as regras de
 * api/services/comparacao_colaborativa_service.py (criar_analise), para que a
 * prévia na tela coincida com o que o servidor grava. */
(function (raiz, fabrica) {
  'use strict';
  const motor = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = motor;
  else raiz.MesaMotor = motor;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const INDICE_ALEATORIO = { 1: 0, 2: 0, 3: 0.58, 4: 0.9, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
  const ESCALA_SAATY = [[1 / 9, '1/9'], [1 / 8, '1/8'], [1 / 7, '1/7'], [1 / 6, '1/6'], [1 / 5, '1/5'], [1 / 4, '1/4'], [1 / 3, '1/3'], [1 / 2, '1/2'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6'], [7, '7'], [8, '8'], [9, '9']];
  // Um índice a 3 vezes do valor consolidado (ou a 1/3 dele) é tratado como destoante.
  const LIMITE_DESTOANTE = Math.log(3) - 1e-9;
  const METODO_DA_API = { aij_media_geometrica: 'geometrica', aij_media_aritmetica: 'aritmetica', aij_mediana: 'mediana' };
  const ROTULO_METODO = { geometrica: 'Média geométrica', aritmetica: 'Média aritmética', mediana: 'Mediana' };

  function indiceAleatorio(n) { return n <= 2 ? 0 : (INDICE_ALEATORIO[n] || 1.49); }

  function rotuloSaaty(valor) {
    if (valor == null || !Number.isFinite(Number(valor))) return '—';
    for (const [numero, texto] of ESCALA_SAATY) if (Math.abs(Number(valor) - numero) < 0.0005) return texto;
    return Number(valor).toFixed(3);
  }

  function analisarMatriz(matriz) {
    const n = matriz.length;
    const geo = matriz.map(linha => Math.pow(linha.reduce((p, v) => p * Number(v), 1), 1 / n));
    const soma = geo.reduce((a, b) => a + b, 0) || 1;
    const pesos = geo.map(g => g / soma);
    if (n < 2) return { pesos, lambdaMax: n, ic: 0, ri: 0, rc: 0 };
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
      let linha = 0;
      for (let j = 0; j < n; j++) linha += Number(matriz[i][j]) * pesos[j];
      lambdaMax += linha / pesos[i];
    }
    lambdaMax /= n;
    const ic = (lambdaMax - n) / (n - 1), ri = indiceAleatorio(n);
    return { pesos, lambdaMax, ic, ri, rc: n > 2 && ri > 0 ? ic / ri : 0 };
  }

  function mediana(valores) {
    const ordem = valores.slice().sort((a, b) => a - b), meio = Math.floor(ordem.length / 2);
    return ordem.length % 2 ? ordem[meio] : (ordem[meio - 1] + ordem[meio]) / 2;
  }
  const MEDIDAS = {
    geometrica: valores => Math.exp(valores.reduce((s, v) => s + Math.log(v), 0) / valores.length),
    aritmetica: valores => valores.reduce((s, v) => s + v, 0) / valores.length,
    mediana,
  };

  // Agrega o triângulo superior pela medida escolhida e espelha o recíproco,
  // como o servidor, para que a reciprocidade a_ij × a_ji = 1 seja preservada.
  function agregar(matrizes, metodo) {
    const n = matrizes[0].length, calcula = MEDIDAS[metodo] || MEDIDAS.geometrica;
    const matriz = Array.from({ length: n }, () => Array(n).fill(1));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const valor = calcula(matrizes.map(m => Number(m[i][j])));
      matriz[i][j] = valor; matriz[j][i] = 1 / valor;
    }
    return matriz;
  }

  function elegivel(resposta, rcMaximo) {
    return Boolean(resposta.consistente) && Number(resposta.razao_consistencia || 0) <= rcMaximo;
  }
  function consistenteNoLimite(rc, rcMaximo, superficie) {
    return superficie ? rc <= Math.min(rcMaximo, 0.10) : rc < rcMaximo;
  }
  function diferencaMaxima(a, b) {
    if (!a || !b || a.length !== b.length) return null;
    return a.reduce((maior, v, i) => Math.max(maior, Math.abs(v - b[i])), 0);
  }
  function nomeCriterio(criterio, indice) {
    if (typeof criterio === 'string') return criterio;
    return (criterio && (criterio.criterio || criterio.nome || criterio['Critério'] || criterio.name)) || 'Critério ' + (indice + 1);
  }
  function enviadas(respostas) {
    return (respostas || []).filter(r => r.status === 'enviada' && Array.isArray(r.matriz_comparacao) && r.matriz_comparacao.length);
  }

  /* opcoes: { ids: Set de respostas marcadas, metodo, rcMaximo, excluirInconsistentes, superficie }
   * Devolve a situação de cada resposta enviada, a matriz, os pesos, as métricas, o detalhe por par,
   * as estatísticas por critério e o efeito de retirar cada julgador do grupo. */
  function consolidar(respostasEnviadas, criterios, opcoes) {
    const { ids, metodo, rcMaximo, excluirInconsistentes, superficie } = opcoes;
    const situacoes = new Map(), incluidas = [];
    for (const r of respostasEnviadas) {
      const id = String(r.id);
      if (!ids.has(id)) situacoes.set(id, { estado: 'desmarcada', texto: 'Fora: desmarcada' });
      else if (excluirInconsistentes && !elegivel(r, rcMaximo)) situacoes.set(id, { estado: 'inconsistente', texto: 'Fora: inconsistente' });
      else { situacoes.set(id, { estado: 'incluida', texto: 'Incluída' }); incluidas.push(r); }
    }
    const nomes = criterios.map(nomeCriterio), n = nomes.length;
    const base = { situacoes, incluidas, nomes, metodo, rcMaximo, vazio: !incluidas.length };
    if (!incluidas.length) return base;

    const matriz = agregar(incluidas.map(r => r.matriz_comparacao), metodo);
    const analise = analisarMatriz(matriz);
    const individuais = new Map(respostasEnviadas.map(r => [String(r.id), analisarMatriz(r.matriz_comparacao)]));

    const pares = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const consolidado = matriz[i][j], valores = new Map();
      let soma = 0, pior = null;
      for (const r of respostasEnviadas) {
        const v = Number(r.matriz_comparacao[i][j]), afastamento = Math.log(v / consolidado);
        valores.set(String(r.id), { valor: v, afastamento });
        if (situacoes.get(String(r.id)).estado !== 'incluida') continue;
        soma += afastamento * afastamento;
        if (!pior || Math.abs(afastamento) > Math.abs(pior.afastamento)) pior = { id: String(r.id), valor: v, afastamento };
      }
      pares.push({
        i, j, rotulo: nomes[i] + ' × ' + nomes[j], criterioA: nomes[i], criterioB: nomes[j], consolidado, valores,
        dispersao: Math.sqrt(soma / incluidas.length),
        destoante: incluidas.length > 1 && pior && Math.abs(pior.afastamento) >= LIMITE_DESTOANTE ? pior : null,
        maisAfastado: incluidas.length > 1 ? pior : null,
      });
    }

    const criteriosEstat = nomes.map((nome, k) => {
      const pesos = incluidas.map(r => individuais.get(String(r.id)).pesos[k]);
      const media = pesos.reduce((a, b) => a + b, 0) / pesos.length;
      const desvio = Math.sqrt(pesos.reduce((s, v) => s + (v - media) ** 2, 0) / pesos.length);
      return { nome, peso: analise.pesos[k], minimo: Math.min(...pesos), maximo: Math.max(...pesos), media, desvio, cv: media ? desvio / media : 0 };
    });
    const ordem = analise.pesos.map((p, k) => [p, k]).sort((a, b) => b[0] - a[0]);
    ordem.forEach(([, k], posicao) => { criteriosEstat[k].posicao = posicao + 1; });

    const impacto = new Map();
    for (const r of incluidas) {
      const id = String(r.id);
      const destoantes = pares.filter(p => p.destoante && p.destoante.id === id).length;
      let sem = null;
      if (incluidas.length > 1) {
        const a = analisarMatriz(agregar(incluidas.filter(o => o !== r).map(o => o.matriz_comparacao), metodo));
        sem = { rc: a.rc, deltaRc: a.rc - analise.rc, deltaPeso: diferencaMaxima(a.pesos, analise.pesos) };
      }
      impacto.set(id, { destoantes, sem });
    }

    return Object.assign(base, {
      matriz, analise, individuais, pares, criterios: criteriosEstat, impacto,
      consistente: consistenteNoLimite(analise.rc, rcMaximo, superficie),
    });
  }

  return { consolidar, analisarMatriz, agregar, elegivel, consistenteNoLimite, diferencaMaxima, rotuloSaaty, nomeCriterio, enviadas, indiceAleatorio, METODO_DA_API, ROTULO_METODO, LIMITE_DESTOANTE };
});
