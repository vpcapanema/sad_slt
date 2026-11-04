import {post} from '../../geoespacial/extracao-atributos/api.js';
import {renderizarLegendaFavorabilidade} from './favorabilidade-legenda.js?v=20261027-escala-completa';
import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {corClasse, compararIndices, classeTexto, indiceTexto} from './favorabilidade-indices.js?v=20261023-classes-ordem';

const PANE = 'fv-superficies';

export function criarMapaFavorabilidade({mapa, entrada, recortes, demandas, node, avisar}) {
  const L = window.L, estados = new Map();
  let ativo = true, timer, enquadramentoInicial = true;
  const cancelarEnquadramento = () => { enquadramentoInicial = false; };
  mapa.getContainer().addEventListener('pointerdown', cancelarEnquadramento);
  mapa.getContainer().addEventListener('wheel', cancelarEnquadramento, {passive:true});
  // As superfícies ficam num pane abaixo do overlayPane (recortes e demandas) e num único renderizador canvas:
  // milhares de polígonos municipais ou trechos de rede não viram nós SVG individuais.
  if (!mapa.getPane(PANE)) mapa.createPane(PANE).style.zIndex = 350;
  const renderizador = L.canvas({pane:PANE, padding:.5});
  const superficie = node('mapa-superficie'), representacao = node('mapa-representacao');
  superficie.replaceChildren(...entrada.campos.map(c => new Option(
    `${c.papel === 'grade' ? 'Municípios' : 'Rede rodoviária'} · ${c.nome}`, c.id)));
  representacao.value = 'classe';
  let feicaoAtiva = '', demandaAtiva = '';
  // `vista` descreve a extensão e o zoom já desenhados; `cache` guarda as respostas por vista para que voltar a
  // uma vista anterior, ou trocar e retomar a superfície, não consulte o servidor outra vez. `valores` acumula
  // as classes já vistas da fonte para a legenda não oscilar entre vistas.
  const estadoDe = base => {
    if (!estados.has(base)) estados.set(base, {grupo:L.layerGroup(), geracao:0, vista:null, pendente:null,
      cache:new Map(), valores:new Map(), dados:null, erro:null, erroAvisado:null});
    return estados.get(base);
  };
  const historicos = base => entrada.linhas.flatMap(l => l.sobreposicoes.filter(s => s.base_id === base).map(s => s.favorabilidade));
  const valores = base => [...historicos(base), ...estadoDe(base).valores.values()];
  function vistaAtual() {
    const b = mapa.getBounds().pad(.5), zoom = Math.round(mapa.getZoom());
    const bounds = [Math.max(-180, b.getWest()), Math.max(-90, b.getSouth()), Math.min(180, b.getEast()), Math.min(90, b.getNorth())];
    const visivel = mapa.getBounds();
    const tolerancia = Math.min(.1, (visivel.getEast() - visivel.getWest()) / Math.max(1, mapa.getSize().x) / 2);
    return {bounds, zoom, tolerancia, chave:`${zoom}|${bounds.map(v => v.toFixed(4)).join(',')}`};
  }
  function vistaServe(vista) {
    if (!vista) return false;
    const visivel = mapa.getBounds(), zoom = Math.round(mapa.getZoom());
    const [o, s, l, n] = vista.bounds;
    return zoom >= vista.zoom && zoom <= vista.zoom + 1
      && visivel.getWest() >= o && visivel.getSouth() >= s && visivel.getEast() <= l && visivel.getNorth() <= n;
  }
  function nota() {
    const base = superficie.value, estado = estadoDe(base), caixa = node('mapa-camada-nota');
    node('mapa-recarregar').hidden = !estado.erro;
    if (estado.erro) caixa.textContent = `Camada oficial indisponível: ${estado.erro} Os resultados da execução foram mantidos.`;
    else if (estado.pendente && !estado.dados) caixa.textContent = 'Carregando a camada oficial vinculada ao processamento…';
    else if (!estado.dados) caixa.textContent = 'A camada oficial ainda não foi carregada. Os resultados da execução permanecem nas tabelas.';
    else if (estado.dados.tipo === 'raster') caixa.textContent = estado.dados.origem;
    else caixa.textContent = `Camada oficial vinculada à execução: ${entrada.campos.find(c => c.id === base).nome}.`
      + (estado.pendente ? ' Atualizando a vista…' : '');
  }
  function desenhar() {
    if (!ativo) return;
    const base = superficie.value, cor = corClasse;
    for (const [id, estado] of estados) {
      const mostrar = id === base;
      if (mostrar && !mapa.hasLayer(estado.grupo)) estado.grupo.addTo(mapa);
      if (!mostrar && mapa.hasLayer(estado.grupo)) mapa.removeLayer(estado.grupo);
    }
    for (const r of recortes) {
      const mostrar = r.base === base && r.feicao === feicaoAtiva && r.chave === demandaAtiva;
      const valor = entrada.linhas.find(l => l.chave === r.chave).sobreposicoes.find(s => s.id === r.feicao).favorabilidade;
      const c = cor(valor);
      r.layer.setStyle({color:c,fillColor:c,fillOpacity:mostrar ? 1 : 0,opacity:mostrar ? 1 : 0,weight:r.poligono ? 0 : 3});
      if (mostrar) r.layer.bringToFront();
      r.layer.eachLayer(layer => { if (layer.getElement()) layer.getElement().style.pointerEvents = mostrar ? '' : 'none'; });
    }
    demandas.eachLayer(grupo => {
      grupo.eachLayer(layer => {
        if (!(layer instanceof L.CircleMarker)) return;
        const linha = entrada.linhas.find(l => l.chave === layer.feature.properties.chave);
        const itens = (linha?.sobreposicoes || []).filter(s => s.base_id === base);
        const item = linha?.chave === demandaAtiva && itens.find(s => s.id === feicaoAtiva)
          || [...itens].sort((a,b) => compararIndices(a.favorabilidade,b.favorabilidade))[0];
        const c = cor(item?.favorabilidade);
        layer.setStyle({color:c,fillColor:c,fillOpacity:1,opacity:1});
      });
      grupo.bringToFront();
    });
    renderizarLegendaFavorabilidade(node('mapa-legenda'), valores(base));
    nota();
  }
  function desenharSuperficie(estado, dados) {
    estado.grupo.clearLayers();
    L.geoJSON(dados.geometrias,{pane:PANE,renderer:renderizador,
      style:feature => { const c = corClasse(feature.properties.favorabilidade); return {color:c,fillColor:c,weight:0,fillOpacity:1}; },
      pointToLayer:(feature,latlng) => L.circleMarker(latlng,{pane:PANE,renderer:renderizador,radius:6,
        color:corClasse(feature.properties.favorabilidade),
        fillColor:corClasse(feature.properties.favorabilidade),fillOpacity:1}),
      onEachFeature(feature,layer) {
        const p = feature.properties, v = p.favorabilidade;
        estado.valores.set(`${v.estado_classe}|${v.classe}`, v);
        const original = v.estado_original === 'valido' ? v.indice_original.toLocaleString('pt-BR') : 'Ausente ou inválido';
        layer.bindTooltip(el('span',`${p.nome} · ${v.campo_original}: ${original} · ${v.campo_indice}: ${indiceTexto(v)} · ${classeTexto(v)}`));
      }}).addTo(estado.grupo);
    mapa.getContainer().dataset.fvSuperficies = String(dados.geometrias.features.length);
  }
  function enquadrar(estado, dados) {
    if (!enquadramentoInicial) return;
    const limites = dados.extensao
      ? L.latLngBounds([[dados.extensao[1], dados.extensao[0]], [dados.extensao[3], dados.extensao[2]]])
      : L.featureGroup(estado.grupo.getLayers()).getBounds();
    if (!limites.isValid()) return;
    enquadramentoInicial = false;
    mapa.invalidateSize({pan:false});
    // Superfície integral e contexto regional, como na referência de São Paulo.
    mapa.fitBounds(limites.pad(.2), {padding:[16,16], animate:false});
  }
  async function carregar(forcar = false) {
    const base = superficie.value, estado = estadoDe(base);
    if (!ativo || !base) return;
    // Raster: a resposta são os recortes preservados, independentes da vista; basta uma consulta.
    if (estado.dados?.tipo === 'raster' && !forcar) return;
    if (!forcar && vistaServe(estado.vista)) return;
    const vista = vistaAtual(), emCache = forcar ? null : estado.cache.get(vista.chave);
    if (emCache) {
      estado.geracao++; estado.pendente = null; estado.vista = vista; estado.dados = emCache;
      desenharSuperficie(estado, emCache); desenhar(); return;
    }
    if (estado.pendente === vista.chave && !forcar) return;
    const geracao = ++estado.geracao;
    estado.pendente = vista.chave; estado.erro = null; nota();
    try {
      const dados = await post('/extracao-atributos/favorabilidade/resultados/superficie',
        {execucao:entrada.id, base_id:base, bounds:vista.bounds, tolerancia:vista.tolerancia});
      if (!ativo) return;
      if (estado.cache.size >= 8) estado.cache.delete(estado.cache.keys().next().value);
      estado.cache.set(vista.chave, dados);
      if (geracao !== estado.geracao) { if (estado.pendente === vista.chave) estado.pendente = null; return; }
      estado.pendente = null; estado.vista = vista; estado.dados = dados; estado.erroAvisado = null;
      desenharSuperficie(estado, dados);
      if (superficie.value !== base) return;
      desenhar();
      enquadrar(estado, dados);
    } catch (erro) {
      if (!ativo || geracao !== estado.geracao) return;
      estado.pendente = null; estado.vista = null;
      const repetido = estado.erroAvisado === erro.message;
      estado.erro = estado.erroAvisado = erro.message;
      if (superficie.value !== base) return;
      nota();
      // Cada movimento do mapa tenta de novo; o aviso só é repetido se a falha mudar.
      if (!repetido) avisar(`Não foi possível carregar a camada oficial da execução: ${erro.message}`, 'error');
    }
  }
  function atualizar(forcar = false) {
    desenhar();
    carregar(forcar === true);
  }
  const mover = () => { clearTimeout(timer); timer = setTimeout(() => carregar(), 300); };
  mapa.on('moveend', mover);
  superficie.onchange = () => atualizar();
  representacao.onchange = desenhar; node('mapa-recarregar').onclick = () => atualizar(true);
  atualizar();
  return {
    selecionar(base, feicao, demanda) {
      if (feicao) cancelarEnquadramento();
      const mudou = base && superficie.value !== base;
      if (base) superficie.value = base;
      feicaoAtiva = feicao; demandaAtiva = demanda;
      if (mudou) atualizar();
      else desenhar();
    },
    destruir() {
      ativo = false; clearTimeout(timer); mapa.off('moveend', mover);
      mapa.getContainer().removeEventListener('pointerdown', cancelarEnquadramento);
      mapa.getContainer().removeEventListener('wheel', cancelarEnquadramento);
    },
  };
}
