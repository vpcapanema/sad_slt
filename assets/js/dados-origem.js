/* Read-only presentation of the original imported record. */
(function (global) {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
  const metadataLabels = {arquivo:'Arquivo de origem', versao_estrutura:'Versão da estrutura'};
  const sourceLabels = {
    COD_pSICARD: 'Código no pSICARD',
    COD_rede: 'Código da rede',
    'Código do D14': 'Código no D14',
    'Identificador da ficha (.docx)': 'Código da ficha de origem',
    Nome: 'Nome na fonte de origem',
    Programa: 'Programa na fonte de origem',
  };
  function fields(origin) {
    if (!origin || typeof origin !== 'object' || Array.isArray(origin)) return [];
    const result = [];
    function visit(value, path, labels) {
      if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) {
        Object.entries(value).forEach(([key, child]) => visit(child, [...path,key], [...labels,key]));
      } else result.push({key:JSON.stringify(path), path, label:labels.join(' / ')});
    }
    Object.entries(origin).forEach(([key,value]) => {
      visit(value, [key], key === 'campos' && value && typeof value === 'object' && !Array.isArray(value)
        ? [] : [metadataLabels[key] || sourceLabels[key] || key]);
    });
    return result.map(field => ({...field, label: sourceLabels[field.label] || field.label}));
  }
  function value(origin, field) {
    let current = origin;
    for (const key of field.path) {
      if (!current || typeof current !== 'object' || !Object.hasOwn(current,key)) return undefined;
      current = current[key];
    }
    return current;
  }
  function text(value) {
    if (value === undefined || value === null || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
  function columns(rows) {
    const unique = new Map();
    rows.forEach(row => fields(row.dados_origem).forEach(field => unique.set(field.key,field)));
    return [...unique.values()].sort((a,b) => {
      const metadata = Number(a.path[0] !== 'campos') - Number(b.path[0] !== 'campos');
      return metadata || a.label.localeCompare(b.label,'pt-BR');
    });
  }
  function details(origin) {
    const entries = columns([{dados_origem:origin}]);
    if (!entries.length) return '';
    return `<details class="painel-hierarquizacao-resultados dados-origem-details" open>
      <summary>Dados de origem</summary><dl>${entries.map(field =>
        `<dt>${escape(field.label)}</dt><dd>${escape(text(value(origin,field)))}</dd>`
      ).join('')}</dl></details>`;
  }
  global.SLTDadosOrigem = {fields, value, text, columns, details, escape};
})(window);
