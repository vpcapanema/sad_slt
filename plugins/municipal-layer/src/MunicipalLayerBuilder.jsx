import { useEffect, useMemo, useRef, useState } from 'react';
import './style.css';

export function createLayerClient(baseUrl = '/api') {
  async function request(path, payload, signal) {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${path}`, {
      ...(payload ? { method: 'POST', headers: {'Content-Type':'application/json'}, body:JSON.stringify(payload) } : {}), signal
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || `Erro HTTP ${response.status}`);
    }
    return path === 'export' ? response.blob() : response.json();
  }
  return { catalog: signal => request('catalog', null, signal), preview: (config, signal) => request('preview', config, signal), export: (config, signal) => request('export', config, signal) };
}

const THEME_LABEL = {
  '01_populacao':'População', '02_cor_raca':'Cor ou raça', '03_domicilios':'Domicílios',
  '04_saneamento':'Saneamento', '05_educacao':'Educação', '06_renda':'Renda',
  '07_trabalho':'Trabalho', '08_habitacao_internet':'Habitação e internet',
  '09_entorno_urbano':'Entorno urbano', '10_indigenas':'Indígenas', '11_quilombolas':'Quilombolas',
  '12_deficiencia_autismo':'Deficiência e autismo', '13_migracao':'Migração',
  '14_familias_fecundidade':'Famílias e fecundidade', '15_religiao':'Religião',
  '16_deslocamentos':'Deslocamentos', '17_favelas':'Favelas e comunidades urbanas',
  '18_registro_obitos':'Registro de óbitos', desenvolvimento_humano:'Desenvolvimento humano',
  desenvolvimento_municipal:'Desenvolvimento municipal', economia:'Economia',
  empresas_emprego:'Empresas e emprego', financas_publicas:'Finanças públicas',
  ideb:'IDEB', idh:'IDH', pobreza_desigualdade:'Pobreza e desigualdade',
};
const themeLabel = value => {
  if (THEME_LABEL[value]) return THEME_LABEL[value];
  const t = String(value).replace(/^\d+_/, '').replaceAll('_', ' ');
  return t.charAt(0).toLocaleUpperCase('pt-BR') + t.slice(1);
};
/** "Sexo: Homens | Idade: Total" -> {Sexo:'Homens', Idade:'Total'}: base dos filtros dinâmicos. */
function readFacets(attribute) {
  let categories = '';
  try { categories = JSON.parse(attribute.detail).categorias || ''; } catch { categories = ''; }
  const facets = {};
  for (const part of String(categories).split('|')) {
    const cut = part.indexOf(':');
    if (cut < 1) continue;
    const dimension = part.slice(0, cut).trim(), value = part.slice(cut + 1).trim();
    if (dimension && value) facets[dimension] = value;
  }
  return facets;
}
const limits = {fgb:6500, gpkg:1900, shp:250};

/** onExport({blob, filename, configuration, attributes}); download=false lets the host own delivery. */
export function MunicipalLayerBuilder({apiBaseUrl='/api', client, value, onChange, onExport, download=true, className='', categoriaNome=''}) {
  const api = useMemo(() => client || createLayerClient(apiBaseUrl), [client,apiBaseUrl]);
  const [catalog,setCatalog] = useState(null);
  const [local,setLocal] = useState({attributes:[],format:'fgb'});
  const config = value ?? local;
  const [source,setSource] = useState('');
  const [year,setYear] = useState('2022');
  const [theme,setTheme] = useState('');
  const [search,setSearch] = useState('');
  const [facets,setFacets] = useState({});
  const [page,setPage] = useState(0);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('');
  const [preview,setPreview] = useState(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current=true; const ctrl=new AbortController(); setCatalog(null); setError('');
    api.catalog(ctrl.signal).then(data => {setCatalog(data);setSource(data.attributes.find(a=>a.source==='IBGE · Censo 2022')?.source || data.attributes[0]?.source || '');}).catch(e=> {if(e.name!=='AbortError')setError(e.message);});
    return () => {mounted.current=false;ctrl.abort();};
  }, [api]);
  function update(next) {if(value === undefined)setLocal(next);onChange?.(next);setStatus('');}
  const attributes = catalog?.attributes || [];
  const sources = [...new Set(attributes.map(a=>a.source))];
  const years = [...new Set(attributes.filter(a=>a.source===source).map(a=>a.year))].sort((a,b)=>b-a);
  const activeYear = years.includes(Number(year)) ? Number(year) : years[0];
  const available = attributes.filter(a=>a.source===source && a.year===activeYear);
  const themes = [...new Set(available.map(a=>a.theme))];
  const selected = new Set(config.attributes);
  // Espelha a regra do servidor: categoria, fonte majoritaria da selecao e data.
  const nomePadrao = useMemo(() => {
    const escolhidos = attributes.filter(a=>selected.has(a.id));
    if (!escolhidos.length) return 'Categoria — fonte majoritária — data da geração';
    const contagem = new Map();
    for (const a of escolhidos) contagem.set(a.source, (contagem.get(a.source) || 0) + 1);
    const fonte = [...contagem.entries()].sort((x,y)=>y[1]-x[1])[0][0];
    return `${categoriaNome || 'Categoria'} — ${fonte} — ${new Date().toLocaleDateString('en-CA')}`;
  }, [attributes, config.attributes, categoriaNome]);
  const selectedItems = attributes.filter(a=>selected.has(a.id));
  const facetsById = useMemo(()=>new Map(attributes.map(a=>[a.id,readFacets(a)])),[attributes]);
  const scoped = available.filter(a=>(!theme || a.theme===theme) && `${a.label} ${a.field} ${a.unit}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  // Cada dimensão lista os valores que sobram depois das outras dimensões já escolhidas.
  const matchesFacets = (a,skip) => Object.entries(facets).every(([k,v]) => !v || k===skip || facetsById.get(a.id)?.[k]===v);
  const dimensions = (() => {
    // Sem tema escolhido, as dimensões viriam de temas distintos e não filtrariam nada de útil.
    if (!theme) return [];
    const map = new Map();
    for (const a of scoped) for (const [k,v] of Object.entries(facetsById.get(a.id) || {})) {
      if (!map.has(k)) map.set(k, new Set());
      if (matchesFacets(a,k)) map.get(k).add(v);
    }
    return [...map]
      .map(([k,values]) => [k,[...values].sort((x,y)=>x.localeCompare(y,'pt-BR',{numeric:true}))])
      .filter(([k,values]) => values.length > 1 || facets[k])
      .sort((x,y)=>x[0].localeCompare(y[0],'pt-BR'));
  })();
  const filtered = scoped.filter(a=>matchesFacets(a,null));
  const visible = filtered.slice(page*40,page*40+40);
  useEffect(()=>{setPage(0);},[source,year,theme,search,facets]);
  useEffect(()=>{setFacets({});},[source,year,theme]);
  // So atributos e formato mudam a previa. Depender de config inteiro fazia o
  // nome da camada apagar a previa e refazer a consulta a cada tecla digitada.
  const chaveDaPrevia = `${config.format}|${[...config.attributes].join(',')}`;
  useEffect(()=>{
    setPreview(null);
    if(!config.attributes.length)return;
    const ctrl=new AbortController();
    const pedido={attributes:config.attributes,format:config.format};
    const timer=setTimeout(()=>api.preview(pedido,ctrl.signal).then(setPreview).catch(e=>{if(e.name!=='AbortError')setError(e.message);}),250);
    return ()=>{clearTimeout(timer);ctrl.abort();};
  },[api,chaveDaPrevia]);
  function toggle(id) {update({...config,attributes:selected.has(id)?config.attributes.filter(x=>x!==id):[...config.attributes,id]});}
  async function generate() {
    setBusy(true);setError('');
    // O destino vem do catalogo; fora do SICARD o plugin nao tem acervo.
    setStatus(catalog?.destino
      ? `Gerando geometria e tabela de atributos em ${catalog.destino}/`
      : 'Gerando geometria e tabela de atributos…');
    const snapshot={...config,attributes:[...config.attributes]};
    try {
      const blob=await api.export(snapshot);
      const filename=`municipios_sp_${snapshot.format}.zip`;
      await onExport?.({blob,filename,configuration:snapshot,attributes:selectedItems});
      if(download){const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
      if(mounted.current)setStatus('Camada gerada. O pacote contém a camada, o dicionário e os metadados.');
    }catch(e){if(mounted.current){setError(e.message);setStatus('');}}
    finally{if(mounted.current)setBusy(false);}
  }
  return <section className={`mlb ${className}`} aria-label="Gerador de camada municipal">
    <header className="mlb-header"><div><span className="mlb-eyebrow">SÃO PAULO / DADOS MUNICIPAIS</span><h1>Monte sua camada</h1><p>Escolha os indicadores e receba uma camada vetorial com os atributos incorporados.</p></div><div className="mlb-geometry"><strong>645 municípios</strong><span>Malha IBGE 2022 · SIRGAS 2000</span></div></header>
    {error && <div className="mlb-error" role="alert">{error}</div>}
    {!catalog ? <p role="status">{error ? 'Não foi possível carregar o catálogo. Verifique a API configurada.' : 'Carregando catálogo…'}</p> : <div className="mlb-layout">
      <main className="mlb-panel"><h2>1. Escolha os dados</h2><div className="mlb-filters">
        <label>Fonte<select value={source} onChange={e=>{setSource(e.target.value);setTheme('');}}>{sources.map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Ano de referência<select value={activeYear ?? ''} onChange={e=>{setYear(e.target.value);setTheme('');}}>{years.map(y=><option key={y}>{y}</option>)}</select></label>
        <label>Tema<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="">Todos os temas</option>{themes.map(t=><option key={t} value={t}>{themeLabel(t)}</option>)}</select></label>
      </div><div className="mlb-search"><label>Buscar atributo<input type="search" value={search} placeholder="Ex.: renda, população, IPDM…" onChange={e=>setSearch(e.target.value)}/></label>
        {dimensions.map(([dimension,values])=><label key={dimension}>{dimension}<select value={facets[dimension] ?? ''} onChange={e=>setFacets({...facets,[dimension]:e.target.value})}><option value="">Todos ({values.length})</option>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>)}
        {!!Object.values(facets).filter(Boolean).length && <button type="button" className="mlb-facet-reset" onClick={()=>setFacets({})}>Limpar filtros</button>}
      </div>
      <div className="mlb-listbar"><span>{filtered.length.toLocaleString('pt-BR')} atributos disponíveis</span><span className="mlb-listbar-actions"><button type="button" disabled={!filtered.length || busy} onClick={()=>update({...config,attributes:[...new Set([...config.attributes,...filtered.map(a=>a.id)])]})}>Adicionar resultados</button><button type="button" disabled={!selected.size || busy} onClick={()=>update({...config,attributes:[]})}>Limpar seleção</button></span></div>
      <div className="mlb-attributes">{visible.map(a=><article key={a.id} className={selected.has(a.id)?'mlb-attribute mlb-chosen':'mlb-attribute'}><label><input type="checkbox" checked={selected.has(a.id)} disabled={busy} onChange={()=>toggle(a.id)}/><strong>{a.label}</strong></label><details><summary aria-label={`Fonte e definição de ${a.label}`}></summary><div className="mlb-detail"><p className="mlb-detail-meta">{themeLabel(a.theme)} · {a.unit || 'Unidade não informada'} · {a.coverage}/645 com valor</p><p>{a.field} · {a.year}</p><a href={a.url} target="_blank" rel="noreferrer">Consultar fonte oficial</a><p>{JSON.parse(a.detail).definicao || JSON.parse(a.detail).divulgacao || ""}</p><p>{JSON.parse(a.detail).nota || ""}</p></div></details></article>)}{!visible.length && <p className="mlb-empty">Nenhum atributo encontrado para estes filtros.</p>}</div>
      <nav className="mlb-pages" aria-label="Páginas de atributos"><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page+1} de {Math.max(1,Math.ceil(filtered.length/40))}</span><button type="button" disabled={(page+1)*40>=filtered.length} onClick={()=>setPage(page+1)}>Próxima</button></nav>
      </main>
      <aside className="mlb-panel mlb-output"><h2>2. Gere a camada</h2><div className="mlb-count"><strong>{config.attributes.length.toLocaleString('pt-BR')}</strong><span>atributos selecionados</span></div><p>Você pode combinar fontes e anos. A seleção permanece ao trocar os filtros.</p>
        <div className="mlb-basket">{selectedItems.map(a=><article key={a.id} className="mlb-basket-item"><span className="mlb-basket-name">{a.label}</span><details><summary aria-label={`Fonte e definição de ${a.label}`}></summary><div className="mlb-detail"><p className="mlb-detail-meta">{a.source} · {a.year}</p><p>{themeLabel(a.theme)} · {a.unit || 'Unidade não informada'} · {a.coverage}/645 com valor</p><p>{a.field}</p></div></details><button type="button" className="mlb-basket-remove" disabled={busy} title={`Remover ${a.label}`} aria-label={`Remover ${a.label}`} onClick={()=>toggle(a.id)}>×</button></article>)}{!selectedItems.length && <p>Selecione atributos na lista ao lado.</p>}</div>
        <label>Formato da camada<select disabled={busy} value={config.format} onChange={e=>update({...config,format:e.target.value})}><option value="fgb">FlatGeobuf (.fgb)</option><option value="gpkg">GeoPackage (.gpkg)</option><option value="shp">Shapefile (.shp)</option></select></label>
        <p className="mlb-note">{config.format==='shp'?'Até 250 atributos. Nomes abreviados com correspondência no dicionário.':config.format==='gpkg'?'Até 1.900 atributos. Nomes completos preservados.':'Até 6.500 atributos. Nomes completos preservados.'} Todos os formatos são entregues em ZIP.</p>
        <label className="mlb-nome">Nome da camada<input type="text" maxLength={200} disabled={busy} value={config.nome ?? ''} placeholder={nomePadrao} onChange={e=>update({...config,nome:e.target.value})}/></label>
        <p className="mlb-note">Em branco, o nome é montado com a categoria, a fonte majoritária da seleção e a data.</p>
        {selected.size>limits[config.format] && <p className="mlb-error">Seleção excede o limite do formato. Escolha FlatGeobuf ou remova atributos.</p>}
        <button type="button" className="mlb-primary" disabled={busy || !selected.size || selected.size>limits[config.format]} onClick={generate}>{busy?'Gerando camada…':download?'Gerar e baixar camada':'Gerar camada'}</button>
        <p className="mlb-status" role="status">{status}</p><p className="mlb-note">Geometria de 2022. O período de cada indicador acompanha o campo nos metadados. Valores ausentes permanecem nulos.</p>
      </aside>
      {preview && <section className="mlb-panel mlb-preview"><h2>Prévia da tabela de atributos</h2><p>5 municípios · até 8 atributos da seleção. A exportação inclui todos os 645 municípios e todos os atributos escolhidos.</p><div className="mlb-table"><table><thead><tr><th>Código IBGE</th><th>Município</th>{preview.fields.map(f=><th key={f}>{f}</th>)}</tr></thead><tbody>{preview.rows.map(r=><tr key={r.CD_MUN}><td>{r.CD_MUN}</td><td>{r.NM_MUN}</td>{preview.fields.map(f=><td key={f}>{r[f] == null ? 'Sem valor' : r[f].toLocaleString('pt-BR',{maximumFractionDigits:8})}</td>)}</tr>)}</tbody></table></div></section>}
      {preview?.glossario?.length ? <section className="mlb-panel mlb-glossario"><h2>Glossário e aliases de atributos</h2><p>Os campos abaixo são exatamente os que sairão na tabela de atributos da camada gerada. O nome do campo começa pelo identificador do tema; o nome por extenso viaja no alias, no dicionário e nos metadados do pacote.{preview.totalAttributes > (preview.glossarioLimite ?? 0) ? ` Exibindo os primeiros ${preview.glossarioLimite} de ${preview.totalAttributes.toLocaleString('pt-BR')} atributos; o dicionário do pacote traz todos.` : ''}</p><div className="mlb-table"><table><thead><tr><th>Campo exportado</th><th>Alias</th><th>Significado</th><th>Fonte</th></tr></thead><tbody>{preview.glossario.map(item=><tr key={item.campo_exportado}><td><code>{item.campo_exportado}</code></td><td>{item.alias}</td><td className="mlb-glossario-significado">{item.significado}</td><td>{item.fonte}</td></tr>)}</tbody></table></div></section> : null}
    </div>}
  </section>;
}
