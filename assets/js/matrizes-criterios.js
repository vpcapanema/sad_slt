(function (global) {
  "use strict";
  const BASE = "/api/ahp/comparacao-colaborativa/matrizes";
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
    let records = [], current = null, version = 0, busy = false, disabled = false, catalogLoaded = false;
    function sync() { container.querySelectorAll("input, select, button").forEach(control => { control.disabled = disabled || busy; }); }
    function notify(record) { current = record; if (options.onChange) options.onChange(record); }
    function render(id = select.value) {
      select.replaceChildren(new Option("Selecione uma matriz…", ""));
      records.forEach(record => select.add(new Option(record.nome || record.arquivo_nome || record.id, record.id)));
      select.value = id;
    }
    function summary(record) {
      return (record.nome || "Matriz") + " · " + rows(record.conteudo).length + " critérios" + (record.arquivo_nome ? " · " + record.arquivo_nome : "") + ".";
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
        render(id); notify(record); feedback.textContent = summary(record);
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
        feedback.textContent = previous ? summary(previous) : records.length ? "Selecione uma matriz ou cadastre um novo arquivo." : "Nenhuma matriz cadastrada. Envie o primeiro arquivo.";
      } catch (error) { if (token === version) feedback.textContent = error.message + " Use Atualizar matrizes para tentar novamente."; }
      finally { if (token === version) { busy = false; sync(); } }
    }
    select.addEventListener("change", () => { file.value = ""; choose(select.value); });
    file.addEventListener("change", () => {
      if (file.files[0] && !name.value.trim()) name.value = file.files[0].name.replace(/\.[^.]+$/, "");
      feedback.textContent = file.files[0] ? "Clique em Cadastrar matriz para registrar o arquivo antes de utilizá-lo." : "";
    });
    find("refresh").addEventListener("click", load);
    find("upload").addEventListener("click", async () => {
      if (busy || disabled) return;
      const selectedFile = file.files[0], matrixName = name.value.trim();
      if (!selectedFile || !matrixName) { feedback.textContent = "Informe o nome e selecione o arquivo da nova matriz."; (!matrixName ? name : file).focus(); return; }
      const token = ++version;
      busy = true; sync(); feedback.textContent = "Lendo e cadastrando matriz…";
      try {
        const content = await global.SLTMatrizArquivo.ler(selectedFile);
        if (rows(content).length < 2) throw new Error("A matriz deve conter ao menos dois critérios.");
        const payload = { nome: matrixName, conteudo: content, arquivo_nome: selectedFile.name, arquivo_base64: await base64(selectedFile) };
        if (token !== version) return;
        const record = await request(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (token !== version) return;
        records = records.filter(item => String(item.id) !== String(record.id)); records.push(record);
        render(record.id); notify(record); file.value = ""; name.value = "";
        feedback.textContent = "Matriz cadastrada e selecionada. " + summary(record);
      } catch (error) { if (token === version) feedback.textContent = error.message; }
      finally { if (token === version) { busy = false; sync(); } }
    });
    const ready = load();
    return {
      ready, choose,
      selected: () => current,
      pending: () => busy || Boolean(file.files[0]),
      setDisabled(value) { disabled = Boolean(value); sync(); },
      reset() { version++; busy = false; notify(null); select.value = ""; file.value = ""; name.value = ""; feedback.textContent = ""; sync(); if (!catalogLoaded) load(); },
    };
  }
  global.SLTMatrizesCriterios = { mount, rows };
})(window);
