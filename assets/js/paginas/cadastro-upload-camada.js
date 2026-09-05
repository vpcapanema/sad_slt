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

  /** O que o servidor leu do arquivo, em uma linha: é a prova de que o arquivo
   *  escolhido é o que se pensa estar enviando. */
  function resumoDaInspecao() {
    const primeira = (inspecao?.camadas || [])[0] || {};
    const feicoes = primeira.feicoes ?? primeira.total_feicoes;
    const partes = [primeira.nome, Number.isFinite(feicoes) ? `${feicoes.toLocaleString("pt-BR")} feições` : null,
                    primeira.familia_geometrica || primeira.geometria_tipo].filter(Boolean);
    return partes.length ? partes.join(", ") : "conteúdo não identificado";
  }

  // Pastas do acervo, por tipo de camada. Antes a pasta vinha da página, então
  // um risco enviado pela tela de elegibilidade era arquivado em RESTRIÇÃO.
  const PASTA_POR_TIPO = {
    restricao: "RESTRIÇÃO",
    risco: "RISCO",
    area_estudo: "AREA_ESTUDO",
    grade: "FAVORABILIDADE",
    rede: "FAVORABILIDADE",
    criterio_grade: "FAVORABILIDADE",
    criterio_rede: "FAVORABILIDADE",
  };

  function pastaDoTipo(tipo) {
    return PASTA_POR_TIPO[String(tipo || "")] ||
      (raiz.dataset.modulo === "fase1" ? "RESTRIÇÃO" : "FAVORABILIDADE");
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
      inspecao.arquivo_escolhido = arquivo.name;
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
      window.SLTFeedback?.error(
        `${erro.message} O arquivo foi recusado ainda na área temporária: nada foi gravado no acervo.`,
        "Não foi possível ler o arquivo",
      );
    }
  });

  document.getElementById("btn-cancelar").addEventListener("click", () => {
    voltarAoInicio();
    mostrarFeedback("Processo cancelado. Nada foi gravado.", false);
  });

  /**
   * Acompanha um job do servidor até o desfecho, desenhando cada log real que
   * ele emite como um passo do modal. Devolve o `resultado` do job; lança com a
   * mensagem de erro que o próprio servidor registrou.
   */
  async function acompanharJob(job, proc, vistos) {
    let atual = job;
    while (atual.status === "pendente" || atual.status === "executando") {
      (atual.logs || []).forEach(log => {
        if (vistos.has(log.sequencia)) return;
        vistos.add(log.sequencia);
        proc.passo(log.mensagem, log.nivel === "erro" ? "error" : "success");
      });
      proc.progresso(atual.percentual, atual.etapa_atual);
      await new Promise(resolve => setTimeout(resolve, 250));
      const resposta = await fetch(`${API}/operacoes-jobs/status/${atual.id}`);
      if (!resposta.ok) throw new Error("Perdi o contato com o processo no servidor.");
      atual = await resposta.json();
    }
    (atual.logs || []).forEach(log => {
      if (vistos.has(log.sequencia)) return;
      vistos.add(log.sequencia);
      proc.passo(log.mensagem, log.nivel === "erro" ? "error" : "success");
    });
    proc.progresso(atual.percentual, atual.etapa_atual);
    if (atual.status === "erro") throw new Error(atual.erro || "O servidor interrompeu o processo.");
    return atual.resultado || {};
  }

  document.getElementById("btn-enviar").addEventListener("click", async evento => {
    if (!inspecao) return;
    // Guardado agora: `currentTarget` só vale durante o disparo do evento, e
    // vira null assim que o handler espera na confirmação.
    const alvo = evento.currentTarget;
    if (!formulario.reportValidity()) {
      mostrarFeedback("Preencha os campos obrigatórios da seção 1.", true);
      return;
    }
    const dados = new FormData(formulario);
    const nomePublicacao = String(dados.get("nome_publicacao") || "").trim();
    const pasta = pastaDoTipo(dados.get("tipo_camada"));

    const confirmado = await window.SLTFeedback.confirmar({
      title: "Enviar e homologar camada",
      message: `Arquivo: ${inspecao.arquivo_escolhido} — ${resumoDaInspecao()}. `
        + `Vai para a pasta ${pasta}, publicada como “${nomePublicacao}” versão ${dados.get("versao") || "v1"}.`,
      detail:
        "São dois passos: importação para o acervo e homologação — ao fim ela já fica disponível no seletor da fase. Depois de homologada, a camada vira insumo somente leitura: para corrigi-la será preciso publicar uma nova versão.",
      confirmLabel: "Enviar e homologar",
      danger: true,
    });
    if (!confirmado) return;

    alvo.disabled = true;
    const proc = window.SLTFeedback.processo("Enviando camada", { barra: true });
    let camadaId = null;

    try {
      const importacao = new FormData();
      importacao.append("token_importacao", inspecao.token_importacao);
      importacao.append("pasta", pasta);

      proc.passo("Iniciando a importação no servidor…", "progress");
      const respImport = await fetch(`${API}/importar_camadas/job`, { method: "POST", body: importacao });
      const jobImport = await respImport.json();
      if (!respImport.ok) throw new Error(jobImport.detail || "Falha ao iniciar a importação");

      const resultadoImport = await acompanharJob(jobImport, proc, new Set());
      camadaId = resultadoImport.camada_id || resultadoImport.raster_id ||
        (resultadoImport.recursos || [])[0]?.id;
      if (!camadaId) throw new Error("A importação não devolveu identificador de camada");
    } catch (erro) {
      proc.concluir({
        type: "error",
        title: "Importação interrompida",
        message: `${erro.message} Nada foi gravado no acervo — corrija o apontado acima e envie novamente.`,
      });
      mostrarFeedback(erro.message, true);
      alvo.disabled = false;
      return;
    }

    try {
      const produto = String(dados.get("produto_id") || "").trim();
      proc.passo("Iniciando a homologação da camada importada…", "progress");
      const respHomolog = await fetch(`${API}/camadas/${camadaId}/homologar-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modulo_consumidor: dados.get("modulo_consumidor") || raiz.dataset.modulo,
          nome_publicacao: nomePublicacao,
          versao: dados.get("versao") || "v1",
          // O seletor da fase reconhece a camada por este campo; deixá-lo com o
          // texto livre (ou vazio) fazia a classificação depender do nome.
          finalidade: String(dados.get("tipo_camada") || "").trim() || null,
          produto_id: produto || null,
          metadados: {
            tipo_camada: dados.get("tipo_camada"),
            descricao: String(dados.get("finalidade") || "").trim() || null,
            pasta_acervo: pasta,
          },
        }),
      });
      const jobHomolog = await respHomolog.json();
      if (!respHomolog.ok) throw new Error(jobHomolog.detail || "Falha ao iniciar a homologação");

      const resultado = await acompanharJob(jobHomolog, proc, new Set());
      voltarAoInicio();
      formulario.reset();
      const fase = (dados.get("modulo_consumidor") || raiz.dataset.modulo) === "fase2" ? "Fase 2" : "Fase 1";
      proc.concluir({
        type: "success",
        title: "Camada enviada e homologada",
        message: `“${resultado.nome_publicacao || nomePublicacao}” já está disponível no seletor de camadas da ${fase}.`,
      });
      const publicado = resultado.nome_publicacao || nomePublicacao;
      voltarAoInicio();
      mostrarFeedback(`Camada enviada e homologada como “${publicado}”.`, false);
    } catch (erro) {
      proc.concluir({
        // Desfecho parcial de verdade: a camada existe no acervo, mas não foi publicada.
        type: "warning",
        title: "Importada, mas não homologada",
        message: `${erro.message} A camada ficou no acervo com o identificador ${camadaId}, ainda não publicada — é possível homologá-la depois pela Bancada, sem reenviar o arquivo.`,
      });
      mostrarFeedback(`Importada, mas não homologada: ${erro.message}`, true);
    } finally {
      alvo.disabled = false;
    }
  });
})();
