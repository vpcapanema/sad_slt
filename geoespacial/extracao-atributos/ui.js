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
// A faixa fica sobre o conteúdo (sticky) e tapava o botão Executar: soma um botão
// de fechar e se apaga sozinha, para a mensagem não virar obstáculo.
let _feedbackTimer = null;
export function feedback(message) {
  const faixa = $("#ea-feedback");
  faixa.replaceChildren();
  clearTimeout(_feedbackTimer);
  if (!message) return;
  const texto = el("span", message, "ea-feedback-texto");
  const fechar = el("button", "×", "ea-feedback-fechar");
  fechar.type = "button";
  fechar.title = "Fechar mensagem";
  fechar.setAttribute("aria-label", "Fechar mensagem");
  fechar.addEventListener("click", () => feedback(""));
  faixa.append(texto, fechar);
  _feedbackTimer = setTimeout(() => feedback(""), 12000);
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
