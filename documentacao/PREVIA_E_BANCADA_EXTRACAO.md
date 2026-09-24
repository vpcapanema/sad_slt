# Preparação e confirmação de camadas

Para entradas, selecionar uma camada existente e enviar arquivos locais alimentam apenas a prévia. Para bases, selecionar arquivos, concluir upload ou carregar uma lista salva alimenta primeiro o card de lista categorizada da subseção 1.2. A bancada possui cópias independentes da composição confirmada. O botão **Enviar pra bancada** substitui essa composição pelas entradas e bases vetoriais válidas preparadas. Visibilidade no mapa não define participação na análise.

Editar, limpar e desfazer atuam na preparação. Remover uma camada diretamente na bancada a retira também da preparação e do pedido de execução. Alterações nas regras de bases preparadas devem ser confirmadas novamente. Algoritmo e nome da saída continuam definidos na seção 1.3.

A árvore possui raízes fixas de entrada e base. Entradas mantêm subgrupos por arquivo; bases têm subgrupos pela categoria da lista, com as camadas diretamente dentro de cada categoria, sem repetir a camada como grupo de arquivo. A lista de bases tem altura limitada e rolagem interna, preservando seus controles. Caminhos ficam nas informações. Arquivos inválidos e rasters permanecem identificados na prévia, mas os dois algoritmos vetoriais não os recebem. Múltiplos arquivos locais conservam originais separados; a execução valida a correspondência exata entre esses arquivos e as entradas confirmadas.

## Lista categorizada de bases

O card começa oculto e aparece ao selecionar bases ou carregar uma lista. Editar permite adicionar, excluir referências selecionadas e trocar categorias. Excluir afeta somente a lista, sem apagar arquivos no storage. Cancelar restaura a lista anterior e mantém a prévia e a bancada.

Salvar persiste a lista sem exigir leitura de geometria. Uma lista aberta é atualizada na sua chave original, inclusive listas legadas da versão 1. Configurações completas não podem ser sobrescritas por essa atualização de listas.

Confirmar valida as referências com no máximo duas leituras simultâneas. Só após todas passarem o conjunto categorizado substitui as bases da prévia. Qualquer falha mantém a prévia anterior. Cancelar descarta respostas de leituras que já estavam em andamento; não há gravação no servidor nessa etapa. A bancada continua independente até Enviar pra bancada.

`GET /api/geoespacial/extracao-atributos/configuracoes/{chave}?lista=true` lê apenas as referências salvas, sem consultar o banco nem abrir camadas. Categorias ou referências indisponíveis permanecem editáveis e são verificadas ao confirmar.

## Validação no servidor

`POST /api/geoespacial/extracao-atributos/entrada-local/jobs` recebe um arquivo binário e devolve o identificador. `GET .../jobs/{id}` fornece mensagens reais, progresso e resultado. `POST .../jobs/{id}/cancelar` solicita interrupção; o cliente aguarda o estado terminal `cancelado` antes de confirmar o cancelamento.

A leitura roda em um processo isolado. Cancelar encerra esse processo, inclusive durante operações nativas de leitura; arquivos e prévias ficam somente em RAM. Os jobs são exclusivos do usuário autenticado, limitados em concorrência e retenção. O endpoint síncrono anterior permanece compatível.

Limites atuais: dez entradas, 16 MB por arquivo, 30 MB codificados no conjunto de arquivos locais da execução. O orçamento de vértices é aplicado à representação do mapa; a execução recebe os originais. Feições lidas informam o progresso da tarefa; camadas concluídas informam o progresso do conjunto. Etapas sem medida disponível ficam indeterminadas.

## Verificação

- `tests/browser/previa-bancada.cjs`: navegador e mapas reais, APIs interceptadas; seleção existente, três arquivos, árvore, zoom, confirmação, payload e remoção.
- `tests/browser/preparacao-state.cjs`: isolamento dos estados e desfazer.
- `tests/test_entrada_previa_jobs.py`: validação real, isolamento por usuário e cancelamento.
- `tests/test_extracao_multiplos_locais.py`: originais de múltiplas entradas e recusa antes da persistência.

Alterações locais; implantação na VM depende de autorização.

## Compatibilização espacial antes da bancada

Enviar pra bancada chama `POST /api/geoespacial/extracao-atributos/compatibilizar`
com todas as entradas e bases candidatas. Arquivos locais seguem integrais em
memória; fontes cadastradas são lidas pelo identificador usado na execução.
O servidor utiliza a preparação dos motores existentes: verifica CRS e
coordenadas finitas, reprojeta cópias para EPSG:5880 e prepara as geometrias
conforme o algoritmo. CRS ausente não é adivinhado. Nomes e tipos de atributos
não são padronizados por esta etapa; as fontes não são gravadas ou alteradas.

A composição anterior da bancada só é substituída se todas as fontes candidatas
passarem. Durante a conferência, os controles da configuração e a bancada ficam
bloqueados. Erros são apresentados por camada. Arquivos já identificados como
inválidos ou raster na prévia continuam fora da composição vetorial candidata.

Sem algoritmo escolhido, a conferência usa a preparação geométrica do modo
estatístico. Antes de executar, o cliente repete a conferência com o algoritmo
e as regras atuais; os motores também normalizam as cópias efetivamente lidas
na execução. A prévia simplificada nunca substitui o arquivo original.

No modo configurável, correção, separação por tipo e buffer obedecem às regras
existentes. O diagnóstico informa geometrias vazias/colapsadas e corrigidas;
o comportamento de cada algoritmo sobre esses casos permanece o mesmo.
Compatibilidade espacial não significa que camadas necessariamente se
sobreponham: ausência de interseção pode ser um resultado legítimo.

A conferência é síncrona, não persiste as cópias preparadas e não reserva uma
versão da fonte. A execução refaz a preparação, pois uma fonte pode mudar após
sua validação. O cliente mantém o timeout de 180 segundos para a requisição.

Testes da compatibilização: `tests/test_compatibilidade_espacial.py` cobre
CRS distintos, coordenadas incoerentes/não finitas, preservação da fonte e dos
atributos, correção em cópia, regras de recorte/correção, autenticação e
correspondência do arquivo local. `tests/browser/previa-bancada.cjs` verifica
que uma recusa espacial mantém a bancada anterior e que todos os originais
locais candidatos são enviados à conferência.
