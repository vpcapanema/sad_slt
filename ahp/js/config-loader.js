/**
 * Carregamento do contexto de análise por fase (Etapa 2 = Fase 1; Etapa 6 = Fase 2).
 */
(function (global) {
  "use strict";

  var CONFIG_KEY = "slt_ahp_config_atual";
  var doc = global.document;

  var configsPorChave = {};

  function api() {
    return global.SLTConfigApi || null;
  }

  function pacote() {
    return global.SLTPacoteFase || null;
  }

  function el(id) {
    return doc.getElementById(id);
  }

  function setConfigAtual(tipo, codigo) {
    try {
      global.localStorage.setItem(CONFIG_KEY, JSON.stringify({ tipo: tipo, codigo: codigo }));
    } catch (_e) {
      /* best-effort */
    }
  }

  function getConfigAtual() {
    try {
      var raw = global.localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.tipo && parsed.codigo ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function faseEsperada() {
    return pacote() ? pacote().getPacoteFaseEsperado() : "fase_1";
  }

  function isContextoFase2Page() {
    return !!el("ctx-fase2-checklist");
  }

  function optionLabel(cfg) {
    var partes = [cfg.codigo];
    if (cfg.nome) partes.push(cfg.nome);
    var demanda = cfg.tipo_demanda_nome || cfg.tipo_demanda;
    var sufixo = demanda ? cfg.tipo + " · " + demanda : cfg.tipo;
    return partes.join(" — ") + " (" + sufixo + ")";
  }

  function renderErroPacote(box, cfg, faseReq) {
    if (!box) return;
    var pf = pacote();
    var rotuloAtual = pf ? pf.rotulo(pf.resolverPacoteFase(cfg)) : cfg.pacote_fase;
    box.classList.remove("is-hidden");
    box.innerHTML =
      '<div class="ahp-recommendation__head"><i class="fas fa-circle-xmark"></i>' +
      "<strong>Pacote incompatível</strong></div>" +
      "<p>Esta configuração (" +
      escapeHtml(cfg.codigo || "—") +
      ") é identificada como <strong>" +
      escapeHtml(rotuloAtual) +
      "</strong>. Esta seção só aceita <strong>" +
      escapeHtml(pf ? pf.rotulo(faseReq) : faseReq) +
      "</strong>.</p>";
  }

  function cfgCompativel(cfg, faseReq) {
    if (!cfg || !pacote()) return true;
    return pacote().ehPacote(cfg, faseReq);
  }

  function renderResumo(cfg, aviso) {
    if (global.SLTAhpContextoUI && cfg) global.SLTAhpContextoUI.apply(cfg);
    if (isContextoFase2Page()) return;
    var box = el("cfg-loaded-summary");
    if (!box) return;
    var objetos = cfg.universo_objetos || cfg.objetos || [];
    var pf = pacote();
    var linhas = [
      ["Pacote", pf ? pf.rotulo(pf.resolverPacoteFase(cfg)) : cfg.pacote_fase || "—"],
      ["Escopo", cfg.nome || cfg.escopo],
      ["Objetivo", cfg.objetivo],
      ["Descrição", cfg.descricao],
      ["Objeto da análise", cfg.tipo_demanda_nome || cfg.tipo_demanda || "—"],
      ["Objetos no universo", Array.isArray(objetos) ? String(objetos.length) : "—"],
    ];
    if (global.SLTAhpFormatoData && global.SLTAhpFormatoData.linhasTimestampsConfig) {
      linhas = linhas.concat(global.SLTAhpFormatoData.linhasTimestampsConfig(cfg));
    }
    var itens = linhas
      .map(function (par) {
        return (
          "<li><strong>" +
          escapeHtml(par[0]) +
          ":</strong> " +
          escapeHtml(par[1] || "—") +
          "</li>"
        );
      })
      .join("");
    var head =
      '<div class="ahp-recommendation__head"><i class="fas fa-circle-check"></i>' +
      "<strong>Contexto carregado" +
      (cfg.codigo ? " — " + escapeHtml(cfg.codigo) : "") +
      "</strong></div>";
    var avisoHtml = aviso
      ? '<p style="margin-top:.5rem;"><i class="fas fa-triangle-exclamation"></i> ' +
        escapeHtml(aviso) +
        "</p>"
      : "";
    box.innerHTML = head + '<ul class="info-list">' + itens + "</ul>" + avisoHtml;
    box.classList.remove("is-hidden");
  }

  function preencherConfigsSalvas() {
    var sel = el("cfg-saved-select");
    var help = el("cfg-saved-help");
    if (!sel || !api()) return;

    var faseReq = faseEsperada();

    function listarTipo(tipo) {
      var params = { pacote_fase: faseReq };
      return api()
        .listar(tipo, params)
        .then(function (r) {
          var lista = Array.isArray(r) ? r : [];
          if (!pacote()) return lista;
          return lista.filter(function (cfg) {
            return cfgCompativel(cfg, faseReq);
          });
        })
        .catch(function () {
          return [];
        });
    }

    Promise.all([listarTipo("portfolio"), listarTipo("avulsa")]).then(function (res) {
      var todas = res[0].concat(res[1]);
      configsPorChave = {};
      sel.innerHTML = '<option value="">Selecione a configuração…</option>';
      todas.forEach(function (cfg) {
        var chave = cfg.tipo + "::" + cfg.codigo;
        configsPorChave[chave] = cfg;
        var opt = doc.createElement("option");
        opt.value = chave;
        opt.textContent = optionLabel(cfg);
        sel.appendChild(opt);
      });

      if (help) {
        var rotulo = pacote() ? pacote().rotulo(faseReq) : faseReq;
        help.innerHTML = todas.length
          ? '<i class="fas fa-info-circle"></i> ' +
            todas.length +
            " configuração(ões) com pacote <strong>" +
            escapeHtml(rotulo) +
            "</strong>."
          : '<i class="fas fa-info-circle"></i> Nenhuma configuração com pacote <strong>' +
            escapeHtml(rotulo) +
            "</strong> encontrada.";
      }

    });
  }

  function onSelectChange() {
    var sel = el("cfg-saved-select");
    if (!sel) return;
    var chave = sel.value;
    var box = el("cfg-loaded-summary");
    var faseReq = faseEsperada();
    if (!chave || !configsPorChave[chave]) {
      if (box) box.classList.add("is-hidden");
      if (global.SLTAhpContextoUI) global.SLTAhpContextoUI.reset();
      return;
    }
    var cfg = configsPorChave[chave];
    if (!cfgCompativel(cfg, faseReq)) {
      sel.value = "";
      if (global.SLTFieldFilled) global.SLTFieldFilled.sync(sel);
      renderErroPacote(box, cfg, faseReq);
      return;
    }
    setConfigAtual(cfg.tipo, cfg.codigo);
    if (global.SLTFieldFilled) global.SLTFieldFilled.sync(sel);
    function exibir(cfgExibir) {
      if (isContextoFase2Page()) {
        if (typeof global.initEtapa6 === "function") global.initEtapa6();
        return;
      }
      renderResumo(cfgExibir);
    }
    if (api() && cfg.tipo && cfg.codigo) {
      api()
        .obter(cfg.tipo, cfg.codigo)
        .then(function (full) {
          exibir(full || cfg);
        })
        .catch(function () {
          exibir(cfg);
        });
      return;
    }
    exibir(cfg);
  }

  function toggleConfigSource() {
    var saved = el("cfg-saved-content");
    var file = el("cfg-file-content");
    var isFile = (doc.querySelector('input[name="cfg-source"]:checked') || {}).value === "file";
    if (saved) saved.classList.toggle("method-content--hidden", isFile);
    if (file) file.classList.toggle("method-content--hidden", !isFile);
  }

  function lerArquivoJson(file) {
    return new Promise(function (resolve, reject) {
      var reader = new global.FileReader();
      reader.onload = function (e) {
        try {
          resolve(JSON.parse(e.target.result));
        } catch (err) {
          reject(new Error("Arquivo inválido: " + err.message));
        }
      };
      reader.onerror = function () {
        reject(new Error("Falha ao ler o arquivo."));
      };
      reader.readAsText(file, "UTF-8");
    });
  }

  function handleConfigFile(event) {
    var input = event && event.target;
    var file = input && input.files && input.files[0];
    var info = el("cfg-file-info");
    if (!file) return;
    if (info) info.textContent = file.name;

    var faseReq = faseEsperada();

    lerArquivoJson(file)
      .then(function (artefato) {
        if (pacote()) {
          var val = pacote().validarArtefato(artefato, faseReq);
          if (!val.ok) throw new Error(val.mensagem);
        } else if (!artefato || artefato.artefato !== "objetos") {
          throw new Error("Importe o arquivo de objetos exportado na Fase 1.");
        }

        var codigo = artefato.config_codigo || null;
        var chaveEncontrada = null;
        Object.keys(configsPorChave).forEach(function (chave) {
          if (configsPorChave[chave].codigo === codigo) chaveEncontrada = chave;
        });

        var cfgResumo = {
          codigo: codigo,
          pacote_fase: artefato.pacote_fase || faseReq,
          nome: artefato.escopo,
          objetivo: artefato.objetivo,
          descricao: artefato.descricao,
          tipo_demanda: artefato.tipo_demanda,
          universo_objetos: artefato.objetos || artefato.universo_objetos || [],
          criterios: artefato.criterios || [],
          matriz_comparacao: artefato.matriz_comparacao || [],
          alertas_conceituais: artefato.alertas_conceituais,
          pesos: artefato.pesos || null,
          criadoEm: artefato.criadoEm || artefato.criado_em || null,
          atualizadoEm: artefato.atualizadoEm || artefato.atualizado_em || null,
        };

        if (chaveEncontrada) {
          var cfg = configsPorChave[chaveEncontrada];
          if (!cfgCompativel(cfg, faseReq)) {
            renderErroPacote(el("cfg-loaded-summary"), cfg, faseReq);
            return;
          }
          setConfigAtual(cfg.tipo, cfg.codigo);
          function exibirArquivo(cfgExibir) {
            if (isContextoFase2Page()) {
              if (global.SLTAhpContextoUI) global.SLTAhpContextoUI.apply(cfgExibir);
              if (typeof global.initEtapa6 === "function") global.initEtapa6();
              return;
            }
            renderResumo(cfgExibir);
          }
          if (api() && cfg.tipo && cfg.codigo) {
            api()
              .obter(cfg.tipo, cfg.codigo)
              .then(function (full) {
                exibirArquivo(full || cfg);
              })
              .catch(function () {
                exibirArquivo(cfg);
              });
            return;
          }
          exibirArquivo(cfg);
        } else {
          if (isContextoFase2Page()) {
            if (global.SLTAhpContextoUI) global.SLTAhpContextoUI.apply(cfgResumo);
            if (global.SLTStep6Contexto) {
              global.SLTStep6Contexto.renderResumoConfig(el("cfg-loaded-summary"), cfgResumo);
              global.SLTStep6Contexto.renderChecklist(
                el("ctx-fase2-checklist"),
                global.SLTStep6Contexto.verificarPacoteFase2(cfgResumo)
              );
            }
            return;
          }
          renderResumo(
            cfgResumo,
            "Este arquivo não corresponde a uma configuração salva na base — os dados foram exibidos, mas o vínculo com a tabela de configurações não pôde ser estabelecido."
          );
        }
      })
      .catch(function (err) {
        var box = el("cfg-loaded-summary");
        if (box) {
          box.classList.remove("is-hidden");
          box.innerHTML =
            '<div class="ahp-recommendation__head"><i class="fas fa-circle-xmark"></i>' +
            "<strong>Não foi possível carregar o arquivo</strong></div><p>" +
            escapeHtml(err.message) +
            "</p>";
        }
      });
  }

  global.toggleConfigSource = toggleConfigSource;
  global.handleConfigFile = handleConfigFile;

  doc.addEventListener("DOMContentLoaded", function () {
    var sel = el("cfg-saved-select");
    if (sel) sel.addEventListener("change", onSelectChange);
    preencherConfigsSalvas();
    toggleConfigSource();
  });
})(window);
