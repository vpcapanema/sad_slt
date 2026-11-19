-- Atualiza a assinatura dos corpos de convite já persistidos.
UPDATE ahp.comparacao_colaborativa_ambiente
SET email_mensagem = replace(email_mensagem, 'Equipe SICARD/SLT', 'Equipe SICARD-PLI')
WHERE email_mensagem LIKE '%Equipe SICARD/SLT%';
