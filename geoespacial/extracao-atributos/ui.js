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
// Todos os módulos usam o Notify oficial (SIGMA-PLI). Aviso e erro pedem ação
// para fechar; sucesso e informação somem sozinhos em 7 s.
export function feedback(message, type='info') {
  if (!message) return;
  const titulo=location.pathname.includes('gerador-camadas-territoriais')?'Camadas territoriais':'Extração de atributos';
  const tipo=['success','error','warning','info'].includes(type)?type:'info';
  window.Notify?.[tipo](titulo,message,tipo==='error'||tipo==='warning'?{}:{duration:7000});
}
/** Campo obrigatório ou inválido: aviso do Notify, campo marcado e foco nele. */
export function exigirCampo(campo, message) {
  feedback(message, 'warning');
  if (!campo) return;
  campo.setAttribute('aria-invalid', 'true');
  const limpar = () => { campo.removeAttribute('aria-invalid'); campo.removeEventListener('input', limpar); campo.removeEventListener('change', limpar); };
  campo.addEventListener('input', limpar); campo.addEventListener('change', limpar);
  campo.focus();
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
