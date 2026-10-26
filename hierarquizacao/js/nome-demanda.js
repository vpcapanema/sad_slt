// Rótulo de apresentação: preserva o cadastro e não acrescenta identificadores.
export function tituloDemanda(nome) {
  const conectivos = new Set(['a','as','o','os','e','de','da','das','do','dos','em','na','nas','no','nos','para','por','com']);
  return String(nome || '').trim().toLocaleLowerCase('pt-BR').replace(/\p{L}[\p{L}\p{M}]*/gu,
    (palavra, posicao) => posicao > 0 && conectivos.has(palavra)
      ? palavra : palavra[0].toLocaleUpperCase('pt-BR') + palavra.slice(1));
}

export function nomeDemanda(linha) {
  const original = String(linha.nome || linha.demandaNome || '').trim();
  if (!original) return 'Demanda sem nome';
  const semColchetes = original.replace(/\s*[-–—]\s*\[[^\]]*\]\s*$/, '').trim();
  const municipios = (linha.sobreposicoes || linha.itens || [])
    .filter(item => !item.papel || item.papel === 'grade')
    .map(item => item.nome?.trim()).filter(Boolean);
  // Retira apenas um sufixo composto pelos municípios conhecidos da demanda.
  for (const separador of semColchetes.matchAll(/\s+[-–—]\s+/g)) {
    let sufixo = semColchetes.slice(separador.index + separador[0].length);
    for (const municipio of [...new Set(municipios)].sort((a,b) => b.length-a.length)) {
      sufixo = sufixo.replaceAll(municipio, '');
    }
    if (municipios.length && /^[\s,;/]*(?:e[\s,;/]*)?$/.test(sufixo)) {
      return tituloDemanda(semColchetes.slice(0, separador.index).trim());
    }
  }
  return tituloDemanda(semColchetes);
}
