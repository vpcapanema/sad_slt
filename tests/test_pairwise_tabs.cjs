const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const normalizeColor = color => {
  if (/^#[a-f\d]{3}$/i.test(color)) color = "#" + [...color.slice(1)].map(value => value + value).join("");
  if (/^#[a-f\d]{6}$/i.test(color)) {
    return `rgb(${color.slice(1).match(/../g).map(value => parseInt(value, 16)).join(", ")})`;
  }
  return color.replace(/^rgba\((.+), 1\)$/, "rgb($1)").replace(/,\s*/g, ", ");
};

const render = mode => execFileSync(".venv\\Scripts\\python.exe", ["-c",
  "from api.server import templates; from types import SimpleNamespace; " +
  "print(templates.env.get_template('paginas/analise_multicriterio/formulario.html').render(" +
  "request=SimpleNamespace(url=SimpleNamespace(path='/teste/'),query_params={}),modo_modelo=" + mode + "))"
], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });

(async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of ["modelo", "convidado", "gestao-simulacao"]) {
      const html = render(mode === "modelo" ? "True" : "False");
      assert(html.includes("ahp-formulario-publico.css?v=20261104-matrix-headers"));
      assert(html.includes("ahp-comparacao-abas.js?v=20261104-matrix-headers"));
      for (const width of [1440, 390, 844]) {
        const page = await browser.newPage({ viewport: { width, height: width === 844 ? 390 : 900 } });
        await page.route("**/*", route => {
          const url = new URL(route.request().url());
          if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
          const file = path.join(process.cwd(), url.pathname.replace(/^\/restrict\//, ""));
          if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
          return route.fulfill({ status: 404, body: "" });
        });
        await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => {
          const meta = { status: "ativa", email_autorizado: true,
            criterios: ['Ambiente <img src=x onerror="alert(1)"> & Água', "Economia", "Segurança"] };
          window.sent = null;
          window.saved = [];
          window.SLTColaborativaApi = {
            obterPublico: async () => meta, validarAcesso: async () => meta,
            iniciarResposta: async () => ({ matriz_comparacao: [[1, 3, 1], [1 / 3, 1, 1], [1, 1, 1]] }),
            salvarProgresso: async (_, payload) => { window.saved.push(payload); },
            enviarResposta: async (_, payload) => { window.sent = payload; }
          };
          window.ProcessFeedback = { iniciarCadastro: () => ({
            tarefaAtual() {}, concluirTarefa() {}, sucesso() {}, erro() {}
          }) };
        }));
        await page.goto("http://sicard.local/?token=teste" + (mode === "gestao-simulacao" ? "&simulacao=1" : ""));
        await page.evaluate(() => {
          for (const id of ["colab-nome", "colab-inst"]) document.getElementById(id).value = "Teste";
          document.getElementById("colab-email").value = "teste@example.invalid";
          if (document.getElementById("colab-token")) document.getElementById("colab-token").value = "a".repeat(43);
          document.getElementById("btn-liberar-form").click();
        });
        await page.waitForFunction(() => document.querySelectorAll("#collab-matrix-wrap td").length === 9);
        assert(await page.locator("#collab-panel-form").isVisible());
        assert(!(await page.locator("#collab-panel-matrix").isVisible()));
        assert.equal(await page.locator("#collab-matrix-wrap img").count(), 0);
        const checkMatrix = async () => assert(await page.evaluate(() => {
          const matrix = buildLiveMatrix();
          const cells = [...document.querySelectorAll("#collab-matrix-wrap tbody tr")];
          return matrix.every((row, i) => row.every((v, j) =>
            Number(cells[i].querySelectorAll("td")[j].dataset.value) === v &&
            (i !== j || v === 1) && (i === j || v === 1 / matrix[j][i])));
        }));
        await checkMatrix();
        assert.equal(await page.locator("#collab-matrix-wrap input, #collab-matrix-wrap select, #collab-matrix-wrap [contenteditable]").count(), 0);
        await page.locator("#collab-tab-form").press("ArrowRight");
        assert(await page.locator("#collab-panel-matrix").isVisible());
        assert.equal(await page.locator("#collab-tab-matrix").getAttribute("aria-selected"), "true");
        await page.locator("#collab-tab-matrix").press("Home");
        const slider = page.locator(".saaty-scale").first();
        await slider.press("Home");
        const tickColors = [];
        for (let index = 0; index < 9; index++) {
          if (index) await slider.press("ArrowRight");
          await page.waitForTimeout(250);
          tickColors.push(normalizeColor(await page.locator(".saaty-pair").first().evaluate(pair =>
            getComputedStyle(pair.querySelector(".saaty-tick.is-selected .saaty-tick-desc")).backgroundColor)));
          assert.equal(await page.locator(".collab-matrix-first").first().evaluate(cell =>
            getComputedStyle(cell).backgroundColor), tickColors[index]);
        }
        const checkAllCells = async () => {
          const result = await page.locator("#collab-matrix-wrap table").evaluate(table => {
            const rows = Array.from(table.rows);
            const n = buildLiveMatrix().length;
            return {
              n, lengths: rows.map(row => row.cells.length),
              firstRow: rows[0].cells.length, firstColumn: rows.length,
              cells: rows.flatMap((row, i) => Array.from(row.cells, (cell, j) => {
                const style = getComputedStyle(cell);
                const header = i === 0 || j === 0;
                const value = header ? null : Number(cell.dataset.value);
                const colors = SLTSaatySelectorColor.palette(document.querySelector(".saaty-pair"));
                return { i, j, header, background: style.backgroundColor, text: style.color,
                  expected: header ? null : colors[nearestSaatyIdx(value)] };
              }))
            };
          });
          assert.equal(result.firstRow, result.n + 1);
          assert.equal(result.firstColumn, result.n + 1);
          assert(result.lengths.every(length => length === result.n + 1));
          assert.equal(result.cells.length, (result.n + 1) ** 2);
          assert.equal(result.cells.filter(cell => cell.header).length, 2 * result.n + 1);
          const luminance = color => color.match(/\d+/g).slice(0, 3).map(Number)
            .map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
            .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
          for (const cell of result.cells) {
            const label = `cell [${cell.i},${cell.j}]`;
            assert.equal(normalizeColor(cell.background), cell.header ? "rgb(0, 59, 90)" :
              normalizeColor(cell.expected.background), label);
            assert.equal(normalizeColor(cell.text), cell.header ? "rgb(255, 255, 255)" :
              normalizeColor(cell.expected.text), label);
            if (cell.header) {
              assert((luminance(cell.text) + .05) / (luminance(cell.background) + .05) >= 4.5, label);
            } else if (cell.i === cell.j) {
              assert.equal(cell.background, "rgb(245, 245, 245)", label);
            }
          }
        };
        await checkAllCells();
        for (const tag of ["td", "th"]) {
          await page.locator("#collab-matrix-wrap table").evaluate((table, tag) => {
            Array.from(table.rows).forEach((row, i) => Array.from(row.cells).forEach((cell, j) => {
              if (i !== 0 && j !== 0) return;
              const replacement = document.createElement(tag);
              for (const attribute of cell.attributes) replacement.setAttribute(attribute.name, attribute.value);
              replacement.textContent = cell.textContent;
              cell.replaceWith(replacement);
            }));
          }, tag);
          await checkAllCells();
        }
        const headerColors = await page.locator("#collab-matrix-wrap thead tr > :is(th, td), #collab-matrix-wrap tbody tr > :is(th, td):first-child").evaluateAll(headers =>
          headers.map(header => {
            const style = getComputedStyle(header);
            return { background: style.backgroundColor, text: style.color };
          }));
        assert.equal(headerColors.length, 7);
        for (const header of headerColors) {
          assert.equal(header.background, "rgb(0, 59, 90)");
          assert.equal(header.text, "rgb(255, 255, 255)");
          assert(!tickColors.includes(header.background));
        }
        console.log(`Matrix palette mode=${mode} width=${width}: headers=${headerColors[0].background}, text=${headerColors[0].text}, diagonal=tick1=${tickColors[4]}`);
        await slider.press("Home");
        for (let index = 0; index < 9; index++) {
          if (index) await slider.press("ArrowRight");
          await checkAllCells();
          assert.equal(await page.locator(".collab-matrix-second").first().evaluate(cell =>
            getComputedStyle(cell).backgroundColor), tickColors[8 - index]);
          for (const cell of await page.locator(".matrix-cell--diagonal").all()) {
            assert.equal(await cell.evaluate(e => getComputedStyle(e).backgroundColor), tickColors[4]);
          }
        }
        await slider.press("Home");
        await checkMatrix();
        await checkAllCells();
        assert.equal(await page.locator(".collab-matrix-first").first().getAttribute("data-value"), "9");
        await page.locator("#collab-tab-form").press("End");
        await page.waitForFunction(() => document.querySelector(".saaty-pair.is-auto-validated"));
        assert.equal(await page.locator("#collab-matrix-wrap td.is-auto-validated").count(), 0);
        assert.equal(await page.locator(".collab-matrix-first").first().evaluate(e => getComputedStyle(e).backgroundColor), tickColors[0]);
        assert.equal(await page.locator(".collab-matrix-second").first().evaluate(e => getComputedStyle(e).backgroundColor), tickColors[8]);
        assert((await page.locator("#collab-reciprocal-hint").textContent()).includes("1/3"));
        assert(await page.locator("#collab-matrix-wrap thead th").first().evaluate(e => getComputedStyle(e).position === "sticky"));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.locator("#collab-matrix-wrap").scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        const aside = page.locator(".collab-rc-sidebar");
        assert(await aside.isVisible());
        const before = await aside.boundingBox();
        await aside.focus();
        await aside.press("ArrowLeft");
        await page.waitForTimeout(80);
        const after = await aside.boundingBox();
        assert(after.x <= before.x);
        const grip = page.locator(".collab-rc-resize");
        await grip.press("ArrowLeft");
        await page.waitForTimeout(80);
        assert(await aside.evaluate(e => {
          const s = Number(e.style.getPropertyValue("--rc-scale"));
          const r = e.getBoundingClientRect(), q = e.parentElement.getBoundingClientRect();
          return s >= .5 && s <= 2 && r.left >= -1 && r.right <= innerWidth + 1 &&
            r.top >= q.top - 1 && r.bottom <= q.bottom + 1 && r.bottom <= innerHeight + 1;
        }));
        await page.locator("#collab-tab-matrix").press("ArrowLeft");
        await slider.press("ArrowRight");
        assert.equal(await page.locator("#collab-matrix-wrap td.is-auto-validated").count(), 0);
        await checkMatrix();
        // Volta à igualdade consistente; enviar na matriz não altera o payload.
        for (const scale of await page.locator(".saaty-scale").all()) {
          await scale.press("Home");
          for (let i = 0; i < 4; i++) await scale.press("ArrowRight");
        }
        await page.waitForFunction(() => !document.getElementById("btn-enviar-resposta").disabled);
        await page.locator("#collab-tab-matrix").click();
        await page.locator("#btn-enviar-resposta").click();
        await page.waitForFunction(() => window.sent);
        assert(await page.evaluate(() => window.sent.matriz_comparacao.every(row => row.every(v => v === 1)) &&
          document.getElementById("comparisonContent").inert));
        const ids = await page.evaluate(() => [...document.querySelectorAll("[id]")].map(e => e.id));
        assert.equal(ids.length, new Set(ids).size);
        console.log(`Pairwise tabs mode=${mode} viewport=${width}: passed`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
