"""Recusas SMTP e interrupções do SICARD durante envios simulados."""
import subprocess


def test_autenticacao_recusada_interrompe_lote():
    script = r'''
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('assets/js/paginas/ami-email.js', 'utf8');
const code = source.slice(source.indexOf('  const INTERVALO_ENVIO_MS'), source.indexOf('  async function coletar()'));
let sends = 0, failure, busy;
const controls = {};
const detail = 'O servidor de email recusou a autenticação do SICARD (código 535 5.7.139). Verifique a credencial de aplicativo e a autorização SMTP da conta.';
const context = {
  Set, crypto: require('node:crypto').webcrypto,
  contexto: {julgamento: {id: 'teste'}, destinatarios: ['a@example.com', 'b@example.com', 'c@example.com']},
  pronto: true, registros: [], REENVIAVEIS: new Set(['pendente']), estado: () => 'pendente',
  $: id => controls[id] ||= {disabled: false, textContent: ''},
  bloquear: value => {busy = value;}, render() {}, url: () => '/mock',
  rotulosEnvio: {falha: 'Não enviado'},
  request: async () => {sends++; return {id: 'falha', envio_status: 'falha', detalhe: detail};},
  ProcessFeedback: {confirmar: async () => true, iniciarCadastro: () => ({
    tarefaAtual() {}, concluirTarefa() {}, erro: value => {failure = value;},
    sucesso() {throw Error('Falha de autenticação não é sucesso');}
  })}
};
vm.createContext(context);
vm.runInContext(code, context);
(async () => {
  await vm.runInContext('enviar(false)', context);
  assert.equal(sends, 1, 'Não repetir a credencial recusada para cada destinatário');
  assert.equal(failure.codigo, 'smtp_autenticacao');
  assert(failure.message.includes(detail));
  assert(failure.message.includes('2 colaborador(es) não foram tentados'));
  assert.equal(busy, false);
})().catch(error => {console.error(error); process.exitCode = 1;});
'''
    subprocess.run(["node", "-e", script], check=True)


def test_lote_de_169_convites_recupera_502_e_resposta_perdida():
    script = r'''
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('assets/js/paginas/ami-email.js', 'utf8');
const request = source.slice(source.indexOf('  async function request('), source.indexOf('\n  function ', source.indexOf('  async function request(')));
const envio = source.slice(source.indexOf('  const INTERVALO_ENVIO_MS'), source.indexOf('  async function coletar()'));
const emails = Array.from({length: 169}, (_, i) => 'colab-' + (i + 1) + '@example.com');
const historico = new Map(), tentativas = new Map(), progresso = [];
const controles = {};
let resultado;
const context = {
  Set, crypto: require('node:crypto').webcrypto,
  contexto: {julgamento: {id: 'teste', atualizadoEm: 'versao'}, destinatarios: emails},
  pronto: true, registros: [], REENVIAVEIS: new Set(['Não enviado', 'Devolvido']),
  estado: () => 'Não enviado', $: id => controles[id] ||= {disabled: false},
  bloquear() {}, render() {}, url: () => '/mock',
  setTimeout: callback => callback(),
  rotulosEnvio: {aceito_smtp: 'Enviado', falha: 'Não enviado'},
  fetch: async (_url, options) => {
    const dados = JSON.parse(options.body);
    const {destinatario} = dados;
    assert.equal(dados.somente_nao_enviado, true);
    const anteriores = tentativas.get(destinatario) || [];
    anteriores.push(options.body);
    tentativas.set(destinatario, anteriores);
    if (destinatario === emails[30] && anteriores.length === 1) {
      return new Response('<html>502 Bad Gateway</html>', {status: 502});
    }
    if (!historico.has(destinatario)) {
      historico.set(destinatario, {id: destinatario, destinatario, envio_status: 'aceito_smtp'});
      if (destinatario === emails[31]) throw new TypeError('Connection reset');
    }
    return Response.json(historico.get(destinatario));
  },
  ProcessFeedback: {confirmar: async () => true, iniciarCadastro: () => ({
    tarefaAtual: (_nome, descricao) => { if (descricao) progresso.push(descricao); },
    concluirTarefa() {},
    erro: value => { throw new Error(value.message); },
    sucesso: value => { resultado = value; }
  })}
};
vm.createContext(context);
vm.runInContext(request + envio, context);
(async () => {
  await vm.runInContext('enviar(false)', context);
  assert.equal(historico.size, 169);
  assert.equal(tentativas.size, 169);
  assert.equal([...tentativas.values()].flat().length, 171);
  assert.deepEqual(tentativas.get(emails[30]), Array(2).fill(tentativas.get(emails[30])[0]));
  assert.deepEqual(tentativas.get(emails[31]), Array(2).fill(tentativas.get(emails[31])[0]));
  assert.match(progresso[0], /HTTP 502.*Retomando automaticamente/);
  assert.match(progresso[1], /conexão.*Retomando automaticamente/);
  assert.match(resultado.message, /169 mensagem\(ns\) aceita/);
  assert.equal(resultado._status, 'success');
})().catch(error => {console.error(error); process.exitCode = 1;});
'''
    subprocess.run(["node", "-e", script], check=True)
