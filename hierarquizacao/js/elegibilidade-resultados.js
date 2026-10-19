import {post, base} from '../../geoespacial/extracao-atributos/api.js';
import {el, numero} from '../../geoespacial/extracao-atributos/ui.js';

const rota = '/extracao-atributos/elegibilidade/resultados';
const papeis = {entrada:'Entrada', restricao:'Restrição', risco:'Risco'};
const ns = 'http://www.w3.org/2000/svg';
const data = valor => valor ? new Date(valor).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo'}) : 'Não informada';

function mapaSintese(mapa, nome) {
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${mapa.largura} ${mapa.altura}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Mapa-Síntese — ${nome}`);
  const adicionar = (tag, atributos, texto) => {
    const node = document.createElementNS(ns, tag);
    for (const [chave, valor] of Object.entries(atributos)) node.setAttribute(chave, String(valor));
    if (texto !== undefined) node.textContent = texto;
    svg.append(node);
    return node;
  };
  for (const forma of mapa.formas) {
    const d = forma.aneis.map(anel => anel.map(([x,y],i) => `${i?'L':'M'}${x},${y}`).join(' ') + ' Z').join(' ');
    adicionar('path', {d, fill:forma.intersecao?mapa.cor_intersecao:mapa.cor_ausencia,
      stroke:'#003b5a', 'stroke-width':.65, 'fill-rule':'evenodd'});
  }
  adicionar('text', {x:685,y:30,fill:'#003b5a','font-size':12}, 'N');
  adicionar('path', {d:'M690,70 L690,40 L686,46 M690,40 L694,46',fill:'none',stroke:'#003b5a'});
  adicionar('path', {d:'M25,382 L125,382',stroke:'#003b5a'});
  adicionar('text', {x:25,y:375,fill:'#003b5a','font-size':12}, `${numero(mapa.metros_escala)} m`);
  return svg;
}

export function criarResultados({avisar, aoOcupar}) {
  const node = id => document.getElementById(`ev-resultados-${id}`);
  const formulario = node('aliases');
  let pendentes = [], execucoes = [], fontes = [], modelo = null, pagina = 0, indice = 0;
  let ocupado = false, externo = false;
  const campos = new Map();
  const payload = () => ({execucoes, nomes:Object.fromEntries([...campos].map(([id,campo]) => [id,campo.value])),
    revisados:node('revisados').checked});

  function invalidar() {
    modelo = null;
    node('revisados').checked = false;
    node('conteudo').hidden = true;
    node('download').disabled = true;
    node('status').textContent = 'Revise os nomes e confirme a apresentação antes de exportar.';
  }
  function controles() {
    const bloqueado = ocupado || externo;
    formulario.querySelectorAll('input,button').forEach(campo => { campo.disabled = bloqueado; });
    node('download').disabled = bloqueado || !modelo;
    node('tentar').disabled = bloqueado;
    node('entrada').disabled = bloqueado;
    node('anterior').disabled = bloqueado || !modelo || pagina === 0;
    node('proxima').disabled = bloqueado || !modelo || (pagina+1)*50 >= modelo.entradas[indice].linhas.length;
  }
  async function operar(acao) {
    if (ocupado || externo) return;
    ocupado = true;
    aoOcupar(true);
    controles();
    try { await acao(); }
    catch (erro) { node('status').textContent = erro.message; avisar(erro.message, 'error'); }
    finally { ocupado = false; aoOcupar(false); controles(); }
  }
  async function carregar() {
    const dados = await post(`${rota}/preparar`, {execucoes});
    fontes = dados.fontes;
    campos.clear();
    const container = node('nomes');
    container.replaceChildren();
    for (const [i, fonte] of fontes.entries()) {
      const grupo = el('div', undefined, 'ea-field');
      const label = el('label', `${papeis[fonte.papel]} — Nome de Apresentação`);
      const campo = el('input');
      campo.id = `ev-alias-${i}`;
      campo.name = `alias-${i}`;
      campo.value = fonte.nome;
      campo.required = true;
      campo.maxLength = 160;
      label.htmlFor = campo.id;
      campo.oninput = invalidar;
      campos.set(fonte.id, campo);
      grupo.append(label, campo);
      container.append(grupo);
    }
    node('status').textContent = `${dados.concluidas} de ${dados.previstas} entrada(s) concluída(s). Revise os nomes de apresentação.`;
    formulario.hidden = false;
    node('tentar').hidden = true;
  }
  function tabela() {
    const entrada = modelo.entradas[indice];
    const tabela = node('tabela');
    const head = el('thead'), tr = el('tr');
    for (const nome of ['Identificador', 'Nome', ...entrada.campos.map(c => `${papeis[c.papel]} · ${c.nome} (m²)`)]) {
      const th = el('th', nome);
      th.scope = 'col';
      tr.append(th);
    }
    head.append(tr);
    const body = el('tbody');
    for (const linha of entrada.linhas.slice(pagina*50, (pagina+1)*50)) {
      const row = el('tr');
      for (const valor of [linha.id, linha.nome || '—', ...linha.areas_texto]) row.append(el('td', valor));
      body.append(row);
    }
    tabela.replaceChildren(head, body);
    node('pagina').textContent = `Página ${pagina+1} de ${Math.max(1,Math.ceil(entrada.linhas.length/50))} · ${entrada.feicoes} feições`;
    node('anterior').disabled = pagina === 0;
    node('proxima').disabled = (pagina+1)*50 >= entrada.linhas.length;
  }
  function entradaAtual() {
    const entrada = modelo.entradas[indice];
    pagina = 0;
    node('resumo').textContent = `${entrada.nome} · ${entrada.feicoes} feições · ${entrada.com_intersecao} com interseção · `
      + `${entrada.sem_intersecao} sem interseção · Concluída em ${data(entrada.concluido_em)}.`;
    const lista = node('fontes');
    lista.replaceChildren(...entrada.campos.map(c => el('li', `${papeis[c.papel]}: ${c.nome}`)));
    node('mapa').replaceChildren(mapaSintese(entrada.mapa, entrada.nome));
    node('nota-mapa').textContent = entrada.mapa.nota;
    tabela();
  }
  formulario.onsubmit = event => {
    event.preventDefault();
    if (!formulario.reportValidity()) return;
    operar(async () => {
      node('status').textContent = 'Conferindo as camadas gravadas e preparando os resultados…';
      const resposta = await post(`${rota}/visualizar`, payload());
      modelo = resposta;
      for (const fonte of modelo.fontes) campos.get(fonte.id).value = fonte.nome;
      node('entrada').replaceChildren(...modelo.entradas.map((entrada,i) => new Option(entrada.nome, String(i))));
      indice = 0;
      node('metodologia').textContent = modelo.metodologia;
      node('conteudo').hidden = false;
      entradaAtual();
      node('status').textContent = modelo.concluidas === modelo.previstas
        ? 'Resultados conferidos. O pacote inclui todas as linhas, independentemente da página exibida.'
        : `Resultados parciais: ${modelo.concluidas} de ${modelo.previstas} entradas. O PDF identificará essa condição.`;
    });
  };
  node('entrada').onchange = event => { indice = Number(event.target.value); entradaAtual(); };
  node('anterior').onclick = () => { pagina--; tabela(); };
  node('proxima').onclick = () => { pagina++; tabela(); };
  node('revisados').onchange = () => {
    if (!node('revisados').checked) { modelo = null; node('conteudo').hidden = true; controles(); }
  };
  node('tentar').onclick = () => operar(carregar);
  node('download').onclick = () => operar(async () => {
    node('status').textContent = 'Gerando o PDF completo, conferindo as geometrias e gravando o pacote no storage…';
    const response = await fetch(`${base}${rota}/pacote`, {method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload())});
    if (!response.ok) {
      const mensagem = await response.text();
      let erro;
      try { erro = JSON.parse(mensagem).detail; }
      catch { throw new Error(`Não foi possível gerar o pacote (HTTP ${response.status}). As camadas foram mantidas.`); }
      throw new Error(typeof erro === 'string' ? erro : 'O servidor recusou os dados do relatório.');
    }
    if (!response.headers.get('content-type')?.includes('application/zip'))
      throw new Error('O servidor não retornou um pacote ZIP. Nenhum download foi iniciado.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = el('a');
    link.href = url;
    link.download = 'Relatório e Camadas.zip';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    node('status').textContent = 'Pacote gravado no storage. Download do relatório PDF e das camadas iniciado.';
    avisar('Relatório completo e camadas disponíveis no pacote.', 'success');
  });
  return {
    atualizar(busy) { externo = busy; controles(); },
    iniciar() { pendentes = []; },
    adicionar(ident) { pendentes.push(ident); },
    async finalizar() {
      if (!pendentes.length) return;
      execucoes = [...pendentes];
      pendentes = [];
      invalidar();
      formulario.hidden = true;
      node('vazio').hidden = true;
      try { await carregar(); }
      catch (erro) {
        node('status').textContent = `As camadas foram produzidas, mas os resultados não puderam ser preparados: ${erro.message}`;
        node('tentar').hidden = false;
        avisar(node('status').textContent, 'error');
      }
    },
  };
}
