(function () {
  "use strict";

  var PRINCIPAL = "#1f4e79";
  var PALETA = ["#2e7d6b", "#8a5a00", "#6a4c93", "#4a5568", "#9b2c2c"];

  function grupo(id, titulo, colunas, cor, principal) {
    return { id: id, titulo: titulo, colunas: colunas, cor: cor || PALETA[0], principal: Boolean(principal) };
  }

  var CONJUNTOS = [
    {
      nome: "julgamentos",
      assinatura: ["Nome do julgamento", "Matriz / contexto", "Lambda máximo (λmax)"],
      grupos: [
        grupo("principal", "Julgamento", ["Nome do julgamento", "Situação", "ID Julgamento", "Matriz / contexto"], PRINCIPAL, true),
        grupo("prazos", "Participação e prazos", ["Participação", "Prazo para respostas", "Criado em", "Atualizado em", "Código de acesso ao formulário"], PALETA[0]),
        grupo("matriz", "Matriz e pesos", ["ID Matriz / contexto", "Critérios", "Matriz de comparação pareada", "Pesos consolidados"], PALETA[1]),
        grupo("consistencia", "Consistência", ["Lambda máximo (λmax)", "Índice de consistência (IC)", "Índice aleatório (IA)", "Razão de consistência (RC)"], PALETA[2])
      ]
    },
    {
      nome: "homologacao",
      assinatura: ["Identificador da configuração", "Código da hierarquização", "Classificação resultante"],
      grupos: [
        grupo("principal", "Hierarquização", ["Situação", "Código da hierarquização", "Nome", "Descrição"], PRINCIPAL, true),
        grupo("composicao", "Composição", ["Matriz de critérios e premissas", "Demandas do grupo", "Julgamentos dos projetos", "Pesos dos projetos", "Classificação resultante"], PALETA[0]),
        grupo("homologacao", "Homologação", ["Data da homologação", "Responsável pela homologação"], PALETA[1]),
        grupo("cadastro", "Cadastro", ["Responsável pelo cadastro", "Data de cadastro", "Última atualização"], PALETA[2]),
        grupo("classificacao", "Configuração e classificação", ["Identificador da configuração", "Tipo de demanda", "Grupo comparável", "Dados completos da hierarquização"], PALETA[3])
      ]
    },
    {
      nome: "hierarquizacao",
      assinatura: ["Código da hierarquização", "Tipo de demanda", "Relatório da Fase 1"],
      grupos: [
        grupo("principal", "Hierarquização", ["Situação", "Código da hierarquização", "ID Julgamento", "Nome", "Descrição"], PRINCIPAL, true),
        grupo("relatorios", "Relatórios", ["Relatório da Fase 1", "Relatório da Fase 2", "Relatório da Fase 3", "Relatório consolidado"], PALETA[0]),
        grupo("composicao", "Composição", ["Matriz de critérios e premissas", "Demandas do grupo", "Julgamentos dos projetos", "Pesos dos projetos", "Classificação resultante"], PALETA[1]),
        grupo("homologacao", "Homologação", ["Data da homologação", "Responsável pela homologação"], PALETA[2]),
        grupo("cadastro", "Cadastro", ["Responsável pelo cadastro", "Data de cadastro", "Última atualização"], PALETA[3]),
        grupo("classificacao", "Classificação", ["Tipo de demanda", "Grupo comparável", "Dados completos da hierarquização"], PALETA[4])
      ]
    },
    {
      nome: "projetos",
      assinatura: ["Processo SEI", "Projeto", "Geometria"],
      grupos: [
        grupo("principal", "Projeto", ["Status", "Processo SEI", "Código", "Projeto"], PRINCIPAL, true),
        grupo("vinculo", "Vínculo institucional", ["Diretoria", "Plano estratégico", "Vínculo institucional", "Programa vinculado", "Instituição", "Representante"], PALETA[0]),
        grupo("classificacao", "Classificação e geometria", ["Classificação", "Complementos", "Geometria"], PALETA[1]),
        grupo("cadastro", "Cadastro", ["Criado por", "Cadastro", "Atualizado por", "Atualização"], PALETA[2]),
        grupo("aprovacao", "Aprovação e reprovação", ["Aprovado por", "Aprovação", "Reprovado por", "Reprovação"], PALETA[3])
      ]
    }
  ];

  var estados = new WeakMap();
  var conjuntosDemanda = new WeakMap();
  var regras = new Map();
  var contador = 0;
  var estiloEl = null;
  var agendado = false;

  function normalizar(texto) {
    return String(texto || "").replace(/\s+/g, " ").trim();
  }

  function mesmoTitulo(cabecalho, nome) {
    var h = normalizar(cabecalho), n = normalizar(nome);
    return Boolean(h) && (n === h || n.indexOf(h) === 0 || h.indexOf(n) === 0);
  }

  function linhaCabecalho(tabela) {
    var linhas = tabela.tHead ? Array.prototype.slice.call(tabela.tHead.rows).filter(function (linha) {
      return !linha.classList.contains("cg-linha-grupo");
    }) : [];
    return linhas[linhas.length - 1] || null;
  }

  function celulas(linha) {
    return Array.prototype.slice.call(linha.children);
  }

  function conjuntoDe(tabela) {
    var linha = linhaCabecalho(tabela);
    if (!linha) return null;
    var textos = celulas(linha).map(function (cell) { return normalizar(cell.textContent); });
    var base = CONJUNTOS.find(function (conjunto) {
      return conjunto.assinatura.every(function (nome) {
        return textos.some(function (texto) { return mesmoTitulo(texto, nome); });
      });
    }) || null;
    if (!tabela.dataset.demandasTable) return base;
    var temOrigem = Boolean(linha.querySelector('[data-column-group="origem"]'));
    if (!temOrigem) return base;
    var cached = conjuntosDemanda.get(tabela);
    if (cached && cached.base === base) return cached.conjunto;
    var principal = grupo('principal', 'Cadastro', [], PRINCIPAL, true);
    principal.fallback = true;
    var origem = grupo('origem', 'Dados de origem', [], '#0f766e');
    origem.visivelInicialmente = true;
    var conjunto = {grupos: [...(base ? base.grupos : [principal]), origem]};
    conjuntosDemanda.set(tabela, {base:base, conjunto:conjunto});
    return conjunto;
  }

  function mesmoGrupo(a, b) {
    if (!a || !b) return !a && !b;
    return a.id === b.id;
  }

  function grupoDaColuna(conjunto, celula) {
    if (celula.dataset.columnGroup) return conjunto.grupos.find(g => g.id === celula.dataset.columnGroup) || null;
    if (celula.classList.contains('col-select')) return null;
    var texto = normalizar(celula.textContent);
    return conjunto.grupos.find(function (grupo) {
      return grupo.colunas.some(function (nome) { return mesmoTitulo(texto, nome); });
    }) || conjunto.grupos.find(g => g.fallback) || null;
  }

  function barraDe(tabela) {
    var contorno = tabela.closest(".ami-filtered-table, .admin-table-shell") || tabela.closest(".hier-table-shell, .ea-table-wrap, .matriz-table-wrap, .admin-table-wrap") || tabela.parentElement;
    var barras = contorno.querySelectorAll(".admin-filter-bar");
    for (var i = 0; i < barras.length; i++) {
      if (!barras[i].contains(tabela)) return barras[i];
    }
    var bloco = tabela.closest(".hier-table-shell, .admin-table-wrap, .ea-table-wrap, .matriz-table-wrap") || tabela;
    var anterior = bloco.previousElementSibling;
    if (anterior && anterior.matches(".admin-filter-bar")) return anterior;
    return null;
  }

  function garantirBotoes(tabela, estado, conjunto) {
    if (estado.botoes && estado.botoes.isConnected) return;
    var barra = barraDe(tabela);
    if (!barra) return;
    var caixa = document.createElement("div");
    caixa.className = "cg-botoes";
    caixa.setAttribute("role", "group");
    caixa.setAttribute("aria-label", "Grupos de colunas");
    conjunto.grupos.filter(function (grupo) { return !grupo.principal; }).forEach(function (grupo) {
      var botao = document.createElement("button");
      botao.type = "button";
      botao.className = "cg-botao";
      botao.dataset.grupo = grupo.id;
      botao.textContent = grupo.titulo;
      botao.style.setProperty("--cg-cor", grupo.cor);
      botao.addEventListener("click", function () {
        if (estado.ocultos.has(grupo.id)) estado.ocultos.delete(grupo.id);
        else estado.ocultos.add(grupo.id);
        renderizar(tabela);
      });
      caixa.appendChild(botao);
    });
    barra.appendChild(caixa);
    estado.botoes = caixa;
  }

  function garantirEstilo() {
    if (estiloEl && estiloEl.isConnected) return;
    estiloEl = document.createElement("style");
    estiloEl.id = "cg-regras-colunas";
    document.head.appendChild(estiloEl);
  }

  function atualizarRegras(tabela, id, ocultos) {
    if (!ocultos.length) regras.delete(id);
    else {
      regras.set(id, ocultos.map(function (indice) {
        return 'table[data-cg-id="' + id + '"] tr:not(.cg-linha-grupo) > :nth-child(' + (indice + 1) + ')';
      }).join(",") + "{display:none}");
    }
    garantirEstilo();
    estiloEl.textContent = Array.from(regras.values()).join("\n");
  }

  function renderizar(tabela) {
    var conjunto = conjuntoDe(tabela);
    var linha = linhaCabecalho(tabela);
    if (!conjunto || !linha || !tabela.tHead) return;

    var estado = estados.get(tabela);
    if (!estado || estado.conjunto !== conjunto) {
      if (estado?.botoes) estado.botoes.remove();
      estado = {
        conjunto: conjunto,
        ocultos: new Set(conjunto.grupos.filter(function (grupo) { return !grupo.principal && !grupo.visivelInicialmente; }).map(function (grupo) { return grupo.id; })),
        chave: "",
        botoes: null
      };
      estados.set(tabela, estado);
    }
    if (!tabela.dataset.cgId) tabela.dataset.cgId = "cg" + (++contador);
    garantirBotoes(tabela, estado, conjunto);
    if (estado.botoes) {
      var hidden = tabela.hidden || Boolean(tabela.closest('[hidden]'));
      if (estado.botoes.hidden !== hidden) estado.botoes.hidden = hidden;
    }

    var grupos = celulas(linha).map(function (cell) { return grupoDaColuna(conjunto, cell); });
    var visivel = grupos.map(function (grupo) { return !grupo || grupo.principal || !estado.ocultos.has(grupo.id); });
    var chave = grupos.map(function (grupo) { return grupo ? grupo.id : ""; }).join("|") + "#" + Array.from(estado.ocultos).sort().join(",");

    if (estado.botoes) {
      estado.botoes.querySelectorAll(".cg-botao").forEach(function (botao) {
        botao.setAttribute("aria-pressed", String(!estado.ocultos.has(botao.dataset.grupo)));
        var ativo = !estado.ocultos.has(botao.dataset.grupo);
        botao.classList.toggle("is-ativo", ativo);
        botao.style.setProperty("background", botao.style.getPropertyValue("--cg-cor"), "important");
        botao.style.setProperty("color", "#ffffff", "important");
      });
    }

    if (estado.chave === chave) return;
    estado.chave = chave;

    var ocultos = [];
    visivel.forEach(function (ok, indice) { if (!ok) ocultos.push(indice); });
    atualizarRegras(tabela, tabela.dataset.cgId, ocultos);
    Array.prototype.forEach.call(linha.cells, function (celula, indice) { celula.hidden = !visivel[indice]; });

    var faixa = document.createElement("tr");
    faixa.className = "cg-linha-grupo";
    tabela.tHead.querySelectorAll(":scope > tr.cg-linha-grupo").forEach(function (antiga) {
      Array.prototype.forEach.call(antiga.cells, function (celula) {
        if (!celula.classList.contains("cg-grupo") && !celula.classList.contains("cg-vazio")) faixa.appendChild(celula);
      });
      antiga.remove();
    });
    var visiveis = [];
    grupos.forEach(function (grupo, indice) { if (visivel[indice]) visiveis.push(indice); });
    var posicao = 0;
    while (posicao < visiveis.length) {
      var atual = grupos[visiveis[posicao]], fim = posicao;
      while (fim + 1 < visiveis.length && mesmoGrupo(grupos[visiveis[fim + 1]], atual)) fim++;
      var celula = document.createElement("th");
      celula.colSpan = fim - posicao + 1;
      if (atual) {
        celula.textContent = atual.titulo;
        celula.style.setProperty("--cg-cor", atual.cor);
        celula.style.setProperty("background", atual.cor, "important");
        celula.style.setProperty("color", "#ffffff", "important");
        celula.className = "cg-grupo";
        celula.dataset.grupo = atual.id;
      } else {
        celula.style.setProperty("background", "var(--pli-deep, #123b56)", "important");
        celula.className = "cg-vazio";
        var abaixo = linha.cells[visiveis[posicao]];
        if (abaixo && abaixo.classList.contains("col-select")) {
          ["width", "min-width", "max-width"].forEach(function (propriedade) { celula.style.setProperty(propriedade, "44px", "important"); });
        }
      }
      faixa.appendChild(celula);
      posicao = fim + 1;
    }
    tabela.tHead.insertBefore(faixa, tabela.tHead.firstChild);
    window.SLTTableFit?.();
  }

  function varrer() {
    agendado = false;
    document.querySelectorAll("table").forEach(renderizar);
  }

  function agendar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(varrer);
  }

  function iniciar() {
    agendar();
    new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) iniciar();
  else document.addEventListener("DOMContentLoaded", iniciar);
})();
