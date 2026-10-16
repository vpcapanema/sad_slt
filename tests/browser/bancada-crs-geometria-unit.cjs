const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('geoespacial/geoprocessamento.js', 'utf8');
function implementation(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  const tail = source.slice(start + 1);
  const end = tail.search(/\n  (?:async function |function |const )/);
  return source.slice(start, end < 0 ? undefined : start + 1 + end);
}
const state = {layers: [], geometryTypes: {}, layerStyles: {}, layerColors: {}};
const sources = new Map(), layers = new Map();
state.map = {
  isStyleLoaded: () => true, getSource: id => sources.get(id),
  addSource: (id, data) => sources.set(id, {...data, setTiles() {}}),
  removeSource: id => sources.delete(id), getLayer: id => layers.get(id),
  addLayer: data => layers.set(data.id, data), removeLayer: id => layers.delete(id),
  setFilter() {},
};
const context = vm.createContext({state, window: {}, URLSearchParams,
  location: {origin: 'https://example.test'}, API: '/api/geoespacial',
  STORAGE_TILE_SOURCE_LAYER: 'camada', initPointLayer() {}, applySavedStyle() {},
  renderLayers() {}, symbolPreview() { return ''; },
  symbolSelect: key => `<select data-style="${key}"></select>`, borderSwatch() { return ''; },
  CRS_DESCRIPTIONS: {'EPSG:4674': 'SIRGAS 2000', 'EPSG:31983': 'SIRGAS 2000 / UTM zona 23S'},
});
for (const name of ['crsLabel', 'tiposGeojson', 'tipoGeometriaBase', 'tiposGeometriaCamada',
  'layerColor', 'layerSymbol', 'currentEditStyle', 'symbologyFields', 'removeMapResource', 'storageTileQuery',
  'adicionarCamadaStorageTiles', 'adicionarCamadaGeoJsonEmMemoria']) {
  vm.runInContext(implementation(name), context);
}
const wkt = 'GEOGCS["SIRGAS 2000",DATUM["Sistema_de_Referencia_Geocentrico_para_las_AmericaS_2000",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6674"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AXIS["Latitude",NORTH],AXIS["Longitude",EAST],AUTHORITY["EPSG","4674"]]';
assert.equal(context.crsLabel(wkt), 'EPSG:4674 (SIRGAS 2000) — Geográfico');
assert.equal(context.crsLabel('epsg:4674'), 'EPSG:4674 (SIRGAS 2000) — Geográfico');
assert.equal(context.crsLabel(`PROJCRS["SIRGAS 2000 / UTM zone 23S",${wkt},ID["EPSG",31983]]`), 'EPSG:31983 (SIRGAS 2000 / UTM zona 23S) — Projeção: Mercator Transversa');
assert.equal(context.crsLabel('PROJCS["CRS personalizado",GEOGCS["Base",AUTHORITY["EPSG","4674"]]]'), 'CRS personalizado — Projeção não identificada');
assert.equal(context.crsLabel(''), '');
for (const geometry of ['LineString', 'MultiLineString', '3D Measured Multi Line String', 'CircularString', 'CompoundCurve', 'Multi Curve', 'ST_MultiLineStringZM', 'Linha']) {
  const info = {caminho: 'linhas.gpkg', geometria_tipo: geometry, crs_arquivo: wkt};
  // Reopen from serialized metadata, including after removing the map source.
  for (let attempt = 0; attempt < 2; attempt++) {
    context.removeMapResource('line');
    context.adicionarCamadaStorageTiles('line', 'Linhas', JSON.parse(JSON.stringify(info)), {lote: true});
    assert.equal(state.geometryTypes.line[0], 'LineString');
    const entry = state.layers.find(layer => layer.id === 'line');
    assert.match(context.layerSymbol(entry), /layer-symbol line/);
    assert.equal(context.crsLabel(entry.crs), 'EPSG:4674 (SIRGAS 2000) — Geográfico');
  }
}
state.layerStyles.line = {fillColor: '#ff0000', borderColor: '#0000ff'};
assert.match(context.layerSymbol(state.layers[0]), /--layer-color:#0000ff/);
context.adicionarCamadaGeoJsonEmMemoria('memory', 'Linha em memoria', {
  features: [{geometry: {type: 'MultiLineString', coordinates: []}}],
}, {lote: true, crs_arquivo: wkt});
const memory = state.layers.find(layer => layer.id === 'memory');
assert.equal(memory.geometria_tipo, 'MultiLineString');
delete state.geometryTypes.memory;
assert.match(context.layerSymbol(memory), /layer-symbol line/);
assert.match(context.symbologyFields('memory'), /data-style="lineTexture"/);
assert.doesNotMatch(context.symbologyFields('memory'), /data-style="fillTexture"/);
assert.equal(context.crsLabel(memory.crs), 'EPSG:4674 (SIRGAS 2000) — Geográfico');
console.log('CRS WKT1/WKT2, autoridade correta, linhas e reabertura: OK');

assert.equal(context.crsLabel('PROJCS["Local",PROJECTION["Transverse_Mercator"]]'), 'Local \u2014 Proje\u00e7\u00e3o: Mercator Transversa');
assert.equal(context.crsLabel('PROJCRS["Local",CONVERSION["Local",METHOD["Transverse Mercator"]]]'), 'Local \u2014 Proje\u00e7\u00e3o: Mercator Transversa');
assert.equal(context.crsLabel('PROJCS["Local",PROJECTION["Minha_Projecao"]]'), 'Local \u2014 Proje\u00e7\u00e3o: Minha Projecao');

for (const texture of ['solid','dashed','dotted']) {
  state.layerStyles.line = {borderColor:'#123456',lineTexture:texture,lineWidth:4};
  const symbol=context.layerSymbol(state.layers.find(layer=>layer.id==='line'));
  assert.match(symbol, /<svg[^>]+viewBox="0 0 26 16"/);
  assert.match(symbol, /<path[^>]+fill="none"/);
  assert.match(symbol, /stroke-width="4"/);
  if(texture!=='solid')assert.match(symbol,/stroke-dasharray=/);
}
state.geometryTypes.preview=['Point'];
assert.match(context.layerSymbol({id:'preview',metadados_local:{tipos_geometria:['MultiLineString']}}), /layer-symbol line/);
context.adicionarCamadaGeoJsonEmMemoria('collection','Linhas', {features:[{geometry:{type:'GeometryCollection',geometries:[{type:'LineString',coordinates:[]},{type:'MultiLineString',coordinates:[]}]}}]}, {lote:true});
assert.match(context.layerSymbol(state.layers.find(layer=>layer.id==='collection')), /layer-symbol line/);
for(const type of ['Point','Polygon','CurvePolygon','MultiSurface'])assert.doesNotMatch(context.layerSymbol({id:'other',geometria_tipo:type}), /layer-symbol line/);
