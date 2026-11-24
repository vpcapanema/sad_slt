const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const base = process.env.SICARD_TEST_URL || "http://127.0.0.1:8083";

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    const erros = [];
    page.on("pageerror", error => erros.push(error.message));
    const credenciais = fs.readFileSync("credencias_sigma_agentes.txt", "utf8");
    const username = "sigma.agente_gestor";
    const senha = credenciais.match(/^[ \t]*senha[ \t]*[:=][ \t]*([^\r\n]+)/mi)?.[1].trim();
    assert.ok(credenciais.includes(username) && senha);
    const login = await page.request.post(base + "/api/auth/login", {
      data: { username, senha, permanecer_conectado: false },
    });
    assert.equal(login.status(), 200);

    const demandas = Array.from({ length: 34 }, (_, i) => ({
      id: String(i + 1), codigo: "PRJ-" + (i + 1), nome: "Projeto " + (i + 1),
      status: i < 32 ? "analise_aprovada" : "cadastro",
      instituicao_nome: i < 20 || i > 31 ? "Instituição A" : "Instituição B",
      instituicao_label: i < 20 || i > 31 ? "Instituição A" : "Instituição B",
    }));
    let gravacao;
    await page.route("**/api/**", route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      if (path.includes("/api/auth/")) return route.continue();
      if (path.endsWith("/api/ahp/universo/projeto")) return route.fulfill({ json: demandas });
      if (path.endsWith("/api/agrupamentos-demandas") && req.method() === "POST") {
        gravacao = req.postDataJSON();
        return route.fulfill({ status: 201, json: { id: "novo" } });
      }
      return route.fulfill({ json: [] });
    });

    await page.goto(base + "/restrict/agrupamento-demandas/");
    await page.waitForFunction(() => typeof document.querySelector("#agrupamento-new")?.onclick === "function");
    await page.locator("#agrupamento-new").click();
    await page.locator("#agrupamento-nome").fill("Agrupamento da seleção");
    await page.locator("#agrupamento-tipo").selectOption("projeto");
    const linhas = page.locator("#agrupamento-rows [data-demanda-id]");
    await linhas.first().waitFor();
    const todos = page.getByRole("checkbox", { name: "Selecionar todas as demandas filtradas" });
    const contador = page.locator("#agrupamento-contagem");

    await todos.check();
    assert.match(await contador.textContent(), /^32 selecionados \/ 15 na página \/ 32 no total$/);
    await page.locator("#agrupamento-ultima").click();
    assert.equal(await linhas.and(page.locator(":checked")).count(), 2);
    await linhas.first().uncheck();
    await page.locator("#agrupamento-anterior").click();
    assert.match(await contador.textContent(), /^31 selecionados\b/);
    assert.equal(await todos.evaluate(input => input.indeterminate), true);

    await todos.check();
    await page.locator("#agrupamento-head th").nth(3).click();
    assert.match(await contador.textContent(), /^32 selecionados\b/);
    await todos.uncheck();
    await page.locator("#agrupamento-proxima").click();
    assert.equal(await linhas.and(page.locator(":checked")).count(), 0);

    await page.locator("#universo-filtro-coluna").selectOption("instituicao_nome");
    await page.locator("#universo-filtro-valor").selectOption("Instituição A");
    await todos.check();
    assert.match(await contador.textContent(), /^20 selecionados\b/);
    await page.locator("#agrupamento-proxima").click();
    assert.equal(await linhas.and(page.locator(":checked")).count(), 5);
    await page.locator("#grupo-adicionar").click();
    await page.locator("#grupo-confirmar").click();
    await page.locator("#agrupamento-salvar").click();
    await page.waitForFunction(() => document.querySelector("#agrupamento-editor").classList.contains("hidden"));
    assert.deepEqual(new Set(gravacao.demanda_ids), new Set(demandas.slice(0, 20).map(item => item.id)));
    assert.deepEqual(erros, []);
    console.log("Seleção do universo em três páginas, filtro, estado parcial e gravação dos 20 IDs filtrados validados.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
