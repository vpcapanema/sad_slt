/**
 * Resumo compartilhado das fases de hierarquização.
 * Reproduz o "summary" da Fase 1 (seção 1 e card "Camada de demandas" da seção 3)
 * para reutilização nas Fases 2 e 3. Objetos são clicáveis e abrem o modal
 * `#modal-objetos` renderizado por SLTObjetoDetalhe.
 */
(function (global) {
  "use strict";

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);

  const TIPO_DEMANDA_LABEL = {
    1: "Plano", 2: "Programa", 3: "Projeto",
    plano: "Plano", programa: "Programa", projeto: "Projeto",
  };

  function objetos(hierarquizacao) {
    if (hierarquizacao?.objetos && hierarquizacao.objetos.length) {
      return hierarquizacao.objetos;
    }
    const docs = hierarquizacao?.dados_hierarquizacao?.objetos || [];
    return docs.map((item) => item.cabecalho_objeto || item);
  }

  function tipoLabel(hierarquizacao, objs) {
    const t =
      hierarquizacao?.tipo_demanda_id ??
      hierarquizacao?.tipo_demanda ??
      objs?.[0]?.tipo_demanda ??
      objs?.[0]?.cabecalho_objeto?.tipo_demanda;
    return TIPO_DEMANDA_LABEL[t] || (t ? String(t) : "—");
  }

  function abrirModal(o) {
    if (!o) return;
    const modal = document.getElementById("modal-objetos");
    if (!modal) return;
    modal.querySelector("[data-modal-title]").textContent =
      `${o.codigo || ""} — ${o.nome || "Objeto"}`.replace(/^ — /, "");
    const body = modal.querySelector("[data-modal-body]");
    body.innerHTML = "";
    if (global.SLTObjetoDetalhe?.corpo) body.appendChild(global.SLTObjetoDetalhe.corpo(o));
    modal.classList.remove("hidden");
  }

  function secao1(box, hierarquizacao) {
    if (!box) return;
    const objs = objetos(hierarquizacao);
    const itens = objs
      .map((o, index) => {
        const cod = o.codigo || o.demanda_id || `Objeto ${index + 1}`;
        return `<button type="button" class="fase1-obj-link" data-idx="${index}"><span class="nome">${esc(o.nome || "Sem denominação")}</span><span class="cod">${esc(cod)}</span></button>`;
      })
      .join("");
    box.classList.add("fase1-summary");
    box.innerHTML = `
      <div class="fase1-summary-meta">
        <div class="fase1-meta-card"><small>Nome</small><strong>${esc(hierarquizacao.nome || "—")}</strong></div>
        <div class="fase1-meta-card"><small>Código</small><strong>${esc(hierarquizacao.codigo || "—")}</strong></div>
        <div class="fase1-meta-card"><small>Tipo de objeto</small><strong>${esc(tipoLabel(hierarquizacao, objs))}</strong></div>
      </div>
      <div class="fase1-objs-card">
        <h4><i class="fas fa-list-ul"></i> Objetos do grupo (${objs.length})</h4>
        <div class="fase1-objs-grid">${itens || '<p class="ahp-help-text">Nenhum objeto.</p>'}</div>
      </div>`;
    box.classList.remove("hidden");
    box.querySelectorAll(".fase1-obj-link").forEach((btn) => {
      btn.addEventListener("click", () => abrirModal(objs[Number(btn.dataset.idx)]));
    });
  }

  function camadaDemandas(layer, hierarquizacao) {
    if (!layer) return;
    const objs = objetos(hierarquizacao);
    const objsTexto = objs
      .map((o, index) => {
        const cod = o.codigo || o.demanda_id || `Objeto ${index + 1}`;
        return `<button type="button" class="fase1-gp-obj" data-idx="${index}">${esc(o.nome || "Sem denominação")} <span class="cod">(${esc(cod)})</span></button>`;
      })
      .join("");
    layer.innerHTML = `
      <div class="fase1-gp-meta">
        <div class="fase1-gp-card"><small>Nome</small><strong>${esc(hierarquizacao.nome || "—")}</strong></div>
        <div class="fase1-gp-card"><small>Código</small><strong>${esc(hierarquizacao.codigo || "—")}</strong></div>
        <div class="fase1-gp-card"><small>Tipo de objeto</small><strong>${esc(tipoLabel(hierarquizacao, objs))}</strong></div>
      </div>
      <div class="fase1-gp-objs">
        <h5><i class="fas fa-list-ul"></i> Objetos do grupo (${objs.length})</h5>
        <p class="fase1-gp-objs-list">${objsTexto || '<span class="ahp-help-text">Nenhum objeto.</span>'}</p>
      </div>`;
    layer.querySelectorAll(".fase1-gp-obj").forEach((btn) => {
      btn.addEventListener("click", () => abrirModal(objs[Number(btn.dataset.idx)]));
    });
  }

  function initModal() {
    const modal = document.getElementById("modal-objetos");
    if (!modal || modal.dataset.resumoWired) return;
    modal.dataset.resumoWired = "1";
    const fechar = () => modal.classList.add("hidden");
    modal.querySelector("[data-modal-close]")?.addEventListener("click", fechar);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) fechar();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) fechar();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initModal);
  } else {
    initModal();
  }

  global.SLTResumoFase = { objetos, tipoLabel, secao1, camadaDemandas, abrirModal, initModal };
})(window);
