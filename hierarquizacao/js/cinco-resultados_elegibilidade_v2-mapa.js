import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {CORES, CORES_SITUACAO, SITUACOES, ROTULOS, formatarPercentual} from './cinco-resultados_elegibilidade_v2-dados.js?v=2';

const TOPO = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
const SATELITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** Mapa do dashboard: cada demanda leva a cor da sua situação; as áreas atingidas por restrição e risco ficam por cima. */
export function criarMapa({container, fundoSelect, nota, aoSelecionar}) {
  let mapa = null, observador = null, ctx = null;
  let demandas = new Map(), situacoes = new Map(), recortes = [], marcadores = new Map(), grupoRecortes, localizadores, fundo, satelite;
  const corDe = chave => CORES_SITUACAO[situacoes.get(chave)];

  const limitesDe = camadas => {
    const grupo = window.L.featureGroup(camadas);
    return grupo.getBounds();
  };
  function enquadrar(limites) {
    if (limites?.isValid()) mapa.fitBounds(limites, {padding: [30, 30], maxZoom: 17, animate: false});
  }
  function posicionarLocalizadores() {
    if (!mapa || !ctx) return;
    localizadores.clearLayers();
    for (const [chave, marcador] of marcadores) {
      if (!ctx.visiveis.has(chave)) continue;
      const b = demandas.get(chave).getBounds();
      const a = mapa.latLngToContainerPoint(b.getNorthWest()), z = mapa.latLngToContainerPoint(b.getSouthEast());
      if (Math.max(Math.abs(a.x - z.x), Math.abs(a.y - z.y)) < 18) marcador.addTo(localizadores);
    }
  }

  function destruir() {
    observador?.disconnect(); observador = null;
    popup = null;
    mapa?.remove(); mapa = null; ctx = null;
    demandas = new Map(); situacoes = new Map(); recortes = []; marcadores = new Map();
    container.replaceChildren();
  }

  function carregar(entrada, fichas) {
    destruir();
    const L = window.L;
    if (!L) throw new Error('O mapa Leaflet não foi carregado. Recarregue a página.');
    nota.textContent = '';
    mapa = L.map(container, {scrollWheelZoom: false});
    for (const [nome, z] of [['ev2-demandas', 420], ['ev2-recortes', 440], ['ev2-localizadores', 460]]) mapa.createPane(nome).style.zIndex = z;
    fundo = L.tileLayer(TOPO, {maxZoom: 19, attribution: 'Tiles © Esri'}).addTo(mapa);
    satelite = L.tileLayer(SATELITE, {maxZoom: 19, attribution: 'Tiles © Esri'});
    fundo.on('tileerror', () => { nota.textContent = 'O mapa de fundo está indisponível. As demandas e as áreas atingidas continuam visíveis.'; });
    satelite.on('tileerror', () => { nota.textContent = 'Imagem de satélite indisponível. Use o fundo cartográfico.'; });
    fundoSelect.value = 'cartografico';
    fundoSelect.onchange = () => {
      const usarSatelite = fundoSelect.value === 'satelite';
      mapa.removeLayer(usarSatelite ? fundo : satelite);
      (usarSatelite ? satelite : fundo).addTo(mapa);
    };
    L.control.scale({imperial: false}).addTo(mapa);
    const grupoDemandas = L.featureGroup().addTo(mapa);
    grupoRecortes = L.featureGroup().addTo(mapa);
    localizadores = L.layerGroup().addTo(mapa);
    const fichaPorChave = new Map(fichas.map(f => [f.chave, f]));
    const bases = new Map(entrada.campos.map(c => [c.id, c]));

    for (const feature of entrada.geometrias.features) {
      const chave = feature.properties.chave, ficha = fichaPorChave.get(chave);
      situacoes.set(chave, ficha.situacao);
      const cor = corDe(chave);
      const camada = L.geoJSON(feature, {
        smoothFactor: 0, pane: 'ev2-demandas',
        style: {color: cor, weight: 2, fillColor: cor, fillOpacity: .08},
        pointToLayer: (_, latlng) => L.circleMarker(latlng, {pane: 'ev2-demandas', radius: 6, color: cor, fillColor: cor, fillOpacity: .5}),
      }).addTo(grupoDemandas);
      camada.bindTooltip(el('span', `${ficha.nome} · ${SITUACOES[ficha.situacao]}`), {sticky: true});
      camada.on('click', () => { if (ctx.visiveis.has(chave)) aoSelecionar({chave}); });
      demandas.set(chave, camada);
      marcadores.set(chave, L.circleMarker(camada.getBounds().getCenter(), {
        pane: 'ev2-localizadores', radius: 7, color: '#fff', weight: 2, fillColor: cor, fillOpacity: 1,
      }).bindTooltip(el('span', `${ficha.nome} · ${SITUACOES[ficha.situacao]} (amplie o mapa para ver o limite da demanda)`))
        .on('click', () => aoSelecionar({chave})));
    }
    for (const feature of entrada.intersecoes.features) {
      const p = feature.properties, base = bases.get(p.base_id);
      const ficha = fichaPorChave.get(p.chave), item = ficha.linha.sobreposicoes.find(s => s.id === p.feicao_id);
      const cor = CORES[base.papel];
      const camada = L.geoJSON(feature, {
        smoothFactor: 0, pane: 'ev2-recortes', style: {color: cor, fillColor: cor, weight: 1, fillOpacity: .4},
        pointToLayer: (_, latlng) => L.circleMarker(latlng, {pane: 'ev2-recortes', radius: 5, color: cor, fillColor: cor}),
      });
      camada.bindTooltip(el('span', `${ficha.nome} · ${ROTULOS[base.papel]}: ${item.nome} (camada ${base.nome}) · atinge ${formatarPercentual(item.percentual)} da demanda`), {sticky: true});
      camada.on('click', event => {
        window.L.DomEvent.stopPropagation(event);
        aoSelecionar({chave: p.chave, base: p.base_id, feicao: p.feicao_id});
      });
      recortes.push({chave: p.chave, base: p.base_id, feicao: p.feicao_id, papel: base.papel, camada});
    }
    mapa.on('moveend', posicionarLocalizadores);
    observador = new ResizeObserver(() => mapa?.invalidateSize({pan: false}));
    observador.observe(container);
    ctx = {visiveis: new Set(fichas.map(f => f.chave)), categorias: new Set(['restricao', 'risco']), selecao: {chave: '', base: '', feicao: ''}};
    enquadrar(grupoDemandas.getBounds());
  }

  function aplicar(novo, {zoom = false} = {}) {
    if (!mapa) return;
    ctx = novo;
    const {selecao, visiveis, categorias} = ctx, temSelecao = Boolean(selecao.chave);
    for (const [chave, camada] of demandas) {
      const ativa = chave === selecao.chave, cor = corDe(chave);
      camada.setStyle(ativa ? {color: cor, weight: 5, opacity: 1, fillOpacity: .22}
        : visiveis.has(chave) ? {color: cor, weight: 2, opacity: temSelecao ? .5 : 1, fillOpacity: temSelecao ? .04 : .08}
          : {color: '#a7b4bd', weight: 1, opacity: .35, fillOpacity: 0});
    }
    for (const r of recortes) {
      const mostrar = visiveis.has(r.chave) && categorias.has(r.papel);
      if (!mostrar) { grupoRecortes.removeLayer(r.camada); continue; }
      if (!grupoRecortes.hasLayer(r.camada)) grupoRecortes.addLayer(r.camada);
      const destaque = r.chave === selecao.chave && (!selecao.feicao || r.feicao === selecao.feicao);
      r.camada.setStyle({
        color: CORES[r.papel], fillColor: CORES[r.papel], weight: destaque ? 3 : 1,
        opacity: destaque ? 1 : temSelecao ? .35 : .85, fillOpacity: destaque ? .75 : temSelecao ? .12 : .4,
      });
      if (destaque && temSelecao) r.camada.bringToFront();
    }
    posicionarLocalizadores();
    if (!zoom) return;
    if (selecao.feicao) enquadrar(limitesDe(recortes.filter(r => r.chave === selecao.chave && r.feicao === selecao.feicao).map(r => r.camada)));
    else if (temSelecao) enquadrar(demandas.get(selecao.chave).getBounds());
    else enquadrarTodas();
  }

  function enquadrarTodas() {
    if (!mapa || !ctx) return;
    enquadrar(limitesDe([...demandas].filter(([chave]) => ctx.visiveis.has(chave)).map(([, camada]) => camada)));
  }

  let popup = null;
  function fecharPopup() { if (popup && mapa) mapa.closePopup(popup); popup = null; }
  function abrirPopup(chave, feicao, conteudo) {
    const r = mapa && recortes.find(x => x.chave === chave && x.feicao === feicao);
    if (!r) return;
    fecharPopup();
    popup = window.L.popup({maxWidth: 380, minWidth: 240, className: 'ev2-popup', autoPanPadding: [24, 24]})
      .setLatLng(r.camada.getBounds().getCenter()).setContent(conteudo).openOn(mapa);
  }

  return {carregar, aplicar, enquadrarTodas, destruir, abrirPopup, fecharPopup,
    atualizarPopup: () => popup?.update(), redimensionar: () => mapa?.invalidateSize({pan: false})};
}
