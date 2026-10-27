import {post} from '../../geoespacial/extracao-atributos/api.js';

export function instalarRegistro({node, rota, payload, operar, informar, fase, podeRegistrar=()=>true}) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'ea-btn ea-btn-primary';
  botao.textContent = 'Registrar resultados da fase';
  botao.disabled = true;
  const orientacao = document.createElement('p');
  orientacao.className = 'ea-hint';
  orientacao.textContent = 'Processar, conferir e baixar os resultados não altera a hierarquização. Após a conferência, use Registrar resultados da fase para efetivar a gravação.';
  const acoes = node('registro-acoes');
  if (acoes) {
    botao.classList.remove('ea-btn-primary');
    const icone = document.createElement('i');
    icone.className = 'fas fa-floppy-disk'; icone.setAttribute('aria-hidden', 'true');
    botao.prepend(icone); acoes.append(botao);
  }
  else {
    node('download').before(orientacao);
    node('download').before(botao);
  }
  botao.onclick = () => operar(async () => {
    if (!podeRegistrar()) throw new Error('Escolha e salve a medida de agregação antes de registrar a fase.');
    const dados = payload();
    const previa = await post(`${rota}/registrar`, dados);
    if (previa.ja_registrado) {
      informar('Esta execução já está registrada. Nenhum resultado foi alterado.');
      return;
    }
    if (!await window.ProcessFeedback.confirmar({
      title: `Registrar resultados da fase ${fase}`,
      message: `Registrar ${previa.demandas} demanda(s) na hierarquização ${previa.hierarquizacao}?`,
      warning: `Os resultados anteriores desta fase serão substituídos. ${fase === 1 ? 'Os resultados da fase 3 e da síntese serão invalidados.' : 'A síntese será invalidada.'} O processamento não será repetido.`,
      confirmLabel: 'Registrar resultados da fase',
    })) return;
    await post(`${rota}/registrar`, {...dados, versao: previa.versao});
    informar(`Resultados da fase ${fase} registrados na hierarquização ${previa.hierarquizacao}, sem repetir o processamento.`);
  });
  return modelo => {
    botao.disabled = !podeRegistrar() || node('download').disabled || !modelo || modelo.concluidas !== modelo.previstas
      || !modelo.entradas?.length || modelo.entradas.some(e => !e.hierarquizacao)
      || new Set(modelo.entradas.map(e => e.hierarquizacao)).size !== 1;
  };
}
