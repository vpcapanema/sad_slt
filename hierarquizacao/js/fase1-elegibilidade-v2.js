import {$, el, feedback} from '../../geoespacial/extracao-atributos/ui.js';
import {json, post, esperar} from '../../geoespacial/extracao-atributos/api.js';
import {escolherArquivo, identificarCamadas} from '../../geoespacial/extracao-atributos/explorador.js?v=20261020-saidas';
import {validarCamada, descritorOriginal} from '../../geoespacial/extracao-atributos/camada-validada.js';
import {escolherConfiguracao} from '../../geoespacial/extracao-atributos/lista-camadas.js';
import {criarPrevia} from '../../geoespacial/extracao-atributos/previa.js?v=20261019-metadados';
import {criarMapa} from '../../geoespacial/extracao-atributos/mapa.js';
import {criarResultados} from './cinco-resultados_elegibilidade_v2.js?v=20261023-poligonos';

const papeis = {entrada:'Entrada', restricao:'Restrição', risco:'Risco'};
const selecao = {entrada:[], restricao:[], risco:[]};
const previadas = {entrada:[], restricao:[], risco:[]};
const enviados = {entrada:[], restricao:[], risco:[]};
const state = {busy:false, previaVisiveis:new Set(), origemEntrada:null};
const normalizadas = new Map();
let hierarquizacao = null;
const node = id => $(`#ev-${id}`);
const chave = (papel, camada) => `${papel}:${camada.id}`;
const identidade = camada => {
  if (camada.fonteElegibilidade) return identidade(camada.fonteElegibilidade);
  const arquivo = camada.id.startsWith('storage:') ? camada.id.slice(8) : camada.arquivo;
  if (!arquivo) return camada.id;
  return arquivo.includes('::') ? arquivo : `${arquivo}::${camada.camada || ''}`;
};
const conflita = (a, b) => a === b || (a.endsWith('::') && b.startsWith(a)) || (b.endsWith('::') && a.startsWith(b));
const mapa = criarMapa(atualizarBancada);
const observadorPainel = new MutationObserver(atualizarBancada);
let painelObservado = null;
const previa = criarPrevia(state, render, {obterCamadas:camadasPrevia, aoMudarVisibilidade:controles});
const resultados = criarResultados({avisar, aoOcupar:busy => { state.busy = busy; controles(); }});

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
  let processo, cancelado=false;
  const iniciar = (titulo, tarefas, mensagemCancelamento='Envio cancelado. A seleção e os conjuntos anteriores foram mantidos.') => {
    processo = window.ProcessFeedback.iniciarCadastro({
      title:titulo, tasks:tarefas,
      onCancel:async () => {
        cancelado=true;
        processo.detalhe('Cancelamento solicitado. Aguardando a operação atual terminar; nenhuma substituição será confirmada.');
      },
    });
    return {
      processo,
      conferir:() => {
        if (cancelado) throw new DOMException(mensagemCancelamento, 'AbortError');
      },
    };
  };
  try { await acao(iniciar); }
  catch (erro) {
    if (erro.name === 'AbortError') {
      processo?.confirmarCancelamento(erro.message);
      processo?.fechar();
      avisar(erro.message);
    } else {
      processo?.erro({title:'Envio não concluído', message:erro.message,
        detail:'A seleção e os conjuntos anteriores foram mantidos. Corrija o problema e tente novamente; arquivos derivados já gerados permanecem registrados.'});
      avisar(`${mensagem} ${erro.message}`, 'error');
    }
  }
  finally { state.busy = false; render(); }
}
function camadasPrevia() {
  return Object.keys(papeis).flatMap(papel => previadas[papel].map(camada => ({
    ...camada, chave:chave(papel, camada), grupo:papel === 'entrada' ? 'entrada' : 'base',
    categoriaId:papel, categoria:papeis[papel], arquivoOrigem:camada.arquivo || camada.nome,
    pendente:!enviados[papel].some(item => {
      const fontes=item.fontesElegibilidade || [item.fonteElegibilidade || item];
      return fontes.some(fonte => fonte.id === camada.id && fonte.revisao === camada.revisao);
    }),
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
  if (state.busy) for (const checkbox of document.querySelectorAll('#ea-input-preview .ea-preview-visibility')) checkbox.disabled=true;
  $('#elegibilidade-app').setAttribute('aria-busy',String(state.busy));
  conferirBancada();
  resultados.atualizar(state.busy);
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
      if ([...selecao[outro], ...previadas[outro], ...enviados[outro]]
        .some(item => [item, ...(item.fontesElegibilidade || [])].some(fonte => conflita(identidade(fonte), id)))) {
        throw new Error(`"${camada.nome}" já é ${papeis[outro].toLowerCase()}. Remova-a da seleção, atualize a prévia e retire-a da bancada desse papel antes de reutilizá-la.`);
      }
    }
  }
}
async function preparar(referencias, acompanhamento) {
  if (!referencias.length) return [];
  referencias = await identificarCamadas(referencias, {
    aoIdentificar:ref => {
      acompanhamento?.conferir();
      const detalhe=`Identificando camadas de ${ref.nome || ref.arquivo}…`;
      node('status').textContent=detalhe;acompanhamento?.processo.detalhe(detalhe);
    },
  });
  acompanhamento?.conferir();
  const camadas = [];
  for (const ref of referencias) {
    node('status').textContent = `Validando ${camadas.length + 1} de ${referencias.length}: ${ref.nome || ref.id}`;
    acompanhamento?.processo.detalhe(`${node('status').textContent}. Leitura integral da fonte, conferência de CRS e geometrias; o original não será alterado.`);
    const camada = await validarCamada(ref);
    acompanhamento?.conferir();
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
  node('status').textContent = `${lista.length} hierarquização(ões) disponível(is).`;
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
        const resposta = await json(`/cadastro-geometrias/${dados.tipo_demanda}?codigo=${encodeURIComponent(cab.codigo)}&metadados=true`);
        const camada = resposta.itens.find(item => item.codigo === cab.codigo);
        if (!camada?.geojson?.features?.length || camada.geojson.features.some(f => !f.geometry)) {
          throw new Error(`A demanda ${cab.codigo} não possui geometria cadastrada. Nenhum ponto aproximado será criado; a prévia anterior foi mantida.`);
        }
        camadas.push({
          ...camada, nome:`${cab.codigo} — ${cab.nome || camada.nome}`, tipo:'vetor', origemEntrada:'hierarquizacao',
          grupoHierarquizacao:{codigo, nome:dados.nome, demandas:objetos.map(item =>
            `cadastro:${dados.tipo_demanda}:${(item.cabecalho_objeto || item).codigo}`)},
          status_validacao:'valida', representacao:'original', revisao:crypto.randomUUID(),
          geojson:{type:'FeatureCollection', features:camada.geojson.features.map(f => ({
            ...f, properties:{...f.properties, ...cab, hierarquizacao:codigo, objeto_hierarquizacao:objeto},
          }))},
          metadados_local:{...camada.metadados_local, feicoes:camada.geojson.features.length,
            tipos_geometria:[...new Set(camada.geojson.features.map(f => f.geometry.type))],
            limites_wgs84:camada.bounds, avisos:[...(camada.metadados_local?.avisos||[]),'Geometria atual do cadastro; informações da rodada preservadas nos atributos.']},
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
function conferirBancada() {
  const atuais = mapa.camadas();
  const visiveis = new Map((atuais || []).filter(camada => camada.visivel).map(camada => [camada.id, camada]));
  node('calcular').disabled = state.busy || !enviados.entrada.some(c => visiveis.has(c.id))
    || ![...enviados.restricao, ...enviados.risco].some(c => visiveis.has(c.id));
  const conhecidos = new Set(Object.values(enviados).flat().map(camada => camada.id));
  const contagens = [];
  for (const [papel, nome] of Object.entries(papeis)) {
    const camadas = enviados[papel].filter(camada => visiveis.has(camada.id));
    contagens.push(`${nome}: ${camadas.length} marcada(s)`);
    const linhas = camadas.map(camada => {
      const fragmento = node('tpl-run-row').content.cloneNode(true);
      fragmento.querySelector('tr').dataset.id = camada.id;
      fragmento.querySelector('[data-name]').textContent = visiveis.get(camada.id).nome;
      fragmento.querySelector('[data-source]').textContent = camada.id.startsWith('storage:')
        ? camada.id.slice(8) : camada.arquivo || camada.id;
      return fragmento;
    });
    node(`run-${papel}`).replaceChildren(...(linhas.length ? linhas : [node('tpl-run-empty').content.cloneNode(true)]));
  }
  node('run-count').textContent = contagens.join(' · ');
  const adicionais = [...visiveis.keys()].filter(id => !conhecidos.has(id)).length;
  const avisos = [];
  if (!atuais) avisos.push('Aguarde o carregamento da bancada.');
  else if (!enviados.entrada.some(camada => visiveis.has(camada.id))) avisos.push('Nenhuma camada de entrada marcada na bancada.');
  if (adicionais) avisos.push(`${adicionais} camada(s) marcada(s) adicionada(s) diretamente na bancada não integra(m) esta composição. Envie as fontes pela prévia no papel correspondente.`);
  node('run-warning').textContent = avisos.join(' ');
}
async function calcularElegibilidade() {
  if (state.busy) return;
  state.busy = true;
  controles();
  let processo, job, resultado;
  const concluidas = [];
  let cancelado = false;
  const rota = '/extracao-atributos/elegibilidade/execucoes';
  try {
    const visiveis = new Set((mapa.camadas() || []).filter(c => c.visivel).map(c => c.id));
    const conjunto = Object.fromEntries(Object.keys(papeis).map(p => [p, enviados[p].filter(c => visiveis.has(c.id))]));
    mapa.assertReady(Object.values(conjunto).flat().map(c => c.id));
    if (!conjunto.entrada.length || !conjunto.restricao.length && !conjunto.risco.length)
      throw new Error('Marque uma entrada e ao menos uma base de restrição ou risco na bancada.');
    const confirmado = await window.ProcessFeedback.confirmar({
      title:'Executar elegibilidade territorial',
      message:`Processar ${conjunto.entrada.length} entrada(s), ${conjunto.restricao.length} base(s) de restrição e ${conjunto.risco.length} de risco?`,
      warning:'Cada base será intersectada separadamente com a entrada integral. As áreas serão somadas por feição, em m². Cada saída será gravada no storage e adicionada à bancada, sem alterar as fontes.',
      confirmLabel:'Executar elegibilidade',
    });
    if (!confirmado) return;
    resultados.iniciar();
    const lote = crypto.randomUUID();
    const referencia = c => ({id:c.id, nome:c.nome});
    for (const entrada of conjunto.entrada) {
      if (cancelado) break;
      resultado = null;
      job = null;
      mapa.assertReady(Object.values(conjunto).flat().map(c => c.id));
      processo = window.ProcessFeedback.iniciarCadastro({
        title:`Elegibilidade territorial — ${entrada.nome}`,
        tasks:['Preparar entrada integral','Intersectar bases e somar áreas','Gravar e conferir saída'],
        onCancel:async () => {
          if (job) await post(`${rota}/${job.id}/cancelar`, {});
          cancelado = true;
        },
      });
      job = await post(rota, {lote_id:lote, total_entradas:conjunto.entrada.length,
        ...(entrada.origemEntrada === 'hierarquizacao'
          ? {hierarquizacao:entrada.normalizacao_demanda.origem.hierarquizacao} : {}),
        entrada:{...referencia(entrada), revisao:entrada.revisao},
        restricao:conjunto.restricao.map(referencia), risco:conjunto.risco.map(referencia)});
      if (cancelado) await post(`${rota}/${job.id}/cancelar`, {});
      resultado = await esperar(job, id => `${rota}/${id}`);
      resultados.adicionar(job.id);
      const win = $('#ea-workbench-frame').contentWindow;
      win.gpArquivos.adicionar({...resultado, categoria:'Elegibilidade territorial'}, {estiloPreparado:true});
      mapa.assertReady([resultado.id]);
      concluidas.push(resultado.nome);
      await mapa.enquadrar([resultado.id], resultado.bounds);
      processo.sucesso({title:'Camada de saída produzida',
        message:`${resultado.nome} gravada no storage e adicionada à bancada.`,
        detail:resultado.arquivo + (resultado.elegibilidade?.hierarquizacao
          ? ` · Saída registrada na hierarquização ${resultado.elegibilidade.hierarquizacao}. O PDF será associado após confirmar os nomes.` : '')});
    }
    avisar(`${concluidas.length} camada(s) de saída produzida(s) e adicionada(s) à bancada: ${concluidas.join(', ')}.`, 'success');
  } catch (erro) {
    const persistida = resultado?.arquivo ? ` A saída já está gravada em ${resultado.arquivo}; abra esse arquivo na bancada, sem repetir o cálculo.` : '';
    const anteriores = concluidas.length ? ` Saídas anteriores mantidas: ${concluidas.join(', ')}.` : '';
    if (erro.name === 'AbortError') {
      processo?.confirmarCancelamento(erro.message);
      avisar(erro.message + anteriores);
    } else {
      const mensagem = erro.message + persistida + anteriores + (job && !resultado ? ` Execução: ${job.id}.` : '');
      processo?.erro({title:'Elegibilidade não concluída', message:mensagem});
      avisar(mensagem, 'error');
    }
  } finally {
    await resultados.finalizar();
    state.busy = false;
    controles();
  }
}
function atualizarBancada() {
  const atuais = mapa.camadas();
  if (!atuais) return;
  const painel = $('#ea-workbench-frame').contentDocument.querySelector('#gp-layer-list');
  if (painel && painel !== painelObservado) {
    observadorPainel.disconnect();
    observadorPainel.observe(painel, {childList:true});
    painelObservado = painel;
  }
  const ids = new Set(atuais.map(item => item.id));
  for (const papel of Object.keys(papeis)) enviados[papel] = enviados[papel].filter(item => ids.has(item.id));
  node('bancada-status').textContent = Object.entries(papeis).map(([papel, nome]) => `${nome}: ${enviados[papel].length}`).join(' · ');
  controles();
}
async function enviarPrevia(papel) {
  await ocupar('Enviando seleção para a prévia.', async iniciar => {
    const tarefas=['Conferir seleção','Identificar e validar camadas','Atualizar prévia'];
    const acompanhamento=iniciar(`Enviar ${papeis[papel].toLowerCase()} para a prévia`,tarefas), {processo, conferir}=acompanhamento;
    processo.tarefaAtual(tarefas[0],`${selecao[papel].length} referência(s). A bancada não será alterada.`);
    validarPapeis(papel, selecao[papel]);
    processo.concluirTarefa(tarefas[0]);
    processo.tarefaAtual(tarefas[1],'Identificação dos componentes e validação das fontes completas.');
    const camadas = papel === 'entrada' && state.origemEntrada === 'hierarquizacao'
      ? selecao[papel] : await preparar(selecao[papel],acompanhamento);
    conferir();
    validarPapeis(papel, camadas);
    processo.concluirTarefa(tarefas[1],`${camadas.length} camada(s) disponível(is).`);
    processo.tarefaAtual(tarefas[2],'Substituir somente este grupo na prévia, preservando a bancada.');
    const anteriores=previadas[papel];
    previadas[papel] = papel === 'entrada'
      ? camadas.map(c => ({...c, origemEntrada:state.origemEntrada})) : [...camadas];
    try { previa.render(); }
    catch (erro) { previadas[papel]=anteriores;throw erro; }
    processo.concluirTarefa(tarefas[2]);
    processo.sucesso({title:'Prévia atualizada',message:`${camadas.length} camada(s) de ${papeis[papel].toLowerCase()} na prévia. A bancada foi mantida. Confira as geometrias originais e marque as camadas antes de enviar à bancada.`});
    avisar(`${papeis[papel]} atualizada na prévia. Confira e marque as camadas na seção 3; o envio à bancada fica no rodapé do painel de camadas.`);
  });
}
async function enviar() {
  await ocupar('Enviando camadas à bancada.', async iniciar => {
    mapa.assertReady();
    const candidato = Object.fromEntries(Object.keys(papeis).map(papel => [papel, marcadas(papel)]));
    const camadas = Object.values(candidato).flat();
    if (!camadas.length) throw new Error('Marque pelo menos uma camada na prévia.');
    if (candidato.entrada.length && (new Set(candidato.entrada.map(c => c.origemEntrada)).size !== 1 ||
        candidato.entrada.some(c => !['camadas','hierarquizacao'].includes(c.origemEntrada)))) {
      throw new Error('A entrada deve vir somente das camadas selecionadas ou de uma hierarquização, nunca das duas origens.');
    }
    const daHierarquizacao = candidato.entrada[0]?.origemEntrada === 'hierarquizacao';
    const codigoHierarquizacao = daHierarquizacao ? candidato.entrada[0].geojson.features[0].properties.hierarquizacao : null;
    const grupoHierarquizacao = daHierarquizacao ? candidato.entrada[0].grupoHierarquizacao : null;
    if (daHierarquizacao) {
      if (grupoHierarquizacao?.codigo !== codigoHierarquizacao || candidato.entrada.length !== grupoHierarquizacao?.demandas.length ||
          candidato.entrada.some(c => !grupoHierarquizacao.demandas.includes(c.id) ||
            c.geojson.features[0].properties.hierarquizacao !== codigoHierarquizacao)) {
        throw new Error('Envie todas as demandas da hierarquização para a prévia e mantenha todas marcadas para gerar uma única camada do grupo.');
      }
    }
    for (const papel of Object.keys(papeis)) validarPapeis(papel, candidato[papel]);
    const parametros=candidato.entrada.length ? await json('/extracao-atributos/elegibilidade/parametros') : null;
    const confirmado = await window.ProcessFeedback.confirmar({
      title:'Enviar prévia para a bancada',
      message:`Enviar ${camadas.length} camada(s): ${camadas.map(c => c.nome).join(', ')}?`,
      warning:`Este envio substitui o conjunto anteriormente enviado por esta página pelas camadas marcadas na prévia. Camadas desmarcadas deixam esse conjunto. ${daHierarquizacao ? `As ${candidato.entrada.length} demandas da hierarquização ${codigoHierarquizacao} serão reunidas em um único GeoPackage, na camada demandas, preservando os registros e atributos individuais, sem dissolver demandas diferentes. ` : ''}${parametros ? `Demandas: pontos/multipontos recebem raio de ${parametros.buffer_ponto_m} m; linhas/multilinhas, ${parametros.buffer_linha_m} m de cada lado, em ${parametros.crs_metrico}, com ${parametros.segmentos_quadrante} segmentos por quadrante. Polígonos não recebem buffer. Saída: Polygon/MultiPolygon em ${parametros.crs_saida}, com reparo MakeValid e consolidação por feição. Os arquivos derivados integrais serão usados nos cálculos; as fontes e as bases de risco/restrição não serão alteradas.` : ''} Não calcula elegibilidade nem homologa os dados.`,
      confirmLabel:'Enviar para a bancada',
    });
    if (!confirmado) { avisar('Envio cancelado. A bancada foi mantida.'); return; }
    const tarefas=['Conferir camadas marcadas','Normalizar demandas e gravar arquivos','Sincronizar bancada','Conferir envio'];
    const {processo,conferir}=iniciar('Enviar prévia para a bancada',tarefas,
      'Envio cancelado. Os conjuntos anteriores foram mantidos. Arquivos derivados já gerados permanecem registrados no storage.');
    processo.tarefaAtual(tarefas[0],`${camadas.length} camada(s) marcada(s); ${candidato.entrada.length} entrada(s).`);
    mapa.assertReady();
    conferir();
    processo.concluirTarefa(tarefas[0]);
    processo.tarefaAtual(tarefas[1],parametros ? `Pontos: ${parametros.buffer_ponto_m} m; linhas: ${parametros.buffer_linha_m} m por lado; ${parametros.crs_metrico} → ${parametros.crs_saida}. Bases sem conversão.` : 'Não há demandas de entrada marcadas; as bases mantêm suas geometrias originais.');
    const entradas=[];
    const fontesEntrada=daHierarquizacao ? [{
      id:`hierarquizacao:${codigoHierarquizacao}`, nome:`${codigoHierarquizacao} — ${grupoHierarquizacao.nome}`,
      fontesElegibilidade:candidato.entrada,
      revisao:JSON.stringify(candidato.entrada.map(c => [c.id,c.revisao]).sort()),
      origemEntrada:'hierarquizacao',
    }] : candidato.entrada;
    for (const fonte of fontesEntrada) {
      conferir();
      processo.detalhe(`Entrada ${entradas.length+1} de ${fontesEntrada.length}: ${fonte.nome}. ${daHierarquizacao ? `Reunindo ${candidato.entrada.length} demandas em uma única camada de GeoPackage. ` : ''}Normalizando todas as feições e verificando o arquivo derivado integral no storage.`);
      const chaveCache=JSON.stringify([fonte.id,fonte.revisao]);
      let derivada=normalizadas.get(chaveCache);
      if (!derivada) {
        const resposta=descritorOriginal(await post(`/extracao-atributos/elegibilidade/${daHierarquizacao ? 'preparar-hierarquizacao' : 'preparar-demanda'}`,
          daHierarquizacao ? {codigo:codigoHierarquizacao,demandas:candidato.entrada.map(c => c.id)} : {id:fonte.id}));
        if (resposta.status_validacao!=='valida' || !resposta.arquivo || !resposta.revisao || !resposta.id?.startsWith('storage:') ||
            !resposta.tiles_url || !resposta.feicoes || resposta.normalizacao_demanda?.feicoes!==resposta.feicoes ||
            !resposta.metadados_local?.tipos_geometria?.length ||
            resposta.metadados_local.tipos_geometria.some(tipo=>!['Polygon','MultiPolygon'].includes(tipo))) {
          throw new Error(`"${fonte.nome}": o servidor não confirmou o arquivo integral com todas as demandas poligonais.`);
        }
        if (daHierarquizacao) {
          const auditoria=resposta.normalizacao_demanda;
          const origens=auditoria.origem?.camadas?.map(c => c.id) || [];
          if (resposta.camada!=='demandas' || !resposta.arquivo.endsWith('.gpkg') ||
              auditoria.origem?.hierarquizacao!==codigoHierarquizacao ||
              auditoria.total_demandas!==candidato.entrada.length ||
              origens.length!==candidato.entrada.length || new Set(origens).size!==origens.length ||
              candidato.entrada.some(c => !origens.includes(c.id))) {
            throw new Error('O servidor não confirmou todas as demandas da hierarquização na camada única do GeoPackage.');
          }
        }
        derivada={...resposta, nome:fonte.nome, origemEntrada:fonte.origemEntrada,
          ...(daHierarquizacao ? {fontesElegibilidade:fonte.fontesElegibilidade} : {fonteElegibilidade:fonte})};
        normalizadas.set(chaveCache,derivada);
      }
      entradas.push(derivada);
      processo.log(`${fonte.nome}: ${derivada.normalizacao_demanda.feicoes} feição(ões); ${derivada.normalizacao_demanda.pontos_convertidos} ponto(s), ${derivada.normalizacao_demanda.linhas_convertidas} linha(s), ${derivada.normalizacao_demanda.poligonos_sem_buffer} polígono(s) sem buffer. Arquivo: ${derivada.arquivo}.`,'info');
      if (derivada.normalizacao_demanda.colecoes_convertidas) {
        const auditoria=derivada.normalizacao_demanda;
        processo.log(`${fonte.nome}: ${auditoria.colecoes_convertidas} coleção(ões) normalizada(s) por componente (${Object.entries(auditoria.componentes_colecoes).map(([tipo,total])=>`${tipo}: ${total}`).join('; ')}), reunindo os resultados na mesma demanda e preservando seus atributos e identificadores.`,'info');
      }
      conferir();
    }
    candidato.entrada=entradas;
    processo.concluirTarefa(tarefas[1],`${entradas.length} arquivo(s) de demandas poligonais validado(s).`);
    processo.tarefaAtual(tarefas[2],'Adicionar as camadas e substituir apenas o conjunto confirmado por esta página.');
    conferir();
    mapa.assertReady();
    const itens = grupos => Object.keys(papeis).flatMap(tipo => grupos[tipo].map(camada => ({
      ...camada, key:chave(tipo, camada), grupo:papeis[tipo],
      papelExtracao:tipo === 'entrada' ? 'entrada' : 'base', arquivoGrupo:camada.arquivo || camada.nome,
    })));
    mapa.sync(itens(candidato));
    try { mapa.assertReady(Object.values(candidato).flat().map(c => c.id)); }
    catch (erro) { mapa.sync(itens(enviados)); throw erro; }
    processo.concluirTarefa(tarefas[2]);
    processo.tarefaAtual(tarefas[3],'Conferir presença e referências dos arquivos na bancada.');
    for (const papel of Object.keys(papeis)) enviados[papel] = [...candidato[papel]];
    atualizarBancada();
    processo.concluirTarefa(tarefas[3]);
    const totalEnviado=Object.values(candidato).flat().length;
    processo.sucesso({title:'Camadas enviadas à bancada',message:`${totalEnviado} camada(s) enviada(s), incluindo ${entradas.length} arquivo(s) integral(is) de demandas poligonais. ${daHierarquizacao ? `${fontesEntrada[0].fontesElegibilidade.length} demandas reunidas em um único GeoPackage e uma única camada demandas. ` : ''}Bases de risco e restrição preservadas. A prévia continua mostrando as fontes originais. Nenhum cálculo ou homologação foi executado.`});
    avisar(`${totalEnviado} camada(s) enviada(s) à bancada, com os papéis de entrada, restrição e risco preservados.${daHierarquizacao ? ' Demandas da hierarquização reunidas em uma única camada de GeoPackage.' : ''}`, 'success');
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
node('calcular').onclick = calcularElegibilidade;
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
