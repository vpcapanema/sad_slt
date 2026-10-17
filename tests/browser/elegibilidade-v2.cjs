// Módulos e bancada reais; todas as APIs são interceptadas, sem gravação em produção.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({headless:true,
    channel:process.env.SICARD_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
    args:['--no-proxy-server','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [], writes = [], saved = new Map();
    const inventories = [], preparations = [], selectionTimes = [];
    let failLayer = '', missingGeometry = false;
    page.on('pageerror', error => errors.push(error.message));
    await page.addLocatorHandler(page.locator('#pfsStatusOverlay.pfs-active'), async () => {
      await page.evaluate(() => window.StatusFeedback.fechar());
    });
    await page.addLocatorHandler(page.locator('.notification-toast').first(), async () => {
      await page.evaluate(() => window.Notify.clearAll());
    });
    const geometries = [
      {type:'LineString', coordinates:[[-47,-23],[-46.8,-23.2],[-46.6,-23.1]]},
      {type:'Polygon', coordinates:[[[-47.1,-23.3],[-47,-23.3],[-47,-23.2],[-47.1,-23.3]]]},
    ];
    const hier = {codigo:'HIER-TESTE', nome:'Rodada de teste', tipo_demanda:'projeto',
      dados_hierarquizacao:{cabecalho_grupo:{fases_a_executar:[3]}, objetos:geometries.map((_,i) => ({
        cabecalho_objeto:{codigo:`D-${i}`,nome:`Demanda ${i}`,demanda_id:`id-${i}`,atributos:{teste:42}},
      }))}};
    const layers = ['entrada','restricao-a','restricao-b','risco'].map(nome => ({
      id:`storage:base-geoespacial/${nome}.fgb`, nome, arquivo:`base-geoespacial/${nome}.fgb`,
      tipo:'vetor', status_validacao:'valida', representacao:'tiles', revisao:nome,
      tiles_token:'a'.repeat(32), feicoes:2, bounds:[-47.2,-23.4,-46.5,-22.9],
      campos:[{nome:'codigo'}], metadados_local:{crs:'EPSG:4674',tipos_geometria:['Polygon'],feicoes:2},
    }));
    const packageFile = {id:'storage:base-geoespacial/pacote.gpkg',nome:'pacote',arquivo:'base-geoespacial/pacote.gpkg',inventariar:true};
    const packageLayers = ['linhas','pontos'].map(nome => ({
      ...layers[0], id:`${packageFile.id}::${nome}`, nome, arquivo:packageFile.arquivo, camada:nome,
    }));
    const files = [...layers.map(({id,nome,arquivo}) => ({id,nome,arquivo,inventariar:true})), packageFile];
    await page.route('**/api/**', async route => {
      const req = route.request(), url = new URL(req.url()), path = url.pathname;
      const send = data => route.fulfill({json:data});
      if (req.method() !== 'GET') writes.push(path);
      if (path.includes('/auth/')) return send({authenticated:true,id:'fixture',nome:'Teste',username:'Teste',tipo_usuario:'ADMIN'});
      if (path.endsWith('/ahp/hierarquizacoes')) return send([hier]);
      if (path.endsWith('/extracao-atributos/catalogo')) return send({categorias:[],camadas:[]});
      if (path.endsWith('/ahp/hierarquizacoes/HIER-TESTE')) return send(hier);
      if (path.includes('/cadastro-geometrias/')) {
        const codigo = url.searchParams.get('codigo'), i = Number(codigo.slice(2));
        return send({itens:missingGeometry ? [] : [{
          codigo,id:`cadastro:projeto:${codigo}`,nome:`Demanda ${i}`,geometria_tipo:geometries[i].type,
          bounds:[-47.2,-23.4,-46.5,-22.9],geojson:{type:'FeatureCollection',
            features:[{type:'Feature',properties:{codigo},geometry:geometries[i]}]},
        }]});
      }
      if (path.endsWith('/storage/pastas')) return send({pastas:[{caminho:'base-geoespacial',nome:'Bases geoespaciais'}]});
      if (path.endsWith('/storage/navegar')) return send({caminho:'base-geoespacial',pai:'@storage',pastas:[],arquivos:files});
      if (path.endsWith('/storage/camadas-arquivo')) {
        const arquivo = url.searchParams.get('arquivo');
        inventories.push(arquivo);
        return send({camadas:arquivo === packageFile.arquivo ? packageLayers : layers.filter(l => l.arquivo === arquivo)});
      }
      if (path.endsWith('/preparar-camada')) {
        const id = req.postDataJSON().id;
        preparations.push(id);
        if (id === failLayer) return route.fulfill({status:422,json:{detail:'Camada indisponível para validação.'}});
        return send([...layers,...packageLayers].find(l => l.id === id));
      }
      if (path.includes('/previa-tiles/')) return route.fulfill({body:Buffer.alloc(0),contentType:'application/vnd.mapbox-vector-tile'});
      if (path.endsWith('/configuracoes')) {
        if (req.method() === 'POST') {
          const data = req.postDataJSON();
          saved.set(data.escopo, data);
          return send({chave:'teste',nome:data.nome,camadas:data.categorias[0].camadas.length});
        }
        const data = saved.get(url.searchParams.get('escopo'));
        return send({pasta:'storage/listas',configuracoes:data ? [{
          chave:'teste',nome:data.nome,arquivo:'teste.json',bytes:120,camadas:data.categorias[0].camadas.length,categorias:1,
        }] : []});
      }
      if (path.endsWith('/configuracoes/teste')) {
        const data = saved.get(url.searchParams.get('escopo'));
        return send({...data,categorias:data.categorias.map(c => ({...c,camadas:c.camadas.map(id => [...layers,...packageLayers].find(l => l.id === id))}))});
      }
      return send([]);
    });
    const base = process.env.SICARD_TEST_URL || 'http://127.0.0.1:8083';
    await page.goto(`${base}/restrict/hierarquizacao/fase-1/`, {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#ev-hierarquizacao')?.options.length === 2);
    await page.waitForFunction(() => document.querySelector('iframe').contentWindow.gpApp?.state.map?.isStyleLoaded());
    const panel = () => page.locator('iframe').evaluate(f => f.contentWindow.gpApp.state.layers.map(l => l.id));
    const inputIds = layers.map(l => l.id);
    const assertNamedFields = async () => assert.deepEqual(
      await page.evaluate(() => {
        const documents = [document, document.querySelector('#ea-workbench-frame').contentDocument];
        return documents.flatMap(doc => [...doc.querySelectorAll('input,select,textarea')]
          .filter(el => !el.id.trim() && !el.name.trim()).map(el => el.outerHTML.slice(0,200)));
      }), [], 'Todos os campos da página, diálogos e bancada têm id ou name');
    async function choose(button, names) {
      await page.locator(button).click();
      const dialog = page.locator('dialog.ea-storage-dialog');
      await dialog.locator('.ea-storage-tree-open', {hasText:'Bases geoespaciais'}).click();
      await assertNamedFields();
      for (const name of names) await dialog.locator(`[data-file="${files.find(f => f.nome === name).id}"]`).click();
      const reads = [inventories.length, preparations.length], started = Date.now();
      await dialog.getByRole('button', {name:/^Confirmar/}).click();
      await dialog.waitFor({state:'detached'});
      await page.waitForFunction(() => !document.querySelector('#ev-restricao-browse').disabled);
      selectionTimes.push(Date.now()-started);
      assert.deepEqual([inventories.length, preparations.length], reads, 'Confirmar só transfere referências: zero inventários e zero preparações');
      assert(selectionTimes.at(-1) < 1500, 'Confirmar transfere a seleção em menos de 1,5 s');
    }
    async function preview(papel) {
      const before = await panel();
      const alvo = papel === 'entrada' && await page.locator('#ev-hier-enviar').isEnabled() ? 'hier' : papel;
      assert.match(await page.locator(`#ev-${alvo}-enviar`).getAttribute('aria-label'), /para a prévia$/);
      await page.locator(`#ev-${alvo}-enviar`).click();
      await page.waitForFunction(() => !document.querySelector('#ev-restricao-browse').disabled);
      assert.deepEqual(await panel(), before, 'Enviar para prévia nunca altera bancada');
      await assertNamedFields();
    }
    async function send(papel, cancel=false) {
      if (papel) await preview(papel);
      await page.locator('#ea-staging-confirmar').click();
      await page.locator(cancel ? '#pfsConfirmCancel' : '#pfsConfirmOk').click();
      await page.waitForFunction(() => !document.querySelector('#ev-restricao-browse').disabled);
    }
    assert.equal(await page.getByLabel('Camada de entrada', {exact:true}).getAttribute('placeholder'), 'Selecione as camadas de entrada.');
    assert.equal(await page.getByLabel('Hierarquizações:', {exact:true}).locator('option').first().textContent(), 'Selecione uma hierarquização');
    assert.equal(await page.locator('#ev-entrada-title').evaluate(title => title.closest('section').querySelectorAll('section').length), 0, 'Entrada sem subcontainers 1.1 e 1.2');
    assert.equal(await page.locator('.ev-ou').textContent(), 'ou');
    assert.equal(await page.locator('.ev-ou').evaluate(el => getComputedStyle(el).textAlign), 'center');
    for (const papel of ['entrada','restricao','risco']) {
      const button = page.locator(`#ev-${papel}-browse`);
      assert.equal(await button.getAttribute('title'), 'Adicionar camada');
      assert.match(await button.getAttribute('aria-label'), /^Adicionar camada de /);
      assert.equal(await button.locator('svg.ev-layer-add-icon .ev-layer-add-plus').count(), 1, 'Ícone combina geometria de camadas e sinal de mais');
      assert.equal(await button.locator('.fa-folder-open').count(), 0, 'Adicionar camada não usa mais o ícone de pasta');
    }
    assert.equal(await page.locator('#ev-risco-browse').isDisabled(), true);
    await choose('#ev-entrada-browse', ['entrada']);
    assert.equal(await page.locator('#ea-input-preview').isHidden(), true, 'Selecionar não envia automaticamente para prévia');
    assert.equal(await page.locator('.ev-preparacao-grid [aria-label*="bancada"]').count(), 0, 'Seções 1 e 2 não enviam à bancada');
    assert.equal(await page.locator('#ea-input-preview .ea-preview-panel > footer #ea-staging-confirmar').count(), 1, 'Envio à bancada está no rodapé do painel de camadas');
    assert.equal(await page.locator('#ev-entrada-camadas').inputValue(), 'entrada');
    assert.equal(await page.locator('#ev-hierarquizacao').isDisabled(), true, 'Camadas bloqueiam a outra origem');
    await page.locator('#ev-hierarquizacao').evaluate(el => {el.value='HIER-TESTE'; el.dispatchEvent(new Event('change'));});
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.equal(await page.locator('#ev-hierarquizacao').inputValue(), '', 'Tentativa de misturar origens é rejeitada');
    assert.equal(await page.locator('#ev-entrada-camadas').inputValue(), 'entrada');
    assert.equal((await panel()).length, 0, 'Prévia não envia automaticamente');
    await send('entrada', true);
    assert.equal((await panel()).length, 0, 'Cancelar preserva a bancada');
    await send('entrada');
    assert.deepEqual(await panel(), [inputIds[0]]);
    await choose('#ev-restricao-browse', ['restricao-a','restricao-b']);
    assert.deepEqual(await panel(), [inputIds[0]], 'Selecionar restrição não altera bancada');
    assert.equal(await page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true}).count(), 0, 'Restrição selecionada ainda não está na prévia');
    const trash = page.locator('#ev-restricao-lista .ev-remove-layer').first();
    const trashStyle = () => trash.evaluate(el => {
      const css = getComputedStyle(el);
      return {width:css.width,height:css.height,border:css.borderTopWidth,
        background:css.backgroundColor,shadow:css.boxShadow,
        rowHeight:el.closest('li').getBoundingClientRect().height};
    });
    const compactTrash = {width:'24px',height:'24px',border:'0px',
      background:'rgba(0, 0, 0, 0)',shadow:'none',rowHeight:28};
    assert.deepEqual(await trashStyle(), compactTrash, 'Lixeira sem caixa e linha compacta');
    assert.equal(await trash.locator('i.fa-trash-can').count(), 1);
    assert.match(await trash.getAttribute('aria-label'), /Remover restricao-a/);
    await trash.hover();
    await page.waitForTimeout(200);
    assert.deepEqual(await trashStyle(), compactTrash, 'Hover não recria caixa nem sombra');
    await trash.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await trash.evaluate(el => document.activeElement === el), true);
    assert.equal(await trash.evaluate(el => getComputedStyle(el).outlineStyle !== 'none'), true, 'Foco de teclado preservado');
    await page.mouse.move(0,0);
    if (process.env.SICARD_TEST_COMPACT_SCREENSHOT) {
      await page.setViewportSize({width:1000,height:1000});
      await page.locator('.ev-preparacao-grid').screenshot({path:process.env.SICARD_TEST_COMPACT_SCREENSHOT});
      await page.setViewportSize({width:1440,height:1000});
    }
    await preview('restricao');
    const visibility = page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true});
    await visibility.uncheck();
    await send();
    assert.deepEqual(new Set(await panel()), new Set([inputIds[0],inputIds[1]]), 'Somente camadas marcadas');
    const entryVisible = page.getByRole('checkbox', {name:'Visibilidade no mapa: entrada',exact:true});
    const restrictionVisible = page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-a',exact:true});
    await entryVisible.uncheck();
    await restrictionVisible.uncheck();
    assert.equal(await page.locator('#ea-staging-confirmar').isDisabled(), true, 'Sem camadas marcadas não há envio à bancada');
    assert.deepEqual(new Set(await panel()), new Set([inputIds[0],inputIds[1]]), 'Desmarcar não altera bancada sem confirmação');
    await entryVisible.check();
    await restrictionVisible.check();
    await visibility.check();
    await send();
    assert.deepEqual(new Set(await panel()), new Set([inputIds[0],inputIds[1],inputIds[2]]));
    await visibility.uncheck();
    await send(undefined, true);
    assert.equal((await panel()).includes(inputIds[2]), true, 'Cancelar preserva camada agora desmarcada');
    await send();
    assert.equal((await panel()).includes(inputIds[2]), false, 'Envio único retira camadas desmarcadas do conjunto anterior');
    await page.locator('#ev-restricao-salvar').click();
    await page.locator('#pfsConfirmInput').fill('Lista restrição');
    await page.locator('#pfsConfirmOk').click();
    await page.waitForFunction(() => !document.querySelector('#ev-restricao-browse').disabled);
    assert.deepEqual(saved.get('elegibilidade-restricao').categorias[0].camadas, [inputIds[1],inputIds[2]]);
    await choose('#ev-risco-browse', ['risco']);
    await send('risco');
    const before = await panel();
    await page.locator('#ev-entrada-limpar').click();
    assert.equal(await page.locator('#ev-entrada-camadas').inputValue(), '');
    assert.equal(await page.locator('#ev-hierarquizacao').isDisabled(), false);
    assert.deepEqual(await panel(), before, 'Limpar a prévia não altera entrada já confirmada');
    await page.selectOption('#ev-hierarquizacao', 'HIER-TESTE');
    await page.waitForFunction(() => document.querySelector('#ev-hier-detalhes').hidden === false);
    assert.equal(await page.locator('#ev-coluna-hierarquizacao #ev-hier-lista li').count(), 2, 'Demandas ficam abaixo da coluna Hierarquizações');
    assert.equal(await page.locator('#ev-coluna-camadas #ev-entrada-lista li').count(), 0, 'Hierarquização não aparece na coluna de camadas');
    assert.equal(await page.locator('#ev-entrada-enviar').isDisabled(), true);
    assert.equal(await page.locator('#ev-hier-enviar').isEnabled(), true);
    assert.equal(await page.locator('#ev-entrada-browse').isDisabled(), true, 'Hierarquização bloqueia o explorador');
    assert.equal(await page.locator('#ev-entrada-camadas').inputValue(), '');
    assert.deepEqual(await panel(), before, 'Hierarquização permanece só na prévia');
    assert.match(await page.locator('#ev-hier-dados').textContent(), /"teste": 42/);
    await send('entrada');
    const actualGeometry = await page.locator('iframe').evaluate(f =>
      ['D-0','D-1'].map(c => f.contentWindow.gpApp.state.map.getSource(`cadastro:projeto:${c}`)._data.features[0].geometry));
    assert.deepEqual(actualGeometry, geometries, 'Linhas e polígonos não viram pontos');
    assert.equal((await panel()).includes(inputIds[0]), false, 'Novo envio substitui entrada anterior');
    missingGeometry = true;
    await page.selectOption('#ev-hierarquizacao', 'HIER-TESTE');
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.match(await page.locator('#ev-status').textContent(), /não possui geometria cadastrada/);
    assert.equal(await page.locator('#ev-hier-lista li').count(), 2, 'Falha mantém prévia anterior na coluna de hierarquização');
    missingGeometry = false;
    await page.getByRole('button', {name:'Remover D-0 — Demanda 0 da seleção de entrada',exact:true}).click();
    assert.equal(await page.locator('#ea-input-preview-layers [data-validation]').filter({hasText:'D-0 — Demanda 0'}).count(), 1, 'Remover da seleção não altera a prévia sem envio');
    assert.equal(await page.locator('#ev-hierarquizacao').inputValue(), 'HIER-TESTE', 'Remoção parcial mantém origem da hierarquização');
    assert.equal(await page.locator('#ev-entrada-browse').isDisabled(), true);
    await page.selectOption('#ev-hierarquizacao', '');
    assert.equal(await page.locator('#ev-entrada-lista button').count(), 0, 'Desmarcar hierarquização limpa suas geometrias da prévia');
    assert.equal(await page.locator('#ev-entrada-browse').isDisabled(), false);
    await choose('#ev-entrada-browse', ['entrada']);
    await send('entrada');
    assert.deepEqual(new Set(await panel()), new Set([inputIds[0],inputIds[1],inputIds[3]]), 'Troca de hierarquização para camadas também não mistura origens na bancada');
    // Carregar uma lista conflitante deve ser bloqueado mesmo sem o explorador.
    saved.set('elegibilidade-risco', {nome:'Conflito',escopo:'elegibilidade-risco',categorias:[{id:'risco',camadas:[inputIds[1]]}]});
    await page.locator('#ev-risco-carregar').click();
    await page.locator('.ea-config-entry').click();
    await page.locator('dialog.ea-config-dialog').getByRole('button', {name:/Abrir|Carregar/}).last().click();
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.match(await page.locator('#ev-status').textContent(), /já é restrição/);
    assert.equal(await page.locator('#ev-risco-lista').textContent(), 'riscoRemover');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('#ev-hierarquizacao')?.options.length === 2);
    await page.locator('#ev-restricao-carregar').click();
    await assertNamedFields();
    await page.locator('.ea-config-entry').click();
    await page.locator('dialog.ea-config-dialog').getByRole('button', {name:/Abrir|Carregar/}).last().click();
    await page.waitForFunction(() => document.querySelectorAll('#ev-restricao-lista button').length === 2);
    assert.equal((await panel()).length, 0, 'Lista salva volta apenas à seleção após recarregar a página');
    assert.equal(await page.locator('#ea-input-preview').isHidden(), true, 'Lista carregada aguarda envio explícito à prévia');
    await preview('restricao');
    failLayer = inputIds[1];
    await page.locator('#ev-restricao-enviar').click();
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.equal(await page.locator('#ev-restricao-lista button').count(), 2, 'Falha de validação na prévia preserva seleção');
    assert.equal(await page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true}).count(), 1, 'Falha de validação mantém prévia anterior');
    failLayer = '';
    await preview('restricao');
    await page.getByRole('button', {name:'Remover restricao-b da seleção de restrição',exact:true}).click();
    assert.equal(await page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true}).count(), 1, 'Remover seleção mantém prévia até o próximo envio');
    await preview('restricao');
    assert.equal(await page.getByRole('checkbox', {name:'Visibilidade no mapa: restricao-b',exact:true}).count(), 0, 'Novo envio à prévia aplica a remoção');
    await choose('#ev-entrada-browse', ['pacote']);
    assert.equal(await page.locator('#ev-entrada-lista button').count(), 1, 'Arquivo multicamadas é selecionado sem inventário');
    saved.set('elegibilidade-risco', {nome:'Conflito componente',escopo:'elegibilidade-risco',
      categorias:[{id:'risco',camadas:[packageLayers[0].id]}]});
    await page.locator('#ev-risco-carregar').click();
    await assertNamedFields();
    await page.locator('.ea-config-entry').click();
    await page.locator('dialog.ea-config-dialog').getByRole('button', {name:/Abrir|Carregar/}).last().click();
    await page.waitForFunction(() => document.querySelector('#ev-status').dataset.error === 'true');
    assert.match(await page.locator('#ev-status').textContent(), /já é entrada/, 'Componente não pode receber outro papel enquanto o arquivo inteiro é entrada');
    const beforePackage = preparations.length;
    await preview('entrada');
    assert.deepEqual(preparations.slice(beforePackage), packageLayers.map(l => l.id), 'Componentes são identificados e validados apenas ao enviar para prévia');
    assert.equal(await page.locator('#ea-input-preview-layers [data-validation]').count(), 3);
    for (const width of [390,768,1025,1440]) {
      await page.setViewportSize({width,height:1000});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Sem transbordamento em ${width}px`);
      assert.equal(await page.locator('#ea-staging-actions').evaluate(footer => {
        const f=footer.getBoundingClientRect(), p=footer.parentElement.getBoundingClientRect();
        return f.left >= p.left && f.right <= p.right && Math.abs(f.bottom-p.bottom) <= 2;
      }), true, 'Envio à bancada no rodapé do painel de camadas');
      for (const papel of ['entrada','restricao','risco']) {
        const positions = await page.evaluate(papel => {
          const input = document.getElementById(`ev-${papel}-camadas`);
          const button = document.getElementById(`ev-${papel}-browse`);
          const r = input.getBoundingClientRect(), b = button.getBoundingClientRect();
          const actions = input.closest('.ea-field').querySelector('.ev-field-actions');
          const buttons = [...actions.children].map(el => el.getBoundingClientRect());
          return {
            inside:b.x >= r.x && b.right <= r.right && b.y >= r.y && b.bottom <= r.bottom,
            inputHeight:r.height,
            buttonWidth:b.width,
            buttonHeight:b.height,
            actionsOutside:!input.parentElement.contains(actions),
            below:buttons.every(rect => rect.y >= r.bottom),
            offset:Math.abs((buttons[0].x + buttons.at(-1).right)/2 - (r.x + r.right)/2),
            count:buttons.length,
          };
        }, papel);
        assert(positions.inside, `Adicionar ${papel} fica dentro do campo em ${width}px`);
        assert.equal(positions.inputHeight, 36, 'Campo compacto');
        assert.equal(positions.buttonWidth, 28);
        assert.equal(positions.buttonHeight, 28);
        assert(positions.actionsOutside && positions.below, 'Ações ficam abaixo e fora do contorno do input');
        assert(positions.offset < 2, 'Ações centralizadas na largura do input');
        assert.equal(positions.count, papel === 'entrada' ? 2 : 3);
      }
      const hierActions = await page.locator('#ev-coluna-hierarquizacao').evaluate(coluna => {
        const input = coluna.querySelector('select').getBoundingClientRect();
        const actions = [...coluna.querySelector('.ev-field-actions').children].map(el => el.getBoundingClientRect());
        return {
          below:actions.every(r => r.y >= input.bottom),
          offset:Math.abs((actions[0].x + actions.at(-1).right)/2 - (input.x + input.right)/2),
        };
      });
      assert(hierActions.below && hierActions.offset < 2, 'Ações da hierarquização abaixo e centralizadas na própria coluna');
      if (width > 540) {
        const layout = await page.evaluate(() => {
          const box = selector => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return {x:r.x,y:r.y,right:r.right,width:r.width};
          };
          return {
            campos:['#ev-entrada-camadas','#ev-hierarquizacao'].map(box),
            grupos:[...document.querySelectorAll('.ev-bases-grupo')].map(el => {
              const r = el.getBoundingClientRect();
              return {x:r.x,y:r.y,right:r.right};
            }),
            legendas:[...document.querySelectorAll('.ev-bases-grupo > label')].map(el => getComputedStyle(el).backgroundColor),
            barras:document.querySelectorAll('.ev-bases-grupo .ahp-subsection-title').length,
          };
        });
        assert(Math.abs(layout.campos[0].y - layout.campos[1].y) < 2, `Campos de entrada na mesma linha em ${width}px`);
        assert(layout.campos[1].x > layout.campos[0].right, 'Campos em colunas distintas');
        assert(Math.abs(layout.grupos[0].y - layout.grupos[1].y) < 2, `Restrição e risco lado a lado em ${width}px`);
        assert(layout.grupos[1].x > layout.grupos[0].right, 'Grupos sem sobreposição');
        assert.deepEqual(layout.legendas, ['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)'], 'Legendas sem barras coloridas');
        assert.equal(layout.barras, 0, 'Sem cabeçalhos de card nos grupos de restrição e risco');
      }
      if (width === 1440) {
        const boxes = await page.evaluate(() => ['ev-entrada-title','ev-bases-title'].map(id => {
          const box = document.getElementById(id).closest('section').getBoundingClientRect();
          return {x:box.x,y:box.y,right:box.right,width:box.width};
        }));
        assert(Math.abs(boxes[0].y - boxes[1].y) < 2, 'Seções Entrada e Restrição/Risco alinhadas lado a lado');
        assert(boxes[1].x >= boxes[0].right, 'Seções principais não se sobrepõem');
      }
    }
    if (process.env.SICARD_TEST_SCREENSHOT) {
      await page.evaluate(() => window.Notify.clearAll());
      await page.screenshot({path:process.env.SICARD_TEST_SCREENSHOT,fullPage:true});
    }
    assert.equal(writes.some(path => /hierarquizacoes.*(?:executar|fases)/.test(path)), false, 'Nenhum cálculo legado');
    assert.deepEqual(errors, [], 'Sem erros JavaScript');
    const buttonStyle = selector => page.locator(selector).evaluate(el => {
      const css = getComputedStyle(el);
      return Object.fromEntries(['width','height','borderRadius','fontFamily','fontSize','fontWeight',
        'color','backgroundColor','borderTopColor','borderTopWidth','paddingTop','paddingLeft'].map(key => [key,css[key]]));
    });
    await page.mouse.move(0,0);
    const normal = await buttonStyle('#ev-entrada-browse');
    const primary = await buttonStyle('#ev-restricao-enviar');
    assert.equal(normal.width, '28px');
    assert.equal(normal.height, '28px');
    assert.equal(primary.width, '28px');
    assert.equal(primary.height, '28px');
    assert.equal(normal.fontSize, '12px');
    const buttonSkin = ({width,height,fontSize,borderRadius,...skin}) => skin;
    await page.locator('#ev-entrada-browse').hover();
    await page.waitForTimeout(200);
    const hovered = await buttonStyle('#ev-entrada-browse');
    const workbenchStyle = () => page.evaluate(() => {
      const keys = ['backgroundColor','color','fontFamily','fontSize','fontWeight','borderRadius',
        'borderTopWidth','borderTopColor','paddingTop','paddingRight','paddingBottom','paddingLeft'];
      const style = el => {
        const css = getComputedStyle(el);
        return Object.fromEntries(keys.map(key => [key,css[key]]));
      };
      const frame = document.getElementById('ea-workbench-frame');
      return {
        source:frame.getAttribute('src'),
        section:style(document.getElementById('ea-workbench')),
        header:style(document.querySelector('#ea-workbench > header')),
        title:style(document.querySelector('#ea-workbench > header h2')),
        number:style(document.querySelector('#ea-workbench .ea-number')),
        frame:style(frame),
        frameHeight:frame.getBoundingClientRect().height,
        inset:frame.getBoundingClientRect().left - document.getElementById('ea-workbench').getBoundingClientRect().left,
        interior:['.gp-titlebar','.gp-ribbon','.gp-ribbon-tabs button','.gp-left-rail','.gp-statusbar']
          .map(selector => style(frame.contentDocument.querySelector(selector))),
        stylesheets:[...frame.contentDocument.querySelectorAll('link[rel=stylesheet]')].map(link => link.href),
      };
    });
    const workbench = await workbenchStyle();
    await page.goto(`${base}/restrict/geoespacial/extracao-atributos/`, {waitUntil:'networkidle'});
    await page.waitForFunction(() => document.querySelector('#ea-workbench-frame').contentDocument.body.classList.contains('ea-embedded-workbench'));
    assert.deepEqual(await workbenchStyle(), workbench, 'Bancada usa o mesmo visual, documento e dimensões verticais do extrator');
    assert.deepEqual(buttonSkin(await buttonStyle('#ea-input-browse')), buttonSkin(normal), 'Botão menor preserva cores e tipografia da referência');
    assert.deepEqual(buttonSkin(await buttonStyle('#ea-identificacao-confirmar')), buttonSkin(primary), 'Botão primário menor preserva a referência');
    await page.locator('#ea-input-browse').hover();
    await page.waitForTimeout(200);
    assert.deepEqual(buttonSkin(await buttonStyle('#ea-input-browse')), buttonSkin(hovered), 'Hover preserva cores da referência');
    const defaultReads = [inventories.length, preparations.length];
    await page.locator('#ea-input-browse').click();
    const defaultExplorer = page.locator('dialog.ea-storage-dialog');
    await defaultExplorer.locator('.ea-storage-tree-open', {hasText:'Bases geoespaciais'}).click();
    await defaultExplorer.locator(`[data-file="${inputIds[0]}"]`).click();
    await defaultExplorer.locator('.ea-storage-confirm-button').click();
    await defaultExplorer.locator('#pfsConfirmCancel').click();
    assert.deepEqual([inventories.length, preparations.length], defaultReads, 'Extrator mantém confirmação antes da leitura');
    await defaultExplorer.locator('.ea-storage-confirm-button').click();
    await defaultExplorer.locator('#pfsConfirmOk').click();
    await defaultExplorer.waitFor({state:'detached'});
    assert.deepEqual([inventories.length, preparations.length], defaultReads.map(n => n+1), 'Fluxo padrão do extrator continua identificando e validando no seu próprio momento');
    console.log('PASS: seleção -> prévia -> bancada, envio único no rodapé, cancelamento, origens exclusivas, listas, conflitos, geometrias completas e responsividade.');
    console.log(`Confirmar: máximo ${Math.max(...selectionTimes)} ms; nenhuma chamada de inventário/preparação. Campos identificados: OK.`);
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
