/**
 * Validação de coerência conceitual — critérios vs config + catálogo PLI-SP.
 */
(function (global) {
  "use strict";

  var CATALOG_URL = "../data/matriz-criterios-premissas.json";
  var catalogPromise = null;
  var contextPromise = null;

  var DIM_MAP = {
    ambientais: "Ambiental",
    ambiental: "Ambiental",
    sociais: "Social",
    social: "Social",
    economicas: "Economica",
    "econômicas": "Econômica",
    economica: "Econômica",
    "econômica": "Econômica",
    financeiras: "Financeiro",
    financeiro: "Financeiro",
    tecnicas: "Tecnica",
    "técnicas": "Técnica",
    tecnica: "Técnica",
    "técnica": "Técnica",
    institucionais: "Institucional",
    institucional: "Institucional",
    territoriais: "Territorial",
    territorial: "Territorial",
    seguranca: "Seguranca",
    "segurança": "Segurança",
    risco: "Risco",
  };

  var ALL_CATALOG_DIMS = [
    "Técnica",
    "Financeiro",
    "Econômica",
    "Social",
    "Segurança",
    "Ambiental",
    "Territorial",
    "Institucional",
    "Risco",
  ];

  function norm(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(value) {
    return norm(value)
      .split(" ")
      .filter(function (t) {
        return t.length > 2;
      });
  }

  function overlapScore(a, b) {
    var ta = tokens(a);
    var tb = tokens(b);
    if (!ta.length || !tb.length) return 0;
    var hit = 0;
    ta.forEach(function (t) {
      if (tb.indexOf(t) !== -1) hit++;
    });
    return hit / Math.max(ta.length, tb.length);
  }

  function parseCatalog(json) {
    var matriz = json["Matriz de Criterios e Premissas"] || [];
    var rows = [];
    for (var i = 1; i < matriz.length; i++) {
      var r = matriz[i];
      if (!r || !r[1]) continue;
      rows.push({
        dimensao: String(r[0] || "").trim(),
        criterio: String(r[1] || "").trim(),
        premissa: String(r[2] || "").trim(),
        relacao: String(r[3] || "").trim(),
        metricas: String(r[4] || "").trim(),
        fonte: String(r[5] || "").trim(),
        mandatorio: String(r[6] || "").trim(),
      });
    }
    return rows;
  }

  function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(CATALOG_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("Catálogo PLI-SP indisponível.");
        return r.json();
      })
      .then(parseCatalog)
      .catch(function (err) {
        catalogPromise = null;
        throw err;
      });
    return catalogPromise;
  }

  function dimsFromConfig(cfg) {
    var cc = (cfg && cfg.configuracao_completa) || {};
    var raw = cc.dimensoes;
    if (Array.isArray(raw) && raw.length) {
      var mapped = [];
      raw.forEach(function (d) {
        var key = norm(d);
        var m = DIM_MAP[key] || DIM_MAP[d] || d;
        if (mapped.indexOf(m) === -1) mapped.push(m);
      });
      return mapped.length ? mapped : ALL_CATALOG_DIMS.slice();
    }
    return ALL_CATALOG_DIMS.slice();
  }

  function loadContext(force) {
    if (!force && contextPromise) return contextPromise;
    contextPromise = null;
    if (global.SLTConfigBridge && global.SLTConfigBridge.obterConfig) {
      contextPromise = global.SLTConfigBridge.obterConfig().then(function (cfg) {
        return {
          config: cfg,
          dimsPermitidas: dimsFromConfig(cfg),
        };
      });
    } else {
      contextPromise = Promise.resolve({ config: null, dimsPermitidas: ALL_CATALOG_DIMS.slice() });
    }
    return contextPromise;
  }

  function filterCatalog(catalog, dimsPermitidas) {
    var allowed = dimsPermitidas.map(norm);
    return catalog.filter(function (row) {
      return allowed.indexOf(norm(row.dimensao)) !== -1;
    });
  }

  function findEntry(catalog, criterio, dimensao) {
    var nc = norm(criterio);
    var nd = dimensao ? norm(dimensao) : "";
    var exact = null;
    var partial = null;
    var bestScore = 0;
    catalog.forEach(function (row) {
      if (nd && norm(row.dimensao) !== nd) return;
      var nr = norm(row.criterio);
      if (nr === nc) exact = row;
      if (nr.indexOf(nc) !== -1 || nc.indexOf(nr) !== -1) {
        var sc = overlapScore(row.criterio, criterio);
        if (sc > bestScore) {
          bestScore = sc;
          partial = row;
        }
      }
    });
    return exact || partial;
  }

  function normMand(v) {
    var n = norm(v);
    if (n === "sim") return "sim";
    if (n === "nao" || n === "n") return "nao";
    return n;
  }

  function normRel(v) {
    return norm(v).replace(/positiva|negativa|condicional/g, function (m) {
      return m;
    });
  }

  function aviso(codigo, mensagem, campo, valorInformado, valorEsperado, linha) {
    return {
      codigo: codigo,
      mensagem: mensagem,
      campo: campo || "",
      valor_informado: valorInformado || "",
      valor_esperado: valorEsperado || "",
      linha: linha == null ? null : linha,
    };
  }

  function validateNomeCriterio(nome, ctx, catalogFiltered, linha) {
    var avisos = [];
    if (!String(nome || "").trim()) return avisos;
    var entry = findEntry(catalogFiltered, nome);
    if (!entry) {
      avisos.push(
        aviso(
          "CRITERIO_DESCONHECIDO",
          "O critério «" + nome + "» não foi encontrado no catálogo de referência para as dimensões desta configuração.",
          "criterio",
          nome,
          "",
          linha
        )
      );
      return avisos;
    }
    if (ctx.dimsPermitidas.map(norm).indexOf(norm(entry.dimensao)) === -1) {
      avisos.push(
        aviso(
          "DIMENSAO_NAO_DECLARADA",
          "«" + nome + "» pertence tipicamente à dimensão «" + entry.dimensao + "», que não está entre as dimensões declaradas na configuração.",
          "criterio",
          nome,
          entry.dimensao,
          linha
        )
      );
    }
    return avisos;
  }

  function validateLinhaMatriz(row, ctx, catalogFiltered, linha) {
    var avisos = [];
    row = row || {};
    var criterio = String(row.criterio || "").trim();
    if (!criterio) return avisos;

    var dim = String(row.dimensao || "").trim();
    if (dim && ctx.dimsPermitidas.map(norm).indexOf(norm(dim)) === -1) {
      avisos.push(
        aviso(
          "DIMENSAO_FORA_ESCOPO",
          "A dimensão «" + dim + "» não está entre as dimensões declaradas na configuração.",
          "dimensao",
          dim,
          ctx.dimsPermitidas.join(", "),
          linha
        )
      );
    }

    avisos = avisos.concat(validateNomeCriterio(criterio, ctx, catalogFiltered, linha));

    var entry = findEntry(catalogFiltered, criterio, dim);
    if (entry && dim && norm(entry.dimensao) !== norm(dim)) {
      avisos.push(
        aviso(
          "DIMENSAO_DIVERGENTE",
          "«" + criterio + "» está associado à dimensão «" + dim + "», mas no catálogo figura como «" + entry.dimensao + "».",
          "dimensao",
          dim,
          entry.dimensao,
          linha
        )
      );
    }

    if (entry && row.premissa && overlapScore(row.premissa, entry.premissa) < 0.15) {
      avisos.push(
        aviso(
          "PREMISSA_DIVERGENTE",
          "A premissa de «" + criterio + "» difere substancialmente da referência do catálogo PLI-SP.",
          "premissa",
          row.premissa,
          entry.premissa,
          linha
        )
      );
    }

    if (entry && row.relacao && normRel(row.relacao) !== normRel(entry.relacao)) {
      avisos.push(
        aviso(
          "RELACAO_DIVERGENTE",
          "A relação informada para «" + criterio + "» difere do catálogo.",
          "relacao",
          row.relacao,
          entry.relacao,
          linha
        )
      );
    }

    if (entry && row.mandatorio && normMand(row.mandatorio) !== normMand(entry.mandatorio)) {
      avisos.push(
        aviso(
          "MANDATORIO_DIVERGENTE",
          "O campo mandatório de «" + criterio + "» difere do catálogo.",
          "mandatorio",
          row.mandatorio,
          entry.mandatorio,
          linha
        )
      );
    }

    return avisos;
  }

  function validateMatriz(rows) {
    return Promise.all([loadCatalog(), loadContext()]).then(function (res) {
      var catalog = res[0];
      var ctx = res[1];
      var filtered = filterCatalog(catalog, ctx.dimsPermitidas);
      var avisos = [];
      (rows || []).forEach(function (row, idx) {
        avisos = avisos.concat(validateLinhaMatriz(row, ctx, filtered, idx + 1));
      });
      return { ok: avisos.length === 0, avisos: avisos, context: ctx };
    });
  }

  function validateNomes(nomes) {
    return Promise.all([loadCatalog(), loadContext()]).then(function (res) {
      var catalog = res[0];
      var ctx = res[1];
      var filtered = filterCatalog(catalog, ctx.dimsPermitidas);
      var avisos = [];
      (nomes || []).forEach(function (nome, idx) {
        avisos = avisos.concat(validateNomeCriterio(nome, ctx, filtered, idx + 1));
      });
      return { ok: avisos.length === 0, avisos: avisos, context: ctx };
    });
  }

  function configSnapshot(ctx) {
    var cfg = (ctx && ctx.config) || {};
    return {
      codigo: cfg.codigo || null,
      nome: cfg.nome || null,
      objetivo: cfg.objetivo || null,
    };
  }

  global.SLTAhpCoerencia = {
    loadCatalog: loadCatalog,
    loadContext: loadContext,
    validateMatriz: validateMatriz,
    validateNomes: validateNomes,
    configSnapshot: configSnapshot,
    invalidateContext: function () {
      contextPromise = null;
    },
  };
})(window);
