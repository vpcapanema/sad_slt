import {post} from '../../geoespacial/extracao-atributos/api.js';
import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {corClasse, compararIndices, classeTexto, indiceTexto} from './favorabilidade-indices.js?v=20261023-classes-ordem';

export function criarMapaFavorabilidade({mapa, entrada, recortes, demandas, node, avisar}) {
  const L = window.L, cache = new Map(), grupos = new Map();
  let ativo = true, geracao = 0, feicaoAtiva = '', demandaAtiva = '';
  const superficie = node('mapa-superficie'), representacao = node('mapa-representacao');
  superficie.replaceChildren(...entrada.campos.map(c => new Option(
    `${c.papel === 'grade' ? 'Municípios' : 'Rede rodoviária'} · ${c.nome}`, c.id)));
  representacao.value = 'classe';
  const historicos = base => entrada.linhas.flatMap(l => l.sobreposicoes.filter(s => s.base_id === base).map(s => s.favorabilidade));
  const valores = base => [...historicos(base), ...(cache.get(base)?.geometrias.features.map(f => f.properties.favorabilidade) || [])];
  function simbologia(base) {
    const classes = [...new Set(valores(base).filter(v => v.estado_classe === 'valido').map(classeTexto))]
      .sort((a,b) => a.localeCompare(b,'pt-BR'));
    return {cor:corClasse, classes};
  }
  function desenhar() {
    if (!ativo) return;
    const base = superficie.value, {cor,classes} = simbologia(base);
    for (const [id,grupo] of grupos) {
      const mostrar = id === base;
      if (mostrar && !mapa.hasLayer(grupo)) grupo.addTo(mapa);
      if (!mostrar && mapa.hasLayer(grupo)) mapa.removeLayer(grupo);
      grupo.eachLayer(layer => {
        const c = cor(layer.feature.properties.favorabilidade);
        layer.setStyle({color:c,fillColor:c,fillOpacity:1,weight:0});
      });
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
    const legenda = node('mapa-legenda');
    legenda.replaceChildren(el('span','Contorno azul: demanda'), el('span','Cinza: classe ausente ou inválida'));
    classes.forEach(classe => {
      const item = el('span',undefined,'fv-legenda-classe'), marca = el('i');
      marca.style.background = corClasse({classe,estado_classe:'valido'});
      item.append(marca,document.createTextNode(classe)); legenda.append(item);
    });
    node('mapa-camada-nota').textContent = cache.has(base)
      ? `Camada oficial vinculada à execução: ${entrada.campos.find(c => c.id === base).nome}.`
      : 'A camada oficial ainda não foi carregada. Os resultados da execução permanecem nas tabelas.';
  }
  async function atualizar() {
    const numero = ++geracao, base = superficie.value;
    desenhar();
    node('mapa-recarregar').hidden = true;
    if (cache.has(base)) return;
    node('mapa-camada-nota').textContent = 'Carregando a camada oficial vinculada ao processamento…';
    try {
      const dados = await post('/extracao-atributos/favorabilidade/resultados/superficie', {execucao:entrada.id,base_id:base});
      if (!ativo || numero !== geracao) return;
      cache.set(base,dados);
      const grupo = L.geoJSON(dados.geometrias,{smoothFactor:0,style:{weight:0,fillOpacity:1},
        pointToLayer:(feature,latlng) => L.circleMarker(latlng,{radius:6,
          color:corClasse(feature.properties.favorabilidade),
          fillColor:corClasse(feature.properties.favorabilidade),fillOpacity:1}),
        onEachFeature(feature,layer) {
          const p = feature.properties, v = p.favorabilidade;
          const original = v.estado_original === 'valido' ? v.indice_original.toLocaleString('pt-BR') : 'Ausente ou inválido';
          layer.bindTooltip(el('span',`${p.nome} · ${v.campo_original}: ${original} · ${v.campo_indice}: ${indiceTexto(v)} · ${classeTexto(v)}`));
        }});
      grupos.set(base,grupo);
      if (numero === geracao) desenhar();
    } catch (erro) {
      if (!ativo || numero !== geracao) return;
      node('mapa-camada-nota').textContent = `Camada oficial indisponível: ${erro.message} Os resultados da execução foram mantidos.`;
      node('mapa-recarregar').hidden = false;
      avisar(`Não foi possível carregar a camada oficial da execução: ${erro.message}`, 'error');
    }
  }
  superficie.onchange = atualizar;
  representacao.onchange = desenhar; node('mapa-recarregar').onclick = atualizar;
  atualizar();
  return {
    selecionar(base, feicao, demanda) {
      const mudou = base && superficie.value !== base;
      if (base) superficie.value = base;
      feicaoAtiva = feicao; demandaAtiva = demanda;
      if (mudou) atualizar();
      else desenhar();
    },
    destruir() { ativo = false; },
  };
}
