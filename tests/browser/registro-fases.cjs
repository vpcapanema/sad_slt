const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true, channel:process.platform === 'win32' ? 'msedge' : undefined});
  try {
    for (const fase of [1, 2]) {
      const page = await browser.newPage();
      const chamadas = [];
      await page.route('**/teste-registro', route => route.fulfill({contentType:'text/html', body:'<button id="download">Baixar</button><p id="status"></p>'}));
      await page.route('**/api/**', route => {
        if (!route.request().url().endsWith('/resultados/registrar')) return route.fulfill({json:{}});
        const dados = route.request().postDataJSON(); chamadas.push(dados);
        return route.fulfill({json:dados.versao ? {registrado:true} : {versao:'v1', hierarquizacao:'H', demandas:3}});
      });
      await page.goto('http://127.0.0.1:8083/teste-registro');
      await page.evaluate(async fase => {
        const {instalarRegistro} = await import('/restrict/hierarquizacao/js/registrar-resultados-fase.js');
        window.confirmar = false;
        window.ProcessFeedback = {confirmar: async () => window.confirmar};
        window.atualizar = instalarRegistro({node:id=>document.getElementById(id),
          rota:`/extracao-atributos/${fase === 1 ? 'elegibilidade' : 'favorabilidade'}/resultados`,
          payload:()=>({execucoes:['j'],nomes:{},revisados:true}), operar:fn=>fn(),
          informar:msg=>document.getElementById('status').textContent=msg, fase});
        window.atualizar({concluidas:1,previstas:1,entradas:[{hierarquizacao:'H'}]});
      }, fase);
      const botao = page.getByRole('button', {name:'Registrar resultados da fase', exact:true});
      assert(await botao.isEnabled());
      await botao.click();
      await page.waitForTimeout(150);
      assert.equal(chamadas.length, 1, 'Cancelar não grava');
      await page.evaluate(()=>window.confirmar=true);
      await botao.click();
      await page.waitForFunction(()=>document.getElementById('status').textContent.includes('sem repetir'));
      assert.equal(chamadas.length, 3);
      assert.equal(chamadas[2].versao, 'v1');
      await page.evaluate(()=>window.atualizar(null));
      assert(await botao.isDisabled());
      await page.close();
    }
    console.log('OK: confirmação, cancelamento e registro sem processamento nas duas fases.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
