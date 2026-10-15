"""Inventário auditável de controles próprios; não executa nem modifica a aplicação."""
import json
import re
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parent.parent
template = ROOT / 'templates/componentes/_geoprocessamento.html'
html = template.read_text(encoding='utf8')

class Buttons(HTMLParser):
    def __init__(self):
        super().__init__(); self.items=[]; self.current=None
    def handle_starttag(self, tag, attrs):
        if tag == 'button':
            self.current={'attributes':dict(attrs),'text':''}
    def handle_data(self,data):
        if self.current is not None:self.current['text']+=data
    def handle_endtag(self,tag):
        if tag=='button' and self.current is not None:
            self.current['text']=self.current['text'].strip();self.items.append(self.current);self.current=None

parser=Buttons();parser.feed(html)
scripts=[]
for url in re.findall(r'<script[^>]+src="([^"]+)"',html):
    if '/vendor/' in url:continue
    local=url.split('?')[0].replace('/restrict/geoespacial/','/geoespacial/').lstrip('/')
    source=(ROOT/local).read_text(encoding='utf8')
    scripts.append({'file':local,'lines':len(source.splitlines()),
        'control_attributes':sorted(set(re.findall(r'data-(?:[a-z]+-)*(?:action|command|close|toggle|save|cancel|apply|edit|delete|remove|select|back|run|field|param|panel|tab|page|layer|type|option)[a-z-]*',source)))})

groups=[
 {'group':'Mapa e camadas','controls':['import-file','import-wfs','load-system','basemap','explore','select','clear','fit','fit-selection','attributes','properties','remove','delete-layer','layer/group visibility','layer zoom'],
  'expected':'Importar requer confirmação de persistência; carregar/visualizar não cadastra implicitamente; explorar identifica sem selecionar; remover só retira do mapa; excluir atua apenas no catálogo e exige confirmação.',
  'actual':'Handlers main/actions/ribbon/commands/bancada-arquivos. Remover/excluir bloqueados com rascunho. Temporários usam fonte privada por token; raster do storage tem prévia própria. WFS preenche campo após criar formulário.'},
 {'group':'Tabela de atributos','controls':['maximize','all','clear','zoom','invert','only','edit','delete','undo','redo','csv','discard','save','query','layer tabs','pagination'],
  'expected':'Seleção sincronizada por identidade estável; edição sem gravação até Salvar; Descartar restaura; seleção/inversão/CSV devem anunciar alcance real.',
  'actual':'Tabulator: arquivos nativos paginados, seleção de outras páginas preservada; rótulos declaram página. Consulta global da faixa Dados permanece separada. Editar/excluir bloqueados em temporários e fontes não editáveis. Descartar pede confirmação; atualização não apaga rascunhos; undo/redo restaura exclusões por FID.'},
 {'group':'Geometria','controls':['start','save','cancel','Point','LineString','Polygon','vertices','delete','apply','revert','undo','redo'],
  'expected':'Separar esboço da edição persistida; Salvar grava original com revisão; cancelar/descartar não grava; não editar geometria generalizada de tile.',
  'actual':'bancada-arquivos abre geometria integral selecionada; revisão protege gravação; temporários exigem importação para edição; edição de atributos pendente impede atualização/calculadora.'},
 {'group':'Ferramentas e resultados','controls':['run','cancel','validate','repair','reproject','export','save-result','add-result','history','environments','calculate-field','select-attribute','filter-layer','refresh-source','download-json','close-result'],
  'expected':'Parâmetros coerentes com tipo da camada e escopo; cancelamento real; resultados concluídos preservados.',
  'actual':'Motor/API reais exercitados com dados sintéticos. Jobs de modelos/fluxos cancelam entre etapas e preservam resultados parciais, responsável e execução. Upload não anuncia cancelamento seguro inexistente. Atualizar exige resolver edições pendentes.'},
 {'group':'Simbologia','controls':['symbol type','field','ramp','classify','category remove','class colors/labels/breaks','apply','save','cancel'],
  'expected':'Contorno de polígono obedece espessura/tracejado; classificação lê fonte correta; cancelar restaura; persistência deve ser identificada.',
  'actual':'Contorno usa camada line inclusive Polygon; opacidade rotulada corretamente; classificação autenticada para storage/temporários lê só atributo; respostas antigas descartadas; Salvar informa navegador; método aproximado não anuncia Jenks exato.'},
 {'group':'Pastas do storage','controls':['criar','renomear','excluir','atualizar','salvar','cancelar','breadcrumbs','open folder','keyboard navigation'],
  'expected':'Escolher pasta não grava arquivo; mutações apenas pasta indicada, confirmar exclusão; resultado atrasado não muda destino atual.',
  'actual':'Botão Selecionar pasta explicita retorno; gerações descartam respostas atrasadas; envio duplicado bloqueado; backend existente valida pasta vazia para renomear/excluir.'},
 {'group':'Modelos, catálogo, portal, painéis','controls_reference':'outputs/auditoria-bancada-modelos-controles.json',
  'actual':'Inventário complementar contém seletores e controles dinâmicos. Inputs numéricos aceitam literal finito ou referência anterior; seleção múltipla preservada; operações assíncronas têm tratamento de erro.'},
 {'group':'Feedback compartilhado','controls_reference':'outputs/bancada-feedback-auditoria.md',
  'actual':'Ocultar conserva acompanhamento; fechar encerra; baixar relatório continua funcional após primeiro clique; confirmar/cancelar segue estado da operação.'}
]
report={'scope':str(template.relative_to(ROOT)),'method':'Leitura de fontes próprias distribuída entre agentes; rastreamento rótulo/handler/API; testes sintéticos de regressão. Não significa teste manual de toda combinação ou auditoria de bibliotecas vendor.',
 'static_template_buttons':parser.items,'linked_own_scripts':scripts,'reviewed_groups':groups,
 'arcgis_references':[
 'https://doc.esri.com/en/arcgis-pro/latest/help/editing/save-or-discard-edits.html',
 'https://doc.esri.com/en/arcgis-pro/latest/help/data/databases/unique-identifier-fields-in-database-tables.html',
 'https://pro.arcgis.com/en/pro-app/3.0/help/data/tables/select-records-in-a-table-interactively.htm',
 'https://pro.arcgis.com/en/pro-app/3.6/help/data/tables/view-all-or-only-the-selected-records.htm',
 'https://pro.arcgis.com/en/pro-app/3.3/help/mapping/layer-properties/polygon-symbols.htm',
 'https://pro.arcgis.com/en/pro-app/3.6/help/analysis/geoprocessing/modelbuilder/run-a-model.htm'],
 'limits':['Documentação consultada por fluxo; não toda a documentação ArcGIS Pro.',
 'Nenhum deploy e nenhuma gravação no banco oficial durante testes.',
 'Temporários locais são leitura; importar explicitamente antes de editar/calcular na bancada.',
 'Ações da tabela nativa operam na página anunciada; consulta global na faixa Dados limita resultados a 1000 e recusa truncamento.',
 'Cancelar modelo aguarda algoritmo em andamento; não reverte saídas concluídas.',
 'Disponibilidade de portais externos não foi exercitada ao vivo.']}
(ROOT/'outputs/auditoria-bancada-controles.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'template_buttons':len(parser.items),'own_scripts':len(scripts),'groups':len(groups)}))
