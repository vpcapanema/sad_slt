/**
 * Cadastro e upload de camada homologada.
 *
 * Fluxo: o arquivo é inspecionado em staging (sem entrar no acervo), a prévia
 * desenha a geometria e os metadados lidos, e só o botão Enviar consuma a
 * importação e a homologação. Cancelar descarta a inspeção e devolve a página
 * ao estado inicial — nada foi gravado até ali.
 */
(function () {
  "use strict";

  const API = "/api/geoespacial";
  const raiz = document.querySelector(".cadastro-upload");
  if (!raiz) return;

  const campoArquivo = document.getElementById("campo-arquivo");
  const status = document.getElementById("upload-status");
  const blocoPrevia = document.getElementById("bloco-previa");
  const aviso = document.getElementById("previa-aviso");
  const listaMetadados = document.getElementById("lista-metadados");
  const feedback = document.getElementById("envio-feedback");
  const formulario = document.getElementById("form-cadastro");

  let mapa = null;
  let camadaDesenhada = null;
  let inspecao = null;

  // Rótulos amistosos para o que a inspeção devolve. Chave desconhecida cai no
  // formatador genérico, então acrescentar campo no backend não quebra a tela.
  const ALIAS = {
    nome: "Nome da camada",
    feicoes: "Feições",
    colunas: "Atributos",
    crs: "Sistema de referência",
    crs_original: "Sistema de referência de origem",
    crs_final: "Sistema de referência final",
    crs_atual: "Sistema de referência do arquivo",
    crs_recomendado: "Sistema de referência recomendado",
    familia_geometrica: "Tipo de geometria",
    geometria_tipo: "Tipo de geometria",
    categoria: "Categoria do dado",
    arquivo_compactado: "Veio compactado",
    formato: "Formato",
    envelope: "Extensão geográfica",
    total_feicoes: "Feições",
    validacao: "Validação geométrica",
    area_km2: "Área (km²)",
    perimetro_m: "Perímetro (m)",
    bounds: "Extensão geográfica",
  };

  const humanizar = chave =>
    ALIAS[chave] ||
    chave.replace(/_/g, " ").replace(/^./, letra => letra.toUpperCase());

  function formatarValor(valor) {
    if (valor === null || valor === undefined || valor === "") return "—";
    if (typeof valor === "boolean") return valor ? "Sim" : "Não";
    if (Array.isArray(valor)) {
      if (!valor.length) return "—";
      return valor.length > 12
        ? `${valor.slice(0, 12).join(", ")} … (${valor.length} no total)`
        : valor.join(", ");
    }
    if (typeof valor === "object") {
      const partes = Object.entries(valor)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${humanizar(k)}: ${formatarValor(v)}`);
      return partes.length ? partes.join(" · ") : "—";
    }
    if (typeof valor === "number") return Number(valor.toFixed(6)).toLocaleString("pt-BR");
    return String(valor);
  }

  function renderMetadados(dados) {
    const linhas = Object.entries(dados)
      .filter(([chave]) => chave !== "geojson")
      .map(([chave, valor]) =>
        `<div class="metadados-item"><dt>${humanizar(chave)}</dt><dd>${formatarValor(valor)}</dd></div>`);
    listaMetadados.innerHTML = linhas.join("") ||
      '<div class="metadados-item"><dt>Sem metadados</dt><dd>—</dd></div>';
  }

  function garantirMapa() {
    if (mapa) return mapa;
    mapa = L.map("mapa-previa", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 18,
    }).addTo(mapa);
    mapa.setView([-22.5, -48.5], 6);
    return mapa;
  }

  function desenharPrevia(previa) {
    const alvo = garantirMapa();
    if (camadaDesenhada) { alvo.removeLayer(camadaDesenhada); camadaDesenhada = null; }

    const comGeometria = (previa.camadas || []).filter(c => c.geojson);
    if (!comGeometria.length) {
      aviso.hidden = false;
      aviso.textContent = previa.tipo === "raster"
        ? "Camada raster: a pré-visualização geográfica não se aplica; confira os metadados abaixo."
        : "Não há geometria para pré-visualizar.";
      setTimeout(() => alvo.invalidateSize(), 0);
      return;
    }

    camadaDesenhada = L.geoJSON(comGeometria.map(c => c.geojson), {
      style: { color: "#1d4ed8", weight: 1.5, fillColor: "#3b82f6", fillOpacity: 0.25 },
      pointToLayer: (_, latlng) => L.circleMarker(latlng, { radius: 4, color: "#1d4ed8" }),
    }).addTo(alvo);

    setTimeout(() => {
      alvo.invalidateSize();
      try { alvo.fitBounds(camadaDesenhada.getBounds(), { padding: [16, 16] }); } catch (_) {}
    }, 0);

    if (previa.limite_atingido) {
      aviso.hidden = false;
      const exibidas = comGeometria.reduce((soma, c) => soma + c.exibidas, 0);
      aviso.textContent =
        `Mostrando ${exibidas.toLocaleString("pt-BR")} de ${previa.total_feicoes.toLocaleString("pt-BR")} feições. ` +
        "A prévia é uma amostra simplificada; o envio grava a camada completa.";
    } else {
      aviso.hidden = true;
    }
  }

  function mostrarFeedback(texto, erro) {
    feedback.textContent = texto;
    feedback.classList.toggle("is-error", Boolean(erro));
    feedback.classList.toggle("is-success", !erro);
  }

  function voltarAoInicio() {
    inspecao = null;
    campoArquivo.value = "";
    blocoPrevia.hidden = true;
    aviso.hidden = true;
    listaMetadados.innerHTML = "";
    if (camadaDesenhada && mapa) { mapa.removeLayer(camadaDesenhada); camadaDesenhada = null; }
    status.textContent = "Selecione um arquivo para pré-visualizar a camada.";
    feedback.textContent = "";
    feedback.classList.remove("is-error", "is-success");
  }

  campoArquivo.addEventListener("change", async () => {
    const arquivo = campoArquivo.files && campoArquivo.files[0];
    if (!arquivo) return voltarAoInicio();

    feedback.hidden = true;
    status.textContent = `Analisando ${arquivo.name}…`;
    try {
      const corpo = new FormData();
      corpo.append("arquivo", arquivo);
      const resposta = await fetch(`${API}/importar_camadas/inspecionar`, { method: "POST", body: corpo });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.detail || "Não foi possível ler o arquivo");
      if (dados.importavel === false) throw new Error(dados.erro_validacao || "Arquivo não importável");

      inspecao = dados;
      const previa = await (await fetch(`${API}/importar_camadas/previa/${dados.token_importacao}`)).json();

      const primeira = (dados.camadas || [])[0] || {};
      renderMetadados({
        arquivo: arquivo.name,
        tamanho_bytes: arquivo.size,
        categoria: dados.categoria,
        arquivo_compactado: dados.arquivo_compactado,
        crs_atual: dados.crs_atual,
        crs_recomendado: dados.crs_recomendado,
        camadas_no_arquivo: (dados.camadas || []).length,
        ...primeira,
      });
      desenharPrevia(previa);
      blocoPrevia.hidden = false;
      status.textContent = `${arquivo.name} — pronto para envio.`;
    } catch (erro) {
      voltarAoInicio();
      mostrarFeedback(erro.message, true);
    }
  });

  document.getElementById("btn-cancelar").addEventListener("click", () => {
    voltarAoInicio();
    mostrarFeedback("Processo cancelado. Nada foi gravado.", false);
  });

  document.getElementById("btn-enviar").addEventListener("click", async botao => {
    if (!inspecao) return;
    if (!formulario.reportValidity()) {
      mostrarFeedback("Preencha os campos obrigatórios da seção 1.", true);
      return;
    }
    const alvo = botao.currentTarget;
    alvo.disabled = true;
    mostrarFeedback("Enviando…", false);

    try {
      const dados = new FormData(formulario);
      const importacao = new FormData();
      importacao.append("token_importacao", inspecao.token_importacao);
      importacao.append("pasta", raiz.dataset.modulo === "fase1" ? "RESTRIÇÃO" : "FAVORABILIDADE");

      const respImport = await fetch(`${API}/importar_camadas`, { method: "POST", body: importacao });
      const corpoImport = await respImport.json();
      if (!respImport.ok) throw new Error(corpoImport.detail || "Falha na importação");

      const camadaId = corpoImport.camada_id || corpoImport.raster_id ||
        (corpoImport.recursos || [])[0]?.id;
      if (!camadaId) throw new Error("A importação não devolveu identificador de camada");

      const produto = String(dados.get("produto_id") || "").trim();
      const respHomolog = await fetch(`${API}/camadas/${camadaId}/homologar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modulo_consumidor: dados.get("modulo_consumidor") || raiz.dataset.modulo,
          nome_publicacao: dados.get("nome_publicacao"),
          versao: dados.get("versao") || "v1",
          finalidade: String(dados.get("finalidade") || "").trim() || null,
          homologado_por: String(dados.get("homologado_por") || "").trim() || null,
          produto_id: produto || null,
          metadados: { tipo_camada: dados.get("tipo_camada") },
        }),
      });
      const corpoHomolog = await respHomolog.json();
      if (!respHomolog.ok) throw new Error(corpoHomolog.detail || "Falha na homologação");

      voltarAoInicio();
      formulario.reset();
      mostrarFeedback(
        `Camada enviada e homologada como “${corpoHomolog.nome_publicacao || dados.get("nome_publicacao")}”.`,
        false,
      );
    } catch (erro) {
      mostrarFeedback(erro.message, true);
    } finally {
      alvo.disabled = false;
    }
  });
})();
