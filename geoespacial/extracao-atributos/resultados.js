import { $, el, options, numero, atributos } from "./ui.js";
import { rotulo as rotuloRegra } from "./regras.js";

// Valores e estatísticas vêm do serviço. A interface somente os apresenta.
export function medida(value, dimension) {
  if(typeof value!=="number"||!Number.isFinite(value)) return "—";
  if(dimension===1) return `${numero(value)} m · ${numero(value/1000,4)} km`;
  if(dimension===2) return `${numero(value/10000,4)} ha · ${numero(value/1000000,6)} km²`;
  return "—";
}
export function ocorrenciaVisivel(row, dimension) {
  return dimension===0 ? typeof row?.dentro==="boolean" : row?.dimensao===dimension&&Number.isFinite(row.medida_si)&&row.medida_si>0;
}
function table(headers, rows) {
  const wrap=el("div",undefined,"ea-table-wrap"),tbl=el("table"),head=el("thead"),tr=el("tr"),body=el("tbody");
  headers.forEach(name=>{const cell=el("th",name);cell.scope="col";tr.append(cell);});head.append(tr);
  rows.forEach(values=>{const row=el("tr");values.forEach(value=>{const cell=el("td");cell.append(value instanceof Node?value:document.createTextNode(String(value)));row.append(cell);});body.append(row);});
  tbl.append(head,body);wrap.append(tbl);return wrap;
}
export function criarResultados() {
  let result=null,view="summary";
  const categorySelect=$("#ea-result-category"),layerSelect=$("#ea-result-layer");
  function groups() {
    return (result?.categorias||[]).filter(c=>!categorySelect.value||c.id===categorySelect.value);
  }
  function layers(category) { return category.camadas.filter(l=>!layerSelect.value||l.id===layerSelect.value); }
  function summary() {
    const host=$("#ea-results-content"),dim=result.dimensao_input;
    for(const category of groups()) {
      const card=el("details",undefined,"ea-summary-card");card.open=true;
      const heading=el("summary");heading.append(el("span",category.nome),el("span",`${numero(category.resumo?.percentual)}% da entrada`));card.append(heading);
      card.append(el("p",dim===0?`${numero(category.resumo?.pontos_dentro,0)} pontos dentro da categoria`:`Extensão única na categoria: ${medida(category.resumo?.medida_unica_si,dim)}`,"ea-hint"));
      const percent=category.resumo?.percentual;
      if(typeof percent==="number"&&Number.isFinite(percent)&&percent>=0&&percent<=100) {const meter=el("meter");meter.min=0;meter.max=100;meter.value=percent;meter.setAttribute("aria-label",`Percentual da entrada em ${category.nome}`);card.append(meter);}
      card.append(table(["Camada", "Ocorrências",dim===0?"Pontos dentro":"Extensão única atingida","% da entrada"],layers(category).map(layer=>[
        layer.nome,numero(layer.resumo?.ocorrencias,0),dim===0?numero(layer.resumo?.pontos_dentro,0):medida(layer.resumo?.medida_unica_si,dim),`${numero(layer.resumo?.percentual)}%`,
      ])));
      host.append(card);
    }
    host.append(el("p","Os totais únicos são consolidados pelo processamento. Categorias e camadas podem se sobrepor; seus percentuais não devem ser somados.","ea-hint"));
  }
  function statistics() {
    const host=$("#ea-results-content"),dim=result.dimensao_input;
    for(const category of groups()) {
      host.append(el("h3",category.nome));
      const entities=layerSelect.value?layers(category):[{nome:"Categoria consolidada",estatisticas:category.estatisticas},...layers(category)];
      if(dim===0) {
        host.append(table(["Agrupamento","Pontos dentro","Pontos fora"],entities.map(item=>[item.nome,numero(item.estatisticas?.pontos_dentro,0),numero(item.estatisticas?.pontos_fora,0)])));
      } else {
        host.append(table(["Agrupamento","N","Média","Mediana","Mínimo","Máximo","Desvio padrão","Q1","Q3"],entities.map(item=>{
          const s=item.estatisticas||{};
          return [item.nome,numero(s.n,0),...["media","mediana","minimo","maximo","desvio_padrao","q1","q3"].map(key=>medida(s[key],dim))];
        })));
      }
    }
    host.append(el("p",result.metodologia_estatistica||"Definição da população estatística e do desvio padrão não informada pelo processamento.","ea-hint"));
  }
  function extracted() {
    const dim=result.dimensao_input,rows=[];
    for(const category of groups()) for(const layer of layers(category)) for(const row of layer.ocorrencias.filter(r=>ocorrenciaVisivel(r,dim))) {
      const details=el("details"),summary=el("summary","Ver atributos");details.append(summary,atributos(row.atributos));
      rows.push([category.nome,layer.nome,row.input_id??"—",row.feicao_base_id??"—",dim===0?(row.dentro?"Dentro":"Fora"):medida(row.medida_si,dim),...(dim===0?[]:[`${numero(row.percentual)}%`]),details]);
    }
    const host=$("#ea-results-content");
    if(!rows.length) {host.append(el("p","Nenhuma ocorrência com medida aplicável neste recorte.","ea-empty-small"));return;}
    host.append(table(["Categoria","Camada","Feição de input","Feição de origem",dim===0?"Posição":"Medida",...(dim===0?[]:["% da entrada"]),"Atributos extraídos"],rows));
  }
  // Modo enriquecimento: camadas de saída, etapas por base e dicionário de campos.
  function enriquecimento() {
    const host=$("#ea-results-content"),rel=result.relatorio_enriquecimento||{};
    const camadas=Object.entries(result.camadas||{});
    if(view==="summary"){
      const val=result.validacao||rel.validacao;
      if(val){
        host.append(el("h3",`Conferência: ${val.aprovada?"aprovada":"REPROVADA — confira antes de usar"}`));
        host.append(table(["Camada","Registros","Id único","Feições sem registro","Trechos fora da unidade","Soma de trechos divergente","Divergências de multiplicidade"],
          Object.entries(val).filter(([,v])=>v&&typeof v==="object"&&"registros" in v).map(([nome,v])=>[nome,numero(v.registros,0),v.id_registro_unico?"sim":"não",
            numero(v.feicoes_de_entrada_sem_registro,0),v.trechos_fora_da_propria_unidade??"—",v.feicoes_com_soma_de_trechos_divergente??"—",
            numero((v.multiplicidade_conferida||[]).reduce((s,b)=>s+b.divergencias,0),0)])));
        const repetidos=Object.entries(val.id_origem_repetidos||{}).filter(([,n])=>n>0);
        if(repetidos.length)host.append(el("p",`Identificador repetido na entrada: ${repetidos.map(([nome,n])=>`${nome} (${n})`).join(", ")}.`,"ea-hint"));
      }
      host.append(table(["Camada de saída","Registros","Campos"],camadas.map(([nome,info])=>[nome,numero(info.registros,0),numero(info.campos,0)])));
      const finalidades=Object.values(result.finalidades||{});
      if(finalidades.length)host.append(el("p",`Recortes por finalidade no pacote: ${finalidades.map(f=>`${f.nome} (${f.campos.length} campo(s))`).join("; ")}.`,"ea-hint"));
      for(const [nome,info] of Object.entries(rel.camadas||{})){
        host.append(el("h3",`${nome}: ${numero(info.feicoes_entrada,0)} feição(ões) de entrada → ${numero(info.registros,0)} registro(s)`));
        host.append(table(["Base","Papel","Multiplicidade","Com correspondência","Com mais de uma feição","Registros depois"],
          (info.etapas||[]).map(e=>[e.base,e.papel==="recorte"?"Unidade de recorte":`Atributos · ${rotuloRegra("ligacao",e.ligacao)}`,
            e.papel==="recorte"?"—":rotuloRegra("multiplicidade",e.multiplicidade),
            e.papel==="recorte"?`${numero(e.fora_das_unidades,0)} fora das unidades`:numero(e.registros_com_correspondencia,0),
            e.papel==="recorte"?"—":numero(e.registros_com_multiplas_feicoes,0),numero(e.registros_depois,0)])));
      }
      host.append(el("p","Registros sem correspondência são mantidos com os campos da base vazios. O pacote de saída traz o GeoPackage, as tabelas, o dicionário de campos e a configuração usada.","ea-hint"));
      return;
    }
    if(view==="statistics"){
      host.append(el("p","O enriquecimento não calcula estatísticas de extensão; as medidas em comum com a feição escolhida estão nos campos *_comum_* das camadas.","ea-empty-small"));
      return;
    }
    host.append(table(["Camada","Campo","Apelido","Tema","Base","Regra"],(result.dicionario||[]).map(d=>[d.camada,d.campo,d.apelido||"—",d.tema||"—",d.base||"—",d.regra||"—"])));
  }
  function render() {
    if(!result) return;
    $("#ea-results-content").replaceChildren();
    if(result.modo==="enriquecimento"){enriquecimento();return;}
    if(!result.categorias.length) { $("#ea-results-content").append(el("p","Processamento concluído sem ocorrências de extração.","ea-empty-small")); return; }
    ({summary,statistics,attributes:extracted})[view]();
  }
  function updateLayers() {
    const items=groups().flatMap(c=>c.camadas);
    options(layerSelect,items,"Todas as camadas");render();
  }
  categorySelect.addEventListener("change",updateLayers);layerSelect.addEventListener("change",render);
  document.querySelectorAll("[data-view]").forEach(button=>button.addEventListener("click",()=>{
    view=button.dataset.view;document.querySelectorAll("[data-view]").forEach(b=>{b.classList.toggle("is-active",b===button);b.setAttribute("aria-pressed",String(b===button));});render();
  }));
  const empty=$("#ea-results-content").innerHTML;
  function clear() {
    result=null;$("#ea-results-content").innerHTML=empty;
    document.querySelectorAll("#ea-kpis article").forEach((artigo,index)=>{
      artigo.querySelector("span").textContent=KPIS.sobreposicao[index];
      artigo.querySelector("strong").textContent="—";
    });
    options(categorySelect,[],"Todas as categorias");options(layerSelect,[],"Todas as camadas");categorySelect.disabled=true;layerSelect.disabled=true;
    $("#ea-result-status").textContent="Aguardando processamento";
  }
  // Rótulo do 4º indicador: no enriquecimento não existe "parcela da entrada".
  const KPIS={sobreposicao:["Categorias analisadas","Camadas intersectadas","Ocorrências","Parcela da entrada atingida"],
    enriquecimento:["Camadas de saída","Bases com correspondência","Registros","Conferência"]};
  function set(value) {
    result=value;options(categorySelect,result.categorias,"Todas as categorias");categorySelect.disabled=false;layerSelect.disabled=false;
    const summary=result.resumo||{};
    const enriquecimento=result.modo==="enriquecimento";
    const aprovada=(result.validacao||result.relatorio_enriquecimento?.validacao||{}).aprovada;
    const numbers=enriquecimento
      ?[numero(Object.keys(result.camadas||{}).length,0),numero(summary.camadas_intersectadas,0),numero(summary.ocorrencias,0),
        aprovada===undefined?"—":aprovada?"aprovada":"REPROVADA"]
      :[numero(result.categorias.length,0),numero(summary.camadas_intersectadas,0),numero(summary.ocorrencias,0),`${numero(summary.percentual)}%`];
    const rotulos=KPIS[enriquecimento?"enriquecimento":"sobreposicao"];
    document.querySelectorAll("#ea-kpis article").forEach((artigo,index)=>{
      artigo.querySelector("span").textContent=rotulos[index];
      artigo.querySelector("strong").textContent=numbers[index];
    });
    $("#ea-result-status").textContent="Processamento concluído";updateLayers();
  }
  return {set,clear};
}
