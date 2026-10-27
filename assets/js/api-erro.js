/**
 * Extrai a mensagem real de erro de uma resposta HTTP do backend.
 * Aceita detail em string, lista Pydantic ({loc,msg,mensagem,campo}) ou objeto {message, field}.
 * Funciona no navegador (window.SicardApiErro) e em Node (module.exports) para testes.
 */
(function (global) {
  "use strict";

  function curto(valor) {
    var t = typeof valor === "string" ? valor : JSON.stringify(valor);
    return t && t.length > 120 ? t.slice(0, 119) + "…" : t;
  }

  function item(i) {
    if (i == null) return "";
    if (typeof i === "string") return i;
    if (i.mensagem) return String(i.mensagem);
    var campo = i.campo || (Array.isArray(i.loc) ? i.loc.filter(function (p, n) {
      return !(n === 0 && /^(body|query|path|header|cookie|form)$/.test(String(p)));
    }).join(".") : i.field || "");
    var msg = i.msg || i.message || i.detail || "";
    var out = campo ? "Campo '" + campo + "': " + (msg || "valor inválido") : (msg || JSON.stringify(i));
    if (i.input !== undefined && i.type !== "missing") out += " (recebido: " + curto(i.input) + ")";
    return out;
  }

  /** Texto legível do corpo de erro (sem o prefixo HTTP). */
  function extrairDetalhe(body) {
    if (body == null) return "";
    if (typeof body === "string") return body.trim();
    var d = body.detail;
    if (Array.isArray(d)) return d.map(item).filter(Boolean).join("; ");
    if (d && typeof d === "object") {
      var base = d.message || d.mensagem || d.detail || "";
      var campo = d.field || d.campo;
      if (typeof base === "object") base = item(base);
      return (campo ? "Campo '" + campo + "': " : "") + (base || JSON.stringify(d));
    }
    if (typeof d === "string" && d) return d;
    return body.message || body.mensagem || body.error || "";
  }

  /**
   * Mensagem completa: detalhe do backend + código HTTP + recurso envolvido.
   * opcoes: {status, statusText, url, method, recurso}
   */
  function formatar(body, opcoes) {
    opcoes = opcoes || {};
    var detalhe = extrairDetalhe(body) || opcoes.statusText || "O servidor não retornou detalhes do erro";
    var sufixo = [];
    if (opcoes.status) sufixo.push("HTTP " + opcoes.status);
    var alvo = opcoes.recurso || [opcoes.method, opcoes.url].filter(Boolean).join(" ");
    if (alvo) sufixo.push(alvo);
    return sufixo.length ? detalhe.replace(/[.\s]+$/, "") + " (" + sufixo.join(" — ") + ")" : detalhe;
  }

  /** Cria Error com status, detail estruturado e mensagem completa. */
  async function deResposta(res, opcoes) {
    var body = null;
    try { body = await res.clone().json(); } catch (e) {
      try { var txt = await res.text(); body = txt ? { detail: txt.slice(0, 300) } : null; } catch (e2) { body = null; }
    }
    var o = Object.assign({ status: res.status, statusText: res.statusText, url: res.url && res.url.replace(/^https?:\/\/[^/]+/, "") }, opcoes || {});
    var err = new Error(formatar(body, o));
    err.status = res.status;
    err.detail = body && Array.isArray(body.detail) ? body.detail.map(item) : (body && body.detail ? [extrairDetalhe(body)] : []);
    err.body = body;
    err.url = o.url;
    return err;
  }

  /** Falha de rede (fetch rejeitado): informa recurso e causa em vez de "Failed to fetch". */
  function deRede(causa, opcoes) {
    opcoes = opcoes || {};
    var alvo = opcoes.recurso || [opcoes.method, opcoes.url].filter(Boolean).join(" ") || "o servidor";
    var motivo = causa && causa.name === "AbortError" ? "requisição cancelada ou expirada"
      : (causa && causa.message) || "sem resposta do servidor";
    var err = new Error("Não foi possível comunicar com " + alvo + ": " + motivo + ". Verifique a conexão e tente novamente.");
    err.status = 0;
    err.causa = causa;
    err.detail = [];
    return err;
  }

  var api = { extrairDetalhe: extrairDetalhe, formatar: formatar, deResposta: deResposta, deRede: deRede };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.SicardApiErro = api;
})(typeof window !== "undefined" ? window : globalThis);
