(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const queryCode = new URLSearchParams(location.search).get("codigo");
  let hierarquizacoes = [];
  const atual = () => hierarquizacoes.find((item) => item.codigo === $("fase-hierarquizacao").value);
  const operadorSintese = () => document.querySelector('input[name="operador-sintese"]:checked')?.value || "media_simples";

  function atualizarPesosSintese(chaveAlterada, valor) {
    const controles = [...document.querySelectorAll("[data-sintese-peso]")];
    const alvo = controles.find((item) => item.dataset.sintesePeso === chaveAlterada);
    if (!alvo) return;
    valor = Number.isFinite(valor) ? Math.max(0, Math.min(1, valor)) : 0;
    const outros = controles.filter((item) => item !== alvo);
    const valoresAtuais = outros.map((item) => Number(item.querySelector(".peso-sintese-numero").value));
    const somaOutros = valoresAtuais.reduce((soma, atual) => soma + atual, 0);
    const restante = 1 - valor;
    const novos = valoresAtuais.map((atual) => somaOutros > 0 ? restante * atual / somaOutros : restante / outros.length);
    const arredondados = novos.map((novoValor) => Number(novoValor.toFixed(3)));
    if (arredondados.length) arredondados[arredondados.length - 1] = Number((restante - arredondados.slice(0, -1).reduce((soma, atual) => soma + atual, 0)).toFixed(3));
    const aplicar = (item, novoValor) => {
      item.querySelector(".peso-sintese-numero").value = novoValor.toFixed(3);
      item.querySelector(".peso-sintese-barra").value = novoValor;
    };
    aplicar(alvo, valor);
    outros.forEach((item, indice) => aplicar(item, arredondados[indice]));
  }

  function renderAtributosAusentes(hierarquizacao) {
    const host = $("fase3-atributos-ausentes");
    if (!host) return;
    const objetos = window.AtributosObjetos?.atributosAusentes(hierarquizacao) || [];
    if (!objetos.length) {
      host.innerHTML = '<div class="fase-empty">A rodada não possui objetos.</div>';
      return;
    }
    const linhas = objetos.map((objeto) => {
      const ausentes = objeto.atributos.length
        ? `<ul class="fase3-ausentes-lista">${objeto.atributos.map((atributo) => `<li>${esc(atributo)}</li>`).join("")}</ul>`
        : '<span class="fase-status fase-status--ok">Nenhum atributo ausente</span>';
      return `<tr><td><strong>${esc(objeto.nome)}</strong><small>${esc(objeto.codigo)}</small></td><td>${ausentes}</td></tr>`;
    }).join("");
    host.innerHTML = `<h3>Atributos vazios por objeto</h3><div class="fase-table-wrap"><table class="fase-table fase3-ausentes-table"><thead><tr><th>Objeto de demanda</th><th>Atributos com valores vazios</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  function indicesObjeto(objeto) {
    const fase2 = objeto.hierarquizacao?.fase_2 || {};
    const dimensoes = fase2.valor_por_dimensao || {};
    let rede = fase2.indice_favorabilidade_rede ?? dimensoes.rede ?? null;
    let grade = fase2.indice_favorabilidade_grade ?? dimensoes.grade ?? null;
    if (rede == null && grade == null) grade = fase2.score_fase2 ?? null;
    return { rede, grade, prioridade: objeto.hierarquizacao?.fase_3?.score_fase3 ?? null };
  }

  function renderSintese(objetos) {
    const formatar = (valor) => Number.isFinite(valor) ? Number(valor).toFixed(4) : "—";
    const linhas = objetos.map((objeto) => {
      const cabecalho = objeto.cabecalho_objeto || {};
      const indices = indicesObjeto(objeto);
      return `<tr><td><strong>${esc(cabecalho.nome || "—")}</strong><small>${esc(cabecalho.codigo || "")}</small></td><td>${formatar(indices.rede)}</td><td>${formatar(indices.grade)}</td><td>${formatar(indices.prioridade)}</td></tr>`;
    }).join("");
    $("fase3-tabela-sintese").innerHTML = objetos.length ? `<table class="fase-table fase3-sintese-table"><thead><tr><th>Objeto de demanda</th><th>Índice de favorabilidade de rede</th><th>Índice de favorabilidade de grade</th><th>Índice de prioridade</th></tr></thead><tbody>${linhas}</tbody></table>` : '<div class="fase-empty">A rodada não possui objetos.</div>';
  }

  function restaurarConfiguracaoSintese(hierarquizacao) {
    const config = hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.sintese || {};
    const operador = config.operador || "media_simples";
    const opcao = document.querySelector(`input[name="operador-sintese"][value="${operador}"]`);
    if (opcao) opcao.checked = true;
    const valores = {
      rede: Number(config.peso_rede ?? 0.333),
      grade: Number(config.peso_grade ?? 0.333),
      prioridade: Number(config.peso_prioridade ?? 0.334),
    };
    document.querySelectorAll("[data-sintese-peso]").forEach((item) => {
      const valor = valores[item.dataset.sintesePeso];
      item.querySelector(".peso-sintese-numero").value = valor.toFixed(3);
      item.querySelector(".peso-sintese-barra").value = valor;
    });
    $("pesos-sintese").hidden = operador !== "media_ponderada";
  }

  async function render(hierarquizacao) {
    if (!hierarquizacao) return;
    await window.AtributosObjetos?.render(hierarquizacao);
    renderAtributosAusentes(hierarquizacao);
    const docs = hierarquizacao.dados_hierarquizacao?.objetos || [];
    renderSintese(docs);
    restaurarConfiguracaoSintese(hierarquizacao);
    const metric = (label, value) => `<div class="fase-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
    window.SLTResumoFase?.secao1($("fase-resumo"), hierarquizacao);
    const pontuados = docs.filter((objeto) => Number.isFinite(objeto.hierarquizacao?.fase_3?.score_fase3));
    const completos = docs.filter((objeto) => (objeto.hierarquizacao?.fase_3?.grau_completude_fase3 ?? 0) >= Number($("fase3-completude").value) / 100);
    $("fase3-indicadores").innerHTML = metric("Demandas da rodada", docs.length) + metric("Com score válido", pontuados.length) + metric("Completude atendida", completos.length) + metric("Bloqueadas/pendentes", docs.length - pontuados.length);
    const rows = docs.map((objeto) => {
      const fase = objeto.hierarquizacao?.fase_3 || {};
      const ausencias = [...(fase.atributos_ausentes || []), ...(fase.atributos_invalidos || [])];
      const valid = Number.isFinite(fase.score_fase3);
      return `<tr><td><strong>${esc(objeto.cabecalho_objeto.codigo)}</strong><br><small>${esc(objeto.cabecalho_objeto.nome || "")}</small></td><td>${valid ? Number(fase.score_fase3).toFixed(4) : "—"}</td><td>${esc(fase.ranking_fase3 ?? "—")}</td><td>${fase.grau_completude_fase3 == null ? "—" : `${(Number(fase.grau_completude_fase3) * 100).toFixed(0)}%`}</td><td>${ausencias.length ? esc(ausencias.join(", ")) : "—"}</td><td><span class="fase-status ${valid ? "fase-status--ok" : "fase-status--warn"}">${valid ? "Calculado" : "Pendente"}</span></td></tr>`;
    }).join("");
    $("fase3-resultados").innerHTML = docs.length ? `<table class="fase-table"><thead><tr><th>Demanda</th><th>Score</th><th>Posição</th><th>Completude</th><th>Pendências</th><th>Situação</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="fase-empty">A rodada não possui demandas.</div>';
    const report = hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.relatorios?.fase_3;
    const audit = $("fase3-auditoria");
    if (report) { audit.innerHTML = `<strong>Auditoria da execução</strong><pre>${esc(JSON.stringify(report, null, 2))}</pre>`; audit.classList.remove("hidden"); } else audit.classList.add("hidden");
  }

  function erro(error) {
    $("fase3-erro").textContent = error.message || error;
    $("fase3-erro").classList.remove("hidden");
  }

  async function init() {
    try {
      hierarquizacoes = await HierApi.listar();
      $("fase-hierarquizacao").innerHTML = '<option value="">Selecione…</option>' + hierarquizacoes
        .filter((item) => (item.dados_hierarquizacao?.cabecalho_grupo?.fases_a_executar || [1, 2, 3]).includes(3))
        .map((item) => `<option value="${esc(item.codigo)}">${esc(item.codigo)} — ${esc(item.nome)}</option>`).join("");
      if (queryCode) { $("fase-hierarquizacao").value = queryCode; await render(atual()); }
      $("fase-hierarquizacao").onchange = () => { render(atual()).catch(erro); };
      $("executar-fase3").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) return erro("Selecione a hierarquização.");
        try {
          const updated = await HierApi.executarFase3(hierarquizacao.codigo, {
            criterios: window.AtributosObjetos?.criteriosPayload() || [],
            modo_pesos: $("fase3-modo-pesos").value,
            completude_minima: Number($("fase3-completude").value) / 100,
            regra_ausentes: $("fase3-ausentes").value,
          });
          hierarquizacoes = hierarquizacoes.map((item) => item.codigo === updated.codigo ? updated : item);
          await render(updated);
        } catch (error) { erro(error); }
      };
      $("salvar-pesos-fase3").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) return erro("Selecione a hierarquização.");
        try {
          const updated = await HierApi.salvarPesosFase3(hierarquizacao.codigo, { criterios: window.AtributosObjetos?.criteriosPayload() || [] });
          hierarquizacoes = hierarquizacoes.map((item) => item.codigo === updated.codigo ? updated : item);
          await render(updated);
          window.SLTFeedback?.success("Pesos dos atributos salvos.", "Configuração salva");
        } catch (error) { erro(error); }
      };
      document.querySelectorAll('input[name="operador-sintese"]').forEach((input) => input.addEventListener("change", () => {
        $("pesos-sintese").hidden = operadorSintese() !== "media_ponderada";
      }));
      document.querySelectorAll(".peso-sintese-barra, .peso-sintese-numero").forEach((input) => input.addEventListener("input", () => {
        atualizarPesosSintese(input.closest("[data-sintese-peso]").dataset.sintesePeso, Number(input.value));
      }));
      $("sintetizar").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) return erro("Selecione a hierarquização.");
        try {
          const updated = await HierApi.sintetizar(hierarquizacao.codigo, {
            operador: operadorSintese(),
            peso_rede: Number($("peso-rede").value),
            peso_grade: Number($("peso-grade").value),
            peso_prioridade: Number($("peso-prioridade").value),
            incluir_restritos: false,
          });
          hierarquizacoes = hierarquizacoes.map((item) => item.codigo === updated.codigo ? updated : item);
          await render(updated);
          window.location.href = `/restrict/hierarquizacao/processos/ranking/?codigo=${encodeURIComponent(updated.codigo)}`;
        } catch (error) { erro(error); }
      };
    } catch (error) { erro(error); }
  }
  init();
})();
