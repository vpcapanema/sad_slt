from pathlib import Path
p=Path('tests/browser/geoprocessamento-atributos-paginacao.cjs')
s=p.read_text(encoding='utf-8').replace("headless:true,args:","headless:true,channel:'msedge',args:")
s=s.replace("  assert.equal(await page.evaluate(()=>gpApp.showAttributes.__gpFileTableHook),true);",'')
s=s.replace("revisao:'rev-1',representacao:'tiles'", "revisao:'preview-token',tiles_token:'preview-token',representacao:'tiles'")
s=s.replace("   if(pathname.endsWith('/bancada-arquivos/tabela')){", """   if(pathname.endsWith('/bancada-arquivos/preparar'))return route.fulfill({json:{id:'storage:table-test',nome:'Tabela remota',arquivo:'base-geoespacial/teste.gpkg',revisao:'rev-1',representacao:'tiles',tiles_url:'http://127.0.0.1/empty-tiles/{z}/{x}/{y}',feicoes:105,campos:[{nome:'valor',tipo:'Integer'}]}});
   if(pathname.endsWith('/bancada-arquivos/tabela')){""")
s=s.replace("  assert.equal(tablePayloads[0].offset,0);", "  assert.equal(tablePayloads[0].revisao,'rev-1');\n  assert.equal(tablePayloads[0].offset,0);")
Path('tests/browser/bancada-revisao-previa.cjs').write_text(s,encoding='utf-8')
