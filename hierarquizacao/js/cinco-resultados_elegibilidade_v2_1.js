import {post, base} from '../../geoespacial/extracao-atributos/api.js';
import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {escolherArquivo} from '../../geoespacial/extracao-atributos/explorador.js?v=20261020-saidas';
import {nomeDemanda} from './nome-demanda.js?v=20261023-nomes';

const rota = '/extracao-atributos/elegibilidade/resultados';
const numero = n => n == null ? 'Não informado' : Number(n).toLocaleString('pt-BR',{maximumFractionDigits:8});
const area = n => n == null ? 'Sem interseção' : `${numero(n)} m²`;
const categoria = p => p === 'restricao' ? 'Restrição' : 'Risco';
const cor = p => p === 'restricao' ? '#b42335' : '#bd8700';

export function criarResultados({avisar, aoOcupar}) {
  const root = document.getElementById('cinco-resultados_elegibilidade_v2_1');
  const node = id => root.querySelector(`#ev21-${id}`);
  let modelo = null, execucoes = [], pendentes = [], campos = new Map();
  let ocupado = false, externo = false, indice = 0, chave = '', foco = '', mapa = null, geometria = null, recortes = null;
  const entrada = () => modelo?.entradas[indice];
  const demanda = () => entrada()?.linhas.find(l => l.chave === chave);
  const informar = texto => { node('status').textContent = texto; };
  const payload = () => ({execucoes,nomes:Object.fromEntries([...campos].map(([id,input]) => [id,input.value])),revisados:node('revisados').checked});
  function controles() {
    root.querySelectorAll('button,input,select').forEach(n => { n.disabled = ocupado || externo; });
    node('download').disabled = ocupado || externo || !modelo;
  }
  async function operar(fn) {
    if (ocupado || externo) return;
    ocupado = true; aoOcupar(true); controles();
    try { await fn(); }
    catch (erro) { informar(erro.message); avisar(erro.message,'error'); }
    finally { ocupado = false; aoOcupar(false); controles(); }
  }
  function tabela(id, titulos, linhas) {
    const head = el('thead'), tr = el('tr'), body = el('tbody');
    for (const titulo of titulos) { const th = el('th',titulo); th.scope = 'col'; tr.append(th); }
    head.append(tr);
    for (const valores of linhas) {
      const row = el('tr');
      for (const valor of valores) { const td = el('td'); td.append(valor instanceof Node ? valor : document.createTextNode(String(valor))); row.append(td); }
      body.append(row);
    }
    node(id).replaceChildren(head,body);
  }
  function botao(texto, acao) { const b = el('button',texto); b.type = 'button'; b.onclick = acao; return b; }
  function enquadrar() { if (geometria?.getBounds().isValid()) mapa.fitBounds(geometria.getBounds(),{padding:[30,30],maxZoom:18,animate:false}); }
  function desenhar() {
    const e = entrada(), d = demanda(), L = window.L;
    if (!mapa) {
      mapa = L.map(node('mapa'),{scrollWheelZoom:false});
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'})
        .on('tileerror',() => { node('mapa-status').textContent = 'Fundo cartográfico indisponível. A geometria da demanda e suas interseções permanecem disponíveis.'; }).addTo(mapa);
      L.control.scale({imperial:false}).addTo(mapa);
    }
    if (geometria) mapa.removeLayer(geometria);
    if (recortes) mapa.removeLayer(recortes);
    const features = e.geometrias.features.filter(f => f.properties.chave === chave);
    geometria = L.geoJSON({type:'FeatureCollection',features},{smoothFactor:0,style:{color:'#087fb7',weight:4,fillOpacity:0}}).addTo(mapa);
    geometria.bindTooltip(el('span',nomeDemanda(d)));
    const permitidas = new Set(itensFiltrados().map(s => s.id));
    recortes = L.geoJSON({type:'FeatureCollection',features:e.intersecoes.features.filter(f => f.properties.chave === chave && permitidas.has(f.properties.feicao_id))},{
      smoothFactor:0,
      style:f => { const item = d.sobreposicoes.find(s => s.id === f.properties.feicao_id); return {color:cor(item.papel),weight:3,fillOpacity:!foco || foco === item.id ? .5 : .1}; },
      pointToLayer:(f,ll) => L.circleMarker(ll,{radius:6}),
      onEachFeature:(f,layer) => { const item = d.sobreposicoes.find(s => s.id === f.properties.feicao_id);
        layer.bindTooltip(el('span',`${item.nome} · ${area(item.area_m2)} · ${numero(item.percentual)}% da demanda`));
        layer.on('click',() => destacar(item.id)); },
    }).addTo(mapa);
    geometria.bringToFront(); mapa.invalidateSize({pan:false});
  }
  function itensFiltrados() {
    return demanda().sobreposicoes.filter(s => (!node('categoria').value || s.papel === node('categoria').value) && (!node('base').value || s.base_id === node('base').value));
  }
  function destacar(id) {
    foco = id; desenhar();
    const item = demanda().sobreposicoes.find(s => s.id === id);
    node('filtro-status').textContent = `Em destaque: ${item.nome} · ${area(item.area_m2)} · ${numero(item.percentual)}% da demanda. O mapa mantém o limite completo da demanda.`;
  }
  function intersecoes() {
    const e = entrada(), d = demanda(), itens = itensFiltrados();
    tabela('intersecoes',['Feição intersectada','Categoria','Camada de referência','Área intersectada','% da demanda','Tipo de interseção'],itens.map(s => [
      botao(`${s.nome} [${s.identificador}]`,() => destacar(s.id)),categoria(s.papel),e.campos.find(c => c.id === s.base_id)?.nome || s.base_id,
      area(s.area_m2),`${numero(s.percentual)}%`,s.area_m2 === 0 ? 'Contato sem área' : 'Sobreposição com área',
    ]));
    node('filtro-status').textContent = itens.length ? `${itens.length} feição(ões) exibida(s) de ${d.sobreposicoes.length} intersectada(s) nesta demanda.`
      : d.sobreposicoes.length ? 'Nenhuma interseção corresponde aos filtros escolhidos.' : 'Esta demanda não apresenta interseção com as bases analisadas.';
    desenhar();
  }
  function selecionar(novaChave) {
    chave = novaChave; foco = ''; node('demanda').value = chave; node('categoria').value = ''; node('base').value = '';
    const e = entrada(), d = demanda();
    node('nome').textContent = nomeDemanda(d);
    const dados = [['Identificador',d.id],['Código da demanda',d.codigo_demanda || 'Não informado'],['Área total',area(d.area_total_m2)],['Área em hectares',`${numero(d.area_total_m2/10000)} ha`],['Perímetro',`${numero(d.perimetro_m)} m`]];
    node('dados').replaceChildren(...dados.map(([nome,valor]) => { const div=el('div'); div.append(el('dt',nome),el('dd',String(valor))); return div; }));
    node('situacao').textContent = `${d.sobreposicoes.filter(s => s.papel === 'restricao').length} feição(ões) de restrição e ${d.sobreposicoes.filter(s => s.papel === 'risco').length} de risco intersectam esta demanda, entre ${e.campos.length} bases analisadas.`;
    tabela('bases',['Camada de referência','Categoria','Resultado','Soma das áreas intersectadas'],e.campos.map((c,i) => [c.nome,categoria(c.papel),d.areas[i] == null ? 'Sem interseção' : d.areas[i] === 0 ? 'Contato sem área' : 'Com sobreposição',area(d.areas[i])]));
    intersecoes(); enquadrar();
  }
  function entradaAtual() {
    const e = entrada();
    node('demanda').replaceChildren(...e.linhas.map(l => new Option(`${l.id} · ${nomeDemanda(l)}`,l.chave)));
    node('base').replaceChildren(new Option('Todas as camadas',''),...e.campos.map(c => new Option(c.nome,c.id)));
    node('resumo').textContent = `${e.linhas.length} demandas · ${e.com_intersecao} com interseção · ${e.sem_intersecao} sem interseção.`;
    node('origem').textContent = `Camada: ${e.nome} · Execução: ${e.id}${e.hierarquizacao ? ` · Hierarquização: ${e.hierarquizacao}` : ''}`;
    tabela('comparacao',['Demanda','Área total','Feições de restrição','Feições de risco'],e.linhas.map(l => [botao(`${l.id} · ${nomeDemanda(l)}`,() => { selecionar(l.chave); node('demanda').focus(); }),area(l.area_total_m2),l.sobreposicoes.filter(s => s.papel === 'restricao').length,l.sobreposicoes.filter(s => s.papel === 'risco').length]));
    selecionar(e.linhas[0].chave);
  }
  async function apresentar() {
    informar('Carregando os resultados gravados da análise…');
    const dados = await post(`${rota}/visualizar`,payload());
    if (!dados.entradas?.length || dados.entradas.some(e => !e.linhas?.length)) throw new Error('A análise não contém demandas para apresentação.');
    modelo = dados; indice = 0;
    for (const fonte of modelo.fontes) if (campos.has(fonte.id)) campos.get(fonte.id).value = fonte.nome;
    node('entrada').replaceChildren(...modelo.entradas.map((e,i) => new Option(e.nome,String(i))));
    node('metodologia').textContent = modelo.metodologia;
    node('aliases').hidden = true; node('conteudo').hidden = false; entradaAtual();
    informar(modelo.concluidas === modelo.previstas ? 'Análise carregada. Selecione a demanda que deseja examinar.' : `Resultados parciais: ${modelo.concluidas} de ${modelo.previstas} entradas concluídas.`);
  }
  async function carregar(dados) {
    modelo = null; node('conteudo').hidden = true; node('aliases').hidden = true; node('tentar').hidden = true; controles();
    try {
      dados ||= await post(`${rota}/preparar`,{execucoes});
      campos = new Map(); node('nomes').replaceChildren();
      for (const [i,f] of dados.fontes.entries()) {
        const div=el('div',undefined,'ea-field'), label=el('label',`${f.papel === 'entrada' ? 'Entrada' : categoria(f.papel)} · ${f.tipo === 'feicao' ? 'Feição' : 'Camada'}`),input=el('input');
        input.id=`ev21-alias-${i}`; label.htmlFor=input.id; input.value=f.nome; input.required=true; input.maxLength=160;
        input.oninput=() => { modelo=null; node('conteudo').hidden=true; node('revisados').checked=false; controles(); };
        campos.set(f.id,input); div.append(label,input); node('nomes').append(div);
      }
      node('revisados').checked=Boolean(dados.revisados);
      if (dados.revisados) await apresentar();
      else { node('aliases').hidden=false; informar('Confira os nomes para apresentar os resultados.'); }
    } catch (erro) { node('tentar').hidden=false; throw erro; }
  }
  node('abrir').onclick=() => operar(async () => {
    const arquivo=await escolherArquivo({title:'Selecionar análise de elegibilidade já realizada',raiz:'saidas-geoespaciais',extensoes:['gpkg'],validar:false,somenteReferencias:true});
    if (!arquivo) return;
    const dados=await post(`${rota}/abrir`,{arquivo:arquivo.arquivo}); execucoes=[...dados.execucoes]; await carregar(dados);
  });
  node('aliases').onsubmit=event => { event.preventDefault(); if (node('aliases').reportValidity()) operar(apresentar); };
  node('editar').onclick=() => { node('aliases').hidden=false; node('aliases').scrollIntoView({block:'start'}); };
  node('revisados').onchange=() => { if (!node('revisados').checked) { modelo=null; node('conteudo').hidden=true; controles(); } };
  node('entrada').onchange=() => { indice=Number(node('entrada').value); entradaAtual(); };
  node('demanda').onchange=() => selecionar(node('demanda').value);
  for (const id of ['categoria','base']) node(id).onchange=() => { foco=''; intersecoes(); };
  node('limpar').onclick=() => { foco=''; node('categoria').value=''; node('base').value=''; intersecoes(); };
  node('enquadrar').onclick=enquadrar;
  node('tentar').onclick=() => operar(() => carregar());
  node('download').onclick=() => operar(async () => {
    informar('Gerando o pacote completo da análise…');
    const resposta=await fetch(`${base}${rota}/pacote`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});
    if (!resposta.ok || !resposta.headers.get('content-type')?.includes('application/zip')) throw new Error('Não foi possível gerar o pacote da análise. Tente novamente.');
    const url=URL.createObjectURL(await resposta.blob()),link=el('a'); link.href=url; link.download='Relatório e Camadas.zip'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),30000);
    informar('Download do relatório completo e das camadas iniciado.');
  });
  return {
    atualizar(busy) { externo=busy; controles(); },
    iniciar() { pendentes=[]; },
    adicionar(id) { pendentes.push(id); },
    async finalizar() {
      if (!pendentes.length) return;
      execucoes=[...pendentes]; pendentes=[];
      try { await carregar(); } catch (erro) { informar(`A análise foi gravada, mas sua apresentação falhou: ${erro.message}`); avisar(erro.message,'error'); }
      controles();
    },
  };
}
