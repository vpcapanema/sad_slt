"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

class ClassList {
  constructor() {
    this.values = new Set();
  }
  add(value) {
    this.values.add(value);
  }
  remove(value) {
    this.values.delete(value);
  }
  toggle(value, force) {
    if (force) this.add(value);
    else this.remove(value);
  }
  contains(value) {
    return this.values.has(value);
  }
}

class Element {
  constructor(id = "") {
    this.id = id;
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.indeterminate = false;
    this.innerHTML = "";
    this.textContent = "";
    this.dataset = {};
    this.classList = new ClassList();
    this.files = [];
  }
  setAttribute(name, value) {
    this[name] = String(value);
  }
  focus() {
    this.focused = true;
  }
  querySelectorAll() {
    return [];
  }
}

class TbodyElement extends Element {
  querySelectorAll(selector) {
    if (selector !== "input[data-id]:not(:disabled)") return [];
    return [...this.innerHTML.matchAll(/<input type="checkbox" data-id="([^"]+)"[^>]*>/g)]
      .filter((match) => !match[0].includes(" disabled"))
      .map((match) => {
        const element = new Element();
        element.dataset.id = match[1];
        element.checked = match[0].includes(" checked");
        return element;
      });
  }
}

const ids = [
  "demanda-busca",
  "demanda-campo",
  "demanda-valor",
  "demanda-tbody",
  "demanda-contagem",
  "demanda-todos",
  "hier-tipo",
  "universo-objeto-valor",
  "hier-loading",
  "hier-tbody",
  "hier-error",
  "form-error",
  "hier-matriz",
  "matriz-resumo",
  "nova-hierarquizacao",
  "hier-nome",
  "hier-descricao",
  "json-modal-close",
  "json-modal",
  "json-modal-title",
  "json-modal-body",
];
const elements = Object.fromEntries(
  ids.map((id) => [id, id === "demanda-tbody" ? new TbodyElement(id) : new Element(id)]),
);
elements["hier-tipo"].value = "projeto";
elements["hier-nome"].value = "Rodada de teste";

const tabs = ["plano", "programa", "projeto"].map((tipo) => {
  const tab = new Element();
  tab.dataset.tipo = tipo;
  return tab;
});
const phases = [1].map((value) => ({ value: String(value) }));
const requests = [];
let createdPayload = null;
const fixtures = {
  projeto: [
    { id: "p1", codigo: "P-1", nome: "Aprovado", status: "aprovada" },
    { id: "p2", codigo: "P-2", nome: "Apto", status: "hierarq_apta" },
    { id: "p3", codigo: "P-3", nome: "Rascunho", status: "rascunho" },
  ],
  plano: [
    { id: "pl1", codigo: "PL-1", nome: "Plano", status: "aprovada" },
  ],
  programa: [
    { id: "pg1", codigo: "PG-1", nome: "Programa", status: "hierarq_apta" },
  ],
};

const document = {
  getElementById: (id) => elements[id],
  querySelectorAll: (selector) => {
    if (selector === "#hier-tipo-tabs [data-tipo]") return tabs;
    if (selector === "#hier-fases input:checked") return phases;
    return [];
  },
  addEventListener() {},
};

const context = {
  console,
  document,
  location: { reload() {} },
  HierApi: {
    async listar() {
      return [];
    },
    async listarUniverso(tipo, status) {
      requests.push({ tipo, status });
      return fixtures[tipo];
    },
    async listarCamposUniverso() {
      return [];
    },
    async criar(payload) {
      createdPayload = payload;
    },
  },
};
context.window = context;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync("hierarquizacao/js/processos.js", "utf8"),
  context,
  { filename: "processos.js" },
);

const flush = () => new Promise((resolve) => setImmediate(resolve));

(async () => {
  await flush();
  await flush();

  assert.deepEqual(requests[0], { tipo: "projeto", status: "todas" });
  assert.match(elements["demanda-tbody"].innerHTML, /data-status="aprovada"/);
  assert.match(elements["demanda-tbody"].innerHTML, /data-status="hierarq_apta"/);
  assert.match(
    elements["demanda-tbody"].innerHTML,
    /class="hier-demanda-indisponivel" data-status="rascunho"/,
  );
  assert.match(
    elements["demanda-tbody"].innerHTML,
    /data-id="p3"[^>]* disabled[^>]*aria-describedby=/,
  );

  elements["demanda-todos"].onchange({ target: { checked: true } });
  assert.equal(elements["demanda-todos"].checked, true);
  assert.match(elements["demanda-contagem"].textContent, /2 selecionada/);

  tabs.find((tab) => tab.dataset.tipo === "plano").onclick();
  await flush();
  await flush();
  assert.equal(elements["hier-tipo"].value, "plano");
  assert.deepEqual(requests.at(-1), { tipo: "plano", status: "todas" });
  assert.match(elements["demanda-contagem"].textContent, /0 selecionada/);

  tabs.find((tab) => tab.dataset.tipo === "programa").onclick();
  await flush();
  await flush();
  assert.equal(elements["hier-tipo"].value, "programa");
  assert.deepEqual(requests.at(-1), { tipo: "programa", status: "todas" });

  let prevented = false;
  tabs.find((tab) => tab.dataset.tipo === "programa").onkeydown({
    key: "ArrowRight",
    preventDefault() {
      prevented = true;
    },
  });
  await flush();
  await flush();
  assert.equal(prevented, true);
  assert.equal(elements["hier-tipo"].value, "projeto");

  elements["hier-tipo"].value = "projeto";
  await elements["hier-tipo"].onchange();
  await flush();
  elements["demanda-todos"].onchange({ target: { checked: true } });
  await elements["nova-hierarquizacao"].onsubmit({ preventDefault() {} });
  assert.deepEqual(
    createdPayload.objetos.map((item) => item.id),
    ["p1", "p2"],
  );

  console.log("processos.js universo: OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
