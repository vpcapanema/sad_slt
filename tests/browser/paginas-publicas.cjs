const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  let checks = 0;
  try {
    const page = await browser.newPage();
    for (const slug of ["diretorias", "planos", "frentes-pli", "eixos-pef"]) {
      for (const failure of [false, true]) {
        await page.goto("about:blank");
        await page.setContent('<div id="conteudo" aria-live="polite"></div>');
        await page.evaluate(({ failure, institutional, classification }) => {
          window.fetch = async (url) => ({
            ok: !failure,
            json: async () => url.includes("institucional") ? institutional : classification,
          });
        }, {
          failure,
          institutional: JSON.parse(fs.readFileSync("config/referencia-institucional.json", "utf8")),
          classification: JSON.parse(fs.readFileSync("config/referencia-classificacao.json", "utf8")),
        });
        await page.addScriptTag({ path: "cadastro/referencia-render.js" });
        await page.addScriptTag({ path: `assets/js/paginas/cadastro-catalogo-${slug}-inline-1.js` });
        await page.waitForFunction(() => document.getElementById("conteudo").getAttribute("aria-busy") === "false");
        const text = await page.locator("#conteudo").innerText();
        assert.equal(text.includes("Não foi possível"), failure, `${slug}: ${failure}`);
        assert.ok(text.length > 40);
        checks++;
      }
    }
    const source = fs.readFileSync("painel/painel.js", "utf8");
    const init = source.slice(source.indexOf("  async function init()"), source.indexOf("  init().catch"));
    for (const result of ["error", "invalid", "empty", "success"]) {
      await page.setContent('<p id="painel-load-status" role="status"></p><div id="layers-container" aria-busy="true">skeleton</div><div id="map-painel"><div class="painel-map-loading"></div></div><div id="status-legend"></div>');
      await page.evaluate(async ({ init, result }) => {
        window.SLTStorage = { loadDemandas() { throw new Error("Dados locais não devem ser consultados"); } };
        window.SLTDemandasApi = { async listPainelDemandas() {
          if (result === "error") throw new Error("offline");
          return result === "invalid" ? {} : result === "success" ? [{ id: "1" }] : [];
        }};
        window.SLTStatusColors = { renderLegend() {} };
        const $ = id => document.getElementById(id);
        let items;
        const initLayerFilter = () => {}, initLayersSectionCollapse = () => {}, initMap = () => {},
          bindLegendLayoutRefresh = () => {}, initRecordOrder = () => {},
          renderSidebar = () => $("layers-container").replaceChildren(), buildMapLayers = () => {};
        await eval(`(async()=>{${init}; await init();})()`);
      }, { init, result });
      const text = await page.locator("#painel-load-status").innerText();
      assert.equal(text.includes("Não foi possível"), result === "error" || result === "invalid");
      if (result === "empty") assert.ok(text.includes("nenhum registro"));
      if (result === "success") assert.ok(text.includes("1 registro(s)"));
      assert.equal(await page.locator("#layers-container").getAttribute("aria-busy"), "false");
      assert.equal(await page.locator(".painel-map-loading").count(), 0);
      checks++;
    }
    assert.ok(source.includes('aria-labelledby", "painel-detail-title"'));
    assert.ok(source.includes('id="painel-detail-title"'));
    console.log(`PASS: ${checks} cenários (8 catálogos e 4 cargas do painel), sem dados locais; diálogo nomeado.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
