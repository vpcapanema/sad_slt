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

  /** Mantém os valores calculados; remove apenas o sinal do zero na apresentação. */
  function formatMetric(value) {
    const formatted = value.toFixed(4);
    return formatted === "-0.0000" ? "0.0000" : formatted;
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

  function validatedMetrics(matrix, pairs) {
    const indices = [...new Set(pairs.flat())].sort((a, b) => a - b);
    if (indices.length < 3 || pairs.length < indices.length) return null;
    const n = indices.length;
    const positions = new Map(indices.map((index, position) => [index, position]));
    const system = Array.from({ length: n }, () => Array(n + 1).fill(0));
    const observed = new Set();
    for (const [first, second] of pairs) {
      const i = positions.get(first), j = positions.get(second);
      const log = Math.log(matrix[first][second]);
      system[i][i]++;
      system[j][j]++;
      system[i][j]--;
      system[j][i]--;
      system[i][n] += log;
      system[j][n] -= log;
      observed.add(i + "_" + j);
    }
    // Fix one log-weight as the reference. A disconnected graph has no single RC.
    for (let i = 1; i < n; i++) {
      const pivot = system[i][i];
      if (pivot < 1e-10) return null;
      for (let column = i; column <= n; column++) system[i][column] /= pivot;
      for (let row = 1; row < n; row++) {
        if (row === i) continue;
        const factor = system[row][i];
        for (let column = i; column <= n; column++) system[row][column] -= factor * system[i][column];
      }
    }
    const weights = system.map((row, i) => i === 0 ? 0 : row[n]);
    const completed = indices.map((first, i) => indices.map((second, j) => {
      if (i === j) return 1;
      const key = Math.min(i, j) + "_" + Math.max(i, j);
      return observed.has(key) ? matrix[first][second] : Math.exp(weights[i] - weights[j]);
    }));
    return analyzeMatrix(completed);
  }

  function validatedConsistency(matrix, pairs) {
    return validatedMetrics(matrix, pairs)?.CR ?? null;
  }

  function consistencyPlan(matrix, answered, sampleScore) {
    const score = sampleScore || (values => analyzeMatrix(values).CR);
    const trial = matrix.map(row => row.slice());
    const pairs = Array.from(answered, key => key.split("_").map(Number));
    const allowed = [1 / 9, 1 / 7, 1 / 5, 1 / 3, 1, 3, 5, 7, 9];
    const set = (i, j, value) => {
      trial[i][j] = value;
      trial[j][i] = 1 / value;
    };
    let rc = score(trial);
    if (rc == null || !Number.isFinite(rc)) return null;
    for (let step = 0; step < pairs.length && rc >= 0.1; step++) {
      let best = null;
      let bestRC = rc;
      for (const [i, j] of pairs) {
        const current = trial[i][j];
        for (const value of allowed) {
          if (value === current) continue;
          set(i, j, value);
          const candidateRC = score(trial);
          if (candidateRC != null && candidateRC < bestRC - 1e-10) {
            best = [i, j, value];
            bestRC = candidateRC;
          }
        }
        set(i, j, current);
      }
      if (!best) break;
      set(...best);
      rc = bestRC;
    }
    // A matriz de igualdade é um ponto factível quando a busca local trava.
    if (rc >= 0.1) {
      for (const [i, j] of pairs) set(i, j, 1);
    }
    // Preserve todo julgamento original que puder voltar sem perder consistência.
    for (const [i, j] of pairs) {
      const value = trial[i][j];
      if (value === matrix[i][j]) continue;
      set(i, j, matrix[i][j]);
      const restoredRC = score(trial);
      if (restoredRC == null || !(restoredRC < 0.1)) set(i, j, value);
    }
    rc = score(trial);
    if (rc == null || !(rc < 0.1)) return null;
    return {
      projectedCR: rc,
      changes: pairs.filter(([i, j]) => trial[i][j] !== matrix[i][j])
        .map(([i, j]) => ({ i, j, currentValue: matrix[i][j], suggestedValue: trial[i][j] })),
    };
  }

  function consistencyReviews(matrix, answeredPairs, sampleScore, onlySolutions = false) {
    const n = matrix.length, total = n * (n - 1) / 2;
    const pairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (answeredPairs.has(i + "_" + j)) pairs.push({ i, j });
      }
    }
    if (!total || pairs.length / total < 0.6) return [];
    const current = sampleScore ? { CR: sampleScore(matrix) } : analyzeMatrix(matrix);
    if (current.CR == null) return [];
    if (current.CR < 0.1) return [];
    if (!sampleScore) pairs.forEach(pair => {
      pair.deviation = Math.abs(Math.log(matrix[pair.i][pair.j]) -
        Math.log(current.weights[pair.i] / current.weights[pair.j]));
    });
    const values = [1 / 9, 1 / 7, 1 / 5, 1 / 3, 1, 3, 5, 7, 9];
    // Limit simulations to the largest residuals to keep large forms responsive.
    const candidates = sampleScore || onlySolutions ? pairs : pairs.sort((a, b) => b.deviation - a.deviation).slice(0, 8);
    return candidates.map(pair => {
      const trial = matrix.map(row => row.slice());
      let bestCR = current.CR;
      let bestValue = matrix[pair.i][pair.j];
      values.forEach(value => {
        trial[pair.i][pair.j] = value;
        trial[pair.j][pair.i] = 1 / value;
        const trialCR = sampleScore ? sampleScore(trial) : analyzeMatrix(trial).CR;
        if (trialCR != null && trialCR < bestCR) {
          bestCR = trialCR;
          bestValue = value;
        }
      });
      return {
        i: pair.i, j: pair.j,
        currentValue: matrix[pair.i][pair.j], suggestedValue: bestValue,
        deviation: pair.deviation, projectedCR: bestCR,
        improvement: current.CR - bestCR,
      };
    }).filter(pair => onlySolutions ? pair.projectedCR < 0.1 : pair.improvement > 1e-8)
      .sort((a, b) => b.improvement - a.improvement).slice(0, 3);
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
    formatMetric,
    priorityVector,
    consistency,
    analyzeMatrix,
    calculateAHP,
    consistencyReviews,
    consistencyPlan,
    validatedConsistency,
    validatedMetrics,
    synthesize,
    matrixFromUpper,
  };
})(typeof window !== "undefined" ? window : globalThis);
