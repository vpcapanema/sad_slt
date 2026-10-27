// Regressão: superfícies de favorabilidade nascem com a simbologia compartilhada
// (assets/js/favorabilidade-simbologia.js) na prévia e na bancada, sem estilo genérico.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const P='superficies-indices/hierarquizacao/favorabilidade';
const REDE={id:`storage:${P}/Favorabilidade Rede Trechos pol.gpkg::subtrechos`,arquivo:`${P}/Favorabilidade Rede Trechos pol.gpkg`,nome:'subtrechos',campos:['fav_rede','fav_rede_dim','fav_rede_classe']};
const GRADE={id:`storage:${P}/indicadores_municipais.gpkg::municipios`,arquivo:`${P}/indicadores_municipais.gpkg`,nome:'municipios',campos:['fav_territorial','fav_territorial_dim','fav_territorial_classe']};
// Saída de interseção da Fase 2: atributos preservados com prefixo da superfície.
const INTER={id:'storage:resultados/favorabilidade/execucao.gpkg::intersecoes',arquivo:'resultados/favorabilidade/execucao.gpkg',nome:'intersecoes',campos:['demanda','rede__fav_rede_dim','rede__fav_rede_classe']};
const GENERICA={id:'storage:base-geoespacial/rios.gpkg::rios',arquivo:'base-geoespacial/rios.gpkg',nome:'rios',campos:['nome']};
const JENKS={min:.1,max:.9,quebras:[.2,.35,.5,.7]};
const varint=n=>{const a=[];while(n>127){a.push((n&127)|128);n>>>=7;}return Buffer.from([...a,n]);};
const bytes=(field,b)=>Buffer.concat([varint(field*8+2),varint(b.length),b]);
const integer=(field,n)=>Buffer.concat([varint(field*8),varint(n)]);
const tile=bytes(3,Buffer.concat([bytes(1,Buffer.from('camada')),bytes(2,Buffer.concat([integer(1,1),integer(3,3),bytes(4,Buffer.concat([9,2000,2000,26,4000,0,0,4000,3999,0,15].map(varint)))])),integer(5,4096),integer(15,2)]));
function api(route,classificacoes,liberar){
 const u=new URL(route.request().url());
 if(u.pathname.includes('/tiles/'))return route.fulfill({status:200,contentType:'application/x-protobuf',body:tile});
 if(u.pathname.endsWith('/bancada-arquivos/preparar')){const d=route.request().postDataJSON();return route.fulfill({json:{id:d.id,arquivo:d.arquivo,revisao:'r1'}});}
 if(u.pathname.endsWith('/bancada-arquivos/classificacao')){
  const d=route.request().postDataJSON();classificacoes.push(d);
  return liberar.then(()=>route.fulfill({json:{camada_id:d.camada_id,campo:d.campo,metodo:'jenks',numerico:true,classes:5,...JENKS}}));
 }
 if(u.pathname.endsWith('/catalogo/projeto'))return route.fulfill({json:{toolboxes:[]}});
 if(u.pathname.endsWith('/ambientes'))return route.fulfill({json:{}});
 return route.fulfill({json:[]});
}
const servirArquivo=(route,pathname)=>{
 const file=path.join(root,pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
 return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'text/javascript; charset=utf-8'});
};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-unsafe-swiftshader']});
 try{
  // 1. Prévia (Leaflet + MapLibre reais).
  {
   const page=await browser.newPage(),errors=[],classificacoes=[];let soltar;const liberar=new Promise(r=>{soltar=r;});
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><link rel="stylesheet" href="/assets/vendor/leaflet/leaflet.css"><div id="map" style="width:800px;height:600px"></div><script src="/assets/vendor/leaflet/leaflet.js"></script><script src="/assets/vendor/maplibre-gl/maplibre-gl.js"></script><script src="/assets/vendor/maplibre-gl/leaflet-maplibre-gl.js"></script>'});
    if(url.pathname.startsWith('/api/'))return api(route,classificacoes,liberar);
    return servirArquivo(route,url.pathname);
   });
   await page.goto('http://localhost/');
   await page.evaluate(async camadas=>{
    const {camadaTiles}=await import('/geoespacial/extracao-atributos/previa-tiles.js');
    window.map=L.map('map').setView([-23,-47],5);
    for(const [i,c] of camadas.entries())camadaTiles(map,{...c,arquivo:c.arquivo,revisao:'r1',campos:c.campos.map(nome=>({nome})),tiles_url:`http://localhost/tiles/${i}/{z}/{x}/{y}`},'#ff0000').addTo(map);
    window.gl=Object.values(map._layers).find(l=>l.getMaplibreMap).getMaplibreMap();
   },[REDE,GRADE,INTER,GENERICA]);
   await page.waitForFunction(()=>Object.keys(gl.getStyle().sources).length===4&&gl.getStyle().layers.length===12);
   const pintura=()=>page.evaluate(()=>gl.getStyle().layers.filter(l=>l.type==='fill').map(l=>({cor:gl.getPaintProperty(l.id,'fill-color'),opacidade:gl.getPaintProperty(l.id,'fill-opacity'),aa:gl.getPaintProperty(l.id,'fill-antialias')})));
   const esperado=(c,classificacao)=>page.evaluate(([c,cl])=>{const FS=FavorabilidadeSimbologia,cfg=FS.identificar({...c,campos:c.campos});return FS.expressaoCor(cfg,cfg.classe?null:cl);},[c,classificacao]);
   let atual=await pintura();
   assert.deepEqual(atual[0].cor,await esperado(REDE),'Rede pintada pelas classes já na criação da camada');
   assert.equal(atual[0].opacidade,1);assert.equal(atual[0].aa,false);
   assert.deepEqual(atual[1].cor,await esperado(GRADE,null),'Grade nasce com a rampa contínua 0–1, sem estilo genérico');
   assert.deepEqual(atual[2].cor,await esperado(INTER),'Saída de interseção reconhecida pelos campos preservados');
   assert.equal(atual[3].cor,'#ff0000','Camada sem favorabilidade mantém o estilo genérico');
   soltar();
   await page.waitForFunction(()=>gl.getStyle().layers.filter(l=>l.type==='fill').some(l=>JSON.stringify(gl.getPaintProperty(l.id,'fill-color')).includes('0.35')));
   atual=await pintura();
   assert.deepEqual(atual[1].cor,await esperado(GRADE,{...JENKS,metodo:'jenks',classes:5}),'Grade recebe o contraste Jenks após a classificação');
   assert.deepEqual(classificacoes.map(c=>[c.camada_id,c.campo,c.metodo,c.classes,c.dominio]),[[GRADE.id,'fav_territorial_dim','jenks',5,[0,1]]]);
   assert.deepEqual(errors,[]);
   await page.close();
  }
  // 2. Bancada (template real, camadas adicionadas por gpArquivos.adicionar).
  {
   const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[],classificacoes=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='localhost')return route.fulfill({status:404,body:''});
    if(url.pathname.startsWith('/api/'))return api(route,classificacoes,Promise.resolve());
    if(url.pathname==='/')return servirArquivo(route,'/templates/componentes/_geoprocessamento.html');
    return servirArquivo(route,url.pathname.replace('/restrict/geoespacial/','/geoespacial/'));
   });
   await page.goto('http://localhost/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.gpApp?.state.map?.isStyleLoaded()&&window.gpArquivos);
   const imediato=await page.evaluate(camadas=>camadas.map(c=>{
    gpArquivos.adicionar({...c,revisao:'r1',representacao:'tiles',tiles_url:'http://localhost/tiles/b/{z}/{x}/{y}',geometria_tipo:'Multi Polygon',campos:c.campos.map(nome=>({nome}))},{estiloPreparado:true});
    const m=gpApp.state.map;return {cor:m.getPaintProperty(c.id,'fill-color'),linha:m.getPaintProperty(`${c.id}-line`,'line-opacity'),aa:m.getPaintProperty(c.id,'fill-antialias')};
   }),[REDE,GRADE,INTER,GENERICA]);
   const FS=(c,cl)=>page.evaluate(([c,cl])=>{const cfg=FavorabilidadeSimbologia.identificar(c);return FavorabilidadeSimbologia.expressaoCor(cfg,cfg.classe?null:cl);},[c,cl]);
   assert.deepEqual(imediato[0].cor,await FS(REDE),'Rede pintada pelas classes no mesmo ciclo da adição');
   assert.deepEqual(imediato[1].cor,await FS(GRADE,null),'Grade nasce com a rampa contínua, sem estilo genérico');
   assert.deepEqual(imediato[2].cor,await FS(INTER),'Interseção da Fase 2 reconhecida pelos campos preservados');
   assert.equal(imediato[0].aa,false);
   assert.deepEqual(imediato[0].linha,['match',['geometry-type'],['Polygon','MultiPolygon'],0,1],'Polígonos de favorabilidade sem contorno');
   assert.equal(typeof imediato[3].cor,'string','Camada comum mantém cor simples');
   await page.waitForFunction(id=>JSON.stringify(gpApp.state.map.getPaintProperty(id,'fill-color')).includes('0.35'),GRADE.id);
   assert.deepEqual(await page.evaluate(id=>gpApp.state.map.getPaintProperty(id,'fill-color'),GRADE.id),await FS(GRADE,{...JENKS,metodo:'jenks',classes:5}));
   assert(classificacoes.some(c=>c.camada_id===GRADE.id&&c.campo==='fav_territorial_dim'));
   assert(!classificacoes.some(c=>c.camada_id===REDE.id),'Classes categóricas não pedem Jenks');
   const legendas=await page.evaluate(()=>[...document.querySelectorAll('.layer-legend[data-favorabilidade]')].map(n=>[n.dataset.favorabilidade,n.textContent.replace(/\s+/g,' ').trim()]));
   assert(legendas.some(([tipo,texto])=>tipo==='categorias'&&/Muito alta.*Alta.*Média.*Baixa.*Muito baixa/.test(texto)),'Legenda por classes no painel de camadas');
   assert(legendas.some(([tipo,texto])=>tipo==='continua'&&texto.includes('fav_territorial_dim')&&!texto.includes('Preparando')),'Legenda contínua com contraste Jenks');
   // Trocar a cor simples não substitui a simbologia temática.
   await page.evaluate(id=>gpApp.applyLayerColor(id,'#123456',false),REDE.id);
   assert.deepEqual(await page.evaluate(id=>gpApp.state.map.getPaintProperty(id,'fill-color'),REDE.id),await FS(REDE));
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS: prévia e bancada aplicam a simbologia de favorabilidade na criação (classes, rampa 0–1 e Jenks), incluindo interseções; camadas comuns preservadas; legenda na bancada.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
