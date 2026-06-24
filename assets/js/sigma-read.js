(function (global) {
  const CADASTRO_INSTITUICAO_URL = "http://56.125.163.194/cadastro/instituicao";

  async function apiGet(path) {
    const res = await fetch(path);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function checkApi() {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("HTTP " + res.status);
      return true;
    } catch {
      throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
    }
  }

  async function listInstituicoes() {
    const body = await apiGet("/api/instituicoes");
    return body.data || [];
  }

  async function listPessoas() {
    const body = await apiGet("/api/pessoas");
    return body.data || [];
  }

  function labelInstituicao(inst) {
    if (!inst) return "—";
    return inst.razao_social || inst.nome || inst.nome_fantasia || inst.id;
  }

  function cnpjDisplay(inst) {
    if (!inst) return "";
    return inst.cnpj_masked || formatCnpj(inst.cnpj) || "";
  }

  function formatCnpj(raw) {
    const d = String(raw || "").replace(/\D/g, "");
    if (d.length !== 14) return raw || "";
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  function findInstituicao(list, id) {
    return (list || []).find((x) => String(x.id) === String(id));
  }

  function findPessoa(list, id) {
    return (list || []).find((x) => String(x.id) === String(id));
  }

  function labelPessoa(p) {
    if (!p) return "—";
    return p.nome_completo || p.nome || p.id;
  }

  function formatTelefone(raw) {
    const d = String(raw || "").replace(/\D/g, "");
    if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
    return raw || "";
  }

  global.SLTSigmaRead = {
    CADASTRO_INSTITUICAO_URL,
    checkApi,
    listInstituicoes,
    listPessoas,
    labelInstituicao,
    labelPessoa,
    formatTelefone,
    cnpjDisplay,
    findInstituicao,
    findPessoa,
  };
})(window);
