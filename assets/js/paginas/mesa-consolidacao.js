/* Mesa de consolidação das respostas — interface.
 * Uma única superfície: escolher o julgamento, definir quem entra e com qual regra,
 * ler o resultado em tempo real e gravar/homologar. O cálculo vem de MesaMotor. */
(function () {
  'use strict';

  const M = window.MesaMotor;
  const BASE = '/api/ahp/comparacao-colaborativa';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const modoDemo = params.has('demo');
  const esc = valor => String(valor == null ? '' : valor).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (valor, casas = 3) => valor == null || !Number.isFinite(Number(valor)) ? '—' : Number(valor).toFixed(casas);
  const diferencaPp =  valor => (Math.abs(valor) * 100 < 0.05 ? '' : valor > 0 ? '+' : '−') + (Math.abs(valor) * 100).toFixed(1) + ' p.p.';
  const data = valor => valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';
  const dataHora = valor => valor ? new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).replace(',', '') : '';
  const SITUACAO_JULGAMENTO = { ativa: 'Aberto', consolidada: 'Consolidado', encerrada: 'Encerrado' };

  async function api(url, opcoes) {
    if (modoDemo) return window.MesaDemo.api(url, opcoes);
    const resposta = await fetch(url, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opcoes || {}));
    const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);
    if (!resposta.ok) {
      const metodo = (opcoes && opcoes.method) || 'GET';
      const erro = new Error(window.SicardApiErro
        ? window.SicardApiErro.formatar(corpo, { status: resposta.status, method: metodo, url })
        : (Array.isArray(corpo && corpo.detail) ? corpo.detail.map(i => i.msg).join('; ') : (corpo && corpo.detail && corpo.detail.message) || (corpo && corpo.detail) || 'Não foi possível concluir a operação (HTTP ' + resposta.status + ').'));
      Object.assign(erro, { status: resposta.status, body: corpo, method: metodo, url });
      throw erro;
    }
    return corpo;
  }

  /* ---------- Tabela padrão (filtro, seleção, controles, paginação e contador) ---------- */
  function montarTabela(cfg) {
    const { id, host, colunas, rotulo } = cfg, tamanhoPagina = cfg.tamanhoPagina || 15, seletor = cfg.seletor || null;
    const estado = { linhas: [], pagina: 1, selecionados: new Set(), filtradas: [] };
    const idLinha = cfg.idLinha || (linha => String(linha.id));
    const bloqueada = cfg.bloqueada || (() => false);
    const embrulho = document.createElement('div');
    embrulho.className = 'standard-table-section ami-report-table mesa-tabela';
    embrulho.innerHTML =
      '<div class="ami-filtered-table">' +
      '<div class="admin-filter-bar" role="search" aria-label="Filtrar ' + esc(rotulo) + '"><span class="admin-filter-label">Filtro:</span>' +
      '<select id="' + id + '-coluna" aria-label="Coluna do filtro"><option value="">— Coluna —</option></select>' +
      '<select id="' + id + '-valor" aria-label="Valor do filtro" disabled><option value="">— selecione a coluna —</option></select>' +
      '<button type="button" class="admin-icon-btn admin-filter-inv" id="' + id + '-inverter" aria-label="Inverter seleção" aria-pressed="false" title="Inverter seleção"><i class="fa-solid fa-right-left" aria-hidden="true"></i></button>' +
      '<button type="button" class="admin-icon-btn" id="' + id + '-limpar" aria-label="Limpar" title="Limpar filtros"><i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i></button></div>' +
      '<div class="hier-table-shell ami-table-shell"><table class="admin-table hier-register-table ami-table--database mesa-table" aria-label="' + esc(rotulo) + '"><thead><tr></tr></thead><tbody></tbody></table></div></div>' +
      '<div class="admin-bulk-actions ami-table-actions standard-table-actions" role="group" aria-label="Controles de ' + esc(rotulo) + '"></div>' +
      '<div class="admin-table-footer"><nav class="admin-pagination ami-pagination" id="' + id + '-paginacao" aria-label="Paginação de ' + esc(rotulo) + '"></nav><p class="admin-table-summary" id="' + id + '-resumo" aria-live="polite"></p></div>';
    const tabela = embrulho.querySelector('table'), corpo = tabela.tBodies[0], cabecalho = tabela.tHead.rows[0];
    const filtroColuna = embrulho.querySelector('#' + id + '-coluna'), filtroValor = embrulho.querySelector('#' + id + '-valor');
    const barra = embrulho.querySelector('.standard-table-actions');

    if (seletor) {
      const th = document.createElement('th'); th.className = 'col-select'; th.scope = 'col';
      th.innerHTML = '<input type="checkbox" aria-label="Selecionar todos os registros filtrados"' + (seletor === 'unico' ? ' disabled title="Seleção única"' : '') + '>';
      cabecalho.append(th);
    }
    colunas.forEach((c, i) => {
      const th = document.createElement('th'); th.scope = 'col'; th.textContent = c.titulo; cabecalho.append(th);
      if (c.filtravel !== false) filtroColuna.add(new Option(c.titulo, String(i)));
    });
    const marcaTodos = cabecalho.querySelector('input');
    const textoDe = (linha, i) => String(colunas[i].texto(linha) ?? '');
    const ordenar = SLTTable.sorting(tabela, () => (seletor ? [null] : []).concat(colunas.map(c => c.ordenavel === false ? null : (c.ordem || c.texto))), () => { estado.pagina = 1; desenhar(); }, () => true);

    function atualizarOpcoes() {
      const i = Number(filtroColuna.value);
      SLTTable.values(filtroValor, estado.linhas, linha => textoDe(linha, i));
      filtroValor.disabled = filtroColuna.value === '';
    }
    const controles = [];
    (cfg.controles || []).forEach(c => controles.push(c));
    if (cfg.exportar !== false && seletor === 'multi') controles.push({ id: 'exportar', icone: 'fa-file-csv', classe: 'save', titulo: 'Exportar registros selecionados', ao: exportar, habilitado: ids => ids.length > 0 });
    if (seletor) controles.push({ id: 'limpar', icone: 'fa-xmark', classe: 'cancel', titulo: 'Limpar seleção', ao: () => definirSelecao([], true), habilitado: ids => ids.length > 0 });
    controles.forEach(c => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'admin-icon-btn ' + (c.classe || ''); b.id = id + '-ctl-' + c.id;
      b.title = c.titulo; b.setAttribute('aria-label', c.titulo); b.innerHTML = '<i class="fa-solid ' + c.icone + '" aria-hidden="true"></i>';
      b.onclick = () => c.ao(Array.from(estado.selecionados), estado.linhas.filter(l => estado.selecionados.has(idLinha(l))));
      c.elemento = b; barra.append(b);
    });
    if (!controles.length) barra.remove();

    function exportar() {
      const aspas = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
      const escolhidas = estado.linhas.filter(l => estado.selecionados.has(idLinha(l)));
      const csv = [colunas.map(c => c.titulo)].concat(escolhidas.map(l => colunas.map((c, i) => textoDe(l, i)))).map(l => l.map(aspas).join(';')).join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })); a.download = id + '.csv'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    function linhaHtml(linha) {
      const ident = idLinha(linha), marcada = estado.selecionados.has(ident), classes = [cfg.classeLinha ? cfg.classeLinha(linha) : '', marcada ? 'is-selected' : ''].filter(Boolean).join(' ');
      const caixa = seletor ? '<td class="col-select"><input type="checkbox" data-id="' + esc(ident) + '"' + (marcada ? ' checked' : '') + (bloqueada(linha) ? ' disabled' : '') + ' aria-label="Selecionar registro"></td>' : '';
      return '<tr' + (classes ? ' class="' + classes + '"' : '') + '>' + caixa + colunas.map((c, i) => '<td' + (c.classe ? ' class="' + c.classe(linha) + '"' : '') + '>' + (c.html ? c.html(linha) : esc(textoDe(linha, i))) + '</td>').join('') + '</tr>';
    }
    function desenhar() {
      const i = Number(filtroColuna.value), ativo = filtroColuna.value !== '' && Boolean(filtroValor.value);
      const alvo = filtroValor.value === '__empty__' ? '' : filtroValor.value;
      estado.filtradas = ordenar(estado.linhas.filter(l => SLTTable.matches(id, textoDe(l, i) === alvo, ativo)));
      const resultado = SLTTable.paginate(id + '-paginacao', estado.filtradas, estado.pagina, p => { estado.pagina = p; desenhar(); }, tamanhoPagina);
      estado.pagina = resultado.page;
      corpo.innerHTML = resultado.rows.map(linhaHtml).join('') || '<tr><td colspan="' + (colunas.length + (seletor ? 1 : 0)) + '" class="ami-empty">' + esc(cfg.vazio || 'Nenhum registro encontrado.') + '</td></tr>';
      if (marcaTodos && seletor === 'multi') {
        const livres = estado.filtradas.filter(l => !bloqueada(l)), marcadas = livres.filter(l => estado.selecionados.has(idLinha(l))).length;
        marcaTodos.disabled = !livres.length; marcaTodos.checked = marcadas > 0 && marcadas === livres.length; marcaTodos.indeterminate = marcadas > 0 && marcadas < livres.length;
      }
      const ids = Array.from(estado.selecionados);
      controles.forEach(c => { c.elemento.disabled = !(c.habilitado ? c.habilitado(ids, estado.linhas.filter(l => estado.selecionados.has(idLinha(l)))) : true); });
      SLTTable.summary(id + '-resumo', ids.length, resultado.rows.length, estado.linhas.length);
    }
    function avisar() { if (cfg.aoMudar) cfg.aoMudar(Array.from(estado.selecionados)); }
    function definirSelecao(ids, notificar) {
      estado.selecionados = new Set(ids.map(String));
      if (notificar) avisar();
      desenhar();
    }
    corpo.addEventListener('change', evento => {
      const caixa = evento.target.closest('input[data-id]'); if (!caixa) return;
      if (seletor === 'unico') estado.selecionados = new Set(caixa.checked ? [caixa.dataset.id] : []);
      else if (caixa.checked) estado.selecionados.add(caixa.dataset.id); else estado.selecionados.delete(caixa.dataset.id);
      avisar(); desenhar();
    });
    if (marcaTodos && seletor === 'multi') marcaTodos.onchange = () => {
      estado.filtradas.filter(l => !bloqueada(l)).forEach(l => marcaTodos.checked ? estado.selecionados.add(idLinha(l)) : estado.selecionados.delete(idLinha(l)));
      avisar(); desenhar();
    };
    filtroColuna.onchange = () => { filtroValor.value = ''; atualizarOpcoes(); estado.pagina = 1; desenhar(); };
    filtroValor.onchange = () => { estado.pagina = 1; desenhar(); };
    host.replaceChildren(embrulho);
    SLTTable.bindFilter(id, () => { estado.pagina = 1; desenhar(); }, () => { filtroColuna.value = ''; filtroValor.value = ''; atualizarOpcoes(); });
    return {
      atualizar(linhas) {
        estado.linhas = linhas;
        const validos = new Set(linhas.map(idLinha));
        estado.selecionados.forEach(ident => { if (!validos.has(ident)) estado.selecionados.delete(ident); });
        atualizarOpcoes(); desenhar();
      },
      selecionados: () => Array.from(estado.selecionados),
      definirSelecao,
      linhas: () => estado.linhas,
      elemento: embrulho,
    };
  }

  /* ---------- Estado da página ---------- */
  const S = {
    julgamentos: [], selecionado: null, espaco: null, enviadas: [], marcadas: new Set(),
    metodo: 'geometrica', rcMaximo: 0.10, excluir: true, resultado: null, pedido: 0, salvando: false,
    tabelas: {}, aba: 'pesos', origem: '',
  };
  const homologada = () => S.espaco && (S.espaco.analises || []).find(a => a.id === S.espaco.analise_homologada_id || a.status === 'homologada') || null;
  const superficie = () => Boolean(S.espaco && S.espaco.ambiente && S.espaco.ambiente.superficie_id);
  const metodoDe = analise => M.METODO_DA_API[analise.metodo_agregacao] || analise.metodo_agregacao || 'geometrica';
  const primeiroNome = nome => String(nome || '').trim().split(/\s+/)[0] || '—';

  function feedback(mensagem, erro) {
    const no = $('mesa-feedback'); no.textContent = mensagem || ''; no.classList.toggle('is-error', Boolean(erro));
    if (mensagem && erro) Notify.error('Mesa de consolidação', mensagem);
  }

  /* ---------- 1. Julgamentos ---------- */
  function razao(parte, total) { return total > 0 ? parte + '/' + total + ' (' + Math.round(parte / total * 100) + '%)' : parte + '/0'; }
  function razaoHtml(parte, total) { return '<span class="ami-ratio"><strong>' + parte + '/' + total + '</strong><small>' + (total > 0 ? Math.round(parte / total * 100) : 0) + '%</small></span>'; }
  const convidados = j => (j.convites || []).length;
  function montarTabelaJulgamentos() {
    S.tabelas.julgamentos = montarTabela({
      id: 'mesa-jul', host: $('mesa-tabela-julgamentos'), rotulo: 'julgamentos', seletor: 'unico', exportar: false, vazio: 'Nenhum julgamento encontrado.',
      aoMudar: ids => { if (ids[0]) abrirJulgamento(ids[0]); else fecharMesa(); },
      controles: [{ id: 'atualizar', icone: 'fa-arrows-rotate', titulo: 'Atualizar lista de julgamentos', ao: () => carregarJulgamentos(true) }],
      colunas: [
        { titulo: 'Julgamento', texto: j => j.nome || j.hierarquizacao_nome || j.id },
        { titulo: 'Hierarquização', texto: j => j.hierarquizacao_nome || j.hierarquizacao_codigo || '' },
        { titulo: 'Situação', texto: j => SITUACAO_JULGAMENTO[j.status] || j.status },
        { titulo: 'Enviadas', texto: j => razao(j.total_respostas || 0, convidados(j)), ordem: j => (j.total_respostas || 0) / Math.max(1, convidados(j)), html: j => razaoHtml(j.total_respostas || 0, convidados(j)) },
        { titulo: 'Em preenchimento', texto: j => razao(j.respostas_em_preenchimento || 0, convidados(j)), ordem: j => (j.respostas_em_preenchimento || 0) / Math.max(1, convidados(j)), html: j => razaoHtml(j.respostas_em_preenchimento || 0, convidados(j)) },
        { titulo: 'Consistentes', texto: j => razao(j.respostas_consistentes || 0, convidados(j)), ordem: j => (j.respostas_consistentes || 0) / Math.max(1, convidados(j)), html: j => razaoHtml(j.respostas_consistentes || 0, convidados(j)) },
        { titulo: 'Prazo', texto: j => data(j.valido_ate) },
        { titulo: 'Análises gravadas', texto: j => String(j.total_analises || 0) },
        { titulo: 'Pesos homologados', texto: j => j.analise_homologada_id ? 'Disponível' : 'Pendente', classe: j => j.analise_homologada_id ? 'mesa-ok' : 'mesa-pendente' },
        { titulo: 'Atualizado em', texto: j => data(j.atualizadoEm) },
      ],
    });
  }
  async function carregarJulgamentos(manual) {
    try {
      S.julgamentos = await api(BASE + '/ambientes');
      S.tabelas.julgamentos.atualizar(S.julgamentos);
      if (manual) feedback('Lista atualizada: ' + S.julgamentos.length + (S.julgamentos.length === 1 ? ' julgamento.' : ' julgamentos.'));
      return true;
    } catch (erro) {
      feedback(erro.message, true);
      return false;
    }
  }

  /* ---------- 2. Abrir e fechar a mesa ---------- */
  function fecharMesa() {
    S.pedido++; S.selecionado = null; S.espaco = null; S.resultado = null;
    $('mesa').classList.add('is-hidden');
    history.replaceState(null, '', location.pathname + (modoDemo ? '?demo=1' : ''));
  }
  async function abrirJulgamento(ambienteId) {
    if (S.salvando) return;
    const pedido = ++S.pedido;
    feedback('Carregando respostas…');
    $('mesa').inert = true;
    try {
      const espaco = await api(BASE + '/ambientes/' + encodeURIComponent(ambienteId) + '/espaco-analitico');
      if (pedido !== S.pedido) return;
      S.selecionado = ambienteId; S.espaco = espaco; S.enviadas = M.enviadas(espaco.respostas);
      const params2 = new URLSearchParams(modoDemo ? { demo: 1 } : {}); params2.set('julgamento', ambienteId);
      history.replaceState(null, '', location.pathname + '?' + params2.toString());
      iniciarMesa();
      feedback('');
    } catch (erro) {
      if (pedido === S.pedido) { feedback(erro.message, true); S.tabelas.julgamentos.definirSelecao([]); $('mesa').classList.add('is-hidden'); }
    } finally { if (pedido === S.pedido) $('mesa').inert = false; }
  }
  async function recarregarEspaco() {
    const espaco = await api(BASE + '/ambientes/' + encodeURIComponent(S.selecionado) + '/espaco-analitico');
    S.espaco = espaco; S.enviadas = M.enviadas(espaco.respostas);
    montarTabelaAnalises(); atualizarAnalises(); resumoParticipacao(); recalcular();
    const idx = S.julgamentos.findIndex(j => j.id === S.selecionado);
    if (idx >= 0) {
      const lista = await api(BASE + '/ambientes'); S.julgamentos = lista; S.tabelas.julgamentos.atualizar(lista);
    }
  }

  function aplicarConfiguracao(analise) {
    S.metodo = metodoDe(analise); S.rcMaximo = Number(analise.rc_maximo ?? 0.10); S.excluir = Boolean(analise.excluir_inconsistentes);
    const ids = new Set((analise.resposta_ids || []).map(String));
    S.tabelas.respostas.definirSelecao(S.enviadas.filter(r => ids.has(String(r.id))).map(r => String(r.id)), false);
    $('mesa-metodo').value = S.metodo; $('mesa-rc').value = S.rcMaximo; $('mesa-excluir').checked = S.excluir;
  }

  function iniciarMesa() {
    S.resultado = null;
    const a = S.espaco.ambiente;
    $('mesa-titulo-nome').textContent = a.nome || a.hierarquizacao_nome || a.id;
    $('mesa-contexto').textContent = (a.hierarquizacao_nome || a.hierarquizacao_codigo || '—') + ' · ' + (a.n_criterios || (a.criterios || []).length) + ' critérios · prazo das respostas: ' + (data(a.valido_ate) || '—');
    $('mesa-demo').hidden = !modoDemo;
    montarTabelaRespostas(); montarTabelaPesos(); montarTabelaPares(); montarTabelaMatriz(); montarTabelaAnalises();
    resumoParticipacao();
    const oficial = homologada();
    S.metodo = 'geometrica'; S.rcMaximo = 0.10; S.excluir = true;
    S.tabelas.respostas.atualizar(linhasRespostas());
    S.tabelas.respostas.definirSelecao(S.enviadas.map(r => String(r.id)), false);
    if (oficial) {
      aplicarConfiguracao(oficial);
      S.origem = 'A mesa partiu da configuração da análise homologada “' + oficial.nome + '” (' + oficial.codigo + '): a prévia abaixo reproduz o resultado oficial. Altere as regras ou as respostas para simular alternativas.';
      $('mesa-nome').value = oficial.nome + ' — revisão';
    } else {
      S.origem = S.enviadas.length ? 'Nenhuma análise homologada: a mesa partiu de todas as respostas enviadas, com média geométrica.' : 'Ainda não há respostas enviadas neste julgamento.';
      $('mesa-nome').value = 'Consolidação de ' + new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }
    $('mesa-metodo').value = S.metodo; $('mesa-rc').value = S.rcMaximo; $('mesa-excluir').checked = S.excluir;
    $('mesa-origem').textContent = S.origem;
    selecionarAba('pesos');
    $('mesa').classList.remove('is-hidden');
    recalcular();
    $('mesa').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resumoParticipacao() {
    const p = S.espaco.participacao || {};
    const itens = [['Convidados', p.convidados], ['Enviadas', p.enviadas], ['Em preenchimento', p.em_preenchimento], ['Não iniciadas', p.nao_iniciados], ['Consistentes', p.consistentes], ['Inconsistentes', p.inconsistentes]];
    $('mesa-participacao').innerHTML = itens.map(([rotulo, valor]) => '<span><strong>' + (valor ?? 0) + '</strong> ' + rotulo.toLowerCase() + '</span>').join('');
    const oficial = homologada();
    $('mesa-situacao').innerHTML = oficial
      ? '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Pesos homologados: ' + esc(oficial.nome) + ' · ' + esc(oficial.codigo)
      : '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> Sem pesos homologados';
    $('mesa-situacao').className = 'mesa-selo ' + (oficial ? 'is-ok' : 'is-pendente');
  }

  /* ---------- 3. Respostas e regras ---------- */
  function julgadores() {
    const respostas = S.espaco.respostas || [], lista = [];
    (S.espaco.ambiente.convites || []).forEach(c => {
      const email = typeof c === 'string' ? c : c.email, nomeConvite = typeof c === 'string' ? '' : c.nome;
      const r = respostas.find(x => x.email === email) || null;
      lista.push({ email, nome: (r && r.nome_completo) || nomeConvite || '', resposta: r });
    });
    respostas.forEach(r => { if (!lista.some(l => l.email === r.email)) lista.push({ email: r.email, nome: r.nome_completo, resposta: r }); });
    const ordem = S.enviadas.map(r => String(r.id));
    return lista.map(l => {
      const r = l.resposta, indice = r ? ordem.indexOf(String(r.id)) : -1;
      return Object.assign(l, {
        id: r ? String(r.id) : 'convite:' + l.email, indice, enviada: indice >= 0,
        situacao: !r ? 'Não iniciada' : r.status === 'enviada' ? (r.consistente ? 'Consistente' : 'Inconsistente') : 'Em preenchimento',
      });
    });
  }
  function linhasRespostas() { return julgadores(); }
  const sinal = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(3);
  function montarTabelaRespostas() {
    S.tabelas.respostas = montarTabela({
      id: 'mesa-resp', host: $('mesa-tabela-respostas'), rotulo: 'respostas dos julgadores', seletor: 'multi', bloqueada: l => !l.enviada, vazio: 'Nenhum julgador convidado.',
      classeLinha: l => l.resposta ? '' : 'is-sem-resposta',
      aoMudar: ids => { S.marcadas = new Set(ids); recalcular(); },
      colunas: [
        { titulo: 'Julgador', texto: l => (l.indice >= 0 ? 'J' + (l.indice + 1) + ' ' : '') + (l.nome || '—'), classe: () => 'mesa-esq', html: l => (l.indice >= 0 ? '<strong>J' + (l.indice + 1) + '</strong> ' : '') + esc(l.nome || '—') },
        { titulo: 'E-mail', texto: l => l.email, classe: () => 'mesa-esq' },
        { titulo: 'Instituição', texto: l => (l.resposta && l.resposta.instituicao) || '', classe: () => 'mesa-esq' },
        { titulo: 'Situação', texto: l => l.situacao },
        { titulo: 'RC individual', texto: l => l.enviada ? num(l.resposta.razao_consistencia) : '' },
        { titulo: 'No cálculo', texto: l => situacaoNoCalculo(l).texto, classe: l => 'mesa-estado is-' + situacaoNoCalculo(l).estado },
        { titulo: 'RC do grupo sem ele', texto: l => { const i = impactoDe(l); return i && i.sem ? num(i.sem.rc) + ' (' + sinal(i.sem.deltaRc) + ')' : ''; }, ordem: l => { const i = impactoDe(l); return i && i.sem ? i.sem.rc : ''; } },
        { titulo: 'Pares destoantes', texto: l => { const i = impactoDe(l); return i ? String(i.destoantes) : ''; } },
        { titulo: 'Enviado em', texto: l => l.resposta && l.resposta.enviadoEm ? data(l.resposta.enviadoEm) : '' },
      ],
    });
  }
  function situacaoNoCalculo(l) {
    if (!l.enviada) return { estado: 'nenhum', texto: l.resposta ? 'Aguardando envio' : '—' };
    return (S.resultado && S.resultado.situacoes.get(l.id)) || { estado: 'desmarcada', texto: 'Fora: desmarcada' };
  }
  function impactoDe(l) { return S.resultado && S.resultado.impacto ? S.resultado.impacto.get(l.id) : null; }

  /* ---------- 4. Resultado ---------- */
  function hoverLabel(r, i) { return 'J' + (i + 1) + ' ' + primeiroNome(r.nome_completo); }
  function montarTabelaPesos() {
    S.tabelas.pesos = montarTabela({
      id: 'mesa-pesos', host: $('mesa-tabela-pesos'), rotulo: 'pesos dos critérios', seletor: 'multi', idLinha: l => String(l.nome), vazio: 'Marque ao menos uma resposta enviada.',
      colunas: [
        { titulo: 'Posição', texto: l => String(l.posicao) },
        { titulo: 'Critério', texto: l => l.nome, classe: () => 'mesa-esq' },
        { titulo: 'Peso consolidado', texto: l => num(l.peso), ordem: l => l.peso, html: l => '<strong>' + num(l.peso) + '</strong>' },
        { titulo: 'Participação', texto: l => (l.peso * 100).toFixed(1) + '%', ordem: l => l.peso, classe: () => 'mesa-celula-barra', html: l => '<span class="mesa-barra-peso"><span style="width:' + Math.max(1, l.peso * 100).toFixed(1) + '%"></span></span><em>' + (l.peso * 100).toFixed(1) + '%</em>' },
        { titulo: 'Menor peso individual', texto: l => num(l.minimo) },
        { titulo: 'Maior peso individual', texto: l => num(l.maximo) },
        { titulo: 'Variação entre julgadores', texto: l => (l.cv * 100).toFixed(0) + '%', ordem: l => l.cv },
        { titulo: 'Peso homologado', texto: l => l.homologado == null ? '—' : num(l.homologado), ordem: l => l.homologado ?? '' },
        { titulo: 'Diferença para o homologado', texto: l => l.homologado == null ? '—' : diferencaPp(l.peso - l.homologado), ordem: l => l.homologado == null ? '' : l.peso - l.homologado },
      ],
    });
  }
  function montarTabelaPares() {
    const julgs = S.enviadas;
    const colunas = [{ titulo: 'Par de critérios', texto: p => p.rotulo, classe: () => 'mesa-esq' }];
    julgs.forEach((r, k) => {
      colunas.push({
        titulo: hoverLabel(r, k), texto: p => M.rotuloSaaty(p.valores.get(String(r.id)).valor), ordem: p => p.valores.get(String(r.id)).valor,
        classe: () => 'ami-stats-table__valor mesa-indice' + (S.resultado && S.resultado.situacoes.get(String(r.id)).estado !== 'incluida' ? ' is-fora' : ''),
        html: p => {
          const v = p.valores.get(String(r.id)), intensidade = Math.min(1, Math.abs(v.afastamento) / Math.log(3));
          return '<span class="mesa-indice__valor" style="--ami-deviation-color:rgba(17,101,147,' + (intensidade * 0.8).toFixed(3) + ')" title="' + esc(r.nome_completo + ': ' + M.rotuloSaaty(v.valor) + ' · consolidado do par ' + num(p.consolidado)) + '">' + M.rotuloSaaty(v.valor) + '</span>';
        },
      });
    });
    colunas.push(
      { titulo: 'Consolidado do par', texto: p => num(p.consolidado), ordem: p => p.consolidado, html: p => '<strong>' + num(p.consolidado) + '</strong>' },
      { titulo: 'Dispersão (×)', texto: p => Math.exp(p.dispersao).toFixed(2), ordem: p => p.dispersao },
      { titulo: 'Mais destoante', texto: p => p.destoante ? rotuloJulgador(p.destoante.id) + ' (' + M.rotuloSaaty(p.destoante.valor) + ')' : '—', classe: p => p.destoante ? 'mesa-destoante' : '' },
    );
    S.tabelas.pares = montarTabela({ id: 'mesa-pares', host: $('mesa-tabela-pares'), rotulo: 'índices por par de critérios', seletor: 'multi', idLinha: p => p.i + '-' + p.j, colunas, vazio: 'Marque ao menos uma resposta enviada.' });
  }
  function rotuloJulgador(id) { const k = S.enviadas.findIndex(r => String(r.id) === String(id)); return k < 0 ? '—' : hoverLabel(S.enviadas[k], k); }
  function montarTabelaMatriz() {
    const nomes = (S.espaco.ambiente.criterios || []).map(M.nomeCriterio);
    const colunas = [{ titulo: 'Critério', texto: l => l.nome, classe: () => 'mesa-esq' }].concat(nomes.map((nome, j) => ({
      titulo: nome, texto: l => num(l.valores[j]), ordem: l => l.valores[j], classe: l => l.indice === j ? 'mesa-diagonal' : '',
    })));
    S.tabelas.matriz = montarTabela({ id: 'mesa-matriz', host: $('mesa-tabela-matriz'), rotulo: 'matriz consolidada de comparação pareada', seletor: 'multi', idLinha: l => 'c' + l.indice, colunas, vazio: 'Marque ao menos uma resposta enviada.' });
  }

  function recalcular() {
    if (!S.espaco) return;
    S.marcadas = new Set(S.tabelas.respostas.selecionados());
    S.rcMaximo = Number($('mesa-rc').value);
    if (!Number.isFinite(S.rcMaximo) || S.rcMaximo <= 0 || S.rcMaximo > 1) S.rcMaximo = 0.10;
    S.metodo = $('mesa-metodo').value; S.excluir = $('mesa-excluir').checked;
    S.resultado = M.consolidar(S.enviadas, S.espaco.ambiente.criterios || [], { ids: S.marcadas, metodo: S.metodo, rcMaximo: S.rcMaximo, excluirInconsistentes: S.excluir, superficie: superficie() });
    S.tabelas.respostas.atualizar(linhasRespostas());
    desenharResultado();
    atualizarAnalises();
  }

  function desenharResultado() {
    const r = S.resultado, total = S.enviadas.length;
    const barra = $('mesa-barra');
    barra.classList.remove('is-ok', 'is-nok', 'is-vazio');
    $('mesa-k-incluidas').textContent = r.incluidas.length + ' de ' + total;
    if (r.vazio) {
      barra.classList.add('is-vazio');
      ['lambda', 'ic', 'ia', 'rc'].forEach(k => { $('mesa-k-' + k).textContent = '—'; });
      $('mesa-veredito').textContent = total ? 'Marque ao menos uma resposta enviada (e consistente, se a exclusão estiver ativa) para ver o resultado.' : 'Este julgamento ainda não recebeu respostas enviadas.';
      ['pesos', 'pares', 'matriz'].forEach(nome => S.tabelas[nome].atualizar([]));
      $('mesa-salvar').disabled = true; $('mesa-exportar').disabled = !total;
      return;
    }
    const a = r.analise;
    $('mesa-k-lambda').textContent = num(a.lambdaMax); $('mesa-k-ic').textContent = num(a.ic); $('mesa-k-ia').textContent = num(a.ri); $('mesa-k-rc').textContent = num(a.rc);
    barra.classList.add(r.consistente ? 'is-ok' : 'is-nok');
    $('mesa-veredito').textContent = r.consistente
      ? 'RC ' + num(a.rc) + ' dentro do limite de ' + num(S.rcMaximo) + ': os julgamentos se sustentam e a análise pode ser gravada e homologada.'
      : 'RC ' + num(a.rc) + ' acima do limite de ' + num(S.rcMaximo) + ': a análise pode ser gravada, mas não homologada. Veja “RC do grupo sem ele” e “Pares destoantes” nas respostas.';
    $('mesa-salvar').disabled = S.salvando; $('mesa-exportar').disabled = false;

    const oficial = homologada();
    const pesoOficial = k => oficial && oficial.pesos_consolidados ? oficial.pesos_consolidados[k] : null;
    S.tabelas.pesos.atualizar(r.criterios.map((c, k) => Object.assign({}, c, { homologado: pesoOficial(k) })));
    S.tabelas.pares.atualizar(r.pares);
    S.tabelas.matriz.atualizar(r.nomes.map((nome, i) => ({ indice: i, nome, valores: r.matriz[i] })));
    const qtd = r.incluidas.length;
    $('mesa-dica-pesos').textContent = 'Autovetor da matriz consolidada, calculado com ' + qtd + (qtd === 1 ? ' resposta' : ' respostas') + ' (' + M.ROTULO_METODO[S.metodo].toLowerCase() + '). Os limites mostram o quanto os julgadores individuais divergem em cada critério.';
  }

  const ABAS = ['pesos', 'pares', 'matriz'];
  function selecionarAba(nome) {
    S.aba = nome;
    ABAS.forEach(aba => {
      const ativa = aba === nome;
      $('mesa-aba-' + aba).setAttribute('aria-selected', String(ativa)); $('mesa-aba-' + aba).tabIndex = ativa ? 0 : -1;
      $('mesa-painel-' + aba).hidden = !ativa;
    });
  }

  /* ---------- 5. Gravar, carregar e homologar ---------- */
  function montarTabelaAnalises() {
    S.tabelas.analises = montarTabela({
      id: 'mesa-anl', host: $('mesa-tabela-analises'), rotulo: 'análises gravadas', seletor: 'unico', exportar: false, vazio: 'Nenhuma análise gravada neste julgamento.',
      aoMudar: () => atualizarAnalises(),
      controles: [
        { id: 'carregar', icone: 'fa-sliders', classe: 'edit', titulo: 'Carregar na mesa: restaurar as respostas e as regras desta análise', habilitado: ids => ids.length === 1, ao: ids => carregarAnalise(ids[0]) },
        { id: 'homologar', icone: 'fa-circle-check', classe: 'save', titulo: 'Homologar análise selecionada', habilitado: (ids, linhas) => linhas.length === 1 && linhas[0].consistente && linhas[0].id !== (S.espaco && S.espaco.analise_homologada_id) && !S.salvando, ao: ids => homologar(ids[0]) },
      ],
      colunas: [
        { titulo: 'Código', texto: a => a.codigo, classe: () => 'mesa-esq' },
        { titulo: 'Nome da análise', texto: a => a.nome, classe: () => 'mesa-esq' },
        { titulo: 'Método', texto: a => M.ROTULO_METODO[metodoDe(a)] || a.metodo_agregacao },
        { titulo: 'Respostas', texto: a => String(a.respostas_incluidas ?? (a.resposta_ids || []).length) },
        { titulo: 'RC', texto: a => num(a.razao_consistencia) },
        { titulo: 'Consistente', texto: a => a.consistente ? 'Sim' : 'Não', classe: a => a.consistente ? 'mesa-ok' : 'mesa-pendente' },
        { titulo: 'Situação', texto: a => a.id === (S.espaco && S.espaco.analise_homologada_id) || a.status === 'homologada' ? 'Homologada' : 'Calculada', classe: a => a.status === 'homologada' ? 'mesa-ok' : '' },
        { titulo: 'Criada em', texto: a => dataHora(a.criadoEm) },
        { titulo: 'Diferença máx. para a mesa', texto: a => { const d = diferencaParaMesa(a); return d == null ? '—' : (d * 100).toFixed(1) + ' p.p.'; }, ordem: a => diferencaParaMesa(a) ?? '' },
      ],
    });
  }
  function diferencaParaMesa(analise) {
    return S.resultado && S.resultado.analise ? M.diferencaMaxima(analise.pesos_consolidados, S.resultado.analise.pesos) : null;
  }
  function atualizarAnalises() {
    if (!S.espaco || !S.tabelas.analises) return;
    S.tabelas.analises.atualizar((S.espaco.analises || []).map(a => Object.assign({}, a)));
    const oficial = homologada();
    $('mesa-proximos').hidden = !oficial;
  }
  function carregarAnalise(id) {
    const analise = (S.espaco.analises || []).find(a => a.id === id); if (!analise) return;
    aplicarConfiguracao(analise);
    $('mesa-nome').value = analise.nome + ' — revisão';
    S.origem = 'Mesa restaurada a partir da análise “' + analise.nome + '” (' + analise.codigo + '). Gravar cria uma nova análise; a original não é alterada.';
    $('mesa-origem').textContent = S.origem;
    recalcular();
    $('mesa-barra').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function salvar() {
    if (S.salvando || !S.resultado || S.resultado.vazio) return;
    const nome = $('mesa-nome').value.trim();
    if (!nome) { $('mesa-nome').focus(); feedback('Informe o nome da análise.', true); return; }
    if (!$('mesa-rc').reportValidity()) return;
    const r = S.resultado, selecionadas = S.enviadas.filter(x => S.marcadas.has(String(x.id))).map(x => String(x.id));
    S.salvando = true; $('mesa-salvar').disabled = true;
    const etapas = ['Conferir a seleção de respostas', 'Agregar os índices e gravar a análise', 'Atualizar a mesa com o resultado gravado'];
    const proc = ProcessFeedback.iniciarCadastro({ title: 'Gravar análise consolidada', subtitle: nome, tasks: etapas });
    let criada = null, etapa = etapas[0];
    try {
      proc.tarefaAtual(etapas[0]); proc.concluirTarefa(etapas[0], r.incluidas.length + ' de ' + S.enviadas.length + ' respostas enviadas entram na consolidação.');
      etapa = etapas[1]; proc.tarefaAtual(etapas[1]);
      criada = await api(BASE + '/ambientes/' + encodeURIComponent(S.selecionado) + '/analises', { method: 'POST', body: JSON.stringify({ nome, metodo_agregacao: S.metodo, resposta_ids: selecionadas, rc_maximo: S.rcMaximo, excluir_inconsistentes: S.excluir }) });
      proc.concluirTarefa(etapas[1], 'Análise ' + (criada.codigo || '') + ' gravada.');
      etapa = etapas[2]; proc.tarefaAtual(etapas[2]);
      await recarregarEspaco();
      proc.concluirTarefa(etapas[2]);
      const campos = [['Análise', criada.nome + (criada.codigo ? ' (' + criada.codigo + ')' : '')], ['Respostas incluídas', (criada.respostas_incluidas ?? r.incluidas.length) + ' de ' + S.enviadas.length + ' enviadas'], ['Razão de consistência (RC)', num(criada.razao_consistencia) + ' · limite ' + num(S.rcMaximo)], ['λmax / IC / IA', num(criada.lambda_max) + ' / ' + num(criada.indice_consistencia) + ' / ' + num(criada.indice_aleatorio)]];
      const dados = { title: 'Análise gravada', summary: campos.map(([label, value]) => ({ label, value })), details: campos.map(c => c.join(': ')).join('\n') };
      if (!criada.consistente) proc.sucesso(Object.assign(dados, { _status: 'partial', title: 'Análise gravada, mas inconsistente', message: 'O RC ficou acima do limite: esta análise não pode ser homologada. Revise as respostas destoantes e grave outra.' }));
      else if ((criada.respostas_incluidas ?? r.incluidas.length) < S.enviadas.length) proc.sucesso(Object.assign(dados, { _status: 'partial', title: 'Análise gravada com ressalva', message: 'O resultado é consistente, mas nem todas as respostas enviadas entraram. Confirme se a exclusão foi proposital antes de homologar.' }));
      else proc.sucesso(Object.assign(dados, { message: 'Todas as respostas enviadas entraram e o resultado é consistente. Selecione a análise na tabela abaixo para homologá-la.' }));
    } catch (erro) {
      if (criada) proc.sucesso({ _status: 'partial', title: 'Análise gravada; tela não atualizada', message: 'A análise foi gravada, mas a mesa não foi atualizada: ' + erro.message + '. Recarregue a página antes de tentar novamente.' });
      else proc.erro({ message: erro.message, status: erro.status, method: erro.method, url: erro.url, body: erro.body, detail: etapa });
    } finally { S.salvando = false; if (S.resultado && !S.resultado.vazio) $('mesa-salvar').disabled = false; atualizarAnalises(); }
  }
  async function homologar(id) {
    if (S.salvando) return;
    const analise = (S.espaco.analises || []).find(a => a.id === id); if (!analise) return;
    S.salvando = true;
    try {
      const oficial = homologada();
      if (!(await ProcessFeedback.confirmar({ title: 'Homologar análise', message: 'Confirmar “' + analise.nome + '” (' + analise.codigo + ') como referência de pesos desta hierarquização?' + (oficial ? ' Ela substituirá a análise homologada atual (' + oficial.codigo + ').' : ''), confirmLabel: 'Homologar' }))) return;
      const proc = ProcessFeedback.iniciarCadastro({ title: 'Homologar análise', tasks: ['Aguardando confirmação do servidor'] });
      proc.tarefaAtual('Aguardando confirmação do servidor');
      let confirmada = false;
      try {
        await api(BASE + '/analises/' + encodeURIComponent(id) + '/homologar', { method: 'POST' });
        confirmada = true; proc.concluirTarefa('Aguardando confirmação do servidor');
        await recarregarEspaco();
        proc.sucesso({ title: 'Análise homologada', message: 'Os pesos desta análise passam a ser usados na fase 3 da hierarquização vinculada.' });
      } catch (erro) {
        if (confirmada) proc.sucesso({ _status: 'partial', title: 'Homologada; tela não atualizada', message: 'O servidor confirmou a homologação, mas a mesa não foi atualizada: ' + erro.message + '. Recarregue a página.' });
        else proc.erro({ message: erro.message, status: erro.status, method: erro.method, url: erro.url, body: erro.body });
      }
    } finally { S.salvando = false; atualizarAnalises(); }
  }

  /* ---------- 6. Exportação completa (nenhuma informação fica só na tela) ---------- */
  function exportarPlanilha() {
    const r = S.resultado, ambiente = S.espaco.ambiente;
    if (!window.XLSX) { Notify.error('Mesa de consolidação', 'A biblioteca de planilhas não foi carregada.'); return; }
    const nomes = (ambiente.criterios || []).map(M.nomeCriterio), livro = XLSX.utils.book_new();
    const folha = (nome, linhas) => XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(linhas), nome);
    folha('Parâmetros', [
      ['Julgamento', ambiente.nome || ambiente.id], ['Hierarquização', ambiente.hierarquizacao_nome || ambiente.hierarquizacao_codigo || ''], ['Método de agregação', M.ROTULO_METODO[S.metodo]],
      ['RC máximo individual', S.rcMaximo], ['Excluir respostas inconsistentes', S.excluir ? 'Sim' : 'Não'], ['Respostas incluídas', r.incluidas.length + ' de ' + S.enviadas.length],
      ['λmax', r.analise ? r.analise.lambdaMax : ''], ['IC', r.analise ? r.analise.ic : ''], ['IA', r.analise ? r.analise.ri : ''], ['RC', r.analise ? r.analise.rc : ''],
      ['Consistente', r.analise ? (r.consistente ? 'Sim' : 'Não') : ''], ['Gerado em', new Date().toLocaleString('pt-BR')],
    ]);
    folha('Julgadores', [['Código', 'Nome', 'E-mail', 'Instituição', 'Situação', 'RC individual', 'No cálculo']].concat(julgadores().map(l => [
      l.indice >= 0 ? 'J' + (l.indice + 1) : '', l.nome, l.email, (l.resposta && l.resposta.instituicao) || '', l.situacao, l.enviada ? Number(l.resposta.razao_consistencia) : '', situacaoNoCalculo(l).texto])));
    if (r.analise) {
      folha('Índices por par', [['Par de critérios'].concat(S.enviadas.map((x, k) => hoverLabel(x, k)), ['Consolidado', 'Dispersão (×)'])].concat(r.pares.map(p => [p.rotulo].concat(S.enviadas.map(x => p.valores.get(String(x.id)).valor), [p.consolidado, Math.exp(p.dispersao)]))));
      folha('Matriz consolidada', [[''].concat(nomes)].concat(r.matriz.map((linha, i) => [nomes[i]].concat(linha))));
      folha('Pesos', [['Critério', 'Peso consolidado', 'Menor individual', 'Maior individual', 'Variação (CV)'].concat(S.enviadas.map((x, k) => 'Peso ' + hoverLabel(x, k)))].concat(r.criterios.map((c, k) => [c.nome, c.peso, c.minimo, c.maximo, c.cv].concat(S.enviadas.map(x => r.individuais.get(String(x.id)).pesos[k])))));
    }
    XLSX.writeFile(livro, 'mesa-consolidacao-' + String(ambiente.nome || ambiente.id).normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() + '.xlsx');
  }

  /* ---------- Inicialização ---------- */
  document.addEventListener('DOMContentLoaded', async function () {
    montarTabelaJulgamentos();
    ['mesa-metodo', 'mesa-rc', 'mesa-excluir'].forEach(id => $(id).addEventListener(id === 'mesa-rc' ? 'input' : 'change', recalcular));
    $('mesa-salvar').addEventListener('click', salvar);
    $('mesa-exportar').addEventListener('click', exportarPlanilha);
    $('mesa-sel-todas').addEventListener('click', () => { S.tabelas.respostas.definirSelecao(S.enviadas.map(r => String(r.id)), true); });
    $('mesa-sel-consistentes').addEventListener('click', () => { S.tabelas.respostas.definirSelecao(S.enviadas.filter(r => r.consistente).map(r => String(r.id)), true); });
    $('mesa-sel-nenhuma').addEventListener('click', () => { S.tabelas.respostas.definirSelecao([], true); });
    ABAS.forEach((aba, i) => {
      const botao = $('mesa-aba-' + aba);
      botao.addEventListener('click', () => selecionarAba(aba));
      botao.addEventListener('keydown', evento => {
        const passo = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0; if (!passo) return;
        const alvo = ABAS[(i + passo + ABAS.length) % ABAS.length]; selecionarAba(alvo); $('mesa-aba-' + alvo).focus();
      });
    });
    if (modoDemo) { const aviso = $('mesa-demo-pagina'); if (aviso) aviso.hidden = false; }
    const carregou = await carregarJulgamentos(false);
    const pedido = params.get('julgamento');
    if (carregou && pedido && S.julgamentos.some(j => j.id === pedido)) { S.tabelas.julgamentos.definirSelecao([pedido], false); abrirJulgamento(pedido); }
  });
})();
