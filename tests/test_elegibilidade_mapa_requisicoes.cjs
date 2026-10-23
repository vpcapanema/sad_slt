const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Test only the request lifecycle; real UI/data coverage runs on the server.
function element() {
  return {children: [], checked: false, value: '', textContent: '',
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; }, setAttribute() {}};
}
async function run() {
  const nodes = new Map(), events = {}, timers = [];
  const node = key => { if (!nodes.has(key)) nodes.set(key, element()); return nodes.get(key); };
  const group = () => ({addTo() { return this; }, on() {}, clearLayers() {}, eachLayer() {}, setStyle() {}});
  let calls = 0, fail = true, west = -48;
  const context = {window: {L: {layerGroup: group, tileLayer: group,
    control: {scale: group}, geoJSON: group}},
    document: {createTextNode: text => text},
    ResizeObserver: class { observe() {} disconnect() {} },
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
    el: (_tag, text) => Object.assign(element(), {textContent: text}),
    nomeDemanda: () => '',
    post: async () => { calls++; if (fail) throw new Error('HTTP 422');
      return {geometrias: {features: []}}; }};
  vm.createContext(context);
  const source = fs.readFileSync('hierarquizacao/js/elegibilidade-mapa.js', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  vm.runInContext(source + '\nthis.create = criarMapaElegibilidade;', context);
  const mapa = {getBounds: () => ({getWest: () => west, getSouth: () => -24,
    getEast: () => -46, getNorth: () => -22}), getSize: () => ({x: 1000}),
    on: (name, fn) => { events[name] = fn; }, off() {}, removeLayer() {}};
  const controller = context.create({mapa, fundo: {}, entrada: {linhas: [],
    campos: [{id: 'base', nome: 'Base', papel: 'risco'}]}, demandas: group(),
    recortes: [], camadas: new Map(), node, selecionar() {}});
  const checkbox = node('mapa-superficies').children[0].children[0].children[0];
  const settle = () => new Promise(resolve => setImmediate(resolve));
  checkbox.checked = true; checkbox.onchange(); await settle();
  assert.equal(calls, 1);
  for (let i = 0; i < 5; i++) { west -= .01; events.moveend(); timers.pop()(); await settle(); }
  assert.equal(calls, 1, 'Failed sources must not retry on every move');
  fail = false; checkbox.checked = false; checkbox.onchange();
  checkbox.checked = true; checkbox.onchange(); await settle();
  assert.equal(calls, 2, 'Explicit toggle retries the source');
  events.moveend(); timers.pop()(); await settle();
  assert.equal(calls, 2, 'Unchanged viewport must not duplicate requests');
  west -= .1; events.moveend(); timers.pop()(); await settle();
  assert.equal(calls, 3, 'A changed viewport reloads a working source');
  controller.destruir();
  console.log('Request lifecycle: passed');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
