const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const base = process.env.SICARD_BASE_URL || 'http://127.0.0.1:8083';
const credentials = fs.readFileSync('credencias_sigma_agentes.txt', 'utf8');
function credential(label) {
  const found = credentials.match(new RegExp('^' + label + '\\s*[:=]\\s*(.+)$', 'mi'));
  if (!found) throw new Error('Campo de credencial local indisponível.');
  return found[1].trim();
}
const fixture = index => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  demanda_tipo: ['projeto', 'programa', 'plano'][index % 3], demanda_codigo: `D${index}`,
  demanda_nome: `Demanda sintética ${index}`, status: index === 1 ? 'atendida' : 'registrada',
  categorias: index === 35 ? ['atributos_objeto'] : ['dados_cadastrais', 'geometria'],
  descricao: 'Motivo público', parecer_tecnico: 'Análise interna sintética', mensagem_gestor: 'Corrigir os campos indicados.',
  hierarquizacao_codigo: index === 35 ? 'H-TESTE' : null,
  solicitado_nome: 'Responsável de teste', solicitado_em: '2026-10-29T10:00:00Z',
  demanda_solicitante: 'Solicitante do cadastro', demanda_solicitado_em: '2026-09-10T10:00:00Z',
  representante_email: 'representante@example.org',
  demanda_status_nome: 'Em hierarquização',
  origem: 'analise', revisao: 0, categorias_salvas: {}, notificacao: {},
  tem_parecer_pdf: true, parecer_pdf_url: '/api/analise/D' + index + '/parecer.pdf',
  pode_consultar_confirmacoes: true, cumprimento_status: index === 1 ? 'cumprida' : 'nao_iniciada',
  pode_editar: index !== 1, historico_edicoes: [], cadastro_disponivel: true,
});
const data = Array.from({ length: 36 }, (_, i) => fixture(i));
let sends = 0;
const errors = [];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/public/login/?next=%2Frestrict%2Fcentral-pendencias%2F');
    await page.locator('input[name=login]').fill(credential('Username'));
    await page.locator('input[name=senha]').fill(credential('Senha inicial'));
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForURL('**/restrict/**');
    await page.goto(base + '/restrict/analise-multicriterio/central-julgamentos');
    const computed = locator => locator.evaluate(e => {
      const style = getComputedStyle(e);
      return { font: style.font, background: style.backgroundColor, padding: style.padding, height: style.height };
    });
    const reference = await computed(page.locator('.admin-filter-bar').first());
    const tableStyle = locator => locator.evaluate(e => {
      const style = getComputedStyle(e);
      return { font: style.font, background: style.backgroundColor, padding: style.padding, textAlign: style.textAlign };
    });
    const headerReference = await tableStyle(page.locator('.admin-table th').nth(1));
    const buttonSize = locator => locator.evaluate(e => {
      const style = getComputedStyle(e);
      return { width: style.width, height: style.height, borderRadius: style.borderRadius };
    });
    const controlReference = await buttonSize(page.locator('.standard-table-actions .admin-icon-btn').first());
    await page.route('**/api/complementacao/solicitacoes**', async route => {
      const url = new URL(route.request().url()), parts = url.pathname.split('/');
      let response = data;
      if (parts[4] === 'contexto') {
        response = data.find(r => !r.id && r.demanda_codigo === url.searchParams.get('codigo')
          && r.demanda_tipo === url.searchParams.get('tipo')
          && r.hierarquizacao_codigo === url.searchParams.get('hierarquizacao_codigo'));
        assert(response);
      } else if (parts[4]) {
        const row = data.find(r => r.id === parts[4]);
        assert(row);
        if (route.request().method() === 'PATCH') {
          const before = { revisao: row.revisao, valores: { parecer_tecnico: row.parecer_tecnico } };
          Object.assign(row, route.request().postDataJSON(), { revisao: row.revisao + 1 });
          row.historico_edicoes.push(before);
        }
        if (parts[5] === 'previsualizacao') {
          response = { texto: row.categorias.includes('atributos_objeto') ? row.mensagem_gestor : 'Mensagem do parecer da análise', destinatario: row.representante_email,
            assunto: 'Complementação', anexo_nome: 'parecer.pdf', anexo_sha256: 'a'.repeat(64), assinatura: 'b'.repeat(64) };
          if (!row.categorias.includes('atributos_objeto')) response.parecer_revisao = {
            atualizado: true, revisado: Boolean(row.parecer_revisado), pdf_sha256: 'a'.repeat(64), numero: 1 };
        } else if (parts[5] === 'parecer' && parts[6] === 'revisar') {
          assert.equal(route.request().postDataJSON().confirmado, true);
          row.parecer_revisado = true;
          response = { atualizado: true, revisado: true };
        } else if (parts[5] === 'notificar') {
          assert.equal(route.request().postDataJSON().assinatura, 'b'.repeat(64));
          sends++;
          row.notificacao = { status: 'aceito_smtp', detalhe: 'Aceito em teste, sem envio real.',
            por_nome: 'Gestor do envio', enviado_em: '2026-10-29T15:00:00Z', destinatario: 'destino@example.org' };
          response = row.notificacao;
        } else if (parts[5] === 'confirmacoes') {
          row.notificacao.entrega_status = 'confirmada';
          row.notificacao.leitura_status = 'confirmada';
          response = { solicitacao: row, relatorios_consultados: 1 };
        } else response = row;
      } else if (route.request().method() === 'POST') {
        const content = route.request().postDataJSON();
        const row = data.find(r => !r.id && r.demanda_codigo === content.demanda_codigo
          && r.demanda_tipo === content.demanda_tipo && r.hierarquizacao_codigo === content.hierarquizacao_codigo);
        assert(row);
        Object.assign(row, content, { id: fixture(37).id, status: 'registrada', revisao: 1 });
        response = row;
      }
      await route.fulfill({ json: response });
    });
    await page.goto(base + '/restrict/central-pendencias/');
    await page.waitForFunction(() => document.getElementById('pendencias-cadastro-count').textContent.includes('35 no total'));
    assert.deepEqual(await computed(page.locator('.admin-filter-bar').first()), reference);
    assert.deepEqual(await tableStyle(page.locator('#pendencias-cadastro th').nth(1)), headerReference);
    assert.deepEqual(await buttonSize(page.locator('#pendencias-cadastro [data-open]')), controlReference);
    assert.equal(await page.locator('#pendencias-cadastro tbody tr').count(), 15);
    assert.equal(await page.locator('#pendencias-atributos tbody tr').count(), 1);
    const headerTexts = key => page.locator(`#pendencias-${key} th`).allTextContents();
    assert(!(await headerTexts('cadastro')).includes('Atributos pendentes'));
    assert(!(await headerTexts('cadastro')).includes('Hierarquização'));
    assert((await headerTexts('atributos')).includes('Atributos pendentes'));
    assert((await headerTexts('atributos')).includes('Hierarquização'));
    for (const key of ['cadastro', 'atributos']) {
      for (const title of ['Solicitante da demanda', 'E-mail do representante', 'Cadastro solicitado em', 'Notificado por', 'Notificado em',
        'Destinatário', 'Entrega do e-mail', 'Abertura do e-mail', 'Parecer técnico (PDF)', 'Cumprimento da pendência']) {
        assert((await headerTexts(key)).includes(title));
      }
      assert.equal(await page.locator(`#pendencias-${key} tbody tr`).first().locator('td').count(), (await headerTexts(key)).length);
      assert(!(await headerTexts(key)).includes('Notificado'));
      assert(!(await headerTexts(key)).includes('Situação da pendência'));
      assert.equal((await headerTexts(key)).filter(t => t === 'Status da notificação').length, 1);
      assert.equal(await page.locator(`#pendencias-${key} th:not([hidden])`).count(), 7);
      assert.equal(await page.locator(`#pendencias-${key} .admin-filter-bar [data-column-group]`).count(), 4);
      assert.equal(await page.locator(`#pendencias-${key} .standard-table-actions [data-column-group]`).count(), 0);
      assert.equal(await page.locator(`#pendencias-${key} .admin-filter-bar [role=separator]`).count(), 1);
      const filterButtonStyle = locator => locator.evaluate(e => {
        const s = getComputedStyle(e);
        return { width: s.width, height: s.height, borderRadius: s.borderRadius, border: s.border,
          background: s.backgroundColor, color: s.color, font: s.font, padding: s.padding };
      });
      const filterStyle = await filterButtonStyle(page.locator(`#pendencias-${key}-filtro-limpar`));
      for (const button of await page.locator(`#pendencias-${key} [data-column-group]`).all()) {
        assert.deepEqual(await filterButtonStyle(button), filterStyle);
      }
      assert((await page.locator(`#pendencias-${key} tbody tr`).first().innerText()).includes('Não enviado'));
      for (const [group, title] of [['contexto', 'Tipo'], ['envio', 'Destinatário'],
        ['confirmacoes', 'Entrega do e-mail'], ['cumprimento', 'Parecer técnico (PDF)']]) {
        const toggle = page.locator(`#pendencias-${key} [data-column-group=${group}]`);
        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
        assert((await page.locator(`#pendencias-${key} th:not([hidden])`).allTextContents()).includes(title));
        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
        assert.equal(await page.locator(`#pendencias-${key} th:not([hidden])`).count(), 7);
      }
    }
    assert((await page.locator('#pendencias-cadastro tbody tr').first().innerText()).includes('Solicitante do cadastro'));
    assert(!(await page.locator('#pendencias-cadastro tbody tr').first().innerText()).includes('Responsável de teste'));
    assert.equal(await page.locator('#pendencias-cadastro-filtro-coluna option[value=pendencias_atributos]').count(), 0);
    assert.equal(await page.locator('#pendencias-cadastro-filtro-coluna option[value=hierarquizacao_codigo]').count(), 0);
    await page.locator('#pendencias-cadastro [data-select-all]').check();
    assert.match(await page.locator('#pendencias-cadastro-count').innerText(), /^15 selecionados/);
    await page.evaluate(() => {
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = blob => { blob.text().then(text => { window.exportCsv = text; }); return create(blob); };
      document.addEventListener('click', event => { if (event.target.closest('a[download]')) event.preventDefault(); }, true);
    });
    await page.locator('#pendencias-cadastro [data-export]').click();
    await page.waitForFunction(() => Boolean(window.exportCsv));
    const csv = await page.evaluate(() => window.exportCsv);
    assert(csv.includes('Demanda sintética'));
    assert(!csv.includes('Análise interna sintética'));
    await page.locator('#pendencias-cadastro-pagination').getByRole('button', { name: 'Próxima página', exact: true }).click();
    assert.match(await page.locator('#pendencias-cadastro-pagination').innerText(), /Página 2 de 3/);
    await page.locator('#pendencias-cadastro-filtro-coluna').selectOption('demanda_tipo');
    await page.locator('#pendencias-cadastro-filtro-valor').selectOption('plano');
    assert.match(await page.locator('#pendencias-cadastro-count').innerText(), /11 no total/);
    await page.locator('#pendencias-cadastro-filtro-inverter').click();
    assert.match(await page.locator('#pendencias-cadastro-count').innerText(), /24 no total/);
    await page.locator('#pendencias-cadastro-filtro-limpar').click();
    await page.locator('#pendencias-cadastro-filtro-coluna').selectOption('notificado_por');
    await page.locator('#pendencias-cadastro-filtro-valor').selectOption('__empty__');
    assert.match(await page.locator('#pendencias-cadastro-count').innerText(), /35 no total/);
    await page.locator('#pendencias-cadastro-filtro-limpar').click();
    await page.locator('#pendencias-cadastro tbody input[type=checkbox]').first().check();
    await page.locator('#pendencias-cadastro [data-preview]').click();
    await page.locator('#pendencias-cadastro-previa').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#pendencias-cadastro-previa [data-preview-text]').innerText(), 'Mensagem do parecer da análise');
    assert.equal(await page.locator('#pendencias-cadastro-previa textarea').count(), 0);
    assert.equal(await page.locator('#pendencias-cadastro-previa [data-preview-text] p').count(), 1);
    assert.equal(sends, 0);
    await page.locator('#pendencias-cadastro-previa [data-close]').click();
    await page.locator('#pendencias-cadastro-filtro-limpar').click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('#pendencias-cadastro .admin-filter-bar').isVisible(), true);
    assert.equal(await page.locator('#pendencias-cadastro-pagination').isVisible(), true);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('#pendencias-cadastro tbody a').first().click();
    await page.waitForFunction(() => document.getElementById('solicitacao-descricao')?.value === 'Motivo público');
    assert.equal(await page.locator('#solicitacao-form').isVisible(), false);
    await page.locator('#solicitacao-previa').waitFor({ state: 'visible' });
    assert.equal(sends, 0);
    assert.equal(await page.locator('#solicitacao-previa [data-send]').isDisabled(), true);
    await page.locator('#solicitacao-previa [data-review-check]').check();
    await page.locator('#solicitacao-previa [data-review-confirm]').click();
    await page.waitForFunction(() => document.getElementById('pendencias-feedback').textContent.includes('Revisão registrada'));
    assert.equal(sends, 0);
    await page.locator('#solicitacao-previa [data-send]').click();
    await page.waitForFunction(() => document.getElementById('pendencias-feedback').textContent.includes('aceito_smtp'));
    await page.locator('#pfsSuccessClose').click();
    assert.equal(sends, 1);
    assert.equal(await page.locator('#solicitacao-notificar').isDisabled(), true);
    assert.equal(sends, 1);
    await page.goto(base + '/restrict/solicitacao-complementacao/?id=' + data[1].id);
    await page.waitForFunction(() => document.getElementById('pendencias-feedback').textContent.includes('somente leitura'));
    assert.equal(await page.locator('#solicitacao-salvar').isDisabled(), true);
    data.push({ ...fixture(36), id: null, status: 'nao_solicitada',
      categorias: ['atributos_objeto'], hierarquizacao_codigo: 'H-PENDENTE',
      descricao: '', mensagem_gestor: '', parecer_tecnico: '', pendencias_atributos: ['custo'],
      hierarquizacao_nome: 'Carteira de investimentos',
      pendencias_detalhadas: [{ codigo: 'custo', nome: 'Custo estimado (R$)', unidade: 'R$',
        grupo: 'Atributos da demanda', descricao: 'Investimento necessário' }],
      pode_criar: true, pode_editar: true });
    await page.goto(base + '/restrict/central-pendencias/');
    await page.waitForFunction(() => document.getElementById('pendencias-atributos-count').textContent.includes('2 no total'));
    const pending = page.locator('#pendencias-atributos tbody tr').filter({ hasText: 'D36' });
    await pending.locator('input[type=checkbox]').check();
    assert.match(await page.locator('#pendencias-atributos-count').innerText(), /^1 selecionados/);
    await page.locator('#pendencias-atributos [data-open]').click();
    await page.waitForFunction(() => document.getElementById('pendencias-feedback').textContent.includes('identificada automaticamente'));
    assert.match(page.url(), /tipo=projeto/);
    assert.equal(await page.locator('#solicitacao-titulo').innerText(), 'Solicitar complementação de atributos');
    assert((await page.locator('#solicitacao-pendencias-lista').innerText()).includes('Custo estimado'));
    assert.equal(await page.locator('#solicitacao-pendencias-lista strong').innerText(), 'Custo estimado (R$)');
    assert((await page.locator('#solicitacao-contexto').innerText()).includes('Em hierarquização'));
    assert((await page.locator('#solicitacao-contexto').innerText()).includes('Carteira de investimentos'));
    assert.equal(await page.locator('#solicitacao-dados-tecnicos').isVisible(), false);
    assert.equal(await page.getByRole('button', { name: 'Salvar pedido', exact: true }).isVisible(), true);
    assert.equal(await page.locator('#solicitacao-notificar').isDisabled(), true);
    await page.locator('#solicitacao-descricao').fill('Preencher o custo pendente');
    await page.locator('#solicitacao-mensagem').fill('Mensagem externa sintética');
    await page.locator('#solicitacao-salvar').click();
    await page.waitForFunction(() => document.getElementById('pendencias-feedback').textContent.includes('Nenhum e-mail'));
    assert.match(page.url(), /\?id=/);
    assert.equal(data.at(-1).status, 'registrada');
    assert.equal(data.at(-1).mensagem_gestor, 'Mensagem externa sintética');
    assert.equal(sends, 1);
    assert.equal(await page.locator('#solicitacao-notificar').isDisabled(), false);
    data.at(-1).tem_parecer_pdf = false;
    await page.locator('#solicitacao-recarregar').click();
    await page.waitForFunction(() => document.getElementById('solicitacao-pdf-status').textContent.includes('não gerado'));
    assert.equal(await page.locator('#solicitacao-notificar').isDisabled(), true);
    await page.goto(base + '/restrict/central-pendencias/');
    await page.waitForFunction(() => document.getElementById('pendencias-atributos-count').textContent.includes('2 no total'));
    assert.equal(await page.locator('#pendencias-atributos tbody tr').filter({ hasText: 'D36' }).count(), 1);
    await page.locator('#pendencias-atributos tbody tr').filter({ hasText: 'D35' }).locator('input[type=checkbox]').check();
    await page.locator('#pendencias-atributos [data-preview]').click();
    await page.locator('#pendencias-atributos-previa').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#pendencias-atributos-previa [data-preview-text]').innerText(), data[35].mensagem_gestor);
    assert.equal(sends, 1);
    await page.locator('#pendencias-atributos-previa [data-send]').click();
    await page.waitForFunction(() => document.getElementById('pendencias-feedback').textContent.includes('aceito_smtp'));
    await page.locator('#pfsSuccessClose').click();
    assert.equal(sends, 2);
    assert((await page.locator('#pendencias-atributos tbody tr').filter({ hasText: 'D35' }).innerText()).includes('Aceito pelo SMTP'));
    assert.deepEqual(errors, []);
    console.log('Central: reference styles, filters, selection, CSV, pagination, responsive layout, editing, history, automatic pending candidates, creation without email and explicit notification verified with synthetic API responses. No real records or emails changed.');
  } finally { await browser.close(); }
})().catch(() => {
  // Avoid including browser state or login inputs in failure output.
  console.error('Central browser validation failed; credential and browser-state output suppressed.');
  process.exitCode = 1;
});
