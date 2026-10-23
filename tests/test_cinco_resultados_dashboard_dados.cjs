const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

// O módulo de dados é puro; o único import (nome da demanda) é substituído por um stub local.
async function carregar() {
  const origem = path.join(__dirname, '..', 'hierarquizacao', 'js', 'cinco-resultados_elegibilidade_v2-dados.js');
  const codigo = fs.readFileSync(origem, 'utf8')
    .replace(/^import .*nome-demanda.*$/m, "const nomeDemanda = l => String(l.nome || '').trim() || 'Demanda sem nome';");
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-dados-'));
  const arquivo = path.join(pasta, 'dados.mjs');
  fs.writeFileSync(arquivo, codigo);
  try { return await import(pathToFileURL(arquivo)); }
  finally { fs.rmSync(pasta, {recursive: true, force: true}); }
}

const item = (id, base_id, papel, area_m2, total, identificador = 1) =>
  ({id, base_id, papel, nome: `Item ${id}`, area_m2, percentual: area_m2 / total * 100, identificador});

(async () => {
  const d = await carregar();
  const entrada = {
    campos: [{id: 'b1', nome: 'APP', papel: 'restricao'}, {id: 'b2', nome: 'APA', papel: 'restricao'}, {id: 'b3', nome: 'Inundação', papel: 'risco'}],
    linhas: [
      {chave: '0', id: 'D0', nome: 'Rodovia Norte', area_total_m2: 1000, areas: [], sobreposicoes: [
        item('f1', 'b1', 'restricao', 100, 1000), item('f2', 'b1', 'restricao', 50, 1000, 2),
        item('f3', 'b2', 'restricao', 400, 1000), item('f4', 'b3', 'risco', 0, 1000)]},
      {chave: '1', id: 'D1', nome: 'Ponte Sul', area_total_m2: 500, areas: [], sobreposicoes: [item('f5', 'b3', 'risco', 250, 500)]},
      {chave: '2', id: 'D2', nome: 'Ação Livre', area_total_m2: 200, areas: [], sobreposicoes: []},
      {chave: '3', id: 'D3', nome: 'Via Leste', area_total_m2: 300, areas: [], sobreposicoes: [item('f6', 'b1', 'restricao', 30, 300)]},
    ],
  };
  const fichas = d.caracterizarDemandas(entrada);

  // Três conceitos (restrição, risco, livre); “com restrição e risco” é uma situação.
  assert.deepEqual(fichas.map(f => f.situacao), ['ambas', 'risco', 'livre', 'restricao']);
  assert.deepEqual(d.indicadores(fichas, entrada), {total: 4, ambas: 1, restricao: 1, risco: 1, livre: 1, camadas: 3});
  assert.equal(d.SITUACOES.livre, 'Livre de restrições e riscos');

  // Linguagem corrente: o que a demanda tem, ou que está livre.
  assert.deepEqual(d.descreverSituacao(fichas[0]).map(f => f.texto),
    ['Tem 3 restrições: Item f1; Item f2; Item f3.', 'Tem risco: Item f4.']);
  assert.deepEqual(d.descreverSituacao(fichas[2]), [{categoria: 'livre', texto: 'Livre de restrições e riscos nas camadas consultadas.'}]);
  assert.match(d.descreverSituacao(fichas[0], 2)[0].texto, /e mais 1\.$/);

  // Ordem padrão: situações com restrição/risco primeiro; livres por último.
  assert.deepEqual(d.ordenarDemandas(fichas).map(f => f.chave), ['0', '3', '1', '2']);
  assert.deepEqual(d.ordenarDemandas(fichas, 'nome').map(f => f.chave), ['2', '1', '0', '3']);

  // Filtros por situação são exclusivos e somam o total.
  assert.deepEqual([...d.demandasVisiveis(fichas, {situacao: 'livre'})], ['2']);
  assert.deepEqual([...d.demandasVisiveis(fichas, {situacao: 'restricao'})], ['3']);
  assert.deepEqual([...d.demandasVisiveis(fichas, {texto: 'acao'})], ['2']);
  assert.equal(d.demandasVisiveis(fichas, {}).size, 4);

  const registros = d.registrosDetalhados(fichas, entrada);
  assert.equal(registros.length, 4 + 1 + 1 + 1);
  assert.equal(registros[0].feicao_id, 'f3');
  assert.ok(registros.find(r => r.chave === '2').sem);
  assert.equal(registros.find(r => r.chave === '2').situacao, 'livre');

  // Seleção: demanda filtra a tabela; item filtra o registro; repetir sobe um nível e depois limpa.
  const todas = new Set(fichas.map(f => f.chave)), categorias = new Set(['restricao', 'risco']);
  let selecao = d.alternarSelecao(d.SELECAO_VAZIA, {chave: '0'});
  assert.equal(d.registrosVisiveis(registros, {visiveis: todas, categorias, selecao}).length, 4);
  selecao = d.alternarSelecao(selecao, {chave: '0', base: 'b2', feicao: 'f3'});
  assert.deepEqual(d.registrosVisiveis(registros, {visiveis: todas, categorias, selecao}).map(r => r.feicao_id), ['f3']);
  selecao = d.alternarSelecao(selecao, {chave: '0', base: 'b2', feicao: 'f3'});
  assert.deepEqual(selecao, {chave: '0', base: '', feicao: ''});
  selecao = d.alternarSelecao(selecao, {chave: '0'});
  assert.deepEqual(selecao, d.SELECAO_VAZIA);
  assert.equal(d.registrosVisiveis(registros, {visiveis: todas, categorias: new Set(['risco']), selecao}).filter(r => r.categoria === 'restricao').length, 0);

  assert.equal(d.formatarPercentual(12.345), '12,35%');
  assert.equal(d.formatarPercentual(0), '0,00%');
  assert.equal(d.formatarKm2(2500000), '2,50');
  assert.equal(d.formatarKm2(null), '—');
  console.log('PASS: núcleo de dados da seção 5 (situações, linguagem, filtros e seleção).');
})().catch(erro => { console.error(erro); process.exitCode = 1; });
