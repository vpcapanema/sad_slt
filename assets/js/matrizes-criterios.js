(function (global) {
  "use strict";
  const BASE = "/api/ahp/comparacao-colaborativa/matrizes";
  let sequence = 0;
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = typeof text === "object" ? JSON.stringify(text) : String(text);
    if (className) node.className = className;
    return node;
  }
  function showDetails(dialog, host, record) {
    host.replaceChildren();
    const metadata = element("dl");
    const fields = { Nome: record.nome, ID: record.id || "Arquivo local — ainda não cadastrado",
      Arquivo: record.arquivo_nome || record.conteudo?.arquivo || "Não informado",
      "Cadastrada em": record.criado_em, Assinatura: record.assinatura };
    Object.entries(fields).forEach(([key, value]) => {
      if (value != null) metadata.append(element("dt", key), element("dd", value));
    });
    host.append(metadata, element("p", "Somente visualização. As intensidades de importância são recolhidas exclusivamente pelo formulário público; não são atribuídas neste quadro."));
    function table(title, headers, values) {
      host.append(element("h3", title));
      const shell = element("div", null, "matriz-table-wrap");
      const grid = element("table", null, "admin-table matriz-view-table ami-matrix");
      const head = grid.createTHead().insertRow();
      headers.forEach(header => head.append(element("th", header)));
      const body = grid.createTBody();
      values.forEach(valuesRow => {
        const row = body.insertRow();
        valuesRow.forEach(value => row.append(element("td", value)));
      });
      shell.append(grid); host.append(shell);
      return grid;
    }
    const criteria = rows(record.conteudo);
    const keys = [...new Set(criteria.flatMap(row => Object.keys(row)))];
    const premises = table("Critérios e premissas do arquivo", keys, criteria.map(row => keys.map(key => row[key] ?? "—")));
    const names = criteria.map((row, index) => {
      const key = Object.keys(row).find(key => ["criterio", "nome", "name"].includes(key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()));
      return key ? row[key] : "Critério " + (index + 1);
    });
    const pairs = table("Estrutura de comparação pareada — sem julgamentos", ["Critério", ...names],
      names.map(name => [name, ...names.map(() => "—")]));
    dialog.showModal();
    [premises, pairs].forEach(grid => global.SLTAnalysisTable(grid));
  }
  function rows(content) {
    const values = Array.isArray(content) ? content : content && (content.linhas || content.rows || content.criterios || content.dados);
    return Array.isArray(values) ? values.filter(row => row && typeof row === "object" && !Array.isArray(row)) : [];
  }
  async function request(url, options) {
    const response = await fetch(url, { credentials: "same-origin", ...options });
    if (!response.ok) {
      if (global.SicardApiErro) throw await global.SicardApiErro.deResposta(response, { method: options?.method || "GET", url });
      const body = await response.json().catch(() => null);
      throw new Error(typeof body?.detail === "string" ? body.detail : "Não foi possível carregar ou cadastrar a matriz (HTTP " + response.status + ").");
    }
    return response.json();
  }
  function base64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo da matriz."));
      reader.readAsDataURL(file);
    });
  }
  function mount(root, options = {}) {
    const container = root.matches("[data-matrix-picker]") ? root : root.querySelector("[data-matrix-picker]");
    const find = name => root.querySelector("[data-matrix-" + name + "]");
    const select = find("select"), file = find("file"), name = find("name"), feedback = find("feedback");
    const details = find("details"), upload = find("upload"), modes = [...container.querySelectorAll("[data-matrix-mode]")];
    const group = "matrix-source-" + (++sequence);
    modes.forEach(radio => { radio.name = group; });
    let records = [], current = null, preview = null, parsedFile = null, version = 0, busy = false, disabled = false, catalogLoaded = false;
    function sync() {
      container.querySelectorAll("input, select, button").forEach(control => {
        if (control === details || control.closest("dialog")) return;
        control.disabled = disabled || busy;
      });
      const mode = modes.find(radio => radio.checked)?.value;
      find("existing").hidden = mode !== "existing";
      find("new").hidden = mode !== "new";
      if (mode) find(mode === "new" ? "new-summary" : "existing-summary").append(details, feedback);
      else container.append(details, feedback);
      const action = file.files[0] ? "Cadastrar matriz" : "Carregar arquivo da matriz";
      upload.title = action; upload.setAttribute("aria-label", action);
      upload.querySelector("i").className = file.files[0] ? "fas fa-upload" : "fas fa-folder-open";
    }
    function showSummary(record) { preview = record; details.hidden = !record; details.textContent = record ? summary(record) : ""; }
    function notify(record) { current = record; showSummary(record); if (options.onChange) options.onChange(record); }
    function render(id = select.value) {
      select.replaceChildren(new Option("Selecione uma matriz…", ""));
      records.forEach(record => select.add(new Option(record.nome || record.arquivo_nome || record.id, record.id)));
      select.value = id;
    }
    function summary(record) {
      const filename = record.arquivo_nome || record.conteudo?.arquivo;
      return (record.nome || "Matriz") + " · " + rows(record.conteudo).length + " critérios" + (filename ? " · " + filename : "") + ".";
    }
    async function choose(id, fallback) {
      const token = ++version;
      notify(null);
      if (!id) { busy = false; select.value = ""; feedback.textContent = ""; sync(); return; }
      busy = true; sync(); feedback.textContent = "Carregando matriz…";
      try {
        const record = fallback?.conteudo ? { ...fallback, id } : await request(BASE + "/" + encodeURIComponent(id));
        if (token !== version) return;
        if (!records.some(item => String(item.id) === String(id))) records.push(record);
        modes.forEach(radio => { radio.checked = radio.value === "existing"; });
        render(id); notify(record); feedback.textContent = "";
      } catch (error) {
        if (token !== version) return;
        select.value = ""; feedback.textContent = error.message;
      } finally { if (token === version) { busy = false; sync(); } }
    }
    async function load() {
      const token = ++version, previous = current;
      busy = true; sync(); feedback.textContent = "Carregando matrizes cadastradas…";
      try {
        const values = await request(BASE);
        if (token !== version) return;
        if (!Array.isArray(values)) throw new Error("A lista de matrizes recebida é inválida.");
        records = values;
        catalogLoaded = true;
        if (previous && !records.some(item => String(item.id) === String(previous.id))) records.push(previous);
        render(previous?.id || "");
        feedback.textContent = previous ? "" : records.length ? "Selecione uma matriz ou cadastre um novo arquivo." : "Nenhuma matriz cadastrada. Envie o primeiro arquivo.";
      } catch (error) { if (token === version) feedback.textContent = error.message + " Use Atualizar matrizes para tentar novamente."; }
      finally { if (token === version) { busy = false; sync(); } }
    }
    select.addEventListener("change", () => { file.value = ""; choose(select.value); });
    modes.forEach(radio => radio.addEventListener("change", () => {
      version++; busy = false; file.value = ""; parsedFile = null; select.value = ""; notify(null);
      feedback.textContent = ""; sync();
      if (radio.value === "existing" && !catalogLoaded) load();
    }));
    details.addEventListener("click", () => { if (preview) showDetails(find("dialog"), find("detail-content"), preview); });
    find("close").addEventListener("click", () => find("dialog").close());
    name.addEventListener("input", () => {
      if (preview && !preview.id) showSummary({ ...preview, nome: name.value.trim() || file.files[0]?.name });
    });
    file.addEventListener("change", async () => {
      const selectedFile = file.files[0], token = ++version;
      notify(null); parsedFile = null;
      if (!selectedFile) { feedback.textContent = ""; sync(); return; }
      if (!name.value.trim()) name.value = selectedFile.name.replace(/\.[^.]+$/, "");
      busy = true; sync(); feedback.textContent = "Lendo arquivo da matriz…";
      try {
        const content = await global.SLTMatrizArquivo.ler(selectedFile);
        if (token !== version) return;
        if (rows(content).length < 2) throw new Error("A matriz deve conter ao menos dois critérios.");
        parsedFile = content;
        showSummary({ nome: name.value.trim(), arquivo_nome: selectedFile.name, conteudo: content });
        feedback.textContent = "Arquivo carregado. Clique em Cadastrar matriz para registrá-lo.";
      } catch (error) {
        if (token === version) { file.value = ""; feedback.textContent = error.message; }
      } finally { if (token === version) { busy = false; sync(); } }
    });
    find("refresh").addEventListener("click", load);
    find("upload").addEventListener("click", async () => {
      if (busy || disabled) return;
      const selectedFile = file.files[0], matrixName = name.value.trim();
      if (!selectedFile) { file.click(); return; }
      if (!matrixName) { feedback.textContent = "Informe o nome da nova matriz."; name.focus(); return; }
      const token = ++version;
      busy = true; sync(); feedback.textContent = "Lendo e cadastrando matriz…";
      try {
        const content = parsedFile || await global.SLTMatrizArquivo.ler(selectedFile);
        if (rows(content).length < 2) throw new Error("A matriz deve conter ao menos dois critérios.");
        const payload = { nome: matrixName, conteudo: content, arquivo_nome: selectedFile.name, arquivo_base64: await base64(selectedFile) };
        if (token !== version) return;
        const record = await request(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (token !== version) return;
        records = records.filter(item => String(item.id) !== String(record.id)); records.push(record);
        render(record.id); notify(record); file.value = ""; name.value = record.nome || matrixName; parsedFile = null;
        feedback.textContent = "Matriz cadastrada e selecionada.";
      } catch (error) { if (token === version) feedback.textContent = error.message; }
      finally { if (token === version) { busy = false; sync(); } }
    });
    const ready = load();
    return {
      ready, choose,
      selected: () => current,
      pending: () => busy || Boolean(file.files[0]),
      setDisabled(value) { disabled = Boolean(value); sync(); },
      reset() { version++; busy = false; notify(null); parsedFile = null; select.value = ""; file.value = ""; name.value = ""; feedback.textContent = ""; modes.forEach(radio => { radio.checked = false; }); sync(); if (!catalogLoaded) load(); },
    };
  }
  global.SLTMatrizesCriterios = { mount, rows };
})(window);
