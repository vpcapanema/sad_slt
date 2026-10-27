import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/js/api-erro.js';

const E = globalThis.SicardApiErro;

test('detail em string acrescenta status e recurso', () => {
  const msg = E.formatar({detail: 'Camada 42 não encontrada.'}, {status: 404, method: 'GET', url: '/api/camadas/42'});
  assert.equal(msg, 'Camada 42 não encontrada (HTTP 404 — GET /api/camadas/42)');
});

test('lista Pydantic mostra campo, motivo e valor recebido', () => {
  const msg = E.formatar({detail: [{loc: ['body', 'nome'], msg: 'Field required', type: 'missing'},
    {loc: ['query', 'limite'], msg: 'Input should be a valid integer', type: 'int_parsing', input: 'abc'}]},
  {status: 422});
  assert.match(msg, /Campo 'nome': Field required/);
  assert.match(msg, /Campo 'limite': Input should be a valid integer \(recebido: abc\)/);
  assert.match(msg, /HTTP 422/);
});

test('usa a mensagem em português já formatada pelo backend', () => {
  const msg = E.extrairDetalhe({detail: [{mensagem: "Campo 'x': esperado número (recebido: 'a')", msg: 'x'}]});
  assert.equal(msg, "Campo 'x': esperado número (recebido: 'a')");
});

test('detail objeto {message, field}', () => {
  assert.equal(E.extrairDetalhe({detail: {message: 'CRS ausente', field: 'crs'}}), "Campo 'crs': CRS ausente");
});

test('corpo vazio nunca produz mensagem vazia', () => {
  const msg = E.formatar(null, {status: 500, statusText: 'Internal Server Error', method: 'POST', url: '/api/x'});
  assert.equal(msg, 'Internal Server Error (HTTP 500 — POST /api/x)');
});

test('deResposta lê JSON e expõe status e detalhes legíveis', async () => {
  const res = new Response(JSON.stringify({detail: [{loc: ['body', 'a'], msg: 'Field required', type: 'missing'}]}), {status: 422});
  const err = await E.deResposta(res, {method: 'POST', url: '/api/y'});
  assert.equal(err.status, 422);
  assert.deepEqual(err.detail, ["Campo 'a': Field required"]);
  assert.match(err.message, /POST \/api\/y/);
});

test('deResposta com corpo não JSON preserva o texto', async () => {
  const err = await E.deResposta(new Response('Bad gateway upstream', {status: 502}), {method: 'GET', url: '/z'});
  assert.match(err.message, /Bad gateway upstream \(HTTP 502 — GET \/z\)/);
});

test('falha de rede informa recurso e causa', () => {
  const err = E.deRede(new TypeError('Failed to fetch'), {method: 'GET', url: '/api/a'});
  assert.match(err.message, /GET \/api\/a: Failed to fetch/);
});
