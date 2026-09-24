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
  let inspecaoRaster=null, ultimaBase=null;
  const selecionar = node('upload'), arquivo = node('file'), status = node('upload-status');
  const escolha = node('layer-choice'), opcoes = node('local-layer');
  const host = node('preview'), mapaHost = node('preview-map'), dados = node('preview-data');
  let mapa, desenho, atual, pendente, versao = 0, controller;
  selecionar.addEventListener('click', () => { if (!state.busy && !state.uploading) {if(baseLocal&&!$('#ea-category-select').value){mostrarStatus('Selecione a categoria da base antes de enviar.',true);return;}arquivo.click();} });

  function mostrarStatus(texto, erro = false) {
    status.textContent = texto;status.hidden = !texto;status.setAttribute('role', erro ? 'alert' : 'status');
  }
  function ocupado(valor) {
    state.uploading = valor;
    selecionar.disabled = valor || state.busy;
    $('#ea-input-browse').disabled = valor || state.busy;
    $('#ea-input-clear').disabled = valor || state.busy;
    $('#ea-base-browse').disabled = valor || state.busy;
    node('local-confirm').disabled = valor;
    node('upload-cancel').hidden = !valor;
    $('#ea-run').disabled = valor || state.busy || !state.operation || !state.input || !state.bases.length;
  }
  async function ler(file, camada) {
    const categoriaUpload=baseLocal?$('#ea-category-select').value:null;
    const minhaVersao = ++versao;
    controller?.abort();controller = new AbortController();
    ocupado(true);escolha.hidden = true;
    mostrarStatus('Lendo, descompactando e validando a camada…');
    try {
      const response = await fetch(`${base}/extracao-atributos/entrada-local?nome=${encodeURIComponent(file.name)}${camada ? '&camada=' + encodeURIComponent(camada) : ''}`, {
        method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/octet-stream'}, body: file,
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(180000)]),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result?.detail === 'string' ? result.detail : `Falha na validação (HTTP ${response.status}).`);
      if (minhaVersao !== versao) return;
      if (result?.camadas) {
        pendente = file;opcoes.replaceChildren(new Option('Selecione uma camada', ''));
        for (const item of result.camadas) opcoes.append(new Option(`${item.tipo==='raster'?'Raster':'Vetor'} · ${item.arquivo} › ${item.nome}`, item.chave));
        escolha.hidden = false;mostrarStatus('Conteúdo do pacote: escolha uma camada para validar ou um raster para inspecionar.' + (result.avisos?.length ? ' '+result.avisos.join(' ') : ''));return;
      }
      if(result?.tipo==='raster'){inspecaoRaster=result;mostrarStatus(result.mensagem+(state.input?' A entrada selecionada anteriormente foi mantida.':''));render();return;}
      inspecaoRaster=null;
      if (!result?.geojson?.features?.length || !result.metadados_local) throw new Error('A validação não retornou uma camada utilizável.');
      const conteudo = await base64(file);
      if (minhaVersao !== versao) return;
      result.arquivo_local = {nome: file.name, camada: result.metadados_local.camada, conteudo_base64: conteudo};
      // Uma entrada local por vez; substituir também libera as referências antigas da página.
      if(!baseLocal)state.catalog=state.catalog.filter(item=>item.id!==state.input||item.origem!=='local');
      state.catalog.push(result);
      if(baseLocal){ultimaBase=result;adicionar([result.id],categoriaUpload);}else{state.input=result.id;state.inputConfig=null;}
      if(!camada)pendente = null;
      mostrarStatus(baseLocal?'Base validada e adicionada à lista da categoria. Confirme a lista para usá-la na análise.':'Camada validada e selecionada como entrada. O arquivo permanece somente na memória desta página.');
      render();
      await changed();
    } catch (error) {
      if (minhaVersao !== versao || error.name === 'AbortError') return;
      mostrarStatus(`${error.name==='TimeoutError'?'A validação demorou demais. Tente novamente.':error.message}${state.input ? ' A seleção anterior foi mantida.' : ''}`, true);
    } finally {
      if (minhaVersao === versao) {ocupado(false);if(pendente&&opcoes.options.length>1)escolha.hidden=false;}
    }
  }
  arquivo.addEventListener('change', () => {
    const file = arquivo.files[0];arquivo.value = '';
    if(state.busy||state.uploading)return;
    if (!file) return;
    if (!file.size || file.size > MAX_BYTES) { mostrarStatus('Escolha um arquivo não vazio de até 16 MB.', true);return; }
    pendente = null;opcoes.replaceChildren();ler(file);
  });
  node('local-confirm').addEventListener('click', () => {
    if (!pendente || !opcoes.value) { mostrarStatus('Selecione uma camada do arquivo.', true);return; }
    ler(pendente, opcoes.value);
  });
  const cancelar = () => {
    controller?.abort();versao++;pendente = null;escolha.hidden = true;ocupado(false);mostrarStatus('Seleção do arquivo cancelada.');
  };
  node('local-cancel').addEventListener('click', cancelar);
  node('upload-cancel').addEventListener('click', cancelar);
  function render() {
    const layer=inspecaoRaster||(baseLocal?ultimaBase:state.catalog.find(item=>item.id===state.input&&item.origem==='local'));
    const raster=layer?.tipo==='raster';
    host.hidden = !layer;
    if (!layer) {
      if (desenho) { desenho.remove();desenho = null; }
      atual = null;dados.replaceChildren();return;
    }
    if (atual === layer) return;
    atual = layer;
    if (!mapa) {
      mapa = window.L.map(mapaHost, {preferCanvas: true, scrollWheelZoom: false}).setView([-23.5, -46.6], 7);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
      }).addTo(mapa).on('tileerror', () => {
        node('preview-map-status').textContent = 'Mapa de fundo indisponível. A geometria da entrada continua visível.';
      });
      window.L.control.scale({imperial: false}).addTo(mapa);
      new ResizeObserver(() => mapa.invalidateSize()).observe(mapaHost);
    }
    desenho?.remove();
    desenho = window.L.geoJSON(layer.geojson||{type:'FeatureCollection',features:[]}, {
      style: {color: '#1769aa', weight: 3, fillOpacity: .2},
      pointToLayer: (_, latlng) => window.L.circleMarker(latlng, {radius: 5, color: '#1769aa', fillOpacity: .75}),
    }).addTo(mapa);
    const limites = desenho.getBounds();
    if(layer.imagem&&limites.isValid()){const grupo=window.L.featureGroup([desenho,window.L.imageOverlay(layer.imagem,limites)]).addTo(mapa);desenho=grupo;}
    requestAnimationFrame(() => { mapa.invalidateSize();if (limites.isValid()) mapa.fitBounds(limites, {padding: [24, 24], maxZoom: 15}); });
    dados.replaceChildren();
    const meta = layer.metadados_local;
    node('preview-name').textContent = `${meta.arquivo} › ${meta.nome_camada}`;
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
  function limpar() {
    inspecaoRaster=null;ultimaBase=null;controller?.abort();versao++;pendente=null;escolha.hidden=true;ocupado(false);mostrarStatus('');render();
  }
  return {render,limpar};
}
