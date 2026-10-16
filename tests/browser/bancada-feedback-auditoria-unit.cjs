// Teste unitário de feedback; não substitui cliques no navegador.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rows = [], classes = new Set();
const host = {append: row => rows.push(row), classList: {add: name => classes.add(name)}, scrollHeight: 100};
const window = {};
vm.runInNewContext(fs.readFileSync('geoespacial/bancada-feedback-local.js', 'utf8'), {
  window, Date, document: {querySelector: () => host, createElement: () => ({})},
});
for (const level of ['info', 'success', 'warning', 'error']) {
  classes.clear(); const before = rows.length;
  window.Notify[level]('Bancada', 'Selecione uma camada');
  assert(classes.has('open'), `${level} deve ser visível`);
  assert.equal(rows.length, before + 1);
  assert(rows.at(-1).textContent.includes('Selecione uma camada'));
}
console.log('4 níveis de feedback visíveis, uma mensagem por chamada');
