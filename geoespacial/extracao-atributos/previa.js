import { $, el, feedback } from './ui.js';
import { removerPrevia } from './preparacao.js';
const nomeArquivo=valor=>String(valor||'Arquivo sem nome').split(/[\\/]/).pop();
const quantidade=n=>Number(n).toLocaleString('pt-BR');
const tamanho=n=>n==null?'Não informado':`${(n/1024).toLocaleString('pt-BR',{maximumFractionDigits:2})} KB`;

export function criarPrevia(state, changed){
  const node=id=>$(`#ea-input-${id}`);
  const host=node('preview'),mapaHost=node('preview-map'),dados=node('preview-data'),lista=node('preview-layers');
  let pacote=null,selecionada=null,mapa=null,desenho=null,atual=null;
  const camadasMapa=new Map(),visiveis=new Set();
  let controles=[],botoes=[],niveis=[];
  const cores=['#1769aa','#b64d11','#247947','#854cb0','#b52c65','#087f8c'];
  function selecionarCamada(item){
    if(!item)return;
    selecionada=item.chave;
    for(const [botao,chave] of botoes)botao.setAttribute('aria-pressed',String(chave===selecionada));
    renderDetalhes(item);
  }
  function sincronizarVisibilidade(){
    for(const [checkbox,itens] of controles){
      const exibiveis=itens.filter(item=>camadasMapa.has(item.chave));
      const ativas=exibiveis.filter(item=>visiveis.has(item.chave)).length;
      checkbox.checked=ativas>0&&ativas===exibiveis.length;
      checkbox.indeterminate=ativas>0&&ativas<exibiveis.length;
      checkbox.disabled=state.busy||!exibiveis.length;
    }
    node('preview-map-status').textContent=visiveis.size?
      `${visiveis.size} camada(s) visível(is) no mapa. Ocultar aqui não altera a composição da bancada.`:
      'Nenhuma camada visível no mapa. Confira na bancada quais camadas participarão da análise.';
  }
  function caixaVisibilidade(itens,rotulo){
    const checkbox=el('input',undefined,'ea-preview-visibility');checkbox.type='checkbox';
    checkbox.setAttribute('aria-label',`Visibilidade no mapa: ${rotulo}`);
    controles.push([checkbox,itens]);
    checkbox.addEventListener('change',()=>{
      for(const item of itens){
        const camada=camadasMapa.get(item.chave);if(!camada)continue;
        if(checkbox.checked){desenho.addLayer(camada);visiveis.add(item.chave);}
        else{desenho.removeLayer(camada);visiveis.delete(item.chave);}
      }
      sincronizarVisibilidade();
      selecionarCamada(itens.find(item=>item.chave===selecionada)||itens[0]);
    });
    return checkbox;
  }
  function renderLista(){
    lista.replaceChildren();controles=[];botoes=[];
    function grupo(titulo,itens,classe=''){
      const section=el('section',undefined,`ea-preview-layer-group ${classe}`);
      const row=el('div',undefined,'ea-preview-tree-row');
      const botao=el('button',undefined,'ea-preview-group-toggle');botao.type='button';
      botao.setAttribute('aria-expanded','true');
      const seta=el('span','▾','ea-preview-chevron');seta.setAttribute('aria-hidden','true');
      botao.append(seta,el('span',titulo),el('span',String(itens.length),'ea-preview-count'));
      const body=el('div',undefined,'ea-preview-tree-children');body.setAttribute('role','group');body.setAttribute('aria-label',titulo);
      botao.addEventListener('click',()=>{body.hidden=!body.hidden;botao.setAttribute('aria-expanded',String(!body.hidden));seta.textContent=body.hidden?'▸':'▾';});
      row.append(caixaVisibilidade(itens,titulo),botao);section.append(row,body);
      return {section,body};
    }
    for(const [origem,titulo] of [['entrada','Camadas de entrada'],['base','Camadas de base']]){
      const itens=pacote.camadas.filter(c=>c.grupo===origem);
      const raiz=grupo(titulo,itens,'ea-preview-status-group');
      if(!itens.length)raiz.body.append(el('p','Nenhuma camada.','ea-preview-empty'));
      const arquivos=new Map();
      for(const item of itens){
        const nome=item.arquivoOrigem||item.arquivo||item.nome;
        if(!arquivos.has(nome))arquivos.set(nome,[]);
        arquivos.get(nome).push(item);
      }
      for(const [nome,camadas] of arquivos){
        const arquivoGrupo=grupo(nomeArquivo(nome),camadas,'ea-preview-file-group');
        for(const item of camadas){
          const row=el('div',undefined,'ea-preview-tree-row');
          const botao=el('button',undefined,'ea-preview-layer');botao.type='button';botao.dataset.layer=item.chave;
          botao.setAttribute('aria-pressed',String(item.chave===selecionada));
          const index=pacote.camadas.indexOf(item);botao.style.setProperty('--layer-color',cores[index%cores.length]);
          const tipo=item.tipo==='raster'?'raster':/Point/.test(item.metadados_local?.tipos_geometria?.join(''))?'point':/Line/.test(item.metadados_local?.tipos_geometria?.join(''))?'line':'polygon';
          const simbolo=el('span',undefined,`ea-preview-symbol ea-preview-symbol--${tipo}`);simbolo.setAttribute('aria-hidden','true');
          botao.append(simbolo,el('span',item.nome));
          botao.title=item.erro||`${item.tipo==='raster'?'Raster':'Vetor'} · ${item.arquivo}`;
          botao.addEventListener('click',()=>selecionarCamada(item));botoes.push([botao,item.chave]);
          row.dataset.validation=item.status_validacao;
          row.append(caixaVisibilidade([item],item.nome),botao);
          const badge=el('small',item.status_validacao==='invalida'?'Não validada':item.pendente?'Na prévia':'Na bancada','ea-preview-count');row.append(badge);
          if(state.editandoBases){
            const remover=el('button','×','ea-preview-remove');remover.type='button';remover.disabled=state.busy;
            remover.setAttribute('aria-label',`Remover da prévia: ${item.nome}`);
            remover.addEventListener('click',()=>{removerPrevia(state,item);changed();});row.append(remover);
          }
          arquivoGrupo.body.append(row);
        }
        raiz.body.append(arquivoGrupo.section);
      }
      lista.append(raiz.section);
    }
    sincronizarVisibilidade();
  }
  function atualizarDetalheMapa(){
    for(const item of niveis){
      const dados=mapa.getZoom()<12?item.layer.geojson_resumido:item.layer.geojson;
      if(dados!==item.atual){item.camada.clearLayers();item.camada.addData(dados);item.atual=dados;}
    }
  }
  function render(){
    host.hidden=!pacote;$('#ea-layer-information').hidden=!pacote?.camadas.length;
    if(!pacote){desenho?.remove();desenho=null;atual=null;camadasMapa.clear();visiveis.clear();niveis=[];controles=[];botoes=[];lista.replaceChildren();dados.replaceChildren();return;}
    const anteriores=new Set(camadasMapa.keys()), ocultas=new Set([...anteriores].filter(id=>!visiveis.has(id)));atual=pacote;
    if(!mapa){
      mapa=window.L.map(mapaHost,{preferCanvas:true,scrollWheelZoom:true,zoomSnap:0.5,zoomDelta:0.5,maxZoom:22}).setView([-23.5,-46.6],7);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxNativeZoom:19,maxZoom:22,
      }).addTo(mapa).once('tileerror',()=>{feedback('Mapa de fundo indisponível. As camadas validadas continuam visíveis.','warning');});
      window.L.control.scale({imperial:false}).addTo(mapa);
      const toolbar=el('div',undefined,'leaflet-bar ea-preview-map-tools');
      window.L.DomEvent.disableClickPropagation(toolbar);window.L.DomEvent.disableScrollPropagation(toolbar);
      for(const [label,icone,action] of [
        ['Ajustar às camadas','fa-expand',()=>{const b=desenho?.getBounds();if(b?.isValid())mapa.fitBounds(b,{padding:[30,30],maxZoom:18});}],
        ['Zoom na camada','fa-magnifying-glass-location',()=>{const b=camadasMapa.get(selecionada)?.getBounds();if(b?.isValid())mapa.fitBounds(b,{padding:[30,30],maxZoom:20});}],
        ['Tela cheia','fa-up-right-and-down-left-from-center',async()=>{try{if(document.fullscreenElement===host)await document.exitFullscreen();else await host.requestFullscreen();mapa.invalidateSize();}catch{feedback('O navegador não permitiu abrir a tela cheia.','warning');}}]
      ]){const button=el('button',undefined);button.type='button';button.title=label;button.setAttribute('aria-label',label);const icon=el('i',undefined,`fas ${icone}`);icon.setAttribute('aria-hidden','true');button.append(icon);button.addEventListener('click',action);toolbar.append(button);}
      const control=window.L.control({position:'topleft'});control.onAdd=()=>toolbar;control.addTo(mapa);
      mapa.on('zoomend',()=>{atualizarDetalheMapa();if(pacote)renderDetalhes(pacote.camadas.find(c=>c.chave===selecionada));});
      new ResizeObserver(()=>mapa.invalidateSize()).observe(mapaHost);
    }
    desenho?.remove();desenho=window.L.featureGroup().addTo(mapa);camadasMapa.clear();visiveis.clear();niveis=[];
    pacote.camadas.forEach((item,index)=>{
      if(item.status_validacao!=='valida'||!item.geojson)return;
      const color=cores[index%cores.length];
      const camada=window.L.geoJSON(item.geojson,{
        style:{color,weight:3,fillOpacity:.18},pointToLayer:(_,latlng)=>window.L.circleMarker(latlng,{radius:5,color,fillOpacity:.8})});
      if(item.geojson_resumido)niveis.push({layer:item,camada,atual:item.geojson});
      camada.on('click',()=>selecionarCamada(item));
      const grupo=window.L.featureGroup([camada]);
      if(item.imagem&&camada.getBounds().isValid())grupo.addLayer(window.L.imageOverlay(item.imagem,camada.getBounds(),{opacity:.8}));
      camadasMapa.set(item.chave,grupo);if(!ocultas.has(item.chave)){visiveis.add(item.chave);desenho.addLayer(grupo);}
    });
    atualizarDetalheMapa();
    const limites=desenho.getBounds();requestAnimationFrame(()=>{mapa.invalidateSize();if(limites.isValid()&&pacote.camadas.some(c=>!anteriores.has(c.chave)))mapa.fitBounds(limites,{padding:[24,24],maxZoom:15,animate:false});});
    node('preview-name').textContent=`${pacote.camadas.filter(c=>c.grupo==='entrada').length} entrada(s) · ${pacote.camadas.filter(c=>c.grupo==='base').length} base(s)`;
    renderLista();renderDetalhes(pacote.camadas.find(c=>c.chave===selecionada)||pacote.camadas[0]);
  }
  function renderDetalhes(layer){
    dados.replaceChildren();
    if(!layer){dados.append(el('p','Selecione uma camada no painel para consultar suas informações.','ea-meta-empty'));return;}
    const meta=layer.metadados_local||{},local=meta.localizacao||{},raster=layer.tipo==='raster';
    const features=layer.geojson?.features||[];
    const informado=v=>v==null||v===''?'Não informado':String(v);
    const numero=v=>v!=null&&Number.isFinite(Number(v))?quantidade(v):'Não informado';
    const unir=v=>Array.isArray(v)&&v.length?v.join(' · '):'Não informado';
    const caminho=layer.arquivoOrigem||layer.arquivo||meta.arquivo;
    const campos=meta.campos||layer.campos||[];
    const nomesCampos=campos.length?campos.map(c=>typeof c==='string'?c:c.nome):[...new Set(features.flatMap(f=>Object.keys(f.properties||{})))];
    const representacao=meta.previa||layer.representacao_previa;
    const nivel=mapa?.getZoom()<12&&representacao?.nivel_resumido?representacao.nivel_resumido:representacao;
    const situacao=({valida:'Validada',invalida:'Não validada',pendente:'Aguardando validação'})[layer.status_validacao]||'Não informada';
    function grupo(titulo,pares){
      const bloco=el('section',undefined,'ea-preview-meta-group');bloco.append(el('h5',titulo));
      const lista=el('dl');
      for(const [rotulo,valor] of pares){const linha=el('div',undefined,'ea-meta-row');linha.append(el('dt',rotulo),el('dd',informado(valor)));lista.append(linha);}
      bloco.append(lista);dados.append(bloco);
    }
    grupo('Identificação',[
      ['Camada',layer.nome],['Papel',layer.grupo==='base'?'Camada de base':'Camada de entrada'],
      ['Arquivo',caminho?nomeArquivo(caminho):null],['Caminho do arquivo',caminho],
      ['Componente interno',meta.componente||meta.camada||layer.camada],
      ['Formato',meta.formato||layer.formato||(caminho?.includes('.')?caminho.split('.').pop().toUpperCase():null)],
      ['Categoria',layer.categoria||'Não se aplica'],['Tamanho',tamanho(meta.bytes??layer.tamanho_bytes)],
      ['Descompactado',tamanho(meta.bytes_descompactados)]]);
    grupo('Validação e uso',[
      ['Validação',situacao],['Motivo',layer.erro||'Sem erro informado'],
      ['Visibilidade',visiveis.has(layer.chave)?'Visível no mapa':'Não exibida no mapa'],
      ['Bancada',layer.pendente?'Ainda não enviada':'Camada confirmada'],
      ['Representação',({original:'Geometria integral',simplificada:'Prévia simplificada',limites:'Limites das feições (aproximação)'})[nivel?.metodo]||(layer.geojson?'Prévia carregada':'Indisponível')],
      ['Processamento',layer.status_validacao!=='valida'?'Requer validação':raster?'Os algoritmos disponíveis exigem vetores':'Utiliza a geometria original, sem simplificação da prévia']]);
    grupo('Conteúdo geoespacial',[
      ['Tipo',raster?'Raster':'Vetor'],['Feições originais',numero(meta.feicoes??layer.feicoes)],
      ['Feições na prévia',layer.geojson?numero(features.length):'Não disponível'],
      ['Vértices originais',raster?'Não se aplica':numero(meta.vertices??representacao?.vertices_originais)],
      ['Geometrias',raster?'Não se aplica':unir(meta.tipos_geometria||[...new Set(features.map(f=>f.geometry?.type).filter(Boolean))])],
      ['Quantidade de campos',numero(meta.campos_total??(nomesCampos.length||null))],['Campos',unir(nomesCampos)],
      ['Área total',meta.area_km2!=null?`${numero(meta.area_km2)} km²`:'Não informada'],
      ['Comprimento total',meta.comprimento_km!=null?`${numero(meta.comprimento_km)} km`:'Não informado'],
      ...(raster?[
        ['Dimensões',meta.largura!=null&&meta.altura!=null?`${meta.largura} × ${meta.altura} pixels`:null],
        ['Bandas',meta.bandas?.map(b=>`${b.banda}: ${b.tipo} (NoData: ${b.nodata??'não informado'})`).join('; ')],
        ['Resolução',unir(meta.resolucao)]]:[])]);
    grupo('Sistema de coordenadas',[
      ['CRS original',meta.crs||layer.crs||layer.crs_arquivo],['Nome do CRS',meta.crs_nome],
      ['Unidade',({degree:'grau',metre:'metro'})[meta.unidade]||meta.unidade],
      ['CRS da prévia',layer.geojson?'WGS 84 · EPSG:4326':'Prévia indisponível'],
      ['Limites O / S / L / N',meta.limites_wgs84?.map(n=>Number(n).toFixed(6)).join(' · ')]]);
    grupo('Localização cadastral',[
      ['UF',unir(local.ufs)],['Municípios / IBGE',local.municipios?.map(m=>`${m.nm_mun} (${m.cd_mun}) / ${m.sigla_uf}`).join('; ')||'Não confirmados'],
      ['Fonte',local.fonte],['Cobertura',local.cobertura],
      ['Consulta',[local.aviso,local.aviso_ufs].filter(Boolean).join(' ')||(local.status==='consultado'?'Consulta concluída':'Não informada')]]);
    grupo('Observações',[
      ['Avisos',[...(meta.avisos||[]),...(layer.mensagem?[layer.mensagem]:[])].join(' ')||'Sem observações adicionais']]);
  }
  let assinaturaAnterior=[];
  function atualizar(){
    const camadas=[];
    for(const id of [state.input,...state.entradasExtras.map(e=>e.id)].filter(Boolean)){
      const layer=state.catalog.find(c=>c.id===id);if(!layer)continue;
      for(const item of layer.camadas_importadas||[layer]){
        camadas.push({...item,chave:`entrada:${id}:${item.chave||item.id}`,entradaId:id,chaveOriginal:item.chave,arquivoOrigem:layer.arquivo_local?.nome||layer.arquivo||item.arquivo,pendente:!state.bancadaEntradas.some(e=>e.id===id&&(!e.layer.camadas_bancada||e.layer.camadas_bancada.some(c=>c.chave===item.chave))),grupo:'entrada',status_validacao:item.status_validacao||(item.geojson?'valida':'pendente')});
      }
    }
    if(!state.input&&state.previaLocal&&!state.previaLocal.entrada)for(const item of state.previaLocal.camadas)camadas.push({...item,chave:`entrada:${item.chave||item.id}`,grupo:'entrada'});
    for(const base of [...state.bases,...state.staging]){
      const layer=state.catalog.find(c=>c.id===base.id);if(!layer)continue;
      camadas.push({...layer,chave:`base:${layer.id}`,grupo:'base',arquivoOrigem:layer.arquivo_local?.nome||layer.arquivo,categoria:state.categories.find(c=>c.id===base.category)?.nome||base.category,pendente:!state.bancadaBases.some(b=>b.id===base.id),status_validacao:layer.erro?'invalida':layer.geojson?'valida':'pendente'});
    }
    const assinatura=[state.editandoBases,state.undoPrevia,state.busy,...camadas.flatMap(c=>[c.chave,c.geojson,c.geojson_resumido,c.metadados_local,c.nome,c.categoria,c.pendente,c.erro])];
    if(assinatura.length===assinaturaAnterior.length&&assinatura.every((v,i)=>v===assinaturaAnterior[i])){sincronizarVisibilidade();return;}
    assinaturaAnterior=assinatura;
    pacote=camadas.length||state.undoPrevia?{camadas}:null;
    if(!camadas.some(c=>c.chave===selecionada))selecionada=camadas[0]?.chave;
    render();
  }
  return {render:atualizar};
}
