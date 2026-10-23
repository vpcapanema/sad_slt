import test from 'node:test';
import assert from 'node:assert/strict';
import {porAreaDecrescente, ordenarDemandas, registrosDetalhados, caracterizarDemandas, COR_DEMANDA, nomeSobreposicao} from '../hierarquizacao/js/cinco-resultados_elegibilidade_v2-dados.js';

test('trechos mantêm cores próprias nas fichas, categorias e tabela, sem alterar a fonte', () => {
  const entrada = {campos: [{id: 'base', nome: 'Base'}], linhas: [{chave: 'a', nome: 'Demanda',
    poligonos_sobreposicao: Array.from({length: 20}, (_, i) => ({id: String(i), papel: 'risco',
      base_id: 'base', nome: 'Bem tombado', numero_poligono: i + 1, area_m2: 20 - i}))}]};
  const fichas = caracterizarDemandas(entrada);
  const cores = fichas[0].linha.sobreposicoes.map(s => s.cor);
  assert.equal(new Set(cores).size, 20);
  assert(!cores.includes(COR_DEMANDA));
  assert.deepEqual(fichas[0].cats.risco.feicoes.map(s => s.cor), cores);
  assert.deepEqual(registrosDetalhados(fichas, entrada).map(s => s.cor), cores);
  assert.equal(entrada.linhas[0].poligonos_sobreposicao[0].cor, undefined);
  assert.equal(nomeSobreposicao(fichas[0].linha.sobreposicoes[0]), 'Bem tombado · trecho de sobreposição 1');
});

test('áreas decrescentes, zero antes de valores vazios', () => {
  const valores = [null, 0, 8, undefined, 2, NaN];
  const resultado = valores.map(area_m2 => ({area_m2})).sort(porAreaDecrescente);
  assert.deepEqual(resultado.slice(0, 3).map(r => r.area_m2), [8, 2, 0]);
  assert(resultado.slice(3).every(r => !Number.isFinite(r.area_m2)));
});

const demanda = (nome, areas) => ({nome, chave: nome, situacao: 'risco', linha: {
  sobreposicoes: areas.map((area_m2, i) => ({id: `${nome}-${i}`, area_m2, base_id: 'base'})),
}});

test('demandas ordenadas pela maior interseção, sem somar áreas coincidentes', () => {
  const demandas = [demanda('Vazia', []), demanda('Soma maior', [6, 6]), demanda('Maior', [10]), demanda('Contato', [0])];
  assert.deepEqual(ordenarDemandas(demandas).map(d => d.nome), ['Maior', 'Soma maior', 'Contato', 'Vazia']);
});

test('tabela ordena globalmente entre demandas e deixa sem interseção no fim', () => {
  const demandas = [demanda('A', [2, 8]), demanda('B', []), demanda('C', [20, 0])];
  const registros = registrosDetalhados(demandas, {campos: [{id: 'base', nome: 'Base'}]});
  assert.deepEqual(registros.map(r => r.area_m2), [20, 8, 2, 0, undefined]);
});
