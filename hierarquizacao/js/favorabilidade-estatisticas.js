import {nomeDemanda} from './nome-demanda.js?v=20261023-nomes';
import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {indiceTexto, classeTexto, compararIndices, compararDemandas, formatarIndice} from './favorabilidade-indices.js?v=20261023-classes-ordem';

const numero = valor => valor.toLocaleString('pt-BR', {maximumFractionDigits:15});
const rotulos = {
  media:'Média aritmética simples', mediana:'Mediana', moda:'Moda',
  amplitude:'Amplitude', variancia:'Variância populacional', desvio:'Desvio-padrão populacional',
  cv:'Coeficiente de variação (%)', iqr:'Intervalo interquartil',
  minimo:'Mínimo', q1:'Primeiro quartil (Q1)', q2:'Segundo quartil (Q2)',
  q3:'Terceiro quartil (Q3)', maximo:'Máximo', percentil:'Percentil',
};

export function calcularMedida(valores, medida, percentil=50) {
  if (!Object.hasOwn(rotulos,medida)) throw new Error('Medida estatística desconhecida.');
  if (valores.some(v => !Number.isFinite(v) || v < 0 || v > 1)) {
    throw new Error('A estatística exige índices numéricos válidos de 0 a 1.');
  }
  if (medida === 'percentil' && (!Number.isFinite(percentil) || percentil < 0 || percentil > 100)) {
    throw new Error('Informe um percentil numérico entre 0 e 100.');
  }
  if (!valores.length) return {valores:[],mensagem:'Sem índices válidos'};
  const ordem = [...valores].sort((a,b) => a-b), n = ordem.length;
  const quantil = p => {
    const posicao = (n-1)*p, inicio = Math.floor(posicao), fracao = posicao-inicio;
    return ordem[inicio] + (ordem[Math.min(inicio+1,n-1)]-ordem[inicio])*fracao;
  };
  const media = ordem.reduce((s,v) => s+v,0)/n;
  const variancia = ordem.reduce((s,v) => s+(v-media)**2,0)/n;
  let valor;
  switch (medida) {
    case 'media': valor = media; break;
    case 'mediana': case 'q2': valor = quantil(.5); break;
    case 'moda': {
      const frequencias = new Map();
      for (const v of ordem) frequencias.set(v,(frequencias.get(v) || 0)+1);
      const maior = [...frequencias.values()].reduce((a,b) => Math.max(a,b),0);
      if (maior === 1 && n > 1) return {valores:[],mensagem:'Sem moda (valores distintos)'};
      return {valores:[...frequencias].filter(([,f]) => f === maior).map(([v]) => v).sort((a,b) => b-a)};
    }
    case 'amplitude': valor = ordem[n-1]-ordem[0]; break;
    case 'variancia': valor = variancia; break;
    case 'desvio': valor = Math.sqrt(variancia); break;
    case 'cv':
      if (media === 0) return {valores:[],mensagem:'Indefinido (média zero)'};
      valor = Math.sqrt(variancia)/media*100; break;
    case 'iqr': valor = quantil(.75)-quantil(.25); break;
    case 'minimo': valor = ordem[0]; break;
    case 'q1': valor = quantil(.25); break;
    case 'q3': valor = quantil(.75); break;
    case 'maximo': valor = ordem[n-1]; break;
    case 'percentil': valor = quantil(percentil/100); break;
  }
  return {valores:[valor]};
}

export function renderizarAgregados({tabela, entrada, medida, percentil}) {
  const head = el('thead'), titulo = el('tr'), body = el('tbody');
  const rotulo = medida === 'percentil' ? `Percentil ${numero(percentil)}` : rotulos[medida];
  for (const nome of ['Demanda',
    `${medida ? rotulo : 'Índices de Favorabilidade Dimensionada'} · Municípios`,
    'Classes de Favorabilidade · Municípios',
    `${medida ? rotulo : 'Índices de Favorabilidade Dimensionada'} · Rede Rodoviária`,
    'Classes de Favorabilidade · Rede Rodoviária']) {
    const th = el('th',nome); th.scope = 'col'; titulo.append(th);
  }
  head.append(titulo);
  const bases = new Map(entrada.campos.map(c => [c.id,c.papel]));
  for (const linha of [...entrada.linhas].sort(compararDemandas)) {
    const tr = el('tr'); tr.dataset.chave = linha.chave;
    tr.append(el('td',nomeDemanda(linha)));
    for (const papel of ['grade','rede']) {
      const itens = linha.sobreposicoes.filter(s => bases.get(s.base_id) === papel)
        .sort((a,b) => compararIndices(a.favorabilidade,b.favorabilidade));
      const indice = el('td'), classe = el('td');
      indice.dataset.papel = papel; classe.dataset.classes = papel;
      if (!itens.length) {
        indice.textContent = 'Sem interseção'; classe.textContent = 'Sem classe atribuída';
      } else {
        const validos = itens.filter(s => s.favorabilidade.estado_indice === 'valido');
        if (medida) {
          const resultado = calcularMedida(validos.map(s => s.favorabilidade.indice),medida,percentil);
          indice.append(el('span',resultado.mensagem || resultado.valores.map(formatarIndice).join(' · ') +
            (medida === 'cv' ? '%' : ''),'fv-estatistica-valor'));
          indice.append(el('small',`${validos.length} de ${itens.length} índices válidos`,'evr-secundario'));
        } else {
          for (const [posicao,item] of itens.entries()) {
            if (posicao) indice.append(document.createTextNode(posicao === itens.length-1 ? ' e ' : ', '));
            const valor = el('span',indiceTexto(item.favorabilidade),'fv-valor-original');
            valor.title = `${item.nome} [${item.identificador}]`;
            indice.append(valor);
          }
        }
        for (const [posicao,item] of itens.entries()) {
          if (posicao) classe.append(document.createTextNode(posicao === itens.length-1 ? ' e ' : ', '));
          const valor = el('span',classeTexto(item.favorabilidade),'fv-valor-original');
          valor.title = `${item.nome} [${item.identificador}]`;
          classe.append(valor);
        }
      }
      tr.append(indice,classe);
    }
    body.append(tr);
  }
  tabela.dataset.medida = medida;
  tabela.replaceChildren(head,body);
}
