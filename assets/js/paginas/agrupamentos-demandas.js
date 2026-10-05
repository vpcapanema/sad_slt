(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const TIPOS = ["plano", "programa", "projeto"];
  const ROTULOS = { plano: "Plano", programa: "Programa", projeto: "Projeto" };
  const STATUS_ELEGIVEIS = new Set(["analise_aprovada", "hierarq_em_andamento"]);
  const POR_PAGINA = 15;
  const SELECIONADOS = new Set();
  let universo = [];
  let campos = [];
  let pagina = 1;
  let grupos = [];

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function erro(mensagem, destino = "#agrupamento-form-error") {
    const elemento = $(destino);
    if (!elemento) return;
    elemento.textContent = mensagem || "Não foi possível concluir a operação.";
    elemento.classList.remove("hidden");
  }

  function limparErro(destino = "#agrupamento-form-error") {
    const elemento = $(destino);
    if (!elemento) return;
    elemento.textContent = "";
    elemento.classList.add("hidden");
  }

  function formatarData(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString("pt-BR");
  }

  function statusHtml(item, tipo) {
    const labels = window.SLTAdminLabels;
    return labels?.statusBadgeHtml?.(item.status, tipo) || escapar(item.status || "—");
  }

  function formatarValor(item, campo) {
    const labels = window.SLTAdminLabels || {};
    if (campo === "status") return statusHtml(item, $("#agrupamento-tipo").value);
    if (campo === "diretoria_id") return escapar(labels.diretoriaLabel?.(item.diretoria_id) || item.diretoria_id || "—");
    if (campo === "plano_id") return escapar(item.plano_id_alias || labels.planoLabel?.(item.plano_id) || item.plano_id || "—");
    if (campo === "programa_id") return escapar(item.programa_id_alias || item.programa_id || "—");
    if (campo === "instituicao_nome") return escapar(labels.instituicaoLabel?.(item) || item.instituicao_nome || "—");
    if (campo === "representante_nome") return escapar(labels.representanteLabel?.(item) || item.representante_nome || "—");
    if (campo === "valor_global") return escapar(labels.formatMoney?.(item.valor_global) || item.valor_global || "—");
    if (["criado_em", "atualizado_em", "aprovado_em"].includes(campo)) return escapar(formatarData(item[campo]));
    const valor = item[campo];
    if (valor === null || valor === undefined || valor === "") return "—";
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    return escapar(valor);
  }

  function colunas() {
    const tipo = $("#agrupamento-tipo").value;
    const comuns = [{ campo: "status", rotulo: "Situação" }, { campo: "codigo", rotulo: "Código" }, { campo: "nome", rotulo: ROTULOS[tipo] }];
    if (tipo === "plano") return [...comuns, { campo: "diretoria_id", rotulo: "Diretoria" }, { campo: "instituicao_nome", rotulo: "Instituição" }, { campo: "representante_nome", rotulo: "Representante" }, { campo: "objetivo_estrategico", rotulo: "Objetivo estratégico" }, { campo: "valor_global", rotulo: "Valor global" }, { campo: "criado_em", rotulo: "Cadastro" }];
    if (tipo === "programa") return [...comuns, { campo: "plano_id", rotulo: "Plano vinculado" }, { campo: "vinculo_institucional", rotulo: "Vínculo institucional" }, { campo: "diretoria_id", rotulo: "Diretoria" }, { campo: "instituicao_nome", rotulo: "Instituição" }, { campo: "objetivo", rotulo: "Objetivo" }, { campo: "valor_global", rotulo: "Valor global" }, { campo: "criado_em", rotulo: "Cadastro" }];
    return [...comuns, { campo: "diretoria_id", rotulo: "Diretoria" }, { campo: "plano_id", rotulo: "Plano estratégico" }, { campo: "programa_id", rotulo: "Programa vinculado" }, { campo: "instituicao_nome", rotulo: "Instituição" }, { campo: "representante_nome", rotulo: "Representante" }, { campo: "geometria_tipo", rotulo: "Geometria" }, { campo: "criado_em", rotulo: "Cadastro" }];
  }

  function elegivel(item) {
    return STATUS_ELEGIVEIS.has(item.status);
  }

  function filtrados() {
    const busca = $("#agrupamento-busca").value.trim().toLocaleLowerCase("pt-BR");
    const campo = $("#agrupamento-campo").value;
    const valor = $("#agrupamento-valor").value;
    return universo.filter((item) => {
      if (!elegivel(item)) return false;
      if (busca && ![item.codigo, item.nome, item.descricao].some((v) => String(v || "").toLocaleLowerCase("pt-BR").includes(busca))) return false;
      return !campo || !valor || String(item[campo] ?? "") === valor;
    });
  }

  function renderDemandas() {
    const tbody = $("#agrupamento-rows");
    const head = $("#agrupamento-head");
    const tipo = $("#agrupamento-tipo").value;
    if (!tipo) {
      head.innerHTML = "";
      tbody.innerHTML = '<tr><td>Selecione o tipo de demanda.</td></tr>';
      $("#agrupamento-contagem").textContent = "Selecione o tipo de demanda.";
      $("#agrupamento-pagina-info").textContent = "Página 1 de 1";
      return;
    }
    const lista = filtrados();
    const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    pagina = Math.max(1, Math.min(pagina, totalPaginas));
    const inicio = (pagina - 1) * POR_PAGINA;
    const visiveis = lista.slice(inicio, inicio + POR_PAGINA);
    const cols = colunas();
    head.innerHTML = `<tr><th class="col-select"><input type="checkbox" id="agrupamento-selecionar-pagina" aria-label="Selecionar demandas elegíveis visíveis"></th>${cols.map((c) => `<th scope="col">${escapar(c.rotulo)}</th>`).join("")}</tr>`;
    tbody.innerHTML = visiveis.length ? visiveis.map((item) => `<tr data-id="${escapar(item.id)}"><td class="col-select"><input type="checkbox" data-demanda-id="${escapar(item.id)}" aria-label="Selecionar ${escapar(item.codigo)}"${SELECIONADOS.has(String(item.id)) ? " checked" : ""}></td>${cols.map((col) => `<td>${formatarValor(item, col.campo)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length + 1}" class="process-empty-row">Nenhuma demanda elegível encontrada.</td></tr>`;
    $("#agrupamento-contagem").textContent = `${lista.length} demanda(s) elegível(is) · ${SELECIONADOS.size} selecionada(s)`;
    $("#agrupamento-pagina-info").textContent = `Página ${pagina} de ${totalPaginas}`;
    $("#agrupamento-anterior").disabled = pagina <= 1;
    $("#agrupamento-proxima").disabled = pagina >= totalPaginas;
    const selectAll = $("#agrupamento-selecionar-pagina");
    selectAll.checked = visiveis.length > 0 && visiveis.every((item) => SELECIONADOS.has(String(item.id)));
    selectAll.indeterminate = visiveis.some((item) => SELECIONADOS.has(String(item.id))) && !selectAll.checked;
    selectAll.onchange = () => {
      visiveis.forEach((item) => selectAll.checked ? SELECIONADOS.add(String(item.id)) : SELECIONADOS.delete(String(item.id)));
      renderDemandas();
    };
    tbody.querySelectorAll("[data-demanda-id]").forEach((checkbox) => {
      checkbox.onchange = () => {
        checkbox.checked ? SELECIONADOS.add(checkbox.dataset.demandaId) : SELECIONADOS.delete(checkbox.dataset.demandaId);
        renderDemandas();
      };
    });
    $("#agrupamento-selecao-resumo").textContent = SELECIONADOS.size ? `${SELECIONADOS.size} demanda(s) selecionada(s).` : "Nenhuma demanda selecionada.";
  }

  function atualizarValoresCampo() {
    const campo = $("#agrupamento-campo").value;
    const select = $("#agrupamento-valor");
    if (!campo) {
      select.innerHTML = '<option value="">Selecione primeiro um atributo</option>';
      select.disabled = true;
      return;
    }
    const valores = new Map();
    universo.filter(elegivel).forEach((item) => {
      const raw = item[campo];
      if (raw !== null && raw !== undefined && raw !== "") valores.set(String(raw), raw);
    });
    select.innerHTML = '<option value="">Todos os valores</option>' + [...valores.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),"pt-BR",{numeric:true})).map(([value,label])=>`<option value="${escapar(value)}">${escapar(label)}</option>`).join("");
    select.disabled = false;
  }

  async function carregarUniverso() {
    const tipo = $("#agrupamento-tipo").value;
    universo = [];
    campos = [];
    SELECIONADOS.clear();
    pagina = 1;
    limparErro();
    renderDemandas();
    if (!tipo) return;
    $("#agrupamento-rows").innerHTML = '<tr><td>Carregando demandas…</td></tr>';
    try {
      const [itens, camposTipo] = await Promise.all([HierApi.listarUniverso(tipo, "todas"), HierApi.listarCamposUniverso(tipo)]);
      universo = itens;
      campos = camposTipo;
      $("#agrupamento-campo").innerHTML = '<option value="">Todos os atributos</option>' + campos.map((c) => `<option value="${escapar(c.campo)}">${escapar(c.rotulo)}</option>`).join("");
      $("#agrupamento-campo").value = "";
      atualizarValoresCampo();
      renderDemandas();
    } catch (error) {
      erro(error.message);
      $("#agrupamento-rows").innerHTML = '<tr><td>Não foi possível carregar o universo.</td></tr>';
    }
  }

  function renderGrupos() {
    const tbody = $("#agrupamentos-tbody");
    tbody.innerHTML = grupos.length ? grupos.map((grupo) => `<tr data-ver-agrupamento="${escapar(grupo.id)}" tabindex="0" aria-label="Visualizar demandas do agrupamento ${escapar(grupo.codigo)}" title="Selecionar para visualizar as demandas"><td><code>${escapar(grupo.codigo)}</code></td><td>${escapar(grupo.nome)}</td><td>${escapar(ROTULOS[grupo.tipo_demanda] || grupo.tipo_demanda)}</td><td>${Number(grupo.quantidade_demandas || 0)}</td><td>${escapar(formatarData(grupo.criado_em))}</td></tr>`).join("") : '<tr><td colspan="5" class="agrupamentos-empty">Nenhum agrupamento cadastrado.</td></tr>';
    tbody.querySelectorAll("[data-ver-agrupamento]").forEach((row) => {
      const visualizar = async () => {
        try {
          const grupo = await HierApi.obterAgrupamento(row.dataset.verAgrupamento);
          const conteudo = window.SLTDemandasGrupo.render(grupo.objetos);
          window.SLTDemandasGrupo.showModal("modal-objetos", `Demandas do grupo — ${grupo.codigo}`, conteudo);
        } catch (error) { erro(error.message, "#agrupamentos-error"); }
      };
      row.onclick = visualizar;
      row.onkeydown = (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        visualizar();
      };
    });
  }

  async function carregarGrupos() {
    $("#agrupamentos-tbody").innerHTML = '<tr><td colspan="5">Carregando agrupamentos…</td></tr>';
    try { grupos = await HierApi.listarAgrupamentos(); renderGrupos(); }
    catch (error) { erro(error.message, "#agrupamentos-error"); $("#agrupamentos-tbody").innerHTML = '<tr><td colspan="5">Não foi possível carregar os agrupamentos.</td></tr>'; }
  }

  function iniciar() {
    const abrir = $("#agrupamento-editor");
    $("#agrupamento-new").onclick = () => {
      $("#agrupamento-form").reset();
      SELECIONADOS.clear();
      pagina = 1;
      abrir.classList.remove("hidden");
      carregarUniverso();
      abrir.scrollIntoView({ behavior: "smooth", block: "start" });
      $("#agrupamento-nome").focus();
    };
    $("#agrupamento-cancel").onclick = () => { abrir.classList.add("hidden"); limparErro(); };
    $("#agrupamento-tipo").onchange = carregarUniverso;
    $("#agrupamento-busca").oninput = () => { pagina = 1; renderDemandas(); };
    $("#agrupamento-campo").onchange = () => { pagina = 1; atualizarValoresCampo(); renderDemandas(); };
    $("#agrupamento-valor").onchange = () => { pagina = 1; renderDemandas(); };
    $("#agrupamento-anterior").onclick = () => { pagina -= 1; renderDemandas(); };
    $("#agrupamento-proxima").onclick = () => { pagina += 1; renderDemandas(); };
    window.SLTDemandasGrupo.bindModalClosures();
    $("#agrupamento-form").onsubmit = async (event) => {
      event.preventDefault();
      limparErro();
      if (!SELECIONADOS.size) return erro("Selecione ao menos uma demanda elegível.");
      try {
        await HierApi.criarAgrupamento({ nome: $("#agrupamento-nome").value.trim(), descricao: $("#agrupamento-descricao").value.trim() || null, tipo_demanda: $("#agrupamento-tipo").value, demanda_ids: [...SELECIONADOS] });
        abrir.classList.add("hidden");
        await carregarGrupos();
      } catch (error) { erro(error.message); }
    };
    carregarGrupos();
    renderDemandas();
  }

  (async () => {
    if (!(await SLTAdminAuth.requireAuth())) return;
    await SLTAdminLabels.init("/restrict/");
    iniciar();
  })().catch((error) => erro(error.message, "#agrupamentos-error"));
})();