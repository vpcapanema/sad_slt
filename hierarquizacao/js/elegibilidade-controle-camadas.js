import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {post} from '../../geoespacial/extracao-atributos/api.js';
import {CORES} from './cinco-resultados_elegibilidade_v2-dados.js?v=hectares-camadas';

export function controleCamadas(mapa, entrada, fundos) {
  const L = window.L, estados = [];
  let vivo = true, timer;
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
        const estado = {campo, check, status, layer: L.layerGroup(), geracao: 0, vista: null}; estados.push(estado);
        check.onchange = () => {
          estado.geracao++; estado.vista = null; estado.layer.clearLayers();
          if (check.checked) { estado.layer.addTo(mapa); carregar(estado); }
          else { mapa.removeLayer(estado.layer); status.textContent = ''; }
        };
      }
      if (!fieldset.querySelector('input')) fieldset.append(el('small', 'Nenhuma camada nesta análise.'));
    }
    menu.append(el('small', 'Camadas da configuração desta análise. As superfícies exibem a fonte atual; os polígonos de sobreposição preservam o resultado gravado.', 'ev2-camadas-origem'));
    caixa.append(botao, menu); L.DomEvent.disableClickPropagation(caixa); L.DomEvent.disableScrollPropagation(caixa);
    return caixa;
  };
  async function carregar(estado) {
    if (!vivo || !estado.check.checked) return;
    const b = mapa.getBounds();
    const bounds = [Math.max(-180, b.getWest()), Math.max(-90, b.getSouth()), Math.min(180, b.getEast()), Math.min(90, b.getNorth())];
    const tolerancia = Math.min(.1, (bounds[2] - bounds[0]) / Math.max(1, mapa.getSize().x) / 2);
    const vista = JSON.stringify([bounds, tolerancia]); if (estado.vista === vista) return;
    estado.vista = vista; const geracao = ++estado.geracao; estado.status.textContent = 'Carregando…';
    try {
      const dados = await post('/extracao-atributos/elegibilidade/resultados/superficie', {execucao: entrada.id, base_id: estado.campo.id, bounds, tolerancia});
      if (!vivo || !estado.check.checked || geracao !== estado.geracao) return;
      const cor = CORES[estado.campo.papel];
      estado.layer.clearLayers();
      L.geoJSON(dados.geometrias, {pane: 'ev2-superficies',
        style: {color: cor, weight: 1, fillColor: cor, fillOpacity: .18, opacity: .6},
        pointToLayer: (_, latlng) => L.circleMarker(latlng, {pane: 'ev2-superficies', radius: 4, color: cor}),
        onEachFeature: (f, layer) => layer.bindTooltip(el('span', `${estado.campo.nome} · ${f.properties.nome}`)),
      }).addTo(estado.layer);
      estado.status.textContent = dados.geometrias.features.length ? '' : 'Sem feições nesta extensão';
    } catch (erro) {
      if (!vivo || geracao !== estado.geracao) return;
      estado.layer.clearLayers(); estado.vista = null;
      estado.status.textContent = `Não carregada: ${erro.message}`;
    }
  }
  const mover = () => { clearTimeout(timer); timer = setTimeout(() => estados.forEach(carregar), 300); };
  controle.addTo(mapa); mapa.on('moveend', mover);
  return () => { vivo = false; clearTimeout(timer); mapa.off('moveend', mover); controle.remove(); };
}
