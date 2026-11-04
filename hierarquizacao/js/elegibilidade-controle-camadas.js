import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {post} from '../../geoespacial/extracao-atributos/api.js';
import {CORES} from './cinco-resultados_elegibilidade_v2-dados.js?v=20261104-camadas';

export function controleCamadas(mapa, entrada, fundos) {
  const L = window.L, estados = [];
  let vivo = true, timer;
  // Um único renderizador canvas para as superfícies: milhares de polígonos não viram nós SVG individuais.
  const renderizador = L.canvas({pane: 'ev2-superficies', padding: .5});
  const controle = L.control({position: 'topright'});
  controle.onAdd = () => {
    const caixa = el('div', undefined, 'leaflet-control-layers ev2-controle-camadas');
    const botao = el('button', undefined, 'leaflet-control-layers-toggle');
    botao.type = 'button'; botao.title = 'Mapas de fundo, restrições e riscos';
    botao.setAttribute('aria-label', 'Camadas do mapa'); botao.setAttribute('aria-expanded', 'false');
    const menu = el('div', undefined, 'ev2-menu-camadas'); menu.hidden = true;
    const abrir = valor => { menu.hidden = !valor; botao.setAttribute('aria-expanded', String(valor)); };
    botao.onclick = () => abrir(menu.hidden);
    caixa.onkeydown = event => { if (event.key === 'Escape') { abrir(false); botao.focus(); } };
    caixa.addEventListener('focusout', event => { if (!caixa.contains(event.relatedTarget)) abrir(false); });
    const grupo = nome => {
      const fieldset = el('fieldset'); fieldset.append(el('legend', nome)); menu.append(fieldset); return fieldset;
    };
    const mapas = grupo('Mapas de fundo'), checks = [];
    for (const [nome, layer] of fundos) {
      const label = el('label'), check = el('input'); check.type = 'checkbox'; check.checked = mapa.hasLayer(layer);
      label.append(check, el('span', nome)); mapas.append(label); checks.push({check, layer});
      check.onchange = () => {
        if (check.checked) for (const outro of checks) if (outro.check !== check) {
          outro.check.checked = false; mapa.removeLayer(outro.layer);
        }
        if (check.checked) layer.addTo(mapa); else mapa.removeLayer(layer);
      };
    }
    for (const [papel, titulo] of [['restricao', 'Restrição'], ['risco', 'Risco']]) {
      const fieldset = grupo(titulo);
      for (const campo of entrada.campos.filter(c => c.papel === papel)) {
        const label = el('label'), check = el('input'), texto = el('span', campo.nome);
        check.type = 'checkbox'; const status = el('small', '', 'ev2-camada-status'); texto.append(status);
        label.append(check, texto); fieldset.append(label);
        // `vista` descreve a extensão e o zoom já desenhados; `cache` guarda as respostas por vista para
        // que desmarcar e marcar de novo, ou voltar a uma vista anterior, não consulte o servidor outra vez.
        const estado = {campo, check, status, layer: L.layerGroup(), geracao: 0, vista: null, pendente: null, cache: new Map()}; estados.push(estado);
        check.onchange = () => {
          if (check.checked) { estado.layer.addTo(mapa); status.textContent = estado.vazio ? 'Sem feições nesta extensão' : ''; carregar(estado); }
          else { estado.geracao++; estado.pendente = null; mapa.removeLayer(estado.layer); status.textContent = ''; }
        };
      }
      if (!fieldset.querySelector('input')) fieldset.append(el('small', 'Nenhuma camada nesta análise.'));
    }
    menu.append(el('small', 'Camadas da configuração desta análise. As superfícies exibem a fonte atual; os polígonos de sobreposição preservam o resultado gravado.', 'ev2-camadas-origem'));
    caixa.append(botao, menu); L.DomEvent.disableClickPropagation(caixa); L.DomEvent.disableScrollPropagation(caixa);
    return caixa;
  };
  // Vista consultada: a extensão visível ampliada em 50% para cada lado, com tolerância de simplificação de meio
  // pixel no zoom atual. Enquanto a vista visível couber na consultada e o zoom não aumentar mais de um nível,
  // a resposta anterior continua válida e nada é refeito.
  function vistaAtual() {
    const b = mapa.getBounds().pad(.5), zoom = Math.round(mapa.getZoom());
    const bounds = [Math.max(-180, b.getWest()), Math.max(-90, b.getSouth()), Math.min(180, b.getEast()), Math.min(90, b.getNorth())];
    const visivel = mapa.getBounds();
    const tolerancia = Math.min(.1, (visivel.getEast() - visivel.getWest()) / Math.max(1, mapa.getSize().x) / 2);
    return {bounds, zoom, tolerancia, chave: `${zoom}|${bounds.map(v => v.toFixed(4)).join(',')}`};
  }
  function vistaServe(vista) {
    if (!vista) return false;
    const visivel = mapa.getBounds(), zoom = Math.round(mapa.getZoom());
    const [o, s, l, n] = vista.bounds;
    return zoom >= vista.zoom && zoom <= vista.zoom + 1
      && visivel.getWest() >= o && visivel.getSouth() >= s && visivel.getEast() <= l && visivel.getNorth() <= n;
  }
  function desenhar(estado, geometrias) {
    const cor = CORES[estado.campo.papel];
    estado.layer.clearLayers();
    L.geoJSON(geometrias, {pane: 'ev2-superficies', renderer: renderizador,
      style: {color: cor, weight: 1, fillColor: cor, fillOpacity: .18, opacity: .6},
      pointToLayer: (_, latlng) => L.circleMarker(latlng, {pane: 'ev2-superficies', renderer: renderizador, radius: 4, color: cor}),
      onEachFeature: (f, layer) => layer.bindTooltip(el('span', `${estado.campo.nome} · ${f.properties.nome}`)),
    }).addTo(estado.layer);
    estado.vazio = !geometrias.features.length;
    estado.status.textContent = estado.vazio ? 'Sem feições nesta extensão' : '';
  }
  async function carregar(estado) {
    if (!vivo || !estado.check.checked || vistaServe(estado.vista)) return;
    const vista = vistaAtual();
    const emCache = estado.cache.get(vista.chave);
    if (emCache) { estado.geracao++; estado.pendente = null; estado.vista = vista; desenhar(estado, emCache); return; }
    if (estado.pendente === vista.chave) return;
    const geracao = ++estado.geracao;
    estado.pendente = vista.chave; estado.status.textContent = 'Carregando…';
    try {
      const dados = await post('/extracao-atributos/elegibilidade/resultados/superficie', {execucao: entrada.id, base_id: estado.campo.id, bounds: vista.bounds, tolerancia: vista.tolerancia});
      if (!vivo) return;
      if (estado.cache.size >= 8) estado.cache.delete(estado.cache.keys().next().value);
      estado.cache.set(vista.chave, dados.geometrias);
      if (geracao !== estado.geracao) { if (estado.pendente === vista.chave) estado.pendente = null; return; }
      estado.pendente = null;
      if (!estado.check.checked) return;
      estado.vista = vista;
      desenhar(estado, dados.geometrias);
    } catch (erro) {
      if (!vivo || geracao !== estado.geracao) return;
      estado.pendente = null; estado.vista = null;
      estado.status.textContent = `Não carregada: ${erro.message}`;
    }
  }
  const mover = () => { clearTimeout(timer); timer = setTimeout(() => estados.forEach(carregar), 300); };
  controle.addTo(mapa); mapa.on('moveend', mover);
  return () => { vivo = false; clearTimeout(timer); mapa.off('moveend', mover); controle.remove(); };
}
