const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const requests = [], writes = [], errors = [], dialogs = [];
    let rows = Array.from({length: 16}, (_, i) => ({id: i + 1, nome: `Projeto Municipal ${i}`}))
      .concat([{id: 17, nome: 'Estrada Norte'}, {id: 18, nome: 'Plano 100%_Oeste'},
        {id: 19, nome: ''}, {id: 20, nome: null}, {id: 21, nome: '__vazias__'}]);
    let erroEscrita = false, erroSugestoes = false, erroLista = false, falharAposEscrita = false;
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', async d => { dialogs.push(d.message()); await d.dismiss(); });
    await page.route('**/api/**', async route => {
      const request = route.request(), url = new URL(request.url());
      requests.push(url);
      if (url.pathname.endsWith('/auth/me')) return route.fulfill({json: {id: 'u', nome: 'Teste', tipo_usuario: 'ADMIN'}});
      if (url.pathname.endsWith('/esquemas')) return route.fulfill({json: {esquemas: [
        {esquema: 'dominios', tabelas: [{nome: 'teste', dominio: true, registros: rows.length}]},
      ]}});
      if (url.pathname.endsWith('/valores')) return route.fulfill(erroSugestoes
        ? {status: 503, json: {detail: 'Sugestões indisponíveis'}}
        : {json: {valores: rows.map(r => r.nome).filter(Boolean), truncado: true}});
      if (request.method() !== 'GET') {
        const body = request.postDataJSON();
        writes.push({method: request.method(), body});
        if (erroEscrita) return route.fulfill({status: 409, json: {detail: 'Registro utilizado por outra tabela. Nenhum registro foi excluído.'}});
        erroLista = falharAposEscrita;
        if (request.method() === 'PATCH') {
          rows = rows.map(r => r.id === body.chave.id ? {...r, ...body.valores} : r);
          return route.fulfill({json: {ok: true, afetados: 1}});
        }
        if (request.method() === 'POST') {
          rows.push({id: 22, ...body.valores});
          return route.fulfill({json: {ok: true, chave: {id: 22}}});
        }
        const antes = rows.length;
        rows = rows.filter(r => !body.chaves.some(c => c.id === r.id));
        return route.fulfill({json: {ok: true, removidos: antes - rows.length, arquivos_removidos: 0}});
      }
      if (erroLista) return route.fulfill({status: 503, json: {detail: 'Lista indisponível'}});
      const q = url.searchParams, coluna = q.get('filtro_coluna'), tipo = q.get('filtro_tipo');
      const valor = q.get('filtro_valor'), inverter = q.get('filtro_inverter') === 'true';
      let result = rows;
      if (coluna) result = rows.filter(row => {
        const match = tipo === 'vazias' ? row[coluna] == null || row[coluna] === ''
          : row[coluna] != null && String(row[coluna]).toLowerCase().includes(valor.toLowerCase());
        return inverter ? !match : match;
      });
      const pagina = Number(q.get('pagina') || 1);
      return route.fulfill({json: {
        colunas: [{nome: 'id', pk: true, filtravel: true, udt: 'int4'},
          {nome: 'nome', filtravel: true, editavel: true, ordenavel: true, udt: 'text'}],
        chave_primaria: ['id'], linhas: result.slice((pagina - 1) * 15, pagina * 15),
        total: result.length, total_tabela: rows.length, paginas: Math.max(1, Math.ceil(result.length / 15)), dominio: true,
      }});
    });
    await page.goto('http://127.0.0.1:8083/restrict/admin/?menu=__dominios__&esquema=dominios&tabela=teste');
    const input = page.locator('input.admin-filter-val'), inverter = page.locator('button.admin-filter-inv');
    const celulas = () => page.locator('.admin-data-table tbody tr td:nth-child(3)');
    const buscar = async texto => {
      await input.fill(texto);
      const resposta = page.waitForResponse(r => r.request().method() === 'GET' &&
        new URL(r.url()).searchParams.get('filtro_valor') === texto);
      await input.press('Enter'); await resposta;
      await page.waitForFunction(texto => document.querySelector('input.admin-filter-val')?.value === texto, texto);
    };
    const fecharResultado = async box => { await page.locator(`${box} .pfs-close`).click(); };
    await inverter.waitFor();
    assert.match(await page.locator('.admin-table-summary').innerText(), /^0 selecionados \/ 15 .* \/ 21 no total$/);
    assert.equal(await input.isDisabled(), true);
    await inverter.click();
    await page.locator('.admin-filter-col').selectOption('nome');
    await page.locator('#admin-filter-suggestions option').first().waitFor({state: 'attached'});
    assert.equal(await inverter.getAttribute('aria-pressed'), 'true');
    await inverter.click();
    assert.deepEqual(await page.locator('.admin-filter-bar .admin-icon-btn').evaluateAll(elements =>
      elements.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height, e.textContent.trim()]; })), [[34, 34, ''], [34, 34, '']]);
    assert.equal(await input.evaluate(e => e.getBoundingClientRect().height), 34);
    await buscar('estrADA');
    assert.deepEqual(await celulas().allTextContents(), ['Estrada Norte']);
    assert.ok(requests.some(u => u.searchParams.get('filtro_tipo') === 'contem'));
    await inverter.click();
    await page.waitForFunction(() => document.querySelectorAll('.admin-data-table tbody tr').length === 15);
    assert.equal(await input.inputValue(), 'estrADA');
    assert.ok(requests.some(u => u.searchParams.get('filtro_inverter') === 'true'));
    await inverter.click();
    await buscar('%_');
    assert.deepEqual(await celulas().allTextContents(), ['Plano 100%_Oeste']);
    await input.fill('');
    await input.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.admin-data-table tbody tr').length === 15);
    assert.equal(requests.at(-1).searchParams.has('filtro_coluna'), false);
    await input.fill('Estrada');
    await input.press('Tab');
    await page.waitForFunction(() => document.querySelectorAll('.admin-data-table tbody tr').length === 1);
    assert.deepEqual(await celulas().allTextContents(), ['Estrada Norte']);
    await buscar('__vazias__');
    assert.deepEqual(await celulas().allTextContents(), ['__vazias__']);
    await page.locator('.admin-filter-empty').check();
    await page.waitForFunction(() => document.querySelectorAll('.admin-data-table tbody tr').length === 2);
    assert.equal(await input.isDisabled(), true);
    await page.getByRole('button', {name: 'Limpar', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('.admin-filter-inv')?.getAttribute('aria-pressed') === 'false');
    assert.equal(requests.at(-1).searchParams.has('filtro_coluna'), false);
    for (const width of [360, 320]) {
      await page.setViewportSize({width, height: 740});
      assert.equal(await page.locator('.admin-filter-bar').evaluate(e => e.scrollWidth <= e.clientWidth), true);
    }
    await page.setViewportSize({width: 1440, height: 1000});

    erroSugestoes = true;
    await page.locator('.admin-filter-col').selectOption('id');
    await page.locator('.notification-toast').filter({hasText: 'Você pode digitar'}).waitFor();
    await buscar('21');
    assert.deepEqual(await celulas().allTextContents(), ['__vazias__']);
    erroSugestoes = false;
    await page.getByRole('button', {name: 'Limpar', exact: true}).click();
    await page.locator('.admin-data-table tbody input[type="checkbox"]').first().check();
    await page.getByRole('button', {name: 'Editar selecionado', exact: true}).click();
    await page.locator('tr.is-editing [data-col="nome"]').fill('Projeto Editado');
    await page.getByRole('button', {name: 'Salvar alterações', exact: true}).click();
    await page.locator('#pfsSuccessBox').waitFor({state: 'visible'});
    assert.equal(writes.at(-1).body.valores.nome, 'Projeto Editado');
    await fecharResultado('#pfsSuccessBox');

    await page.getByRole('button', {name: 'Adicionar registro', exact: true}).click();
    await page.locator('.admin-modal [data-col="nome"]').fill('Novo Domínio');
    await page.locator('.admin-modal button.primary').click();
    await page.locator('#pfsSuccessBox').waitFor({state: 'visible'});
    assert.equal(writes.at(-1).method, 'POST');
    assert.equal(await page.locator('.admin-modal-backdrop').count(), 0);
    await fecharResultado('#pfsSuccessBox');

    for (const index of [0, 1]) await page.locator('.admin-data-table tbody input[type="checkbox"]').nth(index).check();
    const antes = writes.length;
    await page.getByRole('button', {name: 'Excluir selecionados', exact: true}).click();
    await page.locator('#pfsConfirmBox').waitFor({state: 'visible'});
    assert.match(await page.locator('[data-pfs="confirm-warning"]').innerText(), /Identificador: 1[\s\S]*Identificador: 2/);
    assert.equal(await page.locator('#admin-menu').evaluate(e => e.inert), true);
    await page.keyboard.press('Escape');
    assert.equal(writes.length, antes);
    assert.equal(await page.locator('#admin-menu').evaluate(e => e.inert), false);
    erroEscrita = true;
    await page.getByRole('button', {name: 'Excluir selecionados', exact: true}).click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsErrorBox').waitFor({state: 'visible'});
    assert.match(await page.locator('[data-pfs="error-message"]').innerText(), /Nenhum registro foi excluído/);
    assert.equal(await page.locator('.admin-data-table tbody input:checked').count(), 2);
    await fecharResultado('#pfsErrorBox');
    erroEscrita = false;
    falharAposEscrita = true;
    await page.getByRole('button', {name: 'Excluir selecionados', exact: true}).click();
    await page.locator('#pfsConfirmOk').click();
    await page.locator('#pfsPartialBox').waitFor({state: 'visible'});
    assert.match(await page.locator('[data-pfs="partial-message"]').innerText(), /2 registro.*Não foi possível atualizar a lista/);
    assert.deepEqual(writes.at(-1).body, {chaves: [{id: 1}, {id: 2}]});
    assert.equal(await page.locator('#pfsSuccessBox').isVisible(), false);
    assert.deepEqual(dialogs, []);
    assert.deepEqual(errors, []);
    console.log('Admin: texto parcial, sugestões, vazias, inversão, limpeza, CRUD e feedback padrão; exclusão apenas por IDs e falha de atualização explícita OK.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
