# Contrato semântico dos campos de cadastro de demanda

Versão: 1.0.0  
Escopo: Plano, Programa e Projeto.

## Finalidade

Este documento define o significado, a natureza, o tipo e a formatação dos
campos de cadastro de demanda. Ele é a referência humana correspondente ao
contrato estruturado em `config/campos-cadastro-demanda.json`.

O contrato estruturado deve ser a fonte consultada por serviços automatizados.
Este texto deve ser usado para revisão funcional e evolução da especificação.
Uma mudança semântica deve atualizar os dois arquivos na mesma alteração.

## Princípios

- Ausência de evidência significa ausência de valor. Não se usa zero, texto
  genérico ou aproximação para completar um campo.
- Ambiguidades e conflitos devem ser apresentados, não resolvidos
  silenciosamente.
- Todo valor sugerido deve apontar para documento, página e trecho de origem.
- Texto observado no documento, valor normalizado e identificador interno são
  informações distintas.
- Referências a instituição, pessoa, diretoria, plano, programa ou unidade
  territorial só se tornam definitivas depois de resolvidas contra o cadastro
  correspondente.
- Classificações controladas exigem valor pertencente ao domínio vigente.
- Datas completas são normalizadas para `AAAA-MM-DD`; datas incompletas não
  devem ser completadas por suposição.
- Valores monetários são normalizados como número decimal em reais.
- Classificação semântica e resolução cadastral permanecem sujeitas à revisão
  humana.

## Resultado esperado por campo

Cada campo processado deve produzir, quando aplicável:

| Propriedade | Conteúdo |
|---|---|
| `valor_observado` | Texto ou valor como aparece no documento |
| `valor_normalizado` | Valor convertido ao tipo e formato do campo |
| `identificador_resolvido` | ID interno encontrado no catálogo ou cadastro |
| `confianca` | Número entre 0 e 1 que qualifica a sustentação do resultado |
| `estado` | Situação do campo: ausente, extraído, resolvido, ambíguo, conflitante, inválido ou derivado |
| `evidencias` | Documento, página, trecho e método de obtenção |
| `observacoes` | Transformações, conflitos e pendências para revisão |

## Naturezas de informação

| Natureza | Definição |
|---|---|
| Textual identificadora | Denominação pela qual o objeto é reconhecido |
| Textual descritiva | Síntese de escopo, finalidade e conteúdo |
| Textual semântica | Informação que exige compreensão do papel do trecho no documento |
| Referencial cadastral | Vínculo com entidade já existente no SIGMA |
| Referencial hierárquica | Vínculo entre Plano, Programa e Projeto |
| Controlada ordinal | Escolha em escala ordenada de níveis válidos |
| Monetária | Valor financeiro em reais |
| Temporal | Data ou duração em meses |
| Espacial | Geometria, coordenada ou unidade territorial |
| Derivada | Resultado calculado a partir de outro dado |
| Sistêmica | Valor criado pela aplicação, não informado pelo usuário |

## Plano

Plano é um instrumento de planejamento estratégico que organiza objetivos,
diretrizes, horizonte e abrangência de longo prazo.

| Campo | Significado | Tipo e formato | Obrigatoriedade |
|---|---|---|---|
| Nome | Denominação oficial ou reconhecível do plano | Texto de 1 a 200 caracteres | Obrigatório |
| Descrição | Síntese do escopo, horizonte, conteúdo e finalidade | Texto livre não vazio | Obrigatório |
| Objetivo estratégico | Resultado estrutural ou de longo prazo pretendido | Texto livre | Opcional |
| Diretoria | Unidade organizacional responsável pelo enquadramento | ID de diretoria ativa | Obrigatório |
| Instituição | Pessoa jurídica interessada ou proponente | UUID de instituição do SIGMA | Obrigatório |
| CNPJ | Identificação fiscal da instituição | `00.000.000/0000-00`; derivado da instituição | Derivado |
| Representante | Pessoa física responsável pelo cadastro | UUID de pessoa do SIGMA | Obrigatório |
| Contatos | E-mail e telefone do representante | Textos derivados da pessoa selecionada | Derivados |
| Vigência inicial | Início formal da vigência | Data `AAAA-MM-DD` | Opcional |
| Vigência final | Encerramento ou fim do horizonte vigente | Data `AAAA-MM-DD` | Opcional |
| Valor total | Total financeiro previsto para execução | Decimal em BRL | Opcional |
| Maturidade | Estágio mais avançado efetivamente alcançado | Enum ordinal de cinco níveis | Opcional |
| Prazo de referência | Tempo até aprovação ou início da vigência | Inteiro não negativo em meses | Opcional |
| Base do prazo | Documento que sustenta o horizonte informado | Enum ordinal de cinco níveis | Opcional |
| Abrangência | Territórios cobertos pelo plano | Lista de UUIDs de unidades espaciais | Ao menos uma unidade |

O modelo de dados também aceita `responsavel` como texto opcional, embora o
formulário público atual não exponha uma entrada para esse campo.

## Programa

Programa é um conjunto coordenado de ações ou projetos orientado a um objetivo
operacional comum.

| Campo | Significado | Tipo e formato | Obrigatoriedade |
|---|---|---|---|
| Nome | Denominação oficial ou reconhecível | Texto de 1 a 200 caracteres | Obrigatório |
| Descrição | Síntese do escopo, finalidade e composição | Texto livre não vazio | Obrigatório |
| Objetivo | Resultado operacional pretendido | Texto livre | Opcional |
| Público-alvo | Pessoas, setores, territórios ou organizações beneficiados | Texto livre | Opcional |
| Justificativa | Problema, necessidade ou oportunidade que fundamenta o programa | Texto livre | Opcional |
| Órgão responsável | Órgão encarregado de coordenar ou executar | Texto de até 200 caracteres | Opcional |
| Vínculo institucional | Existência de vínculo formal com um plano | Booleano | Obrigatório |
| Plano vinculado | Plano que fornece contexto estratégico | Código de plano existente | Obrigatório quando há vínculo |
| Instituição | Pessoa jurídica interessada ou proponente | UUID de instituição do SIGMA | Obrigatório |
| CNPJ | Identificação fiscal da instituição | `00.000.000/0000-00`; derivado | Derivado |
| Representante | Pessoa física responsável pelo cadastro | UUID de pessoa do SIGMA | Obrigatório |
| Contatos | E-mail e telefone do representante | Textos derivados | Derivados |
| Capex | Investimento total para implantação, sem custeio anual | Decimal em BRL | Opcional |
| Maturidade | Estágio institucional efetivamente alcançado | Enum ordinal de cinco níveis | Opcional |
| Base do Capex | Documento técnico que sustenta o custo | Enum ordinal de seis níveis | Opcional |
| Prazo | Duração prevista para implantação | Inteiro não negativo em meses | Opcional |
| Base do prazo | Documento ou cronograma que sustenta a duração | Enum ordinal de seis níveis | Opcional |
| Abrangência | Territórios cobertos pelo programa | Lista de UUIDs de unidades espaciais | Ao menos uma unidade |

Programa não possui campos de vigência inicial e final no formulário atual.

## Projeto

Projeto é uma intervenção concreta, territorializável e executável, com objeto,
custo, prazo e localização próprios.

| Campo | Significado | Tipo e formato | Obrigatoriedade |
|---|---|---|---|
| Tipo de demandante | Natureza institucional ou privada do proponente | `institucional` ou `privada` | Obrigatório |
| Nome | Denominação específica da intervenção | Texto de 1 a 200 caracteres | Obrigatório |
| Descrição | Síntese do objetivo, escopo e justificativa | Texto livre | Opcional |
| Vínculo institucional | Existência de vínculo formal com Plano ou Programa | Booleano | Obrigatório |
| Tipo de vínculo | Nível hierárquico escolhido | `programa`, `plano` ou nulo | Condicional |
| Programa vinculado | Programa que enquadra o projeto | Código de programa existente | Condicional |
| Plano de referência | Plano que orienta enquadramento e classificação | ID ou código de plano existente | Obrigatório |
| Diretoria | Diretoria responsável, escolhida ou herdada | ID de diretoria ativa | Obrigatório |
| Instituição | Pessoa jurídica interessada ou proponente | UUID de instituição do SIGMA | Obrigatório |
| CNPJ | Identificação fiscal da instituição | `00.000.000/0000-00`; derivado | Derivado |
| Representante | Pessoa física responsável pelo cadastro | UUID de pessoa do SIGMA | Obrigatório |
| Contatos | E-mail e telefone do representante | Textos derivados | Derivados |
| Classificação | Frente PLI ou eixo PEF e eventual corredor TIC | Estrutura com IDs dos catálogos | Condicional ao plano |
| Vigência inicial | Início formal do projeto ou instrumento | Data `AAAA-MM-DD` | Opcional |
| Vigência final | Encerramento formal do projeto ou instrumento | Data `AAAA-MM-DD` | Opcional |
| Capex | Investimento de implantação e entrada em operação | Decimal em BRL | Opcional |
| Maturidade | Etapa técnica mais avançada efetivamente concluída | Enum ordinal de sete níveis | Opcional |
| Base do Capex | Documento técnico que sustenta o orçamento | Enum ordinal de seis níveis | Opcional |
| Prazo | Tempo até a disponibilidade para uso ou operação | Inteiro não negativo em meses | Opcional |
| Base do prazo | Documento que sustenta o cronograma | Enum ordinal de seis níveis | Opcional |
| Modal | Modo de transporte predominante afetado | ID de modal do catálogo | Opcional |
| Tipologia | Natureza principal da intervenção | ID de tipologia do catálogo | Opcional |
| Carteira | Conjunto institucional ao qual o projeto pertence | ID de carteira compatível | Opcional |
| Geometria | Representação espacial efetiva da intervenção | Estrutura GeoJSON | Obrigatório |
| Latitude | Latitude do ponto ou referência da geometria | Decimal entre -90 e 90 | Obrigatório |
| Longitude | Longitude do ponto ou referência da geometria | Decimal entre -180 e 180 | Obrigatório |
| Regionalidades | Enquadramentos territoriais da geometria | Estrutura calculada pelo sistema | Derivado |

O arquivo de perímetro é um insumo para formar a geometria. Ele não constitui,
por si só, um campo cadastral persistido.

## Valores ordinais

Os valores armazenados para maturidade e bases de estimativa são os rótulos
completos iniciados por `Nível N —`, e não códigos abreviados. As listas
canônicas de cada tipo estão declaradas integralmente no contrato JSON.

## Campos sistêmicos

Código, status inicial, data de criação e auditoria são gerados ou derivados
pela aplicação. Eles não devem ser solicitados como conteúdo documental nem
aceitos como decisão externa ao fluxo cadastral.

## Fontes do contrato

- `templates/paginas/cadastro/nova-demanda.html`
- `cadastro/cadastro.js`
- `api/schemas/plano.py`
- `api/schemas/programa.py`
- `api/schemas/demanda.py`
- `api/services/plano_service.py`
- `api/services/programa_service.py`
- `api/services/demanda_service.py`
- `api/services/campos_demanda.py`
- `database/075_niveis_prefixo_valores_nativos.sql`
- `config/catalogo-slt.json`

