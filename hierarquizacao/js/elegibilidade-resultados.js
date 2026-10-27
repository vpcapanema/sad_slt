import {criarMapaElegibilidade, areaLegivel} from './elegibilidade-mapa.js?v=20261023-ogr-contexto';
import {nomeDemanda} from './nome-demanda.js?v=20261023-nomes';
import {post, base} from '../../geoespacial/extracao-atributos/api.js';
import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {escolherArquivo} from '../../geoespacial/extracao-atributos/explorador.js?v=20261020-saidas';
import {sobreposicoesDaAnalise, demandasDaAnalise, renderizarRoscaDemandas} from './sobreposicoes-rosca.js?v=20261023-contexto';
import {indiceTexto, classeTexto, corClasse, compararIndices, compararDemandas, renderizarIndices} from './favorabilidade-indices.js?v=20261023-classes-ordem';
import {renderizarAgregados} from './favorabilidade-estatisticas.js?v=20261023-classes-ordem';
import {criarMapaFavorabilidade} from './favorabilidade-mapa.js?v=20261023-classes-ordem';
import {criarFiltroResultados, criarResumoResultados, paginarResultados} from './elegibilidade-tabelas.js?v=20261023-contexto';

const numero = valor => valor.toLocaleString('pt-BR', {
  minimumFractionDigits:2, maximumFractionDigits:valor !== 0 && Math.abs(valor) < .01 ? 20 : 2,
});
const area = (valor, divisor=1e6) => valor === null ? '—' : (valor / divisor).toLocaleString('pt-BR', {
  minimumFractionDigits:divisor === 1e4 ? 4 : 2, maximumFractionDigits:valor > 0 && valor/divisor < .005 ? 12 : divisor === 1e4 ? 4 : 2,
});

export function criarResultados({avisar, aoOcupar, analise='elegibilidade'}) {
  const favorabilidade = analise === 'favorabilidade';
  const rota = `/extracao-atributos/${analise}/resultados`;
  const categorias = favorabilidade ? ['grade','rede'] : ['restricao','risco'];
  const papeis = favorabilidade ? {entrada:'Entrada', grade:'Favorabilidade de Grade', rede:'Favorabilidade de Rede'}
    : {entrada:'Entrada', restricao:'Restrição', risco:'Risco'};
  const node = id => document.getElementById(`ev-resultados-${id}`);
  const formulario = node('aliases'), campos = new Map();
  let pendentes = [], execucoes = [], fontes = [], modelo = null, pagina = 0, indice = 0;
  let ocupado = false, externo = false, chave = '0', baseAtiva = '', classeAtiva = '';
  let mapa = null, demandas = null, restricoes = null, riscos = null, camadas = new Map(), recortes = [];
  let linhasPorChave = new Map(), basesPorId = new Map();
  let ocultarVazias = false, linhasTabela = [], camposTabela = [];
  let mapaElegibilidade = null, gerandoPacote = false, mapaFavorabilidade = null, processoResultados = null, emOperacao = false, ultimaMensagem = '';
  function informar(mensagem) {
    ultimaMensagem = mensagem;
    node('status').textContent = mensagem;
    if (!favorabilidade) return;
    if (emOperacao && !processoResultados) {
      processoResultados = window.ProcessFeedback.iniciarCadastro({title:'Resultados da Favorabilidade Territorial', tasks:[]});
    }
    if (processoResultados) processoResultados.detalhe(mensagem);
    else avisar(mensagem);
  }
  const entrada = () => modelo.entradas[indice];
  const linhaAtual = () => linhasPorChave.get(chave);
  const payload = () => ({execucoes, nomes:Object.fromEntries([...campos].map(([id,campo]) => [id,campo.value])),
    revisados:node('revisados').checked});
  const corCategoria = papel => favorabilidade ? papel === 'grade' ? '#176878' : '#69438a'
    : papel === 'restricao' ? '#b42335' : '#c18b00';
  const vazio = valor => valor == null || (typeof valor === 'string' && !valor.trim());
  const filtroTabela = criarFiltroResultados('ev-sobreposicoes-filtro', () => {
    pagina = 0; atualizarVisaoTabela(); tabela(); controles();
  });
  const resumoTabela = criarResumoResultados({
    node:node(favorabilidade ? 'agregados' : 'tabela-resumo'), selecionar, controles, avisar, tabelaAgregada:favorabilidade,
    salvarNomeAnalise:favorabilidade ? undefined : (chave, nome) => post(`${rota}/demanda/nome`, {execucao:entrada().id, chave, nome}),
    aoSalvar(codigo, nome, {chave:chaveEditada, local}) {
      for (const e of modelo.entradas) for (const linha of e.linhas) {
        if (local ? e === entrada() && linha.chave === chaveEditada
          : linha.codigo_demanda === codigo && e.hierarquizacao === entrada().hierarquizacao) linha.nome = nome;
      }
      configurarFiltroTabela();
      atualizarVisaoTabela();
      for (const [id, layer] of camadas) layer.setTooltipContent(el('span', nomeDemanda(linhasPorChave.get(id))));
      if (favorabilidade) estatisticas();
      atualizarSelecao(chave, baseAtiva, classeAtiva);
    },
  });

  function registrosIndices() {
    return entrada().linhas.flatMap(linha => linha.sobreposicoes.length
      ? linha.sobreposicoes.map(item => ({linha,item})) : [{linha,item:null}]);
  }
  function configurarFiltroTabela() {
    const e = entrada();
    filtroTabela.atualizar(favorabilidade ? [
      {id:'demanda', nome:'Demanda', valor:r => nomeDemanda(r.linha)},
      {id:'municipio', nome:'Município de Origem (Feição)', valor:r => r.item?.nome || ''},
      ...['grade','rede'].flatMap(papel => {
        const rotulo = papel === 'grade' ? 'Municípios' : 'Rede rodoviária';
        const valor = r => r.item && e.campos.find(c => c.id === r.item.base_id).papel === papel ? r.item.favorabilidade : null;
        return [
          {id:`indice-${papel}`, nome:`Índice de Favorabilidade Dimensionada - ${rotulo} (0–1)`, valor:r => valor(r) ? indiceTexto(valor(r)) : ''},
          {id:`classe-${papel}`, nome:`Classe de Favorabilidade - ${rotulo}`, valor:r => valor(r) ? classeTexto(valor(r)) : ''},
        ];
      }),
    ] : [
      {id:'id', nome:'Identificador', valor:l => String(l.id)},
      {id:'nome', nome:'Nome', valor:nomeDemanda},
      ...e.campos.map((c, i) => ({id:c.id, nome:c.nome,
        valor:l => l.areas[i] === null ? '' : `${area(l.areas[i])} km² · ${area(l.areas[i],1e4)} ha`})),
    ], favorabilidade ? registrosIndices() : e.linhas);
  }
  function atualizarVisaoTabela() {
    const e = entrada();
    if (favorabilidade) {
      const ordem = new Map([...e.linhas].sort(compararDemandas).map((l,i) => [l.chave,i]));
      linhasTabela = filtroTabela.filtrar(registrosIndices()).filter(({item}) => !ocultarVazias || item &&
          (item.favorabilidade.estado_indice === 'valido' || item.favorabilidade.estado_indice === 'invalido'
            || item.favorabilidade.estado_classe === 'valido'))
        .sort((a,b) => ordem.get(a.linha.chave)-ordem.get(b.linha.chave) ||
          compararIndices(a.item?.favorabilidade,b.item?.favorabilidade));
      return;
    }
    camposTabela = e.campos.map((campo, posicao) => ({campo, posicao}))
      .filter(({posicao}) => !ocultarVazias || e.linhas.some(l => !vazio(l.areas[posicao])));
    linhasTabela = ocultarVazias ? e.linhas.filter(l => l.areas.some(valor => !vazio(valor))) : e.linhas;
    linhasTabela = filtroTabela.filtrar(linhasTabela);
  }

  function controles() {
    const bloqueado = ocupado || externo;
    node('vazio').hidden = Boolean(modelo);
    node('abrir').setAttribute('aria-disabled', String(bloqueado));
    document.getElementById('ev-resultados').querySelectorAll('input,button,select').forEach(c => { c.disabled = bloqueado; });
    node('download').disabled = bloqueado || !modelo || gerandoPacote;
    node('anterior').disabled = bloqueado || !modelo || pagina === 0;
    node('proxima').disabled = bloqueado || !modelo || (pagina+1)*50 >= linhasTabela.length;
    node('vazias').disabled = bloqueado || !modelo;
    filtroTabela?.controles(bloqueado);
    document.querySelectorAll('#ev-resultados-paginacao button, #ev-resumo-paginacao button')
      .forEach(botao => { botao.disabled = bloqueado || !modelo || botao.dataset.limite === 'true'; });
    resumoTabela?.controles(bloqueado);
    if (favorabilidade) node('percentil').disabled = bloqueado || node('posicao').value !== 'percentil';
  }
  function invalidar() {
    modelo = null;
    node('revisados').checked = false;
    node('conteudo').hidden = true;
    node('download').disabled = true;
    if (!favorabilidade) informar('Confirme os nomes revisados para atualizar a apresentação e a exportação.');
  }
  async function operar(acao) {
    if (ocupado || externo) return;
    ocupado = true; aoOcupar(true); controles();
    emOperacao = true; ultimaMensagem = '';
    try {
      await acao();
      processoResultados?.sucesso({title:'Resultados da Favorabilidade Territorial', message:ultimaMensagem});
    }
    catch (erro) {
      processoResultados?.erro({title:'Resultados não carregados', message:erro.message});
      node('status').textContent = erro.message;
      avisar(erro.message, 'error');
    }
    finally { processoResultados = null; emOperacao = false; ocupado = false; aoOcupar(false); controles(); }
  }
  async function apresentar() {
    informar('Conferindo a saída gravada, suas interseções e os nomes de apresentação…');
    const resposta = await post(`${rota}/visualizar`, payload());
    modelo = resposta;
    for (const fonte of modelo.fontes) campos.get(fonte.id).value = fonte.nome;
    node('entrada').replaceChildren(...modelo.entradas.map((e,i) => new Option(e.nome, String(i))));
    indice = 0;
    node('metodologia').textContent = modelo.metodologia;
    node('conteudo').hidden = false;
    formulario.hidden = true;
    entradaAtual();
    const mensagem = modelo.concluidas === modelo.previstas
      ? 'Resultados conferidos. Os nomes foram salvos; o pacote inclui todas as demandas, independentemente da seleção em tela.'
      : `Resultados parciais: ${modelo.concluidas} de ${modelo.previstas} entradas. O PDF identificará essa condição.`;
    informar(mensagem);
    if (modelo.relatorios_hierarquizacao?.length) {
      informar(mensagem + ` PDF gravado no Storage e associado ao Relatório da Fase ${favorabilidade ? 2 : 1} em Gestão das hierarquizações.`);
    }
    if (favorabilidade) {
      const itens = sobreposicoesDaAnalise(modelo.entradas);
      const incompletos = itens.filter(item => item.favorabilidade.estado_indice !== 'valido'
        || item.favorabilidade.estado_classe !== 'valido').length;
      if (incompletos) {
        const alerta = `Atenção: ${incompletos} combinação(ões) com índice ou classe ausente, nulo ou inválido. Os campos são sinalizados nas tabelas; índices sem valor válido não entram nas estatísticas. Não foi atribuída área ou zero no lugar desses valores.`;
        node('status').textContent += ` ${alerta}`;
        avisar(alerta, 'warning');
      }
    }
  }
  async function carregar(dados) {
    if (favorabilidade) informar('Preparando os nomes e conferindo as saídas persistidas da análise…');
    if (!dados) dados = await post(`${rota}/preparar`, {execucoes});
    fontes = dados.fontes;
    campos.clear(); node('nomes').replaceChildren();
    for (const [i, fonte] of fontes.entries()) {
      const origem = fontes.find(f => f.id === fonte.base_id);
      const grupo = el('div', undefined, 'ea-field');
      const label = el('label', fonte.tipo === 'feicao'
        ? `${papeis[fonte.papel]} · Feição de ${origem?.nome || fonte.nome}`
        : `${papeis[fonte.papel]} · Camada`);
      const campo = el('input');
      campo.id = `ev-alias-${i}`; campo.name = `alias-${i}`; campo.value = fonte.nome;
      campo.required = true; campo.maxLength = 160; label.htmlFor = campo.id; campo.oninput = invalidar;
      campos.set(fonte.id, campo); grupo.append(label, campo); node('nomes').append(grupo);
    }
    node('tentar').hidden = true;
    node('revisados').checked = Boolean(dados.revisados);
    if (dados.revisados) await apresentar();
    else {
      informar(`${dados.concluidas} de ${dados.previstas} entradas concluídas. Confira os nomes das camadas e das feições.`);
      formulario.hidden = false;
    }
  }
  async function selecionarExecucoes(identificadores, dados) {
    execucoes = [...identificadores]; invalidar(); formulario.hidden = true;
    try { await carregar(dados); }
    catch (erro) { node('tentar').hidden = false; throw erro; }
  }
  function selecionar(novaChave, novaBase='', novaClasse='', zoom=true) {
    if (ocupado || externo) return;
    atualizarSelecao(novaChave, novaBase, novaClasse, zoom);
  }
  function atualizarSelecao(novaChave, novaBase='', novaClasse='', zoom=false) {
    chave = novaChave; baseAtiva = novaBase; classeAtiva = novaClasse;
    const e = entrada(), linha = linhaAtual(), b = basesPorId.get(baseAtiva);
    const classe = linha.sobreposicoes.find(c => c.id === classeAtiva);
    const daBase = linha.sobreposicoes.filter(c => c.base_id === baseAtiva), nome = nomeDemanda(linha);
    if (!classe) classeAtiva = '';
    const posicao = favorabilidade ? linhasTabela.findIndex(r => r.linha === linha &&
      (!classeAtiva || r.item?.id === classeAtiva)) : linhasTabela.indexOf(linha);
    if (posicao >= 0) pagina = Math.floor(posicao / 50);
    if (!favorabilidade) node('id-ativo').textContent = linha.id;
    if (!favorabilidade) node('nome-ativo').textContent = nome;
    if (!favorabilidade) {
      node('total-km').textContent = areaLegivel(linha.area_total_m2);
      node('total-ha').textContent = `${area(linha.area_total_m2,1e4)} ha`;
    }
    node('base').value = baseAtiva;
    if (!favorabilidade) {
      node('detalhes-base').hidden = !b; node('detalhes-classe').hidden = !classe; node('metricas').hidden = !b;
      node('frase').textContent = classe ? `A demanda “${nome}” apresenta ${classe.area_m2 === 0 ? 'contato sem área' : 'sobreposição'} com “${classe.nome}”.`
        : b ? daBase.length ? `A demanda “${nome}” apresenta interseção com ${daBase.length} ${daBase.length === 1 ? 'feição' : 'feições'} da camada “${b.nome}”.`
          : `Não foi identificada interseção entre “${nome}” e as feições da camada “${b.nome}”.`
        : linha.sobreposicoes.length ? `A demanda “${nome}” apresenta interseção com ${linha.sobreposicoes.length} ${linha.sobreposicoes.length === 1 ? 'feição' : 'feições'} das camadas analisadas.`
          : `Não foi identificada interseção entre “${nome}” e as camadas analisadas.`;
    }
    if (!favorabilidade && b) {
      const valor = classe ? classe.area_m2 : linha.areas[e.campos.indexOf(b)];
      node('categoria').textContent = papeis[b.papel]; node('categoria').style.color = corCategoria(b.papel);
      node('nome-base').textContent = b.nome; node('nome-classe').textContent = classe?.nome || '';
      node('rotulo-area').textContent = classe ? 'Área Sobreposta à Feição' : 'Área Sobreposta à Camada';
      node('area-km').textContent = areaLegivel(valor);
      node('area-ha').textContent = valor === null ? 'Sem interseção' : `${area(valor,1e4)} ha`;
      node('percentual').textContent = valor === null ? '—' : `${numero(valor / linha.area_total_m2 * 100)}%`;
      node('area-km').style.color = node('percentual').style.color = corCategoria(b.papel);
    }
    if (!favorabilidade) node('aviso').textContent = classe ? `${numero(classe.percentual)}% da área de “${nome}” se sobrepõe a “${classe.nome}”.`
      : b ? daBase.length ? 'Selecione uma feição no gráfico para consultar sua área sobreposta.'
        : 'O mapa mostra a demanda, pois não há interseção com esta camada.'
      : 'Selecione uma camada ou uma feição no gráfico para consultar os detalhes.';
    if (!favorabilidade) {
      const itens = linha.sobreposicoes.map(item => {
        const botao = el('button', undefined, 'evr-feicao');
        botao.type = 'button'; botao.dataset.classe = item.id; botao.style.color = corCategoria(item.papel);
        botao.setAttribute('aria-pressed', String(classeAtiva ? item.id === classeAtiva : Boolean(baseAtiva) && item.base_id === baseAtiva));
        botao.append(el('strong', `${item.nome} [${item.identificador}]`),
          el('span', `${papeis[item.papel]} · ${basesPorId.get(item.base_id).nome}`),
          el('span', `${area(item.area_m2)} km² · ${area(item.area_m2,1e4)} ha · ${numero(item.percentual)}% da demanda${item.area_m2 === 0 ? ' · Contato sem área' : ''}`));
        botao.onclick = () => selecionar(chave, item.base_id, item.id);
        return botao;
      });
      node('feicoes-demanda').replaceChildren(...(itens.length ? itens : [el('p', 'Nenhuma feição intersectada.', 'ea-hint')]));
    }
    for (const [id, layer] of camadas) layer.setStyle({color:id === chave ? '#087fb7' : '#466171', weight:id === chave ? 4 : 2, fillOpacity:id === chave ? .12 : .04});
    for (const r of recortes) {
      const ativo = r.chave === chave && (classeAtiva ? r.feicao === classeAtiva : baseAtiva ? r.base === baseAtiva : true);
      r.layer.setStyle(favorabilidade ? {fillOpacity:1,weight:r.poligono ? 0 : 3,opacity:1}
        : {fillOpacity:ativo ? .55 : .12, weight:ativo ? 3 : 1, opacity:ativo ? 1 : .4});
    }
    mapaFavorabilidade?.selecionar(baseAtiva, classeAtiva, chave);
    mapaElegibilidade?.selecionar(chave, baseAtiva, classeAtiva);
    tabela(); resumoTabela?.selecionar(chave); grafico(); mapa.invalidateSize({pan:false});
    if (zoom) {
      const alvos = recortes.filter(r => r.chave === chave && (classeAtiva ? r.feicao === classeAtiva : baseAtiva ? r.base === baseAtiva : false));
      if (!mapa.hasLayer(demandas)) demandas.addTo(mapa);
      if (b) {       const grupo = b.papel === categorias[0] ? restricoes : riscos; if (!mapa.hasLayer(grupo)) grupo.addTo(mapa); }
      alvos.forEach(r => r.layer.bringToFront());
      const bounds = alvos.length ? window.L.featureGroup(alvos.map(r => r.layer)).getBounds() : camadas.get(chave).getBounds();
      mapa.fitBounds(bounds, {padding:[24,24], maxZoom:17, animate:false});
    }
    controles();
  }
  function tabelaIndices() {
    const e = entrada(), head = el('thead'), trHead = el('tr'), body = el('tbody');
    for (const titulo of ['Demanda','Município de Origem (Feição)',
      'Índice de Favorabilidade Dimensionada - Municípios (0–1)','Classe de Favorabilidade - Municípios',
      'Índice de Favorabilidade Dimensionada - Rede Rodoviária (0–1)','Classe de Favorabilidade - Rede Rodoviária']) {
      const th = el('th',titulo); th.scope = 'col'; trHead.append(th);
    }
    head.append(trHead);
    for (const {linha,item} of linhasTabela.slice(pagina*50,(pagina+1)*50)) {
      const ativa = linha.chave === chave && (item ? item.id === classeAtiva : !classeAtiva);
      const tr = el('tr',undefined,ativa ? 'ativo' : '');
      tr.dataset.chave = linha.chave; tr.dataset.feicao = item?.id || '';
      tr.tabIndex = 0; tr.setAttribute('aria-selected',String(ativa));
      const demanda = el('td',nomeDemanda(linha));
      tr.append(demanda);
      if (item) {
        const base = basesPorId.get(item.base_id), valor = item.favorabilidade;
        tr.append(el('td',item.nome));
        for (const papel of ['grade','rede']) {
          if (base.papel !== papel) { tr.append(el('td','—'),el('td','—')); continue; }
        const indice = el('td',indiceTexto(valor)), classe = el('td',classeTexto(valor));
        indice.dataset.papel = papel; classe.dataset.classes = papel;
        indice.title = valor.campo_indice; classe.title = valor.campo_classe;
        if (item.area_m2 === 0) indice.append(el('small','Contato sem área','evr-secundario'));
        tr.append(indice,classe);
        }
        tr.title = `${base.nome} · ${item.nome} [${item.identificador}]`;
      } else {
        const semIntersecao = el('td','Sem interseção; nenhum índice ou classe atribuído.');
        semIntersecao.colSpan = 5; tr.append(semIntersecao);
      }
      tr.onclick = () => selecionar(linha.chave,item?.base_id || '',item?.id || '');
      tr.onkeydown = event => {
        if (event.target === tr && ['Enter',' '].includes(event.key)) { event.preventDefault(); tr.click(); }
      };
      body.append(tr);
    }
    if (!linhasTabela.length) {
      const tr = el('tr'), td = el('td','Nenhum registro encontrado com os filtros e a visibilidade atuais. Limpe os filtros ou mostre os registros sem índice e classe.');
      td.colSpan = 6; tr.append(td); body.append(tr);
    }
    node('tabela').replaceChildren(head,body);
    rodapeTabela(registrosIndices().length, r => r.linha.chave === chave && (r.item ? r.item.id === classeAtiva : !classeAtiva));
    const botao = node('vazias'), rotulo = `${ocultarVazias ? 'Mostrar' : 'Ocultar'} registros sem índice e classe`;
    botao.title = rotulo; botao.setAttribute('aria-label',rotulo); botao.setAttribute('aria-pressed',String(ocultarVazias));
    botao.querySelector('i').className = `fas fa-eye${ocultarVazias ? '' : '-slash'}`;
    node('visibilidade').textContent = ocultarVazias
      ? 'Registros sem valores ocultos. Índice zero e índices inválidos sinalizados permanecem visíveis.'
      : 'Todas as combinações e demandas sem interseção visíveis. Sem agregação de índices ou classes.';
  }
  function tabela() {
    if (favorabilidade) { tabelaIndices(); return; }
    const e = entrada(), head = el('thead'), grupos = el('tr'), nomes = el('tr');
    for (const [nome,papel,n] of [['Camada de Entrada','',2],
      ...categorias.map(p => [papeis[p],p,camposTabela.filter(({campo}) => campo.papel === p).length])]) {
      if (!n) continue;
      const th = el('th',nome,papel); th.colSpan = n; th.scope = 'colgroup'; grupos.append(th);
    }
    for (const [nome,papel] of [['Identificador',''],['Nome',''],...camposTabela.map(({campo}) => [campo.nome,campo.papel])]) {
      const th = el('th',nome,papel); th.scope = 'col'; nomes.append(th);
    }
    head.append(grupos,nomes);
    const body = el('tbody');
    for (const l of linhasTabela.slice(pagina*50,(pagina+1)*50)) {
      const tr = el('tr',undefined,l.chave === chave ? 'ativo' : '');
      tr.dataset.chave = l.chave; tr.tabIndex = 0; tr.setAttribute('aria-selected',String(l.chave === chave));
      tr.append(el('td',l.id),el('td',nomeDemanda(l)));
      camposTabela.forEach(({campo:c, posicao}) => {
        const selecionada = l.chave === chave && c.id === baseAtiva;
        const td = el('td',undefined,`${c.papel}${selecionada ? ' ativa' : ''}`), valor = l.areas[posicao];
        td.dataset.base = c.id;
        const botao = el('button',valor === null ? '—' : `${area(valor)} km²`);
        botao.type = 'button'; botao.setAttribute('aria-pressed',String(selecionada));
        botao.setAttribute('aria-label',`${nomeDemanda(l)} · ${c.nome} · ${valor === null ? 'Sem interseção' : `${area(valor)} km²`}`);
        botao.append(el('span',valor === null ? 'Sem interseção' : `${area(valor,1e4)} ha`,'evr-secundario'));
        const classe = l.sobreposicoes.find(s => s.id === classeAtiva);
        if (selecionada && classe) botao.append(el('span',`Em foco: ${classe.nome}`,'evr-foco'));
        botao.onclick = event => { event.stopPropagation(); selecionar(l.chave,c.id); };
        td.append(botao); tr.append(td);
      });
      tr.onclick = () => selecionar(l.chave);
      tr.onkeydown = event => { if (event.target === tr && ['Enter',' '].includes(event.key)) { event.preventDefault(); selecionar(l.chave); } };
      body.append(tr);
    }
    if (!linhasTabela.length) {
      const tr = el('tr'), td = el('td', 'Nenhuma demanda com valores de sobreposição. Use o botão de mostrar vazias para restaurar a tabela.');
      td.colSpan = camposTabela.length + 2;
      tr.append(td); body.append(tr);
    }
    node('tabela').replaceChildren(head,body);
    rodapeTabela(e.feicoes, l => l.chave === chave);
    const botao = node('vazias'), rotulo = `${ocultarVazias ? 'Mostrar' : 'Ocultar'} linhas e colunas vazias`;
    botao.title = rotulo; botao.setAttribute('aria-label', rotulo); botao.setAttribute('aria-pressed', String(ocultarVazias));
    botao.querySelector('i').className = `fas fa-eye${ocultarVazias ? '' : '-slash'}`;
    const linhasOcultas = e.linhas.filter(l => l.areas.every(vazio)).length, colunasOcultas = e.campos.length-camposTabela.length;
    node('visibilidade').textContent = ocultarVazias
      ? `Ocultas: ${linhasOcultas} ${linhasOcultas === 1 ? 'linha' : 'linhas'} e ${colunasOcultas} ${colunasOcultas === 1 ? 'coluna' : 'colunas'}. Zero é um valor válido.`
      : 'Todas as linhas e colunas visíveis.';
  }
  function rodapeTabela(total, selecionada) {
    paginarResultados({prefixo:'ev-resultados', linhas:linhasTabela, pagina,
      mudar:p => { pagina = p; tabela(); controles(); }, selecionada, total});
    const navegacao = node('paginacao');
    navegacao.querySelectorAll('button')[1].id = 'ev-resultados-anterior';
    navegacao.querySelectorAll('button')[2].id = 'ev-resultados-proxima';
    navegacao.querySelector('span').id = 'ev-resultados-pagina';
  }
  function grafico() {
    if (favorabilidade) {
      renderizarIndices({container:node('indices-grafico'),itens:sobreposicoesDaAnalise(modelo.entradas),entradas:modelo.entradas,
        selecionada:item => item.entradaIndice === indice && item.demandaChave === chave &&
          (item.tipo === 'demanda' || item.base_id === baseAtiva && item.id === classeAtiva),
        aoSelecionar:item => {
          if (indice !== item.entradaIndice) {
            indice = item.entradaIndice; node('entrada').value = String(indice); entradaAtual();
          }
          selecionar(item.demandaChave,item.base_id,item.id);
        }});
      return;
    }
    renderizarRoscaDemandas({svg:node('rosca'), legenda:node('legenda'), itens:demandasDaAnalise(modelo.entradas),
      cor:item => corCategoria(item.papel),
      selecionada:item => item.entradaIndice === indice && item.demandaChave === chave &&
        (item.tipo === 'demanda' || (classeAtiva ? item.id === classeAtiva : baseAtiva ? item.base_id === baseAtiva : true)),
      aoSelecionar:item => {
        if (indice !== item.entradaIndice) {
          indice = item.entradaIndice; node('entrada').value = String(indice); entradaAtual();
        }
        selecionar(item.demandaChave, item.tipo === 'demanda' ? '' : item.base_id, item.tipo === 'demanda' ? '' : item.id);
      }});
  }
  function entradaAtual() {
    const e = entrada();
    configurarFiltroTabela();
    resumoTabela?.atualizar(e);
    atualizarVisaoTabela();
    linhasPorChave = new Map(e.linhas.map(l => [l.chave,l]));
    basesPorId = new Map(e.campos.map(c => [c.id,c]));
    pagina = 0; baseAtiva = ''; classeAtiva = ''; chave = e.linhas[0].chave;
    node('resumo').textContent = `${e.nome} · ${e.feicoes} demandas · ${e.com_intersecao} com interseção · ${e.sem_intersecao} sem interseção.`;
    node('composicao').textContent = `As demandas foram comparadas com ${e.campos.length} camadas, organizadas abaixo por categoria. O painel apresenta somente os dados da saída gravada.`;
    for (const papel of categorias) {
      const itens = e.campos.filter(c => c.papel === papel).map(c => el('span',c.nome,'evr-chip'));
      node(`fontes-${papel}`).replaceChildren(...(itens.length ? itens : [el('span','Nenhuma camada nesta categoria.','ea-hint')]));
    }
    node('base').replaceChildren(new Option('Todas as Camadas — Sem Destaque',''),...e.campos.map(c => new Option(`${papeis[c.papel]} · ${c.nome}`,c.id)));
    if (favorabilidade) estatisticas();
    mapaElegibilidade?.destruir(); mapaElegibilidade = null;
    mapaFavorabilidade?.destruir(); mapaFavorabilidade = null;
    if (mapa) mapa.remove();
    node('mapa').replaceChildren(); node('nota-mapa').textContent = ''; camadas = new Map(); recortes = [];
    const L = window.L;
    if (!L) throw new Error('O mapa Leaflet não foi carregado. Recarregue a página.');
    mapa = L.map(node('mapa'),{scrollWheelZoom:false});
    const fundo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(mapa);
    fundo.on('tileerror',() => { node('nota-mapa').textContent = 'O mapa-base está indisponível. As geometrias da análise continuam disponíveis.'; });
    if (!favorabilidade) for (const [nome,z] of [['ev-superficies',350],['ev-recortes',410],['ev-demandas',430],['ev-localizadores',450]]) mapa.createPane(nome).style.zIndex = z;
    demandas = L.featureGroup().addTo(mapa); restricoes = L.featureGroup().addTo(mapa); riscos = L.featureGroup().addTo(mapa);
    for (const feature of e.geometrias.features) {
      const id = feature.properties.chave, linha = linhasPorChave.get(id);
      const layer = L.geoJSON(feature,{smoothFactor:0,pane:favorabilidade ? 'overlayPane' : 'ev-demandas',style:{color:'#003b5a',weight:2,fill:false,fillOpacity:0},
        ...(favorabilidade ? {pointToLayer:(_,latlng) => L.circleMarker(latlng,{radius:6,fill:true,fillOpacity:1})} : {})}).addTo(demandas);
      layer.bindTooltip(el('span',nomeDemanda(linha))); layer.on('click',() => selecionar(id)); camadas.set(id,layer);
    }
    for (const feature of e.intersecoes.features) {
      const p = feature.properties, b = basesPorId.get(p.base_id);
      const linha = linhasPorChave.get(p.chave), classe = linha.sobreposicoes.find(c => c.id === p.feicao_id);
      const cor = favorabilidade ? corClasse(classe.favorabilidade) : corCategoria(b.papel);
      const poligono = ['Polygon','MultiPolygon'].includes(feature.geometry.type);
      const layer = L.geoJSON(feature,{smoothFactor:0,pane:favorabilidade ? 'overlayPane' : 'ev-recortes',style:{color:cor,fillColor:cor,fillOpacity:favorabilidade ? 1 : .3,weight:favorabilidade ? (poligono ? 0 : 3) : 1.5},
        pointToLayer:(_,latlng) => L.circleMarker(latlng,{pane:favorabilidade ? 'overlayPane' : 'ev-recortes',radius:5,color:cor,fillColor:cor})});
      layer.addTo(b.papel === categorias[0] ? restricoes : riscos);
      layer.bindTooltip(el('span',`${nomeDemanda(linha)} · ${classe.nome} · ${b.nome}${favorabilidade
        ? ` · ${classe.favorabilidade.campo_indice}: ${indiceTexto(classe.favorabilidade)} · ${classeTexto(classe.favorabilidade)}` : ''}`));
      layer.on('click',() => selecionar(p.chave,p.base_id,p.feicao_id));
      recortes.push({chave:p.chave,base:p.base_id,feicao:p.feicao_id,poligono,layer});
    }
    if (favorabilidade) L.control.layers({}, {'Demandas':demandas},{collapsed:true}).addTo(mapa);
    mapa.fitBounds(demandas.getBounds(),{padding:[30,30],animate:false});
    if (favorabilidade) {
      mapaFavorabilidade = criarMapaFavorabilidade({mapa,entrada:e,recortes,demandas,node,avisar});
    }
    if (!favorabilidade) mapaElegibilidade = criarMapaElegibilidade({mapa,fundo,entrada:e,demandas,recortes,camadas,node,selecionar});
    atualizarSelecao(chave);
    mapa.fitBounds(demandas.getBounds(),{padding:[30,30],animate:false});
  }
  function estatisticas() {
    const medida = ['tendencia','dispersao','posicao'].map(id => node(id).value).find(Boolean) || '';
    node('percentil-campo').hidden = medida !== 'percentil';
    const percentil = node('percentil').valueAsNumber;
    if (medida === 'percentil' && (!Number.isFinite(percentil) || percentil < 0 || percentil > 100)) {
      resumoTabela.atualizarTabela(el('table'));
      node('estatisticas-status').textContent = 'Informe um percentil numérico entre 0 e 100 para apresentar os resultados.';
      return;
    }
    const tabela = el('table');
    renderizarAgregados({tabela,entrada:entrada(),medida,
      percentil});
    resumoTabela.atualizarTabela(tabela);
    node('estatisticas-status').textContent = medida
      ? 'Consulta estatística por demanda, separando grade e rede. Somente índices válidos entram no cálculo; classes originais mantidas. Nenhum índice oficial foi alterado. O PDF mantém os valores originais.'
      : 'Valores originais por demanda, em ordem decrescente. Repetições são mantidas; nenhuma estatística aplicada.';
  }
  if (favorabilidade) {
    for (const id of ['tendencia','dispersao','posicao']) {
      node(id).onchange = () => {
        if (ocupado || externo || !modelo) return;
        if (node(id).value) {
          for (const outro of ['tendencia','dispersao','posicao']) if (outro !== id) node(outro).value = '';
        }
        estatisticas(); controles();
      };
    }
    node('percentil').oninput = () => { if (!ocupado && !externo && modelo) estatisticas(); };
  }
  formulario.onsubmit = event => { event.preventDefault(); if (formulario.reportValidity()) operar(apresentar); };
  node('editar').onclick = () => { formulario.hidden = false; formulario.scrollIntoView({block:'nearest'}); };
  node('entrada').onchange = event => { indice = Number(event.target.value); entradaAtual(); };
  node('base').onchange = event => selecionar(chave,event.target.value);
  node('enquadrar').onclick = () => mapa.fitBounds(demandas.getBounds(),{padding:[30,30],animate:false});
  node('anterior').onclick = () => { pagina--; tabela(); controles(); };
  node('proxima').onclick = () => { pagina++; tabela(); controles(); };
  node('vazias').onclick = () => {
    if (ocupado || externo || !modelo) return;
    ocultarVazias = !ocultarVazias; pagina = 0;
    atualizarVisaoTabela(); tabela(); controles();
  };
  node('revisados').onchange = () => { if (!node('revisados').checked) { modelo = null; node('conteudo').hidden = true; controles(); } };
  node('tentar').onclick = () => operar(carregar);
  node('abrir').onclick = event => {
    event.preventDefault();
    operar(async () => {
      const arquivo = await escolherArquivo({
        title:`Selecionar análise de ${analise} já realizada`,
        raiz:'saidas-geoespaciais', extensoes:['gpkg'], validar:false, somenteReferencias:true,
      });
      if (!arquivo) return;
      informar('Lendo e conferindo o GeoPackage da análise selecionada no storage…');
      const dados = await post(`${rota}/abrir`, {arquivo:arquivo.arquivo});
      await selecionarExecucoes(dados.execucoes, dados);
    });
  };
  const exportarPacote = async () => {
    informar('Gerando o PDF completo e gravando o pacote com todas as demandas e interseções no storage…');
    const response = await fetch(`${base}${rota}/pacote`,{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
    if (!response.ok) {
      const E = window.SicardApiErro;
      if (E) { const err = await E.deResposta(response, {method:'POST', url:`${base}${rota}/pacote`}); err.message = `Falha ao gerar o pacote: ${err.message}. As camadas foram mantidas.`; throw err; }
      const mensagem = await response.text();
      let erro;
      try { erro = JSON.parse(mensagem).detail; }
      catch { throw new Error(`Não foi possível gerar o pacote (HTTP ${response.status}). As camadas foram mantidas.`); }
      throw new Error(typeof erro === 'string' ? erro : 'O servidor recusou os dados do relatório.');
    }
    if (!response.headers.get('content-type')?.includes('application/zip')) throw new Error('O servidor não retornou um pacote ZIP.');
    const url = URL.createObjectURL(await response.blob()), link = el('a');
    link.href = url; link.download = 'Relatório e Camadas.zip'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url),30000);
    informar('Pacote gravado no storage. Download do relatório e das camadas iniciado.');
    avisar('Relatório completo e camadas disponíveis no pacote.','success');
  };
  node('download').onclick = favorabilidade ? () => operar(exportarPacote) : async () => {
    if (gerandoPacote || ocupado || externo || !modelo) return;
    gerandoPacote = true; controles();
    try { await exportarPacote(); }
    catch (erro) { informar(erro.message); avisar(erro.message,'error'); }
    finally { gerandoPacote = false; controles(); }
  };
  return {
    atualizar(busy) { externo = busy; controles(); },
    iniciar() { pendentes = []; },
    adicionar(ident) { pendentes.push(ident); },
    async finalizar() {
      if (!pendentes.length) return;
      const identificadores = [...pendentes]; pendentes = [];
      try { await selecionarExecucoes(identificadores); }
      catch (erro) {
        const mensagem = `As camadas foram produzidas, mas os resultados não puderam ser preparados: ${erro.message}`;
        node('status').textContent = mensagem;
        node('tentar').hidden = false; avisar(mensagem,'error');
      }
    },
  };
}
