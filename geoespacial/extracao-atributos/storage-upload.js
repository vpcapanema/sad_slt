/* A subseção 1.2 envia ao storage com o cliente nativo; a bancada só muda
   posteriormente, pelo botão Confirmar bases. Senhas nunca chegam ao navegador. */
import { $, el, feedback } from './ui.js';
import { base, json, post } from './api.js';

export function criarUploadStorage(state, lista, render){
  const botao=$('#ea-base-local-upload'),status=$('#ea-base-local-upload-status');
  let aberto=false,pendentes=null;
  const retomar=el('button','Classificar arquivos enviados','ea-btn');retomar.type='button';retomar.hidden=true;
  status.after(retomar);
  function informar(texto,tipo='info'){status.hidden=true;status.textContent='';feedback(texto,tipo);}
  function marcar(){botao.disabled=state.busy||state.uploading||aberto;retomar.disabled=state.busy||aberto;}
  function dialogo(titulo){
    const d=el('dialog',undefined,'ea-tool-dialog ea-storage-upload-dialog');
    const h=el('h2',titulo);h.id='ea-storage-upload-title';d.setAttribute('aria-labelledby',h.id);d.append(h);
    document.body.append(d);d.showModal();return d;
  }
  async function classificar(){
    if(!pendentes||aberto)return;
    aberto=true;marcar();
    const d=dialogo('Escolher categoria das camadas enviadas');
    const info=el('p',`${pendentes.arquivos.length} arquivo(s) salvo(s) no storage. Escolha a categoria para adicionar as bases à lista pendente.`);
    const avisos=el('p');avisos.hidden=true;
    if(pendentes.avisos.length)informar(pendentes.avisos.join(' '),'warning');
    const nomes=el('ul');for(const camada of pendentes.camadas)nomes.append(el('li',camada.nome));
    const label=el('label','Categoria das bases');label.htmlFor='ea-upload-category';
    const select=el('select');select.id='ea-upload-category';select.required=true;
    const erro=el('p','','ea-hint');erro.setAttribute('role','status');
    const tentar=el('button','Atualizar categorias','ea-btn');tentar.type='button';
    const adicionar=el('button','Adicionar à lista da categoria','ea-btn ea-btn-primary');adicionar.type='button';adicionar.disabled=true;
    const fechar=el('button','Classificar depois','ea-btn');fechar.type='button';
    function encerrar(){d.close();d.remove();aberto=false;marcar();}
    function preencher(){
      select.replaceChildren(new Option('Selecione uma categoria',''));
      for(const c of state.categories)select.add(new Option(c.nome,c.id));
      adicionar.disabled=true;
      if(!state.categories.length)informar('Categorias indisponíveis. Atualize para continuar; os arquivos já estão no storage.','warning');
    }
    select.onchange=()=>{adicionar.disabled=!select.value||!pendentes.camadas.length;};
    tentar.onclick=async()=>{
      tentar.disabled=true;
      try{const dados=await json('/extracao-atributos/catalogo');state.categories=dados.categorias;preencher();}
      catch(e){informar(e.message,'error');}finally{tentar.disabled=false;}
    };
    adicionar.onclick=()=>{
      const categoria=state.categories.find(c=>c.id===select.value);
      if(!categoria||!pendentes.camadas.length)return;
      for(const layer of pendentes.camadas){
        const existente=state.catalog.find(c=>c.id===layer.id);
        if(existente)Object.assign(existente,layer);else state.catalog.push(layer);
      }
      const total=lista.adicionar(pendentes.camadas.map(c=>c.id),categoria.id);
      pendentes=null;retomar.hidden=true;encerrar();render();
      informar(`${total} base(s) adicionada(s) à lista de ${categoria.nome}. Confirme a lista para validar as camadas e enviá-las à prévia.`,'success');
    };
    fechar.onclick=()=>{retomar.hidden=false;encerrar();};
    d.addEventListener('cancel',e=>{e.preventDefault();fechar.click();});
    const acoes=el('div',undefined,'ea-dialog-actions');acoes.append(tentar,fechar,adicionar);
    d.append(info,avisos,nomes,label,select,erro,acoes);preencher();select.focus();
  }
  retomar.onclick=classificar;
  botao.addEventListener('click',async()=>{
    if(state.busy||state.uploading||aberto)return;
    aberto=true;state.uploading=true;marcar();
    const autenticacao=window.SLTFeedback.carregamento(document.querySelector('#ea-base-form'),'Abrindo envio ao storage…');
    autenticacao.passo('Verificando o perfil da sessão SICARD e autenticando no storage…');
    let sessao;
    try{sessao=(await post('/extracao-atributos/storage-upload/sessoes',{})).sessao;}
    catch(e){aberto=false;state.uploading=false;marcar();autenticacao.concluir({type:e.status===403?'warning':'error',message:e.message});return;}
    autenticacao.fechar();
    const rota=`/extracao-atributos/storage-upload/sessoes/${encodeURIComponent(sessao)}`;
    const d=dialogo('Enviar camadas de base ao storage');
    const info=el('p','Destino: base-geoespacial. Selecione os arquivos no modal do storage e confirme o envio. A categoria será solicitada ao concluir.');
    const iframe=el('iframe');iframe.title='Upload nativo do storage SICARD';
    iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms');
    iframe.src=`${base}${rota}/cliente/web/client/files?path=%2Fbase-geoespacial`;
    const erro=el('p','','ea-hint');erro.setAttribute('role','status');
    const concluir=el('button','Conferir arquivos enviados','ea-btn');concluir.type='button';
    const fechar=el('button','Fechar','ea-btn');fechar.type='button';
    const acoes=el('div',undefined,'ea-dialog-actions');acoes.append(fechar,concluir);
    d.append(info,iframe,erro,acoes);
    let enviando=false,lendo=false,encerrado=false,progressoUpload,erroMensagem='',erroTempo;
    function encerrar(){
      if(encerrado)return;encerrado=true;window.removeEventListener('message',mensagem);
      d.close();d.remove();aberto=false;state.uploading=false;marcar();
      json(rota,{method:'DELETE'}).catch(()=>{});
    }
    async function conferir(saindo=false){
      if(enviando||lendo)return;
      lendo=true;concluir.disabled=true;fechar.disabled=true;
      const processo=progressoUpload||window.SLTFeedback.processo('Conferindo arquivos enviados');progressoUpload=null;
      processo.passo('Validando as camadas disponíveis no storage…');
      try{
        const dados=await json(`${rota}/resultado`);processo.fechar();
        if(dados.arquivos.length){
          pendentes=pendentes?{...dados,arquivos:[...new Set([...pendentes.arquivos,...dados.arquivos])],
            camadas:[...new Map([...pendentes.camadas,...dados.camadas].map(c=>[c.id,c])).values()],avisos:[...pendentes.avisos,...dados.avisos]}:dados;
          if(!dados.camadas.length&&!saindo){informar(dados.avisos.join(' ')||'Nenhuma camada vetorial disponível. Confira os arquivos enviados.','warning');return;}
          encerrar();retomar.hidden=false;classificar();
        }else if(saindo){encerrar();informar('Envio encerrado. Nenhum arquivo foi adicionado à lista.');}
        else informar('Nenhum envio concluído. Selecione os arquivos e confirme o envio no modal do storage.','warning');
      }catch(e){processo.fechar();informar(e.message,'error');if(saindo)encerrar();}
      finally{lendo=false;concluir.disabled=enviando;fechar.disabled=enviando;}
    }
    function mensagem(e){
      if(e.origin!==location.origin||e.source!==iframe.contentWindow)return;
      if(e.data?.tipo==='sicard-storage-enviando'){enviando=Boolean(e.data.ativo);if(enviando&&!progressoUpload){progressoUpload=window.SLTFeedback.processo('Enviando camadas ao storage');progressoUpload.passo('Transferindo arquivos pelo cliente do storage…');}fechar.disabled=enviando;concluir.disabled=enviando;}
      if(e.data?.tipo==='sicard-storage-concluido')conferir();
      if(e.data?.tipo==='sicard-storage-cancelado')conferir(true);
      if(e.data?.tipo==='sicard-storage-erro'){
        // A ponte emite o erro genérico (axios) e o específico (#errorMsg) quase juntos: agrupa e mostra um só.
        erroMensagem=e.data.mensagem||erroMensagem;clearTimeout(erroTempo);
        erroTempo=setTimeout(()=>{
          progressoUpload?.concluir({type:'error',message:erroMensagem||'Falha no envio ao storage.'});progressoUpload=null;
          informar(erroMensagem||'Falha no envio ao storage. Os arquivos já enviados podem ser recuperados em Conferir arquivos enviados.','error');erroMensagem='';
        },400);
      }

    }
    window.addEventListener('message',mensagem);
    concluir.onclick=()=>conferir();fechar.onclick=()=>conferir(true);
    d.addEventListener('cancel',e=>{e.preventDefault();if(!enviando)conferir(true);});
  });
  return {render:marcar};
}
