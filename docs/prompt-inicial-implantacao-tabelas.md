# Prompt inicial — vpc_websistemas-adm: área administrativa do banco websistemas

Você vai criar, **neste repositório** (`vpc_geoser_websistemas_e_geoinformacao-ADM`),
a aplicação **`vpc_websistemas-adm`** — a área administrativa da plataforma
VPC — contendo **a interface completa de todas as tabelas de todos os
esquemas do banco de dados `websistemas`**, exceto as do esquema `publica`,
aplicando o **layout padrão das tabelas**, o **padrão de páginas** e a
**modularização** definidos abaixo. Nenhuma tabela dos demais esquemas pode
ficar de fora.

O repositório está **vazio** (contém apenas `AGENTS.md`, `CLAUDE.md`,
`.github/instructions/` e `docs/`): não há aplicação, árvore de páginas,
navbar nem conexão de banco prontas. Tudo isso será criado por você segundo
este documento. A **árvore de módulos e páginas** a ser implementada é a
indicada na seção "Árvore de módulos e páginas" — ela é a estrutura de
navegação da aplicação.

## Projeto, repositório e stack

- **Nome da aplicação**: `vpc_websistemas-adm`.
- **Inicializar o repositório Git** na raiz (`git init`, `.gitignore`
  adequado à stack, `README.md` com instruções de instalação e execução,
  arquivo de exemplo de variáveis de ambiente **sem segredos**). Nunca
  versionar credenciais.
- **Stack**: somente ferramentas e soluções **open source**, **amplamente
  consolidadas e utilizadas pela comunidade**, com **documentação vasta e
  acessível** (ex.: Python com FastAPI ou Flask/Django, Jinja2, PostgreSQL
  via psycopg/SQLAlchemy, HTML/CSS/JS padrão sem dependências proprietárias;
  ou equivalente igualmente consolidado em outra linguagem). Nada de
  frameworks de nicho, serviços pagos ou bibliotecas pouco mantidas.
  Apresentar a stack escolhida, com justificativa breve, na Etapa 1 e
  aguardar minha aprovação antes de criar o projeto.
- **Conexão ao banco `websistemas`**: **o banco e o workspace já estão
  configurados**. Antes de criar qualquer configuração nova, localizar a
  conexão existente (variáveis de ambiente, arquivo `.env`/configuração
  local, conexão da extensão de banco do VS Code) e reutilizá-la; não
  duplicar nem alterar a configuração existente. A aplicação lê os dados de
  acesso por variáveis de ambiente a partir de arquivo local ignorado pelo
  Git. Se não localizar a conexão, parar e me perguntar onde ela está; não
  seguir com mock.

## Referência visual obrigatória

A identidade visual da plataforma está documentada na página
**Referência visual e tipográfica · VPC e ITAA**, aba **VPC**:
`http://127.0.0.1:8765/referencia-visual-tipografia.html#vpc` (arquivo
`R:\auditor_ambiental_inteligente_de_propriedades_rurais\docs\referencia-visual-tipografia.html`;
se o servidor local não estiver ativo, abra o arquivo diretamente no
navegador). Ela contém, medidos da plataforma real, os tokens de cor, os
pares texto/fundo, a escala e os estilos tipográficos, raios, bordas,
sombras, espaçamentos, pontos de quebra e componentes (navbar, rodapé, cards,
botões, formulários).

Regras de uso dessa referência:

- **Obrigatório reproduzir**: a **tipografia** (famílias, pesos, escala), as
  **cores** (tokens e papéis de cada cor) e os componentes **navbar** e
  **rodapé**, com as mesmas dimensões, cores, fontes e comportamento
  medidos. Toda página da área administrativa tem essa navbar e esse rodapé.
- **Não é necessário copiar a estrutura das páginas** de origem (seções,
  blocos, textos, layout de conteúdo). A estrutura das páginas da área
  administrativa é a definida neste documento (index do módulo, formulário,
  interface da tabela). Da referência vêm a aparência e a identidade, não o
  conteúdo nem a composição.
- Não inventar cores, fontes, raios ou sombras: se algo necessário não
  estiver na referência, derivar do token mais próximo e registrar a
  derivação para minha aprovação.

## Etapa 1 — Leitura e levantamento (antes de qualquer código)

1. Ler integralmente `AGENTS.md` (e `CLAUDE.md`),
   `.github/instructions/tabelas-padrao.instructions.md` e
   `docs/prompt-layout-padrao-tabelas.md`. Esses documentos definem a
   estrutura, a ordem dos elementos, os alinhamentos, as dimensões, os
   espaçamentos e a hierarquia tipográfica das tabelas. Nada disso pode ser
   alterado; apenas família de fonte, cores e conteúdo variam, e devem ser
   os da referência visual VPC.

2. Extrair da referência visual (aba VPC) e me apresentar as **referências
   de cor e tipografia** que você vai usar, já na forma de um arquivo de
   tokens CSS (`:root`) do projeto:
   - tokens de cor e o papel de cada um na navbar, no rodapé, nos cards, nos
     formulários e na tabela: fundo do cabeçalho, zebrado (linha ímpar/par),
     linha selecionada, bordas, links de célula, par de cores de cada botão
     de controle (ícone + borda mais escura), cor de destaque do paginador,
     cor do contador, botões de formulário, placeholder;
   - famílias e pesos de fonte: a de corpo (dados, filtros, paginador,
     contador, campos de formulário) e a de títulos (título de página,
     título da tabela, cabeçalhos de coluna, cabeçalhos de grupo, rótulo de
     seção), com a forma de carregamento (arquivos locais ou fonte livre
     equivalente);
   - medidas da navbar e do rodapé (altura, espaçamentos, tipografia, cores,
     estados de hover/ativo) para reprodução fiel.
   Não inventar cores nem fontes.

3. Inventariar o banco `websistemas` a partir do catálogo real
   (`information_schema` / `pg_catalog`), com conexão real, sem mock: listar
   **todos os esquemas** (exceto `publica`) e, para cada esquema, **todas as
   tabelas**, com suas colunas, tipos, obrigatoriedade, chaves primárias,
   chaves estrangeiras, comentários existentes (`COMMENT ON`) e, para cada
   coluna com valores controlados, a **tabela do esquema de domínio** que
   fornece os valores possíveis. Associar cada esquema/tabela a um módulo e
   submódulo da árvore de módulos e páginas, indicando as tabelas sem módulo
   evidente para minha decisão.

4. Elaborar o **catálogo único de alias amistosos** — um único arquivo
   versionado, centralizado, fonte da verdade para toda a interface (ex.:
   `config/catalogo-alias-tabelas.json` ou equivalente ao padrão do
   repositório), contendo, por esquema e tabela: o alias do esquema, o alias
   da tabela (título) e o alias de cada coluna (cabeçalho e rótulo de campo
   de formulário), além de descrição curta opcional, e, para as tabelas do
   esquema de domínio, o alias de cada valor quando o valor bruto não for
   legível. Regras obrigatórias dos aliases:
   - **Português brasileiro, norma culta padrão**, com acentuação correta,
     concordância nominal e sem abreviações, siglas internas, `snake_case`
     ou termos técnicos de banco (ex.: `dt_cad` → "Data de Cadastro";
     `id_usuario_resp` → "Usuário Responsável"; `qtd_itens` → "Quantidade de
     Itens"). Siglas consagradas (CPF, CNPJ, CEP, SEI, UF) podem permanecer.
   - **Títulos de tabela e de página em Title Case** (iniciais maiúsculas nas
     palavras significativas; artigos, preposições e conjunções em
     minúsculas). Título da tabela no formato "Tabela de/das …".
   - **Cabeçalhos de coluna em caixa alta**, obtidos do alias da coluna, com
     acentuação preservada (ex.: "DATA DE CADASTRO", "RESPONSÁVEL PELA
     HOMOLOGAÇÃO"), respeitando a família de fonte de cabeçalho da
     referência. **Rótulos de campo de formulário** usam o mesmo alias, em
     Title Case.
   - **Valores de listas suspensas em Title Case**, com alias amistoso
     quando o valor bruto do domínio não for legível.
   - Nenhum alias pode ser definido localmente em template, componente ou
     script: a interface deve sempre consumir o catálogo. Nome de coluna ou
     valor de domínio sem alias no catálogo é erro, não fallback silencioso.

5. Para cada tabela do inventário, propor:
   - **Grupos de colunas** da interface da tabela: nome de cada grupo (em
     português, norma culta) e colunas que o compõem, por afinidade
     semântica; mínimo de dois grupos; a coluna de seletores e a
     identificação principal ficam fora de grupos ocultáveis. Cada grupo gera
     um botão mostrar/ocultar na barra de filtros e um cabeçalho de grupo.
   - **Subseções temáticas do formulário**: agrupamento dos campos por tema
     (em regra, os mesmos grupos das colunas), com a ordem das subseções e a
     disposição dos campos em colunas dentro de cada uma.
   - **Composição da barra de botões de controle**: quais botões comuns se
     aplicam (Visualizar, Editar, Cancelar edição, Salvar, Excluir, Exportar,
     Limpar seleção, nessa ordem, somente os cuja operação exista para aquela
     tabela) e quais **botões específicos** daquele conteúdo são necessários,
     após os comuns, com nome (rótulo concordando com o objeto da tabela),
     ícone e par de cores próprio. Grupos e barra de controle são
     obrigatórios em toda tabela; apenas seus nomes e funções variam com o
     conteúdo.
   - **Posição na árvore de módulos**: módulo/submódulo a que a tabela
     pertence, rotas das três páginas e nomes dos arquivos HTML/JS/CSS e dos
     módulos de backend, conforme a seção de modularização.

**Pare aqui e aguarde minha confirmação** da stack, das referências
(item 2), do inventário (item 3), do catálogo de aliases (item 4), das
propostas (item 5) e da estrutura de diretórios da modularização.

## Árvore de módulos e páginas

```text
Acesso Restrito
└── Módulos
    ├── Cadastro
    │   ├── Pessoas físicas
    │   ├── Pessoas jurídicas
    │   ├── Usuários
    │   ├── Organizações
    │   └── ...
    ├── Domínios
    │   └── Perfis globais de usuário
    ├── Autenticação
    ├── Comercial
    └── Auditoria
```

Essa é a árvore de módulos da aplicação e deve ser implementada como
estrutura de navegação (menu da navbar, páginas index dos módulos e
diretórios). "Acesso Restrito" é a raiz autenticada da área administrativa;
cada item de segundo nível é um **módulo**, com sua página index; os itens
de terceiro nível são **submódulos** (ou tabelas) do módulo. As reticências
em "Cadastro" indicam que as demais tabelas do esquema de cadastro devem ser
acrescentadas conforme o inventário do banco. Cada esquema/tabela do
inventário deve ser associado a um módulo (e, quando houver, a um submódulo)
dessa árvore; tabelas sem módulo evidente devem ser apontadas na Etapa 1
para que eu decida a alocação.

## Modularização obrigatória em nível de página

A aplicação deve ser **modularizada em nível de página**, com a mesma
hierarquia da árvore refletida nos diretórios da interface e do backend.

### Interface (HTML, JS, CSS)

- Os arquivos **HTML** ficam em diretórios separados por **módulo e
  submódulo**, exatamente como na árvore (ex.: `templates/app/cadastro/`,
  `templates/app/cadastro/pessoas_fisicas/`, `templates/app/auditoria/`).
- A **mesma estrutura de pastas** deve existir para os arquivos **JS** e
  **CSS** (ex.: `static/js/app/auditoria/`, `static/css/app/auditoria/`),
  com um arquivo JS e um CSS próprios para cada página, além dos componentes
  compartilhados em diretório comum.
- **Nomenclatura dos arquivos de interface**: `nome do submódulo` +
  `nome da tabela` + `nome da página`, em minúsculas, sem acentos, unidos
  por `_`. A página index do módulo chama-se `index_<modulo>`. Exemplo:

  ```text
  templates/
    app/
      auditoria/
        index_auditoria.html
        auditoria_evento_formulario.html
        auditoria_evento_tabela.html
  static/
    js/app/auditoria/
        index_auditoria.js
        auditoria_evento_formulario.js
        auditoria_evento_tabela.js
    css/app/auditoria/
        index_auditoria.css
        auditoria_evento_formulario.css
        auditoria_evento_tabela.css
  ```

  Criar a estrutura e os arquivos correspondentes de CSS e JS para **todas**
  as páginas, mesmo que inicialmente só importem os componentes
  compartilhados. Os caminhos-raiz (`templates/`, `static/`) podem ser
  adaptados ao padrão da stack aprovada, preservando a hierarquia por
  módulo.

### Backend

- É **obrigatória a separação em módulos** espelhando a árvore: por módulo
  (e submódulo), diretórios/pacotes próprios de **rotas**, **serviços**,
  **APIs**, **modelos**, **repositórios/acesso a dados**, **esquemas de
  validação**, **catálogos** e o que mais as boas práticas da stack
  aprovada determinarem. Nenhum módulo acessa diretamente arquivos
  internos de outro; dependências comuns ficam em um pacote compartilhado.
- **Arquivos de rotas contêm somente rotas puras**: registro do caminho,
  método, autenticação/permissão e delegação para o serviço. **Nenhuma
  lógica ou regra de negócio, validação, consulta ou transformação de dados
  nas rotas.** Isso fica nos catálogos (aliases, domínios, configurações),
  nos arquivos de serviços ou no módulo mais adequado (repositórios,
  validadores). Rota que contenha regra de negócio é erro a corrigir.
- O catálogo único de aliases é consumido pelo backend e pela interface a
  partir do mesmo arquivo; nenhum módulo pode duplicá-lo.
- Apresentar, na Etapa 1, a estrutura de diretórios completa proposta
  (interface e backend) para todos os módulos antes de criar arquivos.

## Padrão de páginas — mínimo de três páginas por tabela de cada esquema

Para **cada tabela de cada esquema** haverá, no mínimo, as três páginas
abaixo, encaixadas na árvore de módulos. Páginas do mesmo módulo
compartilham a página index do módulo. **Todas as páginas** terminam com o
**rodapé padrão VPC**, reproduzido da referência visual.

### 1. Página index do módulo

Seções e elementos mínimos, nesta ordem:

**1.1 Cabeçalho — navbar padrão VPC.** Reproduzir a navbar da referência
visual (estrutura, dimensões, tipografia, cores, comportamento). Adaptar o
nome e o conteúdo dos menus às páginas e aos conteúdos do módulo,
**mantendo um menu comum a todas as páginas** com os destinos-chave gerais
da aplicação (no mínimo: raiz do Acesso Restrito, cada módulo da árvore,
perfil do usuário e sair), para que o usuário, em qualquer módulo, consiga
ir às páginas gerais a partir de qualquer ponto. Me apresentar a composição
desse menu comum para confirmação.

**1.2 Boas-vindas e apresentação do módulo.** Saudação ao usuário autenticado
(nome, quando disponível), título do módulo (Title Case) e texto breve
explicativo do que o módulo contém e para que serve, em norma culta.

**1.3 Páginas do módulo.** Cards organizados em um **grid regular de
dimensão dinâmica**: a largura dos cards deve se ajustar para **não deixar
espaços vazios no grid**; sempre que possível, organizar os cards **no menor
número de linhas**, priorizando distribuí-los em colunas (ex.: 5 páginas →
uma linha de 5 cards; 7 páginas → 4 + 3 com cards redimensionados para
preencher a largura, não 3 linhas). **Um card por página do módulo.** Cada
card é inteiramente um botão/link que abre a página correspondente **em
outra aba** (`target="_blank"` com `rel="noopener"`), contendo ícone, título
da página (Title Case) e descrição curta. O card segue a aparência de card
da referência visual e é um componente compartilhado.

### 2. Página do formulário da tabela

**2.1 Cabeçalho — navbar padrão VPC**, idêntica à do item 1.1.

**2.2 Título da página**, **centralizado na largura da página**, contendo
como parte constituinte o **alias do esquema** e o **alias da tabela**
(Title Case), ex.: "Cadastro — Solicitações de Acesso".

**2.3 Campos de cadastro.** Um campo por coluna editável da tabela (chaves
geradas automaticamente, carimbos de data/hora e campos de auditoria não
aparecem como entrada). Cada campo é composto por:
- **Rótulo**: o alias amistoso da coluna, do catálogo único, em Title Case;
  indicar obrigatoriedade conforme o banco.
- **Entrada**: **sempre que possível, uma lista suspensa** com os valores
  possíveis, para que o usuário selecione em vez de digitar. Os valores
  possíveis vêm das **tabelas específicas do esquema de domínio** (e das
  tabelas referenciadas por chave estrangeira), carregados do banco, e são
  exibidos em **Title Case com alias amistoso** quando for o caso. **Toda
  lista suspensa carrega e recarrega com o placeholder neutro padrão
  "Selecione um valor..."**, apresentado em cor mais transparente que a dos
  valores da lista; o placeholder não é um valor válido para envio. Campos
  sem domínio usam o tipo de entrada adequado ao tipo da coluna (data,
  número, texto, texto longo, CPF/CNPJ com máscara etc.), com validação
  coerente com o banco.
- **É imprescindível agrupar os campos em subseções conforme seus temas**
  (subseções propostas no item 5), cada uma com título em Title Case.
  Dentro de cada subseção, **organizar os campos em colunas** (grid de 2, 3
  ou 4 colunas conforme a largura disponível e o tamanho dos campos): **a
  prioridade é economizar o espaço vertical da página**. Em tela estreita,
  as colunas se empilham.

**2.4 Verificar e enviar.** Seção final contendo, nesta ordem:
- apresentação dos termos da página (uso dos dados, responsabilidade pelo
  conteúdo informado) e solicitação de leitura e **aceite obrigatório**
  (caixa de seleção; o envio permanece bloqueado até o aceite);
- **verificação antibot** com solução open source consolidada (ex.: desafio
  local/honeypot + limite de tentativas, ou serviço livre amplamente
  adotado); propor na Etapa 1 e aguardar aprovação;
- botões **"Enviar cadastro"** e **"Cancelar"**, **lado a lado e
  centralizados na largura da página**, com o estilo de botões da
  referência visual; "Enviar cadastro" só habilita após validação dos
  campos, aceite dos termos e verificação antibot; "Cancelar" limpa o
  formulário (recarregando as listas com o placeholder) e retorna à página
  index do módulo.

O envio grava no banco `websistemas` por meio da API da aplicação (módulo
de backend correspondente), com validação no servidor, mensagens de sucesso
e erro em norma culta e sem perda do que foi preenchido em caso de erro.

### 3. Página da interface da tabela

**3.1 Cabeçalho — navbar padrão VPC**, idêntica à do item 1.1.

**3.2 Título da página**, **centralizado na largura da página**, contendo
como parte constituinte o alias do esquema e o alias da tabela (Title Case),
ex.: "Cadastro — Solicitações de Acesso".

**3.3 Conjunto de elementos constituintes da tabela**, exatamente como
descritos e especificados nos arquivos de instrução
(`.github/instructions/tabelas-padrao.instructions.md` e
`docs/prompt-layout-padrao-tabelas.md`): título da tabela; barra de filtros
com botões mostrar/ocultar grupos de colunas; tabela com coluna de
seletores, cabeçalhos de grupo e de coluna centralizados com fundo sólido e
texto em caixa alta, zebrado e regra de alinhamento dos dados; barra de
botões de controle (comuns + específicos); paginador; contador — todos
funcionais, com dados reais e aliases do catálogo.

## Etapa 2 — Conjunto-piloto para aprovação

6. Após a confirmação da Etapa 1, **criar o esqueleto do projeto**
   (`git init`, estrutura de diretórios aprovada, tokens CSS, componentes
   compartilhados de navbar e rodapé, autenticação mínima do Acesso Restrito,
   acesso ao banco pela conexão já configurada) e construir **apenas um
   conjunto-piloto**: a página index de **um módulo** e, para **uma única
   tabela** desse módulo
   (a que eu indicar ou, na falta de indicação, a mais representativa), a
   página do formulário e a página da interface da tabela. Tudo **completo e
   renderizado de verdade na aplicação, com dados reais do banco
   `websistemas`** — sem mock —, consumindo o catálogo de aliases, com
   navbar, cards, formulário (listas carregadas do domínio, placeholder,
   subseções, termos, antibot, envio e cancelamento) e os seis elementos da
   tabela funcionando. O piloto já deve nascer na **estrutura modularizada**
   (diretórios por módulo/submódulo na interface e no backend, nomenclatura
   dos arquivos e rotas puras), pois ela será replicada na Etapa 3.

7. Implementar já por meio de **componentes compartilhados** reutilizáveis
   (navbar com menu comum, card de página, grid dinâmico, campo de
   formulário com lista suspensa e placeholder, subseção de formulário,
   seção verificar e enviar, barra de filtros, grupos de colunas, seleção,
   botões de controle, paginação, contador, leitura do catálogo de aliases),
   não com estilos ou rótulos locais das páginas.

8. Validar no navegador, comparando os estilos computados com a referência
   visual VPC e com os documentos do padrão: navbar e rodapé idênticos aos
   medidos na referência; grid de cards sem espaços vazios e
   com o mínimo de linhas; títulos centralizados; subseções e colunas do
   formulário; placeholder "Selecione um valor..." mais transparente;
   botões Enviar/Cancelar lado a lado e centralizados; e, na tabela: ordem e
   alinhamento dos elementos, espaçamentos verticais, filtro 32 px, campos
   25 px, botões de filtro 25 × 25 px redondos, botões de grupo em pílula de
   28 px à direita, cabeçalhos ≥ 32 px sempre centralizados com fundo
   sólido escuro e texto branco em caixa alta, linhas ≥ 27 px com zebrado,
   dados com três ou mais palavras à esquerda e os demais centralizados,
   coluna de seletores de 44 px fixa, botões de controle 33,84 px quadrados
   com raio 6 px, fundo branco, ícone colorido e borda mais escura,
   centralizados, paginador centralizado com botões 34 × 34 px sem borda,
   contador à direita, hierarquia de fontes da seção 10 do documento, título
   em Title Case e cabeçalhos em caixa alta conforme o catálogo. Testar com
   vários registros, seleção ativa, filtro aplicado, segunda página, envio
   real de um cadastro e tela estreita.

9. Me entregar as URLs das três páginas do conjunto-piloto, as medidas
   computadas obtidas e capturas de tela. **Pare e aguarde minha
   aprovação.** Se eu pedir ajustes, aplicá-los no piloto, nos componentes
   compartilhados e no catálogo, e reapresentar, até a aprovação.

## Etapa 3 — Implantação de todas as demais tabelas

10. Somente após a aprovação do conjunto-piloto, implementar as três páginas
    de todas as demais tabelas de todos os esquemas (exceto `publica`),
    módulo a módulo, tabela a tabela, reutilizando os mesmos componentes
    compartilhados, o catálogo de aliases e as propostas aprovadas na
    Etapa 1, com a mesma validação da Etapa 2 em cada uma, e atualizando o
    menu comum e as páginas index conforme os módulos forem concluídos.

11. Ao final, me entregar: a lista de módulos, esquemas e tabelas
    implementados com os arquivos alterados e as URLs das três páginas de
    cada tabela; o catálogo de aliases completo; as referências de cor e
    tipografia efetivamente usadas; os grupos de colunas, as subseções de
    formulário e os botões (comuns e específicos) de cada tabela; evidências
    da validação (medidas computadas e capturas); e eventuais exceções que
    você julgue necessárias — exceções só valem com minha aprovação
    explícita.

## Regras permanentes

- Nenhum dado mock; tudo com dados reais do banco `websistemas`, inclusive
  os valores das listas suspensas.
- Somente ferramentas open source consolidadas, com documentação vasta.
- Tipografia, cores, navbar e rodapé sempre da referência visual VPC; a
  estrutura das páginas é a deste documento.
- Todo texto visível ao usuário em português brasileiro, norma culta padrão.
- Todos os aliases vêm exclusivamente do catálogo único.
- Estrutura de diretórios por módulo/submódulo e nomenclatura
  `submodulo_tabela_pagina` em toda página nova; rotas sem regra de negócio.
- Não fazer commit nem deploy sem minha autorização; nunca versionar
  credenciais.
- Se algum documento citado não existir, se a referência visual não puder
  ser aberta, ou se a conexão com o banco não estiver disponível, parar e me
  avisar antes de prosseguir.
