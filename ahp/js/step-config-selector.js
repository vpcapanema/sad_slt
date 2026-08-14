/** Seletor comum da configuração de portfólio ativa nas etapas AHP. */
(function (global) {
  "use strict";

  var STORAGE_KEY = "slt_ahp_config_atual";

  async function request(path) {
    var response = await global.fetch(path, { credentials: "same-origin" });
    var body = await response.json().catch(function () { return null; });
    if (!response.ok) {
      throw new Error((body && (body.detail || body.message)) || "Falha na consulta de configurações.");
    }
    return body;
  }

  function listarConfigs() {
    if (global.SLTConfigApi) return global.SLTConfigApi.listar("portfolio", {});
    return request("/api/ahp/configuracoes?tipo=portfolio");
  }

  function obterConfig(codigo) {
    if (global.SLTConfigApi) return global.SLTConfigApi.obter("portfolio", codigo);
    return request("/api/ahp/configuracoes/portfolio/" + encodeURIComponent(codigo));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function contextoAtual() {
    try {
      var value = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      return value && value.tipo === "portfolio" && value.codigo ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function salvarContexto(codigo) {
    global.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tipo: "portfolio", codigo: codigo })
    );
  }

  function criarComponente() {
    if (document.getElementById("ahp-step-config-select")) return null;
    var main = document.querySelector("main.ahp-main");
    if (!main) return null;
    var referencia = main.querySelector(".ahp-progress") || main.firstElementChild;
    var section = document.createElement("section");
    section.className = "card ahp-step-config-selector";
    section.innerHTML =
      '<div class="ahp-step-config-selector__header">' +
      '<i class="fas fa-database" aria-hidden="true"></i>' +
      '<div><strong>Configuração de portfólio ativa</strong>' +
      '<p>Selecione o registro de <code>ahp.config_multicriterio_portfolio</code> usado nesta etapa.</p></div></div>' +
      '<label for="ahp-step-config-select" class="c-form-label">Configuração</label>' +
      '<select id="ahp-step-config-select" class="c-form-control" aria-describedby="ahp-step-config-status">' +
      '<option value="">Carregando configurações…</option></select>' +
      '<div id="ahp-step-config-status" class="ahp-step-config-status" role="status" aria-live="polite"></div>';
    if (referencia && referencia.parentNode) {
      referencia.parentNode.insertBefore(section, referencia.nextSibling);
    } else {
      main.insertBefore(section, main.firstChild);
    }
    return section;
  }

  function labelConfig(cfg) {
    var partes = [cfg.codigo];
    if (cfg.denominacao) partes.push("[" + cfg.denominacao + "]");
    if (cfg.nome) partes.push(cfg.nome);
    return partes.join(" — ");
  }

  function renderResumo(cfg) {
    var status = document.getElementById("ahp-step-config-status");
    if (!status || !cfg) return;
    var objetos = cfg.universo_objetos || [];
    var criterios = cfg.criterios || [];
    status.innerHTML =
      '<strong>' + escapeHtml(cfg.nome || cfg.codigo) + '</strong>' +
      '<span>Código: ' + escapeHtml(cfg.codigo) + '</span>' +
      '<span>Objeto: ' + escapeHtml(cfg.tipo_demanda_nome || cfg.tipo_demanda || "—") + '</span>' +
      '<span>Universo: ' + objetos.length + ' objeto(s)</span>' +
      '<span>Matriz: ' + criterios.length + ' critério(s)</span>';
  }

  function renderAvisos(avisos) {
    var status = document.getElementById("ahp-step-config-status");
    if (!status) return;
    var lista = (avisos || []).filter(Boolean);
    var existente = status.querySelector(".ahp-step-config-status__avisos");
    if (existente) existente.remove();
    if (!lista.length) return;
    var box = document.createElement("div");
    box.className = "ahp-step-config-status__avisos";
    box.innerHTML = lista
      .map(function (msg) {
        return (
          '<div class="ahp-step-config-status__aviso">' +
          '<i class="fas fa-triangle-exclamation" aria-hidden="true"></i>' +
          "<span>" + escapeHtml(msg) + "</span></div>"
        );
      })
      .join("");
    status.appendChild(box);
  }

  // Delega o preenchimento dos campos reais do formulário de cada etapa para
  // um hook opcional definido pela própria página (ahp-config-formfill.js).
  // Sempre revalida visualmente (field-filled) e mostra os avisos retornados.
  function aplicarNaPagina(cfg) {
    var hook = global.SLTAhpConfigFormFill && global.SLTAhpConfigFormFill.aplicar;
    var resultado = hook ? hook(cfg) : null;
    Promise.resolve(resultado)
      .then(function (avisos) {
        renderAvisos(avisos);
      })
      .catch(function () {
        /* falhas no preenchimento não devem quebrar o carregamento da config */
      })
      .then(function () {
        if (global.SLTFieldFilled) global.SLTFieldFilled.syncAll(document);
      });
  }

  async function iniciar() {
    criarComponente();
    var select = document.getElementById("ahp-step-config-select");
    var status = document.getElementById("ahp-step-config-status");
    if (!select) return;

    try {
      var configs = await listarConfigs();
      var atual = contextoAtual();
      select.innerHTML = '<option value="">Selecione uma configuração…</option>';
      (configs || []).forEach(function (cfg) {
        var option = document.createElement("option");
        option.value = cfg.codigo;
        option.textContent = labelConfig(cfg);
        select.appendChild(option);
      });

      select.addEventListener("change", async function () {
        if (!select.value) return;
        salvarContexto(select.value);
        status.textContent = "Carregando configuração…";
        try {
          var completa = await obterConfig(select.value);
          renderResumo(completa);
          global.dispatchEvent(new CustomEvent("slt:ahp-config-loaded", { detail: completa }));
          aplicarNaPagina(completa);
        } catch (error) {
          status.textContent = error && error.message ? error.message : "Falha ao carregar configuração.";
        }
      });

      if (!atual) {
        status.textContent = "Selecione uma configuração para carregar os dados desta etapa.";
        return;
      }
      select.value = atual.codigo;
      var completa = await obterConfig(atual.codigo);
      renderResumo(completa);
      global.dispatchEvent(
        new CustomEvent("slt:ahp-config-loaded", { detail: completa })
      );
      aplicarNaPagina(completa);
    } catch (error) {
      select.innerHTML = '<option value="">Não foi possível carregar</option>';
      status.textContent = error && error.message ? error.message : "Falha ao consultar configurações.";
    }
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})(window);
