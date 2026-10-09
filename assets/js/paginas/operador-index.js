(function () {
  const $ = (id) => document.getElementById(id);

  async function getJson(path) {
    const response = await fetch(path, { credentials: "include" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function contarComplementacoes(items) {
    const registros = new Map();
    for (const item of items) {
      const total = Number(item.total_atributos || 0);
      const preenchidos = Number(item.atributos_preenchidos || 0);
      if (item.pode_editar && total > 0 && item.objeto_codigo) {
        const completo = preenchidos >= total;
        registros.set(item.objeto_codigo, (registros.get(item.objeto_codigo) ?? true) && completo);
      }
    }
    return { total: registros.size, concluidas: [...registros.values()].filter(Boolean).length };
  }

  async function carregarIndicadores() {
    const user = await window.SLTAdminAuth.requireAuth();
    if (!user) return;
    $("operator-home-title").textContent = `Bem-vindo, ${user.nome || "Operador"}`;

    const resultados = await Promise.allSettled([
      getJson("/api/painel/operador/estatisticas"),
      getJson("/api/complementacao/objetos"),
    ]);
    const avisos = [];

    if (resultados[0].status === "fulfilled") {
      const stats = resultados[0].value;
      $("stat-aprovadas").textContent = Number(stats.aprovadas).toLocaleString("pt-BR");
      $("stat-protocoladas").textContent = Number(stats.protocoladas).toLocaleString("pt-BR");
      $("stat-analises-concluidas").textContent = Number(stats.analises_concluidas).toLocaleString("pt-BR");
      $("stat-analises-total").textContent = Number(stats.analises_total).toLocaleString("pt-BR");
    } else {
      avisos.push("Não foi possível carregar o resumo dos seus protocolos.");
    }

    if (resultados[1].status === "fulfilled") {
      const complementacoes = contarComplementacoes(resultados[1].value);
      $("stat-complementacao").textContent = complementacoes.concluidas.toLocaleString("pt-BR");
      $("stat-complementacao-total").textContent = complementacoes.total.toLocaleString("pt-BR");
    } else {
      avisos.push("Não foi possível consultar a fila de complementação.");
    }

    if (avisos.length) {
      $("operator-stats-error").textContent = avisos.join(" ");
      $("operator-stats-error").hidden = false;
    }
  }

  carregarIndicadores().catch((error) => {
    console.error("Falha ao carregar indicadores do Operador", error);
    const aviso = $("operator-stats-error");
    if (aviso) {
      aviso.textContent = "Não foi possível carregar seus indicadores agora.";
      aviso.hidden = false;
    }
  });
})();
