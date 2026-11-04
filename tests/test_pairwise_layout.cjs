const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

// Renderiza o template real, sem servidor, banco, autenticação ou proxy.
const render = (mode) => execFileSync(".venv\\Scripts\\python.exe", ["-c",
  "from api.server import templates; from types import SimpleNamespace; " +
  "print(templates.env.get_template('paginas/analise_multicriterio/formulario.html').render(" +
  "request=SimpleNamespace(url=SimpleNamespace(path='/teste/'),query_params={}),modo_modelo=" + mode + "))"
], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });

(async () => {
  const browser = await chromium.launch();
  try {
    for (const mode of ["True", "False"]) {
      const html = render(mode);
      for (const width of [1440, 390, 844]) {
        const page = await browser.newPage({ hasTouch: true, viewport: { width, height: width === 844 ? 390 : 900 } });
        await page.route("**/*", (route) => {
          const url = new URL(route.request().url());
          if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
          const file = path.join(process.cwd(), url.pathname.replace(/^\/restrict\//, ""));
          if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
          return route.fulfill({ status: 404, body: "" });
        });
        await page.goto("http://sicard.local/");
        await page.evaluate(() => {
          window.SLTColaborativaModelo = true;
          const meta = { status: "ativa", email_autorizado: true,
            criterios: ["Ambiente", "Economia", "Segurança", "Mobilidade", "Sociedade", "Infraestrutura"] };
          window.SLTColaborativaApi = {
            obterPublico: async () => meta,
            validarAcesso: async () => meta,
            iniciarResposta: async () => ({}),
            salvarProgresso: async () => ({})
          };
          document.dispatchEvent(new Event("DOMContentLoaded"));
          document.getElementById("colab-nome").value = "Teste";
          document.getElementById("colab-inst").value = "Teste";
          document.getElementById("colab-email").value = "teste@example.invalid";
          document.getElementById("btn-liberar-form").click();
        });
        await page.waitForFunction(() => document.getElementById("collab-reciprocal-hint").textContent.includes("0/15"));
        const explanatoryTypography = await page.evaluate(() => {
          const reference = getComputedStyle(document.querySelector("#collab-context")).fontSize;
          const targets = document.querySelectorAll(
            ".collab-pairwise-intro, .collab-guia-resumo, .collab-guia-resumo strong, " +
            ".collab-guia-significado, .collab-guia-inverso, .collab-guia-inverso span, " +
            ".collab-guia-inverso strong, .collab-guia-passos p, .collab-guia-passos p b"
          );
          return { reference, sizes: [...targets].map(e => getComputedStyle(e).fontSize) };
        });
        assert(explanatoryTypography.sizes.length > 0);
        assert(explanatoryTypography.sizes.every(size => size === explanatoryTypography.reference),
          JSON.stringify({ mode, width, ...explanatoryTypography }));
        assert(await page.locator("#collab-reciprocal-hint").evaluate(e => {
          const style = getComputedStyle(e);
          return style.fontSize === "10px" && style.color === "rgb(16, 42, 67)" &&
            style.fontWeight === "600";
        }));
        for (const [selector, size] of [
          ["#collab-guia-titulo", "12px"],
          [".collab-guia-subtitulo", "16px"],
          [".collab-guia-nome", "16.8px"],
          [".collab-guia-valor", "32px"],
          [".collab-guia-passo-num", "19.2px"],
          [".collab-guia-passos div > strong", "16.8px"]
        ]) assert.equal(await page.locator(selector).first().evaluate(e => getComputedStyle(e).fontSize), size);
        console.log(`Typography mode=${mode} width=${width}: ${explanatoryTypography.reference}`);
        if (process.env.PAIRWISE_TYPOGRAPHY_ONLY === "1") {
          await page.close();
          continue;
        }
        await page.locator(".saaty-scale").first().press("Home");
        await page.locator(".saaty-scale").nth(1).press("End");
        await page.locator(".saaty-scale").nth(5).press("Home");
        await page.waitForFunction(() => document.getElementById("collab-rc-status").textContent === "Fora do aceitável");
        assert(!(await page.locator("#collab-rc-sticky").textContent()).includes("adequada para envio"));
        await page.waitForFunction(() => document.getElementById("collab-reciprocal-hint").textContent.includes("3/15"));
        assert.equal(await page.locator("#collab-rc-sticky #collab-reciprocal-hint").count(), 1);
        assert(await page.locator("#collab-reciprocal-hint").evaluate(e => {
          const s = getComputedStyle(e);
          const siblings = [...e.parentElement.children].filter(child => child !== e);
          return e.tagName === "SPAN" && e.parentElement.id === "collab-rc-sticky" &&
            s.fontFamily === 'Montserrat, Verdana, sans-serif' && s.fontSize === "10px" &&
            s.color === "rgb(21, 128, 61)" &&
            siblings.every(child => parseFloat(getComputedStyle(child).fontSize) > parseFloat(s.fontSize) &&
              getComputedStyle(child).fontFamily !== s.fontFamily) &&
            e.children.length === 0 && s.backgroundColor === "rgba(0, 0, 0, 0)" &&
            ["Top", "Right", "Bottom", "Left"].every(side =>
              parseFloat(s["padding" + side]) === 0 && parseFloat(s["border" + side + "Width"]) === 0);
        }));
        await page.locator(".saaty-scale").first().press("ArrowRight");
        await page.waitForFunction(() => document.getElementById("collab-reciprocal-hint").textContent.includes("2/15"));
        await page.evaluate(() => {
          document.getElementById("collab-form-section").classList.remove("is-hidden");
          setAhpCriteria(['Ambiente <img src=x onerror="alert(1)"> & "Água"', "Economia", "Segurança", "Mobilidade", "Sociedade", "Infraestrutura"]);
          generatePairwiseFormStep4();
          // Exercita também o cabeçalho fixo, inclusive com o zoom global da UI.
          Object.assign(document.querySelector(".app-header").style, { position: "fixed", top: "0", left: "0", width: "100%", zIndex: "100" });
          dispatchEvent(new Event("resize"));
        });
        assert.match(await page.locator("#collab-guia-titulo").textContent(), /^3\.1Entenda/);
        assert(await page.locator(".saaty-pair").evaluateAll(pairs => pairs.every(pair => {
          const first = pair.querySelector(".saaty-crit--left .saaty-crit__name span").textContent;
          return pair.querySelector(".saaty-pair-title").textContent === "Critério referência: " + first &&
            !pair.querySelector(".saaty-pair-title img");
        })));
        assert.equal(await page.locator(".saaty-pair-title").count(), 15);
        const guide = await page.locator(".collab-guia-saaty").innerText();
        for (const text of ["critério 1 é a referência", "1 significa igual importância",
          "2, 4, 6 e 8 não estão disponíveis", "esquerda do centro", "direita do centro",
          "1/3, 1/5, 1/7 e 1/9", "recíproco"]) assert(guide.includes(text), text);
        const slider = page.locator(".saaty-scale").first();
        const values = [9, 7, 5, 3, 1, 1 / 3, 1 / 5, 1 / 7, 1 / 9];
        await slider.press("Home");
        for (let index = 0; index < values.length; index++) {
          if (index) await slider.press("ArrowRight");
          assert(Math.abs(Number(await page.locator("#pair_0_1").inputValue()) - values[index]) < 1e-10);
          const reciprocal = await page.locator("#reciprocal_0_1 .saaty-reciprocal__value").textContent();
          assert.equal(reciprocal, index < 4 ? "1/" + values[index] : String(Math.round(1 / values[index])));
        }
        for (let index = 0; index < 4; index++) await slider.press("ArrowLeft");
        assert.equal(await page.locator(".secao-collab-pairwise > .info-card-content > :first-child").getAttribute("class"), "collab-pairwise-intro");
        assert.equal(await page.locator("#collab-rc-sticky [id]").count(), 1);
        assert.equal(await page.locator("#collab-reciprocal-hint").count(), 1);
        assert(await page.locator(".collab-pairwise-intro").evaluate(e => parseFloat(getComputedStyle(e).fontSize) > parseFloat(getComputedStyle(e).getPropertyValue("--ami-font-help")) * 16));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.evaluate(() => {
          document.getElementById("metricRCValue").textContent = "0.1234";
          document.getElementById("metricRCValue").parentElement.classList.add("is-failure");
        });
        await page.waitForFunction(() => document.getElementById("collab-rc-sticky").textContent.includes("0.1234"));
        assert(await page.locator("#collab-rc-sticky").evaluate(e => e.classList.contains("is-failure")));
        const bounds = await page.locator(".collab-pairs-quadrant").evaluate(e => {
          const r = e.getBoundingClientRect();
          return { top: r.top + scrollY, bottom: r.bottom + scrollY, offset: document.querySelector(".app-header").getBoundingClientRect().bottom + 12 };
        });
        for (const y of [bounds.top - bounds.offset, (bounds.top + bounds.bottom) / 2, bounds.bottom - 220, bounds.bottom + 50]) {
          await page.evaluate(y => scrollTo(0, y), y);
          await page.waitForTimeout(100);
          if (!await page.locator(".collab-rc-sidebar").isVisible()) {
            assert(y >= bounds.bottom);
            continue;
          }
          const geometry = await page.evaluate(() => {
            const box = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
            const aside = document.querySelector(".collab-rc-sidebar");
            return { sidebar: box(aside), quadrant: box(aside.parentElement), content: box(document.getElementById("comparisonContent")), header: box(document.querySelector(".app-header")), position: getComputedStyle(aside).position, height: innerHeight, width: innerWidth };
          });
          assert.equal(geometry.position, "absolute");
          assert(geometry.sidebar.top >= geometry.quadrant.top - 1);
          if (geometry.quadrant.bottom >= bounds.offset + geometry.sidebar.bottom - geometry.sidebar.top) {
            assert(geometry.sidebar.bottom <= geometry.quadrant.bottom + 1);
          } else {
            assert(geometry.sidebar.bottom <= geometry.height);
          }
          assert(geometry.sidebar.left >= -1);
          assert(geometry.sidebar.right <= geometry.width);
          if (geometry.quadrant.top <= bounds.offset && geometry.quadrant.bottom >= bounds.offset + geometry.sidebar.bottom - geometry.sidebar.top) {
            assert(geometry.sidebar.top >= bounds.offset - 1, JSON.stringify({ width, y, bounds, geometry }));
            assert(geometry.sidebar.bottom <= geometry.height);
            assert(geometry.sidebar.top >= geometry.header.bottom);
          }
        }
        await page.evaluate(y => scrollTo(0, y), (bounds.top + bounds.bottom) / 2);
        await page.waitForTimeout(100);
        assert.equal(await page.locator(".collab-rc-drag").count(), 0);
        const handle = page.locator(".collab-rc-sidebar");
        const body = page.locator("#collab-rc-sticky .ahp-metric-card__value");
        assert.equal(await body.evaluate(e => getComputedStyle(e).cursor), "grab");
        assert.equal(await handle.evaluate(e => getComputedStyle(e).touchAction), "none");
        assert.equal(await handle.getAttribute("tabindex"), "0");
        const before = await handle.boundingBox();
        const bodyBox = await body.boundingBox();
        await page.mouse.move(bodyBox.x + 10, bodyBox.y + 10);
        await page.mouse.down();
        assert.equal(await body.evaluate(e => getComputedStyle(e).cursor), "grabbing");
        await page.mouse.move(10, 250, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);
        const moved = await handle.boundingBox();
        assert(moved.x < before.x);
        // O limite horizontal é a viewport, não a coluna de comparações.
        await page.mouse.move(moved.x + 10, moved.y + 10);
        await page.mouse.down();
        await page.mouse.move(-500, moved.y + 10, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(50);
        assert(await handle.evaluate(e => {
          const r = e.getBoundingClientRect(), q = e.parentElement.getBoundingClientRect();
          return Math.abs(r.left) <= 1 && (q.left <= 1 || r.left < q.left);
        }));
        assert(await handle.evaluate(e => {
          const r = e.getBoundingClientRect();
          return e.contains(document.elementFromPoint(r.left + 5, r.top + 5));
        }));
        assert.equal(await body.evaluate(e => getComputedStyle(e).cursor), "grab");
        // Controles internos continuam recebendo cliques e teclas sem mover o card.
        await handle.evaluate(e => {
          const button = document.createElement("button");
          button.textContent = "Teste";
          button.onclick = () => { button.dataset.clicked = "true"; };
          const input = document.createElement("input");
          e.append(button, input);
        });
        const control = handle.getByRole("button", { name: "Teste", exact: true });
        await control.click();
        assert.equal(await control.getAttribute("data-clicked"), "true");
        const input = handle.locator("input");
        await input.fill("RC");
        const controlBefore = await handle.boundingBox();
        await input.press("ArrowLeft");
        assert.equal((await handle.boundingBox()).x, controlBefore.x);
        await handle.evaluate(e => e.querySelectorAll("button:not(.collab-rc-resize), input").forEach(n => n.remove()));
        const touchBox = await body.boundingBox();
        const touchBefore = await handle.boundingBox();
        const cdp = await page.context().newCDPSession(page);
        const touchPoint = { x: touchBox.x + 10, y: touchBox.y + 10 };
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchPoint] });
        assert.equal(await body.evaluate(e => getComputedStyle(e).cursor), "grabbing");
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touchPoint.x + 20, y: touchPoint.y }] });
        await page.waitForTimeout(50);
        assert((await handle.boundingBox()).x > touchBefore.x);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
        await cdp.detach();
        assert.equal(await body.evaluate(e => getComputedStyle(e).cursor), "grab");
        await handle.press("Home");
        const grip = handle.locator(".collab-rc-resize");
        assert.equal(await grip.evaluate(e => getComputedStyle(e).cursor), "nwse-resize");
        const measure = () => handle.evaluate(e => {
          const r = e.getBoundingClientRect();
          const card = e.querySelector("#collab-rc-sticky");
          const font = card.querySelector(".ahp-metric-card__value");
          const zoom = font.currentCSSZoom;
          const hint = card.querySelector("#collab-reciprocal-hint");
          return { width: r.width, height: r.height, font: parseFloat(getComputedStyle(font).fontSize) * zoom,
            hintFont: parseFloat(getComputedStyle(hint).fontSize) * hint.currentCSSZoom,
            scale: parseFloat(getComputedStyle(e).getPropertyValue("--rc-scale")) };
        });
        await grip.press("Home");
        await page.waitForTimeout(50);
        const base = await measure();
        assert(Math.abs(base.scale - 1) < 0.001);
        for (const [key, expected] of [["ArrowLeft", 0.5], ["End", 2], ["Home", 1]]) {
          if (key === "ArrowLeft") {
            for (let i = 0; i < 15; i++) { await grip.press(key); await page.waitForTimeout(20); }
          } else await grip.press(key);
          await page.waitForTimeout(50);
          const scaled = await measure();
          // Em telas estreitas/baixas o máximo respeita o espaço acessível.
          assert(scaled.scale >= 0.5 && scaled.scale <= expected + 0.001);
          if (width === 1440 || expected <= 1) assert(Math.abs(scaled.scale - expected) < 0.001);
          assert(Math.abs(scaled.width / base.width - scaled.scale) < 0.02);
          assert(Math.abs(scaled.height / base.height - scaled.scale) < 0.03);
          assert(Math.abs(scaled.font / base.font - scaled.scale) < 0.001);
          assert(Math.abs(scaled.hintFont / base.hintFont - scaled.scale) < 0.001);
          assert(await handle.evaluate(e => {
            const r = e.getBoundingClientRect();
            return r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight;
          }));
          console.log(`SCALE viewport=${width} requested=${expected} actual=${scaled.scale.toFixed(3)} width=${scaled.width.toFixed(2)} height=${scaled.height.toFixed(2)} font=${scaled.font.toFixed(2)}`);
        }
        // Resize após drag; captura mantém o gesto mesmo fora do canto.
        const gripBox = await grip.boundingBox();
        await page.mouse.move(gripBox.x + 12, gripBox.y + 12);
        await page.mouse.down();
        assert.equal(await handle.evaluate(e => e.classList.contains("is-dragging")), false);
        await page.mouse.move(gripBox.x - 500, gripBox.y - 500, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(50);
        assert.equal((await measure()).scale, 0.5);
        const resizedBody = await body.boundingBox();
        await page.mouse.move(resizedBody.x + 3, resizedBody.y + 3);
        await page.mouse.down();
        assert.equal(await handle.evaluate(e => e.classList.contains("is-dragging")), true);
        await page.mouse.move(50, 250);
        await page.mouse.up();
        const resizeCdp = await page.context().newCDPSession(page);
        const touchGrip = await grip.boundingBox();
        await resizeCdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touchGrip.x + 12, y: touchGrip.y + 12 }] });
        await resizeCdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touchGrip.x + 40, y: touchGrip.y + 40 }] });
        await page.waitForTimeout(50);
        assert((await measure()).scale > 0.5);
        await resizeCdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await resizeCdp.detach();
        await grip.press("Home");
        await handle.press("Home");
        await page.waitForTimeout(50);
        // Reposiciona para conferir deslocamento por teclado longe do limite direito.
        await handle.press("ArrowLeft");
        await page.waitForTimeout(50);
        const keyboardBefore = await handle.boundingBox();
        await handle.focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(50);
        assert((await handle.boundingBox()).x > keyboardBefore.x);
        const current = await handle.boundingBox();
        await page.mouse.move(current.x + 20, current.y + 10);
        await page.mouse.down();
        await page.mouse.move(width + 500, 1400, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);
        assert(await page.locator(".collab-rc-sidebar").evaluate(e => {
          const r = e.getBoundingClientRect(), q = e.parentElement.getBoundingClientRect();
          return r.left >= -1 && Math.abs(r.right - document.documentElement.clientWidth) <= 1 &&
            (q.right >= document.documentElement.clientWidth - 1 || r.right > q.right) &&
            r.bottom <= Math.min(q.bottom, innerHeight) + 1;
        }));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
        await page.setViewportSize({ width: width - 20, height: 600 });
        await page.waitForTimeout(100);
        assert(await page.locator(".collab-rc-sidebar").evaluate(e => e.getBoundingClientRect().right <= innerWidth + 1));
        await page.evaluate(() => scrollBy(0, 250));
        await page.waitForTimeout(100);
        assert(await page.locator(".collab-rc-sidebar").evaluate(e => {
          const r = e.getBoundingClientRect(), q = e.parentElement.getBoundingClientRect();
          return r.top >= Math.max(q.top, document.querySelector(".app-header").getBoundingClientRect().bottom) - 1 &&
            r.bottom <= Math.min(q.bottom, innerHeight) + 1;
        }));
        await handle.press("Home");
        await page.setViewportSize({ width: 390, height: 320 });
        await page.locator(".collab-pairs-quadrant").evaluate(e => {
          scrollTo(0, e.getBoundingClientRect().top + scrollY + 300);
        });
        await grip.press("End");
        await page.waitForTimeout(100);
        const constrained = await handle.evaluate(e => {
          const r = e.getBoundingClientRect();
          const scale = parseFloat(getComputedStyle(e).getPropertyValue("--rc-scale"));
          const grip = e.querySelector(".collab-rc-resize").getBoundingClientRect();
          return { valid: scale >= 0.5 && scale < 2 && r.left >= -1 && r.right <= innerWidth + 1 &&
            r.bottom <= innerHeight && e.contains(document.elementFromPoint(grip.x + 12, grip.y + 12)) &&
            document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            scale, box: r.toJSON(), header: document.querySelector(".app-header").getBoundingClientRect().toJSON(),
            quadrant: e.parentElement.getBoundingClientRect().toJSON(), scrollWidth: document.documentElement.scrollWidth };
        });
        assert(constrained.valid, JSON.stringify(constrained));
        // Não há escala válida se o cabeçalho ocupar quase toda a viewport.
        await page.setViewportSize({ width: 390, height: 200 });
        await page.waitForTimeout(100);
        assert.equal(await handle.isVisible(), false);
        await page.setViewportSize({ width: 390, height: 320 });
        await page.locator(".collab-pairs-quadrant").evaluate(e => {
          scrollTo(0, e.getBoundingClientRect().top + scrollY + 300);
        });
        await page.waitForTimeout(100);
        assert.equal(await handle.isVisible(), true);
        await page.locator("#comparisonContent").evaluate(e => e.replaceChildren());
        await page.waitForTimeout(50);
        assert.equal(await page.locator(".collab-rc-sidebar").isVisible(), false);
        console.log(`PASS mode=${mode} viewport=${width}: titles/escaping, guide/slider values, dynamic RC, scroll, drag, mouse/touch/keyboard resize, viewport limits, empty`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
