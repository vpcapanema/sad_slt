const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true,
    channel:process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined)});
  try {
    const page = await browser.newPage();
    await page.goto(`${process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083'}/public/`,{waitUntil:'domcontentloaded'});
    const resultado = await page.evaluate(async () => {
      const {calcularMedida,renderizarAgregados} = await import('/restrict/hierarquizacao/js/favorabilidade-estatisticas.js?v=20261021-formatacao');
      const {indiceTexto,classeTexto,compararIndices} = await import('/restrict/hierarquizacao/js/favorabilidade-indices.js?v=20261021-formatacao');
      const formatos = [0,1,.7,.706,.704,.005,.995].map(indice=>indiceTexto({indice,estado_indice:'valido'}));
      const classes = ['MUITO BAIXA','muito baixa','mUiTo bAiXa','ÁREA NÃO CLASSIFICADA']
        .map(classe=>classeTexto({classe,estado_classe:'valido'}));
      const valores = [1,0,.5,.25,.75];
      const medidas = Object.fromEntries(['media','mediana','moda','amplitude','variancia','desvio','cv','iqr',
        'minimo','q1','q2','q3','maximo','percentil'].map(m => [m,calcularMedida(valores,m,90)]));
      const erros = [];
      for (const [dados,medida,p] of [[[NaN],'media'],[[true],'media'],[[-.1],'media'],[[1.1],'media'],
        [[.5],'percentil',101],[[.5],'percentil',NaN],[[.5],'inexistente']]) {
        try { calcularMedida(dados,medida,p); erros.push('Não rejeitou'); }
        catch (erro) { erros.push(erro.message); }
      }
      const tabela = document.createElement('table');
      const item = (id,base_id,indice) => ({id,base_id,nome:'Município',identificador:id,
        favorabilidade:{indice,classe:'Alta',estado_indice:'valido',estado_classe:'valido'}});
      const entrada = {campos:[{id:'g',papel:'grade'},{id:'r',papel:'rede'}],
        linhas:[{chave:'0',id:'A',nome:'Mesmo nome',sobreposicoes:[item('1','g',.9),item('2','g',.9),item('3','r',0)]},
          {chave:'1',id:'B',nome:'Mesmo nome',sobreposicoes:[item('4','r',.1)]}]};
      renderizarAgregados({tabela,entrada,medida:'media'});
      const porDemanda = [...tabela.tBodies[0].rows].map(r => [...r.querySelectorAll('.fv-estatistica-valor')].map(n=>n.textContent));
      const contagens = [...tabela.querySelectorAll('.evr-secundario')].map(n=>n.textContent);
      const precisos = [.7041,.7049].map(indice=>({indice,estado_indice:'valido'})).sort(compararIndices);
      const entradaAntes = JSON.stringify(entrada);
      entrada.linhas[0].sobreposicoes[0].favorabilidade.classe = 'mUiTo bAiXa';
      entrada.linhas[0].sobreposicoes[1].favorabilidade.classe = 'MUITO BAIXA';
      const origem = JSON.stringify(entrada);
      renderizarAgregados({tabela,entrada,medida:''});
      const classesRenderizadas = [...tabela.querySelectorAll('td[data-classes="grade"] .fv-valor-original')]
        .map(n=>n.textContent);
      const semMutacao = origem === JSON.stringify(entrada) && entradaAntes !== origem;
      const repeticoes = {campos:[{id:'g',papel:'grade'}],linhas:[{chave:'0',id:'R',nome:'Repetições',
        sobreposicoes:[.39,.37,.37,.389].map((v,i) => item(String(i),'g',v))}]};
      repeticoes.linhas[0].sobreposicoes.forEach((s,i) => { s.favorabilidade.classe = i < 2 ? 'Média' : 'Baixa'; });
      renderizarAgregados({tabela,entrada:repeticoes,medida:''});
      const separados = {indices:tabela.querySelector('td[data-papel="grade"]').textContent,
        classes:tabela.querySelector('td[data-classes="grade"]').textContent};
      return {medidas,erros,porDemanda,contagens,formatos,classes,classesRenderizadas,semMutacao,
        separados,
        precisos:precisos.map(v=>({original:v.indice,texto:indiceTexto(v)})),
        intactos:valores,
        multimodal:calcularMedida([.2,.8,.2,.8,.4],'moda'),
        repetidos:calcularMedida([.2,.2,.9],'media'),
        zero:calcularMedida([0,0],'cv'),
        vazio:calcularMedida([],'media'),
        unitario:['variancia','desvio','amplitude','iqr','q1','q3','moda'].map(m=>calcularMedida([.4],m)),
        extremos:[calcularMedida([.2,.8],'percentil',0),calcularMedida([.2,.8],'percentil',100)],
        duasMediana:calcularMedida([.2,.8],'mediana')};
    });
    const esperado = {media:.5,mediana:.5,amplitude:1,variancia:.125,desvio:Math.sqrt(.125),
      cv:Math.sqrt(.125)/.5*100,iqr:.5,minimo:0,q1:.25,q2:.5,q3:.75,maximo:1,percentil:.9};
    for (const [medida,valor] of Object.entries(esperado)) {
      assert(Math.abs(resultado.medidas[medida].valores[0]-valor)<1e-12,`${medida}: ${valor}`);
    }
    assert.match(resultado.medidas.moda.mensagem,/Sem moda/);
    assert.deepEqual(resultado.multimodal.valores,[.8,.2],'Modas empatadas preservadas, em ordem decrescente');
    assert(Math.abs(resultado.repetidos.valores[0]-.43333333333333335)<1e-12,'Repetições contam na estatística');
    assert.match(resultado.zero.mensagem,/média zero/);
    assert.match(resultado.vazio.mensagem,/Sem índices válidos/);
    assert.deepEqual(resultado.unitario.map(r=>r.valores[0]),[0,0,0,0,.4,.4,.4]);
    assert.deepEqual(resultado.extremos.map(r=>r.valores[0]),[.2,.8]);
    assert.equal(resultado.duasMediana.valores[0],.5);
    assert.equal(resultado.erros.length,7);
    assert(resultado.erros.every(e=>e !== 'Não rejeitou'),'Entradas inválidas rejeitadas explicitamente');
    assert.deepEqual(resultado.intactos,[1,0,.5,.25,.75],'Não modifica o conjunto de entrada');
    assert.deepEqual(resultado.porDemanda,[['0,90','0,00'],['0,10']],'Não mistura demandas homônimas ou grade com rede');
    assert.deepEqual(resultado.contagens,['2 de 2 índices válidos','1 de 1 índices válidos','1 de 1 índices válidos']);
    assert.deepEqual(resultado.formatos,['0,00','1,00','0,70','0,71','0,70','0,01','1,00'],'Duas casas fixas com arredondamento apenas na apresentação');
    assert.deepEqual(resultado.classes,['Muito Baixa','Muito Baixa','Muito Baixa','Área Não Classificada']);
    assert.deepEqual(resultado.classesRenderizadas,['Muito Baixa','Muito Baixa']);
    assert(resultado.semMutacao,'Title Case não modifica os atributos originais');
    assert.equal(resultado.separados.indices,'0,39, 0,39, 0,37 e 0,37','Vírgulas, conjunção e repetições preservadas');
    assert.equal(resultado.separados.classes,'Média, Baixa, Média e Baixa','Classes acompanham a mesma ordem dos índices');
    assert.deepEqual(resultado.precisos,[{original:.7049,texto:'0,70'},{original:.7041,texto:'0,70'}],'Ordenação usa precisão original mesmo com valores exibidos iguais');
    console.log('PASS: medidas estatísticas, percentis, empates, zeros, vazios, exclusão de inválidos e isolamento por demanda/papel.');
  } finally { await browser.close(); }
})().catch(erro => { console.error(erro); process.exitCode = 1; });
