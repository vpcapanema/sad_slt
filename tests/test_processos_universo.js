"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const templateSource = fs.readFileSync("templates/paginas/hierarquizacao/home.html", "utf8");

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
    const attr =
      selector === "input[data-id]:not(:disabled)"
        ? "data-id"
        : selector === "input[data-resumo-id]:not(:disabled)"
          ? "data-resumo-id"
          : null;
    if (!attr) return [];
    const pattern = new RegExp(`<input type="checkbox" ${attr}="([^"]+)"[^>]*>`, "g");
    return [...this.innerHTML.matchAll(pattern)]
      .filter((match) => !match[0].includes(" disabled"))
      .map((match) => {
        const element = new Element();
        if (attr === "data-id") element.dataset.id = match[1];
        else element.dataset.resumoId = match[1];
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
  "demanda-head",
  "demanda-contagem",
  "demanda-confirmar",
  "demanda-limpar",
  "demanda-atualizar",
  "demanda-cancelar",
  "demanda-pagina-anterior",
  "demanda-pagina-proxima",
  "demanda-pagina-info",
  "demanda-resumo-contagem",
  "demanda-resumo-tbody",
  "demanda-resumo-todos",
  "demanda-resumo-excluir",
  "demanda-resumo-confirmar",
  "demanda-resumo-editar",
  "demanda-resumo-cancelar",
  "demanda-resumo-atualizar",
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
  ids.map((id) => [
    id,
    ["demanda-tbody", "demanda-resumo-tbody"].includes(id)
      ? new TbodyElement(id)
      : new Element(id),
  ]),
);
elements["demanda-todos"] = new Element("demanda-todos");
const universeTables = ["plano", "programa", "projeto"].map((tipo) => ({
  dataset: { universoTable: tipo },
  hidden: tipo !== "projeto",
  querySelector(selector) {
    if (selector === `.demanda-todos`) return elements["demanda-todos"];
    if (selector === `[data-universo-body="${tipo}"]`) return elements["demanda-tbody"];
    return null;
  },
}));
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
    { id: "p1", codigo: "P-1", nome: "Aprovado", status: "analise_aprovada", diretoria_id: "DIR-1" },
    { id: "p2", codigo: "P-2", nome: "Apto", status: "analise_aprovada", diretoria_id: "DIR-2" },
    { id: "p3", codigo: "P-3", nome: "Código antigo", status: "aprovada", diretoria_id: "DIR-1" },
    ...Array.from({ length: 14 }, (_, i) => ({
      id: `px${i + 1}`,
      codigo: `PX-${i + 1}`,
      nome: `Projeto extra ${i + 1}`,
      status: "analise_aprovada",
      diretoria_id: "DIR-1",
    })),
  ],
  plano: [
    { id: "pl1", codigo: "PL-1", nome: "Plano", status: "analise_aprovada" },
  ],
  programa: [
    { id: "pg1", codigo: "PG-1", nome: "Programa", status: "analise_aprovada" },
  ],
};

const document = {
  getElementById: (id) => elements[id] || null,
  querySelectorAll: (selector) => {
    if (selector === "#hier-tipo-tabs [data-tipo]") return tabs;
    if (selector === "#hier-fases input:checked") return phases;
    if (selector === "[data-universo-table]") return universeTables;
    return [];
  },
  querySelector: (selector) => {
    if (selector === '[data-universo-table]:not([hidden]) .demanda-todos') return elements["demanda-todos"];
    const match = selector.match(/^\[data-universo-table="([^"]+)"\]$/);
    return match ? universeTables.find((table) => table.dataset.universoTable === match[1]) : null;
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
      return [
        { campo: "status", rotulo: "Situação (status)", tipo: "texto" },
        { campo: "diretoria_id", rotulo: "Diretoria responsável", tipo: "texto" },
      ];
    },
    async criar(payload) {
      createdPayload = payload;
    },
  },
};
context.window = context;
context.SLTAdminLabels = {
  async init() {
    return new Promise(() => {});
  },
  statusDemandaLabel(codigo) {
    return {
      analise_aprovada: "Aprovada",
      aprovada: "Código antigo de aprovação",
      hierarq_apta: "Apta à hierarquização",
      rascunho: "Em rascunho",
    }[codigo] || codigo;
  },
  statusBadgeHtml(codigo) {
    return `<span class="badge-status">${this.statusDemandaLabel(codigo)}</span>`;
  },
  diretoriaLabel(id) {
    return { "DIR-1": "Diretoria de Planejamento", "DIR-2": "Diretoria de Obras" }[id] || id;
  },
};
context.SLTAdminApi = {
  async listDemandasByTipo() {
    throw new Error("Detalhes administrativos indisponíveis no teste");
  },
};
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

  assert.equal(elements["hier-loading"].classList.contains("hidden"), true);
  assert.deepEqual(requests[0], { tipo: "projeto", status: "todas" });
  assert.match(templateSource, /data-universo-table="projeto"/);
  assert.match(templateSource, /Plano estratégico/);
  assert.match(templateSource, /Classificação/);
  assert.match(templateSource, /Complementos/);
  assert.match(templateSource, /Geometria/);
  assert.match(elements["demanda-tbody"].innerHTML, /data-status="analise_aprovada"/);
  assert.match(elements["demanda-tbody"].innerHTML, />Aprovada<\/span>/);
  assert.match(elements["demanda-tbody"].innerHTML, /Diretoria de Planejamento/);
  assert.match(
    elements["demanda-tbody"].innerHTML,
    /class="hier-demanda-indisponivel" data-status="aprovada"/,
  );
  assert.match(
    elements["demanda-tbody"].innerHTML,
    /data-id="p3"[^>]* disabled[^>]*aria-describedby=/,
  );
  assert.equal(
    [...elements["demanda-tbody"].innerHTML.matchAll(/<tr class=/g)].length,
    15,
  );
  assert.equal(elements["demanda-pagina-info"].textContent, "Página 1 de 2");

  elements["demanda-campo"].value = "diretoria_id";
  elements["demanda-campo"].onchange();
  assert.match(elements["demanda-valor"].innerHTML, /Diretoria de Planejamento/);
  assert.match(elements["demanda-valor"].innerHTML, /Diretoria de Obras/);
  elements["demanda-valor"].value = "DIR-2";
  elements["demanda-valor"].oninput();
  assert.match(elements["demanda-contagem"].textContent, /^1 resultado/);
  elements["demanda-campo"].value = "";
  elements["demanda-campo"].onchange();

  elements["demanda-todos"].onchange({ target: { checked: true } });
  assert.equal(elements["demanda-todos"].checked, true);
  assert.match(elements["demanda-contagem"].textContent, /14 selecionada/);
  elements["demanda-limpar"].onclick();
  assert.match(elements["demanda-contagem"].textContent, /0 selecionada/);

  elements["demanda-todos"].onchange({ target: { checked: true } });
  elements["demanda-confirmar"].onclick();
  assert.match(elements["demanda-resumo-tbody"].innerHTML, /P-1/);
  assert.match(elements["demanda-resumo-tbody"].innerHTML, /P-2/);
  assert.doesNotMatch(elements["demanda-resumo-tbody"].innerHTML, /P-3/);
  assert.match(elements["demanda-resumo-contagem"].textContent, /14 demanda/);
  elements["demanda-resumo-todos"].onchange({ target: { checked: true } });
  assert.equal(elements["demanda-resumo-excluir"].disabled, false);
  elements["demanda-resumo-excluir"].onclick();
  assert.match(elements["demanda-resumo-contagem"].textContent, /Nenhuma/);

  elements["demanda-todos"].onchange({ target: { checked: true } });
  elements["demanda-confirmar"].onclick();
  elements["demanda-resumo-confirmar"].onclick();
  assert.match(elements["demanda-resumo-contagem"].textContent, /grupo fechado/);
  assert.equal(elements["demanda-todos"].disabled, true);
  assert.equal(elements["demanda-resumo-editar"].disabled, false);
  elements["demanda-resumo-editar"].onclick();
  assert.match(elements["demanda-resumo-contagem"].textContent, /grupo aberto/);

  const requestCountBeforeUpdate = requests.length;
  await elements["demanda-atualizar"].onclick();
  await flush();
  assert.equal(requests.length, requestCountBeforeUpdate + 1);
  assert.match(elements["demanda-resumo-contagem"].textContent, /14 demanda/);

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
  elements["demanda-confirmar"].onclick();
  elements["demanda-resumo-confirmar"].onclick();
  await elements["nova-hierarquizacao"].onsubmit({ preventDefault() {} });
  assert.deepEqual(
    createdPayload.objetos.map((item) => item.id),
    ["p1", "p2", ...Array.from({ length: 12 }, (_, i) => `px${i + 1}`)],
  );

  elements["demanda-cancelar"].onclick();
  await flush();
  await flush();
  assert.equal(elements["hier-tipo"].value, "projeto");
  assert.match(elements["demanda-resumo-contagem"].textContent, /Nenhuma/);

  console.log("processos.js universo: OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
