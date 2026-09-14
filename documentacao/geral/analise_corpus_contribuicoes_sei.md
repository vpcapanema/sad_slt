# Análise do corpus de contribuições recebidas via SEI

Versão: 1.0.0  
Corpus: pasta `Contribuições`, analisada em 14/09/2026.  
Escopo: insumo para o futuro serviço de preenchimento assistido de Plano,
Programa e Projeto.

## Objetivo

Este documento descreve como as informações chegam nos PDFs e quais requisitos
isso impõe ao processo de extração. Ele complementa o contrato semântico em
`config/campos-cadastro-demanda.json`; não redefine o significado dos campos.

Os identificadores `D001` a `D033` usados abaixo correspondem à ordem alfabética
dos 33 PDFs da pasta na data da análise. Eles evitam reproduzir nomes extensos
e dados de protocolo no corpo desta documentação.

## Inventário observado

| Medida | Resultado |
|---|---:|
| PDFs | 33 |
| PDFs únicos por SHA-256 | 31 |
| Páginas | 469 |
| Páginas sem texto extraível | 119 |
| Páginas contendo imagens | 447 |
| PDFs sem texto extraível | 6 |
| PDFs com texto nativo muito reduzido | 1 |
| PDFs predominantemente textuais | 3 |
| PDFs híbridos | 23 |
| Maior documento | 254 páginas |

Foram encontrados dois pares de arquivos binariamente idênticos: `D001/D006`
e `D008/D021`. Também há conteúdo repetido ou relacionado em pacotes diferentes
sem identidade binária, o que exige detecção de quase duplicatas.

## Famílias documentais

As famílias se sobrepõem. Um único PDF pode conter mais de uma delas.

| Família | Forma de chegada | Consequência para a extração |
|---|---|---|
| Ofício e solicitação formal | Papel timbrado, assunto, texto corrido, assinatura e carimbos | Identificar remetente, destinatário e objeto sem confundir papéis institucionais |
| E-mail e encaminhamento | Impressão do Outlook, cadeia de mensagens e referência a anexos | Tratar como invólucro administrativo; não assumir que seu assunto é o nome da demanda |
| Estudo e proposta técnica | Relatórios extensos, apresentações, anexos legais e estudos financeiros | Segmentar capítulos e reconhecer que pode haver várias iniciativas no mesmo PDF |
| Planilha orçamentária | Tabelas densas, subtotais, BDI e total geral | Preservar células, cabeçalhos e hierarquia; texto linear não basta |
| Planta, mapa e desenho | Pranchas, cotas, legendas, coordenadas e fotografias | Usar OCR orientado a layout e análise visual/espacial |
| Evidência complementar | Notícias, protocolos, comprovantes, legislação e peças de apoio | Classificar como sustentação, não como fonte principal por padrão |

Exemplos representativos observados incluem ofícios digitalizados (`D002`,
`D004`, `D030`), planilhas (`D007`, `D019`, `D020`, `D032`), desenhos e plantas
(`D001`, `D014` a `D016`), e estudos ou apresentações extensas (`D009`, `D010`,
`D012`, `D025` a `D029`, `D031`). `D010`, com 254 páginas, reúne conteúdos
legais, técnicos, ambientais e financeiros e pode representar mais de uma
iniciativa. `D033` aparenta ser uma impressão digital de correspondência, mas
não possui texto extraível, demonstrando que a decisão por OCR deve ocorrer por
página, e não pela aparência geral do arquivo.

## Conclusões estruturais

1. Arquivo PDF não é sinônimo de demanda. Um arquivo pode ser invólucro, anexo,
   duplicata, conjunto documental ou conter várias demandas candidatas.
2. A unidade inicial de processamento é a página; a unidade intermediária é o
   segmento documental; a unidade de saída é a demanda candidata.
3. Extração de texto nativo e OCR são complementares. Em PDFs híbridos, a
   escolha precisa ser feita página a página.
4. Tabelas, mapas, plantas, assinaturas e carimbos carregam informação que se
   perde quando o conteúdo é convertido apenas em texto corrido.
5. Cada valor sugerido precisa manter sua evidência, método de obtenção e papel
   da fonte. Sem isso, o analista não consegue auditar nem corrigir a sugestão.
6. Conflitos devem permanecer explícitos. Datas, custos, nomes e responsáveis
   podem variar entre ofício, estudo, orçamento e versão revisada.

## Pipeline requerido

### 1. Ingestão e inventário

- validar o PDF e limites operacionais;
- calcular hash do arquivo e hash perceptual de páginas;
- registrar quantidade, tamanho, rotação, dimensões, camada textual, imagens e
  formulários incorporados;
- detectar duplicatas exatas antes do processamento pesado;
- preservar o arquivo original e a versão do processamento.

### 2. Extração por página

- extrair texto nativo com posições e blocos;
- medir suficiência e qualidade da camada textual;
- aplicar OCR em português nas páginas insuficientes, com correção de rotação e
  inclinação;
- extrair tabelas mantendo linhas, colunas, células e cabeçalhos;
- analisar visualmente mapas, plantas e páginas gráficas quando texto e OCR não
  representarem seu conteúdo;
- guardar o texto observado separadamente do texto corrigido ou normalizado.

### 3. Reconstrução documental

- agrupar páginas em ofício, e-mail, estudo, orçamento, desenho, legislação ou
  evidência complementar;
- identificar anexos e limites internos mesmo quando todos foram unidos em um
  único PDF;
- detectar páginas e documentos quase duplicados;
- classificar o papel de cada segmento: solicitação principal, fonte técnica,
  fonte financeira, fonte espacial, invólucro ou evidência.

### 4. Identificação de demandas candidatas

- localizar objetos independentes e não presumir uma demanda por arquivo;
- permitir que o analista selecione uma entre várias candidatas ou as desdobre;
- relacionar documentos que tratem da mesma iniciativa em processos ou pacotes
  diferentes;
- não criar demanda quando houver apenas encaminhamento sem objeto suficiente.

### 5. Extração semântica orientada ao formulário

Antes da execução, o usuário informa `plano`, `programa` ou `projeto`, com
`projeto` como padrão. O serviço carrega apenas os campos e domínios do tipo
escolhido a partir do contrato estruturado. Uma incompatibilidade forte entre o
tipo escolhido e o conteúdo gera aviso, mas não altera a escolha do usuário.

Para cada campo, o processamento deve produzir candidatos com valor observado,
valor normalizado, confiança, estado, documento, página, trecho ou região e
método de obtenção. Campos sem evidência permanecem em branco.

### 6. Normalização e resolução

- distinguir data do documento, protocolo, vigência e marco de cronograma;
- distinguir Capex total, subtotal, item, custeio, receita e financiamento;
- validar CNPJ, e-mail, telefone, moeda, datas e unidades;
- interpretar coordenadas decimais ou projetadas e registrar sistema de
  referência quando identificado;
- resolver instituições, pessoas, planos, programas, diretorias, modais,
  tipologias, carteiras e unidades territoriais contra cadastros vigentes;
- conservar como ambíguo o que tiver mais de uma correspondência plausível.

### 7. Validação e revisão humana

- aplicar obrigatoriedade, domínio, faixa, dependência e consistência temporal;
- apresentar conflitos lado a lado, sem sobrescrever silenciosamente;
- exibir a página e destacar a evidência de cada candidato;
- permitir aceitar, rejeitar, editar ou escolher outra evidência por campo;
- registrar autoria humana e automática, versão e decisão final.

## Estratégia por natureza de campo

| Campo ou grupo | Fontes mais prováveis | Tratamento necessário |
|---|---|---|
| Nome, descrição, objetivo e justificativa | assunto do ofício, pedido explícito, resumo executivo e títulos técnicos | síntese semântica com separação entre nome oficial, objeto pedido e contexto |
| Instituição, representante e contatos | timbre, assinatura, rodapé, CNPJ e cabeçalho do e-mail | classificar proponente, remetente, destinatário, autor e consultor antes de resolver cadastros |
| Valores e base do Capex | orçamento, quadro de investimentos e estudo técnico | reconstruir tabela, identificar moeda/data-base e escolher total compatível com o escopo |
| Prazo, vigência e bases | cronograma, ofício, contrato, estudo e texto legal | atribuir papel a cada data e converter duração somente quando os marcos forem claros |
| Maturidade | menções a ideia, estudo, EVTEA, anteprojeto, projeto básico, executivo, licença, contrato ou obra | inferir apenas o estágio comprovado por evidência documental e submeter à confirmação |
| Abrangência e geometria | municípios citados, endereço, coordenadas, mapas, plantas e memoriais | geocodificar, transformar CRS quando necessário e validar contra limites territoriais oficiais |
| Classificação, modal e tipologia | objeto, descrição técnica e infraestrutura afetada | classificar semanticamente e depois mapear aos catálogos; não gravar rótulo livre como ID |
| Vínculos hierárquicos | menção explícita a plano/programa e registros existentes | buscar candidatos no sistema e exigir confirmação; menção textual isolada não cria vínculo |

## Precedência e conflitos

A precedência não é absoluta, mas orienta a pontuação dos candidatos:

1. solicitação formal assinada ou formulário oficial para objeto, proponente e
   intenção declarada;
2. documento técnico mais recente e explicitamente revisado para escopo,
   maturidade, prazo e características;
3. orçamento identificado e totalizado para Capex;
4. mapas, plantas e memoriais para localização e geometria;
5. e-mails e protocolos para contexto administrativo e rastreabilidade;
6. notícias e peças promocionais apenas como evidência auxiliar.

Valor explícito e contextualizado prevalece sobre inferência. Quando fontes de
mesmo peso divergirem, o campo deve ficar `conflitante` até decisão humana.

## Critérios mínimos para o novo serviço

- processar PDF textual, digitalizado e híbrido no mesmo fluxo;
- suportar múltiplos documentos e múltiplas demandas por arquivo;
- deduplicar arquivo, página e conteúdo semelhante;
- conservar layout de tabelas e localização das evidências;
- preencher somente valores sustentados e manter os demais em branco;
- retornar candidatos auditáveis, não apenas um JSON final opaco;
- usar o tipo escolhido pelo usuário, com Projeto como padrão;
- respeitar os domínios e dependências do contrato de campos;
- medir qualidade por campo e por família documental em um conjunto de teste
  anotado, não apenas por quantidade total de campos preenchidos.

## Próxima etapa recomendada

Antes de substituir o serviço, deve ser criado um conjunto de avaliação
representativo, com documentos de cada família e respostas validadas por um
analista. A implementação só deve ser considerada adequada quando melhorar a
precisão dos valores aceitos, a cobertura dos campos e a rastreabilidade, sem
aumentar preenchimentos incorretos.
