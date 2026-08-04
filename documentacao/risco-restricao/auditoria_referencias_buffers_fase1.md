# Auditoria de referências - buffers da Fase 1

Status: em andamento  
Início: 2026-08-03  
Escopo: `data/geoespacial/buffers_zona_amortecimento_fase1.json`

## Método

Cada distância, exceção e efeito de classificação deve ser confirmada em fonte
primária oficial. A existência do ato normativo não valida, isoladamente, a
regra espacial aplicada. Regras sem dispositivo verificável permanecem em
auditoria e não recebem link de confirmação na interface.

## Achados confirmados

| Regra | Resultado | Evidência primária |
| --- | --- | --- |
| `za_uc_pi_federal_derivada` | A faixa de 3 km prevista no art. 1º, § 2º da Resolução CONAMA nº 428/2010, com redação dada pela Resolução nº 473/2015, era transitória por cinco anos contados da publicação de 2015. Portanto, não fundamenta geração automática em 2026. As exceções textuais são RPPN, APA e áreas urbanas consolidadas; ARIE não consta no dispositivo. | Resolução CONAMA nº 428/2010, art. 1º, § 2º, redação da Resolução nº 473/2015; processo oficial: https://conama.mma.gov.br/index.php?option=com_sisconama&view=processo&id=1813 |
| `za_uc_pi_estadual_derivada` | A referência correta é a Resolução SMA nº 85/2012, não a Resolução SMA nº 85/2008. O ato trata da autorização no licenciamento ambiental de empreendimentos que possam afetar UC ou sua ZA e não determina largura geral para zona de amortecimento. | Resolução SMA nº 85/2012, cópia oficial SEMIL arquivada em `documentacao/fundamentacao/uc_estadual_resolucao_sma_085_2012.pdf`: https://semil.sp.gov.br/legislacao/wp-content/uploads/sites/5/2022/07/2012resolucao_sma_085_2012-1.pdf |
| `entorno_cavidade_maxima` | O Decreto nº 10.935/2022 exige licenciamento para empreendimentos que afetem cavidades e sua área de influência (art. 3º), condiciona impacto irreversível em cavidade de relevância máxima (art. 4º) e admite empreendimentos na área de influência desde que preservem o equilíbrio e a integridade da cavidade (art. 6º). A IN MMA nº 2/2017 define a área de influência pelos elementos bióticos e abióticos, superficiais e subterrâneos, necessários à manutenção da cavidade; nenhum dos atos fixa raio de 250 m. | Decreto nº 10.935/2022, arts. 3º, 4º e 6º: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d10935.htm; IN MMA nº 2/2017, Anexo I, cópia oficial arquivada em `documentacao/fundamentacao/cavidades_instrucao_normativa_mma_02_2017.pdf`: https://www.gov.br/icmbio/pt-br/assuntos/centros-de-pesquisa/cavernas/orientacoes-e-procedimentos/legislacao-espeleologica/in-02_2017_mma_30ago17.pdf |
| `entorno_cavidade_demais` | O Decreto nº 10.935/2022 e a IN MMA nº 2/2017 não fixam raio de 250 m para cavidades de relevância alta, média, baixa ou não classificada; aplicam a delimitação técnica da área de influência. | Decreto nº 10.935/2022, arts. 3º, 5º e 6º: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d10935.htm; IN MMA nº 2/2017, Anexo I, cópia oficial arquivada em `documentacao/fundamentacao/cavidades_instrucao_normativa_mma_02_2017.pdf`: https://www.gov.br/icmbio/pt-br/assuntos/centros-de-pesquisa/cavernas/orientacoes-e-procedimentos/legislacao-espeleologica/in-02_2017_mma_30ago17.pdf |
| `entorno_terra_indigena_*` e `entorno_quilombola_*` | A Portaria Interministerial nº 60/2015 disciplina o licenciamento ambiental de competência do IBAMA. O Anexo I define, para São Paulo (coluna “Demais Regiões”), 5 km para ferrovias, dutos e linhas de transmissão; 10 km para rodovias; e 8 km para portos, mineração e termelétricas. Para UHE/PCH, define 15 km ou o reservatório acrescido de 20 km a jusante. Não há categoria normativa “grande empreendimento” ou “outros”, portanto as regras foram mantidas inativas até receberem a tipologia do empreendimento. | Portaria Interministerial nº 60/2015, Anexo I, publicação oficial arquivada em `documentacao/fundamentacao/terra_indigena_quilombola_portaria_interministerial_60_2015.pdf`; página oficial: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/m/malaria/legislacao/portaria-interministerial-no-60-2015/view |
| `entorno_sitio_arqueologico` | A IN IPHAN nº 001/2015 prevê manifestação quando houver intervenção na Área de Influência Direta (AID) do empreendimento em bens culturais acautelados. A norma não fixa buffer de 500 m em torno de sítio arqueológico; as duas ocorrências de “500” no documento tratam de área construída de tipologias de empreendimento, não de raio arqueológico. | IN IPHAN nº 001/2015, publicação oficial arquivada em `documentacao/fundamentacao/sitio_arqueologico_instrucao_normativa_iphan_001_2015.pdf`: https://www.gov.br/iphan/pt-br/centrais-de-conteudo/legislacao/atos-normativos/2015/instrucao_normativa_001_de_25_de_marco_de_2015.pdf/@@display-file/file |
| `entorno_bem_tombado_sem_envoltoria` | O Decreto-Lei nº 25/1937, art. 18, impede construção na vizinhança que prejudique a visibilidade do bem tombado, mas não fixa uma metragem nacional. A área envoltória deve ser a delimitada no ato de tombamento ou definida na análise do órgão de patrimônio. | Decreto-Lei nº 25/1937, art. 18: https://www.planalto.gov.br/ccivil_03/decreto-lei/del0025.htm |
| `entorno_manguezal` | A Lei nº 12.651/2012 classifica os manguezais, em toda a sua extensão, como APP. Não há faixa externa federal de 50 m; a geometria do próprio manguezal deve integrar o critério de proteção direta. | Lei nº 12.651/2012, art. 4º, VII: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12651.htm |

## Pendências de validação

- Geometrias oficiais de zona de amortecimento, quando existirem, para cada UC federal, estadual ou de uso sustentável.

Nenhuma das pendências deve ser substituída por uma distância uniforme inferida.
Onde a fonte vigente exige uma geometria individualizada, essa geometria é o
parâmetro operacional, e não um buffer calculado.

A regra federal de 3 km foi identificada como expirada e não deve ser reativada
sem ato vigente ou geometria oficial de zona de amortecimento.

## Correção aplicada ao catálogo

Em 2026-08-03, regras sem distância verificável passaram a exigir a camada
vetorial oficial correspondente; elas não têm campo de largura e não podem
acionar OP-04. As regras com metros verificáveis permanecem parametrizadas como
`buffer_metros` ou `buffer_por_tipologia`. O catálogo passou a distinguir os
modos de materialização e só permite execução após os insumos e o contexto
obrigatórios serem informados.

## Não conformidade de implementação

O arquivo `tmp/executar_fase1_local_v2.py` mantém distâncias fora do catálogo
auditado: 250 m para cavidades, 500 m para áreas contaminadas e 250 m para sítios
arqueológicos. Esses valores não carregam vínculo individual com ato, dispositivo,
fonte de publicação ou status de auditoria. Eles devem ser substituídos pelo
catálogo versionado após a validação de cada regra; até lá, não podem ser tratados
como parâmetros normativos confirmados.

O arquivo `tmp/executar_fase1_local.py` também continha buffer de 250 m para
cavidades. O parâmetro foi suspenso nos dois geradores locais.