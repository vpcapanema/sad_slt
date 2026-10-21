import {post, base} from '../../geoespacial/extracao-atributos/api.js';
import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {escolherArquivo} from '../../geoespacial/extracao-atributos/explorador.js?v=20261020-saidas';
import {sobreposicoesDaAnalise, renderizarRosca} from './sobreposicoes-rosca.js';

const numero = valor => valor.toLocaleString('pt-BR', {
  minimumFractionDigits:2, maximumFractionDigits:valor !== 0 && Math.abs(valor) < .01 ? 20 : 2,
});
const area = (valor, divisor=1e6) => valor === null ? '—' : numero(valor / divisor);
const nomeDemanda = linha => linha.nome || `Demanda ${linha.id}`;

export function criarResultados({avisar, aoOcupar, analise='elegibilidade'}) {
  const favorabilidade = analise === 'favorabilidade';
  const rota = `/extracao-atributos/${analise}/resultados`;
  const categorias = favorabilidade ? ['grade','rede'] : ['restricao','risco'];
  const papeis = favorabilidade ? {entrada:'Entrada', grade:'Favorabilidade de Grade', rede:'Favorabilidade de Rede'}
    : {entrada:'Entrada', restricao:'Restrição', risco:'Risco'};
  const node = id => document.getElementById(`ev-resultados-${id}`);
  const formulario = node('aliases'), campos = new Map(), cores = new Map();
  let pendentes = [], execucoes = [], fontes = [], modelo = null, pagina = 0, indice = 0;
  let ocupado = false, externo = false, chave = '0', baseAtiva = '', classeAtiva = '';
  let mapa = null, demandas = null, restricoes = null, riscos = null, camadas = new Map(), recortes = [];
  let linhasPorChave = new Map(), basesPorId = new Map();
  let ocultarVazias = false, linhasTabela = [], camposTabela = [];
  const entrada = () => modelo.entradas[indice];
  const linhaAtual = () => linhasPorChave.get(chave);
  const payload = () => ({execucoes, nomes:Object.fromEntries([...campos].map(([id,campo]) => [id,campo.value])),
    revisados:node('revisados').checked});
  const corCategoria = papel => favorabilidade ? papel === 'grade' ? '#176878' : '#69438a'
    : papel === 'restricao' ? '#852c38' : '#856100';
  const corClasse = id => cores.get(id);
  const vazio = valor => valor == null || (typeof valor === 'string' && !valor.trim());

  function atualizarVisaoTabela() {
    const e = entrada();
    camposTabela = e.campos.map((campo, posicao) => ({campo, posicao}))
      .filter(({posicao}) => !ocultarVazias || e.linhas.some(l => !vazio(l.areas[posicao])));
    linhasTabela = ocultarVazias ? e.linhas.filter(l => l.areas.some(valor => !vazio(valor))) : e.linhas;
  }

  function controles() {
    const bloqueado = ocupado || externo;
    node('abrir').setAttribute('aria-disabled', String(bloqueado));
    document.getElementById('ev-resultados').querySelectorAll('input,button,select').forEach(c => { c.disabled = bloqueado; });
    node('download').disabled = bloqueado || !modelo;
    node('anterior').disabled = bloqueado || !modelo || pagina === 0;
    node('proxima').disabled = bloqueado || !modelo || (pagina+1)*50 >= linhasTabela.length;
    node('vazias').disabled = bloqueado || !modelo;
  }
  function invalidar() {
    modelo = null;
    node('revisados').checked = false;
    node('conteudo').hidden = true;
    node('download').disabled = true;
    node('status').textContent = 'Confirme os nomes revisados para atualizar a apresentação e a exportação.';
  }
  async function operar(acao) {
    if (ocupado || externo) return;
    ocupado = true; aoOcupar(true); controles();
    try { await acao(); }
    catch (erro) { node('status').textContent = erro.message; avisar(erro.message, 'error'); }
    finally { ocupado = false; aoOcupar(false); controles(); }
  }
  async function apresentar() {
    node('status').textContent = 'Conferindo a saída gravada, suas interseções e os nomes de apresentação…';
    const resposta = await post(`${rota}/visualizar`, payload());
    modelo = resposta;
    for (const fonte of modelo.fontes) campos.get(fonte.id).value = fonte.nome;
    cores.clear();
    modelo.fontes.filter(f => f.tipo === 'feicao').forEach((f,i) => cores.set(f.id, `hsl(${(i*137.508)%360} 47% 42%)`));
    node('entrada').replaceChildren(...modelo.entradas.map((e,i) => new Option(e.nome, String(i))));
    indice = 0;
    node('metodologia').textContent = modelo.metodologia;
    node('conteudo').hidden = false;
    formulario.hidden = true;
    entradaAtual();
    node('status').textContent = modelo.concluidas === modelo.previstas
      ? 'Resultados conferidos. Os nomes foram salvos; o pacote inclui todas as demandas, independentemente da seleção em tela.'
      : `Resultados parciais: ${modelo.concluidas} de ${modelo.previstas} entradas. O PDF identificará essa condição.`;
    if (modelo.relatorios_hierarquizacao?.length) {
      node('status').textContent += ' PDF gravado no Storage e associado ao Relatório da Fase 1 em Gestão das hierarquizações.';
    }
  }
  async function carregar(dados) {
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
      node('status').textContent = `${dados.concluidas} de ${dados.previstas} entradas concluídas. Confira os nomes das camadas e das feições.`;
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
    const posicao = linhasTabela.indexOf(linha);
    if (posicao >= 0) pagina = Math.floor(posicao / 50);
    node('id-ativo').textContent = linha.id; node('nome-ativo').textContent = nome;
    node('total-km').textContent = `${area(linha.area_total_m2)} km²`;
    node('total-ha').textContent = `${area(linha.area_total_m2,1e4)} ha`;
    node('base').value = baseAtiva;
    node('detalhes-base').hidden = !b; node('detalhes-classe').hidden = !classe; node('metricas').hidden = !b;
    node('frase').textContent = classe ? `A demanda “${nome}” apresenta ${classe.area_m2 === 0 ? 'contato sem área' : 'sobreposição'} com “${classe.nome}”.`
      : b ? daBase.length ? `A demanda “${nome}” apresenta interseção com ${daBase.length} ${daBase.length === 1 ? 'feição' : 'feições'} da camada “${b.nome}”.`
        : `Não foi identificada interseção entre “${nome}” e as feições da camada “${b.nome}”.`
      : linha.sobreposicoes.length ? `A demanda “${nome}” apresenta interseção com ${linha.sobreposicoes.length} ${linha.sobreposicoes.length === 1 ? 'feição' : 'feições'} das camadas analisadas.`
        : `Não foi identificada interseção entre “${nome}” e as camadas analisadas.`;
    if (b) {
      const valor = classe ? classe.area_m2 : linha.areas[e.campos.indexOf(b)];
      node('categoria').textContent = papeis[b.papel]; node('categoria').style.color = corCategoria(b.papel);
      node('nome-base').textContent = b.nome; node('nome-classe').textContent = classe?.nome || '';
      node('rotulo-area').textContent = classe ? 'Área Sobreposta à Feição' : 'Área Sobreposta à Camada';
      node('area-km').textContent = valor === null ? '—' : `${area(valor)} km²`;
      node('area-ha').textContent = valor === null ? 'Sem interseção' : `${area(valor,1e4)} ha`;
      node('percentual').textContent = valor === null ? '—' : `${numero(valor / linha.area_total_m2 * 100)}%`;
      node('area-km').style.color = node('percentual').style.color = classe ? corClasse(classe.id) : corCategoria(b.papel);
    }
    node('aviso').textContent = classe ? `${numero(classe.percentual)}% da área de “${nome}” se sobrepõe a “${classe.nome}”.`
      : b ? daBase.length ? 'Selecione uma feição no gráfico para consultar sua área sobreposta.'
        : 'O mapa mostra a demanda, pois não há interseção com esta camada.'
      : 'Selecione uma camada ou uma feição no gráfico para consultar os detalhes.';
    for (const [id, layer] of camadas) layer.setStyle({color:id === chave ? '#087fb7' : '#466171', weight:id === chave ? 4 : 2, fillOpacity:id === chave ? .12 : .04});
    for (const r of recortes) {
      const ativo = r.chave === chave && (classeAtiva ? r.feicao === classeAtiva : baseAtiva ? r.base === baseAtiva : true);
      r.layer.setStyle({fillOpacity:ativo ? .55 : .12, weight:ativo ? 3 : 1, opacity:ativo ? 1 : .4});
    }
    tabela(); grafico(); mapa.invalidateSize({pan:false});
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
  function tabela() {
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
    node('pagina').textContent = `Página ${pagina+1} de ${Math.max(1,Math.ceil(linhasTabela.length/50))} · ` +
      (ocultarVazias ? `${linhasTabela.length} de ${e.feicoes} demandas · ${camposTabela.length} de ${e.campos.length} camadas` : `${e.feicoes} demandas`);
    const botao = node('vazias'), rotulo = `${ocultarVazias ? 'Mostrar' : 'Ocultar'} linhas e colunas vazias`;
    botao.title = rotulo; botao.setAttribute('aria-label', rotulo); botao.setAttribute('aria-pressed', String(ocultarVazias));
    botao.querySelector('i').className = `fas fa-eye${ocultarVazias ? '' : '-slash'}`;
    const linhasOcultas = e.linhas.length-linhasTabela.length, colunasOcultas = e.campos.length-camposTabela.length;
    node('visibilidade').textContent = ocultarVazias
      ? `Ocultas: ${linhasOcultas} ${linhasOcultas === 1 ? 'linha' : 'linhas'} e ${colunasOcultas} ${colunasOcultas === 1 ? 'coluna' : 'colunas'}. Zero é um valor válido.`
      : 'Todas as linhas e colunas visíveis.';
  }
  function grafico() {
    renderizarRosca({svg:node('rosca'), legenda:node('legenda'), itens:sobreposicoesDaAnalise(modelo.entradas),
      cor:item => corClasse(item.id),
      selecionada:item => item.entradaIndice === indice && item.demandaChave === chave &&
        (classeAtiva ? item.id === classeAtiva : item.base_id === baseAtiva),
      aoSelecionar:item => {
        if (indice !== item.entradaIndice) {
          indice = item.entradaIndice; node('entrada').value = String(indice); entradaAtual();
        }
        selecionar(item.demandaChave, item.base_id, item.id);
      }});
  }
  function entradaAtual() {
    const e = entrada();
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
    if (mapa) mapa.remove();
    node('mapa').replaceChildren(); node('nota-mapa').textContent = ''; camadas = new Map(); recortes = [];
    const L = window.L;
    if (!L) throw new Error('O mapa Leaflet não foi carregado. Recarregue a página.');
    mapa = L.map(node('mapa'),{scrollWheelZoom:false});
    const fundo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'}).addTo(mapa);
    fundo.on('tileerror',() => { node('nota-mapa').textContent = 'O mapa-base está indisponível. As geometrias da análise continuam disponíveis.'; });
    demandas = L.featureGroup().addTo(mapa); restricoes = L.featureGroup().addTo(mapa); riscos = L.featureGroup().addTo(mapa);
    for (const feature of e.geometrias.features) {
      const id = feature.properties.chave, linha = linhasPorChave.get(id);
      const layer = L.geoJSON(feature,{smoothFactor:0,style:{color:'#003b5a',weight:2,fillOpacity:.09}}).addTo(demandas);
      layer.bindTooltip(el('span',nomeDemanda(linha))); layer.on('click',() => selecionar(id)); camadas.set(id,layer);
    }
    for (const feature of e.intersecoes.features) {
      const p = feature.properties, b = basesPorId.get(p.base_id);
      const linha = linhasPorChave.get(p.chave), classe = linha.sobreposicoes.find(c => c.id === p.feicao_id);
      const cor = corCategoria(b.papel);
      const layer = L.geoJSON(feature,{smoothFactor:0,style:{color:cor,fillColor:cor,fillOpacity:.3,weight:1.5},
        pointToLayer:(_,latlng) => L.circleMarker(latlng,{radius:5,color:cor,fillColor:cor})});
      layer.addTo(b.papel === categorias[0] ? restricoes : riscos);
      layer.bindTooltip(el('span',`${nomeDemanda(linha)} apresenta interseção com ${classe.nome} · ${b.nome}`));
      layer.on('click',() => selecionar(p.chave,p.base_id,p.feicao_id));
      recortes.push({chave:p.chave,base:p.base_id,feicao:p.feicao_id,layer});
    }
    L.control.layers({}, {'Demandas':demandas,[papeis[categorias[0]]]:restricoes,[papeis[categorias[1]]]:riscos},{collapsed:true}).addTo(mapa);
    atualizarSelecao(chave);
    mapa.fitBounds(demandas.getBounds(),{padding:[30,30],animate:false});
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
      node('status').textContent = 'Lendo e conferindo o GeoPackage da análise selecionada no storage…';
      const dados = await post(`${rota}/abrir`, {arquivo:arquivo.arquivo});
      await selecionarExecucoes(dados.execucoes, dados);
    });
  };
  node('download').onclick = () => operar(async () => {
    node('status').textContent = 'Gerando o PDF completo e gravando o pacote com todas as demandas e interseções no storage…';
    const response = await fetch(`${base}${rota}/pacote`,{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
    if (!response.ok) {
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
    node('status').textContent = 'Pacote gravado no storage. Download do relatório e das camadas iniciado.';
    avisar('Relatório completo e camadas disponíveis no pacote.','success');
  });
  return {
    atualizar(busy) { externo = busy; controles(); },
    iniciar() { pendentes = []; },
    adicionar(ident) { pendentes.push(ident); },
    async finalizar() {
      if (!pendentes.length) return;
      const identificadores = [...pendentes]; pendentes = [];
      try { await selecionarExecucoes(identificadores); }
      catch (erro) {
        node('status').textContent = `As camadas foram produzidas, mas os resultados não puderam ser preparados: ${erro.message}`;
        node('tentar').hidden = false; avisar(node('status').textContent,'error');
      }
    },
  };
}
