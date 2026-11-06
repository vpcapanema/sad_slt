"""Catálogo de códigos de status SMTP do Gmail (RFC 3463) para explicar falhas de email ao usuário.

Fonte: Google Workspace Admin Help, "Gmail SMTP errors and codes" (support.google.com/a/answer/3726730)
e "Fix bounced or rejected emails" (support.google.com/mail/answer/6596).
Formato da resposta: NNN X.Y.Z texto. X: 2 sucesso, 4 falha temporária, 5 falha permanente.
Y: assunto. Z: detalhe. Mantido em código para não poder ser apagado ou alterado em tempo de execução.
"""
from __future__ import annotations

import re
from typing import Any

CLASSES: dict[str, dict[str, str]] = {
    "2": {"titulo": "Sucesso", "tipo": "confirmada"},
    "4": {"titulo": "Falha temporária", "tipo": "adiada"},
    "5": {"titulo": "Falha permanente", "tipo": "falha"},
}

ASSUNTOS: dict[str, str] = {
    "0": "Outro ou indefinido",
    "1": "Endereço",
    "2": "Caixa ou sistema de destino",
    "3": "Sistema de entrega",
    "4": "Rede ou roteamento",
    "5": "Protocolo",
    "6": "Conteúdo da mensagem",
    "7": "Segurança ou política",
}

CODIGOS: dict[str, dict[str, Any]] = {
    "4.2.1": {
        "titulo": "Destinatário recebendo mensagens rápido demais",
        "descricao": "O destinatário está recebendo email em volume ou velocidade acima do limite. O Gmail recusou a mensagem por enquanto.",
        "causa": "Envio em rajada para o mesmo destinatário.",
        "acao": "Reenviar mais tarde. Espaçar os envios para o mesmo destinatário.",
        "smtp": ["450"],
        "mensagens_google": [
            "The user you are trying to contact is receiving email too quickly.",
            "The user you are trying to contact is receiving email at a rate that prevents additional messages from being delivered.",
            "Peak SMTP relay limit exceeded for this customer.",
        ],
    },
    "4.2.2": {
        "titulo": "Caixa do destinatário cheia",
        "descricao": "A caixa do destinatário está sem espaço de armazenamento. O Gmail vai tentar novamente por algum tempo antes de desistir.",
        "causa": "Cota de armazenamento da conta do destinatário esgotada.",
        "acao": "Pedir ao destinatário para liberar espaço no Google Drive e reenviar.",
        "smtp": ["452"],
        "mensagens_google": ["The recipient's inbox is out of storage space."],
    },
    "4.3.0": {
        "titulo": "Sistema temporariamente indisponível",
        "descricao": "O servidor de email do Gmail está com problema temporário e não aceitou a mensagem agora.",
        "causa": "Indisponibilidade ou manutenção temporária do serviço.",
        "acao": "Aguardar e tentar novamente. Não é necessário alterar o email.",
        "smtp": ["421", "451"],
        "mensagens_google": ["Temporary System Problem. Try again later.", "Email server has temporarily rejected this message.", "Multiple destination domains per transaction is unsupported."],
    },
    "4.4.2": {
        "titulo": "Conexão encerrada pelo servidor",
        "descricao": "A conexão SMTP foi encerrada antes da conclusão do envio.",
        "causa": "Tempo limite da sessão ou queda de rede.",
        "acao": "Reenviar. Se persistir, verificar a rede e a configuração do servidor de envio.",
        "smtp": ["451"],
        "mensagens_google": ["Timeout - closing connection"],
    },
    "4.4.5": {
        "titulo": "Servidor ocupado",
        "descricao": "O servidor do Gmail está sobrecarregado e pediu para tentar mais tarde.",
        "causa": "Pico de carga no servidor de recebimento.",
        "acao": "Aguardar e reenviar.",
        "smtp": ["421"],
        "mensagens_google": ["Server busy, try again later."],
    },
    "4.5.0": {
        "titulo": "Erro de protocolo SMTP temporário",
        "descricao": "Houve um erro temporário no protocolo SMTP durante a transação.",
        "causa": "Falha de comunicação entre os servidores.",
        "acao": "Reenviar.",
        "smtp": ["451"],
        "mensagens_google": ["SMTP protocol violation"],
    },
    "4.5.3": {
        "titulo": "Limite de destinatários por transação excedido",
        "descricao": "A política do domínio de destino limita o número de destinatários por envio.",
        "causa": "Muitos destinatários na mesma transação para o mesmo domínio.",
        "acao": "Enviar para este destinatário em uma transação separada.",
        "smtp": ["452"],
        "mensagens_google": ["Domain policy size per transaction exceeded, please try this recipient in a separate transaction.", "Your message has too many recipients."],
    },
    "4.7.0": {
        "titulo": "Conexão ou autenticação temporariamente recusada",
        "descricao": "O Gmail encerrou a conexão ou limitou tentativas de autenticação por pouco tempo, normalmente porque a sessão expirou ou houve muitas tentativas de login.",
        "causa": "Sessão SMTP expirada, IP ainda não registrado ou muitas tentativas de autenticação em sequência.",
        "acao": "Aguardar alguns minutos, reconectar e tentar novamente. Se persistir, verificar as credenciais e o IP de envio no Google Workspace.",
        "smtp": ["421", "454"],
        "mensagens_google": [
            "Connection expired, try reconnecting.",
            "Too many sign-in attempts, try again later.",
            "IP not in whitelist for RCPT domain, closing connection",
            "Try again later, closing connection.",
            "The IP address sending this message does not have a PTR record",
            "Cannot sign in due to a temporary system problem.",
            "TLS required for RCPT domain, closing connection",
            "This message is suspicious due to the very low reputation of the sending IP address.",
            "This message is suspicious due to the very low reputation of the sending domain.",
            "This message is suspicious due to the nature of the content or the links within.",
        ],
    },
    "4.7.23": {
        "titulo": "IP de envio sem PTR válido",
        "descricao": "O IP de origem não tem registro PTR (DNS reverso) ou o registro não corresponde ao nome do servidor.",
        "causa": "Configuração de DNS reverso do servidor de envio incompleta.",
        "acao": "Configurar o registro PTR do IP de envio apontando para o nome do servidor.",
        "smtp": ["451"],
        "mensagens_google": ["The sending IP address for this message doesn't have a PTR record."],
    },
    "4.7.24": {
        "titulo": "Registro SPF suspeito",
        "descricao": "O registro SPF do domínio remetente tem entradas suspeitas, e o Gmail adiou a entrega por precaução.",
        "causa": "Entradas SPF amplas ou não reconhecidas.",
        "acao": "Revisar o registro SPF do domínio e remover entradas desnecessárias.",
        "smtp": ["451"],
        "mensagens_google": ["The SPF record of the sending domain has one or more suspicious entries."],
    },
    "4.7.26": {
        "titulo": "Email sem autenticação adiado",
        "descricao": "O envio não está autenticado e a política DMARC do domínio exige autenticação. O Gmail limitou a taxa temporariamente.",
        "causa": "Ausência de SPF ou DKIM válidos para o domínio remetente.",
        "acao": "Configurar SPF e DKIM para o domínio e autenticar o envio.",
        "smtp": ["421", "451"],
        "mensagens_google": ["This email has been rate limited because it is unauthenticated.", "Unauthenticated email from domain-name is not accepted due to domain's DMARC policy, but temporary DNS failures prevent authentication."],
    },
    "4.7.27": {
        "titulo": "Falha de SPF com limite de taxa",
        "descricao": "A mensagem não passou na autenticação SPF e o Gmail limitou a taxa de envio.",
        "causa": "Origem do envio não autorizada no SPF do domínio.",
        "acao": "Incluir o servidor de envio no registro SPF do domínio.",
        "smtp": ["421"],
        "mensagens_google": ["Your email has been rate limited because SPF authentication didn't pass for this message."],
    },
    "4.7.28": {
        "titulo": "Volume incomum de email",
        "descricao": "O Gmail detectou um volume incomum de envios vindo deste remetente e limitou a taxa temporariamente para proteger os usuários contra spam.",
        "causa": "Rajadas de envio ou aumento súbito de volume.",
        "acao": "Reduzir o ritmo de envio, espalhar os envios no tempo e reenviar mais tarde.",
        "smtp": ["421"],
        "mensagens_google": [
            "Gmail has detected an unusual rate of email.",
            "Gmail has detected an unusual rate of unsolicited email originating from your IP Netblock",
            "Gmail has detected an unusual rate of unsolicited email originating from your DKIM domain",
            "Gmail has detected an unusual rate of unsolicited email originating from your SPF domain",
            "Gmail has detected an unusual rate of unsolicited email containing one of your URL domains",
            "Gmail has detected an unusual amount of unsolicited email originating from your IP address",
            "Gmail has detected this sender exceeded the quota for sending messages that have the same Message-ID",
        ],
    },
    "4.7.29": {
        "titulo": "Conexão sem TLS com limite de taxa",
        "descricao": "O envio em massa não usou conexão TLS, exigida pelo Gmail.",
        "causa": "Servidor de envio sem STARTTLS.",
        "acao": "Habilitar TLS no servidor de envio.",
        "smtp": ["421"],
        "mensagens_google": ["Your email has been rate limited because you're not using a TLS connection."],
    },
    "4.7.30": {
        "titulo": "Falha de DKIM com limite de taxa",
        "descricao": "A assinatura DKIM da mensagem não foi validada e o Gmail limitou a taxa de envio.",
        "causa": "Chave DKIM ausente no DNS, assinatura inválida ou mensagem alterada após a assinatura.",
        "acao": "Publicar a chave DKIM correta no DNS e assinar as mensagens.",
        "smtp": ["421"],
        "mensagens_google": ["Your email has been rate limited because DKIM authentication didn't pass for this message."],
    },
    "4.7.32": {
        "titulo": "Cabeçalho From desalinhado com limite de taxa",
        "descricao": "O cabeçalho From não está alinhado com o domínio autenticado por SPF ou DKIM.",
        "causa": "Domínio do From diferente do domínio autenticado.",
        "acao": "Alinhar o domínio do From com o domínio autenticado por SPF ou DKIM.",
        "smtp": ["421"],
        "mensagens_google": ["Your email has been rate limited because the From: header (RFC5322) in this message isn't aligned."],
    },
    "4.7.40": {
        "titulo": "Domínio sem DMARC adequado com limite de taxa",
        "descricao": "O domínio remetente não tem registro DMARC, ou o registro não é compatível com a política do Gmail.",
        "causa": "Ausência de registro DMARC ou política incompatível.",
        "acao": "Publicar um registro DMARC válido para o domínio remetente.",
        "smtp": ["421"],
        "mensagens_google": ["Your email has been rate limited because the sending domain doesn't have a DMARC record."],
    },
    "5.1.1": {
        "titulo": "Endereço de destinatário inexistente",
        "descricao": "A conta de email do destinatário não existe no Gmail. A mensagem foi devolvida ao remetente.",
        "causa": "Endereço digitado errado ou conta desativada e removida.",
        "acao": "Conferir o endereço do destinatário. Corrigir e reenviar, se o endereço estiver errado.",
        "smtp": ["550"],
        "mensagens_google": ["The email account that you tried to reach does not exist."],
    },
    "5.1.2": {
        "titulo": "Domínio de destinatário não encontrado",
        "descricao": "O domínio após o @ não foi localizado no DNS. A mensagem foi devolvida ao remetente.",
        "causa": "Domínio com erro de digitação ou sem registros MX.",
        "acao": "Conferir a grafia do domínio do destinatário.",
        "smtp": ["553"],
        "mensagens_google": ["We weren't able to find the recipient domain."],
    },
    "5.1.3": {
        "titulo": "Endereço de destinatário inválido",
        "descricao": "O endereço do destinatário não está em formato válido pela RFC 5321.",
        "causa": "Caracteres ou sintaxe inválidos no endereço.",
        "acao": "Corrigir o formato do endereço do destinatário.",
        "smtp": ["553"],
        "mensagens_google": ["The recipient address is not a valid RFC 5321 address.", "The recipient address _address_ is not a valid RFC 5321 address"],
    },
    "5.1.7": {
        "titulo": "Endereço de remetente inválido",
        "descricao": "O endereço do remetente não está em formato válido pela RFC 5321.",
        "causa": "Endereço do remetente mal formado na configuração de envio.",
        "acao": "Corrigir o endereço do remetente na configuração de envio.",
        "smtp": ["553"],
        "mensagens_google": ["The sender address is not a valid RFC 5321 address.", "The sender address _address_ is not a valid RFC 5321 address"],
    },
    "5.2.1": {
        "titulo": "Conta de destinatário inativa",
        "descricao": "A conta de email do destinatário existe, mas está inativa. A mensagem foi devolvida ao remetente.",
        "causa": "Conta suspensa ou desativada pelo titular ou pela administração.",
        "acao": "Confirmar com o destinatário outro endereço de contato.",
        "smtp": ["550"],
        "mensagens_google": ["The email account that you tried to reach is inactive.", "The user you are trying to contact is receiving email at a rate that prevents additional messages from being delivered"],
    },
    "5.2.2": {
        "titulo": "Caixa do destinatário cheia e inativa",
        "descricao": "A caixa do destinatário está sem espaço e inativa. A mensagem foi devolvida ao remetente.",
        "causa": "Cota de armazenamento esgotada em conta inativa.",
        "acao": "Pedir ao destinatário para liberar espaço ou usar outro endereço.",
        "smtp": ["552"],
        "mensagens_google": ["The recipient's inbox is out of storage space and inactive."],
    },
    "5.3.4": {
        "titulo": "Mensagem maior que o limite",
        "descricao": "O tamanho da mensagem, incluindo anexos, excede o limite do Gmail. A mensagem foi devolvida ao remetente.",
        "causa": "Anexos grandes.",
        "acao": "Reduzir o tamanho da mensagem ou enviar os anexos por link.",
        "smtp": ["552"],
        "mensagens_google": [
            "Your message exceeded Google's message size limits.",
            "The number of attachments (_num-attachments_) exceeds Google's limit of _limit_ attachments.",
            "The size of your message (_size_ bytes) exceeded Google's message size limits",
            "Your message exceeded Google's message header size limits.",
            "The size of the _header name_ header value (_size_ bytes) exceeds Google's limit",
            "The size of one of the header values (_size_ bytes) exceeds Google's limit",
            "The size of a header name (_size_ bytes) exceeds Google's header name limit",
            "Your message has a Subject: header that exceeds Google's message header size limits.",
        ],
    },
    "5.4.5": {
        "titulo": "Limite diário de envio do usuário excedido",
        "descricao": "A conta remetente atingiu o limite diário de envios do Gmail. O envio foi recusado.",
        "causa": "Volume de envios diário acima da cota da conta.",
        "acao": "Aguardar até o próximo dia e reenviar, ou reduzir o volume diário.",
        "smtp": ["550"],
        "mensagens_google": ["Daily user sending limit exceeded.", "Daily SMTP relay limit exceeded for user"],
    },
    "5.4.6": {
        "titulo": "Loop de roteamento de email",
        "descricao": "A mensagem passou por mais de 50 saltos, o que indica um loop de encaminhamento.",
        "causa": "Configuração de encaminhamento circular entre servidores.",
        "acao": "Revisar regras de encaminhamento e redirecionamentos do domínio.",
        "smtp": ["554"],
        "mensagens_google": ["Message exceeded 50 hops, this may show a mail loop."],
    },
    "5.5.1": {
        "titulo": "Comando SMTP não reconhecido ou fora de sequência",
        "descricao": "O servidor de envio emitiu um comando não suportado ou fora da ordem esperada.",
        "causa": "Implementação SMTP incompatível ou sequência de comandos incorreta.",
        "acao": "Verificar a configuração do cliente ou servidor SMTP de envio.",
        "smtp": ["502", "503"],
        "mensagens_google": [
            "Unimplemented command.",
            "EHLO/HELO first.",
            "Bad sequence of commands",
            "Unrecognized command",
            "Too many unrecognized commands, goodbye",
            "No DATA after BDAT",
            "An email transaction protocol command was issued out of sequence",
            "RCPT first.",
        ],
    },
    "5.5.2": {
        "titulo": "Erro de sintaxe SMTP",
        "descricao": "O Gmail não conseguiu interpretar a resposta ou o comando enviado.",
        "causa": "Erro de sintaxe no diálogo SMTP.",
        "acao": "Verificar a configuração do cliente SMTP.",
        "smtp": ["501", "555"],
        "mensagens_google": ["Syntax error, cannot decode response.", "Syntax error, goodbye."],
    },
    "5.5.3": {
        "titulo": "Excesso de destinatários para o remetente",
        "descricao": "A conta remetente excedeu o número de destinatários permitido em uma mensagem.",
        "causa": "Muitos destinatários em um único envio.",
        "acao": "Dividir o envio em mensagens com menos destinatários.",
        "smtp": ["550"],
        "mensagens_google": ["Too many recipients for this sender."],
    },
    "5.5.4": {
        "titulo": "Argumento HELO/EHLO inválido",
        "descricao": "O nome informado no HELO/EHLO é inválido e o Gmail encerrou a conexão.",
        "causa": "Nome do servidor de envio inválido ou não resolvível.",
        "acao": "Configurar um nome de host válido no servidor de envio.",
        "smtp": ["501"],
        "mensagens_google": ["HELO/EHLO argument invalid closing connection.", "HELO/EHLO argument _argument_ invalid closing connection", "Empty HELO/EHLO argument not allowed, closing connection"],
    },
    "5.6.0": {
        "titulo": "Mensagem malformada",
        "descricao": "A mensagem não está em conformidade com a RFC 5322 e não foi aceita.",
        "causa": "Cabeçalhos ou corpo da mensagem fora do padrão.",
        "acao": "Corrigir a estrutura da mensagem conforme a RFC 5322.",
        "smtp": ["554"],
        "mensagens_google": ["Email message is malformed. Not accepted."],
    },
    "5.7.0": {
        "titulo": "Recusa por política de segurança ou autenticação",
        "descricao": "O Gmail recusou a mensagem ou a sessão por motivo de segurança, autenticação ou relay. O texto completo indica se o problema é relay não autorizado, envio bloqueado, credenciais ou conteúdo suspeito.",
        "causa": "Relay não autorizado, conta suspensa por abuso, falta de autenticação, alteração de identidade ou conteúdo considerado suspeito.",
        "acao": "Verificar credenciais e IP registrado no relay do Google Workspace. Se a conta foi suspensa por abuso, contatar o administrador do Workspace.",
        "smtp": ["530", "550", "552", "503", "554"],
        "mensagens_google": ["Email relay denied", "Email sending denied.", "Authentication required.", "No identity changes permitted.", "This message was blocked because its content presents a potential security issue."],
    },
    "5.7.1": {
        "titulo": "Mensagem recusada por política ou filtro",
        "descricao": "O Gmail bloqueou a mensagem por política do remetente ou do destinatário, suspeita de spam, reputação baixa ou não atendimento às diretrizes de remetentes.",
        "causa": "Política do domínio do destinatário, reputação baixa do IP ou domínio, cabeçalhos fora da RFC 5322, endereço From ausente ou inválido, IP sem autorização para envio direto, limite de envio do relay, credenciais inválidas no relay ou endereço IPv6 sem PTR.",
        "acao": "Corrigir a causa indicada no motivo devolvido pelo Gmail. Para spam ou reputação, revisar conteúdo, autenticação (SPF, DKIM, DMARC) e histórico do remetente. Para cabeçalhos, corrigir From, Message-ID e cabeçalhos duplicados. Para relay, verificar o IP registrado e as credenciais. Se a política for do destinatário, contatar o administrador dele.",
        "smtp": ["550"],
        "mensagens_google": [
            "The user or domain that you are sending to (or from) has a policy that prohibits the email that you sent.",
            "Invalid credentials for relay.",
            "This message is likely unsolicited email.",
            "This message does not meet IPv6 sending guidelines regarding PTR records and authentication.",
            "This message is likely suspicious due to the very low reputation of the sending IP address.",
            "This message is likely suspicious due to the very low reputation of the sending domain.",
            "Messages missing a valid address in the From: header, or having no From: header, are not accepted.",
            "Messages missing a valid Message-ID: header are not accepted.",
            "Messages with multiple addresses in the From: header are not accepted.",
            "The message contains a unicode character in a disallowed header.",
            "This message is not RFC 5322 compliant because it has duplicate headers.",
            "This message is not RFC 5322 compliant because the From: header is missing.",
            "This message is not RFC 5322 compliant because it has multiple From: headers.",
            "This message is not RFC 5322 compliant because the From: header has a non-compliant domain name.",
            "This email has been rate limited.",
            "The IP you're using to send email is not authorized to send email directly to our servers.",
            "Daily SMTP relay sending limit exceeded for this customer.",
            "Encoded-word syntax is not permitted in message header.",
            "This message is not RFC 5322 compliant. There are multiple _header-name_ headers.",
            "This message is not RFC 5322 compliant. There is a malformed _header-name_ header.",
        ],
    },
    "5.7.10": {
        "titulo": "Protocolo violado após STARTTLS",
        "descricao": "O cliente enviou comandos em pipeline logo após o STARTTLS, o que a RFC não permite.",
        "causa": "Cliente SMTP que envia comandos antes de concluir o handshake TLS.",
        "acao": "Ajustar o cliente SMTP para aguardar a resposta do STARTTLS.",
        "smtp": ["523"],
        "mensagens_google": ["SMTP protocol violation, no commands allowed to pipeline after STARTTLS."],
    },
    "5.7.11": {
        "titulo": "Parâmetros não permitidos no comando",
        "descricao": "O comando SMTP foi enviado com parâmetros que não são aceitos.",
        "causa": "Cliente SMTP enviando parâmetros em comando que não os aceita.",
        "acao": "Ajustar o cliente SMTP para enviar o comando sem parâmetros.",
        "smtp": ["501"],
        "mensagens_google": ["Syntax error (no parameters allowed)."],
    },
    "5.7.14": {
        "titulo": "Login pelo navegador exigido",
        "descricao": "A conta exige autenticação pelo navegador e não aceita login direto por SMTP.",
        "causa": "Configuração de segurança da conta Google que bloqueia login de aplicativos não autorizados.",
        "acao": "Entrar pelo navegador com a conta e concluir a verificação, ou usar a configuração de relay do Workspace.",
        "smtp": ["534"],
        "mensagens_google": ["Please log in through your web browser and then try again."],
    },
    "5.7.24": {
        "titulo": "Registro SPF suspeito",
        "descricao": "O registro SPF do domínio remetente tem entradas suspeitas. A mensagem foi bloqueada.",
        "causa": "Entradas SPF amplas ou não reconhecidas.",
        "acao": "Revisar o registro SPF do domínio.",
        "smtp": ["550"],
        "mensagens_google": ["The SPF record of the sending domain has one or more suspicious entries."],
    },
    "5.7.25": {
        "titulo": "IP de envio sem PTR válido",
        "descricao": "O IP de origem não tem registro PTR válido. A mensagem foi bloqueada.",
        "causa": "DNS reverso ausente ou inconsistente.",
        "acao": "Configurar o registro PTR do IP de envio.",
        "smtp": ["550"],
        "mensagens_google": ["This message was blocked because the sending IP address doesn't have a PTR record."],
    },
    "5.7.26": {
        "titulo": "Remetente não autenticado",
        "descricao": "O Gmail exige que remetentes em volume se autentiquem. A mensagem foi bloqueada.",
        "causa": "Envio sem SPF, DKIM ou DMARC válidos.",
        "acao": "Configurar SPF, DKIM e DMARC para o domínio remetente.",
        "smtp": ["550"],
        "mensagens_google": ["This email has been blocked because the sender is unauthenticated."],
    },
    "5.7.27": {
        "titulo": "Falha de SPF",
        "descricao": "A mensagem não passou na autenticação SPF. A mensagem foi bloqueada.",
        "causa": "Servidor de envio não autorizado no SPF do domínio.",
        "acao": "Incluir o servidor de envio no registro SPF.",
        "smtp": ["550"],
        "mensagens_google": ["This message was blocked because it didn't pass SPF authentication."],
    },
    "5.7.28": {
        "titulo": "Volume de spam originado do IP",
        "descricao": "Há um volume incomum de email não solicitado vindo do IP de envio. A mensagem foi bloqueada.",
        "causa": "IP de envio com histórico de spam ou reputação baixa.",
        "acao": "Revisar listas de destinatários, reduzir envios e verificar a reputação do IP.",
        "smtp": ["550"],
        "mensagens_google": ["There is an unusual rate of unsolicited email originating from your IP address."],
    },
    "5.7.29": {
        "titulo": "Envio sem TLS",
        "descricao": "O envio em massa não usou conexão TLS, exigida pelo Gmail. A mensagem foi bloqueada.",
        "causa": "Servidor de envio sem STARTTLS.",
        "acao": "Habilitar TLS no servidor de envio.",
        "smtp": ["550"],
        "mensagens_google": ["This message was blocked because it wasn't sent over a TLS connection."],
    },
    "5.7.30": {
        "titulo": "Falha de DKIM",
        "descricao": "A assinatura DKIM não foi validada. A mensagem foi bloqueada.",
        "causa": "Chave DKIM ausente no DNS ou assinatura inválida.",
        "acao": "Publicar a chave DKIM correta e assinar as mensagens.",
        "smtp": ["550"],
        "mensagens_google": ["This message was blocked because it didn't pass DKIM authentication."],
    },
    "5.7.32": {
        "titulo": "Cabeçalho From desalinhado",
        "descricao": "O cabeçalho From não está alinhado com o domínio autenticado por SPF ou DKIM. A mensagem foi bloqueada.",
        "causa": "Domínio do From diferente do domínio autenticado.",
        "acao": "Alinhar o domínio do From com o domínio autenticado.",
        "smtp": ["421"],
        "mensagens_google": ["Your email was blocked because the From: header in this message isn't aligned."],
    },
    "5.7.40": {
        "titulo": "Domínio sem DMARC adequado",
        "descricao": "O domínio remetente não tem registro DMARC, ou o registro não é compatível com a política do Gmail. A mensagem foi bloqueada.",
        "causa": "Ausência de DMARC ou política incompatível.",
        "acao": "Publicar um registro DMARC válido.",
        "smtp": ["550"],
        "mensagens_google": ["Your message was blocked because the sending domain doesn't have a DMARC record."],
    },
}

# Códigos sem texto conferido na página oficial do Google: a origem vem de fontes secundárias.
CODIGOS_ORIGEM_INDIRETA = frozenset({"5.7.14", "5.7.24", "5.7.25", "5.7.26", "5.7.27", "5.7.28", "5.7.29"})

_PADRAO_DSN = re.compile(r"^([245])\.(\d{1,3})\.(\d{1,3})$")


def explicar_status(status: str) -> dict[str, str] | None:
    """Explicação do código DSN (ex.: '5.7.1'); None quando o formato não é um código DSN."""
    codigo = str(status or "").strip()
    casamento = _PADRAO_DSN.match(codigo)
    if not casamento:
        return None
    classe = CLASSES.get(casamento.group(1), {})
    entrada = CODIGOS.get(codigo)
    if entrada is None:
        assunto = ASSUNTOS.get(casamento.group(2), "Assunto não catalogado")
        return {
            "codigo": codigo,
            "titulo": classe.get("titulo", "Falha não catalogada"),
            "descricao": f"Código {codigo} não está no catálogo. Classe: {classe.get('titulo', '—')}. Assunto: {assunto}.",
            "causa": "",
            "acao": "Consultar o texto completo do relatório de entrega.",
            "tipo": classe.get("tipo", "falha"),
        }
    return {
        "codigo": codigo,
        "titulo": entrada["titulo"],
        "descricao": entrada["descricao"],
        "causa": entrada["causa"],
        "acao": entrada["acao"],
        "tipo": classe.get("tipo", "falha"),
    }


def _motivo_google(codigo: str, diagnostico: str) -> str:
    """Mensagem específica do Gmail presente no diagnóstico, quando catalogada para o código."""
    texto = diagnostico.lower()
    for mensagem in CODIGOS.get(codigo, {}).get("mensagens_google", []):
        if mensagem.lower().rstrip(".") in texto:
            return mensagem
    return ""


def texto_explicacao(status: str, diagnostico: str = "") -> str:
    """Texto em português para o histórico; vazio quando o código não está catalogado."""
    codigo = str(status or "").strip()
    if codigo not in CODIGOS:
        return ""
    explicacao = explicar_status(codigo)
    motivo = _motivo_google(codigo, diagnostico)
    complemento = f" Motivo informado pelo Gmail: {motivo}" if motivo else ""
    return f"{explicacao['codigo']} · {explicacao['titulo']}. {explicacao['descricao']}{complemento} Ação: {explicacao['acao']}"
