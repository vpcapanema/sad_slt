/* Lista de montagem da subseção 1.1: o usuário escolhe uma categoria, marca suas
   camadas, troca de categoria e repete. Nada vai para a bancada antes de confirmar. */
import { $, el, feedback } from './ui.js';
import { json, post } from './api.js';

const ROTULO = {
  confirmar: 'Confirmar e enviar à bancada',
  salvar: 'Salvar esta lista como configuração',
  editar: 'Editar a lista: adicionar ou remover camadas',
  carregar: 'Carregar arquivo de configuração',
  limpar: 'Limpar tudo',
  cancelar: 'Cancelar as mudanças desta lista',
};

export function criarListaCamadas(state, changed) {
  let editando = false;
  const secao = $('#ea-staging');
  const box = $('#ea-staging-list');
  const bar = $('#ea-staging-actions');
  const botoes = Object.fromEntries(
    Object.keys(ROTULO).map(chave => [chave, $(`#ea-staging-${chave}`)]));
  let ancora = [];   // Cópia da lista no último confirmar, carregar ou limpar.

  const caminhoDe = item => item.arquivo || state.catalog.find(l => l.id === item.id)?.arquivo || '';
  const nomeArquivo = item => caminhoDe(item).split('/').pop()
    || state.catalog.find(l => l.id === item.id)?.nome || item.id;
  const agrupar = () => state.categories
    .map(category => ({ category, itens: state.staging.filter(item => item.category === category.id) }))
    .filter(grupo => grupo.itens.length);
  const categoriaAtiva = () => $('#ea-category-select').value || '';

  function marcar() {
    const total = state.staging.length;
    botoes.confirmar.disabled = state.busy || !total;
    botoes.salvar.disabled = state.busy || !total;
    botoes.limpar.disabled = state.busy || !total;
    botoes.cancelar.disabled = state.busy || JSON.stringify(state.staging) === JSON.stringify(ancora);
    botoes.editar.disabled = state.busy || !state.staging.length;
    botoes.editar.setAttribute('aria-pressed', String(editando));
    botoes.editar.classList.toggle('is-active', editando);
    botoes.carregar.disabled = state.busy;
  }

  function render() {
    const ativa = categoriaAtiva();
    // A lista só existe depois que uma categoria é escolhida, ou enquanto houver itens.
    secao.hidden = !ativa && !state.staging.length;
    const grupos = agrupar();
    const atual = state.categories.find(item => item.id === ativa);
    // A categoria recém-escolhida já aparece, vazia, esperando as camadas.
    if (atual && !grupos.some(grupo => grupo.category.id === ativa)) grupos.unshift({ category: atual, itens: [] });
    box.replaceChildren();
    if (!grupos.length) {
      box.append(el('p', 'Escolha uma categoria e selecione suas camadas. Repita para cada categoria; nada vai para a bancada antes de confirmar.', 'ea-staging-empty'));
      marcar();
      return;
    }
    for (const { category, itens } of grupos) {
      const grupo = el('div', undefined, 'ea-staging-group');
      const head = el('div', undefined, 'ea-staging-group-head');
      head.append(el('strong', category.nome), el('span', String(itens.length), 'ea-badge'));
      grupo.append(head);
      for (const item of itens) {
        const rotulo = nomeArquivo(item);
        const caminho = caminhoDe(item);
        if (!editando) {
          const linha = el('div', undefined, 'ea-staging-item');
          const nome = el('span', rotulo);
          nome.title = caminho || rotulo;   // O caminho fica no título, fora do rótulo.
          linha.append(nome);
          grupo.append(linha);
          continue;
        }
        // Em edição a linha inteira é um botão: clicar remove a camada da lista.
        const linha = el('button', undefined, 'ea-btn ea-staging-item ea-staging-item-edit');
        linha.type = 'button';
        linha.title = `Remover ${rotulo}${caminho ? ` (${caminho})` : ''}`;
        linha.setAttribute('aria-label', linha.title);
        linha.disabled = state.busy;
        linha.addEventListener('click', () => {
          state.staging = state.staging.filter(other => other.id !== item.id);
          render();
        });
        linha.append(el('span', rotulo), el('span', '×', 'ea-staging-remove-mark'));
        grupo.append(linha);
      }
      if (!itens.length) grupo.append(el('p', 'Aguardando as camadas desta categoria.', 'ea-staging-vazio'));
      box.append(grupo);
    }
    marcar();
  }

  function adicionar(ids, category) {
    let novos = 0;
    for (const id of ids) {
      if (state.staging.some(item => item.id === id)) continue;
      if (state.bases.some(base => base.id === id)) continue;
      state.staging.push({ id, category, arquivo: state.catalog.find(l => l.id === id)?.arquivo || '' });
      novos++;
    }
    render();
    return novos;
  }

  botoes.confirmar.addEventListener('click', () => {
    if (state.busy || !state.staging.length) return;
    const total = state.staging.length;
    const semCaminho = state.staging.filter(item => !caminhoDe(item)).map(item => nomeArquivo(item));
    for (const item of state.staging) {
      if (!state.bases.some(base => base.id === item.id)) state.bases.push({ ...item });
    }
    state.staging = [];
    ancora = [];
    editando = false;
    render();
    feedback(`${total} camada(s) enviada(s) à bancada, agrupadas por categoria.`
      + (semCaminho.length ? ` ${semCaminho.length} sem caminho de arquivo registrado: ${semCaminho.join(', ')}.` : ''));
    changed();
  });

  botoes.limpar.addEventListener('click', () => {
    if (state.busy || !state.staging.length) return;
    state.staging = [];
    ancora = [];
    editando = false;
    render();
    feedback('Lista esvaziada. Nenhuma camada foi removida da bancada.');
  });

  botoes.cancelar.addEventListener('click', () => {
    if (state.busy) return;
    state.staging = ancora.map(item => ({ ...item }));
    render();
    feedback('Lista restaurada ao último estado confirmado ou carregado.');
  });

  botoes.salvar.addEventListener('click', async () => {
    if (state.busy || !state.staging.length) return;
    const nome = prompt('Nome da configuração:', '');
    if (nome === null) return;
    if (!nome.trim()) { feedback('Informe um nome para a configuração.'); return; }
    botoes.salvar.disabled = true;
    try {
      const grupos = agrupar().map(({ category, itens }) => ({ id: category.id, camadas: itens.map(item => item.id) }));
      const resultado = await post('/extracao-atributos/configuracoes', { nome: nome.trim(), categorias: grupos });
      feedback(`Configuração "${resultado.nome}" salva: ${resultado.camadas} camada(s) em ${resultado.categorias} categoria(s).`
        + (resultado.camadas_ignoradas ? ` ${resultado.camadas_ignoradas} camada(s) do plugin não entram na configuração.` : ''));
    } catch (error) {
      feedback(`Não foi possível salvar: ${error.message}`);
    } finally { marcar(); }
  });

  // Um só caminho de carregamento; o explorador muda apenas a forma de escolher.
  async function abrirSalva(explorador) {
    if (state.busy) return;
    try {
      const pastaDados = await json('/extracao-atributos/configuracoes');
      const configuracoes = pastaDados.configuracoes;
      if (!configuracoes.length) { feedback('Nenhuma configuração salva ainda. Monte uma lista e use Salvar.'); return; }
      const escolha = await escolherConfiguracao(configuracoes, explorador ? pastaDados.pasta : '');
      if (!escolha) return;
      const dados = await json(`/extracao-atributos/configuracoes/${encodeURIComponent(escolha)}`);
      // Carregar acrescenta à lista: o que já estava montado permanece.
      const vindas = dados.categorias.flatMap(grupo => grupo.camadas.map(camada => {
        const noCatalogo = state.catalog.find(l => l.id === camada.id);
        if (noCatalogo && camada.arquivo && !noCatalogo.arquivo) noCatalogo.arquivo = camada.arquivo;
        return { id: camada.id, category: grupo.id, arquivo: camada.arquivo || noCatalogo?.arquivo || '' };
      }));
      const jaNaLista = [], jaNaBancada = [];
      let incluidas = 0;
      for (const item of vindas) {
        if (state.bases.some(base => base.id === item.id)) { jaNaBancada.push(nomeArquivo(item)); continue; }
        const presente = state.staging.find(outro => outro.id === item.id);
        if (presente) {
          if (presente.category !== item.category) jaNaLista.push(nomeArquivo(item));
          continue;
        }
        state.staging.push(item);
        incluidas++;
      }
      ancora = state.staging.map(item => ({ ...item }));
      render();
      const partes = [`Configuração "${dados.nome}": ${incluidas} camada(s) acrescentada(s); a lista ficou com ${state.staging.length}.`];
      if (jaNaLista.length) partes.push(`${jaNaLista.length} já estava(m) na lista em outra categoria e foi(ram) mantida(s) onde estava(m): ${jaNaLista.join(', ')}.`);
      if (jaNaBancada.length) partes.push(`${jaNaBancada.length} já está(ão) na bancada: ${jaNaBancada.join(', ')}.`);
      if (dados.ausentes.length) partes.push(`${dados.ausentes.length} referência(s) não estão mais no catálogo: ${dados.ausentes.join(', ')}.`);
      feedback(partes.join(' '));
    } catch (error) {
      feedback(`Não foi possível carregar: ${error.message}`);
    } finally { marcar(); }
  }
  botoes.editar.addEventListener('click', () => {
    if (state.busy || !state.staging.length) return;
    editando = !editando;
    render();
    feedback(editando
      ? 'Lista em edição: use + para adicionar camadas à categoria e × para remover.'
      : 'Edição encerrada. A lista continua aguardando o envio à bancada.');
  });
  botoes.carregar.addEventListener('click', () => { botoes.carregar.disabled = true; abrirSalva(true); });

  for (const [chave, botao] of Object.entries(botoes)) {
    botao.title = ROTULO[chave];
    botao.setAttribute('aria-label', ROTULO[chave]);
  }
  bar.setAttribute('aria-label', 'Ações da lista de camadas');
  return { render, adicionar, marcar };
}

const tamanho = bytes => bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;

/* Com `pasta`, o diálogo vira o explorador do diretório das configurações. */
function escolherConfiguracao(configuracoes, pasta = '') {
  return new Promise(resolve => {
    const dialog = el('dialog', undefined, 'ea-tool-dialog ea-config-dialog');
    const titulo = el('h2', pasta ? 'Abrir arquivo de configuração' : 'Configurações salvas');
    titulo.id = 'ea-config-dialog-title';
    dialog.setAttribute('aria-labelledby', titulo.id);
    const caminho = pasta ? el('p', `${pasta}/`, 'ea-config-path') : null;
    const filtro = el('input');
    filtro.type = 'search';
    filtro.className = 'ea-config-filter';
    filtro.placeholder = 'Filtrar nesta pasta';
    filtro.setAttribute('aria-label', 'Filtrar arquivos de configuração por nome');
    const lista = el('div', undefined, 'ea-config-list');
    let escolhido = null;
    const linhas = configuracoes.map(item => {
      const linha = el('button', undefined, 'ea-btn ea-config-entry');
      linha.type = 'button';
      const data = item.salvo_em ? new Date(item.salvo_em).toLocaleString('pt-BR') : 'sem data';
      const cabeca = el('span', undefined, 'ea-config-entry-title');
      cabeca.append(el('span', '\u25a4', 'ea-config-entry-icon'), el('strong', pasta ? item.arquivo : item.nome));
      linha.append(cabeca, el('small', pasta
        ? `${item.nome} · ${item.camadas} camada(s) · ${item.categorias} categoria(s) · ${tamanho(item.bytes)} · ${data}`
        : `${item.camadas} camada(s) · ${item.categorias} categoria(s) · ${data}`));
      linha.title = pasta ? `${pasta}/${item.arquivo}` : item.nome;
      linha.addEventListener('click', () => {
        escolhido = item.chave;
        linhas.forEach(node => node.setAttribute('aria-pressed', String(node === linha)));
        confirmar.disabled = false;
      });
      linha.ondblclick = () => fechar(item.chave);
      linha.setAttribute('aria-pressed', 'false');
      lista.append(linha);
      return linha;
    });
    const vazio = el('p', 'Nenhum nome corresponde ao filtro.', 'ea-empty-small');
    vazio.hidden = true;
    lista.append(vazio);
    filtro.addEventListener('input', () => {
      const termo = filtro.value.trim().toLocaleLowerCase('pt-BR');
      let visiveis = 0;
      linhas.forEach((linha, indice) => {
        const item = configuracoes[indice];
        const casa = `${item.arquivo} ${item.nome}`.toLocaleLowerCase('pt-BR').includes(termo);
        linha.hidden = !casa;
        if (casa) visiveis++;
      });
      vazio.hidden = Boolean(visiveis);
    });
    const rodape = el('div', undefined, 'ea-config-dialog-footer');
    const cancelar = el('button', 'Cancelar', 'ea-btn');
    cancelar.type = 'button';
    const confirmar = el('button', pasta ? 'Abrir' : 'Carregar', 'ea-btn ea-btn-primary');
    confirmar.type = 'button';
    confirmar.disabled = true;
    function fechar(valor) { dialog.close(); dialog.remove(); resolve(valor); }
    cancelar.addEventListener('click', () => fechar(null));
    confirmar.addEventListener('click', () => fechar(escolhido));
    dialog.addEventListener('cancel', event => { event.preventDefault(); fechar(null); });
    rodape.append(cancelar, confirmar);
    dialog.append(titulo, ...(caminho ? [caminho, filtro] : []), lista, rodape);
    document.body.append(dialog);
    dialog.showModal();
  });
}
