// Componentes reais com operações sintéticas: não grava demandas.
const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const analysis = fs.readFileSync('admin/demanda.js', 'utf8');
const cadastro = fs.readFileSync('cadastro/cadastro.js', 'utf8');
const between = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end));
(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent('<div id="admin-session-bar"></div>');
    await page.addStyleTag({path: 'assets/css/process_feedback_system.css'});
    for (const path of ['assets/js/notification_system.js', 'assets/js/process_feedback_unified.js', 'assets/js/admin-auth.js']) await page.addScriptTag({path});
    await page.addScriptTag({content: between(analysis, '  let acaoAnaliseEmCurso', '  async function saveComplemento') +
      between(cadastro, '  async function registrarComFeedback', '  async function initProgramaForm')});
    for (const profile of ['ADMIN', 'GESTOR', 'OPERADOR', 'VISUALIZADOR', 'ANALISTA']) {
      const allowed = await page.evaluate(profile => {
        SLTAdminAuth.renderSessionBar({tipo_usuario: profile});
        return SLTAdminAuth.can('analyzeDemand');
      }, profile);
      assert.equal(allowed, profile === 'ANALISTA');
      if (!allowed) assert.equal(await page.evaluate(async () => {
        let called = false;
        await executarAcaoComFeedback({salvar: async () => {called = true;}});
        return called;
      }), false);
    }
    for (const scenario of ['sucesso', 'erro', 'parcial']) {
      await page.evaluate(scenario => {
        window.calls = 0;
        window.running = executarAcaoComFeedback({titulo: 'Salvar análise', mensagem: 'Análise salva.',
          salvar: () => {window.calls++; return new Promise((resolve, reject) => {window.release = () => scenario === 'erro' ? reject(new Error('Gravação recusada')) : resolve();});},
          atualizar: async () => {if (scenario === 'parcial') throw new Error('Tela indisponível');}});
      }, scenario);
      await page.locator('#pfsProgressOverlay.pfs-active').waitFor();
      assert.equal(await page.locator('#pfsSuccessBox').isVisible(), false);
      await page.evaluate(() => executarAcaoComFeedback({salvar: async () => {window.calls++;}}));
      assert.equal(await page.evaluate(() => calls), 1, 'Impede gravação duplicada');
      await page.evaluate(async () => {release(); await running;});
      await page.locator(scenario === 'erro' ? '#pfsErrorBox.pfs-active' : scenario === 'parcial' ? '#pfsPartialBox.pfs-active' : '#pfsSuccessBox.pfs-active').waitFor();
      await page.evaluate(() => StatusFeedback.fechar());
    }
    for (const tipo of ['plano', 'programa', 'projeto']) {
      for (const fail of [false, true]) {
        await page.evaluate(({tipo, fail}) => {
          window.running = registrarComFeedback({titulo: 'Cadastrar ' + tipo, mensagemSucesso: 'Cadastro salvo.',
            operacao: () => new Promise((resolve, reject) => {window.release = () => fail ? reject(new Error('Cadastro recusado')) : resolve();})});
        }, {tipo, fail});
        await page.locator('#pfsProgressOverlay.pfs-active').waitFor();
        assert.equal(await page.locator('#pfsSuccessBox').isVisible(), false);
        await page.evaluate(async () => {release(); await running;});
        await page.locator(fail ? '#pfsErrorBox.pfs-active' : '#pfsSuccessBox.pfs-active').waitFor();
        await page.evaluate(() => StatusFeedback.fechar());
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: cinco perfis; análise com sucesso/erro/parcial; bloqueio de duplicação; três cadastros com resposta atrasada e erro.');
  } finally {await browser.close();}
})().catch(e => {console.error(e); process.exitCode = 1;});
