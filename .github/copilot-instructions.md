# Instruções globais dos agentes de IA — SICARD / PLI-SP

Estas instruções valem para **todas** as interações de agentes de IA neste repositório.

## Manutenção contínua da Nota Técnica

O repositório mantém uma **nota técnica de entrega ao cliente** com toda a metodologia
do sistema de hierarquização de demandas:

- **Arquivo:** [documentacao/nota_tecnica/NOTA_TECNICA.md](documentacao/nota_tecnica/NOTA_TECNICA.md)
- **Fontes internas da metodologia:** `documentacao/hierarquizacao/`
  (ESPINHA_DORSAL, MODELO_HIERARQUIZACAO_ESPACIAL, MODULO_FASE1/2/3) e
  `data/matriz-criterios-premissas.json`.

**Regra obrigatória:** sempre que a metodologia de hierarquização for alterada — fases
(triagem de restrição/risco, favorabilidade territorial, ajuste por atributos), método
multicritério AHP, matriz de dimensões/critérios, operadores espaciais, regras de
síntese, auditoria, versionamento ou homologação — o agente deve **atualizar a nota
técnica na mesma tarefa**, mantendo-a fiel às fontes internas.

Ao atualizar a nota técnica:

1. **Preserve o padrão de linguagem e escrita** já existente no documento: registro
   formal e institucional, português técnico, terceira pessoa, sem marketing e sem
   emojis. Mantenha a estrutura de seções, o estilo das tabelas e a numeração.
2. **Incremente o versionamento:** atualize o campo *Versão* e a *Data de emissão* no
   bloco de identificação e adicione uma linha ao *Histórico de Revisões* descrevendo a
   alteração.
3. **Garanta consistência** entre a nota técnica e as fontes internas
   (`documentacao/hierarquizacao/` e `data/matriz-criterios-premissas.json`); não
   introduza informação que não esteja fundamentada nessas fontes.
4. **Não invente autoria, números normativos ou dados.** Mantenha lacunas `[preencher]`
   quando a informação depender de decisão humana.

## Restrição sobre o repositório InfoSiga

O repositório de análise de acidentes (`acidentes_infosiga_analise_exploratoria`) é
**externo e somente-leitura**. Nunca o modifique; no máximo, **consuma** seus dados
para gerar produtos deste repositório.
