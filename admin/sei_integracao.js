(function () {
  'use strict';
  const q = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let tipo = 'externo', conectado = false, lembrada = false, geracao = 0;

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
  function captcha(dados) {
    q('sei-captcha-field').classList.toggle('hidden', !dados.captcha_pendente);
    q('sei-captcha').value = '';
    q('sei-captcha').required = !!dados.captcha_pendente;
    if (dados.captcha_imagem_base64) q('sei-captcha-img').src = `data:image/png;base64,${dados.captcha_imagem_base64}`;
    else q('sei-captcha-img').removeAttribute('src');
  }
  function mostrarTipo(novo) {
    tipo = novo;
    q('sei-login-tabs').querySelectorAll('button').forEach(b => {
      b.classList.toggle('is-active', b.dataset.tipoLogin === tipo);
      b.setAttribute('aria-selected', String(b.dataset.tipoLogin === tipo));
      b.disabled = conectado;
    });
    document.querySelectorAll('[data-campo-login]').forEach(field => {
      const ativo = field.dataset.campoLogin === tipo;
      field.classList.toggle('hidden', !ativo);
      field.querySelectorAll('input,select').forEach(input => { input.disabled = !ativo || conectado; input.required = ativo && !lembrada; });
    });
  }
  async function carregarFormulario() {
    const rodada = ++geracao;
    q('sei-btn-conectar').disabled = true;
    try {
      const dados = await request(`/api/sei/login-form?tipo_login=${tipo}`);
      if (rodada !== geracao) return;
      q('sei-orgao').innerHTML = '<option value="">Selecione…</option>';
      dados.orgaos.forEach(o => q('sei-orgao').add(new Option(o.label, o.value)));
      captcha(dados);
      q('sei-btn-conectar').disabled = false;
    } catch (e) {
      aviso('sei-conexao-aviso', e.message + ' Selecione novamente o tipo de acesso para tentar carregar o formulário.');
    }
  }
  function renderStatus(s) {
    conectado = s.conectado;
    lembrada = s.lembrada;
    q('sei-status').textContent = conectado ? `Status: conectado como ${s.identificacao} (${s.tipo_login})` : `Status: ${s.erro || (s.captcha_pendente ? 'aguardando código da imagem' : 'desconectado')}`;
    q('sei-btn-desconectar').classList.toggle('hidden', !conectado);
    q('sei-btn-esquecer').classList.toggle('hidden', !lembrada);
    q('sei-btn-conectar').classList.toggle('hidden', conectado);
    q('sei-senha').disabled = conectado;
    q('sei-senha').required = !lembrada && !conectado;
    q('sei-senha').placeholder = lembrada ? 'Deixe em branco para usar a credencial salva' : '';
    q('sei-processos-section').hidden = !conectado;
    aviso('sei-conexao-aviso', s.aviso);
    mostrarTipo(s.tipo_login || tipo);
    captcha(s);
  }
  async function listar() {
    q('sei-btn-atualizar').disabled = true;
    q('sei-processos-body').replaceChildren();
    aviso('sei-processos-aviso', 'Consultando processos…');
    q('sei-processos-vazio').classList.add('hidden');
    try {
      const r = await request('/api/sei/processos');
      aviso('sei-processos-aviso', r.aviso);
      q('sei-processos-vazio').classList.toggle('hidden', !!r.processos.length);
      for (const p of r.processos) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${esc(p.numero)}</td><td>${esc(p.interessado || p.tipo || 'Não informado')}</td><td>${esc(p.data || 'Não informada')}</td><td>Projeto (revisável)</td><td><button type="button" class="btn btn-secondary btn-sm">Revisar e criar demanda</button></td>`;
        tr.querySelector('button').onclick = async (e) => {
          e.target.disabled = true;
          try { await revisar(p); } catch (err) { SLTAdminUi.showToast(err.message, true); }
          finally { e.target.disabled = false; }
        };
        q('sei-processos-body').append(tr);
      }
    } catch (e) {
      aviso('sei-processos-aviso', e.message);
      renderStatus(await request('/api/sei/status'));
    } finally { q('sei-btn-atualizar').disabled = false; }
  }
  function selectHtml(id, label, list, labelFn, required = true) {
    return `<div class="form-field"><label for="${id}">${label}</label><select id="${id}" name="${id}" ${required ? 'required' : ''}><option value="">Selecione…</option>${list.map(x => `<option value="${esc(x.id)}">${esc(labelFn(x))}</option>`).join('')}</select></div>`;
  }
  async function revisar(p) {
    const [detalhe, instituicoes, pessoas, catalog, planos] = await Promise.all([
      request(`/api/sei/processo?numero=${encodeURIComponent(p.numero)}`),
      SLTSigmaRead.listInstituicoes(), SLTSigmaRead.listPessoas(), SLTCatalog.loadCatalog(), SLTAdminApi.listPlanos(),
    ]);
    const body = `<p class="step-intro">Confira o conteúdo do processo, escolha o tipo de demanda e complete os dados do cadastro. A sugestão inicial é Projeto; os vínculos e a localização exigem sua revisão.</p>
      ${detalhe.aviso ? `<p class="hint">${esc(detalhe.aviso)}</p>` : ''}
      <details><summary>Conteúdo consultado (${detalhe.documentos.length} páginas/documentos)</summary><div class="sei-documentos">${esc(detalhe.descricao || 'Sem texto extraível. Confira o documento no SEI.')}</div></details>
      <form id="sei-revisao-form" class="form-grid sei-form">
        <div class="form-field"><label for="rev-tipo">Tipo de demanda</label><select id="rev-tipo"><option value="projeto">Projeto</option><option value="plano">Plano</option><option value="programa">Programa</option></select></div>
        <div class="form-field"><label for="rev-nome">Nome</label><input id="rev-nome" type="text" required maxlength="200" value="${esc(detalhe.nome)}"></div>
        <div class="form-field sei-full"><label for="rev-descricao">Descrição</label><textarea id="rev-descricao" rows="6" required>${esc(detalhe.descricao)}</textarea></div>
        ${selectHtml('rev-instituicao', 'Instituição', instituicoes, SLTSigmaRead.labelInstituicao)}
        ${selectHtml('rev-pessoa', 'Representante legal', pessoas, SLTSigmaRead.labelPessoa)}
        <div class="form-field sei-full" id="rev-vinculo-field"><label><input id="rev-vinculo" type="checkbox"> Vincular a um plano institucional</label></div>
        ${selectHtml('rev-diretoria', 'Diretoria', SLTCatalog.ativos(catalog.diretorias), x => x.nome_oficial)}
        ${selectHtml('rev-plano', 'Plano vinculado', planos, x => x.nome, false)}
        <div class="form-field" data-projeto><label for="rev-lat">Latitude</label><input id="rev-lat" type="number" min="-90" max="90" step="any" required></div>
        <div class="form-field" data-projeto><label for="rev-lng">Longitude</label><input id="rev-lng" type="number" min="-180" max="180" step="any" required></div>
        <p class="hint sei-full" data-projeto>Informe as coordenadas reais do projeto. Valores ausentes não são substituídos por zero.</p>
      </form><p id="sei-revisao-erro" class="hint" role="alert"></p>`;
    const modal = SLTAdminUi.openModal(`Revisar processo ${esc(p.numero)}`, body, '<button type="button" class="btn btn-primary" id="sei-confirmar">Confirmar e criar demanda</button>');
    const f = id => modal.querySelector('#' + id);
    function ajustar() {
      const t = f('rev-tipo').value, vinculo = f('rev-vinculo').checked;
      modal.querySelectorAll('[data-projeto]').forEach(el => {
        el.hidden = t !== 'projeto';
        el.querySelectorAll('input').forEach(input => { input.disabled = t !== 'projeto'; });
      });
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
      const campos = {
        nome: f('rev-nome').value.trim(), descricao: f('rev-descricao').value.trim(),
        instituicao_id: String(inst.id), instituicao_label: SLTSigmaRead.labelInstituicao(inst),
        pessoa_id: String(pessoa.id), representante: { pessoa_id: String(pessoa.id), nome: SLTSigmaRead.labelPessoa(pessoa) },
      };
      if (tipoDemanda === 'projeto') Object.assign(campos, { lat: Number(f('rev-lat').value), lng: Number(f('rev-lng').value), diretoria_id: vinculo ? plano.diretoria_id : '', plano_id: vinculo ? plano.id : '', vinculo_institucional: vinculo, vinculo_tipo: vinculo ? 'plano' : null });
      if (tipoDemanda === 'plano') campos.diretoria_id = f('rev-diretoria').value;
      if (tipoDemanda === 'programa') Object.assign(campos, { vinculo_institucional: vinculo, plano_codigo: vinculo ? plano.id : null });
      f('sei-confirmar').disabled = true;
      f('sei-revisao-erro').textContent = '';
      try {
        const criada = await post(`/api/sei/processos/${encodeURIComponent(p.numero)}/criar-demanda`, { tipo_demanda: tipoDemanda, campos });
        SLTAdminUi.closeModal();
        SLTAdminUi.showToast(`Demanda ${criada.id} criada a partir do SEI.`);
      } catch (e) {
        f('sei-revisao-erro').textContent = e.message;
        f('sei-confirmar').disabled = false;
      }
    };
  }
  async function init() {
    if (!await SLTAdminAuth.requireAuth()) return;
    q('sei-login-tabs').querySelectorAll('button').forEach(b => b.onclick = async () => {
      if (conectado) return;
      lembrada = false;
      q('sei-senha').value = '';
      q('sei-senha').required = true;
      mostrarTipo(b.dataset.tipoLogin);
      await carregarFormulario();
    });
    q('sei-conectar-form').onsubmit = async (e) => {
      e.preventDefault();
      q('sei-btn-conectar').disabled = true;
      try {
        const s = await post('/api/sei/conectar', { tipo_login: tipo, usuario: q('sei-usuario').value, email: q('sei-email').value, orgao: q('sei-orgao').value || null, senha: q('sei-senha').value || null, captcha: q('sei-captcha').value || null, lembrar_credencial: q('sei-lembrar').checked });
        renderStatus(s);
        if (s.conectado) { q('sei-senha').value = ''; await listar(); }
      } catch (err) { aviso('sei-conexao-aviso', err.message); }
      finally { q('sei-btn-conectar').disabled = false; }
    };
    const disconnect = async (forget) => {
      try {
        await post('/api/sei/desconectar' + (forget ? '?esquecer_credencial=true' : ''));
        renderStatus(await request('/api/sei/status'));
        await carregarFormulario();
      } catch (e) { aviso('sei-conexao-aviso', e.message); }
    };
    q('sei-btn-desconectar').onclick = () => disconnect(false);
    q('sei-btn-esquecer').onclick = () => disconnect(true);
    q('sei-btn-atualizar').onclick = listar;
    const s = await request('/api/sei/status');
    renderStatus(s);
    if (s.conectado) await listar();
    else {
      await carregarFormulario();
      if (s.lembrada) {
        q(tipo === 'interno' ? 'sei-usuario' : 'sei-email').value = s.identificacao || '';
        q('sei-orgao').value = s.orgao_selecionado || '';
      }
    }
  }
  init().catch(e => SLTAdminUi.showToast(e.message, true));
})();
