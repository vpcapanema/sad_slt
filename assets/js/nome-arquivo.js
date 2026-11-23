(function (global) {
  'use strict';

  function parte(valor, separadores) {
    return String(valor ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(separadores, '_').replace(/^[_-]+|[_-]+$/g, '');
  }

  function gerar(registro, produto, extensao, referencia = 'SICARD') {
    const sufixo = extensao.toLowerCase().replace(/^\.+/, '');
    if (!/^[a-z0-9]+(?:\.[a-z0-9]+)*$/.test(sufixo) || sufixo.length > 30) {
      throw new Error('Extensão de arquivo inválida.');
    }
    const prefixo = parte(registro, /[^A-Za-z0-9-]+/g) || parte(referencia, /[^A-Za-z0-9-]+/g) || 'SICARD';
    const descricao = parte(produto, /[^A-Za-z0-9]+/g).toLowerCase().slice(0, 60).replace(/_+$/, '') || 'arquivo';
    const limite = 118 - descricao.length - sufixo.length;
    return `${prefixo.slice(0, limite).replace(/[_-]+$/, '')}_${descricao}.${sufixo}`;
  }

  function daResposta(resposta, alternativa) {
    const cabecalho = resposta.headers.get('Content-Disposition') || '';
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecalho)?.[1];
    if (utf8) {
      try { return decodeURIComponent(utf8.trim()); } catch { /* usa filename */ }
    }
    return /filename="([^"\r\n]+)"/i.exec(cabecalho)?.[1] || alternativa;
  }

  global.SicardNomeArquivo = { gerar, daResposta };
})(globalThis);
