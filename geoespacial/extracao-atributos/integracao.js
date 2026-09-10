// Ponto único para conectar o catálogo, os jobs GDAL/OGR e as exportações.
// Não há URLs presumidas nem processamento espacial no navegador.
let adapter = null;
export function conectarIntegracao(value) {
  adapter = value;
  window.dispatchEvent(new CustomEvent("extracao:integracao"));
}
export function disponivel(method) { return typeof adapter?.[method] === "function"; }
export async function chamar(method, ...args) {
  if (!disponivel(method)) throw new Error("Esta função aguarda integração com o serviço de processamento.");
  return adapter[method](...args);
}
