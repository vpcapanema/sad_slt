(function () {
  "use strict";
  const $ = id => document.getElementById("ami-divulgacao-" + id);
  const painel = document.getElementById("ami-divulgacao");
  const tabela = $("tabela"), contatoForm = $("contato"), remetente = $("alias-remetente"),
    assunto = $("assunto"), mensagem = $("mensagem");
  const mensagemDepois = $("mensagem-depois");
  const modal = $("modal"), modalForm = $("modal-form");
  const associacao = $("associacao"), associacaoForm = $("associacao-form");
  const origemAssociacao = $("associacao-origem"), destinoAssociacao = $("associacao-destino");
  const envio = {enviando: "Resultado pendente", aceito_smtp: "Aceito pelo servidor de e-mail", falha: "Falha no envio", indeterminado: "Resultado indeterminado"};
  const entrega = {sem_confirmacao: "Sem confirmação", confirmada: "Entregue", falha: "Devolvido", adiada: "Entrega adiada"};
  let atual = null, modo = "create";

  function textoDoEditor(contexto) {
    return [mensagem.value.trimEnd(), contexto.link, mensagemDepois.value.trimStart()].filter(Boolean).join("\n\n");
  }

  function mensagemEditada(contexto) {
    if (!remetente.reportValidity() || !assunto.reportValidity()) return null;
    const alias_remetente = remetente.value.trim();
    if (!alias_remetente || !assunto.value.trim() || (!mensagem.value.trim() && !mensagemDepois.value.trim())) {
      $("status").textContent = "Informe o nome do remetente, o assunto e a mensagem.";
      return null;
    }
    return {alias_remetente, assunto: assunto.value, texto: textoDoEditor(contexto)};
  }

  function aplicarEdicao(contexto, edicao) {
    if (contexto !== atual) return;
    const conteudo = edicao.rascunho || edicao.padrao;
    const indice = conteudo.texto.indexOf(contexto.link);
    remetente.value = conteudo.alias_remetente;
    assunto.value = conteudo.assunto;
    mensagem.value = indice < 0 ? conteudo.texto : conteudo.texto.slice(0, indice).trimEnd();
    mensagemDepois.value = indice < 0 ? "" : conteudo.texto.slice(indice + contexto.link.length).trimStart();
    contexto.edicao = edicao;
    contexto.editorAlterado = false;
    controles();
  }

  async function carregarEdicao(contexto) {
    try {
      aplicarEdicao(contexto, await contexto.api(contexto.urlMensagem));
    } catch (erro) {
      if (contexto === atual) {
        contexto.edicao = null;
        $("status").textContent = erro.message;
        controles();
      }
    }
  }

  function elegivel(contato, reenvio) {
    return !contato.inscrito_em && (contato.historico.length > 0) === reenvio &&
      !contato.historico.some(item => ["enviando", "indeterminado"].includes(item.envio_status) &&
        !["confirmada", "falha"].includes(item.entrega_status) && item.leitura_status !== "confirmada");
  }

  function selecionados() {
    return (tabela.analysisControls?.rows || []).flatMap(linha => {
      const contato = atual?.contatos.get(linha.dataset.email);
      return contato && linha.querySelector("input:checked") && !atual.inscritos.has(contato.email) ? [contato] : [];
    });
  }

  function podeEditar() {
    return modo === "edit" && atual && !atual.ocupado;
  }

  function alterada(contexto) {
    return Boolean(contexto && (contexto.alteracoes.size || contexto.remocoes.size));
  }

  function atualizarRascunho(contexto) {
    $("status").textContent = "";
    renderizar(contexto);
  }

  function controles() {
    const editavel = podeEditar();
    const pronto = editavel && atual.dados;
    const coletaAberta = atual?.julgamento.status === "ativa" && Date.parse(atual.julgamento.valido_ate) >= Date.now();
    const pendente = alterada(atual);
    const podeEnviar = pronto && atual.edicao && coletaAberta && !pendente && !atual.editorAlterado;
    $("consulta").classList.toggle("is-hidden", modo !== "view");
    $("prazo").classList.toggle("is-hidden", modo !== "edit" || !atual || coletaAberta);
    $("pendencias").classList.toggle("is-hidden", modo !== "edit" || !pendente);
    [$("nome"), $("email"), $("instituicao"), $("adicionar"), $("arquivo"), $("listas")].forEach(campo => { campo.disabled = !pronto; });
    [remetente, assunto, mensagem, mensagemDepois].forEach(campo => { campo.readOnly = !editavel || !atual.edicao; });
    $("salvar-mensagem").disabled = !pronto || !atual.edicao || !atual.editorAlterado;
    controlesAssociacao(pronto, coletaAberta, pendente);
    if (!$("enviar")) return;
    const marcados = atual ? selecionados() : [];
    const temContatos = Boolean(tabela.analysisControls?.rows.length);
    $("editar").disabled = !pronto || marcados.length !== 1;
    $("excluir").disabled = !pronto || !marcados.length;
    $("salvar").disabled = !pronto || !pendente;
    $("salvar-nova").disabled = !pronto || !temContatos;
    $("salvar-existente").disabled = !pronto || !temContatos;
    $("enviar").disabled = !podeEnviar || !marcados.some(contato => elegivel(contato, false));
    $("reenviar").disabled = !podeEnviar || !marcados.some(contato => elegivel(contato, true));
    $("confirmacoes").disabled = !atual || atual.ocupado || atual.carregando;
  }

  function controlesAssociacao(pronto, coletaAberta, pendente) {
    const visivel = modo === "edit" && atual?.dados?.associacao_dimensoes_disponivel;
    associacao.classList.toggle("is-hidden", !visivel);
    const podePrever = visivel && pronto && coletaAberta && !pendente;
    origemAssociacao.disabled = destinoAssociacao.disabled = !podePrever;
    $("associacao-prever").disabled = !podePrever || !origemAssociacao.value || !selecionados().length;
    const previa = atual?.associacaoPrevia;
    const confirmar = $("associacao-confirmar");
    confirmar.classList.toggle("is-hidden", !previa?.confirmacao);
    confirmar.disabled = !podePrever || !previa?.confirmacao ||
      previa.parametros.destinatarios.join() !== selecionados().map(item => item.email).sort().join();
  }

  function limparAssociacao(contexto = atual) {
    if (contexto) contexto.associacaoPrevia = null;
    $("associacao-previa").replaceChildren();
    $("associacao-status").textContent = "";
  }

  function listarAssociacao(pai, titulo, itens) {
    if (!itens.length) return;
    const rotulo = document.createElement("p"), destaque = document.createElement("strong"), lista = document.createElement("ul");
    destaque.textContent = titulo;
    rotulo.className = "ami-section-intro";
    rotulo.append(destaque);
    itens.forEach(texto => {
      const item = document.createElement("li");
      item.textContent = texto;
      lista.append(item);
    });
    pai.append(rotulo, lista);
  }

  async function carregarOrigensAssociacao() {
    const contexto = atual;
    if (!associacao.open || !contexto?.dados?.associacao_dimensoes_disponivel || contexto.origensAssociacao) return;
    try {
      const {origens} = await contexto.api(contexto.url + "/associacao-dimensoes");
      if (contexto !== atual) return;
      contexto.origensAssociacao = origens;
      origemAssociacao.replaceChildren(new Option("Selecione…", ""), ...origens.map(origem => new Option(origem.nome, origem.id)));
      if (!origens.length) $("associacao-status").textContent = "Nenhum julgamento de origem disponível.";
      controles();
    } catch (erro) {
      if (contexto === atual) $("associacao-status").textContent = erro.message;
    }
  }

  async function preverAssociacao(evento) {
    evento.preventDefault();
    if ($("associacao-prever").disabled) return;
    const contexto = atual;
    const parametros = {origem: origemAssociacao.value, destino: destinoAssociacao.value,
      destinatarios: selecionados().map(item => item.email).sort()};
    limparAssociacao();
    contexto.ocupado = true;
    controles();
    try {
      const previa = await contexto.api(contexto.url + "/associacao-dimensoes", {method: "POST", body: JSON.stringify(parametros)});
      if (contexto !== atual) return;
      contexto.associacaoPrevia = {...previa, parametros};
      const painelPrevia = $("associacao-previa");
      listarAssociacao(painelPrevia, "Correspondência por nome", previa.correspondencias.map(par =>
        par.origem ? `${par.origem} → ${par.destino}` : `${par.destino} — ${par.problema}`));
      const encontrados = new Set(previa.correspondencias.map(par => par.origem));
      listarAssociacao(painelPrevia, "Critérios de origem sem correspondência", previa.origem.filter(nome => !encontrados.has(nome)));
      listarAssociacao(painelPrevia, "Destinatários que precisam de conferência", previa.destinatarios
        .filter(item => item.problema).map(item => `${item.nome} (${item.email}) — ${item.problema}`));
      const total = previa.destinatarios.length;
      const resumo = total === 1 ? (previa.prontos ? "Destinatário com correspondência válida." : "Destinatário com associação pendente.") :
        `${previa.prontos} de ${total} destinatários com correspondência válida.`;
      $("associacao-status").textContent = parametros.destino === "criterios" ?
        "A associação aos critérios está disponível apenas para conferência nesta coleta." : resumo;
    } catch (erro) {
      if (contexto === atual) $("associacao-status").textContent = erro.message;
    } finally {
      contexto.ocupado = false;
      if (contexto === atual) controles();
    }
  }

  async function confirmarAssociacao() {
    if ($("associacao-confirmar").disabled) return;
    const contexto = atual;
    const previa = contexto.associacaoPrevia;
    const total = previa.prontos === 1 ? "1 destinatário" : `${previa.prontos} destinatários`;
    const confirma = await ProcessFeedback.confirmar({
      title: "Aproveitar as intensidades de importância do julgamento anterior?",
      message: `Os critérios de origem correspondem às dimensões atuais para ${total}. O formulário público abrirá direto em Critérios para os destinatários com associação confirmada.`,
      confirmLabel: "Sim, aproveitar intensidades",
    });
    if (!confirma || contexto !== atual || previa !== contexto.associacaoPrevia || $("associacao-confirmar").disabled) return;
    contexto.ocupado = true;
    controles();
    try {
      const dados = await contexto.api(contexto.url + "/associacao-dimensoes", {
        method: "POST", body: JSON.stringify({...previa.parametros, confirmacao: previa.confirmacao}),
      });
      if (contexto !== atual) return;
      limparAssociacao();
      const confirmados = dados.confirmados === 1 ? "1 destinatário" : `${dados.confirmados} destinatários`;
      $("associacao-status").textContent = `Associação confirmada para ${confirmados}. Use Enviar e-mail aos selecionados para divulgar o link público.`;
    } catch (erro) {
      if (contexto === atual) $("associacao-status").textContent = erro.message;
    } finally {
      contexto.ocupado = false;
      if (contexto === atual) controles();
    }
  }

  function renderizar(contexto, marcados = new Set(selecionados().map(contato => contato.email))) {
    const gravados = new Map((contexto.dados?.destinatarios || []).map(contato => [contato.email, {...contato, historico: []}]));
    contexto.inscritos = new Set(contexto.dados?.emails_inscritos || []);
    gravados.forEach(contato => { if (contato.inscrito_em) contexto.inscritos.add(contato.email); });
    contexto.contatos = new Map(gravados);
    contexto.remocoes.forEach(email => contexto.contatos.delete(email));
    contexto.alteracoes.forEach((alteracao, email) => {
      contexto.contatos.set(email, {...(gravados.get(email) || {historico: []}), ...alteracao});
    });
    (contexto.dados?.registros || []).forEach(registro => contexto.contatos.get(registro.destinatario)?.historico.unshift(registro));
    const corpo = tabela.tBodies[0];
    corpo.replaceChildren();
    contexto.contatos.forEach(contato => {
      if (contexto.inscritos.has(contato.email)) return;
      const ultimo = contato.historico[0];
      const dataEnvio = ultimo?.smtp_aceito_em;
      const linha = corpo.insertRow();
      linha.dataset.email = contato.email;
      [contato.nome, contato.email, contato.instituicao || "—", ultimo ? envio[ultimo.envio_status] : gravados.has(contato.email) ? "Aguardando envio" : "Aguardando salvar",
        dataEnvio ? new Date(dataEnvio).toLocaleString("pt-BR") : "—", ultimo ? entrega[ultimo.entrega_status] : "—"
      ].forEach(valor => { linha.insertCell().textContent = valor; });
      const statusEnvio = linha.cells[3], statusEntrega = linha.cells[5];
      if (ultimo) SicardAhpStatus.aplicar(statusEntrega, statusEntrega.textContent);
      if (ultimo) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "ami-cell-link";
        botao.textContent = statusEnvio.textContent;
        SicardAhpStatus.aplicar(botao, botao.textContent);
        botao.setAttribute("data-read-control", "");
        botao.setAttribute("aria-haspopup", "dialog");
        botao.setAttribute("aria-label", "Histórico de envio para " + contato.nome + " · " + botao.textContent);
        botao.onclick = () => SICARDEmailConvites.historicoDivulgacao(contato, contato.historico, contexto.julgamento, botao);
        statusEnvio.replaceChildren(botao);
      } else SicardAhpStatus.aplicar(statusEnvio, statusEnvio.textContent);
    });
    SLTAnalysisTable(tabela, contexto.julgamento);
    const estado = tabela.analysisControls;
    if (!$("enviar")) {
      const acoes = tabela.closest(".ami-report-table").querySelector(".admin-actions");
      const limpar = acoes.querySelector('[aria-label="Limpar seleção"] i');
      limpar.classList.replace("fa-xmark", "fa-broom");
      acoes.append($("acoes").content.cloneNode(true));
      $("editar").onclick = editarSelecionado;
      $("excluir").onclick = excluirSelecionados;
      $("salvar").onclick = () => salvarConvidados(atual);
      $("salvar-nova").onclick = () => abrirEditor("nova");
      $("salvar-existente").onclick = escolherListaParaAtualizar;
      $("enviar").onclick = () => disparar(false);
      $("reenviar").onclick = () => disparar(true);
      $("confirmacoes").onclick = atualizar;
      const desenhar = estado.draw;
      estado.draw = () => { desenhar(); controles(); };
    }
    estado.rows.forEach(linha => {
      const caixa = linha.querySelector("input");
      caixa.checked = marcados.has(linha.dataset.email);
      caixa.setAttribute("aria-label", "Selecionar " + linha.dataset.email);
    });
    estado.draw();
  }

  async function carregar(contexto, opcoes, caminho = "") {
    const consulta = (contexto.consulta || 0) + 1;
    contexto.consulta = consulta;
    contexto.carregando = true;
    controles();
    try {
      const dados = await contexto.api(contexto.url + caminho, opcoes);
      if (contexto !== atual || consulta !== contexto.consulta) return;
      if (JSON.stringify(dados) !== JSON.stringify(contexto.dados)) {
        contexto.dados = dados;
        renderizar(contexto);
      }
    } finally {
      if (consulta === contexto.consulta) contexto.carregando = false;
      if (contexto === atual) controles();
    }
  }

  async function atualizar() {
    const contexto = atual;
    if (!contexto) return;
    $("status").textContent = "Atualizando a lista…";
    try {
      const coletar = modo === "edit" && contexto.dados?.confirmacoes_configuradas;
      if (coletar) await carregar(contexto, {method: "POST"}, "/confirmacoes");
      else await carregar(contexto);
      if (contexto === atual) $("status").textContent = coletar
        ? "Confirmações disponíveis e inscrições atualizadas." : "Lista atualizada.";
    } catch (erro) { if (contexto === atual) $("status").textContent = erro.message; }
  }

  async function disparar(reenvio) {
    const contexto = atual;
    if (!podeEditar() || !contexto.edicao || contexto.editorAlterado || alterada(contexto)) return;
    const titulo = reenvio ? "Reenviar link público" : "Enviar link público";
    const contatos = selecionados().filter(contato => elegivel(contato, reenvio));
    if (!contatos.length) return;
    const rascunho_id = contexto.edicao.rascunho?.id;
    contexto.ocupado = true;
    controles();
    try {
      const confirmado = await ProcessFeedback.confirmar({title: titulo, confirmLabel: titulo,
        message: "Enviar a mensagem exibida com o link público para " + contatos.length + " destinatário(s) selecionado(s)."});
      if (!confirmado || atual !== contexto || modo !== "edit") return;
      const operacao_id = crypto.randomUUID();
      const problemas = [];
      let aceitos = 0;
      for (const contato of contatos) {
        if (atual !== contexto || modo !== "edit") break;
        $("status").textContent = "Registrando envio para " + contato.nome + "…";
        try {
          const retorno = await contexto.api(contexto.url + "/enviar", {method: "POST",
            body: JSON.stringify({rascunho_id, destinatario: contato.email, reenvio, operacao_id})});
          if (retorno.envio_status === "aceito_smtp") aceitos++;
          else {
            problemas.push(contato.nome + " · " + (retorno.detalhe || envio[retorno.envio_status]));
            if (retorno.codigo_email && retorno.codigo_email !== "destinatario_recusado") break;
          }
        } catch (erro) {
          problemas.push(contato.nome + " · " + erro.message);
          if (!erro.status || erro.status >= 500) break;
        }
      }
      if (atual !== contexto) return;
      const resultado = aceitos + " de " + contatos.length + " e-mail(s) aceito(s) pelo servidor.";
      $("status").textContent = [resultado, ...problemas].join("\n");
      await carregarEdicao(contexto);
      await carregar(contexto);
    } catch (erro) { if (atual === contexto) $("status").textContent += " " + erro.message; }
    finally {
      contexto.ocupado = false;
      if (atual === contexto) controles();
    }
  }

  async function salvarMensagem() {
    const contexto = atual;
    if (!podeEditar() || !contexto.dados || !contexto.edicao) return;
    const conteudo = mensagemEditada(contexto);
    if (!conteudo) return;
    contexto.ocupado = true;
    controles();
    try {
      const rascunho = await contexto.api(contexto.urlMensagem, {method: "PUT", body: JSON.stringify(conteudo)});
      if (contexto !== atual) return;
      aplicarEdicao(contexto, {...contexto.edicao, rascunho});
      $("status").textContent = "Edição salva para o próximo envio deste julgamento.";
    } catch (erro) {
      if (contexto === atual) $("status").textContent = erro.message;
    } finally {
      contexto.ocupado = false;
      if (contexto === atual) controles();
    }
  }

  function removerDoRascunho(contexto, email) {
    contexto.alteracoes.delete(email);
    if (contexto.dados.destinatarios.some(contato => contato.email === email)) contexto.remocoes.add(email);
  }

  function escreverNoRascunho(contexto, nome, email, instituicao) {
    instituicao = String(instituicao ?? "").trim() || null;
    contexto.remocoes.delete(email);
    if (contexto.dados.destinatarios.some(contato => contato.email === email && contato.nome === nome &&
        (contato.instituicao ?? null) === instituicao)) {
      contexto.alteracoes.delete(email);
    } else {
      contexto.alteracoes.set(email, {nome, email, instituicao});
    }
  }

  function excluirSelecionados() {
    const contexto = atual;
    if (!podeEditar()) return;
    selecionados().forEach(contato => removerDoRascunho(contexto, contato.email));
    atualizarRascunho(contexto);
  }

  async function salvarConvidados(contexto, lista = {}) {
    if (contexto !== atual || !podeEditar() || !contexto.dados) return;
    contexto.ocupado = true;
    controles();
    $("modal-confirmar").disabled = true;
    try {
      const resultado = await contexto.api(contexto.url + "/destinatarios", {method: "PUT", body: JSON.stringify({
        alterados: [...contexto.alteracoes.values()].map(({nome, email, instituicao}) => ({nome, destinatario: email, instituicao})),
        removidos: [...contexto.remocoes],
        ...lista
      })});
      if (atual !== contexto) return;
      contexto.consulta++;
      contexto.carregando = false;
      contexto.alteracoes.clear();
      contexto.remocoes.clear();
      contexto.dados.destinatarios = resultado.destinatarios;
      contexto.dados.emails_inscritos = resultado.emails_inscritos;
      if (modal.open) modal.close();
      renderizar(contexto);
      const resumo = resultado.lista ? "Convidados da rodada e lista “" + resultado.lista.nome + "” salvos." : "Convidados da rodada salvos.";
      const ignorados = resultado.ja_inscritos.length;
      $("status").textContent = resumo + (ignorados ? " " + ignorados + " e-mail(s) já constam no Monitoramento das atividades." : "");
    } catch (erro) {
      if (atual === contexto) $(modal.open ? "modal-status" : "status").textContent = erro.message;
    } finally {
      contexto.ocupado = false;
      if (atual === contexto) {
        $("modal-confirmar").disabled = false;
        controles();
      }
    }
  }

  function abrirEditor(tipo, item, catalogo = []) {
    if (!podeEditar() || modal.open) return;
    const contexto = atual;
    const nome = $("modal-nome"), email = $("modal-email"), nova = $("modal-nova"), listas = $("modal-listas");
    const instituicao = $("modal-instituicao");
    modalForm.reset();
    $("modal-status").textContent = "";
    const editar = tipo === "editar", criar = tipo === "nova";
    $("modal-convidado").hidden = $("modal-convidado").disabled = !editar;
    nova.disabled = nova.parentElement.hidden = !criar;
    listas.disabled = listas.parentElement.hidden = tipo !== "atualizar";
    $("modal-titulo").textContent = editar ? "Editar convidado" : criar ? "Salvar como nova lista" : "Atualizar lista existente";
    $("modal-descricao").textContent = editar ? "A edição será gravada ao salvar a lista de convidados." :
      criar ? "A lista ficará disponível para outros julgamentos. Os convidados desta rodada também serão salvos." :
        "O conteúdo da lista escolhida será substituído pelos convidados desta rodada. Os convidados também serão salvos.";
    $("modal-confirmar").textContent = editar ? "Aplicar ao rascunho" : criar ? "Salvar nova lista" : "Atualizar lista";
    $("modal-confirmar").disabled = false;
    if (editar) {
      nome.value = item.nome;
      email.value = item.email;
      instituicao.value = item.instituicao || "";
    }
    listas.replaceChildren(new Option("Selecione…", ""), ...catalogo.map(lista => new Option(lista.nome, lista.id)));
    const enviarFormulario = async event => {
      event.preventDefault();
      if (contexto !== atual || !podeEditar()) return;
      if (!editar) {
        const titulo = nova.value.trim();
        if (criar && !titulo) { $("modal-status").textContent = "Informe o nome da lista."; return; }
        salvarConvidados(contexto, criar ? {nova_lista: titulo} : {lista_id: listas.value});
        return;
      }
      const novoNome = nome.value.trim(), novoEmail = email.value.trim().toLowerCase();
      if (!novoNome) { $("modal-status").textContent = "Informe o nome do destinatário."; return; }
      $("modal-confirmar").disabled = true;
      nome.disabled = email.disabled = instituicao.disabled = true;
      try {
        await carregar(contexto);
      } catch (erro) {
        if (contexto === atual && modal.open && modalForm.onsubmit === enviarFormulario) $("modal-status").textContent = erro.message;
        return;
      } finally {
        if (modalForm.onsubmit === enviarFormulario) {
          $("modal-confirmar").disabled = false;
          nome.disabled = email.disabled = instituicao.disabled = false;
        }
      }
      if (contexto !== atual || !modal.open || modalForm.onsubmit !== enviarFormulario || !podeEditar()) return;
      const motivo = contexto.inscritos.has(item.email) ? SICARDDivulgacao.motivoDuplicata(item.email) :
        novoEmail !== item.email ? SICARDDivulgacao.motivoDuplicata(novoEmail) : "";
      if (motivo) { $("modal-status").textContent = motivo; return; }
      if (novoEmail !== item.email) removerDoRascunho(contexto, item.email);
      escreverNoRascunho(contexto, novoNome, novoEmail, instituicao.value);
      modal.close();
      $("status").textContent = "";
      renderizar(contexto, new Set([novoEmail]));
    };
    nome.disabled = email.disabled = instituicao.disabled = false;
    modalForm.onsubmit = enviarFormulario;
    modal.showModal();
    (editar ? nome : criar ? nova : listas).focus();
  }

  function editarSelecionado() {
    const [contato] = selecionados();
    if (contato) abrirEditor("editar", contato);
  }

  async function escolherListaParaAtualizar() {
    const contexto = atual;
    if (!podeEditar()) return;
    contexto.ocupado = true;
    controles();
    let catalogo;
    try {
      const resultado = await SICARDDivulgacao.listas();
      catalogo = resultado.listas.filter(lista => lista.editavel);
    } catch (erro) {
      if (atual === contexto) $("status").textContent = erro.message;
    } finally {
      contexto.ocupado = false;
      if (atual === contexto) controles();
    }
    if (atual !== contexto || !podeEditar() || !catalogo) return;
    if (catalogo.length) abrirEditor("atualizar", null, catalogo);
    else $("status").textContent = "Ainda não há listas reutilizáveis. Use Salvar como nova lista.";
  }

  window.SICARDDivulgacao = {
    modo(valor) {
      modo = valor;
      $("contato-alerta").textContent = "";
      if (valor === "create") this.fechar();
      else if (valor === "view" && atual && alterada(atual)) {
        atual.alteracoes.clear();
        atual.remocoes.clear();
        if (modal.open) modal.close();
        atualizarRascunho(atual);
      } else controles();
    },
    abrir(julgamento, link, api) {
      const linkMensagem = $("link-mensagem");
      linkMensagem.href = link;
      linkMensagem.textContent = link;
      if (atual?.julgamento.id === julgamento.id) {
        const atualizarModelo = !atual.editorAlterado && !atual.ocupado &&
          (atual.link !== link || atual.julgamento.valido_ate !== julgamento.valido_ate ||
            atual.julgamento.nome !== julgamento.nome);
        atual.link = link;
        atual.julgamento = julgamento;
        if (atualizarModelo) carregarEdicao(atual);
        controles();
        return;
      }
      this.fechar();
      const contexto = {julgamento, api, contatos: new Map(), inscritos: new Set(), alteracoes: new Map(), remocoes: new Set(),
        link, url: "/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(julgamento.id) + "/emails/divulgacao",
        urlMensagem: "/api/ahp/comparacao-colaborativa/ambientes/" + encodeURIComponent(julgamento.id) + "/emails/mensagem"};
      atual = contexto;
      renderizar(contexto);
      remetente.value = assunto.value = mensagem.value = mensagemDepois.value = "";
      $("status").textContent = "Carregando lista de divulgação…";
      carregar(contexto).then(() => {
        if (atual === contexto) {
          $("status").textContent = "";
          if (contexto.link) return carregarEdicao(contexto);
        }
      })
        .catch(erro => { if (atual === contexto) $("status").textContent = erro.message; });
    },
    fechar() {
      atual = null;
      if (modal.open) modal.close();
      associacao.open = false;
      associacaoForm.reset();
      origemAssociacao.replaceChildren();
      limparAssociacao();
      contatoForm.reset();
      $("contato-alerta").textContent = "";
      tabela.tBodies[0].replaceChildren();
      const estado = tabela.analysisControls;
      if (estado) {
        estado.column.value = "";
        estado.value.value = "";
        estado.page = 1;
        SLTTable.inversion(document.getElementById(estado.prefix + "-inverter"), false);
        SLTAnalysisTable(tabela);
      }
      controles();
    },
    motivoDuplicata(email) {
      if (atual?.inscritos.has(email)) return "E-mail já inscrito no Monitoramento das atividades";
      return atual?.contatos.has(email) ? "Já está na tabela de colaboradores convidados" : "";
    },
    async atualizarDestinatarios() {
      if (atual) await carregar(atual);
    },
    listas(origem, catalogo = false) {
      const busca = origem ? "?origem=" + encodeURIComponent(origem) + (catalogo ? "&catalogo=true" : "") : "";
      return atual.api(atual.url + "/listas" + busca);
    },
    async adicionar(lista) {
      const contexto = atual;
      if (!podeEditar() || !contexto.dados) throw new Error("Clique em Editar julgamento para incluir os destinatários.");
      contexto.ocupado = true;
      controles();
      try {
        await carregar(contexto);
        if (contexto !== atual || modo !== "edit") return;
        const novos = new Set();
        for (const item of lista) {
          const email = item.email.trim().toLowerCase();
          const motivo = this.motivoDuplicata(email);
          if (motivo || novos.has(email)) throw new Error(motivo || "Há e-mails repetidos nos destinatários selecionados.");
          novos.add(email);
        }
        lista.forEach(item => escreverNoRascunho(contexto, item.nome, item.email.trim().toLowerCase(), item.instituicao));
        contatoForm.reset();
        atualizarRascunho(contexto);
      } finally {
        contexto.ocupado = false;
        if (contexto === atual) controles();
      }
    }
  };
  $("modal-fechar").addEventListener("click", () => modal.close());
  associacao.addEventListener("toggle", carregarOrigensAssociacao);
  associacaoForm.addEventListener("change", () => { limparAssociacao(); controles(); });
  associacaoForm.addEventListener("submit", preverAssociacao);
  $("associacao-confirmar").addEventListener("click", confirmarAssociacao);
  [remetente, assunto, mensagem, mensagemDepois].forEach(campo => campo.addEventListener("input", () => {
    if (!atual?.edicao) return;
    const anterior = atual.edicao.rascunho || atual.edicao.padrao;
    atual.editorAlterado = remetente.value.trim() !== anterior.alias_remetente ||
      assunto.value !== anterior.assunto || textoDoEditor(atual) !== anterior.texto;
    controles();
  }));
  $("salvar-mensagem").addEventListener("click", salvarMensagem);
  setInterval(() => {
    if (atual?.dados && !atual.ocupado && !atual.carregando && !document.hidden && !painel.closest(".is-hidden")) {
      carregar(atual).catch(() => {});
    }
  }, 10000);
})();
