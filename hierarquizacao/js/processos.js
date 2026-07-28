(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  let universo = [],
    camposUniverso = [],
    selecionados = new Set(),
    confirmados = new Set(),
    selecionadosResumo = new Set(),
    grupoFechado = false,
    paginaDemandas = 1,
    matriz = null,
    universoRequestId = 0;
  const ITENS_POR_PAGINA = 15;
  const STATUS_ELEGIVEIS = new Set(["analise_aprovada", "hierarq_apta"]);
  const JSON_COLS = [
    "objetos",
    "julgamento_projetos",
    "pesos_projetos",
    "ranking",
    "dados_hierarquizacao",
  ];
  const ALIAS = {
    versao: "Versão",
    cabecalho_grupo: "Cabeçalho do grupo",
    objetos: "Objetos",
    demanda_id: "Identificador da demanda",
    codigo: "Código",
    nome: "Nome",
    descricao: "Descrição",
    tipo_demanda: "Tipo de demanda",
    quantidade_objetos: "Quantidade de objetos",
    matriz_premissas_criterios: "Matriz de premissas e critérios",
    fases_a_executar: "Fases a executar",
    pacotes: "Pacotes utilizados",
    criado_em: "Data de criação",
    cabecalho_objeto: "Cabeçalho do objeto",
    atributos: "Atributos",
    hierarquizacao: "Hierarquização",
    fase_1: "Fase 1 — Elegibilidade territorial",
    fase_2: "Fase 2 — Favorabilidade territorial",
    fase_3: "Fase 3 — Ajuste fino",
    sintese: "Síntese",
    restricao: "Restrição",
    risco: "Risco",
    intersecoes: "Interseções",
    resultado: "Resultado",
    executada: "Executada",
    status_fase1: "Resultado da Fase 1",
    score_fase2: "Pontuação da Fase 2",
    score_fase3: "Pontuação da Fase 3",
    score_final: "Pontuação final",
    ranking_fase2: "Posição na Fase 2",
    ranking_fase3: "Posição na Fase 3",
    posicao_final: "Posição final",
  };
  const alias = (k) =>
    ALIAS[k] ||
    String(k)
      .replaceAll("_", " ")
      .replace(/^./, (x) => x.toUpperCase());
  function jsonHtml(value) {
    if (value === null || value === undefined)
      return "<span>Não informado</span>";
    if (Array.isArray(value))
      return value.length
        ? value
            .map(
              (v, i) =>
                `<details open><summary><strong>Item ${i + 1}</strong></summary>${jsonHtml(v)}</details>`,
            )
            .join("")
        : "<span>Lista vazia</span>";
    if (typeof value === "object")
      return `<table class="json-tree"><tbody>${Object.entries(value)
        .map(
          ([k, v]) =>
            `<tr><th>${esc(alias(k))}</th><td>${jsonHtml(v)}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    return `<span>${esc(value)}</span>`;
  }
  function abrirJson(titulo, value) {
    $("json-modal-title").textContent = titulo;
    $("json-modal-body").innerHTML = jsonHtml(value);
    $("json-modal").classList.remove("hidden");
  }
  function vazias(n) {
    return Array.from(
      { length: Math.max(0, 3 - n) },
      () =>
        '<tr class="empty-row">' +
        Array.from({ length: 18 }, () => "<td></td>").join("") +
        "</tr>",
    ).join("");
  }
  function jsonButton(h, key, label) {
    const v = h[key];
    return `<button class="json-cell" data-codigo="${esc(h.codigo)}" data-json="${key}">${v == null ? "Não preenchido" : label}</button>`;
  }
  async function carregarLista() {
    try {
      const lista = await HierApi.listar();
      $("hier-loading").classList.add("hidden");
      $("hier-tbody").innerHTML =
        lista
          .map(
            (h) =>
              `<tr><td><code>${esc(h.id)}</code></td><td><code>${esc(h.codigo)}</code></td><td>${esc(h.config_id || "—")}</td><td>${esc(h.nome)}</td><td>${esc(h.descricao || "—")}</td><td>${esc(h.status)}</td><td>${jsonButton(h, "objetos", "Visualizar demandas")}</td><td>${jsonButton(h, "julgamento_projetos", "Visualizar julgamentos")}</td><td>${jsonButton(h, "pesos_projetos", "Visualizar pesos")}</td><td>${jsonButton(h, "ranking", "Visualizar classificação")}</td><td>${esc(h.homologadoEm || "—")}</td><td>${esc(h.homologadoPor || "—")}</td><td>${esc(h.criadoPor || "—")}</td><td>${esc(h.criadoEm || "—")}</td><td>${esc(h.atualizadoEm || "—")}</td><td>${esc(h.tipo_demanda || h.tipo_demanda_id || "—")}</td><td>${esc(h.grupo_id || "—")}</td><td>${jsonButton(h, "dados_hierarquizacao", "Visualizar arquivo completo")}</td></tr>`,
          )
          .join("") + vazias(lista.length);
      $("hier-tbody")
        .querySelectorAll(".json-cell")
        .forEach(
          (b) =>
            (b.onclick = () => {
              const h = lista.find((x) => x.codigo === b.dataset.codigo);
              abrirJson(alias(b.dataset.json), h[b.dataset.json]);
            }),
        );
    } catch (e) {
      $("hier-loading").classList.add("hidden");
      $("hier-error").textContent = e.message;
      $("hier-error").classList.remove("hidden");
    }
  }
  function localizacao(o) {
    return (
      o.municipio ||
      o.abrangencia_municipio ||
      o.geometria_tipo ||
      (o.latitude != null && o.longitude != null
        ? `${o.latitude}, ${o.longitude}`
        : "—")
    );
  }
  function filtrados() {
    const q = $("demanda-busca").value.trim().toLowerCase(),
      campo = $("demanda-campo").value,
      v = $("demanda-valor").value;
    return universo.filter(
      (o) =>
        (!q ||
          [o.codigo, o.nome, o.descricao].some((x) =>
            String(x || "")
              .toLowerCase()
              .includes(q),
          )) &&
        (!campo || !v || String(o[campo] ?? "") === v),
    );
  }
  function elegivel(o) {
    return STATUS_ELEGIVEIS.has(o.status);
  }
  function paginaFiltrada() {
    const rows = filtrados();
    const totalPaginas = Math.max(1, Math.ceil(rows.length / ITENS_POR_PAGINA));
    paginaDemandas = Math.min(Math.max(1, paginaDemandas), totalPaginas);
    const inicio = (paginaDemandas - 1) * ITENS_POR_PAGINA;
    return { rows, pagina: rows.slice(inicio, inicio + ITENS_POR_PAGINA), totalPaginas, inicio };
  }
  function formatarData(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString("pt-BR");
  }
  function rotuloValor(campo, value, row) {
    if (value === null || value === undefined || value === "") return "—";
    const labels = window.SLTAdminLabels;
    const tipo = $("hier-tipo").value;
    if (campo === "status")
      return labels?.statusDemandaLabel?.(value, tipo) || String(value);
    if (campo === "diretoria_id")
      return labels?.diretoriaLabel?.(value) || String(value);
    if (campo === "plano_id")
      return row?.plano_id_alias || labels?.planoLabel?.(value) || String(value);
    if (campo === "programa_id")
      return row?.programa_id_alias || String(value);
    if (campo === "grupo_id")
      return (
        row?.programa_id_alias ||
        row?.plano_id_alias ||
        labels?.diretoriaLabel?.(value) ||
        String(value)
      );
    const meta = camposUniverso.find((item) => item.campo === campo);
    if (meta?.tipo === "data") return formatarData(value);
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (campo === "valor_global")
      return labels?.formatMoney?.(value) || String(value);
    return String(value);
  }
  function valorHtml(campo, row) {
    if (campo === "status" && window.SLTAdminLabels?.statusBadgeHtml)
      return window.SLTAdminLabels.statusBadgeHtml(
        row.status,
        $("hier-tipo").value,
      );
    return esc(rotuloValor(campo, row[campo], row));
  }
  function colunasTabela() {
    const labels = window.SLTAdminLabels || {};
    const tipo = $("hier-tipo").value;
    const texto = (value) => esc(value || "—");
    const status = (row) =>
      labels.statusBadgeHtml?.(row.status, tipo) ||
      texto(rotuloValor("status", row.status, row));
    const instituicao = (row) =>
      texto(labels.instituicaoLabel?.(row) || row.instituicao_nome);
    const representante = (row) =>
      texto(labels.representanteLabel?.(row) || row.representante_nome);
    const cadastro = (row) =>
      texto(labels.formatDate?.(row.criadoEm || row.criado_em) || formatarData(row.criadoEm || row.criado_em));
    if (tipo === "plano")
      return [
        { label: "Código", value: (row) => `<code>${esc(row.codigo)}</code>` },
        { label: "Plano", value: (row) => texto(row.nome) },
        { label: "Diretoria", value: (row) => texto(labels.diretoriaLabel?.(row.diretoria_id)) },
        { label: "Instituição", value: instituicao },
        { label: "Representante", value: representante },
        { label: "Objetivo estratégico", value: (row) => texto(labels.truncate?.(row.objetivo_estrategico, 80) || row.objetivo_estrategico) },
        { label: "Vigência", value: (row) => texto(labels.formatVigencia?.(row.vigencia_inicio, row.vigencia_fim)) },
        { label: "Valor global", value: (row) => texto(labels.formatMoney?.(row.valor_global)) },
        { label: "Abrangência", value: (row) => texto(labels.abrangenciaLabel?.(row.unidades_espaciais)) },
        { label: "Status", value: status },
        { label: "Cadastro", value: cadastro },
      ];
    if (tipo === "programa")
      return [
        { label: "Código", value: (row) => `<code>${esc(row.codigo)}</code>` },
        { label: "Programa", value: (row) => texto(row.nome) },
        { label: "Plano vinculado", value: (row) => texto(labels.planoCadastradoLabel?.(row) || row.plano_id_alias) },
        { label: "Vínculo institucional", value: (row) => texto(labels.vinculoInstitucionalLabel?.(row.vinculo_institucional)) },
        { label: "Diretoria", value: (row) => texto(labels.diretoriaLabel?.(row.diretoria_id)) },
        { label: "Instituição", value: instituicao },
        { label: "Representante", value: representante },
        { label: "Órgão responsável", value: (row) => texto(row.orgao_responsavel) },
        { label: "Objetivo", value: (row) => texto(labels.truncate?.(row.objetivo, 80) || row.objetivo) },
        { label: "Valor global", value: (row) => texto(labels.formatMoney?.(row.valor_global)) },
        { label: "Abrangência", value: (row) => texto(labels.abrangenciaLabel?.(row.unidades_espaciais)) },
        { label: "Status", value: status },
        { label: "Cadastro", value: cadastro },
      ];
    return [
      { label: "Código", value: (row) => `<code>${esc(row.codigo)}</code>` },
      { label: "Projeto", value: (row) => texto(row.nome) },
      { label: "Diretoria", value: (row) => texto(labels.diretoriaLabel?.(row.diretoria_id)) },
      { label: "Plano estratégico", value: (row) => texto(labels.planoLabel?.(row.plano_id)) },
      { label: "Vínculo institucional", value: (row) => texto(labels.vinculoInstitucionalLabel?.(row.vinculo_institucional, row.vinculo_tipo)) },
      { label: "Programa vinculado", value: (row) => texto(labels.programaCadastradoLabel?.(row) || row.programa_id_alias) },
      { label: "Instituição", value: instituicao },
      { label: "Representante", value: representante },
      { label: "Classificação", value: (row) => texto(labels.classificacaoLabel?.(row.classificacao, row.plano_id)) },
      { label: "Complementos", value: (row) => texto(labels.complementosLabel?.(row.complementos)) },
      { label: "Geometria", value: (row) => texto(labels.geometriaResumo?.(row.geometria) || row.geometria_tipo) },
      { label: "Status", value: status },
      { label: "Cadastro", value: cadastro },
    ];
  }
  function atualizarValoresAtributo() {
    const campo = $("demanda-campo").value;
    const select = $("demanda-valor");
    if (!campo) {
      select.innerHTML =
        '<option value="">Selecione primeiro um atributo</option>';
      select.value = "";
      select.disabled = true;
      return;
    }
    const valores = new Map();
    universo.forEach((row) => {
      const raw = row[campo];
      if (raw === null || raw === undefined || raw === "") return;
      valores.set(String(raw), rotuloValor(campo, raw, row));
    });
    const ordenados = [...valores.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], "pt-BR", { numeric: true }),
    );
    select.disabled = false;
    select.innerHTML =
      '<option value="">Todos os valores</option>' +
      ordenados
        .map(
          ([value, label]) =>
            `<option value="${esc(value)}">${esc(label)}</option>`,
        )
        .join("");
    select.value = "";
  }
  function sincronizarAbas(tipo) {
    document.querySelectorAll("#hier-tipo-tabs [data-tipo]").forEach((aba) => {
      const ativa = aba.dataset.tipo === tipo;
      aba.classList.toggle("is-active", ativa);
      aba.setAttribute("aria-selected", String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
    });
  }
  function atualizarSelecionarVisiveis(rows) {
    const checkbox = $("demanda-todos");
    const elegiveisVisiveis = rows.filter(elegivel);
    const selecionadasVisiveis = elegiveisVisiveis.filter((o) =>
      selecionados.has(o.id),
    ).length;
    checkbox.disabled = grupoFechado || elegiveisVisiveis.length === 0;
    checkbox.checked =
      elegiveisVisiveis.length > 0 &&
      selecionadasVisiveis === elegiveisVisiveis.length;
    checkbox.indeterminate =
      selecionadasVisiveis > 0 &&
      selecionadasVisiveis < elegiveisVisiveis.length;
  }
  function renderDemandas() {
    const { rows, pagina, totalPaginas, inicio } = paginaFiltrada();
    const colunas = colunasTabela();
    const elegiveisVisiveis = pagina.filter(
      (o) => elegivel(o) && !confirmados.has(o.id),
    );
    $("demanda-head").innerHTML =
      '<th class="col-select" scope="col"><input type="checkbox" id="demanda-todos" aria-label="Selecionar registros visíveis"></th>' +
      colunas
        .map((coluna) => `<th scope="col">${esc(coluna.label)}</th>`)
        .join("");
    $("demanda-tbody").innerHTML = pagina.length
      ? pagina
          .map(
            (o) => {
              const podeSelecionar = elegivel(o) && !grupoFechado;
              const confirmado = confirmados.has(o.id);
              const explicacaoId = `demanda-status-${String(o.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
              const indisponivel = podeSelecionar && !confirmado
                ? ""
                : ` disabled aria-describedby="${explicacaoId}" title="${grupoFechado ? "O grupo está fechado para edição" : confirmado ? "Registro já confirmado no grupo" : "Status não permite inclusão na hierarquização"}"`;
              const explicacao = podeSelecionar && !confirmado
                ? ""
                : `<span id="${explicacaoId}" class="sr-only">${grupoFechado ? "O grupo está fechado para edição." : confirmado ? "Registro já confirmado no grupo." : `Status ${esc(o.status)} não permite inclusão na hierarquização.`}</span>`;
              const classe = confirmado
                ? "hier-demanda-confirmada"
                : podeSelecionar
                  ? ""
                  : "hier-demanda-indisponivel";
              return `<tr class="${classe}" data-status="${esc(o.status)}"><td class="col-select"><input type="checkbox" data-id="${esc(o.id)}" aria-label="Selecionar ${esc(o.codigo)}"${selecionados.has(o.id) && podeSelecionar && !confirmado ? " checked" : ""}${indisponivel}>${explicacao}</td>${colunas.map((coluna) => `<td>${coluna.value(o)}</td>`).join("")}</tr>`;
            },
          )
          .join("")
      : `<tr><td colspan="${colunas.length + 1}" class="process-empty-row">Nenhuma demanda encontrada para o tipo e os filtros selecionados.</td></tr>`;
    $("demanda-contagem").textContent =
      `${rows.length} resultado(s) · exibindo ${pagina.length ? inicio + 1 : 0}–${inicio + pagina.length} · ${elegiveisVisiveis.length} elegível(is) nesta página · ${selecionados.size} selecionada(s) · ${confirmados.size} confirmada(s)`;
    $("demanda-pagina-info").textContent = `Página ${paginaDemandas} de ${totalPaginas}`;
    $("demanda-pagina-anterior").disabled = paginaDemandas <= 1;
    $("demanda-pagina-proxima").disabled = paginaDemandas >= totalPaginas;
    atualizarSelecionarVisiveis(pagina.filter((o) => !confirmados.has(o.id)));
    $("demanda-todos").onchange = (e) => {
      paginaFiltrada().pagina
        .filter((o) => elegivel(o) && !confirmados.has(o.id))
        .forEach((o) =>
          e.target.checked
            ? selecionados.add(o.id)
            : selecionados.delete(o.id),
        );
      renderDemandas();
    };
    $("demanda-tbody")
      .querySelectorAll("input[data-id]:not(:disabled)")
      .forEach(
        (x) =>
          (x.onchange = () => {
            const demanda = universo.find((o) => o.id === x.dataset.id);
            if (x.checked && demanda && elegivel(demanda))
              selecionados.add(x.dataset.id);
            else selecionados.delete(x.dataset.id);
            renderDemandas();
          }),
      );
    $("demanda-confirmar").disabled = selecionados.size === 0 || grupoFechado;
    $("demanda-limpar").disabled = selecionados.size === 0 || grupoFechado;
  }
  function renderResumo() {
    const rows = universo.filter(
      (o) => elegivel(o) && confirmados.has(o.id),
    );
    const idsNoGrupo = new Set(rows.map((o) => o.id));
    selecionadosResumo = new Set(
      [...selecionadosResumo].filter((id) => idsNoGrupo.has(id)),
    );
    $("demanda-resumo-contagem").textContent = rows.length
      ? `${rows.length} demanda(s) no grupo · ${grupoFechado ? "grupo fechado para envio" : "grupo aberto para edição"}.`
      : "Nenhuma demanda confirmada.";
    $("demanda-resumo-tbody").innerHTML = rows.length
      ? rows
          .map(
            (o) =>
              `<tr data-status="${esc(o.status)}"><td class="col-select"><input type="checkbox" data-resumo-id="${esc(o.id)}" aria-label="Selecionar ${esc(o.codigo)} no grupo"${selecionadosResumo.has(o.id) ? " checked" : ""}${grupoFechado ? " disabled" : ""}></td><td><code>${esc(o.codigo)}</code></td><td>${esc(o.nome)}</td><td>${esc(rotuloValor("grupo_id", o.grupo_id, o))}</td><td>${valorHtml("status", o)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="process-empty-row">Confirme uma seleção para formar o grupo.</td></tr>';
    const todos = $("demanda-resumo-todos");
    todos.disabled = grupoFechado || rows.length === 0;
    todos.checked =
      rows.length > 0 && rows.every((o) => selecionadosResumo.has(o.id));
    todos.indeterminate =
      selecionadosResumo.size > 0 && selecionadosResumo.size < rows.length;
    todos.onchange = (e) => {
      rows.forEach((o) =>
        e.target.checked
          ? selecionadosResumo.add(o.id)
          : selecionadosResumo.delete(o.id),
      );
      renderResumo();
    };
    $("demanda-resumo-tbody")
      .querySelectorAll("input[data-resumo-id]:not(:disabled)")
      .forEach(
        (checkbox) =>
          (checkbox.onchange = () => {
            checkbox.checked
              ? selecionadosResumo.add(checkbox.dataset.resumoId)
              : selecionadosResumo.delete(checkbox.dataset.resumoId);
            renderResumo();
          }),
      );
    $("demanda-resumo-excluir").disabled =
      grupoFechado || selecionadosResumo.size === 0;
    $("demanda-resumo-confirmar").disabled =
      grupoFechado || rows.length === 0;
    $("demanda-resumo-editar").disabled = !grupoFechado;
  }
  async function carregarUniverso({ preservarSelecao = false } = {}) {
    const tipo = $("hier-tipo").value;
    const requestId = ++universoRequestId;
    $("universo-objeto-valor").textContent = tipo || "—";
    sincronizarAbas(tipo);
    universo = [];
    camposUniverso = [];
    paginaDemandas = 1;
    if (!preservarSelecao) {
      selecionados.clear();
      confirmados.clear();
      selecionadosResumo.clear();
      grupoFechado = false;
    }
    renderDemandas();
    renderResumo();
    if (!tipo) return;
    try {
      const [itens, campos, detalhes] = await Promise.all([
        HierApi.listarUniverso(tipo, "todas"),
        HierApi.listarCamposUniverso(tipo),
        window.SLTAdminApi
          ?.listDemandasByTipo?.(tipo)
          .catch((e) => {
            console.warn(
              "Detalhes administrativos indisponíveis; exibindo o universo básico.",
              e,
            );
            return [];
          }) || Promise.resolve([]),
      ]);
      if (requestId !== universoRequestId) return;
      const detalhesPorCodigo = new Map(
        detalhes.map((item) => [String(item.id || item.codigo), item]),
      );
      universo = itens.map((item) => ({
        ...(detalhesPorCodigo.get(String(item.codigo)) || {}),
        ...item,
      }));
      camposUniverso = campos;
      const idsValidos = new Set(
        universo.filter(elegivel).map((o) => o.id),
      );
      selecionados = new Set(
        [...selecionados].filter((id) => idsValidos.has(id) && !confirmados.has(id)),
      );
      confirmados = new Set(
        [...confirmados].filter((id) => idsValidos.has(id)),
      );
      $("demanda-campo").innerHTML =
        '<option value="">Todos os atributos</option>' +
        campos
          .map(
            (c) => `<option value="${esc(c.campo)}">${esc(c.rotulo)}</option>`,
          )
          .join("");
      atualizarValoresAtributo();
      renderDemandas();
      renderResumo();
    } catch (e) {
      if (requestId !== universoRequestId) return;
      erro(e.message);
    }
  }
  function erro(msg) {
    $("form-error").textContent = msg;
    $("form-error").classList.remove("hidden");
  }
  async function lerMatriz(file) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "json") return JSON.parse(await file.text());
    if (ext === "csv") {
      const text = await file.text(),
        lines = text.split(/\r?\n/).filter(Boolean),
        sep = lines[0].includes(";") ? ";" : ",";
      const heads = lines
        .shift()
        .split(sep)
        .map((x) => x.trim());
      return {
        arquivo: file.name,
        linhas: lines.map((l) =>
          Object.fromEntries(l.split(sep).map((v, i) => [heads[i], v.trim()])),
        ),
      };
    }
    if (ext === "xlsx" && window.XLSX) {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      // Aba principal do modelo padronizado; se ausente, usa a primeira aba com dados.
      const PRINCIPAL = "Matriz Crit Premissas v2";
      const abaPrincipal = wb.SheetNames.includes(PRINCIPAL)
        ? PRINCIPAL
        : wb.SheetNames.find((n) => n.toLowerCase() !== "instruções") ||
          wb.SheetNames[0];
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[abaPrincipal], {
        defval: "",
      });
      // Coleta as demais abas do modelo (dimensões, critérios, índice) como contexto auxiliar.
      const abas = {};
      for (const nome of wb.SheetNames) {
        abas[nome] = XLSX.utils.sheet_to_json(wb.Sheets[nome], { defval: "" });
      }
      return {
        arquivo: file.name,
        aba: abaPrincipal,
        linhas,
        abas,
      };
    }
    throw new Error("Formato não suportado.");
  }
  $("hier-tipo").onchange = carregarUniverso;
  const abasTipo = [
    ...document.querySelectorAll("#hier-tipo-tabs [data-tipo]"),
  ];
  function ativarAbaTipo(aba) {
    if (!aba) return;
    if ($("hier-tipo").value !== aba.dataset.tipo) {
      $("hier-tipo").value = aba.dataset.tipo;
      carregarUniverso();
    }
    aba.focus();
  }
  abasTipo.forEach((aba, indice) => {
    aba.onclick = () => {
      if ($("hier-tipo").value === aba.dataset.tipo) return;
      $("hier-tipo").value = aba.dataset.tipo;
      carregarUniverso();
    };
    aba.onkeydown = (evento) => {
      let destino = null;
      if (evento.key === "ArrowRight")
        destino = abasTipo[(indice + 1) % abasTipo.length];
      else if (evento.key === "ArrowLeft")
        destino = abasTipo[(indice - 1 + abasTipo.length) % abasTipo.length];
      else if (evento.key === "Home") destino = abasTipo[0];
      else if (evento.key === "End") destino = abasTipo.at(-1);
      if (!destino) return;
      evento.preventDefault();
      ativarAbaTipo(destino);
    };
  });
  ["demanda-busca", "demanda-valor"].forEach(
    (id) =>
      ($(id).oninput = () => {
        paginaDemandas = 1;
        renderDemandas();
      }),
  );
  $("demanda-campo").onchange = () => {
    paginaDemandas = 1;
    atualizarValoresAtributo();
    renderDemandas();
  };
  $("demanda-pagina-anterior").onclick = () => {
    paginaDemandas -= 1;
    renderDemandas();
  };
  $("demanda-pagina-proxima").onclick = () => {
    paginaDemandas += 1;
    renderDemandas();
  };
  $("demanda-confirmar").onclick = () => {
    const validos = [...selecionados].filter((id) => {
      const demanda = universo.find((o) => o.id === id);
      return demanda && elegivel(demanda);
    });
    if (!validos.length) return erro("Selecione ao menos uma demanda apta.");
    validos.forEach((id) => confirmados.add(id));
    selecionados.clear();
    grupoFechado = false;
    renderDemandas();
    renderResumo();
  };
  $("demanda-limpar").onclick = () => {
    selecionados.clear();
    renderDemandas();
  };
  $("demanda-atualizar").onclick = () =>
    carregarUniverso({ preservarSelecao: true });
  function cancelarGrupo() {
    selecionados.clear();
    confirmados.clear();
    selecionadosResumo.clear();
    grupoFechado = false;
    $("demanda-busca").value = "";
    $("demanda-campo").value = "";
    atualizarValoresAtributo();
    $("hier-tipo").value = "projeto";
    carregarUniverso();
  }
  $("demanda-cancelar").onclick = cancelarGrupo;
  $("demanda-resumo-excluir").onclick = () => {
    if (grupoFechado) return;
    selecionadosResumo.forEach((id) => confirmados.delete(id));
    selecionadosResumo.clear();
    renderDemandas();
    renderResumo();
  };
  $("demanda-resumo-confirmar").onclick = () => {
    if (!confirmados.size) return erro("Adicione demandas ao grupo antes de confirmá-lo.");
    grupoFechado = true;
    selecionados.clear();
    selecionadosResumo.clear();
    renderDemandas();
    renderResumo();
  };
  $("demanda-resumo-editar").onclick = () => {
    grupoFechado = false;
    renderDemandas();
    renderResumo();
  };
  $("demanda-resumo-cancelar").onclick = cancelarGrupo;
  $("demanda-resumo-atualizar").onclick = () =>
    carregarUniverso({ preservarSelecao: true });
  $("hier-matriz").onchange = async (e) => {
    try {
      matriz = await lerMatriz(e.target.files[0]);
      const n = Array.isArray(matriz)
        ? matriz.length
        : (matriz.linhas || []).length;
      $("matriz-resumo").textContent =
        `${e.target.files[0].name} · ${n} linha(s) carregada(s)`;
      $("matriz-resumo").classList.remove("hidden");
    } catch (err) {
      matriz = null;
      erro(err.message);
    }
  };
  $("nova-hierarquizacao").onsubmit = async (e) => {
    e.preventDefault();
    const fases = [...document.querySelectorAll("#hier-fases input:checked")].map((x) => Number(x.value));
    if (!fases.length) return erro("Selecione ao menos uma fase da rodada.");
    if (!confirmados.size)
      return erro("Adicione ao menos uma demanda apta ao grupo.");
    if (!grupoFechado)
      return erro("Confirme o grupo antes de enviar a hierarquização.");
    if (fases.some((fase) => fase === 2 || fase === 3) && !matriz)
      return erro("Carregue a matriz de premissas e critérios para as Fases 2 e 3.");
    try {
      await HierApi.criar({
        nome: $("hier-nome").value.trim(),
        descricao: $("hier-descricao").value.trim() || null,
        tipo_demanda: $("hier-tipo").value,
        objetos: universo.filter(
          (o) => elegivel(o) && confirmados.has(o.id),
        ),
        matriz_premissas_criterios: matriz,
        fases_a_executar: fases,
      });
      location.reload();
    } catch (err) {
      erro(err.message);
    }
  };
  $("json-modal-close").onclick = () => $("json-modal").classList.add("hidden");
  $("json-modal").onclick = (e) => {
    if (e.target === $("json-modal")) $("json-modal").classList.add("hidden");
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $("json-modal").classList.add("hidden");
  });
  async function iniciar() {
    carregarLista();
    carregarUniverso();
    try {
      await window.SLTAdminLabels?.init?.("/restrict/");
      renderDemandas();
      renderResumo();
    } catch (e) {
      console.warn("Não foi possível carregar todos os aliases administrativos.", e);
    }
  }
  iniciar();
})();
