(function () {
  'use strict';
  const q = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const API = '/api/sei/documentos';
  const SITUACAO = {
    recebido: 'Recebido — campos ainda não lidos',
    sem_texto: 'Sem texto extraível',
    analisado: 'Campos lidos — aguardando revisão',
    demanda_criada: 'Demanda criada',
  };
  const ROTULOS = {
    nome: 'Nome / objeto', descricao: 'Descrição', instituicao_label: 'Instituição',
    instituicao_cnpj: 'CNPJ', representante_nome: 'Representante', representante_email: 'E-mail',
    representante_telefone: 'Telefone', municipio: 'Município', valor_global: 'Valor global',
    prazo_referencia_meses: 'Prazo (meses)', vigencia_inicio: 'Vigência — início',
    vigencia_fim: 'Vigência — fim', lat: 'Latitude', lng: 'Longitude',
    numero_processo: 'Número do processo',
  };

  async function request(path, options = {}) {
    const res = await fetch(path, { credentials: 'include', ...options });
    const body = await res.json().catch(() => null);
    if (res.status === 401) {
      location.replace(SLTAdminAuth.loginUrl());
      throw new Error('Sessão SICARD expirada.');
    }
    if (!res.ok) {
      const detail = body?.detail;
      throw new Error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(x => x.msg).join('; ') : 'Não foi possível concluir a operação.');
    }
    return body;
  }
  const post = (path, body) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });

  function aviso(id, texto) {
    q(id).textContent = texto || '';
    q(id).classList.toggle('hidden', !texto);
  }
  const dataHora = (iso) => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('pt-BR'); };
  const soDigitos = (v) => String(v || '').replace(/\D/g, '');

  function acoes(doc) {
    const botoes = [`<button type="button" class="btn btn-secondary btn-sm" data-acao="baixar">Abrir PDF</button>`];
    if (doc.status === 'recebido') botoes.unshift(`<button type="button" class="btn btn-secondary btn-sm" data-acao="analisar">Ler campos</button>`);
    if (doc.status === 'analisado' || doc.status === 'sem_texto') botoes.unshift(`<button type="button" class="btn btn-primary btn-sm" data-acao="revisar">Revisar e criar demanda</button>`);
    if (!doc.demanda_id) botoes.push(`<button type="button" class="btn btn-secondary btn-sm" data-acao="excluir">Excluir</button>`);
    return botoes.join(' ');
  }

  async function listar() {
    q('sei-btn-atualizar').disabled = true;
    aviso('sei-lista-aviso', 'Carregando documentos…');
    try {
      const documentos = await request(API);
      q('sei-documentos-body').replaceChildren();
      q('sei-documentos-vazio').classList.toggle('hidden', !!documentos.length);
      aviso('sei-lista-aviso', '');
      for (const doc of documentos) {
        const tr = document.createElement('tr');
        const situacao = SITUACAO[doc.status] || doc.status;
        const demanda = doc.demanda_id ? ` (${esc(doc.demanda_id)})` : '';
        tr.innerHTML = `<td>${esc(doc.nome_arquivo)}${doc.aviso ? `<br><span class="hint">${esc(doc.aviso)}</span>` : ''}</td>
          <td>${esc(doc.numero_processo || 'Não identificado')}</td>
          <td>${esc(doc.usuario_nome || '—')}</td>
          <td>${esc(dataHora(doc.criado_em))}</td>
          <td>${esc(situacao)}${demanda}</td>
          <td class="sei-acoes">${acoes(doc)}</td>`;
        tr.querySelectorAll('button[data-acao]').forEach(botao => {
          botao.onclick = () => executar(botao, doc, botao.dataset.acao);
        });
        q('sei-documentos-body').append(tr);
      }
    } catch (e) {
      aviso('sei-lista-aviso', e.message);
    } finally { q('sei-btn-atualizar').disabled = false; }
  }

  async function executar(botao, doc, acao) {
    if (acao === 'baixar') { window.open(`${API}/${doc.id}/arquivo`, '_blank', 'noopener'); return; }
    botao.disabled = true;
    try {
      if (acao === 'analisar') {
        await post(`${API}/${doc.id}/analisar`);
        SLTAdminUi.showToast('Campos lidos. Revise antes de criar a demanda.');
        await listar();
      } else if (acao === 'excluir') {
        const confirmado = await SLTAdminUi.showConfirm({
          title: 'Excluir documento', message: `Excluir ${doc.nome_arquivo} do repositório?`,
          confirmLabel: 'Excluir', danger: true,
        });
        if (!confirmado) return;
        await request(`${API}/${doc.id}`, { method: 'DELETE' });
        await listar();
      } else if (acao === 'revisar') {
        await revisar(doc.id);
      }
    } catch (e) {
      SLTAdminUi.showToast(e.message, true);
    } finally { botao.disabled = false; }
  }

  function selectHtml(id, label, list, labelFn, required = true) {
    return `<div class="form-field"><label for="${id}">${label}</label><select id="${id}" name="${id}" ${required ? 'required' : ''}><option value="">Selecione…</option>${list.map(x => `<option value="${esc(x.id)}">${esc(labelFn(x))}</option>`).join('')}</select></div>`;
  }

  function leituraHtml(detalhe) {
    const campos = detalhe.campos_sugeridos || {};
    const evidencias = detalhe.evidencias || {};
    const chaves = Object.keys(ROTULOS).filter(chave => chave in campos || chave === 'numero_processo' && detalhe.numero_processo);
    const linhas = chaves.map(chave => {
      const valor = chave === 'numero_processo' ? detalhe.numero_processo : campos[chave];
      const texto = chave === 'descricao' ? `${String(valor).slice(0, 400)}…` : valor;
      return `<tr><th scope="row">${esc(ROTULOS[chave])}</th><td>${esc(texto)}</td><td class="hint">${esc(evidencias[chave] || '')}</td></tr>`;
    }).join('');
    const ausentes = Object.keys(ROTULOS).filter(chave => !chaves.includes(chave)).map(chave => ROTULOS[chave]);
    return `<details class="sei-leitura"><summary>O que o sistema leu do PDF (${chaves.length} campos)</summary>
      <table class="admin-table sei-leitura-tabela"><tbody>${linhas || '<tr><td>Nenhum campo reconhecido.</td></tr>'}</tbody></table>
      ${ausentes.length ? `<p class="hint">Sem valor reconhecido, para você preencher: ${esc(ausentes.join(', '))}.</p>` : ''}</details>`;
  }

  async function revisar(documentoId) {
    const [detalhe, instituicoes, pessoas, catalog, planos] = await Promise.all([
      request(`${API}/${documentoId}`),
      SLTSigmaRead.listInstituicoes(), SLTSigmaRead.listPessoas(), SLTCatalog.loadCatalog(), SLTAdminApi.listPlanos(),
    ]);
    const campos = detalhe.campos_sugeridos || {};
    const cnpj = soDigitos(campos.instituicao_cnpj);
    const instituicaoSugerida = cnpj ? instituicoes.find(x => soDigitos(x.cnpj) === cnpj) : null;
    const body = `<p class="step-intro">Confira o que foi lido do PDF, complete o que ficou em branco e confirme. Nenhum valor é preenchido por aproximação.</p>
      ${detalhe.aviso ? `<p class="hint">${esc(detalhe.aviso)}</p>` : ''}
      ${leituraHtml(detalhe)}
      <form id="sei-revisao-form" class="form-grid sei-form">
        <div class="form-field"><label for="rev-tipo">Tipo de demanda</label><select id="rev-tipo"><option value="projeto">Projeto</option><option value="plano">Plano</option><option value="programa">Programa</option></select></div>
        <div class="form-field"><label for="rev-nome">Nome</label><input id="rev-nome" type="text" required maxlength="200" value="${esc(campos.nome || '')}"></div>
        <div class="form-field sei-full"><label for="rev-descricao">Descrição</label><textarea id="rev-descricao" rows="6" required>${esc(campos.descricao || '')}</textarea></div>
        ${selectHtml('rev-instituicao', 'Instituição', instituicoes, SLTSigmaRead.labelInstituicao)}
        ${selectHtml('rev-pessoa', 'Representante legal', pessoas, SLTSigmaRead.labelPessoa)}
        <div class="form-field sei-full" id="rev-vinculo-field"><label><input id="rev-vinculo" type="checkbox"> Vincular a um plano institucional</label></div>
        ${selectHtml('rev-diretoria', 'Diretoria', SLTCatalog.ativos(catalog.diretorias), x => x.nome_oficial)}
        ${selectHtml('rev-plano', 'Plano vinculado', planos, x => x.nome, false)}
        <div class="form-field" data-projeto><label for="rev-lat">Latitude</label><input id="rev-lat" type="number" min="-90" max="90" step="any" required value="${esc(campos.lat ?? '')}"></div>
        <div class="form-field" data-projeto><label for="rev-lng">Longitude</label><input id="rev-lng" type="number" min="-180" max="180" step="any" required value="${esc(campos.lng ?? '')}"></div>
        <div class="form-field" data-vigencia><label for="rev-vig-ini">Vigência — início</label><input id="rev-vig-ini" type="date" value="${esc(campos.vigencia_inicio || '')}"></div>
        <div class="form-field" data-vigencia><label for="rev-vig-fim">Vigência — fim</label><input id="rev-vig-fim" type="date" value="${esc(campos.vigencia_fim || '')}"></div>
        <div class="form-field"><label for="rev-valor">Valor global (R$)</label><input id="rev-valor" type="number" min="0" step="0.01" value="${esc(campos.valor_global ?? '')}"></div>
        <div class="form-field" data-projeto><label for="rev-prazo">Prazo de referência (meses)</label><input id="rev-prazo" type="number" min="0" step="1" value="${esc(campos.prazo_referencia_meses ?? '')}"></div>
        <p class="hint sei-full" data-projeto>Informe as coordenadas reais do projeto. Valores ausentes não são substituídos por zero.</p>
      </form><p id="sei-revisao-erro" class="hint" role="alert"></p>`;
    const modal = SLTAdminUi.openModal(`Revisar ${esc(detalhe.nome_arquivo)}`, body, '<button type="button" class="btn btn-primary" id="sei-confirmar">Confirmar e criar demanda</button>');
    const f = id => modal.querySelector('#' + id);
    if (instituicaoSugerida) f('rev-instituicao').value = String(instituicaoSugerida.id);
    function ajustar() {
      const t = f('rev-tipo').value, vinculo = f('rev-vinculo').checked;
      modal.querySelectorAll('[data-projeto]').forEach(el => {
        el.hidden = t !== 'projeto';
        el.querySelectorAll('input').forEach(input => { input.disabled = t !== 'projeto'; });
      });
      modal.querySelectorAll('[data-vigencia]').forEach(el => { el.hidden = t === 'programa'; });
      f('rev-vinculo-field').hidden = t === 'plano';
      f('rev-plano').closest('.form-field').hidden = t === 'plano' || !vinculo;
      f('rev-plano').required = t !== 'plano' && vinculo;
      f('rev-diretoria').closest('.form-field').hidden = t !== 'plano';
      f('rev-diretoria').required = t === 'plano';
    }
    f('rev-tipo').onchange = ajustar;
    f('rev-vinculo').onchange = ajustar;
    ajustar();
    f('sei-confirmar').onclick = async () => {
      if (!f('sei-revisao-form').reportValidity()) return;
      const tipoDemanda = f('rev-tipo').value;
      const inst = instituicoes.find(x => String(x.id) === f('rev-instituicao').value);
      const pessoa = pessoas.find(x => String(x.id) === f('rev-pessoa').value);
      const plano = planos.find(x => String(x.id) === f('rev-plano').value);
      const vinculo = f('rev-vinculo').checked && tipoDemanda !== 'plano';
      const numero = (v) => (String(v).trim() === '' ? null : Number(v));
      const payload = {
        nome: f('rev-nome').value.trim(), descricao: f('rev-descricao').value.trim(),
        instituicao_id: String(inst.id), instituicao_label: SLTSigmaRead.labelInstituicao(inst),
        instituicao_cnpj: inst.cnpj || null,
        pessoa_id: String(pessoa.id),
        representante: {
          pessoa_id: String(pessoa.id), nome: SLTSigmaRead.labelPessoa(pessoa),
          email: campos.representante_email || null, telefone: campos.representante_telefone || null,
        },
        valor_global: numero(f('rev-valor').value),
      };
      if (tipoDemanda !== 'programa') {
        payload.vigencia_inicio = f('rev-vig-ini').value || null;
        payload.vigencia_fim = f('rev-vig-fim').value || null;
      }
      if (tipoDemanda === 'projeto') {
        Object.assign(payload, {
          lat: Number(f('rev-lat').value), lng: Number(f('rev-lng').value),
          diretoria_id: vinculo ? plano.diretoria_id : '', plano_id: vinculo ? plano.id : '',
          vinculo_institucional: vinculo, vinculo_tipo: vinculo ? 'plano' : null,
        });
        const prazo = numero(f('rev-prazo').value);
        if (prazo !== null) payload.atributos_cadastrais = { prazo_referencia_meses: prazo };
      }
      if (tipoDemanda === 'plano') payload.diretoria_id = f('rev-diretoria').value;
      if (tipoDemanda === 'programa') Object.assign(payload, { vinculo_institucional: vinculo, plano_codigo: vinculo ? plano.id : null });
      f('sei-confirmar').disabled = true;
      f('sei-revisao-erro').textContent = '';
      try {
        const criada = await post(`${API}/${documentoId}/criar-demanda`, { tipo_demanda: tipoDemanda, campos: payload });
        SLTAdminUi.closeModal();
        SLTAdminUi.showToast(criada.ja_existia ? `Este documento já havia gerado a demanda ${criada.id}.` : `Demanda ${criada.id} criada a partir do PDF do SEI.`);
        await listar();
      } catch (e) {
        f('sei-revisao-erro').textContent = e.message;
        f('sei-confirmar').disabled = false;
      }
    };
  }

  async function enviar(event) {
    event.preventDefault();
    const entrada = q('sei-arquivos');
    if (!entrada.files.length) return;
    const dados = new FormData();
    for (const arquivo of entrada.files) dados.append('arquivos', arquivo);
    q('sei-btn-enviar').disabled = true;
    aviso('sei-upload-aviso', 'Enviando…');
    try {
      const resultado = await request(API, { method: 'POST', body: dados });
      entrada.value = '';
      const recusados = (resultado.erros || []).map(e => `${e.arquivo}: ${e.mensagem}`).join(' ');
      aviso('sei-upload-aviso', `${resultado.recebidos.length} documento(s) recebido(s).${recusados ? ' Recusados — ' + recusados : ''}`);
      await listar();
    } catch (e) {
      aviso('sei-upload-aviso', e.message);
    } finally { q('sei-btn-enviar').disabled = false; }
  }

  async function analisarTodos() {
    q('sei-btn-analisar-todos').disabled = true;
    aviso('sei-upload-aviso', 'Lendo os campos dos documentos pendentes…');
    try {
      const resultado = await post(`${API}/analisar`);
      aviso('sei-upload-aviso', `${resultado.analisados.length} documento(s) analisado(s); ${resultado.ignorados.length} sem leitura possível ou já analisado(s).`);
      await listar();
    } catch (e) {
      aviso('sei-upload-aviso', e.message);
    } finally { q('sei-btn-analisar-todos').disabled = false; }
  }

  async function init() {
    if (!await SLTAdminAuth.requireAuth()) return;
    q('sei-upload-form').onsubmit = enviar;
    q('sei-btn-analisar-todos').onclick = analisarTodos;
    q('sei-btn-atualizar').onclick = listar;
    await listar();
  }
  init().catch(e => SLTAdminUi.showToast(e.message, true));
})();
