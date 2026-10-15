from pathlib import Path
def edit(name, old, new):
 p=Path(name); s=p.read_text(encoding='utf-8'); assert old in s, (name,old); p.write_text(s.replace(old,new),encoding='utf-8')
root='geoespacial/extracao-atributos/'
edit(root+'lote.js',"if(erro)pendencias.push", "if(erro&&selecionadas.has(layer.id))pendencias.push")
edit(root+'lote.js',"else selecionadas.delete(layer.id);};", "else selecionadas.delete(layer.id);renderLote(state,changed);};")
edit(root+'lote.js'," const pronta=entries.length>0&&!pendencias.length;", " const escolhidas=entries.filter(e=>selecionadas.has(e.layer.id));\n const pronta=escolhidas.length>0&&!pendencias.length;")
edit(root+'lote.js',"const confirmed=entries.length>0&&entries.every", "const confirmed=escolhidas.length>0&&escolhidas.every")
edit(root+'lote.js',"!pronta?pendencias.join(' ')","!escolhidas.length?'Selecione as camadas que deseja confirmar.':!pronta?pendencias.join(' ')")
p=Path(root+'lote.js');s=p.read_text(encoding='utf-8');i=s.index(' confirm.onclick=');j=s.index('\nexport function validarLote',i);s=s[:i]+s[i:j].replace('entries','escolhidas')+s[j:];p.write_text(s,encoding='utf-8')
edit(root+'app.js','function syncMap() {',"""async function restaurarSaidas(value){
  for(const saida of Object.values(value.camadas||{}))if(saida.bancada)descritorOriginal(saida.bancada);
  if(Object.values(value.camadas||{}).some(c=>c.bancada))state.bancadaResultados=copiarSaidas(value,state.bancadaResultados,state.bancadaResultados.map(c=>c.color));
  assinaturaExecucao=assinaturaDe(request());
  syncMap();
  const novas=state.bancadaResultados.filter(c=>c.execucaoId===value.id);
  if(novas.length)await map.enquadrar(novas.map(c=>c.id),limitesSaidas(novas));
}
function syncMap() {""")
edit(root+'app.js','registrarResultado(state.result);results.set(state.result);syncMap();','registrarResultado(state.result);results.set(state.result);await restaurarSaidas(state.result);')
edit(root+'territorial.js',"combinacao:'e'}", "combinacao:'e',ordenar_por:'',descendente:false}")
edit(root+'territorial.js','ordenarPor=id;draw();','ordenarPor=id;change({ordenar_por:id,descendente:!crescente});')
edit(root+'territorial.js',"const ordered=[...data.linhas].sort((a,b)=>(crescente?1:-1)*(sortCol?cell(a,sortCol).localeCompare(cell(b,sortCol),'pt-BR',{numeric:true}):nomeDemanda(a).localeCompare(nomeDemanda(b),'pt-BR',{numeric:true})));",'const ordered=data.linhas;')
edit(root+'territorial.js',"q('[data-action=\"reset\"]').onclick=()=>{state=initial();", "q('[data-action=\"reset\"]').onclick=()=>{ordenarPor='';crescente=true;state=initial();")
edit('api/routers/extracao_atributos.py',"class ConsultaIntersecoes(BaseModel):", "class ConsultaIntersecoes(BaseModel):\n    ordenar_por: str = Field(default='', max_length=2000)\n    descendente: bool = False")
edit('api/services/extracao_resultados_territoriais.py',"filtros=None, combinacao='e'):","filtros=None, combinacao='e', ordenar_por='', descendente=False):")
edit('api/services/extracao_resultados_territoriais.py',"    pagina = min(pagina, max(0, (len(items)-1)//tamanho))", """    from api.services.extracao_ordenacao import chave_ordenacao
    def valor_ordem(item):
        if not ordenar_por:
            return item['nome_demanda']
        if ordenar_por in TIPOS:
            return {'com': 'Sim', 'sem': 'Não', 'nao_avaliado': 'Não avaliado', 'nao_informado': 'Não informado'}.get(item['estados'].get(ordenar_por), '')
        try:
            cat, campo = json.loads(ordenar_por)
        except (ValueError, TypeError):
            return item['nome_demanda']
        valores = [snapshot['areas'][aid]['atributos'].get(campo) for aid in item['areas'] if snapshot['areas'][aid]['categoria'] == cat]
        return valores[0] if len(valores) == 1 else ' · '.join(str(v) for v in valores if v is not None)
    items.sort(key=lambda item: chave_ordenacao(valor_ordem(item)), reverse=descendente)
    pagina = min(pagina, max(0, (len(items)-1)//tamanho))""")
