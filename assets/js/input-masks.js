(function (global) {
  "use strict";

  function formatCentsBR(cents) {
    const padded = String(cents).padStart(3, "0");
    const inteiro = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${inteiro},${padded.slice(-2)}`;
  }

  function currencyInputValue(value) {
    if (value == null || value === "") return "";
    const cents = Math.round(Number(value) * 100);
    return Number.isFinite(cents) ? formatCentsBR(cents) : "";
  }

  function parseCurrencyBR(text) {
    const digits = String(text ?? "").replace(/\D/g, "");
    return digits ? Number(digits) / 100 : null;
  }

  function attachCurrencyMask(input) {
    if (!input || input.dataset.currencyMask) return;
    input.dataset.currencyMask = "1";
    const apply = () => {
      const digits = input.value.replace(/\D/g, "");
      input.value = digits ? formatCentsBR(Number(digits)) : "";
    };
    input.addEventListener("input", apply);
    apply();
  }

  function perfilColuna(coluna) {
    const unidade = String(coluna.unidade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return {
      moeda: /r\$|\brea(?:l|is)\b|\bbrl\b/.test(unidade) || coluna.formato === "moeda" || coluna.chave === "capex_estimado",
      inteiro: coluna.formato === "inteiro",
      percentual: unidade.includes("%"),
      naoNegativo: coluna.grupo === "cadastro",
    };
  }

  function limparTexto(texto, perfil) {
    let valor = String(texto ?? "").trim();
    if (perfil.moeda) valor = valor.replace(/R\$/gi, "");
    if (perfil.percentual) valor = valor.replace(/%\s*$/, "");
    valor = valor.replace(/\s/g, "");
    if (!/^-?[\d.]*,?\d*$/.test(valor)) {
      throw new TypeError("Informe um número usando vírgula para os decimais.");
    }
    if (perfil.inteiro && valor.includes(",")) throw new TypeError("Informe um número inteiro, sem casas decimais.");
    return valor;
  }

  function parseValor(texto, perfil) {
    const limpo = limparTexto(texto, perfil);
    if (!limpo) return null;
    if (!/\d/.test(limpo)) throw new TypeError("Complete o número informado.");
    const valor = perfil.moeda
      ? parseCurrencyBR(limpo) * (limpo.startsWith("-") ? -1 : 1)
      : Number(limpo.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor)) throw new RangeError("O número informado excede o limite permitido.");
    if (perfil.inteiro && !Number.isSafeInteger(valor)) throw new RangeError("Informe um inteiro dentro do limite de precisão.");
    if (perfil.naoNegativo && valor < 0) throw new RangeError("Informe um valor maior ou igual a zero.");
    return valor;
  }

  function formatarValor(valor, coluna) {
    if (valor == null || valor === "") return "";
    const numero = Number(valor);
    if (!Number.isFinite(numero)) throw new TypeError("O valor numérico armazenado é inválido.");
    const perfil = perfilColuna(coluna);
    if (perfil.moeda) return numero.toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    return numero.toLocaleString("pt-BR", {maximumFractionDigits: 20});
  }

  function formatarDigitacao(texto, perfil) {
    const limpo = limparTexto(texto, perfil);
    if (!limpo || limpo === "-") return limpo;
    parseValor(limpo, perfil);
    const sinal = limpo.startsWith("-") ? "-" : "";
    const digitos = limpo.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
    if (perfil.moeda) return sinal + formatCentsBR(digitos);
    const [parteInteira, fracao] = limpo.replace(/^-/, "").replace(/\./g, "").split(",");
    const inteiro = (parteInteira || "0").replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${sinal}${inteiro}${fracao === undefined ? "" : `,${fracao}`}`;
  }

  function aplicarColuna(input, coluna, valor) {
    const perfil = perfilColuna(coluna);
    input.type = "text";
    input.inputMode = perfil.moeda || perfil.inteiro ? "numeric" : "decimal";
    input.dataset.mascara = perfil.moeda ? "moeda" : perfil.inteiro ? "inteiro" : perfil.percentual ? "percentual" : "decimal";
    input.placeholder = perfil.moeda ? "0,00" : perfil.inteiro ? "0" : "0,0";
    input.title = perfil.moeda
      ? `${coluna.unidade || "R$"}: digite os algarismos em centavos (123456 → 1.234,56).`
      : `${coluna.unidade || "Número"}: ${perfil.inteiro ? "somente números inteiros" : "use vírgula para os decimais"}.`;
    input.value = formatarValor(valor, coluna);
    const apply = () => {
      const texto = input.value;
      const direita = texto.slice(input.selectionStart ?? texto.length).replace(/\D/g, "").length;
      try {
        const formatado = formatarDigitacao(texto, perfil);
        parseValor(formatado, perfil);
        input.setCustomValidity("");
        input.value = formatado;
        let posicao = formatado.length, restantes = direita;
        while (posicao > 0 && restantes > 0) {
          posicao -= 1;
          if (/\d/.test(formatado[posicao])) restantes -= 1;
        }
        input.setSelectionRange(posicao, posicao);
      } catch (erro) {
        if (!(erro instanceof TypeError || erro instanceof RangeError)) throw erro;
        input.setCustomValidity(erro.message);
      }
    };
    input.addEventListener("input", event => { if (!event.isComposing) apply(); });
    input.addEventListener("compositionend", apply);
    input.addEventListener("beforeinput", event => {
      if (input.selectionStart !== input.selectionEnd) return;
      const posicao = input.selectionStart;
      const separador = caractere => caractere === "." || (perfil.moeda && caractere === ",");
      if (event.inputType === "deleteContentBackward" && posicao > 1 && separador(input.value[posicao - 1])) {
        input.setSelectionRange(posicao - 2, posicao);
      } else if (event.inputType === "deleteContentForward" && separador(input.value[posicao])) {
        input.setSelectionRange(posicao, posicao + 2);
      }
    });
  }

  global.SLTInputMasks = {currencyInputValue, parseCurrencyBR, attachCurrencyMask,
    perfilColuna, parseValor, formatarValor, formatarDigitacao, aplicarColuna};
})(window);
