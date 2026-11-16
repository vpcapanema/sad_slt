"""Execução do controlador visual em DOM mínimo, sem dependências nem banco."""
from pathlib import Path
import subprocess


def test_contextual_read_only_controller():
    script = r"""
const vm = require("node:vm");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const source = fs.readFileSync("assets/js/access-mode.js", "utf8");
function scenario(profile, module) {
  let observer;
  const events = {};
  const feedback = [];
  const grants = {GESTOR:{'mad.operar':'todos'}, ANALISTA:{'mocad.analisar':'todos'}, OPERADOR:{}, VISUALIZADOR:{}};
  function element(id, text, read = false, scopedModule = null) {
    const attrs = {};
    return {
      id, title: "", textContent: text, dataset: {}, disabled: false,
      closest(selector) {
        if (selector.startsWith('button,input')) return this;
        if (selector === "[data-access-module]") return scopedModule
          ? {dataset: {accessModule: scopedModule}, querySelector: () => ({id: "local-notice"})}
          : null;
        if (read && selector.includes(".admin-filter-bar")) return {};
        return null;
      },
      matches: () => false,
      hasAttribute: key => key in attrs,
      getAttribute: key => attrs[key] || null,
      setAttribute: (key, value) => { attrs[key] = value; },
      removeAttribute: key => { delete attrs[key]; },
      querySelectorAll: () => [],
    };
  }
  const write = element("save-layer", "Salvar camada");
  const view = element("bulk-view", "Visualizar");
  const filter = element("filter", "", true);
  const nested = element("save", "Salvar", false, module === "mocad" ? "mad" : "mocad");
  const items = [write, view, filter, nested];
  const document = {
    currentScript: {dataset: {accessProfile: profile, accessModule: module, policy: JSON.stringify({permissoes:grants[profile],perfil_nome:profile})}},
    readyState: "complete", body: {},
    querySelector: () => null, getElementById: () => null,
    querySelectorAll: selector => selector === "[data-access-module]:not(script)" ? [] : items,
    addEventListener: (name, fn) => { events[name] = fn; },
  };
  vm.runInNewContext(source, {
    document,
    window: {StatusFeedback:{erro:data=>feedback.push(data)}},
    MutationObserver: class {
      constructor(callback) { observer = callback; }
      observe() {}
    },
  });
  return {write, view, filter, nested, observer, events, feedback};
}
for (const [profile, module] of [["ANALISTA", "mad"], ["GESTOR", "mocad"]]) {
  const state = scenario(profile, module);
  assert.equal(state.write.disabled, false);
  assert.equal(state.write.getAttribute("aria-disabled"), "true");
  assert.match(state.write.title, /Ação não autorizada/);
  assert.equal(state.view.disabled, false);
  assert.equal(state.filter.disabled, false);
  assert.equal(state.nested.disabled, false);
  state.write.disabled = false;
  state.write.matches = selector => selector.startsWith("button,");
  state.observer([{type: "attributes", target: state.write}]);
  assert.equal(state.write.getAttribute('aria-disabled'), 'true');
  const added = scenario(profile, module).write;
  added.disabled = false;
  added.matches = selector => selector.startsWith("button,");
  state.observer([{type: "childList", addedNodes: [added]}]);
  assert.equal(added.getAttribute('aria-disabled'), 'true');
  let prevented = false;
  state.events.submit({target: state.write, preventDefault() {prevented = true;}, stopImmediatePropagation() {}});
  assert.equal(prevented, true);
  assert.match(state.feedback[0].message, /não possui a permissão necessária/);
}
assert.equal(scenario("GESTOR", "mad").write.disabled, false);
assert.equal(scenario("ANALISTA", "mocad").write.disabled, false);
assert.equal(scenario("OPERADOR", "mad").write.getAttribute('aria-disabled'), 'true');
"""
    result = subprocess.run(["node", "-e", script], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr


def test_profile_control_uses_shared_feedback_and_both_page_bases():
    component = Path("templates/componentes/access_mode.html").read_text(encoding="utf-8")
    assert 'class="pfs-current"' in component
    assert 'role="status"' in component
    for base in ("base_conteudo.html", "base_painel_mapa.html"):
        assert 'include "componentes/access_mode.html"' in Path("templates/bases", base).read_text(encoding="utf-8")
