/* Confirmação e acompanhamento da extração, com semáforo de estado.
   O verde só acende quando a execução termina; o vermelho traz o motivo da
   recusa, que antes ficava só na faixa do rodapé e passava despercebido. */
import { el } from './ui.js';

const LUZES = [
  ['vermelho', 'Erro'],
  ['amarelo', 'Em andamento'],
  ['verde', 'Concluído'],
];

function semaforo(estado, rotulo) {
  const caixa = el('div', undefined, 'ea-semaforo');
  caixa.setAttribute('role', 'img');
  caixa.setAttribute('aria-label', `Situação: ${rotulo}`);
  for (const [cor] of LUZES) {
    const luz = el('span', undefined, `ea-semaforo-luz ea-semaforo-${cor}`);
    if (cor === estado) luz.classList.add('is-acesa');
    caixa.append(luz);
  }
  return caixa;
}

function moldura(titulo, estado, rotulo) {
  const dialog = el('dialog', undefined, 'ea-tool-dialog ea-processo-dialog');
  const cabeca = el('header', undefined, 'ea-processo-head');
  const texto = el('div');
  const h2 = el('h2', titulo);
  h2.id = `ea-processo-titulo-${Math.random().toString(36).slice(2, 8)}`;
  dialog.setAttribute('aria-labelledby', h2.id);
  const situacao = el('p', rotulo, 'ea-processo-situacao');
  texto.append(h2, situacao);
  const luzes = semaforo(estado, rotulo);
  cabeca.append(luzes, texto);
  dialog.append(cabeca);
  document.body.append(dialog);
  return { dialog, cabeca, situacao, luzes, h2 };
}

/** Resumo do que será executado; resolve true quando o usuário confirma. */
export function confirmarExecucao(resumo) {
  return new Promise(resolve => {
    const { dialog, situacao } = moldura('Confirmar execução da extração', 'amarelo', 'Aguardando sua confirmação');
    situacao.textContent = 'Confira o que será processado antes de executar.';

    const lista = el('dl', undefined, 'ea-processo-resumo');
    lista.append(el('dt', 'Entrada'), el('dd', resumo.entrada));
    lista.append(el('dt', 'Geoprocesso'), el('dd', resumo.operacao));
    lista.append(el('dt', 'Bases'), el('dd', `${resumo.totalCamadas} camada(s) em ${resumo.categorias.length} categoria(s)`));
    dialog.append(lista);

    const grupos = el('div', undefined, 'ea-processo-grupos');
    for (const categoria of resumo.categorias) {
      const grupo = el('div', undefined, 'ea-processo-grupo');
      const cabeca = el('div', undefined, 'ea-processo-grupo-head');
      cabeca.append(el('strong', categoria.nome), el('span', String(categoria.camadas.length), 'ea-badge'));
      grupo.append(cabeca);
      for (const camada of categoria.camadas) grupo.append(el('p', camada.nome, 'ea-processo-camada'));
      grupos.append(grupo);
    }
    dialog.append(grupos);
    dialog.append(el('p', 'A extração recusa bases com geometria inválida. Nesse caso o motivo aparece aqui mesmo.', 'ea-processo-nota'));

    const rodape = el('div', undefined, 'ea-processo-footer');
    const cancelar = el('button', 'Cancelar', 'ea-btn');
    cancelar.type = 'button';
    const executar = el('button', 'Executar extração', 'ea-btn ea-btn-primary');
    executar.type = 'button';
    const fechar = valor => { dialog.close(); dialog.remove(); resolve(valor); };
    cancelar.addEventListener('click', () => fechar(false));
    executar.addEventListener('click', () => fechar(true));
    dialog.addEventListener('cancel', evento => { evento.preventDefault(); fechar(false); });
    rodape.append(cancelar, executar);
    dialog.append(rodape);
    dialog.showModal();
    executar.focus();
  });
}

/** Modal de acompanhamento: recebe as etapas tratadas e fecha por conta do usuário. */
export function acompanharExecucao() {
  const { dialog, situacao, luzes, cabeca } = moldura('Extração em andamento', 'amarelo', 'Processando');
  const registro = el('div', undefined, 'ea-processo-log');
  registro.setAttribute('role', 'log');
  registro.setAttribute('aria-live', 'polite');
  dialog.append(registro);

  const rodape = el('div', undefined, 'ea-processo-footer');
  const fechar = el('button', 'Fechar', 'ea-btn');
  fechar.type = 'button';
  fechar.disabled = true;
  const resultados = el('button', 'Ver resultados', 'ea-btn ea-btn-primary');
  resultados.type = 'button';
  resultados.hidden = true;
  rodape.append(fechar, resultados);
  dialog.append(rodape);
  dialog.showModal();

  let vistas = 0;
  const encerrar = () => { dialog.close(); dialog.remove(); };
  fechar.addEventListener('click', encerrar);
  // Enquanto processa, Esc não fecha: a janela é a única fonte do andamento.
  dialog.addEventListener('cancel', evento => { evento.preventDefault(); if (!fechar.disabled) encerrar(); });

  function acender(estado, rotulo) {
    luzes.replaceWith(semaforo(estado, rotulo));
    Object.assign(cabeca, {});
    situacao.textContent = rotulo;
    dialog.dataset.estado = estado;
  }
  function anotar(mensagem, hora, classe = '') {
    const linha = el('p', undefined, `ea-processo-etapa ${classe}`.trim());
    linha.append(el('time', hora), el('span', mensagem));
    registro.append(linha);
    registro.scrollTop = registro.scrollHeight;
  }
  const relogio = valor => {
    const data = valor ? new Date(valor) : new Date();
    return Number.isNaN(data.getTime()) ? '--:--:--' : data.toLocaleTimeString('pt-BR');
  };

  return {
    etapas(lista) {
      // Só as novas: o servidor devolve o histórico inteiro a cada consulta.
      for (const etapa of (lista || []).slice(vistas)) anotar(etapa.mensagem, relogio(etapa.em));
      vistas = Math.max(vistas, (lista || []).length);
    },
    concluir(mensagem, aoVerResultados) {
      acender('verde', 'Concluído');
      anotar(mensagem, relogio(), 'is-sucesso');
      fechar.disabled = false;
      if (aoVerResultados) {
        resultados.hidden = false;
        resultados.addEventListener('click', () => { encerrar(); aoVerResultados(); });
        resultados.focus();
      } else fechar.focus();
    },
    falhar(mensagem) {
      acender('vermelho', 'Não concluído');
      anotar(mensagem, relogio(), 'is-erro');
      fechar.disabled = false;
      fechar.focus();
    },
    fechado: () => !dialog.isConnected,
  };
}
