(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const queryCode = new URLSearchParams(location.search).get("codigo");
  let hierarquizacoes = [];
  const previsualizacoes = new Map();
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

  const formatarIndice = valor => Number.isFinite(valor) ? valor.toFixed(4) : "—";
  const posicaoFinal = sintese => Number.isInteger(sintese?.posicao_final) && sintese.posicao_final > 0
    ? sintese.posicao_final : null;

  function renderRankingFinal(hierarquizacao, resultadoAtual) {
    const objetos = hierarquizacao.dados_hierarquizacao?.objetos || [];
    const gerada = objetos.some(objeto => objeto.hierarquizacao?.sintese?.executada === true);
    $("fase3-ranking-final").hidden = !resultadoAtual || !gerada;
    $("fase3-ranking-final-tabela").innerHTML = "";
    if (!resultadoAtual || !gerada) return;
    const linhas = objetos.map((objeto, indice) => {
      const sintese = objeto.hierarquizacao?.sintese || {};
      const posicao = posicaoFinal(sintese);
      const valido = sintese.executada === true && Number.isFinite(sintese.score_final) && posicao != null;
      const nome = objeto.cabecalho_objeto?.nome || "Nome não informado";
      const situacao = sintese.barrado_por_risco ? "Barrada por risco"
        : sintese.restrito_segregado ? "Restrita — segregada"
        : valido ? "Ranqueada" : "Sem índice combinado — confira os índices de entrada";
      const valor = valido
        ? `<button type="button" class="ami-cell-link" data-memoria-sintese="${indice}" aria-label="Ver memória de cálculo de ${esc(nome)}">${formatarIndice(sintese.score_final)}</button>`
        : "—";
      return `<tr data-ranking-posicao="${valido ? posicao : ''}"><td><span class="ranking-posicao">${valido ? posicao : '—'}</span></td><td>${esc(nome)}</td><td class="ranking-indice">${valor}</td><td>${situacao}</td></tr>`;
    }).join("");
    $("fase3-ranking-final-tabela").innerHTML = `<table class="fase-table" data-ranking-order="true" data-table-sort="off" aria-labelledby="fase3-ranking-final-titulo"><thead><tr><th scope="col" aria-sort="ascending">Posição final</th><th>Demanda</th><th>Índice geral de hierarquização</th><th>Situação</th></tr></thead><tbody>${linhas}</tbody></table>`;
    window.Fase3TableStandard?.($("fase3-ranking-final-tabela").querySelector("table"));
  }

  function estadoPrevisualizacao(codigo) {
    return previsualizacoes.get(codigo) || {};
  }

  function descartarPrevisualizacao(codigo, fase) {
    const estado = estadoPrevisualizacao(codigo);
    delete estado[fase];
    if (!estado.fase3 && !estado.sintese) previsualizacoes.delete(codigo);
    else previsualizacoes.set(codigo, estado);
  }

  function abrirMemoriaSintese(indice, acionador) {
    const selecionada = atual();
    const pendente = selecionada && estadoPrevisualizacao(selecionada.codigo);
    const hierarquizacao = pendente?.sintese?.resultado || selecionada;
    const objeto = hierarquizacao?.dados_hierarquizacao?.objetos?.[indice];
    const sintese = objeto?.hierarquizacao?.sintese;
    if (!sintese?.executada || !Number.isFinite(sintese.score_final)) {
      window.Notify.warning("Síntese final", "A memória de cálculo não está disponível. Gere novamente a síntese.");
      return;
    }
    const config = hierarquizacao.dados_hierarquizacao.cabecalho_grupo?.sintese || {};
    const contribuicoes = sintese.contribuicoes || {};
    const valores = [contribuicoes.favorabilidade_rede, contribuicoes.favorabilidade_grade, contribuicoes.prioridade];
    const simples = config.operador === "media_simples";
    const pesos = simples ? [1 / 3, 1 / 3, 1 / 3] : [config.peso_rede, config.peso_grade, config.peso_prioridade];
    // Historical syntheses may use a legacy operator: do not invent their calculation.
    const rastreavel = ["media_simples", "media_ponderada"].includes(config.operador)
      && valores.every(Number.isFinite) && pesos.every(Number.isFinite)
      && Math.abs(pesos.reduce((soma, peso) => soma + peso, 0) - 1) < 1e-6
      && Math.abs(valores.reduce((soma, valor, i) => soma + valor * pesos[i], 0) - sintese.score_final) < 1e-10;
    const modal = $("fase3-memoria-sintese");
    const corpo = $("fase3-memoria-sintese-conteudo");
    const pesosTexto = rastreavel ? simples ? "Rede = Territorial = Prioridade = 1/3"
      : `Rede = ${pesos[0]}; Territorial = ${pesos[1]}; Prioridade = ${pesos[2]}` : "Não reconstituídos";
    const equacao = simples ? "IGH = (IFR + IFT + IP) / 3" : "IGH = pR × IFR + pT × IFT + pP × IP";
    corpo.innerHTML = `<p class="ahp-help-text">Hierarquização ${esc(hierarquizacao.codigo)} · ${pendente?.sintese ? "Prévia ainda não salva." : "Valores da síntese salva."} A exibição dos índices é arredondada a quatro casas decimais; o cálculo utiliza a precisão integral.</p>
      <div class="fase-table-wrap"><table class="fase-table" aria-label="Índices e pesos da síntese final"><thead><tr><th>Demanda</th><th>Índice de favorabilidade de rede</th><th>Índice de favorabilidade territorial</th><th>Índice de prioridade</th><th>Pesos</th><th>Índice geral de hierarquização</th></tr></thead><tbody><tr><td>${esc(objeto.cabecalho_objeto?.nome || "Nome não informado")}</td>${valores.map(valor => `<td>${formatarIndice(valor)}</td>`).join("")}<td>${esc(pesosTexto)}</td><td>${formatarIndice(sintese.score_final)}</td></tr></tbody></table></div>
      <section class="fase3-equacao-sintese"><h3 class="fase3-titulo-tabela-simples">Equação de cálculo</h3>${rastreavel
        ? `<p>${simples ? "Média simples" : "Média ponderada"}: <strong>${equacao}</strong></p><p>${simples
          ? `(${valores.join(" + ")}) / 3`
          : valores.map((valor, i) => `${pesos[i]} × ${valor}`).join(" + ")} = ${sintese.score_final}</p>
          <dl class="fase3-execucao-resumo"><div><dt>IGH</dt><dd>Índice geral de hierarquização: índice combinado do ranking final da demanda.</dd></div><div><dt>IFR</dt><dd>Índice de favorabilidade de rede.</dd></div><div><dt>IFT</dt><dd>Índice de favorabilidade territorial.</dd></div><div><dt>IP</dt><dd>Índice de prioridade.</dd></div><div><dt>pR, pT e pP</dt><dd>Pesos da rede, do território e da prioridade, respectivamente. Sua soma é 1. Na média simples, cada índice tem peso 1/3.</dd></div></dl>`
        : '<p role="alert">Esta síntese histórica não possui dados compatíveis para reconstituir a equação dos três índices. O valor final salvo foi preservado; gere novamente a síntese para obter a memória completa.</p>'}</section>`;
    modal.classList.remove("hidden");
    window.Fase3TableStandard?.(corpo.querySelector("table"));
    modal.acionadorSintese = acionador;
    modal.querySelector("[data-modal-close]").focus();
    window.SLTTableFit?.();
  }

  function fecharMemoriaSintese() {
    const modal = $("fase3-memoria-sintese");
    if (modal.classList.contains("hidden")) return;
    modal.classList.add("hidden");
    if (modal.acionadorSintese?.isConnected) modal.acionadorSintese.focus();
  }

  $("fase3-ranking-final").addEventListener("click", event => {
    const botao = event.target.closest("[data-memoria-sintese]");
    if (botao) abrirMemoriaSintese(Number(botao.dataset.memoriaSintese), botao);
  });
  $("fase3-memoria-sintese").addEventListener("click", event => {
    if (event.target === event.currentTarget || event.target.closest("[data-modal-close]")) fecharMemoriaSintese();
  });
  $("fase3-memoria-sintese").addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); fecharMemoriaSintese(); }
    if (event.key !== "Tab") return;
    const focaveis = [...event.currentTarget.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')]
      .filter(elemento => elemento.getClientRects().length);
    const primeiro = focaveis[0], ultimo = focaveis.at(-1);
    if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
    else if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
  });

  async function render(hierarquizacao) {
    fecharMemoriaSintese();
    const pendente = hierarquizacao ? estadoPrevisualizacao(hierarquizacao.codigo) : {};
    const exibicao = pendente.sintese?.resultado || pendente.fase3?.resultado || hierarquizacao;
    $("fase3-ranking-final").hidden = true;
    document.querySelectorAll('[data-fase3-progressiva]').forEach(section => { section.hidden = true; });
    $("fase3-acao-calculo").hidden = true;
    $("fase3-regras-vazios").hidden = true;
    $("fase3-complementacao").hidden = true;
    $("fase-resumo").classList.add("hidden");
    $("fase-resumo").innerHTML = "";
    $("fase3-erro").classList.add("hidden");
    ["executar-fase3", "salvar-resultado-fase3", "salvar-pesos-fase3", "sintetizar", "salvar-sintese"].forEach(id => { $(id).disabled = true; });
    await window.AtributosObjetos.render(exibicao);
    if (hierarquizacao !== atual()) return;
    if (!hierarquizacao) return;
    renderResultados(exibicao, true);
    $("executar-fase3").disabled = false;
    $("salvar-pesos-fase3").disabled = false;
    $("salvar-resultado-fase3").disabled = !pendente.fase3;
    $("salvar-sintese").disabled = !pendente.sintese;
    travarSeHomologada(hierarquizacao);
    avisarComposicaoDivergente(hierarquizacao);
  }

  function avisarComposicaoDivergente(hierarquizacao) {
    const divergencia = hierarquizacao?.dados_hierarquizacao?.cabecalho_grupo?.composicao_divergente;
    if (!divergencia || hierarquizacao.status === "homologada") return;
    const aviso = $("fase3-resultados-aviso");
    aviso.textContent = "O grupo de demandas foi alterado depois da criação desta hierarquização. ";
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-secondary";
    botao.textContent = "Sincronizar composição";
    botao.addEventListener("click", async () => {
      botao.disabled = true;
      try {
        await HierApi.sincronizarComposicao(hierarquizacao.codigo);
        window.location.reload();
      } catch (erro) {
        botao.disabled = false;
        aviso.append(` ${erro.message || "Falha ao sincronizar."}`);
      }
    });
    aviso.append(botao);
    aviso.classList.remove("hidden");
  }

  function travarSeHomologada(hierarquizacao) {
    if (hierarquizacao?.status !== "homologada") return;
    ["executar-fase3", "salvar-resultado-fase3", "salvar-pesos-fase3", "sintetizar", "salvar-sintese"].forEach(id => { $(id).disabled = true; });
    const aviso = $("fase3-resultados-aviso");
    aviso.textContent = "Esta hierarquização está homologada: os resultados das três fases estão travados e não podem ser recalculados. Para recalcular, outro gestor ou um administrador deve reverter a homologação na página de ranking.";
    aviso.classList.remove("hidden");
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
    const pendente = estadoPrevisualizacao(hierarquizacao.codigo);
    const resultadoAtual = !coletaPendente && !resultadosDesatualizados && (!fases.includes(3) || fase3Executada);
    const fase3NaoSalva = Boolean(pendente.fase3);
    document.querySelectorAll(".fase3-baixar-relatorio").forEach(button => {
      button.disabled = !resultadoAtual || !fase3Executada;
    });
    document.querySelector('.secao-ranking-do-ajuste-fino').hidden = !resultadoAtual;
    $("fase3-relatorio-container").hidden = !resultadoAtual;
    document.querySelector('.fase3-auditoria-details').hidden = !resultadoAtual;
    document.querySelector('.secao-sintese-final').hidden = !resultadoAtual;
    let pesosProntos = true;
    try { window.AtributosObjetos.configuracaoPayload(); } catch (_) { pesosProntos = false; }
    $("fase3-acao-calculo").hidden = !docs.length || !pesosProntos;
    aviso.classList.add("hidden");
    aviso.textContent = "";
    $("sintetizar").disabled = !resultadoAtual || fase3NaoSalva;
    $("salvar-resultado-fase3").disabled = !pendente.fase3;
    $("salvar-sintese").disabled = !pendente.sintese;
    if (pendente.sintese) {
      aviso.textContent = "Prévia do índice geral calculada, mas ainda não salva. Use “Salvar resultado” para gravá-la na hierarquização.";
      aviso.classList.remove("hidden");
    } else if (pendente.fase3) {
      aviso.textContent = "Prévia do índice de prioridade calculada, mas ainda não salva. Salve este resultado antes de calcular o índice geral.";
      aviso.classList.remove("hidden");
    }
    renderAtributosAusentes(hierarquizacao);
    renderSintese(docs, resultadoAtual);
    renderRankingFinal(hierarquizacao, resultadoAtual);
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
    } else { audit.replaceChildren(); }
  }

  async function atualizarDadosAoRetomar() {
    const selecionada = atual();
    if (!selecionada || atualizandoAoRetomar || document.hidden) return;
    atualizandoAoRetomar = true;
    try {
      const atualizada = await HierApi.obter(selecionada.codigo);
      previsualizacoes.delete(selecionada.codigo);
      hierarquizacoes = hierarquizacoes.map((item) =>
        item.codigo === atualizada.codigo ? atualizada : item
      );
      await render(atualizada);
    } catch (falha) {
      ["executar-fase3", "salvar-resultado-fase3", "salvar-pesos-fase3", "sintetizar", "salvar-sintese"].forEach(id => { $(id).disabled = true; });
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
      document.querySelectorAll(".fase3-baixar-relatorio").forEach(botaoRelatorio => {
        botaoRelatorio.onclick = async () => {
          const selecionada = atual();
          if (!selecionada) { exigirHierarquizacao(); return; }
          document.querySelectorAll(".fase3-baixar-relatorio").forEach(button => { button.disabled = true; });
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
            document.querySelectorAll(".fase3-baixar-relatorio").forEach(button => { button.disabled = false; });
          }
        };
      });
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
      document.addEventListener("atributos-pesos-alterados", () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) return;
        descartarPrevisualizacao(hierarquizacao.codigo, "fase3");
        descartarPrevisualizacao(hierarquizacao.codigo, "sintese");
        renderResultados(hierarquizacao);
      });
      ["fase3-completude", "fase3-ausentes"].forEach(id => $(id).addEventListener("input", () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) return;
        descartarPrevisualizacao(hierarquizacao.codigo, "fase3");
        descartarPrevisualizacao(hierarquizacao.codigo, "sintese");
        renderResultados(hierarquizacao);
      }));
      document.querySelectorAll("[data-sintese-peso] input, input[name='operador-sintese']").forEach(input =>
        ["input", "change"].forEach(evento => input.addEventListener(evento, () => {
          const hierarquizacao = atual();
          if (!hierarquizacao) return;
          descartarPrevisualizacao(hierarquizacao.codigo, "sintese");
          renderResultados(hierarquizacao);
        })));
      document.querySelector('[data-atributos-objetos]').addEventListener("change", event => {
        if (!event.target.matches("[data-atributo-coluna]")) return;
        const hierarquizacao = atual();
        if (!hierarquizacao) return;
        descartarPrevisualizacao(hierarquizacao.codigo, "fase3");
        descartarPrevisualizacao(hierarquizacao.codigo, "sintese");
        renderResultados(hierarquizacao);
      });
      /** Campo obrigatório: aviso do Notify e foco no seletor. */
      function exigirHierarquizacao() {
        window.Notify.warning("Hierarquização", "Selecione a hierarquização.");
        $("fase-hierarquizacao").focus();
      }
      /**
       * Confirmação → progresso → desfecho, no ProcessFeedback (SIGMA). O
       * sucesso só é anunciado depois que o servidor responde.
       */
      async function executarAcao({ confirmacao, titulo, mensagemInicial, executar, sucesso, irRanking, duracaoMinimaMs = 0 }) {
        if (confirmacao && !(await window.ProcessFeedback.confirmar(confirmacao))) return { ok: false, cancelado: true };
        const tarefa = (mensagemInicial || "Enviando a solicitação ao servidor").replace(/…$/, "");
        const proc = window.ProcessFeedback.iniciarCadastro({ title: titulo, tasks: [tarefa] });
        proc.tarefaAtual(tarefa);
        const inicioProcessamento = performance.now();
        const aguardarDuracaoMinima = async () => {
          const restante = duracaoMinimaMs - (performance.now() - inicioProcessamento);
          if (restante > 0) await new Promise(resolve => setTimeout(resolve, restante));
        };
        try {
          const resultado = await executar();
          await aguardarDuracaoMinima();
          proc.concluirTarefa(tarefa, "Servidor respondeu");
          const [titulo1, ...resto] = [].concat(sucesso || "Operação concluída.");
          const subprocesses = irRanking ? [{
            name: "Ranking final", status: "success", detail: "Abra o ranking desta hierarquização.",
            action_label: "Ver ranking",
            action_url: `/restrict/hierarquizacao/homologacao-ranking-publicacao/?codigo=${encodeURIComponent(resultado.codigo)}`,
          }] : [];
          proc.sucesso({ title: titulo1, message: resto.join("\n"), subprocesses });
          return { ok: true, resultado };
        } catch (e) {
          await aguardarDuracaoMinima();
          proc.erro({ message: e?.message || String(e), detail: e?.detail });
          return { ok: false, erro: e };
        }
      }
      const payloadFase3 = () => ({
        criterios: window.AtributosObjetos?.criteriosPayload() || [],
        ...window.AtributosObjetos.configuracaoPayload(),
        modo_pesos: $("fase3-modo-pesos").value,
        completude_minima: Number($("fase3-completude").value) / 100,
        regra_ausentes: $("fase3-ausentes").value,
      });
      $("executar-fase3").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) { exigirHierarquizacao(); return; }
        let payload;
        try { payload = payloadFase3(); } catch (falha) { erro(falha); return; }
        const resposta = await executarAcao({
          confirmacao: {
            title: "Calcular índice de prioridade (Fase 3)",
            message: `Será calculada uma prévia para a hierarquização ${hierarquizacao.codigo}, com pesos por “${$("fase3-modo-pesos").value}” e completude mínima de ${$("fase3-completude").value}%.`,
            warning: "Este cálculo não grava dados. Para substituir o resultado atual, use “Salvar resultado” após conferir a prévia.",
            confirmLabel: "Calcular Fase 3",
          },
          acompanhamento: true,
          titulo: "Calcular índice de prioridade (Fase 3)",
          mensagemInicial: `Enviando os critérios da rodada ${hierarquizacao.codigo}…`,
          duracaoMinimaMs: 2000,
          executar: () => HierApi.calcularFase3(hierarquizacao.codigo, payload),
          sucesso: ["Prévia do índice de prioridade calculada.", "O resultado ainda não foi salvo. Confira a tabela e use “Salvar resultado” para registrá-lo."],
        });
        if (!resposta.ok) { if (resposta.erro) erro(resposta.erro); return; }
        const pendente = estadoPrevisualizacao(hierarquizacao.codigo);
        pendente.fase3 = { resultado: resposta.resultado, payload, versao: resposta.resultado.atualizadoEm };
        delete pendente.sintese;
        previsualizacoes.set(hierarquizacao.codigo, pendente);
        renderResultados(resposta.resultado, true);
      };
      $("salvar-resultado-fase3").onclick = async () => {
        const hierarquizacao = atual();
        const pendente = hierarquizacao && estadoPrevisualizacao(hierarquizacao.codigo).fase3;
        if (!hierarquizacao || !pendente) return;
        const resposta = await executarAcao({
          confirmacao: {
            title: "Salvar índice de prioridade",
            message: `O índice de prioridade calculado será gravado na hierarquização ${hierarquizacao.codigo}, substituindo o resultado anterior, se houver.`,
            confirmLabel: "Salvar resultado",
          },
          titulo: "Salvar índice de prioridade",
          mensagemInicial: "Gravando o resultado da Fase 3…",
          duracaoMinimaMs: 2000,
          executar: () => HierApi.executarFase3(hierarquizacao.codigo, pendente.payload, pendente.versao),
          sucesso: "Índice de prioridade salvo na hierarquização.",
        });
        if (!resposta.ok) { if (resposta.erro) erro(resposta.erro); return; }
        previsualizacoes.delete(hierarquizacao.codigo);
        hierarquizacoes = hierarquizacoes.map(item => item.codigo === resposta.resultado.codigo ? resposta.resultado : item);
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
        previsualizacoes.delete(hierarquizacao.codigo);
        hierarquizacoes = hierarquizacoes.map((item) => item.codigo === resposta.resultado.codigo ? resposta.resultado : item);
        await render(resposta.resultado);
      };
      document.querySelectorAll('input[name="operador-sintese"]').forEach((input) => input.addEventListener("change", () => {
        $("pesos-sintese").hidden = operadorSintese() !== "media_ponderada";
      }));
      document.querySelectorAll(".peso-sintese-barra, .peso-sintese-numero").forEach((input) => input.addEventListener("input", () => {
        atualizarPesosSintese(input.closest("[data-sintese-peso]").dataset.sintesePeso, Number(input.value));
      }));
      const payloadSintese = () => ({
        operador: operadorSintese(),
        peso_rede: Number($("peso-rede").value),
        peso_grade: Number($("peso-grade").value),
        peso_prioridade: Number($("peso-prioridade").value),
        incluir_restritos: false,
      });
      $("sintetizar").onclick = async () => {
        const hierarquizacao = atual();
        if (!hierarquizacao) { exigirHierarquizacao(); return; }
        if (estadoPrevisualizacao(hierarquizacao.codigo).fase3) {
          erro(new Error("Salve o índice de prioridade antes de calcular o índice geral."));
          return;
        }
        const operador = operadorSintese();
        const payload = payloadSintese();
        const resposta = await executarAcao({
          confirmacao: {
            title: "Calcular índice geral de hierarquização",
            message: `Será calculada uma prévia da síntese da hierarquização ${hierarquizacao.codigo} com o operador “${operador}”.`,
            warning: "Este cálculo não grava dados. A síntese combina os resultados salvos das Fases 1, 2 e 3; confira-os antes de salvar a prévia.",
            confirmLabel: "Calcular síntese",
          },
          acompanhamento: true,
          titulo: "Calcular índice geral de hierarquização",
          mensagemInicial: "Sintetizando as três fases no servidor…",
          duracaoMinimaMs: 2000,
          executar: () => HierApi.calcularSintese(hierarquizacao.codigo, payload),
          sucesso: ["Prévia do índice geral calculada.", "O resultado ainda não foi salvo. Confira o ranking e use “Salvar resultado” para registrá-lo. Após salvar, homologue a hierarquização antes de publicar os resultados."],
        });
        if (!resposta.ok) { if (resposta.erro) erro(resposta.erro); return; }
        const pendente = estadoPrevisualizacao(hierarquizacao.codigo);
        pendente.sintese = { resultado: resposta.resultado, payload, versao: resposta.resultado.atualizadoEm };
        previsualizacoes.set(hierarquizacao.codigo, pendente);
        renderResultados(resposta.resultado);
      };
      $("salvar-sintese").onclick = async () => {
        const hierarquizacao = atual();
        const pendente = hierarquizacao && estadoPrevisualizacao(hierarquizacao.codigo).sintese;
        if (!hierarquizacao || !pendente) return;
        const resposta = await executarAcao({
          confirmacao: {
            title: "Salvar índice geral de hierarquização",
            message: `O índice geral e o ranking calculados serão gravados na hierarquização ${hierarquizacao.codigo}, substituindo a síntese anterior, se houver.`,
            confirmLabel: "Salvar resultado",
          },
          titulo: "Salvar índice geral de hierarquização",
          mensagemInicial: "Gravando a síntese e o ranking…",
          duracaoMinimaMs: 2000,
          executar: () => HierApi.sintetizar(hierarquizacao.codigo, pendente.payload, pendente.versao),
          sucesso: ["Índice geral e ranking salvos na hierarquização.", "Agora, acesse o ranking e homologue a hierarquização. A homologação é obrigatória antes de publicar os resultados."],
          irRanking: true,
        });
        if (!resposta.ok) { if (resposta.erro) erro(resposta.erro); return; }
        previsualizacoes.delete(hierarquizacao.codigo);
        const codigo = resposta.resultado.codigo;
        hierarquizacoes = hierarquizacoes.map((item) => item.codigo === codigo ? resposta.resultado : item);
        await render(resposta.resultado);
        $("fase3-ranking-final").scrollIntoView({ behavior: "smooth", block: "start" });
      };
    } catch (error) { erro(error); }
  }
  init();
})();
