const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

(async () => {
  const python = path.join(".venv", "Scripts", "python.exe");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sicard-favorabilidade-"));
  const folder = "superficies-indices/hierarquizacao/favorabilidade";
  const layers = [
    { arquivo: `${folder}/favorabilidade_rede_trechos.gpkg`, camada: "subtrechos", campo: "fav_rede_dim", simples: "fav_rede", geometria_tipo: "LineString", fixture: "rede" },
    { arquivo: `${folder}/indicadores_municipais.gpkg`, camada: "municipios", campo: "fav_territorial_dim", simples: "fav_territorial", geometria_tipo: "Polygon", fixture: "territorio" },
    { arquivo: "base-geoespacial/favorabilidade_rede_trechos.gpkg", camada: "subtrechos", geometria_tipo: "LineString", fixture: "rede" },
    { arquivo: `${folder}/Favorabilidade Rede Trechos pol.gpkg`, camada: "subtrechos", geometria_tipo: "Polygon", fixture: "territorio" },
  ].map(item => ({ ...item, id: `storage:${item.arquivo}::${item.camada}`, nome: path.posix.basename(item.arquivo, ".gpkg"), tipo: "vetor" }));
  let server, browser;
  try {
    const values = {
      rede: [0, .22, .42, .62, .82, null, -.1, 1.1, .125, .81, .819, .02, .04],
      territorio: [0, .33, .53, .73, .93, null, -.1, 1.1, .3, .92, .929, .02, .04],
    };
    const fixtures = Object.fromEntries(layers.slice(0, 2).map(layer => [layer.fixture, {
      type: "FeatureCollection",
      features: values[layer.fixture].map((value, i) => {
        const x = -47.4 + i * .1;
        return {
          type: "Feature", properties: { [layer.campo]: value, [layer.simples]: value == null ? .5 : 1 - value,
            fav_rede_classe: ["muito baixa", "baixa", "média", "alta", "muito alta", null, "desconhecida"][i % 7] },
          geometry: layer.fixture === "rede"
            ? { type: "LineString", coordinates: [[x, -23.2], [x + .08, -23.2]] }
            : { type: "Polygon", coordinates: [[[x, -23.24], [x + .08, -23.24], [x + .08, -23.16], [x, -23.16], [x, -23.24]]] },
        };
      }),
    }]));
    const classifications = JSON.parse(execFileSync(python, ["-X", "utf8", "-c", `
import json, sys
from pathlib import Path
from osgeo import gdal
import pandas as pd
from api.services.geoespacial_service import geoespacial_service
gdal.UseExceptions()
root = Path(sys.argv[1])
classifications = {}
for name, data in json.load(sys.stdin).items():
    source = root / (name + '.geojson')
    source.write_text(json.dumps(data), encoding='utf-8')
    result = gdal.VectorTranslate(str(root / name), str(source), format='MVT', layerName='camada',
        datasetCreationOptions=['MINZOOM=0', 'MAXZOOM=10', 'COMPRESS=NO', 'FORMAT=DIRECTORY', 'SIMPLIFICATION=0', 'SIMPLIFICATION_MAX_ZOOM=0'])
    assert result is not None
    result = None
    field = 'fav_rede_dim' if name == 'rede' else 'fav_territorial_dim'
    values = pd.Series([f['properties'][field] for f in data['features']])
    values = values[values.between(0, 1)]
    classifications[field] = geoespacial_service.classificar_serie(name, field, values, 'jenks', 5)
print(json.dumps(classifications))
`, temporary], { input: JSON.stringify(fixtures), encoding: "utf8" }));
    const rendered = execFileSync(python, ["-X", "utf8", "-c", `
from fastapi.testclient import TestClient
from api.server import app
from api.services.session_service import SessionUser, cookie_name, create_token
client = TestClient(app)
client.cookies.set(cookie_name(), create_token(SessionUser(id='00000000-0000-0000-0000-000000000021', email='teste@example.org', username='teste_admin', nome='Teste', tipo_usuario='ADMIN')))
response = client.get('/restrict/geoespacial/visualizador-camadas/')
assert response.status_code == 200
print(response.text)
`], { encoding: "utf8" });
    const basemapTile = execFileSync(python, ["-c", "from PIL import Image; import io, sys; data=io.BytesIO(); Image.new('RGBA', (256, 256), (230, 235, 230, 255)).save(data, format='PNG'); sys.stdout.buffer.write(data.getvalue())"]);
    const classificationRequests = [];
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/restrict/geoespacial/visualizador-camadas/") {
        res.setHeader("Content-Type", "text/html;charset=utf-8"); res.end(rendered); return;
      }
      const tile = url.pathname.match(/\/storage\/camada\/tiles\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
      if (tile) {
        const layer = layers.find(item => item.arquivo === url.searchParams.get("caminho"));
        const file = path.join(temporary, layer.fixture, tile[1], tile[2], `${tile[3]}.pbf`);
        res.setHeader("Content-Type", "application/vnd.mapbox-vector-tile");
        res.end(fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0)); return;
      }
      if (url.pathname.startsWith("/api/")) {
        let data = [];
        if (url.pathname.endsWith("/bancada-arquivos/preparar") || url.pathname.endsWith("/bancada-arquivos/classificacao")) {
          let body = "";
          for await (const chunk of req) body += chunk;
          const payload = JSON.parse(body);
          if (url.pathname.endsWith("/preparar")) data = { revisao: "original-r1" };
          else { classificationRequests.push(payload); data = classifications[payload.campo]; }
        } else if (url.pathname.endsWith("/storage/navegar")) {
          const current = url.searchParams.get("caminho");
          const next = current === "superficies-indices" ? `${current}/hierarquizacao` : current === "superficies-indices/hierarquizacao" ? folder : null;
          data = { pastas: next ? [{ nome: next.split("/").at(-1), caminho: next }] : [], arquivos: layers.filter(item => item.arquivo.split("/").slice(0, -1).join("/") === current) };
        } else if (url.pathname.endsWith("/contagens")) {
          data = { contagens: { "base-geodatabase": 0, "base-geoespacial": 1, "superficies-indices": 2, "superficies-indices/hierarquizacao": 2, [folder]: 2 } };
        } else if (url.pathname.includes("/cadastro-geometrias/")) data = { itens: [] };
        else if (url.pathname.endsWith("/storage/camada/bounds")) data = { bounds: [-47.45, -23.3, -46.45, -23.1] };
        else if (url.pathname === "/api/auth/session") data = { authenticated: true, user: { nome: "Teste", tipo_usuario: "ADMIN" } };
        res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); return;
      }
      const relative = decodeURIComponent(url.pathname).replace(/^\//, "").replace(/^restrict\/geoespacial\//, "geoespacial/");
      const file = path.resolve(relative);
      if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404); res.end(); return;
      }
      res.setHeader("Content-Type", ({ ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2" })[path.extname(file)] || "application/octet-stream");
      fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
    const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const errors = [];
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    await context.route("https://**/*", route => route.fulfill({ contentType: "image/png", body: basemapTile }));
    await context.addInitScript(ids => {
      for (const id of ids) {
        const key = `slt-map-layer:${id}`;
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ color: "#ff0000", fillColor: "#ff0000", fillMode: "outline", fillOpacity: .15, lineWidth: 8, pointRadius: 5 }));
      }
    }, layers.map(item => item.id));
    const base = `http://127.0.0.1:${server.address().port}/restrict/geoespacial/visualizador-camadas/`;
    const row = layer => page.locator(`.geo-layer-record[data-id="${layer.id}"]`);
    const paint = layer => page.evaluate(id => {
      const info = GeoespacialMap.layers.get(id);
      return GeoespacialMap.map.getPaintProperty(info.mapLayerIds[info.tiled && id.endsWith("municipios") ? 0 : 1], id.endsWith("municipios") ? "fill-color" : "line-color");
    }, layer.id);
    async function waitLayer(layer) {
      try {
        await page.waitForFunction(id => {
          const info = GeoespacialMap.layers.get(id), map = GeoespacialMap.map;
          return info && map.isSourceLoaded(info.sourceId);
        }, layer.id);
      } catch (error) {
        console.error(await page.evaluate(() => ({
          layers: [...GeoespacialMap.layers.keys()],
          loaded: GeoespacialMap.map.loaded(),
          styleLoaded: GeoespacialMap.map.isStyleLoaded(),
          sources: Object.keys(GeoespacialMap.map.getStyle().sources).map(id => [id, GeoespacialMap.map.isSourceLoaded(id)]),
          feedback: document.getElementById("viewer-feedback").textContent,
          details: document.getElementById("geoespacial-details-content").textContent.slice(0, 600),
          folders: [...document.querySelectorAll(".geo-layer-folder")].map(el => [el.dataset.caminho, el.dataset.carregado]),
        })), errors);
        throw error;
      }
    }
    async function verifyPixels(layer, legend) {
      await page.evaluate(count => GeoespacialMap.map.jumpTo({ center: [-47.36 + (count - 1) * .05, -23.2], zoom: 9 }), values[layer.fixture].length);
      await waitLayer(layer);
      const pixels = await page.evaluate(count => new Promise((resolve, reject) => {
        const map = GeoespacialMap.map;
        map.once("render", () => {
          const canvas = map.getCanvas(), gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
          const positions = [...Array.from({ length: count }, (_, i) => [-47.36 + i * .1, -23.2]), [-47.404, -23.2]];
          resolve(positions.map(position => {
            const point = map.project(position), pixel = new Uint8Array(4);
            if (point.x < 0 || point.x >= canvas.clientWidth || point.y < 0 || point.y >= canvas.clientHeight) {
              reject(new Error(`Pixel sample outside the map: ${position}`)); return [];
            }
            gl.readPixels(Math.floor(point.x * canvas.width / canvas.clientWidth), canvas.height - 1 - Math.floor(point.y * canvas.height / canvas.clientHeight), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            return [...pixel].slice(0, 3);
          }));
        });
        map.triggerRepaint();
      }), values[layer.fixture].length);
      assert.notDeepEqual(pixels[9], pixels[10], "distinct upper indices must not collapse into a saturated color");
      assert.notDeepEqual(pixels[11], pixels[12], "distinct lower indices must not collapse into a saturated color");
      const palette = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"].map(color => color.slice(1).match(/../g).map(hex => parseInt(hex, 16)));
      const classification = classifications[layer.campo];
      const bounds = [...new Set([classification.min, ...classification.quebras, classification.max])];
      function expectedColor(value) {
        if (value == null || value < 0 || value > 1) return [156, 163, 175];
        if (value <= bounds[0]) return palette[0];
        if (value >= bounds.at(-1)) return palette.at(-1);
        const next = bounds.findIndex(bound => value < bound);
        const normalized = (next - 1 + (value - bounds[next - 1]) / (bounds[next] - bounds[next - 1])) / (bounds.length - 1);
        const position = normalized * (palette.length - 1), index = Math.floor(position);
        return palette[index].map((channel, i) => Math.round(channel + (position - index) * (palette[index + 1][i] - channel)));
      }
      pixels.slice(0, values[layer.fixture].length).forEach((pixel, i) => {
        const expected = expectedColor(values[layer.fixture][i]);
        assert.ok(pixel.every((value, channel) => Math.abs(value - expected[channel]) <= 3), `${layer.campo}: ${values[layer.fixture][i]} rendered as ${pixel}, expected ${expected}`);
      });
      const validIndices = values[layer.fixture].map((value, i) => ({ value, i })).filter(({ value }) => value != null && value >= 0 && value <= 1);
      assert.ok(new Set(validIndices.map(({ i }) => pixels[i].join(","))).size > palette.length, "render more colors than the five reference colors");
      assert.ok(validIndices.some(({ i }) => !palette.some(color => color.every((value, channel) => Math.abs(value - pixels[i][channel]) <= 3))), "intermediate indices use interpolated colors, not discrete classes");
      const ramp = legend.locator(".geo-legend-ramp");
      const rampGeometry = await ramp.evaluate(element => {
        const box = element.getBoundingClientRect();
        return { height: box.height, offset: box.top - Math.floor(box.top) };
      });
      const rampImage = await ramp.screenshot();
      const legendPixels = JSON.parse(execFileSync(python, ["-c", `
import io, json, sys
from PIL import Image
image = Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB')
positions = json.loads(sys.argv[1])
geometry = json.loads(sys.argv[2])
height = geometry['height'] - 2
offset = geometry['offset'] + 1
samples = []
for value in positions:
    row = max(1, min(image.height - 2, round(offset + (1 - value) * height - .5)))
    samples.append({'pixel': image.getpixel((image.width // 2, row)), 'value': 1 - (row + .5 - offset) / height})
print(json.dumps(samples))
`, JSON.stringify(validIndices.map(({ value }) => value)), JSON.stringify(rampGeometry)], { input: rampImage, encoding: "utf8" }));
      legendPixels.forEach(({ pixel, value }) => {
        const expected = expectedColor(value);
        assert.ok(pixel.every((channel, i) => Math.abs(channel - expected[i]) <= 3), `${layer.campo}: raster legend ${pixel} at ${value} matches the map ramp ${expected}`);
      });
      if (layer.fixture === "territorio") assert.ok(pixels.at(-1).every((value,i) => Math.abs(value-[230,235,230][i]) <= 3), "no polygon border outside the original geometry");
    }
    async function verifyPolygon() {
      const properties = await page.evaluate(id => {
        const info = GeoespacialMap.layers.get(id), map = GeoespacialMap.map;
        return { opacity: map.getPaintProperty(info.mapLayerIds[0], "fill-opacity"),
          antialias: map.getPaintProperty(info.mapLayerIds[0], "fill-antialias"),
          filter: map.getFilter(info.mapLayerIds[1]) };
      }, layers[1].id);
      assert.deepEqual(properties, { opacity: 1, antialias: false, filter: ["==", ["geometry-type"], "LineString"] });
    }

    for (const layer of layers.slice(0, 2)) {
      await page.goto(`${base}?camada=${encodeURIComponent(layer.id)}`);
      await waitLayer(layer);
      const expression = await paint(layer);
      assert.ok(JSON.stringify(expression).includes(`"${layer.campo}"`));
      assert.ok(!JSON.stringify(expression).includes(`"${layer.simples}"`));
      assert.ok(JSON.stringify(expression).includes('"interpolate"'));
      assert.ok(!JSON.stringify(expression).includes('"step"'));
      const legend = page.locator(`.geo-legend-continuous[data-campo="${layer.campo}"]`);
      await legend.waitFor({ state: "visible" });
      await legend.locator(".geo-legend-ramp").waitFor({ state: "visible" });
      assert.match(await legend.textContent(), /1 · Maior.*0,75.*0,5.*0,25.*0 · Menor/s);
      assert.equal(await legend.locator(".geo-legend-class").count(), 0);
      const rampStyle = await legend.locator(".geo-legend-ramp").getAttribute("style");
      assert.match(rampStyle, /linear-gradient\(0deg/);
      const legendStops = [...rampStyle.matchAll(/(#[0-9a-f]{6}) ([0-9.e+-]+)%/g)].map(match => [Number(match[2]) / 100, match[1]]);
      const mapStops = expression[4].slice(3);
      assert.equal(legendStops.length * 2, mapStops.length);
      legendStops.forEach(([value, color], i) => {
        assert.ok(Math.abs(value - mapStops[i * 2]) <= 1e-12);
        assert.equal(color, mapStops[i * 2 + 1]);
      });
      const rampBox = await legend.locator(".geo-legend-ramp").boundingBox();
      assert.ok(rampBox.height > rampBox.width * 4, "vertical raster-style color bar");
      if (layer.fixture === "territorio") await verifyPolygon();
      await verifyPixels(layer, legend);
      await row(layer).locator("input[type=checkbox]").uncheck();
      await legend.waitFor({ state: "detached" });
      await row(layer).locator("input[type=checkbox]").check();
      assert.deepEqual(await paint(layer), expression);
      await row(layer).locator(".layer-group-header").click();
      await row(layer).locator(".geo-layer-tree-symbol").click();
      const form = page.locator(".geo-properties-form");
      assert.equal(await form.locator('[name="color"]').isDisabled(), true);
      if (layer.fixture === "territorio") {
        assert.equal(await form.locator('[name="fillOpacity"]').inputValue(), "1");
        assert.equal(await form.locator('[name="fillOpacity"]').isDisabled(), true);
      }
      await form.locator('[name="alias"]').fill(`Índice ${layer.fixture}`);
      await form.locator('[name="lineWidth"]').fill("7");
      await form.locator('[type="submit"]').click();
      await page.waitForFunction(() => document.querySelector(".geo-properties-feedback").textContent === "Propriedades salvas e aplicadas.");
      assert.deepEqual(await paint(layer), expression);
      if (layer.fixture === "territorio") await verifyPolygon();
      const previousTile = await page.evaluate(id => GeoespacialMap.map.getSource(GeoespacialMap.layers.get(id).sourceId).tiles[0], layer.id);
      await row(layer).locator(".layer-reload-btn").click();
      await page.waitForFunction(({ id, previousTile }) => {
        const info = GeoespacialMap.layers.get(id);
        const tile = info && GeoespacialMap.map.getSource(info.sourceId)?.tiles?.[0];
        return tile && tile !== previousTile;
      }, { id: layer.id, previousTile });
      await waitLayer(layer);
      assert.deepEqual(await paint(layer), expression);
      await page.reload(); await waitLayer(layer);
      assert.deepEqual(await paint(layer), expression);
      assert.match(await row(layer).locator(".layer-group-name").textContent(), /Índice/);
      await page.locator("#viewer-refresh").click();
      await page.waitForFunction(() => document.getElementById("viewer-refresh-status").textContent === "Camadas atualizadas.");
      await waitLayer(layer);
      assert.deepEqual(await paint(layer), expression);
      if (layer.fixture === "territorio") await verifyPolygon();
    }
    await row(layers[0]).locator("input[type=checkbox]").check();
    await page.waitForFunction(() => document.querySelectorAll(".geo-legend-continuous .geo-legend-ramp").length === 2);
    assert.equal(await page.locator(".geo-legend-continuous").count(), 2);
    assert.notDeepEqual(classifications.fav_rede_dim.quebras, classifications.fav_territorial_dim.quebras);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator(".geo-context-panel").evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    await page.setViewportSize({ width: 1400, height: 950 });
    await page.goto(`${base}?camada=${encodeURIComponent(layers[2].id)}`);
    await waitLayer(layers[2]);
    assert.equal(await page.locator(".geo-legend-continuous").count(), 0);
    assert.ok(!JSON.stringify(await paint(layers[2])).includes("fav_rede_dim"));
    const previousClassifications = classificationRequests.length;
    await page.goto(`${base}?camada=${encodeURIComponent(layers[3].id)}`);
    await waitLayer(layers[3]);
    await page.locator('.geo-legend-categories[data-campo="fav_rede_classe"]').waitFor();
    assert.equal(await page.locator('.geo-legend-categories .geo-legend-item').count(), 6);
    assert.equal(classificationRequests.length, previousClassifications, 'Stored classes must not be recalculated');
    const categorical = await page.evaluate(id => {
      const info = GeoespacialMap.layers.get(id), map = GeoespacialMap.map;
      return {color:map.getPaintProperty(info.mapLayerIds[0],'fill-color'),opacity:map.getPaintProperty(info.mapLayerIds[0],'fill-opacity')};
    }, layers[3].id);
    assert.equal(categorical.color[0], 'match');
    assert.ok(JSON.stringify(categorical.color).includes('fav_rede_classe'));
    assert.equal(categorical.opacity,1);
    await page.evaluate(() => GeoespacialMap.map.jumpTo({center:[-47.06,-23.2],zoom:9}));
    await waitLayer(layers[3]);
    const categoryPixels = await page.evaluate(() => new Promise(resolve => {
      const map = GeoespacialMap.map;
      map.once('render', () => {
        const canvas=map.getCanvas(),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
        resolve(Array.from({length:7},(_,i)=>{
          const p=map.project([-47.36+i*.1,-23.2]), rgba=new Uint8Array(4);
          gl.readPixels(Math.floor(p.x*canvas.width/canvas.clientWidth),canvas.height-1-Math.floor(p.y*canvas.height/canvas.clientHeight),1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
          return [...rgba].slice(0,3);
        }));
      });
      map.triggerRepaint();
    }));
    ['440154','3b528b','21918c','5ec962','fde725','808080','808080'].forEach((hex,i) => {
      const expected=hex.match(/../g).map(v=>parseInt(v,16));
      assert.ok(expected.every((v,c)=>Math.abs(v-categoryPixels[i][c])<=3), `Category ${i}: ${categoryPixels[i]}`);
    });
    await page.reload(); await waitLayer(layers[3]);
    await page.locator('.geo-legend-categories[data-campo="fav_rede_classe"]').waitFor();
    assert.ok(classificationRequests.every(payload => payload.metodo === "jenks" && payload.classes === 5 &&
      payload.revisao === "original-r1" && JSON.stringify(payload.dominio) === "[0,1]"));
    await page.route("**/bancada-arquivos/classificacao", route => route.fulfill({
      contentType: "application/json", body: JSON.stringify({ metodo: "jenks", campo: "fav_rede_dim", classes: 5, quebras: [.2, .2, .5, .7] }),
    }), { times: 1 });
    await page.goto(`${base}?camada=${encodeURIComponent(layers[0].id)}`);
    await page.locator('#geoespacial-details-content [role="alert"]').waitFor({ state: "visible" });
    assert.match(await page.locator('#geoespacial-details-content [role="alert"]').textContent(), /limites inválidos/);
    assert.equal(await row(layers[0]).locator("input[type=checkbox]").isChecked(), false);
    const fresh = await browser.newPage();
    await fresh.route("https://**/*", route => route.fulfill({ contentType: "image/png", body: basemapTile }));
    await fresh.goto(`${base}?camada=${encodeURIComponent(layers[0].id)}`);
    await fresh.waitForFunction(id => {
      const info = GeoespacialMap.layers.get(id);
      return info && GeoespacialMap.map.isSourceLoaded(info.sourceId);
    }, layers[0].id);
    assert.equal(await fresh.evaluate(id => localStorage.getItem(`slt-map-layer:${id}`), layers[0].id), null);
    await fresh.locator('.geo-legend-continuous[data-campo="fav_rede_dim"] .geo-legend-ramp').waitFor({ state: "visible" });
    await fresh.close();
    assert.deepEqual(errors, []);
    console.log("PASS: existing continuous ramps preserved; network polygons use stored classes with matching rendered colors, null/unknown fallback, legend and reload persistence; mobile and unrelated-layer isolation");
  } finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    fs.rmSync(temporary, { recursive: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
