const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
require("../ahp/js/ahp-core.js");

const ahp = globalThis.SLTAhp;
const matrix = [[1, 1, 1 / 4], [1, 1, 1 / 4], [4, 4, 1]];
const result = ahp.analyzeMatrix(matrix);
assert(result.CI < 0 && Math.abs(result.CI) < Number.EPSILON * 4);
assert.equal(result.CI.toFixed(4), "-0.0000", "Reproduz cancelamento em lambdaMax - n");
assert.equal(ahp.formatMetric(result.CI), "0.0000");
assert.equal(ahp.formatMetric(result.CR), "0.0000");
for (const value of [0, -0, Number.EPSILON, -Number.EPSILON, 0.000049, -0.000049]) {
  assert.equal(ahp.formatMetric(value), "0.0000");
}
for (const value of [0.000051, -0.000051, 0.1234, -0.1234, 0.1, -0.1]) {
  assert.equal(ahp.formatMetric(value), value.toFixed(4), "Não oculta valores com sinal na precisão exibida");
}
assert.deepEqual(ahp.analyzeMatrix(matrix), result, "Formatação não altera cálculo ou dados");
assert.equal(ahp.analyzeMatrix([[1, 1, 1], [1, 1, 1], [1, 1, 1]]).CR, 0);
assert(ahp.analyzeMatrix([[1, 9, 1 / 9], [1 / 9, 1, 9], [9, 1 / 9, 1]]).CR > 0.1);

// Mesmo template e isolamento de rede dos testes de layout do formulário.
const html = execFileSync(".venv\\Scripts\\python.exe", ["-c",
  "from api.server import templates; from types import SimpleNamespace; " +
  "print(templates.env.get_template('paginas/analise_multicriterio/formulario.html').render(" +
  "request=SimpleNamespace(url=SimpleNamespace(path='/teste/'),query_params={}),modo_modelo=True))"
], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
      const file = path.join(process.cwd(), url.pathname.replace(/^\/restrict\//, ""));
      if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
      return route.fulfill({ status: 404, body: "" });
    });
    await page.goto("http://sicard.local/");
    await page.evaluate(() => {
      window.SLTColaborativaModelo = true;
      const meta = { status: "ativa", email_autorizado: true, criterios: ["A", "B", "C"] };
      window.SLTColaborativaApi = {
        obterPublico: async () => meta, validarAcesso: async () => meta,
        iniciarResposta: async () => ({}), salvarProgresso: async () => ({})
      };
      document.dispatchEvent(new Event("DOMContentLoaded"));
      document.getElementById("colab-nome").value = "Teste";
      document.getElementById("colab-inst").value = "Teste";
      document.getElementById("colab-email").value = "teste@example.invalid";
      document.getElementById("btn-liberar-form").click();
    });
    await page.waitForFunction(() => document.querySelector(".saaty-pair"));
    await page.evaluate(() => {
      window.buildLiveMatrix = () => [[1, 1, 1 / 4], [1, 1, 1 / 4], [4, 4, 1]];
      window.updateLiveMetrics();
    });
    await page.waitForFunction(() =>
      document.getElementById("metricICValue").textContent === "0.0000" &&
      document.getElementById("collab-submit-feedback").textContent.includes("Matriz consistente"));
    for (const tab of ["#collab-tab-form", "#collab-tab-matrix"]) {
      await page.locator(tab).click();
      assert.equal(await page.locator("#metricICValue").textContent(), "0.0000");
      assert.equal(await page.locator("#metricRCValue").textContent(), "0.0000");
      await page.waitForFunction(() => document.getElementById("collab-rc-sticky").textContent.includes("0.0000"));
      assert(!(await page.locator("#collab-rc-sticky").textContent()).includes("-0.0000"));
      assert((await page.locator("#collab-submit-feedback").textContent()).includes("Matriz consistente"));
      await page.locator(tab).scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !document.getElementById("collab-rc-sticky").parentElement.hidden);
    }
    console.log("PASS: float reproduction, signed zero, real signs, immutable calculation, IC/RC in both tabs and floating RC.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
