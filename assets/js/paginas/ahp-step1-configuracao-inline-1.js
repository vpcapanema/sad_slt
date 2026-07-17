function aplicarMascaraDenominacao(input) {
      var val = input.value;
      // Normaliza: remove acentos, minúsculas, espaço → underline, sem chars especiais.
      val = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      val = val.toLowerCase();
      val = val.replace(/\s+/g, "_");
      val = val.replace(/[^a-z0-9_\-]/g, "");
      input.value = val;
      // Atualiza preview dos nomes dos arquivos.
      var preview = document.getElementById("denominacao-preview");
      var f1 = document.getElementById("den-preview-fase1");
      var f2 = document.getElementById("den-preview-fase2");
      var fh = document.getElementById("den-preview-homologado");
      if (val.length > 0) {
        if (f1) f1.textContent = val + "_fase1.json";
        if (f2) f2.textContent = val + "_fase2.json";
        if (fh) fh.textContent = val + "_homologado.json";
        if (preview) preview.classList.remove("is-hidden");
      } else {
        if (preview) preview.classList.add("is-hidden");
      }
    }
