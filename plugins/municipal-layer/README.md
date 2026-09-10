# Gerador de camada municipal de São Paulo

**React em JavaScript + CSS · API Python · Banco local · Camada vetorial pronta para uso**

O usuário escolhe **fonte, ano e atributos**. O sistema reúne os valores pelo código IBGE e entrega **uma única camada com geometria e atributos gravados no arquivo**. A camada exportada pode ser usada sem conexão com o banco ou com esta aplicação.

| Entrega | Conteúdo |
| --- | --- |
| Território | 645 municípios do estado de São Paulo |
| Geometria | Malha IBGE 2022, SIRGAS 2000, EPSG:4674 |
| Catálogo | 6.347 combinações de atributo e período |
| Banco | 4.093.815 registros municipais, incluindo valores nulos |
| Saídas | FlatGeobuf, GeoPackage ou Shapefile em ZIP |
| Integração | Componente React, propriedades, callbacks e cliente de API substituível |

Este documento descreve o código e os dados desta versão. Não é necessário conhecer a conversa que originou o projeto.

## Sumário

1. [Executar](#1-executar)
2. [Usar a interface](#2-usar-a-interface)
3. [Estrutura do pacote](#3-estrutura-do-pacote)
4. [Arquitetura](#4-arquitetura)
5. [Fontes e interpretação](#5-fontes-e-interpretação)
6. [Nomes e formatos](#6-nomes-e-formatos)
7. [Integração React](#7-integração-react)
8. [Contrato da API](#8-contrato-da-api)
9. [Estrutura do banco](#9-estrutura-do-banco)
10. [Desenvolvimento e testes](#10-desenvolvimento-e-testes)
11. [Reproduzir a importação](#11-reproduzir-a-importação)
12. [Manutenção e novas fontes](#12-manutenção-e-novas-fontes)
13. [Problemas frequentes](#13-problemas-frequentes)
14. [Limitações](#14-limitações)
15. [Orientações para agentes de IA](#15-orientações-para-agentes-de-ia)
16. [Empacotamento e integridade](#16-empacotamento-e-integridade)

## 1. Executar

Extraia o ZIP completo. Abra um terminal **dentro de `municipal-layer/`**. Não abra `index.html` com duplo clique: a interface precisa da API HTTP.

O banco e a interface compilada já acompanham a entrega. **Node/npm não são necessários para apenas usar a interface pronta.** É necessário Python com as dependências geográficas.

### Windows / PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server/requirements.txt
.\.venv\Scripts\python.exe -B server/app.py
```

Abra **http://127.0.0.1:18765**. Mantenha o terminal aberto enquanto usa o sistema. Para encerrar o servidor iniciado nesse terminal, pressione `Ctrl+C`.

Se as dependências já estiverem instaladas no Python atual:

```powershell
python -B server/app.py
```

### Linux/macOS

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r server/requirements.txt
.venv/bin/python -B server/app.py
```

A execução foi validada no Windows com Python 3.14. O código utiliza recursos disponíveis em Python 3.11+, mas outras combinações de sistema e dependências não foram testadas nesta entrega. `AMBIENTE_VALIDACAO.json` registra as versões observadas no empacotamento. `requirements.txt` declara intervalos, não um lockfile Python.

### Confirmar a API

Em outro terminal PowerShell:

```powershell
$catalogo = Invoke-RestMethod 'http://127.0.0.1:18765/api/catalog'
$catalogo.municipalities
$catalogo.attributes.Count
```

Nesta versão, os resultados esperados são `645` e `6347`. Para usar outra porta livre:

```powershell
python -B server/app.py --port 18766
```

Nesse caso abra `http://127.0.0.1:18766`. O proxy de desenvolvimento Vite continua apontando para 18765 até ser alterado em `vite.config.js`.

## 2. Usar a interface

1. Escolha a **fonte** e o **ano de referência**. Só aparecem períodos existentes nessa fonte.
2. Se desejar, filtre por **tema** e pesquise um atributo por nome, campo ou unidade. A busca é textual; acentos podem influenciar o resultado.
3. Marque os atributos. **Adicionar resultados** inclui todos os resultados do filtro atual, não apenas a página visível.
4. Troque de fonte ou ano para acrescentar outros indicadores. A seleção anterior permanece.
5. Confira os campos selecionados e a prévia, que mostra cinco municípios e até oito indicadores.
6. Escolha o formato, clique em **Gerar e baixar camada** e extraia o ZIP recebido.
7. Abra o arquivo geográfico no SIG ou no fluxo de geoprocessamento desejado.

A exportação inclui todos os 645 municípios e todos os atributos selecionados. Não há filtro espacial ou recorte municipal nesta versão. **Agrupamento temático significa proximidade dos campos na tabela**, não camadas separadas.

No QGIS, por exemplo, adicione o `.fgb`, `.gpkg` ou `.shp` extraído como camada vetorial. Mantenha os auxiliares do Shapefile juntos. Para operações métricas, escolha uma projeção adequada à operação; a entrega mantém o CRS geográfico de origem.

## 3. Estrutura do pacote

```text
LEIA_PRIMEIRO.md                  orientação na raiz do ZIP
MANIFESTO_SHA256.json             inventário, tamanhos e hashes
municipal-layer/
  README.md                      este manual
  AGENTS.md                      instruções de manutenção para agentes
  VALIDACAO.md                   evidências da validação funcional
  AMBIENTE_VALIDACAO.json         versões observadas ao empacotar
  package.json                   comandos npm e exports
  package-lock.json              dependências JavaScript resolvidas
  vite.config.js                 builds e proxy de desenvolvimento
  index.html                     entrada HTML do desenvolvimento
  src/
    index.js                     exports públicos
    MunicipalLayerBuilder.jsx    componente e cliente HTTP
    style.css                    estilos com prefixo .mlb
  demo/main.jsx                  montagem da demonstração React
  dist/                          biblioteca ES e CSS compilados
  demo-dist/                     demonstração compilada
  server/
    app.py                       API, join e exportação GIS
    import_data.py               criação do banco
    requirements.txt             dependências Python
    test_layer.py                testes com dados reais
  data/
    catalog.sqlite               catálogo e observações
    municipios.gpkg              geometria municipal
    seade_ipdm.csv               CSV recebido da Seade
  examples/exportar_api.py        exemplo executável com IDs reais
  scripts/empacotar.py            cria ZIP e manifesto
  scripts/verificar_pacote.py     verifica ZIP sem executar seu conteúdo
censo2022_sp/
  malha_original/                 Shapefile original e auxiliares
  camada_unica/                  base censitária e dicionário da importação
  socioeconomico_desenvolvimento/
    indicadores_adicionais.csv   valores adicionais importados
    dicionario_campos.csv         metadados dos indicadores
    fontes/                      respostas oficiais já baixadas
  fontes/                        respostas SIDRA, metadados e malha ZIP
  tabelas/                       tabelas intermediárias e valores originais
  documentacao/                  consultas, cobertura e validações
  *.py                           scripts históricos de preparação
```

O manifesto contém a lista exata. O pacote inclui os insumos e evidências de preparação; não duplica derivados redundantes como o antigo ZIP de entrega, o GeoPackage de várias camadas ou os Shapefiles separados por tema. Os arquivos anteriores no workspace não são removidos.

Também não inclui `node_modules`, ambientes virtuais, caches, logs ou credenciais. É autocontido em **código e dados**, mas não traz instaladores de Python, Node ou SIG.

Para executar, basta `municipal-layer/` e as dependências Python. Para reconstruir o banco, mantenha `censo2022_sp/` como pasta irmã. Para incorporar a interface, use `src/` ou `dist/` com uma API compatível.

## 4. Arquitetura

```text
Configuração do usuário
        ↓
React: seleção de IDs do catálogo
        ↓ POST /api/export
Python: validação de seleção e formato
        ↓
SQLite: valores por atributo/município
GeoPackage: geometria por CD_MUN
        ↓
Join por código IBGE + ordenação dos campos
        ↓
Uma camada + dicionário + metadados
        ↓
Blob ZIP → download ou callback do hospedeiro
```

O React não escreve formatos GIS diretamente. A API monta um GeoDataFrame, mantém os municípios sem valor e grava o resultado com GeoPandas/Pyogrio. Polígonos simples são convertidos em MultiPolygon, sem simplificação. Temporários da exportação são removidos ao terminar; o ZIP é enviado em memória.

Não há Flask, FastAPI, PostGIS ou nuvem nesta implementação. O servidor usa `ThreadingHTTPServer` da biblioteca padrão Python, SQLite para valores e um GeoPackage separado para geometria.

## 5. Fontes e interpretação

Contagens conferidas no banco empacotado:

| Fonte | Referência | Campos/períodos |
| --- | --- | ---: |
| IBGE — Censo 2022 | 2022 | 6.159 |
| IBGE — Cadastro Central de Empresas | 2024 | 86 |
| IBGE — Finanças públicas | 2025 | 28 |
| IBGE — PIB dos Municípios | 2021: 8; 2022: 2; 2023: 2 | 12 |
| IBGE — IDEB | 2025 | 12 |
| Ipeadata / Atlas do Desenvolvimento Humano | 2010 | 26 |
| Seade — IPDM | 2014, 2016, 2018, 2020, 2022, 2024; quatro por ano | 24 |
| **Total** | | **6.347** |

São combinações de campo e período, não necessariamente conceitos únicos. Pode haver totais repetidos entre tabelas censitárias.

### Censo

Os 6.159 campos vêm da seleção preparada de 114 tabelas SIDRA, em 18 temas. Inclui divulgações de universo e amostra, identificadas nos metadados. Não representa todos os cruzamentos ou todas as tabelas possíveis do Censo. Confira categorias, unidades e definições antes de agregar ou comparar.

### IPDM não é IDHM

O **IDHM desta base é de 2010**. Não foi reclassificado como 2022. O **IPDM é outro indicador**, da Seade: foram importados os quatro índices sintéticos IPDM, riqueza, longevidade e escolaridade. Os demais indicadores componentes do CSV Seade não foram incorporados ao catálogo.

- [CSV oficial Seade usado na entrega](https://repositorio.seade.gov.br/dataset/f714bdee-3f8c-464e-9e45-07a0e444937a/resource/5684399c-2175-4749-8914-babd5c9eaaef/download/arq_ipdm_painel_v2024.csv).
- [Malha oficial IBGE 2022 de São Paulo](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/SP/SP_Municipios_2022.zip).
- Cada atributo registra sua URL específica em `url` e metadados em `detail`.

### Regras de interpretação

- `coverage` é o número de municípios com valor numérico, entre 0 e 645; cobertura menor não exclui municípios da exportação.
- Nulo não significa zero. Há campos com cobertura zero preservados no catálogo.
- A interpretação numérica já aplicada nas bases anteriores é mantida. O banco operacional guarda número ou nulo e não distingue sozinho todos os motivos de sigilo/ausência; consulte os arquivos brutos e registros de símbolos para isso.
- Multiplicadores são apresentados na unidade da API, como `R$ × 1000`. A exportação não multiplica silenciosamente esses valores.
- **A geometria é sempre de 2022**, inclusive quando o indicador é histórico. Não existe reconstrução de limites territoriais de outros anos.
- Não há atualização automática nem construção de índices ausentes. A tabela acima descreve este banco, não uma afirmação de cobertura de todas as publicações oficiais disponíveis atualmente.

## 6. Nomes e formatos

### Campos fixos

| Campo | Significado |
| --- | --- |
| `CD_MUN` | Código IBGE de sete dígitos como texto |
| `NM_MUN` | Nome do município na malha |
| `SIGLA_UF` | Sigla da UF |
| `AREA_KM2` | Área publicada na malha, não recalculada |

### Exemplos reais de indicadores

| Campo em FGB/GPKG | Conteúdo |
| --- | --- |
| `economia_pib_mil_reais_2022` | PIB 2022, em mil reais |
| `economia_pib_per_capita_reais_2022` | PIB per capita 2022, em reais |
| `seade_ipdm_2022` | IPDM Seade 2022 |
| `idh_idhm_2010` | IDHM 2010 |
| `populacao_V01000001_2022` | Campo censitário codificado, descrito no dicionário |

Nos campos censitários, `V...` é código interno da preparação; não deve ser confundido com o ID oficial da variável SIDRA. Tabela, variável e categorias oficiais constam dos metadados. Nome de campo, ID de catálogo e descrição são identificadores diferentes.

A ordem final é **fonte → tema → ano crescente → campo**. A ordem de clique não define a ordem de exportação. O driver pode mudar a ordem dos registros: relacione municípios por `CD_MUN`, nunca pelo número da linha.

| Formato | Limite da aplicação | Nomes dos indicadores |
| --- | ---: | --- |
| FlatGeobuf (`fgb`) | 6.500 | Completos, com ano |
| GeoPackage (`gpkg`) | 1.900 | Completos, com ano |
| Shapefile (`shp`) | 250 | `A000001`, `A000002` etc. |

Esses limites são regras adotadas pela aplicação, não limites universais de todos os leitores. Shapefile restringe nomes do DBF, por isso usa correspondência no dicionário. **`A000001` pode representar indicadores diferentes em seleções diferentes.** Leia o dicionário do mesmo ZIP.

```text
municipios_sp.fgb              OU municipios_sp.gpkg
                              OU municipios_sp.shp + auxiliares
dicionario.csv                campo, indicador, fonte, ano, tema, unidade, URL, cobertura
metadados.json                CRS, ano da geometria, formato e atributos completos
```

O CSV usa UTF-8 com BOM e vírgula como delimitador; o JSON usa UTF-8. `export_field`, nos metadados, informa o nome efetivamente escrito. `detail` é uma string contendo JSON, que precisa ser decodificada para acessar seus campos. A interface baixa `municipios_sp_<formato>.zip`; os nomes internos são fixos.

A camada funciona sem os documentos auxiliares, mas mantenha-os para interpretação. Não são configurados aliases automaticamente no QGIS. A leitura de nulos de Shapefile pode variar entre softwares; considere FGB/GPKG quando isso for relevante.

## 7. Integração React

### Instalar o pacote local

No projeto hospedeiro, ajuste o caminho relativo:

```powershell
npm install ../municipal-layer
```

O pacote é `@vpc/municipal-layer`, local, não publicado no npm. `dist/` precisa existir, como já existe nesta entrega. O campo `files` de `package.json` não inclui o banco: um `npm pack` não substitui este ZIP completo.

```jsx
import { MunicipalLayerBuilder } from '@vpc/municipal-layer';
import '@vpc/municipal-layer/style.css';

export default function TelaDados() {
  return <MunicipalLayerBuilder apiBaseUrl="/api" />;
}
```

Também é possível copiar `src/` e importar seu `index.js`; o bundler deve processar JSX e CSS. React é externo à biblioteca. O contrato declarado aceita React 18+, e a versão efetivamente usada no build consta do lockfile e de `AMBIENTE_VALIDACAO.json`.

### Modo controlado e recebimento do ZIP

```jsx
import { useState } from 'react';
import { MunicipalLayerBuilder } from '@vpc/municipal-layer';
import '@vpc/municipal-layer/style.css';

export default function Integracao() {
  const [config, setConfig] = useState({attributes: [], format: 'fgb'});
  const [arquivo, setArquivo] = useState(null);
  return <>
    <MunicipalLayerBuilder
      apiBaseUrl="/api"
      value={config}
      onChange={setConfig}
      download={false}
      onExport={resultado => setArquivo(resultado)}
    />
    {arquivo && <p>Arquivo recebido: {arquivo.filename}</p>}
  </>;
}
```

Esse exemplo recebe o ZIP em memória. O hospedeiro decide o destino de `arquivo.blob`. Para geoprocessar, extraia o arquivo vetorial do ZIP. O callback não retorna uma camada Leaflet/MapLibre, GeoJSON ou GeoDataFrame.

| Propriedade | Contrato |
| --- | --- |
| `apiBaseUrl` | String, padrão `/api` |
| `client` | Adaptador opcional com métodos async `catalog(signal)`, `preview(config, signal)` e `export(config, signal)` |
| `value` | Configuração completa: `attributes` como lista de IDs e `format` como `fgb`, `gpkg` ou `shp` |
| `onChange` | Recebe a próxima configuração; no modo controlado o hospedeiro deve atualizar `value` |
| `onExport` | Recebe `{blob, filename, configuration, attributes}`; pode retornar Promise |
| `download` | Boolean, padrão `true`; `false` desativa o download automático |
| `className` | Classe adicional na raiz |

Na configuração, `attributes` contém IDs do catálogo, não nomes de campo. No callback, `attributes` contém metadados selecionados; a ordem dessa lista não substitui a ordem do manifesto exportado. Se `onExport` rejeitar uma Promise, a interface mostra erro e o download automático não ocorre.

Sem `value`, o componente mantém estado interno. Não persiste seleções entre recarregamentos; o hospedeiro pode fazê-lo com `value`/`onChange`, respeitando os IDs do catálogo.

### Proxy, autenticação e CSS

O cliente padrão usa a mesma origem. A API local não fornece CORS. Configure proxy no hospedeiro para outro domínio/porta. Se usar `/dados-municipais/api`, o proxy precisa reescrever `/dados-municipais/api/catalog` para `/api/catalog`, e assim por diante; a propriedade não cria novas rotas no Python.

Um `client` próprio pode integrar a autenticação do hospedeiro. Deve retornar JSON para catálogo/prévia, Blob ZIP para exportação e lançar erros nas falhas. Mantenha a referência do objeto estável, por exemplo via `useMemo`, para evitar recarregar o catálogo a cada renderização.

Estilos têm prefixo `.mlb`, mas não são Shadow DOM: regras globais do hospedeiro ainda podem interferir. Edite `src/style.css`. Em frameworks com SSR, monte o componente no contexto de cliente apropriado, pois usa hooks e APIs de navegador.

## 8. Contrato da API

### `GET /api/catalog`

Retorna `attributes`, `municipalities`, `crs`, `geometryYear`. Cada atributo contém:

| Chave | Tipo | Significado |
| --- | --- | --- |
| `id` | string | Identificador opaco usado na configuração |
| `source` | string | Fonte |
| `year` | inteiro | Ano de referência |
| `theme` | string | Grupo temático |
| `field` | string | Nome completo do campo |
| `label` | string | Descrição legível |
| `unit` | string | Unidade, com multiplicador quando aplicável |
| `url` | string | Referência da fonte |
| `detail` | string JSON | Metadados de origem |
| `coverage` | inteiro | Municípios com valor numérico |

O endpoint retorna o catálogo inteiro; filtros/paginação ocorrem no componente.

### `POST /api/preview` e `POST /api/export`

Recebem `Content-Type: application/json` e a configuração com `attributes` e `format`. Exemplo que consulta IDs reais:

```python
import requests

base = 'http://127.0.0.1:18765/api'
r = requests.get(f'{base}/catalog', timeout=60)
r.raise_for_status()
nomes = {'economia_pib_mil_reais_2022', 'seade_ipdm_2022'}
ids = [a['id'] for a in r.json()['attributes'] if a['field'] in nomes]
assert len(ids) == len(nomes), 'Indicador ausente no catálogo'
config = {'attributes': ids, 'format': 'gpkg'}
r = requests.post(f'{base}/export', json=config, timeout=300)
r.raise_for_status()
with open('municipios_configurados.zip', 'xb') as arquivo:
    arquivo.write(r.content)
```

Uma versão executável está incluída:

```powershell
python -B examples/exportar_api.py --format gpkg --output municipios_configurados.zip
```

O exemplo se recusa a sobrescrever o arquivo de saída. A prévia retorna `rows` (até cinco registros), `fields` (até oito campos) e `totalAttributes`. Ausências são `null`. A exportação retorna `application/zip` com `Content-Disposition`.

São validados: lista não vazia, IDs existentes, ausência de duplicatas e limite do formato. O corpo da requisição tem limite de 1.000.000 bytes. Se o formato for omitido na exportação, o padrão é `fgb`.

| Status | Significado |
| --- | --- |
| 200 | Resposta ou arquivo gerado |
| 400 | Configuração inválida, com mensagem em `error` |
| 404 | Rota/recurso inexistente |
| 500 | Falha interna na geração; consultar log |

A geração é síncrona, sem fila, ID de job ou endpoint de progresso. Cancelar uma requisição do navegador não garante interromper o processamento já iniciado no servidor.

## 9. Estrutura do banco

### `data/catalog.sqlite`

| Tabela | Campos | Chaves |
| --- | --- | --- |
| `attributes` | `id, source, year, theme, field, label, unit, url, detail, coverage` | `id` primária; `field` único |
| `observations` | `attribute_id, municipality, value` | Primária composta; referência a `attributes.id` |
| `provenance` | `path, sha256` | `path` primária |

`value` é `REAL` ou `NULL`. Observações usam `WITHOUT ROWID`; há índice de fonte/ano/tema no catálogo. A API abre o banco somente para leitura e fecha as conexões após uso.

O ID atual corresponde aos primeiros 20 caracteres hexadecimais de SHA-256 do nome completo do campo. Não o gere no cliente: consulte o catálogo. Renomear campos pode mudar IDs e invalidar seleções persistidas.

`provenance.path` contém caminhos do ambiente original, que podem não existir no computador de destino. Eles não são usados na exportação. Para conferir a entrega transferida, use o manifesto de caminhos relativos do ZIP.

### `data/municipios.gpkg`

A camada `municipios` guarda geometria e quatro campos fixos. `CD_MUN` corresponde a `observations.municipality`. O importador verifica códigos únicos e pertencentes à malha. A relação entre os dois arquivos é validada por código/testes; não existe chave estrangeira SQLite atravessando os dois arquivos.

Exemplo de consulta somente leitura, a partir de `municipal-layer/`:

```python
import sqlite3
from contextlib import closing
with closing(sqlite3.connect('file:data/catalog.sqlite?mode=ro', uri=True)) as db:
    for row in db.execute('''
        SELECT source, year, COUNT(*) FROM attributes
        GROUP BY source, year ORDER BY source, year
    '''):
        print(row)
```

## 10. Desenvolvimento e testes

Para desenvolver o frontend, use Node compatível com o lockfile; foi utilizado Node 24.18.0. Node 22.12+ é a base indicada para este projeto, mas somente o ambiente registrado foi validado.

```powershell
npm ci
npm run dev
```

Mantenha a API Python em outro terminal. Vite encaminha `/api` para `127.0.0.1:18765`; abra a URL de desenvolvimento que ele imprimir.

```powershell
npm run build
python -B -m unittest discover -s server -p 'test_*.py'
```

O build gera `demo-dist/` e depois `dist/`. React, React DOM e JSX runtime ficam externos à biblioteca. Não edite builds diretamente; edite `src/` e recompile.

`npm test` chama os mesmos testes com `python` do PATH. Se utilizar ambiente virtual sem ativação, chame seu Python explicitamente. Os quatro testes usam dados reais e verificam integridade, períodos, erros de seleção, limite Shapefile, reabertura das três exportações e exportação de todo o catálogo em FGB, comparando valores/nulos e geometria.

Contagens fixas dos testes só devem ser alteradas quando o catálogo mudar de forma intencional e comprovada. [VALIDACAO.md](VALIDACAO.md) descreve as evidências de interface e as limitações. Testes de backend não equivalem a homologação de toda a UI ou de todos os softwares GIS.

## 11. Reproduzir a importação

**Não reimporte para simplesmente usar o sistema: o banco já está pronto.** Para reconstruir, trabalhe numa cópia da entrega e preserve o catálogo e o GeoPackage atuais. O script recusa sobrescrever `data/catalog.sqlite`; renomeie/preserve os dois arquivos nessa cópia antes de executar:

```powershell
python -B server/import_data.py
```

Entradas diretas, todas incluídas no pacote completo:

- `../censo2022_sp/malha_original/SP_Municipios_2022.shp` e auxiliares;
- `../censo2022_sp/camada_unica/SP_Censo2022_completo.fgb`;
- `../censo2022_sp/camada_unica/dicionario_campos.csv`;
- `../censo2022_sp/socioeconomico_desenvolvimento/indicadores_adicionais.csv`;
- `../censo2022_sp/socioeconomico_desenvolvimento/dicionario_campos.csv`;
- `data/seade_ipdm.csv`.

Mantenha o CSV Seade para importar localmente. Se ele estiver ausente, o script tenta baixar a URL oficial; nesse caso depende de rede e do conteúdo servido naquele momento.

O script cria o banco/GeoPackage e imprime contagens e integridade. Uma interrupção pode deixar arquivos parciais: investigue a falha e não substitua a versão operacional por uma importação incompleta. Rode os testes ao terminar.

Os scripts históricos `censo2022_sp/*.py` podem acessar a rede, escrever derivados grandes e esperar outras saídas intermediárias. Leia-os antes de executar; não são inicializadores da aplicação. Arquivos brutos podem incluir consultas supersedidas, portanto não una indiscriminadamente todos os JSON disponíveis.

## 12. Manutenção e novas fontes

Não há tela de cadastro de novas fontes. Sua inclusão exige ingestão:

1. Confirme origem oficial, período, definição, unidade e multiplicador.
2. Valide a granularidade municipal e códigos de sete dígitos compatíveis com a malha.
3. Defina nomes sem colisão; preserve nomes/IDs já utilizados sempre que possível.
4. Importe em uma cópia do banco, mantendo ausências como nulos.
5. Confira unicidade, cobertura e valores contra o arquivo original.
6. Teste exportações reabertas e atualize contagens/documentação para refletir somente a mudança real.
7. Recompile se alterou a interface e gere um novo pacote com manifesto.

A interface obtém fontes e períodos do catálogo; novas opções não precisam ser codificadas uma a uma. Entretanto, textos e geometria desta versão são específicos de São Paulo e 2022.

Ao mudar formatos/limites, mantenha frontend e backend consistentes. Bloqueio na UI não substitui validação da API. Não migre a arquitetura por conveniência sem solicitação.

## 13. Problemas frequentes

| Sintoma | O que conferir |
| --- | --- |
| `python` não encontrado | Instalação e PATH do Python |
| `ModuleNotFoundError` | Instale dependências com o mesmo Python usado na API |
| Endereço não abre | Servidor ativo, porta e mensagens no terminal |
| Outra aplicação aparece nessa porta | Use `--port` com uma porta livre; não encerre serviços desconhecidos |
| Interface sem catálogo | `data/catalog.sqlite`, resposta `/api/catalog`, prefixo/proxy e log |
| Erro CORS | Proxy de mesma origem ou integração apropriada do hospedeiro |
| Edição React não aparece | `npm run build` para a demo Python ou `npm run dev` |
| Atributo não encontrado | Fonte, ano, tema e busca; só campos importados aparecem |
| IDHM ausente em 2022 | O IDHM incluído é de 2010; IPDM é distinto |
| Muitos nulos | Confira cobertura e dados originais; não é necessariamente falha de join |
| PIB parece mil vezes menor | Confira unidade `R$ × 1000` |
| Campo `A000001` | Consulte o dicionário do mesmo ZIP |
| Limite de atributos | Reduza seleção ou escolha FGB |
| Banco já existe na importação | Use o banco pronto ou reconstrua em cópia preservada |
| Seleção some ao recarregar | Persistência pertence ao hospedeiro, via `value`/`onChange` |

## 14. Limitações

O servidor fornecido é local. Não inclui autenticação, autorização, CORS, fila de jobs, limite de concorrência, auditoria por usuário, atualização automática, tarefa agendada ou implantação de produção. Não houve publicação no npm ou em domínio externo.

Para produção, o hospedeiro precisa assumir roteamento, acesso, limites de recursos e tempo de execução. Exportações grandes usam memória e temporários; carga e concorrência de produção não foram medidas.

Não há cálculo de novos índices, ajuste monetário, normalização entre anos ou recorte espacial. A adequação estatística de combinar indicadores depende das definições e unidades. Validar a transformação não constitui auditoria estatística independente das fontes.

Os dados mantêm referências e atribuições. O pacote não acrescenta uma licença geral de software nem substitui os termos das fontes. Antes de redistribuição pública, defina a licença do código e verifique os termos aplicáveis aos dados.

## 15. Orientações para agentes de IA

Leia [AGENTS.md](AGENTS.md) antes de modificar arquivos. O contrato essencial é **configuração → uma camada com geometria e atributos materializados**. Não o substitua por mapa de visualização, tabela sem geometria ou join externo.

Ordem de leitura: README e AGENTS → `package.json`/`vite.config.js`/requisitos Python → componente e `app.py` → importador/catálogo/dicionários → testes e evidências.

Não invente campos, IDs, anos, fontes ou valores. Não use dados fictícios como entrega. Não equipare IDHM a IPDM. Preserve os originais e os períodos. Não inclua credenciais. Relate somente validações que realmente ocorreram.

Texto sugerido para repassar o projeto a outro agente:

> Leia integralmente municipal-layer/README.md e municipal-layer/AGENTS.md. Identifique a arquitetura e os contratos reais. Preserve a malha de 2022, os códigos IBGE e os anos/unidades de cada indicador. Leia cada arquivo antes de editá-lo. Implemente apenas a mudança que eu solicitar, valide e relate o que foi executado e o que permanece sem teste.

## 16. Empacotamento e integridade

`MANIFESTO_SHA256.json`, na raiz do ZIP, registra caminhos relativos, tamanhos e SHA-256 de todos os demais arquivos. Não contém hash de si próprio. Um arquivo `.sha256` externo registra o hash do ZIP inteiro. Hashes detectam diferenças; não são assinatura digital de autoria.

Após extrair, valide o ZIP original, ajustando seu caminho:

```powershell
python -B scripts/verificar_pacote.py ../municipal-layer-completo-v1.0.0.zip
```

O comando pressupõe que o ZIP está na pasta pai de `municipal-layer/`. O verificador não extrai nem executa conteúdo.

Para empacotar novamente:

```powershell
python -B scripts/empacotar.py
```

O script recusa sobrescrever a saída. Use `--output` com outro nome ou preserve a versão anterior. Ele não compila nem testa automaticamente: execute build/testes antes se mudou código. Inclui os builds existentes, gera o manifesto e verifica os hashes.

[VALIDACAO.md](VALIDACAO.md) registra a validação funcional anterior. A entrega do pacote informa separadamente as verificações de empacotamento executadas. Um servidor ativo no computador de preparação não será iniciado automaticamente no computador que recebe o ZIP.
