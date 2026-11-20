# Reenvio de convites individuais do SICARD

O reenvio preserva a chave e o conteúdo original do e-mail: assunto, nome do remetente, texto e HTML. Não muda o prazo do julgamento. A chave é selecionável na própria mensagem; os novos e-mails não têm link para uma página de cópia. A página antiga continua disponível para mensagens já enviadas.

Convites emitidos antes da mudança só têm o resumo criptográfico da chave no banco. O SICARD não consegue recompor o e-mail original nem troca a chave no reenvio. Para esses convites, se ainda válidos, encaminhe o e-mail original ao próprio destinatário. O lote continua para os outros destinatários.

## Ativação

1. Configure `SICARD_CONVITE_ENVELOPE_KEY` no ambiente privado da aplicação antes de ativar a nova versão. Gere 32 bytes com um gerador criptográfico e codifique em base64url sem preenchimento. Armazene e mantenha o mesmo valor em todos os processos que enviam convites. Não registre nem versione a chave.
2. Aplique `database/174_envelope_convite_individual.sql` ao banco alvo antes de iniciar a nova versão. A coluna nova é opcional para registros antigos. Não há preenchimento retroativo.
3. Valide em homologação: convite novo, reenvio com texto administrativo alterado, falha simulada e lote misto. Só então promova a versão.

Sem a chave de configuração, novos envios ficam bloqueados para não criar convites que não possam ser reenviados. A validação de chaves já entregues continua usando o resumo criptográfico. Não troque a chave de configuração sem um plano de recuperação dos envelopes existentes.
