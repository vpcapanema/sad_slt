# Modulo Fase 1 - Gerador de camadas de restricao e risco

## Objetivo do modulo

Este documento define o modulo responsavel por gerar, validar, homologar e publicar
as camadas consolidadas de restricao e risco consumidas pela Fase 1 da espinha dorsal
do sistema de hierarquizacao e ranqueamento de projetos do PLI.

A Fase 1 da espinha dorsal nao ranqueia projetos. Ela classifica a elegibilidade
territorial preliminar:

- projetos que intersectam restricoes sao classificados como `restrito`;
- projetos que intersectam riscos, mas nao restricoes, sao classificados como
  `apto_com_ressalva`;
- projetos sem intersecao com restricoes ou riscos sao classificados como `apto`.

O papel deste modulo e preparar os insumos espaciais para essa triagem.

## Produto final do modulo

O modulo deve produzir um pacote homologado de Fase 1 contendo:

- uma camada consolidada de restricao;
- uma camada consolidada de risco;
- metadados das camadas de origem;
- relatorio de processamento;
- relatorio de validacao topologica;
- regras utilizadas para geracao de riscos derivados;
- identificador de versao;
- status de homologacao.

Esses produtos devem ser publicados na biblioteca de camadas de risco e restricao,
ficando disponiveis para consumo pela Fase 1 da espinha dorsal.

## Conceito metodologico

O modulo deve aceitar multiplas camadas vetoriais de entrada, vindas de fontes
oficiais ou tecnicamente homologadas, e transforma-las em duas camadas consolidadas:

1. camada unica de restricao;
2. camada unica de risco.

A consolidacao deve preservar atributos das camadas originais. Por isso, o operador
conceitual recomendado e a funcao `Identity`, no sentido usado pelo ArcGIS: as
geometrias sao particionadas conforme as sobreposicoes e os atributos das camadas
sobrepostas sao mantidos nos trechos resultantes.

Quando a implementacao nao usar ArcGIS diretamente, deve ser usado operador
equivalente de overlay que reproduza o comportamento esperado da funcao `Identity`.

## Fluxo geral de processamento

```text
fontes vetoriais
    -> importacao
    -> validacao bruta
    -> normalizacao
    -> correcao geometrica e topologica
    -> classificacao restricao/risco
    -> geracao de riscos derivados
    -> identity das restricoes
    -> identity dos riscos
    -> validacao final
    -> homologacao
    -> publicacao na biblioteca de camadas
```

## Entradas aceitas

O modulo deve aceitar, no minimo:

- WFS;
- Shapefile compactado;
- GeoPackage;
- GeoJSON;
- outras fontes vetoriais suportadas pelo motor geoespacial adotado.

Cada camada de entrada deve ser registrada como uma fonte individual, mesmo quando
varias camadas forem importadas de um mesmo arquivo ou servico.

## Cadastro minimo da fonte

Cada camada importada deve possuir um cadastro minimo:

- `fonte_id`;
- `nome_fonte`;
- `tipo_fonte`: WFS, Shapefile, GeoPackage, GeoJSON etc.;
- `url_origem`, quando aplicavel;
- `arquivo_origem`, quando aplicavel;
- `orgao_responsavel`;
- `data_importacao`;
- `data_referencia_dado`, quando conhecida;
- `tipo_tratamento`: restricao, risco ou insumo_para_risco_derivado;
- `criterio_associado`;
- `base_legal_ou_tecnica`;
- `severidade_padrao`;
- `observacao_metodologica`.

## Importacao

### WFS

Para fontes WFS, o modulo deve:

- registrar URL consultada;
- registrar layer/typeName;
- registrar parametros de consulta;
- registrar data e hora da requisicao;
- validar retorno;
- armazenar copia local ou snapshot do dado importado;
- registrar eventual filtro espacial ou atributivo aplicado.

### Upload de arquivo

Para arquivos enviados pelo usuario, o modulo deve:

- aceitar arquivos compactados quando necessario;
- identificar camadas internas, no caso de GeoPackage ou zip;
- validar tipo de geometria;
- validar presenca de CRS;
- impedir importacao de arquivo vazio;
- armazenar o arquivo original como evidencia de origem.

## Validacao bruta

Apos importar a camada, o sistema deve executar validacoes iniciais:

- a camada possui feicoes;
- a camada possui geometria;
- o CRS esta definido;
- o tipo geometrico e compativel com o uso esperado;
- ha campos obrigatorios quando definidos pela configuracao;
- a extensao espacial e compativel com a area de estudo;
- a camada nao possui percentual critico de geometrias nulas ou vazias.

Camadas reprovadas nesta etapa nao devem seguir para consolidacao.

## Normalizacao

Todas as camadas aprovadas na validacao bruta devem ser normalizadas antes do overlay.

Normalizacoes minimas:

- reprojetar para o CRS oficial do projeto;
- padronizar nomes de campos de controle;
- criar identificador unico de feicao de origem;
- registrar tipo de tratamento: restricao, risco ou risco derivado;
- converter geometrias para tipo esperado, quando tecnicamente seguro;
- padronizar valores categoricos;
- preservar atributos originais relevantes.

Campos de controle recomendados:

```text
fonte_id
feicao_origem_id
criterio_id
criterio_nome
tipo_tratamento
severidade
base_legal_ou_tecnica
fonte_nome
data_referencia_dado
metodo_obtencao
```

## Correcao geometrica e topologica

Antes de qualquer operacao de `Identity`, o modulo deve corrigir e validar as
geometrias.

Operacoes recomendadas:

- corrigir geometrias invalidas;
- remover geometrias vazias;
- remover geometrias sem area quando a camada esperada for poligonal;
- explodir multipartes, se isso for necessario para rastreabilidade;
- remover duplicidades exatas;
- corrigir orientacao e fechamento de aneis, quando aplicavel;
- aplicar tolerancia minima para remocao de artefatos, se configurada;
- registrar todas as correcoes executadas.

O modulo nao deve apagar feicoes problematicas silenciosamente. Toda exclusao ou
correcao deve aparecer no relatorio de processamento.

## Classificacao entre restricao e risco

Cada camada deve ser classificada em uma das categorias:

- `restricao`;
- `risco`;
- `insumo_para_risco_derivado`.

Restricao representa ocorrencia territorial com potencial excludente ou segregador.
Risco representa ocorrencia territorial que nao exclui o projeto, mas gera ressalva.

Exemplo:

```text
Unidade de Conservacao de Protecao Integral -> restricao
Zona de amortecimento de UC -> risco
Area suscetivel a inundacao -> risco
Terra Indigena -> restricao
Faixa de dominio ou servidao existente -> risco ou restricao, conforme regra adotada
```

## Geracao de riscos derivados

Alguns riscos podem ser derivados automaticamente de camadas de restricao ou de outras
camadas base. O caso classico e a geracao de zona de risco no entorno de uma
restricao.

Exemplos:

- buffer de zona de amortecimento;
- faixa de atencao no entorno de infraestrutura linear;
- area de influencia de bem protegido;
- faixa de risco no entorno de area sensivel.

Cada risco derivado deve possuir regra explicita:

- camada base;
- distancia de buffer;
- unidade;
- fundamento legal ou tecnico;
- se o buffer e cheio ou externo;
- se ha dissolucao;
- se ha recorte pela area de estudo;
- se ha excecoes.

### Buffer externo

Quando o risco e derivado de uma restricao, a regra preferencial e gerar buffer
externo:

```text
risco_derivado = buffer(restricao, distancia) - restricao
```

Isso evita que a mesma area seja simultaneamente classificada como restricao e risco
pelo mesmo criterio.

Quando a metodologia exigir buffer cheio, a decisao deve ser registrada como excecao.

## Consolidacao por Identity

### Restricoes

As camadas classificadas como restricao devem ser consolidadas em uma camada unica de
restricao por operacoes sucessivas de `Identity` ou overlay equivalente.

Objetivo:

- particionar as geometrias conforme sobreposicoes;
- preservar os atributos das camadas de origem;
- permitir saber quais restricoes incidem em cada trecho espacial;
- permitir emissao de relatorio detalhado por projeto.

Fluxo conceitual:

```text
restricao_1
    identity restricao_2
    identity restricao_3
    ...
    -> camada_consolidada_restricao
```

### Riscos

As camadas classificadas como risco, incluindo riscos derivados, devem ser consolidadas
em uma camada unica de risco por operacoes sucessivas de `Identity` ou overlay
equivalente.

Fluxo conceitual:

```text
risco_1
    identity risco_2
    identity risco_3
    ...
    -> camada_consolidada_risco
```

## Ordem de processamento

A ordem das operacoes de `Identity` deve ser registrada.

Embora o resultado espacial esperado seja equivalente para o objetivo de sobreposicao,
a ordem pode afetar nomes de campos, sufixos, desempenho e rastreabilidade operacional.

O relatorio deve registrar:

- ordem das camadas;
- numero de feicoes antes e depois de cada operacao;
- area total antes e depois;
- campos adicionados;
- eventuais conflitos de nomes de campos;
- tempo de processamento.

## Tratamento de conflitos de atributos

Como diferentes camadas podem possuir campos com nomes iguais, o modulo deve aplicar
regra de nomenclatura para evitar sobrescrita.

Regra recomendada:

```text
<fonte_id>__<nome_campo_original>
```

Exemplo:

```text
funai_ti__nome
datageo_ucpi__categoria
cetesb_contaminadas__situacao
```

Campos de controle do sistema devem ter nomes reservados e nao podem ser sobrescritos
por atributos de origem.

## Validacao final das camadas consolidadas

Depois da consolidacao, o modulo deve validar:

- geometrias validas;
- ausencia de geometrias vazias;
- CRS correto;
- area total coerente;
- campos de controle presentes;
- atributos de origem preservados;
- quantidade de feicoes gerada;
- ausencia de perda indevida de feicoes;
- consistencia entre tipo_tratamento e camada final.

Tambem deve ser executada uma checagem de prioridade:

```text
se uma area aparece como restricao e risco:
    restricao prevalece para classificacao da Fase 1
    risco pode ser mantido como informacao secundaria, se metodologicamente util
```

## Homologacao

Antes de publicar o pacote para uso pela espinha dorsal, o modulo deve gerar uma etapa
de homologacao.

Itens minimos da homologacao:

- resumo das fontes utilizadas;
- quantidade de camadas importadas;
- quantidade de camadas aprovadas;
- quantidade de camadas reprovadas;
- criterios cobertos;
- criterios ausentes;
- erros corrigidos;
- erros remanescentes;
- area total de restricao;
- area total de risco;
- mapa de pre-visualizacao;
- amostra de atributos preservados;
- aprovador responsavel;
- data de homologacao.

Somente pacotes homologados devem aparecer na biblioteca de camadas disponivel para a
Fase 1.

## Versionamento

Todo pacote publicado deve possuir identificador de versao.

Padrao recomendado:

```text
fase1_restricao_risco_<area_estudo>_<data>_v<numero>
```

Exemplo:

```text
fase1_restricao_risco_sp_2026_07_02_v1
```

O versionamento deve permitir reproduzir rankings antigos mesmo que as fontes de
dados sejam atualizadas posteriormente.

Metadados minimos de versao:

- `pacote_id`;
- `versao`;
- `data_criacao`;
- `data_homologacao`;
- `responsavel_tecnico`;
- `status`: rascunho, validado, homologado, arquivado;
- `hash_ou_assinatura_dos_insumos`, se disponivel;
- `observacoes`.

## Publicacao na biblioteca

Apos homologacao, o pacote deve ser publicado na biblioteca de camadas de risco e
restricao.

A biblioteca deve permitir:

- listar pacotes homologados;
- consultar metadados;
- baixar ou consumir camada de restricao;
- baixar ou consumir camada de risco;
- visualizar relatorio de processamento;
- selecionar pacote para uma rodada da Fase 1.

## Contrato de saida para a espinha dorsal

O pacote homologado deve expor, no minimo:

```json
{
  "pacote_id": "fase1_restricao_risco_sp_2026_07_02_v1",
  "status": "homologado",
  "crs": "EPSG:XXXX",
  "camada_restricao": {
    "nome": "restricao_consolidada",
    "tipo_geometria": "Polygon",
    "campos_controle": [
      "fonte_id",
      "feicao_origem_id",
      "criterio_id",
      "criterio_nome",
      "tipo_tratamento",
      "severidade"
    ]
  },
  "camada_risco": {
    "nome": "risco_consolidado",
    "tipo_geometria": "Polygon",
    "campos_controle": [
      "fonte_id",
      "feicao_origem_id",
      "criterio_id",
      "criterio_nome",
      "tipo_tratamento",
      "severidade"
    ]
  },
  "relatorio_processamento": "...",
  "metadados": "..."
}
```

## Consumo pela Fase 1 da espinha dorsal

Ao consumir o pacote, a espinha dorsal deve executar:

```text
projeto intersecta camada_consolidada_restricao?
    sim -> status_fase1 = restrito

senao, projeto intersecta camada_consolidada_risco?
    sim -> status_fase1 = apto_com_ressalva

senao:
    status_fase1 = apto
```

Para cada projeto, a espinha dorsal deve recuperar os atributos preservados pela
consolidacao por `Identity`, permitindo emitir relatorio com:

- restricoes encontradas;
- riscos encontrados;
- fonte de cada ocorrencia;
- base legal ou tecnica;
- severidade;
- area ou extensao afetada;
- observacao metodologica.

## Variáveis do Modulo

### Variáveis de Entrada
- `informar_tipo_entrada`
- `informar_caminho_arquivo`
- `informar_crs_origem`
- `definir_filtro_espacial`
- `definir_filtro_atributivo`

### Variáveis de Cadastro da Fonte
- `informar_nome_fonte`
- `informar_tipo_fonte`
- `informar_orgao_responsavel`
- `informar_data_referencia_dado`
- `classificar_tipo_tratamento`
- `informar_criterio_associado`
- `informar_base_legal_ou_tecnica`
- `informar_severidade_padrao`
- `informar_observacao_metodologica`

### Variáveis de Validação
- `validar_sobreposicoes`
- `validar_lacunas`
- `validar_intersecoes_invalidas`
- `validar_gaps`
- `validar_dangles`
- `validar_crs`
- `validar_tipo_geometrico`
- `validar_campos_obrigatorios`
- `definir_tolerancia_topologica`
- `definir_percentual_critico_erros`

### Variáveis de Correção
- `corrigir_geometrias_invalidas`
- `corrigir_orientacao_aneis`
- `corrigir_fechamento_aneis`
- `corrigir_repeticao_pontos`
- `corrigir_auto_intersecoes`
- `corrigir_geometrias_degeneradas`
- `corrigir_vertices_colineares`
- `definir_tolerancia_correcao`
- `manter_geometria_original_falha`

### Variáveis de Normalização
- `recortar_area_estudo`
- `corrigir_geometrias_invalidas`
- `remover_geometrias_vazias`
- `explodir_multipartes`
- `padronizar_nomes_campos`

### Variáveis de Geração de Riscos Derivados
- `selecionar_camada_base`
- `definir_distancia_buffer`
- `definir_unidade_buffer`
- `selecionar_tipo_buffer`
- `dissolver_geometrias`
- `recortar_area_estudo`
- `informar_fundamento_legal_tecnico`

### Parâmetros de Consolidação
- `selecionar_tipo_overlay`
- `resolver_conflitos_campos`

### Parâmetros de Exportação
- `definir_nome_arquivo_restricao`
- `definir_nome_arquivo_risco`
- `selecionar_formato_saida`
- `definir_crs_saida`
- `selecionar_opcao_salvamento`

### Parâmetros de Metadados
- `definir_nome_versao`
- `informar_responsavel_tecnico`
- `informar_observacoes_homologacao`

### Parâmetros de Ordem de Processamento
- `definir_ordem_camadas_restricao`
- `definir_ordem_camadas_risco`

---

## Regras de auditoria

Toda execucao do modulo deve gerar trilha de auditoria:

- usuario responsavel;
- data e hora de importacao;
- fonte importada;
- parametros de processamento;
- CRS de origem e destino;
- correcoes geometricas aplicadas;
- regras de buffer aplicadas;
- ordem das operacoes de `Identity`;
- erros e avisos;
- decisao de homologacao.

## Decisoes conceituais consolidadas

1. A Fase 1 e uma etapa de triagem, nao de ranking.
2. Restricao exclui ou segrega o projeto do ranking ordinario.
3. Risco gera ressalva e pode ser avaliado quantitativamente na Fase 3.
4. A consolidacao deve preservar atributos das camadas originais.
5. A funcao conceitual adequada para consolidacao e `Identity`.
6. Riscos derivados de restricoes devem preferencialmente ser buffers externos.
7. Pacotes de restricao e risco devem ser homologados e versionados antes de uso.
8. A espinha dorsal deve consumir apenas pacotes homologados.

## Proximos detalhamentos

Este documento define o modulo gerador de camadas de restricao e risco. Os proximos
documentos devem detalhar:

- modulo gerador da superficie de favorabilidade territorial da Fase 2;
- modulo de recepcao, validacao e normalizacao de atributos de projeto da Fase 3;
- modelo de dados para biblioteca de camadas;
- contrato de API para execucao da Fase 1.
