SLTReferencia.loadReferencia("../").then(() => {
      SLTReferencia.renderFrentesPage(document.getElementById("conteudo"));
      const hash = location.hash.replace("#", "");
      if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
    });
