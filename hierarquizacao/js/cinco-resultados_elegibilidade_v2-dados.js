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
export const ORDENS = {situacao: 'Situação (restrições e riscos primeiro)', nome: 'Nome da demanda'};

export const formatarKm2 = m2 => m2 == null ? '—' : (m2 / 1e6).toLocaleString('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: m2 > 0 && m2 / 1e6 < .005 ? 12 : 2,
});
export const formatarHa = m2 => m2 == null ? '—' : (m2 / 1e4).toLocaleString('pt-BR', {
  minimumFractionDigits: 4, maximumFractionDigits: 4,
});
export const formatarPercentual = p => p == null ? '—' : `${p.toLocaleString('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: p > 0 && p < .01 ? 6 : 2,
})}%`;

const normalizar = texto => String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

/** Uma ficha por demanda, com o que foi encontrado em cada categoria. */
export function caracterizarDemandas(entrada) {
  const camadas = new Map(entrada.campos.map(c => [c.id, c.nome]));
  return entrada.linhas.map(linha => {
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

export function indicadores(demandas, entrada) {
  const por = Object.fromEntries(ORDEM_SITUACOES.map(s => [s, demandas.filter(d => d.situacao === s).length]));
  return {total: demandas.length, ...por, camadas: entrada.campos.length};
}

function listarNomes(feicoes, limite = 3) {
  const nomes = [...new Set(feicoes.map(f => f.nome))];
  return nomes.length <= limite ? nomes.join('; ') : `${nomes.slice(0, limite).join('; ')} e mais ${nomes.length - limite}`;
}

/** Resposta em linguagem corrente: o que a demanda tem (ou não tem) nas camadas consultadas. */
export function descreverSituacao(ficha, limite = 3) {
  if (ficha.situacao === 'livre') {
    return [{categoria: 'livre', texto: 'Livre de restrições e riscos nas camadas consultadas.'}];
  }
  const rotulo = {restricao: ['restrição', 'restrições'], risco: ['risco', 'riscos']};
  return CATEGORIAS.filter(c => ficha.cats[c].n).map(c => {
    const n = ficha.cats[c].n;
    return {categoria: c, texto: n === 1 ? `Tem ${rotulo[c][0]}: ${listarNomes(ficha.cats[c].feicoes, limite)}.`
      : `Tem ${n} ${rotulo[c][1]}: ${listarNomes(ficha.cats[c].feicoes, limite)}.`};
  });
}

export function ordenarDemandas(demandas, criterio = 'situacao') {
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR', {numeric: true});
  return [...demandas].sort((a, b) => criterio === 'nome' ? porNome(a, b)
    : ORDEM_SITUACOES.indexOf(a.situacao) - ORDEM_SITUACOES.indexOf(b.situacao) || porNome(a, b));
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
    ? [...d.linha.sobreposicoes].sort((a, b) => b.area_m2 - a.area_m2).map(s => ({
      chave: d.chave, demanda: d.nome, situacao: d.situacao, categoria: s.papel, base_id: s.base_id,
      camada: bases.get(s.base_id)?.nome ?? '', feicao_id: s.id, feicao: s.nome, identificador: s.identificador,
      area_m2: s.area_m2, percentual: s.percentual, sem: false,
    }))
    : [{chave: d.chave, demanda: d.nome, situacao: d.situacao, sem: true}]);
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
