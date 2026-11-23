import {base} from '../../geoespacial/extracao-atributos/api.js';

export async function exportarPacoteAnalise(rota, dados, informar) {
  const gerar = 'Preparar o pacote';
  const baixar = 'Iniciar download';
  const processo = window.ProcessFeedback.iniciarCadastro({
    title: 'Baixar os arquivos da análise', tasks: [gerar, baixar],
  });
  const url = `${base}${rota}/pacote`;
  const preparacao = 'Gerando o relatório, as tabelas e as camadas da análise no Storage…';
  informar(preparacao);
  processo.tarefaAtual(gerar, preparacao);
  try {
    const resposta = await fetch(url, {
      method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(dados),
    });
    if (!resposta.ok) {
      if (window.SicardApiErro) throw await window.SicardApiErro.deResposta(resposta, {method: 'POST', url});
      const corpo = await resposta.json().catch(() => null);
      const erro = new Error(typeof corpo?.detail === 'string' ? corpo.detail :
        `O servidor não conseguiu gerar o pacote (HTTP ${resposta.status}).`);
      erro.status = resposta.status;
      throw erro;
    }
    if (!resposta.headers.get('content-type')?.includes('application/zip')) {
      throw new Error('O servidor não retornou um pacote ZIP.');
    }
    processo.concluirTarefa(gerar);
    processo.tarefaAtual(baixar, 'Recebendo o arquivo ZIP para entregar ao navegador.');
    const arquivo = await resposta.blob();
    if (!arquivo.size) throw new Error('O servidor retornou um pacote ZIP vazio.');
    const endereco = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    link.href = endereco;
    link.download = 'Relatório e Camadas.zip';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(endereco), 30000);
    processo.concluirTarefa(baixar);
    const mensagem = 'Pacote gravado no Storage. Download do relatório, das tabelas e das camadas iniciado.';
    informar(mensagem);
    processo.sucesso({title: 'Download iniciado', message: mensagem});
  } catch (erro) {
    const mensagem = erro instanceof TypeError ? 'A conexão com o servidor foi interrompida durante a exportação.' :
      erro.message;
    informar(mensagem);
    processo.erro({title: 'Não foi possível baixar os arquivos da análise', message: mensagem, status: erro.status});
  }
}
