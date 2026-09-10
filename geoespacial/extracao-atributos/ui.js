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
export function feedback(message) { $("#ea-feedback").textContent = message; }
export function atributos(properties) {
  const list = el("dl");
  for (const [key, value] of Object.entries(properties || {})) {
    list.append(el("dt", key), el("dd", value == null ? "—" : typeof value === "object" ? JSON.stringify(value) : String(value)));
  }
  return list;
}
