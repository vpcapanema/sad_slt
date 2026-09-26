/* Lista de montagem da subseção 1.2: o usuário escolhe uma categoria, marca suas
   camadas, troca de categoria e repete. Nada vai para a bancada antes de confirmar. */
import { $, el, feedback } from './ui.js';
import { base, json, post } from './api.js';
import { entradasParaPrevia, entradasPreparadas, guardarPrevia, desfazerPrevia, enviarPrevia, limparPreparacao } from './preparacao.js';
import { criarEditorListaBases } from './editor-lista-bases.js';

const ROTULO = {
  confirmar: 'Enviar pra bancada',
  salvar: 'Salvar somente a lista de bases e categorias',
  editar: 'Editar camadas da prévia',
  carregar: 'Carregar listas',
  limpar: 'Limpar camadas da prévia',
  cancelar: 'Desfazer edição da prévia',
};

export function criarListaCamadas(state, changed, escolherCamadas) {
  let editando = false;
  const editor=criarEditorListaBases(state,changed,escolherCamadas,()=>salvar('bases'));
  const configSalvar=$('#ea-config-salvar'),configCarregar=$('#ea-config-carregar');
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
  const paraSalvar = () => editor.itens()||(state.bases.length||state.staging.length?[...state.bases,...state.staging]:state.bancadaBases||[]);

  function marcar() {
    editor.marcar();
    const total = state.staging.length+state.bases.length+entradasParaPrevia(state).length;
    botoes.confirmar.disabled = state.busy || state.uploading || state.validatingBases || state.loadingMap || !total || (state.previaVisiveis&&!state.previaVisiveis.size);
    botoes.salvar.disabled = state.busy || !paraSalvar().length;
    botoes.limpar.disabled = state.busy || !total;
    state.temUndoBases=Boolean(state.undoPrevia);
    botoes.cancelar.disabled = state.busy || !state.temUndoBases;
    botoes.editar.disabled = state.busy || !total;
    botoes.editar.setAttribute('aria-pressed', String(editando));
    botoes.editar.classList.toggle('is-active', editando);
    botoes.carregar.disabled = state.busy;
    configSalvar.disabled=state.busy;configCarregar.disabled=state.busy;
  }

  function render() {state.editandoBases=editando;marcar();editor.render();}

  const adicionar=(ids,category)=>editor.adicionar(ids,category);

  botoes.confirmar.addEventListener('click',async()=>{
    if(state.busy||state.uploading||state.loadingMap||state.validatingBases)return;
    const candidata={...state};
    const total=enviarPrevia(candidata);
    if(!total)return;
    if(!await window.ProcessFeedback.confirmar({title:"Enviar camadas à bancada",message:`Compatibilizar ${total} camada(s) e inserir no mapa da bancada?`,confirmLabel:"Compatibilizar e abrir"}))return;
    window.SICARDExtracao.ocupar(true);
    const COMPATIBILIZAR='Compatibilizar as camadas',MAPA='Inserir no mapa da bancada';
    const proc=window.ProcessFeedback.iniciarCadastro({title:'Enviando camadas à bancada',subtitle:`${total} camada(s)`,tasks:[COMPATIBILIZAR,MAPA]});
    proc.tarefaAtual(COMPATIBILIZAR,'Conferindo e compatibilizando as camadas marcadas na prévia…');
    try{
      const camadas=[
        ...candidata.bancadaEntradas.map(e=>({id:e.id,nome:e.layer.nome,papel:'entrada',arquivo_local:e.layer.arquivo_local})),
        ...candidata.bancadaBases.map(b=>({id:b.id,nome:b.layer.nome,papel:'base',arquivo_local:b.layer.arquivo_local,regra:b.regra})),
      ];
      const resultado=await post('/extracao-atributos/compatibilizar',{camadas,operacao:state.operation||null});
      if(resultado.compativel!==true)throw new Error((resultado.erros||[]).map(e=>`${e.nome}: ${e.motivo}`).join('; ')||'A compatibilização não foi concluída.');
      proc.concluirTarefa(COMPATIBILIZAR,'Compatibilidade espacial conferida');
      proc.tarefaAtual(MAPA,'Inserindo camadas e categorias no mapa da bancada.');
      Object.assign(state,{bancadaEntradas:candidata.bancadaEntradas,bancadaBases:candidata.bancadaBases,bases:candidata.bases,staging:candidata.staging});
      editando=false;state.undoPrevia=null;render();
      const falhas=await changed({etapa:(mensagem,tipo)=>proc.log(mensagem,tipo==='erro'?'error':'step')});
      if(falhas?.length)throw new Error(falhas.join('; '));
      await window.SICARDExtracao.aguardarBancada();
      limparPreparacao(state);editor.limpar();
      window.SICARDExtracao.renderParametros();
      await changed();
      proc.concluirTarefa(MAPA,'Camadas na bancada');
      proc.sucesso({title:'Camadas enviadas à bancada',message:`${total} camada(s) enviada(s) à bancada. Compatibilidade espacial conferida; originais preservados.`});
    }catch(error){proc.erro({title:'Não foi possível enviar à bancada',message:error.message});}
    finally{window.SICARDExtracao.ocupar(false);render();}
  });
  botoes.limpar.addEventListener('click',()=>{
    if(state.busy)return;guardarPrevia(state);state.input='';state.inputConfig=null;state.entradasExtras=[];state.staging=[];state.bases=[];state.previaLocal=null;editando=false;render();changed();
  });
  botoes.cancelar.addEventListener('click',()=>{if(state.busy)return;desfazerPrevia(state);render();changed();});

  async function salvar(escopo='analise'){
    if (state.busy || state.validatingBases || (escopo==='bases'&&!paraSalvar().length)) return;
    if(paraSalvar().some(item=>item.id.startsWith('local:'))){feedback('As bases locais são temporárias. Para salvar uma configuração reutilizável, cadastre as bases no storage e selecione-as novamente.');return;}
    const nome = (escopo==='bases'&&editor.lista()?.nome)||await window.ProcessFeedback.confirmar({title:escopo==='bases'?'Salvar lista de bases':'Salvar configuração',message:escopo==='bases'?'Dê um nome à lista de bases e categorias.':'Dê um nome à configuração das três subseções.',input:{label:'Nome'},confirmLabel:'Salvar'});
    if (!nome) return;
    if (!nome.trim()) { feedback('Informe um nome para a configuração.'); return; }
    botoes.salvar.disabled = true;
    try {
      // Listas guardam bases e categorias; configurações guardam as três subseções.
      const grupos = state.categories.map(category=>({category,itens:paraSalvar().filter(item=>item.category===category.id)}))
        .filter(grupo=>grupo.itens.length).map(({ category, itens }) => ({
        id: category.id, camadas: itens.map(item => item.id),
        regras: Object.fromEntries(itens.filter(item => item.regra).map(item => [item.id, item.regra])),
      }));
      // A análise inteira: bases com regra, entradas (identificador, filtro, campos) e finalidades.
      const preparadas = entradasPreparadas(state);
      const entradas = (preparadas.length?preparadas:state.bancadaEntradas||[])
        .filter(item=>!item.id.startsWith('local:')).map(item=>({id:item.id,config:item.config||{}}));
      const finalidades = (state.finalidades || []).map(f => ({ nome: f.nome, campos: [...f.campos] }));
      const resultado = await post('/extracao-atributos/configuracoes',
        { nome: nome.trim(), escopo, chave_lista:escopo==='bases'?editor.lista()?.chave:undefined, categorias: grupos, entradas:escopo==='bases'?[]:entradas, finalidades:escopo==='bases'?[]:finalidades,
          operacao:escopo==='bases'?'':state.operation,opcoes:escopo==='bases'?{}:state.opcoes,nome_saida:escopo==='bases'?'':state.nomeSaida, categoria_ativa:$('#ea-category-select').value });
      if(escopo==='bases')editor.salva(resultado);
      feedback(`${escopo==='bases'?'Lista de bases':'Configuração'} "${resultado.nome}" salva: ${resultado.camadas} camada(s) em ${resultado.categorias} categoria(s),`
        + (escopo==='bases'?' Entradas, algoritmo e saída não são alterados.':` ${resultado.entradas} entrada(s) e ${resultado.finalidades} finalidade(s).`)
        + (escopo==='analise'&&state.input.startsWith('local:') ? ' A entrada local é temporária: selecione o arquivo novamente ao carregar esta configuração.' : '')
        + (resultado.camadas_ignoradas ? ` ${resultado.camadas_ignoradas} camada(s) do plugin não entram na configuração.` : ''));
    } catch (error) {
      feedback(`Não foi possível salvar: ${error.message}`,'error');
    } finally { marcar(); }
  }
  configSalvar.addEventListener('click',()=>salvar('analise'));
  botoes.salvar.addEventListener('click',()=>salvar('bases'));

  // Um só caminho de carregamento; o explorador muda apenas a forma de escolher.
  async function abrirSalva(explorador,escopo='analise') {
    if (state.busy) return;
    try {
      const pastaDados = await json(`/extracao-atributos/configuracoes?escopo=${escopo}`);
      const configuracoes = pastaDados.configuracoes;
      if (!configuracoes.length) { feedback(escopo==='bases'?`Nenhuma lista encontrada em ${pastaDados.pasta}. Arquivos salvos na VM ou em outro computador precisam estar disponíveis neste ambiente.`:'Nenhuma configuração salva ainda.'); return; }
      const escolha = await escolherConfiguracao(configuracoes, explorador ? pastaDados.pasta : '',escopo);
      if (!escolha) return;
      const dados = await json(`/extracao-atributos/configuracoes/${encodeURIComponent(escolha)}?escopo=${escopo}${escopo==='bases'?'&lista=true':''}`);
      if(escopo!=='bases'&&(state.input||state.bases.length||state.staging.length)&&!(await window.ProcessFeedback.confirmar({title:escopo==='bases'?'Carregar listas':'Carregar configuração',message:escopo==='bases'?'Substituir apenas as bases e categorias? Entradas e algoritmo serão mantidos.':'Substituir as escolhas das três subseções pela configuração salva?',warning:'Nenhuma camada ou resultado será apagado do banco.'})))return;
      // Restaurar integralmente evita executar regras diferentes das que foram salvas.
      const vindas = dados.categorias.flatMap(grupo => grupo.camadas.map(camada => {
        const noCatalogo = state.catalog.find(l => l.id === camada.id);
        if (noCatalogo && camada.arquivo && !noCatalogo.arquivo) noCatalogo.arquivo = camada.arquivo;
        return { id: camada.id, nome:camada.nome, category: grupo.id, arquivo: camada.arquivo || noCatalogo?.arquivo || '',
          ...(camada.regra ? { regra: camada.regra } : {}) };
      }));
      if(escopo==='bases'){
        const entradas=new Set([state.input,...state.entradasExtras.map(e=>e.id)]);
        for(const g of dados.categorias)for(const camada of g.camadas)if(!state.catalog.some(c=>c.id===camada.id))state.catalog.push({...camada});
        editor.carregar(vindas,dados);
        if(dados.categoria_ativa)$('#ea-category-select').value=dados.categoria_ativa;
        render();feedback(`Lista "${dados.nome}" carregada para edição. Confirme a lista para validar as camadas e enviá-las à prévia.`);return;
      }
      editor.carregar(vindas);
      state.input='';state.inputConfig=null;state.entradasExtras=[];
      // Entradas e finalidades vêm da configuração; a entrada principal é a primeira.
      const entradas = dados.entradas || [];
      const idsEntrada=new Set(entradas.map(item=>item.id));
      state.bases=state.bases.filter(item=>!idsEntrada.has(item.id));
      state.staging=state.staging.filter(item=>!idsEntrada.has(item.id));
      if (entradas.length) {
        state.input = entradas[0].id;
        state.inputConfig = entradas[0].config || null;
        state.entradasExtras = entradas.slice(1).map(item => ({ id: item.id, config: item.config || null }));
      }
      state.finalidades = (dados.finalidades||[]).map(f => ({ nome: f.nome, campos: [...f.campos] }));
      state.operation=['enriquecimento','estatisticas'].includes(dados.operacao)?dados.operacao:'';$('#ea-operation').value=state.operation;
      state.opcoes={...state.opcoes,...(dados.opcoes||{})};
      state.nomeSaida=dados.nome_saida||'';$('#ea-nome-saida').value=state.nomeSaida;
      if(dados.categoria_ativa)$('#ea-category-select').value=dados.categoria_ativa;
      state.previaLocal=null;
      ancora = structuredClone(state.staging);
      render();
      window.SICARDExtracao?.renderParametros?.();
      await changed();
      const partes = [`Configuração "${dados.nome}": ${vindas.length} base(s) restaurada(s) na lista. Confirme a lista para enviá-las à prévia.`];
      if (entradas.length) partes.push(`Entrada principal: ${entradas[0].nome}${entradas.length > 1 ? ` (+${entradas.length - 1} adicional(is))` : ''}.`);
      if (dados.finalidades?.length) partes.push(`${dados.finalidades.length} finalidade(s) restaurada(s).`);
      if(!state.operation)partes.push('Escolha um dos dois algoritmos de enriquecimento e confira suas opções antes de executar.');
      if (dados.ausentes.length) partes.push(`${dados.ausentes.length} referência(s) não estão mais no catálogo: ${dados.ausentes.join(', ')}.`);
      feedback(partes.join(' '));
    } catch (error) {
      feedback(`Não foi possível carregar: ${error.message}`,'error');
    } finally { marcar(); }
  }
  botoes.editar.addEventListener('click', () => {
    if (state.busy) return;
    if(!editando)guardarPrevia(state);
    editando = !editando;
    render();changed();
  });
  botoes.carregar.addEventListener('click', () => { botoes.carregar.disabled = true; abrirSalva(true,'bases'); });

  configCarregar.addEventListener('click',()=>abrirSalva(true,'analise'));

  for (const [chave, botao] of Object.entries(botoes)) {
    botao.title = ROTULO[chave];
    botao.setAttribute('aria-label', ROTULO[chave]);
  }
  bar.setAttribute('aria-label', 'Ações da lista de camadas');
  return { render, adicionar, marcar };
}

const tamanho = bytes => bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;

/* Com `pasta`, o diálogo vira o explorador do diretório das configurações. */
function escolherConfiguracao(configuracoes, pasta = '',escopo='analise') {
  return new Promise(resolve => {
    const dialog = el('dialog', undefined, 'ea-tool-dialog ea-config-dialog');
    const titulo = el('h2', escopo==='bases'?'Carregar listas':pasta ? 'Abrir arquivo de configuração' : 'Configurações salvas');
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
        excluir.disabled = false;
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
    // A API tinha DELETE /configuracoes/{chave}, mas a tela não oferecia como apagar.
    const excluir = el('button', 'Excluir', 'ea-btn ea-config-excluir');
    excluir.type = 'button';
    excluir.disabled = true;
    excluir.addEventListener('click', async () => {
      const indice = configuracoes.findIndex(item => item.chave === escolhido);
      if (indice < 0) return;
      const item = configuracoes[indice];
      if (!(await window.ProcessFeedback.confirmar({title:"Excluir configuração",message:`Excluir a configuração "${item.nome}"? O arquivo salvo será apagado e não pode ser recuperado.`,danger:true,confirmLabel:"Excluir"}))) return;
      excluir.disabled = true;
      confirmar.disabled = true;
      try {
        // Resposta 204 sem corpo: json() tentaria ler JSON e falharia.
        const response = await fetch(`${base}/extracao-atributos/configuracoes/${encodeURIComponent(item.chave)}?escopo=${escopo}`, { method: 'DELETE' });
        if (!response.ok) {
          const dados = await response.json().catch(() => ({}));
          throw new Error(typeof dados.detail === 'string' ? dados.detail : 'Falha ao excluir a configuração.');
        }
        linhas[indice].remove();
        linhas.splice(indice, 1);
        configuracoes.splice(indice, 1);
        escolhido = null;
        feedback(`Configuração "${item.nome}" excluída.`);
        if (!configuracoes.length) fechar(null);
      } catch (error) {
        feedback(`Não foi possível excluir: ${error.message}`,'error');
        excluir.disabled = false;
        confirmar.disabled = false;
      }
    });
    function fechar(valor) { dialog.close(); dialog.remove(); resolve(valor); }
    cancelar.addEventListener('click', () => fechar(null));
    confirmar.addEventListener('click', () => fechar(escolhido));
    dialog.addEventListener('cancel', event => { event.preventDefault(); fechar(null); });
    rodape.append(excluir, cancelar, confirmar);
    dialog.append(titulo, ...(caminho ? [caminho, filtro] : []), lista, rodape);
    document.body.append(dialog);
    dialog.showModal();
  });
}
