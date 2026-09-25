import { el, numero, atributos } from './ui.js';
import { json } from './api.js';

const texto = value => value == null ? 'Não informado' : typeof value === 'object' ? JSON.stringify(value) : String(value);
function button(label, action, className = 'ea-btn') {
  const node = el('button', label, className); node.type = 'button'; node.onclick = action; return node;
}
function card(title) {
  const node = el('section', undefined, 'ea-analytics-card'); node.append(el('h3', title)); return node;
}
function bullets(items) {
  const list = el('ul', undefined, 'ea-analytics-notes');
  items.filter(Boolean).forEach(item => list.append(el('li', item))); return list;
}
function bar(label, value, total, action) {
  const row = action ? button('', action, 'ea-chart-row') : el('div', undefined, 'ea-chart-row');
  const track = el('span', undefined, 'ea-chart-track'), fill = el('span', undefined, 'ea-chart-fill');
  fill.style.width = `${total > 0 ? 100 * value / total : 0}%`; track.append(fill);
  row.append(el('span', label, 'ea-chart-label'), track, el('strong', numero(value, 0)));
  if (action) row.setAttribute('aria-label', `${label}: ${numero(value, 0)} registros. Filtrar por este valor.`);
  return row;
}

export function criarDashboard(result) {
  const initial = () => ({camada: result.modo === 'enriquecimento' ? Object.keys(result.camadas || {})[0] || '' : 'resultado',
    categoria: '', base: '', origem: '', campo: '', valor: '', busca: '', ordem: 'origem', descendente: false, pagina: 0});
  let state = initial(), host, map, controller, version = 0, timer;
  function dispose() {
    version++; controller?.abort(); clearTimeout(timer); map?.remove(); map = null; host = null;
  }
  function change(values) { Object.assign(state, {pagina: 0}, values); load(); }
  function select(label, items, value, action) {
    const wrap = el('label', undefined, 'ea-field'); wrap.append(el('span', label));
    const control = el('select'); control.setAttribute('aria-label', label);
    for (const item of items) control.append(new Option(item.nome, item.id));
    control.value = value; control.onchange = () => action(control.value); wrap.append(control); return wrap;
  }
  function draw(data) {
    map?.remove(); map = null; host.replaceChildren();
    const filters = el('div', undefined, 'ea-analytics-filters');
    const all = (label, values) => [{id: '', nome: label}, ...values];
    filters.append(
      select('Camada de saída', (result.modo === 'enriquecimento' ? Object.keys(result.camadas || {}) : ['resultado']).map(id => ({id, nome: id})), state.camada,
        camada => { state = {...initial(), camada}; load(); }),
      select('Categoria', all('Todas as categorias', data.categorias.map(c => ({id: c.nome, nome: c.nome}))), state.categoria,
        categoria => change({categoria, base: '', campo: '', valor: ''})),
      select('Camada base', all('Todas as bases', data.bases.map(id => ({id, nome: id}))), state.base,
        base => change({base, campo: '', valor: ''})),
      select('Feição de entrada', all('Todas as feições', data.origens), state.origem, origem => change({origem})),
      select('Atributo em análise', data.campos.map(d => ({id: d.campo, nome: `${d.apelido || d.campo}${d.base ? ' · ' + d.base : ''}`})), data.campo,
        campo => change({campo, valor: ''})));
    const searchLabel = el('label', undefined, 'ea-field'), search = el('input');
    searchLabel.append(el('span', 'Buscar nos atributos')); search.type = 'search'; search.value = state.busca;
    search.maxLength = 200; search.placeholder = 'Texto ou identificação'; search.setAttribute('aria-label', 'Buscar nos atributos');
    search.onchange = () => change({busca: search.value});
    search.onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); search.blur(); } };
    searchLabel.append(search); filters.append(searchLabel);
    const tools = el('div', undefined, 'ea-analytics-actions');
    tools.append(button('Limpar filtros', () => { state = initial(); load(); }));
    if (state.valor) tools.append(button(`Remover filtro de valor: ${texto(JSON.parse(state.valor))}`, () => change({valor: ''})));
    host.append(filters, tools);
    const r = data.resumo, kpis = el('div', undefined, 'ea-kpis ea-analytics-kpis');
    for (const [label, value] of [['Feições de entrada distintas', r.feicoes_entrada], ['Registros no recorte', r.registros],
      ['Valores preenchidos no atributo', r.preenchidos], ['Valores ausentes no atributo', r.ausentes]]) {
      const item = el('article'); item.append(el('span', label), el('strong', numero(value, 0))); kpis.append(item);
    }
    host.append(kpis);
    host.append(bullets([
      'Feições distintas: combinação da camada de origem e da posição original. Uma demanda pode conter várias feições.',
      'Categoria e base selecionam os atributos exibidos; registros sem correspondência permanecem na análise.',
      data.fonte_campo ? `Atributo: ${data.fonte_campo.apelido || data.campo} · Fonte: ${data.fonte_campo.base || 'Entrada'} · Regra: ${data.fonte_campo.regra || 'Valor registrado na saída'}.` : null,
      r.feicoes_entrada == null ? 'Esta saída não informa a identificação necessária para contar feições distintas.' : null,
    ]));
    const grid = el('div', undefined, 'ea-analytics-grid');
    const coverage = card(state.categoria ? 'Correspondências por base' : 'Correspondências por categoria');
    coverage.append(el('p', r.feicoes_entrada == null ? 'Registros de saída · identificação de origem incompleta' : 'Feições de entrada distintas · união das correspondências, sem somar duplicações', 'ea-hint'));
    if (!data.cobertura.length) coverage.append(el('p', 'Esta saída não contém metadados de categorias e bases.', 'ea-hint'));
    for (const c of (state.categoria ? data.cobertura : data.cobertura_categorias)) {
      const row = button('', () => change({categoria: c.categoria, base: c.base || '', campo: '', valor: ''}), 'ea-coverage-row');
      row.append(el('span', c.base ? `${c.categoria} · ${c.base}` : c.categoria));
      const track = el('span', undefined, 'ea-coverage-track');
      for (const [key, label] of [['com', 'Com correspondência'], ['sem', 'Sem correspondência'], ['nao_informado', 'Não informado']]) {
        const part = el('span', undefined, `ea-coverage-${key}`); part.style.width = `${c.total ? 100 * c[key] / c.total : 0}%`;
        part.title = `${label}: ${c[key]}`; track.append(part);
      }
      row.append(track, el('small', `${c.com} com · ${c.sem} sem · ${c.nao_informado} não informado / ${c.total} ${c.identidade_disponivel ? 'feições' : 'registros'}`));
      coverage.append(row);
    }
    coverage.append(bullets(['Uma feição pode corresponder a várias bases. As contagens entre bases não são somáveis.',
      'Correspondência segue a regra da extração: espacial ou por atributo.']));
    const distribution = card(data.estatisticas ? 'Distribuição dos valores numéricos' : 'Frequência dos valores');
    distribution.append(el('p', 'População: registros de saída no recorte · frequência absoluta', 'ea-hint'));
    if (!r.preenchidos) distribution.append(el('p', 'Nenhum valor preenchido neste atributo e recorte.', 'ea-empty-small'));
    if (data.estatisticas) {
      const histogram = el('div', undefined, 'ea-histogram');
      const maximum = Math.max(1, ...data.histograma.map(b => b.n));
      for (const bin of data.histograma) {
        const col = el('div', undefined, 'ea-histogram-column');
        const label = `${numero(bin.de, 4)} a ${numero(bin.ate, 4)}${bin.ultimo ? ' (inclusive)' : ' (limite superior exclusivo)'}`;
        col.title = `${label}: ${bin.n} registros`; col.setAttribute('aria-label', col.title);
        const track = el('div', undefined, 'ea-histogram-track'), mark = el('div', undefined, 'ea-histogram-mark');
        mark.style.height = `${100 * bin.n / maximum}%`; track.append(mark);
        col.append(el('strong', numero(bin.n, 0)), track, el('small', `${numero(bin.de, 3)} – ${numero(bin.ate, 3)}`)); histogram.append(col);
      }
      distribution.append(histogram);
      const stats = el('dl', undefined, 'ea-descriptive-stats');
      for (const [key, label] of [['minimo', 'Mínimo'], ['mediana', 'Mediana'], ['media', 'Média'], ['maximo', 'Máximo']]) {
        const item = el('div'); item.append(el('dt', label), el('dd', numero(data.estatisticas[key], 4))); stats.append(item);
      }
      distribution.append(stats, bullets(['Valores na unidade do campo de origem; nenhuma unidade é presumida.',
        'Estatísticas sobre registros de saída. Recortes e duplicações podem repetir a mesma feição de entrada.']));
    } else {
      const maximum = Math.max(1, ...data.distribuicao.map(d => d.n));
      const chart = el('div', undefined, 'ea-frequency-chart');
      for (const item of data.distribuicao) chart.append(bar(texto(item.valor), item.n, maximum, () => change({valor: item.chave})));
      distribution.append(chart);
      if (data.outros) distribution.append(el('p', `${numero(data.outros, 0)} registros em outros valores. Exibidos os 20 valores mais frequentes; use a busca para explorar os demais.`, 'ea-hint'));
      distribution.append(bullets([`${numero(r.distintos, 0)} valores distintos · ${numero(r.ausentes, 0)} ausentes.`, 'Selecione uma barra para filtrar os registros.']));
    }
    grid.append(coverage, distribution); host.append(grid);
    const mapCard = card('Localização e atributos'), mapGrid = el('div', undefined, 'ea-analytics-map-grid');
    const mapHost = el('div', undefined, 'ea-analytics-map'); mapHost.setAttribute('aria-label', 'Mapa dos registros da página da tabela');
    const selection = el('div', undefined, 'ea-analytics-selection'); selection.append(el('p', 'Selecione uma feição no mapa ou “Localizar” na tabela para consultar seus atributos.', 'ea-hint'));
    mapGrid.append(mapHost, selection); mapCard.append(mapGrid);
    const method = data.representacao_mapa.metodo;
    mapCard.append(bullets([`Mapa: ${data.mapa.features.length} geometrias dos ${data.linhas.length} registros da página ${data.paginas ? data.pagina + 1 : 0} de ${data.paginas}. Gráficos: todos os ${r.registros} registros do recorte.`,
      method !== 'original' ? `Representação visual aproximada (${method === 'limites' ? 'limites das feições' : 'geometrias simplificadas'}). Os atributos não são alterados.` : null]));
    host.append(mapCard);
    let focus = () => {};
    if (window.L && data.mapa.features.length) {
      map = window.L.map(mapHost, {scrollWheelZoom: false});
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap contributors', maxZoom: 19}).addTo(map);
      const layerByPosition = new Map(), rows = new Map(data.linhas.map(r => [r.posicao, r]));
      focus = position => {
        const row = rows.get(position), layer = layerByPosition.get(position); if (!row) return;
        selection.replaceChildren(el('h4', row.origem), el('p', `Registro ${row.registro}`, 'ea-hint'), atributos(row.atributos));
        for (const [p, item] of layerByPosition) item.setStyle?.({color: p === position ? '#6a4791' : '#176b95', weight: p === position ? 5 : 2});
        host.querySelectorAll('[data-analytics-position]').forEach(tr => tr.classList.toggle('is-selected', Number(tr.dataset.analyticsPosition) === position));
        if (layer?.getBounds) map.fitBounds(layer.getBounds(), {maxZoom: 15, padding: [20, 20]});
        else if (layer?.getLatLng) map.setView(layer.getLatLng(), 14);
      };
      const geometry = window.L.geoJSON(data.mapa, {
        style: {color: '#176b95', weight: 2, fillOpacity: .2},
        pointToLayer: (f, latlng) => window.L.circleMarker(latlng, {radius: 7, color: '#176b95', fillOpacity: .7}),
        onEachFeature: (feature, layer) => {
          const position = feature.properties.posicao; layerByPosition.set(position, layer);
          layer.bindTooltip(el('span', rows.get(position)?.origem || 'Registro de saída'));
          layer.on('click', () => focus(position));
        },
      }).addTo(map);
      if (geometry.getBounds().isValid()) map.fitBounds(geometry.getBounds(), {maxZoom: 14, padding: [20, 20]});
      else map.setView([-15, -47], 4);
      timer = setTimeout(() => map?.invalidateSize(), 0);
    } else {
      mapHost.append(el('p', data.linhas.length ? 'Mapa indisponível para estes registros.' : 'Nenhum registro neste recorte.', 'ea-empty-small'));
      focus = position => { const row = data.linhas.find(r => r.posicao === position); if (row) selection.replaceChildren(el('h4', row.origem), atributos(row.atributos)); };
    }
    const records = card('Comparação dos registros'), controls = el('div', undefined, 'ea-analytics-actions');
    controls.append(select('Ordenar por', [{id: 'origem', nome: 'Feição de entrada'}, {id: 'valor', nome: 'Valor do atributo'}], state.ordem, ordem => change({ordem})),
      button(state.descendente ? 'Ordem decrescente ↓' : 'Ordem crescente ↑', () => change({descendente: !state.descendente})));
    records.append(controls);
    const wrap = el('div', undefined, 'ea-table-wrap'); wrap.tabIndex = 0;
    const table = el('table'), head = el('thead'), hr = el('tr'), body = el('tbody');
    const columns = ['Feição de entrada', 'Registro', data.fonte_campo?.apelido || data.campo || 'Valor', ...data.cobertura.map(c => `${c.categoria} · ${c.base}`), 'Detalhar'];
    columns.forEach(label => { const th = el('th', label); th.scope = 'col'; hr.append(th); }); head.append(hr);
    for (const row of data.linhas) {
      const tr = el('tr'); tr.dataset.analyticsPosition = row.posicao;
      [row.origem, row.registro, texto(row.valor), ...row.bases.map(b => b.corresponde == null ? 'Não informado' : b.corresponde ? 'Com correspondência' : 'Sem correspondência')].forEach(value => tr.append(el('td', value)));
      const td = el('td'); td.append(button('Localizar', () => focus(row.posicao))); tr.append(td); body.append(tr);
    }
    table.append(head, body); wrap.append(table); records.append(wrap);
    if (!data.linhas.length) records.append(el('p', 'Nenhum registro corresponde aos filtros.', 'ea-empty-small'));
    const paging = el('div', undefined, 'ea-analytics-actions');
    const previous = button('Anterior', () => change({pagina: data.pagina - 1})), next = button('Próxima', () => change({pagina: data.pagina + 1}));
    previous.disabled = data.pagina === 0; next.disabled = data.pagina + 1 >= data.paginas;
    paging.append(previous, el('span', `${data.paginas ? data.pagina + 1 : 0} / ${data.paginas} · ${numero(r.registros, 0)} registros`), next); records.append(paging); host.append(records);
    const source = el('details', undefined, 'ea-analytics-source'); source.append(el('summary', 'Categorias e origem dos dados'));
    const concepts = el('dl');
    for (const c of data.categorias.filter(c => !state.categoria || c.nome === state.categoria)) concepts.append(el('dt', c.nome), el('dd', c.conceito || 'Conceito não registrado nesta execução.'));
    source.append(concepts, bullets([data.conceito_origem, `Execução: ${data.execucao} · Camada: ${data.camada}`,
      data.criado_em ? `Executada em: ${new Date(data.criado_em).toLocaleString('pt-BR')}` : null,
      'Dados provenientes da saída persistida. Ausência de correspondência não indica ausência do fenômeno no território.'])); host.append(source);
  }
  async function load() {
    if (!host) return;
    const current = ++version, target = host;
    controller?.abort(); controller = new AbortController(); map?.remove(); map = null;
    const loading = el('p', 'Calculando a análise descritiva…', 'ea-hint'); loading.setAttribute('role', 'status');
    target.replaceChildren(loading); target.setAttribute('aria-busy', 'true');
    try {
      const data = await json(`/extracao-atributos/execucoes/${encodeURIComponent(result.id)}/dashboard`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(state),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(180000)]),
      });
      if (current !== version || target !== host) return;
      state.campo = data.campo; state.pagina = data.pagina; draw(data);
    } catch (error) {
      if (current !== version || target !== host) return;
      const message = el('p', `Não foi possível carregar o painel: ${error.message}`, 'ea-hint'); message.setAttribute('role', 'alert');
      target.replaceChildren(message, button('Tentar novamente', load));
    } finally { if (current === version && target === host) target.removeAttribute('aria-busy'); }
  }
  return {mount(target) { dispose(); host = target; load(); }, dispose};
}
