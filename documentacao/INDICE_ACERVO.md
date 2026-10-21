# Indice da Documentacao do SICARD

Este diretorio concentra a documentacao do repositorio. Cada arquivo listado
abaixo existe em uma unica localizacao fisica.

## Geral

- `geral/README.md`: visao geral do sistema.
- `geral/README_REORGANIZACAO_PLATAFORMA.md`: reorganizacao da plataforma.
- `STATUS_IMPLEMENTACAO.md`: estado da implementacao.
- `ARQUITETURA_TEMPLATES.md`: arquitetura dos templates.

## Hierarquizacao e geoprocessamento

- `hierarquizacao/`: espinha dorsal, modelo espacial e modulos das fases 1, 2 e 3.
- `geoespacial/`: componente e parametros do motor geoespacial.

### Navegacao publica da hierarquizacao

A secao **Hierarquizacao territorial** de `/public/documentacao/` concentra
uma entrada por referencia, sem repetir os fundamentos das Fases 1 e 2:

| Referencia | Destino |
| --- | --- |
| Elegibilidade territorial: restricoes e riscos | `/public/documentacao/risco-restricao/` |
| Favorabilidade de grade e da rede: V2, provisoria e nao homologada | `/public/documentacao_favorabilidade_v2/` |
| Limite maritimo | `/public/documentacao/limite-maritimo/` |
| Relatorios exploratorios dos modelos | `/public/documentacao/saidas_modelos/index.html` |
| Visao geral | `/public/documentacao/hierarquizacao/ESPINHA_DORSAL_SISTEMA_HIERARQUIZACAO.md` |
| Modelo espacial | `/public/documentacao/hierarquizacao/MODELO_HIERARQUIZACAO_ESPACIAL.md` |
| Priorizacao por atributos | `/public/documentacao/hierarquizacao/MODULO_FASE3_ATRIBUTOS_PROJETO_AJUSTE.md` |
| Tutoriais SICARD (catalogo; midias aguardando publicacao) | `/public/documentacao/tutoriais/` |

As especificacoes metodologicas passam pelo controller com a mesma lista
explicita de documentos autorizados da rota legada
`/documentos/hierarquizacao/{documento}`. O middleware aplica `/sicard`
aos links publicos quando o proxy informa `X-Forwarded-Prefix`; os templates
nao devem fixar esse prefixo. A pagina de artefatos
`/public/documentacao/favorabilidade/` continua disponivel, mas nao duplica a
entrada da Fase 2 no indice.

### Tutoriais SICARD — catalogo conectado as midias do Storage

O catalogo publico `/public/documentacao/tutoriais/` (ou
`/sicard/public/documentacao/tutoriais/` no proxy) e servido por controller
e template, sem autenticacao e sem consultar bancos ou Storage para montar
o HTML. Titulos, duracoes, revisoes, ressalvas e nomes dos arquivos vem de
`config/tutoriais-sicard.json`.
O botao da secao Hierarquizacao territorial aponta para esse catalogo.

Fonte fornecida: `TUTORIAIS_MAD_FULLHD\index.html`, lida sem modificar
o original. O caminho de rede de origem nao e exposto neste acervo publico.
O HTML lido na publicacao de 21/10/2026 tem 11.246 bytes e SHA-256
`5f48ed05ed53cf47756a2b2e3f8a2aa8c485bcea4e4355c21d01acfdbc826e73`.
O template preserva os 16 titulos, duracoes, marcacoes de revisao, texto
introdutorio e ressalvas finais. O retorno relativo ao hub externo ao acervo
foi substituido pelo retorno a documentacao local. Nao foram criados novos
tutoriais nem alterada a metodologia.

Dependencias efetivamente referenciadas pelo HTML:

| Dependencia | Quantidade | Bytes totais |
| --- | --- | --- |
| MP4 | 16 | 47.997.537 |
| Capas JPG (`*_capa.jpg`) | 16 | 1.475.346 |
| Legendas SRT | 16 | 14.446 |
| Notas TXT de revisao e conferencia | 2 | 3.076 |
| Total das dependencias locais | 50 | 49.490.405 |

Na fonte original nao ha scripts, fontes remotas ou folhas CSS externas:
o estilo e inline. O catalogo adaptado usa `assets/js/tutoriais.js` para
exibir falhas de reproducao ou de carregamento da faixa opcional de legendas.
O link `../../index.html` leva ao hub de origem, nao e dependencia de
reproducao. A pasta completa soma 52.811.066 bytes: alem das dependencias,
contem imagens de cliques/revisao, JSONs e manifesto, que nao sao carregados
pelo HTML. O manifesto inclui caminhos de rede e enderecos de ambiente
local; as notas de conferencia descrevem dominios e cenarios internos.
O manifesto original e os arquivos adicionais nao referenciados pelo HTML
nao foram copiados. As duas notas TXT referenciadas integram o upload
autorizado, mas ainda nao possuem rota publica de leitura.

**Escopo da conexao:** o catalogo possui 16 players HTML5 com controles,
capas, reproducao inline no celular, faixa WebVTT opcional e links para
baixar MP4 e SRT. Os videos usam `preload="none"` para nao antecipar o
download de todas as gravacoes.
Nao foram copiados videos, capas, legendas ou documentos auxiliares ao Git,
nem realizado commit, push ou deploy nesta tarefa de conexao. Embora a fonte declare dados
ficticios e simulacoes, isso nao substitui a conferencia visual integral das
gravacoes e capas antes de liberar divulgacao publica. Os arquivos SRT e as
imagens tambem precisam dessa conferencia. As cinco marcacoes de revisao
pendente do HTML continuam visiveis no catalogo.

**Autorizacao e publicacao:** o usuario autorizou expressamente
o envio ao SICARD Storage oficial e confirmou `conteudo_publico=true`.
Foi preparado o utilitario `scripts/publicar_tutoriais_storage.py`, que
extrai apenas as dependencias referenciadas pelo HTML, deriva 16 legendas
WebVTT dos SRT para reproducao HTML5 e calcula tamanho e SHA-256
de cada arquivo. Sao 66 assets preparados em memoria, totalizando
49.504.331 bytes (50 originais e 16 VTT), sem incluir o manifesto.
O HTML original nao integra o upload: a pagina permanece servida pelo app.

As primeiras tentativas foram interrompidas na criacao do diretorio, antes
do envio de arquivos. A mensagem observada nao identificava a causa como
falta de permissao. Apos o usuario indicar a pasta no cliente oficial,
foi confirmada por leitura a existencia de `aplicacao/documentacao/tutoriais`.
A nova execucao do mesmo publicador concluiu a gravacao, sem alterar
permissoes, credenciais ou rota de acesso.

Destino efetivamente publicado:
`aplicacao/documentacao/tutoriais/20261021-ddd37ae4467172e9`.
Foram enviados e relidos **67 arquivos, totalizando 49.521.243 bytes**
(66 assets e `manifesto.json`). A listagem completa, os tamanhos e os
SHA-256 de todos os arquivos remotos foram conferidos.
O manifesto local foi gravado em `config/tutoriais-sicard.json`, com SHA-256
`caacd51973ae5c52150c47d0a3cdbf826ca9c1eaff1ec40b7e7ac71199f0fb83`.
A origem permanece intacta.

O utilitario recusa destinos existentes e so grava o manifesto local apos
comparar a listagem completa e reler cada asset remoto para conferir tamanho
e SHA-256. Os testes simulados verificam essas guardas, a conversao das
legendas e a preservacao do catalogo; nao comprovam publicacao real.
Validacao focal da conexao: 99 testes aprovados com
`.venv\Scripts\python.exe -m pytest tests\test_tutoriais_publicos.py tests\test_paginas_publicas.py tests\test_publicar_tutoriais_storage.py -q -p no:cacheprovider`.
A integracao `runTests` informou testes nao encontrados; por isso foi
utilizado o fallback da `.venv`, com a descoberta configurada para `tests`
e sem bancos. A execucao registrou somente o aviso de depreciacao do
TestClient. `node --check assets/js/tutoriais.js` tambem passou.

A rota `GET|HEAD /public/documentacao/tutoriais/midias/{nome}` publica
somente MP4, capas JPG, SRT e VTT explicitamente associados aos tutoriais
no manifesto local. Notas TXT, manifestos, outros arquivos e caminhos
arbitrarios nao sao publicados. A leitura usa a montagem nativa quando
disponivel; sem montagem, usa a API autenticada do SFTPGo pelo servidor,
sem expor credenciais ao navegador ou copiar midias para disco local.
Os arquivos possuem MIME explicito, `nosniff`, ETag e suporte a HEAD,
Range/206 e intervalos insatisfativeis/416. Midias ausentes ou com tamanho
divergente do manifesto retornam 503, sem resposta de sucesso ficticia.

A leitura HTTP real dos 64 arquivos oferecidos ao publico (16 conjuntos
de MP4, JPG, SRT e VTT), totalizando 49.501.255 bytes, conferiu tamanho e
SHA-256 de cada resposta contra o manifesto. HEAD, trecho de 100 bytes
com status 206 e intervalo insatisfativel com status 416 foram verificados
com o Storage oficial. No navegador local foram confirmados os 16 players,
a reproducao do primeiro MP4 em 1920 x 1080, avanco temporal para 70% do
video e carregamento efetivo da faixa WebVTT. Em viewport de 390 pixels,
o catalogo apresentou uma coluna sem overflow horizontal; as mensagens
de erro de midia e sua limpeza tambem foram exercitadas.

**Pendencia de implantacao:** estas alteracoes de conexao ainda precisam de
novo deploy para aparecer na VM. A validacao descrita ocorreu no servidor
local lendo as midias oficiais; nao representa verificacao do player em
producao apos essa nova implantacao. Os testes de pagina cobrem a reescrita
dos links com e sem o prefixo `/sicard`.

## Risco e restricao territorial

- `risco-restricao/taxonomia_fase_1_obras_estaduais.md`
- `risco-restricao/ESTUDO_CRITERIOS_AMBIENTAIS_RESTRICAO.md`

## Fontes e matrizes

- `fundamentacao/`: normas e instrucoes tecnicas usadas pela Fase 1.
- `matrizes/`: modelos e matrizes vigentes de criterios e premissas.

Arquivos temporarios em `tmp/`, requisicoes WFS, dados geoespaciais brutos e
planilhas de carga do banco permanecem fora desta documentacao.