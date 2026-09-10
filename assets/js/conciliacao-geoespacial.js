(() => {
  "use strict";
  let rows=[];
  let lifecycle=new Map();
  const status=document.getElementById("conciliacao-status");
  const button=document.getElementById("conciliar");
  const endpoint=window.location.pathname.replace(/\/pagina\/?$/, "");
  const labels={disponivel:"Arquivo disponível",arquivo_nao_localizado:"Arquivo não localizado",sem_vinculo_arquivo:"Registro sem vínculo de arquivo",aguardando_registro:"Arquivo aguardando registro"};
  function render() {
    const filter=document.getElementById("situacao").value;
    const query=document.getElementById("busca").value.toLocaleLowerCase();
    const body=document.getElementById("conciliacao-linhas");body.replaceChildren();
    for(const row of rows.filter(r=>(!filter||r.situacao===filter)&&[r.nome,r.id,r.arquivo].join(" ").toLocaleLowerCase().includes(query))) {
      const tr=document.createElement("tr");
      const managed=lifecycle.get(row.id);
      for(const value of [row.nome,row.categoria_catalogo||row.grupo,[labels[row.situacao]||row.situacao,managed?.estado].filter(Boolean).join(" · "),row.id||"—",row.arquivo||"—"]) {
        const td=document.createElement("td");td.textContent=value;tr.append(td);
      }
      const action=document.createElement("td");
      if(row.normalizavel) {
        const normalize=document.createElement("button");normalize.type="button";normalize.className="ea-btn";normalize.textContent="Normalizar vínculo";
        normalize.addEventListener("click",async()=>{
          normalize.disabled=true;
          try {
            const response=await fetch(`${endpoint}/${encodeURIComponent(row.categoria_catalogo)}/${encodeURIComponent(row.id)}/normalizar`,{method:"POST"});
            const data=await response.json();
            if(!response.ok)throw new Error(data.detail||"Falha ao normalizar vínculo.");
            await load();
          }catch(error){status.textContent=error.message;normalize.disabled=false;}
        });action.append(normalize);
      } else {action.textContent="—";}
      const operation=!managed&&row.categoria_catalogo==="processadas"&&row.situacao==="sem_vinculo_arquivo"?"regularizar":managed?.estado==="resultado"?"publicar":null;
      if(operation){
        action.replaceChildren();
        const btn=document.createElement("button");btn.type="button";btn.className="ea-btn";
        btn.textContent=operation==="regularizar"?"Regularizar resultado":"Publicar no acervo";
        btn.addEventListener("click",async()=>{
          btn.disabled=true;status.textContent="Processando e verificando o arquivo…";
          try{await request(`/resultados/${encodeURIComponent(row.id)}/${operation}`,"POST");await load();}
          catch(error){status.textContent=error.message;btn.disabled=false;}
        });action.append(btn);
      }
      tr.append(action);
      body.append(tr);
    }
    if(!body.children.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="Nenhum item para este filtro.";tr.append(td);body.append(tr);}
  }
  async function load() {
    button.disabled=true;status.textContent="Consultando banco e arquivos…";rows=[];render();
    try {
      const response=await fetch(endpoint);
      // A página é /catalogo/conciliacao/pagina; a API é /catalogo/conciliacao.
      if(!response.ok)throw new Error("Não foi possível consultar o catálogo. Verifique sua sessão e a disponibilidade do banco.");
      const data=await response.json();
      const cycle=await request("/ciclo-vida");
      lifecycle=new Map(cycle.arquivos.map(r=>[r.recurso_sessao_id,r]));
      document.getElementById("retencao-dias").value=cycle.politica.dias_temporarios??"";
      rows=[...data.camadas,...data.arquivos.filter(r=>!r.registrada)];
      status.textContent=`${data.camadas.length} camadas registradas; ${data.arquivos_sem_registro} arquivos aguardando registro. ${data.escopo} ${data.erros_leitura.join("; ")}`;
      render();
    } catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  }
  button.addEventListener("click",load);
  document.getElementById("situacao").addEventListener("change",render);
  document.getElementById("busca").addEventListener("input",render);
  async function request(suffix,method="GET",body){
    const response=await fetch(endpoint+suffix,{method,headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
    const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==="string"?data.detail:"Não foi possível realizar a operação.");return data;
  }
  const retentionStatus=document.getElementById("retencao-status");
  const remove=document.getElementById("retencao-executar");
  document.getElementById("retencao-salvar").addEventListener("click",async()=>{
    const input=document.getElementById("retencao-dias");if(!input.reportValidity())return;
    remove.disabled=true;
    try{const data=await request("/retencao","PUT",{dias_temporarios:input.value===""?null:Number(input.value)});retentionStatus.textContent=data.dias_temporarios===null?"Retenção desativada.":`Prazo salvo: ${data.dias_temporarios} dias. A remoção exige execução manual ou agendada do comando de manutenção.`;}
    catch(error){retentionStatus.textContent=error.message;}
  });
  document.getElementById("retencao-previa").addEventListener("click",async()=>{
    remove.disabled=true;
    try{const data=await request("/retencao/previa");const list=document.getElementById("retencao-arquivos");list.replaceChildren();
      for(const path of data.arquivos){const li=document.createElement("li");li.textContent=path;list.append(li);}
      retentionStatus.textContent=`${data.quantidade} arquivos elegíveis. Nenhum arquivo removido.`;remove.disabled=data.quantidade===0;}
    catch(error){retentionStatus.textContent=error.message;}
  });
  remove.addEventListener("click",async()=>{
    if(!window.confirm("Remover os arquivos temporários elegíveis? As condições serão verificadas novamente; os registros e dados no banco serão preservados."))return;
    remove.disabled=true;
    try{const data=await request("/retencao/executar","POST");retentionStatus.textContent=`${data.quantidade} arquivos removidos.`;document.getElementById("retencao-arquivos").replaceChildren();await load();}
    catch(error){retentionStatus.textContent=error.message;}
  });
  load();
})();
