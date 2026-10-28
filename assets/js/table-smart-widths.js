/* Content-aware table widths. Keep selectors fixed and never truncate headings. */
(function () {
  'use strict';
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
  const selector = 'main table.admin-table, main table.ami-matrix';
  const set = (node, property, value) => node.style.setProperty(property, value, 'important');
  function measure(text, cell) {
    const css = getComputedStyle(cell);
    context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    return context.measureText(css.textTransform === 'uppercase' ? text.toLocaleUpperCase('pt-BR') : text).width;
  }
  function fit(table) {
    if (!table.getBoundingClientRect().width || !table.tHead?.rows.length) return;
    const headers = window.SLTTable?.headers ? SLTTable.headers(table) : [...table.tHead.rows[0].cells];
    if (headers.some(h => h.colSpan !== 1)) return;
    const prioritizeDemand = table.dataset.rankingOrder === 'true' || table.classList.contains('fase3-sintese-table');
    const rows = [...table.tBodies].flatMap(body => [...body.rows]).filter(row => row.cells.length === headers.length && [...row.cells].every(c => c.colSpan === 1));
    const specifications = headers.map((header, index) => {
      if (header.hidden) return {preferred:0, compact:0, hidden:true};
      const selected = index === 0 && header.querySelector('input[type=checkbox]');
      if (selected) return {preferred:44, compact:44};
      let label = header.querySelector(':scope > .smart-column-title');
      if (!label) {
        label = document.createElement('span'); label.className = 'smart-column-title';
        const nodes = [...header.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('input, .table-sort-indicator, .sort-indicator')));
        label.append(...nodes); header.prepend(label);
      }
      const title = label.textContent.replace(/\s+/g,' ').trim(), full = measure(title, header);
      let titleWidth = full;
      if (title.length > 10) {
        const words = title.split(/\s+/);
        titleWidth = words.length > 1 ? Math.min(...words.slice(1).map((_, i) => Math.max(measure(words.slice(0, i+1).join(' '), header), measure(words.slice(i+1).join(' '), header)))) : full;
      }
      const compactAttributes = table.dataset.compactAttributes === 'true';
      const content = rows.reduce((max, row) => {
        const cell = row.cells[index];
        const primary = compactAttributes ? cell.querySelector('.atributo-valor-normalizado, .objeto-codigo') : null;
        return Math.max(max, measure((primary || cell).textContent.trim(), cell));
      }, 0);
      const dataWidth = prioritizeDemand ? content + 24 : Math.min(compactAttributes && index > 1 ? 160 : 320, content + 24);
      return {preferred:Math.ceil(Math.max(76,full+32,dataWidth)), compact:Math.ceil(Math.max(76,titleWidth+32,dataWidth)), title, full, label};
    });
    if (prioritizeDemand) {
      const host = table.closest('.ami-report-table');
      if (host) host.style.removeProperty('width');
    }
    // Collapsed outer borders still take space beyond the sum of cell widths.
    // Reserve that space before distributing columns to avoid a 1px overflow.
    const tableStyle = getComputedStyle(table);
    const borderAllowance = tableStyle.borderCollapse === 'collapse'
      ? Math.max(1, parseFloat(tableStyle.borderLeftWidth) || 0, parseFloat(tableStyle.borderRightWidth) || 0) : 0;
    const available = Math.max(0, table.parentElement.clientWidth - borderAllowance);
    const compactAttributes = table.dataset.compactAttributes === 'true';
    const fits = prioritizeDemand || (!compactAttributes && specifications.reduce((sum,s)=>sum+s.preferred,0)<=available);
    const widths = specifications.map(s=>fits?s.preferred:s.compact);
    const initialTotal = widths.reduce((a,b) => a+b, 0), flexible = widths.filter((_,i) => !specifications[i].hidden && !(i === 0 && headers[i].querySelector('input[type=checkbox]'))).length;
    const spare = Math.max(0, available-initialTotal) / Math.max(1, flexible);
    // Distribute spare room in proportion to content width, capping each
    // weight so a long demand name cannot absorb most of the free space.
    const weights = specifications.map((spec, i) => spec.label && !spec.hidden ? Math.min(widths[i], 160) : 0);
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    widths.forEach((width,i)=>{
      const spec=specifications[i];
      if(!spec.label)return; // Selectors remain exactly 44px.
      widths[i]=width+(prioritizeDemand ? Math.max(0, available-initialTotal) * weights[i] / Math.max(1, weightTotal) : compactAttributes ? (i === 1 ? spare * flexible : 0) : spare);
      const missing=spec.full+32-widths[i];
      const tolerance=Math.max(measure(spec.title.slice(-3),headers[i]),spec.full/Math.max(1,spec.title.length)*3);
      if(missing>0 && missing<=tolerance)widths[i]=Math.ceil(spec.full+32);
    });
    const total=widths.reduce((a,b)=>a+b,0), extra=0;
    headers.forEach((header, i) => {
      if (specifications[i].hidden) return;
      const selected = i === 0 && header.querySelector('input[type=checkbox]');
      const width = widths[i] + (selected ? 0 : extra);
      if (!selected) {
        const {label,title,full}=specifications[i], room=width-32;
        const lines=[];
        const adaptiveTitle = compactAttributes && header.classList.contains('col-atributo');
        if (adaptiveTitle) {
          const words = title.split(/\s+/);
          let best = full, split = 0;
          for (let k = 1; k < words.length; k++) {
            const widest = Math.max(measure(words.slice(0, k).join(' '), header), measure(words.slice(k).join(' '), header));
            if (widest < best) { best = widest; split = k; }
          }
          if (split) lines.push(words.slice(0, split).join(' '), words.slice(split).join(' '));
          else lines.push(title);
          const baseSize = parseFloat(getComputedStyle(header).fontSize);
          set(label, 'font-size', Math.max(1, Math.min(13, baseSize * Math.max(1, room - 2) / Math.max(1, best))) + 'px');
          set(label, 'line-height', '1.15');
        } else if(title.length>10 && full>room){
          const words=title.split(/\s+/);
          let split=1,best=Infinity;
          for(let k=1;k<words.length;k++){const a=measure(words.slice(0,k).join(' '),header),b=measure(words.slice(k).join(' '),header);if(Math.max(a,b)<best){best=Math.max(a,b);split=k;}}
          if(words.length>1 && best<=room){lines.push(words.slice(0,split).join(' '),words.slice(split).join(' '));}
          else lines.push(title);
        } else lines.push(title);
        label.replaceChildren(...lines.map((text,index)=>{const paragraph=document.createElement('span');paragraph.style.display='block';paragraph.textContent=text+(index<lines.length-1?' ':'');return paragraph;}));
        label.style.display='inline-block';label.style.maxWidth='100%';label.style.textAlign=lines.length>1?'justify':'center';
        set(label,'white-space','normal');set(label,'overflow-wrap','normal');
        [...label.children].forEach(line => { set(line, 'white-space', 'nowrap'); });
        if (adaptiveTitle) {
          label.style.textAlign = 'center';
          [...label.children].forEach(line => { line.style.whiteSpace = 'nowrap'; });
        }
      }
      for (const cell of [header, ...rows.map(row=>row.cells[i])]) {
        set(cell,'width', width+'px'); set(cell,'min-width','0'); set(cell,'max-width','none');
        set(cell,'box-sizing','border-box');
      }
      set(header,'white-space','normal'); set(header,'overflow','visible'); set(header,'text-overflow','clip');
      set(header,'overflow-wrap','normal'); set(header,'height','32px'); set(header,'min-height','32px');
      set(header,'padding-top','8px'); set(header,'padding-bottom','8px');
    });
    if(table.dataset.groupedHeaders==='true'){
      let columns=table.querySelector('colgroup[data-smart-columns]');
      if(!columns){columns=document.createElement('colgroup');columns.dataset.smartColumns='true';table.prepend(columns);}
      columns.replaceChildren(...widths.map((width,i)=>{const col=document.createElement('col');col.style.width=(width+(i===0&&headers[i].querySelector('input')?0:extra))+'px';return col;}));
      table.querySelectorAll('thead th[colspan]').forEach(h=>{set(h,'white-space','normal');set(h,'overflow','visible');set(h,'text-overflow','clip');});
    }
    set(table,'table-layout','fixed'); set(table,'width',Math.max(total,available)+'px'); set(table,'min-width','0'); set(table,'max-width','none');
    table.dataset.smartWidths = 'true';
    table.parentElement.style.overflowX = table.parentElement.scrollWidth > table.parentElement.clientWidth ? 'auto' : 'hidden';
  }
  let scheduled = false;
  const observer = new MutationObserver(schedule);
  function schedule() {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false; observer.disconnect();
      document.querySelectorAll(selector).forEach(fit);
      document.querySelectorAll('[data-equal-table-height]').forEach(group=>{
        const tables=[...group.querySelectorAll('table')];
        tables.forEach(table=>set(table,'height','auto'));
        if(tables.length<2 || !tables[0].getBoundingClientRect().width)return;
        // Keep stacked tables natural on mobile; synchronize side-by-side tables.
        if(Math.abs(tables[0].getBoundingClientRect().left-tables[1].getBoundingClientRect().left)<1)return;
        const height=Math.max(...tables.map(table=>table.getBoundingClientRect().height));
        tables.forEach(table=>set(table,'height',height+'px'));
      });
      observer.observe(document.querySelector('main') || document.body, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class','hidden']});
    });
  }
  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('resize', schedule);
  document.fonts.ready.then(schedule);
  window.SLTTableFit = schedule;
})();
