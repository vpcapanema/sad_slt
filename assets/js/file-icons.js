/* Contrato visual de arquivos: ver docs/geoespacial/contrato-icones-arquivos.md. */
(function(global){
  'use strict';
  const COLORS=Object.freeze({
  "GEOJSON": "#16A085",
  "JSON": "#8E44AD",
  "SHP": "#28699C",
  "SHX": "#347CAF",
  "DBF": "#487985",
  "PRJ": "#687B8C",
  "CPG": "#748E99",
  "FGB": "#0097A7",
  "KML": "#E53935",
  "KMZ": "#C62828",
  "TIF": "#F2B321",
  "TIFF": "#D99A17",
  "IMG": "#E67E22",
  "ZIP": "#485865",
  "7Z": "#596B7A",
  "RAR": "#9B59B6",
  "TAR": "#7D6E63",
  "GZ": "#6C7A89",
  "CSV": "#27AE60",
  "XLS": "#217346",
  "XLSX": "#185C37",
  "PDF": "#E91E63",
  "TXT": "#607D8B",
  "XML": "#795548",
  "PNG": "#26A69A",
  "JPG": "#EF6C00",
  "JPEG": "#E65100",
  "WEBP": "#00897B",
  "SVG": "#673AB7",
  "GDB": "#3F51B5",
  "SQL": "#455A64"
});
  const DEFAULT_COLOR='#485865';
  const normalize=value=>String(value??'').trim().replace(/^\./,'').toUpperCase();
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(value){
    const extension=normalize(value);
    if(extension==='GPKG')return '<img class="geo-explorer-file-icon" src="/assets/img/file-types/geopackage.png" alt="" aria-hidden="true">';
    const color=COLORS[extension]||DEFAULT_COLOR;
    const label=extension||'ARQ';
    const fontSize=label.length>5?7.5:label.length>3?9:11;
    return `<svg class="geo-explorer-file-icon" viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-extension="${escape(extension)}" data-color="${color}">
      <path d="M12 3h30l10 11v56a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3Z" fill="white" stroke="${color}" stroke-width="2"/>
      <path d="M42 3v12h10" fill="${color}" stroke="${color}" stroke-width="1.5"/>
      <path d="M17 10h19M17 15h19M17 21h30M17 26h30M17 31h30M17 36h30M17 41h30M17 46h30" fill="none" stroke="${color}" stroke-width="1.5"/>
      <path d="M7 61l5 6v-6m40 0v6l5-6" fill="${color}"/><path d="M7 61l5 6v-6m40 0v6l5-6" fill="black" opacity=".25"/>
      <rect x="5" y="48" width="54" height="19" rx="1.5" fill="${color}" stroke="${color}" stroke-width="2"/>
      <path d="M6 66h52" stroke="black" stroke-opacity=".2" stroke-width="2"/>
      <text x="32" y="61.5" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing=".4"${label.length>7?' textLength="46" lengthAdjust="spacingAndGlyphs"':''}>${escape(label)}</text>
    </svg>`;
  }
  global.SLTFileIcons=Object.freeze({colors:COLORS,defaultColor:DEFAULT_COLOR,normalize,render});
})(window);
