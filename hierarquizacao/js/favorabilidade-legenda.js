import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {classeTexto, corClasse} from './favorabilidade-indices.js?v=20261023-classes-ordem';

const normalizar = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
const ordem = new Map([['muito baixa',0],['baixa',1],['media',2],['moderada',2],['alta',3],['muito alta',4]]);

export function renderizarLegendaFavorabilidade(container, valores) {
  const classes = [...new Set(valores.filter(v => v.estado_classe === 'valido').map(classeTexto))];
  const nomes = classes.map(normalizar);
  const central = nomes.includes('moderada') && !nomes.includes('media') ? 'Moderada' : 'Média';
  const conhecidas = ['Muito Baixa', 'Baixa', central, 'Alta', 'Muito Alta'];
  const outras = classes.filter(c => !ordem.has(normalizar(c))).sort((a,b) => a.localeCompare(b, 'pt-BR', {numeric:true}));
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Legenda do mapa de favorabilidade');
  container.replaceChildren(el('h4', 'Legenda · classes de favorabilidade'),
    el('p', 'Menor → maior favorabilidade', 'fv-legenda-sentido'));
  function lista(itens, classeLista) {
    const ul = el('ul', undefined, classeLista);
    for (const classe of itens) {
      const li = el('li', undefined, 'fv-legenda-classe'), marca = el('i');
      marca.setAttribute('aria-hidden', 'true');
      marca.style.backgroundColor = corClasse({classe,estado_classe:'valido'});
      li.append(marca, el('span', classe)); ul.append(li);
    }
    container.append(ul);
  }
  lista(conhecidas, 'fv-legenda-escala');
  if (outras.length) {
    container.append(el('p', 'Outras classes da fonte (sem ordem de favorabilidade definida)', 'fv-legenda-sentido'));
    lista(outras, 'fv-legenda-outras');
  }
  const simbolos = el('div', undefined, 'fv-legenda-simbolos');
  for (const [classe, texto] of [['fv-legenda-demanda','Contorno da demanda'],['fv-legenda-ausente','Classe ausente ou inválida']]) {
    const item = el('span'), marca = el('i', undefined, classe);
    marca.setAttribute('aria-hidden', 'true'); item.append(marca, document.createTextNode(texto)); simbolos.append(item);
  }
  container.append(simbolos);
}
