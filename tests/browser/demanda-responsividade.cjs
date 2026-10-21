const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

(async () => {
  let server, browser;
  try {
    const html = execFileSync(".venv\\Scripts\\python.exe", ["-X", "utf8", "-c", `
from fastapi.testclient import TestClient
from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token
client = TestClient(app)
client.cookies.set(cookie_name(), create_token(SessionUser(id='00000000-0000-0000-0000-000000000021', email='teste@example.org', username='teste_admin', nome='Teste', tipo_usuario='ADMIN')))
response = client.get('/restrict/demanda/')
assert response.status_code == 200
print(response.text)
`], { encoding: "utf8" }).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/restrict/demanda/") {
        res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end(html); return;
      }
      const file = path.resolve(decodeURIComponent(url.pathname).replace(/^\//, ""));
      if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end(); return;
      }
      res.setHeader("Content-Type", ({ ".css": "text/css", ".js": "application/javascript", ".png": "image/png", ".woff2": "font/woff2" })[path.extname(file)] || "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("https://**/*", route => route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/restrict/demanda/`);
    for (const file of ["sigma-read.js", "admin-labels.js", "status-colors.js", "admin-analysis-info.js", "project-form.js", "input-masks.js", "painel-layer-filter.js"]) {
      await page.addScriptTag({ path: path.join("assets", "js", file) });
    }
    const source = fs.readFileSync("admin\\demanda.js", "utf8");
    await page.evaluate(source => {
      window.SLTAdminAuth = { can: () => true };
      window.SLTAdminApi = {
        listPlanos: async () => [], listProgramas: async () => [], listDemandas: async () => [],
        saveAnaliseAvaliacaoGeometria: async (id, payload) => ({ avaliacao_geometria: payload }),
      };
      window.SLTAdminAnalysisMap = { coordsFromRecord: () => ({ lat: -23.5, lng: -46.6 }) };
      const end = source.indexOf("  init().catch(");
      if (end < 0) throw Error("Bootstrap marker not found");
      (0, eval)(source.slice(0, end) + `
        window.renderMobileDemand = (kind, data) => {
          tipo = kind; record = data;
          document.getElementById("dashboard-content").innerHTML = pageHtml(data);
          renderAnalise({criterios: [
            {campo:"criterio_competencia", rotulo:"Competência", pergunta:"A demanda é compatível com a competência institucional?", resposta:true, classe:"eliminatorio"},
            {campo:"criterio_nao_duplicidade", rotulo:"Não duplicidade", pergunta:"A demanda é distinta das demais demandas cadastradas?", resposta:true, classe:"eliminatorio"},
            {campo:"criterio_clareza", rotulo:"Clareza", pergunta:"O objeto da demanda está claramente descrito?", resposta:true, classe:"classificatorio"}
          ]});
          setInfoEditMode(false);
          document.getElementById("btn-editar").addEventListener("click", () => setInfoEditMode(true));
        };
      })();`);
      SLTPainelLayerFilter.init({ container: "#painel-layer-filter", getItems: () => [] });
      document.getElementById("records-list").innerHTML = Array.from({length: 35}, (_, i) => `<div class="layer-group layer-group--record"><button class="layer-group-header">Demanda ${i + 1} — Implantação de infraestrutura de transporte</button></div>`).join("");
    }, source);
    const record = { id: "I-PRJ-2026-001", nome: "Implantação e melhoria da infraestrutura de transporte regional e acessos municipais", status: "analise_em_avaliacao", plano_id: "PLANO-PLI", descricao: "Descrição detalhada da demanda.", representante: { nome: "Representante institucional", email: "representante.institucional@example.org" }, classificacao: {}, complementos: {} };
    const widths = [320, 360, 390, 600, 768, 900, 1024, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 850 });
      for (const kind of ["projeto", "plano", "programa"]) {
        await page.evaluate(({ kind, record }) => renderMobileDemand(kind, record), { kind, record });
        const metrics = await page.evaluate(() => {
          const main = document.getElementById("dashboard-content");
          const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden";
          const outside = [...document.querySelectorAll("body *")].filter(element => visible(element) && !element.closest(".leaflet-pane, .app-nav-submenu, .app-header-icon-frame")).filter(element => {
            const box = element.getBoundingClientRect();
            return box.left < -1 || box.right > innerWidth + 1;
          }).slice(0, 12).map(element => `${element.tagName}.${element.className}: ${Math.round(element.getBoundingClientRect().width)}`);
          return {
            outside, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
            mainWidth: main.getBoundingClientRect().width,
            columns: getComputedStyle(document.querySelector("#sec-info .admin-dashboard-columns")).gridTemplateColumns.split(" ").length,
            mapHeight: document.getElementById("admin-preview-map-wrap").getBoundingClientRect().height,
            sidebarHeight: document.querySelector(".layout-sidebar").getBoundingClientRect().height,
            criterionWidth: document.querySelector(".analise-criterio").getBoundingClientRect().width,
            inputWidth: document.querySelector("#fld-nome").getBoundingClientRect().width,
            inputFont: parseFloat(getComputedStyle(document.querySelector("#fld-nome")).fontSize),
            zoom: Number(getComputedStyle(document.body).zoom),
            touchTargets: [...document.querySelectorAll(".analise-opcao, .geometria-respostas label, #sec-acoes .btn")].filter(visible).map(element => element.getBoundingClientRect().height),
          };
        });
        assert.ok(metrics.documentWidth <= width + 1, `${kind} ${width}px: page overflow ${JSON.stringify(metrics)}`);
        assert.deepEqual(metrics.outside, [], `${kind} ${width}px: elements outside viewport`);
        assert.ok(metrics.mapHeight >= (width <= 900 ? 180 : 128), `${kind} ${width}px: visible preview map ${JSON.stringify(metrics)}`);
        if (width <= 600) {
          assert.equal(metrics.columns, 1, `${kind} ${width}px: stacked information/map`);
          assert.ok(metrics.criterionWidth >= width * .7, `${kind} ${width}px: readable criteria`);
          assert.ok(metrics.inputWidth >= width * .6, `${kind} ${width}px: full-width fields`);
          assert.ok(metrics.inputFont >= 16, `${kind} ${width}px: avoid mobile input auto-zoom`);
          assert.ok(metrics.sidebarHeight < 450, `${kind} ${width}px: demand list must not push analysis far below fold`);
          assert.ok(metrics.touchTargets.every(height => height >= 44), `${kind} ${width}px: touch targets at least 44px`);
          assert.equal(metrics.zoom, 1, `${kind} ${width}px: no desktop scale on mobile`);
          assert.equal(await page.locator("#fld-nome").isDisabled(), true);
          await page.locator("#btn-editar").click();
          await page.locator("#fld-nome").fill("Demanda em edição no celular");
          assert.equal(await page.locator("#fld-nome").inputValue(), "Demanda em edição no celular");
          assert.equal(await page.locator("#btn-salvar").isVisible(), true);
          await page.locator('#geometria-criterios-grid input[value="nao"]').check();
          await page.locator('[data-geometria-encaminhamento="substituicao"]').click();
          assert.equal(await page.locator("#btn-geometria").isVisible(), true);
          const geometryButtons = await page.locator("#geometria-encaminhamento .btn").evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => {
            const box = element.getBoundingClientRect();
            return { left: box.left, right: box.right, height: box.height };
          }));
          assert.ok(geometryButtons.every(box => box.left >= 0 && box.right <= width && box.height >= 44), `${kind} ${width}px: geometry actions fit and support touch`);
          await page.locator('#geometria-criterios-grid input[value="sim"]').check();
          assert.equal(await page.locator("#geometria-encaminhamento").isVisible(), false);
          await page.locator("#btn-aprovar-geometria").click();
          await page.locator("#geometria-confirmada").waitFor({ state: "visible" });
        }
        if (width === 1440) {
          assert.equal(metrics.columns, 2, `${kind}: preserve desktop columns`);
          assert.equal(metrics.zoom, .9, `${kind}: preserve desktop scale`);
          assert.equal(metrics.inputFont, 12, `${kind}: preserve desktop typography`);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: demanda responsiva em ${widths.join(", ")}px; Projeto, Plano e Programa, mapa, campos, critérios e navegação sem transbordamento.`);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
