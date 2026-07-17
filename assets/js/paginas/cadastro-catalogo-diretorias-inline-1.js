SLTReferencia.loadReferencia("../").then(() => {
      SLTReferencia.renderDiretoriasPage(document.getElementById("conteudo"));
      const hash = location.hash.replace("#", "");
      if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    });
