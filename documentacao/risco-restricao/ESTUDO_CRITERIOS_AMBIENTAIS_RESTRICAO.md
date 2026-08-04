Critérios ambientais de restrição e risco para espacialização da planilha

Diagnóstico

O problema central da versão anterior foi tratar critérios ambientais com rótulos abstratos demais, especialmente em Dado-fonte e Dado derivado. Para a planilha funcionar, cada critério de restrição ambiental precisa nascer de um gatilho espacial observável e juridicamente reconhecível. Em termos práticos:

- Restrição ambiental deve preferencialmente ser binária ou discreta: presença/ausência de sobreposição, incidência/não incidência, enquadra/não enquadra.
- Complexidade licenciatória não é bom critério primário quando vem sozinha. Ela funciona melhor como resultado derivado de um conjunto de gatilhos ambientais concretos.
- Dado-fonte deve ser a camada espacial real: shapefile, geodatabase, WMS/WFS, polígono oficial, linha de drenagem, MDE.
- Dado derivado deve ser o produto espacial calculado a partir dessas camadas: interseção, buffer, presença/ausência, área interceptada, percentual de sobreposição, classe de incidência.

Critérios ambientais já identificados no material atual

Os critérios ambientais hoje espalhados entre Etapa 1, Etapa 2 e risco são estes:

1. Sobreposição com áreas protegidas.
2. Complexidade licenciatória para implantação.
3. Sobreposição com zonas de amortecimento de áreas protegidas.
4. Contribuição para resiliência da rede a eventos extremos.
5. Conflito socioambiental com comunidades tradicionais.
6. Redução de emissões de GEE.
7. Redução de poluentes locais.
8. Eficiência energética.
9. Migração para modais mais eficientes.

Separação conceitual recomendada

Para fins de planilha, os critérios ambientais devem ser separados em três grupos:

1. Restrição ambiental.
2. Risco ambiental.
3. Desempenho ambiental.

Os critérios de restrição e risco são os que precisam de maior rigor espacial neste momento.

Critérios ambientais de restrição que devem permanecer

1. Sobreposição com áreas protegidas.
Justificativa: é um gatilho espacial direto e juridicamente defensável.

2. Complexidade licenciatória.
Justificativa: só deve permanecer se for reescrita como critério derivado ou síntese, nunca como dado-fonte primário.

Critérios ambientais de restrição que estão faltando

1. Intervenção em APPs hídricas.
Decisão metodológica posterior: permanece como informação de apoio ao licenciamento, mas foi retirada do núcleo de risco/restrição da Fase 1 porque, em obras rodoviárias de utilidade pública, a intervenção pode ser autorizada, mitigada e compensada e não representa, isoladamente, complicador forte de elegibilidade.

2. Intervenção em APPs por relevo.
Decisão metodológica posterior: permanece como informação de apoio ao licenciamento e ao projeto de engenharia, mas foi retirada do núcleo de risco/restrição da Fase 1 pelo mesmo motivo aplicado às APPs hídricas.

3. Supressão de vegetação nativa protegida.
Por que falta: mesmo fora de UC, a presença de remanescentes de vegetação nativa, especialmente Mata Atlântica em estágio médio ou avançado, eleva muito a restrição ambiental e a dificuldade de autorização.

4. Incidência em APRM ou zonas de proteção de mananciais.
Por que falta: em São Paulo, áreas de proteção e recuperação de mananciais possuem zoneamentos próprios e restrições normativas objetivas. Isso deve entrar como critério próprio e não ficar diluído em territorial ou licenciamento genérico.

5. Interferência em manguezal, restinga ou zona costeira sensível.
Por que falta: para projetos no litoral, este é um gatilho ambiental específico que não deve ficar escondido dentro de áreas protegidas em geral.

6. Interferência em cavidades naturais ou áreas de alto potencial espeleológico.
Por que falta: em alguns contextos, especialmente no Vale do Ribeira, isso pode ser decisivo para restringir traçado e implantação.

Critérios ambientais de risco que devem existir

1. Sobreposição com zonas de amortecimento de áreas protegidas.
2. Suscetibilidade a inundação e alagamento.
3. Suscetibilidade a escorregamento e erosão.
4. Conflito socioambiental com comunidades tradicionais.
5. Passagem próxima a áreas contaminadas ou passivos ambientais relevantes, quando aplicável.

Observação importante

Nem todo critério ambiental deve virar restrição. O teste é simples:

- Se a incidência espacial aciona limitação legal, exigência formal, vedação, autorização específica ou forte barreira de licenciamento, ele tende a ser restrição.
- Se a incidência apenas aumenta dificuldade, custo, prazo ou incerteza, ele tende a ser risco.

Proposta de espacialização para os critérios ambientais de restrição

1. Sobreposição com áreas protegidas

- Tipo: restrição ambiental.
- Critério: Sobreposição com áreas protegidas.
- Premissa: Projetos que sobrepõem áreas protegidas possuem licenciamento ambiental mais complexo, o que desestimula sua priorização e pode representar desafios indesejados do ponto de vista de execução.
- Variável: Sobreposição com áreas protegidas.
- Relação com o escopo: negativa.
- Dado-fonte: shapefile com o perímetro das unidades de conservação e outras áreas protegidas relevantes do Estado de São Paulo.
- Dado derivado: presença ou ausência de sobreposição entre o projeto e o perímetro das áreas protegidas; alternativamente, área e percentual de interseção.
- Unidade de medida / métrica: presença/ausência.
- Operação espacial: interseção entre geometria do projeto e polígonos de áreas protegidas.
- Fonte sugerida: DataGeo / IDEA-SP para camadas estaduais; bases federais complementares quando necessário.

2. Intervenção em APPs hídricas

- Tipo: restrição ambiental.
- Critério: Intervenção em APPs hídricas.
- Premissa: Projetos que interceptam APPs associadas a cursos d'água, nascentes, lagos ou reservatórios tendem a demandar autorizações e medidas mitigadoras adicionais, o que aumenta a restrição ambiental à implantação.
- Variável: Interseção com APP hídrica.
- Relação com o escopo: negativa.
- Dado-fonte: hidrografia vetorial oficial, nascentes mapeadas, massa d'água e, quando disponível, delimitações oficiais já consolidadas de APP.
- Dado derivado: faixa de APP derivada por buffer normativo a partir da hidrografia e presença ou ausência de interceptação pelo projeto; pode incluir área interceptada.
- Unidade de medida / métrica: presença/ausência.
- Operação espacial: geração de buffer normativo sobre drenagens e corpos d'água, seguida de interseção com o projeto.
- Fonte sugerida: ANA, IBGE, DataGeo e bases estaduais de recursos hídricos.

3. Intervenção em APPs por relevo

- Tipo: restrição ambiental.
- Critério: Intervenção em APPs por relevo.
- Premissa: Projetos que incidem sobre APPs associadas a relevo protegido tendem a enfrentar maior complexidade de autorização e exigência de adequação de traçado.
- Variável: Interseção com APP por relevo.
- Relação com o escopo: negativa.
- Dado-fonte: modelo digital de elevação, curvas de nível, rede de drenagem e parâmetros topográficos derivados.
- Dado derivado: polígonos de APP por declividade, topo de morro ou outras categorias aplicáveis, com presença ou ausência de interceptação pelo projeto.
- Unidade de medida / métrica: presença/ausência.
- Operação espacial: derivação geomorfométrica em SIG a partir de MDE, geração de polígonos de APP e interseção com o projeto.
- Fonte sugerida: MDE oficial disponível para o estado, IBGE, INPE, DataGeo ou produto topográfico equivalente.

4. Supressão de vegetação nativa protegida

- Tipo: restrição ambiental.
- Critério: Supressão de vegetação nativa protegida.
- Premissa: Projetos que exigem supressão de vegetação nativa protegida, especialmente formações mais sensíveis ou estágios mais avançados, tendem a enfrentar maior restrição ambiental e maior custo de compensação.
- Variável: Interseção com remanescentes de vegetação nativa protegida.
- Relação com o escopo: negativa.
- Dado-fonte: camada de remanescentes de vegetação nativa, fitofisionomias sensíveis e, quando houver, estágio sucessional.
- Dado derivado: presença ou ausência de interceptação de vegetação protegida; área potencial de supressão; percentual da faixa de projeto sobre vegetação protegida.
- Unidade de medida / métrica: presença/ausência.
- Operação espacial: interseção entre faixa ou polígono do projeto e camada de vegetação nativa protegida.
- Fonte sugerida: DataGeo, inventários florestais estaduais e bases oficiais temáticas correlatas.

5. Incidência em APRM e áreas de mananciais

- Tipo: restrição ambiental.
- Critério: Incidência em áreas de proteção e recuperação de mananciais.
- Premissa: Projetos situados em APRM ou em zonas de proteção de mananciais estão sujeitos a restrições normativas específicas, o que pode limitar implantação, traçado e operação.
- Variável: Sobreposição com APRM e zoneamentos de mananciais.
- Relação com o escopo: negativa.
- Dado-fonte: shapefile dos limites de APRM, bacias de mananciais e seus zoneamentos oficiais.
- Dado derivado: presença ou ausência de sobreposição com APRM; classe de zoneamento incidente sobre o projeto.
- Unidade de medida / métrica: presença/ausência.
- Operação espacial: interseção entre projeto e polígonos de APRM/zoneamento.
- Fonte sugerida: DataGeo / IDEA-SP.

6. Interferência em manguezal, restinga ou zona costeira sensível

- Tipo: restrição ambiental.
- Critério: Interferência em ecossistemas costeiros sensíveis.
- Premissa: Projetos que incidem sobre manguezais, restingas e ambientes costeiros sensíveis tendem a enfrentar restrições ambientais específicas e maior complexidade de licenciamento.
- Variável: Interseção com ecossistemas costeiros sensíveis.
- Relação com o escopo: negativa.
- Dado-fonte: camadas temáticas costeiras oficiais com delimitação de manguezal, restinga, zona costeira sensível e, quando aplicável, áreas úmidas costeiras.
- Dado derivado: presença ou ausência de sobreposição; área interceptada por classe de ecossistema.
- Unidade de medida / métrica: presença/ausência.
- Operação espacial: interseção entre projeto e polígonos de ecossistemas costeiros.
- Fonte sugerida: DataGeo e bases ambientais oficiais correlatas.

7. Interferência em cavidades naturais ou área de influência espeleológica

- Tipo: restrição ambiental.
- Critério: Interferência em cavidades naturais e áreas de influência.
- Premissa: Projetos que incidem sobre cavidades naturais ou sua área de influência podem enfrentar restrições técnicas e legais severas, especialmente em áreas cársticas e regiões com alta relevância espeleológica.
- Variável: Interseção com cavidades ou áreas de influência espeleológica.
- Relação com o escopo: negativa.
- Dado-fonte: base de cavidades naturais, pontos de ocorrência e, quando houver, polígonos de influência ou potencial espeleológico.
- Dado derivado: presença ou ausência de incidência; quantidade de cavidades afetadas; classe de relevância incidente.
- Unidade de medida / métrica: presença/ausência.
- Operação espacial: interseção espacial entre projeto, cavidades e faixas de influência.
- Fonte sugerida: base oficial especializada, quando disponível, complementada por camadas estaduais e estudos temáticos regionais.

Proposta de espacialização para critérios ambientais de risco

1. Sobreposição com zonas de amortecimento de áreas protegidas

- Tipo: risco ambiental.
- Critério: Sobreposição com zonas de amortecimento de áreas protegidas.
- Premissa: Projetos que se sobrepõem a zonas de amortecimento podem ter processo de licenciamento, execução ou operação mais complexos, o que representa um desafio desfavorável do ponto de vista de execução.
- Variável: Sobreposição com zonas de amortecimento de áreas protegidas.
- Relação com o escopo: negativa.
- Dado-fonte: perímetro das áreas protegidas e, quando disponível, a própria camada oficial de zonas de amortecimento.
- Dado derivado: zonas de amortecimento oficiais ou buffers normativos/substantivos, com presença ou ausência de sobreposição com o projeto.
- Unidade de medida / métrica: presença/ausência.
- Operação espacial: uso da zona de amortecimento oficial; na ausência, geração de buffer de referência para triagem preliminar, seguido de interseção com o projeto.
- Fonte sugerida: DataGeo / IDEA-SP para UCs estaduais e zonas de amortecimento publicadas.

2. Suscetibilidade a inundação e alagamento

- Tipo: risco ambiental.
- Critério: Incidência em áreas suscetíveis a inundação e alagamento.
- Premissa: Projetos implantados em áreas sujeitas a inundação, enxurrada ou alagamento recorrente tendem a apresentar maior risco de interrupção, sobrecusto e manutenção corretiva.
- Variável: Incidência em áreas suscetíveis a inundação/alagamento.
- Relação com o escopo: negativa.
- Dado-fonte: cartas de suscetibilidade, manchas de inundação, histórico de alagamentos, rede hidrográfica e topografia.
- Dado derivado: presença ou ausência de incidência; classe de suscetibilidade; percentual do projeto em área inundável.
- Unidade de medida / métrica: presença/ausência ou classe ordinal.
- Operação espacial: interseção com manchas/categorias de suscetibilidade e, quando necessário, derivação complementar por modelagem topográfica.
- Fonte sugerida: bases estaduais, defesa civil e DataGeo quando houver publicação temática.

3. Suscetibilidade a escorregamento e erosão

- Tipo: risco ambiental.
- Critério: Incidência em áreas suscetíveis a escorregamento e erosão.
- Premissa: Projetos situados em áreas suscetíveis a movimentos de massa ou erosão tendem a demandar soluções mais caras e a enfrentar maior risco de atraso e manutenção corretiva.
- Variável: Incidência em áreas suscetíveis a escorregamento/erosão.
- Relação com o escopo: negativa.
- Dado-fonte: cartas geotécnicas, suscetibilidade geológica, declividade, solos e litologia.
- Dado derivado: presença ou ausência de incidência; classe de suscetibilidade; extensão do projeto em classe alta ou muito alta.
- Unidade de medida / métrica: presença/ausência ou classe ordinal.
- Operação espacial: interseção com cartas geotécnicas e mapas de suscetibilidade.
- Fonte sugerida: bases geotécnicas estaduais e institutos técnicos competentes.

Fontes espaciais concretas já identificadas na pesquisa rápida

1. DataGeo / IDEA-SP.
Achado: o portal estadual publica catálogo ambiental com camadas e metadados, incluindo unidades de conservação, zonas de amortecimento e áreas de proteção e recuperação de mananciais. Isso é fonte espacial concreta para São Paulo.

2. FUNAI, página de dados geoespaciais e mapas.
Achado: a FUNAI disponibiliza dados geoespaciais atualizados em formatos como Shapefile, KML, XLSX e CSV para terras indígenas. Isso sustenta critério socioambiental espacializável, mais adequado como risco do que como restrição ambiental clássica.

3. Zonas de amortecimento publicadas em camadas oficiais.
Achado: o próprio DataGeo exibe exemplos de zonas de amortecimento oficiais de unidades de conservação, como no caso do PETAR. Isso é melhor do que usar apenas buffer genérico quando a camada oficial existir.

Recomendação metodológica para montar a planilha

1. Não usar mais um único critério amplo chamado complexidade licenciatória como primeiro preenchimento.
2. Quebrar a restrição ambiental em gatilhos espaciais concretos.
3. Usar presença/ausência como unidade padrão dos critérios de restrição.
4. Quando o fenômeno não for estritamente impeditivo, migrá-lo para risco ambiental.
5. Reservar critérios de desempenho ambiental para Etapa 2 e critérios de restrição/risco para Etapa 1.

Estrutura mínima recomendada da planilha para restrição ambiental

Para cada linha, preencher sempre:

- Critério.
- Premissa.
- Variável.
- Relação com o escopo.
- Dado-fonte.
- Dado derivado.
- Unidade de medida / métrica.
- Fonte.
- Operação espacial implícita no dado derivado.

Síntese objetiva

Se o objetivo é montar uma planilha boa, os critérios ambientais de restrição prioritários para São Paulo são:

1. Sobreposição com áreas protegidas.
2. Supressão de vegetação nativa protegida.
3. Incidência em APRM e áreas de mananciais.
4. Interferência em ecossistemas costeiros sensíveis.
5. Interferência em cavidades naturais e área de influência espeleológica.

E os de risco ambiental prioritários são:

1. Sobreposição com zonas de amortecimento de áreas protegidas.
2. Suscetibilidade a inundação e alagamento.
3. Suscetibilidade a escorregamento e erosão.
4. Conflito socioambiental com comunidades tradicionais.

Esses critérios já estão suficientemente definidos para virar preenchimento de planilha sem depender de texto genérico.

## Atualização: enquadramento pelo licenciamento rodoviário da CETESB

Atualização realizada em 15/07/2026 com base no **Manual para Elaboração de Estudos para o Licenciamento com Avaliação de Impacto Ambiental**, versão disponibilizada pela CETESB em agosto de 2024, e nas normas relacionadas pelo próprio Manual.

Fonte principal: [Manual da CETESB para elaboração de estudos com AIA](https://www2.cetesb.sp.gov.br/licenciamentoambiental/wp-content/uploads/sites/32/2024/08/Manual-para-Elaboracao-de-Estudos-com-AIA.pdf).

### O que o procedimento da CETESB efetivamente indica

A CETESB não trata toda interseção ambiental como impedimento automático. Para rodovias, a incidência territorial serve inicialmente para:

1. comparar alternativas tecnológicas e locacionais;
2. definir a profundidade do EAS, RAP ou EIA/RIMA;
3. quantificar impactos e interferências;
4. identificar autorizações, manifestações e anuências necessárias;
5. estabelecer medidas de prevenção, mitigação, compensação e monitoramento;
6. decidir, ao final da análise, sobre a viabilidade ambiental da alternativa.

O Manual determina que as alternativas locacionais sejam comparadas por indicadores como supressão de vegetação, intervenção em Unidades de Conservação, terras indígenas e quilombolas, sítios arqueológicos, Reserva Legal, áreas de proteção de mananciais, desapropriações e reassentamentos. Para rodovias, também exige a caracterização da faixa de domínio, áreas de apoio, terraplenagem, interferências em APP, supressão vegetal e áreas contaminadas.

Portanto, a presença de uma feição deve ser separada da sua consequência jurídica:

- **Interseção espacial:** constatação objetiva, sempre binária por feição (`0` ou `1`).
- **Risco:** a intervenção pode ser licenciável, autorizável, mitigável ou compensável, mas tende a aumentar custo, prazo, incerteza, necessidade de estudos ou exigências institucionais.
- **Restrição:** existe vedação legal, incompatibilidade com o regime territorial, impossibilidade técnica ou condição impeditiva aplicável àquela feição e àquela intervenção.

### Regra revisada de classificação

Nenhuma classe ampla deve ser marcada como restrição apenas porque houve interseção. A classificação final deve considerar os atributos preservados pelo `Identity`, especialmente categoria, zoneamento, estágio, relevância, ato de proteção, situação fundiária e regra aplicável.

| Gatilho espacial | Classificação inicial | Quando pode se tornar restrição |
| --- | --- | --- |
| UC de Proteção Integral estadual ou federal | Risco | Quando a categoria, o zoneamento, o plano de manejo ou a manifestação do órgão gestor indicar incompatibilidade ou vedação à intervenção proposta. |
| UC de Uso Sustentável estadual ou federal | Risco | Quando a zona ou norma específica da UC proibir ou tornar incompatível a infraestrutura no local atingido. |
| Zona de amortecimento de UC | Risco | Quando houver norma específica com vedação aplicável à intervenção; a simples incidência normalmente aciona análise e manifestação, não bloqueio automático. |
| Vegetação nativa protegida | Risco | Quando o bioma, a fitofisionomia, o estágio sucessional, a localização e a hipótese legal não admitirem supressão. A classificação depende desses atributos. |
| APRM e zoneamento de mananciais | Risco | Quando a lei específica e a classe territorial incidente vedarem o uso ou a intervenção proposta. |
| Manguezal, restinga ou ecossistema costeiro sensível | Risco | Quando a categoria de proteção e a hipótese concreta não admitirem intervenção. Deve-se preservar no resultado o tipo de ecossistema e seu regime jurídico. |
| Cavidade natural subterrânea | Risco, salvo classe impeditiva | Cavidade de relevância máxima ou outra situação em que a norma vede impacto irreversível deve ser classificada como restrição. As demais classes exigem avaliação e medidas próprias. |
| Terra Indígena | Risco socioambiental e institucional | Somente uma incompatibilidade ou impedimento reconhecido no processo competente deve produzir restrição; a incidência, por si, exige avaliação e participação institucional. |
| Território quilombola | Risco socioambiental e institucional | Somente impedimento reconhecido no processo competente deve produzir restrição; a incidência aciona avaliação de impactos e participação institucional. |
| Área contaminada | Risco | Torna-se restrição quando o diagnóstico demonstrar incompatibilidade com a obra ou impossibilidade de gerenciamento seguro nas condições propostas. |
| Inundação, alagamento, erosão, escorregamento ou movimento de massa | Risco técnico-ambiental | Torna-se restrição quando estudos demonstrarem impossibilidade técnica ou risco residual inaceitável, não mitigável pelo projeto. |
| Bem tombado ou área envoltória | Risco patrimonial | Torna-se restrição quando o ato de proteção ou a manifestação do órgão competente vedar a intervenção. |
| Sítio arqueológico | Risco patrimonial | Torna-se restrição apenas quando a preservação no local ou decisão do órgão competente impedir a alternativa; em outros casos pode exigir prospecção, resgate e acompanhamento. |
| Assentamento ou regime fundiário especial | Risco fundiário | Torna-se restrição quando houver impedimento dominial ou institucional que inviabilize a alternativa. |
| Faixa de domínio ou servidão existente | Risco de interferência | Torna-se restrição quando norma de segurança, domínio ou manifestação do operador impedir compartilhamento, cruzamento ou remanejamento. |

### Consequência para a Fase 1 do SICARD

A Fase 1 deve trabalhar em duas passagens:

1. **Detecção:** cada demanda é interseccionada simultaneamente com as camadas unificadas, registrando `0` ou `1` e preservando todos os atributos de cada feição.
2. **Enquadramento:** uma tabela de regras interpreta os atributos da feição e produz `risco` ou `restrição`, com fundamento normativo e justificativa rastreável.

Quando a base espacial não contiver os atributos necessários ao enquadramento, o resultado correto é **risco pendente de análise**, nunca restrição automática.

### Instrumentos e referências destacados pela CETESB

- EAS, RAP e EIA/RIMA são definidos conforme a significância dos impactos, nos termos da Resolução SMA nº 49/2014 e da Decisão de Diretoria CETESB nº 153/2014/I.
- A Licença Prévia aprova localização e concepção e atesta a viabilidade ambiental; a Licença de Instalação autoriza a implantação com controles e condicionantes; a Licença de Operação depende da verificação do cumprimento das etapas anteriores.
- Para rodovias, o Manual relaciona as Resoluções SMA nº 81/1998, nº 30/2000 e nº 33/2002, além da Decisão de Diretoria nº 154/2013/C.
- Para UCs, o Manual relaciona a Lei Federal nº 9.985/2000, o Decreto nº 4.340/2002, a Resolução CONAMA nº 428/2010 e a Resolução SMA nº 85/2012.
- Para flora e APP, relaciona as Leis Federais nº 12.651/2012 e nº 11.428/2006 e normas estaduais complementares.
- Para cavidades, relaciona os Decretos Federais nº 99.556/1990 e nº 6.640/2008, a Resolução CONAMA nº 347/2004 e normas complementares.

### Limite de uso desta classificação

Esta taxonomia é uma triagem para apoiar a escolha e a hierarquização de alternativas. Ela não substitui o enquadramento da CETESB, a manifestação do órgão gestor, autorizações específicas nem a decisão de viabilidade ambiental no processo de licenciamento.

### Decisão sobre APPs e cavidades de relevância máxima

- APP hídrica e APP associada ao relevo não integram mais os critérios de risco/restrição da Fase 1. Continuam disponíveis como informação ambiental e insumo do licenciamento.
- O critério anteriormente denominado “Interferência irreversível com cavidade natural subterrânea de relevância máxima” passa a usar o alias amigável **Impacto em caverna de relevância máxima**.
- Conforme o Decreto Federal nº 10.935/2022, o impacto irreversível pode ser autorizado pelo órgão licenciador quando atendidos os requisitos legais. Por isso, o critério é **risco crítico / restrição condicionada**, e não restrição automática.
- A conversão em restrição ocorre quando não houver alternativa técnica e locacional viável, os requisitos legais não forem atendidos, houver risco de extinção de espécie ou a autorização for negada.

## Determinação do licenciador e da complexidade institucional

O órgão ambiental licenciador não deve ser inferido pela quantidade de instituições envolvidas. Nos termos dos artigos 7º, 8º e 13 da Lei Complementar nº 140/2011, existe **um único ente federativo licenciador**. Os demais órgãos atuam como gestores da área, intervenientes, autoridades patrimoniais ou responsáveis por informações e autorizações específicas.

Para obras rodoviárias estaduais analisadas pelo SICARD, deve ser aplicada a seguinte árvore:

1. A rodovia está localizada ou é desenvolvida em Terra Indígena?
   - Sim: licenciamento ambiental federal pelo IBAMA.
2. A rodovia está localizada ou é desenvolvida em UC federal que não seja APA?
   - Sim: licenciamento ambiental federal pelo IBAMA.
3. A obra se enquadra em outra hipótese federal do artigo 7º, XIV, da LC nº 140/2011 ou do Decreto nº 8.437/2015?
   - Sim: licenciamento ambiental federal pelo IBAMA.
4. Não ocorrendo hipótese federal e tratando-se de obra estadual em São Paulo:
   - licenciamento ambiental estadual pela CETESB.

### Matriz de competência e participação institucional

| Incidência | Licenciador determinado | Participação institucional adicional |
| --- | --- | --- |
| UC federal, exceto APA federal | IBAMA | ICMBio, na condição de gestor da UC. |
| APA federal, sem outro gatilho federal | CETESB | ICMBio, conforme o impacto e o procedimento aplicável à UC. |
| UC estadual | CETESB | Fundação Florestal, SEMIL ou órgão gestor correspondente. |
| Terra Indígena | IBAMA | FUNAI, na avaliação dos impactos sobre terras e povos indígenas. |
| Impacto sobre TI sem localização dentro dela e sem outro gatilho federal | CETESB | FUNAI como interveniente especializado. |
| Território quilombola, sem outro gatilho federal | CETESB | Fundação Cultural Palmares na avaliação dos impactos culturais e sociais; INCRA nas informações e questões fundiárias. |
| Sítio arqueológico, sem outro gatilho federal | CETESB | IPHAN para avaliação, pesquisa, prospecção, resgate e acompanhamento arqueológico. |
| Bem tombado estadual | CETESB | CONDEPHAAT e, quando aplicável, órgão municipal. |
| Bem protegido federal | CETESB, salvo outro gatilho federal | IPHAN. |
| Rodovia federal enquadrada no Decreto nº 8.437/2015 | IBAMA | Intervenientes definidos pelas incidências territoriais. |

Referências: [Lei Complementar nº 140/2011](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp140.htm) e [Decreto Federal nº 8.437/2015](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/decreto/d8437.htm).

### Índice de Complexidade de Licenciamento

Depois da determinação do licenciador, o SICARD pode calcular uma restrição própria de priorização. Essa restrição não declara inviabilidade ambiental: ela representa a probabilidade de o processo consumir prazo incompatível com o horizonte de entrega da carteira.

O índice deve ser explicado por componentes rastreáveis:

| Componente | Pergunta respondida |
| --- | --- |
| Estudo ambiental | O processo exige EAS, RAP, EIA/RIMA ou definição posterior pela autoridade? |
| Intervenientes | Quantos órgãos precisam se manifestar e quais são eles? |
| Autorizações específicas | Há autorização de UC, flora, patrimônio, pesquisa, resgate ou outra autorização autônoma? |
| Participação social | Há audiência pública, consulta ou processo participativo específico? |
| Compensações | Há compensação ambiental, florestal, patrimonial, fundiária ou social? |
| Alternativa locacional | A incidência exige comparar, alterar ou abandonar o traçado proposto? |
| Acúmulo de incidências | Quantos gatilhos independentes recaem sobre a mesma demanda? |

### Saída recomendada

| Classe | Consequência na hierarquização |
| --- | --- |
| Baixa | Sem restrição de priorização. |
| Média | Risco de prazo registrado e exibido no relatório. |
| Alta | Restrição automática de priorização, com penalização rastreável. |
| Crítica | Inelegibilidade na rodada, salvo decisão administrativa motivada e registrada. |

Os pesos e limites não devem ser inventados diretamente no código. Eles devem ser cadastrados em tabela de domínio ou configuração versionada, aprovados pela governança do processo e registrados no JSONB da rodada. O resultado deve informar os gatilhos, órgãos, autorizações, regra aplicada, versão da configuração e possibilidade de revisão motivada.

## Embargos e interdições ambientais

Embargo e interdição ativos não devem ficar diluídos no critério genérico de complexidade jurídica. São atos administrativos concretos e precisam de critérios próprios na Fase 1.

### 1. Área sob embargo ambiental federal ativo

- Critério: Interseção com área sob embargo ambiental federal ativo.
- Natureza: restrição jurídica espacial.
- Fonte: consulta pública e dados abertos de áreas embargadas do IBAMA.
- Regra espacial: selecionar somente registros com embargo ativo e geometria válida; aplicar `Identity` e interseção com a demanda.
- Resultado: `0` sem interseção; `1` quando houver interseção com embargo ativo.
- Atributos mínimos: número do termo, situação, data, motivo, município, CPF/CNPJ protegido quando necessário, origem do dado, data de atualização e geometria.
- Regra de validade: embargo cancelado, suspenso, levantado ou sem confirmação de vigência não gera restrição automática.
- Fonte oficial: [Áreas embargadas pelo IBAMA](https://www.gov.br/ibama/pt-br/assuntos/fiscalizacao-e-protecao-ambiental/areas-embargadas).

### 2. Área sob embargo ambiental estadual ativo

- Critério: Interseção com área sob embargo ambiental estadual ativo.
- Natureza: restrição jurídica espacial.
- Fonte institucional: fiscalização ambiental estadual, com registro no ambiente SEMIL/Polícia Militar Ambiental/SIGAM.
- Regra espacial: usar apenas geometria associada ao ato oficial ou geometria validada por servidor autorizado e vinculada ao número do auto/termo.
- Resultado: `0` sem interseção; `1` quando houver interseção com embargo estadual ativo.
- Atributos mínimos: número do auto e do termo, órgão autuante, situação, data, fundamento, processo, município, data de atualização e geometria.
- Limitação atual: não foi identificada camada pública estadual consolidada equivalente à base geográfica do IBAMA. Até existir serviço oficial ou integração com o SIGAM, a carga deve ocorrer por integração institucional ou importação validada, nunca por polígono inferido pelo sistema.

### 3. Área ou estabelecimento sob interdição ativa da CETESB

- Critério: Interseção com área ou estabelecimento sob interdição ambiental ativa da CETESB.
- Natureza: restrição jurídica condicionada ao objeto e ao alcance do ato.
- Fonte institucional: processo sancionatório e cadastro oficial da CETESB.
- Regra espacial: interseção com a geometria oficial do empreendimento, área ou instalação abrangida pela interdição.
- Resultado: `0` sem incidência; `1` somente quando a demanda atingir o objeto interditado e o ato estiver ativo e for aplicável à intervenção analisada.
- Atributos mínimos: número do ato, processo, situação, data, atividade atingida, alcance territorial, condições para levantamento e geometria.
- Regra terminológica: não registrar automaticamente penalidade ou interdição da CETESB como “embargo”. Deve-se preservar a espécie exata do ato administrativo.
- Limitação atual: na ausência de camada pública geográfica consolidada, a carga depende de integração institucional ou importação validada.

### Regra de precedência na Fase 1

Embargo ou interdição ativos e aplicáveis são avaliados antes dos riscos ambientais comuns. Havendo interseção confirmada:

1. registrar a feição e todos os atributos do ato no JSONB;
2. classificar o objeto como restrição jurídica;
3. interromper a avaliação agregada de risco da Fase 1 para esse objeto;
4. permitir revisão apenas com prova de levantamento, suspensão, cancelamento, inaplicabilidade do ato ou erro geométrico;
5. manter histórico imutável da regra, da fonte e da decisão de revisão.

## Modelo consolidado dos índices de risco e restrição

Para simplificar a atuação do gestor sem eliminar a rastreabilidade, a Fase 1 passa a produzir três representações para cada objeto:

1. **Valores interseccionados:** valor individual atribuído a cada critério encontrado.
2. **Valores calculados:** índices contínuos de risco e de restrição.
3. **Valor arredondado:** classe única e simples utilizada pelas fases seguintes.

### Escala comum

| Valor | Classe |
| ---: | --- |
| 0 | Sem incidência |
| 1 | Risco baixo |
| 2 | Risco médio |
| 3 | Risco alto |
| 4 | Restrição |

O valor zero é atribuído somente quando a interseção foi executada e não encontrou incidência. Ausência de camada, falha de processamento ou atributo insuficiente deve gerar `não avaliado`, nunca zero.

### Índice de risco calculado

O índice de risco é a média ponderada dos critérios de risco efetivamente avaliados:

```text
indice_risco = soma(valor_interseccionado × peso) / soma(pesos_aplicáveis)
```

Os pesos são configuráveis e versionados. Enquanto não houver deliberação formal sobre pesos diferenciados, todos os critérios utilizam peso neutro `1`.

### Índice de restrição calculado

O índice de restrição utiliza o maior valor confirmado entre os critérios restritivos:

```text
indice_restricao = máximo(valores_restritivos_confirmados)
```

Essa regra impede que um embargo ou uma interdição ativa seja diluído por vários riscos baixos. Critério condicionado somente recebe valor `4` depois da confirmação da condição que o converte em restrição.

### Resultado consolidado e arredondamento

```text
valor_resultante = máximo(indice_risco, indice_restricao)
```

| Intervalo do valor resultante | Classe arredondada |
| ---: | --- |
| 0 | Sem risco |
| maior que 0 e menor que 1,50 | Risco baixo |
| de 1,50 até menor que 2,50 | Risco médio |
| de 2,50 até menor que 3,50 | Risco alto |
| de 3,50 até 4,00 | Restrição |

Os limiares devem permanecer em configuração versionada. Alterações de faixa não podem modificar retroativamente rodadas já concluídas.

### Uso pelas fases seguintes

As Fases 2 e 3 recebem a classe arredondada, mas o sistema preserva e disponibiliza ao gestor:

- critérios e feições interseccionados;
- valores individuais e pesos;
- índice de risco;
- índice de restrição;
- valor resultante;
- classe arredondada;
- dados não avaliados;
- versão da regra utilizada.

Objeto classificado como restrição pode continuar sendo processado para fins técnicos e comparativos, mas permanece inelegível para o resultado final, salvo decisão motivada, registrada e auditável do gestor.

Tabela exportada para o arquivo Excel independente em data/TABELA_AREAS_PROTEGIDAS_SP.xlsx.
