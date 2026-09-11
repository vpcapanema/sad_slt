# Contribuições do SEI no MOCAD (SICARD)

Revisão: 2026-09-11. Implementação local concluída, com testes automatizados em
`tests/test_sei_documentos.py`. Não houve homologação com documentos reais nem
aplicação das migrations em produção.

## Mudança de estratégia

A versão anterior navegava no portal SEI-SP com a conta pessoal do usuário,
resolvia login interno e externo, CAPTCHA e sessão. Essa integração foi
descontinuada e o código correspondente foi removido: serviço, rotas, schemas,
repositório de credencial, JavaScript, CSS, testes e a variável
`SEI_CREDENTIALS_SECRET_KEY`. A tabela `integracoes.sei_credencial` é apagada
pela migration `108_remover_sei_credencial.sql`, deliberadamente separada para
ser aplicada só depois de conferir o conteúdo.

No lugar dela, o analista envia o PDF da solicitação que chegou pelo SEI. O
sistema guarda o documento, lê o texto e sugere o preenchimento do cadastro de
demanda. O que a leitura não reconhecer fica em branco.

## Escopo

- Página restrita em `/restrict/sei-documentos/`, dentro do SICARD/MOCAD.
- Envio em lote de PDFs, com validação por assinatura do arquivo, não por
  extensão. Limite de 20 MB por arquivo e 60 MB somados por requisição. O
  `client_max_body_size` do snippet Nginx foi elevado a 64 MB para acomodar o
  lote; a mudança só passa a valer no próximo deploy, porque o arquivo é
  copiado para a VM por `.deploy/update_vm.sh`.
- Repositório compartilhado: todo perfil autenticado enxerga os documentos;
  enviar, analisar, excluir e criar demanda exigem perfil de operação.
- O documento é candidato: somente a confirmação do analista cria demanda,
  pelos serviços normais de plano, programa e projeto.
- Código com segmento `SEI` (`I-PRJ-SEI-XXXXXXXX`), reconhecido pelo validador
  em `api/codigos_demanda.py`. A origem legível permanece na descrição, como
  `Processo SEI: <número>` ou `Documento SEI: <arquivo>` quando o número não foi
  reconhecido.

## Armazenamento

O PDF fica em `integracoes.sei_documento.conteudo`, coluna `bytea`, decisão
explícita para que backup e restauração do banco levem o documento junto, sem
volume adicional na VM. O `sha256` é único: reenviar o mesmo arquivo é recusado
com a indicação de qual documento já o contém.

A tabela guarda também o texto extraído, os campos sugeridos, o trecho de origem
de cada campo e o vínculo com a demanda criada. A exclusão é bloqueada depois de
a demanda existir.

## Leitura do texto e sugestão de campos

A extração do texto usa `pypdf`, com teto de 100 páginas por documento. PDF
protegido por senha, ilegível ou sem camada de texto entra com status próprio e
aviso visível; nenhum campo é sugerido nesse caso. **Não há reconhecimento
óptico no projeto**: documento digitalizado precisa ser preenchido à mão.

A sugestão de campos está em `api/services/sei_extracao_campos.py`, função pura
sobre texto, sem banco, rede ou disco. Cada valor vem de um rótulo reconhecido
(`Assunto:`, `Interessado:`, `Vigência:`, `Latitude:`, entre outros) ou de um
formato inequívoco: número de processo, CNPJ, e-mail, telefone, data, moeda e
coordenada em grau decimal ou grau/minuto/segundo. Os rótulos são casados com
tolerância a acentuação.

Regras de produto que valem sempre:

- Campo sem regra correspondente volta ausente, nunca aproximado e nunca zero.
- Coordenada fora de faixa é descartada, não corrigida.
- Cada campo sugerido carrega o trecho do PDF que o originou, exibido na
  revisão para conferência.
- O tipo inicial é Projeto, revisável para Plano ou Programa. Isso é regra de
  produto, não classificação automática.
- Instituição e representante legal são selecionados nos cadastros reais do
  SIGMA. O CNPJ lido apenas pré-seleciona a instituição; nada é criado
  automaticamente.

Não existe modelo de linguagem neste fluxo. A extração é determinística e
reproduzível, e foi isolada em um módulo próprio justamente para que a troca por
outro motor, caso seja autorizada no futuro, não altere o restante.

## Criação da demanda

A criação exige perfil de operação, documento presente no repositório e payload
validado pelo schema do tipo escolhido. O status não pode ser escolhido pelo
payload de importação. A operação é idempotente: o vínculo em banco só aceita a
primeira gravação e uma segunda confirmação devolve a demanda já criada. Uma
trava em memória serializa requisições simultâneas do mesmo documento, e é por
isso que o `docker-compose.vm.yml` mantém um único worker.

## Verificação

```powershell
.venv\Scripts\python.exe -m pytest tests -q
```

`tests/test_sei_documentos.py` cobre recusa de arquivo que não é PDF, limite de
tamanho, duplicata, PDF sem texto, cada regra de extração, o envio em lote, a
exigência de sessão, a criação idempotente e o descarte do status vindo do
payload. Os PDFs são gerados no próprio teste com reportlab; nenhum documento
real do SEI é usado.

## Pendências

- Aplicar `database/107_sei_documento.sql` no banco de produção; sem isso a
  página responde erro de armazenamento indisponível. Estado conferido em
  2026-09-11 no `slt_db` da VM: o schema `integracoes` existe e a tabela
  `sei_documento` ainda não.
- Aplicar `database/108_remover_sei_credencial.sql`. A conferência prévia foi
  feita na mesma data: `integracoes.sei_credencial` existe e tem zero linhas,
  ou seja, o DROP não descarta credencial alguma.
- Homologar as regras de extração contra PDFs reais do SEI e ajustar a lista de
  rótulos conforme os modelos de ofício efetivamente usados.
- Geocodificação automática e correspondência automática de remetentes
  continuam sem regra de produto homologada; a revisão usa seleção e
  coordenadas explícitas.
