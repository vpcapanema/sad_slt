import {nomeDemanda} from './nome-demanda.js?v=20261023-nomes';

// Etapa de triagem: para cada demanda, informa se há restrição, risco ou se está livre de ambos.
// “Com restrição e risco” é uma situação (as duas ocorrem), não um quarto conceito.
export const CATEGORIAS = ['restricao', 'risco'];
export const ROTULOS = {restricao: 'Restrição', risco: 'Risco'};
export const CORES = {restricao: '#b42335', risco: '#c18b00'};
export const SITUACOES = {
  ambas: 'Com restrição e risco', restricao: 'Com restrição', risco: 'Com risco', livre: 'Livre de restrições e riscos',
};
export const ORDEM_SITUACOES = ['ambas', 'restricao', 'risco', 'livre'];
export const CORES_SITUACAO = {ambas: '#7a4a1d', restricao: '#b42335', risco: '#c18b00', livre: '#2aa358'};
export const FILTROS = {todas: 'Todas as situações', ...SITUACOES};
export const ORDENS = {area: 'Maior sobreposição → menor (ha)'};
const valorArea = item => Number.isFinite(item.area_m2) ? item.area_m2 : -Infinity;
export const porAreaDecrescente = (a, b) => valorArea(a) === valorArea(b) ? 0 : valorArea(a) > valorArea(b) ? -1 : 1;

export const formatarKm2 = m2 => m2 == null ? '—' : (m2 / 1e6).toLocaleString('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: m2 > 0 && m2 / 1e6 < .005 ? 12 : 2,
});
export const formatarHa = m2 => m2 == null ? '—' : (m2 / 1e4).toLocaleString('pt-BR', {
  minimumFractionDigits: 4, maximumFractionDigits: 4,
});
export const formatarPercentual = p => p == null ? '—' : `${p.toLocaleString('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: p > 0 && p < .01 ? 6 : 2,
})}%`;

export const COR_DEMANDA = '#243746';
const PALETA = ['#d1495b', '#007f73', '#8556b8', '#da7900', '#2677bd', '#c23888', '#65851b', '#a65b36'];
export const corSobreposicao = indice => PALETA[indice] ?? `hsl(${(indice * 137.508) % 360} 65% 42%)`;
export const nomeSobreposicao = item => [ROTULOS[item.papel ?? item.categoria], item.camada,
  item.nome ?? item.feicao ?? 'Área identificada',
  item.numero_poligono ? `${item.area_m2 > 0 ? 'trecho de sobreposição' : 'contato no limite'} ${item.numero_poligono}` : '',
].filter(Boolean).join(' · ');

const normalizar = texto => String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

/** Uma ficha por demanda, com o que foi encontrado em cada categoria. */
export function caracterizarDemandas(entrada) {
  const camadas = new Map(entrada.campos.map(c => [c.id, c.nome]));
  let indiceCor = 0;
  return entrada.linhas.map(original => {
    const linha = {...original, sobreposicoes: (original.poligonos_sobreposicao ?? original.sobreposicoes).map(item => ({...item, camada: camadas.get(item.base_id) ?? 'Camada de base não identificada', cor: corSobreposicao(indiceCor++)}))};
    const cats = {restricao: {feicoes: [], n: 0}, risco: {feicoes: [], n: 0}};
    for (const item of linha.sobreposicoes) {
      const cat = cats[item.papel];
      if (!cat) continue;
      cat.feicoes.push({...item, camada: camadas.get(item.base_id) ?? ''}); cat.n++;
    }
    const restricao = cats.restricao.n > 0, risco = cats.risco.n > 0;
    return {
      chave: linha.chave, id: linha.id, nome: nomeDemanda(linha), linha, total: linha.area_total_m2, cats,
      situacao: restricao && risco ? 'ambas' : restricao ? 'restricao' : risco ? 'risco' : 'livre',
    };
  });
}

/** 1 sem sobreposição com camadas de risco; 0 com a demanda inteira sobreposta. Espelha elegibilidade_sintese.indice_risco_ambiental. */
export const indiceRiscoAmbiental = (areaM2, totalM2) => totalM2 > 0 ? Math.max(0, Math.min(1, 1 - areaM2 / totalM2)) : 1;
export const formatarIndice = valor => valor.toLocaleString('pt-BR', {minimumFractionDigits: 4, maximumFractionDigits: 4});

/** Resumo da Elegibilidade: uma linha por demanda sem restrição (com risco ou livre), da mais à menos exposta ao risco. */
export function resumoElegibilidade(demandas) {
  return demandas.filter(d => !d.cats.restricao.n).map(d => {
    const riscos = [...d.cats.risco.feicoes].sort(porAreaDecrescente);
    const area = Math.min(d.total, d.linha.risco_area_m2 ?? riscos.reduce((soma, f) => soma + (f.area_m2 || 0), 0));
    return {chave: d.chave, demanda: d.nome, camadas: [...new Set(riscos.map(f => f.camada))], area_m2: area,
      percentual: d.total > 0 ? area / d.total * 100 : 0, indice: indiceRiscoAmbiental(area, d.total)};
  }).sort((a, b) => a.indice - b.indice || a.demanda.localeCompare(b.demanda, 'pt-BR', {numeric: true}));
}

export function indicadores(demandas, entrada) {
  const por = Object.fromEntries(ORDEM_SITUACOES.map(s => [s, demandas.filter(d => d.situacao === s).length]));
  return {total: demandas.length, ...por, camadas: entrada.campos.length};
}

function listarNomes(feicoes, limite = 3) {
  const nomes = [...new Set([...feicoes].sort(porAreaDecrescente).map(f => f.nome))];
  return nomes.length <= limite ? nomes.join('; ') : `${nomes.slice(0, limite).join('; ')} e mais ${nomes.length - limite}`;
}

/** Resposta em linguagem corrente: o que a demanda tem (ou não tem) nas camadas consultadas. */
export function descreverSituacao(ficha, limite = 3) {
  if (ficha.situacao === 'livre') {
    return [{categoria: 'livre', texto: 'Livre de restrições e riscos nas camadas consultadas.'}];
  }
  const rotulo = {restricao: ['restrição', 'restrições'], risco: ['risco', 'riscos']};
  return CATEGORIAS.filter(c => ficha.cats[c].n).sort((a, b) =>
    Math.max(...ficha.cats[b].feicoes.map(valorArea)) - Math.max(...ficha.cats[a].feicoes.map(valorArea))).map(c => {
    const n = new Set(ficha.cats[c].feicoes.map(f => f.feicao_origem_id ?? f.id)).size;
    return {categoria: c, texto: n === 1 ? `Tem ${rotulo[c][0]}: ${listarNomes(ficha.cats[c].feicoes, limite)}.`
      : `Tem ${n} ${rotulo[c][1]}: ${listarNomes(ficha.cats[c].feicoes, limite)}.`};
  });
}

export function ordenarDemandas(demandas) {
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR', {numeric: true});
  const maior = d => Math.max(-Infinity, ...d.linha.sobreposicoes.map(valorArea));
  return [...demandas].sort((a, b) => porAreaDecrescente({area_m2: maior(a)}, {area_m2: maior(b)}) || porNome(a, b));
}

export function demandasVisiveis(demandas, {texto = '', situacao = 'todas'} = {}) {
  const busca = normalizar(texto).trim();
  return new Set(demandas.filter(d => (situacao === 'todas' || d.situacao === situacao)
    && (!busca || normalizar(d.nome).includes(busca) || normalizar(d.id).includes(busca))).map(d => d.chave));
}

/** Formato longo: uma linha por demanda × item encontrado (ou uma linha “livre”). */
export function registrosDetalhados(demandas, entrada) {
  const bases = new Map(entrada.campos.map(c => [c.id, c]));
  return demandas.flatMap(d => d.linha.sobreposicoes.length
    ? [...d.linha.sobreposicoes].sort(porAreaDecrescente).map(s => ({
      chave: d.chave, demanda: d.nome, situacao: d.situacao, categoria: s.papel, base_id: s.base_id,
      camada: bases.get(s.base_id)?.nome ?? '', feicao_id: s.id, feicao: s.nome, identificador: s.identificador,
      numero_poligono: s.numero_poligono, cor: s.cor,
      area_m2: s.area_m2, percentual: s.percentual, sem: false,
    }))
    : [{chave: d.chave, demanda: d.nome, situacao: d.situacao, sem: true}]).sort(porAreaDecrescente);
}

const vazia = {chave: '', base: '', feicao: ''};
export const SELECAO_VAZIA = vazia;

/** Alterna a seleção: repetir o mesmo item volta à demanda; repetir a demanda limpa a seleção. */
export function alternarSelecao(atual, nova) {
  const feicao = nova.feicao || '';
  if (atual.chave === nova.chave && atual.feicao === feicao) {
    return feicao ? {chave: nova.chave, base: '', feicao: ''} : vazia;
  }
  return {chave: nova.chave, base: feicao ? nova.base || '' : '', feicao};
}

export function registrosVisiveis(registros, {visiveis, categorias, selecao}) {
  return registros.filter(r => visiveis.has(r.chave)
    && (!selecao.chave || r.chave === selecao.chave)
    && (!selecao.feicao || r.feicao_id === selecao.feicao)
    && (r.sem || categorias.has(r.categoria)));
}
