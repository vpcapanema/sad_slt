const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('geoespacial/geoprocessamento.js','utf8');
const state={layerColors:{existing:'#1683c4'},layerStyles:{
 styled:{fillColor:'#d97819',borderColor:'#112233'},
 classified:{renderer:{categorias:[{cor:'#438b69'}],fatias:[{cor:'#9b59b6'}],corOutros:'#d64550'}}},
 geometryTypes:{}};
let persisted={};
const context=vm.createContext({state,save:(key,value)=>{assert.equal(key,'gp-layer-colors');persisted=JSON.parse(JSON.stringify(value));}});
vm.runInContext(code.slice(code.indexOf('  function layerColor('),code.indexOf('  function applyLayerColor(')),context);
const color=id=>vm.runInContext(`layerColor(${JSON.stringify(id)})`,context);
assert.equal(color('existing'),'#1683c4');
assert.equal(color('styled'),'#d97819');
const reserved=new Set(['#1683c4','#d97819','#112233','#438b69','#9b59b6','#d64550']);
const colors=Array.from({length:100},(_,index)=>color(`new-${index}`));
assert.equal(new Set(colors).size,100);
for(const value of colors){assert.match(value,/^#[0-9a-f]{6}$/);assert.ok(!reserved.has(value));}
assert.equal(color('new-0'),colors[0]);
assert.equal(color('new-99'),colors[99]);
state.layerColors=persisted;
assert.equal(color('new-0'),colors[0]);
assert.equal(state.layerStyles.classified.renderer.categorias[0].cor,'#438b69');
console.log('OK: 100 unique layer colors, reserved symbology colors, stable assignment and persistence.');
