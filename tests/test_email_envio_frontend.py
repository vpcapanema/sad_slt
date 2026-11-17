"""Falha SMTP interrompe o lote e preserva o motivo, sem enviar emails reais."""
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
