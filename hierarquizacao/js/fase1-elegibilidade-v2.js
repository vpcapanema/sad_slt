import {$, el, feedback} from '../../geoespacial/extracao-atributos/ui.js';
import {json, post} from '../../geoespacial/extracao-atributos/api.js';
import {escolherArquivo, identificarCamadas} from '../../geoespacial/extracao-atributos/explorador.js';
import {validarCamada} from '../../geoespacial/extracao-atributos/camada-validada.js';
import {escolherConfiguracao} from '../../geoespacial/extracao-atributos/lista-camadas.js';
import {criarPrevia} from '../../geoespacial/extracao-atributos/previa.js';
import {criarMapa} from '../../geoespacial/extracao-atributos/mapa.js';

const papeis = {entrada:'Entrada', restricao:'Restrição', risco:'Risco'};
const selecao = {entrada:[], restricao:[], risco:[]};
const previadas = {entrada:[], restricao:[], risco:[]};
const enviados = {entrada:[], restricao:[], risco:[]};
const state = {busy:false, previaVisiveis:new Set(), origemEntrada:null};
let hierarquizacao = null;
const node = id => $(`#ev-${id}`);
const chave = (papel, camada) => `${papel}:${camada.id}`;
const identidade = camada => {
  const arquivo = camada.id.startsWith('storage:') ? camada.id.slice(8) : camada.arquivo;
  if (!arquivo) return camada.id;
  return arquivo.includes('::') ? arquivo : `${arquivo}::${camada.camada || ''}`;
};
const conflita = (a, b) => a === b || (a.endsWith('::') && b.startsWith(a)) || (b.endsWith('::') && a.startsWith(b));
const mapa = criarMapa(atualizarBancada);
const previa = criarPrevia(state, render, {obterCamadas:camadasPrevia, aoMudarVisibilidade:controles});

function avisar(mensagem, tipo='info') {
  node('status').textContent = mensagem;
  node('status').dataset.error = String(tipo === 'error');
  feedback(mensagem, tipo);
}
async function ocupar(mensagem, acao) {
  if (state.busy) return;
  state.busy = true;
  node('status').textContent = mensagem;
  node('status').dataset.error = 'false';
  controles();
  try { await acao(); }
  catch (erro) { avisar(`${mensagem} ${erro.message}`, 'error'); }
  finally { state.busy = false; render(); }
}
function camadasPrevia() {
  return Object.keys(papeis).flatMap(papel => previadas[papel].map(camada => ({
    ...camada, chave:chave(papel, camada), grupo:papel === 'entrada' ? 'entrada' : 'base',
    categoriaId:papel, categoria:papeis[papel], arquivoOrigem:camada.arquivo || camada.nome,
    pendente:!enviados[papel].some(item => item.id === camada.id && item.revisao === camada.revisao),
  })));
}
function marcadas(papel) {
  return previadas[papel].filter(camada => state.previaVisiveis.has(chave(papel, camada)));
}
function controles() {
  for (const button of document.querySelectorAll('#elegibilidade-app button, #ev-hierarquizacao')) button.disabled = state.busy;
  node('entrada-browse').disabled = state.busy || state.origemEntrada === 'hierarquizacao';
  node('entrada-camadas').disabled = node('entrada-browse').disabled;
  node('hierarquizacao').disabled = state.busy || state.origemEntrada === 'camadas';
  for (const papel of Object.keys(papeis)) {
    node(`${papel}-enviar`).disabled = state.busy || !(selecao[papel].length || previadas[papel].length);
    if (papel !== 'entrada') node(`${papel}-salvar`).disabled = state.busy || !selecao[papel].length;
  }
  const semRestricao = !selecao.restricao.length && !previadas.restricao.length && !enviados.restricao.length;
  for (const acao of ['browse','carregar','enviar']) node(`risco-${acao}`).disabled ||= semRestricao;
  const origem = state.origemEntrada || previadas.entrada[0]?.origemEntrada;
  node('hier-enviar').disabled = node('entrada-enviar').disabled || origem !== 'hierarquizacao';
  node('entrada-enviar').disabled ||= origem !== 'camadas';
  node('entrada-limpar').disabled = state.busy || state.origemEntrada !== 'camadas';
  node('hier-limpar').disabled = state.busy || state.origemEntrada !== 'hierarquizacao';
  for (const papel of ['restricao','risco']) node(`${papel}-camadas`).disabled = node(`${papel}-browse`).disabled;
  $('#ea-staging-confirmar').disabled = state.busy || !Object.keys(papeis).some(papel => marcadas(papel).length);
}
function render() {
  node('entrada-lista').replaceChildren();
  node('hier-lista').replaceChildren();
  for (const papel of Object.keys(papeis)) {
    const lista = node(papel === 'entrada' && state.origemEntrada === 'hierarquizacao' ? 'hier-lista' : `${papel}-lista`);
    lista.replaceChildren();
    if (!selecao[papel].length && papel !== 'entrada') lista.append(el('li', 'Nenhuma camada selecionada.'));
    for (const camada of selecao[papel]) {
      const linha = el('li'), remover = el('button', undefined, 'ea-btn ea-icon-button ev-remove-layer');
      const icone = el('i', undefined, 'fas fa-trash-can');
      icone.setAttribute('aria-hidden', 'true');
      remover.append(icone, el('span', 'Remover', 'ea-sr-only'));
      remover.type = 'button';
      remover.setAttribute('aria-label', `Remover ${camada.nome} da seleção de ${papeis[papel].toLowerCase()}`);
      remover.title = remover.getAttribute('aria-label');
      remover.onclick = () => {
        if (state.busy) return;
        selecao[papel] = selecao[papel].filter(item => item.id !== camada.id);
        if (papel === 'entrada' && !selecao.entrada.length) limparEntrada();
        render();
      };
      linha.append(el('span', camada.nome), remover);
      lista.append(linha);
    }
  }
  node('hier-detalhes').hidden = !hierarquizacao;
  node('hier-dados').textContent = hierarquizacao ? JSON.stringify(hierarquizacao, null, 2) : '';
  node('entrada-camadas').value = state.origemEntrada === 'camadas' ? selecao.entrada.map(camada => camada.nome).join('; ') : '';
  for (const papel of ['restricao','risco']) node(`${papel}-camadas`).value = selecao[papel].map(camada => camada.nome).join('; ');
  previa.render();
  controles();
}
function limparHierarquizacao() {
  hierarquizacao = null;
  node('hierarquizacao').value = '';
}
function limparEntrada() {
  selecao.entrada = [];
  state.origemEntrada = null;
  limparHierarquizacao();
}
function validarPapeis(papel, camadas) {
  const vistos = new Set();
  for (const camada of camadas) {
    const id = identidade(camada);
    if ([...vistos].some(outro => conflita(id, outro))) throw new Error(`A camada "${camada.nome}" está repetida.`);
    vistos.add(id);
    for (const outro of Object.keys(papeis).filter(item => item !== papel)) {
      if ([...selecao[outro], ...previadas[outro], ...enviados[outro]].some(item => conflita(identidade(item), id))) {
        throw new Error(`"${camada.nome}" já é ${papeis[outro].toLowerCase()}. Remova-a da seleção, atualize a prévia e retire-a da bancada desse papel antes de reutilizá-la.`);
      }
    }
  }
}
async function preparar(referencias) {
  if (!referencias.length) return [];
  referencias = await identificarCamadas(referencias, {
    aoIdentificar:ref => { node('status').textContent = `Identificando camadas de ${ref.nome || ref.arquivo}…`; },
  });
  const camadas = [];
  for (const ref of referencias) {
    node('status').textContent = `Validando ${camadas.length + 1} de ${referencias.length}: ${ref.nome || ref.id}`;
    const camada = await validarCamada(ref);
    if (camada.tipo === 'raster') throw new Error(`"${camada.nome}" é raster. Selecione camadas vetoriais para esta preparação.`);
    camadas.push(camada);
  }
  return camadas;
}
async function explorar(papel) {
  await ocupar('Selecionando camadas.', async () => {
    if (papel === 'entrada' && state.origemEntrada === 'hierarquizacao') {
      throw new Error('Limpe a seleção de entrada antes de selecionar camadas de demanda.');
    }
    const refs = await escolherArquivo({
      title:`Adicionar camadas de ${papeis[papel].toLowerCase()}`,
      multiple:true, validar:false, somenteReferencias:true,
      excluded:Object.keys(papeis).filter(item => item !== papel).flatMap(item => [...selecao[item], ...previadas[item], ...enviados[item]].map(c => c.id)),
    });
    if (!refs) { avisar('Seleção cancelada. A prévia anterior foi mantida.'); return; }
    const candidatas = papel === 'entrada' ? refs : [...new Map([...selecao[papel], ...refs].map(c => [c.id, c])).values()];
    validarPapeis(papel, candidatas);
    selecao[papel] = papel === 'entrada' ? candidatas.map(camada => ({...camada, origemEntrada:'camadas'})) : candidatas;
    if (papel === 'entrada') { state.origemEntrada = 'camadas'; limparHierarquizacao(); }
    avisar(`${candidatas.length} referência(s) de ${papeis[papel].toLowerCase()} selecionada(s). A identificação das camadas e a validação ocorrem ao enviar para a prévia.`);
  });
}
async function carregarHierarquizacoes() {
  const lista = await window.HierApi.listar();
  const select = node('hierarquizacao'), anterior = select.value;
  select.replaceChildren(new Option('Selecione uma hierarquização', ''),
    ...lista.map(item => new Option(`${item.codigo} — ${item.nome}`, item.codigo)));
  select.value = anterior;
  avisar(`${lista.length} hierarquização(ões) disponível(is).`);
}
async function selecionarHierarquizacao(codigo) {
  if (!codigo) {
    if (state.origemEntrada === 'hierarquizacao') limparEntrada();
    render();
    return;
  }
  await ocupar('Carregando a hierarquização e suas geometrias.', async () => {
    try {
      if (state.origemEntrada === 'camadas') throw new Error('Limpe a seleção de entrada antes de selecionar uma hierarquização.');
      const dados = await window.HierApi.obter(codigo);
      const objetos = dados.dados_hierarquizacao?.objetos ?? dados.objetos;
      if (!objetos?.length) throw new Error('A hierarquização não contém demandas.');
      if (!['plano','programa','projeto'].includes(dados.tipo_demanda)) throw new Error('Tipo de demanda não reconhecido.');
      const camadas = [];
      for (const objeto of objetos) {
        const cab = objeto.cabecalho_objeto || objeto;
        if (!cab.codigo) throw new Error('Há demanda sem código; confira o cadastro da hierarquização.');
        node('status').textContent = `Recuperando geometria ${camadas.length + 1} de ${objetos.length}: ${cab.codigo}`;
        const resposta = await json(`/cadastro-geometrias/${dados.tipo_demanda}?codigo=${encodeURIComponent(cab.codigo)}`);
        const camada = resposta.itens.find(item => item.codigo === cab.codigo);
        if (!camada?.geojson?.features?.length || camada.geojson.features.some(f => !f.geometry)) {
          throw new Error(`A demanda ${cab.codigo} não possui geometria cadastrada. Nenhum ponto aproximado será criado; a prévia anterior foi mantida.`);
        }
        camadas.push({
          ...camada, nome:`${cab.codigo} — ${cab.nome || camada.nome}`, tipo:'vetor', origemEntrada:'hierarquizacao',
          status_validacao:'valida', representacao:'original', revisao:crypto.randomUUID(),
          geojson:{type:'FeatureCollection', features:camada.geojson.features.map(f => ({
            ...f, properties:{...f.properties, ...cab, hierarquizacao:codigo, objeto_hierarquizacao:objeto},
          }))},
          metadados_local:{crs:'EPSG:4326', feicoes:camada.geojson.features.length,
            tipos_geometria:[...new Set(camada.geojson.features.map(f => f.geometry.type))],
            limites_wgs84:camada.bounds, avisos:['Geometria atual do cadastro; informações da rodada preservadas nos atributos.']},
        });
      }
      validarPapeis('entrada', camadas);
      selecao.entrada = camadas;
      state.origemEntrada = 'hierarquizacao';
      hierarquizacao = dados;
      avisar(`${camadas.length} demanda(s) recuperada(s) com suas geometrias cadastradas. Envie a seleção para a prévia.`);
    } catch (erro) {
      node('hierarquizacao').value = hierarquizacao?.codigo || '';
      throw erro;
    }
  });
}
function atualizarBancada() {
  const atuais = mapa.camadas();
  if (!atuais) return;
  const ids = new Set(atuais.map(item => item.id));
  for (const papel of Object.keys(papeis)) enviados[papel] = enviados[papel].filter(item => ids.has(item.id));
  node('bancada-status').textContent = Object.entries(papeis).map(([papel, nome]) => `${nome}: ${enviados[papel].length}`).join(' · ');
  controles();
}
async function enviarPrevia(papel) {
  await ocupar('Enviando seleção para a prévia.', async () => {
    validarPapeis(papel, selecao[papel]);
    const camadas = papel === 'entrada' && state.origemEntrada === 'hierarquizacao'
      ? selecao[papel] : await preparar(selecao[papel]);
    validarPapeis(papel, camadas);
    previadas[papel] = papel === 'entrada'
      ? camadas.map(c => ({...c, origemEntrada:state.origemEntrada})) : [...camadas];
    avisar(`${papeis[papel]} atualizada na prévia. Confira e marque as camadas na seção 3; o envio à bancada fica no rodapé do painel de camadas.`);
  });
}
async function enviar() {
  await ocupar('Enviando camadas à bancada.', async () => {
    mapa.assertReady();
    const candidato = Object.fromEntries(Object.keys(papeis).map(papel => [papel, marcadas(papel)]));
    const camadas = Object.values(candidato).flat();
    if (!camadas.length) throw new Error('Marque pelo menos uma camada na prévia.');
    if (candidato.entrada.length && (new Set(candidato.entrada.map(c => c.origemEntrada)).size !== 1 ||
        candidato.entrada.some(c => !['camadas','hierarquizacao'].includes(c.origemEntrada)))) {
      throw new Error('A entrada deve vir somente das camadas selecionadas ou de uma hierarquização, nunca das duas origens.');
    }
    for (const papel of Object.keys(papeis)) validarPapeis(papel, candidato[papel]);
    const confirmado = await window.ProcessFeedback.confirmar({
      title:'Enviar prévia para a bancada',
      message:`Enviar ${camadas.length} camada(s): ${camadas.map(c => c.nome).join(', ')}?`,
      warning:'Este envio substitui o conjunto anteriormente enviado por esta página pelas camadas marcadas na prévia. Camadas desmarcadas deixam esse conjunto. Não calcula elegibilidade nem homologa os dados.',
      confirmLabel:'Enviar para a bancada',
    });
    if (!confirmado) { avisar('Envio cancelado. A bancada foi mantida.'); return; }
    const itens = grupos => Object.keys(papeis).flatMap(tipo => grupos[tipo].map(camada => ({
      ...camada, key:chave(tipo, camada), grupo:papeis[tipo],
      papelExtracao:tipo === 'entrada' ? 'entrada' : 'base', arquivoGrupo:camada.arquivo || camada.nome,
    })));
    mapa.sync(itens(candidato));
    try { mapa.assertReady(Object.values(candidato).flat().map(c => c.id)); }
    catch (erro) { mapa.sync(itens(enviados)); throw erro; }
    for (const papel of Object.keys(papeis)) enviados[papel] = [...candidato[papel]];
    atualizarBancada();
    avisar(`${camadas.length} camada(s) marcada(s) na prévia enviada(s) à bancada, com os papéis de entrada, restrição e risco preservados.`, 'success');
  });
}
async function salvarLista(papel) {
  await ocupar('Salvando lista no storage.', async () => {
    validarPapeis(papel, selecao[papel]);
    const nome = await window.ProcessFeedback.confirmar({
      title:`Salvar lista de ${papeis[papel].toLowerCase()}`,
      message:'A lista guarda referências às camadas, sem copiar as geometrias. Uma lista com o mesmo nome neste papel será substituída.',
      input:{label:'Nome da lista'}, confirmLabel:'Salvar lista',
    });
    if (!nome) { avisar('Salvamento cancelado.'); return; }
    if (!nome.trim()) throw new Error('Informe um nome para a lista.');
    const referencias = await identificarCamadas(selecao[papel], {
      aoIdentificar:ref => { node('status').textContent = `Identificando referências para salvar: ${ref.nome || ref.arquivo}…`; },
    });
    validarPapeis(papel, referencias);
    const resultado = await post('/extracao-atributos/configuracoes', {
      nome:nome.trim(), escopo:`elegibilidade-${papel}`,
      categorias:[{id:papel, camadas:referencias.map(c => c.id)}],
    });
    avisar(`Lista "${resultado.nome}" salva no storage com ${resultado.camadas} camada(s).`, 'success');
  });
}
async function carregarLista(papel) {
  await ocupar('Carregando lista do storage.', async () => {
    const escopo = `elegibilidade-${papel}`;
    const lista = await json(`/extracao-atributos/configuracoes?escopo=${escopo}`);
    const codigo = await escolherConfiguracao(lista.configuracoes, lista.pasta, 'bases');
    if (!codigo) { avisar('Carregamento cancelado. A prévia foi mantida.'); return; }
    const dados = await json(`/extracao-atributos/configuracoes/${encodeURIComponent(codigo)}?escopo=${escopo}&lista=true`);
    if (dados.escopo !== escopo || dados.categorias.some(c => c.id !== papel)) throw new Error('Esta lista pertence a outro papel.');
    const refs = dados.categorias.flatMap(c => c.camadas);
    if (!refs.length) throw new Error('A lista não contém camadas.');
    validarPapeis(papel, refs);
    selecao[papel] = refs;
    avisar(`Lista "${dados.nome}" carregada. Envie para a prévia para validar as camadas.`);
  });
}
for (const papel of Object.keys(papeis)) {
  node(`${papel}-browse`).onclick = () => explorar(papel);
  node(`${papel}-enviar`).onclick = () => enviarPrevia(papel);
  if (papel !== 'entrada') {
    node(`${papel}-salvar`).onclick = () => salvarLista(papel);
    node(`${papel}-carregar`).onclick = () => carregarLista(papel);
  }
}
node('entrada-limpar').onclick = () => { limparEntrada(); render(); };
node('hier-limpar').onclick = node('entrada-limpar').onclick;
node('hier-enviar').onclick = () => enviarPrevia('entrada');
$('#ea-staging-confirmar').onclick = enviar;
node('hierarquizacao').onchange = event => selecionarHierarquizacao(event.target.value);
window.SLTAdminAuth.requireAuth();
render();
await ocupar('Carregando hierarquizações.', async () => {
  await carregarHierarquizacoes();
});
const codigo = new URLSearchParams(location.search).get('codigo');
if (codigo && [...node('hierarquizacao').options].some(item => item.value === codigo)) {
  node('hierarquizacao').value = codigo;
  await selecionarHierarquizacao(codigo);
}
