const countStatuses = (items, statuses) =>
        items.filter((item) => statuses.has(item.status)).length;

      async function loadThemedStats() {
        const [demandas, planos, programas, objetos] = await Promise.all([
          SLTAdminApi.listDemandas(),
          SLTAdminApi.listPlanos().catch(() => []),
          SLTAdminApi.listProgramas().catch(() => []),
          SLTAdminApi.listObjetosAhp().catch(() => []),
        ]);
        const all = [...planos, ...programas, ...demandas, ...objetos];
        const setValue = (id, value) => {
          document.getElementById(id).textContent = value;
        };

        setValue("stat-demandas", all.length);
        setValue(
          "stat-analise",
          countStatuses(
            all,
            new Set([
              "rascunho",
              "em_analise",
              "aprovada",
              "reprovada",
              "analise_rascunho",
              "analise_em_avaliacao",
              "analise_aprovada",
              "analise_reprovada",
            ]),
          ),
        );
        setValue(
          "stat-aptas",
          countStatuses(
            all,
            new Set(["elegivel_ahp", "fila_hierarquizacao", "hierarq_apta"]),
          ),
        );
        setValue(
          "stat-hierarquizacao",
          countStatuses(
            all,
            new Set(["em_hierarquizacao", "hierarq_em_andamento"]),
          ),
        );
        setValue(
          "stat-finalizadas",
          countStatuses(all, new Set(["hierarquizado", "hierarq_finalizada"])),
        );
        setValue(
          "stat-publicadas",
          countStatuses(all, new Set(["hierarq_ranqueada"])),
        );
      }

      (async function initRestrictedIndex() {
        const user = await SLTAdminAuth.requireAuth();
        if (!user) return;
        await loadThemedStats();
      })().catch((error) => console.error(error));
