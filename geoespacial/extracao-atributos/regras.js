/* Editor da regra de uma base no modo enriquecimento (etapa 2 do fluxo configurável).
   A validação definitiva é do servidor (extracao_atributos_regras.py); aqui só se
   evita enviar o que já se sabe incoerente. */
import { el, feedback, exigirCampo } from './ui.js';

export const REGRA_PADRAO = Object.freeze({
  papel: 'atributos', ligacao: 'localizacao', predicado: 'intersecta', chave_entrada: null, chave_base: null,
  multiplicidade: 'resumo', campos: null, prefixo: null, apelidos: {},
  preparacao: { buffer_m: null, corrigir_geometrias: true, separar_por_tipo: true },
});

const ROTULOS = {
  papel: { atributos: 'Base de atributos', recorte: 'Unidade de recorte' },
  ligacao: { localizacao: 'Por localização', atributo: 'Por atributo (chave comum)' },
  predicado: { intersecta: 'Intersecta', contem: 'Contém a feição da base', esta_dentro: 'Está dentro da feição da base' },
  multiplicidade: {
    binaria: 'Interseção: Sim/Não', estatisticas: 'Estatísticas sem recorte',
    maior_sobreposicao: 'Maior sobreposição', primeira: 'Primeira na ordem da base (seleção explícita)',
    todas: 'Todas (um registro por feição)', resumo: 'Preservar valores e correspondências',
  },
};

/* Rótulo legível para valores gravados no resultado (ex.: maior_sobreposicao). */
export function rotulo(campo, valor) {
  return ROTULOS[campo]?.[valor] || valor || '—';
}

export function resumoRegra(regra) {
  const r = { ...REGRA_PADRAO, ...(regra || {}) };
  if (r.papel === 'recorte') return 'Unidade de recorte';
  const ligacao = r.ligacao === 'atributo' ? `chave ${r.chave_entrada} = ${r.chave_base}` : ROTULOS.predicado[r.predicado].toLowerCase();
  const buffer = r.preparacao?.buffer_m ? ` · buffer ${r.preparacao.buffer_m} m` : '';
  return `${ligacao} · ${ROTULOS.multiplicidade[r.multiplicidade].toLowerCase()}${buffer}`;
}

function select(nome, valor) {
  const campo = document.createElement('select');
  campo.name = nome;
  for (const [chave, rotulo] of Object.entries(ROTULOS[nome])) if (!['binaria','estatisticas'].includes(chave)) campo.append(new Option(rotulo, chave));
  campo.value = valor;
  return campo;
}

function linha(rotulo, controle, dica) {
  const bloco = el('label', undefined, 'ea-field ea-regra-campo');
  bloco.append(el('span', rotulo), controle);
  if (dica) bloco.append(el('small', dica));
  return bloco;
}

function entrada(nome, valor, tipo = 'text') {
  const campo = document.createElement('input');
  campo.type = tipo;
  campo.name = nome;
  campo.value = valor ?? '';
  campo.autocomplete = 'off';
  return campo;
}

const OPERADORES = { '': 'Sem filtro', preenchido: 'Campo preenchido', igual: 'Igual a', diferente: 'Diferente de', em: 'Em uma lista' };

/* Mesmo prefixo que o servidor deriva do nome da camada (extracao_atributos_regras.prefixo_padrao). */
export function prefixoPadrao(nome) {
  const texto = String(nome || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase().slice(0, 30).replace(/^_+|_+$/g, '') || 'base';
  return `${/^\d/.test(texto) ? 'b' + texto : texto}_`;
}

export function resumoEntrada(config) {
  const c = config || {};
  const partes = [];
  if (c.campo_id) partes.push(`id: ${c.campo_id}`);
  if (c.filtro) partes.push(`filtro: ${c.filtro.campo} ${OPERADORES[c.filtro.operador].toLowerCase()}${c.filtro.valor ? ` ${[].concat(c.filtro.valor).join(', ')}` : ''}`);
  if (c.campos) partes.push(`${c.campos.length} campo(s)`);
  return partes.join(' · ') || 'todas as feições e campos';
}

/* Identificador, filtro e campos de uma camada de entrada do enriquecimento. */
export function editarEntrada({ nomeEntrada, config, preservar = false, camposDisponiveis = [] }) {
  const c = config || {};
  return new Promise(resolve => {
    const dialog = el('dialog', undefined, 'ea-tool-dialog ea-regra-dialog');
    const titulo = el('h2', `Entrada · ${nomeEntrada}`);
    titulo.id = 'ea-entrada-titulo';
    dialog.setAttribute('aria-labelledby', titulo.id);
    const campoId = entrada('campo_id', c.campo_id);
    campoId.placeholder = 'Ex.: proj_id';
    const filtroCampo = entrada('filtro_campo', c.filtro?.campo);
    const operador = document.createElement('select');
    for (const [chave, rotulo] of Object.entries(OPERADORES)) operador.append(new Option(rotulo, chave));
    operador.value = c.filtro?.operador || '';
    const valor = entrada('filtro_valor', [].concat(c.filtro?.valor ?? []).join(', '));
    valor.placeholder = 'Na lista, separe por vírgula';
    const campos = document.createElement('textarea');
    campos.rows = 3;
    campos.value = (c.campos || []).join(', ');
    campos.placeholder = 'Em branco: todos os campos';
    const erro = el('p', '', 'ea-regra-erro');
    erro.setAttribute('role', 'alert');
    const dica = camposDisponiveis.length ? `Campos da camada: ${camposDisponiveis.join(', ')}` : 'Separe por vírgula.';
    const corpo = el('div', undefined, 'ea-regra-corpo');
    corpo.append(linha('Campo identificador', campoId, 'Vira id_origem em cada registro.'),
      linha('Filtrar pelo campo', filtroCampo), linha('Condição', operador), linha('Valor', valor),
      erro);
    if (preservar) {
      for (const controle of [filtroCampo, operador, valor]) controle.closest('label').hidden = true;
      corpo.append(el('p', 'Todas as feições e atributos serão mantidos. Aplicar remove filtros antigos desta entrada.', 'ea-hint'));
    }
    const rodape = el('div', undefined, 'ea-config-dialog-footer');
    const cancelar = el('button', 'Cancelar', 'ea-btn');
    const aplicar = el('button', 'Aplicar', 'ea-btn ea-btn-primary');
    cancelar.type = 'button';
    aplicar.type = 'button';
    function fechar(resultado) { dialog.close(); dialog.remove(); resolve(resultado); }
    cancelar.addEventListener('click', () => fechar(null));
    dialog.addEventListener('cancel', event => { event.preventDefault(); fechar(null); });
    aplicar.addEventListener('click', () => {
      let filtro = null;
      if (!preservar && operador.value) {
        if (!filtroCampo.value.trim()) { exigirCampo(filtroCampo,'Informe o campo do filtro.'); return; }
        const lista = valor.value.split(',').map(t => t.trim()).filter(Boolean);
        if (['igual', 'diferente'].includes(operador.value) && !valor.value.trim()) { exigirCampo(valor,'Informe o valor do filtro.'); return; }
        if (operador.value === 'em' && !lista.length) { exigirCampo(valor,'Informe ao menos um valor na lista.'); return; }
        filtro = { campo: filtroCampo.value.trim(), operador: operador.value,
          valor: operador.value === 'em' ? lista : ['igual', 'diferente'].includes(operador.value) ? valor.value.trim() : null };
      }
      const listaCampos = campos.value.split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
      fechar({ ...c, campo_id: campoId.value.trim() || null, identificacao_confirmada:true, filtro, campos:null });
    });
    rodape.append(cancelar, aplicar);
    dialog.append(titulo, corpo, rodape);
    document.body.append(dialog);
    dialog.showModal();
  });
}

/* Escolha dos campos de uma finalidade a partir dos campos previstos na saída.
   `disponiveis`: [{campo, rotulo, grupo}] montado pela tela com as bases e regras já definidas. */
export function editarFinalidade({ nome = '', campos = [], disponiveis = [] }) {
  return new Promise(resolve => {
    const dialog = el('dialog', undefined, 'ea-tool-dialog ea-finalidade-dialog');
    const titulo = el('h2', nome ? `Finalidade · ${nome}` : 'Novo recorte por finalidade');
    titulo.id = 'ea-finalidade-titulo';
    dialog.setAttribute('aria-labelledby', titulo.id);
    const campoNome = entrada('nome', nome);
    campoNome.placeholder = 'Ex.: Indicadores Dani';
    const filtro = entrada('filtro', '', 'search');
    filtro.placeholder = 'Filtrar campos';
    filtro.setAttribute('aria-label', 'Filtrar campos pelo nome');
    const lista = el('div', undefined, 'ea-finalidade-campos');
    const existentes = new Set(disponiveis.map(item => item.campo));
    const escolhidos = new Set(campos.filter(campo => existentes.has(campo)));
    const linhas = disponiveis.map(item => {
      const linha = el('label', undefined, 'ea-finalidade-campo');
      const marca = entrada(item.campo, '', 'checkbox');
      marca.checked = escolhidos.has(item.campo);
      marca.addEventListener('change', () => {
        if (marca.checked) escolhidos.add(item.campo); else escolhidos.delete(item.campo);
        conta.textContent = `${escolhidos.size} campo(s) escolhido(s)`;
      });
      linha.append(marca, el('span', item.rotulo || item.campo), el('small', item.grupo || ''));
      lista.append(linha);
      return { linha, texto: `${item.campo} ${item.rotulo || ''} ${item.grupo || ''}`.toLocaleLowerCase('pt-BR') };
    });
    if (!linhas.length) {
      lista.append(el('p', 'Confirme as bases e ajuste as regras para a tela saber quais campos a saída terá.', 'ea-empty-small'));
    }
    filtro.addEventListener('input', () => {
      const termo = filtro.value.trim().toLocaleLowerCase('pt-BR');
      for (const { linha, texto } of linhas) linha.hidden = Boolean(termo) && !texto.includes(termo);
    });
    const conta = el('p', `${escolhidos.size} campo(s) escolhido(s)`, 'ea-hint');
    const erro = el('p', '', 'ea-regra-erro');
    erro.setAttribute('role', 'alert');
    const rodape = el('div', undefined, 'ea-config-dialog-footer');
    const cancelar = el('button', 'Cancelar', 'ea-btn');
    const aplicar = el('button', 'Aplicar', 'ea-btn ea-btn-primary');
    cancelar.type = 'button';
    aplicar.type = 'button';
    const fechar = valor => { dialog.close(); dialog.remove(); resolve(valor); };
    cancelar.addEventListener('click', () => fechar(null));
    dialog.addEventListener('cancel', evento => { evento.preventDefault(); fechar(null); });
    aplicar.addEventListener('click', () => {
      if (!campoNome.value.trim()) { exigirCampo(campoNome,'Informe o nome da finalidade.'); return; }
      if (!escolhidos.size) { exigirCampo(lista.querySelector('input,select,button'),'Escolha ao menos um campo.'); return; }
      fechar({ nome: campoNome.value.trim(), campos: [...escolhidos] });
    });
    rodape.append(cancelar, aplicar);
    dialog.append(titulo, linha('Nome', campoNome), linha('Campos da saída', filtro), lista, conta, erro, rodape);
    document.body.append(dialog);
    dialog.showModal();
  });
}

/* "Nome: campo1, campo2" por linha -> [{nome, campos}]; erro legível na primeira linha inválida. */
export function lerFinalidades(texto) {
  const finalidades = [];
  for (const bruta of String(texto || '').split('\n')) {
    const linhaTexto = bruta.trim();
    if (!linhaTexto) continue;
    const posicao = linhaTexto.indexOf(':');
    const nome = posicao > 0 ? linhaTexto.slice(0, posicao).trim() : '';
    const campos = posicao > 0 ? linhaTexto.slice(posicao + 1).split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!nome || !campos.length) throw new Error(`Finalidade inválida: "${linhaTexto}". Use Nome: campo1, campo2.`);
    finalidades.push({ nome, campos });
  }
  return finalidades;
}

/* camposDisponiveis: nomes dos campos da base, quando a camada já foi lida para o mapa. */
export function editarRegra({ nomeBase, regra, camposDisponiveis = [] }) {
  const r = structuredClone({ ...REGRA_PADRAO, ...(regra || {}), preparacao: { ...REGRA_PADRAO.preparacao, ...(regra?.preparacao || {}) } });
  return new Promise(resolve => {
    const dialog = el('dialog', undefined, 'ea-tool-dialog ea-regra-dialog');
    const titulo = el('h2', `Regra da base · ${nomeBase}`);
    titulo.id = 'ea-regra-titulo';
    dialog.setAttribute('aria-labelledby', titulo.id);
    const papel = select('papel', r.papel);
    const ligacao = select('ligacao', r.ligacao);
    const predicado = select('predicado', r.predicado);
    const chaveEntrada = entrada('chave_entrada', r.chave_entrada);
    const chaveBase = entrada('chave_base', r.chave_base);
    const multiplicidade = select('multiplicidade', r.multiplicidade);
    const campos = document.createElement('textarea');
    campos.rows = 3;
    campos.value = (r.campos || []).join(', ');
    campos.placeholder = 'Em branco: todos os campos';
    const prefixo = entrada('prefixo', r.prefixo);
    prefixo.placeholder = 'Em branco: derivado do nome da camada';
    const apelidos = document.createElement('textarea');
    apelidos.rows = 3;
    apelidos.value = Object.entries(r.apelidos || {}).map(([campo, texto]) => `${campo} = ${texto}`).join('\n');
    apelidos.placeholder = 'Um por linha: CAMPO = Apelido';
    const buffer = entrada('buffer_m', r.preparacao.buffer_m, 'number');
    buffer.min = '0';
    buffer.step = 'any';
    const corrigir = entrada('corrigir', '', 'checkbox');
    corrigir.checked = r.preparacao.corrigir_geometrias;
    const separar = entrada('separar', '', 'checkbox');
    separar.checked = r.preparacao.separar_por_tipo;
    const erro = el('p', '', 'ea-regra-erro');
    erro.setAttribute('role', 'alert');

    const blocoChaves = el('div', undefined, 'ea-regra-grupo');
    blocoChaves.append(linha('Chave na entrada', chaveEntrada, 'Campo dos registros, inclusive campos já trazidos por outra base (ex.: mun_CD_MUN).'),
      linha('Chave na base', chaveBase));
    const blocoPredicado = linha('Predicado espacial', predicado);
    function sincronizar() {
      const porAtributo = ligacao.value === 'atributo';
      blocoChaves.hidden = !porAtributo;
      blocoPredicado.hidden = porAtributo;
      const recorte = papel.value === 'recorte';
      multiplicidade.disabled = recorte;
      buffer.disabled = recorte;
    }
    papel.addEventListener('change', sincronizar);
    ligacao.addEventListener('change', sincronizar);
    sincronizar();

    const dicaCampos = camposDisponiveis.length ? `Campos da base: ${camposDisponiveis.join(', ')}` : 'Separe por vírgula.';
    const corpo = el('div', undefined, 'ea-regra-corpo');
    corpo.append(
      linha('Papel', papel, 'A unidade de recorte divide linhas e polígonos nos seus limites; só uma por execução.'),
      linha('Ligação', ligacao), blocoPredicado, blocoChaves,
      linha('Multiplicidade', multiplicidade, 'Todas as correspondências são registradas. Primeira e maior sobreposição selecionam apenas os atributos principais; todas duplica registros. O padrão preserva os valores sem cálculo.'),
      linha('Prefixo', prefixo), linha('Apelidos', apelidos),
      linha('Buffer (metros)', buffer, 'Transforma as feições da base em áreas antes do cruzamento.'),
      linha('Corrigir geometrias inválidas', corrigir), linha('Separar por tipo de geometria', separar), erro);

    const agregacoes=el('button','Operações por campo do resumo','ea-btn');agregacoes.type='button';
    agregacoes.addEventListener('click',async()=>{
      const atualizado=await editarEstatisticas({nomeBase,regra:r,camposDisponiveis});
      if(atualizado){r.estatistica=atualizado.estatistica;r.estatisticas_campos=atualizado.estatisticas_campos;}
    });
    corpo.append(agregacoes);
    const rodape = el('div', undefined, 'ea-config-dialog-footer');
    const padrao = el('button', 'Restaurar padrão', 'ea-btn');
    const cancelar = el('button', 'Cancelar', 'ea-btn');
    const aplicar = el('button', 'Aplicar', 'ea-btn ea-btn-primary');
    for (const botao of [padrao, cancelar, aplicar]) botao.type = 'button';
    function fechar(valor) { dialog.close(); dialog.remove(); resolve(valor); }
    padrao.addEventListener('click', () => fechar({ ...structuredClone(REGRA_PADRAO),
      ...(r.estatistica ? { estatistica: r.estatistica } : {}), ...(r.estatisticas_campos ? { estatisticas_campos: r.estatisticas_campos } : {}) }));
    cancelar.addEventListener('click', () => fechar(null));
    dialog.addEventListener('cancel', event => { event.preventDefault(); fechar(null); });
    aplicar.addEventListener('click', () => {
      const listaCampos = campos.value.split(/[,;\n]/).map(t => t.trim()).filter(Boolean);
      if (new Set(listaCampos).size !== listaCampos.length) { exigirCampo(campos,'Há campos repetidos na lista.'); return; }
      const mapaApelidos = {};
      for (const texto of apelidos.value.split('\n').map(t => t.trim()).filter(Boolean)) {
        const posicao = texto.indexOf('=');
        if (posicao <= 0) { exigirCampo(apelidos,`Apelido sem "=": ${texto}`); return; }
        const apelido = texto.slice(posicao + 1).trim();
        if (!apelido) { exigirCampo(apelidos,`Apelido vazio: ${texto}`); return; }
        mapaApelidos[texto.slice(0, posicao).trim()] = apelido;
      }
      const porAtributo = ligacao.value === 'atributo';
      if (porAtributo && (!chaveEntrada.value.trim() || !chaveBase.value.trim())) {
        feedback('Ligação por atributo exige a chave da entrada e a chave da base.', 'warning'); return;
      }
      if (papel.value === 'recorte' && porAtributo) {
        feedback('A unidade de recorte usa ligação por localização.', 'warning'); return;
      }
      const metros = buffer.value === '' ? null : Number(buffer.value);
      if (papel.value !== 'recorte' && (buffer.validity.badInput || (metros !== null && !(metros > 0 && metros <= 100000)))) {
        exigirCampo(buffer,'O buffer deve ser maior que zero e no máximo 100000 m.'); return;
      }
      const prefixoValor = prefixo.value.trim().toLowerCase();
      if (prefixoValor && !/^[a-z][a-z0-9_]{0,38}_?$/.test(prefixoValor)) {
        exigirCampo(prefixo,'Prefixo deve começar com letra e usar letras minúsculas, números e sublinhado.'); return;
      }
      fechar({
        estatistica: r.estatistica || 'valores', estatisticas_campos: r.estatisticas_campos || {},
        papel: papel.value, ligacao: ligacao.value, predicado: predicado.value,
        chave_entrada: porAtributo ? chaveEntrada.value.trim() : null,
        chave_base: porAtributo ? chaveBase.value.trim() : null,
        multiplicidade: multiplicidade.value, campos: null,
        prefixo: prefixoValor || null, apelidos: mapaApelidos,
        preparacao: { buffer_m: papel.value === 'recorte' ? null : metros,
          corrigir_geometrias: corrigir.checked, separar_por_tipo: separar.checked },
      });
    });
    rodape.append(padrao, cancelar, aplicar);
    dialog.append(titulo, corpo, rodape);
    document.body.append(dialog);
    dialog.showModal();
  });
}

export const ESTATISTICAS = Object.freeze({
  valores: 'Valores distintos (sem cálculo)', media: 'Média simples das feições', moda: 'Moda', mediana: 'Mediana', total: 'Total', minimo: 'Mínimo',
  maximo: 'Máximo', desvio_padrao: 'Desvio padrão', variancia: 'Variância', contagem: 'Contagem',
});

export function categoriaBinaria(categoria) {
  return [categoria?.id, categoria?.nome].some(v => ['risco', 'riscos', 'restricao', 'restricoes'].includes(
    String(v || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()));
}

export function resumoEstatisticas(regra, categoria) {
  const quantidade = Object.keys(regra?.estatisticas_campos || {}).length;
  return `${ESTATISTICAS[regra?.estatistica || 'valores']}${quantidade ? ` · ${quantidade} campo(s) personalizado(s)` : ''}`;
}

// O editor antigo permanece intacto para o enriquecimento configurável.
export function editarEstatisticas({ nomeBase, regra, categoria, camposDisponiveis = [] }) {
  return new Promise(resolve => {
    const dialog = el('dialog', undefined, 'ea-tool-dialog ea-regra-dialog');
    const titulo = el('h2', `Estatísticas · ${nomeBase}`);
    titulo.id = 'ea-estatisticas-titulo';
    dialog.setAttribute('aria-labelledby', titulo.id);
    const corpo = el('div', undefined, 'ea-regra-corpo');
    const binaria = false;
    const erro = el('p', '', 'ea-regra-erro');
    erro.setAttribute('role', 'alert');
    const estatistica = document.createElement('select');
    estatistica.name = 'estatistica';
    estatistica.append(new Option(ESTATISTICAS.valores, 'valores'));
    estatistica.value = 'valores';
    if(regra?.estatistica&&regra.estatistica!=='valores')corpo.append(el('p', 'Esta configuração antiga aplicava '+(ESTATISTICAS[regra.estatistica]||regra.estatistica)+' a todos os campos. Revise as operações por campo; Aplicar passa a preservar valores nos demais.', 'ea-hint'));
    const porCampo = {...(regra?.estatisticas_campos || {})};
    if (binaria) {
      corpo.append(el('p', 'Os atributos originais e todas as áreas correspondentes são preservados. A presença Sim/Não é um campo separado. Contato na borda e interseção no interior são identificados; não representam gravidade ou impedimento.'));
    } else {
      corpo.append(linha('Tratamento dos campos sem operação definida', estatistica), el('p',
        'Por padrão, preserva valores distintos em listas JSON, inclusive códigos e nulos. Escolha cálculos apenas nos campos em que a operação tem significado. Soma requer valores somáveis; média simples atribui o mesmo peso a cada feição, inclusive às que só tocam a borda. Não estima valores da parcela intersectada.', 'ea-hint'),
        el('p', 'Desvio padrão e variância são populacionais. Na moda, um empate usa o primeiro valor na ordem da base. Campos de texto aceitam valores distintos, moda e contagem; operações numéricas incompatíveis são rejeitadas. Ausência de interseção deixa o campo vazio. Todas as correspondências ficam registradas separadamente.', 'ea-hint'));
      const campos = [...new Set([...camposDisponiveis, ...Object.keys(porCampo)])];
      const campo = document.createElement('select');
      campo.name = 'campo_estatistica';
      campo.append(new Option('Escolha um campo', ''));
      for (const nome of campos) campo.append(new Option(nome, nome));
      const medida = document.createElement('select');
      medida.name = 'estatistica_campo';
      medida.append(new Option('Usar padrão da base', ''));
      for (const [id, texto] of Object.entries(ESTATISTICAS)) medida.append(new Option(texto, id));
      medida.disabled = true;
      campo.addEventListener('change', () => { medida.disabled = !campo.value; medida.value = porCampo[campo.value] || ''; });
      const lista = el('div');
      function render() {
        lista.replaceChildren();
        for (const [nome, valor] of Object.entries(porCampo)) {
          const item = el('p');
          const remover = el('button', 'Usar padrão', 'ea-btn');
          remover.type = 'button';
          remover.setAttribute('aria-label', `Usar padrão para ${nome}`);
          remover.addEventListener('click', () => { delete porCampo[nome]; if (campo.value === nome) medida.value = ''; render(); });
          item.append(el('span', `${nome}: ${ESTATISTICAS[valor]} `), remover);lista.append(item);
        }
      }
      medida.addEventListener('change', () => { if (!campo.value) return; if (medida.value) porCampo[campo.value] = medida.value; else delete porCampo[campo.value]; render(); });
      render();
      corpo.append(linha('Escolher operação por campo', campo), linha('Estatística desse campo', medida), lista);
      if (!campos.length) corpo.append(el('p', 'Carregue a base na bancada para personalizar seus campos.', 'ea-hint'));
    }
    const prefixo = entrada('prefixo', regra?.prefixo);
    prefixo.placeholder = 'Em branco: derivado do nome da base';
    corpo.append(linha('Prefixo dos campos de saída', prefixo), erro);
    const rodape = el('div', undefined, 'ea-config-dialog-footer');
    const cancelar = el('button', 'Cancelar', 'ea-btn');
    const aplicar = el('button', 'Aplicar', 'ea-btn ea-btn-primary');
    cancelar.type = aplicar.type = 'button';
    const fechar = valor => { dialog.close(); dialog.remove(); resolve(valor); };
    cancelar.addEventListener('click', () => fechar(null));
    dialog.addEventListener('cancel', e => { e.preventDefault(); fechar(null); });
    aplicar.addEventListener('click', () => {
      const valor = prefixo.value.trim().toLowerCase();
      if (valor && !/^[a-z][a-z0-9_]{0,38}_?$/.test(valor)) { exigirCampo(prefixo,'Prefixo deve começar com letra e usar letras minúsculas, números e sublinhado.'); return; }
      // Preservar regras do modo configurável permite alternar sem perder as escolhas.
      fechar({...regra, estatistica: estatistica.value, estatisticas_campos: porCampo, prefixo: valor || null});
    });
    rodape.append(cancelar, aplicar);dialog.append(titulo, corpo, rodape);document.body.append(dialog);dialog.showModal();
  });
}
