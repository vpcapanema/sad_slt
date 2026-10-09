(function () {
"use strict";
  function normalizeSheetName(value) { return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  async function readCriteriaMatrix(file) {
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext === "json") return JSON.parse(await file.text());
    if (ext === "csv") { var lines = (await file.text()).split(/\r?\n/).filter(function (line) { return line.trim(); }); if (!lines.length) throw new Error("O arquivo CSV está vazio."); var separator = lines[0].includes(";") ? ";" : ",", headers = lines.shift().split(separator).map(function (value) { return value.trim(); }); return { arquivo: file.name, linhas: lines.map(function (line) { return Object.fromEntries(line.split(separator).map(function (value, index) { return [headers[index], value.trim()]; })); }) }; }
    if (ext === "xlsx" && window.XLSX) { var workbook = XLSX.read(await file.arrayBuffer(), { type: "array" }), auxiliary = new Set(["instrucoes", "_listas", "etapas", "dimensoes de criterios", "criterios"]); var hasMatrixColumns = function (name) { var header = (XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "" })[0] || []).map(normalizeSheetName); return header.some(function (value) { return value.includes("crit"); }) && header.some(function (value) { return value.includes("etapa"); }); }; var sheet = ["Matriz Crit Premissas v3", "Matriz Crit Premissas v2"].find(function (name) { return workbook.SheetNames.includes(name); }) || workbook.SheetNames.find(function (name) { return !auxiliary.has(normalizeSheetName(name)) && hasMatrixColumns(name); }) || workbook.SheetNames.find(function (name) { return !auxiliary.has(normalizeSheetName(name)); }) || workbook.SheetNames[0]; return { arquivo: file.name, aba: sheet, linhas: XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: "" }) }; }
    throw new Error("Formato não suportado. Use JSON, CSV ou XLSX.");
  }
window.SLTMatrizArquivo = { ler: readCriteriaMatrix };
})();
