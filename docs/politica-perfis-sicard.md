# Política de permissões do SICARD

O SIGMA autentica e fornece a identidade do usuário. O SICARD consulta
`usuarios.usuario_perfil`, `usuarios.perfil`, `usuarios.perfil_permissao` e
`usuarios.permissao` no `slt_db` para autorizar cada requisição. O código do
perfil corresponde ao UUID do papel no SIGMA. Não existe herança entre perfis.

| Perfil | Responsabilidade |
| --- | --- |
| Administrador | Configuração e manutenção técnica. Consulta a área restrita, sem operar decisões do MOCAD ou MAD. |
| Gestor | Opera o MAD. Consulta o MOCAD e pode reverter status inline, com justificativa e auditoria. |
| Analista | Opera o MOCAD, inclusive cadastro em lote, análise e solicitações de complementação. Consulta MAD e Ações do Operador. |
| Operador | Cadastra demandas próprias e atende solicitações vinculadas ao seu usuário ou à sua pessoa no SIGMA. |
| Visualizador | Consulta todas as páginas restritas, sem operações de escrita. |

Gestor e Analista também operam as ferramentas de apoio geoespacial. O
Administrador pode configurar tabelas técnicas; tabelas de negócio na área
técnica são de consulta. O CRUD legado de grupos de demandas exige `mad.operar`.

## Aplicação

O servidor valida a sessão e a situação atual do usuário no SIGMA, carrega as
concessões locais ativas e aplica a política antes do controlador. Perfil,
vínculo, permissão ou concessão inativos não autorizam operações. Os escopos
`todos` e `proprios` são validados no servidor. Uma alteração das concessões é
observada na próxima requisição, sem exigir novo login. Uma mudança de perfil
no SIGMA bloqueia o perfil antigo até a sincronização local.

A sincronização automática dos usuários continua independente da autenticação.
Não são armazenadas senhas do SIGMA nas tabelas de política.

Os menus usam a mesma política. Os controles de operação recusados exibem o
feedback padrão do SICARD ao receber uma tentativa de uso. Respostas HTTP 403
também abrem esse feedback e encerram qualquer progresso ativo, inclusive
quando o chamador não trata a resposta. A mensagem identifica a ação recusada
e explica a falta de permissão. Páginas recusadas apresentam uma tela explícita
de acesso negado.

Reversões inline exigem `mocad.reverter_status_inline`, somente o novo status e
uma justificativa. A gravação e o registro de auditoria são atômicos. Aprovação
e reprovação pelo fluxo regular continuam exigindo `mocad.analisar`.

## Verificação

`tests/test_politica_usuarios.py` cobre a matriz, escopos, revogação, caminhos
alternativos e auditoria. `tests/browser/politica-perfis.cjs` usa autenticação
normal da conta ADMIN de agentes e verifica recusas reais. Os outros perfis são
simulados somente na interface; suas operações são interceptadas, sem criar
sessões falsas nem gravar decisões de negócio no servidor.
