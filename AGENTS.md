# Instruções para agentes de IA — SICARD

## Credenciais de acesso para agentes

As credenciais SIGMA destinadas aos agentes estão no arquivo local
`R:\sad_slt\credencias_sigma_agentes.txt` (na raiz deste workspace:
`credencias_sigma_agentes.txt`). Antes de pedir ao usuário que faça login para
validar áreas restritas do SICARD, consultar esse arquivo e utilizar a conta
adequada ao perfil exigido, pelo fluxo normal de autenticação.

Esta orientação vale também para subagentes; ao delegar validações autenticadas,
informar o caminho, nunca os valores das credenciais. O arquivo é ignorado pelo
Git: não copiar seu conteúdo para código, documentação, mensagens, logs ou
artefatos, nem versioná-lo. Reutilizar sessões válidas respeitando sua expiração;
não criar cookies permanentes nem contornar controles de acesso. Se o arquivo
estiver ausente ou o login falhar, informar o bloqueio sem expor credenciais.

## Antes de codificar: verificar os padrões existentes

**Antes de criar ou alterar qualquer código, todo agente deve verificar se já
existem padrões estabelecidos para a tarefa.** Esta regra também se aplica aos
subagentes e aos agentes especializados.

- Ler as instruções aplicáveis e localizar implementações de referência antes de editar.
- Reutilizar os componentes, estilos, funções e fluxos existentes. Não inventar
  variações locais quando já houver um padrão.
- Em UI, conferir a estrutura e a aparência da referência, incluindo tipografia,
  textos suplementares, estados iniciais, dimensões, alinhamentos e espaçamentos.
  Validar os estilos computados no navegador; não presumir equivalência visual.
- Quando o usuário indicar uma referência, examiná-la antes de implementar.
- Somente divergir de um padrão por solicitação explícita do usuário ou após
  apresentar a necessidade e obter sua aprovação.
- Ao delegar, comunicar esta obrigação e a referência aplicável ao agente executor.

## Padrão obrigatório das tabelas

Ao criar ou modificar tabelas da aplicação, leia e siga
[docs/padrao-tabelas.md](docs/padrao-tabelas.md).

A tabela **Julgamentos Realizados**, em
`/restrict/analise-multicriterio/central-julgamentos`, é a referência visual oficial.
Todas as tabelas devem conter barra de filtros, tabela com zebrado e coluna de
seletores, barra de botões de controle, paginador e contador, nessa ordem.
Reproduza exatamente as cores, tipografia, dimensões e espaçamentos da referência.
Não crie variações locais ou omita elementos por decisão própria.

Esta regra foi estabelecida expressamente pelo usuário em 27/10/2026 e aplica-se
a todo o repositório. Instruções mais específicas devem preservar esse padrão;
alterações posteriores explicitamente solicitadas pelo usuário prevalecem.
