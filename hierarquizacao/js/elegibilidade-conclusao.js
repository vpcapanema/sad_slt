import {el} from '../../geoespacial/extracao-atributos/ui.js';
import {formatarHa, formatarPercentual} from './cinco-resultados_elegibilidade_v2-dados.js?v=2';

// A qualificação vem dos atributos consultados, nunca do nome da demanda.
export function conclusaoSobreposicao(demanda, item, camada, dados) {
  const campos = Object.fromEntries((dados?.campos || []).map(c => [c.campo, c.valor]));
  const texto = el('span', undefined, 'ev2-conclusao');
  const adicionar = t => texto.append(document.createTextNode(t));
  const destacar = t => texto.append(el('strong', String(t)));
  adicionar('A área de influência direta da demanda '); destacar(demanda.nome);
  if (item.area_m2 === 0) adicionar(' apresenta contato de limite, sem sobreposição de área, em relação ');
  else {
    adicionar(' sobrepõe-se, em aproximadamente '); destacar(`${formatarHa(item.area_m2)} hectares`);
    adicionar(' ('); destacar(formatarPercentual(item.percentual)); adicionar(' de sua área total), ');
  }
  if (campos.nome_bem_t && campos.modo_produ) {
    const modo = campos.modo_produ.trim();
    const influencia = modo.match(/^Área de Influência de (\d+(?:[.,]\d+)?) metros gerada a partir dos limites do Bem Tombado$/i);
    if (influencia) {
      adicionar('à área de influência de '); destacar(`${influencia[1]} metros`);
      adicionar(' gerada a partir dos limites do bem tombado '); destacar(campos.nome_bem_t);
    } else {
      adicionar('à área identificada como '); destacar(campos.nome_bem_t);
      adicionar(', cuja delimitação é descrita na base como “'); destacar(modo); adicionar('”');
    }
    adicionar(', conforme a camada '); destacar(camada.nome);
  } else if (campos.nome_uc) {
    adicionar('à '); destacar(campos.nome_uc);
    const atributos = [campos.esfera, campos.grupo].filter(Boolean).map(v => v.toLocaleLowerCase('pt-BR'));
    if (atributos.length) adicionar(`, unidade de conservação ${atributos.join(' de ')}`);
  } else {
    adicionar('à feição '); destacar(item.nome);
    adicionar(', identificada na camada '); destacar(camada.nome);
  }
  adicionar('.');
  return texto;
}
