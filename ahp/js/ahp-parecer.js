/**
 * SLTAhpParecer — Parecer Técnico-Científico da análise AHP.
 * Renderiza o parecer completo: informações cadastrais, critérios,
 * matriz de comparação (individual ou colaborativa), pesos e alertas.
 */
(function (global) {
  "use strict";

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  function fmt4(v) {
    return isFinite(v) ? Number(v).toFixed(4) : "—";
  }

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function now() {
    return new Date().toLocaleString("pt-BR");
  }

  function fmtSaaty(v) {
    if (!isFinite(v)) return "—";
    v = Number(v);
    if (v >= 0.99 && v <= 1.01) return "1";
    var fracs = [
      [9,1],[8,1],[7,1],[6,1],[5,1],[4,1],[3,1],[2,1],[3,2],[5,2],[7,2],[9,2],
      [5,3],[7,3],[8,3],[9,4],[7,4],[5,4],[3,4],
      [1,9],[1,8],[1,7],[1,6],[1,5],[1,4],[1,3],[1,2],
      [2,3],[2,5],[2,7],[2,9],[3,5],[3,7],[3,8],[4,9],[4,7],[4,5],[4,3]
    ];
    for (var k = 0; k < fracs.length; k++) {
      if (Math.abs(v - fracs[k][0] / fracs[k][1]) < 0.0001) {
        return fracs[k][1] === 1 ? String(fracs[k][0]) : fracs[k][0] + "/" + fracs[k][1];
      }
    }
    return fmt4(v);
  }

  /* ── Renderizadores de bloco ────────────────────────────────────────────── */

  function renderMatrizTable(criteria, matrix) {
    if (!Array.isArray(matrix) || !matrix.length) {
      return '<p class="ahp-info-note"><i class="fas fa-info-circle"></i> Matriz não disponível.</p>';
    }
    var h = '<div class="ahp-table-scroll"><table class="ahp-matrix-table"><thead><tr>';
    h += '<th style="background:var(--pli-deep);color:#fff;"></th>';
    criteria.forEach(function (c) {
      h += '<th style="background:var(--pli-deep);color:#fff;">' + esc(c) + '</th>';
    });
    h += '</tr></thead><tbody>';
    criteria.forEach(function (c, i) {
      h += '<tr><td style="text-align:left;background:var(--pli-deep);color:#fff;font-weight:700;">' + esc(c) + '</td>';
      matrix[i].forEach(function (v, j) {
        var cell = i === j ? '1' : fmtSaaty(v);
        var bg = i === j ? 'background:#116593;color:#fff;font-weight:700;' : '';
        h += '<td style="' + bg + '">' + cell + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }

  function renderMetricas(config) {
    var cr = config.razao_consistencia;
    var ic = config.indice_consistencia;
    var lm = config.lambda_max;
    var ia = config.indice_aleatorio;
    var crColor = cr != null && Number(cr) < 0.1 ? '#1e7e34' : '#c82333';
    var h = '<div class="ahp-parecer-metricas">';
    h += '<div class="ahp-parecer-metrica"><span class="ahp-parecer-metrica-label">λ<sub>max</sub></span><span class="ahp-parecer-metrica-valor">' + fmt4(lm) + '</span></div>';
    h += '<div class="ahp-parecer-metrica"><span class="ahp-parecer-metrica-label">IC</span><span class="ahp-parecer-metrica-valor">' + fmt4(ic) + '</span></div>';
    h += '<div class="ahp-parecer-metrica"><span class="ahp-parecer-metrica-label">IA</span><span class="ahp-parecer-metrica-valor">' + fmt4(ia) + '</span></div>';
    h += '<div class="ahp-parecer-metrica"><span class="ahp-parecer-metrica-label">RC</span><span class="ahp-parecer-metrica-valor" style="color:' + crColor + ';font-weight:700;">' + fmt4(cr) + '</span></div>';
    h += '<div class="ahp-parecer-metrica"><span class="ahp-parecer-metrica-label">Consistente</span><span class="ahp-parecer-metrica-valor" style="color:' + crColor + ';">' + (config.consistente ? 'Sim ✓' : 'Não ✗') + '</span></div>';
    h += '</div>';
    return h;
  }

  /* ── Seção I — Informações cadastrais ──────────────────────────────────── */

  function renderInfoCadastrais(config) {
    var universo = Array.isArray(config.universo_objetos) ? config.universo_objetos : [];
    var h = '<section class="ahp-parecer-section">';
    h += '<h3 class="ahp-parecer-section-title"><span class="ahp-parecer-num">I</span> Informações Cadastrais da Análise</h3>';
    h += '<table class="ahp-parecer-info-table">';
    h += '<tr><th>Denominação</th><td><code>' + esc(config.denominacao || '—') + '</code></td></tr>';
    h += '<tr><th>Tipo de análise</th><td>' + esc(config.tipo === 'portfolio' ? 'Portfólio' : 'Avulsa') + '</td></tr>';
    h += '<tr><th>Tipo de demanda</th><td>' + esc(config.tipo_demanda_nome || config.tipo_demanda || '—') + '</td></tr>';
    h += '<tr><th>Escopo / Nome</th><td>' + esc(config.nome || '—') + '</td></tr>';
    h += '<tr><th>Objetivo</th><td>' + esc(config.objetivo || '—') + '</td></tr>';
    h += '<tr><th>Código</th><td><code>' + esc(config.codigo || '—') + '</code></td></tr>';
    if (config.area_conhecimento) h += '<tr><th>Área de conhecimento</th><td>' + esc(config.area_conhecimento) + '</td></tr>';
    if (config.tema) h += '<tr><th>Tema</th><td>' + esc(config.tema) + '</td></tr>';
    if (config.homologado_em) h += '<tr><th>Homologado em</th><td>' + esc(config.homologado_em) + '</td></tr>';
    h += '</table>';

    if (universo.length) {
      h += '<h4 class="ahp-parecer-subsection-title">Universo de objetos (' + universo.length + ')</h4>';
      h += '<div class="ahp-table-scroll"><table class="ahp-matrix-table"><thead><tr>';
      h += '<th style="background:var(--pli-deep);color:#fff;">#</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Código</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Nome</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Tipo</th>';
      h += '</tr></thead><tbody>';
      universo.forEach(function (obj, i) {
        h += '<tr><td>' + (i + 1) + '</td><td><code>' + esc(obj.codigo || obj.id || '—') + '</code></td><td>' + esc(obj.nome || '—') + '</td><td>' + esc(obj.tipo_demanda || '—') + '</td></tr>';
      });
      h += '</tbody></table></div>';
    } else {
      h += '<p class="ahp-info-note" style="margin-top:0.75rem;"><i class="fas fa-info-circle"></i> Universo de objetos não informado.</p>';
    }
    h += '</section>';
    return h;
  }

  /* ── Seção II — Critérios e premissas ──────────────────────────────────── */

  function renderCriterios(config) {
    var criterios = Array.isArray(config.criterios) ? config.criterios : [];
    var h = '<section class="ahp-parecer-section">';
    h += '<h3 class="ahp-parecer-section-title"><span class="ahp-parecer-num">II</span> Estrutura Analítica — Critérios e Premissas</h3>';
    if (!criterios.length) {
      h += '<p class="ahp-info-note"><i class="fas fa-info-circle"></i> Nenhum critério registrado.</p>';
    } else {
      h += '<div class="ahp-table-scroll"><table class="ahp-matrix-table"><thead><tr>';
      h += '<th style="background:var(--pli-deep);color:#fff;">#</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Critério</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Premissa</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Dimensão</th>';
      h += '</tr></thead><tbody>';
      criterios.forEach(function (c, i) {
        var nome = typeof c === 'string' ? c : (c.criterio || '—');
        var premissa = typeof c === 'object' && c !== null ? (c.premissa || '—') : '—';
        var dimensao = typeof c === 'object' && c !== null ? (c.dimensao || '—') : '—';
        h += '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(nome) + '</strong></td><td>' + esc(premissa) + '</td><td>' + esc(dimensao) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</section>';
    return h;
  }

  /* ── Seção III — Matriz de comparação (individual) ─────────────────────── */

  function renderMatrizIndividual(config, criteria, matrix) {
    var h = '<p style="margin-bottom:0.75rem;"><strong>Modo de preenchimento:</strong> Individual</p>';
    if (config.criado_por) {
      h += '<p style="margin-bottom:1rem;"><strong>Responsável (ID):</strong> ' + esc(config.criado_por) + '</p>';
    }
    h += renderMatrizTable(criteria, matrix);
    h += renderMetricas(config);
    return h;
  }

  /* ── Seção III — Matriz de comparação (colaborativa) ───────────────────── */

  function renderColaborativoData(criteria, matrix, config, respostas) {
    var h = '<p style="margin-bottom:0.5rem;"><strong>Modo de preenchimento:</strong> Colaborativo</p>';
    h += '<p style="margin-bottom:1rem;"><strong>Total de colaboradores com resposta:</strong> ' + respostas.length + '</p>';

    if (respostas.length) {
      h += '<div class="ahp-parecer-collab-list">';
      respostas.forEach(function (r, idx) {
        var rcVal = r.razao_consistencia;
        var crColor = rcVal != null && Number(rcVal) < 0.1 ? '#1e7e34' : '#c82333';
        h += '<div class="ahp-parecer-collab-item">';
        h += '<div class="ahp-parecer-collab-header">';
        h += '<strong>' + esc(r.nome_completo || 'Colaborador ' + (idx + 1)) + '</strong>';
        if (r.email) h += ' <span class="ahp-parecer-collab-email">' + esc(r.email) + '</span>';
        if (r.instituicao) h += ' <span class="ahp-parecer-collab-inst">— ' + esc(r.instituicao) + '</span>';
        h += '</div>';
        h += '<div class="ahp-parecer-collab-metrics">';
        h += 'RC: <strong style="color:' + crColor + ';">' + fmt4(rcVal) + '</strong>';
        h += ' &nbsp; IC: <strong>' + fmt4(r.indice_consistencia) + '</strong>';
        h += ' &nbsp; λmax: <strong>' + fmt4(r.lambda_max) + '</strong>';
        h += ' &nbsp; Consistente: <strong style="color:' + crColor + ';">' + (r.consistente ? 'Sim ✓' : 'Não ✗') + '</strong>';
        h += '</div>';
        if (Array.isArray(r.matriz_comparacao) && r.matriz_comparacao.length) {
          h += renderMatrizTable(criteria, r.matriz_comparacao);
        }
        h += '</div>';
      });
      h += '</div>';
    }

    h += '<div class="ahp-parecer-agregacao">';
    h += '<label for="parecer-metrica-agregacao"><strong>Métrica de agregação utilizada:</strong></label>';
    h += '<select id="parecer-metrica-agregacao" class="c-form-control" style="width:auto;display:inline-block;margin-left:0.5rem;">';
    [['media','Média'],['mediana','Mediana'],['moda','Moda'],['maximo','Máximo'],['minimo','Mínimo']].forEach(function (p) {
      h += '<option value="' + p[0] + '">' + p[1] + '</option>';
    });
    h += '</select>';
    h += '</div>';

    h += '<h4 class="ahp-parecer-subsection-title">Matriz resultante (após agregação)</h4>';
    h += renderMatrizTable(criteria, matrix);
    h += '<p class="form-help" style="margin-top:0.5rem;">Matriz consolidada utilizada para o cálculo dos pesos.</p>';
    h += renderMetricas(config);
    return h;
  }

  /* ── Seção IV — Pesos ───────────────────────────────────────────────────── */

  function renderPesos(config, criteria, results) {
    var weights = (config.pesos && Array.isArray(config.pesos.weights) && config.pesos.weights.length)
      ? config.pesos.weights
      : (results && Array.isArray(results.weights) ? results.weights : []);
    var h = '<section class="ahp-parecer-section">';
    h += '<h3 class="ahp-parecer-section-title"><span class="ahp-parecer-num">IV</span> Pesos e Importância Relativa</h3>';
    if (!weights.length) {
      h += '<p class="ahp-info-note">Pesos não disponíveis.</p>';
    } else {
      h += '<div class="ahp-table-scroll"><table class="ahp-matrix-table"><thead><tr>';
      h += '<th style="background:var(--pli-deep);color:#fff;">#</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Critério</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Peso</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Percentual</th>';
      h += '<th style="background:var(--pli-deep);color:#fff;">Gráfico</th>';
      h += '</tr></thead><tbody>';
      criteria.forEach(function (c, i) {
        var w = weights[i] || 0;
        var pct = (w * 100).toFixed(2);
        h += '<tr>';
        h += '<td>' + (i + 1) + '</td>';
        h += '<td style="text-align:left;"><strong>' + esc(c) + '</strong></td>';
        h += '<td>' + fmt4(w) + '</td>';
        h += '<td>' + pct + '%</td>';
        h += '<td><div style="display:flex;align-items:center;gap:8px;min-width:170px;">';
        h += '<div style="flex:1;background:#eef1f4;border-radius:6px;height:22px;overflow:hidden;border:1px solid #e0e4e9;">';
        h += '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--pli-blue),var(--pli-green));border-radius:6px;"></div>';
        h += '</div><span style="font-size:0.8rem;font-weight:700;color:var(--pli-deep);min-width:48px;text-align:right;">' + pct + '%</span></div></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</section>';
    return h;
  }

  /* ── Seção V — Alertas de coerência ────────────────────────────────────── */

  function renderAlertasSection() {
    var h = '<section class="ahp-parecer-section">';
    h += '<h3 class="ahp-parecer-section-title"><span class="ahp-parecer-num">V</span> Alertas de Coerência Conceitual</h3>';
    h += '<div id="parecer-alertas-panel"></div>';
    h += '</section>';
    return h;
  }

  /* ── Ações ──────────────────────────────────────────────────────────────── */

  function renderAcoes() {
    var h = '<div class="ahp-parecer-acoes">';
    h += '<button type="button" id="btn-salvar-parecer" class="btn btn-success"><i class="fas fa-floppy-disk c-btn__icon"></i>Salvar Parecer</button>';
    h += '<button type="button" id="btn-exportar-parecer-pdf" class="btn btn-primary"><i class="fas fa-file-pdf c-btn__icon"></i>Exportar Parecer PDF</button>';
    h += '<span id="parecer-acoes-feedback" role="status" aria-live="polite" style="font-size:0.875rem;margin-left:1rem;"></span>';
    h += '</div>';
    return h;
  }

  /* ── render() ───────────────────────────────────────────────────────────── */

  var SLTAhpParecer = {};

  SLTAhpParecer.render = function (container, config, criteria, matrix, results) {
    if (!container) return;
    config = config || {};
    criteria = criteria || [];
    matrix = matrix || [];
    results = results || {};

    var isCollab = config.metodo_comparacao === 'formulario';

    var html = '<div class="ahp-parecer-wrapper">';
    html += '<div class="ahp-parecer-header">';
    html += '<i class="fas fa-file-contract"></i>';
    html += '<div><strong>Parecer Técnico-Científico — Análise AHP</strong><br>';
    html += '<small>Gerado em: ' + now() + '</small></div>';
    html += '</div>';

    html += renderInfoCadastrais(config);
    html += renderCriterios(config);

    html += '<section class="ahp-parecer-section">';
    html += '<h3 class="ahp-parecer-section-title"><span class="ahp-parecer-num">III</span> Matriz de Comparação Pareada</h3>';
    if (isCollab) {
      html += '<div id="ahp-parecer-collab-section"><p class="ahp-info-note"><i class="fas fa-spinner fa-spin"></i> Carregando respostas colaborativas…</p></div>';
    } else {
      html += renderMatrizIndividual(config, criteria, matrix);
    }
    html += '</section>';

    html += renderPesos(config, criteria, results);
    html += renderAlertasSection();
    html += renderAcoes();
    html += '</div>';

    container.innerHTML = html;

    // Renderizar alertas existentes
    if (window.SLTAhpDiagnostico && typeof window.SLTAhpDiagnostico.renderParecerAlertas === 'function') {
      window.SLTAhpDiagnostico.renderParecerAlertas(
        document.getElementById('parecer-alertas-panel'),
        window.__sltConfigAlertas || []
      );
    }

    // Carregar respostas colaborativas de forma assíncrona
    if (isCollab && config.tipo && config.codigo) {
      var collabSec = document.getElementById('ahp-parecer-collab-section');
      if (window.SLTColaborativaApi) {
        window.SLTColaborativaApi.obterAmbienteConfig(config.tipo, config.codigo)
          .then(function (ambiente) {
            if (!ambiente || !ambiente.id) throw new Error('Ambiente colaborativo não encontrado.');
            return window.SLTColaborativaApi.listarRespostas(ambiente.id);
          })
          .then(function (respostas) {
            window.__sltParecerRespostas = respostas;
            if (collabSec) {
              collabSec.innerHTML = renderColaborativoData(criteria, matrix, config, respostas);
            }
          })
          .catch(function (err) {
            if (collabSec) {
              collabSec.innerHTML =
                '<p class="ahp-info-note"><i class="fas fa-triangle-exclamation"></i> Não foi possível carregar respostas colaborativas: ' + esc(err.message) + '</p>' +
                '<h4 class="ahp-parecer-subsection-title">Matriz resultante</h4>' +
                renderMatrizIndividual(config, criteria, matrix);
            }
          });
      } else {
        if (collabSec) {
          collabSec.innerHTML = renderMatrizIndividual(config, criteria, matrix);
        }
      }
    }

    // Vincular botões de ação
    var fbEl = document.getElementById('parecer-acoes-feedback');
    function setFb(msg, kind) {
      if (!fbEl) return;
      fbEl.textContent = msg || '';
      fbEl.style.color = kind === 'error' ? '#c82333' : (kind === 'ok' ? '#1e7e34' : '#116593');
    }

    var btnSalvar = document.getElementById('btn-salvar-parecer');
    if (btnSalvar) {
      btnSalvar.addEventListener('click', function () {
        SLTAhpParecer.salvar(config, criteria, matrix, results, setFb);
      });
    }
    var btnPDF = document.getElementById('btn-exportar-parecer-pdf');
    if (btnPDF) {
      btnPDF.addEventListener('click', function () {
        SLTAhpParecer.exportarPDF(config, criteria, matrix, results);
      });
    }
  };

  /* ── salvar() ───────────────────────────────────────────────────────────── */

  SLTAhpParecer.salvar = function (config, criteria, matrix, results, setFb) {
    setFb = setFb || function () {};
    if (!window.SLTConfigBridge) { setFb('Bridge não disponível.', 'error'); return; }
    var cfg = window.SLTConfigBridge.getConfigAtual ? window.SLTConfigBridge.getConfigAtual() : null;
    if (!cfg || !cfg.tipo || !cfg.codigo) { setFb('Configuração não identificada.', 'error'); return; }

    var respostas = window.__sltParecerRespostas || [];
    var selAgr = document.getElementById('parecer-metrica-agregacao');
    var metricaAgregacao = selAgr ? selAgr.value : 'media';
    var parecerData = SLTAhpParecer.buildData(config, criteria, matrix, results, respostas, metricaAgregacao);
    var arquivoAtual = (window.__sltCurrentConfig && window.__sltCurrentConfig.arquivo_config_homologado) || {};
    var arquivoAtualizado = Object.assign({}, arquivoAtual, { bloco_parecer: parecerData });

    setFb('Salvando parecer…', 'info');
    fetch('/api/ahp/configuracoes/' + encodeURIComponent(cfg.tipo) + '/' + encodeURIComponent(cfg.codigo), {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arquivo_config_homologado: arquivoAtualizado }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error((body && body.detail) || 'Erro ao salvar parecer.');
          return body;
        });
      })
      .then(function (updated) {
        if (window.__sltCurrentConfig) {
          window.__sltCurrentConfig.arquivo_config_homologado = updated.arquivo_config_homologado;
        }
        setFb('Parecer salvo com sucesso.', 'ok');
      })
      .catch(function (err) { setFb(err.message, 'error'); });
  };

  /* ── buildData() ────────────────────────────────────────────────────────── */

  SLTAhpParecer.buildData = function (config, criteria, matrix, results, respostas, metricaAgregacao) {
    var data = {
      gerado_em: new Date().toISOString(),
      modo_preenchimento: config.metodo_comparacao === 'formulario' ? 'colaborativo' : 'individual',
      info_cadastrais: {
        denominacao: config.denominacao,
        codigo: config.codigo,
        tipo: config.tipo,
        tipo_demanda: config.tipo_demanda,
        nome: config.nome,
        objetivo: config.objetivo,
        universo_objetos: config.universo_objetos,
      },
      criterios: config.criterios,
      matriz_comparacao: matrix,
      metricas: {
        lambda_max: config.lambda_max,
        indice_consistencia: config.indice_consistencia,
        razao_consistencia: config.razao_consistencia,
        indice_aleatorio: config.indice_aleatorio,
        consistente: config.consistente,
      },
      pesos: config.pesos,
      alertas_conceituais: config.alertas_conceituais || [],
    };
    if (respostas && respostas.length) {
      data.colaboradores = respostas.map(function (r) {
        return {
          nome_completo: r.nome_completo,
          email: r.email,
          instituicao: r.instituicao,
          matriz_comparacao: r.matriz_comparacao,
          lambda_max: r.lambda_max,
          indice_consistencia: r.indice_consistencia,
          razao_consistencia: r.razao_consistencia,
          consistente: r.consistente,
        };
      });
      data.metrica_agregacao = metricaAgregacao || 'media';
    }
    return data;
  };

  /* ── exportarPDF() ──────────────────────────────────────────────────────── */

  SLTAhpParecer.exportarPDF = function (config, criteria, matrix, results) {
    if (typeof window.jspdf === 'undefined') {
      alert('Biblioteca jsPDF não carregada.');
      return;
    }
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var margin = 15;
    var pageW = 210;
    var y = margin;

    function chk() { if (y > 270) { doc.addPage(); y = margin; } }

    function addTitle(text, size, rgb) {
      doc.setFontSize(size || 13);
      doc.setTextColor.apply(doc, rgb || [0, 62, 107]);
      var lines = doc.splitTextToSize(text, pageW - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * ((size || 13) * 0.38) + 4;
      chk();
    }

    function addText(text, size) {
      doc.setFontSize(size || 10);
      doc.setTextColor(50, 50, 50);
      var lines = doc.splitTextToSize(String(text || ''), pageW - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * ((size || 10) * 0.38) + 2;
      chk();
    }

    function addSep() {
      doc.setDrawColor(180, 180, 180);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
      chk();
    }

    addTitle('Parecer Técnico-Científico — Análise AHP', 16);
    addText('Gerado em: ' + now());
    addSep();

    addTitle('I. Informações Cadastrais');
    addText('Denominação: ' + (config.denominacao || '—'));
    addText('Tipo: ' + (config.tipo || '—') + '  |  Tipo de demanda: ' + (config.tipo_demanda_nome || config.tipo_demanda || '—'));
    addText('Escopo: ' + (config.nome || '—'));
    addText('Objetivo: ' + (config.objetivo || '—'));
    addText('Código: ' + (config.codigo || '—'));
    addSep();

    addTitle('II. Critérios e Premissas');
    var cRows = (Array.isArray(config.criterios) ? config.criterios : []).map(function (c, i) {
      var nome = typeof c === 'string' ? c : (c.criterio || '—');
      var premissa = typeof c === 'object' && c ? (c.premissa || '—') : '—';
      var dimensao = typeof c === 'object' && c ? (c.dimensao || '—') : '—';
      return [String(i + 1), nome, premissa, dimensao];
    });
    if (cRows.length) {
      doc.autoTable({
        startY: y, head: [['#', 'Critério', 'Premissa', 'Dimensão']], body: cRows,
        theme: 'striped', headStyles: { fillColor: [0, 62, 107] },
        margin: { left: margin, right: margin }, styles: { fontSize: 8 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
    addSep();

    addTitle('III. Matriz de Comparação Pareada');
    addText(
      'RC: ' + fmt4(config.razao_consistencia) +
      '  |  IC: ' + fmt4(config.indice_consistencia) +
      '  |  λmax: ' + fmt4(config.lambda_max) +
      '  |  Consistente: ' + (config.consistente ? 'Sim' : 'Não')
    );
    if (Array.isArray(matrix) && matrix.length) {
      var mHead = [''].concat(criteria);
      var mBody = criteria.map(function (c, i) {
        return [c].concat(matrix[i].map(function (v, j) { return i === j ? '1' : fmt4(v); }));
      });
      doc.autoTable({
        startY: y, head: [mHead], body: mBody,
        theme: 'striped', headStyles: { fillColor: [0, 62, 107] },
        margin: { left: margin, right: margin }, styles: { fontSize: 7 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
    addSep();

    addTitle('IV. Pesos e Importância Relativa');
    var weights = (config.pesos && Array.isArray(config.pesos.weights)) ? config.pesos.weights : (results ? results.weights : []);
    if (weights && weights.length) {
      var pBody = criteria.map(function (c, i) {
        var w = weights[i] || 0;
        return [c, fmt4(w), (w * 100).toFixed(2) + '%'];
      });
      doc.autoTable({
        startY: y, head: [['Critério', 'Peso', 'Percentual']], body: pBody,
        theme: 'striped', headStyles: { fillColor: [0, 62, 107] },
        margin: { left: margin, right: margin }, styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
    addSep();

    addTitle('V. Alertas de Coerência Conceitual');
    var alertas = window.__sltConfigAlertas || [];
    if (!alertas.length) {
      addText('Nenhum alerta de coerência conceitual registrado.');
    } else {
      alertas.forEach(function (a) {
        addText((a.codigo ? '[' + a.codigo + '] ' : '') + (a.mensagem || ''), 9);
      });
    }

    // Colaboradores (se disponíveis)
    var respostas = window.__sltParecerRespostas;
    if (respostas && respostas.length) {
      addSep();
      addTitle('Colaboradores');
      var cBody = respostas.map(function (r, i) {
        return [
          String(i + 1),
          r.nome_completo || '—',
          r.email || '—',
          r.instituicao || '—',
          fmt4(r.razao_consistencia),
          r.consistente ? 'Sim' : 'Não',
        ];
      });
      doc.autoTable({
        startY: y,
        head: [['#', 'Nome', 'E-mail', 'Instituição', 'RC', 'Consistente']],
        body: cBody,
        theme: 'striped', headStyles: { fillColor: [0, 62, 107] },
        margin: { left: margin, right: margin }, styles: { fontSize: 8 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    var den = config.denominacao || ('parecer_' + (config.codigo || 'ahp'));
    doc.save(den + '_parecer.pdf');
  };

  global.SLTAhpParecer = SLTAhpParecer;
})(window);
