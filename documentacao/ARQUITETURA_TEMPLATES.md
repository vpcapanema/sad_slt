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
