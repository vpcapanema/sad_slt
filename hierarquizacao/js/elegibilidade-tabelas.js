import {nomeDemanda} from './nome-demanda.js?v=20261023-nomes';
import {el} from '../../geoespacial/extracao-atributos/ui.js';

export function criarFiltroResultados(prefixo, aoFiltrar) {
  const node = sufixo => document.getElementById(`${prefixo}-${sufixo}`);
  let colunas = [], linhas = [];
  const texto = linha => colunas.find(c => c.id === node('coluna').value)?.valor(linha) || '';
  const valores = () => {
    window.SLTTable.values(node('valor'), linhas, texto);
    node('valor').disabled = !node('coluna').value;
  };
  node('coluna').onchange = () => { node('valor').value = ''; valores(); aoFiltrar(); };
  node('valor').onchange = aoFiltrar;
  window.SLTTable.bindFilter(prefixo, aoFiltrar, () => {
    node('coluna').value = ''; node('valor').value = ''; valores();
  });
  return {
    atualizar(novasColunas, novasLinhas, preservar=false) {
      const colunaAnterior = preservar ? node('coluna').value : '';
      const valorAnterior = preservar ? node('valor').value : '';
      colunas = novasColunas; linhas = novasLinhas;
      node('coluna').replaceChildren(new Option('— Coluna —', ''),
        ...colunas.map(c => new Option(c.nome, c.id)));
      node('coluna').value = colunaAnterior;
      node('valor').value = valorAnterior;
      if (!preservar) window.SLTTable.inversion(node('inverter'), false);
      valores();
    },
    filtrar(lista) {
      const valor = node('valor').value;
      return lista.filter(linha => window.SLTTable.matches(prefixo,
        texto(linha) === (valor === '__empty__' ? '' : valor), Boolean(node('coluna').value && valor)));
    },
    controles(bloqueado) {
      node('valor').disabled = bloqueado || !node('coluna').value;
    },
  };
}

export function paginarResultados({prefixo, linhas, pagina, mudar, selecionada, total}) {
  const resultado = window.SLTTable.paginate(`${prefixo}-paginacao`, linhas, pagina + 1,
    p => mudar(p - 1), 50);
  window.SLTTable.summary(`${prefixo}-contagem`, linhas.filter(selecionada).length,
    resultado.rows.length, total);
  document.getElementById(`${prefixo}-paginacao`).querySelectorAll('button')
    .forEach(botao => { botao.dataset.limite = String(botao.disabled); });
  return resultado;
}

export function criarResumoResultados({node, selecionar, controles, avisar, aoSalvar, salvarNomeAnalise, tabelaAgregada=false}) {
  let linhas = [], pagina = 0, chave = '', entrada = null, geracao = 0;
  let editando = null, ocupado = false, bloqueado = false, tipo = '';
  let cabecalho = null, registros = new Map(), ordem = new Map(), tabelaValida = true;
  const selecionadas = new Set();
  const cadastro = new Map(), botao = acao => document.getElementById(`ev-resumo-${acao}`);
  const status = document.getElementById('ev-resumo-status');
  const atual = () => linhas.find(l => l.chave === chave);
  const erro = e => { status.textContent = e.message; avisar(e.message, 'error'); };
  const obter = codigo => tipo === 'plano' ? window.SLTAdminApi.getPlano(codigo)
    : tipo === 'programa' ? window.SLTAdminApi.getPrograma(codigo) : window.SLTAdminApi.getDemanda(codigo);
  const nomes = (linha, papel) => [...new Set(linha.sobreposicoes
    .filter(item => item.papel === papel).map(item => item.nome))].join('; ');
  const medida = (valor, divisor, casas) => Number.isFinite(valor)
    ? (valor / divisor).toLocaleString('pt-BR', {minimumFractionDigits:casas, maximumFractionDigits:valor > 0 && valor/divisor < .005 ? 12 : casas}) : '—';
  let colunas = [
    {id:'demanda', nome:'Demanda', valor:nomeDemanda},
    {id:'perimetro', nome:'Perímetro (m)', valor:l => medida(l.perimetro_m, 1, 2)},
    {id:'area_km2', nome:'Área (km²)', valor:l => medida(l.area_total_m2, 1e6, 2)},
    {id:'area_ha', nome:'Área (ha)', valor:l => medida(l.area_total_m2, 1e4, 4)},
    {id:'restricao', nome:'Restrição', valor:l => nomes(l, 'restricao')},
    {id:'risco', nome:'Risco', valor:l => nomes(l, 'risco')},
  ];
  const filtro = criarFiltroResultados('ev-resumo-filtro', () => { pagina = 0; desenhar(); controles(); });
  const ordenarLinhas = () => tabelaAgregada ? [...linhas].sort((a,b) => ordem.get(a.chave)-ordem.get(b.chave)) : linhas;
  window.SLTDemandasGrupo.bindModalClosures();
  function atualizarControles() {
    const travado = bloqueado || ocupado || !tabelaValida, vinculada = cadastro.has(atual()?.codigo_demanda);
    const visivel = tabelaValida && (!tabelaAgregada || selecionadas.size === 1) && filtro.filtrar(linhas).some(l => l.chave === chave);
    botao('visualizar').disabled = travado || Boolean(editando) || !visivel;
    botao('editar').disabled = travado || Boolean(editando) || !visivel || (!vinculada && !salvarNomeAnalise) || !window.SLTAdminAuth.can('operate');
    botao('editar').title = vinculada ? 'Editar nome da demanda no cadastro original' : salvarNomeAnalise
      ? 'Editar nome da demanda na análise salva' : 'Edição indisponível: demanda sem vínculo cadastral confirmado';
    botao('salvar').disabled = travado || !editando;
    botao('cancelar').disabled = travado || !editando;
    document.querySelectorAll('[aria-label="Filtrar resumo por demanda"] select, [aria-label="Filtrar resumo por demanda"] button, #ev-resumo-paginacao button')
      .forEach(b => { b.disabled = travado || Boolean(editando) || b.dataset.limite === 'true'; });
    filtro.controles(travado || Boolean(editando));
    document.getElementById('ev-resultados-entrada').disabled = travado || Boolean(editando);
    if (tabelaAgregada) document.querySelectorAll('.fv-estatisticas-controles select, .fv-estatisticas-controles input')
      .forEach(c => { c.disabled = bloqueado || ocupado || Boolean(editando) || c.dataset.rasterFixo === 'true' ||
        (c.id === 'ev-resultados-percentil' && document.getElementById('ev-resultados-posicao').value !== 'percentil'); });
    node.querySelectorAll('td button, .row-select').forEach(b => { b.disabled = travado || Boolean(editando); });
    const campo = document.getElementById('ev-resumo-nome');
    if (campo) campo.disabled = travado;
  }
  botao('visualizar').onclick = async () => {
    if (botao('visualizar').disabled) return;
    const linha = atual(), versao = geracao;
    ocupado = true; atualizarControles();
    try {
      const vinculo = cadastro.get(linha.codigo_demanda);
      const objeto = vinculo ? await obter(linha.codigo_demanda) : {
        codigo:linha.id, nome:colunas[0].valor(linha),
        geometria:entrada.geometrias.features.find(f => f.properties.chave === linha.chave)?.geometry,
        complementos:Object.fromEntries(colunas.slice(1).map(c => [c.nome, c.valor(linha)])),
      };
      if (versao !== geracao) return;
      window.SLTDemandasGrupo.showModal('modal-objetos',
        `${objeto.id || objeto.codigo || ''} — ${objeto.nome}${vinculo ? '' : ' · Dados da análise, sem vínculo cadastral'}`,
        window.SLTObjetoDetalhe.corpo({...objeto, codigo:objeto.id || objeto.codigo, tipo_demanda:tipo || undefined,
          latitude:objeto.lat ?? objeto.latitude, longitude:objeto.lng ?? objeto.longitude}));
    } catch (e) { if (versao === geracao) erro(e); }
    finally { if (versao === geracao) { ocupado = false; atualizarControles(); } }
  };
  botao('editar').onclick = async () => {
    if (botao('editar').disabled) return;
    const linha = atual(), codigo = linha.codigo_demanda, versao = geracao;
    const local = !cadastro.has(codigo);
    ocupado = true; atualizarControles();
    try {
      const registro = local ? {nome:linha.nome || `Demanda ${linha.id}`} : await obter(codigo);
      if (versao !== geracao) return;
      if (!local && registro.id !== codigo) throw new Error('O cadastro retornado não corresponde à demanda selecionada.');
      editando = {codigo, chave:linha.chave, nome:registro.nome, local};
      pagina = Math.floor(filtro.filtrar(ordenarLinhas()).findIndex(l => l.chave === chave) / 50);
      desenhar();
      status.textContent = local
        ? 'Edite somente o nome da demanda. Salvar preserva a revisão na análise para reabertura e relatórios regenerados; o GeoPackage original não é alterado.'
        : 'Edite somente o nome da demanda. Salvar atualiza o cadastro original; os valores calculados não são alterados.';
    } catch (e) { if (versao === geracao) erro(e); }
    finally { if (versao === geracao) { ocupado = false; atualizarControles(); document.getElementById('ev-resumo-nome')?.focus(); } }
  };
  botao('cancelar').onclick = () => {
    if (botao('cancelar').disabled) return;
    editando = null; desenhar(); controles();
    status.textContent = 'Edição cancelada. Nenhum nome foi alterado.';
  };
  botao('salvar').onclick = async () => {
    if (botao('salvar').disabled) return;
    const campo = document.getElementById('ev-resumo-nome');
    campo.value = campo.value.trim();
    if (!campo.reportValidity()) return;
    const versao = geracao;
    ocupado = true; atualizarControles();
    try {
      const {codigo, chave:chaveEditada, local} = editando;
      const registro = local ? await salvarNomeAnalise(chaveEditada, campo.value)
        : await window.SLTAdminApi.updateDemandaByTipo(tipo, codigo, {nome:campo.value});
      if (versao !== geracao) return;
      if (!registro.nome || (local ? registro.chave !== chaveEditada || registro.execucao !== entrada.id : registro.id !== codigo))
        throw new Error('O servidor não confirmou o nome da demanda salva.');
      if (!local) cadastro.set(codigo, registro);
      linhas.filter(l => local ? l.chave === chaveEditada : l.codigo_demanda === codigo).forEach(l => { l.nome = registro.nome; });
      editando = null; filtro.atualizar(colunas, linhas); pagina = 0;
      aoSalvar(codigo, registro.nome, {chave:chaveEditada, local});
      desenhar(); status.textContent = local
        ? 'Nome salvo na revisão da análise. Será mantido ao reabrir e nos relatórios regenerados; o GeoPackage original foi preservado.'
        : 'Nome salvo no cadastro original. As interseções e o GeoPackage da análise foram preservados.';
      avisar(local ? 'Nome da demanda salvo na análise.' : 'Nome da demanda salvo no cadastro original.', 'success');
    } catch (e) { if (versao === geracao) erro(e); }
    finally { if (versao === geracao) { ocupado = false; controles(); } }
  };
  function desenhar() {
    const filtradas = tabelaValida ? filtro.filtrar(ordenarLinhas()) : [];
    const resultado = paginarResultados({prefixo:'ev-resumo', linhas:filtradas, pagina,
      mudar:p => { pagina = p; desenhar(); controles(); },
      selecionada:l => tabelaAgregada ? selecionadas.has(l.chave) : l.chave === chave, total:linhas.length});
    pagina = resultado.page - 1;
    if (!tabelaValida) { node.replaceChildren(); atualizarControles(); return; }
    const head = el('thead'), titulos = el('tr'), body = el('tbody');
    if (!tabelaAgregada) {
      const th = el('th'); th.scope = 'col'; th.className = 'evr-col-selecao';
      th.setAttribute('aria-label', 'Selecionar demanda'); titulos.append(th);
    }
    colunas.forEach(c => { const th = el('th', c.nome); th.scope = 'col'; titulos.append(th); });
    head.append(titulos);
    for (const linha of resultado.rows) {
      const tr = tabelaAgregada ? registros.get(linha.chave).cloneNode(true) : el('tr');
      tr.classList.toggle('ativo', tabelaAgregada ? selecionadas.has(linha.chave) : linha.chave === chave);
      tr.dataset.chave = linha.chave;
      tr.setAttribute('aria-selected', String(linha.chave === chave));
      if (!tabelaAgregada) colunas.forEach(c => {
        const valor = c.valor(linha), td = el('td', valor || 'Sem interseção');
        if (valor && ['restricao','risco'].includes(c.id)) td.className = c.id;
        if (['perimetro','area_km2','area_ha'].includes(c.id)) td.className = 'evr-medida';
        tr.append(td);
      });
      const botao = el('button', colunas[0].valor(linha));
      botao.type = 'button'; botao.onclick = () => selecionar(linha.chave);
      botao.disabled = Boolean(editando) || ocupado || bloqueado;
      if (editando && linha.chave === editando.chave) {
        const campo = el('input');
        campo.id = 'ev-resumo-nome'; campo.value = editando.nome; campo.required = true; campo.maxLength = 200;
        campo.setAttribute('aria-label', 'Nome da demanda');
        campo.oninput = () => { editando.nome = campo.value; };
        tr.firstChild.replaceChildren(campo);
      } else tr.firstChild.replaceChildren(botao);
      if (!tabelaAgregada) {
        const td = el('td'), seletor = el('input');
        td.className = 'evr-col-selecao'; seletor.type = 'radio'; seletor.name = 'ev-resumo-selecao';
        seletor.className = 'row-select'; seletor.checked = linha.chave === chave;
        seletor.disabled = Boolean(editando) || ocupado || bloqueado;
        seletor.setAttribute('aria-label', `Selecionar demanda ${colunas[0].valor(linha)}`);
        seletor.onchange = () => selecionar(linha.chave);
        td.append(seletor); tr.prepend(td);
      } else {
        const td = el('td'), seletor = el('input');
        td.className = 'evr-col-selecao'; seletor.type = 'checkbox'; seletor.className = 'row-select';
        seletor.checked = selecionadas.has(linha.chave);
        seletor.setAttribute('aria-label', `Selecionar demanda ${colunas[0].valor(linha)}`);
        seletor.onchange = () => {
          if (seletor.checked) { selecionadas.add(linha.chave); selecionar(linha.chave); }
          else { selecionadas.delete(linha.chave); chave = [...selecionadas][0] || ''; }
          desenhar();
        };
        td.append(seletor); tr.prepend(td);
      }
      body.append(tr);
    }
    if (!resultado.rows.length) {
      const tr = el('tr'), td = el('td', 'Nenhuma demanda encontrada para os filtros selecionados.');
      td.colSpan = colunas.length + 1; tr.append(td); body.append(tr);
    }
    node.replaceChildren(cabecalho ? cabecalho.cloneNode(true) : head, body);
    if (tabelaAgregada) {
      const th = el('th'), todos = el('input');
      th.className = 'evr-col-selecao'; th.scope = 'col'; todos.type = 'checkbox'; todos.className = 'row-select';
      todos.setAttribute('aria-label', 'Selecionar todas as demandas filtradas');
      todos.checked = Boolean(filtradas.length) && filtradas.every(l => selecionadas.has(l.chave));
      todos.indeterminate = !todos.checked && filtradas.some(l => selecionadas.has(l.chave));
      todos.onchange = () => {
        filtradas.forEach(l => todos.checked ? selecionadas.add(l.chave) : selecionadas.delete(l.chave));
        chave = [...selecionadas][0] || ''; desenhar();
      };
      th.append(todos); node.tHead.rows[0].prepend(th);
    }
    atualizarControles();
  }
  return {
    atualizar(novaEntrada) {
      entrada = novaEntrada; const versao = ++geracao;
      selecionadas.clear();
      cabecalho = null; registros.clear(); ordem.clear(); tabelaValida = !tabelaAgregada;
      editando = null; ocupado = false; cadastro.clear(); tipo = '';
      const bases = new Map(entrada.campos.map(c => [c.id, c]));
      linhas = entrada.linhas.map(l => ({...l,
        sobreposicoes:l.sobreposicoes.map(item => ({...item, papel:bases.get(item.base_id).papel}))}));
      pagina = 0; filtro.atualizar(colunas, linhas);
      status.textContent = salvarNomeAnalise
        ? 'Sem vínculo cadastral, o nome pode ser salvo na revisão da análise, sem alterar o GeoPackage original.'
        : 'Demandas sem vínculo cadastral confirmado são somente para consulta.';
      if (!entrada.hierarquizacao) return;
      ocupado = true;
      (async () => {
        try {
          const hier = await window.HierApi.obter(entrada.hierarquizacao);
          if (versao !== geracao) return;
          if (!['plano','programa','projeto'].includes(hier.tipo_demanda)) throw new Error('Tipo cadastral da hierarquização não reconhecido.');
          const membros = new Set((hier.dados_hierarquizacao?.objetos || hier.objetos)
            .map(o => (o.cabecalho_objeto || o).codigo));
          const registros = await window.SLTAdminApi.listDemandasByTipo(hier.tipo_demanda);
          if (versao !== geracao) return;
          tipo = hier.tipo_demanda;
          registros.filter(r => membros.has(r.id)).forEach(r => cadastro.set(r.id, r));
          linhas.forEach(l => { if (cadastro.has(l.codigo_demanda)) l.nome = cadastro.get(l.codigo_demanda).nome; });
          filtro.atualizar(colunas, linhas);
          status.textContent = salvarNomeAnalise
            ? 'O resumo consulta os nomes atuais do cadastro. Sem vínculo confirmado, a edição do nome é salva na revisão da análise.'
            : 'O resumo consulta os nomes atuais do cadastro. Demandas sem vínculo confirmado permanecem somente para consulta.';
          if (!tabelaAgregada || cabecalho) desenhar();
        } catch (e) { if (versao === geracao) erro(e); }
        finally { if (versao === geracao) { ocupado = false; controles(); } }
      })();
    },
    atualizarTabela(tabela) {
      cabecalho = tabela.tHead;
      tabelaValida = Boolean(cabecalho);
      registros = new Map([...(tabela.tBodies[0]?.rows || [])].map(tr => [tr.dataset.chave, tr]));
      ordem = new Map([...registros.keys()].map((id, i) => [id, i]));
      if (tabelaValida) colunas = [...cabecalho.rows[0].cells].map((th, i) => ({
        id:String(i), nome:th.textContent,
        valor:linha => i ? registros.get(linha.chave).cells[i].textContent : nomeDemanda(linha),
      }));
      pagina = 0; filtro.atualizar(colunas, linhas); desenhar();
    },
    selecionar(novaChave) {
      if (!editando) {
        chave = novaChave;
        if (tabelaAgregada && !selecionadas.has(chave)) { selecionadas.clear(); selecionadas.add(chave); }
      }
      desenhar();
    },
    controles(valor) { bloqueado = valor; atualizarControles(); },
  };
}
