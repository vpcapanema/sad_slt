(function (global) {
  "use strict";
  const D = global.SLTRankingDados;
  const tipos = { plano: "Plano", programa: "Programa", projeto: "Projeto" };

  function centroidePoligonal(geo) {
    const partes = [];
    function coletar(g) {
      if (!g) return;
      if (g.type === "Feature") coletar(g.geometry);
      else if (g.type === "FeatureCollection") g.features.forEach(coletar);
      else if (g.type === "GeometryCollection") g.geometries.forEach(coletar);
      else if (g.type === "Polygon") partes.push(g.coordinates);
      else if (g.type === "MultiPolygon") partes.push(...g.coordinates);
    }
    coletar(geo);
    if (!partes.length) return null;
    const origem = partes[0][0]?.[0];
    if (!origem) throw new Error("polígono sem área para calcular o centroide");
    let area = 0, momentoX = 0, momentoY = 0;
    partes.forEach(aneis => aneis.forEach((anel, indice) => {
      let duplaArea = 0, somaX = 0, somaY = 0;
      for (let i = 0; i < anel.length; i++) {
        const a = anel[i], b = anel[(i + 1) % anel.length];
        const x = a[0] - origem[0], y = a[1] - origem[1];
        const u = b[0] - origem[0], v = b[1] - origem[1];
        const produto = x * v - u * y;
        duplaArea += produto;
        somaX += (x + u) * produto;
        somaY += (y + v) * produto;
      }
      if (duplaArea === 0) throw new Error("anel sem área para calcular o centroide");
      const peso = Math.abs(duplaArea) * (indice === 0 ? 1 : -1);
      area += peso;
      momentoX += peso * somaX / (3 * duplaArea);
      momentoY += peso * somaY / (3 * duplaArea);
    }));
    if (!(area > 0) || !Number.isFinite(momentoX) || !Number.isFinite(momentoY)) {
      throw new Error("área inválida para calcular o centroide");
    }
    return L.latLng(origem[1] + momentoY / area, origem[0] + momentoX / area);
  }

  function criar(root, { hierarquizacoes = [], demandas = [], podeExibir = () => true } = {}) {
    const canvas = root.querySelector("[data-ranking-canvas]");
    const arvore = root.querySelector("[data-ranking-tree]");
    const aviso = root.querySelector("[data-ranking-map-status]");
    const mapa = SLTPainelMapControls.initPainelMap(canvas);
    const camadas = L.featureGroup().addTo(mapa);
    const entradas = new Map();
    const visibilidade = new Map();
    let politica = podeExibir;
    let rodadas = hierarquizacoes;
    let cadastro = demandas;
    let enquadramento;

    function chave(h, item) { return JSON.stringify([h.codigo, item.codigo || item.demanda_id]); }
    function habilitada(entrada) {
      return visibilidade.get(`tipo:${entrada.tipo}`) !== false
        && visibilidade.get(`grupo:${entrada.grupo}`) !== false
        && visibilidade.get(entrada.chave) !== false;
    }
    function aplicarVisibilidade() {
      entradas.forEach(entrada => SLTPainelMapControls.applyEntryVisibility(entrada, camadas, habilitada(entrada)));
    }
    function focar(codigo, demanda) {
      cancelAnimationFrame(enquadramento);
      mapa.stop();
      const bounds = L.latLngBounds([]);
      entradas.forEach(entrada => {
        if (entrada.grupo === codigo && (demanda == null || entrada.demanda === demanda) && habilitada(entrada)) entrada.layers.forEach(layer => {
          if (layer.getBounds) bounds.extend(layer.getBounds());
          else if (layer.getLatLng) bounds.extend(layer.getLatLng());
        });
      });
      mapa.invalidateSize();
      if (!bounds.isValid()) return false;
      mapa.fitBounds(bounds, { padding: [35, 35], maxZoom: demanda == null ? 12 : 16, animate: false });
      return true;
    }
    function checkbox(rotulo, key, classe = "") {
      const label = document.createElement("label");
      label.className = `ranking-layer-label ${classe}`;
      const input = document.createElement("input");
      input.type = "checkbox"; input.checked = visibilidade.get(key) !== false;
      input.setAttribute("aria-label", `Exibir ${rotulo} no mapa`);
      input.addEventListener("change", () => { visibilidade.set(key, input.checked); aplicarVisibilidade(); });
      const text = document.createElement("span"); text.textContent = rotulo;
      label.append(input, text);
      return label;
    }
    function renderArvore(grupos) {
      if (!arvore) return;
      arvore.replaceChildren();
      Object.entries(tipos).forEach(([tipo, nome]) => {
        const doTipo = grupos.filter(h => D.tipo(h) === tipo);
        if (!doTipo.length) return;
        const secao = document.createElement("section");
        secao.className = "layer-group layer-group--tipo";
        secao.append(checkbox(nome, `tipo:${tipo}`, "layer-group-header"));
        doTipo.forEach(h => {
          const grupo = document.createElement("details"); grupo.className = "layer-group ranking-layer-group"; grupo.open = true;
          grupo.dataset.hierarquizacao = h.codigo;
          const sumario = document.createElement("summary"); sumario.textContent = h.nome;
          grupo.append(sumario, checkbox(`Grupo ${h.nome}`, `grupo:${h.codigo}`));
          D.dadosRanking(h).forEach(item => {
            const key = chave(h, item);
            const linha = checkbox(`${item.posicao}º — ${item.nome}`, key, "ranking-layer-record");
            if (!entradas.has(key)) {
              linha.querySelector("input").disabled = true;
              linha.title = "Demanda não exibida; consulte o aviso no mapa.";
            }
            grupo.append(linha);
          });
          secao.append(grupo);
        });
        arvore.append(secao);
      });
    }
    function render() {
      mapa.stop();
      camadas.clearLayers(); entradas.clear();
      const problemas = [];
      const porCodigo = new Map(cadastro.map(d => [`${d.tipo}:${d.id}`, d]));
      const grupos = rodadas.filter(h => D.finalizada(h) && politica(h));
      grupos.forEach(h => {
        D.dadosRanking(h).forEach(item => {
          try {
            const fonte = porCodigo.get(`${item.tipo}:${item.codigo}`);
            const status = fonte ? fonte.status : item.status;
            if (!Object.hasOwn(SLTStatusColors.STATUS_DEMANDA, status)) {
              throw new Error(`status da demanda ausente ou não reconhecido: ${status || "não informado"}`);
            }
            const bruto = fonte?.geometria || item.geometria;
            if (!bruto) throw new Error("geometria real não cadastrada");
            const geo = bruto.type === "Feature" || bruto.type === "FeatureCollection" ? bruto
              : { type: bruto.type || bruto.tipo, coordinates: bruto.coordinates, geometries: bruto.geometries };
            const estilo = SLTStatusColors.leafletPathStyle(status, "demanda", item.tipo);
            const geometria = L.geoJSON(geo, {
              style: estilo,
              pointToLayer: (_, latlng) => L.circleMarker(latlng, { ...estilo, radius: 5 }),
            });
            geometria.eachLayer(layer => SLTStatusColors.decorateLeafletLayer(layer, status));
            if (!geometria.getBounds().isValid()) throw new Error("geometria inválida ou vazia");
            const marker = L.marker(centroidePoligonal(geo) || geometria.getBounds().getCenter(), {
              icon: L.divIcon({ className: "ranking-marker-wrap",
                html: SLTStatusColors.rankingPinHtml(status, item.posicao),
                iconSize: [42, 48], iconAnchor: [18, 38] }),
              zIndexOffset: 10000 - item.posicao,
            });
            const popup = `<strong>${D.esc(item.nome)}</strong><br>${D.esc(h.nome)}<br>Situação: ${D.esc(SLTStatusColors.getStatusDemanda(status).nome)}<br>Posição: ${D.esc(item.posicao)}º · Índice: ${D.indice(item.score)}`;
            geometria.bindPopup(popup); marker.bindPopup(popup);
            const key = chave(h, item);
            entradas.set(key, { chave: key, tipo: item.tipo, grupo: h.codigo, demanda: item.codigo || item.demanda_id, layers: [geometria, marker] });
          } catch (error) {
            problemas.push(`${h.codigo} / ${item.codigo}: ${error.message}`);
          }
        });
      });
      aplicarVisibilidade(); renderArvore(grupos);
      aviso.textContent = problemas.length ? `Não foi possível exibir ${problemas.length} demanda(s): ${problemas.join("; ")}. Não foram criados pontos substitutos.` : "";
      aviso.classList.toggle("hidden", !problemas.length);
      if (problemas.length) console.warn("Mapa do ranking:", problemas);
      cancelAnimationFrame(enquadramento);
      enquadramento = requestAnimationFrame(() => {
        mapa.invalidateSize();
        if (camadas.getLayers().length) mapa.fitBounds(camadas.getBounds(), { padding: [35, 35], maxZoom: 12, animate: false });
      });
    }
    render();
    return {
      focar,
      atualizar(novasRodadas, novasDemandas = cadastro) { rodadas = novasRodadas; cadastro = novasDemandas; render(); },
      definirPoliticaPublicacao(resolver) {
        if (typeof resolver !== "function") throw new TypeError("Informe uma função de autorização de publicação.");
        politica = resolver; render();
      },
      destruir() { cancelAnimationFrame(enquadramento); mapa.stop(); mapa.remove(); },
    };
  }
  global.SLTRankingMapa = { criar };
})(window);
