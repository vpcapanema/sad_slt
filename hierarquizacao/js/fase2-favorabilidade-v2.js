import {$, el, feedback} from '../../geoespacial/extracao-atributos/ui.js';
import {json, post, esperar} from '../../geoespacial/extracao-atributos/api.js';
import {escolherArquivo, identificarCamadas} from '../../geoespacial/extracao-atributos/explorador.js?v=20261020-favorabilidade';
import {validarCamada} from '../../geoespacial/extracao-atributos/camada-validada.js';
import {escolherConfiguracao} from '../../geoespacial/extracao-atributos/lista-camadas.js';
import {criarPrevia} from '../../geoespacial/extracao-atributos/previa.js?v=20261020-favorabilidade';
import {criarMapa} from '../../geoespacial/extracao-atributos/mapa.js?v=20261020-favorabilidade';
import {criarResultados} from './elegibilidade-resultados.js?v=20261023-classes-ordem';
import {criarConferencia} from './favorabilidade-conferencia.js?v=20261022-tabelas';
import {tituloDemanda} from './nome-demanda.js?v=20261025-title-case';

const PASTA_SUPERFICIES = 'superficies-indices/hierarquizacao/favorabilidade';
const papeis = {entrada:'Entrada', grade:'Favorabilidade territorial de grade', rede:'Favorabilidade territorial de rede'};
const selecao = {entrada:[], grade:[], rede:[]};
const previadas = {entrada:[], grade:[], rede:[]};
const enviados = {entrada:[], grade:[], rede:[]};
const state = {busy:false, previaVisiveis:new Set(), origemEntrada:null};
const node = id => $(`#fv-${id}`);
const chave = (papel, camada) => `${papel}:${camada.id}`;
let hierarquizacao = null;
let painelObservado = null;
const conferencias = Object.fromEntries(Object.keys(papeis).map(papel => [papel, criarConferencia(papel)]));
const resultados = criarResultados({analise:'favorabilidade', avisar:feedback,
  aoOcupar:busy => { state.busy = busy; controles(); }});
const mapa = criarMapa(atualizarBancada);
const observadorPainel = new MutationObserver(atualizarBancada);
const previa = criarPrevia(state, render, {
  obterCamadas:() => Object.keys(papeis).flatMap(papel => previadas[papel].map(camada => ({
    ...camada, chave:chave(papel, camada), grupo:papel === 'entrada' ? 'entrada' : 'base',
    categoriaId:papel, categoria:papeis[papel], arquivoOrigem:camada.arquivo || camada.nome,
    pendente:!enviados[papel].some(item => item.id === camada.id && item.revisao === camada.revisao),
  }))),
  aoMudarVisibilidade:controles,
  descreverProcessamento:camada => camada.tipo === 'raster'
    ? 'Referência ao raster original; a imagem reduzida serve somente para visualização, não para extrair índices'
    : 'Geometria e atributos originais preservados, sem buffers nem conversão geométrica',
});

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
  let processo, cancelado = false;
  const iniciar = (titulo, tarefas) => {
    processo = window.ProcessFeedback.iniciarCadastro({
      title:titulo, tasks:tarefas,
      onCancel:async () => {
        cancelado = true;
        processo.detalhe('Cancelamento solicitado. Aguardando a leitura atual; os conjuntos anteriores serão mantidos.');
      },
    });
    return {processo, conferir:() => {
      if (cancelado) throw new DOMException('Operação cancelada. A prévia e a bancada anteriores foram mantidas.', 'AbortError');
    }};
  };
  try { await acao(iniciar); }
  catch (erro) {
    if (erro.name === 'AbortError') {
      processo?.confirmarCancelamento(erro.message);
      processo?.fechar();
      avisar(erro.message);
    } else {
      processo?.erro({title:'Preparação não concluída', message:erro.message,
        detail:'Nenhum índice foi calculado. Confira a seleção e tente novamente.'});
      avisar(erro.message, 'error');
    }
  } finally { state.busy = false; render(); }
}
function marcadas(papel) {
  return previadas[papel].filter(camada => state.previaVisiveis.has(chave(papel, camada)));
}
function controles() {
  for (const botao of document.querySelectorAll('#favorabilidade-app button')) botao.disabled = state.busy;
  node('entrada-browse').disabled = state.busy || state.origemEntrada === 'hierarquizacao';
  node('entrada-camadas').disabled = node('entrada-browse').disabled;
  node('hierarquizacao').disabled = state.busy || state.origemEntrada === 'camadas';
  node('entrada-enviar').disabled = state.busy || state.origemEntrada !== 'camadas' || !selecao.entrada.length && !previadas.entrada.length;
  node('hier-enviar').disabled = state.busy || state.origemEntrada !== 'hierarquizacao' || !selecao.entrada.length;
  node('entrada-limpar').disabled = state.busy || state.origemEntrada !== 'camadas';
  node('hier-limpar').disabled = state.busy || state.origemEntrada !== 'hierarquizacao';
  for (const papel of ['grade','rede']) {
    node(`${papel}-salvar`).disabled = state.busy || !selecao[papel].length;
    node(`${papel}-enviar`).disabled = state.busy || !selecao[papel].length && !previadas[papel].length;
  }
  node('superficies-enviar').disabled = state.busy || !['grade','rede'].some(papel => selecao[papel].length || previadas[papel].length);
  $('#ea-staging-confirmar').disabled = state.busy || !Object.keys(papeis).some(papel => marcadas(papel).length);
  for (const checkbox of document.querySelectorAll('#ea-input-preview .ea-preview-visibility')) {
    if (state.busy) checkbox.disabled = true;
  }
  $('#favorabilidade-app').setAttribute('aria-busy', String(state.busy));
  conferirExecucao();
  resultados.atualizar(state.busy);
  Object.values(conferencias).forEach(t => t.controles(state.busy));
}
function conjuntoExecucao() {
  const visiveis = new Set((mapa.camadas() || []).filter(c => c.visivel).map(c => c.id));
  return Object.fromEntries(Object.keys(papeis).map(p => [p, enviados[p].filter(c => visiveis.has(c.id))]));
}
function conferirExecucao() {
  const conjunto = conjuntoExecucao();
  node('calcular').disabled = state.busy || !conjunto.entrada.length || !conjunto.grade.length && !conjunto.rede.length;
  node('run-count').textContent = `${conjunto.entrada.length} entrada(s), ${conjunto.grade.length} superfície(s) de grade e ${conjunto.rede.length} de rede marcadas para a execução.`;
}
function render() {
  node('entrada-lista').replaceChildren();
  node('hier-lista').replaceChildren();
  for (const papel of Object.keys(papeis)) {
    const lista = node(papel === 'entrada' && state.origemEntrada === 'hierarquizacao' ? 'hier-lista' : `${papel}-lista`);
    lista.replaceChildren();
    if (!selecao[papel].length && papel !== 'entrada') lista.append(el('li', 'Nenhuma superfície selecionada.'));
    for (const camada of selecao[papel]) {
      const nome = papel === 'entrada' && state.origemEntrada === 'hierarquizacao' ? camada.nomeDemanda : camada.nome;
      const linha = el('li'), remover = el('button', undefined, 'ea-btn ea-icon-button ev-remove-layer');
      const icone = el('i', undefined, 'fas fa-trash-can');
      icone.setAttribute('aria-hidden', 'true');
      remover.type = 'button';
      remover.append(icone);
      remover.title = `Remover ${nome} da seleção`;
      remover.setAttribute('aria-label', remover.title);
      remover.onclick = () => {
        if (state.busy) return;
        selecao[papel] = selecao[papel].filter(item => item.id !== camada.id);
        if (papel === 'entrada' && !selecao.entrada.length) limparEntrada();
        render();
      };
      if (papel === 'entrada' && state.origemEntrada === 'hierarquizacao') {
        const abrir = el('button', nome, 'fv-demanda-link');
        abrir.type = 'button';
        abrir.setAttribute('aria-label', `Visualizar demanda: ${nome}`);
        abrir.onclick = () => abrirDemanda(camada);
        linha.append(abrir, remover);
      } else {
        linha.append(el('span', nome), remover);
      }
      lista.append(linha);
    }
  }
  node('entrada-camadas').value = state.origemEntrada === 'camadas' ? selecao.entrada.map(c => c.nome).join('; ') : '';
  for (const papel of ['grade','rede']) node(`${papel}-camadas`).value = selecao[papel].map(c => c.nome).join('; ');
  previa.render();
  controles();
}
function limparEntrada() {
  selecao.entrada = [];
  state.origemEntrada = null;
  hierarquizacao = null;
  node('hierarquizacao').value = '';
}
function identidade(camada) {
  const arquivo = camada.id.startsWith('storage:') ? camada.id.slice(8) : camada.arquivo;
  return arquivo ? arquivo.includes('::') ? arquivo : `${arquivo}::${camada.camada || ''}` : camada.id;
}
function validarPapeis(papel, camadas) {
  const conflita = (a, b) => a === b || a.endsWith('::') && b.startsWith(a) || b.endsWith('::') && a.startsWith(b);
  const vistos = [];
  for (const camada of camadas) {
    const id = identidade(camada);
    if (vistos.some(outro => conflita(id, outro))) throw new Error(`"${camada.nome}" está repetida na seleção.`);
    vistos.push(id);
    for (const outro of Object.keys(papeis).filter(item => item !== papel)) {
      if ([...selecao[outro], ...previadas[outro], ...enviados[outro]].some(item => conflita(identidade(item), id))) {
        throw new Error(`"${camada.nome}" já está em ${papeis[outro].toLowerCase()}. Retire-a desse papel na seleção, na prévia e na bancada antes de reutilizá-la.`);
      }
    }
  }
}
async function explorar(papel) {
  await ocupar('Selecionando camadas.', async () => {
    const refs = await escolherArquivo({
      title:`Adicionar camadas: ${papeis[papel]}`, multiple:true, validar:false, somenteReferencias:true,
      ...(papel !== 'entrada' ? {pastaInicial:PASTA_SUPERFICIES, incluirRasters:true} : {}),
      excluded:Object.keys(papeis).filter(item => item !== papel)
        .flatMap(item => [...selecao[item], ...previadas[item], ...enviados[item]].map(c => c.id)),
    });
    if (!refs) { avisar('Seleção cancelada. A prévia e a bancada foram mantidas.'); return; }
    const candidatas = papel === 'entrada' ? refs : [...new Map([...selecao[papel], ...refs].map(c => [c.id,c])).values()];
    validarPapeis(papel, candidatas);
    selecao[papel] = candidatas;
    if (papel === 'entrada') state.origemEntrada = 'camadas';
    avisar(`${candidatas.length} referência(s) selecionada(s). Envie para a prévia para identificar e validar as camadas.`);
  });
}
async function prepararRaster(ref) {
  if (!ref.id.startsWith('storage:') || !ref.arquivo) throw new Error('Selecione uma superfície raster do Storage.');
  const preview = await json(`/storage/camada/raster-preview?caminho=${encodeURIComponent(ref.arquivo)}`);
  if (!preview.image || !Array.isArray(preview.bounds) || preview.bounds.length !== 4 ||
      !preview.bounds.every(Number.isFinite) || !Array.isArray(preview.coordinates) || preview.coordinates.length !== 4) {
    throw new Error(`"${ref.nome}": a prévia do raster não possui imagem e limites válidos.`);
  }
  const [oeste, sul, leste, norte] = preview.bounds;
  return {...ref, tipo:'raster', preview, bounds:preview.bounds, imagem:preview.image,
    revisao:crypto.randomUUID(), status_validacao:'valida', representacao:'imagem',
    geojson:{type:'FeatureCollection', features:[{type:'Feature', properties:{},
      geometry:{type:'Polygon', coordinates:[[[oeste,sul],[leste,sul],[leste,norte],[oeste,norte],[oeste,sul]]]}}]},
    metadados_local:{limites_wgs84:preview.bounds, avisos:[
      'Imagem reduzida somente para visualização. O arquivo original é preservado; esta prévia não comprova normalização 0–1 nem homologação.',
    ]}};
}
async function enviarPrevia(papel) {
  const grupos = Array.isArray(papel) ? papel : [papel];
  await ocupar('Preparando a prévia.', async iniciar => {
    const tarefas = ['Identificar camadas','Preparar visualização','Atualizar prévia'];
    const {processo, conferir} = iniciar(`Preparar ${grupos.map(p => papeis[p].toLowerCase()).join(' e ')}`, tarefas);
    const candidatos = {};
    for (const papel of grupos) {
      processo.tarefaAtual(tarefas[0], papeis[papel]);
      const refs = papel === 'entrada' && state.origemEntrada === 'hierarquizacao'
        ? selecao.entrada : await identificarCamadas(selecao[papel], {aoIdentificar:conferir, incluirRasters:papel !== 'entrada'});
      conferir();
      validarPapeis(papel, refs);
      processo.concluirTarefa(tarefas[0]);
      processo.tarefaAtual(tarefas[1], 'As fontes, geometrias e atributos não serão alterados.');
      const camadas = [];
      for (const ref of refs) {
        processo.detalhe(`Preparando ${camadas.length + 1} de ${refs.length}: ${ref.nome}`);
        if (papel === 'entrada' && ref.tipo === 'raster') throw new Error('A entrada de demandas deve ser vetorial. Use os campos de grade e rede para as superfícies raster.');
        const camada = papel === 'entrada' && state.origemEntrada === 'hierarquizacao'
          ? ref : ref.tipo === 'raster' ? await prepararRaster(ref) : {...ref, ...await validarCamada(ref)};
        conferir();
        camadas.push(papel === 'entrada' ? {...camada, origemEntrada:state.origemEntrada} : camada);
      }
      validarPapeis(papel, camadas);
      candidatos[papel] = camadas;
    }
    processo.concluirTarefa(tarefas[1]);
    processo.tarefaAtual(tarefas[2]);
    const anteriores = Object.fromEntries(grupos.map(p => [p, previadas[p]]));
    Object.assign(previadas, candidatos);
    try { previa.render(); }
    catch (erro) { Object.assign(previadas, anteriores); throw erro; }
    processo.concluirTarefa(tarefas[2]);
    processo.sucesso({title:'Prévia atualizada', message:`${Object.values(candidatos).flat().length} camada(s) disponível(is). Confira e marque as desejadas antes de enviar à bancada.`});
    avisar('Prévia atualizada. A bancada e os resultados registrados foram mantidos.');
  });
}
async function selecionarHierarquizacao(codigo) {
  if (!codigo) { limparEntrada(); render(); return; }
  await ocupar('Carregando geometrias da hierarquização.', async iniciar => {
    const tarefas = ['Consultar rodada','Recuperar geometrias cadastradas'];
    const {processo, conferir} = iniciar('Preparar entrada da hierarquização', tarefas);
    try {
      if (state.origemEntrada === 'camadas') throw new Error('Limpe a seleção de entrada antes de selecionar uma hierarquização.');
      processo.tarefaAtual(tarefas[0]);
      const dados = await window.HierApi.obter(codigo);
      const fases = dados.dados_hierarquizacao?.cabecalho_grupo?.fases_a_executar ?? [1,2,3];
      if (!fases.includes(2)) throw new Error('A Fase 2 não faz parte desta hierarquização.');
      const objetos = dados.dados_hierarquizacao?.objetos ?? dados.objetos;
      if (!objetos?.length) throw new Error('A hierarquização não contém demandas.');
      if (!['plano','programa','projeto'].includes(dados.tipo_demanda)) throw new Error('Tipo de demanda não reconhecido.');
      conferir();
      processo.concluirTarefa(tarefas[0]);
      processo.tarefaAtual(tarefas[1]);
      const camadas = [];
      for (const objeto of objetos) {
        const cab = objeto.cabecalho_objeto || objeto;
        if (!cab.codigo) throw new Error('Há demanda sem código na hierarquização.');
        processo.detalhe(`Recuperando ${camadas.length + 1} de ${objetos.length}: ${cab.codigo}`);
        const resposta = await json(`/cadastro-geometrias/${dados.tipo_demanda}?codigo=${encodeURIComponent(cab.codigo)}&metadados=true`);
        const camada = resposta.itens.find(item => item.codigo === cab.codigo);
        if (!camada?.geojson?.features?.length || camada.geojson.features.some(f => !f.geometry)) {
          throw new Error(`A demanda ${cab.codigo} não possui geometria cadastrada. Nenhum ponto aproximado será criado.`);
        }
        conferir();
        const nome = tituloDemanda(cab.nome || camada.nome);
        camadas.push({...camada, nome:`${cab.codigo} — ${nome}`, nomeDemanda:nome, tipo:'vetor',
          origemEntrada:'hierarquizacao', grupoHierarquizacao:{codigo, demandas:objetos.length},
          revisao:crypto.randomUUID(), representacao:'original', status_validacao:'valida',
          geojson:{type:'FeatureCollection', features:camada.geojson.features.map(f => ({
            ...f, properties:{...f.properties, ...cab, hierarquizacao:codigo, objeto_hierarquizacao:objeto},
          }))},
          metadados_local:{...camada.metadados_local, feicoes:camada.geojson.features.length,
            tipos_geometria:[...new Set(camada.geojson.features.map(f => f.geometry.type))],
            avisos:[...(camada.metadados_local?.avisos || []), 'Geometria atual do cadastro; atributos da rodada preservados. Nenhum buffer aplicado.']},
        });
      }
      validarPapeis('entrada', camadas);
      selecao.entrada = camadas;
      state.origemEntrada = 'hierarquizacao';
      hierarquizacao = dados;
      processo.concluirTarefa(tarefas[1]);
      processo.sucesso({title:'Entrada selecionada', message:`${camadas.length} demanda(s) com geometrias cadastradas. Envie para a prévia.`});
      avisar('Hierarquização selecionada. A prévia e a bancada ainda não foram alteradas.');
    } catch (erro) { node('hierarquizacao').value = hierarquizacao?.codigo || ''; throw erro; }
  });
}
function atualizarBancada() {
  const atuais = mapa.camadas();
  if (!atuais) { conferirExecucao(); return; }
  const painel = $('#ea-workbench-frame').contentDocument.querySelector('#gp-layer-list');
  if (painel && painel !== painelObservado) {
    observadorPainel.disconnect();
    observadorPainel.observe(painel, {childList:true});
    painelObservado = painel;
  }
  const presentes = new Map(atuais.map(c => [c.id,c]));
  for (const papel of Object.keys(papeis)) {
    enviados[papel] = enviados[papel].filter(c => presentes.has(c.id));
    conferencias[papel].atualizar(enviados[papel].filter(c => presentes.get(c.id).visivel)
      .map(camada => ({...camada, nome:presentes.get(camada.id).nome})));
  }
  const conhecidos = new Set(Object.values(enviados).flat().map(c => c.id));
  const adicionais = atuais.filter(c => c.visivel && !conhecidos.has(c.id)).length;
  node('run-warning').textContent = adicionais ? `${adicionais} camada(s) adicionada(s) diretamente na bancada não integra(m) os papéis confirmados por esta página.` : '';
  node('bancada-status').textContent = Object.entries(papeis).map(([papel,nome]) => `${nome}: ${enviados[papel].length}`).join(' · ');
  conferirExecucao();
  previa.render();
}
async function calcularFavorabilidade() {
  if (state.busy) return;
  state.busy = true;
  controles();
  let processo, job, resultado, cancelado = false;
  const concluidas = [];
  const rota = '/extracao-atributos/favorabilidade/execucoes';
  try {
    const conjunto = conjuntoExecucao();
    const ids = Object.values(conjunto).flat().map(c => c.id);
    mapa.assertReady(ids);
    if (!conjunto.entrada.length || !conjunto.grade.length && !conjunto.rede.length)
      throw new Error('Marque uma entrada e ao menos uma superfície poligonal de grade ou rede na bancada.');
    for (const camada of [...conjunto.grade, ...conjunto.rede]) {
      const tipos = camada.metadados_local?.tipos_geometria || camada.geojson?.features?.map(f => f.geometry?.type) || [];
      if (camada.tipo === 'raster' || tipos.some(tipo => !['Polygon','MultiPolygon'].includes(tipo)))
        throw new Error(`${camada.nome}: esta etapa aceita somente superfícies poligonais. Linhas e rasters podem ser visualizados, mas não participam do cálculo de áreas.`);
    }
    const grupo = conjunto.entrada[0]?.grupoHierarquizacao;
    if (grupo && (conjunto.entrada.length !== grupo.demandas ||
        conjunto.entrada.some(c => c.grupoHierarquizacao?.codigo !== grupo.codigo)))
      throw new Error('Mantenha todas as demandas da hierarquização visíveis na bancada para processar o grupo completo.');
    if (!await window.ProcessFeedback.confirmar({
      title:'Executar favorabilidade territorial',
      message:`Processar ${conjunto.entrada.length} demanda(s), ${conjunto.grade.length} superfície(s) de grade e ${conjunto.rede.length} de rede?`,
      warning:'A entrada será preparada segundo as regras poligonais cadastrais da Elegibilidade, sem alterar as fontes. Cada superfície será intersectada separadamente com a entrada integral e suas áreas somadas em m². Os fragmentos preservarão todos os atributos das superfícies, sem agregar classes ou índices. Cada saída será gravada no Storage e adicionada à bancada. Os índices registrados não serão alterados.',
      confirmLabel:'Calcular Favorabilidade Territorial',
    })) return;
    resultados.iniciar();
    const lote = crypto.randomUUID();
    const referencia = c => ({id:c.id, nome:c.nome, revisao:c.revisao_fonte ?? c.revisao});
    const entradas = grupo ? [conjunto.entrada[0]] : conjunto.entrada;
    for (const original of entradas) {
      if (cancelado) throw new DOMException('Execução cancelada.', 'AbortError');
      resultado = null;
      job = null;
      mapa.assertReady(ids);
      processo = window.ProcessFeedback.iniciarCadastro({
        title:`Favorabilidade territorial — ${grupo?.codigo || original.nome}`,
        tasks:['Preparar entrada integral','Intersectar bases e somar áreas','Gravar e conferir saída'],
        onCancel:async () => {
          if (job) await post(`${rota}/${job.id}/cancelar`, {});
          cancelado = true;
        },
      });
      processo.tarefaAtual('Preparar entrada integral');
      const entrada = grupo
        ? await post('/extracao-atributos/favorabilidade/preparar-hierarquizacao', {
          codigo:grupo.codigo, demandas:conjunto.entrada.map(c => c.id),
        })
        : await post('/extracao-atributos/favorabilidade/preparar-demanda', {id:original.id, revisao:referencia(original).revisao});
      if (cancelado) throw new DOMException('Execução cancelada após preparar a entrada; nenhuma interseção foi iniciada.', 'AbortError');
      mapa.assertReady(ids);
      job = await post(rota, {lote_id:lote, total_entradas:entradas.length,
        ...(grupo ? {hierarquizacao:grupo.codigo} : {}),
        entrada:referencia(entrada), grade:conjunto.grade.map(referencia), rede:conjunto.rede.map(referencia)});
      if (cancelado) await post(`${rota}/${job.id}/cancelar`, {});
      resultado = await esperar(job, id => `${rota}/${id}`);
      resultados.adicionar(job.id);
      const win = $('#ea-workbench-frame').contentWindow;
      win.gpArquivos.adicionar({...resultado, categoria:'Favorabilidade territorial'}, {estiloPreparado:true});
      mapa.assertReady([resultado.id]);
      concluidas.push(resultado.nome);
      await mapa.enquadrar([resultado.id], resultado.bounds);
      processo.sucesso({title:'Camada de saída produzida',
        message:`${resultado.nome} gravada no Storage e adicionada à bancada.`,
        detail:resultado.arquivo});
      if (cancelado) throw new DOMException('Execução cancelada. A saída já concluída foi mantida.', 'AbortError');
    }
    avisar(`${concluidas.length} camada(s) de saída produzida(s) e adicionada(s) à bancada: ${concluidas.join(', ')}. Nenhum índice ou classe foi agregado.`, 'success');
  } catch (erro) {
    const persistida = resultado?.arquivo ? ` A saída já está gravada em ${resultado.arquivo}; abra esse arquivo na bancada, sem repetir o cálculo.` : '';
    const anteriores = concluidas.length ? ` Saídas anteriores mantidas: ${concluidas.join(', ')}.` : '';
    if (erro.name === 'AbortError') {
      processo?.confirmarCancelamento(erro.message);
      avisar(erro.message + anteriores);
    } else {
      const mensagem = erro.message + persistida + anteriores + (job && !resultado ? ` Execução: ${job.id}.` : '');
      processo?.erro({title:'Favorabilidade não concluída', message:mensagem});
      avisar(mensagem, 'error');
    }
  } finally {
    await resultados.finalizar();
    state.busy = false;
    controles();
  }
}
async function enviarBancada() {
  await ocupar('Enviando camadas à bancada.', async iniciar => {
    mapa.assertReady();
    const candidato = Object.fromEntries(Object.keys(papeis).map(papel => [papel,marcadas(papel)]));
    const camadas = Object.values(candidato).flat();
    if (!camadas.length) throw new Error('Marque pelo menos uma camada na prévia.');
    const grupo = candidato.entrada[0]?.grupoHierarquizacao;
    if (grupo && (candidato.entrada.length !== grupo.demandas ||
        candidato.entrada.some(c => c.grupoHierarquizacao?.codigo !== grupo.codigo))) {
      throw new Error('Mantenha todas as demandas da hierarquização marcadas para enviar o grupo completo à bancada.');
    }
    for (const papel of Object.keys(papeis)) validarPapeis(papel, candidato[papel]);
    if (!await window.ProcessFeedback.confirmar({
      title:'Enviar prévia de favorabilidade para a bancada',
      message:`Enviar ${camadas.length} camada(s): ${camadas.map(c => c.nome).join(', ')}?`,
      warning:'Substitui somente o conjunto anteriormente enviado por esta página pelas camadas marcadas. Preserva geometrias, atributos, rasters e fontes originais, sem buffers. Não calcula favorabilidade, não homologa superfícies e não altera os resultados registrados.',
      confirmLabel:'Enviar para a bancada',
    })) { avisar('Envio cancelado. A bancada foi mantida.'); return; }
    const tarefas = ['Conferir referências','Sincronizar bancada'];
    const {processo, conferir} = iniciar('Enviar camadas de favorabilidade', tarefas);
    processo.tarefaAtual(tarefas[0]);
    mapa.assertReady();
    conferir();
    processo.concluirTarefa(tarefas[0]);
    processo.tarefaAtual(tarefas[1]);
    const itens = grupos => Object.keys(papeis).flatMap(papel => grupos[papel].map(c => ({
      ...c, key:chave(papel,c), grupo:papeis[papel],
      papelExtracao:papel === 'entrada' ? 'entrada' : 'base', arquivoGrupo:c.arquivo || c.nome,
    })));
    mapa.sync(itens(candidato));
    try { mapa.assertReady(camadas.map(c => c.id)); }
    catch (erro) { mapa.sync(itens(enviados)); throw erro; }
    for (const papel of Object.keys(papeis)) enviados[papel] = [...candidato[papel]];
    atualizarBancada();
    processo.concluirTarefa(tarefas[1]);
    processo.sucesso({title:'Camadas enviadas à bancada', message:`${camadas.length} camada(s) confirmada(s), com os papéis de entrada, grade e rede preservados. Nenhum cálculo foi executado.`});
    avisar('Bancada atualizada com as camadas marcadas na prévia.', 'success');
  });
}
async function salvarLista(papel) {
  await ocupar('Salvando lista de superfícies.', async () => {
    validarPapeis(papel, selecao[papel]);
    const nome = await window.ProcessFeedback.confirmar({
      title:`Salvar lista de ${papel}`, message:'Guarda referências, sem copiar dados. Uma lista de mesmo nome neste papel será substituída.',
      input:{label:'Nome da lista'}, confirmLabel:'Salvar lista',
    });
    if (!nome) { avisar('Salvamento cancelado.'); return; }
    if (!nome.trim()) throw new Error('Informe o nome da lista.');
    const referencias = await identificarCamadas(selecao[papel], {incluirRasters:true});
    validarPapeis(papel, referencias);
    const resultado = await post('/extracao-atributos/configuracoes', {
      nome:nome.trim(), escopo:`favorabilidade-${papel}`, categorias:[{id:papel,camadas:referencias.map(c => c.id)}],
    });
    avisar(`Lista "${resultado.nome}" salva com ${resultado.camadas} referência(s).`, 'success');
  });
}
async function carregarLista(papel) {
  await ocupar('Carregando lista de superfícies.', async () => {
    const escopo = `favorabilidade-${papel}`;
    const lista = await json(`/extracao-atributos/configuracoes?escopo=${escopo}`);
    const codigo = await escolherConfiguracao(lista.configuracoes, lista.pasta, 'bases');
    if (!codigo) { avisar('Carregamento cancelado.'); return; }
    const dados = await json(`/extracao-atributos/configuracoes/${encodeURIComponent(codigo)}?escopo=${escopo}&lista=true`);
    if (dados.escopo !== escopo || dados.categorias.some(c => c.id !== papel)) throw new Error('A lista pertence a outro papel.');
    const refs = dados.categorias.flatMap(c => c.camadas);
    if (!refs.length) throw new Error('A lista não contém camadas.');
    validarPapeis(papel, refs);
    selecao[papel] = refs;
    avisar(`Lista "${dados.nome}" carregada. Envie para a prévia para validar as fontes.`);
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
function abrirDemanda(camada) {
  return ocupar('Carregando dados da demanda.', async () => {
  if (!hierarquizacao) return;
  const tipo = hierarquizacao.tipo_demanda;
  const demanda = await (tipo === 'plano' ? window.SLTAdminApi.getPlano(camada.codigo)
    : tipo === 'programa' ? window.SLTAdminApi.getPrograma(camada.codigo)
      : window.SLTAdminApi.getDemanda(camada.codigo));
  const nome = tituloDemanda(demanda.nome || camada.nomeDemanda);
  const conteudo = window.SLTDemandasGrupo.render([{...demanda, nome}]);
  window.SLTDemandasGrupo.bindModalClosures();
  window.SLTDemandasGrupo.showModal('modal-objetos', nome, conteudo);
  conteudo.querySelector('details').open = true;
  });
}
node('superficies-enviar').onclick = () => enviarPrevia(['grade','rede']);
node('hierarquizacao').onchange = event => selecionarHierarquizacao(event.target.value);
$('#ea-staging-confirmar').onclick = enviarBancada;
node('calcular').onclick = calcularFavorabilidade;
window.SLTAdminAuth.requireAuth();
render();
await ocupar('Carregando hierarquizações.', async () => {
  const lista = (await window.HierApi.listar()).filter(item =>
    (item.dados_hierarquizacao?.cabecalho_grupo?.fases_a_executar ?? [1,2,3]).includes(2));
  node('hierarquizacao').replaceChildren(new Option('Selecione uma hierarquização',''),
    ...lista.map(item => new Option(`${item.codigo} — ${item.nome}`,item.codigo)));
  node('status').textContent = `${lista.length} hierarquização(ões) com Fase 2 disponível(is).`;
});
const codigo = new URLSearchParams(location.search).get('codigo');
if (codigo && [...node('hierarquizacao').options].some(item => item.value === codigo)) {
  node('hierarquizacao').value = codigo;
  await selecionarHierarquizacao(codigo);
}
