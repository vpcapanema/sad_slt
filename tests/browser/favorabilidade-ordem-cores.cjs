const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true,
    channel:process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined)});
  try {
    const page = await browser.newPage();
    await page.goto(`${process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083'}/public/`);
    await page.addStyleTag({url:'/assets/css/fase2-favorabilidade-v2.css?v=20261023-classes-ordem'});
    const resultado = await page.evaluate(async () => {
      const {renderizarIndices,corClasse} = await import('/restrict/hierarquizacao/js/favorabilidade-indices.js?v=20261023-classes-ordem');
      const {renderizarAgregados} = await import('/restrict/hierarquizacao/js/favorabilidade-estatisticas.js?v=20261023-classes-ordem');
      const host = document.createElement('div'); host.className = 'favorabilidade-v2'; document.body.append(host);
      const grafico = document.createElement('div'), tabela = document.createElement('table');
      tabela.id = 'ev-resultados-agregados'; host.append(grafico,tabela);
      const valores = [[.3,.2],[.9,.1],[null],[0],[.7]];
      const linhas = valores.map((vs,i) => ({chave:String(i),id:String(i),nome:`Demanda ${i}`,
        sobreposicoes:vs.map((indice,j) => ({id:`${i}-${j}`,base_id:'g',nome:`Município ${i}-${j}`,papel:'grade',
          favorabilidade:{indice,estado_indice:indice === null ? 'nulo' : 'valido',
            classe:i === 0 || i === 4 ? 'Média' : 'Alta',estado_classe:'valido'}}))}));
      const entrada = {id:'e',nome:'Entrada',campos:[{id:'g',papel:'grade',nome:'Municípios'}],linhas};
      const itens = linhas.flatMap(l => l.sobreposicoes.map(s => ({...s,chave:s.id,entradaId:'e',entradaIndice:0,
        demandaChave:l.chave,demandaNome:l.nome,baseNome:'Municípios'})));
      const original = JSON.stringify(entrada);
      renderizarIndices({container:grafico,itens,entradas:[entrada],selecionada:()=>false,aoSelecionar:()=>{}});
      renderizarAgregados({tabela,entrada,medida:''});
      const cores = [...grafico.querySelectorAll('.fv-dot-linha[data-estado="valido"]')].map(n => ({
        chave:n.dataset.sobreposicao,cor:n.querySelector('.fv-intervalo-marca').style.backgroundColor}));
      return {grafico:[...grafico.querySelectorAll('.fv-demanda-nome')].map(n=>n.textContent),
        tabela:[...tabela.tBodies[0].rows].map(r=>r.cells[0].textContent),
        alinhamento:[...tabela.tBodies[0].rows[0].cells].map(n=>getComputedStyle(n).textAlign),
        cores,cinza:corClasse({estado_classe:'ausente'}),
        normalizadas:['Média','MÉDIA','media','Moderada'].map(classe=>corClasse({classe,estado_classe:'valido'})),
        intacta:original === JSON.stringify(entrada)};
    });
    const ordem = ['Demanda 1','Demanda 4','Demanda 0','Demanda 3','Demanda 2'];
    assert.deepEqual(resultado.grafico,ordem);
    assert.deepEqual(resultado.tabela,ordem);
    assert.deepEqual(resultado.alinhamento,['left','center','center','center','center']);
    assert.equal(resultado.cores.find(c=>c.chave==='0-0').cor,resultado.cores.find(c=>c.chave==='4-0').cor);
    assert.equal(new Set(resultado.normalizadas).size,1);
    assert.equal(resultado.cinza,'#808080');
    assert(resultado.intacta);
    console.log('PASS: ordem pelo maior índice, zero e ausentes, cores por classe e alinhamento.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
