# Visualizador: revisão de carregamento e responsividade

Revisão de 09/10/2026 da página `/restrict/geoespacial/visualizador-camadas/`.
Alterações de código e testes locais; nenhuma publicação, migração ou edição de dados.

## Inventário e escopo de revisão

Os arquivos próprios abaixo foram lidos integralmente, incluindo a herança Jinja,
os componentes incluídos e os imports CSS transitivos locais:

- `templates/paginas/geoespacial/visualizador-camadas.html`
- `templates/bases/base_painel_mapa.html`
- `templates/componentes/navbar_painel_restrita.html`
- `templates/componentes/navbar_modulo/geoprocessamento.html`
- `templates/componentes/navbar_modulo/_barra.html`
- `templates/componentes/footer.html`
- `geoespacial/geoespacial-visualizador-camadas.js`
- `geoespacial/visualizador-progresso.js`
- `geoespacial/visualizador-progresso.css`
- `assets/js/geoespacial-map.js`
- `assets/js/painel-layer-filter.js`
- `assets/js/status-colors.js`
- `assets/js/template-base.js`
- `assets/js/table-sort.js`
- `assets/css/app.css`
- `assets/css/geoespacial.css`
- `assets/css/geoespacial-painel-mapa.css`
- `assets/css/template-painel-mapa.css`
- `assets/css/navbar-modulo.css`
- `assets/css/sidebar-layout.css`
- `assets/css/sidebar-theme.css`
- `assets/css/painel-layers.css`

Bibliotecas de terceiros foram inventariadas e sua integração foi verificada
em navegador com a versão instalada. Não houve auditoria semântica integral
dos bundles minificados nem refatoração de código de terceiros:

| Biblioteca | Versão instalada | Arquivo | Bytes |
| --- | --- | --- | ---: |
| MapLibre GL JS | 3.6.2 | `assets/vendor/maplibre-gl/maplibre-gl.js` | 762831 |
| MapLibre CSS | distribuição local | `assets/vendor/maplibre-gl/maplibre-gl.css` | 63722 |
| Font Awesome Free | 6.5.2 | `assets/vendor/fontawesome/css/all.min.css` | 103017 |

As fontes Font Awesome são carregadas dos arquivos locais em `webfonts/`;
`app.css` também importa Montserrat e Roboto do Google Fonts.
Fontes, imagens da marca e imagens embutidas em CSS não executam o fluxo de camadas.
Os provedores de basemap são OpenStreetMap, OpenFreeMap e Esri World Imagery.

## Problemas identificados e alterações

1. **Fila travada após as primeiras seis camadas.** `mapReady()` aguardava novamente
   o evento `load` quando novas fontes tornavam `isStyleLoaded()` falso. O evento
   inicial ocorre uma vez. Agora a prontidão inicial é uma promessa compartilhada,
   registrada imediatamente após criar o mapa e reutilizada por toda a fila.
2. **Atualizações DOM excessivas.** Cada evento de tile e desenho fazia consultas
   repetidas na árvore, inclusive buscas de descendentes para cada grupo. Agora
   existe índice estrutural de linhas, controles e descendentes; alterações apenas
   no texto das barras não o invalidam. Eventos são agrupados em um update por frame,
   incluindo a espera pelo desenho. O encerramento faz update final síncrono.
3. **Recarga com pico de requisições.** A restauração lançava todas as tarefas de uma
   vez. Há fila global de até seis consultas de metadados/preview e seis tarefas de
   restauração. Todas as camadas selecionadas são executadas; não há limite de total.
   MapLibre continua responsável pelo agendamento dos tiles da área visível.
4. **Bloqueio inicial por mapas-base externos.** Dois estilos vetoriais eram baixados
   sequencialmente antes de criar o mapa e consultar o catálogo. Os estilos agora
   são carregados quando selecionados; catálogos e filtros começam em paralelo.
5. **Recarga individual volumosa.** Demandas agora consultam `?codigo=` para obter
   somente o registro selecionado, mantendo seu GeoJSON integral.
6. **Trabalho repetido no mapa/legenda.** Mudanças de visibilidade sem alteração de
   estado são ignoradas; o desenho da legenda é agrupado por frame. Seleções em grupo
   não abrem o painel de detalhes repetidamente para cada item.
7. **Nomes sobre os controles.** A linha usa colunas próprias para checkbox, nome e
   ações, com largura mínima zero e elipse para nomes longos. Barras só aparecem
   durante carregamento. Espaçamento entre grupos e gradiente amarelo/âmbar permanecem.

Esta refatoração não adiciona simplificação, remoção de vértices, redução de coordenadas, alteração
de CRS persistido ou alteração dos arquivos de origem. O visualizador passa
`tolerance: 0` na fonte GeoJSON para também evitar a simplificação visual padrão
desse tipo de fonte. O componente compartilhado oferece essa opção sem mudar o
padrão das demais páginas.

## Verificação

Os testes de navegador cobrem progresso baseado em fonte desenhada, fontes com erro,
progresso de camada/pasta/grupo, seleção de 95 camadas, interrupção da fila, filtros,
recarga individual, preservação das demais fontes e 94 pins em MapLibre real.
`tests/browser/visualizador-performance.cjs` inclui a regressão de `load` emitido
uma única vez e uma rajada de 200 eventos com 500 linhas, durante a espera pelo mapa.
Nesse teste, a rajada reutiliza o índice sem nenhuma chamada a `querySelectorAll`;
as 94 consultas são todas concluídas, com no máximo seis em paralelo.

O tempo da rajada mais espera do próximo frame variou de aproximadamente 6 a 19 ms
nas execuções locais. Isso não é medição de download real nem comparação de tempo
total antes/depois em produção; não há baseline preservada dessa parte da interface.

## Referências primárias e limites

- [API MapLibre Map](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/):
  eventos de fonte/desenho, `isSourceLoaded` e APIs do mapa. As APIs `setGlyphs` e
  `setSprite` foram verificadas também na versão local 3.6.2, em navegador.
- [OGC API Features, Part 1 Core](https://docs.ogc.org/is/17-069r4/17-069r4.html):
  referência de acesso a objetos geoespaciais por HTTP. Esta revisão não certifica
  conformidade OGC nem substitui os endpoints internos por uma API OGC completa.

Os rasters de saída continuam utilizando o preview já existente da plataforma;
a refatoração não altera sua resolução ou qualidade. A navegação atual do Storage
publica camadas vetoriais; expandir seu contrato para rasters exige trabalho próprio.
Falhas HTTP 503 representam indisponibilidade do backend: a melhoria da interface
não permite atribuir retrospectivamente sua causa sem evidência de servidor.

## Backend e medições complementares

- `api/repositories/cadastro_geometria_repository.py`: consulta pontual por código,
  parametrizada, e uma única transformação de coordenadas na consulta de visualização.
- `api/repositories/painel_repository.py`: projeção exclusiva dos campos dos filtros,
  com as mesmas consultas e relações do painel. Uma consulta SQL reúne os três tipos.
- `api/routers/geoespacial.py`: novo endpoint autenticado `/cadastro-filtros`, código
  opcional em `/cadastro-geometrias/{tipo}` e log de exceção nas consultas de cadastro.
- `api/services/storage_geoespacial.py`: reutilização dos metadados da listagem remota,
  evitando pedir a mesma pasta novamente para cada arquivo. Não há cache de diretório
  que impeça visualizar arquivos novos na atualização.

A consulta antiga dos filtros transportava 14.079.449 bytes JSON; a nova transportou
49.539 bytes para os mesmos 113 registros. Todos os campos foram comparados com a
resposta anterior e são idênticos. `EXPLAIN VERBOSE` confirmou que o PostgreSQL
elimina as expressões espaciais dessa projeção; não executa `ST_Transform` nos filtros.

Na recarga pontual de projeto, a resposta passou de 446.494 bytes (94 registros) para
4.731 bytes (um registro). Medição de leitura: 0,382 s para o conjunto e 0,046 s para
um registro. O conjunto dos 94 registros foi comparado integralmente antes/depois:
geometrias, coordenadas, atributos e posições preservados. São medidas locais de
uma execução; rede, cache e tamanho dos dados variam.

A contagem real de `base-geoespacial` manteve 29 camadas e três pastas. Duas execuções
em processos separados levaram 9,255 s antes e 8,127 s depois; não se trata de benchmark
controlado. O teste com 29 arquivos multicamadas confirma somente duas listagens
remotas (raiz e subpasta), sem relistar por arquivo e com contagens exatas.

`tests/browser/visualizador-integrado.cjs` renderiza o template Jinja verdadeiro,
carrega todos os estilos e scripts locais e usa MapLibre real com APIs/tiles de teste.
Confirma 94 camadas, 94 pins, ausência de sobreposição e overflow horizontal, barras
ocultas após desenho, recarga de um registro e preservação da geometria. A execução
observada levou aproximadamente 4,2 s, incluindo navegação e recarga pontual; não é
medição da página autenticada usando a rede e o Storage reais.

Os testes Python de armazenamento cobrem tiles MVT, arquivos vetoriais multicamadas,
contagens, origem somente leitura e preview raster sem alteração do arquivo original.
A prontidão do servidor local mostrou conexão saudável no momento da investigação;
os HTTP 503 do log anterior não foram reproduzidos nem declarados resolvidos.

## Seleção de feições e feedback no mapa

O cursor inicial é a seta de seleção. O arraste continua nativo do MapLibre:
`dragstart` mostra o cursor de arraste e `dragend` restaura a seta. Um clique
consulta somente as camadas vetoriais visíveis do visualizador, excluindo basemap,
rasters e o próprio destaque. A feição superior no ponto clicado é destacada e
seus atributos publicados aparecem na aba Detalhes, com expansão do painel.
Os pins de projetos também selecionam sua feição correspondente.

O destaque usa uma fonte de apresentação independente; não modifica a feição
original e desaparece quando sua camada é ocultada/removida. Feições de tiles
MVT possuem geometria da representação renderizada, enquanto os atributos
mostrados são os publicados pela fonte. Nenhum processamento é gravado nos dados.

A antiga legenda de aviso é agora feedback acessível (`role=status`, `aria-live`),
com orientação, início/conclusão de operações, seleção e clique sem feição.
Fica acima da escala gráfica e fora dos botões de navegação. O teste integrado
verifica clique real de mouse, atributo da feição selecionada, painel expandido,
destaque, cursores e ausência de interseção entre feedback e escala.
