# Segurança dos fluxos — 29/10/2026

Escopo: A01–A06 da auditoria de 29/10/2026. Não altera critérios, fases,
agregação AHP, pesos ou homologação matemática. Os itens independentes C01–C10
não fazem parte desta alteração.

## Preparação e transição

As migrações foram aplicadas no banco oficial `slt_db` em **29/10/2026**,
com autorização do usuário, em uma única transação:

1. `database/158_sessoes_revogaveis.sql`: registro PostgreSQL em
   `cadastro.sessao_usuario`, sem token em claro ou FK entre bancos.
2. `database/159_convites_individuais.sql`: hash por ambiente/destinatário,
   revogação e exclusão em cascata; limpa o código compartilhado antigo.

Foram verificadas em nova conexão as duas tabelas, suas colunas, chaves primárias,
chave estrangeira com exclusão em cascata e índice de sessões ativas. O esquema
`cadastro` foi criado pela migração 158, pois ainda não existia no banco.
Os quatro códigos compartilhados existentes foram invalidados; a quantidade de
ambientes foi preservada. Não houve commit Git, push ou deploy nesta aplicação.

Em outros ambientes, aplicar as migrações antes de habilitar a nova versão.
Não há migração automática no startup nem fallback em memória.
Sem as tabelas ou com infraestrutura indisponível, a autenticação falha
explicitamente (503); não publicar sem migrações e validação operacional.
Tokens antigos sem registro/sid deixam de ser aceitos; todos devem fazer login
novamente. Convites antigos exigem novo envio individual. Não há conversão
que preserve o código compartilhado como autorização.

## A01 — Convites externos

O link identifica o ambiente, mas não autoriza acesso. A chave individual usa
32 bytes aleatórios, codificados em 43 caracteres URL-safe. Somente SHA-256 é
persistido; o segredo é acrescentado ao e-mail pelo servidor depois da reserva
idempotente de envio. O histórico não guarda a chave nem a usa em URLs.
O destinatário não precisa de conta SIGMA.

List/get, variantes de hierarquização, espaço analítico e central de respostas
não publicam credenciais de participação. A projeção padrão omite token do
ambiente, URL e contatos dos convites; Gestor/Admin recebem metadados para
administrar destinatários, nunca a chave individual. Contadores são preservados.
O formulário exige e-mail correspondente, chave válida, ambiente aberto,
prazo vigente e destinatário ainda vinculado em acesso/início/progresso/envio.

`DELETE /api/ahp/comparacao-colaborativa/ambientes/{id}/convites/{email}`
revoga somente o destinatário. O controle fica na administração dos e-mails.
Reenvio explícito gira a chave; repetição da mesma reserva não reenvia nem gira.
Remover destinatário ou mudar recorte revoga sua chave. Respostas são preservadas.
Falha de envio exige consulta ao histórico antes de repetir; a chave anterior
pode já ter sido invalidada. Não são alteradas as regras de recorte AHP.

## A02 — Opções de vinculação

As rotas públicas `/api/planos/vinculaveis` e `/api/programas/vinculaveis`
retornam exclusivamente `codigo` e `nome`. Sem contatos, valores, parecer,
descrição interna, geometrias ou dados de auditoria.
A política compartilhada admite registros aprovados, em hierarquização
sem pendência de complementação, homologados/publicados ou em execução/concluídos;
exclui estados de avaliação, reprovação, suspensão e retirada.
Criação e alteração de vínculo revalidam a elegibilidade no servidor.
Diretoria e plano do programa são resolvidos no backend, não confiados ao cliente.
Opções técnicas “Outros” continuam atendendo o cadastro sem vínculo.
O cadastro adapta o DTO mínimo e não busca detalhes administrativos como fallback.

## A03 — Sessões

Cookie HttpOnly e Bearer usam o mesmo registro persistente por sid e prazo
absoluto (8 horas; 30 dias em “permanecer conectado”). Cada leitura verifica
registro não revogado/não expirado e consulta conta ativa SIGMA, bloqueio e
perfil atual pelo username. Não existe cache que aceite perfil antigo durante
indisponibilidade. Logout revoga o sid antes de limpar o cookie: cópias em Cookie
ou Bearer não funcionam. Falha de revogação retorna 503, sem alegar sucesso.

Conta inativa ou bloqueada revoga todas as sessões observadas do usuário.
O procedimento de desativação SIGMA deve também chamar, com Admin,
`DELETE /api/auth/sessoes/usuario/{uuid}` para invalidar preventivamente os sids,
inclusive se a conta for reativada antes de uma nova requisição ao SICARD.
O SICARD não escreve no banco SIGMA nem detecta um ciclo desativação/reativação
que ocorra integralmente entre duas consultas sem essa integração administrativa.

Testes com tokens sintéticos usam registro e contas exclusivamente em fixtures;
isso não introduz exceção ou bypass de autenticação no código de produção.

## A04 — Transporte STAC

Somente assets HTTPS efetivamente devolvidos na pesquisa do serviço cadastrado
recebem autorização assinada, vinculada ao serviço, URL configurada, asset e
prazo de 15 minutos. Importação sem autorização, com outra URL ou após o prazo
é recusada. O frontend encaminha a autorização junto com o asset selecionado.

O downloader resolve DNS e recusa **todos** os resultados não globais,
multicast e IPv4 mapeado em IPv6. Não permite credenciais, zone-id IPv6,
portas alternativas, proxy de ambiente ou redirecionamentos. Conecta ao IP
numérico validado (sem segunda resolução do hostname), confere o peer efetivo
e valida certificado TLS/SNI com o hostname original. Rebinding posterior não
muda o destino da conexão. Destinos GIS internos não têm exceção implícita.

Limite de 50 MiB, leitura em blocos e prazo de 60 segundos (timeout de socket de
10 segundos); sem conteúdo HTTP comprimido. Produtos maiores são recusados
explicitamente, não abertos remotamente por GDAL. GeoTIFF é aberto somente
em `rasterio.MemoryFile` com driver GTiff e sem busca de sidecars.
Testes usam GeoTIFF real em memória e socket/HTTP sintéticos; não consultam STAC
externo. Firewall de saída continua sendo defesa adicional operacional.

## A05 — Arquivos

A leitura pública é limitada desde o primeiro `read` a 50 MiB + 1 byte de
detecção. O limite também existe no parser. ZIP/KMZ e extratores de uploads
usam orçamento agregado de **50 MiB efetivamente expandidos**, até 2000 membros
e 60 segundos durante leitura/escrita, recusando links, caminhos inseguros e
nomes repetidos. A extração do parser usa contexto com limpeza determinística;
staging de uploads também é limpo em cancelamento/erro.

Esses números preservam o teto de upload cadastral de 50 MiB; membros e prazo
reutilizam o padrão existente de pacotes locais (2000/60s). Pacotes locais
mantêm seu orçamento de 32 MiB somando níveis e profundidade máxima de 5.
Fallbacks ZIP/TAR/RAR são incrementais; 7z usa fábrica de escrita que interrompe
a expansão antes de armazenar além do orçamento, em vez de `BytesIOFactory`
com limite derivado do tamanho declarado pelo arquivo.
O parse público admite até três execuções simultâneas por processo e devolve
429 quando ocupado. Não substitui limites de workers/entrada no proxy.

## A06 — Contatos SIGMA

`GET /api/pessoas` exige sessão antes de chamar SIGMA ou seu fallback read-only.
DTO limitado a id, nome, e-mail e telefone; paginação `page` e `limit`
(padrão 100, máximo 200). Ambos os caminhos passam pela mesma projeção.
`sigma-read.js` verifica a sessão e carrega as páginas, sem consultar
endpoint externo alternativo quando anônimo. Instituições não mudam de contrato.

## Validação

A integração Testing foi tentada primeiro, mas não descobriu o novo arquivo e
executou zero testes. Por isso, conforme as instruções do projeto, a validação
focada usa `.venv\Scripts\python.exe -m pytest` com fixtures sintéticas e diretório
de execução dentro de `artifacts`. Nenhum banco oficial, túnel, migração real,
SMTP, download externo, commit ou deploy integra esta validação.
Resultado final da seleção de 11 arquivos: **358 testes aprovados**, sem falhas,
com dois avisos de depreciação (Starlette/httpx e multiplicação Affine).
Os oito arquivos JavaScript alterados passaram em `node --check`, e
`git diff --check` não apontou erros. Em Chromium local, com requisições
externas bloqueadas, os estilos computados do botão de revogação e do campo
de chave individual foram comparados aos controles existentes e coincidiram.
Ainda é necessária validação operacional autorizada em ambiente de homologação,
incluindo aplicação das migrações e entrega SMTP real. Testes sintéticos não
equivalem a homologação em produção.
