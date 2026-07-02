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
Por que falta: um projeto pode não interceptar unidade de conservação e ainda assim incidir em Área de Preservação Permanente ao longo de cursos d'água, nascentes, lagos e reservatórios. Isso é um gatilho clássico de licenciamento e autorização.

2. Intervenção em APPs por relevo.
Por que falta: topo de morro, encosta com alta declividade, borda de tabuleiro e áreas similares podem impor forte restrição à implantação, sobretudo em traçados lineares.

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
2. Intervenção em APPs hídricas.
3. Intervenção em APPs por relevo.
4. Supressão de vegetação nativa protegida.
5. Incidência em APRM e áreas de mananciais.
6. Interferência em ecossistemas costeiros sensíveis.
7. Interferência em cavidades naturais e área de influência espeleológica.

E os de risco ambiental prioritários são:

1. Sobreposição com zonas de amortecimento de áreas protegidas.
2. Suscetibilidade a inundação e alagamento.
3. Suscetibilidade a escorregamento e erosão.
4. Conflito socioambiental com comunidades tradicionais.

Esses critérios já estão suficientemente definidos para virar preenchimento de planilha sem depender de texto genérico.

Tabela exportada para o arquivo Excel independente em data/TABELA_AREAS_PROTEGIDAS_SP.xlsx.
