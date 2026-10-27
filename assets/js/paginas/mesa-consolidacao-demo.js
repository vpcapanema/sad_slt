/* Modo demonstração da Mesa de consolidação (?demo=1).
 * Substitui a API por dados fictícios em memória: nada é lido nem gravado no servidor. */
(function () {
  'use strict';
  const M = window.MesaMotor;
  const CRITERIOS = ['Acessibilidade viária', 'Demanda atendida', 'Impacto ambiental', 'Custo de implantação', 'Risco geológico', 'Integração modal'];
  const PESOS = [0.30, 0.22, 0.16, 0.14, 0.10, 0.08], ESCALA = [1 / 9, 1 / 7, 1 / 5, 1 / 3, 1, 3, 5, 7, 9];
  const semente = valor => { let s = valor >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const saaty = razao => ESCALA.reduce((melhor, v) => Math.abs(Math.log(v / razao)) < Math.abs(Math.log(melhor / razao)) ? v : melhor, 1);
  function matriz(seed, ruido, aleatoria) {
    const rnd = semente(seed), n = CRITERIOS.length, m = Array.from({ length: n }, () => Array(n).fill(1));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const v = aleatoria ? ESCALA[Math.floor(rnd() * ESCALA.length)] : saaty(PESOS[i] / PESOS[j] * Math.exp((rnd() - 0.5) * 2 * ruido));
      m[i][j] = v; m[j][i] = 1 / v;
    }
    return m;
  }
  const PERFIS = [
    ['Ana Ribeiro', 'ana.ribeiro@exemplo.gov.br', 'Secretaria de Meio Ambiente', 11, 0.35, false],
    ['Bruno Tavares', 'bruno.tavares@exemplo.gov.br', 'Departamento de Estradas', 12, 0.45, false],
    ['Carla Mendes', 'carla.mendes@exemplo.gov.br', 'Secretaria de Transportes', 13, 0.5, false],
    ['Diego Faria', 'diego.faria@exemplo.gov.br', 'Agência Ambiental', 14, 0.9, false],
    ['Elisa Prado', 'elisa.prado@exemplo.gov.br', 'Planejamento Logístico', 15, 0.3, false],
    ['Fábio Nogueira', 'fabio.nogueira@exemplo.org', 'Consultoria independente', 16, 0, true],
  ];
  function respostasDe(id, quantas) {
    const lista = PERFIS.slice(0, quantas).map(([nome, email, instituicao, seed, ruido, aleatoria], i) => {
      const m = matriz(seed, ruido, aleatoria), a = M.analisarMatriz(m);
      return { id: id + '-r' + (i + 1), ambiente_id: id, nome_completo: nome, email, instituicao, matriz_comparacao: m, lambda_max: a.lambdaMax, indice_consistencia: a.ic, indice_aleatorio: a.ri, razao_consistencia: a.rc, consistente: a.rc <= 0.10, status: 'enviada', estatisticas: {}, iniciadoEm: '2026-10-' + (10 + i) + 'T13:00:00Z', atualizadoEm: '2026-10-' + (12 + i) + 'T15:00:00Z', enviadoEm: '2026-10-' + (12 + i) + 'T15:00:00Z' };
    });
    if (quantas >= 6) lista.push({ id: id + '-r7', ambiente_id: id, nome_completo: 'Gabriela Lopes', email: 'gabriela.lopes@exemplo.org', instituicao: 'Agência Reguladora', matriz_comparacao: CRITERIOS.map(() => CRITERIOS.map(() => 1)), consistente: false, status: 'em_preenchimento', estatisticas: {}, iniciadoEm: '2026-10-20T10:00:00Z', atualizadoEm: '2026-10-21T10:00:00Z', enviadoEm: null });
    return lista;
  }
  function ambiente(id, nome, extra) {
    const convites = PERFIS.map(p => ({ nome: p[0], email: p[1] })).concat([{ nome: 'Gabriela Lopes', email: 'gabriela.lopes@exemplo.org' }, { nome: 'Heitor Martins', email: 'heitor.martins@exemplo.org' }]);
    return Object.assign({ id, nome, hierarquizacao_id: 'h-' + id, hierarquizacao_codigo: 'HIE-' + id.toUpperCase(), hierarquizacao_nome: 'Hierarquização — ' + nome, superficie_id: null, criterios: CRITERIOS.map(c => ({ nome: c })), n_criterios: CRITERIOS.length, token: '000000', convites, valido_ate: '2026-12-31T23:59:59Z', status: 'ativa', url_publica: '', criadoEm: '2026-10-01T10:00:00Z', atualizadoEm: '2026-10-22T10:00:00Z', total_respostas: 0, respostas_em_preenchimento: 0, respostas_consistentes: 0, total_analises: 0, analise_homologada_id: null, consolidacao: null }, extra || {});
  }
  const banco = { ambientes: [ambiente('demo1', 'Corredores logísticos 2027'), ambiente('demo2', 'Portos e hidrovias', { status: 'consolidada' }), ambiente('demo3', 'Rodovias vicinais')], respostas: {}, analises: { demo1: [], demo2: [], demo3: [] } };
  banco.respostas = { demo1: respostasDe('demo1', 6), demo2: respostasDe('demo2', 6), demo3: [] };

  function resumo(amb) {
    const resp = banco.respostas[amb.id], enviadas = resp.filter(r => r.status === 'enviada');
    Object.assign(amb, { total_respostas: enviadas.length, respostas_em_preenchimento: resp.filter(r => r.status === 'em_preenchimento').length, respostas_consistentes: enviadas.filter(r => r.consistente).length, total_analises: banco.analises[amb.id].length });
  }
  function gravar(ambienteId, corpo) {
    const amb = banco.ambientes.find(a => a.id === ambienteId);
    let candidatas = banco.respostas[ambienteId].filter(r => r.status === 'enviada');
    if (corpo.resposta_ids) candidatas = candidatas.filter(r => corpo.resposta_ids.includes(r.id));
    if (corpo.excluir_inconsistentes) candidatas = candidatas.filter(r => M.elegivel(r, corpo.rc_maximo));
    if (!candidatas.length) { const e = new Error('Nenhuma resposta enviada atende aos filtros da análise.'); e.status = 422; throw e; }
    const m = M.agregar(candidatas.map(r => r.matriz_comparacao), corpo.metodo_agregacao), a = M.analisarMatriz(m), n = banco.analises[ambienteId].length + 1;
    const analise = { id: 'an-' + ambienteId + '-' + n, ambiente_id: ambienteId, codigo: 'ANL-DEMO' + String(n).padStart(2, '0'), nome: corpo.nome, descricao: corpo.descricao || null, metodo_agregacao: { geometrica: 'aij_media_geometrica', aritmetica: 'aij_media_aritmetica', mediana: 'aij_mediana' }[corpo.metodo_agregacao], rc_maximo: corpo.rc_maximo, excluir_inconsistentes: corpo.excluir_inconsistentes, matriz_consolidada: m, pesos_consolidados: a.pesos, lambda_max: a.lambdaMax, indice_consistencia: a.ic, indice_aleatorio: a.ri, razao_consistencia: a.rc, consistente: M.consistenteNoLimite(a.rc, corpo.rc_maximo, false), estatisticas_analise: {}, status: 'calculada', respostas_incluidas: candidatas.length, resposta_ids: candidatas.map(r => r.id), criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), homologadoEm: null };
    banco.analises[ambienteId].push(analise); resumo(amb);
    return analise;
  }
  // Uma análise homologada de partida em "Portos e hidrovias".
  (function () {
    const a = gravar('demo2', { nome: 'Consolidação oficial', metodo_agregacao: 'geometrica', rc_maximo: 0.10, excluir_inconsistentes: true, resposta_ids: banco.respostas.demo2.filter(r => r.status === 'enviada').map(r => r.id) });
    a.status = 'homologada'; a.homologadoEm = new Date().toISOString(); banco.ambientes[1].analise_homologada_id = a.id;
  })();
  banco.ambientes.forEach(resumo);

  const pausa = () => new Promise(resolve => setTimeout(resolve, 250));
  const copia = valor => JSON.parse(JSON.stringify(valor));
  window.MesaDemo = {
    async api(url, opcoes) {
      await pausa();
      const metodo = ((opcoes && opcoes.method) || 'GET').toUpperCase(), caminho = url.replace('/api/ahp/comparacao-colaborativa', '');
      if (metodo === 'GET' && caminho === '/ambientes') return copia(banco.ambientes);
      let m = caminho.match(/^\/ambientes\/([^/]+)\/espaco-analitico$/);
      if (metodo === 'GET' && m) {
        const amb = banco.ambientes.find(a => a.id === decodeURIComponent(m[1])), resp = banco.respostas[amb.id], enviadas = resp.filter(r => r.status === 'enviada');
        return copia({ ambiente: amb, participacao: { convidados: amb.convites.length, nao_iniciados: Math.max(0, amb.convites.length - resp.length), em_preenchimento: resp.filter(r => r.status === 'em_preenchimento').length, enviadas: enviadas.length, consistentes: enviadas.filter(r => r.consistente).length, inconsistentes: enviadas.filter(r => !r.consistente).length }, respostas: resp, estatisticas: { individuais: [], por_criterio: [], por_par: [] }, analises: banco.analises[amb.id], analise_homologada_id: amb.analise_homologada_id });
      }
      m = caminho.match(/^\/ambientes\/([^/]+)\/analises$/);
      if (metodo === 'POST' && m) return copia(gravar(decodeURIComponent(m[1]), JSON.parse(opcoes.body)));
      m = caminho.match(/^\/analises\/([^/]+)\/homologar$/);
      if (metodo === 'POST' && m) {
        const id = decodeURIComponent(m[1]);
        for (const lista of Object.values(banco.analises)) for (const a of lista) if (a.id === id) {
          if (!a.consistente) { const e = new Error('Somente uma análise consistente pode ser homologada.'); e.status = 422; throw e; }
          lista.forEach(o => { if (o.status === 'homologada') o.status = 'calculada'; });
          a.status = 'homologada'; a.homologadoEm = new Date().toISOString();
          banco.ambientes.find(x => x.id === a.ambiente_id).analise_homologada_id = id; return copia(a);
        }
      }
      const erro = new Error('Operação não disponível no modo demonstração.'); erro.status = 404; throw erro;
    },
  };
})();
