import {nomeDemanda} from './nome-demanda.js?v=20261023-nomes';
import {el} from '../../geoespacial/extracao-atributos/ui.js';

export const formatarIndice = valor => valor.toLocaleString('pt-BR', {
  minimumFractionDigits:2, maximumFractionDigits:2,
});
export const indiceTexto = valor => valor.estado_indice === 'valido'
  ? formatarIndice(valor.indice)
  : {ausente:'Campo ausente', nulo:'Sem valor', invalido:'Índice inválido (0–1)'}[valor.estado_indice];
export const classeTexto = valor => valor.estado_classe === 'valido'
  ? String(valor.classe).toLocaleLowerCase('pt-BR').replace(/\p{L}[\p{L}\p{M}]*/gu,
    palavra => palavra[0].toLocaleUpperCase('pt-BR')+palavra.slice(1))
  : valor.estado_classe === 'ausente' ? 'Campo de classe ausente' : 'Sem classe informada';

export function compararIndices(a, b) {
  const validoA = a?.estado_indice === 'valido', validoB = b?.estado_indice === 'valido';
  return validoA && validoB ? b.indice - a.indice : Number(validoB) - Number(validoA);
}

export const maiorIndiceDemanda = linha => (linha.sobreposicoes || linha.itens || [])
  .map(item => item.favorabilidade).reduce((a,b) => compararIndices(a,b) <= 0 ? a : b, undefined);

export const compararDemandas = (a,b) => compararIndices(maiorIndiceDemanda(a), maiorIndiceDemanda(b));

export function corClasse(valor) {
  if (valor?.estado_classe !== 'valido') return '#808080';
  const classe = String(valor.classe).normalize('NFD').replace(/\p{M}/gu, '')
    .trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  const cores = {'muito baixa':'#440154', baixa:'#3b528b', media:'#21918c',
    moderada:'#21918c', alta:'#5ec962', 'muito alta':'#fde725'};
  if (cores[classe]) return cores[classe];
  // Classes adicionais mantêm a mesma cor, independentemente da seleção e da superfície.
  const hash = [...classe].reduce((n,c) => (n*31+c.codePointAt(0)) >>> 0, 0);
  return `hsl(${hash%360} 60% 40%)`;
}

export function corIndice(valor) {
  if (valor === null) return '#808080';
  const cores = ['440154','3b528b','21918c','5ec962','fde725'];
  const posicao = valor * (cores.length-1), inicio = Math.min(Math.floor(posicao), cores.length-2);
  const fracao = posicao-inicio;
  return '#' + [0,2,4].map(i => Math.round(
    parseInt(cores[inicio].slice(i,i+2),16)*(1-fracao) + parseInt(cores[inicio+1].slice(i,i+2),16)*fracao,
  ).toString(16).padStart(2,'0')).join('');
}

const chaveFeicao = item => JSON.stringify([item.base_id,item.id]);
const chaveDemanda = item => JSON.stringify([item.entradaId,item.demandaChave]);

export function renderizarIndices({container, itens, entradas=[], selecionada, aoSelecionar}) {
  const posicoes = new Map([...container.querySelectorAll('.fv-grafico-superficie')].map(bloco => [bloco.dataset.base, {
    esquerda:bloco.querySelector('.fv-intervalos-rolagem').scrollLeft,
    topo:bloco.querySelector('.fv-intervalos-rolagem').scrollTop,
  }]));
  const foco = container.contains(document.activeElement)
    ? {classe:document.activeElement.className,...document.activeElement.dataset} : null;
  container.replaceChildren();
  container.dataset.combinacoes = String(itens.length);
  container.dataset.escalaMin = '0'; container.dataset.escalaMax = '1';
  const cor = item => corClasse(item.favorabilidade);
  const porDemanda = new Map();
  for (const item of itens) {
    const chave = chaveDemanda(item);
    if (!porDemanda.has(chave)) porDemanda.set(chave, {itens:[]});
    porDemanda.get(chave).itens.push(item);
  }
  const superficies = new Map();
  for (const entrada of entradas) for (const base of entrada.campos) {
    if (!superficies.has(base.id)) superficies.set(base.id, []);
  }
  for (const item of itens) {
    if (!superficies.has(item.base_id)) superficies.set(item.base_id, []);
    superficies.get(item.base_id).push(item);
  }
  for (const [base, combinacoes] of superficies) {
    const bloco = el('section', undefined, 'fv-grafico-superficie');
    bloco.dataset.base = base;
    const fonte = entradas.flatMap(e => e.campos).find(c => c.id === base);
    bloco.append(el('h4', `Índices de Favorabilidade Territorial Dimensionada - ${(fonte?.papel || combinacoes[0].papel) === 'grade' ? 'Municípios' : 'Rede Rodoviária'}`));
    const observacoes = el('div',undefined,'fv-grafico-observacoes');
    const demandas = new Map();
    for (const [entradaIndice,entrada] of entradas.entries()) {
      if (!entrada.campos.some(c => c.id === base)) continue;
      for (const linha of entrada.linhas) {
        const demanda = {tipo:'demanda',entradaIndice,entradaId:entrada.id,entradaNome:entrada.nome,
          demandaChave:linha.chave,demandaNome:nomeDemanda(linha),base_id:base,id:'',itens:[]};
        demandas.set(chaveDemanda(demanda),demanda);
      }
    }
    for (const item of combinacoes) {
      const chave = chaveDemanda(item);
      if (!demandas.has(chave)) demandas.set(chave,{...item,tipo:'demanda',id:'',itens:[]});
      demandas.get(chave).itens.push(item);
    }
    for (const demanda of demandas.values()) {
      demanda.demandaNome = nomeDemanda({nome:demanda.demandaNome, sobreposicoes:demanda.itens});
    }
    bloco.append(observacoes);
    container.append(bloco);
    const ordenadas = [...demandas.values()].sort((a,b) => compararDemandas(
      porDemanda.get(chaveDemanda(a)) || a, porDemanda.get(chaveDemanda(b)) || b));
    renderizarSuperficie({container:observacoes, demandas:ordenadas, selecionada, aoSelecionar, cor});
    const legenda = el('div',undefined,'fv-indices-legenda');
    legenda.setAttribute('role','group'); legenda.setAttribute('aria-label','Legenda das feições de origem');
    const demandaAtiva = [...demandas.values()].find(selecionada);
    const itensLegenda = demandaAtiva ? demandaAtiva.itens : combinacoes;
    legenda.setAttribute('aria-label', demandaAtiva
      ? `Feições de origem de ${demandaAtiva.demandaNome}` : 'Legenda das feições de origem');
    bloco.append(el('p', demandaAtiva ? `Legenda · ${demandaAtiva.demandaNome}`
      : 'Legenda · todas as demandas', 'fv-indices-legenda-titulo'));
    const feicoes = new Map();
    for (const item of itensLegenda) {
      const chave = chaveFeicao(item);
      if (!feicoes.has(chave)) feicoes.set(chave,[]);
      feicoes.get(chave).push(item);
    }
    for (const [chave,candidatos] of feicoes) {
      const item = candidatos.find(i => selecionada({...i,tipo:'demanda',id:''})) || candidatos[0];
      const botao = el('button',undefined,'fv-indices-legenda-item');
      botao.type = 'button'; botao.dataset.feicao = chave;
      botao.setAttribute('aria-pressed',String(candidatos.some(selecionada)));
      botao.title = `${item.baseNome} · ${item.nome} [${item.identificador}]`;
      const marca = el('span',undefined,'fv-indices-legenda-cor');
      marca.style.backgroundColor = cor(item); marca.setAttribute('aria-hidden','true');
      botao.append(marca,el('span',item.nome,'fv-indices-legenda-nome'));
      botao.onclick = () => aoSelecionar(item);
      legenda.append(botao);
    }
    if (!itensLegenda.length) legenda.append(el('p', 'Sem interseção para a demanda selecionada.', 'ea-hint'));
    bloco.append(legenda);
    container.append(bloco);
    const rolagem = observacoes.querySelector('.fv-intervalos-rolagem');
    rolagem.scrollLeft = posicoes.get(base)?.esquerda || 0;
    rolagem.scrollTop = posicoes.get(base)?.topo || 0;
  }
  if (foco) {
    const botao = [...container.querySelectorAll('button')].find(n => n.className === foco.classe && (
      foco.grupo ? n.dataset.grupo === foco.grupo
        : foco.sobreposicao ? n.dataset.sobreposicao === foco.sobreposicao
        : foco.feicao ? n.dataset.feicao === foco.feicao
          : n.dataset.demanda === foco.demanda && n.dataset.base === foco.base));
    (botao?.closest('.fv-grupo-escolhas')?.previousElementSibling || botao)?.focus({preventScroll:true});
  }
  if (!itens.length) container.append(el('p','Sem interseção; nenhum índice ou classe atribuído.','ea-hint'));
}

function renderizarSuperficie({container, demandas, selecionada, aoSelecionar, cor}) {
  const rolagem = el('div',undefined,'fv-intervalos-rolagem');
  const quadro = el('div',undefined,'fv-intervalos-quadro');
  const eixo = el('div',undefined,'fv-intervalo-eixo');
  eixo.setAttribute('aria-hidden','true');
  const escala = el('div',undefined,'fv-intervalo-escala');
  for (const valor of [0,.25,.5,.75,1]) {
    const marca = el('span',formatarIndice(valor));
    marca.style.left = `${valor*100}%`; escala.append(marca);
  }
  eixo.append(el('span','Demanda','fv-intervalo-cabecalho'),escala);
  quadro.append(eixo); rolagem.append(quadro); container.append(rolagem);
  for (const demanda of demandas) {
    const linha = el('div',undefined,'fv-intervalo-linha');
    linha.dataset.demanda = chaveDemanda(demanda);
    linha.classList.toggle('fv-demanda-ativa', selecionada(demanda));
    const nome = el('button',demanda.demandaNome,'fv-demanda-nome');
    nome.type = 'button'; nome.dataset.demanda = chaveDemanda(demanda); nome.dataset.base = demanda.base_id;
    nome.title = `${demanda.entradaNome} · ${demanda.demandaNome}`;
    nome.setAttribute('aria-pressed',String(selecionada(demanda)));
    nome.onclick = () => aoSelecionar(demanda);
    const conteudo = el('div',undefined,'fv-intervalo-conteudo');
    linha.append(nome,conteudo); quadro.append(linha);
    if (!demanda.itens.length) {
      conteudo.append(el('span','Sem interseção','fv-intervalo-sem-intersecao'));
      continue;
    }
    const validos = demanda.itens.filter(i => i.favorabilidade.estado_indice === 'valido');
    const trilha = el('div',undefined,'fv-intervalo-trilha');
    trilha.style.height = '64px';
    const guia = el('span', undefined, 'fv-intervalo-guia');
    guia.style.top = '32px';
    guia.setAttribute('aria-hidden', 'true');
    trilha.append(guia);
    if (validos.length) {
      const extremos = validos.reduce((r,i) => ({
        min:Math.min(r.min,i.favorabilidade.indice),max:Math.max(r.max,i.favorabilidade.indice),
      }),{min:1,max:0});
      if (extremos.max > extremos.min) {
        const faixa = el('span',undefined,'fv-intervalo-faixa');
        faixa.style.top = '32px';
        faixa.style.left = `${extremos.min*100}%`; faixa.style.width = `${(extremos.max-extremos.min)*100}%`;
        faixa.dataset.min = String(extremos.min); faixa.dataset.max = String(extremos.max);
        faixa.setAttribute('aria-hidden','true'); trilha.append(faixa);
      }
      conteudo.append(trilha);
    }
    // Agrupa colisões na largura real do eixo, sem empilhar ou deslocar pontos.
    const largura = trilha.getBoundingClientRect().width || 240;
    const grupos = [];
    for (const item of [...validos].sort((a,b) => a.favorabilidade.indice-b.favorabilidade.indice)) {
      const grupo = grupos.at(-1);
      if (grupo && (item.favorabilidade.indice-grupo.at(-1).favorabilidade.indice)*largura < 72) grupo.push(item);
      else grupos.push([item]);
    }
    const agrupados = new Set(grupos.filter(g => g.length > 1).flat());
    const escolhas = new Map();
    for (const grupo of grupos.filter(g => g.length > 1)) {
      const min = grupo[0].favorabilidade.indice, max = grupo.at(-1).favorabilidade.indice;
      const texto = min === max ? formatarIndice(min)
        : formatarIndice(min) === formatarIndice(max) ? `≈ ${formatarIndice(min)}`
          : `${formatarIndice(min)}–${formatarIndice(max)}`;
      const marcador = el('button', undefined, 'fv-intervalo-ponto fv-intervalo-grupo');
      marcador.type = 'button'; marcador.dataset.min = String(min); marcador.dataset.max = String(max);
      marcador.dataset.grupo = grupo[0].chave;
      marcador.style.left = `${(min+max)*50}%`; marcador.style.top = '32px';
      marcador.setAttribute('aria-label', `${grupo.length} feições: ${texto}. Abrir lista de valores.`);
      marcador.setAttribute('aria-expanded', 'false');
      marcador.setAttribute('aria-pressed', String(grupo.some(selecionada)));
      marcador.append(el('span', String(grupo.length), 'fv-grupo-contagem'), el('span', texto, 'fv-dot-valor'));
      const coresGrupo = [...new Set(grupo.map(cor))];
      const contagem = marcador.querySelector('.fv-grupo-contagem');
      contagem.style.background = coresGrupo.length === 1 ? coresGrupo[0]
        : `conic-gradient(${coresGrupo.map((c,i) => `${c} ${i/coresGrupo.length*100}% ${(i+1)/coresGrupo.length*100}%`).join(',')})`;
      const lista = el('div', undefined, 'fv-grupo-escolhas');
      lista.setAttribute('popover', 'auto');
      lista.append(el('strong', `${demanda.demandaNome} · ${grupo.length} feições`));
      lista.addEventListener('toggle', e => marcador.setAttribute('aria-expanded', String(e.newState === 'open')));
      marcador.onclick = () => lista.togglePopover();
      lista.onkeydown = e => { if (e.key === 'Escape') { lista.hidePopover(); marcador.focus(); } };
      for (const item of grupo) escolhas.set(item, lista);
      trilha.append(marcador, lista);
    }
    const problemas = el('div',undefined,'fv-intervalo-problemas');
    for (const item of [...demanda.itens].sort((a,b) => compararIndices(a.favorabilidade,b.favorabilidade))) {
      const valor = item.favorabilidade, valido = valor.estado_indice === 'valido';
      const botao = el('button',undefined,`fv-dot-linha ${agrupados.has(item) ? 'fv-grupo-opcao' : valido ? 'fv-intervalo-ponto' : 'fv-indice-invalido'}`);
      botao.type = 'button'; botao.dataset.sobreposicao = item.chave;
      botao.dataset.indice = valido ? String(valor.indice) : ''; botao.dataset.estado = valor.estado_indice;
      botao.dataset.feicao = chaveFeicao(item);
      botao.setAttribute('aria-pressed',String(selecionada(item)));
      const rotulo = `${demanda.demandaNome} · ${item.nome} [${item.identificador}] · ${item.entradaNome}`;
      botao.title = `${rotulo} · ${indiceTexto(valor)} · ${classeTexto(valor)}${item.area_m2 === 0 ? ' · Contato sem área' : ''}`;
      botao.setAttribute('aria-label',botao.title);
      const marca = el('span',undefined,'fv-intervalo-marca');
      marca.style.backgroundColor = cor(item); marca.setAttribute('aria-hidden','true');
      botao.append(marca,el('span',valido ? indiceTexto(valor) : `${item.nome}: ${indiceTexto(valor)}`,'fv-dot-valor'));
      botao.onclick = () => aoSelecionar(item);
      if (agrupados.has(item)) {
        botao.querySelector('.fv-dot-valor').textContent = `${item.nome} [${item.identificador}]: ${valor.indice.toLocaleString('pt-BR', {maximumFractionDigits:15})}`;
        escolhas.get(item).append(botao);
      } else if (valido) {
        const topo = 32;
        botao.style.left = `${valor.indice*100}%`; botao.style.top = `${topo}px`;
        trilha.append(botao);
      } else problemas.append(botao);
    }
    if (problemas.childElementCount) conteudo.append(problemas);
  }
}
