document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('input[name="cfg-source"]').forEach(function (r) { r.checked = false; });
      document.querySelectorAll('input[name="input-method"]').forEach(function (r) { r.checked = false; });
      if (typeof toggleConfigSource === 'function') toggleConfigSource();
      if (typeof toggleInputMethod === 'function') toggleInputMethod();
    });
