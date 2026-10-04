(function (global) {
  "use strict";

  var state = { ambientes: [], ambiente: null, respostas: [], criterios: [], query: "", pairFilter: "", pairSort: "dispersion", loadingRound: false };
  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function num(v,d) { var n=Number(v); return isFinite(n)?n.toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d}):"—"; }
  function date(v) { var d=new Date(v); return !v||isNaN(d.getTime())?"—":d.toLocaleString("pt-BR"); }
  function stored(k,f) { try { return JSON.parse(localStorage.getItem(k)||"")||f; } catch(_e){ return f; } }
  function localCriteria() {
    var raw = stored("ahp_criteria", []);
    return (Array.isArray(raw) ? raw : []).map(function(c,i){
      if (typeof c === "string") return c.trim();
      if (c && typeof c === "object") {
        var name = c.criterio || c.nome || c.name || c.titulo || c.label;
        if (typeof name === "string" && name.trim()) return name.trim();
      }
      return "Critério " + (i + 1);
    }).filter(function(c){ return Boolean(c && String(c).trim()); });
  }
  function jsonCell(value,label) { if(value==null)return "—";return '<details class="matrix-details"><summary>'+esc(label||"Ver conteúdo")+'</summary><pre class="collab-json-full">'+esc(JSON.stringify(value,null,2))+'</pre></details>'; }
  function weights(m) { var n=m.length,g=m.map(function(row){return Math.exp(row.reduce(function(s,v){return s+Math.log(Number(v)||1);},0)/n);}),t=g.reduce(function(s,v){return s+v;},0);return g.map(function(v){return t?v/t:0;}); }

  function matrixHtml(m) {
    if(!m||!m.length)return '<div class="collab-empty">Matriz não disponível.</div>';
    return '<div class="collab-matrix-scroll"><table class="mini-matrix"><thead><tr><th>Critério</th>'+state.criterios.map(function(n){return '<th title="'+esc(n)+'">'+esc(n)+'</th>';}).join("")+'</tr></thead><tbody>'+m.map(function(row,i){return '<tr><th>'+esc(state.criterios[i]||("Critério "+(i+1)))+'</th>'+row.map(function(v){return '<td>'+num(v,3)+'</td>';}).join("")+'</tr>';}).join("")+'</tbody></table></div>';
  }
  function field(label,value) { return '<div class="collab-detail-field"><span>'+esc(label)+'</span><strong>'+esc(value==null?"—":value)+'</strong></div>'; }
  function openDetail(kind,index) {
    var x=kind==="ambiente"?state.ambiente:state.respostas[index],html="";
    el("collab-detail-title").textContent=kind==="ambiente"?"Ambiente colaborativo":"Resposta de "+x.nome_completo;
    if(kind==="ambiente"){
      html='<div class="collab-detail-grid">'+field("ID",x.id)+field("Tipo",x.config_tipo)+field("Código",x.config_codigo)+field("Status",x.status)+field("Validade",date(x.valido_ate))+field("Criado em",date(x.criadoEm))+field("Atualizado em",date(x.atualizadoEm))+field("Respostas",x.total_respostas)+'</div><h3>Convidados</h3><div class="collab-chip-list">'+(x.convites||[]).map(function(c){return '<span>'+esc(c.email)+'</span>';}).join("")+'</div>'+(x.consolidacao?'<h3>Matriz consolidada</h3>'+matrixHtml(x.consolidacao.matriz_consolidada):'');
    } else {
      html='<div class="collab-detail-grid">'+field("ID",x.id)+field("Participante",x.nome_completo)+field("E-mail",x.email)+field("Instituição",x.instituicao)+field("λmax",num(x.lambda_max,4))+field("IC",num(x.indice_consistencia,4))+field("IA",num(x.indice_aleatorio,4))+field("RC",num(x.razao_consistencia,4))+field("Consistente",x.consistente?"Sim":"Não")+field("Enviado em",date(x.enviadoEm))+'</div><h3>Matriz de comparação pareada</h3>'+matrixHtml(x.matriz_comparacao);
    }
    el("collab-detail-content").innerHTML=html;el("collab-detail-overlay").classList.remove("is-hidden");el("collab-detail-close").focus();
  }
  function closeDetail(){el("collab-detail-overlay").classList.add("is-hidden");}

  function renderExplorer() {
    var a=state.ambiente,q=state.query.toLowerCase(),filtered=state.respostas.map(function(x,i){return {x:x,i:i};}).filter(function(o){return [o.x.nome_completo,o.x.email,o.x.instituicao,o.x.id].join(" ").toLowerCase().indexOf(q)>=0;});
    el("badge-ambientes").textContent=state.ambientes.length;el("badge-respostas").textContent=state.respostas.length;el("records-count").textContent=filtered.length+" resposta(s) da rodada selecionada";
    var ambienteRows=state.ambientes.filter(function(x){return [x.hierarquizacao_codigo,x.hierarquizacao_id,x.id,x.token].join(" ").toLowerCase().indexOf(q)>=0;}).map(function(x,index){var cons=x.consolidacao,selected=a&&x.id===a.id;return '<tr class="collab-round-row '+(selected?'is-selected':'')+'" data-round-id="'+esc(x.id)+'" aria-selected="'+selected+'"><td><input type="radio" name="rodada-ahp" '+(selected?'checked':'')+' aria-label="Selecionar julgamento criado em '+esc(date(x.criadoEm))+'"></td><td><span class="collab-status">'+esc(x.status)+'</span></td><td>'+esc(x.id)+'</td><td>Hierarquização</td><td>'+esc(x.hierarquizacao_codigo)+'</td><td>—</td><td>'+esc(x.hierarquizacao_id)+'</td><td>'+esc(x.token)+'</td><td>'+jsonCell(x.criterios,x.n_criterios+" critério(s)")+'</td><td>'+x.n_criterios+'</td><td>'+jsonCell(x.convites,(x.convites||[]).length+" convite(s)")+'</td><td>'+date(x.valido_ate)+'</td><td>'+date(x.criadoEm)+'</td><td>'+date(x.atualizadoEm)+'</td><td>'+jsonCell(cons&&cons.matriz_consolidada,"Ver matriz")+'</td><td>'+jsonCell(cons&&cons.pesos_consolidados,"Ver pesos")+'</td><td>'+num(cons&&cons.lambda_max,4)+'</td><td>'+num(cons&&cons.indice_consistencia,4)+'</td><td>'+num(cons&&cons.indice_aleatorio,4)+'</td><td>'+num(cons&&cons.razao_consistencia,4)+'</td><td>'+(cons?(cons.consistente?"Sim":"Não"):"—")+'</td><td>'+(cons?cons.respostas_consolidadas:"—")+'</td><td>'+date(cons&&cons.consolidadoEm)+'</td><td><button class="btn btn-secondary btn-sm" data-round-detail="'+esc(x.id)+'">Ver detalhes</button></td></tr>';});
    el("ambiente-table").innerHTML=ambienteRows.join("") || '<tr><td colspan="24" class="collab-empty">Nenhum registro encontrado.</td></tr>';
    var respostaRows=filtered.map(function(o){var x=o.x;return '<tr><td><span class="collab-status '+(x.consistente?'':'is-muted')+'">'+(x.consistente?'Sim':'Não')+'</span></td><td>'+esc(x.id)+'</td><td>'+esc(x.ambiente_id)+'</td><td>'+esc(x.nome_completo)+'</td><td>'+esc(x.email)+'</td><td>'+esc(x.instituicao)+'</td><td>'+jsonCell(x.matriz_comparacao,"Ver matriz")+'</td><td>'+num(x.lambda_max,4)+'</td><td>'+num(x.indice_consistencia,4)+'</td><td>'+num(x.indice_aleatorio,4)+'</td><td>'+num(x.razao_consistencia,4)+'</td><td>'+jsonCell(x.estatisticas,"Ver estatísticas")+'</td><td>'+date(x.enviadoEm)+'</td><td><button class="btn btn-secondary btn-sm" data-detail="resposta" data-index="'+o.i+'">Ver detalhes</button></td></tr>'; }); el("respostas-table").innerHTML=respostaRows.join("") || '<tr><td colspan="14" class="collab-empty">Nenhum registro encontrado.</td></tr>';
    document.querySelectorAll("[data-round-id]").forEach(function(row){row.addEventListener("click",function(e){if(e.target.closest("details")||e.target.closest("[data-round-detail]"))return;selectRound(row.dataset.roundId);});});
    document.querySelectorAll("[data-round-detail]").forEach(function(b){b.addEventListener("click",function(){selectRound(b.dataset.roundDetail,true);});});
    document.querySelectorAll("[data-detail]").forEach(function(b){b.addEventListener("click",function(){openDetail(b.dataset.detail,Number(b.dataset.index||0));});});
  }
  function bar(label,value,max,warning,index) { return '<button class="collab-bar-row '+(index==null?'is-static':'')+'" '+(index==null?'disabled':'data-response-index="'+index+'"')+'><span>'+esc(label)+'</span><span class="collab-bar-track"><span class="collab-bar-fill '+(warning?'is-warning':'')+'" style="width:'+Math.min(100,max?value/max*100:0)+'%"></span></span><strong>'+num(value,warning?4:0)+'</strong></button>'; }
  function renderOverview() {
    var a=state.ambiente,r=state.respostas,inv=(a.convites||[]).length,ok=r.filter(function(x){return x.consistente;}).length,valid=r.map(function(x,i){return {v:Number(x.razao_consistencia),i:i,x:x};}).filter(function(o){return isFinite(o.v);}),avg=valid.length?valid.reduce(function(s,o){return s+o.v;},0)/valid.length:0,rate=inv?r.length/inv*100:0;
    el("collab-kpis").innerHTML='<div class="collab-kpi"><strong>'+r.length+'</strong><span>respostas recebidas</span></div><div class="collab-kpi"><strong>'+num(rate,1)+'%</strong><span>taxa de participação</span></div><div class="collab-kpi"><strong>'+ok+'</strong><span>respostas consistentes</span></div><div class="collab-kpi"><strong>'+num(avg,4)+'</strong><span>RC médio</span></div>';
    el("participacao-chart").innerHTML=bar("Responderam",r.length,Math.max(inv,1),false,null)+bar("Pendentes",Math.max(inv-r.length,0),Math.max(inv,1),true,null);
    el("consistencia-chart").innerHTML=valid.length?valid.map(function(o){return bar(o.x.nome_completo,o.v,.1,o.v>=.1,o.i);}).join(""):'<div class="collab-empty">Sem respostas.</div>';
    document.querySelectorAll("[data-response-index]").forEach(function(b){b.addEventListener("click",function(){openDetail("resposta",Number(b.dataset.responseIndex));});});
  }
  function renderCriteria() {
    var sets=state.respostas.map(function(r){return weights(r.matriz_comparacao||[]);}).filter(function(w){return w.length;}),host=el("criterios-chart");if(!sets.length){host.innerHTML='<div class="collab-empty">A análise surgirá após o recebimento das respostas.</div>';return;}
    host.innerHTML='<div class="collab-criteria-chart">'+state.criterios.map(function(name,i){var vals=sets.map(function(w){return w[i]*100;}),lo=Math.min.apply(null,vals),hi=Math.max.apply(null,vals),mean=vals.reduce(function(s,v){return s+v;},0)/vals.length;return '<button class="collab-criterion-row" data-criterion="'+i+'" title="Filtrar comparações que incluem '+esc(name)+'"><strong>'+esc(name)+'</strong><span class="collab-range"><span class="collab-range-band" style="left:'+lo+'%;width:'+Math.max(hi-lo,.5)+'%"></span><span class="collab-range-mean" style="left:'+mean+'%"></span></span><span>'+num(mean,1)+'%</span></button>';}).join("")+'</div>';
    host.querySelectorAll("[data-criterion]").forEach(function(b){b.addEventListener("click",function(){el("pair-criterion-filter").value=b.dataset.criterion;state.pairFilter=b.dataset.criterion;renderPairs();el("pares-table").scrollIntoView({behavior:"smooth",block:"center"});});});
  }
  function renderPairs() {
    var r=state.respostas,host=el("pares-table");if(!r.length||!r[0].matriz_comparacao.length){host.innerHTML='<tr><td colspan="4" class="collab-empty">Sem julgamentos.</td></tr>';return;}var p=[],n=r[0].matriz_comparacao.length;
    for(var i=0;i<n;i++)for(var j=i+1;j<n;j++){var logs=r.map(function(x){return Math.log(Number(x.matriz_comparacao[i][j]));}),mean=logs.reduce(function(s,v){return s+v;},0)/logs.length,sd=Math.sqrt(logs.reduce(function(s,v){return s+Math.pow(v-mean,2);},0)/logs.length);p.push({i:i,j:j,gm:Math.exp(mean),sd:sd});}
    if(state.pairFilter!=="")p=p.filter(function(x){return x.i===Number(state.pairFilter)||x.j===Number(state.pairFilter);});p.sort(state.pairSort==="criterion"?function(a,b){return state.criterios[a.i].localeCompare(state.criterios[b.i],"pt-BR");}:function(a,b){return b.sd-a.sd;});
    var pairRows=p.map(function(x){var level=x.sd<.2?"Alta":x.sd<.5?"Moderada":"Baixa";return '<tr><td><span class="collab-status '+(level==="Alta"?'':'is-muted')+'">'+level+'</span></td><td><strong>'+esc(state.criterios[x.i])+'</strong><br><span>versus '+esc(state.criterios[x.j])+'</span></td><td>'+num(x.gm,3)+'</td><td>'+num(x.sd,3)+'</td></tr>'; }); host.innerHTML=pairRows.join("") || '<tr><td colspan="4" class="collab-empty">Nenhum julgamento encontrado.</td></tr>';
  }
  function setRoundCriteria() {
    var source=state.ambiente&&state.ambiente.criterios||[];
    state.criterios=(Array.isArray(source)?source:[]).map(function(c,i){
      if(typeof c === "string") return c.trim();
      if(c && typeof c === "object"){
        var name = c.criterio || c.nome || c.name || c.titulo || c.label;
        if(typeof name === "string" && name.trim()) return name.trim();
      }
      return "Critério " + (i + 1);
    }).filter(function(c){ return Boolean(c && String(c).trim()); });
    var n=state.ambiente&&state.ambiente.n_criterios||0;
    if(state.criterios.length<n)state.criterios=Array.from({length:n},function(_,i){return state.criterios[i]||("Critério "+(i+1));});
    el("pair-criterion-filter").innerHTML='<option value="">Todos os critérios</option>'+state.criterios.map(function(c,i){return '<option value="'+i+'">'+esc(c)+'</option>';}).join("");
  }
  function selectRound(id,showDetail) {
    if(state.loadingRound)return;
    var selected=state.ambientes.find(function(x){return x.id===id;});if(!selected)return;
    state.loadingRound=true;state.ambiente=selected;state.respostas=[];state.pairFilter="";setRoundCriteria();var roundLabel="Rodada de "+date(selected.criadoEm);el("overview-round-context").textContent=roundLabel;el("criteria-round-context").textContent=roundLabel;renderExplorer();renderOverview();renderCriteria();renderPairs();
    global.SLTColaborativaApi.listarRespostas(id).then(function(respostas){state.respostas=respostas||[];state.loadingRound=false;renderExplorer();renderOverview();renderCriteria();renderPairs();if(showDetail)openDetail("ambiente",0);}).catch(function(err){state.loadingRound=false;el("respostas-table").innerHTML='<tr><td colspan="14" class="collab-error">'+esc(err.message||err)+'</td></tr>';});
  }
  function setup() {
    document.querySelectorAll(".collab-tab").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll(".collab-tab").forEach(function(x){x.classList.toggle("is-active",x===b);x.setAttribute("aria-selected",x===b);});document.querySelectorAll(".collab-tab-panel").forEach(function(p){p.classList.toggle("is-hidden",p.id!==b.getAttribute("aria-controls"));});});});
    el("records-search").addEventListener("input",function(e){state.query=e.target.value;renderExplorer();});el("pair-criterion-filter").addEventListener("change",function(e){state.pairFilter=e.target.value;renderPairs();});el("pair-sort").addEventListener("change",function(e){state.pairSort=e.target.value;renderPairs();});el("collab-detail-close").addEventListener("click",closeDetail);el("collab-detail-overlay").addEventListener("click",function(e){if(e.target===this)closeDetail();});document.addEventListener("keydown",function(e){if(e.key==="Escape")closeDetail();});
  }
  function init() {
    setup();var cached=stored("slt_ahp_collab_ambiente",null);state.criterios=localCriteria();
    global.SLTColaborativaApi.listarAmbientes().then(function(ambientes){state.ambientes=ambientes||[];if(!state.ambientes.length){renderExplorer();return;}var preferred=state.ambientes.find(function(x){return cached&&x.id===cached.id;})||state.ambientes[0];selectRound(preferred.id,false);}).catch(function(err){el("ambiente-table").innerHTML='<tr><td colspan="24" class="collab-error">'+esc(err.message||err)+'</td></tr>';});
  }
  document.addEventListener("DOMContentLoaded",init);
})(window);
