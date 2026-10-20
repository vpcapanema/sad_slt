const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const contexto = {window: {}, Number, TypeError, RangeError};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'js', 'input-masks.js'), 'utf8'), contexto);
const masks = contexto.window.SLTInputMasks;

for (const unidade of ['R$', 'R$/ano', 'R$/km', 'real', 'reais', 'BRL']) {
  test(`Moeda reconhecida pela unidade ${unidade}`, () => {
    const coluna = {unidade, formato: 'decimal'};
    const perfil = masks.perfilColuna(coluna);
    assert.equal(perfil.moeda, true);
    assert.equal(masks.formatarValor(1234.56, coluna), '1.234,56');
    assert.equal(masks.formatarDigitacao('123456', perfil), '1.234,56');
    assert.equal(masks.formatarDigitacao('R$ 1.234,56', perfil), '1.234,56');
    assert.equal(masks.parseValor('1.234,56', perfil), 1234.56);
    assert.equal(masks.formatarDigitacao('-123456', perfil), '-1.234,56');
    assert.equal(masks.parseValor('-1.234,56', perfil), -1234.56);
  });
}

for (const unidade of ['km', 'km/h', 'meses', 'índice', 'B/C', 'm/km']) {
  test(`Decimal localizado sem perda de precisão: ${unidade}`, () => {
    const coluna = {unidade, formato: 'decimal'};
    const perfil = masks.perfilColuna(coluna);
    assert.equal(perfil.moeda, false);
    assert.equal(masks.formatarDigitacao('12345,6789', perfil), '12.345,6789');
    assert.equal(masks.parseValor('12.345,6789', perfil), 12345.6789);
    assert.equal(masks.formatarValor(12345.6789, coluna), '12.345,6789');
    assert.equal(masks.formatarDigitacao('12,', perfil), '12,');
    assert.equal(masks.formatarDigitacao('12,00', perfil), '12,00');
  });
}

test('Percentual não é convertido indevidamente em fração', () => {
  const coluna = {unidade: '%', formato: 'decimal'};
  const perfil = masks.perfilColuna(coluna);
  assert.equal(masks.formatarDigitacao('25,50 %', perfil), '25,50');
  assert.equal(masks.parseValor('25,50 %', perfil), 25.5);
  assert.equal(masks.formatarValor(25.5, coluna), '25,5');
});

test('Inteiros não aceitam frações nem arredondamento silencioso', () => {
  const coluna = {unidade: 'número', formato: 'inteiro'};
  const perfil = masks.perfilColuna(coluna);
  assert.equal(masks.formatarDigitacao('12345', perfil), '12.345');
  assert.equal(masks.parseValor('-12.345', perfil), -12345);
  assert.throws(() => masks.formatarDigitacao('12,5', perfil), /inteiro/);
  assert.throws(() => masks.parseValor('9007199254740992', perfil), /precisão/);
});

test('Vazio, zero e entradas inválidas são diferenciados', () => {
  for (const coluna of [{unidade: 'R$'}, {unidade: 'km'}, {formato: 'inteiro'}]) {
    const perfil = masks.perfilColuna(coluna);
    assert.equal(masks.parseValor('', perfil), null);
    assert.equal(masks.parseValor('0', perfil), 0);
    assert.equal(masks.formatarValor(null, coluna), '');
    assert.throws(() => masks.parseValor('abc', perfil), /número/);
    assert.throws(() => masks.parseValor('1,2,3', perfil), /número/);
    assert.throws(() => masks.parseValor('-', perfil), /Complete/);
    assert.throws(() => masks.parseValor('1'.repeat(400), perfil), /limite/);
  }
});

test('Cadastro mantém a proibição de valores negativos', () => {
  const perfil = masks.perfilColuna({grupo: 'cadastro', unidade: 'R$'});
  assert.throws(() => masks.parseValor('-1,00', perfil), /maior ou igual a zero/);
  assert.equal(masks.parseValor('0,00', perfil), 0);
});

test('Máscara monetária legada preservada após extração', () => {
  assert.equal(masks.currencyInputValue(1234.56), '1.234,56');
  assert.equal(masks.parseCurrencyBR('1.234,56'), 1234.56);
  assert.equal(masks.parseCurrencyBR(''), null);
  const listeners = {};
  const input = {value: '123456', dataset: {}, addEventListener: (nome, fn) => { listeners[nome] = fn; }};
  masks.attachCurrencyMask(input);
  assert.equal(input.value, '1.234,56');
  input.value = '1234567';
  listeners.input();
  assert.equal(input.value, '12.345,67');
});
