/* Desenhos do que cada algoritmo faz, ao lado do seletor em 1.3.
   SVG próprio (não copiamos material de terceiros), na convenção usual de manuais de
   SIG: entrada em azul, base em laranja, resultado destacado. Cada desenho tem
   <title>/<desc> para leitores de tela. */

const AZUL = '#1769aa';
const AZUL_CLARO = '#cfe3f3';
const LARANJA = '#d1701f';
const LARANJA_CLARO = '#f7e0cb';
const RESULTADO = '#8e2f8e';
const TEXTO = '#33566d';

function svg(titulo, descricao, conteudo) {
  return `<svg viewBox="0 0 250 92" role="img" aria-label="${titulo}" class="ea-diagrama">
  <title>${titulo}</title><desc>${descricao}</desc>
  <style>
    .rot { font: 600 7px "Segoe UI", Verdana, sans-serif; fill: ${TEXTO}; text-anchor: middle; }
    .seta { stroke: ${TEXTO}; stroke-width: 1.2; fill: none; marker-end: url(#pontaEa); }
  </style>
  <defs><marker id="pontaEa" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0 L8 4 L0 8 z" fill="${TEXTO}"/></marker></defs>
  ${conteudo}
</svg>`;
}

const entradaPoligono = (x, y) => `<rect x="${x}" y="${y}" width="46" height="34" rx="2"
  fill="${AZUL_CLARO}" stroke="${AZUL}" stroke-width="1.6"/>`;
const basePoligono = (x, y) => `<circle cx="${x}" cy="${y}" r="19" fill="${LARANJA_CLARO}"
  stroke="${LARANJA}" stroke-width="1.6"/>`;
const seta = x => `<path class="seta" d="M${x} 40 h16"/>`;
const rotulo = (x, y, texto) => `<text class="rot" x="${x}" y="${y}">${texto}</text>`;

/* Interseção: sobra só a área comum entre a entrada e a base. */
const INTERSECAO = svg('Interseção', 'A entrada e a base se sobrepõem; o resultado é apenas a parte comum às duas.', `
  ${entradaPoligono(8, 23)}${basePoligono(66, 40)}
  ${rotulo(37, 72, 'Entrada + base')}
  ${seta(96)}
  <g>
    <path d="M154 23 h46 v34 h-46 z" fill="none" stroke="${AZUL}" stroke-width="1" stroke-dasharray="3 2"/>
    <path d="M154 23 A19 19 0 0 0 154 57 z" fill="${RESULTADO}" fill-opacity=".55" stroke="${RESULTADO}" stroke-width="1.6"/>
    ${rotulo(177, 72, 'Só a parte comum')}
  </g>`);

/* Identidade: a entrada inteira, dividida em dentro e fora da base. */
const IDENTIDADE = svg('Identidade', 'A entrada é dividida pela base: a parte de dentro recebe os atributos da base e a parte de fora é mantida.', `
  ${entradaPoligono(8, 23)}${basePoligono(66, 40)}
  ${rotulo(37, 72, 'Entrada + base')}
  ${seta(96)}
  <g>
    <path d="M132 23 h46 v34 h-46 z" fill="${AZUL_CLARO}" stroke="${AZUL}" stroke-width="1.6"/>
    <path d="M178 23 A19 19 0 0 0 178 57 z" fill="${RESULTADO}" fill-opacity=".55" stroke="${RESULTADO}" stroke-width="1.6"/>
    ${rotulo(168, 72, 'Dentro e fora, separados')}
  </g>`);

/* Enriquecimento: um registro por feição da entrada, com os atributos da base. */
const ENRIQUECIMENTO = svg('Enriquecimento de atributos',
  'Cada feição da entrada conserva seu registro e recebe os atributos das bases que intersecta; nada da entrada se perde.', `
  <rect x="8" y="20" width="40" height="40" rx="2" fill="${LARANJA_CLARO}" stroke="${LARANJA}" stroke-width="1.4"/>
  <circle cx="20" cy="32" r="3.4" fill="${AZUL}"/><circle cx="36" cy="46" r="3.4" fill="${AZUL}"/>
  <circle cx="62" cy="30" r="3.4" fill="${AZUL}"/>
  ${rotulo(37, 72, 'Entrada sobre a base')}
  ${seta(78)}
  <g>
    <rect x="104" y="18" width="138" height="44" rx="2" fill="#fff" stroke="${RESULTADO}" stroke-width="1.4"/>
    <line x1="104" y1="30" x2="242" y2="30" stroke="${RESULTADO}" stroke-width="1"/>
    <line x1="104" y1="44" x2="242" y2="44" stroke="#dbe4ea" stroke-width="1"/>
    <line x1="146" y1="18" x2="146" y2="62" stroke="#dbe4ea" stroke-width="1"/>
    <line x1="196" y1="18" x2="196" y2="62" stroke="#dbe4ea" stroke-width="1"/>
    <text class="rot" x="125" y="27" style="fill:${RESULTADO}">feição</text>
    <text class="rot" x="171" y="27" style="fill:${RESULTADO}">base</text>
    <text class="rot" x="219" y="27" style="fill:${RESULTADO}">atributos</text>
    <text class="rot" x="125" y="40">1</text><text class="rot" x="171" y="40">sim</text><text class="rot" x="219" y="40">A, B…</text>
    <text class="rot" x="125" y="56">2</text><text class="rot" x="171" y="56">não</text><text class="rot" x="219" y="56">vazio</text>
    ${rotulo(173, 72, 'Um registro por feição da entrada')}
  </g>`);

export const DIAGRAMAS = {
  estatisticas: { nome: 'Enriquecimento sem recorte', svg: ENRIQUECIMENTO,
    resumo: 'Preserva todas as feições e geometrias da entrada. Todas as bases: atributos e correspondências preservados; cálculos opcionais por campo; sem interseção, valor vazio.' },
  intersection: { nome: 'Interseção (Intersect)', svg: INTERSECAO,
    resumo: 'Mantém apenas os pedaços em que a entrada e a base se sobrepõem. Uma linha por pedaço.' },
  identity: { nome: 'Identidade (Identity)', svg: IDENTIDADE,
    resumo: 'Divide a entrada pela base e mantém também o que ficou fora dela. Uma linha por pedaço.' },
  enriquecimento: { nome: 'Com recorte · Identity', svg: IDENTIDADE,
    resumo: 'Divide a demanda pela base de recorte, preservando as parcelas externas e o identificador original. Registros sem correspondência ficam com os campos vazios.' },
};

/* Desenha no <figure> do subcard 1.3; sem algoritmo escolhido, mostra o convite. */
export function renderDiagrama(host, algoritmo) {
  if(!host)return;
  for(const figure of host.querySelectorAll('[data-algoritmo]'))figure.hidden=figure.dataset.algoritmo!==(algoritmo||'');
}
