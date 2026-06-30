/**
 * Ponte entre as etapas da Calculadora AHP e a Configuração no banco, e
 * geração/importação dos artefatos do módulo de configuração.
 *
 * A partir da migração 035, cada configuração armazena os artefatos prontos
 * nas colunas do banco:
 *   • arquivo_config_fase1      — salvo ao criar (escopo + universo)
 *   • arquivo_config_fase2      — salvo ao persistir a matriz (Etapa 5)
 *   • arquivo_config_homologado — salvo ao homologar (Etapa 6)
 *
 * As funções de exportar/download preferem essas colunas e só constroem o
 * artefato localmente como fallback para configs criadas antes da migração.
 *
 * O elo entre os artefatos é o `config_codigo`. A fonte da verdade é a linha da
 * configuração no banco (lida via SLTConfigApi); o localStorage permanece apenas
 * como cache do fluxo da calculadora.
 */
(function (global) {
  "use strict";

  var CONFIG_KEY = "slt_ahp_config_atual";

  function getConfigAtual() {
    try {
      var raw = global.localStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.tipo && parsed.codigo ? parsed : null;
    } catch (_err) {
      return null;
    }
  }

  function api() {
    return global.SLTConfigApi || null;
  }

  function obterConfig() {
    var cfg = getConfigAtual();
    if (!cfg || !api()) return Promise.resolve(null);
    return api().obter(cfg.tipo, cfg.codigo).catch(function () {
      return null;
    });
  }

  // Persiste a matriz de comparação pareada (Etapa 5) na configuração.
  function persistMatriz(matriz, extra) {
    extra = extra || {};
    var cfg = getConfigAtual();
    if (!cfg || !api()) return Promise.resolve(null);
    var metodo = global.localStorage.getItem("ahp_chosenMethod");
    if (metodo === "matrix") metodo = "matriz";
    if (metodo !== "matriz" && metodo !== "formulario") metodo = null;
    var alertas =
      extra.alertas_conceituais !== undefined
        ? extra.alertas_conceituais
        : global.SLTAhpAlertas
          ? global.SLTAhpAlertas.listarPendentes()
          : [];
    var payload = {
      matriz_comparacao: matriz,
      metodo_comparacao: metodo,
      n_criterios: matriz.length,
      alertas_conceituais: alertas,
      pacote_fase: "fase_2",
    };
    return api()
      .atualizar(cfg.tipo, cfg.codigo, payload)
      .catch(function () {
        return null;
      });
  }

  // Calcula pesos + métricas no servidor (fonte da verdade) e devolve a config.
  function calcular() {
    var cfg = getConfigAtual();
    if (!cfg || !api()) return Promise.resolve(null);
    return api().calcular(cfg.tipo, cfg.codigo);
  }

  function homologar() {
    var cfg = getConfigAtual();
    if (!cfg || !api()) return Promise.reject(new Error("Configuração atual não encontrada."));
    return api().homologar(cfg.tipo, cfg.codigo);
  }

  // ----- Artefatos -----------------------------------------------------------

  function metricasDe(config) {
    return {
      lambda_max: config.lambda_max != null ? config.lambda_max : null,
      indice_consistencia:
        config.indice_consistencia != null ? config.indice_consistencia : null,
      razao_consistencia:
        config.razao_consistencia != null ? config.razao_consistencia : null,
      consistente: config.consistente != null ? config.consistente : null,
    };
  }

  function buildArtefatoObjetos(config) {
    return {
      artefato: "objetos",
      versao: 1,
      pacote_fase: "fase_1",
      config_codigo: config.codigo,
      escopo: config.nome || null,
      objetivo: config.objetivo || null,
      descricao: config.descricao || null,
      tipo_demanda: config.tipo_demanda || null,
      objetos: config.universo_objetos || [],
      criado_em: config.criadoEm || null,
      atualizado_em: config.atualizadoEm || null,
      gerado_em: new Date().toISOString(),
    };
  }

  function buildArtefatoMatriz(config) {
    return {
      artefato: "matriz",
      versao: 1,
      pacote_fase: "fase_2",
      config_codigo: config.codigo,
      criterios: config.criterios || [],
      matriz_comparacao: config.matriz_comparacao || [],
      metricas: metricasDe(config),
      alertas_conceituais: config.alertas_conceituais || [],
      criado_em: config.criadoEm || null,
      atualizado_em: config.atualizadoEm || null,
      gerado_em: new Date().toISOString(),
    };
  }

  function buildArtefatoPesos(config) {
    return {
      artefato: "pesos",
      versao: 1,
      pacote_fase: "fase_2",
      config_codigo: config.codigo,
      escopo: config.nome || null,
      objetivo: config.objetivo || null,
      descricao: config.descricao || null,
      tipo_demanda: config.tipo_demanda || null,
      criterios: config.criterios || [],
      pesos: config.pesos || null,
      metricas: metricasDe(config),
      universo_objetos: config.universo_objetos || [],
      alertas_conceituais: config.alertas_conceituais || [],
      homologado_em: config.homologadoEm || null,
      criado_em: config.criadoEm || null,
      atualizado_em: config.atualizadoEm || null,
      gerado_em: new Date().toISOString(),
    };
  }

  var BUILDERS = {
    objetos: buildArtefatoObjetos,
    matriz: buildArtefatoMatriz,
    pesos: buildArtefatoPesos,
  };

  function nomeArquivo(tipo, config) {
    var den = config && config.denominacao;
    if (den) {
      var sufixo = tipo === "objetos" ? "fase1" : tipo === "matriz" ? "fase2" : "homologado";
      return den + "_" + sufixo + ".json";
    }
    // Fallback para configs sem denominação (pré-migração 036).
    var cod = (config && config.codigo) || "config";
    return "ahp_" + tipo + "_" + cod + ".json";
  }

  function baixar(obj, filename) {
    var blob = new global.Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    var url = global.URL.createObjectURL(blob);
    var link = global.document.createElement("a");
    link.href = url;
    link.download = filename;
    global.document.body.appendChild(link);
    link.click();
    global.document.body.removeChild(link);
    global.URL.revokeObjectURL(url);
  }

  // Mapeia tipo de artefato legado → coluna do banco com o artefato persistido.
  var _COLUNA_ARTEFATO = {
    objetos: "arquivo_config_fase1",
    matriz:  "arquivo_config_fase2",
    pesos:   "arquivo_config_homologado",
  };

  // Exporta um artefato: usa a coluna persistida no banco quando disponível;
  // constrói localmente como fallback para configs antigas (pré-migração 035).
  function exportar(tipo) {
    var build = BUILDERS[tipo];
    if (!build) return Promise.reject(new Error("Artefato desconhecido: " + tipo));
    return obterConfig().then(function (config) {
      if (!config) throw new Error("Configuração atual não encontrada no banco.");
      if (tipo === "pesos" && (!config.pesos || config.consistente !== true)) {
        throw new Error(
          "Os pesos só podem ser exportados após o cálculo consistente (RC < 0,10)."
        );
      }
      if (tipo === "matriz" && config.consistente !== true) {
        throw new Error(
          "A matriz só pode ser exportada com métricas dentro do padrão de Saaty (RC < 0,10)."
        );
      }
      // Prefere o artefato pré-gerado salvo no banco; constrói só se ausente.
      var coluna = _COLUNA_ARTEFATO[tipo];
      var artefato = (coluna && config[coluna]) ? config[coluna] : build(config);
      baixar(artefato, nomeArquivo(tipo, config));
      return config;
    });
  }

  // Importa um artefato de MATRIZ (premissas&critérios + matriz pareada) para a
  // configuração atual: grava no banco e sincroniza o cache local do fluxo.
  function importarArquivo(file) {
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
    }).then(function (artefato) {
      if (!artefato || artefato.artefato !== "matriz") {
        throw new Error("Importe um artefato de matriz (premissas/critérios + comparação).");
      }
      var cfg = getConfigAtual();
      if (!cfg || !api()) throw new Error("Configuração atual não encontrada.");
      var criterios = artefato.criterios || [];
      var matriz = artefato.matriz_comparacao || [];
      // Sincroniza o cache local do fluxo da calculadora.
      try {
        global.localStorage.setItem("slt_ahp_matriz_premissas", JSON.stringify(criterios));
        global.localStorage.setItem(
          "ahp_criteria",
          JSON.stringify(
            criterios.map(function (c) {
              return c.criterio;
            })
          )
        );
        if (matriz.length) {
          global.localStorage.setItem("ahp_pairwiseMatrix", JSON.stringify(matriz));
        }
      } catch (_e) {
        /* cache best-effort */
      }
      return api().atualizar(cfg.tipo, cfg.codigo, {
        criterios: criterios,
        matriz_comparacao: matriz,
        n_criterios: criterios.length,
      });
    });
  }

  global.SLTConfigBridge = {
    getConfigAtual: getConfigAtual,
    obterConfig: obterConfig,
    persistMatriz: persistMatriz,
    calcular: calcular,
    homologar: homologar,
    exportar: exportar,
    importarArquivo: importarArquivo,
    buildArtefatoObjetos: buildArtefatoObjetos,
    buildArtefatoMatriz: buildArtefatoMatriz,
    buildArtefatoPesos: buildArtefatoPesos,
  };
})(window);
