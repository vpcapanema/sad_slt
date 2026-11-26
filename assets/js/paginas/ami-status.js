(() => {
  "use strict";

  const rotulosPorTom = {
    sucesso: [
      "Consolidado", "Disponível", "Disponíveis", "Homologada", "Resposta enviada",
      "Consistente", "Enviado", "Entregue", "Lido", "Aceito pelo servidor de e-mail",
      "Aceito pelo servidor SMTP",
    ],
    pendencia: [
      "Pendente", "Pendentes", "Não iniciada", "Em preenchimento", "Convite não enviado",
      "Não enviado", "Aguardando salvar", "Resultado pendente", "Resultado indeterminado",
      "Envio sem confirmação", "Sem confirmação", "Entrega adiada",
      "Recusado temporariamente pelo destinatário", "Vazias",
    ],
    falha: [
      "Encerrado", "Inconsistente", "Falha no envio", "Devolvido", "Cancelado",
      "Coleta encerrada", "Fora da agenda", "Notificações desativadas",
    ],
    espera: [
      "Aberto", "Inscrito", "Convite enviado", "Link acessado", "Aguardando resposta",
      "Aguardando envio", "Agendado", "Em envio",
    ],
  };
  const tons = new Map(Object.entries(rotulosPorTom).flatMap(([tom, rotulos]) => rotulos.map(rotulo => [rotulo, tom])));
  const classificar = rotulo => tons.get(String(rotulo ?? "").split(" · ")[0]) || "neutro";

  window.SicardAhpStatus = {
    atributo(rotulo) { return ' data-ami-status="' + classificar(rotulo) + '"'; },
    aplicar(elemento, rotulo, tom) {
      elemento.dataset.amiStatus = tom || classificar(rotulo);
    },
  };
})();
