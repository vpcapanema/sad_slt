const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.setContent('<label>E-mail <input type="email"></label><div id="slt-feedback-root"></div>');
    await page.addStyleTag({ path: 'assets/css/process_feedback_system.css' });
    await page.addScriptTag({ path: 'assets/js/process_feedback_unified.js' });

    for (const falha of [false, true]) {
      await page.evaluate(() => {
        window.envio = ProcessFeedback.iniciarCadastro({ title: 'Enviando e-mails', tasks: ['Primeiro', 'Segundo', 'Terceiro'] });
        envio.tarefaAtual('Primeiro');
        envio.concluirTarefa('Primeiro');
        envio.tarefaAtual('Segundo');
        envio.concluirTarefa('Segundo');
      });
      assert.equal(await page.locator('#pfsProgressOverlay').isVisible(), true);
      await page.evaluate(() => {
        envio.minimizar('Enviando e-mails · 2 de 3 processados');
        envio.tarefaAtual('Terceiro');
      });
      const resumo = page.getByRole('status').filter({ hasText: 'Enviando e-mails' });
      assert.equal(await resumo.isVisible(), true);
      assert.equal(await page.locator('#pfsProgressOverlay').isVisible(), false);
      const area = await resumo.boundingBox();
      assert.ok(area.x >= 0 && area.x + area.width <= 390 && area.y > 750);
      await page.getByRole('textbox').fill('outro@example.com');
      assert.equal(await page.getByRole('textbox').inputValue(), 'outro@example.com');
      await page.evaluate(falha => {
        if (falha) {
          ProcessFeedback.iniciarCadastro({ title: 'Outro processo', tasks: ['Trabalho'] });
          envio.erro({ message: 'Falha simulada no envio' });
        } else {
          envio.sucesso({ message: 'Envio concluído' });
        }
      }, falha);
      assert.equal(await resumo.count(), 0);
      const resultado = page.locator(falha ? '#pfsErrorBox' : '#pfsSuccessBox');
      assert.equal(await resultado.isVisible(), true);
      assert.match(await resultado.innerText(), falha ? /Falha simulada no envio/ : /Envio concluído/);
      await resultado.locator('.pfs-close').click();
    }
  } finally {
    await browser.close();
  }
  console.log('PASS acompanhamento compacto, tela liberada e modais de sucesso e erro');
})().catch(error => { console.error(error); process.exitCode = 1; });
