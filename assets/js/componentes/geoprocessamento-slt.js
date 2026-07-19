(function () {
  "use strict";

  class SltGeoprocessamento extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === "true") return;
      const fase = this.getAttribute("fase") || "fase1";
      const tituloSaida = this.getAttribute("titulo-saida") || "Camadas de saída";
      const saidaId = this.getAttribute("saida-id") || "gp-saida";
      const demandasId = this.getAttribute("demandas-id") || "gp-demandas";
      const frameId = this.getAttribute("frame-id") || "gp-frame";
      const modeloId = this.getAttribute("modelo-id") || "modelo-geoprocessamento";
      const executarId = this.getAttribute("executar-id") || "executar-geoprocessamento";
      const modelo = this.getAttribute("modelo") || `fluxo_${fase}`;
      const modeloLabel = this.getAttribute("modelo-label") || fase;

      this.innerHTML = `
        <div class="fase1-operational">
          <h3>Camadas operacionais</h3>
          <div class="fase1-grid-2">
            <div><h4>Camada de demandas</h4><div id="${demandasId}"><p class="ahp-help-text">Selecione uma hierarquização.</p></div></div>
            <div><h4>${tituloSaida}</h4><div id="${saidaId}"><p class="ahp-help-text">Selecione o insumo homologado.</p></div></div>
          </div>
        </div>
        <iframe id="${frameId}" class="fase1-gp-frame" title="Componente de geoprocessamento SLT — ${fase}" src="/restrict/geoespacial/bancada/?modulo=${fase}&amp;embutido=1"></iframe>
        <div class="fase1-execute">
          <label>Cálculo <select id="${modeloId}"><option value="${modelo}">${modeloLabel}</option></select></label>
          <button id="${executarId}" class="btn btn--primary" type="button"><i class="fas fa-play"></i> Executar cálculo isolado</button>
        </div>`;
      this.dataset.ready = "true";
    }
  }

  if (!customElements.get("slt-geoprocessamento")) {
    customElements.define("slt-geoprocessamento", SltGeoprocessamento);
  }
})();
