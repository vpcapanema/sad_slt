(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const area = el('ami-lembretes');
  const formulario = el('ami-lembretes-form');
  const fatias = el('ami-lembretes-faixas');
  const rodada = el('ami-lembretes-rodada');
  const modal = el('ami-lembretes-modal');
  const somenteLeitura = area.dataset.somenteLeitura === 'true';
  const base = '/api/ahp/comparacao-colaborativa/ambientes';
  const urlConfiguracoes = '/api/ahp/comparacao-colaborativa/lembretes';
  const formatador = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short', timeStyle:'short', timeZone:'America/Sao_Paulo'});
  const dataPeriodo = new Intl.DateTimeFormat('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', timeZone:'America/Sao_Paulo'});
  const listaHorarios = new Intl.ListFormat('pt-BR');
  const horaOficial = valor => valor.replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
  const numeros = new Intl.NumberFormat('pt-BR', {maximumFractionDigits:4});
  const data = valor => valor ? formatador.format(new Date(valor)) : '—';
  const percentual = valor => `${numeros.format(valor)}%`;
  const estados = {aceito_smtp:'Aceito pelo servidor SMTP', falha:'Falha no envio', indeterminado:'Resultado indeterminado',
    cancelado:'Cancelado', enviando:'Em envio'};
  const colunas = ['nome','email','instituicao','entrada_participacao','etapa_rotulo','situacao','ultimo_envio'];
  const colunasData = new Set(['entrada_participacao','ultimo_envio','configurado_em']);
  const periodoInteiro = 100;
  let julgamento = '', modo = '', dados, pendente = false, carregando = false, detalhe;
  let largurasAtuais = [], ajusteLargura, temporizadorPrevia, versaoPrevia = 0, faixasEmPrevia = null;
  let quantidadesAtuais = [], ajusteQuantidade;
  const editando = () => modo === 'editar' && !somenteLeitura;

  function elemento(tag, texto, classe) {
    const node = document.createElement(tag);
    if (texto != null) node.textContent = texto;
    if (classe) node.className = classe;
    return node;
  }

  function informar(id, texto, erro = false) {
    const status = el(id);
    status.textContent = texto;
    status.classList.toggle('ami-lembretes-erro', erro);
  }

  function mostrarPeriodo(registro) {
    const inicio = Date.parse(registro?.inicio_periodo);
    const fim = Date.parse(registro?.prazo);
    const dias = diferenca => Number.isFinite(diferenca)
      ? numeros.format(Math.max(0, Math.ceil(diferenca / 86_400_000))) : '—';
    const valores = {
      inicio: Number.isFinite(inicio) ? dataPeriodo.format(inicio) : '—',
      fim: Number.isFinite(fim) ? dataPeriodo.format(fim) : '—',
      total: dias(fim - inicio),
      restante: dias(fim - Date.now()),
    };
    for (const [campo, valor] of Object.entries(valores)) {
      const card = el(`ami-lembretes-periodo-${campo}`);
      if (card.textContent !== valor) card.textContent = valor;
    }
  }

  async function api(url, opcoes = {}) {
    let resposta;
    const method = opcoes.method || 'GET';
    try { resposta = await fetch(url, {credentials:'same-origin', ...opcoes}); }
    catch (erro) { throw SicardApiErro.deRede(erro, {url, method}); }
    if (!resposta.ok) throw await SicardApiErro.deResposta(resposta, {method});
    return resposta.json();
  }

  function campo(rotulo, controle) {
    const grupo = elemento('label', null, 'c-form-group');
    grupo.append(elemento('span', rotulo, 'c-form-label'), controle);
    return grupo;
  }

  function lerFatias() {
    return largurasAtuais.map((largura, i) => ({largura, quantidade:quantidadesAtuais[i]}));
  }

  const tetoQuantidade = (indice, tamanho) => Number.MAX_SAFE_INTEGER - (tamanho - indice - 1);

  function ajustarQuantidade(controle, finalizar = false) {
    const entradas = [...fatias.querySelectorAll('[data-quantidade]')];
    const indice = entradas.indexOf(controle);
    if (ajusteQuantidade?.controle !== controle) {
      ajusteQuantidade = {controle, valores:quantidadesAtuais};
    }
    const valor = controle.valueAsNumber;
    if (!finalizar && !Number.isFinite(valor)) return;
    const anteriores = ajusteQuantidade.valores;
    const inteiro = Number.isFinite(valor) ? Math.trunc(valor) : anteriores[indice];
    const quantidades = [...anteriores];
    quantidades[indice] = Math.max(indice, Math.min(inteiro, tetoQuantidade(indice, entradas.length)));
    for (let i = indice - 1; i >= 0; i -= 1) {
      quantidades[i] = Math.min(quantidades[i], quantidades[i + 1] - 1);
    }
    for (let i = indice + 1; i < entradas.length; i += 1) {
      quantidades[i] = Math.max(quantidades[i], quantidades[i - 1] + 1);
    }
    const mudou = quantidades.some((quantidade, i) => quantidade !== quantidadesAtuais[i]);
    quantidadesAtuais = quantidades;
    entradas.forEach((entrada, i) => {
      if ((finalizar || entrada !== controle) && entrada.valueAsNumber !== quantidades[i]) entrada.value = quantidades[i];
    });
    if (finalizar) ajusteQuantidade = null;
    if (mudou) registrarEdicao();
  }

  function larguras(intervalos) {
    const pesos = intervalos.map((faixa, i) => faixa.ate - (intervalos[i - 1]?.ate || 0));
    const duracoes = dividir(periodoInteiro, pesos).sort((a, b) => b - a);
    return intervalos.map((faixa, i) => ({largura:duracoes[i], quantidade:faixa.quantidade}));
  }

  function dividir(total, pesos) {
    if (pesos.every(peso => peso === pesos[0])) {
      const parte = Math.floor(total / pesos.length), resto = total % pesos.length;
      return pesos.map((_, i) => parte + Number(i < resto));
    }
    const minimo = pesos.length <= total ? 1 : 0;
    const soma = pesos.reduce((a, b) => a + b, 0);
    let acumulado = 0, repartido = 0;
    return pesos.map((peso, i) => {
      acumulado += peso;
      const marco = Math.max(repartido + minimo, Math.min(Math.round(total * acumulado / soma), total - minimo * (pesos.length - i - 1)));
      const largura = marco - repartido;
      repartido = marco;
      return largura;
    });
  }

  function duracoesPadrao(tamanho) {
    const marcos = [0, ...dados.faixas_padrao.map(intervalo => intervalo.ate)];
    const quantidadePadrao = marcos.length - 1;
    let anterior = 0;
    // Reamostra os limites da divisão padrão para manter o mesmo perfil de duração.
    const pesos = Array.from({length:tamanho}, (_, indice) => {
      const posicao = (indice + 1) * quantidadePadrao / tamanho;
      const inicio = Math.floor(posicao);
      const fim = Math.min(inicio + 1, quantidadePadrao);
      const marco = marcos[inicio] + (marcos[fim] - marcos[inicio]) * (posicao - inicio);
      const peso = marco - anterior;
      anterior = marco;
      return peso;
    });
    return dividir(periodoInteiro, pesos).sort((a, b) => b - a);
  }

  function redistribuirDuracoes(pesos, indice, fixo) {
    const restante = periodoInteiro - fixo;
    const limites = pesos.map((_, i) => i < indice ? [fixo, restante] : [1, fixo]);
    const aplicar = fator => pesos.map((peso, i) => {
      const [minimo, maximo] = limites[i];
      return Math.max(minimo, Math.min(maximo, peso * fator));
    });

    // O mesmo fator preserva a proporção entre as durações que ainda podem variar.
    let inferior = 0, superior = restante / Math.min(...pesos);
    for (let i = 0; i < 52; i += 1) {
      const fator = (inferior + superior) / 2;
      const soma = aplicar(fator).reduce((a, b) => a + b, 0);
      if (soma <= restante) inferior = fator;
      else superior = fator;
    }

    const proporcionais = aplicar(inferior);
    const duracoes = proporcionais.map(Math.floor);
    let sobra = restante - duracoes.reduce((a, b) => a + b, 0);
    // Completa o total com as maiores partes fracionárias, da esquerda para a direita nos empates.
    const arredondamentos = proporcionais
      .map((valor, i) => ({indice:i, fracao:valor - duracoes[i]}))
      .sort((a, b) => b.fracao - a.fracao || a.indice - b.indice);
    for (const {indice: i} of arredondamentos) {
      if (!sobra) break;
      if (duracoes[i] < limites[i][1]) {
        duracoes[i] += 1;
        sobra -= 1;
      }
    }
    return duracoes;
  }

  function ajustarLargura(controle) {
    const valor = controle.valueAsNumber;
    if (!Number.isFinite(valor) || valor <= 0 || largurasAtuais.length <= 1) return false;
    const entradas = [...fatias.querySelectorAll('[data-largura]')], indice = entradas.indexOf(controle);
    if (ajusteLargura?.controle !== controle) {
      const pesos = largurasAtuais.filter((_, i) => i !== indice);
      ajusteLargura = {controle, pesos};
    }
    const minimo = indice === 0 ? Math.ceil(periodoInteiro / entradas.length) : 1;
    const maximo = Math.floor((periodoInteiro - (entradas.length - indice - 1)) / (indice + 1));
    const fixo = Math.max(minimo, Math.min(Math.round(valor), maximo));
    const demais = redistribuirDuracoes(ajusteLargura.pesos, indice, fixo);
    demais.splice(indice, 0, fixo);
    largurasAtuais = demais;
    entradas.forEach((entrada, i) => mostrarLargura(entrada, largurasAtuais[i]));
    return true;
  }

  function mostrarLargura(barra, largura) {
    if (barra.valueAsNumber !== largura) barra.value = largura;
    barra.style.setProperty('--ami-duracao-percentual', `${largura}%`);
    const rotulo = `${largura}%`;
    barra.setAttribute('aria-valuetext', rotulo);
    barra.nextElementSibling.value = rotulo;
  }

  function faixasRascunho(intervalos = lerFatias()) {
    let limite = 0;
    return intervalos.map(({largura, quantidade}) => ({ate:limite += largura, quantidade}));
  }

  function renderizarFatias(intervalos) {
    ajusteLargura = null;
    ajusteQuantidade = null;
    largurasAtuais = intervalos.map(fatia => fatia.largura);
    quantidadesAtuais = intervalos.map(fatia => fatia.quantidade);
    const cabem = intervalos.length <= periodoInteiro;
    fatias.replaceChildren(...intervalos.map((fatia, i) => {
      const linha = elemento('div', null, 'ami-lembretes-faixa');
      const largura = elemento('input'), total = elemento('input');
      const duracao = elemento('span', null, 'ami-lembretes-duracao');
      const percentualAtual = elemento('output');
      largura.type = 'range';
      largura.id = `ami-lembretes-duracao-${i + 1}`;
      largura.min = cabem ? '1' : '0';
      largura.max = String(cabem ? periodoInteiro - intervalos.length + 1 : periodoInteiro);
      largura.step = '1';
      largura.disabled = !editando() || !cabem || intervalos.length === 1;
      percentualAtual.htmlFor.add(largura.id);
      percentualAtual.setAttribute('aria-hidden', 'true');
      duracao.append(largura, percentualAtual);
      mostrarLargura(largura, fatia.largura);
      total.type = 'number';
      total.className = 'c-form-control';
      total.required = true;
      total.step = '1';
      total.min = String(i);
      total.max = String(tetoQuantidade(i, intervalos.length));
      total.value = fatia.quantidade;
      largura.dataset.largura = ''; total.dataset.quantidade = '';
      largura.setAttribute('aria-label', `Duração do intervalo ${i + 1} em porcentagem`);
      total.setAttribute('aria-label', `Número de lembretes no intervalo ${i + 1}`);
      total.readOnly = !editando();
      const quantidade = campo('Lembretes por intervalo', total);
      linha.append(elemento('strong', `Intervalo ${i + 1}`, 'ami-lembretes-intervalo-numero'), campo('Duração (%)', duracao), quantidade);
      return linha;
    }));
    el('ami-lembretes-numero-valor').value = intervalos.length;
    el('ami-lembretes-adicionar').disabled = intervalos.length >= periodoInteiro;
    el('ami-lembretes-subtrair').disabled = intervalos.length <= 1;
    el('ami-lembretes-salvar').disabled = !pendente || !cabem;
  }

  function tabelaPadrao(prefixo, campos, chave, vazio, aoSelecionar, abrirNome) {
    const filtro = `${prefixo}-filtro`;
    const colunaFiltro = el(`${filtro}-coluna`), valorFiltro = el(`${filtro}-valor`);
    const tabela = el(`${prefixo}-tabela`), todos = el(`${prefixo}-todos`);
    const selecionados = new Set(), tamanhoPagina = 15;
    let registros = [], pagina = 1;
    const valor = (registro, coluna) => coluna === 'notificacoes_ativas' ? rotuloNotificacoes(registro.notificacoes_ativas) :
      (colunasData.has(coluna) ? data(registro[coluna]) : registro[coluna]);
    const ordenar = SLTTable.sorting(tabela, () => [null, ...campos.map(coluna => registro =>
      colunasData.has(coluna) ? Date.parse(registro[coluna]) || '' : registro[coluna])], reiniciarPagina);
    SLTTable.headers(tabela).slice(1).forEach((th, i) => colunaFiltro.add(new Option(th.textContent, campos[i])));

    function reiniciarPagina() { pagina = 1; renderizar(); }

    function renderizar() {
      const coluna = colunaFiltro.value;
      SLTTable.values(valorFiltro, coluna ? registros : [], registro => valor(registro, coluna));
      valorFiltro.disabled = !coluna;
      const filtrados = ordenar(registros.filter(registro => SLTTable.matches(filtro,
        String(valor(registro, coluna) ?? '') === (valorFiltro.value === '__empty__' ? '' : valorFiltro.value), Boolean(valorFiltro.value))));
      const exibidos = SLTTable.paginate(`${prefixo}-paginas`, filtrados, pagina, alvo => { pagina = alvo; renderizar(); }, tamanhoPagina);
      pagina = exibidos.page;
      const linhas = exibidos.rows.map(registro => {
        const linha = elemento('tr'), checkbox = elemento('input');
        checkbox.type = 'checkbox'; checkbox.checked = selecionados.has(registro[chave]);
        checkbox.setAttribute('aria-label', `Selecionar ${registro.nome}`);
        checkbox.onchange = () => {
          if (checkbox.checked) selecionados.add(registro[chave]);
          else selecionados.delete(registro[chave]);
          linha.classList.toggle('is-selected', checkbox.checked);
          atualizarSelecao();
        };
        linha.classList.toggle('is-selected', checkbox.checked);
        const seletora = linha.insertCell(); seletora.className = 'col-select'; seletora.append(checkbox);
        const celulaNome = linha.insertCell();
        if (abrirNome) {
          const nome = elemento('button', registro.nome, 'ami-cell-link');
          nome.type = 'button'; nome.dataset.readControl = '';
          nome.setAttribute('aria-label', `Abrir agenda de ${registro.nome}`);
          nome.onclick = () => abrirNome(registro);
          celulaNome.append(nome);
        } else celulaNome.textContent = registro.nome;
        for (const campo of campos.slice(1)) {
          const celula = linha.insertCell();
          if (campo === 'situacao' && ['agendado', 'respondida'].includes(registro.codigo)) celula.append(montarStatusNotificacao(registro));
          else if (campo === 'notificacoes_ativas') celula.append(montarNotificacoes(registro));
          else celula.textContent = valor(registro, campo) ?? '—';
          if (campo === 'etapa_rotulo' || (campo === 'situacao' && !celula.firstElementChild)) {
            const tom = campo === 'situacao' && registro.codigo === 'sem_agenda' &&
              registro.agenda_fatias?.some(intervalo => intervalo.sem_horario) ? 'pendencia' : undefined;
            SicardAhpStatus.aplicar(celula, celula.textContent, tom);
          }
        }
        return linha;
      });
      if (!linhas.length) {
        const linha = elemento('tr'), celula = linha.insertCell();
        celula.colSpan = campos.length + 1; celula.className = 'ami-empty';
        celula.textContent = registros.length ? 'Nenhum registro corresponde ao filtro.' : vazio;
        linhas.push(linha);
      }
      el(`${prefixo}-linhas`).replaceChildren(...linhas);
      todos.onchange = () => {
        filtrados.forEach(registro => todos.checked ? selecionados.add(registro[chave]) : selecionados.delete(registro[chave]));
        renderizar();
      };
      function atualizarSelecao() {
        const quantidade = filtrados.filter(registro => selecionados.has(registro[chave])).length;
        todos.disabled = !filtrados.length;
        todos.checked = quantidade > 0 && quantidade === filtrados.length;
        todos.indeterminate = quantidade > 0 && quantidade !== filtrados.length;
        aoSelecionar(selecionados.size);
        SLTTable.summary(`${prefixo}-contagem`, selecionados.size, exibidos.rows.length, registros.length);
      }
      atualizarSelecao();
    }

    function limparFiltro() { colunaFiltro.value = valorFiltro.value = ''; }
    SLTTable.bindFilter(filtro, reiniciarPagina, limparFiltro);
    colunaFiltro.onchange = () => { valorFiltro.value = ''; reiniciarPagina(); };
    valorFiltro.onchange = reiniciarPagina;
    return {
      atualizar(novos, alvo) {
        registros = novos;
        const chaves = new Set(registros.map(registro => registro[chave]));
        for (const item of selecionados) if (!chaves.has(item)) selecionados.delete(item);
        if (alvo && chaves.has(alvo)) {
          selecionados.add(alvo);
          pagina = 1 + Math.floor(registros.findIndex(registro => registro[chave] === alvo) / tamanhoPagina);
        }
        renderizar();
      },
      substituir(novo) { registros = registros.map(registro => registro[chave] === novo[chave] ? novo : registro); renderizar(); },
      definirRotulo(campo, rotulo) {
        const th = SLTTable.headers(tabela)[campos.indexOf(campo) + 1];
        (th.querySelector('.smart-column-title') || th).textContent = rotulo;
        if (th.classList.contains('slt-sortable-column')) th.title = 'Ordenar por ' + rotulo;
        colunaFiltro.querySelector(`option[value="${campo}"]`).textContent = rotulo;
      },
      limparSelecao() { selecionados.clear(); renderizar(); },
      selecionado() {
        return selecionados.size === 1 ? registros.find(registro => selecionados.has(registro[chave])) : null;
      },
      reiniciar() {
        selecionados.clear(); pagina = 1; limparFiltro(); SLTTable.inversion(el(`${filtro}-inverter`), false);
      },
      renderizar,
    };
  }

  function montarStatusNotificacao(registro) {
    const botao = elemento('button', registro.situacao, 'ami-cell-link');
    botao.type = 'button';
    botao.dataset.readControl = '';
    botao.setAttribute('aria-haspopup', 'dialog');
    botao.setAttribute('aria-label', `${registro.situacao} · Notificações de ${registro.nome}`);
    SicardAhpStatus.aplicar(botao, registro.situacao);
    botao.onclick = () => abrirDetalhe(registro);
    return botao;
  }

  const agenda = tabelaPadrao('ami-lembretes', colunas, 'email', 'Nenhum colaborador neste julgamento.', total => {
    el('ami-lembretes-historico').disabled = total !== 1;
    el('ami-lembretes-limpar').disabled = total === 0;
  }, abrirDetalhe);
  const lista = tabelaPadrao('ami-lembretes-config', ['nome','forma_participacao','notificacoes_ativas','frequencia','total_faixas','total_lembretes','configurado_em'],
    'id', 'Nenhuma configuração carregada.', total => {
      el('ami-lembretes-config-ver').disabled = carregando || total !== 1;
      el('ami-lembretes-config-editar').disabled = carregando || somenteLeitura || total !== 1;
      el('ami-lembretes-config-limpar').disabled = total === 0;
      mostrarPeriodo(lista.selecionado());
    });
  setInterval(() => mostrarPeriodo(lista.selecionado()), 60_000);
  const rotulosConfiguracao = registro => ({...registro, frequencia:registro.padrao ? 'Padrão' : 'Personalizada',
    forma_participacao:registro.modo_participacao === 'publico' ? 'Link público' : 'Por convite'});
  const rotuloNotificacoes = ativas => ativas ? 'Ativadas' : 'Desativadas';

  function montarNotificacoes(registro) {
    const botao = elemento('button', null, 'ami-lembretes-notificacoes');
    botao.type = 'button';
    botao.setAttribute('role', 'switch');
    botao.setAttribute('aria-checked', String(registro.notificacoes_ativas));
    botao.setAttribute('aria-label', `Notificações de lembretes de ${registro.nome}`);
    botao.title = rotuloNotificacoes(registro.notificacoes_ativas);
    botao.dataset.writeControl = '';
    botao.dataset.notificacoes = registro.id;
    botao.disabled = somenteLeitura || carregando;
    botao.onclick = () => alternarNotificacoes(registro);
    return botao;
  }

  async function alternarNotificacoes(registro) {
    if (somenteLeitura || carregando) return;
    carregando = true;
    lista.renderizar();
    informar('ami-lembretes-contexto-status', 'Salvando notificações…');
    try {
      const resultado = await api(`${base}/${registro.id}/lembretes/notificacoes`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({notificacoes_ativas:!registro.notificacoes_ativas}),
      });
      if (!rodada.hidden && julgamento === registro.id) mostrar(resultado, true);
      else lista.substituir(rotulosConfiguracao(resultado.configuracao));
      informar('ami-lembretes-contexto-status', `Notificações de lembretes ${rotuloNotificacoes(resultado.configuracao.notificacoes_ativas).toLowerCase()}.`);
    } catch (erro) {
      informar('ami-lembretes-contexto-status', erro.message, true);
    } finally {
      carregando = false;
      lista.renderizar();
      el('ami-lembretes-config-linhas').querySelector(`[data-notificacoes="${registro.id}"]`)?.focus();
    }
  }

  function limparPrevia() {
    clearTimeout(temporizadorPrevia);
    versaoPrevia += 1;
    faixasEmPrevia = null;
    informar('ami-lembretes-previa-status', '');
  }

  const requisicaoFaixas = (method, faixas) => ({method,headers:{'Content-Type':'application/json'},body:JSON.stringify({faixas})});

  function atualizarPrevia() {
    limparPrevia();
    if (!editando() || !pendente || largurasAtuais.length > periodoInteiro || !dados.configuracao.notificacoes_ativas) {
      agenda.atualizar(dados.participantes);
      return;
    }
    const versao = versaoPrevia, configuracao = faixasRascunho();
    informar('ami-lembretes-previa-status', 'Calculando a prévia dos horários…');
    agenda.atualizar(dados.participantes);
    temporizadorPrevia = setTimeout(async () => {
      try {
        const previa = await api(`${base}/${julgamento}/lembretes/previa`, requisicaoFaixas('POST', configuracao));
        if (versao !== versaoPrevia) return;
        faixasEmPrevia = configuracao;
        agenda.atualizar(previa.participantes);
        informar('ami-lembretes-previa-status', 'Prévia dos horários com as alterações em edição.');
      } catch (erro) {
        if (versao === versaoPrevia) informar('ami-lembretes-previa-status', erro.message, true);
      }
    }, 250);
  }

  function mostrar(dadosNovos, preservarEdicao = false) {
    dados = dadosNovos;
    limparPrevia();
    const intervalos = larguras(dados.faixas);
    const arredondada = faixasRascunho(intervalos).some((faixa, i) => faixa.ate !== dados.faixas[i].ate);
    if (!preservarEdicao) {
      pendente = editando() && arredondada;
      renderizarFatias(intervalos);
    }
    el('ami-lembretes-detalhe-titulo').textContent = dados.julgamento;
    el('ami-lembretes-fechar-config').textContent = editando() ? 'Cancelar edição' : 'Fechar visualização';
    for (const controle of formulario.querySelectorAll('[data-edicao-lembretes]')) controle.hidden = !editando();
    el('ami-lembretes-regra').textContent = largurasAtuais.length > periodoInteiro
      ? 'Reduza a frequência a até 100 intervalos para salvar as porcentagens inteiras.'
      : pendente ? 'Alterações pendentes.' :
      arredondada ? 'As barras mostram porcentagens inteiras. A agenda usa a frequência salva.' :
      dados.padrao ? 'Configuração padrão em uso.' : 'Configuração personalizada em uso.';
    const notificando = dados.configuracao.notificacoes_ativas;
    el('ami-lembretes-rotina').hidden = notificando && dados.rotina_disponivel;
    el('ami-lembretes-rotina').textContent = notificando
      ? 'O envio automático está indisponível neste ambiente. Confira a configuração do serviço de e-mail.'
      : 'Notificações desativadas para este julgamento.';
    const publico = dados.configuracao.modo_participacao === 'publico';
    agenda.definirRotulo('entrada_participacao', publico ? 'Data da inscrição' : 'Primeiro acesso ao link');
    const etapa = publico ? 'Em preenchimento' : 'Link acessado';
    el('ami-lembretes-origem').textContent = `A vigência vai da criação do julgamento (${data(dados.inicio_periodo)}) à data limite da coleta (${data(dados.prazo)}). ` +
      `Na etapa «${etapa}», cada participante segue os horários ainda disponíveis na faixa em curso e nas seguintes.`;
    el('ami-lembretes-horarios-oficiais').textContent = `Os horários oficiais de envio são ${listaHorarios.format(dados.horarios_oficiais.map(horaOficial))}, no horário de Brasília.`;
    rodada.hidden = false;
    lista.substituir(rotulosConfiguracao(dados.configuracao));
    agenda.atualizar(dados.participantes);
    if (pendente) atualizarPrevia();
  }

  async function carregar(id, novoModo) {
    if (carregando) return;
    const atualizar = !novoModo;
    carregando = true;
    lista.renderizar();
    el('ami-lembretes-atualizar').disabled = true;
    el('ami-lembretes-fechar-config').disabled = true;
    informar('ami-lembretes-contexto-status', 'Carregando agenda…');
    try {
      const resultado = await api(`${base}/${id}/lembretes`);
      if (!atualizar) {
        julgamento = id;
        modo = novoModo;
        agenda.reiniciar();
        informar('ami-lembretes-form-status', '');
      }
      mostrar(resultado, atualizar && pendente);
      const url = new URL(location.href);
      url.searchParams.set('julgamento', id);
      history.replaceState(null, '', url);
      informar('ami-lembretes-contexto-status', atualizar ? 'Agenda atualizada.' : '');
      if (!atualizar) el('ami-lembretes-detalhe-titulo').focus();
    } catch (erro) {
      informar('ami-lembretes-contexto-status', erro.message, true);
    } finally {
      carregando = false;
      lista.renderizar();
      el('ami-lembretes-atualizar').disabled = false;
      el('ami-lembretes-fechar-config').disabled = false;
    }
  }

  function atualizarHorariosPorIntervalo(contexto, resultado) {
    for (const resumo of resultado.agenda_fatias) {
      if (resumo.sem_horario) contexto.intervalos.set(resumo.fatia, {horarios:[], resumo});
    }
    for (const item of resultado.agenda) {
      const intervalo = contexto.intervalos.get(item.fatia) || {horarios:[]};
      intervalo.horarios.push(item.previsto_em);
      contexto.intervalos.set(item.fatia, intervalo);
    }
    const grupos = [...contexto.intervalos].sort(([a], [b]) => a - b).map(([numero, intervalo]) => {
      const grupo = elemento('li', null, 'ami-lembretes-intervalo-agenda');
      grupo.append(elemento('h4', `Intervalo ${numero}`));
      if (intervalo.horarios.length) {
        const datas = elemento('ul', null, 'ami-lembretes-datas');
        for (const horario of intervalo.horarios) {
          const item = elemento('li');
          const tempo = elemento('time', data(horario));
          tempo.dateTime = horario;
          item.append(tempo);
          datas.append(item);
        }
        grupo.append(datas);
      }
      if (intervalo.resumo) {
        const {agendados, sem_horario} = intervalo.resumo;
        grupo.append(elemento('p', `${agendados} com horário · ${sem_horario} sem horário no intervalo`, 'ami-lembretes-sem-horario'));
      }
      return grupo;
    });
    el('ami-lembretes-modal-agenda').replaceChildren(...(grupos.length ? grupos : [elemento('li', 'Nenhum lembrete futuro.')]));
  }

  function motivoDaResposta(registro) {
    const enviada = registro.resposta_enviada_em;
    const configurada = dados.configuracao.configurado_em;
    const respostaAntesDaConfiguracao = enviada && configurada && Date.parse(enviada) <= Date.parse(configurada);
    const fato = respostaAntesDaConfiguracao
      ? `Quando a configuração dos lembretes foi aplicada em ${data(configurada)}, o colaborador já havia enviado a resposta.`
      : enviada ? `O colaborador enviou a resposta ao julgamento em ${data(enviada)}.` : 'O colaborador já enviou a resposta.';
    return `${fato} Como os lembretes se destinam a quem ainda precisa responder, este colaborador fica fora da agenda de próximos envios.`;
  }

  async function detalhes(registro, apos) {
    const contexto = detalhe;
    const parametros = new URLSearchParams({email:registro.email});
    if (apos) parametros.set('apos', apos);
    const mais = el('ami-lembretes-mais');
    mais.disabled = true;
    informar('ami-lembretes-modal-status', 'Consultando agenda…');
    try {
      const rota = contexto.faixas ? 'previa' : 'historico';
      const resultado = await api(`${base}/${contexto.julgamento}/lembretes/${rota}?${parametros}`,
        contexto.faixas ? requisicaoFaixas('POST', contexto.faixas) : {});
      if (contexto !== detalhe) return;
      if (registro.codigo !== 'respondida') atualizarHorariosPorIntervalo(contexto, resultado);
      if (!apos) {
        el('ami-lembretes-modal-historico').append(...(resultado.historico.length ? resultado.historico.map(item => {
          const linha = elemento('li', `${data(item.finalizado_em || item.criado_em)} · ${estados[item.status]}`);
          if (item.detalhe) linha.append(elemento('p', item.detalhe, 'form-help'));
          return linha;
        }) : [elemento('li', 'Nenhum disparo registrado.')]));
      }
      mais.hidden = !resultado.mais_agenda;
      if (resultado.mais_agenda) mais.onclick = () => detalhes(registro, resultado.agenda.at(-1).previsto_em);
      informar('ami-lembretes-modal-status', '');
    } catch (erro) {
      if (contexto === detalhe) informar('ami-lembretes-modal-status', erro.message, true);
    } finally {
      if (contexto === detalhe) mais.disabled = false;
    }
  }

  function abrirDetalhe(registro) {
    detalhe = {julgamento, faixas:faixasEmPrevia, intervalos:new Map()};
    el('ami-lembretes-modal-titulo').textContent = registro.nome;
    el('ami-lembretes-modal-contexto').textContent = `${registro.email} · ${registro.situacao}`;
    const respondida = registro.codigo === 'respondida';
    const motivo = el('ami-lembretes-modal-motivo');
    motivo.textContent = respondida ? motivoDaResposta(registro) : '';
    motivo.hidden = !respondida;
    el('ami-lembretes-modal-programacao').hidden = respondida;
    el('ami-lembretes-modal-agenda').replaceChildren();
    el('ami-lembretes-modal-historico').replaceChildren();
    el('ami-lembretes-mais').hidden = true;
    modal.showModal();
    detalhes(registro);
  }

  function confirmarDescarte() {
    return !pendente || ProcessFeedback.confirmar({title:'Descartar alterações', confirmLabel:'Descartar alterações',
      message:'Há alterações na frequência ainda pendentes.'});
  }

  async function abrirConfiguracao(novoModo) {
    const registro = lista.selecionado();
    if (registro && await confirmarDescarte()) await carregar(registro.id, novoModo);
  }

  el('ami-lembretes-config-ver').onclick = () => abrirConfiguracao('visualizar');
  el('ami-lembretes-config-editar').onclick = () => abrirConfiguracao('editar');
  el('ami-lembretes-config-limpar').onclick = () => lista.limparSelecao();
  el('ami-lembretes-fechar-config').onclick = async () => {
    if (!await confirmarDescarte()) return;
    pendente = false;
    limparPrevia();
    rodada.hidden = true;
    informar('ami-lembretes-contexto-status', '');
    el('ami-lembretes-config-titulo').focus();
  };
  function registrarEdicao() {
    pendente = true;
    const cabem = largurasAtuais.length <= periodoInteiro;
    el('ami-lembretes-regra').textContent = cabem
      ? 'Alterações pendentes.'
      : 'Reduza a frequência a até 100 intervalos para salvar as porcentagens inteiras.';
    informar('ami-lembretes-form-status', '');
    el('ami-lembretes-salvar').disabled = !cabem;
    atualizarPrevia();
  }

  fatias.oninput = ({target}) => {
    if (target.matches('[data-largura]')) ajustarLargura(target);
    else if (target.matches('[data-quantidade]')) ajustarQuantidade(target);
  };
  fatias.onchange = ({target}) => {
    if (target.matches('[data-largura]')) registrarEdicao();
    else if (target.matches('[data-quantidade]')) ajustarQuantidade(target, true);
  };
  fatias.onfocusout = ({target}) => {
    if (ajusteQuantidade?.controle === target) ajustarQuantidade(target, true);
  };

  function mudarNumero(delta) {
    const tamanho = quantidadesAtuais.length + delta;
    if (tamanho < 1 || (delta > 0 && tamanho > periodoInteiro)) return;
    const quantidades = quantidadesAtuais.slice(0, tamanho).map((valor, i) => Math.min(valor, tetoQuantidade(i, tamanho)));
    if (delta > 0) quantidades.push(quantidades.at(-1) + 1);
    pendente = true;
    renderizarFatias(duracoesPadrao(tamanho).map((largura, i) => ({largura, quantidade:quantidades[i]})));
    if (tamanho === 1 && delta < 0) el('ami-lembretes-adicionar').focus();
    registrarEdicao();
  }
  el('ami-lembretes-adicionar').onclick = () => mudarNumero(1);
  el('ami-lembretes-subtrair').onclick = () => mudarNumero(-1);
  el('ami-lembretes-restaurar').onclick = () => {
    pendente = true;
    renderizarFatias(larguras(dados.faixas_padrao));
    registrarEdicao();
  };
  formulario.onsubmit = async evento => {
    evento.preventDefault();
    if (ajusteQuantidade) ajustarQuantidade(ajusteQuantidade.controle, true);
    if (!editando() || carregando || !pendente || largurasAtuais.length > periodoInteiro) return;
    const faixas = faixasRascunho();
    limparPrevia();
    carregando = true;
    lista.renderizar();
    const controles = [...formulario.querySelectorAll('button,input')];
    const anteriores = controles.map(controle => controle.disabled);
    controles.forEach(controle => { controle.disabled = true; });
    try {
      const resultado = await api(`${base}/${julgamento}/lembretes`, requisicaoFaixas('PUT', faixas));
      modo = 'visualizar';
      mostrar(resultado);
      informar('ami-lembretes-form-status', dados.configuracao.notificacoes_ativas
        ? 'Frequência salva. Os próximos horários foram recalculados.' : 'Frequência salva.');
      el('ami-lembretes-fechar-config').focus();
    } catch (erro) { informar('ami-lembretes-form-status', erro.message, true); atualizarPrevia(); }
    finally {
      controles.forEach((controle, i) => { controle.disabled = anteriores[i]; });
      el('ami-lembretes-salvar').disabled = !pendente;
      carregando = false;
      lista.renderizar();
      if (!editando()) el('ami-lembretes-fechar-config').focus();
    }
  };
  el('ami-lembretes-atualizar').onclick = () => carregar(julgamento);
  el('ami-lembretes-historico').onclick = () => abrirDetalhe(agenda.selecionado());
  el('ami-lembretes-limpar').onclick = () => agenda.limparSelecao();
  el('ami-lembretes-fechar').onclick = () => modal.close();
  modal.onclose = () => { detalhe = null; };

  api(urlConfiguracoes).then(registros => {
    const pedido = new URLSearchParams(location.search).get('julgamento');
    lista.atualizar(registros.map(rotulosConfiguracao), pedido);
    informar('ami-lembretes-contexto-status', '');
  }).catch(erro => {
    lista.atualizar([]);
    informar('ami-lembretes-contexto-status', erro.message, true);
  });
})();
