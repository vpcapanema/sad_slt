(function (global) {
  function escapeHtml(value) {
    return global.SLTAdminLabels?.escapeHtml?.(value) ?? String(value ?? "");
  }

  function infoItem(label, value, { plainValue = false } = {}) {
    const valueClass = plainValue ? "admin-info-value admin-info-value--plain" : "admin-info-value";
    return `
      <div class="admin-info-field">
        <div class="admin-info-input">
          <span class="admin-info-label">${escapeHtml(label)}</span>
          <div class="${valueClass}">${value}</div>
        </div>
      </div>`;
  }

  function infoRow(columns, ...items) {
    const colClass =
      columns === 3 ? "admin-info-row admin-info-row--3" :
      columns === 2 ? "admin-info-row admin-info-row--2" :
      "admin-info-row admin-info-row--1";
    return `<div class="${colClass}">${items.join("")}</div>`;
  }

  function infoSubcard(title, content) {
    return `
      <div class="admin-info-subcard">
        <h3 class="admin-info-subcard-title">${escapeHtml(title)}</h3>
        ${content}
      </div>`;
  }

  /** Campos avulsos — uma linha inteira cada */
  function infoSingle(...items) {
    return items.map((item) => infoRow(1, item)).join("");
  }

  /**
   * Monta subcards Cadastro + Institucional e projeto + Representante legal + campos avulsos.
   * `fields` contém valores já renderizados (HTML seguro).
   */
  function buildProjectInfoFields(fields) {
    const f = fields;
    const representanteBlock = f.representanteLegal
      ? infoSubcard(
          "Representante Legal",
          `
          ${infoRow(1, infoItem("Nome Completo", f.representanteLegal.nome))}
          ${infoRow(
            2,
            infoItem("E-mail", f.representanteLegal.email, { plainValue: true }),
            infoItem("Telefone", f.representanteLegal.telefone, { plainValue: true })
          )}
        `
        )
      : "";

    return `
      ${infoSubcard(
        "Cadastro",
        `
        ${infoRow(2, infoItem("Nome do Projeto", f.nome), infoItem("Código", f.codigo))}
        ${infoRow(1, infoItem("Descrição", f.descricao))}
        ${infoRow(2, infoItem("Data de Cadastro", f.dataCadastro), infoItem("Status", f.status))}
      `
      )}
      ${infoSubcard(
        "Institucional e Projeto",
        `
        ${infoRow(
          2,
          infoItem("Instituição", f.instituicao, { plainValue: true }),
          infoItem("CNPJ", f.cnpj, { plainValue: true })
        )}
        ${infoRow(1, infoItem("Diretoria", f.diretoria))}
        ${infoRow(2, infoItem("Plano", f.plano), infoItem("Classificação", f.classificacao))}
        ${infoRow(
          3,
          infoItem("Modal", f.modal),
          infoItem("Tipologia", f.tipologia),
          infoItem("Carteira", f.carteira)
        )}
        ${infoRow(2, infoItem("Latitude", f.latitude), infoItem("Longitude", f.longitude))}
      `
      )}
      ${representanteBlock}
      ${infoSingle(...(f.extra || []))}`;
  }

  global.SLTAdminAnalysisInfo = {
    infoItem,
    infoRow,
    infoSubcard,
    infoSingle,
    buildProjectInfoFields,
  };
})(window);
