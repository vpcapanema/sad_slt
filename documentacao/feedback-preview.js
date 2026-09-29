(() => {
  "use strict";

  let demoTimer;
  const stopDemo = () => {
    clearTimeout(demoTimer);
    demoTimer = undefined;
  };
  document.querySelector("#pfsProgressClose").addEventListener("click", stopDemo);

  const successResult = {
    actionTitle: "Importação de camadas",
    title: "Importação concluída",
    message: "As camadas selecionadas foram importadas.",
    summary: [{ label: "Camadas", value: "3" }, { label: "Geometrias", value: "128" }],
    subprocesses: [
      { name: "Importar camadas", status: "success", detail: "Arquivos e geometrias lidos" },
      { name: "Validar camadas", status: "success", detail: "Dados consistentes" },
      { name: "Preparar dados", status: "success", detail: "Dados prontos para análise" },
    ],
  };
  const examples = {
    success: () => StatusFeedback.sucesso(successResult),
    partial: () => StatusFeedback.parcial({
      actionTitle: "Importação de camadas",
      title: "Concluída com ressalvas",
      message: "Parte das camadas requer revisão antes da homologação.",
      subprocesses: [
        { name: "Camada territorial A", status: "success", detail: "Importada" },
        { name: "Camada territorial B", status: "warning", detail: "Verifique o sistema de referência" },
      ],
    }),
    error: () => StatusFeedback.erro({
      actionTitle: "Validação do pacote",
      title: "Não foi possível processar",
      message: "O pacote de demonstração contém um campo obrigatório ausente.",
      errors: [{ loc: ["body", "camada"], msg: "campo obrigatório" }],
      solution: "Revise o campo indicado e tente novamente.",
    }),
    confirm: () => ProcessFeedback.confirmar({
      title: "Confirmar processamento",
      message: "Deseja iniciar a extração dos atributos selecionados?",
      confirmLabel: "Iniciar",
    }),
    danger: () => ProcessFeedback.confirmar({
      title: "Confirmar ação crítica",
      message: "Esta é uma prévia visual. Nenhum registro será alterado.",
      warning: "Em uma operação real, confira os dados antes de continuar.",
      confirmLabel: "Confirmar",
      danger: true,
    }),
    input: () => ProcessFeedback.confirmar({
      title: "Nome da análise",
      message: "Informe um nome ilustrativo para esta demonstração.",
      input: { label: "Nome", placeholder: "Exemplo de análise" },
    }),
    manager: () => ProcessFeedback.confirmarGestor({
      message: "Prévia visual da confirmação de gestor. Não digite uma senha real.",
    }),
    admin: () => ProcessFeedback.confirmarAdmin({
      message: "Prévia visual da confirmação de administrador. Não digite uma senha real.",
    }),
    progress: () => {
      stopDemo();
      const stages = [
        {
          name: "Importando as camadas",
          activities: [
            "Extraindo os arquivos do pacote...",
            "Identificando os arquivos extraídos...",
            "Identificando o CRS da camada...",
            "Lendo as geometrias...",
          ],
        },
        {
          name: "Validando as camadas",
          activities: [
            "Conferindo os campos obrigatórios...",
            "Verificando a integridade das geometrias...",
          ],
        },
        {
          name: "Preparando os dados para análise",
          activities: [
            "Organizando as camadas selecionadas...",
            "Consolidando os dados da demonstração...",
          ],
        },
      ];
      let process;
      const onCancel = async () => {
        stopDemo();
        process.confirmarCancelamento("Demonstração cancelada.");
        process.fechar();
      };
      process = ProcessFeedback.iniciarCadastro({
        title: "Importação de camadas",
        tasks: stages.map((stage) => stage.name),
        onCancel,
        cancelButtonLabel: "Cancelar",
      });
      let stageIndex = 0;
      const nextStage = () => {
        const stage = stages[stageIndex];
        if (!stage) {
          process.sucesso(successResult);
          return;
        }
        process.tarefaAtual(stage.name);
        process.progressoTarefa(0, 0, stage.activities.length, "atividades");
        let activityIndex = 0;
        const nextActivity = () => {
          process.log(stage.activities[activityIndex], "info");
          demoTimer = setTimeout(() => {
            activityIndex++;
            process.progressoTarefa(activityIndex / stage.activities.length * 100,
              activityIndex, stage.activities.length, "atividades");
            if (activityIndex < stage.activities.length) {
              nextActivity();
            } else {
              process.concluirTarefa(stage.name);
              process.progressoTarefa(100, activityIndex, stage.activities.length, "atividades");
              stageIndex++;
              nextStage();
            }
          }, 2500);
        };
        nextActivity();
      };
      nextStage();
    },
  };

  document.querySelectorAll("[data-preview]").forEach((button) => {
    button.addEventListener("click", () => {
      stopDemo();
      ProcessFeedback.fechar();
      StatusFeedback.fechar();
      examples[button.dataset.preview]();
    });
  });
  examples.progress();
})();
