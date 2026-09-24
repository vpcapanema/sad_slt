/* Arquivo original e prévia vivem apenas no estado da página: nenhum storage do
   navegador, catálogo persistente ou cadastro de camada recebe estes dados. */
import { $, el } from './ui.js';
import { base } from './api.js';

const MAX_BYTES = 16 * 1024 * 1024;
const quantidade = n => Number(n).toLocaleString('pt-BR');
const tamanho = n => n < 1024 ? `${quantidade(n)} B` : `${(n / (n < 1048576 ? 1024 : 1048576)).toLocaleString('pt-BR', {maximumFractionDigits: 2})} ${n < 1048576 ? 'KB' : 'MB'}`;

function base64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo local.'));
    reader.readAsDataURL(file);
  });
}

export function criarEntradaLocal(state, changed, {alvo='input', adicionar} = {}) {
  const baseLocal=alvo==='base';
  const node=id=>$(`#ea-${baseLocal?'base-local':'input'}-${id}`);
  const selecionar=node('upload'), arquivo=node('file'), status=node('upload-status');
  const host=node('preview'), mapaHost=node('preview-map'), dados=node('preview-data'), lista=node('preview-layers');
  let pacote=null, selecionada=null, mapa=null, desenho=null, atual=null, versao=0, controller;
  const cores=['#1769aa','#b64d11','#247947','#854cb0','#b52c65','#087f8c'];
  const vetorial=item=>item.status_validacao==='valida'&&item.tipo!=='raster';
  function mostrarStatus(texto,erro=false){status.textContent=texto;status.hidden=!texto;status.setAttribute('role',erro?'alert':'status');}
  function ocupado(valor){
    state.uploading=valor;
    for(const id of ['ea-input-upload','ea-base-local-upload','ea-input-browse','ea-input-clear','ea-base-browse'])$('#'+id).disabled=valor||state.busy;
    node('upload-cancel').hidden=!valor;
    $('#ea-run').disabled=valor||state.busy||!state.operation||!state.input||!state.bases.length;
  }
  selecionar.addEventListener('click',()=>{
    if(state.busy||state.uploading)return;
    if(baseLocal&&!$('#ea-category-select').value){mostrarStatus('Selecione a categoria da base antes de enviar.',true);return;}
    arquivo.click();
  });
  async function ler(file){
    const categoriaUpload=baseLocal?$('#ea-category-select').value:null;
    const minhaVersao=++versao;controller?.abort();controller=new AbortController();ocupado(true);
    mostrarStatus('Explorando o arquivo e validando todas as camadas…');
    try{
      const response=await fetch(`${base}/extracao-atributos/entrada-local?nome=${encodeURIComponent(file.name)}`,{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/octet-stream'},body:file,
        signal:AbortSignal.any([controller.signal,AbortSignal.timeout(180000)])});
      const result=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(typeof result?.detail==='string'?result.detail:`Falha na validação (HTTP ${response.status}).`);
      if(minhaVersao!==versao)return;
      if(!Array.isArray(result?.camadas)||!result.resumo)throw new Error('O servidor não retornou a validação de todas as camadas. Atualize a página e tente novamente.');
      const validas=result.camadas.filter(vetorial);
      const conteudo=validas.length?await base64(file):null;
      if(minhaVersao!==versao)return;
      if(baseLocal){
        for(const item of validas){
          item.arquivo_local={nome:file.name,camada:item.metadados_local.camada,conteudo_base64:conteudo};
          state.catalog.push(item);
        }
        if(validas.length)adicionar(validas.map(item=>item.id),categoriaUpload);
      }else{
        // Um conjunto de entrada: nunca conservar silenciosamente a entrada antiga após um lote sem vetores válidos.
        state.catalog=state.catalog.filter(item=>item.id!==state.input||item.origem!=='local');
        state.input='';state.inputConfig=null;
        if(result.entrada&&validas.length){
          result.entrada.arquivo_local={nome:file.name,conteudo_base64:conteudo};
          result.entrada.camadas_importadas=result.camadas;
          state.catalog.push(result.entrada);state.input=result.entrada.id;
        }
      }
      pacote=result;selecionada=result.camadas[0]?.chave||null;
      const r=result.resumo;
      mostrarStatus(`${r.total} camada(s) encontrada(s): ${r.validas} validada(s), ${r.invalidas} não validada(s). `+
        (baseLocal?`${validas.length} base(s) vetorial(is) adicionada(s) à lista da categoria.`:`${validas.length} camada(s) vetorial(is) compõem a entrada da análise.`)+
        (r.rasters?' Rasters aparecem na prévia; os algoritmos de extração disponíveis trabalham com vetores.':''));
      render();await changed();
    }catch(error){
      if(minhaVersao!==versao||error.name==='AbortError')return;
      mostrarStatus(`${error.name==='TimeoutError'?'A validação demorou demais. Tente novamente.':error.message}${state.input?' A seleção anterior foi mantida.':''}`,true);
    }finally{if(minhaVersao===versao)ocupado(false);}
  }
  arquivo.addEventListener('change',()=>{
    const file=arquivo.files[0];arquivo.value='';
    if(!file||state.busy||state.uploading)return;
    if(!file.size||file.size>MAX_BYTES){mostrarStatus('Escolha um arquivo não vazio de até 16 MB.',true);return;}
    ler(file);
  });
  node('upload-cancel').addEventListener('click',()=>{controller?.abort();versao++;ocupado(false);mostrarStatus('Validação cancelada. A prévia anterior foi mantida.');});
  function renderLista(){
    lista.replaceChildren();
    for(const [statusValidacao,titulo] of [['valida','Validadas'],['invalida','Não validadas']]){
      const itens=pacote.camadas.filter(c=>c.status_validacao===statusValidacao);
      const grupo=el('section',undefined,'ea-preview-layer-group');grupo.dataset.validation=statusValidacao;
      grupo.append(el('h5',`${titulo} (${itens.length})`));
      if(!itens.length)grupo.append(el('p','Nenhuma camada.','ea-hint'));
      for(const item of itens){
        const botao=el('button',undefined,'ea-preview-layer');botao.type='button';botao.dataset.layer=item.chave;
        botao.setAttribute('aria-pressed',String(item.chave===selecionada));
        const index=pacote.camadas.indexOf(item);botao.style.setProperty('--layer-color',cores[index%cores.length]);
        botao.append(el('strong',item.nome),el('small',`${item.tipo==='raster'?'Raster':'Vetor'} · ${item.arquivo}`));
        if(item.erro)botao.title=item.erro;
        botao.addEventListener('click',()=>{selecionada=item.chave;renderLista();renderDetalhes(item);});
        grupo.append(botao);
      }
      lista.append(grupo);
    }
  }
  function render(){
    host.hidden=!pacote;
    if(!pacote){desenho?.remove();desenho=null;atual=null;lista.replaceChildren();dados.replaceChildren();return;}
    if(atual===pacote)return;atual=pacote;
    if(!mapa){
      mapa=window.L.map(mapaHost,{preferCanvas:true,scrollWheelZoom:false}).setView([-23.5,-46.6],7);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',maxZoom:19,
      }).addTo(mapa).on('tileerror',()=>{node('preview-map-status').textContent='Mapa de fundo indisponível. As camadas validadas continuam visíveis.';});
      window.L.control.scale({imperial:false}).addTo(mapa);
      new ResizeObserver(()=>mapa.invalidateSize()).observe(mapaHost);
    }
    desenho?.remove();desenho=window.L.featureGroup().addTo(mapa);
    pacote.camadas.forEach((item,index)=>{
      if(item.status_validacao!=='valida'||!item.geojson)return;
      const color=cores[index%cores.length];
      const camada=window.L.geoJSON(item.geojson,{
        style:{color,weight:3,fillOpacity:.18},pointToLayer:(_,latlng)=>window.L.circleMarker(latlng,{radius:5,color,fillOpacity:.8})});
      camada.on('click',()=>{selecionada=item.chave;renderLista();renderDetalhes(item);});
      desenho.addLayer(camada);
      if(item.imagem&&camada.getBounds().isValid())desenho.addLayer(window.L.imageOverlay(item.imagem,camada.getBounds(),{opacity:.8}));
    });
    const limites=desenho.getBounds();requestAnimationFrame(()=>{mapa.invalidateSize();if(limites.isValid())mapa.fitBounds(limites,{padding:[24,24],maxZoom:15});});
    node('preview-name').textContent=`${pacote.arquivo} · ${pacote.resumo.total} camada(s) importada(s)`;
    renderLista();renderDetalhes(pacote.camadas.find(c=>c.chave===selecionada)||pacote.camadas[0]);
  }
  function renderDetalhes(layer){
    dados.replaceChildren();if(!layer)return;
    const titulo=el('h5',layer.nome,'ea-preview-selected-title');dados.append(titulo);
    if(layer.status_validacao==='invalida'){
      dados.append(el('p',`Arquivo: ${layer.arquivo}`),el('p',`Não validada: ${layer.erro}`,'ea-preview-error'));return;
    }
    const meta=layer.metadados_local,raster=layer.tipo==='raster';
    function grupo(titulo, pares) {
      const bloco = el('section', undefined, 'ea-preview-meta-group');bloco.append(el('h5', titulo));
      const lista = el('dl');
      for (const [nome, valor] of pares) lista.append(el('dt', nome), el('dd', valor));
      bloco.append(lista);dados.append(bloco);
    }
    if(raster){grupo('Arquivo raster', [['Arquivo',meta.arquivo],['Camada',meta.nome_camada],['Formato',meta.formato],['Tamanho',tamanho(meta.bytes)],['Dimensões',`${meta.largura} × ${meta.altura} pixels`],['Bandas',meta.bandas.map(b=>`${b.banda}: ${b.tipo} (NoData: ${b.nodata??'não informado'})`).join('; ')],['Resolução original',meta.resolucao?.join(' × ')||'Não informada'],['Uso na extração',layer.mensagem]]);}
    else grupo('Arquivo e camada', [['Arquivo', meta.arquivo], ['Formato', meta.formato], ['Tamanho', tamanho(meta.bytes)],
      ['Descompactado', tamanho(meta.bytes_descompactados)], ['Camada', meta.nome_camada],
      ['Feições', quantidade(meta.feicoes)], ['Campos', quantidade(meta.campos_total)],
      ['Geometrias', meta.tipos_geometria.join(', ')],
      ...(meta.comprimento_km > 0 ? [['Comprimento total das linhas', `${quantidade(meta.comprimento_km)} km`]] : []),
      ...(meta.area_km2 > 0 ? [['Soma das áreas válidas', `${quantidade(meta.area_km2)} km²`]] : [])]);
    grupo('Referência e localização geoespacial', [['CRS original', `${meta.crs} · ${meta.crs_nome}`],
      ['Unidade original', ({degree:'grau',metre:'metro'})[meta.unidade] || meta.unidade || 'Não informada'], ['CRS da prévia', 'WGS 84 · EPSG:4326'],
      ['Limites (oeste, sul, leste, norte)', meta.limites_wgs84?.map(n => Number(n).toFixed(6)).join(' · ')||'Não disponíveis']]);
    const local = meta.localizacao || {};
    grupo('Localização cadastral', [['Fonte', local.fonte || 'Não disponível'], ['Cobertura consultada', local.cobertura || 'Não disponível'],
      ['UF intersectada', local.ufs?.join(', ') || 'Não confirmada'],
      ['Municípios e códigos IBGE', local.municipios?.map(m => `${m.nm_mun} (${m.cd_mun}) / ${m.sigla_uf}`).join('; ') || 'Não confirmados'],
      ['Consulta', [local.aviso,local.aviso_ufs].filter(Boolean).join(' ') || 'Consulta concluída.']]);
    for (const aviso of meta.avisos || []) dados.append(el('p', aviso, 'ea-hint'));
  }
  function limpar(){controller?.abort();versao++;pacote=null;selecionada=null;ocupado(false);mostrarStatus('');render();}
  return {render,limpar};
}
