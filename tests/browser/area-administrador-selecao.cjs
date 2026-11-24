const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    const base = "http://administracao.test";
    const linhas = Array.from({ length: 18 }, (_, i) => ({
      id: String(i + 1),
      nome: (i < 16 ? "Município" : "Região") + " " + (i + 1),
    }));
    const pedidosDeChaves = [];
    const erros = [];
    page.on("pageerror", error => erros.push(error.message));
    await page.route(base + "/**", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") {
        return route.fulfill({ contentType: "text/html", body:
          '<meta charset="utf-8"><main><nav id="admin-menu"></nav><h1 id="admin-table-title"></h1>' +
          '<p id="admin-table-sub"></p><div id="admin-table-host"></div></main>' +
          '<script src="/administrador.js"></script>' });
      }
      if (url.pathname === "/administrador.js") {
        return route.fulfill({ contentType: "text/javascript", body: fs.readFileSync("assets/js/area-administrador.js", "utf8") });
      }
      if (url.pathname === "/api/admin/esquemas") {
        return route.fulfill({ json: { esquemas: [
          { esquema: "demandas", tabelas: [{ nome: "teste", dominio: false, registros: linhas.length }] },
        ] } });
      }
      if (url.pathname.endsWith("/valores")) return route.fulfill({ json: { valores: [] } });
      const filtro = url.searchParams.get("filtro_valor") || "";
      const resultados = linhas.filter(linha => linha.nome.includes(filtro));
      if (url.searchParams.has("somente_chaves")) {
        pedidosDeChaves.push(filtro);
        return route.fulfill({ json: { chaves: resultados.map(({ id }) => ({ id })) } });
      }
      const pagina = Number(url.searchParams.get("pagina"));
      return route.fulfill({ json: {
        total: resultados.length, total_tabela: linhas.length,
        paginas: Math.ceil(resultados.length / 15), pode_editar: true,
        chave_primaria: ["id"],
        linhas: resultados.slice((pagina - 1) * 15, pagina * 15),
        colunas: [
          { nome: "id", tipo: "text", udt: "text", pk: true, ordenavel: true },
          { nome: "nome", tipo: "text", udt: "text", editavel: true, ordenavel: true, filtravel: true },
        ],
      } });
    });

    await page.goto(base + "/?esquema=demandas&tabela=teste");
    const seletor = page.getByRole("checkbox", { name: "Selecionar todos os registros filtrados" });
    const marcados = page.locator(".admin-data-table tbody input:checked");
    await seletor.click();
    await page.waitForFunction(() => document.querySelector(".admin-table-summary")?.textContent.startsWith("18 selecionados"));
    await page.getByRole("button", { name: "Última página" }).click();
    await marcados.first().waitFor();
    assert.equal(await marcados.count(), 3);
    assert.equal(await seletor.isChecked(), true);
    await marcados.first().uncheck();
    assert.equal(await seletor.evaluate(input => input.indeterminate), true);
    await page.getByRole("button", { name: "Primeira página" }).click();
    await page.waitForFunction(() => document.querySelector(".admin-table-summary")?.textContent.startsWith("17 selecionados"));
    assert.equal(await marcados.count(), 15);
    await seletor.click();
    await page.waitForFunction(() => document.querySelector(".admin-table-summary")?.textContent.startsWith("18 selecionados"));
    await seletor.uncheck();
    assert.equal(await marcados.count(), 0);

    await page.getByRole("combobox", { name: "Coluna do filtro" }).selectOption("nome");
    const valor = page.locator(".admin-filter-val");
    await valor.fill("Município");
    await valor.press("Tab");
    await page.waitForFunction(() => document.querySelector("#admin-table-sub")?.textContent.includes("16 registro(s)"));
    await seletor.click();
    await page.waitForFunction(() => document.querySelector(".admin-table-summary")?.textContent.startsWith("16 selecionados"));
    await page.getByRole("button", { name: "Última página" }).click();
    await marcados.first().waitFor();
    assert.equal(await marcados.count(), 1);
    assert.deepEqual(pedidosDeChaves, ["", "", "Município"]);
    assert.deepEqual(erros, []);
    console.log("Administração: seleção por chaves no servidor, filtro e persistência entre páginas validados.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
