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
    selecionados = new Set(),
    matriz = null;
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
      v = $("demanda-valor").value.trim().toLowerCase();
    return universo.filter(
      (o) =>
        (!q ||
          [o.codigo, o.nome, o.descricao].some((x) =>
            String(x || "")
              .toLowerCase()
              .includes(q),
          )) &&
        (!campo ||
          !v ||
          String(o[campo] ?? "")
            .toLowerCase()
            .includes(v)),
    );
  }
  function renderDemandas() {
    const rows = filtrados();
    $("demanda-tbody").innerHTML = rows.length
      ? rows
          .map(
            (o) =>
              `<tr><td><input type="checkbox" data-id="${esc(o.id)}" ${selecionados.has(o.id) ? "checked" : ""}></td><td><code>${esc(o.codigo)}</code></td><td>${esc(o.nome)}</td><td>${esc(o.grupo_id || "—")}</td><td>${esc(o.instituicao_nome || o.orgao_responsavel || "—")}</td><td>${esc(localizacao(o))}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="6" class="process-empty-row">Nenhuma demanda apta encontrada para o tipo selecionado.</td></tr>';
    $("demanda-contagem").textContent =
      `${rows.length} visível(is) · ${selecionados.size} selecionada(s) de ${universo.length} apta(s)`;
    $("demanda-tbody")
      .querySelectorAll("input[data-id]")
      .forEach(
        (x) =>
          (x.onchange = () => {
            x.checked
              ? selecionados.add(x.dataset.id)
              : selecionados.delete(x.dataset.id);
            renderDemandas();
          }),
      );
  }
  async function carregarUniverso() {
    const tipo = $("hier-tipo").value;
    $("universo-objeto-valor").textContent = tipo || "—";
    universo = [];
    selecionados.clear();
    renderDemandas();
    if (!tipo) return;
    try {
      const [itens, campos] = await Promise.all([
        HierApi.listarUniverso(tipo, "hierarq_apta"),
        HierApi.listarCamposUniverso(tipo),
      ]);
      universo = itens;
      $("demanda-campo").innerHTML =
        '<option value="">Todos os atributos</option>' +
        campos
          .map(
            (c) => `<option value="${esc(c.campo)}">${esc(c.rotulo)}</option>`,
          )
          .join("");
      renderDemandas();
    } catch (e) {
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
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" }),
        ws = wb.Sheets[wb.SheetNames[0]];
      return {
        arquivo: file.name,
        aba: wb.SheetNames[0],
        linhas: XLSX.utils.sheet_to_json(ws, { defval: "" }),
      };
    }
    throw new Error("Formato não suportado.");
  }
  $("hier-tipo").onchange = carregarUniverso;
  ["demanda-busca", "demanda-valor"].forEach(
    (id) => ($(id).oninput = renderDemandas),
  );
  $("demanda-campo").onchange = renderDemandas;
  $("demanda-todos").onchange = (e) => {
    filtrados().forEach((o) =>
      e.target.checked ? selecionados.add(o.id) : selecionados.delete(o.id),
    );
    renderDemandas();
  };
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
    if (!selecionados.size) return erro("Selecione ao menos uma demanda apta.");
    if (!matriz) return erro("Carregue a matriz de premissas e critérios.");
    try {
      await HierApi.criar({
        nome: $("hier-nome").value.trim(),
        descricao: $("hier-descricao").value.trim() || null,
        tipo_demanda: $("hier-tipo").value,
        objetos: universo.filter((o) => selecionados.has(o.id)),
        matriz_premissas_criterios: matriz,
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
  carregarLista();
  carregarUniverso();
})();
