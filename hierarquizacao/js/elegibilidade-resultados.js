import {post, base} from '../../geoespacial/extracao-atributos/api.js';
import {el} from '../../geoespacial/extracao-atributos/ui.js';

const rota = '/extracao-atributos/elegibilidade/resultados';
const papeis = {entrada:'Entrada', restricao:'Restrição', risco:'Risco'};
const ns = 'http://www.w3.org/2000/svg';
const numero = valor => valor.toLocaleString('pt-BR', {
  minimumFractionDigits:2, maximumFractionDigits:valor !== 0 && Math.abs(valor) < .01 ? 20 : 2,
});
const area = (valor, divisor=1e6) => valor === null ? '—' : numero(valor / divisor);
const nomeDemanda = linha => linha.nome || `Demanda ${linha.id}`;
const svgNode = (tag, atributos, texto) => {
  const node = document.createElementNS(ns, tag);
  for (const [chave, valor] of Object.entries(atributos)) node.setAttribute(chave, String(valor));
  if (texto !== undefined) node.textContent = texto;
  return node;
};

export function criarResultados({avisar, aoOcupar}) {
  const node = id => document.getElementById(`ev-resultados-${id}`);
  const formulario = node('aliases'), campos = new Map(), cores = new Map();
  let pendentes = [], execucoes = [], fontes = [], modelo = null, pagina = 0, indice = 0;
  let ocupado = false, externo = false, chave = '0', baseAtiva = '', classeAtiva = '';
  let mapa = null, demandas = null, restricoes = null, riscos = null, camadas = new Map(), recortes = [];
  let linhasPorChave = new Map(), basesPorId = new Map();
  const entrada = () => modelo.entradas[indice];
  const linhaAtual = () => linhasPorChave.get(chave);
  const payload = () => ({execucoes, nomes:Object.fromEntries([...campos].map(([id,campo]) => [id,campo.value])),
    revisados:node('revisados').checked});
  const corCategoria = papel => papel === 'restricao' ? '#852c38' : '#856100';
  const corClasse = id => cores.get(id);

  function controles() {
    const bloqueado = ocupado || externo;
    document.getElementById('ev-resultados').querySelectorAll('input,button,select').forEach(c => { c.disabled = bloqueado; });
    node('download').disabled = bloqueado || !modelo;
    node('anterior').disabled = bloqueado || !modelo || pagina === 0;
    node('proxima').disabled = bloqueado || !modelo || (pagina+1)*50 >= entrada().linhas.length;
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
  }
  async function carregar() {
    const dados = await post(`${rota}/preparar`, {execucoes});
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
    pagina = Math.floor(e.linhas.indexOf(linha) / 50);
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
    tabela(); grafico(linha); mapa.invalidateSize({pan:false});
    if (zoom) {
      const alvos = recortes.filter(r => r.chave === chave && (classeAtiva ? r.feicao === classeAtiva : baseAtiva ? r.base === baseAtiva : false));
      if (!mapa.hasLayer(demandas)) demandas.addTo(mapa);
      if (b) { const grupo = b.papel === 'restricao' ? restricoes : riscos; if (!mapa.hasLayer(grupo)) grupo.addTo(mapa); }
      alvos.forEach(r => r.layer.bringToFront());
      const bounds = alvos.length ? window.L.featureGroup(alvos.map(r => r.layer)).getBounds() : camadas.get(chave).getBounds();
      mapa.fitBounds(bounds, {padding:[24,24], maxZoom:17, animate:false});
    }
    controles();
  }
  function tabela() {
    const e = entrada(), head = el('thead'), grupos = el('tr'), nomes = el('tr');
    for (const [nome,papel,n] of [['Camada de Entrada','',2],
      ...['restricao','risco'].map(p => [papeis[p],p,e.campos.filter(c => c.papel === p).length])]) {
      if (!n) continue;
      const th = el('th',nome,papel); th.colSpan = n; th.scope = 'colgroup'; grupos.append(th);
    }
    for (const [nome,papel] of [['Identificador',''],['Nome',''],...e.campos.map(c => [c.nome,c.papel])]) {
      const th = el('th',nome,papel); th.scope = 'col'; nomes.append(th);
    }
    head.append(grupos,nomes);
    const body = el('tbody');
    for (const l of e.linhas.slice(pagina*50,(pagina+1)*50)) {
      const tr = el('tr',undefined,l.chave === chave ? 'ativo' : '');
      tr.dataset.chave = l.chave; tr.tabIndex = 0; tr.setAttribute('aria-selected',String(l.chave === chave));
      tr.append(el('td',l.id),el('td',nomeDemanda(l)));
      e.campos.forEach((c,i) => {
        const selecionada = l.chave === chave && c.id === baseAtiva;
        const td = el('td',undefined,`${c.papel}${selecionada ? ' ativa' : ''}`), valor = l.areas[i];
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
    node('tabela').replaceChildren(head,body);
    node('pagina').textContent = `Página ${pagina+1} de ${Math.max(1,Math.ceil(e.linhas.length/50))} · ${e.feicoes} demandas`;
  }
  function grafico(linha) {
    const svg = node('rosca'), legenda = node('legenda'), classes = linha.sobreposicoes;
    svg.replaceChildren(); legenda.replaceChildren();
    const total = classes.reduce((s,c) => s+c.area_m2,0), ponto = (r,a) => `${120+r*Math.cos(a)},${120+r*Math.sin(a)}`;
    svg.append(svgNode('circle',{cx:120,cy:120,r:84,fill:'none',stroke:'#edf1f4','stroke-width':38}));
    let inicio = -Math.PI/2;
    for (const c of classes) {
      const b = basesPorId.get(c.base_id), cor = corClasse(c.id);
      const destacada = classeAtiva ? c.id === classeAtiva : c.base_id === baseAtiva;
      const rotulo = `${c.nome} · ${b.nome} · ${area(c.area_m2)} km²`;
      const escolher = () => selecionar(chave,c.base_id,c.id);
      if (c.area_m2 > 0) {
        const fim = inicio+Math.min(c.area_m2/total*2*Math.PI,2*Math.PI-.000001), grande = fim-inicio > Math.PI ? 1 : 0;
        const d = `M ${ponto(103,inicio)} A 103 103 0 ${grande} 1 ${ponto(103,fim)} L ${ponto(65,fim)} A 65 65 0 ${grande} 0 ${ponto(65,inicio)} Z`;
        const path = svgNode('path',{d,fill:cor,opacity:baseAtiva && !destacada ? .25 : 1,tabindex:0,role:'button','aria-label':rotulo,'aria-pressed':String(destacada),'data-classe':c.id});
        path.append(svgNode('title',{},rotulo)); path.onclick = escolher;
        path.onkeydown = event => { if (['Enter',' '].includes(event.key)) { event.preventDefault(); escolher(); } };
        svg.append(path); inicio = fim;
      }
      const botao = el('button',undefined,`evr-classe${destacada ? ' ativa' : ''}`);
      botao.type = 'button'; botao.dataset.classe = c.id; botao.setAttribute('aria-pressed',String(destacada)); botao.setAttribute('aria-label',rotulo);
      botao.title = `${papeis[c.papel]} · ${b.nome}`;
      const pontoCor = el('span',undefined,'evr-ponto'); pontoCor.style.background = cor;
      const texto = el('span',c.nome);
      if (classes.some(outro => outro.id !== c.id && outro.nome === c.nome)) texto.append(el('small',`${b.nome} · ${c.identificador}`));
      if (c.area_m2 === 0) texto.append(el('small','Contato sem Área'));
      botao.append(pontoCor,texto); botao.onclick = escolher; legenda.append(botao);
    }
    svg.append(svgNode('text',{x:120,y:117,'text-anchor':'middle',fill:'#003b5a','font-size':30,'font-weight':'bold'},classes.length));
    svg.append(svgNode('text',{x:120,y:139,'text-anchor':'middle',fill:'#637b8d','font-size':12},classes.length ? 'Feições' : 'Sem Interseção'));
  }
  function entradaAtual() {
    const e = entrada();
    linhasPorChave = new Map(e.linhas.map(l => [l.chave,l]));
    basesPorId = new Map(e.campos.map(c => [c.id,c]));
    pagina = 0; baseAtiva = ''; classeAtiva = ''; chave = e.linhas[0].chave;
    node('resumo').textContent = `${e.nome} · ${e.feicoes} demandas · ${e.com_intersecao} com interseção · ${e.sem_intersecao} sem interseção.`;
    node('composicao').textContent = `As demandas foram comparadas com ${e.campos.length} camadas, organizadas abaixo por categoria. O painel apresenta somente os dados da saída gravada.`;
    for (const papel of ['restricao','risco']) {
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
      const layer = L.geoJSON(feature,{style:{color:'#003b5a',weight:2,fillOpacity:.09}}).addTo(demandas);
      layer.bindTooltip(el('span',nomeDemanda(linha))); layer.on('click',() => selecionar(id)); camadas.set(id,layer);
    }
    for (const feature of e.intersecoes.features) {
      const p = feature.properties, b = basesPorId.get(p.base_id);
      const linha = linhasPorChave.get(p.chave), classe = linha.sobreposicoes.find(c => c.id === p.feicao_id);
      const cor = corCategoria(b.papel);
      const layer = L.geoJSON(feature,{style:{color:cor,fillColor:cor,fillOpacity:.3,weight:1.5},
        pointToLayer:(_,latlng) => L.circleMarker(latlng,{radius:5,color:cor,fillColor:cor})});
      layer.addTo(b.papel === 'restricao' ? restricoes : riscos);
      layer.bindTooltip(el('span',`${nomeDemanda(linha)} apresenta interseção com ${classe.nome} · ${b.nome}`));
      layer.on('click',() => selecionar(p.chave,p.base_id,p.feicao_id));
      recortes.push({chave:p.chave,base:p.base_id,feicao:p.feicao_id,layer});
    }
    L.control.layers({}, {'Demandas':demandas,'Restrição':restricoes,'Risco':riscos},{collapsed:true}).addTo(mapa);
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
  node('revisados').onchange = () => { if (!node('revisados').checked) { modelo = null; node('conteudo').hidden = true; controles(); } };
  node('tentar').onclick = () => operar(carregar);
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
      execucoes = [...pendentes]; pendentes = []; invalidar(); formulario.hidden = true; node('vazio').hidden = true;
      try { await carregar(); }
      catch (erro) {
        node('status').textContent = `As camadas foram produzidas, mas os resultados não puderam ser preparados: ${erro.message}`;
        node('tentar').hidden = false; avisar(node('status').textContent,'error');
      }
    },
  };
}
