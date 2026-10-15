(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const TIPOS = ["plano", "programa", "projeto"];
  const ROTULOS = { plano: "Plano", programa: "Programa", projeto: "Projeto" };
  const STATUS_ELEGIVEIS = new Set(["analise_aprovada", "hierarq_em_andamento"]);
  const POR_PAGINA = 15;
  const SELECIONADOS = new Set();
  const membrosGrupo = new Map();
  const membrosSelecionados = new Set();
  let grupoConfirmado = false;
  let salvandoGrupo = false;
  let universoRevisao = 0;
  let agrupamentoEmEdicao = null;
  let abrindoGrupo = false;
  let paginaGrupos = 1, paginaComposicao = 1;
  const resumoTabela = (selecionados, naPagina, total) => `${selecionados} selecionados / ${naPagina} na página / ${total} no total`;
  const recorte = (lista, paginaAtual) => lista.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  function paginar(prefixo, lista, atual, mudar, bloqueado = false) {
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    atual = Math.max(1, Math.min(atual, paginas));
    const alvo = $(`#${prefixo}-paginacao`);
    alvo.innerHTML = `<button type="button" aria-label="Página anterior" title="Anterior" ${atual <= 1 || bloqueado ? 'disabled' : ''}>‹</button><span>Página ${atual} de ${paginas}</span><button type="button" aria-label="Próxima página" title="Próxima" ${atual >= paginas || bloqueado ? 'disabled' : ''}>›</button>`;
    alvo.firstElementChild.onclick = () => mudar(atual - 1);
    alvo.lastElementChild.onclick = () => mudar(atual + 1);
    return atual;
  }

  function inversaoAtiva(botao) { return botao.getAttribute('aria-pressed') === 'true'; }
  function definirInversao(botao, ativo) {
    botao.setAttribute('aria-pressed', String(ativo));
    botao.title = ativo ? 'Seleção invertida — clique para desativar' : 'Inverter seleção';
  }

  function valorDemanda(item, campo) {
    if (item[campo] == null || item[campo] === '') return '';
    const span = document.createElement('span');
    span.innerHTML = formatarValor(item, campo);
    return span.textContent;
  }

  function filtrarDemandas(lista, prefixo) {
    const campo = $(`#${prefixo}-coluna`).value;
    const valor = $(`#${prefixo}-valor`).value;
    if (!campo || !valor) return lista;
    return lista.filter(item => {
      const atual = valorDemanda(item, campo);
      const igual = valor === '__vazias__' ? !atual : atual === valor;
      return inversaoAtiva($(`#${prefixo}-inverter`)) ? !igual : igual;
    });
  }

  function atualizarFiltroDemandas(prefixo, lista) {
    const coluna = $(`#${prefixo}-coluna`), valor = $(`#${prefixo}-valor`);
    const campoAnterior = coluna.value, valorAnterior = valor.value;
    coluna.innerHTML = '<option value="">— Coluna —</option>' + colunas().map(c => `<option value="${c.campo}">${escapar(c.rotulo || 'Demanda')}</option>`).join('');
    coluna.value = [...coluna.options].some(o => o.value === campoAnterior) ? campoAnterior : "";
    const campo = coluna.value;
    valor.disabled = !campo;
    valor.innerHTML = '<option value="">— Valor —</option>' + (campo ? '<option value="__vazias__">(vazias)</option>' + [...new Set(lista.map(item => valorDemanda(item, campo)).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR', {numeric:true})).map(v => `<option value="${escapar(v)}">${escapar(v)}</option>`).join('') : '');
    valor.value = [...valor.options].some(o => o.value === valorAnterior) ? valorAnterior : "";
  }

  function bindFiltroDemandas(prefixo, lista, selecionar, render) {
    const aplicar = () => { selecionar.clear(); if (prefixo === "composicao-filtro") paginaComposicao = 1; else pagina = 1; render(); };
    $(`#${prefixo}-coluna`).onchange = () => {
      $(`#${prefixo}-valor`).value = '';
      atualizarFiltroDemandas(prefixo, lista()); aplicar();
    };
    $(`#${prefixo}-valor`).onchange = aplicar;
    $(`#${prefixo}-inverter`).onclick = event => { definirInversao(event.currentTarget, !inversaoAtiva(event.currentTarget)); aplicar(); };
    $(`#${prefixo}-limpar`).onclick = () => {
      $(`#${prefixo}-coluna`).value = ''; definirInversao($(`#${prefixo}-inverter`), false);
      atualizarFiltroDemandas(prefixo, lista()); aplicar();
    };
  }

  function atualizarComposicao() {
    const fechado = grupoConfirmado || salvandoGrupo;
    $('#grupo-adicionar').disabled = fechado || !SELECIONADOS.size;
    $('#grupo-confirmar').disabled = fechado || !membrosGrupo.size;
    $('#grupo-editar').disabled = !grupoConfirmado || salvandoGrupo;
    $('#grupo-remover').disabled = fechado || !membrosSelecionados.size;
    $('#agrupamento-salvar').disabled = !grupoConfirmado || !membrosGrupo.size || salvandoGrupo;
    $('#agrupamento-tipo').disabled = fechado || membrosGrupo.size > 0;
    $('#agrupamento-new').disabled = salvandoGrupo || abrindoGrupo;
    $('#agrupamento-cancel').disabled = salvandoGrupo;
    $$('#agrupamento-rows input, #agrupamento-selecionar-pagina, #grupo-composicao-rows input, #grupo-selecionar-todos').forEach(el => { el.disabled = fechado; });
    $('#agrupamento-selecao-resumo').textContent = resumoTabela(membrosSelecionados.size, recorte(filtrarDemandas([...membrosGrupo.values()], 'composicao-filtro'), paginaComposicao).length, membrosGrupo.size);
    $('#grupo-confirmar').title = grupoConfirmado ? 'Registros confirmados' : 'Confirmar registros do grupo';
  }

  function renderComposicao() {
    atualizarFiltroDemandas('composicao-filtro', [...membrosGrupo.values()]);
    const lista = ordenarComposicao(filtrarDemandas([...membrosGrupo.values()], 'composicao-filtro'));
    paginaComposicao = paginar('composicao', lista, paginaComposicao, p => { paginaComposicao = p; membrosSelecionados.clear(); renderComposicao(); });
    const visiveis = recorte(lista, paginaComposicao);
    const nome = $('#agrupamento-nome').value.trim();
    $('#grupo-composicao-titulo').textContent = `Tabela de demandas do grupo${nome ? ' — ' + nome : ''}`;
    const cols = colunas();
    $('#grupo-composicao-head').innerHTML = `<tr><th class="col-select"><input type="checkbox" id="grupo-selecionar-todos" aria-label="Selecionar todos os registros do grupo"></th>${cols.map(c => `<th>${escapar(c.rotulo || 'Demanda')}</th>`).join('')}</tr>`;
    $('#grupo-composicao-rows').innerHTML = visiveis.length ? visiveis.map(item => `<tr><td class="col-select"><input type="checkbox" data-membro-id="${escapar(item.id)}" aria-label="Selecionar registro do grupo ${escapar(item.codigo)}"${membrosSelecionados.has(String(item.id)) ? ' checked' : ''}></td>${cols.map(c => `<td>${formatarValor(item,c.campo)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length + 1}">Nenhuma demanda adicionada ao grupo.</td></tr>`;
    const todos = $('#grupo-selecionar-todos');
    todos.checked = visiveis.length > 0 && visiveis.every(item => membrosSelecionados.has(String(item.id)));
    todos.indeterminate = visiveis.some(item => membrosSelecionados.has(String(item.id))) && !todos.checked;
    todos.onchange = () => {
      if (grupoConfirmado || salvandoGrupo) return;
      membrosSelecionados.clear();
      if (todos.checked) visiveis.forEach(item => membrosSelecionados.add(String(item.id)));
      renderComposicao();
    };
    $$('[data-membro-id]').forEach(el => { el.onchange = () => {
      if (grupoConfirmado || salvandoGrupo) return;
      el.checked ? membrosSelecionados.add(el.dataset.membroId) : membrosSelecionados.delete(el.dataset.membroId);
      renderComposicao();
    }; });
    atualizarComposicao();
  }

  async function visualizarGrupo(id) {
    try {
      const grupo = await HierApi.obterAgrupamento(id);
      window.SLTDemandasGrupo.showModal(
        'modal-objetos',
        `Demandas do grupo — ${grupo.nome || grupo.codigo}`,
        window.SLTDemandasGrupo.render(grupo.objetos),
      );
    } catch (error) { erro(error.message, '#agrupamentos-error'); }
  }

  async function editarGrupo(id) {
    if (salvandoGrupo || abrindoGrupo || !SLTAdminAuth.can('operate')) return;
    abrindoGrupo = true;
    atualizarComposicao();
    try {
      const grupo = await HierApi.obterAgrupamento(id);
      agrupamentoEmEdicao = id;
      $('#agrupamento-nome').value = grupo.nome;
      $('#agrupamento-descricao').value = grupo.descricao || '';
      $('#agrupamento-tipo').value = grupo.tipo_demanda;
      membrosGrupo.clear(); membrosSelecionados.clear(); SELECIONADOS.clear();
      for (const item of grupo.objetos || []) membrosGrupo.set(String(item.id), item);
      grupoConfirmado = false;
      $('#grupo-composicao').classList.remove('hidden');
      $('#agrupamento-editor-title').textContent = `Editar grupo — ${grupo.codigo}`;
      $('#agrupamento-editor').classList.remove('hidden');
      await carregarUniverso();
      renderComposicao();
      $('#grupo-composicao').scrollIntoView({behavior:'smooth', block:'start'});
    } catch (error) { erro(error.message, '#agrupamentos-error'); }
    finally { abrindoGrupo = false; atualizarComposicao(); }
  }
  let universo = [];
  let campos = [];
  let pagina = 1;
  let grupos = [];
  const gruposSelecionados = new Set();
  let grupoEditando = null;
  let ocupado = false;
  const colunasGrupo = {codigo: 'Código', nome: 'Nome', tipo_demanda: 'Tipo de demanda', quantidade_demandas: 'Demandas', criado_em: 'Criado em', criado_por_nome: 'Agrupado por'};

  function valorGrupo(grupo, campo) {
    if (campo === 'criado_em') return formatarData(grupo[campo]);
    if (campo === 'tipo_demanda') return ROTULOS[grupo[campo]] || grupo[campo];
    return String(grupo[campo] ?? '');
  }

  const ordenarGrupos = SLTTable.sorting($('#agrupamentos-tbody').closest('table'), () => [null,...Object.keys(colunasGrupo).map(key=>g=>valorGrupo(g,key))], () => { paginaGrupos=1; gruposSelecionados.clear(); renderGrupos(); }, () => !ocupado && !grupoEditando);
  const ordenarUniverso = SLTTable.sorting($('#agrupamento-rows').closest('table'), () => [null,...colunas().map(col=>item=>SLTTable.plainText(formatarValor(item,col.campo)))], () => { pagina=1; SELECIONADOS.clear(); renderDemandas(); });
  const ordenarComposicao = SLTTable.sorting($('#grupo-composicao-rows').closest('table'), () => [null,...colunas().map(col=>item=>SLTTable.plainText(formatarValor(item,col.campo)))], () => { paginaComposicao=1; membrosSelecionados.clear(); renderComposicao(); });
  function gruposFiltrados() {
    const campo = $('#grupos-filtro-coluna').value;
    const valor = $('#grupos-filtro-valor').value;
    if (!campo || !valor) return ordenarGrupos(grupos);
    return ordenarGrupos(grupos.filter(g => {
      const igual = valor === '__vazias__' ? !valorGrupo(g, campo) : valorGrupo(g, campo) === valor;
      return inversaoAtiva($('#grupos-filtro-inverter')) ? !igual : igual;
    }));
  }

  function valoresFiltroGrupo() {
    const campo = $('#grupos-filtro-coluna').value;
    const select = $('#grupos-filtro-valor');
    select.disabled = !campo;
    select.innerHTML = '<option value="">— Valor —</option>' + (campo ? '<option value="__vazias__">(vazias)</option>' + [...new Set(grupos.map(g => valorGrupo(g, campo)).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'pt-BR', {numeric:true})).map(v => `<option value="${escapar(v)}">${escapar(v)}</option>`).join('') : '');
  }

  function controlesGrupos() {
    const admin = SLTAdminAuth.can('administer');
    const botao = (acao, icone, texto, desabilitado = false) => `<button type="button" class="admin-icon-btn ${acao}" data-grupo-acao="${acao}" title="${escapar(texto)}" aria-label="${escapar(texto)}"${desabilitado || ocupado ? ' disabled' : ''}><i class="fa-solid ${icone}" aria-hidden="true"></i></button>`;
    $('#grupos-controles').innerHTML = grupoEditando
      ? botao('save', 'fa-check', 'Salvar alterações') + botao('cancel', 'fa-xmark', 'Cancelar')
      : botao('edit-group', 'fa-pen-to-square', 'Editar grupo', gruposSelecionados.size !== 1 || !SLTAdminAuth.can('operate')) + botao('reload', 'fa-rotate-right', 'Recarregar') + botao('edit', 'fa-pen', admin ? 'Editar selecionado' : 'Editar selecionado (Administrador)', !admin || gruposSelecionados.size !== 1) + botao('delete', 'fa-trash', admin ? 'Excluir selecionados' : 'Excluir selecionados (Administrador)', !admin || !gruposSelecionados.size);
    $('#grupos-selecao').textContent = resumoTabela(gruposSelecionados.size, recorte(gruposFiltrados(), paginaGrupos).length, grupos.length);
    const todos = $('#grupos-selecionar-todos'), lista = recorte(gruposFiltrados(), paginaGrupos);
    paginar('grupos', gruposFiltrados(), paginaGrupos, p => { paginaGrupos = p; gruposSelecionados.clear(); renderGrupos(); }, ocupado || Boolean(grupoEditando));
    todos.checked = lista.length > 0 && lista.every(g => gruposSelecionados.has(g.id));
    todos.indeterminate = !todos.checked && lista.some(g => gruposSelecionados.has(g.id));
    todos.disabled = ocupado || Boolean(grupoEditando) || !lista.length;
    for (const el of document.querySelectorAll('.agrupamentos-list-section .admin-filter-bar input, .agrupamentos-list-section .admin-filter-bar select, #grupos-filtro-inverter, #grupos-filtro-limpar')) el.disabled = ocupado || Boolean(grupoEditando) || (el.id === 'grupos-filtro-valor' && !$('#grupos-filtro-coluna').value);
  }

  async function acaoGrupo(acao) {
    if (ocupado) return;
    if (acao === 'edit-group' && gruposSelecionados.size === 1) { await editarGrupo([...gruposSelecionados][0]); return; }
    if (acao === 'reload') { gruposSelecionados.clear(); await carregarGrupos(); return; }
    if (acao === 'cancel') { grupoEditando = null; renderGrupos(); return; }
    if (!SLTAdminAuth.can('administer')) return;
    if (acao === 'edit' && gruposSelecionados.size === 1) { grupoEditando = [...gruposSelecionados][0]; renderGrupos(); $('#grupo-nome-edicao').focus(); return; }
    let body, method;
    if (acao === 'save' && grupoEditando) {
      const nome = $('#grupo-nome-edicao').value.trim();
      if (!nome) { erro('Informe o nome do agrupamento.', '#agrupamentos-error'); return; }
      body = {chave: {id: grupoEditando}, valores: {nome}}; method = 'PATCH';
    } else if (acao === 'delete' && gruposSelecionados.size) {
      const selecionados = grupos.filter(g => gruposSelecionados.has(g.id));
      if (!window.confirm(`Excluir os agrupamentos selecionados?\n${selecionados.map(g => g.codigo + ' — ' + g.nome).join('\n')}`)) return;
      body = {chaves: selecionados.map(g => ({id:g.id}))}; method = 'DELETE';
    } else return;
    ocupado = true; controlesGrupos(); limparErro('#agrupamentos-error');
    try {
      const response = await fetch('/api/admin/tabelas/demandas/grupos_demandas', {method, credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Não foi possível concluir a operação.');
      grupoEditando = null; gruposSelecionados.clear(); await carregarGrupos();
    } catch (error) { erro(error.message, '#agrupamentos-error'); }
    finally { ocupado = false; controlesGrupos(); }
  }

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function erro(mensagem, destino = "#agrupamento-form-error") {
    const elemento = $(destino);
    if (!elemento) return;
    elemento.textContent = mensagem || "Não foi possível concluir a operação.";
    elemento.classList.remove("hidden");
  }

  function limparErro(destino = "#agrupamento-form-error") {
    const elemento = $(destino);
    if (!elemento) return;
    elemento.textContent = "";
    elemento.classList.add("hidden");
  }

  function formatarData(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString("pt-BR");
  }

  function statusHtml(item, tipo) {
    const labels = window.SLTAdminLabels;
    return labels?.statusBadgeHtml?.(item.status, tipo) || escapar(item.status || "—");
  }

  function formatarValor(item, campo) {
    const labels = window.SLTAdminLabels || {};
    if (campo === "status") return statusHtml(item, $("#agrupamento-tipo").value);
    if (campo === "diretoria_id") return escapar(labels.diretoriaLabel?.(item.diretoria_id) || item.diretoria_id || "—");
    if (campo === "plano_id") return escapar(item.plano_id_alias || labels.planoLabel?.(item.plano_id) || item.plano_id || "—");
    if (campo === "programa_id") return escapar(item.programa_id_alias || item.programa_id || "—");
    if (campo === "instituicao_nome") return escapar(labels.instituicaoLabel?.(item) || item.instituicao_nome || "—");
    if (campo === "representante_nome") return escapar(labels.representanteLabel?.(item) || item.representante_nome || "—");
    if (campo === "valor_global") return escapar(labels.formatMoney?.(item.valor_global) || item.valor_global || "—");
    if (["criado_em", "atualizado_em", "aprovado_em"].includes(campo)) return escapar(formatarData(item[campo]));
    const valor = item[campo];
    if (valor === null || valor === undefined || valor === "") return "—";
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    return escapar(valor);
  }

  function colunas() {
    const tipo = $("#agrupamento-tipo").value;
    const comuns = [{ campo: "origem_sei_processo", rotulo: "Processo SEI" }, { campo: "status", rotulo: "Situação" }, { campo: "codigo", rotulo: "Código" }, { campo: "nome", rotulo: ROTULOS[tipo] }];
    if (tipo === "plano") return [...comuns, { campo: "diretoria_id", rotulo: "Diretoria" }, { campo: "instituicao_nome", rotulo: "Instituição" }, { campo: "representante_nome", rotulo: "Representante" }, { campo: "objetivo_estrategico", rotulo: "Objetivo estratégico" }, { campo: "valor_global", rotulo: "Valor global" }, { campo: "criado_em", rotulo: "Cadastro" }];
    if (tipo === "programa") return [...comuns, { campo: "plano_id", rotulo: "Plano vinculado" }, { campo: "vinculo_institucional", rotulo: "Vínculo institucional" }, { campo: "diretoria_id", rotulo: "Diretoria" }, { campo: "instituicao_nome", rotulo: "Instituição" }, { campo: "objetivo", rotulo: "Objetivo" }, { campo: "valor_global", rotulo: "Valor global" }, { campo: "criado_em", rotulo: "Cadastro" }];
    return [...comuns, { campo: "diretoria_id", rotulo: "Diretoria" }, { campo: "plano_id", rotulo: "Plano estratégico" }, { campo: "programa_id", rotulo: "Programa vinculado" }, { campo: "instituicao_nome", rotulo: "Instituição" }, { campo: "representante_nome", rotulo: "Representante" }, { campo: "geometria_tipo", rotulo: "Geometria" }, { campo: "criado_em", rotulo: "Cadastro" }];
  }

  function elegivel(item) {
    return STATUS_ELEGIVEIS.has(item.status);
  }

  function filtrados() {
    return ordenarUniverso(filtrarDemandas(universo.filter(elegivel), 'universo-filtro'));
  }

  function renderDemandas() {
    const tbody = $("#agrupamento-rows");
    const head = $("#agrupamento-head");
    const tipo = $("#agrupamento-tipo").value;
    if (!tipo) {
      head.innerHTML = "";
      tbody.innerHTML = '<tr><td>Selecione o tipo de demanda.</td></tr>';
      $("#agrupamento-contagem").textContent = resumoTabela(0, 0, 0);
      $("#agrupamento-pagina-info").textContent = "Página 1 de 1";
      atualizarComposicao();
      return;
    }
    const lista = filtrados();
    const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    pagina = Math.max(1, Math.min(pagina, totalPaginas));
    const inicio = (pagina - 1) * POR_PAGINA;
    const visiveis = lista.slice(inicio, inicio + POR_PAGINA);
    const cols = colunas();
    head.innerHTML = `<tr><th class="col-select"><input type="checkbox" id="agrupamento-selecionar-pagina" aria-label="Selecionar demandas elegíveis visíveis"></th>${cols.map((c) => `<th scope="col">${escapar(c.rotulo)}</th>`).join("")}</tr>`;
    tbody.innerHTML = visiveis.length ? visiveis.map((item) => `<tr data-id="${escapar(item.id)}"><td class="col-select"><input type="checkbox" data-demanda-id="${escapar(item.id)}" aria-label="Selecionar ${escapar(item.codigo)}"${SELECIONADOS.has(String(item.id)) ? " checked" : ""}></td>${cols.map((col) => `<td>${formatarValor(item, col.campo)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length + 1}" class="process-empty-row">Nenhuma demanda elegível encontrada.</td></tr>`;
    $("#agrupamento-contagem").textContent = resumoTabela(SELECIONADOS.size, visiveis.length, universo.filter(elegivel).length);
    $("#agrupamento-pagina-info").textContent = `Página ${pagina} de ${totalPaginas}`;
    $("#agrupamento-anterior").disabled = pagina <= 1;
    $("#agrupamento-proxima").disabled = pagina >= totalPaginas;
    const selectAll = $("#agrupamento-selecionar-pagina");
    selectAll.checked = visiveis.length > 0 && visiveis.every((item) => SELECIONADOS.has(String(item.id)));
    selectAll.indeterminate = visiveis.some((item) => SELECIONADOS.has(String(item.id))) && !selectAll.checked;
    selectAll.onchange = () => {
      visiveis.forEach((item) => selectAll.checked ? SELECIONADOS.add(String(item.id)) : SELECIONADOS.delete(String(item.id)));
      renderDemandas();
    };
    tbody.querySelectorAll("[data-demanda-id]").forEach((checkbox) => {
      checkbox.onchange = () => {
        checkbox.checked ? SELECIONADOS.add(checkbox.dataset.demandaId) : SELECIONADOS.delete(checkbox.dataset.demandaId);
        renderDemandas();
      };
    });
    atualizarComposicao();
  }

  async function carregarUniverso() {
    const tipo = $("#agrupamento-tipo").value;
    const revisao = ++universoRevisao;
    universo = [];
    campos = [];
    SELECIONADOS.clear();
    pagina = 1;
    limparErro();
    atualizarFiltroDemandas('universo-filtro', []);
    renderDemandas();
    renderComposicao();
    if (!tipo) return;
    $("#agrupamento-rows").innerHTML = '<tr><td>Carregando demandas…</td></tr>';
    try {
      const [itens, camposTipo] = await Promise.all([HierApi.listarUniverso(tipo, "todas"), HierApi.listarCamposUniverso(tipo)]);
      if (revisao !== universoRevisao) return;
      universo = itens;
      campos = camposTipo;
      atualizarFiltroDemandas('universo-filtro', universo.filter(elegivel));
      renderDemandas();
    } catch (error) {
      erro(error.message);
      $("#agrupamento-rows").innerHTML = '<tr><td>Não foi possível carregar o universo.</td></tr>';
    }
  }

  function renderGrupos() {
    const tbody = $("#agrupamentos-tbody");
    paginaGrupos = Math.max(1, Math.min(paginaGrupos, Math.ceil(gruposFiltrados().length / POR_PAGINA) || 1));
    const lista = recorte(gruposFiltrados(), paginaGrupos);
    tbody.innerHTML = lista.length ? lista.map((grupo) => `<tr data-ver-agrupamento="${escapar(grupo.id)}" tabindex="0" aria-label="Visualizar demandas do agrupamento ${escapar(grupo.codigo)}" title="Selecionar para visualizar as demandas"><td class="col-select"><input type="checkbox" data-grupo-id="${escapar(grupo.id)}" aria-label="Selecionar ${escapar(grupo.codigo)}"${gruposSelecionados.has(grupo.id) ? " checked" : ""}${grupoEditando || ocupado ? " disabled" : ""}></td><td><code>${escapar(grupo.codigo)}</code></td><td>${grupoEditando === grupo.id ? `<input id="grupo-nome-edicao" aria-label="Nome do agrupamento" maxlength="200" value="${escapar(grupo.nome)}">` : escapar(grupo.nome)}</td><td>${escapar(ROTULOS[grupo.tipo_demanda] || grupo.tipo_demanda)}</td><td>${Number(grupo.quantidade_demandas || 0)}</td><td>${escapar(formatarData(grupo.criado_em))}</td><td>${escapar(grupo.criado_por_nome || "\u2014")}</td></tr>`).join("") : '<tr><td colspan="7" class="agrupamentos-empty">Nenhum agrupamento cadastrado.</td></tr>';
    tbody.querySelectorAll('[data-grupo-id]').forEach(checkbox => {
      checkbox.onchange = () => {
        checkbox.checked ? gruposSelecionados.add(checkbox.dataset.grupoId) : gruposSelecionados.delete(checkbox.dataset.grupoId);
        controlesGrupos();
      };
    });
    controlesGrupos();
    tbody.querySelectorAll("[data-ver-agrupamento]").forEach((row) => {
      const visualizar = () => visualizarGrupo(row.dataset.verAgrupamento);
      row.onclick = event => { if (!grupoEditando && !event.target.closest("input, button, a, .col-select")) visualizar(); };
      row.onkeydown = (event) => {
        if (event.target !== row || grupoEditando) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        visualizar();
      };
    });
  }

  async function carregarGrupos() {
    $("#agrupamentos-tbody").innerHTML = '<tr><td colspan="7">Carregando agrupamentos…</td></tr>';
    try {
      grupos = await HierApi.listarAgrupamentos();
      const valor = $('#grupos-filtro-valor').value;
      valoresFiltroGrupo(); $('#grupos-filtro-valor').value = valor;
      renderGrupos();
    }
    catch (error) { erro(error.message, "#agrupamentos-error"); $("#agrupamentos-tbody").innerHTML = '<tr><td colspan="7">Não foi possível carregar os agrupamentos.</td></tr>'; }
  }

  function iniciar() {
    bindFiltroDemandas('universo-filtro', () => universo.filter(elegivel), SELECIONADOS, renderDemandas);
    bindFiltroDemandas('composicao-filtro', () => [...membrosGrupo.values()], membrosSelecionados, renderComposicao);
    $('#agrupamento-nome').oninput = renderComposicao;
    $('#grupo-adicionar').onclick = () => {
      if (grupoConfirmado || salvandoGrupo) return;
      universo.filter(item => elegivel(item) && SELECIONADOS.has(String(item.id))).forEach(item => membrosGrupo.set(String(item.id), item));
      $('#grupo-composicao').classList.remove('hidden');
      SELECIONADOS.clear(); renderDemandas(); renderComposicao();
    };
    $('#grupo-confirmar').onclick = () => {
      if (!membrosGrupo.size || salvandoGrupo) return;
      grupoConfirmado = true; membrosSelecionados.clear(); SELECIONADOS.clear();
      renderDemandas(); renderComposicao();
    };
    $('#grupo-editar').onclick = () => {
      if (salvandoGrupo) return;
      grupoConfirmado = false; renderDemandas(); renderComposicao();
    };
    $('#grupo-remover').onclick = () => {
      if (grupoConfirmado || salvandoGrupo) return;
      membrosSelecionados.forEach(id => membrosGrupo.delete(id));
      membrosSelecionados.clear(); renderComposicao();
    };
    $('#grupos-filtro-coluna').insertAdjacentHTML('beforeend', Object.entries(colunasGrupo).map(([key,label]) => `<option value="${key}">${escapar(label)}</option>`).join(''));
    const filtrar = () => { paginaGrupos = 1; gruposSelecionados.clear(); renderGrupos(); };
    $('#grupos-filtro-coluna').onchange = () => { valoresFiltroGrupo(); filtrar(); };
    $('#grupos-filtro-valor').onchange = filtrar;
    $('#grupos-filtro-inverter').onclick = event => { definirInversao(event.currentTarget, !inversaoAtiva(event.currentTarget)); filtrar(); };
    $('#grupos-filtro-limpar').onclick = () => {
      $('#grupos-filtro-coluna').value = ''; definirInversao($('#grupos-filtro-inverter'), false);
      valoresFiltroGrupo(); filtrar();
    };
    $('#grupos-selecionar-todos').onchange = event => {
      gruposSelecionados.clear();
      if (event.target.checked) recorte(gruposFiltrados(), paginaGrupos).forEach(g => gruposSelecionados.add(g.id));
      renderGrupos();
    };
    $('#grupos-controles').onclick = event => {
      const button = event.target.closest('[data-grupo-acao]');
      if (button && !button.disabled) acaoGrupo(button.dataset.grupoAcao);
    };
    const abrir = $("#agrupamento-editor");
    $("#agrupamento-new").onclick = () => {
      agrupamentoEmEdicao = null;
      $('#grupo-composicao').classList.add('hidden');
      $("#agrupamento-editor-title").textContent = "Novo agrupamento";
      $("#agrupamento-form").reset();
      for (const prefixo of ["universo-filtro", "composicao-filtro"]) definirInversao($(`#${prefixo}-inverter`), false);
      membrosGrupo.clear(); membrosSelecionados.clear(); grupoConfirmado = false;
      renderComposicao();
      SELECIONADOS.clear();
      pagina = 1;
      abrir.classList.remove("hidden");
      carregarUniverso();
      abrir.scrollIntoView({ behavior: "smooth", block: "start" });
      $("#agrupamento-nome").focus();
    };
    $("#agrupamento-cancel").onclick = () => { abrir.classList.add("hidden"); limparErro(); };
    $("#agrupamento-tipo").onchange = carregarUniverso;
    $("#agrupamento-anterior").onclick = () => { pagina -= 1; SELECIONADOS.clear(); renderDemandas(); };
    $("#agrupamento-proxima").onclick = () => { pagina += 1; SELECIONADOS.clear(); renderDemandas(); };
    window.SLTDemandasGrupo.bindModalClosures();
    $("#agrupamento-form").onsubmit = async (event) => {
      event.preventDefault();
      limparErro();
      if (salvandoGrupo) return;
      if (!grupoConfirmado || !membrosGrupo.size) return erro("Adicione as demandas à tabela do grupo e confirme os registros antes de salvar.");
      salvandoGrupo = true; atualizarComposicao();
      try {
        const payload = { nome: $("#agrupamento-nome").value.trim(), descricao: $("#agrupamento-descricao").value.trim() || null, tipo_demanda: $("#agrupamento-tipo").value, demanda_ids: [...membrosGrupo.keys()] };
        if (agrupamentoEmEdicao) await HierApi.atualizarAgrupamento(agrupamentoEmEdicao, payload);
        else await HierApi.criarAgrupamento(payload);
        abrir.classList.add("hidden");
        await carregarGrupos();
      } catch (error) { erro(error.message); }
      finally { salvandoGrupo = false; atualizarComposicao(); }
    };
    carregarGrupos();
    renderDemandas();
    renderComposicao();
  }

  (async () => {
    if (!(await SLTAdminAuth.requireAuth())) return;
    await SLTAdminLabels.init("/restrict/");
    iniciar();
  })().catch((error) => erro(error.message, "#agrupamentos-error"));
})();
