// Convenção decimal e precisão do painel geoespacial-storage-arvore.
export function tamanhoLegivel(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return 'Indisponível';
  const unidades = ['B', 'kB', 'MB', 'GB'];
  const indice = Math.min(unidades.length - 1, bytes > 0 ? Math.floor(Math.log10(bytes) / 3) : 0);
  return `${(bytes / 1000 ** indice).toLocaleString('pt-BR', {maximumFractionDigits: indice ? 1 : 0})} ${unidades[indice]}`;
}

export function modificacaoLegivel(valor) {
  if (valor == null || valor === '' || (typeof valor === 'number' && valor <= 0)) return 'Indisponível';
  const data = new Date(typeof valor === 'number' ? valor * 1000 : valor);
  if (!Number.isFinite(data.getTime())) return 'Indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(data).replace(', ', ' ');
}
