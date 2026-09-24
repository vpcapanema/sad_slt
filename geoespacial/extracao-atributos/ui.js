export const $ = (selector) => document.querySelector(selector);
export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function options(select, items, placeholder, selected = "") {
  select.replaceChildren(new Option(placeholder, ""), ...items.map(item => new Option(item.nome, item.id)));
  select.value = selected;
}
export function numero(value, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-BR", { maximumFractionDigits: digits }) : "—";
}
// Todos os módulos usam o mesmo componente, inclusive dentro de formulários.
export function feedback(message, type='info') {
  if (message) window.SLTFeedback.notify(type,message,
    location.pathname.includes('gerador-camadas-territoriais')?'Camadas territoriais':'Extração de atributos');
}
export function atributos(properties) {
  const list = el("dl");
  for (const [key, value] of Object.entries(properties || {})) {
    list.append(el("dt", key), el("dd", value == null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)));
  }
  return list;
}

// O esquema completo inclui campos ausentes ou nulos na primeira feição.
export function camposCamada(camada) {
  return [...new Set([...(camada?.campos||[]).map(c=>typeof c==='string'?c:c.nome),
    ...(camada?.geojson?.features||[]).flatMap(f=>Object.keys(f.properties||{}))])].filter(Boolean);
}
