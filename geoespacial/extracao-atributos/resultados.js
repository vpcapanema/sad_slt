import {$,options,numero} from './ui.js';
import {rotulo as rotuloRegra} from './regras.js';
import {base,json} from './api.js';
import {criarDashboard} from './dashboard.js';
import {criarTerritorial} from './territorial.js';
import {clone,valor,opcoes,cabecalhos,linhas,texto} from './resultados-dom.js';

export function medida(value,dimension){
  if(typeof value!=='number'||!Number.isFinite(value))return '—';
  if(dimension===1)return `${numero(value)} m · ${numero(value/1000,4)} km`;
  if(dimension===2)return `${numero(value/10000,4)} ha · ${numero(value/1000000,6)} km²`;
  return '—';
}
export function ocorrenciaVisivel(row,dimension){return dimension===0?typeof row?.dentro==='boolean':row?.dimensao===dimension&&Number.isFinite(row.medida_si)&&row.medida_si>0;}
export function criarResultados(){
  const root=$('#ea-results'),categorySelect=$('#ea-result-category'),layerSelect=$('#ea-result-layer');
  let result=null,view='dashboard',version=0,dashboard,territorial;
  const groups=()=>(result?.categorias||[]).filter(c=>!categorySelect.value||c.id===categorySelect.value);
  const layers=c=>c.camadas.filter(l=>!layerSelect.value||l.id===layerSelect.value);
  for(const tipo of ['processamento','analitico']){
    const link=$(`#ea-pdf-${tipo}`);link.onclick=async event=>{
      event.preventDefault();if(link.dataset.baixando)return;link.dataset.baixando='true';
      const TAREFA='Gerar o PDF no servidor';
      const proc=window.ProcessFeedback.iniciarCadastro({title:'Baixando relatório',tasks:[TAREFA]});proc.tarefaAtual(TAREFA);
      try{const response=await fetch(link.href,{credentials:'same-origin',signal:AbortSignal.timeout(180000)});
        if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(typeof data.detail==='string'?data.detail:`Falha ao baixar relatório (HTTP ${response.status}).`);}
        const url=URL.createObjectURL(await response.blob()),anchor=clone('ea-tpl-download');anchor.href=url;
        anchor.download=/filename="([^"\r\n]+)"/.exec(response.headers.get('Content-Disposition')||'')?.[1]||`relatorio-${tipo}.pdf`;
        anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);proc.concluirTarefa(TAREFA,'PDF gerado');
        proc.sucesso({title:'Download iniciado',message:'O relatório foi gerado e o download começou.',name:anchor.download});
      }catch(error){proc.erro({message:error.message});}finally{delete link.dataset.baixando;}
    };
  }
  function outputTable(){
    const host=$('#ea-panel-attributes'),role=name=>host.querySelector(`[data-role="${name}"]`),current=++version;
    let offset=0,request=0;
    const names=result.modo==='enriquecimento'?Object.keys(result.camadas||{}):['resultado'];
    opcoes(role('output'),names.map(id=>({id,nome:id})),names[0]);
    const previous=host.querySelector('[data-action="previous"]'),next=host.querySelector('[data-action="next"]');
    async function load(){
      const id=++request;role('loading').hidden=false;role('error').hidden=true;previous.disabled=next.disabled=true;
      role('rows').replaceChildren();role('pagination').textContent='';
      try{const data=await json(`/extracao-atributos/execucoes/${encodeURIComponent(result.id)}/tabela?camada=${encodeURIComponent(role('output').value)}&offset=${offset}&limite=100`);
        if(current!==version||id!==request)return;
        cabecalhos(role('columns'),data.campos);linhas(role('rows'),data.linhas.map(r=>data.campos.map(f=>r[f])));role('empty').hidden=!!data.linhas.length;
        role('pagination').textContent=data.total?`${offset+1}–${offset+data.linhas.length} de ${data.total} registros. Todos os campos estão disponíveis; role a tabela horizontalmente.`:'0 registros.';
        previous.disabled=offset===0;next.disabled=offset+data.linhas.length>=data.total;
      }catch(error){if(current!==version||id!==request)return;role('error').hidden=false;role('error').querySelector('p').textContent=error.message;}
      finally{if(current===version&&id===request)role('loading').hidden=true;}
    }
    role('output').onchange=()=>{offset=0;load();};previous.onclick=()=>{offset=Math.max(0,offset-100);load();};next.onclick=()=>{offset+=100;load();};host.querySelector('[data-action="retry"]').onclick=load;load();
  }
  function summary(){
    const host=$('#ea-panel-summary'),role=name=>host.querySelector(`[data-role="${name}"]`),enriched=result.modo==='enriquecimento';
    role('validation').hidden=role('outputs').hidden=!enriched;role('steps').replaceChildren();role('legacy-summary').replaceChildren();role('duplicates').hidden=role('purposes').hidden=true;
    if(enriched){
      const rel=result.relatorio_enriquecimento||{},val=result.validacao||rel.validacao;
      role('validation').hidden=!val;
      if(val){role('validation-title').textContent=`Conferência: ${val.aprovada?'aprovada':'REPROVADA — confira antes de usar'}`;
        linhas(host.querySelector('[data-table="validation"]'),Object.entries(val).filter(([,v])=>v&&typeof v==='object'&&'registros' in v).map(([name,v])=>[name,numero(v.registros,0),v.id_registro_unico?'sim':'não',numero(v.feicoes_de_entrada_sem_registro,0),v.trechos_fora_da_propria_unidade??'—',v.feicoes_com_soma_de_trechos_divergente??'—',numero((v.multiplicidade_conferida||[]).reduce((s,b)=>s+b.divergencias,0),0)]));
        const repeated=Object.entries(val.id_origem_repetidos||{}).filter(([,n])=>n>0);role('duplicates').hidden=!repeated.length;role('duplicates').textContent=`Identificadores repetidos na entrada: ${repeated.map(([name,n])=>`${name} (${n})`).join(', ')}`;
      }
      linhas(host.querySelector('[data-table="outputs"]'),Object.entries(result.camadas||{}).map(([name,info])=>[name,numero(info.registros,0),numero(info.campos,0)]));
      const purposes=Object.values(result.finalidades||{});role('purposes').hidden=!purposes.length;role('purposes').textContent=`Recortes por finalidade: ${purposes.map(f=>`${f.nome} (${f.campos.length} campos)`).join('; ')}`;
      for(const [name,info] of Object.entries(rel.camadas||{})){const section=clone('ea-tpl-steps');valor(section,'title',`${name}: ${numero(info.feicoes_entrada,0)} feições de entrada → ${numero(info.registros,0)} registros`);
        linhas(section.querySelector('tbody'),(info.etapas||[]).map(e=>[e.base,e.papel==='recorte'?'Unidade de recorte':`Atributos · ${rotuloRegra('ligacao',e.ligacao)}`,e.papel==='recorte'?'—':rotuloRegra('multiplicidade',e.multiplicidade),e.papel==='recorte'?`${numero(e.fora_das_unidades,0)} fora das unidades`:numero(e.registros_com_correspondencia,0),e.papel==='recorte'?'—':numero(e.registros_com_multiplas_feicoes,0),numero(e.registros_depois,0)]));role('steps').append(section);}
    }else{
      const dim=result.dimensao_input;
      for(const category of groups()){const section=clone('ea-tpl-legacy-summary');valor(section,'title',`${category.nome} · ${numero(category.resumo?.percentual)}% da entrada`);
        valor(section,'measure',dim===0?`${numero(category.resumo?.pontos_dentro,0)} pontos dentro da categoria`:`Extensão única: ${medida(category.resumo?.medida_unica_si,dim)}`);
        valor(section,'measure-label',dim===0?'Pontos dentro':'Extensão única atingida');const meter=section.querySelector('meter');meter.hidden=!Number.isFinite(category.resumo?.percentual);meter.value=category.resumo?.percentual||0;
        linhas(section.querySelector('tbody'),layers(category).map(l=>[l.nome,numero(l.resumo?.ocorrencias,0),dim===0?numero(l.resumo?.pontos_dentro,0):medida(l.resumo?.medida_unica_si,dim),`${numero(l.resumo?.percentual)}%`]));role('legacy-summary').append(section);}
    }
  }
  function statistics(){
    const host=$('#ea-panel-statistics'),container=host.querySelector('[data-role="statistics-groups"]'),dim=result.dimensao_input;container.replaceChildren();
    for(const category of groups()){const section=clone('ea-tpl-legacy-statistics');valor(section,'title',category.nome);
      const entities=layerSelect.value?layers(category):[{nome:'Categoria consolidada',estatisticas:category.estatisticas},...layers(category)];
      cabecalhos(section.querySelector('[data-role="columns"]'),dim===0?['Agrupamento','Pontos dentro','Pontos fora']:['Agrupamento','N','Média','Mediana','Mínimo','Máximo','Desvio padrão','Q1','Q3']);
      linhas(section.querySelector('tbody'),entities.map(item=>{const s=item.estatisticas||{};return dim===0?[item.nome,numero(s.pontos_dentro,0),numero(s.pontos_fora,0)]:[item.nome,numero(s.n,0),...['media','mediana','minimo','maximo','desvio_padrao','q1','q3'].map(k=>medida(s[k],dim))];}));container.append(section);}
    host.querySelector('[data-role="methodology"]').textContent=result.metodologia_estatistica||'Definição da população estatística não informada.';
  }
  function render(){
    dashboard?.dispose();territorial?.dispose();version++;
    $('#ea-results-empty').hidden=!!result;
    for(const pane of root.querySelectorAll('[data-result-pane]'))pane.hidden=!result||pane.dataset.resultPane!==view;
    const filters=!!result&&result.modo!=='enriquecimento'&&['summary','statistics'].includes(view);
    categorySelect.closest('.ea-results-filters').hidden=!filters;$('#ea-kpis').hidden=!result||['dashboard','explore'].includes(view);
    for(const button of root.querySelectorAll('[data-view]')){const active=button.dataset.view===view;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));}
    if(!result)return;
    if(view==='dashboard'){territorial.mount($('#ea-panel-territorial'));return;}
    if(view==='explore'){dashboard.mount($('#ea-panel-atributos'));return;}
    if(view==='attributes'){outputTable();return;}
    if(view==='summary'){summary();return;}
    if(view==='statistics'){statistics();return;}
    linhas(root.querySelector('[data-table="dictionary"]'),(result.dicionario||[]).map(d=>[d.camada,d.campo,d.apelido,d.tema,d.base,d.regra]));
  }
  categorySelect.onchange=()=>{options(layerSelect,groups().flatMap(c=>c.camadas),'Todas as camadas');render();};layerSelect.onchange=render;
  for(const button of root.querySelectorAll('[data-view]'))button.onclick=()=>{view=button.dataset.view;render();};
  function clear(){result=null;view='dashboard';render();dashboard=territorial=null;
    $('#ea-result-status').textContent='Aguardando processamento';$('#ea-package-description').textContent='O conteúdo do pacote será informado após o processamento.';
    $('#ea-pdf-processamento').hidden=$('#ea-pdf-analitico').hidden=true;
  }
  function set(value){dashboard?.dispose();territorial?.dispose();result=value;view='dashboard';dashboard=criarDashboard(value);territorial=criarTerritorial(value);
    options(categorySelect,result.categorias||[],'Todas as categorias');options(layerSelect,(result.categorias||[]).flatMap(c=>c.camadas),'Todas as camadas');categorySelect.disabled=layerSelect.disabled=false;
    const enriched=result.modo==='enriquecimento',s=result.resumo||{},approved=(result.validacao||result.relatorio_enriquecimento?.validacao||{}).aprovada;
    root.querySelector('[data-view="statistics"]').hidden=enriched;root.querySelector('[data-view="dictionary"]').hidden=!enriched;
    const labels=enriched?['Camadas de saída','Bases com correspondência','Registros','Conferência']:['Categorias analisadas','Camadas intersectadas','Ocorrências','Parcela da entrada atingida'];
    const values=enriched?[numero(Object.keys(result.camadas||{}).length,0),numero(s.camadas_intersectadas,0),numero(s.ocorrencias,0),approved===undefined?'—':approved?'aprovada':'REPROVADA']:[numero((result.categorias||[]).length,0),numero(s.camadas_intersectadas,0),numero(s.ocorrencias,0),`${numero(s.percentual)}%`];
    root.querySelectorAll('#ea-kpis article').forEach((node,i)=>{node.querySelector('span').textContent=labels[i];node.querySelector('strong').textContent=values[i];});
    $('#ea-package-description').textContent=(enriched?'GeoPackage, tabelas CSV e XLSX, dicionário de campos, configuração e conferência.':'GeoPackage, relatórios PDF e tabelas XLSX e CSV.')+' Pacote integral da execução; os filtros não alteram o download.';
    for(const tipo of ['processamento','analitico']){const link=$(`#ea-pdf-${tipo}`);link.hidden=enriched;link.href=`${base}/extracao-atributos/execucoes/${encodeURIComponent(result.id)}/relatorios/${tipo}`;}
    $('#ea-result-status').textContent='Processamento concluído';render();
  }
  return {set,clear};
}
