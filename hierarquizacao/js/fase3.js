(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const queryCode = new URLSearchParams(location.search).get("codigo");
  let hierarquizacoes = [];
  let atualizandoAoRetomar = false;
  let podeSolicitarComplementacao = false;
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

    const linhas = objetos.map((objeto) => {
      const pendencias = [
        ...objeto.atributos.map(atributo => `${atributo} — não informado; complementar Cadastro/Dinâmicos`),
        ...(objeto.invalidos || []).map(atributo => `${atributo} — valor inválido ou escala não configurada; conferir a tabela 2`),
        ...(objeto.riscos || []).map(atributo => `${atributo} — resultado ausente da Fase 1; não é preenchimento manual`),
      ];
      const ausentes = pendencias.length
        ? `<ul class="fase3-ausentes-lista">${pendencias.map((atributo) => `<li>${esc(atributo)}</li>`).join("")}</ul>`
        : '<span class="fase-status fase-status--ok">Nenhuma pendência na tabela 2</span>';
      return `<tr><td><strong>${esc(objeto.nome)}</strong><small>${esc(objeto.codigo)}</small></td><td>${ausentes}</td></tr>`;
    }).join("");
    host.innerHTML = `<table class="fase-table fase3-ausentes-table"><caption class="atributos-subsecao-caption"><div class="ahp-subsection-title"><span class="ahp-subsection-num">1</span><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><span>Pendências da tabela 2 por demanda</span></div></caption><thead><tr><th>Demanda</th><th>Atributos ausentes ou inválidos</th></tr></thead><tbody>${linhas || '<tr><td colspan="2">A rodada não possui objetos.</td></tr>'}</tbody></table>`;
  }

  function indicesObjeto(objeto, incluirPrioridade = true) {
    const fase2 = objeto.hierarquizacao?.fase_2 || {};
    const dimensoes = fase2.valor_por_dimensao || {};
    let rede = fase2.indice_favorabilidade_rede ?? dimensoes.rede ?? null;
    let grade = fase2.indice_favorabilidade_grade ?? dimensoes.grade ?? null;
    if (rede == null && grade == null) grade = fase2.score_fase2 ?? null;
    return { rede, grade, prioridade: incluirPrioridade ? objeto.hierarquizacao?.fase_3?.score_fase3 ?? null : null };
  }

  function renderSintese(objetos, incluirPrioridade) {
    const formatar = (valor) => Number.isFinite(valor) ? Number(valor).toFixed(4) : "—";
    const linhas = objetos.map((objeto) => {
      const cabecalho = objeto.cabecalho_objeto || {};
      const indices = indicesObjeto(objeto, incluirPrioridade);
      return `<tr><td>${esc(cabecalho.nome || "Nome não informado")}</td><td>${formatar(indices.rede)}</td><td>${formatar(indices.grade)}</td><td>${formatar(indices.prioridade)}</td></tr>`;
    }).join("");
    $("fase3-tabela-sintese").innerHTML = `<table class="fase-table fase3-sintese-table" aria-labelledby="fase3-sintese-titulo"><thead><tr><th>Objeto de demanda</th><th>Índice de favorabilidade de rede</th><th>Índice de favorabilidade territorial</th><th>Índice de prioridade</th></tr></thead><tbody>${linhas || '<tr><td colspan="4">A rodada não possui objetos.</td></tr>'}</tbody></table>`;
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
    document.querySelectorAll('[data-fase3-progressiva]').forEach(section => { section.hidden = true; });
    $("fase3-acao-calculo").hidden = true;
    $("fase3-regras-vazios").hidden = true;
    $("fase3-complementacao").hidden = true;
    $("fase-resumo").classList.add("hidden");
    $("fase-resumo").innerHTML = "";
    $("fase3-erro").classList.add("hidden");
    ["executar-fase3", "salvar-pesos-fase3", "sintetizar"].forEach(id => { $(id).disabled = true; });
    await window.AtributosObjetos.render(hierarquizacao);
    if (hierarquizacao !== atual()) return;
    if (!hierarquizacao) return;
    renderResultados(hierarquizacao, true);
    $("executar-fase3").disabled = false;
    $("salvar-pesos-fase3").disabled = false;
  }

  function renderResultados(hierarquizacao, restaurar = false) {
    document.querySelector('.secao-criterios-de-atributos').hidden = false;
    const aviso = $("fase3-resultados-aviso");
    const docs = hierarquizacao?.dados_hierarquizacao?.objetos || [];
    const pendencias = window.AtributosObjetos.atributosAusentes(hierarquizacao);
    $("fase3-regras-vazios").hidden = !pendencias.some(objeto =>
      objeto.atributos.length > 0 || objeto.riscos.length > 0);
    $("fase3-complementacao").hidden = !podeSolicitarComplementacao
      || !pendencias.some(objeto => objeto.atributos.length > 0);
    const coletaPendente = pendencias.some(objeto => objeto.atributos.length || objeto.invalidos.length)
      || docs.some(objeto => objeto.cabecalho_objeto?.complementacao_atributos?.concluida === false);
    const criteriosAlterados = docs.some(objeto => objeto.hierarquizacao?.fase_3?.executada)
      && window.AtributosObjetos.configuracaoAlterada(hierarquizacao);
    const resultadosDesatualizados = criteriosAlterados
      || docs.some(objeto => objeto.hierarquizacao?.fase_3?.desatualizado)
      || Boolean(hierarquizacao.relatorio_fase3?.desatualizado || hierarquizacao.relatorio_consolidado?.desatualizado
        || hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.relatorios?.fase_3?.desatualizado
        || hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.relatorios?.sintese?.desatualizado);
    const fases = hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.fases_a_executar || [1, 2, 3];
    const fase3Executada = docs.length > 0 && docs.every(objeto => objeto.hierarquizacao?.fase_3?.executada === true);
    const resultadoAtual = !coletaPendente && !resultadosDesatualizados && (!fases.includes(3) || fase3Executada);
    if ($("fase3-baixar-relatorio")) $("fase3-baixar-relatorio").disabled = !resultadoAtual || !fase3Executada;
    document.querySelector('.secao-ranking-do-ajuste-fino').hidden = !resultadoAtual;
    document.querySelector('.secao-sintese-final').hidden = !resultadoAtual;
    let pesosProntos = true;
    try { window.AtributosObjetos.configuracaoPayload(); } catch (_) { pesosProntos = false; }
    $("fase3-acao-calculo").hidden = !docs.length || !pesosProntos;
    const destinoCalculo = $("fase3-regras-vazios").hidden
      ? $("salvar-pesos-fase3").closest('.ahp-subcard')
      : $("fase3-regras-vazios").querySelector('.ahp-section-body');
    if (destinoCalculo && $("fase3-acao-calculo").parentElement !== destinoCalculo) {
      destinoCalculo.append($("fase3-acao-calculo"));
    }
    aviso.classList.add("hidden");
    aviso.textContent = "";
    $("sintetizar").disabled = !resultadoAtual;
    renderAtributosAusentes(hierarquizacao);
    renderSintese(docs, resultadoAtual);
    if (restaurar) restaurarConfiguracaoSintese(hierarquizacao);
    const metric = (label, value) => `<div class="fase-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`;
    window.SLTResumoFase?.secao1($("fase-resumo"), hierarquizacao);
    const pontuados = resultadoAtual ? docs.filter((objeto) => Number.isFinite(objeto.hierarquizacao?.fase_3?.score_fase3)) : [];
    const completos = resultadoAtual ? docs.filter((objeto) => (objeto.hierarquizacao?.fase_3?.grau_completude_fase3 ?? 0) >= Number($("fase3-completude").value) / 100) : [];
    $("fase3-indicadores").innerHTML = metric("Demandas da rodada", docs.length) + metric("Com índice de prioridade", pontuados.length) + metric("Pendentes na tabela 2", pendencias.filter(objeto => objeto.atributos.length || objeto.invalidos.length).length) + metric("Completude atual", completos.length);
    const rows = docs.map((objeto) => {
      const fase = objeto.hierarquizacao?.fase_3 || {};
      const ausencias = [...(fase.atributos_ausentes || []), ...(fase.atributos_invalidos || [])];
      const valid = resultadoAtual && Number.isFinite(fase.score_fase3);
      const calculoAtual = resultadoAtual && fase.executada === true;
      const posicao = valid && Number.isInteger(Number(fase.ranking_fase3)) && Number(fase.ranking_fase3) > 0 ? Number(fase.ranking_fase3) : null;
      return `<tr data-ranking-posicao="${posicao ?? ''}"><td class="fase3-indice-valor"><span class="ranking-posicao">${posicao ?? '—'}</span></td><td>${esc(objeto.cabecalho_objeto.nome || "Nome não informado")}</td><td class="ranking-indice">${valid ? Number(fase.score_fase3).toFixed(4) : "—"}</td><td>${calculoAtual && fase.grau_completude_fase3 != null ? `${(Number(fase.grau_completude_fase3) * 100).toFixed(0)}%` : "—"}</td><td class="ranking-situacao"><span class="fase-status ${valid ? "fase-status--ok" : "fase-status--warn"}">${calculoAtual ? valid ? "Calculado" : "Sem índice" : "Não calculado"}</span></td><td>${ausencias.length ? esc(ausencias.join(", ")) : "—"}</td></tr>`;
    }).join("");
    $("fase3-resultados").innerHTML = rows || '<tr><td colspan="6" class="fase-empty">A rodada não possui demandas.</td></tr>';
    ["fase3-atributos-ausentes", "fase3-tabela-sintese"].forEach(id => window.Fase3TableStandard?.($(id).querySelector("table")));
    window.Fase3TableStandard?.($("fase3-resultados").closest("table"));
    const report = hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.relatorios?.fase_3;
    const audit = $("fase3-auditoria");
    if (resultadoAtual) {
      const config = hierarquizacao.dados_hierarquizacao?.cabecalho_grupo?.configuracoes?.fase_3 || {};
      const regras = {renormalizar: 'Ignorar valores ausentes e redistribuir os pesos entre os disponíveis', bloquear: 'Bloquear demandas com atributos ausentes', imputar_neutro: 'Substituir valores ausentes por valor neutro', imputar_pior: 'Substituir valores ausentes pelo pior valor', imputar_medio: 'Substituir valores ausentes pela média'};
      const data = report?.executada_em ? new Date(report.executada_em) : null;
      const dataTexto = data && !Number.isNaN(data.getTime()) ? data.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'}) + ' (horário de Brasília)' : 'Não registrada';
      const regra = report?.regra_ausentes || config.regra_ausentes;
      const completude = report?.completude_minima ?? config.completude_minima;
      const fonte = config.fonte_pesos === 'ahp' ? 'AHP colaborativa' : config.fonte_pesos === 'manual' ? 'Preenchimento manual' : 'Não registrada';
      const pesos = docs.find(objeto => Object.keys(objeto.hierarquizacao?.fase_3?.pesos_fase3 || {}).length)?.hierarquizacao.fase_3.pesos_fase3 || {};
      const pesosTexto = Object.entries(pesos).map(([nome, peso]) => `<li><span>${esc(nome)}</span><strong>${esc(Number.isFinite(peso) ? peso.toLocaleString('pt-BR', {maximumFractionDigits: 4}) : 'Não registrado')}</strong></li>`).join('');
      const semIndice = docs.filter(objeto => !Number.isFinite(objeto.hierarquizacao?.fase_3?.score_fase3)).map(objeto => {
        const fase = objeto.hierarquizacao?.fase_3 || {};
        const motivos = [];
        if (fase.bloqueada_por_risco) motivos.push('bloqueada pela análise de risco');
        if (fase.bloqueada_por_atributo_obrigatorio) motivos.push('atributo obrigatório ausente ou inválido');
        if (fase.atributos_ausentes?.length) motivos.push('atributos ausentes: ' + fase.atributos_ausentes.join(', '));
        if (fase.atributos_invalidos?.length) motivos.push('atributos inválidos: ' + fase.atributos_invalidos.join(', '));
        if (Number.isFinite(completude) && Number.isFinite(fase.grau_completude_fase3) && fase.grau_completude_fase3 < completude) motivos.push('completude abaixo do mínimo exigido');
        return `<li><strong>${esc(objeto.cabecalho_objeto.nome || objeto.cabecalho_objeto.codigo)}</strong>: ${esc(motivos.join('; ') || 'motivo não registrado')}.</li>`;
      }).join('');
      audit.innerHTML = `<h3 class="fase3-titulo-tabela-simples">Resumo da execução</h3>
        <dl class="fase3-execucao-resumo">
          <div><dt>Calculado em</dt><dd>${esc(dataTexto)}</dd></div>
          <div><dt>Fonte dos pesos</dt><dd>${esc(fonte)}</dd></div>
          <div><dt>Tratamento dos valores ausentes</dt><dd>${esc(regras[regra] || 'Não registrado')}</dd></div>
          <div><dt>Completude mínima</dt><dd>${Number.isFinite(completude) ? esc((completude * 100).toLocaleString('pt-BR')) + '%' : 'Não registrada'}</dd></div>
        </dl>
        <h4>Critérios e pesos utilizados</h4>${pesosTexto ? `<ul class="fase3-execucao-pesos">${pesosTexto}</ul>` : '<p>Pesos não registrados no resultado deste cálculo.</p>'}
        <h4>Demandas sem índice</h4>${semIndice ? `<ul>${semIndice}</ul>` : '<p>Todas as demandas avaliadas receberam um índice.</p>'}
        ${report && Object.keys(report).length ? `<details class="fase3-detalhes-tecnicos"><summary>Detalhes técnicos</summary><pre>${esc(JSON.stringify(report, null, 2))}</pre></details>` : ''}`;
      audit.classList.remove('hidden');
    } else { audit.replaceChildren(); audit.classList.add('hidden'); }
  }

  async function atualizarDadosAoRetomar() {
    const selecionada = atual();
    if (!selecionada || atualizandoAoRetomar || document.hidden) return;
    atualizandoAoRetomar = true;
    try {
      const atualizada = await HierApi.obter(selecionada.codigo);
      hierarquizacoes = hierarquizacoes.map((item) =>
        item.codigo === atualizada.codigo ? atualizada : item
      );
      await render(atualizada);
    } catch (falha) {
      ["executar-fase3", "salvar-pesos-fase3", "sintetizar"].forEach(id => { $(id).disabled = true; });
      erro(new Error(`Não foi possível atualizar a rodada. Os dados exibidos podem estar desatualizados: ${falha.message}`));
    } finally {
      atualizandoAoRetomar = false;
    }
  }

  function erro(error) {
    $("fase3-erro").textContent = error.message || error;
    $("fase3-erro").classList.remove("hidden");
  }

  async function init() {
    try {
      const usuario = SLTAdminAuth.currentUser || await SLTAdminAuth.fetchMe();
      const botaoRelatorio = document.createElement("button");
      botaoRelatorio.id = "fase3-baixar-relatorio";
      botaoRelatorio.type = "button";
      botaoRelatorio.className = "btn btn--primary";
      botaoRelatorio.textContent = "Baixar relatório da Fase 3 (PDF)";
      botaoRelatorio.disabled = true;
      $("fase3-auditoria").after(botaoRelatorio);
      botaoRelatorio.onclick = async () => {
        const selecionada = atual();
        if (!selecionada) { exigirHierarquizacao(); return; }
        botaoRelatorio.disabled = true;
        try {
          const url = `/api/ahp/hierarquizacoes/${encodeURIComponent(selecionada.codigo)}/fases/3/relatorio.pdf`;
          const resposta = await fetch(url, { credentials: "same-origin" });
          if (!resposta.ok) {
            if (window.SicardApiErro) throw await window.SicardApiErro.deResposta(resposta, { method: "GET", url });
            throw new Error(`Não foi possível gerar o relatório da Fase 3 (HTTP ${resposta.status}).`);
          }
          const arquivo = URL.createObjectURL(await resposta.blob());
          const link = document.createElement("a");
          link.href = arquivo;
          link.download = "Relatorio_Fase_3.pdf";
          document.body.append(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(arquivo), 1000);
        } catch (falha) {
          erro(falha);
        } finally {
          botaoRelatorio.disabled = false;
        }
      };
      podeSolicitarComplementacao = ['ADMIN', 'ANALISTA', 'GESTOR'].includes(usuario?.tipo_usuario);
      $("fase3-complementacao").hidden = true;
      $("fase3-solicitar-complementacao").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) { exigirHierarquizacao(); return; }
        const descricao = $("fase3-complementacao-descricao").value.trim();
        if (!descricao) {
          $("fase3-complementacao-resultado").textContent = 'Informe a orientação aos responsáveis antes de solicitar.';
          $("fase3-complementacao-descricao").focus();
          return;
        }
        const button = $("fase3-solicitar-complementacao");
        button.disabled = true;
        try {
          if (!await ProcessFeedback.confirmar({
            title: 'Solicitar complementação de atributos',
            message: `Registrar pedidos para as demandas com atributos faltantes na hierarquização ${hierarquizacao.codigo} e tentar o envio de e-mail aos responsáveis? Pedidos persistem mesmo se o e-mail falhar.`,
            confirmLabel: 'Registrar e tentar envio', cancelLabel: 'Cancelar',
          })) return;
          await SLTComplementacaoHierarquizacao.solicitar(hierarquizacao.codigo, $("fase3-complementacao-resultado"), descricao);
        } finally { button.disabled = false; }
      };
      hierarquizacoes = await HierApi.listar();
      $("fase-hierarquizacao").innerHTML = '<option value="">Selecione…</option>' + hierarquizacoes
        .filter((item) => (item.dados_hierarquizacao?.cabecalho_grupo?.fases_a_executar || [1, 2, 3]).includes(3))
        .map((item) => `<option value="${esc(item.codigo)}">${esc(item.codigo)} — ${esc(item.nome)}</option>`).join("");
      if (queryCode) { $("fase-hierarquizacao").value = queryCode; await render(atual()); }
      $("fase-hierarquizacao").onchange = () => { render(atual()).catch(erro); };
      globalThis.addEventListener("focus", atualizarDadosAoRetomar);
      document.addEventListener("visibilitychange", atualizarDadosAoRetomar);
      document.addEventListener("atributos-pesos-alterados", () => { if (atual()) renderResultados(atual()); });
      /** Campo obrigatório: aviso do Notify e foco no seletor. */
      function exigirHierarquizacao() {
        window.Notify.warning("Hierarquização", "Selecione a hierarquização.");
        $("fase-hierarquizacao").focus();
      }
      /**
       * Confirmação → progresso → desfecho, no ProcessFeedback (SIGMA). O
       * sucesso só é anunciado depois que o servidor responde.
       */
      async function executarAcao({ confirmacao, titulo, mensagemInicial, executar, sucesso, irRanking }) {
        if (confirmacao && !(await window.ProcessFeedback.confirmar(confirmacao))) return { ok: false, cancelado: true };
        const tarefa = (mensagemInicial || "Enviando a solicitação ao servidor").replace(/…$/, "");
        const proc = window.ProcessFeedback.iniciarCadastro({ title: titulo, tasks: [tarefa] });
        proc.tarefaAtual(tarefa);
        try {
          const resultado = await executar();
          proc.concluirTarefa(tarefa, "Servidor respondeu");
          const [titulo1, ...resto] = [].concat(sucesso || "Operação concluída.");
          const subprocesses = irRanking ? [{
            name: "Ranking final", status: "success", detail: "Abra o ranking desta hierarquização.",
            action_label: "Ver ranking",
            action_url: `/restrict/hierarquizacao/ranking/?codigo=${encodeURIComponent(resultado.codigo)}`,
          }] : [];
          proc.sucesso({ title: titulo1, message: resto.join("\n"), subprocesses });
          return { ok: true, resultado };
        } catch (e) {
          proc.erro({ message: e?.message || String(e), detail: e?.detail });
          return { ok: false, erro: e };
        }
      }
      $("executar-fase3").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) { exigirHierarquizacao(); return; }
        const resposta = await executarAcao({
          confirmacao: {
            title: "Calcular índice de prioridade (Fase 3)",
            message: `Hierarquização ${hierarquizacao.codigo}, pesos por “${$("fase3-modo-pesos").value}”, completude mínima de ${$("fase3-completude").value}%.`,
            warning: "O resultado atual da Fase 3 será substituído e a síntese já gerada, se houver, ficará desatualizada.",
            confirmLabel: "Calcular Fase 3",
          },
          acompanhamento: true,
          titulo: "Calcular índice de prioridade (Fase 3)",
          mensagemInicial: `Enviando os critérios da rodada ${hierarquizacao.codigo}…`,
          executar: () => HierApi.executarFase3(hierarquizacao.codigo, {
            criterios: window.AtributosObjetos?.criteriosPayload() || [],
            ...window.AtributosObjetos.configuracaoPayload(),
            modo_pesos: $("fase3-modo-pesos").value,
            completude_minima: Number($("fase3-completude").value) / 100,
            regra_ausentes: $("fase3-ausentes").value,
          }),
          sucesso: ["Índice de prioridade calculado.", "Confira a tabela de objetos abaixo."],
        });
        if (!resposta.ok) { if (resposta.erro) erro(resposta.erro); return; }
        hierarquizacoes = hierarquizacoes.map((item) => item.codigo === resposta.resultado.codigo ? resposta.resultado : item);
        await render(resposta.resultado);
      };
      $("salvar-pesos-fase3").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) { exigirHierarquizacao(); return; }
        const resposta = await executarAcao({
          confirmacao: {
            title: "Salvar pesos dos atributos",
            message: `Os pesos exibidos serão gravados na hierarquização ${hierarquizacao.codigo}, substituindo os anteriores.`,
            confirmLabel: "Salvar pesos",
          },
          titulo: "Salvar pesos dos atributos",
          mensagemInicial: "Gravando os pesos no servidor…",
          executar: () => HierApi.salvarPesosFase3(hierarquizacao.codigo, { criterios: window.AtributosObjetos?.criteriosPayload() || [], ...window.AtributosObjetos.configuracaoPayload() }),
          sucesso: "Pesos dos atributos salvos.",
        });
        if (!resposta.ok) { if (resposta.erro) erro(resposta.erro); return; }
        hierarquizacoes = hierarquizacoes.map((item) => item.codigo === resposta.resultado.codigo ? resposta.resultado : item);
        await render(resposta.resultado);
      };
      document.querySelectorAll('input[name="operador-sintese"]').forEach((input) => input.addEventListener("change", () => {
        $("pesos-sintese").hidden = operadorSintese() !== "media_ponderada";
      }));
      document.querySelectorAll(".peso-sintese-barra, .peso-sintese-numero").forEach((input) => input.addEventListener("input", () => {
        atualizarPesosSintese(input.closest("[data-sintese-peso]").dataset.sintesePeso, Number(input.value));
      }));
      $("sintetizar").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) { exigirHierarquizacao(); return; }
        const operador = operadorSintese();
        const resposta = await executarAcao({
          confirmacao: {
            title: "Calcular índice geral de hierarquização",
            message: `A síntese final da hierarquização ${hierarquizacao.codigo} será gerada com o operador “${operador}”.`,
            warning: "A síntese anterior, se existir, é substituída. Ela combina os resultados das Fases 1, 2 e 3 como estão agora — confira se as três estão atualizadas antes de seguir.",
            confirmLabel: "Calcular síntese",
          },
          acompanhamento: true,
          titulo: "Calcular índice geral de hierarquização",
          mensagemInicial: "Sintetizando as três fases no servidor…",
          executar: () => HierApi.sintetizar(hierarquizacao.codigo, {
            operador,
            peso_rede: Number($("peso-rede").value),
            peso_grade: Number($("peso-grade").value),
            peso_prioridade: Number($("peso-prioridade").value),
            incluir_restritos: false,
          }),
          sucesso: ["Índice geral calculado.", "O ranking final já está disponível."],
          // Navegar sozinho tirava o usuário da página antes de ele ver o desfecho:
          // o modal de sucesso oferece "Ver ranking" e OK continua na Fase 3.
          irRanking: true,
        });
        if (!resposta.ok) { if (resposta.erro) erro(resposta.erro); return; }
        const codigo = resposta.resultado.codigo;
        hierarquizacoes = hierarquizacoes.map((item) => item.codigo === codigo ? resposta.resultado : item);
        await render(resposta.resultado);
      };
    } catch (error) { erro(error); }
  }
  init();
})();
