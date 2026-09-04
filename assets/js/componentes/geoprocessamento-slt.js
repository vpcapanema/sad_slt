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
      const botaoLabel = this.getAttribute("botao-label") || "Executar cálculo isolado";
      // Cada fase publica na sua própria página de cadastro e upload.
      const uploadHref = this.getAttribute("upload-href")
        || (fase === "fase1"
            ? "/restrict/hierarquizacao/cadastro-upload-elegibilidade/"
            : "/restrict/hierarquizacao/cadastro-upload-favorabilidade/");
      // Texto do card de saída antes de qualquer seleção: qual insumo esta
      // fase espera, para o usuário não confundir risco/restrição com
      // favorabilidade quando lê o mesmo componente em páginas diferentes.
      const textoSaidaVazia = this.getAttribute("texto-saida-vazia")
        || "Selecione o insumo homologado ou faça o upload das camadas com os índices de favorabilidade;";

      this.innerHTML = `
        <div class="fase1-operational">
          <div class="fase1-op-card">
            <h4><i class="fas fa-location-dot"></i> Camada de demandas</h4>
            <div class="fase1-op-card-body">
              <div class="fase1-op-controls" id="${demandasId}-ctrl"></div>
              <div class="fase1-op-preview" id="${demandasId}"><p class="ahp-help-text">Selecione uma hierarquização.</p></div>
            </div>
          </div>
          <div class="fase1-op-card">
            <h4><i class="fas fa-layer-group"></i> ${tituloSaida}</h4>
            <div class="fase1-op-card-body">
              <div class="fase1-op-controls" id="${saidaId}-ctrl"></div>
              <div class="fase1-op-preview" id="${saidaId}"><p class="ahp-help-text">${textoSaidaVazia.replace("upload", '<a href="' + uploadHref + '">upload</a>')}</p></div>
            </div>
          </div>
        </div>
        <iframe id="${frameId}" class="fase1-gp-frame" title="Componente de geoprocessamento SLT — ${fase}" src="/restrict/geoespacial/bancada/?modulo=${fase}&amp;embutido=1"></iframe>
        <div class="fase1-execute">
          <label>Cálculo <select id="${modeloId}"><option value="${modelo}">${modeloLabel}</option></select></label>
          <button id="${executarId}" class="btn btn-primary" type="button"><i class="fas fa-play"></i> ${botaoLabel}</button>
        </div>`;
      this.dataset.ready = "true";
    }
  }

  if (!customElements.get("slt-geoprocessamento")) {
    customElements.define("slt-geoprocessamento", SltGeoprocessamento);
  }
})();
