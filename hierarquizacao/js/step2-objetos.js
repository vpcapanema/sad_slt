(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const hierCodigo = params.get("codigo") || localStorage.getItem("hier_codigo");

  let hierData = null;
  let todoObjetos = [];
  let selecionados = new Set();

  function atualizarContador() {
    document.getElementById("obj-contador").textContent =
      `${selecionados.size} de ${todoObjetos.length} selecionado(s)`;
    document.getElementById("btn-proximo").disabled = selecionados.size === 0;
  }

  function renderTabela(objetos) {
    if (!objetos.length) {
      document.getElementById("obj-empty").classList.remove("hidden");
      document.getElementById("obj-loading").classList.add("hidden");
      return;
    }
    document.getElementById("obj-loading").classList.add("hidden");
    document.getElementById("obj-table-wrap").classList.remove("hidden");

    const tbody = document.getElementById("obj-tbody");
    tbody.innerHTML = "";
    objetos.forEach((obj, idx) => {
      const tr = document.createElement("tr");
      tr.dataset.idx = idx;
      tr.innerHTML = `
        <td><input type="checkbox" class="chk-obj" data-idx="${idx}" ${selecionados.has(idx) ? "checked" : ""}></td>
        <td><code>${obj.codigo || "—"}</code></td>
        <td>${obj.nome || "—"}</td>
        <td>${obj.diretoria_id || "—"}</td>
        <td><span class="badge">${obj.status || "—"}</span></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll(".chk-obj").forEach((chk) => {
      chk.addEventListener("change", () => {
        const i = parseInt(chk.dataset.idx, 10);
        if (chk.checked) selecionados.add(i);
        else selecionados.delete(i);
        atualizarContador();
        document.getElementById("chk-all").checked = selecionados.size === todoObjetos.length;
      });
    });
  }

  function renderContexto(hier) {
    const card = document.getElementById("ctx-card");
    card.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:16px;">
        <div><span class="ahp-label">Hierarquização</span><br><code>${hier.codigo}</code></div>
        <div><span class="ahp-label">Nome</span><br>${hier.nome}</div>
        <div><span class="ahp-label">Config. multicritério</span><br><code>${hier.config_codigo || hier.config_id}</code></div>
        <div><span class="ahp-label">Grupo</span><br>${hier.grupo_id || "—"}</div>
      </div>
    `;
  }

  async function confirmarObjetos() {
    const btn = document.getElementById("btn-proximo");
    btn.disabled = true;
    btn.textContent = "Salvando…";
    document.getElementById("submit-error").classList.add("hidden");

    const objSelecionados = Array.from(selecionados).sort().map((i) => {
      const obj = todoObjetos[i];
      return {
        objeto_ahp_id: obj.id,
        codigo: obj.codigo,
        nome: obj.nome,
        ordem: i + 1,
      };
    });

    try {
      await HierApi.atualizar(hierCodigo, {
        status: "em_julgamento",
        objetos: objSelecionados,
      });
      localStorage.setItem("hier_codigo", hierCodigo);
      window.location.href = `/restrict/hierarquizacao/processos/avaliacao/?codigo=${hierCodigo}`;
    } catch (err) {
      document.getElementById("submit-error").classList.remove("hidden");
      document.getElementById("submit-error-msg").textContent = err.message;
      btn.disabled = false;
      btn.innerHTML = 'Confirmar objetos <i class="fas fa-arrow-right" aria-hidden="true"></i>';
    }
  }

  async function init() {
    if (!hierCodigo) {
      window.location.href = "/restrict/hierarquizacao/processos/nova/";
      return;
    }

    document.getElementById("btn-proximo").addEventListener("click", confirmarObjetos);

    document.getElementById("btn-sel-todos").addEventListener("click", () => {
      todoObjetos.forEach((_, i) => selecionados.add(i));
      document.querySelectorAll(".chk-obj").forEach((c) => (c.checked = true));
      document.getElementById("chk-all").checked = true;
      atualizarContador();
    });

    document.getElementById("btn-des-todos").addEventListener("click", () => {
      selecionados.clear();
      document.querySelectorAll(".chk-obj").forEach((c) => (c.checked = false));
      document.getElementById("chk-all").checked = false;
      atualizarContador();
    });

    document.getElementById("chk-all").addEventListener("change", (e) => {
      if (e.target.checked) {
        todoObjetos.forEach((_, i) => selecionados.add(i));
        document.querySelectorAll(".chk-obj").forEach((c) => (c.checked = true));
      } else {
        selecionados.clear();
        document.querySelectorAll(".chk-obj").forEach((c) => (c.checked = false));
      }
      atualizarContador();
    });

    try {
      hierData = await HierApi.obter(hierCodigo);
      renderContexto(hierData);

      // Pré-selecionar objetos já salvos
      if (hierData.objetos && hierData.objetos.length) {
        hierData.objetos.forEach((o, i) => selecionados.add(i));
      }

      const grupo = hierData.grupo_id || null;
      const objParams = { status: "elegivel_ahp" };
      if (grupo) objParams.grupo = grupo;

      todoObjetos = await HierApi.listarObjetos(objParams);
      renderTabela(todoObjetos);
      atualizarContador();
    } catch (err) {
      document.getElementById("obj-loading").classList.add("hidden");
      document.getElementById("obj-error").classList.remove("hidden");
      document.getElementById("obj-error-msg").textContent = err.message;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
