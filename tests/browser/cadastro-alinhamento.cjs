const {chromium} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8084';
const output = '.git/cadastro-ui';

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({ignoreHTTPSErrors: true, viewport: {width: 1440, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
    const credential = key => credentials.match(new RegExp('^' + key + '\\s*[:=]\\s*(.+)$', 'mi'))[1].trim();
    await page.goto(base + '/public/login/');
    await page.locator('[name=login]').fill(credential('Username'));
    await page.locator('[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button', {name: 'Entrar', exact: true}).click();
    await page.waitForURL(url => !url.pathname.includes('/login'));
    await page.goto(base + '/public/cadastro/nova-demanda/');
    await page.waitForFunction(() => document.querySelector('#programa')?.options.length > 1 &&
      document.querySelector('#abr-2-tipo')?.options.length > 1, null, {timeout: 60000});
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(output, {recursive: true});

    async function verify(name) {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const result = await page.evaluate(() => {
        const form = document.querySelector('.tipo-form:not(.hidden)');
        const issues = [], metrics = [];
        for (const grid of form.querySelectorAll('.form-grid')) {
          const rows = new Map();
          for (const field of grid.children) {
            const label = field.querySelector(':scope > label[for]');
            const control = field.querySelector(':scope > input, :scope > select, :scope > textarea');
            if (!label || !control || !control.getBoundingClientRect().height) continue;
            const l = label.getBoundingClientRect(), c = control.getBoundingClientRect();
            const row = Math.round(field.getBoundingClientRect().top);
            if (!rows.has(row)) rows.set(row, []);
            rows.get(row).push(c.top);
            if (control.tagName !== 'TEXTAREA' && !control.multiple && Math.abs(c.height - 36) > 1) issues.push(control.id + ': height ' + c.height);
            if (c.right > innerWidth + 1 || c.left < -1 || c.top < l.bottom) issues.push(control.id + ': overflow/overlap');
            const range = document.createRange(); range.selectNodeContents(label);
            if ([...range.getClientRects()].some(r => r.right > l.right + 1 || r.bottom > l.bottom + 1)) issues.push(control.id + ': clipped label');
            metrics.push({id: control.id, lines: Math.round(l.height / parseFloat(getComputedStyle(label).lineHeight)), height: c.height});
          }
          for (const values of rows.values()) if (Math.max(...values) - Math.min(...values) > 1) issues.push('misaligned row: ' + values.join(','));
        }
        if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('horizontal page overflow');
        for (const group of form.querySelectorAll('.campo-com-acao')) {
          const select = group.querySelector('select'), button = group.querySelector('button');
          if (select?.getBoundingClientRect().height && button) {
            const a = select.getBoundingClientRect(), b = button.getBoundingClientRect();
            if (Math.abs(a.top - b.top) > 1 || Math.abs(a.height - b.height) > 1) issues.push(select.id + ': refresh button misaligned');
          }
        }
        return {issues, fields: metrics.length, maxLabelLines: Math.max(...metrics.map(m => m.lines))};
      });
      if (result.issues.length) {
        console.log(await page.locator('body *').evaluateAll(es => es.filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.leaflet-pane')).slice(0,15).map(e => ({tag:e.tagName,cls:e.className,id:e.id,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))));
        await page.screenshot({path: output + '/failure.png', fullPage:true});
      }
      assert.deepEqual(result.issues, [], name);
      console.log('PASS', name, result);
    }

    for (const width of [1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({width, height: 1000});
      for (const tipo of ['plano', 'programa', 'projeto']) {
        await page.locator('#tipo-selector [data-tipo="' + tipo + '"]').click();
        const form = page.locator('.tipo-form[data-tipo="' + tipo + '"]');
        await form.waitFor({state: 'visible'});
        const choices = form.locator('[data-representante-tipos]');
        await choices.locator('[data-representante-tipo=pessoa]').check();
        await choices.locator('[data-representante-tipo=instituicao]').check();
        assert.equal(await choices.locator('input:checked').count(), 1);
        await verify(width + ' ' + tipo);
        if (width === 1440 || width === 390) await page.screenshot({path: output + '/review-' + width + '-' + tipo + '.png', fullPage: true});
        if (tipo !== 'plano') {
          const prefix = tipo === 'projeto' ? 'pj' : 'pg';
          await page.locator('input[name="' + prefix + '-vinculo"][value=sim]').check();
          await verify(width + ' ' + tipo + ' com vinculo');
          await page.locator('input[name="' + prefix + '-vinculo"][value=nao]').check();
        }
      }
    }
    await page.locator('[data-demandante=privada]').click();
    await verify('projeto privado');
    assert.equal(await page.locator('.tipo-form:not(.hidden)').getAttribute('data-tipo'), 'projeto');
    assert.deepEqual(errors, []);
    console.log('PASS no browser errors; no records submitted');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
