# Integração SEI-SP no MOCAD (SICARD)

Revisão: 2026-09-09. Implementação local e testes automatizados concluídos;
homologação autenticada no portal SEI-SP ainda pendente. Testes com transporte
simulado não comprovam o funcionamento de uma conta real.

## Escopo confirmado

- Acesso pessoal interno (servidor/SIP) e externo (e-mail).
- Primeiro caso real informado: acesso externo pelo PLI-SP.
- Página dedicada em `/restrict/sei-integracao/`, dentro do SICARD/MOCAD.
- Processos são candidatos: somente a confirmação do operador cria demanda.
- Usa os serviços e tabelas normais de plano, programa e projeto. Não cria
  staging no SIGMA nem colunas paralelas de origem.
- Código com segmento `SEI`, reconhecido pelo validador dos códigos. O número
  do processo permanece também na descrição para rastreabilidade.

## Acesso e sessão

O adaptador navega no portal web, sem SOAP/OAuth de integração institucional.
Na consulta pública realizada em 09/09/2026, o acesso interno redirecionou
`/sei/controlador.php?acao=login` para `/sip/login.php`. O envio do formulário
agora resolve seu `action` a partir da URL final.

Formulário, campos ocultos, imagem do CAPTCHA e cookies permanecem juntos
entre preparação e envio. O usuário responde ao desafio; o SICARD não resolve
CAPTCHA nem executa JavaScript do portal. Redirecionamentos são verificados
antes do envio e restritos ao HTTPS do SEI-SP.

A sessão fica em memória, isolada pelo usuário e pelo token SICARD. Expira
após 30 minutos, ao sair do SICARD ou ao reiniciar o processo. O deploy usa
um processo; múltiplos workers exigem armazenamento compartilhado ou afinidade
antes de serem habilitados para este fluxo.

A senha é usada no envio, sem retenção no objeto de sessão. A opção de lembrar
persiste a credencial cifrada com Fernet na tabela existente
`integracoes.sei_credencial`. É possível reconectar deixando a senha vazia ou
esquecer a credencial salva. Falha ao salvar é informada. Falha do banco não
impede consultar o estado da sessão em memória.

Em 09/09/2026 foi confirmado que a tabela já existe em produção e não contém
credenciais. A chave `SEI_CREDENTIALS_SECRET_KEY`, ausente na verificação inicial,
foi gerada e configurada no ambiente da VM, sem exposição do valor. Não gerar outra chave sobre uma chave
existente ou sobre credenciais que dependam de uma chave anterior.

## Consulta e revisão

- Navega somente por links de leitura recebidos do SEI, preservando parâmetros
  e assinaturas. Não tenta uma lista de endereços presumidos.
- Identifica números de processo em links, sem confundir datas ou tabelas de
  layout com processos. Metadados sem cabeçalho reconhecido não são inferidos.
- Redirecionamento para login expira a sessão. HTML desconhecido retorna erro,
  não lista vazia. A consulta tem limite de 20 páginas e informa leitura parcial.
- A revisão lê HTML e PDFs com texto, seguindo links de documentos e frames
  reconhecidos. Limites: 12 MB por resposta, 20 páginas/documentos, 100 páginas
  por PDF e 60 mil caracteres na descrição sugerida. PDFs sem texto extraível
  exigem revisão no portal; OCR não está implementado.
- O tipo inicial é Projeto, revisável para Plano ou Programa. Isso é uma regra
  de produto, não classificação automática por IA.
- Instituição e representante são selecionados nos cadastros reais do SIGMA;
  não é necessário digitar UUID. Não cria instituições/pessoas automaticamente.
- Diretoria e vínculo são revisados de acordo com o tipo. Coordenadas de
  projeto precisam ser informadas; não preenche ausências com zero.
- O botão evita submissões simultâneas e o backend reutiliza o resultado para
  o mesmo processo na mesma sessão. Duplicidade entre sessões/reinícios ainda
  depende da revisão dos cadastros; não há índice persistente de processo SEI.
- Criação exige perfil de operação, processo presente na sessão e payload
  validado. Número contendo barra é aceito na rota. Status não pode ser
  arbitrariamente escolhido pelo payload de importação.

## Padrão visual

Mantém `base_conteudo.html`, navbar MOCAD, Roboto/Montserrat, `app.css`,
`escala-tipografica.css`, abas, tabela e modal de `SLTAdminUi`. CSS específico
limita-se ao controle de senha, conteúdo consultado e adaptação de largura.

## Verificação e homologação restante

Testes: `tests/test_sei_login_redirect.py`, `tests/test_sei_integracao.py`,
`tests/test_auth.py` e `tests/test_codigos_demanda.py`. Os dados de teste são
simulados e não são enviados ao portal nem persistidos como demandas reais.

Ainda requer conta real em cada modalidade para confirmar os sinais de sessão
autenticada, navegação, paginação e árvore de documentos. O login direto no
navegador não transfere cookies para o backend: a conexão precisa ser realizada
na página de integração do SICARD. Não registrar senhas, cookies, parâmetros
assinados ou conteúdo privado de processos nos relatórios de teste.

Geocodificação automática e correspondência automática de remetentes continuam
sem regra de produto homologada; a revisão usa seleção e coordenadas explícitas.
