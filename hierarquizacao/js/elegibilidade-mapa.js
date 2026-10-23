import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {post} from '../../geoespacial/extracao-atributos/api.js';
import {nomeDemanda} from './nome-demanda.js?v=20261023-nomes';

export const areaLegivel = valor => valor == null ? 'Sem interseção'
  : `${(valor < 10000 ? valor : valor < 1e6 ? valor/1e4 : valor/1e6).toLocaleString('pt-BR', {
    maximumFractionDigits:valor > 0 && valor < .01 ? 12 : 2,
  })} ${valor < 10000 ? 'm²' : valor < 1e6 ? 'ha' : 'km²'}`;

let sequencia = 0;
export function criarMapaElegibilidade({mapa, fundo, entrada, demandas, recortes, camadas, node, selecionar}) {
  const L = window.L, id = ++sequencia, superficies = new Map(), localizadores = L.layerGroup().addTo(mapa);
  const cores = {restricao:'#b42335',risco:'#c18b00'};
  let vivo = true, timer, atual = null;
  const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:19,attribution:'Tiles © Esri'});
  satelite.on('tileerror', () => { node('nota-mapa').textContent = 'Imagem de satélite indisponível. Use o fundo cartográfico.'; });
  node('mapa-fundo').value = 'cartografico';
  node('mapa-fundo').onchange = () => {
    const usarSatelite = node('mapa-fundo').value === 'satelite';
    mapa.removeLayer(usarSatelite ? fundo : satelite);
    (usarSatelite ? satelite : fundo).addTo(mapa);
  };
  L.control.scale({imperial:false}).addTo(mapa);
  const marcadores = new Map();
  for (const linha of entrada.linhas) {
    const marcador = L.circleMarker(camadas.get(linha.chave).getBounds().getCenter(), {
      pane:'ev-localizadores',radius:7,color:'#fff',weight:2,fillColor:'#087fb7',fillOpacity:1,
    }).bindTooltip(el('span',`${nomeDemanda(linha)} · Localizador da demanda; amplie para ver o limite real.`));
    marcador.on('click',() => selecionar(linha.chave)); marcadores.set(linha.chave,marcador);
  }
  function posicionarLocalizadores() {
    localizadores.clearLayers();
    for (const [chave,marcador] of marcadores) {
      const b = camadas.get(chave).getBounds();
      const a = mapa.latLngToContainerPoint(b.getNorthWest()), z = mapa.latLngToContainerPoint(b.getSouthEast());
      if (Math.max(Math.abs(a.x-z.x),Math.abs(a.y-z.y)) < 18) marcador.addTo(localizadores);
    }
  }
  function hachura(layer,papel) {
    layer.eachLayer(l => {
      const path = l.getElement?.(), svg = path?.ownerSVGElement;
      if (!svg || !['Polygon','MultiPolygon'].includes(l.feature?.geometry.type)) return;
      const ident = `ev-hachura-${id}-${papel}`;
      if (!svg.querySelector(`#${ident}`)) {
        const ns = 'http://www.w3.org/2000/svg', defs = document.createElementNS(ns,'defs');
        const pattern = document.createElementNS(ns,'pattern');
        Object.entries({id:ident,width:8,height:8,patternUnits:'userSpaceOnUse',patternTransform:papel === 'restricao' ? 'rotate(45)' : 'rotate(-45)'})
          .forEach(([k,v]) => pattern.setAttribute(k,String(v)));
        const linha = document.createElementNS(ns,'path'); linha.setAttribute('d','M 0 0 L 0 8');
        linha.setAttribute('stroke',cores[papel]); linha.setAttribute('stroke-width','3');
        pattern.append(linha); defs.append(pattern); svg.prepend(defs);
      }
      path.setAttribute('fill',`url(#${ident})`);
    });
  }
  function desenhar() {
    if (!vivo) return;
    for (const r of recortes) {
      const campo = entrada.campos.find(c => c.id === r.base), mostrar = node(`mapa-${campo.papel}`).checked;
      const destaque = r.chave === atual?.chave && (!atual.base || r.base === atual.base) && (!atual.feicao || r.feicao === atual.feicao);
      r.layer.setStyle({color:cores[campo.papel],fillColor:cores[campo.papel],fillOpacity:mostrar ? destaque ? .85 : .3 : 0,
        opacity:mostrar ? destaque ? 1 : .4 : 0,weight:destaque ? 3 : 1});
      hachura(r.layer,campo.papel);
      r.layer.eachLayer(l => { const n = l.getElement?.(); if (n) n.style.pointerEvents = mostrar ? '' : 'none'; });
    }
    for (const [chave,layer] of camadas) layer.setStyle({color:chave === atual?.chave ? '#087fb7' : '#476474',
      weight:chave === atual?.chave ? 4 : 2,fillOpacity:0});
    posicionarLocalizadores();
  }
  for (const papel of ['restricao','risco']) { node(`mapa-${papel}`).checked = true; node(`mapa-${papel}`).onchange = desenhar; }
  const lista = node('mapa-superficies'); lista.replaceChildren();
  for (const campo of entrada.campos) {
    const item = el('div',undefined,'ev-contexto-item'), label = el('label'), checkbox = el('input');
    checkbox.type = 'checkbox'; checkbox.setAttribute('aria-label',`Superfície: ${campo.nome}`);
    label.append(checkbox,document.createTextNode(`${campo.papel === 'risco' ? 'Risco' : 'Restrição'} · ${campo.nome}`));
    const opacidade = el('input'); opacidade.type = 'range'; opacidade.min = '0'; opacidade.max = '80'; opacidade.value = '25';
    opacidade.setAttribute('aria-label',`Opacidade de ${campo.nome}`);
    const valor = el('output','25%'), status = el('span','Desligada','ea-hint'); status.setAttribute('role','status');
    const estado = {campo,checkbox,opacidade,status,geracao:0,layer:null}; superficies.set(campo.id,estado);
    opacidade.oninput = () => { valor.textContent = `${opacidade.value}%`; estado.layer?.setStyle({fillOpacity:Number(opacidade.value)/100,opacity:Number(opacidade.value)/100}); };
    checkbox.onchange = () => { estado.geracao++; if (estado.layer) mapa.removeLayer(estado.layer); carregar(estado); };
    item.append(label,opacidade,valor,status); lista.append(item);
  }
  async function carregar(estado) {
    if (!vivo || !estado.checkbox.checked) { estado.status.textContent = 'Desligada'; return; }
    const geracao = ++estado.geracao, b = mapa.getBounds();
    estado.status.textContent = 'Carregando superfície…';
    try {
      const dados = await post('/extracao-atributos/elegibilidade/resultados/superficie', {
        execucao:entrada.id,base_id:estado.campo.id,
        bounds:[Math.max(-180,b.getWest()),Math.max(-90,b.getSouth()),Math.min(180,b.getEast()),Math.min(90,b.getNorth())],
        tolerancia:Math.min(.1,(b.getEast()-b.getWest())/Math.max(1,mapa.getSize().x)/2),
      });
      if (!vivo || geracao !== estado.geracao || !estado.checkbox.checked) return;
      if (estado.layer) mapa.removeLayer(estado.layer);
      const cor = cores[estado.campo.papel], opacity = Number(estado.opacidade.value)/100;
      estado.layer = L.geoJSON(dados.geometrias,{pane:'ev-superficies',style:{color:cor,fillColor:cor,weight:1,fillOpacity:opacity,opacity},
        pointToLayer:(_,latlng) => L.circleMarker(latlng,{pane:'ev-superficies',color:cor,radius:4,fillOpacity:opacity}),
        onEachFeature:(f,l) => l.bindTooltip(el('span',`${estado.campo.nome} · ${f.properties.nome} · Superfície de contexto`)),
      }).addTo(mapa);
      estado.status.textContent = dados.geometrias.features.length ? 'Visível na extensão atual' : 'Sem feições nesta extensão';
    } catch (erro) {
      if (vivo && geracao === estado.geracao) {
        if (estado.layer) mapa.removeLayer(estado.layer);
        estado.status.textContent = `Não carregada: ${erro.message}. Desmarque e marque para tentar novamente.`;
      }
    }
  }
  function mover() { desenhar(); clearTimeout(timer); timer = setTimeout(() => superficies.forEach(carregar),300); }
  mapa.on('moveend',mover);
  const observer = new ResizeObserver(() => { if (vivo) mapa.invalidateSize({pan:false}); }); observer.observe(node('mapa'));
  node('mapa-focar').onclick = () => {
    if (atual) mapa.fitBounds(camadas.get(atual.chave).getBounds(),{padding:[30,30],maxZoom:17,animate:false});
  };
  return {
    selecionar(chave,base,feicao) {
      atual = {chave,base,feicao};
      const linha = entrada.linhas.find(l => l.chave === chave), item = linha.sobreposicoes.find(s => s.base_id === base && s.id === feicao);
      node('mapa-resumo').replaceChildren(el('strong',nomeDemanda(linha)),el('span',item
        ? `${entrada.campos.find(c => c.id === base).nome} · ${item.nome} · ${areaLegivel(item.area_m2)} · ${item.percentual.toLocaleString('pt-BR',{maximumFractionDigits:2})}% da demanda`
        : `${areaLegivel(linha.area_total_m2)} · ${linha.sobreposicoes.length ? `${linha.sobreposicoes.length} feição(ões) intersectada(s). Selecione uma para consultar a área e o percentual.` : 'Sem interseção nas camadas analisadas.'}`));
      desenhar();
    },
    destruir() { vivo = false; clearTimeout(timer); observer.disconnect(); mapa.off('moveend',mover); },
  };
}
