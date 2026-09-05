(function () {
  "use strict";

  async function request(path, options) {
    const res = await fetch(path, { credentials: "include", ...options });
    const body = await res.json().catch(() => null);
    if (res.status === 401) {
      const err = new Error((body && body.detail) || "Sessão expirada.");
      err.code = "UNAUTHORIZED";
      throw err;
    }
    if (!res.ok) {
      const detail = body && body.detail;
      const message = typeof detail === "string" ? detail : (body && body.message) || "Erro na requisição.";
      throw new Error(message);
    }
    return body;
  }

  const els = {};
  let tipoLoginAtual = "interno";

  function q(id) {
    return document.getElementById(id);
  }

  function cacheEls() {
    els.tabs = q("sei-login-tabs");
    els.form = q("sei-conectar-form");
    els.usuario = q("sei-usuario");
    els.orgao = q("sei-orgao");
    els.orgaoHint = q("sei-orgao-hint");
    els.email = q("sei-email");
    els.senha = q("sei-senha");
    els.captchaField = q("sei-captcha-field");
    els.captchaImg = q("sei-captcha-img");
    els.captcha = q("sei-captcha");
    els.lembrar = q("sei-lembrar");
    els.btnConectar = q("sei-btn-conectar");
    els.btnDesconectar = q("sei-btn-desconectar");
    els.status = q("sei-status");
    els.processosSection = q("sei-processos-section");
    els.processosBody = q("sei-processos-body");
    els.processosVazio = q("sei-processos-vazio");
    els.processosAviso = q("sei-processos-aviso");
    els.btnAtualizar = q("sei-btn-atualizar");
  }

  function setTipoLogin(tipo) {
    tipoLoginAtual = tipo;
    els.tabs.querySelectorAll("[data-tipo-login]").forEach((btn) => {
      const ativo = btn.dataset.tipoLogin === tipo;
      btn.classList.toggle("is-active", ativo);
      btn.setAttribute("aria-selected", String(ativo));
    });
    document.querySelectorAll("[data-campo-login]").forEach((field) => {
      field.classList.toggle("hidden", field.dataset.campoLogin !== tipo);
    });
    carregarFormularioLogin();
  }

  async function carregarFormularioLogin() {
    try {
      const dados = await request(`/api/sei/login-form?tipo_login=${encodeURIComponent(tipoLoginAtual)}`);
      if (tipoLoginAtual === "interno") {
        els.orgao.innerHTML = '<option value="">Selecione…</option>';
        (dados.orgaos || []).forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.value;
          opt.textContent = o.label;
          els.orgao.appendChild(opt);
        });
        els.orgaoHint.textContent = (dados.orgaos || []).length
          ? "Carregado ao vivo da página de login do SEI."
          : "Não foi possível carregar a lista de órgãos agora; tente novamente ao conectar.";
      }
      exibirCaptchaSeNecessario(dados.captcha_pendente, dados.captcha_imagem_base64);
    } catch (err) {
      // Best-effort: a lista de órgãos/captcha só ajuda a UX; se falhar, o
      // usuário ainda pode tentar conectar e ver o erro real na resposta.
      SLTAdminUi.showToast("Não foi possível pré-carregar a página de login do SEI: " + err.message, true);
    }
  }

  function exibirCaptchaSeNecessario(pendente, imagemBase64) {
    els.captchaField.classList.toggle("hidden", !pendente);
    if (pendente && imagemBase64) {
      els.captchaImg.src = `data:image/png;base64,${imagemBase64}`;
    }
  }

  function renderStatus(status) {
    let texto;
    if (status.conectado) {
      texto = `Conectado como <strong>${escapeHtml(status.identificacao || "")}</strong> (${status.tipo_login})`;
    } else if (status.captcha_pendente) {
      texto = "Aguardando código do captcha…";
      exibirCaptchaSeNecessario(true, status.captcha_imagem_base64);
    } else if (status.erro) {
      texto = `Erro: ${escapeHtml(status.erro)}`;
    } else {
      texto = "Desconectado";
    }
    els.status.innerHTML = `Status: ${texto}`;
    els.btnDesconectar.classList.toggle("hidden", !status.conectado);
    els.processosSection.hidden = !status.conectado;
    if (status.conectado) carregarProcessos();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function atualizarStatus() {
    try {
      const status = await request("/api/sei/status");
      renderStatus(status);
    } catch (err) {
      if (err.code === "UNAUTHORIZED") throw err;
      SLTAdminUi.showToast("Falha ao consultar status SEI: " + err.message, true);
    }
  }

  async function conectar(event) {
    event.preventDefault();
    els.btnConectar.disabled = true;
    els.status.innerHTML = "Status: Conectando…";
    try {
      const payload = {
        tipo_login: tipoLoginAtual,
        senha: els.senha.value,
        lembrar_credencial: !!els.lembrar.checked,
        captcha: els.captchaField.classList.contains("hidden") ? null : els.captcha.value || null,
      };
      if (tipoLoginAtual === "interno") {
        payload.usuario = els.usuario.value;
        payload.orgao = els.orgao.value || null;
      } else {
        payload.email = els.email.value;
      }
      const status = await request("/api/sei/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      renderStatus(status);
      if (status.conectado) {
        SLTAdminUi.showToast("Conectado ao SEI-SP com sucesso.");
      } else if (!status.captcha_pendente) {
        SLTAdminUi.showToast(status.erro || "Não foi possível conectar.", true);
      }
    } catch (err) {
      if (err.code === "UNAUTHORIZED") throw err;
      SLTAdminUi.showToast("Falha ao conectar ao SEI-SP: " + err.message, true);
    } finally {
      els.btnConectar.disabled = false;
    }
  }

  async function desconectar() {
    try {
      await request("/api/sei/desconectar", { method: "POST" });
      await atualizarStatus();
      SLTAdminUi.showToast("Desconectado do SEI-SP.");
    } catch (err) {
      if (err.code === "UNAUTHORIZED") throw err;
      SLTAdminUi.showToast("Falha ao desconectar: " + err.message, true);
    }
  }

  async function carregarProcessos() {
    els.processosBody.innerHTML = "";
    els.processosAviso.classList.add("hidden");
    els.processosVazio.classList.add("hidden");
    try {
      const resultado = await request("/api/sei/processos");
      if (resultado.aviso) {
        els.processosAviso.textContent = resultado.aviso;
        els.processosAviso.classList.remove("hidden");
      }
      if (!resultado.processos || !resultado.processos.length) {
        els.processosVazio.classList.remove("hidden");
        return;
      }
      resultado.processos.forEach((processo) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(processo.numero)}</td>
          <td>${escapeHtml(processo.interessado || processo.tipo || "—")}</td>
          <td>${escapeHtml(processo.data || "—")}</td>
          <td><span class="badge">${escapeHtml(processo.tipo_demanda_estimado || "projeto")}</span></td>
          <td><button type="button" class="btn btn-secondary btn-sm" data-revisar>Revisar e criar demanda</button></td>`;
        tr.querySelector("[data-revisar]").addEventListener("click", () => abrirRevisao(processo));
        els.processosBody.appendChild(tr);
      });
    } catch (err) {
      if (err.code === "UNAUTHORIZED") throw err;
      SLTAdminUi.showToast("Falha ao listar processos SEI: " + err.message, true);
    }
  }

  // Campos mínimos por tipo de demanda — ver api/schemas/demanda.py, plano.py e
  // programa.py para o contrato completo. Formulário simples (sem
  // autocomplete de instituição/representante do SIGMA) porque esta tela não
  // reaproveita o cadastro público completo — o usuário revisa/edita antes de confirmar.
  const CAMPOS_POR_TIPO = {
    projeto: [
      { name: "nome", label: "Nome do projeto", type: "text", required: true },
      { name: "descricao", label: "Descrição", type: "textarea" },
      { name: "instituicao_id", label: "Instituição (UUID SIGMA)", type: "text", required: true },
      { name: "pessoa_id", label: "Representante legal (UUID pessoa SIGMA)", type: "text", required: true },
      { name: "representante_nome", label: "Nome do representante", type: "text", required: true },
      { name: "diretoria_id", label: "Diretoria (UUID)", type: "text", required: true },
      { name: "plano_id", label: "Plano vinculado (código)", type: "text", required: true },
      { name: "lat", label: "Latitude", type: "number" },
      { name: "lng", label: "Longitude", type: "number" },
    ],
    plano: [
      { name: "nome", label: "Nome do plano", type: "text", required: true },
      { name: "descricao", label: "Descrição", type: "textarea", required: true },
      { name: "instituicao_id", label: "Instituição (UUID SIGMA)", type: "text", required: true },
      { name: "pessoa_id", label: "Representante legal (UUID pessoa SIGMA)", type: "text", required: true },
      { name: "representante_nome", label: "Nome do representante", type: "text", required: true },
      { name: "diretoria_id", label: "Diretoria (UUID)", type: "text", required: true },
    ],
    programa: [
      { name: "nome", label: "Nome do programa", type: "text", required: true },
      { name: "descricao", label: "Descrição", type: "textarea", required: true },
      { name: "instituicao_id", label: "Instituição (UUID SIGMA)", type: "text", required: true },
      { name: "pessoa_id", label: "Representante legal (UUID pessoa SIGMA)", type: "text", required: true },
      { name: "representante_nome", label: "Nome do representante", type: "text", required: true },
    ],
  };

  function campoHtml(campo, valor) {
    const req = campo.required ? "required" : "";
    const val = escapeHtml(valor || "");
    if (campo.type === "textarea") {
      return `<div class="form-field"><label for="rev-${campo.name}">${campo.label}</label>
        <textarea id="rev-${campo.name}" name="${campo.name}" ${req}>${val}</textarea></div>`;
    }
    return `<div class="form-field"><label for="rev-${campo.name}">${campo.label}</label>
      <input type="${campo.type}" id="rev-${campo.name}" name="${campo.name}" value="${val}" ${req}
        ${campo.type === "number" ? 'step="any"' : ""}></div>`;
  }

  function abrirRevisao(processo) {
    const tipoInicial = processo.tipo_demanda_estimado || "projeto";
    const bodyHtml = `
      <form id="sei-revisao-form" class="form-grid">
        <div class="form-field">
          <label for="rev-tipo-demanda">Tipo de demanda</label>
          <select id="rev-tipo-demanda">
            <option value="plano">Plano</option>
            <option value="programa">Programa</option>
            <option value="projeto" selected>Projeto</option>
          </select>
        </div>
        <div id="rev-campos-container"></div>
      </form>`;
    const footerHtml = `<button type="button" class="btn btn-primary" id="sei-btn-confirmar-demanda">Confirmar e criar demanda</button>`;
    const backdrop = SLTAdminUi.openModal(`Revisar processo ${escapeHtml(processo.numero)}`, bodyHtml, footerHtml);

    const selectTipo = backdrop.querySelector("#rev-tipo-demanda");
    const container = backdrop.querySelector("#rev-campos-container");

    function renderCampos(tipo) {
      const valoresIniciais = {
        nome: processo.interessado || `Processo SEI ${processo.numero}`,
        descricao: processo.tipo || "",
      };
      container.innerHTML = (CAMPOS_POR_TIPO[tipo] || [])
        .map((campo) => campoHtml(campo, valoresIniciais[campo.name]))
        .join("");
    }

    selectTipo.value = tipoInicial;
    renderCampos(tipoInicial);
    selectTipo.addEventListener("change", () => renderCampos(selectTipo.value));

    backdrop.querySelector("#sei-btn-confirmar-demanda").addEventListener("click", async () => {
      const tipo = selectTipo.value;
      const definicoes = CAMPOS_POR_TIPO[tipo] || [];
      const campos = {};
      let valido = true;
      definicoes.forEach((def) => {
        const input = backdrop.querySelector(`#rev-${def.name}`);
        const valor = input ? input.value.trim() : "";
        if (def.required && !valor) valido = false;
        if (def.type === "number") {
          campos[def.name] = valor === "" ? null : Number(valor);
        } else {
          campos[def.name] = valor || null;
        }
      });
      if (!valido) {
        SLTAdminUi.showToast("Preencha os campos obrigatórios antes de confirmar.", true);
        return;
      }
      // Monta o payload no formato esperado pelo schema do tipo escolhido
      // (ver api/schemas/demanda.py — RepresentanteSchema aninhado).
      const representante = { nome: campos.representante_nome, pessoa_id: campos.pessoa_id };
      delete campos.representante_nome;
      const payloadCampos = { ...campos, representante };
      if (tipo === "projeto") {
        payloadCampos.lat = campos.lat ?? 0;
        payloadCampos.lng = campos.lng ?? 0;
      }
      try {
        await request(`/api/sei/processos/${encodeURIComponent(processo.numero)}/criar-demanda`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo_demanda: tipo, campos: payloadCampos }),
        });
        SLTAdminUi.closeModal();
        SLTAdminUi.showToast("Demanda criada a partir do processo SEI.");
      } catch (err) {
        if (err.code === "UNAUTHORIZED") throw err;
        SLTAdminUi.showToast("Falha ao criar demanda: " + err.message, true);
      }
    });
  }

  async function init() {
    const user = await SLTAdminAuth.requireAuth();
    if (!user) return;
    cacheEls();

    els.tabs.querySelectorAll("[data-tipo-login]").forEach((btn) => {
      btn.addEventListener("click", () => setTipoLogin(btn.dataset.tipoLogin));
    });
    els.form.addEventListener("submit", conectar);
    els.btnDesconectar.addEventListener("click", desconectar);
    els.btnAtualizar.addEventListener("click", carregarProcessos);

    setTipoLogin("interno");
    await atualizarStatus();
  }

  init().catch((err) => {
    if (err && err.code === "UNAUTHORIZED") {
      location.replace(SLTAdminAuth.loginUrl());
      return;
    }
    SLTAdminUi.showToast((err && err.message) || "Erro ao iniciar a página.", true);
  });
})();
