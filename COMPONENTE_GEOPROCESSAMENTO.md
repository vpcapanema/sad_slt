# Componente compartilhado de geoprocessamento

## Papel arquitetural

`geoespacial/_geoprocessamento.html` é a bancada compartilhada de algoritmos da
camada geradora de insumos. Ele será incorporado às páginas dos dois módulos
geradores:

1. geração das superfícies de risco e restrição;
2. geração da superfície de favorabilidade territorial.

O componente não executa a verificação de projetos, não calcula o ranking de
favorabilidade dos projetos e não realiza o ajuste fino. Essas responsabilidades
pertencem à camada consumidora de insumos e geradora de resultados.

## Níveis de composição

O componente trabalha com três níveis:

```text
algoritmo -> função -> fluxo
```

- **Algoritmo:** operação geoespacial atômica ligada a um endpoint individual.
- **Função:** sequência lógica reutilizável de algoritmos, com parâmetros fixos ou
  referências a entradas usando a sintaxe `$nome_da_entrada`.
- **Fluxo:** sequência lógica de funções e/ou algoritmos.

As funções e os fluxos podem ser criados, editados, validados, executados e
excluídos pela interface. Suas definições são persistidas em
`data/geoespacial/definicoes.json`.

## Princípio de implementação dos algoritmos

Os endpoints são adaptadores das bibliotecas Python adotadas. O sistema não deve
reimplementar algoritmos geoespaciais já existentes.

Bibliotecas utilizadas:

- GeoPandas e Shapely para operações vetoriais;
- Rasterio para rasterização, máscaras, reprojeção e persistência raster;
- NumPy para álgebra de mapas;
- SciPy para distância, interpolação e caminhos sobre matrizes;
- scikit-learn para densidade de kernel;
- PyKrige para krigagem;
- Pillow para previews raster usados pelo MapLibre.

## Endpoints individuais

Todos os algoritmos catalogados possuem endpoint próprio sob
`/api/geoespacial/operacoes`:

| ID | Endpoint |
| --- | --- |
| OP-01 | `/carregar-camada` |
| OP-02 | `/validar-camada` |
| OP-02-CORR | `/reparar-geometrias` |
| OP-03 | `/normalizar-camada` |
| OP-04 | `/criar-buffer` |
| OP-05 | `/sobrepor-camadas` |
| OP-06 | `/dissolver` |
| OP-07 | `/selecionar-por-localizacao` |
| OP-08 | `/converter-para-raster` |
| OP-10 | `/calcular-distancia` |
| OP-11 | `/calcular-distancia-ponderada` |
| OP-12 | `/calcular-densidade` |
| OP-13 | `/calcular-custo-acumulado` |
| OP-14 | `/interpolar-valores` |
| OP-15 | `/agregar-por-territorio` |
| OP-16 | `/criar-camada-booleana` |
| OP-17 | `/combinar-rasters` |
| OP-20 | `/normalizar-raster` |
| OP-21 | `/recortar-raster` |
| OP-22 | `/estatisticas-por-zona` |
| OP-23 | `/amostrar-raster-pontos` |
| OP-24 | `/extrair-valores-poligono` |
| OP-25 | `/exportar-camada` |
| OP-26 | `/exportar-raster` |
| OP-27 | `/salvar-camada` |

O endpoint genérico `/algoritmos/{id}/executar` permanece apenas como mecanismo de
compatibilidade e dispatcher interno. A interface executa os endpoints individuais.

## Catálogo da sessão

Camadas vetoriais e rasters usam o mesmo catálogo consumido pela interface e pelo
motor. Operações que produzem novos recursos registram suas saídas nesse catálogo.

Recursos auxiliares:

- `POST /api/geoespacial/camadas/upload`: upload de arquivos;
- `GET /api/geoespacial/camadas`: catálogo da sessão;
- `GET /api/geoespacial/camadas/{id}/geojson`: visualização vetorial;
- `GET /api/geoespacial/camadas/{id}/preview`: visualização raster;
- `GET /api/geoespacial/camadas/{id}/atributos`: tabela de atributos;
- `POST /api/geoespacial/camadas/{id}/calcular-campo`: cria ou atualiza um
  campo por expressão;
- `POST /api/geoespacial/camadas/{id}/consultar-atributos`: seleciona ou
  filtra feições por expressão;
- `POST /api/geoespacial/camadas/{id}/atualizar-fonte`: relê a fonte externa;
- `DELETE /api/geoespacial/camadas/{id}`: remoção do recurso;
- `POST /api/geoespacial/operacoes/salvar-camada`: persistência explícita.

Camadas de trabalho permanecem na sessão do backend. Produtos que precisam sobreviver
ao reinício devem ser persistidos explicitamente com OP-25, OP-26 ou OP-27. A
persistência e homologação dos produtos dos módulos geradores serão tratadas nas
páginas desses módulos.

## Funções e fluxos

Rotas disponíveis para os dois tipos de definição:

```text
POST   /api/geoespacial/{funcoes|fluxos}
GET    /api/geoespacial/{funcoes|fluxos}
GET    /api/geoespacial/{funcoes|fluxos}/{id}
PUT    /api/geoespacial/{funcoes|fluxos}/{id}
DELETE /api/geoespacial/{funcoes|fluxos}/{id}
POST   /api/geoespacial/{funcoes|fluxos}/{id}/validar
POST   /api/geoespacial/{funcoes|fluxos}/{id}/executar
```

Exemplo de passo de uma função:

```json
{
  "algoritmo_id": "OP-04",
  "parametros": {
    "camada_id": "$camada_entrada",
    "distancia_buffer": 100,
    "tipo_buffer": "externo"
  }
}
```

As saídas de um passo entram no contexto dos passos seguintes. Por exemplo, uma
operação que devolve `camada_id` permite que o próximo passo use `$camada_id`.

## Organização da interface

A bancada segue a lógica de composição do ArcGIS Pro, adaptada ao navegador:

- a faixa de opções organiza comandos por guia e por grupo;
- o painel esquerdo contém a árvore de Conteúdo e o Catálogo do projeto;
- o mapa é a área de trabalho central;
- o painel direito recebe ferramentas e páginas contextuais de configuração;
- Funções, Fluxos e Histórico são páginas próprias do painel direito.

O painel direito possui uma única barra de abas. **Propriedades**,
**Geoprocessamento**, **Funções**, **Fluxos** e **Histórico** são pares no mesmo
nível; não existe um título de painel acima delas funcionando como uma segunda
hierarquia. Selecionar uma camada ativa Propriedades, enquanto abrir uma ferramenta
ativa Geoprocessamento. Recolher e restaurar preserva a aba que estava ativa.

As abas são painéis acoplados lado a lado e todas possuem fechamento individual.
Comandos contextuais podem criar abas dinâmicas no mesmo tablist: **Tabela de
atributos** cria ou reutiliza `Atributos · {camada_id}`, com tooltip contendo o nome
completo. Várias tabelas podem coexistir; fechar uma aba dinâmica a remove, enquanto
abas fixas fechadas podem ser reabertas pelo menu **Exibir**. Quando não há espaço,
a própria faixa de abas rola horizontalmente sem criar um segundo nível.

Comandos que exigem parâmetros não usam caixas `prompt`. **Adicionar dados** e
**Adicionar WFS** compartilham o operador **Carregar camada** no painel direito: o
primeiro abre o operador com `tipo_entrada=Local` e controles para selecionar,
enviar e adicionar um ou mais arquivos ao mapa; o segundo abre o mesmo operador com
`tipo_entrada=WFS`, campo de URL e comando para conectar. O backend normaliza o tipo
de entrada sem diferenciar maiúsculas e minúsculas. **Basemap** abre o seletor de
mapas-base no mesmo local. A execução de funções e fluxos também solicita suas
entradas em uma página contextual.

Os parâmetros do `OP-01` seguem o padrão visual do painel de geoprocessamento do
ArcGIS Pro: título centralizado, retorno à esquerda, inclusão em função pelo ícone
de adição no cabeçalho, asterisco vermelho nos campos obrigatórios, caminho em caixa
de texto com botão de procura por pasta e ação primária **Executar** isolada no
rodapé. O formulário WFS usa a mesma hierarquia, substituindo o browse pelo campo URL.

Conteúdo, Catálogo e o painel direito podem ser recolhidos e restaurados. As árvores
de camadas, catálogo, grupos e subgrupos da Toolbox possuem expansão independente,
estado visual sincronizado por `aria-expanded` e redimensionamento automático do
mapa quando a disposição dos painéis muda.

Ao iniciar ou recarregar a página, os recursos do catálogo da sessão são reidratados
como fontes e camadas do mapa; portanto, um item não fica apenas listado em
**Conteúdo**. O painel apresenta símbolo conforme a geometria (ponto, linha, polígono
ou raster), checkbox sincronizado com a visibilidade e comando de zoom por camada.

A sincronização obedece à invariável **painel + mapa ou nenhum dos dois**. O catálogo
é reconciliado antes da renderização do painel, e somente recursos cuja fonte e
representação espacial foram criadas com sucesso entram em `state.layers`. Falhas
removem fontes e camadas parciais. Em uploads e resultados novos de algoritmos, a
falha espacial também desfaz o registro recém-criado no backend. A remoção executa o
caminho inverso e elimina o item dos dois lados na mesma atualização de interface.

## Comandos da faixa de opções

As quatro guias de `gp-ribbon-tabs` foram conectadas aos seguintes comportamentos:

- **Mapa:** adicionar dados locais ou WFS, escolher mapa-base, explorar, ajustar a
  extensão de todas as camadas ou da seleção, selecionar no mapa, limpar seleção,
  abrir a tabela de atributos e remover camada;
- **Análise:** abrir a Toolbox, executar ou cancelar a ferramenta ativa, consultar
  o histórico, configurar ambientes, validar entradas, salvar resultados e tornar
  um resultado visível no mapa;
- **Modelo:** criar, editar, validar e executar funções e fluxos, além de duplicar,
  importar e exportar suas definições JSON;
- **Dados:** consultar propriedades e atributos, calcular campos, selecionar por
  atributo, filtrar temporariamente a representação espacial, reprojetar, reparar,
  exportar, salvar, atualizar a fonte e remover a camada.

A seleção operacional pertence ao painel **Conteúdo** e permanece ativa ao navegar
entre abas do painel direito ou ao inspecionar itens do Catálogo. Comandos que
dependem de camada informam a ausência de seleção em vez de falharem silenciosamente.
Os ambientes ficam no armazenamento local do navegador e são aplicados somente a
parâmetros reconhecidos pela ferramenta aberta. Durante uma execução, a interface
exibe progresso, bloqueia novo envio e permite cancelamento com `AbortController`.
O Histórico registra status, duração, parâmetros e resultado de cada execução.

## Integração futura com as páginas geradoras

O componente emite eventos DOM para a página hospedeira:

- `slt:geoprocessamento:pronto`;
- `slt:geoprocessamento:recurso-importado`;
- `slt:geoprocessamento:resultado`.

A página geradora poderá escutar esses eventos para associar camadas produzidas a
fontes, critérios, pacotes ou superfícies, sem transferir essas regras metodológicas
para o componente genérico.

## Verificação da implementação

Em 2026-07-13 foram verificados:

- inicialização da API e exposição dos 25 endpoints individuais;
- importação, catálogo, GeoJSON, atributos e preview raster;
- execução controlada de todos os operadores catalogados;
- criação, validação e execução de função;
- criação e execução de fluxo;
- restauração de definições após reinício do servidor;
- carregamento da página em Chromium com 25 algoritmos e sem erros JavaScript;
- abertura contextual de WFS e mapa-base no painel direito;
- colapsagem e restauração dos painéis esquerdo e direito;
- expansão e recolhimento de Conteúdo, Catálogo e Toolbox.
- rollback de upload quando a criação da representação espacial falha, mantendo a
  mesma contagem no backend, no painel Conteúdo e no mapa.
- percurso automatizado em Chromium pelos 40 botões das guias Mapa, Análise, Modelo
  e Dados, com 44 verificações de estado e console sem erros;
- execução real pelo comando **Executar**, cancelamento, aplicação de ambientes e
  registro detalhado no Histórico;
- cálculo de campo, seleção por atributo, filtro e limpeza de filtro, atualização
  da fonte e manutenção da seleção operacional ao trocar de painel.

Os testes automatizados de catálogo, rasterização/combinação/preview e execução de
função estão em `tests/test_geoprocessamento.py` e podem ser executados com:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_geoprocessamento -v
```

As páginas dos módulos geradores e dos módulos consumidores não fazem parte desta
etapa de implementação.
