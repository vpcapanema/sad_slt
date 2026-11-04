# Arquitetura de templates HTML

## Estrutura

A interface canônica é renderizada pelo FastAPI com Jinja2. Existem dois
templates-base:

- `templates/bases/base_conteudo.html`: páginas de navegação e conteúdo;
- `templates/bases/base_painel_mapa.html`: páginas com barra lateral e painel
  cartográfico.

Os elementos compartilhados ficam em `templates/componentes`:

- navbar pública;
- navbar restrita;
- navbar de painel público;
- navbar de painel restrito;
- footer institucional;
- bancada `_geoprocessamento`, mantida como documento isolado porque também é
  carregada por `iframe`.

`assets/css/template-conteudo.css` e
`assets/css/template-painel-mapa.css` contêm as regras globais dos dois
templates. `assets/js/template-base.js` concentra o comportamento global.
Particularidades permanecem em CSS e JavaScript externos da própria página ou
do módulo.

### Comparação pareada

O template `paginas/analise_multicriterio/formulario.html` atende ao modelo
público, ao preenchimento por convite e à simulação aberta pela gestão
(`?simulacao=1`). A seção Comparação pareada possui duas abas acessíveis:
Formulário de comparação pareada (inicial) e Matriz de comparação pareada.
Explicações, indicadores, confirmação dos pares e envio permanecem compartilhados;
somente a representação dos pares alterna. Os cards não são recriados ao alternar.

`assets/js/paginas/ahp-comparacao-abas.js` apresenta uma matriz somente leitura
usando o mesmo modelo numérico de `buildLiveMatrix`, na ordem dos critérios,
com diagonal unitária e valores recíprocos. O evento `saaty:change` atualiza
os valores imediatamente. As células usam a mesma fonte de cores da régua
(`SLTSaatySelectorColor.palette`), inclusive recíprocos e diagonal de igualdade.
A confirmação visual após três segundos permanece somente nos cards do
formulário, sem mudar as cores da matriz; os indicadores compartilhados
continuam informando a consistência real.
O indicador flutuante de RC mantém movimento e escala também sobre a matriz.
Toda a primeira linha e toda a primeira coluna, incluindo o canto, usam
fundo `#003b5a` e texto branco, independentemente da tag `th` ou `td`.
O gerador usa `th` com escopo; a folha da página seleciona os dois eixos
por posição. Os links da folha e do gerador têm versão de cache
`20261104-matrix-headers`. A validação verifica todas as células, os `n+1`
cabeçalhos de cada eixo, o contraste e a diagonal `#f5f5f5`.

Esta representação segue o padrão AHP `matrix-table`, com cabeçalhos fixos
e rolagem, não o padrão de tabela de registros: filtros, seletores de registros
e paginação não se aplicam à matriz quadrada. Não há alteração de metodologia.
Validação focada: `tests/test_templates.py` pela integração Testing e
`node tests\test_pairwise_tabs.cjs` para o template real e JavaScript da aplicação,
com APIs simuladas (sem banco ou gravação de respostas reais).

## Convenção semântica

Os nomes canônicos descrevem a função do elemento, e não sua aparência ou sua
posição momentânea:

- `conteudo-principal` para o `main` da página;
- `secao-<finalidade>` para seções, como `secao-boas-vindas`;
- `card-<finalidade>` para cards, como `card-introducao`;
- `barra-lateral-painel`, `painel-camadas` e `painel-mapa` para regiões de
  painéis;
- `cabecalho-*`, `navbar-*` e `rodape-*` para componentes de navegação.

Classes antigas podem coexistir temporariamente quando ainda são seletores de
CSS ou contratos de JavaScript. Nesse caso, a classe semântica vem primeiro e
é a identificação canônica. IDs consumidos por JavaScript não devem ser
renomeados sem a atualização conjunta do código e dos testes.

Não são permitidos nos templates:

- blocos `<style>`;
- blocos `<script>` sem `src`;
- atributos `style`;
- manipuladores inline como `onclick` e `onchange`.

## Rotas e páginas legadas

As rotas canônicas usam URLs limpas, como `/public/cadastro/` e
`/restrict/geoespacial/bancada/`. URLs antigas terminadas em `.html` são
redirecionadas de forma permanente, preservando a query string. Os 45 HTMLs
anteriores foram removidos das pastas dos módulos e arquivados em
`paginas_backend_legadas_2026-07-17.zip`; a única fonte renderizada da interface
está em `templates/paginas` e `templates/componentes`.

O servidor não monta mais a raiz do repositório como diretório estático. Apenas
os diretórios explícitos de assets são publicados, evitando a exposição do ZIP,
dos templates-fonte e de outros arquivos internos.
