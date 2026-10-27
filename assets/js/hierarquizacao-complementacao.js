(function (global) {
  "use strict";
  const rotulos = {
    aceito_smtp: "Aceito pelo servidor SMTP (não comprova entrega)",
    erro: "Falha no envio", indeterminado: "Resultado do envio indeterminado",
    enviando: "Envio em andamento", sem_destinatario: "Sem destinatário cadastrado",
  };
  async function solicitar(codigo, host, descricao) {
    host.hidden = false;
    host.setAttribute("aria-busy", "true");
    host.textContent = `Solicitando complementação da hierarquização ${codigo}…`;
    try {
      const resultado = await HierApi.solicitarComplementacao(codigo, descricao);
      host.replaceChildren();
      const mensagem = document.createElement("p");
      mensagem.textContent = `Hierarquização ${codigo} — ${resultado.mensagem || "Solicitação processada. Confira os resultados por demanda."}`;
      host.append(mensagem);
      const lista = document.createElement("ul");
      for (const envio of resultado.envios || []) {
        const linha = document.createElement("li");
        linha.textContent = `${envio.demanda_codigo} — ${rotulos[envio.status] || envio.status}: ${envio.detalhe || "Sem detalhe informado."}`;
        lista.append(linha);
      }
      host.append(lista);
      const aviso = document.createElement("p");
      aviso.textContent = "Pedidos registrados permanecem salvos mesmo se o e-mail falhar. Aceitação SMTP não comprova entrega ao destinatário. Envios já aceitos, indeterminados ou em andamento não são reenviados ao repetir a solicitação.";
      host.append(aviso);
      return true;
    } catch (erro) {
      host.textContent = `Não foi possível confirmar o resultado da solicitação: ${erro.message}. O cadastro permanece salvo. Confira as pendências na Fase 3 antes de tentar novamente.`;
      return false;
    } finally { host.setAttribute("aria-busy", "false"); }
  }
  global.SLTComplementacaoHierarquizacao = {solicitar};
})(window);
