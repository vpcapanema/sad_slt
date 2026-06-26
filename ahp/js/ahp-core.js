/**
 * SLTAhp — motor de cálculo AHP (fonte única da verdade).
 *
 * Cobre os dois níveis do AHP clássico:
 *   1. Pesos dos critérios a partir da matriz pareada de critérios.
 *   2. Prioridades locais das alternativas (uma matriz pareada por critério).
 *   3. Síntese: score(alt) = Σ_k peso_k · prioridade_local_k(alt) → ranking.
 *
 * Pesos por média geométrica; consistência por λmax = média de (A·w)_i / w_i.
 */
(function (global) {
  "use strict";

  // Índice Aleatório de Saaty (RI), indexado por n (RI_BY_N[n]).
  const RI_BY_N = {
    1: 0.0,
    2: 0.0,
    3: 0.58,
    4: 0.9,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
  };

  function randomIndex(n) {
    if (n <= 2) return 0;
    return RI_BY_N[n] != null ? RI_BY_N[n] : 1.49;
  }

  /** Vetor de prioridades por média geométrica das linhas, normalizado. */
  function priorityVector(matrix) {
    const n = matrix.length;
    const geo = new Array(n);
    for (let i = 0; i < n; i++) {
      let prod = 1;
      for (let j = 0; j < n; j++) prod *= matrix[i][j];
      geo[i] = Math.pow(prod, 1 / n);
    }
    const sum = geo.reduce((a, b) => a + b, 0) || 1;
    return geo.map((g) => g / sum);
  }

  /** λmax, CI e CR de uma matriz pareada já com seus pesos. */
  function consistency(matrix, weights) {
    const n = matrix.length;
    if (n < 2) return { lambdaMax: n, CI: 0, CR: 0, RI: 0 };
    let lambdaMax = 0;
    for (let i = 0; i < n; i++) {
      let rowSum = 0;
      for (let j = 0; j < n; j++) rowSum += matrix[i][j] * weights[j];
      lambdaMax += rowSum / weights[i];
    }
    lambdaMax /= n;
    const CI = (lambdaMax - n) / (n - 1);
    const RI = randomIndex(n);
    const CR = n > 2 && RI > 0 ? CI / RI : 0;
    return { lambdaMax, CI, CR, RI };
  }

  /**
   * Pesos + métricas de consistência de uma matriz pareada.
   * @returns {{weights:number[], lambdaMax:number, CI:number, CR:number, RI:number}}
   */
  function analyzeMatrix(matrix) {
    const weights = priorityVector(matrix);
    const cons = consistency(matrix, weights);
    return { weights, ...cons };
  }

  // Alias histórico usado pela tela de resultados.
  function calculateAHP(matrix) {
    return analyzeMatrix(matrix);
  }

  /**
   * Sintetiza o ranking global das alternativas.
   * @param {number[]} criteriaWeights  pesos dos critérios (tamanho C).
   * @param {number[][]} localByCriterion  matriz C×A: prioridades locais das
   *        A alternativas em cada um dos C critérios (cada linha soma 1).
   * @returns {{scores:number[], order:number[]}}
   */
  function synthesize(criteriaWeights, localByCriterion) {
    const C = criteriaWeights.length;
    const A = C > 0 && localByCriterion[0] ? localByCriterion[0].length : 0;
    const scores = new Array(A).fill(0);
    for (let k = 0; k < C; k++) {
      const w = criteriaWeights[k] || 0;
      const local = localByCriterion[k] || [];
      for (let a = 0; a < A; a++) scores[a] += w * (local[a] || 0);
    }
    const order = scores
      .map((s, idx) => ({ s, idx }))
      .sort((x, y) => y.s - x.s)
      .map((o) => o.idx);
    return { scores, order };
  }

  /** Constrói uma matriz pareada n×n recíproca a partir do triângulo superior. */
  function matrixFromUpper(n, getUpper) {
    const m = [];
    for (let i = 0; i < n; i++) {
      m[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) m[i][j] = 1;
        else if (i < j) m[i][j] = getUpper(i, j);
        else m[i][j] = 1 / getUpper(j, i);
      }
    }
    return m;
  }

  global.SLTAhp = {
    RI_BY_N,
    randomIndex,
    priorityVector,
    consistency,
    analyzeMatrix,
    calculateAHP,
    synthesize,
    matrixFromUpper,
  };
})(typeof window !== "undefined" ? window : globalThis);
