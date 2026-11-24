const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const base = "http://127.0.0.1:8083";

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    const credentials = fs.readFileSync("credencias_sigma_agentes.txt", "utf8");
    const username = credentials.match(/^[ \t]*([^\s:]+[._]gestor)[ \t]*$/mi)?.[1];
    const senha = credentials.match(/^[ \t]*senha[ \t]*[:=][ \t]*([^\r\n]+)/mi)?.[1].trim();
    assert.ok(username && senha, "Credencial local do gestor indisponível.");
    const login = await page.request.post(base + "/api/auth/login", {
      data: { username, senha, permanecer_conectado: false },
    });
    assert.equal(login.status(), 200);
    const items = Array.from({ length: 17 }, (_, i) => ({
      id: String(i + 1), codigo: "P-" + i, nome: "Projeto " + i, status: "analise_aprovada",
    }));
    const groups = Array.from({ length: 17 }, (_, i) => ({
      id: "g" + i, codigo: "G-" + i, nome: "Grupo " + i, tipo_demanda: "projeto", quantidade_demandas: 17,
    }));
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (path.startsWith("/api/auth/")) return route.continue();
      let json = [];
      if (path === "/api/agrupamentos-demandas") json = groups;
      if (path.startsWith("/api/agrupamentos-demandas/")) json = { ...groups.find(group => path.endsWith("/" + group.id)), objetos: items };
      if (path === "/api/ahp/universo/projeto") json = items;
      return route.fulfill({ json });
    });

    await page.goto(base + "/restrict/agrupamento-demandas/");
    await page.locator("[data-grupo-id]").first().waitFor();
    assert.equal(await page.locator("[data-grupo-id]").count(), 15);
    const todosGrupos = page.locator("#grupos-selecionar-todos");
    await todosGrupos.check();
    assert.match(await page.locator("#grupos-selecao").textContent(), /^17 selecionados \/ 15 .* \/ 17 no total$/);
    await page.locator("#grupos-paginacao button").last().click();
    assert.equal(await page.locator("[data-grupo-id]:checked").count(), 2);
    assert.match(await page.locator("#grupos-selecao").textContent(), /^17 selecionados \/ 2 .* \/ 17 no total$/);
    await todosGrupos.uncheck();
    await page.locator("[data-grupo-id]").first().check();
    await page.locator('[data-grupo-acao="edit-group"]').click();
    await page.locator("[data-membro-id]").first().waitFor();
    assert.equal(await page.locator("[data-membro-id]").count(), 15);
    assert.equal(await page.locator("[data-demanda-id]").count(), 15);
    const todosMembros = page.locator("#grupo-selecionar-todos");
    await todosMembros.check();
    assert.match(await page.locator("#agrupamento-selecao-resumo").textContent(), /^17 selecionados \/ 15 .* \/ 17 no total$/);
    await page.locator("#composicao-paginacao button").last().click();
    assert.equal(await page.locator("[data-membro-id]:checked").count(), 2);
    await page.locator("[data-membro-id]").first().uncheck();
    assert.equal(await todosMembros.evaluate(input => input.indeterminate), true);

    const controls = [];
    for (const prefix of ["grupos-filtro", "universo-filtro", "composicao-filtro"]) {
      controls.push(await page.locator("#" + prefix + "-inverter, #" + prefix + "-limpar").evaluateAll(elements =>
        elements.map(element => {
          const bounds = element.getBoundingClientRect();
          return [bounds.width, bounds.height, element.textContent.trim()];
        })));
    }
    assert.deepEqual(controls[1], controls[0]);
    assert.deepEqual(controls[2], controls[0]);
    const pagerStyles = [];
    for (const id of ["grupos-paginacao", "universo-paginacao", "composicao-paginacao"]) {
      pagerStyles.push(await page.locator("#" + id).evaluate(element => {
        const style = getComputedStyle(element);
        const button = element.querySelector("button"), buttonStyle = getComputedStyle(button);
        const bounds = button.getBoundingClientRect();
        return {
          gap: style.gap, fontSize: style.fontSize, align: style.alignItems, justify: style.justifyContent,
          width: bounds.width, height: bounds.height, border: buttonStyle.border,
          borderRadius: buttonStyle.borderRadius, background: buttonStyle.backgroundColor,
          text: [...element.querySelectorAll("button")].map(button => button.textContent.trim()),
        };
      }));
    }
    assert.deepEqual(pagerStyles[1], pagerStyles[0]);
    assert.deepEqual(pagerStyles[2], pagerStyles[0]);

    await page.locator("#agrupamento-proxima").click();
    assert.equal(await page.locator("[data-demanda-id]").count(), 2);
    assert.equal(await page.locator("#agrupamento-proxima").isDisabled(), true);
    await page.locator("#agrupamento-anterior").click();
    assert.equal(await page.locator("[data-demanda-id]").count(), 15);
    assert.equal(await page.locator("#agrupamento-anterior").isDisabled(), true);
    for (const [body, column, expected] of [
      ["#agrupamentos-tbody", 1, "G-16"],
      ["#agrupamento-rows", 3, "P-16"],
      ["#grupo-composicao-rows", 3, "P-16"],
    ]) {
      const header = page.locator(body).locator("..").locator("thead th").nth(column);
      await header.click();
      await header.click();
      assert.equal(await header.getAttribute("aria-sort"), "descending");
      assert.equal((await page.locator(body + " tr").first().locator("td").nth(column).textContent()).trim(), expected);
    }
    console.log("Agrupamentos e composição selecionam as 17 linhas, mantêm a seleção ao paginar e indicam a seleção parcial.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
