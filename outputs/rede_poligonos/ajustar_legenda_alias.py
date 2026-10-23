from pathlib import Path
p = Path('geoespacial/geoespacial-visualizador-camadas.js')
t = p.read_text(encoding='utf-8')
old = 'row.querySelector(".layer-group-name").textContent = props.alias;'
assert old in t
t = t.replace(old, old+' row.querySelector(".layer-group-name").title = props.alias;')
old = '<span class="layer-group-name">${escapeHtml(displayName(camada))}</span>'
assert old in t
t = t.replace(old, '<span class="layer-group-name" title="${escapeHtml(displayName(camada))}">${escapeHtml(displayName(camada))}</span>')
old = '<span class="layer-group-name">${escapeHtml(item.name)}</span>'
assert old in t
t = t.replace(old, '<span class="layer-group-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>')
old = '<span class="geo-legend-missing"><span style="background:${FAVORABILIDADE_SEM_DADO}" aria-hidden="true"></span>Sem dado ou fora de 0–1</span>'
assert old in t
t = t.replace(old, '')
p.write_text(t,encoding='utf-8')
