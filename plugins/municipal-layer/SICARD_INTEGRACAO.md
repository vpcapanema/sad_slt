# Integração com o extrator SICARD

O ZIP original permanece em `plugins/municipal-layer-completo-v1.0.0.zip`. A cópia extraída mantém banco e malha originais. O manifesto original verifica o ZIP, não os arquivos de código adaptados nesta cópia.

> Desde a migration 106 o SICARD não lê mais `data/catalog.sqlite` nem
> `data/municipios.gpkg` em operação. Esses arquivos passaram para o schema
> `base_municipal` do PostgreSQL, carregado por
> `scripts/carregar_base_municipal.py`. O pacote continua sendo a origem dos
> insumos e do componente React compilado; o servidor standalone em `server/app.py`
> segue funcionando por conta própria, mas não participa mais da execução do SICARD.

Na configuração do extrator, escolha uma categoria e abra **Gerar camada municipal desta categoria**. O componente React original permite selecionar indicadores de fontes e anos distintos. Não há correspondência oficial categoria/indicador no pacote: a categoria identifica o destino conceitual, e o usuário escolhe os atributos; nenhum filtro temático implícito oculta indicadores.

O hospedeiro usa `client`, `download=false` e `onExport`. A API autenticada fica em `/api/geoespacial/extracao-atributos/municipal/{categoria}/{catalog|preview|export}`. A exportação é feita por `api/services/base_municipal.py` sobre o schema `base_municipal`, materializa geometria e atributos e reabre o arquivo com GDAL. GeoPackage, FlatGeobuf e Shapefile preservam os limites do plugin. O botão usa o texto **Gerar camada** quando o download é desativado.

Cada geração recebe uma pasta exclusiva em `data/geoespacial/uploads/datastorage/vetor/municipal_<execucao>/`, contendo a camada, o dicionário e os metadados. A escolha deste destino atende à integração com o acervo solicitada para este gerador. O banco registra a camada importada, categoria, execução, caminho, componentes e hashes; não recebe cópia das feições. A extração lê esta base municipal diretamente do arquivo, inclusive após reiniciar a aplicação.

O nome da camada é montado como categoria, fonte majoritária da seleção e data da geração, no fuso de São Paulo. O campo de nome abre vazio e exibe a convenção como sugestão; texto digitado prevalece.

A resposta de geração contém o ZIP real do plugin e os cabeçalhos `X-Camada-Arquivo` e `X-Camada-Id`. O hospedeiro usa esses identificadores para ler a representação pelo GDAL e adicionar a base à categoria selecionada e à bancada. Falhas de leitura posteriores ao salvamento não apagam a camada; ela continua disponível pelo explorador. Não há troca automática das bases existentes: cada nova geração cria uma camada.

## Build

Dentro de `plugins/municipal-layer`:

```powershell
npm ci
npm run build
npx vite build --config vite.sicard.config.js
```

O último comando compila React e o adaptador `sicard/` em `geoespacial/extracao-atributos/municipal-plugin/`. Esses arquivos são carregados sob demanda pelo extrator. Não é necessário iniciar o servidor standalone na porta 18765: a API Python é hospedada pelo SICARD.

## Validação realizada

- Manifesto: 633 arquivos do ZIP original verificados.
- Quatro testes originais passaram, incluindo exportação do catálogo completo e reabertura nos três formatos.
- Quatorze testes do hospedeiro e da extração passaram, incluindo campos reais, códigos municipais e autenticação.
- Fluxo de navegador: categoria Econômico, PIB e PIB per capita de 2022, geração GeoPackage, registro no banco e inclusão automática no mapa.
- Arquivo gerado reaberto: 645 municípios, EPSG:4674, duas colunas selecionadas; zero feições copiadas para o banco.

A integração foi validada localmente. O banco e a malha do plugin devem ser provisionados junto ao servidor em qualquer implantação; os arquivos de dados são ignorados pelo Git do pacote. Esta tarefa não publicou uma versão do plugin nem implantou o sistema remoto.
