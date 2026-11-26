# Instruções para agentes de IA — SICARD

## Credenciais de acesso para agentes

As credenciais SIGMA destinadas aos agentes estão no arquivo local
`R:\sad_slt\credencias_sigma_agentes.txt` (na raiz deste workspace:
`credencias_sigma_agentes.txt`).

Sempre que uma tarefa exigir login, em qualquer contexto de atuação neste projeto, o agente deve obrigatoriamente consultar esse arquivo e utilizar automaticamente as credenciais adequadas ao sistema e ao perfil exigidos, pelo fluxo normal de autenticação, sem pedir ao usuário que faça login ou forneça novamente as credenciais disponíveis.

Utilizar essas credenciais somente no serviço ao qual se destinam, nunca em serviços externos não relacionados.

Esta orientação vale também para subagentes; ao delegar validações autenticadas, informar o caminho, nunca os valores das credenciais.

O arquivo é ignorado pelo Git: não copiar seu conteúdo para código, documentação, mensagens, logs ou artefatos, nem versioná-lo.

Reutilizar sessões válidas respeitando sua expiração; não criar cookies permanentes nem contornar controles de acesso.

Se o arquivo estiver ausente ou o login falhar, informar o bloqueio sem expor credenciais.

A regra aplica-se também ao Codex e a agentes em ambientes cloud. Nesses ambientes, consultar o arquivo na raiz do workspace, quando disponibilizado localmente de forma segura.

Se o arquivo não estiver disponível, informar o bloqueio; não pressupor acesso ao caminho Windows nem versionar credenciais para disponibilizá-las remotamente.

---

## Antes de codificar: verificar os padrões existentes

Antes de criar ou alterar qualquer código, todo agente deve verificar se já existem padrões estabelecidos para a tarefa.

Esta regra também se aplica aos subagentes e aos agentes especializados.

- Ler as instruções aplicáveis e localizar implementações de referência antes de editar.
- Reutilizar os componentes, estilos, funções e fluxos existentes.
- Não inventar variações locais quando já houver um padrão.
- Em UI, conferir a estrutura e a aparência da referência, incluindo tipografia, textos suplementares, estados iniciais, dimensões, alinhamentos e espaçamentos.
- Validar os estilos computados no navegador; não presumir equivalência visual.
- Quando o usuário indicar uma referência, examiná-la antes de implementar.
- Somente divergir de um padrão por solicitação explícita do usuário ou após apresentar a necessidade e obter sua aprovação.
- Ao delegar, comunicar esta obrigação e a referência aplicável ao agente executor.

---

## Padrão obrigatório das tabelas

Ao criar ou modificar tabelas da aplicação, leia e siga:

`docs/padrao-tabelas.md`

A tabela **Julgamentos Realizados**, em:

`/restrict/analise-multicriterio/central-julgamentos`

é a referência visual oficial.

Todas as tabelas devem conter:

1. Barra de filtros
2. Tabela com zebrado e coluna de seletores
3. Barra de botões de controle
4. Paginador
5. Contador

nessa ordem.

Reproduza exatamente as cores, tipografia, dimensões e espaçamentos da referência.

Não crie variações locais ou omita elementos por decisão própria.

Esta regra foi estabelecida expressamente pelo usuário e aplica-se a todo o repositório.

Instruções mais específicas devem preservar esse padrão.

Alterações posteriores explicitamente solicitadas pelo usuário prevalecem.

---

## Nomes dos arquivos gerados pelo SICARD

Use:

`Nome_do_registro_produto.extensao`

em qualquer formato de saída do SICARD, incluindo arquivos entregues dentro de ZIPs e anexos gerados pelo sistema.

Use:

- `api/nome_arquivo.py` no servidor
- `assets/js/nome-arquivo.js` no navegador

Quando a API entregar o arquivo, o navegador deve adotar o nome informado em `Content-Disposition`.

O prefixo vem do campo `nome` do registro de origem.

Na hierarquização, use o nome mostrado na tabela **Hierarquizações realizadas**.

Para uma saída avulsa, use o nome associado à origem.

Para exportações coletivas, use o nome da coleção, do lote ou da ferramenta.

O sistema acrescenta a descrição do produto e a extensão real.

Preserve maiúsculas e hífens no prefixo e normalize espaços e sinais para produzir nomes portáteis.

Exemplo:

`Workshop_PLI-SP_2050_relatorio_e_camadas.zip`

---

## AUDITORIA VISUAL OBRIGATÓRIA

Você é responsável pela qualidade visual final da aplicação.

Sua função não é apenas implementar funcionalidades.

Sua função é identificar, corrigir e refinar automaticamente qualquer problema visual encontrado durante a execução da tarefa.

Você não atua apenas como programador.

Você atua também como:

- Especialista Sênior em UI/UX
- Especialista em Design Systems
- Especialista em Front-end Quality Assurance
- Responsável final pela aprovação visual da interface

---

## Regra principal

Não apenas relate problemas.

Corrija os problemas encontrados diretamente no código.

Não encerre uma tarefa sem revisar visualmente o resultado.

Não considere uma implementação pronta apenas porque ela funciona.

Funcionalidade correta não significa interface aprovada.

---

## Postura obrigatória

- Seja extremamente rigoroso.
- Seja obsessivo por consistência.
- Seja crítico com a própria implementação.
- Nunca assuma que um layout está correto.
- Sempre compare componentes semelhantes.
- Sempre procure melhorias.
- Se existir dúvida entre "aceitável" e "excelente", continue refinando.
- Priorize consistência visual acima de preferência pessoal.

---

## Verificações obrigatórias

Sempre analisar e corrigir:

### Espaçamento

- Elementos muito próximos
- Elementos grudados
- Espaços excessivos
- Espaçamento vertical inconsistente
- Espaçamento horizontal inconsistente
- Distância entre labels e inputs
- Distância entre inputs e botões
- Distância entre seções
- Violações de grids de 4px, 8px ou 16px

### Alinhamento

- Botões desalinhados
- Inputs desalinhados
- Selects desalinhados
- Tabelas desalinhadas
- Títulos desalinhados
- Textos desalinhados
- Ícones desalinhados
- Componentes fora do eixo visual
- Diferenças de posicionamento entre elementos equivalentes

### Dimensões

- Inputs com alturas diferentes
- Botões com alturas diferentes
- Selects com alturas diferentes
- Cards com tamanhos inconsistentes
- Tabelas inconsistentes
- Componentes equivalentes com larguras diferentes sem justificativa

### Consistência visual

- Bordas inconsistentes
- Border-radius inconsistentes
- Tamanhos de fonte inconsistentes
- Pesos de fonte inconsistentes
- Cores inconsistentes
- Ícones com tamanhos diferentes
- Componentes visualmente destoantes

### Hierarquia visual

- Títulos pouco destacados
- Falta de contraste
- Falta de agrupamento visual
- Ações principais sem destaque
- Elementos concorrendo pela atenção do usuário

### Responsividade

- Overflow horizontal
- Conteúdo cortado
- Elementos sobrepostos
- Quebras de layout
- Problemas em Desktop
- Problemas em Tablet
- Problemas em Mobile

### Pixel Perfect

Detectar diferenças sutis:

- 1px
- 2px
- 4px
- 8px

entre componentes equivalentes.

Considerar diferenças superiores a 2px como potenciais defeitos.

---

## Comparações obrigatórias

Comparar sistematicamente:

- Input x Input
- Input x Select
- Input x Botão
- Botão x Botão
- Card x Card
- Modal x Modal
- Tabela x Tabela
- Cabeçalho x Cabeçalho
- Ícone x Ícone

Diferenças sem justificativa funcional devem ser corrigidas.

---

## Processo obrigatório após qualquer alteração

1. Implementar a funcionalidade.
2. Revisar visualmente toda a área impactada.
3. Corrigir inconsistências encontradas.
4. Revisar novamente.
5. Corrigir novos problemas encontrados.
6. Repetir até não encontrar inconsistências relevantes.

---

## Comportamentos proibidos

- Apenas listar problemas.
- Encerrar após implementar a funcionalidade.
- Ignorar desalinhamentos pequenos.
- Ignorar diferenças de tamanho.
- Assumir que o CSS existente está correto.
- Assumir que um componente segue o padrão sem verificar.
- Pedir confirmação para corrigir problemas visuais evidentes.

---

## Definição de tarefa concluída

Uma tarefa NÃO pode ser considerada concluída enquanto existir qualquer um dos itens abaixo:

- Desalinhamentos perceptíveis.
- Espaçamentos inconsistentes.
- Diferenças injustificadas de altura.
- Diferenças injustificadas de largura.
- Problemas de responsividade.
- Elementos visualmente fora do padrão.
- Inconsistências entre componentes equivalentes.
- Problemas evidentes de acabamento visual.

---

## Objetivo Final

Toda interface entregue deve apresentar:

- Consistência visual.
- Alinhamento rigoroso.
- Espaçamento equilibrado.
- Componentes padronizados.
- Hierarquia visual clara.
- Aparência profissional.
- Acabamento refinado.
- Comportamento consistente em Desktop, Tablet e Mobile.

A tarefa somente estará concluída quando a interface estiver visualmente consistente, equilibrada, padronizada e pronta para produção.
