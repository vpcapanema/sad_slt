# Reorganização da Plataforma

Este documento registra as decisões já validadas para reorganizar os módulos,
acessos, sessões e páginas da aplicação.

## Identidade da plataforma

O nome oficial da plataforma será:

**SICARD — Sistema Inteligente de Cadastro e Ranking de Demandas**

A sigla combina os elementos centrais da plataforma:

- **SI** — Sistema Inteligente;
- **CA** — Cadastro;
- **R** — Ranking;
- **D** — Demandas.

## Método de trabalho

A reorganização será construída iterativamente:

1. O responsável pelo produto apresenta a proposta.
2. A proposta é analisada considerando o contexto atual da aplicação.
3. São sugeridos ajustes objetivos.
4. A decisão final é validada em conjunto.
5. Nenhuma etapa seguinte começa sem autorização expressa.

## Hierarquia principal da plataforma

A plataforma terá três blocos principais, correlacionados, mas independentes.

### 1. Cadastro de Demandas

Reúne as páginas de orientação, cadastro, análise e disponibilização das demandas
que poderão ser avaliadas e hierarquizadas.

O nome do bloco deve ser intuitivo para o usuário externo. As atividades de
gestão, análise e aprovação aparecem dentro da área interna deste bloco, sem
transformar "Gestão de Demandas" em uma entrada principal para o público.

### 2. Hierarquização de Demandas

Reúne o processo de hierarquização e as ferramentas utilizadas para construir,
preparar e avaliar os insumos consumidos por esse processo, incluindo análise
multicritério e recursos geoespaciais.

### 3. Transparência e Acompanhamento

Reúne a publicação de demandas aprovadas e ranqueadas, resultados, mapas,
indicadores, páginas informativas e o acompanhamento da execução pela população.

A aprovação de uma demanda não provoca publicação automática. O gestor decide
quando e se as informações serão publicadas.

## Diretriz central

### Desburocratização sem prejuízo à segurança e à transparência

Os processos devem ser simples para o usuário, mantendo segurança,
rastreabilidade e transparência incorporadas ao funcionamento da aplicação.

São diretrizes obrigatórias:

- Solicitar apenas dados realmente necessários.
- Evitar etapas, aprovações e autenticações sem finalidade concreta.
- Reaproveitar dados existentes, sem exigir preenchimento duplicado.
- Manter a segurança no backend, sem transferir complexidade ao usuário.
- Registrar automaticamente autor, data, alterações e decisões.
- Exibir claramente o status e o próximo passo de cada demanda.
- Estruturar como publicáveis, por padrão, as informações que puderem ser
  divulgadas, protegendo dados pessoais e sensíveis.
- Publicar somente mediante decisão expressa do gestor.
- Exigir aprovação formal apenas quando houver efeito administrativo ou
  decisório.
- Manter histórico imutável das decisões sem burocratizar o fluxo.

### Regras para publicação

- Cadastro e análise permanecem internos até decisão expressa de publicação.
- A publicação é um ato administrativo rastreável.
- Devem ser registrados o responsável, a data e a versão publicada.
- Alterações posteriores não modificam silenciosamente o conteúdo publicado.
- A despublicação deve possuir justificativa e registro.
- Dados pessoais e sensíveis não integram a versão pública.

## Operadores e responsabilidades

Os operadores internos seguem os tipos de usuário existentes no SIGMA-PLI:

1. `VISUALIZADOR` — nível 1
2. `OPERADOR` — nível 2
3. `ANALISTA` — nível 3
4. `GESTOR` — nível 4
5. `ADMIN` — nível 5

Além deles, existe o usuário público/demandante, que não é um operador interno.

### Público ou demandante

- Cadastra uma demanda.
- Acompanha sua tramitação conforme as informações disponibilizadas.

### Visualizador

- Consulta informações internas autorizadas.
- Não altera dados nem toma decisões.

### Operador

- Cadastra, complementa e corrige dados.
- Executa procedimentos operacionais.
- Não aprova nem homologa decisões.

### Analista

- Realiza análise técnica.
- Registra parecer.
- Aprova a demanda.
- Disponibiliza a demanda para hierarquização.

A aprovação deve registrar autor, data, parecer e a versão da demanda que foi
disponibilizada.

### Gestor

- Supervisiona o processo.
- Homologa resultados.
- Decide quando e se uma informação será publicada.

### Administrador

- Administra usuários, permissões e configurações técnicas.
- Não substitui automaticamente o gestor em decisões administrativas.

## Serviços transversais

Autenticação, autorização, auditoria, histórico, configurações e publicação são
serviços transversais. Eles atendem aos três blocos e não constituem, por si só,
um quarto bloco principal.

## Página inicial geral do SICARD

A página inicial geral será a porta de entrada da plataforma e terá três cards
principais. Cada card levará diretamente à página `index` do respectivo bloco:

1. **Cadastro de Demandas** — acesso ao índice do bloco de cadastro.
2. **Hierarquização de Demandas** — acesso ao índice do bloco de hierarquização.
3. **Transparência e Acompanhamento** — acesso ao índice do bloco público de
   resultados e acompanhamento.

Documentação e cadastros auxiliares ficarão em uma seção separada de
**Documentação e links úteis**, sem criar um quarto bloco funcional. Essa seção
terá:

- link para a documentação completa do SICARD em `/public/documentacao/`;
- link para o cadastro unificado de pessoa e usuário no SIGMA-PLI:
  <https://56.125.163.194/cadastro/sigma>;
- link para o cadastro de instituição no SIGMA-PLI:
  <https://56.125.163.194/cadastro/instituicao>.

O SIGMA-PLI realiza o cadastro de pessoa e a criação da conta de usuário no mesmo
formulário. Por isso, os acessos identificados como “Cadastro de pessoa” e
“Cadastro de usuário” devem apontar para o cadastro unificado.

## Páginas de entrada dos blocos

Cada um dos três blocos terá sua própria página `index`, funcionando como índice
das páginas e funcionalidades daquele bloco.

Rotas dos índices:

- `/public/cadastro/` — Cadastro de Demandas;
- `/restrict/hierarquizacao/` — Hierarquização de Demandas;
- `/public/transparencia/` — Transparência e Acompanhamento.

As três páginas devem compartilhar a mesma estrutura visual, a mesma quantidade
de cards e a mesma função semântica em cada posição. O conteúdo muda conforme o
bloco, mas a finalidade de cada card permanece equivalente.

### Estrutura padronizada

1. **Finalidade** — apresenta o objetivo do bloco.
2. **Ação principal** — permite cadastrar uma demanda, iniciar uma
   hierarquização ou consultar publicações.
3. **Acompanhamento** — apresenta protocolo, processo de hierarquização ou
   execução publicada.
4. **Recursos e ferramentas** — reúne catálogos, ferramentas AHP e geoespaciais,
   mapas ou indicadores.
5. **Resultados** — apresenta demandas disponibilizadas, rankings homologados ou
   resultados publicados.
6. **Orientações** — reúne regras, metodologia, ajuda e documentação.

Todos os cards devem possuir:

- mesma posição e padrão visual;
- título com função equivalente;
- descrição curta;
- indicação de acesso público ou restrito;
- botão de ação padronizado.

A composição visual de cada card segue esta ordem vertical:

1. ícone centralizado;
2. título centralizado;
3. conteúdo centralizado;
4. botões e demais ações centralizados.

As páginas comuns utilizam 90% da largura disponível, seguindo o módulo AHP.
Painéis e bancadas de mapa podem preservar o layout próprio necessário à sua
operação.

## Navegação padronizada

A plataforma possui somente duas versões de navbar.

### Navbar pública

1. Marca SICARD com acesso ao índice geral.
2. Cadastro de Demandas.
3. Transparência e Acompanhamento.
4. Documentação.
5. Botão discreto “Área restrita”, no extremo direito.

A Hierarquização de Demandas não aparece na navbar pública. Catálogos e o
formulário ficam organizados dentro do índice de Cadastro de Demandas.

### Navbar restrita

1. Início, levando ao índice do bloco atual.
2. Cadastro de Demandas, com painel administrativo e análise de demandas.
3. Hierarquização de Demandas, cujo índice reúne AHP e ferramentas geoespaciais.
4. Transparência e Acompanhamento.
5. Documentação.

Na parte inferior da navbar restrita fica integrada a statusbar da sessão. Ela
exibe nome da pessoa, nome de usuário, tipo de usuário e a ação de sair. Sua
apresentação é compacta, sem bordas ou fundo próprio; os dados usam o verde PLI,
e o botão de saída possui fundo transparente, borda branca e texto verde PLI.

### Padrão de rotas

- Toda página pública usa o prefixo `/public/`.
- Toda página restrita usa o prefixo `/restrict/`.
- URLs de páginas não exibem a extensão `.html`.
- Rotas antigas podem redirecionar para as rotas canônicas, mas não devem ser
  usadas na interface.

### Hierarquia validada do bloco Cadastro de Demandas

A página pública `/public/cadastro/` é o índice do bloco e contém os seis cards
padronizados definidos acima.

Páginas e recursos públicos:

- `/public/cadastro/` — índice do bloco;
- `/public/cadastro/nova-demanda/` — formulário de cadastro de demanda;
- `/public/painel/` — painel de consulta e acompanhamento;
- `/public/login/` — entrada para autenticação dos operadores;
- `/public/cadastro/catalogo-diretorias/` — catálogo de diretorias;
- `/public/cadastro/catalogo-planos/` — catálogo de planos;
- `/public/cadastro/catalogo-frentes-pli/` — catálogo de frentes do PLI-SP;
- `/public/cadastro/catalogo-eixos-pef/` — catálogo de eixos do PEF-SP.

Páginas restritas:

- `/restrict/painel/` — painel administrativo;
- `/restrict/demandas/` — consulta e análise interna das demandas.

Os links para as páginas restritas podem ser apresentados no índice, mas devem
ser identificados como restritos e continuar protegidos por autenticação e
autorização no backend.

## Árvore do bloco Hierarquização e Ranking

O índice restrito `/restrict/hierarquizacao/` utiliza uma árvore hierárquica
invertida. O nó superior é o ranking final; abaixo dele aparecem as três fases
metodológicas que contribuem para o resultado:

1. Fase 1 — filtros e elegibilidade territorial;
2. Fase 2 — favorabilidade territorial;
3. Fase 3 — ajuste fino dos projetos.

A árvore inclui os módulos produtores e seus insumos:

- gerador de risco e restrição ligado à Fase 1;
- gerador de favorabilidade e configuração AHP ligados à Fase 2;
- comparação pareada, escolha do método, critérios e objetos ligados ao AHP;
- configurador de atributos e ajuste fino ligado à Fase 3;
- insumos geoespaciais, bancada de geoprocessamento, produtos homologados,
  gestão de rodadas e metodologia como recursos integrados.

Os ramos podem ser recolhidos para reduzir a densidade visual. As fases
metodológicas ainda não possuem execução automática integrada de ponta a ponta;
essa diferença deve permanecer visível até a implementação do fluxo completo.

## Questões pendentes

Ainda precisam ser definidas e validadas:

- A divisão interna de cada um dos três blocos.
- Quais páginas pertencem a cada subdivisão.
- O tipo de acesso de cada página.
- Se o demandante escolhe entre plano, programa e projeto ou cadastra uma demanda
  genérica para classificação posterior.
- As permissões específicas de cada operador em cada bloco.
- O fluxo completo entre cadastro, aprovação, hierarquização, homologação e
  publicação.
