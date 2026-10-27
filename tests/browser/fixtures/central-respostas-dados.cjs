// Dados simulados com o mesmo contrato da API de comparação colaborativa.
// Usados pelos testes de navegador da Central de respostas e da Mesa de consolidação.
const ESCALA = [1 / 9, 1 / 7, 1 / 5, 1 / 3, 1, 3, 5, 7, 9];
const CRITERIOS = ['Acessibilidade viária', 'Demanda atendida', 'Impacto ambiental', 'Custo de implantação', 'Risco geológico', 'Integração modal'];
const PESOS_BASE = [0.30, 0.22, 0.16, 0.14, 0.10, 0.08];

function semente(valor) {
  let s = valor >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function saaty(razao) {
  return ESCALA.reduce((melhor, v) => Math.abs(Math.log(v / razao)) < Math.abs(Math.log(melhor / razao)) ? v : melhor, 1);
}
function matrizJulgador(seed, ruido, aleatoria) {
  const rnd = semente(seed), n = CRITERIOS.length;
  const m = Array.from({ length: n }, () => Array(n).fill(1));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const v = aleatoria ? ESCALA[Math.floor(rnd() * ESCALA.length)] : saaty((PESOS_BASE[i] / PESOS_BASE[j]) * Math.exp((rnd() - 0.5) * 2 * ruido));
    m[i][j] = v; m[j][i] = 1 / v;
  }
  return m;
}
function analisar(matriz) {
  const n = matriz.length;
  const geo = matriz.map(l => Math.pow(l.reduce((p, v) => p * v, 1), 1 / n));
  const soma = geo.reduce((a, b) => a + b, 0), pesos = geo.map(g => g / soma);
  let lambda = 0;
  for (let i = 0; i < n; i++) lambda += matriz[i].reduce((s, v, j) => s + v * pesos[j], 0) / pesos[i];
  lambda /= n;
  const ic = (lambda - n) / (n - 1), ri = { 3: .58, 4: .9, 5: 1.12, 6: 1.24 }[n] || 0;
  return { pesos, lambda, ic, ri, rc: ri ? ic / ri : 0 };
}

const PERFIS = [
  ['Ana Ribeiro', 'ana.ribeiro@semil.sp.gov.br', 'SEMIL', 11, 0.35, false],
  ['Bruno Tavares', 'bruno.tavares@dersa.sp.gov.br', 'DER-SP', 12, 0.45, false],
  ['Carla Mendes', 'carla.mendes@stm.sp.gov.br', 'STM', 13, 0.5, false],
  ['Diego Faria', 'diego.faria@cetesb.sp.gov.br', 'CETESB', 14, 0.4, false],
  ['Elisa Prado', 'elisa.prado@pli.sp.gov.br', 'PLI-SP', 15, 0.3, false],
  ['Fábio Nogueira', 'fabio.nogueira@exemplo.org', 'Consultoria independente', 16, 0, true],
];

function respostas(ambienteId) {
  const lista = PERFIS.map(([nome, email, instituicao, seed, ruido, aleatoria], i) => {
    const matriz = matrizJulgador(seed, ruido, aleatoria), a = analisar(matriz);
    return {
      id: `${ambienteId}-r${i + 1}`, ambiente_id: ambienteId, nome_completo: nome, email, instituicao,
      matriz_comparacao: matriz, lambda_max: a.lambda, indice_consistencia: a.ic, indice_aleatorio: a.ri, razao_consistencia: a.rc,
      consistente: a.rc <= 0.10, status: 'enviada', estatisticas: {},
      iniciadoEm: `2026-10-${10 + i}T13:00:00Z`, atualizadoEm: `2026-10-${12 + i}T15:00:00Z`, enviadoEm: `2026-10-${12 + i}T15:00:00Z`,
    };
  });
  lista.push({
    id: `${ambienteId}-r7`, ambiente_id: ambienteId, nome_completo: 'Gabriela Lopes', email: 'gabriela.lopes@exemplo.org', instituicao: 'ANTT',
    matriz_comparacao: Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => (i === j ? 1 : 1))),
    consistente: false, status: 'em_preenchimento', estatisticas: {}, iniciadoEm: '2026-10-20T10:00:00Z', atualizadoEm: '2026-10-21T10:00:00Z', enviadoEm: null,
  });
  return lista;
}

function ambiente(id, nome, extra) {
  const convites = [...PERFIS.map(p => ({ nome: p[0], email: p[1] })), { nome: 'Gabriela Lopes', email: 'gabriela.lopes@exemplo.org' }, { nome: 'Heitor Martins', email: 'heitor.martins@exemplo.org' }];
  return Object.assign({
    id, nome, hierarquizacao_id: 'h-' + id, hierarquizacao_codigo: 'HIE-' + id.toUpperCase(), hierarquizacao_nome: 'Hierarquização ' + nome,
    superficie_id: null, criterios: CRITERIOS.map(c => ({ nome: c })), n_criterios: CRITERIOS.length, token: '123456', convites,
    valido_ate: '2026-12-31T23:59:59Z', status: 'ativa', url_publica: '', criadoEm: '2026-10-01T10:00:00Z', atualizadoEm: '2026-10-22T10:00:00Z',
    total_respostas: 6, respostas_em_preenchimento: 1, respostas_consistentes: 5, total_analises: 0, analise_homologada_id: null, consolidacao: null,
  }, extra || {});
}

function criarCenario() {
  const a1 = ambiente('amb1', 'Corredores logísticos 2027');
  const a2 = ambiente('amb2', 'Portos e hidrovias', { total_analises: 1, analise_homologada_id: 'an-amb2', status: 'consolidada' });
  const a3 = ambiente('amb3', 'Rodovias vicinais', { total_respostas: 0, respostas_em_preenchimento: 0, respostas_consistentes: 0 });
  const respostasPor = { amb1: respostas('amb1'), amb2: respostas('amb2'), amb3: [] };
  const enviadas2 = respostasPor.amb2.filter(r => r.status === 'enviada' && r.consistente);
  const n = CRITERIOS.length, matrizOficial = Array.from({ length: n }, () => Array(n).fill(1));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const g = Math.exp(enviadas2.reduce((s, r) => s + Math.log(r.matriz_comparacao[i][j]), 0) / enviadas2.length);
    matrizOficial[i][j] = g; matrizOficial[j][i] = 1 / g;
  }
  const ao = analisar(matrizOficial);
  const oficial = {
    id: 'an-amb2', ambiente_id: 'amb2', codigo: 'ANL-A1B2C3', nome: 'Consolidação oficial', descricao: null, metodo_agregacao: 'aij_media_geometrica',
    rc_maximo: 0.1, excluir_inconsistentes: true, matriz_consolidada: matrizOficial, pesos_consolidados: ao.pesos, lambda_max: ao.lambda,
    indice_consistencia: ao.ic, indice_aleatorio: ao.ri, razao_consistencia: ao.rc, consistente: ao.rc <= 0.1, estatisticas_analise: {}, status: 'homologada',
    respostas_incluidas: enviadas2.length, resposta_ids: enviadas2.map(r => r.id), criadoEm: '2026-10-23T10:00:00Z', atualizadoEm: '2026-10-23T10:00:00Z', homologadoEm: '2026-10-24T10:00:00Z',
  };
  const analisesPor = { amb1: [], amb2: [oficial], amb3: [] };
  return { ambientes: [a1, a2, a3], respostasPor, analisesPor };
}

function espacoAnalitico(cenario, id) {
  const amb = cenario.ambientes.find(a => a.id === id), resp = cenario.respostasPor[id] || [], enviadas = resp.filter(r => r.status === 'enviada');
  const individuais = enviadas.map(r => ({ resposta_id: r.id, respondente: r.nome_completo, email: r.email, pesos: analisar(r.matriz_comparacao).pesos, rc: r.razao_consistencia }));
  return {
    ambiente: amb,
    participacao: { convidados: amb.convites.length, nao_iniciados: Math.max(0, amb.convites.length - resp.length), em_preenchimento: resp.filter(r => r.status === 'em_preenchimento').length, enviadas: enviadas.length, consistentes: enviadas.filter(r => r.consistente).length, inconsistentes: enviadas.filter(r => !r.consistente).length },
    respostas: resp,
    estatisticas: { individuais, por_criterio: [], por_par: [] },
    analises: cenario.analisesPor[id] || [],
    analise_homologada_id: amb.analise_homologada_id,
  };
}

// Instala as rotas simuladas; devolve o registro das gravações para conferência.
async function instalarRotas(page, cenario, opcoes = {}) {
  const gravacoes = [];
  await page.route('**/api/**', route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname, base = '/api/ahp/comparacao-colaborativa';
    if (path === '/api/auth/me') return route.fulfill({ json: { id: 'u', nome: 'Analista', tipo_usuario: 'ANALISTA' } });
    if (path === '/api/auth/session') return route.fulfill({ json: { authenticated: true, user: { id: 'u', nome: 'Analista', tipo_usuario: 'ANALISTA' } } });
    if (req.method() === 'GET' && path === `${base}/ambientes`) return route.fulfill({ json: cenario.ambientes });
    const m = path.match(new RegExp(`^${base}/ambientes/([^/]+)/espaco-analitico$`));
    if (req.method() === 'GET' && m) return route.fulfill({ json: espacoAnalitico(cenario, m[1]) });
    const c = path.match(new RegExp(`^${base}/ambientes/([^/]+)/analises$`));
    if (req.method() === 'POST' && c) {
      const corpo = req.postDataJSON(); gravacoes.push({ metodo: 'POST', path, corpo });
      if (opcoes.falharAoSalvar) return route.fulfill({ status: 422, json: { detail: 'Nenhuma resposta enviada atende aos filtros da análise.' } });
      let resp = (cenario.respostasPor[c[1]] || []).filter(r => r.status === 'enviada' && (corpo.resposta_ids || []).includes(r.id));
      if (corpo.excluir_inconsistentes) resp = resp.filter(r => r.consistente && r.razao_consistencia <= corpo.rc_maximo);
      if (!resp.length) return route.fulfill({ status: 422, json: { detail: 'Nenhuma resposta enviada atende aos filtros da análise.' } });
      const n = CRITERIOS.length, mat = Array.from({ length: n }, () => Array(n).fill(1));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const g = Math.exp(resp.reduce((s, r) => s + Math.log(r.matriz_comparacao[i][j]), 0) / resp.length); mat[i][j] = g; mat[j][i] = 1 / g;
      }
      const a = analisar(mat);
      const nova = { id: 'an-novo-' + (cenario.analisesPor[c[1]].length + 1), ambiente_id: c[1], codigo: 'ANL-NOVO' + (cenario.analisesPor[c[1]].length + 1), nome: corpo.nome, descricao: corpo.descricao || null, metodo_agregacao: 'aij_media_geometrica', rc_maximo: corpo.rc_maximo, excluir_inconsistentes: corpo.excluir_inconsistentes, matriz_consolidada: mat, pesos_consolidados: a.pesos, lambda_max: a.lambda, indice_consistencia: a.ic, indice_aleatorio: a.ri, razao_consistencia: a.rc, consistente: a.rc < corpo.rc_maximo, estatisticas_analise: {}, status: 'calculada', respostas_incluidas: resp.length, resposta_ids: resp.map(r => r.id), criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), homologadoEm: null };
      cenario.analisesPor[c[1]].push(nova);
      return route.fulfill({ status: 201, json: nova });
    }
    const h = path.match(new RegExp(`^${base}/analises/([^/]+)/homologar$`));
    if (req.method() === 'POST' && h) {
      gravacoes.push({ metodo: 'POST', path });
      for (const lista of Object.values(cenario.analisesPor)) for (const an of lista) if (an.id === h[1]) {
        lista.forEach(o => { if (o.status === 'homologada') o.status = 'calculada'; }); an.status = 'homologada'; an.homologadoEm = new Date().toISOString();
        const amb = cenario.ambientes.find(x => x.id === an.ambiente_id); amb.analise_homologada_id = an.id; return route.fulfill({ json: an });
      }
    }
    if (req.method() !== 'GET') { gravacoes.push({ metodo: req.method(), path }); return route.fulfill({ status: 422, json: { detail: 'Gravação não simulada.' } }); }
    return route.fulfill({ json: [] });
  });
  return gravacoes;
}

module.exports = { CRITERIOS, criarCenario, espacoAnalitico, instalarRotas, analisar };
