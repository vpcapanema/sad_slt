/* Renderizador do detalhe de um objeto de demanda (modal "Demandas do grupo").
   Extraído de hierarquizacao/js/processos.js para reuso entre páginas.
   Consome o objeto "flat" de hierarquizacao.objetos (não o cabecalho_objeto). */
(function (global) {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const ALIAS = {
    versao: "Versão",
    cabecalho_grupo: "Cabeçalho do grupo",
    objetos: "Objetos",
    demanda_id: "Identificador da demanda",
    codigo: "Código",
    nome: "Nome",
    descricao: "Descrição",
    tipo_demanda: "Tipo de demanda",
    quantidade_objetos: "Quantidade de objetos",
    matriz_premissas_criterios: "Matriz de premissas e critérios",
    fases_a_executar: "Fases a executar",
    pacotes: "Pacotes utilizados",
    criado_em: "Data de criação",
    cabecalho_objeto: "Cabeçalho do objeto",
    atributos: "Atributos",
    hierarquizacao: "Hierarquização",
    fase_1: "Fase 1 — Elegibilidade territorial",
    fase_2: "Fase 2 — Favorabilidade territorial",
    fase_3: "Fase 3 — Ajuste fino",
    sintese: "Síntese",
    restricao: "Restrição",
    risco: "Risco",
    intersecoes: "Interseções",
    resultado: "Resultado",
    executada: "Executada",
    status_fase1: "Resultado da Fase 1",
    score_fase2: "Pontuação da Fase 2",
    score_fase3: "Pontuação da Fase 3",
    score_final: "Pontuação final",
    ranking_fase2: "Posição na Fase 2",
    ranking_fase3: "Posição na Fase 3",
    posicao_final: "Posição final",
  };
  const alias = (k) =>
    ALIAS[k] || String(k).replaceAll("_", " ").replace(/^./, (x) => x.toUpperCase());

  function fmtDataSeIso(v) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v);
    if (!m) return null;
    const [, y, mo, d, hh, mi] = m;
    return hh != null ? `${d}/${mo}/${y} ${hh}:${mi}` : `${d}/${mo}/${y}`;
  }

  function rotuloStatus(codigo) {
    if (!codigo) return "—";
    const st =
      global.SLTStatusColors && global.SLTStatusColors.getStatusDemanda
        ? global.SLTStatusColors.getStatusDemanda(codigo)
        : null;
    return (st && st.nome) || codigo;
  }

  function fmtFolha(v) {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Sim" : "Não";
    if (typeof v === "string") {
      const data = fmtDataSeIso(v);
      if (data) return data;
    }
    return String(v);
  }

  function rotuloItem(v, i) {
    if (v && typeof v === "object") {
      const cab = v.cabecalho_objeto || v;
      const nome = cab.nome || v.nome;
      const cod = cab.codigo || v.codigo;
      if (nome) return cod ? `${nome} (${cod})` : String(nome);
      if (cod) return String(cod);
    }
    return `Item ${i + 1}`;
  }

  function jvNo(chave, valor, jaRotulado) {
    const li = document.createElement("li");
    li.className = "jv-item";
    const rotulo = jaRotulado ? String(chave) : alias(String(chave));
    if (valor && typeof valor === "object") {
      const entries = Array.isArray(valor)
        ? valor.map((v, i) => [rotuloItem(v, i), v, true])
        : Object.entries(valor).map(([k, v]) => [k, v, false]);
      const det = document.createElement("details");
      const sum = document.createElement("summary");
      const contagem = Array.isArray(valor) ? `[${entries.length}]` : `{${entries.length}}`;
      sum.innerHTML = `<span class="jv-key">${esc(rotulo)}</span> <span class="jv-count">${contagem}</span>`;
      det.appendChild(sum);
      let carregado = false;
      det.addEventListener("toggle", () => {
        if (!det.open || carregado) return;
        carregado = true;
        const ul = document.createElement("ul");
        ul.className = "jv-list";
        for (const [k, v, jr] of entries) ul.appendChild(jvNo(k, v, jr));
        det.appendChild(ul);
      });
      li.appendChild(det);
    } else {
      li.innerHTML = `<span class="jv-key">${esc(rotulo)}:</span> <span class="jv-val">${esc(fmtFolha(valor))}</span>`;
    }
    return li;
  }

  function campo(rotulo, valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    const d = document.createElement("div");
    d.className = "jv-campo";
    d.innerHTML = `<span class="jv-key">${esc(rotulo)}:</span> <span class="jv-val">${esc(fmtFolha(valor))}</span>`;
    return d;
  }

  function grupoEl(titulo) {
    const g = document.createElement("div");
    g.className = "demanda-grupo";
    const t = document.createElement("h4");
    t.className = "demanda-grupo-titulo";
    t.textContent = titulo;
    g.appendChild(t);
    return g;
  }

  function grupoCampos(titulo, itens) {
    const usados = itens.filter(Boolean);
    if (!usados.length) return null;
    const g = grupoEl(titulo);
    const box = document.createElement("div");
    box.className = "demanda-campos";
    usados.forEach((el) => box.appendChild(el));
    g.appendChild(box);
    return g;
  }

  function subArvore(rotulo, valor) {
    const ul = document.createElement("ul");
    ul.className = "jv-list";
    if (valor && typeof valor === "object" && Object.keys(valor).length) {
      ul.appendChild(jvNo(rotulo, valor, false));
    } else {
      ul.innerHTML = `<li class="jv-item"><span class="jv-key">${esc(rotulo)}:</span> <span class="jv-val">—</span></li>`;
    }
    return ul;
  }

  function iniciarMapa(div, geometria, lat, lng) {
    if (!global.L) { div.innerHTML = '<p class="jv-mapa-aviso">Mapa indisponível.</p>'; return; }
    const temGeom = geometria && geometria.coordinates;
    if (!temGeom && (lat == null || lng == null)) {
      div.innerHTML = '<p class="jv-mapa-aviso">Geometria não disponível para esta demanda.</p>';
      return;
    }
    const map = L.map(div, { attributionControl: false, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
    const tipoGeom = temGeom ? String(geometria.tipo || geometria.type || "").toLowerCase() : "";
    const ehPonto = tipoGeom.indexOf("point") !== -1;
    if (temGeom && !ehPonto) {
      const geo = { type: geometria.tipo || geometria.type, coordinates: geometria.coordinates };
      const layer = L.geoJSON(geo, { style: { color: "#003b5a", weight: 2, fillColor: "#3ec26e", fillOpacity: 0.2 } }).addTo(map);
      try {
        const b = layer.getBounds();
        if (b && b.isValid()) map.fitBounds(b, { padding: [12, 12], maxZoom: 15 });
        else map.setView([lat, lng], 13);
      } catch (_) { map.setView([lat ?? -22.5, lng ?? -48.5], 13); }
    } else {
      let plat = lat, plng = lng;
      if (ehPonto) {
        const c = geometria.coordinates;
        const p = Array.isArray(c[0]) ? c[0] : c;
        if (p && p.length >= 2) { plng = p[0]; plat = p[1]; }
      }
      L.marker([plat, plng]).addTo(map);
      map.setView([plat, plng], 13);
    }
    setTimeout(() => map.invalidateSize(), 80);
  }

  function corpoObjeto(o) {
    const wrap = document.createElement("div");
    wrap.className = "demanda-corpo";
    const grupos = [
      grupoCampos("Identificação", [
        campo("Código", o.codigo),
        campo("Nome", o.nome),
        campo("Tipo de demanda", o.tipo_demanda),
        campo("Situação", o.status ? rotuloStatus(o.status) : null),
        campo("Descrição", o.descricao),
      ]),
      grupoCampos("Proponente e vínculo institucional", [
        campo("Tipo de demandante", o.tipo_demandante),
        campo("Instituição", o.instituicao_nome || o.instituicao_label),
        campo("CNPJ", o.instituicao_cnpj),
        campo("Representante", o.representante_nome),
        campo("E-mail do representante", o.representante_email),
        campo("Telefone do representante", o.representante_telefone),
        campo("Diretoria", o.diretoria_id),
        campo("Plano", o.plano_id),
        campo("Programa", o.programa_id_alias || o.programa_nome || o.programa_codigo),
        campo("Possui vínculo institucional", o.vinculo_institucional == null ? null : (o.vinculo_institucional ? "Sim" : "Não")),
        campo("Tipo de vínculo", o.vinculo_tipo),
      ]),
    ];
    grupos.filter(Boolean).forEach((g) => wrap.appendChild(g));

    const gCls = grupoEl("Classificação e complementos");
    const clsGrid = document.createElement("div");
    clsGrid.className = "demanda-cls-grid";
    clsGrid.appendChild(subArvore("Classificação", o.classificacao));
    clsGrid.appendChild(subArvore("Complementos", o.complementos));
    gCls.appendChild(clsGrid);
    wrap.appendChild(gCls);

    const gLoc = grupoEl("Localização");
    const box = document.createElement("div");
    box.className = "demanda-campos";
    [campo("Latitude", o.latitude), campo("Longitude", o.longitude), campo("Tipo de geometria", o.geometria_tipo || o.geometria?.tipo)]
      .filter(Boolean).forEach((el) => box.appendChild(el));
    gLoc.appendChild(box);
    const mapaDiv = document.createElement("div");
    mapaDiv.className = "demanda-mapa";
    gLoc.appendChild(mapaDiv);
    wrap.appendChild(gLoc);
    setTimeout(() => iniciarMapa(mapaDiv, o.geometria, o.latitude, o.longitude), 40);

    const gDatas = grupoCampos("Datas e auditoria", [
      campo("Criado em", o.criado_em || o.criadoEm),
      campo("Atualizado em", o.atualizado_em),
      campo("Aprovado em", o.aprovado_em),
      campo("Situação atualizada em", o.status_atualizado_em),
      campo("Motivo da aprovação", o.motivo_aprovacao),
    ]);
    if (gDatas) wrap.appendChild(gDatas);
    return wrap;
  }

  global.SLTObjetoDetalhe = { corpo: corpoObjeto };
})(window);
