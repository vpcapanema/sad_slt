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
      // Mesma alternativa do card de camadas, aplicada ao insumo do outro card:
      // ou se escolhe uma hierarquização já cadastrada, ou se cadastra uma.
      const hierarquizacaoHref = this.getAttribute("hierarquizacao-href")
        || "/restrict/hierarquizacao/processos/";
      const uploadLabel = this.getAttribute("upload-label")
        || (fase === "fase1"
            ? "Upload de camadas de elegibilidade territorial"
            : "Upload de camadas de favorabilidade de grade e da rede");

      this.innerHTML = `
        <div class="fase1-operational">
          <div class="fase1-op-card">
            <h4><span class="cadastro-subsec-num">1.1</span><i class="fas fa-location-dot"></i> Camada de demandas</h4>
            <div class="fase1-op-card-body">
              <div class="fase1-op-controls" id="${demandasId}-ctrl"></div>
              <div class="fase1-op-alternativa">
                <p class="fase1-op-ou">ou</p>
                <a class="btn btn-secondary fase1-op-upload" href="${hierarquizacaoHref}"><i class="fas fa-folder-plus"></i> Cadastrar uma hierarquização</a>
              </div>
              <div class="fase1-op-preview" id="${demandasId}"></div>
            </div>
          </div>
          <div class="fase1-op-card">
            <h4><span class="cadastro-subsec-num">1.2</span><i class="fas fa-layer-group"></i> ${tituloSaida}</h4>
            <div class="fase1-op-card-body">
              <div class="fase1-op-controls" id="${saidaId}-ctrl"></div>
              <div class="fase1-op-preview" id="${saidaId}"></div>
              <!-- Fora do preview de propósito: o preview é reescrito a cada
                   seleção de camada, e o caminho para o upload sumia junto. -->
              <div class="fase1-op-alternativa">
                <p class="fase1-op-ou">ou</p>
                <a class="btn btn-secondary fase1-op-upload" href="${uploadHref}"><i class="fas fa-cloud-arrow-up"></i> ${uploadLabel}</a>
              </div>
            </div>
          </div>
        </div>
        <div class="ahp-subcard info-card"><div class="ahp-subsection-title"><span class="cadastro-subsec-num">1.3</span><i class="fas fa-drafting-compass" aria-hidden="true"></i><span>Bancada de geoprocessamento</span></div><iframe id="${frameId}" class="fase1-gp-frame" title="Componente de geoprocessamento SLT — ${fase}" src="/restrict/geoespacial/bancada/?modulo=${fase}&amp;embutido=1"></iframe></div>
        <div class="ahp-subcard info-card"><div class="ahp-subsection-title"><span class="cadastro-subsec-num">1.4</span><i class="fas fa-play" aria-hidden="true"></i><span>Execução do cálculo</span></div><div class="fase1-execute">
          <label>Cálculo <select id="${modeloId}"><option value="${modelo}">${modeloLabel}</option></select></label>
          <button id="${executarId}" class="btn btn-primary" type="button"><i class="fas fa-play"></i> ${botaoLabel}</button>
        </div></div>`;
      this.dataset.ready = "true";
      sincronizarAlternativas(this);
      // Delegado no card: os seletores são movidos para dentro dele depois que
      // o componente renderiza, então ouvir cada um na mão perderia os que
      // chegam atrasados.
      this.addEventListener("change", () => sincronizarAlternativas(this));
    }
  }

  /**
   * "ou + botão" é o caminho para quem ainda não tem o insumo. Com algo
   * escolhido no card, ele sai de cena e o conteúdo da seleção ocupa o espaço.
   */
  function sincronizarAlternativas(raiz) {
    const escopo = raiz || document;
    escopo.querySelectorAll(".fase1-op-card").forEach((card) => {
      const alternativa = card.querySelector(".fase1-op-alternativa");
      if (!alternativa) return;
      const seletores = card.querySelectorAll(".fase1-op-controls select");
      const escolhido = Array.from(seletores).some((select) => Boolean(select.value));
      alternativa.hidden = escolhido;
    });
  }

  window.SLTGeoprocessamento = { sincronizarAlternativas };

  if (!customElements.get("slt-geoprocessamento")) {
    customElements.define("slt-geoprocessamento", SltGeoprocessamento);
  }
})();
