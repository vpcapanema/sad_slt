from pathlib import Path
p=Path('assets/js/paginas/analise-multicriterio-julgamentos.js')
s=p.read_text(encoding='utf-8')
def replace(old,new):
    global s
    assert old in s, old[:100]
    s=s.replace(old,new)
replace('var environmentMode = "create";', 'var environmentMode = "create";\n  var environmentId = null, environmentSaving = false, analysisSaving = false;\n  var analysisResponseIds = new Set();')
replace('var judgment = selectedRecord(); if (!judgment || modo !== "espaco") return;', 'var judgment = julgamentos.find(function (j) { return j.id === environmentId; }) || selectedRecord(); if (!judgment || modo !== "espaco") return;\n    environmentId = judgment.id;')
replace('    viewSelectedEnvironment();\n    setEnvironmentMode("edit");', '    environmentId = selectedId; viewSelectedEnvironment();\n    setEnvironmentMode("edit");')
replace('function showCreateSection() { setEnvironmentMode("create");', 'function showCreateSection() { if (environmentSaving) return; environmentId = null; setEnvironmentMode("create");')
replace('var judgment = selectedRecord(), feedbackNode = $("ami-create-feedback");', 'var judgment = julgamentos.find(function (j) { return j.id === environmentId; }), feedbackNode = $("ami-create-feedback");')
replace('if (!judgment || environmentMode !== "edit") return;', 'if (!judgment || environmentMode !== "edit" || environmentSaving) return;')
replace('    $("ami-environment-save").disabled = true;', '    environmentSaving = true; $("ami-environment-save").disabled = true;')
replace('.finally(function () { $("ami-environment-save").disabled = false; });', '.finally(function () { environmentSaving = false; updateDraftControls(); });')
replace('button.addEventListener("click", modo === "julgamentos" ? openAnalysisWorkspace : viewSelectedEnvironment);', 'button.addEventListener("click", modo === "julgamentos" ? openAnalysisWorkspace : function () { environmentId = selectedId; viewSelectedEnvironment(); });')
replace('disabled = draftEditing || !draftEmails.length;', 'disabled = environmentSaving || draftEditing || !draftEmails.length;')
replace('if (environmentMode !== "create") return;', 'if (environmentMode !== "create" || environmentSaving) return;')
needle='      api("/api/ahp/comparacao-colaborativa/ambientes", { method: "POST"'
replace(needle, '''      if (julgamentos.some(function (j) { return j.status === "ativa" && j.hierarquizacao_id === selectedHierarchy.dataset.hierarquizacaoId; }) && !window.confirm("Esta hierarquiza\\u00e7\\u00e3o possui um julgamento aberto. Criar uma nova rodada encerrar\\u00e1 a coleta anterior. Continuar?")) return;
      environmentSaving = true; updateDraftControls();
''' + needle)
replace('        renderEmailDraft(j);\n        feedback.textContent', '        environmentId = j.id; viewSelectedEnvironment();\n        feedback.textContent')
replace('}).catch(function (err) { feedback.textContent = err.message; });', '}).catch(function (err) { feedback.textContent = err.message; }).finally(function () { environmentSaving = false; updateDraftControls(); });')
replace('return item.id === selectedId; }), url = persistentPublicUrl(judgment);', 'return item.id === environmentId; }), url = persistentPublicUrl(judgment);')
replace('var enviadas = respostasEnviadas(data);\n    if (!enviadas.length)', '''var limite = Number($("ami-analysis-rc").value);
    var enviadas = respostasEnviadas(data).filter(function (r) {
      return analysisResponseIds.has(String(r.id)) && (!$("ami-analysis-exclude-inconsistent").checked || (r.consistente && Number(r.razao_consistencia) <= limite));
    });
    if (!enviadas.length)''')
replace("'data-analysis-response=\"' + escapeHtml(r.id) + '\" checked'", "'data-analysis-response=\"' + escapeHtml(r.id) + '\" ' + (analysisResponseIds.has(String(r.id)) ? 'checked' : '')")
replace('    var homologada = analiseHomologada(data);', '')
old="          (homologada && selectedMeasure === \"geometrica\" ? ' Corresponde \\u00e0 an\\u00e1lise homologada <strong>' + escapeHtml(homologada.nome) + '</strong> (' + escapeHtml(homologada.codigo) + ').' : '');"
replace(old, "          ' Pr\\u00e9via das respostas selecionadas em 2.6. O resultado homologado est\\u00e1 identificado em 2.7.';")
replace('de todos os julgadores', 'dos julgadores selecionados')
replace('    if (!analysisWorkspace) return;\n    var selecionadas = Array.from($("ami-analysis-responses").querySelectorAll("[data-analysis-response]:checked")).map(function (item) { return item.dataset.analysisResponse; });', '    if (!analysisWorkspace || analysisSaving) return;\n    var ambienteId = analysisWorkspace.ambiente.id;\n    var selecionadas = Array.from(analysisResponseIds);')
replace('    var limite = Number($("ami-analysis-rc").value) || 0.1;\n    var nome', '    var limite = Number($("ami-analysis-rc").value);\n    if (!$("ami-analysis-rc").reportValidity()) return;\n    var nome')
replace('    var criada = null;', '    var criada = null; analysisSaving = true; $("ami-analysis-calculate").disabled = true;')
replace('encodeURIComponent(selectedId) + "/analises"', 'encodeURIComponent(ambienteId) + "/analises"')
replace('nome: nome, resposta_ids: selecionadas, rc_maximo:', 'nome: nome, metodo_agregacao: selectedMeasure, resposta_ids: selecionadas, rc_maximo:')
replace('return api("/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(selectedId) + "/espaco-analitico");', 'return api("/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(ambienteId) + "/espaco-analitico");')
replace('"Matriz agregada pela m\\u00e9dia geom\\u00e9trica dos \\u00edndices."', '"Matriz calculada com o m\\u00e9todo selecionado."')
replace('[["Etapa", pendente ? pendente.titulo : "\\u2014"], ["Selecionadas", String(selecionadas.length)]]);\n    });', '[["Etapa", pendente ? pendente.titulo : "\\u2014"], ["Selecionadas", String(selecionadas.length)]]);\n    }).finally(function () { analysisSaving = false; $("ami-analysis-calculate").disabled = false; });')
replace('    analysisWorkspace = data; var a = data.ambiente, p = data.participacao;', '    analysisWorkspace = data; selectedJudgeId = null; analysisResponseIds = new Set(respostasEnviadas(data).map(function (r) { return String(r.id); })); var a = data.ambiente, p = data.participacao;')
replace('function openAnalysisWorkspace() { if (!selectedId) return;', 'function openAnalysisWorkspace(ambienteId) { ambienteId = typeof ambienteId === "string" ? ambienteId : selectedId; if (!ambienteId) return;')
# Only the open function still uses the mutable selection in this URL.
replace('encodeURIComponent(selectedId) + "/espaco-analitico"', 'encodeURIComponent(ambienteId) + "/espaco-analitico"')
replace('function () { openAnalysisWorkspace(); }', 'function () { openAnalysisWorkspace(analysisWorkspace.ambiente.id); }')
# Changing exploratory judge also changes the set to be consolidated.
replace('selectedJudgeId = select.value || null; renderPairsSection();', 'selectedJudgeId = select.value || null; analysisResponseIds = new Set(selectedJudgeId ? [selectedJudgeId] : respostasEnviadas(analysisWorkspace).map(function (r) { return String(r.id); })); renderResponsesForConsolidation(analysisWorkspace); renderPairsSection();')
replace('selectedJudgeId = barra.dataset.judge; renderPairsSection();', 'selectedJudgeId = barra.dataset.judge; analysisResponseIds = new Set([selectedJudgeId]); renderResponsesForConsolidation(analysisWorkspace); renderPairsSection();')
replace('    $("ami-analysis-calculate").addEventListener("click", consolidarRespostas);', '''    $("ami-analysis-responses").addEventListener("change", function (event) {
      var id = event.target.dataset.analysisResponse; if (!id) return;
      if (event.target.checked) analysisResponseIds.add(id); else analysisResponseIds.delete(id);
      selectedJudgeId = null; renderPairsSection();
    });
    ["ami-analysis-rc", "ami-analysis-exclude-inconsistent"].forEach(function (id) { $(id).addEventListener("change", function () { if (analysisWorkspace) renderFioDerivado(analysisWorkspace); }); });
    $("ami-analysis-calculate").addEventListener("click", consolidarRespostas);''')
# A single selected response must still obey the same exclusion filter as saving.
replace('    if (selectedJudgeId) {\n      var resposta', '    if (selectedJudgeId && !$("ami-analysis-exclude-inconsistent").checked) {\n      var resposta')
p.write_text(s,encoding='utf-8')
