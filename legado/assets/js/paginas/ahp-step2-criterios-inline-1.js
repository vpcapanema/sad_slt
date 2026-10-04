document.addEventListener('DOMContentLoaded', function () {
      var inputMethod = localStorage.getItem('ahp_inputMethod');
      var origem = localStorage.getItem('ahp_inputMethodOrigem');
      document.querySelectorAll('input[name="cfg-source"]').forEach(function (r) { r.checked = false; });
      document.querySelectorAll('input[name="input-method"]').forEach(function (r) { r.checked = false; });
      // Restaura o método já usado (ex.: matriz carregada de uma hierarquização
      // na Etapa 1) em vez de sempre exigir nova seleção manual.
      if (inputMethod === 'manual') {
        var manual = document.getElementById('method-manual');
        if (manual) manual.checked = true;
      } else if (inputMethod === 'upload_matriz') {
        var preferido = origem === 'hierarquizacao' ? document.getElementById('method-hierarquizacao') : null;
        var upload = document.getElementById('method-upload');
        if (preferido) preferido.checked = true;
        else if (upload) upload.checked = true;
      }
      if (typeof toggleConfigSource === 'function') toggleConfigSource();
      if (typeof toggleInputMethod === 'function') toggleInputMethod();
    });
