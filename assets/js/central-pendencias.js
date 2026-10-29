(function () {
  'use strict';
  const get = id => document.getElementById(id);
  const api = '/api/complementacao/solicitacoes';
  const labels = { dados_cadastrais: 'Dados cadastrais', geometria: 'Geometria', atributos_objeto: 'Atributos da demanda' };
  const feedback = text => { get('pendencias-feedback').textContent = text; };
  const text = value => value == null || value === '' ? 'Não registrado' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  const request = async (url, method = 'GET', body) => {
    const response = await fetch(url, { credentials: 'include', method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Não foi possível concluir a operação.');
    return data;
  };
  const date = value => value ? new Date(value).toLocaleString('pt-BR') : 'Não registrado';
  const notified = row => row.notificacao?.status === 'aceito_smtp'
    || row.notificacao?.entrega_status === 'confirmada' || row.notificacao?.leitura_status === 'confirmada';
  const canCollect = row => Boolean(row?.id && ['aceito_smtp', 'indeterminado', 'enviando'].includes(row.notificacao?.status));
  const receipt = value => ({ confirmada: 'Confirmada', falha: 'Falha', adiada: 'Adiada' })[value] || 'Sem confirmação';
  const notifyLabel = row => ({
    enviando: 'Enviando', aceito_smtp: 'Aceito pelo SMTP', indeterminado: 'Resultado indeterminado',
    erro: 'Falha no envio', sem_destinatario: 'Destinatário inválido',
  })[row.notificacao?.status] || 'Não enviado';
  const fulfillment = row => row.cumprimento_status === 'cumprida' || row.status === 'atendida' ? 'Cumprida'
    : Object.keys(row.categorias_salvas || {}).length ? `Em atendimento (${row.categorias_atendidas ?? Object.keys(row.categorias_salvas).length}/${row.categorias.length} categorias salvas)`
      : 'Não iniciada';
  const pendingNames = row => row.pendencias_detalhadas?.length
    ? row.pendencias_detalhadas.map(item => item.nome).join(', ')
    : row.pendencias_atributos?.length ? `${row.pendencias_atributos.length} atributos a preencher`
      : row.categorias.includes('atributos_objeto') ? 'Lista de atributos não disponível neste contexto' : 'Não se aplica';
  const rowKey = row => row.id || JSON.stringify([row.demanda_tipo, row.demanda_codigo, row.hierarquizacao_codigo]);
  const detailUrl = row => '/restrict/solicitacao-complementacao/?' + (row.id
    ? 'id=' + encodeURIComponent(row.id)
    : new URLSearchParams({ tipo: row.demanda_tipo, codigo: row.demanda_codigo,
      ...(row.hierarquizacao_codigo ? { hierarquizacao_codigo: row.hierarquizacao_codigo } : {}) }).toString());
  function definition(id, fields) {
    const dl = typeof id === 'string' ? get(id) : id;
    dl.replaceChildren();
    fields.forEach(([label, value]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = text(value); dl.append(dt, dd);
    });
  }
  function notificationPreview(panel, reload, setBusy = () => {}) {
    let current, busy = false, generation = 0;
    const send = panel.querySelector('[data-send]'), close = panel.querySelector('[data-close]');
    const review = panel.querySelector('[data-review-panel]'), check = panel.querySelector('[data-review-check]'),
      confirmReview = panel.querySelector('[data-review-confirm]');
    function reviewControls() {
      const state = current?.previa.parecer_revisao;
      send.disabled = busy || !current || current.blocked || Boolean(state && (!state.atualizado || !state.revisado));
      confirmReview.disabled = busy || !current || current.blocked || !check.checked || !state?.atualizado || state.revisado;
      check.disabled = busy || Boolean(current?.blocked);
    }
    check.onchange = reviewControls;
    confirmReview.onclick = async () => {
      if (!current || confirmReview.disabled) return;
      busy = true; reviewControls();
      try {
        await request(api + '/' + encodeURIComponent(current.id) + '/parecer/revisar', 'POST',
          { assinatura: current.previa.parecer_revisao.pdf_sha256, confirmado: true });
        await reload();
        feedback('Revisão registrada. O envio da notificação está liberado para este parecer.');
      } catch (error) { feedback(error.message); }
      finally { busy = false; reviewControls(); }
    };
    function hide() { generation++; panel.hidden = true; current = null; }
    close.onclick = hide;
    send.onclick = async () => {
      if (!current || busy || send.disabled) return;
      const { id, previa } = current;
      busy = true; setBusy(true); send.disabled = close.disabled = true;
      const tarefa = 'Aguardando confirmação do servidor de e-mail';
      const processo = ProcessFeedback.iniciarCadastro({ title: 'Enviando notificação', tasks: [tarefa] });
      processo.tarefaAtual(tarefa);
      let accepted = false;
      try {
        const result = await request(api + '/' + encodeURIComponent(id) + '/notificar', 'POST', { assinatura: previa.assinatura });
        accepted = result.status === 'aceito_smtp';
        if (!result.status || !result.detalhe) throw new Error('O servidor não confirmou o resultado. Consulte a notificação antes de tentar novamente.');
        processo.concluirTarefa(tarefa);
        await reload();
        const message = `${result.status}: ${result.detalhe}`;
        feedback(message);
        if (accepted) processo.sucesso({ title: 'Notificação aceita pelo servidor', message: message + ' Entrega e leitura dependem das confirmações.' });
        else processo.erro({ message });
        if (!close.hidden) hide();
      } catch (error) {
        const message = error.message + (accepted ? ' O envio foi aceito, mas a tela não foi atualizada. Não reenvie.' : ' Confira o estado da notificação antes de tentar novamente.');
        feedback(message);
        if (accepted) processo.sucesso({ _status: 'partial', title: 'Envio aceito; atualização incompleta', message });
        else processo.erro({ message });
        if (!close.hidden) hide();
        else if (current) current.blocked = true;
      } finally { busy = false; setBusy(false); close.disabled = false; reviewControls(); }
    };
    return {
      hide,
      async show(row, scroll = true) {
        hide();
        const version = generation;
        try {
          const previa = await request(api + '/' + encodeURIComponent(row.id) + '/previsualizacao');
          if (version !== generation) return;
          current = { id: row.id, previa, blocked: !row.pode_editar
            || ['enviando', 'aceito_smtp', 'indeterminado'].includes(row.notificacao?.status) };
          review.hidden = !previa.parecer_revisao;
          check.checked = false;
          panel.querySelector('[data-review-status]').textContent = previa.parecer_revisao
            ? !previa.parecer_revisao.atualizado ? 'Parecer desatualizado. Atualize o texto e o PDF antes da revisão.'
              : previa.parecer_revisao.revisado ? 'Revisão confirmada para esta versão.' : 'Revisão obrigatória antes do envio.'
            : '';
          reviewControls();
          definition(panel.querySelector('[data-preview-context]'), [
            ['Demanda', row.demanda_codigo], ['Destinatário', previa.destinatario], ['Assunto', previa.assunto],
            ['Anexo', previa.anexo_nome],
          ]);
          panel.querySelector('[data-preview-text]').replaceChildren(...previa.texto.split(/\n\s*\n/).map(texto => {
            const paragraph = document.createElement('p'); paragraph.textContent = texto; return paragraph;
          }));
          panel.querySelector('[data-preview-sha]').textContent = previa.anexo_sha256;
          const pdf = panel.querySelector('[data-preview-pdf]');
          pdf.hidden = !row.parecer_pdf_url;
          if (row.parecer_pdf_url) pdf.href = row.parecer_pdf_url;
          panel.hidden = false;
          if (scroll) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) { feedback(error.message); }
      },
    };
  }
  async function detail() {
    const params = new URLSearchParams(location.search);
    let id = params.get('id');
    if (!id && (!params.get('tipo') || !params.get('codigo'))) {
      feedback('Selecione uma demanda pela central de pendências.'); return;
    }
    let row, busy = false;
    const form = get('solicitacao-form');
    const payload = () => ({
      revisao: row.revisao, descricao: get('solicitacao-descricao').value,
      categorias: [...form.querySelectorAll('[name=categoria]:checked')].map(e => e.value),
      parecer_tecnico: get('solicitacao-parecer').value, mensagem_gestor: get('solicitacao-mensagem').value,
    });
    const controls = () => {
      const editable = row?.pode_editar && !busy;
      get('solicitacao-campos').disabled = !editable;
      get('solicitacao-salvar').disabled = !editable;
      get('solicitacao-recarregar').disabled = busy;
      const status = row?.notificacao?.status;
      get('solicitacao-notificar').disabled = !editable || !row.id || !row.tem_parecer_pdf
        || (row.categorias.includes('atributos_objeto') && !row.mensagem_gestor?.trim())
        || ['enviando', 'aceito_smtp', 'indeterminado'].includes(status)
        || JSON.stringify(payload()) !== JSON.stringify(saved);
      get('solicitacao-confirmacoes').disabled = busy || !row?.pode_consultar_confirmacoes || !canCollect(row);
    };
    let saved;
    const preview = notificationPreview(get('solicitacao-previa'), load, value => { busy = value; controls(); });
    async function load() {
      preview.hide();
      row = await request(id ? api + '/' + encodeURIComponent(id) : api + '/contexto?' + params.toString());
      if (row.id) {
        id = row.id;
        history.replaceState(null, '', detailUrl(row));
      }
      get('solicitacao-descricao').value = row.descricao;
      get('solicitacao-parecer').value = row.parecer_tecnico || '';
      get('solicitacao-mensagem').value = row.mensagem_gestor || '';
      get('solicitacao-mensagem').closest('.form-field').hidden = !row.categorias.includes('atributos_objeto');
      const attributes = row.categorias.includes('atributos_objeto');
      document.querySelectorAll('[data-attributes-section]').forEach(section => { section.hidden = !attributes && Boolean(row.id); });
      get('solicitacao-cadastro-parecer').hidden = attributes;
      get('solicitacao-abrir-analise').href = '/restrict/demanda/?' + new URLSearchParams({ tipo: row.demanda_tipo, id: row.demanda_codigo });
      get('solicitacao-atualizar-parecer').disabled = busy || !row.id || !row.pode_editar;
      get('solicitacao-titulo').textContent = attributes ? 'Solicitar complementação de atributos' : 'Gerenciar pendência de cadastro e geometria';
      form.querySelectorAll('[name=categoria]').forEach(e => {
        e.checked = row.categorias.includes(e.value);
        const attributes = Boolean(row.hierarquizacao_codigo);
        e.disabled = attributes !== (e.value === 'atributos_objeto') || Object.keys(row.categorias_salvas || {}).length > 0;
        e.closest('label').hidden = attributes !== (e.value === 'atributos_objeto');
      });
      definition('solicitacao-contexto', [
        ['Tipo de demanda', ({ projeto: 'Projeto', programa: 'Programa', plano: 'Plano' })[row.demanda_tipo]],
        ['Código', row.demanda_codigo], ['Demanda', row.demanda_nome],
        ['Situação atual', row.demanda_status_nome || 'Não informada'],
        ...(attributes ? [['Hierarquização', row.hierarquizacao_nome || 'Nome não informado'],
          ['Código da hierarquização', row.hierarquizacao_codigo]] : []),
        ['Representante', row.demanda_solicitante || row.representante_nome], ['E-mail do representante', row.representante_email],
        ['Cadastro solicitado em', row.demanda_solicitado_em ? date(row.demanda_solicitado_em) : ''],
      ]);
      get('solicitacao-pendencias').hidden = !attributes;
      const pendingList = get('solicitacao-pendencias-lista');
      pendingList.replaceChildren();
      const items = row.pendencias_detalhadas || [];
      if (items.length) {
        [...new Set(items.map(item => item.grupo || 'Atributos da demanda'))].forEach(group => {
          const article = document.createElement('article'), title = document.createElement('h2'), list = document.createElement('ul');
          article.className = 'ahp-subcard';
          title.className = 'ahp-subsection-title'; title.textContent = group;
          items.filter(item => (item.grupo || 'Atributos da demanda') === group).forEach(item => {
            const li = document.createElement('li'), name = document.createElement('strong');
            const showUnit = item.unidade && !item.nome.toLocaleLowerCase('pt-BR').includes(item.unidade.toLocaleLowerCase('pt-BR'));
            name.textContent = item.nome + (showUnit ? ` (${item.unidade})` : '');
            li.append(name);
            if (item.descricao && item.descricao !== item.nome) {
              const description = document.createElement('p'); description.className = 'form-help';
              description.textContent = item.descricao; li.append(description);
            }
            list.append(li);
          });
          article.append(title, list); pendingList.append(article);
        });
      } else {
        const message = document.createElement('p');
        message.className = 'form-help'; message.textContent = pendingNames(row);
        pendingList.append(message);
      }
      const pdf = get('solicitacao-pdf');
      pdf.hidden = !row.tem_parecer_pdf;
      if (row.parecer_pdf_url) pdf.href = row.parecer_pdf_url;
      get('solicitacao-pdf-status').textContent = row.tem_parecer_pdf
        ? 'O envio inclui o PDF já gerado na análise da demanda. O texto interno abaixo não será anexado.'
        : 'Parecer PDF não gerado. Gere-o na análise da demanda antes de enviar a notificação.';
      definition('solicitacao-auditoria', [
        ['Pedido', row.id ? row.status === 'atendida' ? 'Atendido' : 'Registrado — não comprova envio' : 'Ainda não registrado'],
        ['Pendência registrada por', row.solicitado_por ? row.solicitado_nome : 'Autoria não registrada'],
        ['Pendência registrada em', row.solicitado_em ? date(row.solicitado_em) : ''],
        ['Status da notificação', notifyLabel(row)], ['Notificado por', notified(row) ? row.notificacao?.por_nome : ''],
        ['Notificado em', row.notificacao?.enviado_em ? date(row.notificacao.enviado_em) : ''],
        ['Destinatário', row.notificacao?.destinatario], ['Entrega', receipt(row.notificacao?.entrega_status)],
        ['Abertura do e-mail', receipt(row.notificacao?.leitura_status)], ['Cumprimento da pendência', fulfillment(row)],
        ['Atendimento concluído em', date(row.atendido_em)],
        ['Categorias preenchidas', Object.keys(row.categorias_salvas || {}).map(c => labels[c] || 'Categoria não identificada').join(', ') || 'Nenhuma'],
        ['Revisão', row.revisao], ['Última atualização', date(row.atualizado_em)],
      ]);
      get('solicitacao-dados-tecnicos').textContent = text(row);
      const historyList = get('solicitacao-historico');
      historyList.replaceChildren();
      (row.historico_edicoes || []).forEach(event => {
        const details = document.createElement('details'), summary = document.createElement('summary'), values = document.createElement('dl');
        summary.textContent = `${event.origem === 'migracao_154' ? 'Correção da nomenclatura do registro' : 'Alteração do pedido'} — ${date(event.em)} — revisão ${event.revisao}`;
        values.className = 'notificacao-resumo';
        const fieldLabels = { descricao: 'Motivo anterior', mensagem_gestor: 'Mensagem anterior ao representante',
          parecer_tecnico: 'Anotações internas anteriores', categorias: 'Categorias anteriores', status: 'Situação anterior do registro' };
        definition(values, Object.entries(event.valores || {}).map(([key, value]) => [
          fieldLabels[key] || 'Campo de configuração',
          key === 'categorias' && Array.isArray(value) ? value.map(c => labels[c] || 'Categoria não identificada').join(', ')
            : key === 'status' ? 'Registro anterior à atualização de nomenclatura' : value,
        ]));
        details.append(summary, values); historyList.append(details);
      });
      saved = payload();
      controls();
      feedback(row.migracao_pendente ? 'A edição depende da aplicação da migração 153 no banco. Consulta disponível em modo somente leitura.'
        : row.impedimento || (row.status === 'nao_solicitada'
          ? 'Pendência identificada automaticamente. Preencha e salve para registrar a solicitação; o envio será uma ação separada.'
          : row.pode_editar ? 'Solicitação carregada. As anotações técnicas permanecem internas; o PDF enviado é o da análise.' : 'Solicitação em modo somente leitura.'));
      if (!attributes && row.id) {
        get('solicitacao-previa').querySelector('[data-close]').hidden = true;
        await preview.show(row, false);
      }
    }
    form.addEventListener('input', controls);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      busy = true; controls(); feedback('Salvando solicitação…');
      try {
        if (row.id) {
          await request(api + '/' + encodeURIComponent(id), 'PATCH', payload());
        } else {
          const { revisao, ...content } = payload();
          const created = await request(api, 'POST', { ...content, demanda_tipo: row.demanda_tipo,
            demanda_codigo: row.demanda_codigo, hierarquizacao_codigo: row.hierarquizacao_codigo });
          id = created.id;
          history.replaceState(null, '', detailUrl(created));
        }
        await load(); feedback('Solicitação salva. Nenhum e-mail foi enviado.');
      }
      catch (error) { feedback(error.message); }
      finally { busy = false; controls(); }
    });
    get('solicitacao-recarregar').onclick = () => load().catch(e => feedback(e.message));
    get('solicitacao-atualizar-parecer').onclick = async () => {
      if (busy) return;
      busy = true; controls(); get('solicitacao-atualizar-parecer').disabled = true;
      const task = 'Gerando versão do parecer e do PDF';
      const process = ProcessFeedback.iniciarCadastro({ title: 'Atualizando parecer', tasks: [task] });
      process.tarefaAtual(task);
      try {
        await request(api + '/' + encodeURIComponent(id) + '/parecer/atualizar', 'POST');
        await load();
        process.concluirTarefa(task);
        process.sucesso({ title: 'Parecer atualizado', message: 'Confira o texto e o PDF e confirme a revisão antes de enviar.' });
      } catch (error) { feedback(error.message); process.erro({ message: error.message }); }
      finally { busy = false; controls(); get('solicitacao-atualizar-parecer').disabled = !row?.pode_editar; }
    };
    get('solicitacao-notificar').onclick = () => { if (!busy) preview.show(row); };
    get('solicitacao-confirmacoes').onclick = async () => {
      if (busy) return;
      busy = true; controls(); feedback('Consultando confirmações de entrega e leitura…');
      try {
        const result = await request(api + '/' + encodeURIComponent(id) + '/confirmacoes', 'POST');
        await load();
        feedback(`${result.relatorios_consultados} retornos consultados. Ausência de confirmação não significa que o e-mail não foi aberto.`);
      } catch (error) { feedback(error.message); }
      finally { busy = false; controls(); }
    };
    await load();
  }
  function central() {
    let all = [];
    const baseColumns = [
      ['demanda_tipo', 'Tipo', r => r.demanda_tipo], ['demanda_codigo', 'Código', r => r.demanda_codigo],
      ['demanda_nome', 'Nome da demanda', r => r.demanda_nome || 'Cadastro indisponível'],
      ['categorias', 'Categorias', r => r.categorias.map(c => labels[c] || c).join(', ')],
      ['notificacao', 'Status da notificação', notifyLabel],
      ['pendencias_atributos', 'Atributos pendentes', pendingNames],
      ['hierarquizacao_codigo', 'Hierarquização', r => r.hierarquizacao_codigo || 'Não se aplica'],
      ['demanda_solicitante', 'Solicitante da demanda', r => r.demanda_solicitante || ''],
      ['representante_email', 'E-mail do representante', r => r.representante_email || ''],
      ['demanda_solicitado_em', 'Cadastro solicitado em', r => r.demanda_solicitado_em ? date(r.demanda_solicitado_em) : ''],
      ['notificado_por', 'Notificado por', r => notified(r) ? r.notificacao?.por_nome || '' : ''],
      ['notificado_em', 'Notificado em', r => r.notificacao?.enviado_em ? date(r.notificacao.enviado_em) : ''],
      ['destinatario', 'Destinatário', r => r.notificacao?.destinatario || ''],
      ['entrega', 'Entrega do e-mail', r => receipt(r.notificacao?.entrega_status)],
      ['leitura', 'Abertura do e-mail', r => receipt(r.notificacao?.leitura_status)],
      ['parecer_pdf', 'Parecer técnico (PDF)', r => r.tem_parecer_pdf ? 'Ver parecer da análise' : 'Não gerado'],
      ['cumprimento', 'Cumprimento da pendência', fulfillment],
      ['cumprida_em', 'Cumprida em', r => r.atendido_em ? date(r.atendido_em) : ''],
    ];
    const tables = ['cadastro', 'atributos'].map(key => {
      const id = 'pendencias-' + key, root = get(id), prefix = id + '-filtro';
      const columns = baseColumns.filter(([name]) => key === 'atributos' || !['pendencias_atributos', 'hierarquizacao_codigo'].includes(name));
      const groups = {
        contexto: ['demanda_tipo', 'pendencias_atributos', 'hierarquizacao_codigo', 'demanda_solicitado_em'],
        envio: ['notificado_por', 'notificado_em', 'destinatario'],
        confirmacoes: ['entrega', 'leitura'],
        cumprimento: ['parecer_pdf', 'cumprimento', 'cumprida_em'],
      };
      const expanded = new Set();
      const hiddenColumn = name => Object.entries(groups).some(([group, names]) => names.includes(name) && !expanded.has(group));
      const selected = new Set(), column = get(prefix + '-coluna'), value = get(prefix + '-valor');
      let page = 1, filtered = [], visible = [];
      const preview = notificationPreview(get(id + '-previa'), load);
      columns.forEach(([name, label]) => column.add(new Option(label, name)));
      const source = () => all.filter(r => (key === 'atributos') === r.categorias.includes('atributos_objeto'));
      function render() {
        preview.hide();
        const field = columns.find(c => c[0] === column.value);
        filtered = source().filter(r => SLTTable.matches(prefix, field && String(field[2](r) ?? '') === (value.value === '__empty__' ? '' : value.value),
          Boolean(field && value.value)));
        const result = SLTTable.paginate(id + '-pagination', filtered, page, p => { page = p; render(); });
        page = result.page; visible = result.rows;
        const tbody = root.querySelector('tbody');
        tbody.replaceChildren();
        visible.forEach(row => {
          const tr = document.createElement('tr'), cell = document.createElement('td'), checkbox = document.createElement('input');
          cell.className = 'col-select'; checkbox.type = 'checkbox';           checkbox.checked = selected.has(rowKey(row));
          checkbox.setAttribute('aria-label', 'Selecionar solicitação ' + row.demanda_codigo);
          checkbox.onchange = () => { checkbox.checked ? selected.add(rowKey(row)) : selected.delete(rowKey(row)); render(); };
          cell.append(checkbox); tr.append(cell);
          columns.forEach(([name, , getter]) => {
            const td = document.createElement('td');
            td.hidden = hiddenColumn(name);
            if (name === 'demanda_codigo') {
              const a = document.createElement('a'); a.href = detailUrl(row); a.textContent = text(getter(row)); td.append(a);
            } else if (name === 'parecer_pdf' && row.parecer_pdf_url) {
              const a = document.createElement('a'); a.href = row.parecer_pdf_url; a.textContent = getter(row);
              a.target = '_blank'; a.rel = 'noopener noreferrer'; td.append(a);
            } else td.textContent = getter(row) ?? '';
            tr.append(td);
          });
          tbody.append(tr);
        });
        if (!visible.length) {
          const td = document.createElement('td'); td.colSpan = columns.length + 1; td.textContent = 'Nenhuma solicitação encontrada.';
          const tr = document.createElement('tr'); tr.append(td); tbody.append(tr);
        }
        const selectAll = root.querySelector('[data-select-all]');
        selectAll.checked = visible.length > 0 && visible.every(r => selected.has(rowKey(r)));
        selectAll.indeterminate = visible.some(r => selected.has(rowKey(r))) && !selectAll.checked;
        selectAll.disabled = !visible.length;
        root.querySelector('[data-open]').disabled = selected.size !== 1;
        root.querySelector('[data-export]').disabled = !selected.size;
        const chosen = source().filter(r => selected.has(rowKey(r)));
        root.querySelector('[data-preview]').disabled = chosen.length !== 1 || !chosen[0].id || !chosen[0].pode_editar
          || !chosen[0].tem_parecer_pdf || ['enviando', 'aceito_smtp', 'indeterminado'].includes(chosen[0].notificacao?.status);
        root.querySelector('[data-receipts]').disabled = chosen.length !== 1 || !canCollect(chosen[0])
          || !chosen[0].pode_consultar_confirmacoes;
        SLTTable.summary(id + '-count', selected.size, visible.length, filtered.length);
        columns.forEach(([name], index) => { root.querySelector('thead tr').cells[index + 1].hidden = hiddenColumn(name); });
      }
      root.querySelectorAll('[data-column-group]').forEach(button => {
        button.onclick = () => {
          const group = button.dataset.columnGroup;
          expanded.has(group) ? expanded.delete(group) : expanded.add(group);
          button.setAttribute('aria-pressed', String(expanded.has(group)));
          render();
        };
      });
      function values() {
        const field = columns.find(c => c[0] === column.value);
        value.disabled = !field;
        SLTTable.values(value, field ? source() : [], r => field[2](r));
      }
      column.onchange = () => { values(); page = 1; selected.clear(); render(); };
      value.onchange = () => { page = 1; selected.clear(); render(); };
      SLTTable.bindFilter(prefix, () => { page = 1; selected.clear(); render(); },
        () => { column.value = ''; values(); });
      root.querySelector('[data-select-all]').onchange = e => { visible.forEach(r => e.target.checked ? selected.add(rowKey(r)) : selected.delete(rowKey(r))); render(); };
      root.querySelector('[data-open]').onclick = () => {
        const row = source().find(r => selected.has(rowKey(r)));
        if (selected.size === 1 && row) location.href = detailUrl(row);
      };
      root.querySelector('[data-preview]').onclick = () => {
        const row = source().find(r => selected.has(rowKey(r)));
        if (row) preview.show(row);
      };
      root.querySelector('[data-export]').onclick = () => {
        const cell = v => '"' + String(v ?? '').replaceAll('"', '""') + '"';
        const rows = source().filter(r => selected.has(rowKey(r)));
        const csv = [columns.map(c => cell(c[1])).join(';'), ...rows.map(r => columns.map(c => {
          const v = String(c[2](r) ?? ''); return cell(/^[=+\-@\t\r]/.test(v) ? "'" + v : v);
        }).join(';'))].join('\r\n');
        const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a'); a.href = url; a.download = `pendencias-${key}.csv`; a.click(); URL.revokeObjectURL(url);
      };
      root.querySelector('[data-reload]').onclick = () => load().catch(e => feedback(e.message));
      root.querySelector('[data-receipts]').onclick = async () => {
        const row = source().find(r => selected.has(rowKey(r)));
        if (!row || !canCollect(row)) return;
        const button = root.querySelector('[data-receipts]');
        button.disabled = true;
        feedback('Consultando confirmações de entrega e leitura…');
        try {
          const result = await request(api + '/' + encodeURIComponent(row.id) + '/confirmacoes', 'POST');
          await load();
          feedback(`${result.relatorios_consultados} retornos consultados. Ausência de confirmação não significa que o e-mail não foi aberto.`);
        } catch (error) { feedback(error.message); }
        finally { render(); }
      };
      return () => { selected.clear(); values(); render(); };
    });
    async function load() {
      feedback('Carregando solicitações…');
      all = await request(api);
      tables.forEach(render => render());
      const candidates = all.filter(r => r.status === 'nao_solicitada').length;
      feedback(`${all.length} registros carregados: ${candidates} pendências sem pedido registrado e ${all.length - candidates} pedidos registrados. Registro não comprova envio de notificação.`);
    }
    return load();
  }
  (get('solicitacao-form') ? detail() : central()).catch(error => feedback(error.message));
})();
