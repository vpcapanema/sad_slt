import {post, base} from '../../geoespacial/extracao-atributos/api.js';
import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {conclusaoSobreposicao} from './elegibilidade-conclusao.js?v=1';
import {escolherArquivo} from '../../geoespacial/extracao-atributos/explorador.js?v=20261020-saidas';
import {
  CATEGORIAS, ROTULOS, FILTROS, ORDENS, SELECAO_VAZIA, caracterizarDemandas, demandasVisiveis, descreverSituacao,
  registrosDetalhados, registrosVisiveis, alternarSelecao, formatarHa, formatarPercentual,
} from './cinco-resultados_elegibilidade_v2-dados.js?v=hectares-camadas';
import {criarGrafico} from './cinco-resultados_elegibilidade_v2-grafico.js?v=hectares-camadas';
import {criarRosca} from './cinco-resultados_elegibilidade_v2-rosca.js?v=hectares-camadas';
import {criarMapa} from './cinco-resultados_elegibilidade_v2-mapa.js?v=hectares-camadas';
import {criarTabela} from './cinco-resultados_elegibilidade_v2-tabela.js?v=hectares-camadas';

const ROTA = '/extracao-atributos/elegibilidade/resultados';
const PAPEIS = {entrada: 'Entrada', restricao: 'Restrição', risco: 'Risco'};

/**
 * Seção 5: para cada demanda, informa se há restrição, risco ou se está livre de restrições e riscos.
 * Gráfico, mapa e tabela compartilham uma única seleção (uma demanda ou um item encontrado nela).
 */
export function criarResultados({avisar, aoOcupar}) {
  const raiz = document.getElementById('cinco-resultados_elegibilidade_v2');
  const node = id => raiz.querySelector(`#ev2-${id}`);
  const formulario = node('aliases'), campos = new Map();
  let execucoes = [], pendentes = [], modelo = null, indice = 0;
  let ocupado = false, externo = false, gerandoPacote = false;
  let fichas = [], registros = [], selecao = SELECAO_VAZIA;

  const informar = mensagem => { node('status').textContent = mensagem; };
  const entrada = () => modelo.entradas[indice];
  const ficha = chave => fichas.find(f => f.chave === chave);
  const payload = () => ({execucoes, nomes: Object.fromEntries([...campos].map(([id, campo]) => [id, campo.value])),
    revisados: node('revisados').checked});
  const categoriasAtivas = () => new Set(CATEGORIAS.filter(c => node(`cat-${c}`).checked));
  const filtros = () => ({texto: node('busca').value, situacao: node('situacao').value});

  const grafico = criarGrafico({
    cards: node('cards'), lista: node('grafico'), aoSelecionar: escolher, aoFiltrar: filtrarSituacao,
  });
  const rosca = criarRosca({container: node('rosca'), aoSelecionar: escolher});
  const mapa = criarMapa({container: node('mapa'), nota: node('nota-mapa'), aoSelecionar: escolher});
  const tabela = criarTabela({
    tabela: node('tabela'), anterior: node('anterior'), proxima: node('proxima'), rotulo: node('pagina'),
    contagem: node('contagem'), aoSelecionar: escolher,
  });

  node('situacao').replaceChildren(...Object.entries(FILTROS).map(([valor, texto]) => new Option(texto, valor)));
  node('ordem').replaceChildren(...Object.entries(ORDENS).map(([valor, texto]) => new Option(texto, valor)));

  function escolher(nova) {
    if (ocupado || externo || !modelo) return;
    selecao = alternarSelecao(selecao, nova);
    desenhar({zoom: true, rolar: true});
  }

  function filtrarSituacao(situacao) {
    if (ocupado || externo || !modelo) return;
    node('situacao').value = situacao === 'todas' || node('situacao').value === situacao ? 'todas' : situacao;
    desenhar({zoom: true});
  }

  function resumirSelecao(visiveis) {
    const alvo = node('selecao-texto');
    node('filtro-status').textContent = visiveis.size === fichas.length
      ? '' : `Filtro ativo: ${visiveis.size} de ${fichas.length} demandas exibidas.`;
    if (!selecao.chave) {
      alvo.replaceChildren(el('span', 'Nenhuma demanda selecionada. Clique em uma demanda no gráfico, no mapa ou na tabela para ver o que foi encontrado nela; os três painéis mostram o mesmo recorte.'));
      return;
    }
    const d = ficha(selecao.chave);
    const partes = [el('strong', d.nome),
      ...descreverSituacao(d, 6).map(f => el('span', f.texto, `ev2-sel-${f.categoria}`)),
      el('span', `Área da demanda: ${formatarHa(d.total)} ha`, 'ev2-secundario')];
    if (selecao.feicao) {
      const item = d.linha.sobreposicoes.find(s => s.id === selecao.feicao);
      const camada = entrada().campos.find(c => c.id === item.base_id);
      const dados = atributosEmCache.get(`${entrada().id}|${item.base_id}|${item.identificador - 1}`);
      partes.push(conclusaoSobreposicao(d, item, camada, dados));
    }
    alvo.replaceChildren(...partes);
  }

  // Detalhe da feição no mapa: atributos da camada consultada, com nomes amigáveis.
  const atributosEmCache = new Map();
  let popupAtual = '', sequenciaPopup = 0;
  function montarPopup(d, item, camada, estado) {
    const caixa = el('div', undefined, 'ev2-popup-conteudo');
    if (item.numero_poligono) caixa.append(el('strong', `${item.area_m2 > 0 ? 'Polígono' : 'Contato'} ${item.numero_poligono}`));
    caixa.append(conclusaoSobreposicao(d, item, camada, estado.dados));
    if (!estado.dados) {
      caixa.append(el('span', estado.erro || 'Carregando atributos…', estado.erro ? 'ev2-popup-erro' : 'ev2-secundario'));
      return caixa;
    }
    const tabelaAtributos = el('table', undefined, 'ev2-popup-tabela'), corpo = el('tbody');
    for (const campo of estado.dados.campos) {
      const linha = el('tr'), titulo = el('th', campo.alias);
      titulo.scope = 'row';
      linha.append(titulo, el('td', campo.valor === '' ? '—' : campo.valor)); corpo.append(linha);
    }
    tabelaAtributos.append(corpo);
    const rolagem = el('div', undefined, 'ev2-popup-rolagem');
    rolagem.append(tabelaAtributos);
    caixa.append(rolagem, el('span', estado.dados.origem, 'ev2-secundario'));
    return caixa;
  }

  async function atualizarPopup() {
    const chaveFeicao = selecao.feicao ? `${entrada().id}|${selecao.chave}|${selecao.feicao}` : '';
    if (chaveFeicao === popupAtual) return;
    popupAtual = chaveFeicao;
    const geracao = ++sequenciaPopup;
    if (!chaveFeicao) { mapa.fecharPopup(); return; }
    const d = ficha(selecao.chave), item = d.linha.sobreposicoes.find(s => s.id === selecao.feicao);
    const camada = entrada().campos.find(c => c.id === item.base_id), posicao = item.identificador - 1;
    const abrir = estado => { if (geracao === sequenciaPopup) mapa.abrirPopup(selecao.chave, item.id, montarPopup(d, item, camada, estado)); };
    const chaveCache = `${entrada().id}|${item.base_id}|${posicao}`;
    if (atributosEmCache.has(chaveCache)) { abrir({dados: atributosEmCache.get(chaveCache)}); return; }
    abrir({});
    const fichasDaConsulta = fichas;
    try {
      const dados = await post(`${ROTA}/feicao/atributos`, {execucao: entrada().id, base_id: item.base_id, posicao});
      atributosEmCache.set(chaveCache, dados);
      abrir({dados});
      for (const ficha of fichasDaConsulta) for (const cat of Object.values(ficha.cats)) {
        for (const feicao of cat.feicoes) if (feicao.id === item.id) feicao.atributosConsultados = dados;
      }
      if (geracao === sequenciaPopup) desenhar();
    } catch (erro) {
      abrir({erro: `Não foi possível carregar os atributos desta camada: ${erro.message}`});
    }
  }

  function desenhar({zoom = false, rolar = false} = {}) {
    if (!modelo) return;
    for (const d of fichas) for (const cat of Object.values(d.cats)) for (const item of cat.feicoes) {
      item.atributosConsultados = atributosEmCache.get(`${entrada().id}|${item.base_id}|${item.identificador - 1}`);
    }
    const visiveis = demandasVisiveis(fichas, filtros()), categorias = categoriasAtivas();
    if (selecao.chave && !visiveis.has(selecao.chave)) selecao = SELECAO_VAZIA;
    grafico.renderizar({fichas, entrada: entrada(), demandas: fichas, visiveis, categorias, selecao,
      ordem: node('ordem').value, situacao: node('situacao').value, rolar});
    rosca.renderizar({ficha: selecao.chave ? ficha(selecao.chave) : null, selecao, categorias});
    mapa.aplicar({selecao, visiveis, categorias}, {zoom});
    atualizarPopup();
    tabela.renderizar({registros: registrosVisiveis(registros, {visiveis, categorias, selecao}), selecao, total: registros.length},
      {reiniciar: true});
    resumirSelecao(visiveis); controles();
  }

  function controles() {
    const bloqueado = ocupado || externo;
    node('vazio').hidden = Boolean(modelo);
    node('abrir').setAttribute('aria-disabled', String(bloqueado));
    raiz.querySelectorAll('input,button,select').forEach(c => { c.disabled = bloqueado; });
    if (bloqueado) return;
    node('download').disabled = !modelo || gerandoPacote;
    node('limpar').disabled = !selecao.chave; node('enquadrar').disabled = !selecao.chave;
    const limites = tabela.limites();
    node('anterior').disabled = limites.anterior; node('proxima').disabled = limites.proxima;
  }

  function invalidar() {
    modelo = null; selecao = SELECAO_VAZIA; popupAtual = '';
    mapa.fecharPopup();
    node('revisados').checked = false; node('conteudo').hidden = true; node('download').disabled = true;
    informar('Confirme os nomes revisados para atualizar a apresentação e o relatório.');
  }

  async function operar(acao) {
    if (ocupado || externo) return;
    ocupado = true; aoOcupar(true); controles();
    try { await acao(); }
    catch (erro) { informar(erro.message); avisar(erro.message, 'error'); }
    finally { ocupado = false; aoOcupar(false); controles(); }
  }

  function entradaAtual() {
    const e = entrada();
    fichas = caracterizarDemandas(e); registros = registrosDetalhados(fichas, e); selecao = SELECAO_VAZIA;
    node('busca').value = ''; node('situacao').value = 'todas';
    for (const c of CATEGORIAS) node(`cat-${c}`).checked = true;
    node('resumo').textContent = `${e.nome} · ${e.feicoes} demandas analisadas · ${e.campos.length} camadas de restrição e de risco consultadas.`;
    mapa.carregar(e, fichas);
    popupAtual = ''; sequenciaPopup++;
    desenhar();
  }

  async function apresentar() {
    informar('Conferindo o resultado gravado e os nomes de apresentação…');
    modelo = await post(`${ROTA}/visualizar`, payload());
    for (const fonte of modelo.fontes) campos.get(fonte.id).value = fonte.nome;
    node('entrada').replaceChildren(...modelo.entradas.map((e, i) => new Option(e.nome, String(i))));
    indice = 0;
    node('metodologia').textContent = modelo.metodologia;
    node('conteudo').hidden = false; formulario.hidden = true;
    entradaAtual();
    const mensagem = modelo.concluidas === modelo.previstas
      ? 'Resultados conferidos. Os nomes foram salvos; o pacote inclui todas as demandas, independentemente da seleção em tela.'
      : `Resultados parciais: ${modelo.concluidas} de ${modelo.previstas} conjuntos de demandas. O relatório identificará essa condição.`;
    informar(modelo.relatorios_hierarquizacao?.length
      ? `${mensagem} PDF gravado no Storage e associado ao Relatório da Fase 1 em Gestão das hierarquizações.` : mensagem);
  }

  async function carregar(dados) {
    if (!dados) dados = await post(`${ROTA}/preparar`, {execucoes});
    campos.clear(); node('nomes').replaceChildren();
    for (const [i, fonte] of dados.fontes.entries()) {
      const origem = dados.fontes.find(f => f.id === fonte.base_id);
      const grupo = el('div', undefined, 'ea-field');
      const rotulo = el('label', fonte.tipo === 'feicao'
        ? `${PAPEIS[fonte.papel]} · Item da camada “${origem?.nome || fonte.nome}”`
        : fonte.papel === 'entrada' ? 'Conjunto de demandas' : `${PAPEIS[fonte.papel]} · Camada consultada`);
      const campo = el('input');
      campo.id = `ev2-alias-${i}`; campo.name = `alias-${i}`; campo.value = fonte.nome;
      campo.required = true; campo.maxLength = 160; rotulo.htmlFor = campo.id; campo.oninput = invalidar;
      campos.set(fonte.id, campo); grupo.append(rotulo, campo); node('nomes').append(grupo);
    }
    node('tentar').hidden = true;
    node('revisados').checked = Boolean(dados.revisados);
    if (dados.revisados) await apresentar();
    else {
      informar(`${dados.concluidas} de ${dados.previstas} conjuntos de demandas concluídos. Confira os nomes das camadas e dos itens encontrados.`);
      formulario.hidden = false;
    }
  }

  async function selecionarExecucoes(identificadores, dados) {
    execucoes = [...identificadores]; invalidar(); formulario.hidden = true;
    try { await carregar(dados); }
    catch (erro) { node('tentar').hidden = false; throw erro; }
  }

  const exportarPacote = async () => {
    informar('Gerando o relatório, as tabelas e o pacote com todas as demandas no storage…');
    const resposta = await fetch(`${base}${ROTA}/pacote`, {method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload())});
    if (!resposta.ok) {
      const texto = await resposta.text();
      let erro;
      try { erro = JSON.parse(texto).detail; }
      catch { throw new Error(`Não foi possível gerar o pacote (HTTP ${resposta.status}). As camadas foram mantidas.`); }
      throw new Error(typeof erro === 'string' ? erro : 'O servidor recusou os dados do relatório.');
    }
    if (!resposta.headers.get('content-type')?.includes('application/zip')) throw new Error('O servidor não retornou um pacote ZIP.');
    const url = URL.createObjectURL(await resposta.blob()), link = el('a');
    link.href = url; link.download = 'Relatório e Camadas.zip'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    informar('Pacote gravado no storage. Download do relatório, das tabelas e das camadas iniciado.');
    avisar('Relatório completo, tabelas e camadas disponíveis no pacote.', 'success');
  };

  formulario.onsubmit = event => { event.preventDefault(); if (formulario.reportValidity()) operar(apresentar); };
  node('editar').onclick = () => { formulario.hidden = false; formulario.scrollIntoView({block: 'nearest'}); };
  node('revisados').onchange = () => { if (!node('revisados').checked) invalidar(); };
  node('entrada').onchange = event => { indice = Number(event.target.value); entradaAtual(); };
  node('busca').oninput = () => desenhar({zoom: true});
  node('situacao').onchange = () => desenhar({zoom: true});
  node('ordem').onchange = () => desenhar();
  for (const c of CATEGORIAS) {
    node(`cat-${c}`).onchange = () => {
      // Ao menos uma categoria permanece exibida para que o resultado não fique vazio.
      if (!categoriasAtivas().size) node(`cat-${c}`).checked = true;
      desenhar();
    };
  }
  node('limpar').onclick = () => { if (ocupado || externo) return; selecao = SELECAO_VAZIA; desenhar({zoom: true}); };
  node('enquadrar').onclick = () => { if (!ocupado && !externo) desenhar({zoom: true}); };
  node('todas').onclick = () => mapa.enquadrarTodas();
  raiz.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !selecao.chave || ocupado || externo || event.target.matches('input,select')) return;
    selecao = SELECAO_VAZIA; desenhar({zoom: true});
  });
  node('tentar').onclick = () => operar(carregar);
  node('abrir').onclick = event => {
    event.preventDefault();
    operar(async () => {
      const arquivo = await escolherArquivo({
        title: 'Selecionar análise de elegibilidade já realizada',
        raiz: 'saidas-geoespaciais', extensoes: ['gpkg'], validar: false, somenteReferencias: true,
      });
      if (!arquivo) return;
      informar('Lendo e conferindo o resultado da análise selecionada no storage…');
      const dados = await post(`${ROTA}/abrir`, {arquivo: arquivo.arquivo});
      await selecionarExecucoes(dados.execucoes, dados);
    });
  };
  node('download').onclick = async () => {
    if (gerandoPacote || ocupado || externo || !modelo) return;
    gerandoPacote = true; controles();
    try { await exportarPacote(); }
    catch (erro) { informar(erro.message); avisar(erro.message, 'error'); }
    finally { gerandoPacote = false; controles(); }
  };

  return {
    atualizar(busy) { externo = busy; controles(); },
    iniciar() { pendentes = []; },
    adicionar(ident) { pendentes.push(ident); },
    async finalizar() {
      if (!pendentes.length) return;
      const identificadores = [...pendentes]; pendentes = [];
      try { await selecionarExecucoes(identificadores); }
      catch (erro) {
        const mensagem = `As camadas foram produzidas, mas os resultados não puderam ser preparados: ${erro.message}`;
        informar(mensagem); node('tentar').hidden = false; avisar(mensagem, 'error');
      }
    },
  };
}
